"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

function levelBadgeStyle(levelRaw: string): React.CSSProperties {
  const level = (levelRaw || "").toString().trim().toUpperCase();

  // simple mapping. adjust anytime.
  const map: Record<string, { bg: string; fg: string; brd: string }> = {
    A1: { bg: "#eef2ff", fg: "#1e3a8a", brd: "#c7d2fe" },
    A2: { bg: "#ecfeff", fg: "#155e75", brd: "#a5f3fc" },
    B1: { bg: "#f0fdf4", fg: "#166534", brd: "#bbf7d0" },
    B2: { bg: "#fffbeb", fg: "#92400e", brd: "#fde68a" },
    C1: { bg: "#fff1f2", fg: "#9f1239", brd: "#fecdd3" },
    N5: { bg: "#eef2ff", fg: "#1e3a8a", brd: "#c7d2fe" },
    N4: { bg: "#ecfeff", fg: "#155e75", brd: "#a5f3fc" },
    N3: { bg: "#f0fdf4", fg: "#166534", brd: "#bbf7d0" },
    N2: { bg: "#fffbeb", fg: "#92400e", brd: "#fde68a" },
    N1: { bg: "#fff1f2", fg: "#9f1239", brd: "#fecdd3" },
  };

  const v = map[level] ?? { bg: "#f3f4f6", fg: "#111827", brd: "#e5e7eb" };
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${v.brd}`,
    background: v.bg,
    color: v.fg,
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1,
  };
}

export default function ProfileHeaderClient(props: {
  isMe: boolean;
  profileId: string;
  username: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string;
  level: string;
  group: string;
  postCount: number;
  commentCount: number;
}) {
  const {
    isMe,
    profileId,
    username,
    avatarUrl,
    bannerUrl,
    bio,
    level,
    group,
    postCount,
    commentCount,
  } = props;

  const [saving, setSaving] = useState(false);
  const [bioDraft, setBioDraft] = useState(bio || "");
  const [avatar, setAvatar] = useState<string | null>(avatarUrl);
  const [banner, setBanner] = useState<string | null>(bannerUrl);

  const initial = useMemo(() => (username?.[0] || "?").toUpperCase(), [username]);

  async function uploadToBucket(file: File, path: string) {
    const { error } = await supabase.storage.from("post-images").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("post-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function onPickAvatar(file: File) {
    if (!isMe) return;
    try {
      setSaving(true);
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const url = await uploadToBucket(file, `avatars/${profileId}.${ext}`);

      const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", profileId);
      if (error) throw error;

      setAvatar(url);
    } catch (e: any) {
      alert(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onPickBanner(file: File) {
    if (!isMe) return;
    try {
      setSaving(true);
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const url = await uploadToBucket(file, `banners/${profileId}.${ext}`);

      const { error } = await supabase.from("profiles").update({ banner_url: url }).eq("id", profileId);
      if (error) throw error;

      setBanner(url);
    } catch (e: any) {
      alert(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function saveBio() {
    if (!isMe) return;
    try {
      setSaving(true);
      const next = (bioDraft || "").toString().slice(0, 280);

      const { error } = await supabase.from("profiles").update({ bio: next }).eq("id", profileId);
      if (error) throw error;
    } catch (e: any) {
      alert(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      {/* Banner */}
      <div
        style={{
          height: 160,
          borderRadius: 18,
          overflow: "hidden",
          margin: "0 12px",
          border: "1px solid rgba(0,0,0,.08)",
          background: banner ? `url(${banner}) center/cover no-repeat` : "linear-gradient(135deg, #111827, #6b7280)",
          position: "relative",
        }}
      >
        {isMe ? (
          <label
            style={{
              position: "absolute",
              right: 10,
              bottom: 10,
              background: "rgba(255,255,255,.9)",
              border: "1px solid rgba(0,0,0,.12)",
              borderRadius: 999,
              padding: "8px 10px",
              fontSize: 12,
              fontWeight: 800,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "…" : "Change banner"}
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              disabled={saving}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onPickBanner(f);
                e.currentTarget.value = "";
              }}
            />
          </label>
        ) : null}
      </div>

      {/* Card */}
      <div
        className="post"
        style={{
          marginTop: -34,
          marginLeft: 12,
          marginRight: 12,
          borderRadius: 18,
        }}
      >
        <div style={{ display: "flex", gap: 14, padding: 14, alignItems: "center" }}>
          {/* Avatar */}
          <div style={{ position: "relative", width: 86, height: 86, flex: "0 0 auto" }}>
            <div
              style={{
                width: 86,
                height: 86,
                borderRadius: 999,
                overflow: "hidden",
                border: "4px solid #fff",
                boxShadow: "0 8px 24px rgba(0,0,0,.12)",
                background: "#111",
                display: "grid",
                placeItems: "center",
              }}
            >
              {avatar ? (
                <img src={avatar} alt={username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ color: "#fff", fontWeight: 900, fontSize: 28 }}>{initial}</span>
              )}
            </div>

            {isMe ? (
              <label
                style={{
                  position: "absolute",
                  right: -2,
                  bottom: -2,
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,.12)",
                  borderRadius: 999,
                  padding: "6px 8px",
                  fontSize: 12,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                📷
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  disabled={saving}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onPickAvatar(f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            ) : null}
          </div>

          {/* Meta */}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 900, fontSize: 18, color: "#111" }}>@{username}</div>

              {level ? <span style={levelBadgeStyle(level)}>{level.toUpperCase()}</span> : null}
              {group ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid #e5e7eb",
                    background: "#f9fafb",
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#111827",
                  }}
                >
                  {group}
                </span>
              ) : null}
            </div>

            <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
              Posts: {postCount} · Comments: {commentCount}
            </div>
          </div>
        </div>

        {/* Bio */}
        <div style={{ padding: "0 14px 14px" }}>
          {isMe ? (
            <>
              <textarea
                value={bioDraft}
                onChange={(e) => setBioDraft(e.target.value)}
                placeholder="Write a short bio…"
                style={{
                  width: "100%",
                  minHeight: 78,
                  resize: "none",
                  borderRadius: 14,
                  border: "1px solid rgba(0,0,0,.12)",
                  padding: 12,
                  outline: "none",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, alignItems: "center" }}>
                <div className="muted" style={{ fontSize: 12 }}>
                  {(bioDraft || "").length}/280
                </div>
                <button
                  className="miniBtn"
                  onClick={saveBio}
                  disabled={saving}
                  style={{ opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? "Saving…" : "Save bio"}
                </button>
              </div>
            </>
          ) : bio ? (
            <div style={{ whiteSpace: "pre-wrap", color: "#111", fontSize: 14 }}>{bio}</div>
          ) : (
            <div className="muted" style={{ fontSize: 13 }}>
              No bio yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}