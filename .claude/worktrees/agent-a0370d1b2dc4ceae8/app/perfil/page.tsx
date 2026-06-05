"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import { getStreak } from "@/lib/streak";
import { loadKanaProgress, getKanaStateCounts } from "@/lib/kana-progress";
import { KANA_ITEMS } from "@/lib/kana-data";

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  group_name: string | null;
};

type RecentPost = {
  id: string;
  content: string;
  created_at: string;
};

function AvatarCircle({
  url,
  name,
  size,
}: {
  url: string | null;
  name: string | null;
  size: number;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name ?? "avatar"}
        width={size}
        height={size}
        style={{ borderRadius: "50%", objectFit: "cover", display: "block" }}
      />
    );
  }
  const initials = (name ?? "?").charAt(0).toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#E5E7EB",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.38,
        fontWeight: 700,
        color: "#53596B",
      }}
    >
      {initials}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
        stroke="#9CA3AF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke="#9CA3AF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function PerfilPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Username edit state
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);

  // Stats (client-side)
  const [streak, setStreak] = useState(0);
  const [kanaCount, setKanaCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const user = session.user;
      setUserId(user.id);

      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, group_name")
        .eq("id", user.id)
        .single();

      if (data) setProfile(data as Profile);

      // Streak from localStorage
      setStreak(getStreak());

      // Kana progress from localStorage
      const progress = loadKanaProgress(user.id);
      const counts = getKanaStateCounts(KANA_ITEMS, progress);
      setKanaCount(counts.fijado + counts.quemado);

      // Posts from Supabase
      const { data: posts } = await supabase
        .from("comunidad_posts")
        .select("id, content, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);

      const { count } = await supabase
        .from("comunidad_posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      setPostCount(count ?? 0);
      setRecentPosts((posts as RecentPost[]) ?? []);
    }
    load();
  }, [router]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    e.target.value = "";
    setUploading(true);

    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `avatars/${userId}-${Date.now()}.${ext}`;

      const { data: uploadData, error } = await supabase.storage
        .from("uploads")
        .upload(path, file, { upsert: true });

      if (error || !uploadData) return;

      const { data: urlData } = supabase.storage
        .from("uploads")
        .getPublicUrl(uploadData.path);

      const newUrl = urlData.publicUrl;

      await supabase
        .from("profiles")
        .update({ avatar_url: newUrl })
        .eq("id", userId);

      // Optimistic update
      setProfile((prev) => prev ? { ...prev, avatar_url: newUrl } : prev);
    } finally {
      setUploading(false);
    }
  }

  function startEditUsername() {
    setUsernameInput(profile?.username ?? "");
    setEditingUsername(true);
  }

  function cancelEditUsername() {
    setEditingUsername(false);
    setUsernameInput("");
  }

  async function saveUsername() {
    if (!userId || !usernameInput.trim()) return;
    setSavingUsername(true);
    await supabase
      .from("profiles")
      .update({ username: usernameInput.trim() })
      .eq("id", userId);
    setProfile((prev) => prev ? { ...prev, username: usernameInput.trim() } : prev);
    setEditingUsername(false);
    setSavingUsername(false);
  }

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        paddingBottom: "100px",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          padding: "20px 20px 8px",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "#FFFFFF",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 10px rgba(26,26,46,0.10)",
            flexShrink: 0,
          }}
          aria-label="Volver"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5M12 5l-7 7 7 7"
              stroke="#1A1A2E"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 800,
            color: "#1A1A2E",
            margin: 0,
            lineHeight: 1,
          }}
        >
          Mi perfil
        </h1>
      </div>

      {/* Avatar section */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "32px 20px 24px",
          gap: "12px",
        }}
      >
        <div style={{ position: "relative" }}>
          <AvatarCircle
            url={profile?.avatar_url ?? null}
            name={profile?.username ?? null}
            size={120}
          />
          {uploading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              ...
            </div>
          )}
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            background: "none",
            border: "none",
            cursor: uploading ? "not-allowed" : "pointer",
            color: "#4ECDC4",
            fontSize: "14px",
            fontWeight: 700,
            padding: "4px 8px",
          }}
        >
          {uploading ? "Subiendo…" : "Cambiar foto"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          style={{ display: "none" }}
        />
      </div>

      {/* Stats row */}
      <div style={{ padding: "0 20px 20px", display: "flex", gap: "10px" }}>
        {/* Streak */}
        <div
          style={{
            flex: 1,
            background: "#FFFFFF",
            borderRadius: "14px",
            boxShadow: "0 2px 10px rgba(26,26,46,0.07)",
            padding: "14px 10px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span style={{ fontSize: "22px", lineHeight: 1 }}>🔥</span>
          <span
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "#E63946",
              lineHeight: 1,
              letterSpacing: "-0.04em",
            }}
          >
            {streak}
          </span>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#7A7F8D", textAlign: "center" }}>
            días de racha
          </span>
        </div>

        {/* Kana */}
        <div
          style={{
            flex: 1,
            background: "#FFFFFF",
            borderRadius: "14px",
            boxShadow: "0 2px 10px rgba(26,26,46,0.07)",
            padding: "14px 10px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span
            style={{
              fontSize: "20px",
              lineHeight: 1,
              fontWeight: 700,
              color: "#4ECDC4",
              fontFamily: "Noto Serif JP, serif",
            }}
          >
            学
          </span>
          <span
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "#1A1A2E",
              lineHeight: 1,
              letterSpacing: "-0.04em",
            }}
          >
            {kanaCount}
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#7A7F8D" }}>/96</span>
          </span>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#7A7F8D", textAlign: "center" }}>
            kana dominados
          </span>
        </div>

        {/* Posts */}
        <div
          style={{
            flex: 1,
            background: "#FFFFFF",
            borderRadius: "14px",
            boxShadow: "0 2px 10px rgba(26,26,46,0.07)",
            padding: "14px 10px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span style={{ fontSize: "22px", lineHeight: 1 }}>💬</span>
          <span
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "#1A1A2E",
              lineHeight: 1,
              letterSpacing: "-0.04em",
            }}
          >
            {postCount}
          </span>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#7A7F8D", textAlign: "center" }}>
            publicaciones
          </span>
        </div>
      </div>

      {/* Info card */}
      <div style={{ padding: "0 20px" }}>
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "1.5rem",
            boxShadow: "0 4px 20px rgba(26,26,46,0.07)",
            overflow: "hidden",
          }}
        >
          {/* Username row */}
          <div
            style={{
              padding: "18px 20px",
              borderBottom: "1px solid #F0EDE8",
            }}
          >
            <p style={{ fontSize: "12px", color: "#9CA3AF", margin: "0 0 4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Usuario
            </p>

            {editingUsername ? (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  autoFocus
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveUsername(); if (e.key === "Escape") cancelEditUsername(); }}
                  style={{
                    flex: 1,
                    border: "none",
                    borderBottom: "2px solid #4ECDC4",
                    background: "transparent",
                    outline: "none",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#1A1A2E",
                    padding: "2px 0",
                    fontFamily: "inherit",
                  }}
                />
                <button
                  onClick={saveUsername}
                  disabled={savingUsername || !usernameInput.trim()}
                  style={{
                    background: "#4ECDC4",
                    color: "#1A1A2E",
                    border: "none",
                    borderRadius: "999px",
                    padding: "6px 14px",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: savingUsername ? "not-allowed" : "pointer",
                  }}
                >
                  {savingUsername ? "…" : "Guardar"}
                </button>
                <button
                  onClick={cancelEditUsername}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#9CA3AF",
                    fontSize: "13px",
                    fontWeight: 600,
                    padding: "6px 4px",
                  }}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ fontSize: "16px", fontWeight: 700, color: "#1A1A2E", margin: 0 }}>
                  {profile?.username ?? "—"}
                </p>
                <button
                  onClick={startEditUsername}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                  }}
                  aria-label="Editar usuario"
                >
                  <PencilIcon />
                </button>
              </div>
            )}
          </div>

          {/* Group row */}
          <div style={{ padding: "18px 20px" }}>
            <p style={{ fontSize: "12px", color: "#9CA3AF", margin: "0 0 4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Grupo
            </p>
            <p style={{ fontSize: "16px", fontWeight: 700, color: "#1A1A2E", margin: 0 }}>
              {profile?.group_name ?? "Sin grupo"}
            </p>
          </div>
        </div>
      </div>

      {/* Recent posts section */}
      <div style={{ padding: "24px 20px 0" }}>
        <h2
          style={{
            fontSize: "18px",
            fontWeight: 800,
            color: "#1A1A2E",
            margin: "0 0 12px",
            letterSpacing: "-0.03em",
          }}
        >
          Mis publicaciones
        </h2>

        {recentPosts.length === 0 ? (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "14px",
              boxShadow: "0 2px 10px rgba(26,26,46,0.07)",
              padding: "24px 20px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "15px", color: "#9CA3AF", margin: 0, fontWeight: 500 }}>
              Todavía no has publicado nada.
            </p>
            <p style={{ fontSize: "13px", color: "#C4BAB0", margin: "6px 0 0", fontWeight: 400 }}>
              Comparte algo con la comunidad.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {recentPosts.map((post) => (
              <div
                key={post.id}
                style={{
                  background: "#FFFFFF",
                  borderRadius: "14px",
                  boxShadow: "0 2px 10px rgba(26,26,46,0.07)",
                  padding: "14px 16px",
                  boxSizing: "border-box",
                }}
              >
                <p
                  style={{
                    fontSize: "14px",
                    color: "#1A1A2E",
                    margin: "0 0 8px",
                    lineHeight: 1.5,
                    fontWeight: 500,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {post.content}
                </p>
                <p style={{ fontSize: "11px", color: "#9CA3AF", margin: 0, fontWeight: 600 }}>
                  {formatDate(post.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logout */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: "32px" }}>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/login");
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "15px",
            fontWeight: 700,
            color: "#E63946",
            padding: "8px 16px",
          }}
        >
          Cerrar sesión
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
