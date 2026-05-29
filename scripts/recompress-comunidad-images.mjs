/**
 * Recompress existing comunidad-images in Supabase Storage.
 *
 * What it does:
 *   - Lists all files in the comunidad-images bucket
 *   - Downloads each one
 *   - Recompresses to JPEG 1200×1200 max, quality 72 (using sharp)
 *   - Re-uploads to the same path with upsert (overwrites in place)
 *   - Skips files that are already small (< 100 KB — already fine)
 *   - Reports saved bytes at the end
 *
 * Usage:
 *   node scripts/recompress-comunidad-images.mjs
 *
 * Requires .env.local to have SUPABASE_SERVICE_ROLE_KEY set.
 */

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

// ── Load .env.local manually (no dotenv dep needed) ───────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "../.env.local");
const env = {};
readFileSync(envPath, "utf8")
  .split("\n")
  .forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  });

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY);
const BUCKET = "comunidad-images";
const MAX_PX = 1200;
const QUALITY = 72;
const SKIP_BELOW_KB = 100; // already small enough

async function listAllFiles(prefix = "") {
  const { data, error } = await sb.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) throw error;

  const files = [];
  for (const item of data ?? []) {
    if (item.metadata) {
      // It's a file
      files.push({ path: prefix ? `${prefix}/${item.name}` : item.name, size: item.metadata.size });
    } else {
      // It's a folder — recurse
      const sub = await listAllFiles(prefix ? `${prefix}/${item.name}` : item.name);
      files.push(...sub);
    }
  }
  return files;
}

async function recompress(filePath, originalSize) {
  // Download
  const { data: blob, error: dlErr } = await sb.storage.from(BUCKET).download(filePath);
  if (dlErr) throw dlErr;

  const inputBuffer = Buffer.from(await blob.arrayBuffer());

  // Recompress with sharp
  const outputBuffer = await sharp(inputBuffer)
    .rotate() // auto-rotate from EXIF
    .resize(MAX_PX, MAX_PX, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: QUALITY, progressive: true, mozjpeg: true })
    .toBuffer();

  if (outputBuffer.length >= inputBuffer.length) {
    return { skipped: true, reason: "already optimal" };
  }

  // Re-upload to same path (upsert)
  const { error: upErr } = await sb.storage.from(BUCKET).upload(filePath, outputBuffer, {
    contentType: "image/jpeg",
    upsert: true,
    cacheControl: "public, max-age=31536000",
  });
  if (upErr) throw upErr;

  return {
    skipped: false,
    before: inputBuffer.length,
    after: outputBuffer.length,
    saved: inputBuffer.length - outputBuffer.length,
  };
}

async function main() {
  console.log("📦  Listing files in comunidad-images…");
  const files = await listAllFiles();
  console.log(`   Found ${files.length} files\n`);

  let totalSaved = 0;
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const kb = Math.round((file.size ?? 0) / 1024);

    if (kb < SKIP_BELOW_KB) {
      console.log(`  ⏭  ${file.path} (${kb} KB — already small, skip)`);
      skipped++;
      continue;
    }

    process.stdout.write(`  🔄 ${file.path} (${kb} KB) … `);
    try {
      const result = await recompress(file.path, file.size);
      if (result.skipped) {
        console.log(`skipped (${result.reason})`);
        skipped++;
      } else {
        const savedKb = Math.round(result.saved / 1024);
        const afterKb = Math.round(result.after / 1024);
        console.log(`✅  ${kb} KB → ${afterKb} KB  (−${savedKb} KB)`);
        totalSaved += result.saved;
        processed++;
      }
    } catch (err) {
      console.log(`❌  ERROR: ${err.message}`);
      errors++;
    }
  }

  console.log("\n── Summary ─────────────────────────────────");
  console.log(`  Recompressed : ${processed} files`);
  console.log(`  Skipped      : ${skipped} files`);
  console.log(`  Errors       : ${errors} files`);
  console.log(`  Total saved  : ${Math.round(totalSaved / 1024)} KB  (${(totalSaved / 1048576).toFixed(2)} MB)`);
}

main().catch((err) => { console.error(err); process.exit(1); });
