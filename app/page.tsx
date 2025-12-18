"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { requireApprovedSession } from "@/lib/authGuard";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import NextImage from "next/image";
import BottomNav from "@/components/BottomNav";

type DbPostRow = {
  id: string;
  content: string | null;
  created_at: string;
  user_id: string;
  image_url?: string | null;
  profiles:
    | { username: string | null; avatar_url: string | null }
    | { username: string | null; avatar_url: string | null }[]
    | null;
};

type Post = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username: string; // "" si no hay
  avatar_url: string | null;
  image_url: string | null;
  likes: number;
  likedByMe: boolean;
  commentCount: number;
};

type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_comment_id: string | null;
  profiles:
    | { username: string | null; avatar_url: string | null }
    | { username: string | null; avatar_url: string | null }[]
    | null;
};

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_comment_id: string | null;
  username: string; // "" si no hay
  avatar_url: string | null;
};

function normalizeProfile(p: any): { username: string; avatar_url: string | null } {
  const obj = Array.isArray(p) ? p?.[0] : p;

  const raw = (obj?.username ?? "").toString().trim().toLowerCase();

  // Treat auto-generated usernames as "not set" so we force the username picker.
  // Examples we want to reject: user_ce5b7889, user_123abc, etc.
  const isAuto = /^user_[a-z0-9]+$/.test(raw);

  // If no real username, do not generate a link
  const username = raw && raw !== "unknown" && !isAuto ? raw : "";

  return {
    username,
    avatar_url: obj?.avatar_url ?? null,
  };
}

function timeAgoJa(iso: string): string {
  try {
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return "";
    const now = Date.now();
    const diffMs = Math.max(0, now - t);

    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return "ただ今";

    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}分前`;

    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}時間前`;

    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}日前`;

    // Fallback to short date to avoid long timestamps
    const d = new Date(t);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}/${m}/${dd}`;
  } catch {
    return "";
  }
}
type ImageKind = "post" | "avatar";

function isHeicLike(file: File): boolean {
  const name = (file.name || "").toLowerCase();
  const type = (file.type || "").toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif") || type.includes("heic") || type.includes("heif");
}

async function blobToFile(blob: Blob, filename: string): Promise<File> {
  return new File([blob], filename, { type: blob.type || "application/octet-stream" });
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to encode image"))), type, quality);
  });
}

async function supportsWebP(): Promise<boolean> {
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    const b = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, "image/webp", 0.8));
    return !!b && b.type === "image/webp";
  } catch {
    return false;
  }
}

function computeResize(w: number, h: number, maxDim: number): { w: number; h: number } {
  if (!w || !h) return { w: maxDim, h: maxDim };
  if (Math.max(w, h) <= maxDim) return { w, h };
  const scale = maxDim / Math.max(w, h);
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

async function normalizeImageForUpload(file: File, kind: ImageKind): Promise<{ file: File; previewUrl: string | null }> {
  // conservative quality, big storage win mostly from resizing
  const maxDim = kind === "avatar" ? 512 : 1600;
  const quality = kind === "avatar" ? 0.85 : 0.82;

  const mime = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  const looksImage = mime.startsWith("image/") || name.endsWith(".heic") || name.endsWith(".heif");
  if (!looksImage) throw new Error("Please upload an image file.");

  // Convert HEIC/HEIF first
  let working: File = file;
  if (isHeicLike(file)) {
    const mod: any = await import("heic2any");
    const heic2any = mod?.default ?? mod;
    const outBlob = (await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 })) as Blob;
    working = await blobToFile(outBlob, (file.name || "upload").replace(/\.(heic|heif)$/i, ".jpg"));
  }

  const objectUrl = URL.createObjectURL(working);
  try {
    const img = new window.Image();
    img.decoding = "async";

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not read image"));
      img.src = objectUrl;
    });

    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    const { w: outW, h: outH } = computeResize(srcW, srcH, maxDim);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process image");

    ctx.imageSmoothingEnabled = true;
    // @ts-ignore
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, outW, outH);

    const useWebp = kind !== "avatar" && (await supportsWebP());
    const outType = useWebp ? "image/webp" : "image/jpeg";
    const outBlob = await canvasToBlob(canvas, outType, quality);

    const ext = outType === "image/webp" ? "webp" : "jpg";
    const base = (working.name || "image").replace(/\.[a-z0-9]+$/i, "");
    const outFile = await blobToFile(outBlob, `${base}.${ext}`);

    const previewUrl = URL.createObjectURL(outFile);
    return { file: outFile, previewUrl };
  } finally {
    try { URL.revokeObjectURL(objectUrl); } catch {}
  }
}

