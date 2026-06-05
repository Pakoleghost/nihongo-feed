/**
 * migrate-comunidad-images.mjs
 *
 * Retroactively compresses images uploaded to the comunidad-images bucket
 * before the client-side optimization was added (April 22, 2026).
 *
 * What it does:
 *   1. Lists every file in the comunidad-images Supabase Storage bucket
 *   2. Downloads each one
 *   3. Resizes to max 1600x1600 px, exports as JPEG quality 0.8
 *      (same settings as client-side optimizeImageFile())
 *   4. Overwrites the original file in Storage with the compressed version
 *
 * Requirements:
 *   - Add SUPABASE_SERVICE_ROLE_KEY to your .env.local
 *     (find it in Supabase dashboard → Project Settings → API → service_role)
 *
 * Run:
 *   node scripts/migrate-comunidad-images.mjs
 */

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "comunidad-images";
const MAX_WIDTH = 1600;
const MAX_HEIGHT = 1600;
const QUALITY = 80; // sharp uses 0-100, equivalent to canvas quality 0.8

// Load .env.local manually since this is a plain Node script
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const lines = readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // ignore if .env.local doesn't exist
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  console.error("❌  NEXT_PUBLIC_SUPABASE_URL not found in .env.local");
  process.exit(1);
}
if (!serviceKey) {
  console.error("❌  SUPABASE_SERVICE_ROLE_KEY not found in .env.local");
  console.error("   Add it from: Supabase dashboard → Project Settings → API → service_role secret");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function listAllFiles() {
  const files = [];
  // Files are stored under user-id sub-folders, so we list the top-level "folders" first
  const { data: topLevel, error: topError } = await supabase.storage
    .from(BUCKET)
    .list("", { limit: 1000 });

  if (topError) throw topError;

  for (const entry of topLevel ?? []) {
    if (entry.metadata) {
      // It's a file at root level (unusual but handle it)
      files.push(entry.name);
    } else {
      // It's a folder (userId prefix)
      const { data: children, error: childError } = await supabase.storage
        .from(BUCKET)
        .list(entry.name, { limit: 1000 });

      if (childError) throw childError;
      for (const child of children ?? []) {
        files.push(`${entry.name}/${child.name}`);
      }
    }
  }

  return files;
}

async function compressImage(buffer, mimeType) {
  const img = sharp(buffer);
  const meta = await img.metadata();

  const { width = MAX_WIDTH, height = MAX_HEIGHT } = meta;
  const needsResize = width > MAX_WIDTH || height > MAX_HEIGHT;

  let pipeline = img;
  if (needsResize) {
    pipeline = pipeline.resize(MAX_WIDTH, MAX_HEIGHT, { fit: "inside", withoutEnlargement: true });
  }

  // Always output as JPEG (same as client-side logic for non-PNG files)
  const isPng = mimeType === "image/png" || meta.format === "png";
  if (isPng) {
    return pipeline.png({ compressionLevel: 8 }).toBuffer();
  }
  return pipeline.jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
}

async function getFileSizeKb(path) {
  const { data, error } = await supabase.storage.from(BUCKET).list(
    path.includes("/") ? path.split("/").slice(0, -1).join("/") : "",
    { limit: 1000 },
  );
  if (error) return null;
  const fileName = path.split("/").pop();
  const file = data?.find((f) => f.name === fileName);
  return file?.metadata?.size ? Math.round(file.metadata.size / 1024) : null;
}

async function run() {
  console.log("🔍 Listing files in comunidad-images bucket…");
  const files = await listAllFiles();
  console.log(`   Found ${files.length} file(s)\n`);

  if (files.length === 0) {
    console.log("✅ Nothing to migrate.");
    return;
  }

  let skipped = 0;
  let compressed = 0;
  let errors = 0;

  for (const filePath of files) {
    try {
      // Download original
      const { data: blob, error: dlError } = await supabase.storage
        .from(BUCKET)
        .download(filePath);

      if (dlError) throw dlError;

      const arrayBuf = await blob.arrayBuffer();
      const originalBuffer = Buffer.from(arrayBuf);
      const originalKb = Math.round(originalBuffer.byteLength / 1024);

      // Skip tiny files — they're already optimized (< 150 KB)
      if (originalBuffer.byteLength < 150 * 1024) {
        console.log(`⏭️  ${filePath}  (${originalKb} KB — already small, skipping)`);
        skipped++;
        continue;
      }

      const mimeType = blob.type;
      const compressedBuffer = await compressImage(originalBuffer, mimeType);
      const compressedKb = Math.round(compressedBuffer.byteLength / 1024);

      // Skip if compression didn't help (within 5%)
      if (compressedBuffer.byteLength >= originalBuffer.byteLength * 0.95) {
        console.log(`⏭️  ${filePath}  (${originalKb} KB → ${compressedKb} KB — no gain, skipping)`);
        skipped++;
        continue;
      }

      // Determine content type for re-upload
      const ext = filePath.split(".").pop()?.toLowerCase();
      const contentType = ext === "png" ? "image/png" : "image/jpeg";

      // Overwrite with compressed version
      const { error: upError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, compressedBuffer, {
          contentType,
          upsert: true,
        });

      if (upError) throw upError;

      const saving = Math.round((1 - compressedBuffer.byteLength / originalBuffer.byteLength) * 100);
      console.log(`✅  ${filePath}  ${originalKb} KB → ${compressedKb} KB  (−${saving}%)`);
      compressed++;
    } catch (err) {
      console.error(`❌  ${filePath}  ERROR: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`Compressed : ${compressed}`);
  console.log(`Skipped    : ${skipped}`);
  console.log(`Errors     : ${errors}`);
  console.log(`─────────────────────────────────`);
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
