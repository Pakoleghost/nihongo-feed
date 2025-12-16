"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type ImageKind = "avatar" | "certificate";

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

function computeResize(w: number, h: number, maxDim: number): { w: number; h: number } {
  if (Math.max(w, h) <= maxDim) return { w, h };
  const scale = maxDim / Math.max(w, h);
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

async function supportsWebP(): Promise<boolean> {
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

async function normalizeImageForUpload(file: File, kind: ImageKind): Promise<File> {
  const maxDim = kind === "avatar" ? 512 : 1600;
  const quality = kind === "avatar" ? 0.85 : 0.84;

  const mime = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  const looksImage = mime.startsWith("image/") || name.endsWith(".heic") || name.endsWith(".heif");
  if (!looksImage) throw new Error("Please choose an image file.");

  let working: File = file;

  if (isHeicLike(file)) {
    const mod: any = await import("heic2any");
    const heic2any = mod?.default ?? mod;
    const outBlob = (await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 })) as Blob;
    working = await blobToFile(outBlob, (file.name || "upload").replace(/\.(heic|heif)$/i, ".jpg"));
  }

  const objectUrl = URL.createObjectURL(working);
  try {
    const img = new Image();
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
    return await blobToFile(outBlob, `${base}.${ext}`);
  } finally {
    try { URL.revokeObjectURL(objectUrl); } catch {}
  }
}

function levelChip(level: string) {
  const v = (level || "").toLowerCase().trim();
  if (!v) return null;

  // simple color coding without needing Tailwind config
  const bg =
    v.includes("n5") || v.includes("a1") ? "#2d6a4f" :
    v.includes("n4") || v.includes("a2") ? "#1d4ed8" :
    v.includes("n3") || v.includes("b1") ? "#7c3aed" :
    v.includes("n2") || v.includes("b2") ? "#b45309" :
    v.includes("n1") || v.includes("c1") || v.includes("c2") ? "#b91c1c" :
    "#374151";

  return (
    <span
      style={{
        background: bg,
        color: "#fff",
        fontSize: 12,
        fontWeight: 700,
        padding: "4px 8px",
        borderRadius: 999,
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
      }}
      title="Level"
    >
      {level}
    </span>
  );
}

export type ProfileHeaderClientProps = {
  isOwn: boolean;
  profileId: string;
  username: string;
  avatarUrl: string | null;
  bio: string;
  level: string;
  group: string;
  jlptLevel?: string | null;
  postCount: number;
  commentCount: number;
  hasPendingJlpt?: boolean;
  fullName?: string | null;
  // NOTE: page.tsx passes viewerIsAdmin. Keep isAdmin as a backward-compatible alias.
  viewerIsAdmin?: boolean;
  isAdmin?: boolean;
};

