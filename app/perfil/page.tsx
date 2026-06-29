"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getStreak } from "@/lib/streak";
import { loadKanaProgress, getKanaStateCounts } from "@/lib/kana-progress";
import { KANA_ITEMS } from "@/lib/kana-data";
import { useStudentViewMode } from "@/lib/use-student-view-mode";

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
  from_tema?: boolean;
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
        background: "#252541",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.38,
        fontWeight: 700,
        color: "#9CA3AF",
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

  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [groupOptions, setGroupOptions] = useState<string[]>([]);
  const { studentViewActive, studentViewGroupName, setStudentViewActive, setStudentViewGroupName } =
    useStudentViewMode(isAdmin);

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
        .select("id, username, avatar_url, group_name, is_admin")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data as Profile);
        setIsAdmin((data as { is_admin?: boolean | null }).is_admin === true);
        if ((data as { is_admin?: boolean | null }).is_admin) {
          supabase.from("groups").select("name").order("name").then(({ data: grps }) => {
            setGroupOptions((grps ?? []).map((g: { name: string }) => g.name));
          });
        }
      }

      setStreak(getStreak());

      const progress = loadKanaProgress(user.id);
      const counts = getKanaStateCounts(KANA_ITEMS, progress);
      setKanaCount(counts.fijado + counts.quemado);

      const { data: posts } = await supabase
        .from("comunidad_posts")
        .select("id, content, created_at, from_tema")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

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
        background: "#1A1A2E",
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
            background: "rgba(255,255,255,0.08)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          aria-label="Volver"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5M12 5l-7 7 7 7"
              stroke="#F4F4F8"
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
            color: "#F4F4F8",
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
          padding: "20px 20px 16px",
          gap: "10px",
        }}
      >
        <div style={{ position: "relative" }}>
          <AvatarCircle
            url={profile?.avatar_url ?? null}
            name={profile?.username ?? null}
            size={100}
          />
          {uploading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.5)",
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
          {/* Camera badge */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Cambiar foto"
            style={{
              position: "absolute",
              bottom: 2,
              right: 2,
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#4ECDC4",
              border: "2px solid #1A1A2E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: uploading ? "not-allowed" : "pointer",
              padding: 0,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="13" r="4" stroke="#1A1A2E" strokeWidth="2"/>
            </svg>
          </button>
        </div>

        <p style={{ fontSize: "18px", fontWeight: 800, color: "#F4F4F8", margin: 0, letterSpacing: "-0.03em" }}>
          {profile?.username ?? "—"}
        </p>
        {profile?.group_name && (
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#9CA3AF", background: "rgba(255,255,255,0.08)", borderRadius: 6, padding: "3px 10px" }}>
            {profile.group_name}
          </span>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          style={{ display: "none" }}
        />
      </div>

      {/* Stats row */}
      <div style={{ padding: "0 20px 16px", display: "flex", gap: "10px" }}>
        {/* Streak */}
        <div
          style={{
            flex: 1,
            background: "#252541",
            borderRadius: "14px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
            padding: "14px 10px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C12 2 7 8 7 13a5 5 0 0010 0c0-3-2-6-2-6s-1 2.5-2 3c-.5-2 .5-5-1-8z" fill="#E63946" opacity="0.9"/>
            <path d="M12 14c0 1.1-.9 2-2 2 0-1.5 1-2.5 2-3v1z" fill="#252541"/>
          </svg>
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
          <span style={{ fontSize: "10px", fontWeight: 700, color: "#9CA3AF", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Racha
          </span>
        </div>

        {/* Kana */}
        <div
          style={{
            flex: 1,
            background: "#252541",
            borderRadius: "14px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
            padding: "14px 10px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke="#4ECDC4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke="#4ECDC4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "#F4F4F8",
              lineHeight: 1,
              letterSpacing: "-0.04em",
            }}
          >
            {kanaCount}
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#9CA3AF" }}>/96</span>
          </span>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "#9CA3AF", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Kana
          </span>
        </div>

        {/* Posts */}
        <div
          style={{
            flex: 1,
            background: "#252541",
            borderRadius: "14px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
            padding: "14px 10px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "#F4F4F8",
              lineHeight: 1,
              letterSpacing: "-0.04em",
            }}
          >
            {postCount}
          </span>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "#9CA3AF", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Posts
          </span>
        </div>
      </div>

      {/* Info card */}
      <div style={{ padding: "0 20px" }}>
        <div
          style={{
            background: "#252541",
            borderRadius: "16px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
            overflow: "hidden",
          }}
        >
          {/* Username row */}
          <div
            style={{
              padding: "16px 18px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p style={{ fontSize: "11px", color: "#9CA3AF", margin: "0 0 4px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
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
                    color: "#F4F4F8",
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
                    borderRadius: "8px",
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
                <p style={{ fontSize: "16px", fontWeight: 700, color: "#F4F4F8", margin: 0 }}>
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
          <div style={{ padding: "16px 18px" }}>
            <p style={{ fontSize: "11px", color: "#9CA3AF", margin: "0 0 4px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Grupo
            </p>
            <p style={{ fontSize: "16px", fontWeight: 700, color: "#F4F4F8", margin: 0 }}>
              {profile?.group_name ?? "Sin grupo"}
            </p>
          </div>
        </div>
      </div>

      {/* Recent posts section */}
      <div style={{ padding: "24px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#F4F4F8", margin: 0, letterSpacing: "-0.03em" }}>
            Mi Diario
          </h2>
          {postCount > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF" }}>{postCount} publicaciones</span>
          )}
        </div>

        {recentPosts.length === 0 ? (
          <div
            style={{
              background: "#252541",
              borderRadius: "14px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
              padding: "24px 20px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "15px", color: "#9CA3AF", margin: 0, fontWeight: 500 }}>
              Todavía no has publicado nada.
            </p>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.25)", margin: "6px 0 0", fontWeight: 400 }}>
              Comparte algo con la comunidad.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {recentPosts.map((post) => (
              <div
                key={post.id}
                style={{
                  background: "#252541",
                  borderRadius: "14px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
                  padding: "14px 16px",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 600 }}>
                    {formatDate(post.created_at)}
                  </span>
                  {post.from_tema && (
                    <span style={{ fontSize: 10, fontWeight: 800, color: "#4ECDC4", background: "rgba(78,205,196,0.10)", borderRadius: 4, padding: "1px 6px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      tema
                    </span>
                  )}
                </div>
                <p
                  style={{
                    fontSize: "14px",
                    color: "rgba(255,255,255,0.88)",
                    margin: 0,
                    lineHeight: 1.55,
                    fontWeight: 500,
                    fontFamily: "var(--font-noto-sans-jp), sans-serif",
                  }}
                >
                  {post.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin section */}
      {isAdmin && (
        <div style={{ padding: "24px 20px 0" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#F4F4F8", margin: "0 0 12px", letterSpacing: "-0.03em" }}>
            Admin
          </h2>
          <div style={{ background: "#252541", borderRadius: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.25)", overflow: "hidden" }}>

            {/* Student view toggle */}
            <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#F4F4F8", margin: 0 }}>Vista de estudiante</p>
                  <p style={{ fontSize: 12, color: "#9CA3AF", margin: "2px 0 0" }}>
                    {studentViewActive
                      ? `Activa · ${studentViewGroupName ?? "sin grupo"}`
                      : "Revisa la app como alumno"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStudentViewActive(!studentViewActive)}
                  style={{
                    border: "none",
                    borderRadius: 999,
                    background: studentViewActive ? "#4ECDC4" : "rgba(255,255,255,0.10)",
                    color: studentViewActive ? "#1A1A2E" : "#9CA3AF",
                    padding: "8px 14px",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                    flexShrink: 0,
                    transition: "background 140ms ease",
                  }}
                >
                  {studentViewActive ? "Salir" : "Activar"}
                </button>
              </div>
              {!studentViewActive && groupOptions.length > 0 && (
                <select
                  value={studentViewGroupName ?? ""}
                  onChange={(e) => setStudentViewGroupName(e.target.value || null)}
                  style={{
                    marginTop: 10, width: "100%", border: "none",
                    borderRadius: 10, background: "#1A1A2E", color: "#F4F4F8",
                    padding: "9px 12px", fontSize: 13, fontWeight: 700,
                    outline: "none", fontFamily: "inherit",
                  }}
                >
                  <option value="">Elegir grupo…</option>
                  {groupOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              )}
            </div>

            {/* Nav links */}
            {[
              { href: "/admin/usuarios", label: "Gestionar alumnos", desc: "Grupos, acceso y solicitudes" },
            ].map(({ href, label, desc }) => (
              <a
                key={href}
                href={href}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "16px 18px", textDecoration: "none",
                }}
              >
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#F4F4F8", margin: 0 }}>{label}</p>
                  <p style={{ fontSize: 12, color: "#9CA3AF", margin: "2px 0 0" }}>{desc}</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18l6-6-6-6" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            ))}
          </div>
        </div>
      )}

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
    </div>
  );
}
