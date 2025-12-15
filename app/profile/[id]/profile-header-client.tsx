"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

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

export default function ProfileHeaderClient(props: {
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
}) {
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
  } = props;

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

      const extRaw = (file.name.split(".").pop() || "jpg").toLowerCase();
      const ext = extRaw.replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `certificates/${profileId}/${Date.now()}.${ext}`;

      const bucket = "jlpt-certificates";
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: false,
        contentType: file.type,
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

      // Basic validation
      if (!file.type.startsWith("image/")) {
        alert("Please choose an image file.");
        return;
      }

      // Use a stable path per profile id
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${profileId}/${Date.now()}.${ext}`;

      // Upload to Supabase Storage (bucket name used by the app)
      const bucket = "post-images";
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: true,
        contentType: file.type,
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
        accept="image/*"
        style={{ display: "none" }}
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
        accept="image/*"
        style={{ display: "none" }}
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
                <span className="handle" style={{ color: "inherit", fontSize: 22, fontWeight: 800 }}>
                  @{username}
                </span>

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