export default function ProfileHeaderClient(props: ProfileHeaderClientProps) {
  const {
    isOwn,
    profileId,
    username,
    avatarUrl,
    bio,
    level,
    group,
    jlptLevel,
    postCount,
    commentCount,
    hasPendingJlpt = false,
    fullName,
    viewerIsAdmin,
    isAdmin,
  } = props;

  const adminFlag = viewerIsAdmin ?? isAdmin ?? false;

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editBioOpen, setEditBioOpen] = useState(false);
  const [bioDraft, setBioDraft] = useState(bio || "");

  const menuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const jlptInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingJlpt, setUploadingJlpt] = useState(false);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as any)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const initial = (username?.[0] || "?").toUpperCase();

  async function saveBio() {
    setSaving(true);
    const next = (bioDraft || "").trim();

    const { error } = await supabase
      .from("profiles")
      .update({ bio: next })
      .eq("id", profileId);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    setEditBioOpen(false);
    setOpen(false);
    // simplest: reload to reflect server-rendered page
    window.location.reload();
  }

  function changePhoto() {
    setOpen(false);
    fileInputRef.current?.click();
  }

  function submitJlptCertificate() {
    if (hasPendingJlpt) return;
    setOpen(false);
    jlptInputRef.current?.click();
  }

  async function onPickJlptCertificate(file: File) {
    try {
      setUploadingJlpt(true);

      if (!file.type.startsWith("image/")) {
        alert("Please choose an image file.");
        return;
      }

      const uploadFile = await normalizeImageForUpload(file, "certificate");

const extRaw = (uploadFile.name.split(".").pop() || "jpg").toLowerCase();
const ext = extRaw.replace(/[^a-z0-9]/g, "") || "jpg";
const path = `certificates/${profileId}/${Date.now()}.${ext}`;

      const bucket = "jlpt-certificates";
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, uploadFile, {
        upsert: false,
        contentType: uploadFile.type,
      });

      if (upErr) {
        alert(upErr.message);
        return;
      }

      const { error: insErr } = await supabase.from("jlpt_submissions").insert({
        user_id: profileId,
        image_path: path,
        status: "pending",
      });

      if (insErr) {
        alert(insErr.message);
        return;
      }

      alert("JLPT certificate submitted. An admin will review it.");
    } finally {
      setUploadingJlpt(false);
    }
  }

  async function onPickPhoto(file: File) {
    try {
      setUploadingAvatar(true);

      const uploadFile = await normalizeImageForUpload(file, "avatar");

const extRaw = (uploadFile.name.split(".").pop() || "jpg").toLowerCase();
const ext = extRaw.replace(/[^a-z0-9]/g, "") || "jpg";
const path = `avatars/${profileId}.${ext}`;

      // Upload to Supabase Storage (bucket name used by the app)
      const bucket = "post-images";
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, uploadFile, {
        upsert: true,
        contentType: uploadFile.type,
      });

      if (upErr) {
        alert(upErr.message);
        return;
      }

      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      const nextUrl = pub?.publicUrl || null;

      const { error: profErr } = await supabase
        .from("profiles")
        .update({ avatar_url: nextUrl })
        .eq("id", profileId);

      if (profErr) {
        alert(profErr.message);
        return;
      }

      // simplest: reload to reflect server-rendered page
      window.location.reload();
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function logout() {
    setOpen(false);
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert(error.message);
      return;
    }
    window.location.href = "/";
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
accept="image/jpeg,image/png,image/webp,image/heic,image/heif"        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          // allow selecting the same file twice
          e.currentTarget.value = "";
          if (f) void onPickPhoto(f);
        }}
      />
      <input
        ref={jlptInputRef}
        type="file"