export default function HomePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  // header hide/show on scroll
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollYRef = useRef(0);
  const feedRef = useRef<HTMLDivElement | null>(null);

  // LOGIN UI
  const [email, setEmail] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authMessage, setAuthMessage] = useState<string>("");
  const [pendingEmailConfirmation, setPendingEmailConfirmation] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);

  // APPLICATION (captured during signup; we try to submit immediately. If we can't, we keep a draft for /pending)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [campus, setCampus] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [jlptLevel, setJlptLevel] = useState(""); // optional
  const [dob, setDob] = useState(""); // YYYY-MM-DD
  const [gender, setGender] = useState<"male" | "female" | "non-binary" | "prefer_not_to_say" | "">("");
  // Optional JLPT certificate image (for badge verification). This is NOT the same as jlptLevel (research only).
  const [jlptCertFile, setJlptCertFile] = useState<File | null>(null);
  const [jlptCertPreviewUrl, setJlptCertPreviewUrl] = useState<string | null>(null);
  const fullName = useMemo(() => {
    const f = firstName.trim();
    const l = lastName.trim();
    return `${f} ${l}`.trim();
  }, [firstName, lastName]);
  function getApplicationDraftError(): string {
    if (authMode !== "signup") return "";
    if (!fullName) return "Full name is required.";
    if (!campus.trim()) return "Campus is required.";
    if (!classLevel.trim()) return "Class level is required.";
    if (!dob.trim()) return "Date of birth is required.";
    if (!gender) return "Gender is required.";
    // basic YYYY-MM-DD check
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob.trim())) return "Date of birth must be YYYY-MM-DD.";
    return "";
  }

  function saveApplicationDraftToLocalStorage(emailForDraft: string, hasJlptCert: boolean) {
    try {
      const payload = {
        email: emailForDraft.trim(),
        full_name: fullName,
        campus: campus.trim(),
        class_level: classLevel.trim(),
        jlpt_level: jlptLevel.trim() || null,
        date_of_birth: dob.trim(),
        gender,
        jlpt_certificate_intent: !!hasJlptCert,
        saved_at: new Date().toISOString(),
      };
      window.localStorage.setItem("nhf_application_draft", JSON.stringify(payload));
    } catch {
      // ignore
    }
  }

  async function submitApplicationFromDraftIfPresent(uid: string): Promise<boolean> {
    try {
      if (typeof window === "undefined") return false;
      if (!uid) return false;
      const raw = window.localStorage.getItem("nhf_application_draft");
      if (!raw) return false;
      const draft = JSON.parse(raw);

      const full_name = (draft?.full_name ?? "").toString().trim();
      const campus = (draft?.campus ?? "").toString().trim();
      const class_level = (draft?.class_level ?? "").toString().trim();
      const jlpt_level = (draft?.jlpt_level ?? "").toString().trim();
      const date_of_birth = (draft?.date_of_birth ?? "").toString().trim();
      const gender = (draft?.gender ?? "").toString().trim();

      if (!full_name || !campus || !class_level || !date_of_birth || !gender) return false;

      // Use SECURITY DEFINER RPC so RLS cannot block due to user_id mismatch.
      const { error } = await supabase.rpc(
        "create_application",
        {
          full_name,
          campus,
          class_level,
          jlpt_level: jlpt_level || null,
          date_of_birth,
          gender,
        }
      );

      if (error) {
        console.error("create_application rpc failed:", error);
        return false;
      }

      // Do not auto-upload JLPT cert here.
      // Upload happens in the signup flow (when session exists) or from profile (⋯) later.

      // Clear draft only on success.
      window.localStorage.removeItem("nhf_application_draft");
      return true;
    } catch (e) {
      console.error("submitApplicationFromDraftIfPresent failed:", e);
      return false;
    }
  }

  async function uploadJlptCertificateAndCreateSubmission(uid: string, file: File): Promise<void> {
    // Prevent repeated automatic JLPT uploads: check for pending submission
    const { data: pendingSub, error: pendingError } = await supabase
      .from("jlpt_submissions")
      .select("id")
      .eq("user_id", uid)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();
    if (pendingSub && pendingSub.id) {
      // Already a pending submission, do nothing
      return;
    }

    // Uses a private bucket: jlpt-certificates
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `certificates/${uid}/${Date.now()}.${safeExt}`;

    const { error: uploadError } = await supabase.storage
      .from("jlpt-certificates")
      .upload(path, file, { upsert: false, contentType: file.type || undefined });

    if (uploadError) throw uploadError;

    // Insert JLPT submission and get the inserted id
    const { data: insertedRow, error: insertError } = await supabase.from("jlpt_submissions").insert({
      user_id: uid,
      image_path: path,
      status: "pending",
    }).select("id").single();

    if (insertError) throw insertError;
    const jlptSubmissionId = insertedRow?.id;

    // Notify all admins of new JLPT submission
    try {
      // Get admin user ids
      const { data: admins, error: adminErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("is_admin", true);
      if (adminErr) throw adminErr;
      if (Array.isArray(admins) && admins.length > 0 && jlptSubmissionId) {
        const notifications = admins.map((admin: any) => ({
          user_id: admin.id,
          actor_id: uid,
          type: "jlpt",
          read: false,
          jlpt_submission_id: jlptSubmissionId,
        }));
        await supabase.from("notifications").insert(notifications);
      }
    } catch {
      // Ignore notification failures, JLPT submission still succeeds
    }
  }

  // Persist JLPT certificate across email confirmation flows (no session on initial signup)
  async function saveJlptCertToIndexedDB(file: File): Promise<void> {
    if (typeof window === "undefined") return;
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open("nhf", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("blobs")) db.createObjectStore("blobs");
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("blobs", "readwrite");
        tx.objectStore("blobs").put(file, "jlpt_cert");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function loadJlptCertFromIndexedDB(): Promise<File | null> {
    if (typeof window === "undefined") return null;
    return await new Promise<File | null>((resolve, reject) => {
      const req = indexedDB.open("nhf", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("blobs")) db.createObjectStore("blobs");
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("blobs", "readonly");
        const getReq = tx.objectStore("blobs").get("jlpt_cert");
        getReq.onsuccess = () => resolve((getReq.result as File) || null);
        getReq.onerror = () => reject(getReq.error);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function clearJlptCertFromIndexedDB(): Promise<void> {
    if (typeof window === "undefined") return;
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open("nhf", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("blobs")) db.createObjectStore("blobs");
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("blobs", "readwrite");
        tx.objectStore("blobs").delete("jlpt_cert");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  }

  // JLPT certificate preview URL lifecycle
  useEffect(() => {
    if (!jlptCertFile) {
      if (jlptCertPreviewUrl) setJlptCertPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(jlptCertFile);
    setJlptCertPreviewUrl(url);

    return () => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jlptCertFile]);

  // USERNAME GATE
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);

  // feed composer
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  // feed
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullY, setPullY] = useState(0);
  const [pullReady, setPullReady] = useState(false);

  // my profile
  const [myUsername, setMyUsername] = useState<string>("");
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  // comments
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const commentInputRef = useRef<HTMLInputElement | null>(null);
  const [replyToByPost, setReplyToByPost] = useState<
    Record<string, { commentId: string; username: string } | null>
  >({});
  // per-post menu
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const menuBtnRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const menuRef = useRef<Record<string, HTMLDivElement | null>>({});
  // Download a post share card (square, IG story-friendly)
  async function downloadPostCard(p: Post) {
    try {
      // Higher-res export for better quality (4:5-ish)
      const W = 1440;
      const H = 1800;
      const SCALE = W / 1080;
      const S = (n: number) => Math.round(n * SCALE);
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const g: CanvasRenderingContext2D = ctx;
      g.imageSmoothingEnabled = true;
      // @ts-ignore
      g.imageSmoothingQuality = "high";

      async function loadBitmap(url: string): Promise<ImageBitmap | null> {
        try {
          const resp = await fetch(url, { cache: "no-store", mode: "cors" });
          if (!resp.ok) return null;
          const blob = await resp.blob();
          return await createImageBitmap(blob);
        } catch {
          return null;
        }
      }

      function roundedClip(x: number, y: number, w: number, h: number, r: number) {
        g.beginPath();
        g.moveTo(x + r, y);
        g.arcTo(x + w, y, x + w, y + h, r);
        g.arcTo(x + w, y + h, x, y + h, r);
        g.arcTo(x, y + h, x, y, r);
        g.arcTo(x, y, x + w, y, r);
        g.closePath();
        g.clip();
      }

      function drawCover(bmp: ImageBitmap, x: number, y: number, w: number, h: number) {
        // Subtle surface in case the image has transparency
        g.fillStyle = "rgba(255,255,255,0.04)";
        g.fillRect(x, y, w, h);

        // Cover-crop (preserve aspect ratio). No stretching.
        const sw = bmp.width;
        const sh = bmp.height;
        if (!sw || !sh) return;

        const scale = Math.max(w / sw, h / sh);
        const dw = sw * scale;
        const dh = sh * scale;
        const dx = x + (w - dw) / 2;
        const dy = y + (h - dh) / 2;

        g.drawImage(bmp, dx, dy, dw, dh);
      }

      // background
      g.fillStyle = "#0b0b0f";
      g.fillRect(0, 0, W, H);

      // header brand (bigger)
      const brandPad = S(64);
      g.fillStyle = "rgba(255,255,255,0.92)";
      g.font = `900 ${S(62)}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
      g.fillText("フィード", brandPad, S(104));

      // avatar + username + time (no overlap)
      const avatarSize = S(92); // bigger avatar
      const metaTop = S(150); // more space below the top brand
      const avatarX = brandPad;
      const avatarY = metaTop;

      // draw avatar circle
      const handle = p.username ? `@${p.username}` : "@unknown";
      const initial = (p.username?.[0] || "?").toUpperCase();

      g.save();
      g.beginPath();
      g.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      g.closePath();
      g.clip();

      if (p.avatar_url) {
        const abmp = await loadBitmap(p.avatar_url);
        if (abmp) {
          // cover-crop into the circle
          const sw = abmp.width;
          const sh = abmp.height;
          const scale = Math.max(avatarSize / sw, avatarSize / sh);
          const dw = sw * scale;
          const dh = sh * scale;
          const dx = avatarX + (avatarSize - dw) / 2;
          const dy = avatarY + (avatarSize - dh) / 2;
          g.drawImage(abmp, dx, dy, dw, dh);
          try { abmp.close(); } catch {}
        } else {
          g.fillStyle = "rgba(255,255,255,0.14)";
          g.fillRect(avatarX, avatarY, avatarSize, avatarSize);
        }
      } else {
        g.fillStyle = "rgba(255,255,255,0.14)";
        g.fillRect(avatarX, avatarY, avatarSize, avatarSize);
      }
      g.restore();

      // avatar border
      g.beginPath();
      g.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      g.closePath();
      g.strokeStyle = "rgba(255,255,255,0.18)";
      g.lineWidth = S(2);
      g.stroke();

      // initial fallback if no avatar
      if (!p.avatar_url) {
        g.fillStyle = "rgba(255,255,255,0.9)";
        g.font = `900 ${S(30)}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
        const tw = g.measureText(initial).width;
        g.fillText(initial, avatarX + (avatarSize - tw) / 2, avatarY + S(46));
      }

      const textX = avatarX + avatarSize + S(18);
      const userY = avatarY + S(40);
      const timeY = avatarY + S(84); // more space between username and timestamp

      g.fillStyle = "rgba(255,255,255,0.82)";
      g.font = `800 ${S(32)}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
      g.fillText(handle, textX, userY);

      g.fillStyle = "rgba(255,255,255,0.50)";
      g.font = `700 ${S(26)}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
      const t = timeAgoJa(p.created_at);
      g.fillText(t, textX, timeY);

      // layout
      const cardPad = brandPad;
      const imgW = W - cardPad * 2;

      // Caption spacing: slightly tighter line spacing, with different top and bottom gaps
      const capLineH = S(38); // slightly tighter line spacing
      const capMaxLines = 4;
      const capMaxWidth = W - cardPad * 2;
      const capGapTop = S(38); // more breathing room above caption
      const capGapBottom = 0; // less space below caption

      // Reserve space at the bottom for the bottom-right logo so it never clips.
      const bottomLogoReserve = S(110);

      // Top of caption is based on avatar/meta block so it never looks cramped.
      const metaBottom = avatarY + avatarSize;
      const captionTop = metaBottom + capGapTop;

      // Compute wrapped caption lines (preserve user-entered line breaks)
      const capRaw = (p.content ?? "").toString().trimEnd();
      const capLines: string[] = [];

      if (capRaw) {
        const paragraphs = capRaw.split(/\r?\n/);
        for (const para of paragraphs) {
          if (!para.trim()) {
            capLines.push("");
            continue;
          }
          const words = para.split(/\s+/);
          let line = "";
          for (const w of words) {
            const test = line ? `${line} ${w}` : w;
            if (g.measureText(test).width <= capMaxWidth) {
              line = test;
            } else {
              if (line) capLines.push(line);
              line = w;
            }
          }
          if (line) capLines.push(line);
        }
      }

      const clippedCapLines = capLines.slice(0, capMaxLines);

      // Caption bottom is based on how many lines (including empty) we will draw.
      // Treat empty lines as vertical spacing.
      const drawnLineCount = clippedCapLines.length;
      const captionBottom =
        captionTop + Math.max(0, drawnLineCount - 1) * capLineH + S(20);
      // Image starts after the caption with a smaller gap below.
      const imgTop = captionBottom + capGapBottom;

      // Make the image area fit the remaining height so we don't overflow the canvas.
      const maxImgBottom = H - brandPad - bottomLogoReserve;
      const imgH = Math.max(S(760), maxImgBottom - imgTop);

      // caption (above image)
      if (capRaw) {
        g.fillStyle = "rgba(255,255,255,0.94)";
        g.font = `700 ${S(30)}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;

        clippedCapLines.forEach((ln, i) => {
          if (!ln) return;
          g.fillText(ln, cardPad, captionTop + i * capLineH);
        });

        if (capLines.length > capMaxLines) {
          g.fillText("…", cardPad, captionTop + (capMaxLines - 1) * capLineH);
        }
      }

      // image (if any)
      if (p.image_url) {
        const bmp = await loadBitmap(p.image_url);
        if (bmp) {
          const r = S(32);
          g.save();
          roundedClip(cardPad, imgTop, imgW, imgH, r);
          drawCover(bmp, cardPad, imgTop, imgW, imgH);
          g.restore();
          try { bmp.close(); } catch {}
        }
      }

      // bottom-right brand for symmetry (always visible)
      g.save();
      g.fillStyle = "rgba(255,255,255,0.92)";
      g.font = `900 ${S(62)}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
      g.textBaseline = "bottom";
      const brand2 = "フィード";
      const tw2 = g.measureText(brand2).width;
      g.fillText(brand2, W - brandPad - tw2, H - brandPad);
      g.restore();

      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `feed-${p.id}.png`;
      a.click();
    } catch (e) {
      console.error(e);
      alert("Could not generate card.");
    }
  }
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const openId = openMenuFor;
      if (!openId) return;
      const target = e.target as Node | null;
      if (!target) return;

      const btn = menuBtnRef.current[openId];
      const menu = menuRef.current[openId];

      if (btn?.contains(target)) return;
      if (menu?.contains(target)) return;

      setOpenMenuFor(null);
    };

    document.addEventListener("pointerdown", onDown, { capture: true });
    return () => document.removeEventListener("pointerdown", onDown, { capture: true } as any);
  }, [openMenuFor]);
  function startReply(postId: string, commentId: string, username: string) {
    // Ensure the comments panel is open for this post
    if (openCommentsFor !== postId) {
      setOpenCommentsFor(postId);
    }

    const handle = username ? `@${username} ` : "@unknown ";
    setReplyToByPost((prev) => ({ ...prev, [postId]: { commentId, username: username || "unknown" } }));
    setCommentText(handle);

    // focus input
    setTimeout(() => {
      try {
        commentInputRef.current?.focus();
      } catch {
        // ignore
      }
    }, 0);
  }

  function clearReply(postId: string) {
    setReplyToByPost((prev) => ({ ...prev, [postId]: null }));
    setCommentText((prev) => {
      const p = (prev ?? "").toString();
      // If the box only contains an @mention prefix, clear it.
      if (/^@\S+\s*$/.test(p.trim())) return "";
      return p;
    });
  }

  async function deleteComment(postId: string, commentId: string) {
    const activeUserId = userId ?? (await requireApprovedSession());
    if (!activeUserId) return;

    const ok = confirm("Delete this comment?");
    if (!ok) return;

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", activeUserId);

    if (error) return alert(error.message);

    await loadComments(postId);
    await loadAll(activeUserId);
  }
  // likes in-flight guard (prevents double-click duplicate inserts)
  const [likeBusyByPost, setLikeBusyByPost] = useState<Record<string, boolean>>({});
  const [likeBusyByComment, setLikeBusyByComment] = useState<Record<string, boolean>>({});

  const BASE_URL = useMemo(() => {
    const env = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const raw = env || origin;
    return raw.replace(/\/$/, "");
  }, []);

  const EMAIL_REDIRECT_TO = useMemo(() => `${BASE_URL}/auth/callback`, [BASE_URL]);

  // auth bootstrap
  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const uid = data.user?.id ?? null;
      setUserId(uid);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // after login: check profile gate
  useEffect(() => {
    if (!userId) {
      setCheckingProfile(false);
      setNeedsUsername(false);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        // This will throw when the session is missing/expired or the user is not approved.
        const approvedUid = await requireApprovedSession();
        if (!approvedUid) throw new Error("NO_SESSION");
        await checkMyProfile(approvedUid);
      } catch (e: any) {
        const msg = (e?.message ?? "").toString();

        // Not approved: always send to pending.
        if (msg === "NOT_APPROVED" || msg.toLowerCase().includes("not_approved") || msg.toLowerCase().includes("not approved")) {
          window.location.href = "/pending";
          return;
        }

        // Any other auth issue (expired token, missing session, etc): sign out and show login.
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore
        }

        setUserId(null);
        setCheckingProfile(false);
        setNeedsUsername(false);
        setNewUsername("");
        setPosts([]);
        setLoading(false);
        setAuthMode("login");
        setAuthMessage("");
      }
    })();
  }, [userId]);

  // open composer when coming from /new (/?compose=1)
  useEffect(() => {
    if (!userId) return;
    if (checkingProfile || needsUsername) return;

    const compose =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("compose")
        : null;
    if (compose !== "1") return;

    // focus + scroll to composer
    setTimeout(() => {
      try {
        composerRef.current?.focus();
        composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {
        // ignore
      }
    }, 50);

    // clean URL so refresh doesn't reopen
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("compose");
      window.history.replaceState({}, "", url.toString());
    } catch {
      // ignore
    }
  }, [userId, checkingProfile, needsUsername]);

  // Hide header when scrolling down. Show again when scrolling up.
  // Works whether the page scrolls in window or inside the `.feed` container.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const el = feedRef.current;

    const isElScrollable = () => {
      if (!el) return false;
      // only treat as scroller if it can actually scroll
      return el.scrollHeight > el.clientHeight + 2;
    };

    const getY = () => {
      if (isElScrollable()) return el!.scrollTop;
      return window.scrollY;
    };

    lastScrollYRef.current = getY();

    let ticking = false;

    const handle = () => {
      const y = getY();
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        const last = lastScrollYRef.current;
        const delta = y - last;

        // small dead-zone so it doesn't flicker
        if (Math.abs(delta) > 8) {
          if (delta > 0 && y > 40) {
            setHeaderHidden(true);
          } else {
            setHeaderHidden(false);
          }
          lastScrollYRef.current = y;
        }

        ticking = false;
      });
    };

    // listen to both so it works regardless of which element actually scrolls
    window.addEventListener("scroll", handle, { passive: true });
    if (el) el.addEventListener("scroll", handle, { passive: true } as any);

    return () => {
      window.removeEventListener("scroll", handle);
      if (el) el.removeEventListener("scroll", handle as any);
    };
  }, []);

  async function checkMyProfile(uid: string) {
    setCheckingProfile(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", uid)
      .single();

    // if no row yet, we need username
    if (error) {
      setNeedsUsername(true);
      setMyUsername("unknown");
      setMyAvatarUrl(null);
      setCheckingProfile(false);
      return;
    }

    const uRaw = (data?.username ?? "").toString().trim();
    const uLower = uRaw.toLowerCase();
    const a = data?.avatar_url ?? null;

    const isAuto = /^user_[a-z0-9]+$/.test(uLower);
    const hasRealUsername = !!uRaw && uLower !== "unknown" && !isAuto;

    setMyUsername(hasRealUsername ? uRaw : "unknown");
    setMyAvatarUrl(a);
    setNeedsUsername(!hasRealUsername);
    setCheckingProfile(false);

    // load feed once we pass gate
    if (hasRealUsername) void loadAll(uid);
  }

  const normalizedNewUsername = useMemo(() => newUsername.trim().toLowerCase(), [newUsername]);

  const usernameError = useMemo(() => {
    if (!normalizedNewUsername) return "Type a username.";
    if (normalizedNewUsername.length < 3) return "Minimum 3 characters.";
    if (normalizedNewUsername.length > 20) return "Maximum 20 characters.";
    if (!/^[a-z0-9_]+$/.test(normalizedNewUsername)) return "Use only a-z, 0-9, underscore (_).";
    return "";
  }, [normalizedNewUsername]);

  async function saveUsername() {
    if (saveBusy) return;
    if (usernameError) return;

    const activeUserId = userId ?? (await requireApprovedSession());
    if (!activeUserId) return;

    setSaveBusy(true);

    const { error } = await supabase.from("profiles").upsert({
      id: activeUserId,
      username: normalizedNewUsername,
      avatar_url: myAvatarUrl,
    });

    setSaveBusy(false);

    if (error) {
      alert(error.message);
      return;
    }

    setMyUsername(normalizedNewUsername);
    setNeedsUsername(false);
    await loadAll(activeUserId);
  }

  async function loginWithPassword() {
    if (authBusy) return;
    if (!email.trim() || !password) return;

    setAuthMessage("");
    setAuthBusy(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setAuthBusy(false);

    if (error) {
      const trimmedEmail = email.trim();
      const lower = error.message.toLowerCase();

      if (lower.includes("email") && lower.includes("confirm")) {
        setPendingEmailConfirmation(trimmedEmail || pendingEmailConfirmation);
        setAuthMessage(
          "Email not confirmed. Check your inbox or resend the confirmation email."
        );
        if (trimmedEmail) void resendConfirmation(trimmedEmail);
        return;
      }

      setAuthMessage(error.message);
      return;
    }

    setPassword("");
    setPendingEmailConfirmation(null);
    setAuthMessage("");

    // Best-effort: if the user previously saved an application draft (common when email confirmation was required),
    // submit it now that we have a session.
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (uid) await submitApplicationFromDraftIfPresent(uid);
    } catch {
      // ignore
    }

    // Best-effort: after login, try to upload JLPT cert from IndexedDB if present
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (uid) {
        const file = await loadJlptCertFromIndexedDB();
        if (file) {
          try {
            await uploadJlptCertificateAndCreateSubmission(uid, file);
          } catch {
            // ignore upload errors
          }
          try {
            await clearJlptCertFromIndexedDB();
          } catch {
            // ignore clear errors
          }
        }
      }
    } catch {
      // ignore
    }
  }

  async function signUpWithPassword() {
    if (authBusy) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) return;

    const draftErr = getApplicationDraftError();
    if (draftErr) {
      setAuthMessage(draftErr);
      return;
    }

    // Always keep a local draft as a fallback.
    if (typeof window !== "undefined") saveApplicationDraftToLocalStorage(trimmedEmail, !!jlptCertFile);

    setAuthMessage("");
    setAuthBusy(true);

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: { emailRedirectTo: EMAIL_REDIRECT_TO },
    });

    setAuthBusy(false);

    if (error) {
      console.error("Sign up error:", error);
      setAuthMessage(error.message);
      return;
    }

    setPassword("");

    // Best-effort: submit the application immediately if we have a session.
    // If Supabase does not give us a session (common when email confirmation is required),
    // we keep the draft and (optionally) stash the JLPT image for later upload.
    let applicationInserted = false;
    let jlptSubmitted = false;
    let jlptCertSavedToIndexedDB = false;

    try {
      if (data.session) {
        const uid = data.session.user?.id;
        if (uid) {
          applicationInserted = await submitApplicationFromDraftIfPresent(uid);

          // Optional JLPT certificate submission (only once)
          if (jlptCertFile) {
            await uploadJlptCertificateAndCreateSubmission(uid, jlptCertFile);
            jlptSubmitted = true;
          }
        }
      } else {
        // No session yet (email confirmation flow). Save the certificate so we can upload
        // it after the user confirms and logs in.
        if (jlptCertFile) {
          try {
            await saveJlptCertToIndexedDB(jlptCertFile);
            jlptCertSavedToIndexedDB = true;
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // ignore
    }

    // Keep the user inactive until approved: sign out immediately after signup.
    // They will confirm email and then log in, but /pending will block until approved.
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }

    // Clear local state for safety only after successful upload or save to IndexedDB
    if (jlptSubmitted || jlptCertSavedToIndexedDB) {
      setJlptCertFile(null);
    }

    // Ask them to confirm email and wait for approval.
    setAuthMode("login");
    setPendingEmailConfirmation(trimmedEmail);

    if (applicationInserted) {
      setAuthMessage(
        jlptSubmitted
          ? "Application submitted and JLPT certificate uploaded. Check your email to confirm your account. After an admin approves you, you can log in."
          : "Application submitted. Check your email to confirm your account. After an admin approves you, you can log in."
      );
      return;
    }

    // If we couldn't insert the application now, ensure a confirmation email is sent and rely on the draft.
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: trimmedEmail,
      options: { emailRedirectTo: EMAIL_REDIRECT_TO },
    });

    if (resendError) {
      setAuthMessage(
        `Check your email to confirm your account. After approval, log in. Resend failed: ${resendError.message}`
      );
      return;
    }

    setAuthMessage(
      jlptCertFile
        ? "Check your email to confirm your account. After you confirm and log in, we will upload your JLPT certificate automatically."
        : "Check your email to confirm your account. Your application will be submitted when you log in and reach the pending approval screen."
    );
    // If we didn't clear JLPT cert file above and we did save it to IndexedDB, clear it now.
    if (!jlptSubmitted && jlptCertSavedToIndexedDB) {
      setJlptCertFile(null);
    }
  }

  async function resendConfirmation(targetEmail?: string) {
    if (resendBusy) return;

    const emailToSend = (targetEmail ?? pendingEmailConfirmation ?? email).trim();
    if (!emailToSend) {
      setAuthMessage("Enter your email first.");
      return;
    }

    setResendBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: emailToSend,
      options: { emailRedirectTo: EMAIL_REDIRECT_TO },
    });
    setResendBusy(false);

    if (error) {
      console.error("Resend confirmation error:", error);
      setAuthMessage(`Could not resend confirmation email: ${error.message}`);
      return;
    }

    setPendingEmailConfirmation(emailToSend);
    setAuthMessage("Sent another confirmation email. Check your inbox and spam folder.");
  }

  async function logout() {
    await supabase.auth.signOut();
    setUserId(null);
    setEmail("");
    setPassword("");
    setNeedsUsername(false);
    setNewUsername("");
    setPosts([]);
  }

  const onTapBrand = useCallback(async () => {
    if (typeof window === "undefined") return;

    const el = feedRef.current;
    const elScrollable = !!el && el.scrollHeight > el.clientHeight + 2;
    const y = elScrollable ? el!.scrollTop : window.scrollY;

    // If not near top, scroll to top.
    if (y > 60) {
      if (elScrollable) el!.scrollTo({ top: 0, behavior: "smooth" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // If already at top, refresh the feed data.
    const activeUserId = userId ?? (await requireApprovedSession());
    if (!activeUserId) return;
    void loadAll(activeUserId);
  }, [userId]);

  // Allow BottomNav (or any component) to trigger the same scroll-to-top + soft refresh behavior
  // as tapping the フィード header title.
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Expose a stable global hook.
    (window as any).__homeTap = () => {
      void onTapBrand();
    };

    return () => {
      try {
        delete (window as any).__homeTap;
      } catch {
        // ignore
      }
    };
  }, [onTapBrand]);

  async function loadAll(uid: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id, image_url, profiles(username, avatar_url)")
      .order("created_at", { ascending: false });

    if (error) {
      const msg = (error.message || "").toLowerCase();
      // If the session is invalid/expired, force logout so the login screen is reachable.
      if (msg.includes("jwt") || msg.includes("token") || msg.includes("auth") || msg.includes("session")) {
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore
        }
        setUserId(null);
        setPosts([]);
      }
      alert(error.message);
      setLoading(false);
      return;
    }

    const normalized: Post[] =
      (data as unknown as DbPostRow[] | null)?.map((row) => {
        const prof = normalizeProfile(row.profiles as any);
        return {
          id: String(row.id),
          content: (row.content ?? "").toString(),
          created_at: row.created_at,
          user_id: row.user_id,
          username: prof.username, // "" si no hay
          avatar_url: prof.avatar_url,
          image_url: (row as any).image_url ?? null,
          likes: 0,
          likedByMe: false,
          commentCount: 0,
        };
      }) ?? [];

    const postIds = normalized.map((p) => p.id);

    if (postIds.length) {
      // posts.id are numeric-looking strings, likes.post_id is bigint.
      // Convert IDs to numbers so the bigint filter matches.
      const postIdsNum = postIds.map((id) => Number(id)).filter((n) => Number.isFinite(n));

      const { data: likesData } = await supabase
        .from("likes")
        .select("post_id, user_id")
        .in("post_id", postIdsNum as any);

      const likeMap = new Map<string, { count: number; mine: boolean }>();
      for (const pid of postIdsNum) likeMap.set(String(pid), { count: 0, mine: false });

      (likesData ?? []).forEach((r: any) => {
        const key = String(r.post_id);
        const cur = likeMap.get(key);
        if (!cur) return;
        cur.count += 1;
        if (uid && r.user_id === uid) cur.mine = true;
        likeMap.set(key, cur);
      });

      normalized.forEach((p) => {
        const v = likeMap.get(String(p.id));
        if (v) {
          p.likes = v.count;
          p.likedByMe = v.mine;
        }
      });
    }

    if (postIds.length) {
      const postIdsNum = postIds.map((id) => Number(id)).filter((n) => Number.isFinite(n));
      const { data: commentRows } = await supabase
        .from("comments")
        .select("post_id")
        .in("post_id", postIdsNum as any);

      const countMap = new Map<string, number>();
      for (const pid of postIdsNum) countMap.set(String(pid), 0);
      (commentRows ?? []).forEach((r: any) => {
        const key = String(r.post_id);
        countMap.set(key, (countMap.get(key) ?? 0) + 1);
      });

      normalized.forEach((p) => (p.commentCount = countMap.get(String(p.id)) ?? 0));
    }

    setPosts(normalized);
    setLoading(false);
  }

  const refreshFeed = useCallback(async () => {
    if (isRefreshing) return;

    const activeUserId = userId ?? (await requireApprovedSession());
    if (!activeUserId) return;

    setIsRefreshing(true);
    try {
      await loadAll(activeUserId);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, userId]);

  // Pull-to-refresh (mobile). Works when scrolling in window or in the feed container.
  const pullReadyRef = useRef(false);
  const isRefreshingRef = useRef(false);
  useEffect(() => {
    pullReadyRef.current = pullReady;
  }, [pullReady]);
  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const el = feedRef.current;

    const isElScrollable = () => {
      if (!el) return false;
      return el.scrollHeight > el.clientHeight + 2;
    };

    const getScrollTop = () => {
      if (isElScrollable()) return el!.scrollTop;
      return window.scrollY;
    };

    let startY = 0;
    let armed = false;
    let idleTimer: any = null;
    const resetPullUI = () => {
      setPullY(0);
      setPullReady(false);
      pullReadyRef.current = false;
    };
    const scheduleIdleReset = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        // If we stopped getting touchmove events (common on iOS rubber-band), hide the pill.
        if (!isRefreshingRef.current) resetPullUI();
      }, 220);
    };

    const THRESHOLD = 80;
    const MAX_PULL = 140;

    const onTouchStart = (e: TouchEvent) => {
      // Only arm when we're at the very top
      if (getScrollTop() <= 0) {
        startY = e.touches[0]?.clientY ?? 0;
        armed = true;
        setPullY(0);
        setPullReady(false);
      } else {
        armed = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!armed) return;
      if (getScrollTop() > 0) return;

      const y = e.touches[0]?.clientY ?? 0;
      const delta = Math.max(0, y - startY);
      if (delta <= 0) return;

      // A little resistance so it feels like IG
      const eased = Math.min(MAX_PULL, delta * 0.6);
      setPullY(eased);
      const ready = eased >= THRESHOLD;
      setPullReady(ready);
      pullReadyRef.current = ready;

      // If the user pauses or the browser swallows touchend, hide the pill shortly after.
      scheduleIdleReset();

      // Prevent Safari rubber-band while we're pulling
      if ((e as any).cancelable) {
        try {
          e.preventDefault();
        } catch {
          // ignore
        }
      }
    };

    const onTouchEnd = () => {
      if (!armed) return;
      armed = false;

      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }

      // Trigger refresh only if we passed threshold and we're not already refreshing
      if (pullReadyRef.current && !isRefreshingRef.current) {
        void refreshFeed();
      }

      // Reset UI
      resetPullUI();
    };

    // Attach to window so it still works even when the scroll container is the window
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false } as any);
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
      window.removeEventListener("touchstart", onTouchStart as any);
      window.removeEventListener("touchmove", onTouchMove as any);
      window.removeEventListener("touchend", onTouchEnd as any);
      window.removeEventListener("touchcancel", onTouchEnd as any);
    };
  }, [refreshFeed]);

  async function createPost() {
    if (busy) return;
    if (!text.trim() && !imageFile) return;

    const activeUserId = userId ?? (await requireApprovedSession());
    if (!activeUserId) return;

    setBusy(true);

    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({ content: text.trim(), user_id: activeUserId })
      .select("id")
      .single();

    if (postError || !post) {
      setBusy(false);
      alert(postError?.message ?? "Post error");
      return;
    }

 if (imageFile) {
  try {
    const normalized = await normalizeImageForUpload(imageFile, "post");
    const uploadFile = normalized.file;

    const ext = (uploadFile.name.split(".").pop() || "jpg").toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `posts/${post.id}.${safeExt}`;

    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(path, uploadFile, { upsert: true, contentType: uploadFile.type || undefined });

    if (uploadError) {
      setBusy(false);
      alert(uploadError.message);
      return;
    }

    const { data: pub } = supabase.storage.from("post-images").getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("posts")
      .update({ image_url: pub.publicUrl })
      .eq("id", post.id);

    if (updateError) {
      setBusy(false);
      alert(updateError.message);
      return;
    }
  } catch (e: any) {
    setBusy(false);
    alert(e?.message ?? "Could not process image.");
    return;
  }
}


    setText("");
    setImageFile(null);
    setBusy(false);
    void loadAll(activeUserId);
  }

  async function toggleLike(postId: string) {
    if (likeBusyByPost[postId]) return;
    setLikeBusyByPost((prev) => ({ ...prev, [postId]: true }));

    try {
      const activeUserId = userId ?? (await requireApprovedSession());
      if (!activeUserId) return;

      const p = posts.find((x) => x.id === postId);
      if (!p) return;

      // optimistic UI
      setPosts((prev) =>
        prev.map((x) =>
          x.id === postId
            ? { ...x, likedByMe: !x.likedByMe, likes: x.likedByMe ? x.likes - 1 : x.likes + 1 }
            : x
        )
      );

      // DB uses bigint post_id.
      const pid = Number(postId);

      if (p.likedByMe) {
        // unlike
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", pid)
          .eq("user_id", activeUserId);

        if (error) {
          alert(error.message);
          void loadAll(activeUserId);
        }
      } else {
        // like
        const { error } = await supabase.from("likes").insert({ post_id: pid, user_id: activeUserId });

        if (error) {
          const msg = (error.message || "").toLowerCase();
          const code = (error as any).code;

          // Ignore duplicate like errors (unique constraint) because the end state is already "liked".
          if (code === "23505" || msg.includes("duplicate") || msg.includes("unique")) {
            // no alert
          } else {
            alert(error.message);
          }
          void loadAll(activeUserId);
        }
      }
    } finally {
      setLikeBusyByPost((prev) => ({ ...prev, [postId]: false }));
    }
  }

  async function deletePost(postId: string) {
    const activeUserId = userId ?? (await requireApprovedSession());
    if (!activeUserId) return;
    const ok = confirm("Delete this post?");
    if (!ok) return;

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId)
      .eq("user_id", activeUserId);
    if (error) return alert(error.message);

    if (openCommentsFor === postId) setOpenCommentsFor(null);
    void loadAll(activeUserId);
  }

  async function loadComments(postId: string) {
    // comments.post_id is usually bigint. Normalize to a number when possible.
    const pidNum = Number(postId);
    if (!Number.isFinite(pidNum)) return;

    // 1) Fetch comments WITHOUT embedding profiles (avoids ambiguous FK paths)
    const { data: rows, error } = await supabase
      .from("comments")
      .select("id, post_id, user_id, content, created_at, parent_comment_id")
      .eq("post_id", pidNum)
      .order("created_at", { ascending: true });

    if (error) return alert(error.message);

    const normalized: any[] =
      (rows as any[] | null)?.map((row) => {
        return {
          id: String(row.id),
          post_id: String(row.post_id),
          user_id: String(row.user_id),
          content: (row.content ?? "").toString(),
          created_at: row.created_at,
          parent_comment_id: row.parent_comment_id ? String(row.parent_comment_id) : null,
          username: "", // filled in below
          avatar_url: null as string | null,
          likeCount: 0,
          likedByMe: false,
        };
      }) ?? [];

    // 2) Fetch commenter profiles in one query and merge
    try {
      const userIds = Array.from(new Set(normalized.map((c) => c.user_id).filter(Boolean)));
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", userIds as any);

        const map = new Map<string, any>();
        (profs ?? []).forEach((p: any) => map.set(String(p.id), p));

        normalized.forEach((c) => {
          const p = map.get(String(c.user_id));
          // Reuse normalizeProfile so we keep the same username rules.
          const prof = normalizeProfile(p);
          c.username = prof.username;
          c.avatar_url = prof.avatar_url;
        });
      }
    } catch {
      // ignore profile hydration failures
    }

    // 3) Populate comment like counts + my like state
    try {
      const activeUserId = userId ?? null;
      const commentIds = normalized.map((c) => c.id);

      if (commentIds.length) {
        const { data: likeRows } = await supabase
          .from("comment_likes")
          .select("comment_id, user_id")
          .in("comment_id", commentIds as any);

        const map = new Map<string, { count: number; mine: boolean }>();
        for (const id of commentIds) map.set(String(id), { count: 0, mine: false });

        (likeRows ?? []).forEach((r: any) => {
          const key = String(r.comment_id);
          const cur = map.get(key);
          if (!cur) return;
          cur.count += 1;
          if (activeUserId && r.user_id === activeUserId) cur.mine = true;
          map.set(key, cur);
        });

        normalized.forEach((c) => {
          const v = map.get(String(c.id));
          if (v) {
            c.likeCount = v.count;
            c.likedByMe = v.mine;
          }
        });
      }
    } catch {
      // ignore like hydration failures
    }

    setCommentsByPost((prev) => ({ ...prev, [postId]: normalized as any }));
  }
  async function toggleCommentLike(postId: string, commentId: string, commentOwnerId: string) {
    if (likeBusyByComment[commentId]) return;
    setLikeBusyByComment((prev) => ({ ...prev, [commentId]: true }));

    try {
      const activeUserId = userId ?? (await requireApprovedSession());
      if (!activeUserId) return;

      // Find current comment state
      const list = commentsByPost[postId] ?? [];
      const cur = list.find((c) => String(c.id) === String(commentId));
      if (!cur) return;

      const wasLiked = !!(cur as any).likedByMe;

      // Optimistic UI
      setCommentsByPost((prev) => {
        const arr = prev[postId] ?? [];
        return {
          ...prev,
          [postId]: arr.map((c) => {
            if (String(c.id) !== String(commentId)) return c;
            const liked = !wasLiked;
            const count = Math.max(0, ((c as any).likeCount ?? 0) + (liked ? 1 : -1));
            return { ...(c as any), likedByMe: liked, likeCount: count };
          }),
        };
      });

      if (wasLiked) {
        // Unlike
        const { error } = await supabase
          .from("comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", activeUserId);

        if (error) {
          alert(error.message);
          await loadComments(postId);
        }
        return;
      }

      // Like
      const { error } = await supabase
        .from("comment_likes")
        .insert({ comment_id: commentId, user_id: activeUserId });

      if (error) {
        const msg = (error.message || "").toLowerCase();
        const code = (error as any).code;
        // Ignore duplicate like
        if (!(code === "23505" || msg.includes("duplicate") || msg.includes("unique"))) {
          alert(error.message);
        }
        await loadComments(postId);
        return;
      }

      // Notify comment owner (best-effort)
      try {
        if (commentOwnerId && commentOwnerId !== activeUserId) {
          await supabase.from("notifications").insert({
            user_id: commentOwnerId,
            actor_id: activeUserId,
            post_id: Number(postId),
            comment_id: String(commentId),
            type: "comment_like",
            read: false,
          });
        }
      } catch {
        // ignore
      }
    } finally {
      setLikeBusyByComment((prev) => ({ ...prev, [commentId]: false }));
    }
  }

  async function addComment(postId: string) {
    const activeUserId = userId ?? (await requireApprovedSession());
    if (!activeUserId) return;
    if (commentBusy) return;
    if (!commentText.trim()) return;

    setCommentBusy(true);

    try {
      const reply = replyToByPost[postId];
      const parentId = reply ? reply.commentId : null;

      // Insert comment and get id for notifications deep-link
      const { data: inserted, error } = await supabase
        .from("comments")
        .insert({
          post_id: Number(postId),
          user_id: activeUserId,
          content: commentText.trim(),
          parent_comment_id: parentId,
        })
        .select("id")
        .single();

      if (error) throw error;
      const newCommentId = (inserted as any)?.id ? String((inserted as any).id) : null;

      // Best-effort notifications
      try {
        // Post owner
        const { data: postRow } = await supabase
          .from("posts")
          .select("user_id")
          .eq("id", Number(postId))
          .maybeSingle();
        const postOwnerId = (postRow as any)?.user_id ? String((postRow as any).user_id) : null;

        // Parent comment owner (if reply)
        let parentOwnerId: string | null = null;
        if (parentId) {
          const { data: parentRow } = await supabase
            .from("comments")
            .select("user_id")
            .eq("id", parentId)
            .maybeSingle();
          parentOwnerId = (parentRow as any)?.user_id ? String((parentRow as any).user_id) : null;
        }

        const inserts: any[] = [];

        // Comment notification to post owner
        if (postOwnerId && postOwnerId !== activeUserId && newCommentId) {
          inserts.push({
            user_id: postOwnerId,
            actor_id: activeUserId,
            post_id: Number(postId),
            comment_id: newCommentId,
            type: "comment",
            read: false,
          });
        }

        // Reply notification to parent comment owner
        if (
          parentOwnerId &&
          parentOwnerId !== activeUserId &&
          parentOwnerId !== postOwnerId &&
          newCommentId
        ) {
          inserts.push({
            user_id: parentOwnerId,
            actor_id: activeUserId,
            post_id: Number(postId),
            comment_id: newCommentId,
            type: "reply",
            read: false,
          });
        }

        if (inserts.length) {
          await supabase.from("notifications").insert(inserts);
        }
      } catch {
        // ignore notification failures
      }

      setCommentText("");
      clearReply(postId);
      await loadComments(postId);
      await loadAll(activeUserId);
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to add comment.");
    } finally {
      setCommentBusy(false);
    }
  }

  async function openComments(postId: string) {
    const next = openCommentsFor === postId ? null : postId;
    setOpenCommentsFor(next);
    setCommentText("");
    clearReply(postId);
    if (next) await loadComments(next);
  }

  async function uploadMyAvatar(file: File) {
    const activeUserId = userId ?? (await requireApprovedSession());
    if (!activeUserId) return;
    if (avatarBusy) return;

    setAvatarBusy(true);
let uploadFile: File = file;
try {
  const normalized = await normalizeImageForUpload(file, "avatar");
  uploadFile = normalized.file;

  // show processed avatar immediately
  if (normalized.previewUrl) setMyAvatarUrl(normalized.previewUrl);
} catch (e: any) {
  setAvatarBusy(false);
  return alert(e?.message ?? "Could not process image.");
}

const ext = (uploadFile.name.split(".").pop() || "jpg").toLowerCase();
const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
const path = `avatars/${activeUserId}.${safeExt}`;

const { error: uploadError } = await supabase.storage
  .from("post-images")
  .upload(path, uploadFile, { upsert: true, contentType: uploadFile.type || undefined });


    if (uploadError) {
      setAvatarBusy(false);
      return alert(uploadError.message);
    }

    const { data: pub } = supabase.storage.from("post-images").getPublicUrl(path);

    const { error: updateError } = await supabase.from("profiles").upsert({
      id: activeUserId,
      username:
        myUsername === "unknown" || /^user_[a-z0-9]+$/.test((myUsername ?? "").toString().toLowerCase())
          ? null
          : myUsername,
      avatar_url: pub.publicUrl,
    });

    setAvatarBusy(false);

    if (updateError) return alert(updateError.message);

    setMyAvatarUrl(pub.publicUrl);
    void loadAll(activeUserId);
  }


  const headerAvatarInitial = useMemo(() => (myUsername?.[0] || "?").toUpperCase(), [myUsername]);


  const linkStyle: React.CSSProperties = { color: "inherit", textDecoration: "none" };

  // --------- SCREENS ---------

  if (!userId) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ width: 360, background: "#111", color: "#fff", borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 0 }} className="brand">
            フィード
          </div>
          <div style={{ opacity: 0.7, marginTop: 6, marginBottom: 14, fontSize: 13 }}>
            Log in with email and password
          </div>

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.15)",
              background: "rgba(255,255,255,.06)",
              color: "#fff",
              outline: "none",
              marginBottom: 8,
            }}
            autoFocus
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.15)",
              background: "rgba(255,255,255,.06)",
              color: "#fff",
              outline: "none",
              marginBottom: 10,
            }}
          />

          {authMode === "signup" ? (
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Application (all required except JLPT)</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,.15)",
                    background: "rgba(255,255,255,.06)",
                    color: "#fff",
                    outline: "none",
                  }}
                />
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,.15)",
                    background: "rgba(255,255,255,.06)",
                    color: "#fff",
                    outline: "none",
                  }}
                />
              </div>

              <input
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
                placeholder="Campus"
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,.15)",
                  background: "rgba(255,255,255,.06)",
                  color: "#fff",
                  outline: "none",
                }}
              />

              <input
                value={classLevel}
                onChange={(e) => setClassLevel(e.target.value)}
                placeholder="class level (e.g., A2 / Japanese 2 / Group 3)"
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,.15)",
                  background: "rgba(255,255,255,.06)",
                  color: "#fff",
                  outline: "none",
                }}
              />

              <input
                value={jlptLevel}
                onChange={(e) => setJlptLevel(e.target.value)}
                placeholder="JLPT passed (optional, e.g., N4)"
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,.15)",
                  background: "rgba(255,255,255,.06)",
                  color: "#fff",
                  outline: "none",
                }}
              />

              <div style={{ marginTop: 2 }}>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
                  JLPT certificate (optional, for badge verification)
                </div>

                <input
                  type="file"
                  accept="image/*"
                  disabled={!!jlptCertFile}
                  onChange={(e) => setJlptCertFile(e.target.files?.[0] ?? null)}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,.15)",
                    background: "rgba(255,255,255,.06)",
                    color: "#fff",
                    outline: "none",
                    opacity: jlptCertFile ? 0.6 : 1,
                    cursor: jlptCertFile ? "not-allowed" : "pointer",
                  }}
                />

                {jlptCertPreviewUrl ? (
                  <div style={{ marginTop: 10, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,.12)" }}>
                    <img
                      src={jlptCertPreviewUrl}
                      alt="JLPT certificate preview"
                      style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }}
                    />
                  </div>
                ) : null}
                {jlptCertFile ? (
                  <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>
                    JLPT certificate selected. You can submit another one after this is reviewed.
                  </div>
                ) : null}

                <div style={{ fontSize: 12, opacity: 0.65, marginTop: 8, lineHeight: 1.4 }}>
                  Optional. If email confirmation is enabled, we will upload this after you confirm and log in.
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  min="1900-01-01"
                  max={new Date().toISOString().slice(0, 10)}
                  inputMode="numeric"
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,.15)",
                    background: "rgba(255,255,255,.06)",
                    color: "#fff",
                    outline: "none",
                  }}
                />

                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,.15)",
                    background: "rgba(255,255,255,.06)",
                    color: "#fff",
                    outline: "none",
                    appearance: "none",
                  }}
                >
                  <option value="" style={{ color: "#111" }}>gender</option>
                  <option value="male" style={{ color: "#111" }}>male</option>
                  <option value="female" style={{ color: "#111" }}>female</option>
                  <option value="non-binary" style={{ color: "#111" }}>non-binary</option>
                  <option value="prefer_not_to_say" style={{ color: "#111" }}>prefer not to say</option>
                </select>
              </div>

              <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.4 }}>
                This is your application. You will be able to use the app after an admin approves you.
              </div>
            </div>
          ) : null}

          {pendingEmailConfirmation ? (
            <div style={{ marginBottom: 10, fontSize: 12, lineHeight: 1.5, color: "#d1d5ff" }}>
              We’ve sent a confirmation link to {pendingEmailConfirmation}. Confirm your email, then log in.
            </div>
          ) : null}

          <button
            onClick={authMode === "login" ? loginWithPassword : signUpWithPassword}
            disabled={
              authBusy ||
              !email.trim() ||
              !password ||
              (authMode === "signup" && !!getApplicationDraftError())
            }
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "0",
              background: "#fff",
              color: "#111",
              fontWeight: 800,
              cursor: "pointer",
              opacity:
                authBusy ||
                !email.trim() ||
                !password ||
                (authMode === "signup" && !!getApplicationDraftError())
                  ? 0.6
                  : 1,
              marginTop: 4,
            }}
          >
            {authBusy ? "Loading…" : authMode === "login" ? "Log in" : "Sign up"}
          </button>

          {pendingEmailConfirmation ? (
            <button
              onClick={() => resendConfirmation()}
              disabled={resendBusy}
              style={{
                marginTop: 10,
                width: "100%",
                padding: 10,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(255,255,255,.05)",
                color: "#fff",
                cursor: resendBusy ? "not-allowed" : "pointer",
              }}
            >
              {resendBusy ? "Resending…" : "Resend confirmation email"}
            </button>
          ) : null}

          <button
            onClick={() => {
              setAuthMode((prev) => {
                const next = prev === "login" ? "signup" : "login";
                if (next !== "signup") {
                  setJlptCertFile(null);
                  try {
                    void clearJlptCertFromIndexedDB();
                  } catch {
                    // ignore
                  }
                }
                return next;
              });
            }}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.1)",
              background: "transparent",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              marginTop: 10,
            }}
          >
            {authMode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
          </button>

          {authMessage ? (
            <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.4, color: "#cfd4ff" }}>
              {authMessage}
            </div>
          ) : null}
        </div>
      </main>
    );
  }

  if (checkingProfile) {
    return <div style={{ padding: 24, color: "#777" }}>Loading…</div>;
  }

  if (needsUsername) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ width: 360, background: "#111", color: "#fff", borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>Choose a username</div>
          <div style={{ opacity: 0.7, marginTop: 6, marginBottom: 14, fontSize: 13 }}>This will show on your posts.</div>

          <input
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="username"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.15)",
              background: "rgba(255,255,255,.06)",
              color: "#fff",
              outline: "none",
              marginBottom: 8,
            }}
            autoFocus
          />

          {usernameError ? (
            <div style={{ color: "#ffb4b4", fontSize: 12, marginBottom: 10 }}>{usernameError}</div>
          ) : null}

          <button
            onClick={saveUsername}
            disabled={saveBusy || !!usernameError}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "0",
              background: "#fff",
              color: "#111",
              fontWeight: 800,
              cursor: "pointer",
              opacity: saveBusy || !!usernameError ? 0.6 : 1,
            }}
          >
            {saveBusy ? "Saving…" : "Save"}
          </button>

          <button
            onClick={logout}
            style={{
              width: "100%",
              marginTop: 10,
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.15)",
              background: "transparent",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Log out
          </button>
        </div>
      </main>
    );
  }

  // FEED
  const myProfileHref = userId ? `/profile/${encodeURIComponent(userId)}` : "/";
  return (
    <>
      <style>{`
        @keyframes nhfSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div
        ref={feedRef}
        className="feed"
        style={{
          paddingBottom: 80,
          minHeight: "100vh",
          overscrollBehaviorY: "contain",
          touchAction: "pan-x pan-y",
        }}
      >
      <div className={`header ${headerHidden ? "header--hidden" : ""}`}>
        <div className="headerInner">
          <button
            type="button"
            className="headerTitleBtn"
            onClick={() => void onTapBrand()}
            aria-label="Scroll to top or refresh"
          >
            <NextImage
              src="/logo-header.png"
              alt="フィード"
              width={180}
              height={40}
              priority
              style={{ height: 40, width: "auto", display: "block" }}
            />
          </button>
        </div>
      </div>


      {(pullY > 0 || isRefreshing) ? (
        <div
          style={{
            height: 0,
            overflow: "visible",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              transform: `translateY(${Math.min(60, pullY)}px)`,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid rgba(0,0,0,0.08)",
              background: "rgba(255,255,255,0.92)",
              color: "rgba(0,0,0,0.7)",
              fontSize: 12,
              boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
              pointerEvents: "none",
            }}
            aria-hidden
          >
            {isRefreshing ? (
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  border: "2px solid rgba(0,0,0,0.25)",
                  borderTopColor: "rgba(0,0,0,0.65)",
                  display: "inline-block",
                  animation: "nhfSpin 0.8s linear infinite",
                }}
              />
            ) : (
              <span
                style={{
                  display: "inline-block",
                  transform: pullReady ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 120ms ease",
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                ↓
              </span>
            )}
            <span>{isRefreshing ? "Refreshing…" : pullReady ? "Release to refresh" : "Pull to refresh"}</span>
          </div>
        </div>
      ) : null}

      <div className="composer">
        <div className="composer-row">
          <textarea
            className="textarea"
            ref={composerRef}
            placeholder="日本語で書いてね…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <button className="postBtn" onClick={createPost} disabled={busy || (!text.trim() && !imageFile)}>
            {busy ? "投稿中…" : "投稿"}
          </button>
        </div>

        <div className="fileRow">
 
<input
  id="image"
  className="fileInput"
  type="file"
  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
/>

          <label className="fileBtn" htmlFor="image">
            画像
          </label>

          <div className="fileName">{imageFile ? imageFile.name : "画像なし"}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 16 }} className="muted">
          Loading…
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {posts.map((p) => {
            const initial = (p.username?.[0] || "?").toUpperCase();
            const canDelete = !!userId && p.user_id === userId;
            // Link posts and avatars using the user_id rather than the username to ensure stable routing.
            const profileHref = p.user_id ? `/profile/${encodeURIComponent(p.user_id)}` : "";

            return (
              <div className="post" key={p.id}>
                <div className="post-header" style={{ position: "relative" }}>
                  {profileHref ? (
                    <Link href={profileHref} className="avatar" style={linkStyle} aria-label={`Open profile ${p.username || "unknown"}`}>
                      {p.avatar_url ? <img src={p.avatar_url} alt={p.username} /> : <span>{initial}</span>}
                    </Link>
                  ) : (
                    <div className="avatar" aria-label="No profile">
                      {p.avatar_url ? <img src={p.avatar_url} alt="unknown" /> : <span>{initial}</span>}
                    </div>
                  )}

                  <div className="postMeta">
                    <div className="nameRow">
                      {p.username ? (
                        <Link href={profileHref} className="handle" style={linkStyle}>
                          @{p.username}
                        </Link>
                      ) : (
                        <span className="handle muted">@unknown</span>
                      )}

                      <button
                        ref={(el) => {
                          menuBtnRef.current[p.id] = el;
                        }}
                        type="button"
                        className="ghostBtn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenuFor((cur) => (cur === p.id ? null : p.id));
                        }}
                        aria-label="Post menu"
                        title="Menu"
                        style={{ padding: 0, border: 0, background: "transparent", cursor: "pointer", fontSize: 18, lineHeight: 1 }}
                      >
                        ⋯
                      </button>

                      {openMenuFor === p.id ? (
                        <div
                          ref={(el) => {
                            menuRef.current[p.id] = el;
                          }}
                          style={{
                            position: "absolute",
                            right: 12,
                            top: 44,
                            background: "rgba(20,20,24,0.98)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 12,
                            padding: 6,
                            minWidth: 160,
                            zIndex: 50,
                            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setOpenMenuFor(null);
                              void downloadPostCard(p);
                            }}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              padding: "10px 10px",
                              borderRadius: 10,
                              border: 0,
                              background: "transparent",
                              color: "rgba(255,255,255,0.92)",
                              cursor: "pointer",
                              fontSize: 13,
                              fontWeight: 700,
                            }}
                          >
                            カードを保存
                          </button>

                          {canDelete ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setOpenMenuFor(null);
                                void deletePost(p.id);
                              }}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                padding: "10px 10px",
                                borderRadius: 10,
                                border: 0,
                                background: "transparent",
                                color: "rgba(255,120,120,0.95)",
                                cursor: "pointer",
                                fontSize: 13,
                                fontWeight: 800,
                              }}
                            >
                              削除
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div
                      className="muted"
                      style={{ fontSize: 12, lineHeight: 1.2 }}
                      title={new Date(p.created_at).toLocaleString()}
                    >
                      {timeAgoJa(p.created_at)}
                    </div>
                  </div>
                </div>

                {p.content ? <div className="post-content">{p.content}</div> : null}

                {p.image_url ? (
                  <div style={{ padding: "0 12px 12px" }}>
                    <img src={p.image_url} alt="post" className="postImage" />
                  </div>
                ) : null}

                <div className="actionsRow">
                  <button className="likeBtn" onClick={() => toggleLike(p.id)}>
                    <span className="icon">{p.likedByMe ? "💙" : "🤍"}</span>
                    <span>いいね！</span>
                    <span className="muted">{p.likes}</span>
                  </button>

                  <button className="commentBtn" onClick={() => void openComments(p.id)}>
                    <span className="icon">💬</span>
                    <span>コメント</span>
                    <span className="muted">{p.commentCount}</span>
                  </button>
                </div>

                {openCommentsFor === p.id ? (
                  <div className="comments">
                    <div className="commentsList">
                      {(commentsByPost[p.id] ?? []).length === 0 ? (
                        <div className="muted" style={{ fontSize: 13, padding: 8 }}>
                          まだコメントはありません。
                        </div>
                      ) : (
                        (() => {
                          const list = commentsByPost[p.id] ?? [];
                          const byParent: Record<string, Comment[]> = {};
                          const roots: Comment[] = [];

                          list.forEach((c) => {
                            const pid = c.parent_comment_id ? String(c.parent_comment_id) : "";
                            if (!pid) roots.push(c);
                            else (byParent[pid] ||= []).push(c);
                          });

                          const render = (c: Comment, depth: number) => {
                            const ci = (c.username?.[0] || "?").toUpperCase();
                            const cProfileHref = c.user_id ? `/profile/${encodeURIComponent(c.user_id)}` : "";
                            const kids = byParent[String(c.id)] ?? [];

                            return (
                              <div key={c.id}>
                                <div
                                  className="comment"
                                  style={{
                                    marginLeft: depth > 0 ? 14 : 0,
                                    borderLeft: depth > 0 ? "3px solid rgba(17,17,20,.08)" : undefined,
                                    paddingLeft: depth > 0 ? 10 : undefined,
                                  }}
                                >
                                  {cProfileHref ? (
                                    <Link
                                      href={cProfileHref}
                                      className="cAvatar"
                                      style={linkStyle}
                                      aria-label={`Open profile ${c.username || "unknown"}`}
                                    >
                                      {c.avatar_url ? <img src={c.avatar_url} alt={c.username} /> : <span>{ci}</span>}
                                    </Link>
                                  ) : (
                                    <div className="cAvatar">
                                      {c.avatar_url ? <img src={c.avatar_url} alt="unknown" /> : <span>{ci}</span>}
                                    </div>
                                  )}

                                  <div className="cBody">
                                    <div className="cTop">
                                      <div className="cUser">
                                        {c.username ? (
                                          <Link href={cProfileHref} style={linkStyle}>
                                            @{c.username}
                                          </Link>
                                        ) : (
                                          "@unknown"
                                        )}
                                      </div>
                                      <div
                                        className="muted"
                                        style={{ fontSize: 11, lineHeight: 1.2 }}
                                        title={new Date(c.created_at).toLocaleString()}
                                      >
                                        {timeAgoJa(c.created_at)}
                                      </div>
                                    </div>

                                    <div className="cText">{c.content}</div>

                                    <div style={{ marginTop: 6, display: "flex", gap: 12, alignItems: "center" }}>
                                      <button
                                        type="button"
                                        className="ghostBtn"
                                        onClick={() => void toggleCommentLike(p.id, c.id, c.user_id)}
                                        disabled={!!likeBusyByComment[c.id]}
                                        style={{
                                          padding: 0,
                                          border: 0,
                                          background: "transparent",
                                          cursor: "pointer",
                                          fontSize: 12,
                                          opacity: likeBusyByComment[c.id] ? 0.5 : 0.85,
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 6,
                                        }}
                                        aria-label="Like comment"
                                        title="Like"
                                      >
                                        <span style={{ fontSize: 13 }}>{(c as any).likedByMe ? "💙" : "🤍"}</span>
                                        <span style={{ opacity: 0.8 }}>いいね！</span>
                                        <span className="muted" style={{ fontSize: 12 }}>{(c as any).likeCount ?? 0}</span>
                                      </button>

                                      <button
                                        type="button"
                                        className="ghostBtn"
                                        onClick={() => startReply(p.id, c.id, c.username)}
                                        style={{
                                          padding: 0,
                                          border: 0,
                                          background: "transparent",
                                          cursor: "pointer",
                                          fontSize: 12,
                                          opacity: 0.7,
                                        }}
                                      >
                                        返信
                                      </button>

                                      {userId && c.user_id === userId ? (
                                        <button
                                          type="button"
                                          className="ghostBtn"
                                          onClick={() => void deleteComment(p.id, c.id)}
                                          style={{
                                            padding: 0,
                                            border: 0,
                                            background: "transparent",
                                            cursor: "pointer",
                                            fontSize: 12,
                                            opacity: 0.7,
                                          }}
                                        >
                                          削除
                                        </button>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>

                                {kids.length ? (
                                  <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                                    {kids.map((k) => render(k, depth + 1))}
                                  </div>
                                ) : null}
                              </div>
                            );
                          };

                          return roots.map((c) => render(c, 0));
                        })()
                      )}
                    </div>

                    <div className="commentComposer">
                      {replyToByPost[p.id] ? (
                        <div
                          style={{
                            fontSize: 12,
                            opacity: 0.7,
                            marginBottom: 6,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span>{`@${replyToByPost[p.id]!.username} に返信中`}</span>
                          <button
                            type="button"
                            onClick={() => clearReply(p.id)}
                            style={{
                              padding: 0,
                              border: 0,
                              background: "transparent",
                              cursor: "pointer",
                              fontSize: 12,
                              opacity: 0.7,
                            }}
                          >
                            やめる
                          </button>
                        </div>
                      ) : null}

                      <input
                        ref={commentInputRef}
                        className="commentInput"
                        placeholder="コメントを書く…"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                      />
                      <button className="miniPost" disabled={commentBusy || !commentText.trim()} onClick={() => void addComment(p.id)}>
                        {commentBusy ? "…" : "送信"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
      </div>

      <BottomNav
        profileHref={myProfileHref}
        profileAvatarUrl={myAvatarUrl ?? null}
        profileInitial={(myUsername?.[0] ?? "?").toUpperCase()}
      />
    </>
  );
}
