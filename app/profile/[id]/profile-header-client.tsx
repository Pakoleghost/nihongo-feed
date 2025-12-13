"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  profileId: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  level?: string | null;
  group?: string | null;
  postCount?: number;
  commentCount?: number;
  isMe: boolean;
};

export default function ProfileHeaderClient({
  profileId,
  username,
  avatarUrl,
  bio,
  level,
  group,
  postCount = 0,
  commentCount = 0,
  isMe,
}: Props) {
  const initial = useMemo(() => (username?.[0] || "?").toUpperCase(), [username]);

  const [menuOpen, setMenuOpen] = useState(false);

  const [bioOpen, setBioOpen] = useState(false);
  const [bioText, setBioText] = useState((bio ?? "").toString());
  const [savingBio, setSavingBio] = useState(false);

  const [avatarBusy, setAvatarBusy] = useState(false);

  const badge = useMemo(() => {
    const v = (level ?? "").toString().trim();
    if (!v) return null;
    return v;
  }, [level]);

  async function saveBio() {
    if (!isMe || savingBio) return;
    setSavingBio(true);

    const next = bioText.trim();

    const { error } = await supabase
      .from("profiles")
      .update({ bio: next })
      .eq("id", profileId);

    setSavingBio(false);

    if (error) {
      alert(error.message);
      return;
    }

    setBioOpen(false);
    setMenuOpen(false);
  }

  async function uploadAvatar(file: File) {
    if (!isMe || avatarBusy) return;
    setAvatarBusy(true);

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `avatars/${profileId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setAvatarBusy(false);
      alert(uploadError.message);
      return;
    }

    const { data: pub } = supabase.storage.from("post-images").getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: pub.publicUrl })
      .eq("id", profileId);

    setAvatarBusy(false);

    if (updateError) {
      alert(updateError.message);
      return;
    }

    // simplest: hard refresh so Server Component re-fetches new avatar_url
    window.location.reload();
  }

  return (
    <div className="post" style={{ marginTop: 12 }}>
      <div className="post-header" style={{ alignItems: "flex-start" }}>
        <div
          className="avatar"
          aria-label="Profile avatar"
          style={{
            width: 64,
            height: 64,
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          {avatarUrl ? <img src={avatarUrl} alt={username} /> : <span>{initial}</span>}
        </div>

        <div className="postMeta" style={{ width: "100%" }}>
          <div className="nameRow" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div className="handle" style={{ color: "inherit", fontWeight: 900 }}>
                  @{username || "unknown"}
                </div>

                {badge ? (
                  <span
                    style={{
                      fontSize: 12,
                      padding: "4px 8px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,.15)",
                      background: "rgba(255,255,255,.06)",
                    }}
                    className="muted"
                    title={group ? `Group: ${group}` : undefined}
                  >
                    {badge}
                  </span>
                ) : null}
              </div>

              <div className="muted" style={{ fontSize: 12 }}>
                Posts: <span className="muted">{postCount}</span> · Comments:{" "}
                <span className="muted">{commentCount}</span>
              </div>
            </div>

            {isMe ? (
              <div style={{ position: "relative" }}>
                <button
                  className="miniBtn"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Profile options"
                  title="Options"
                  style={{ padding: "6px 10px" }}
                >
                  ⋯
                </button>

                {menuOpen ? (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 38,
                      zIndex: 50,
                      width: 220,
                      background: "#111",
                      border: "1px solid rgba(255,255,255,.12)",
                      borderRadius: 12,
                      overflow: "hidden",
                      boxShadow: "0 8px 24px rgba(0,0,0,.35)",
                    }}
                  >
                    <button
                      className="miniBtn"
                      style={{
                        width: "100%",
                        justifyContent: "flex-start",
                        borderRadius: 0,
                        border: 0,
                        background: "transparent",
                      }}
                      onClick={() => setBioOpen(true)}
                    >
                      Edit bio
                    </button>

                    <label
                      className="miniBtn"
                      style={{
                        width: "100%",
                        justifyContent: "flex-start",
                        borderRadius: 0,
                        border: 0,
                        background: "transparent",
                        opacity: avatarBusy ? 0.6 : 1,
                        cursor: avatarBusy ? "not-allowed" : "pointer",
                      }}
                    >
                      {avatarBusy ? "Updating…" : "Change profile picture"}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        disabled={avatarBusy}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadAvatar(f);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>

                    <button
                      className="miniBtn"
                      style={{
                        width: "100%",
                        justifyContent: "flex-start",
                        borderRadius: 0,
                        borderTop: "1px solid rgba(255,255,255,.08)",
                        background: "transparent",
                      }}
                      onClick={() => setMenuOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: 10, whiteSpace: "pre-wrap" }} className={bio ? "" : "muted"}>
            {bio?.trim() ? bio : "No bio yet."}
          </div>
        </div>
      </div>

      {/* Simple modal for bio */}
      {bioOpen ? (
        <div
          onClick={() => setBioOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.55)",
            zIndex: 60,
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 92vw)",
              background: "#111",
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 16,
              padding: 14,
            }}
          >
            <div style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}>Edit bio</div>

            <textarea
              value={bioText}
              onChange={(e) => setBioText(e.target.value)}
              placeholder="Write something short…"
              style={{
                width: "100%",
                marginTop: 10,
                minHeight: 120,
                resize: "vertical",
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.15)",
                background: "rgba(255,255,255,.06)",
                color: "#fff",
                outline: "none",
              }}
            />

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
              <button className="miniBtn" onClick={() => setBioOpen(false)} disabled={savingBio}>
                Cancel
              </button>
              <button className="miniBtn" onClick={() => void saveBio()} disabled={savingBio}>
                {savingBio ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}