accept="image/jpeg,image/png,image/webp,image/heic,image/heif"        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          // allow selecting the same file twice
          e.currentTarget.value = "";
          if (f) void onPickJlptCertificate(f);
        }}
      />
      <div className="post-header" style={{ alignItems: "flex-start" }}>
        {isOwn ? (
          <button
            type="button"
            onClick={changePhoto}
            disabled={uploadingAvatar || uploadingJlpt}
            aria-label="Change profile photo"
            style={{
              padding: 0,
              border: 0,
              background: "transparent",
              cursor: uploadingAvatar || uploadingJlpt ? "not-allowed" : "pointer",
            }}
          >
            <div className="avatar" aria-label="Profile avatar" style={{ width: 96, height: 96 }}>
              {avatarUrl ? <img src={avatarUrl} alt={username} /> : <span>{initial}</span>}
            </div>
          </button>
        ) : (
          <div className="avatar" aria-label="Profile avatar" style={{ width: 96, height: 96 }}>
            {avatarUrl ? <img src={avatarUrl} alt={username} /> : <span>{initial}</span>}
          </div>
        )}

        <div className="postMeta" style={{ width: "100%" }}>
          <div
            className="nameRow"
            style={{
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {adminFlag && fullName ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 20, fontWeight: 900 }}>
                      {fullName}
                    </span>
                    <span className="handle" style={{ color: "inherit", fontSize: 14, opacity: 0.7 }}>
                      @{username}
                    </span>
                  </div>
                ) : (
                  <span className="handle" style={{ color: "inherit", fontSize: 22, fontWeight: 800 }}>
                    @{username}
                  </span>
                )}

                {jlptLevel ? levelChip(jlptLevel) : levelChip(level)}

                {group ? (
                  <span className="muted" style={{ fontSize: 12 }}>
                    {group}
                  </span>
                ) : null}
              </div>

              <div className="muted" style={{ fontSize: 14 }}>
                投稿: <span className="muted">{postCount}</span> · コメント:{" "}
                <span className="muted">{commentCount}</span>
              </div>

              {isOwn ? (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="ghostBtn"
                    onClick={() => setEditBioOpen(true)}
                    disabled={uploadingAvatar || uploadingJlpt}
                  >
                    Edit bio
                  </button>
                </div>
              ) : null}
            </div>

            {/* 3-dot menu */}
            {isOwn ? (
              <div ref={menuRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  aria-label="Profile menu"
                  disabled={uploadingAvatar || uploadingJlpt}
                  style={{
                    width: 40,
                    height: 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "#fff",
                    color: "#111",
                    fontSize: 22,
                    fontWeight: 900,
                    cursor: uploadingAvatar || uploadingJlpt ? "not-allowed" : "pointer",
                    position: "relative",
                    zIndex: 10,
                  }}
                >
                  {uploadingJlpt ? "…" : "⋯"}
                </button>

                {open ? (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 36,
                      width: 220,
                      background: "#fff",
                      border: "1px solid rgba(0,0,0,0.12)",
                      borderRadius: 12,
                      boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                      overflow: "hidden",
                      zIndex: 50,
                    }}
                  >
                    <button
                      type="button"
                      onClick={changePhoto}
                      disabled={uploadingAvatar || uploadingJlpt}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 12px",
                        background: "transparent",
                        border: 0,
                        cursor: uploadingAvatar || uploadingJlpt ? "not-allowed" : "pointer",
                        borderTop: "1px solid rgba(0,0,0,0.08)",
                      }}
                    >
                      Change profile photo
                    </button>

                    <button
                      type="button"
                      onClick={submitJlptCertificate}
                      disabled={uploadingAvatar || uploadingJlpt || hasPendingJlpt}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 12px",
                        background: "transparent",
                        border: 0,
                        cursor:
                          uploadingAvatar || uploadingJlpt || hasPendingJlpt
                            ? "not-allowed"
                            : "pointer",
                        opacity: hasPendingJlpt ? 0.6 : 1,
                        borderTop: "1px solid rgba(0,0,0,0.08)",
                      }}
                    >
                      {hasPendingJlpt ? "JLPT certificate pending review" : "Submit JLPT certificate"}
                    </button>

                    <button
                      type="button"
                      onClick={logout}
                      disabled={uploadingAvatar || uploadingJlpt}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 12px",
                        background: "transparent",
                        border: 0,
                        cursor: uploadingAvatar || uploadingJlpt ? "not-allowed" : "pointer",
                        borderTop: "1px solid rgba(0,0,0,0.08)",
                      }}
                    >
                      出る
                    </button>

                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="muted" style={{ marginTop: 8 }}>
            {bio?.trim() ? bio : "No bio yet."}
          </div>
        </div>
      </div>

      {/* Edit bio modal */}
      {editBioOpen ? (
        <div
          onClick={() => !saving && setEditBioOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 100%)",
              background: "#fff",
              borderRadius: 16,
              padding: 14,
              boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 10 }}>プロフィールを編集</div>

            <textarea
              value={bioDraft}
              onChange={(e) => setBioDraft(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                resize: "vertical",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.18)",
                padding: 10,
                outline: "none",
                fontFamily: "inherit",
              }}
              placeholder="Write something short."
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
              <button
                type="button"
                className="miniBtn"
                disabled={saving}
                onClick={() => setEditBioOpen(false)}
                style={{ cursor: saving ? "not-allowed" : "pointer" }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="postBtn"
                disabled={saving}
                onClick={saveBio}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}