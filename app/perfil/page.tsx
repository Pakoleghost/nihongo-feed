"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  group_name: string | null;
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

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, group_name")
        .eq("id", user.id)
        .single();

      if (data) setProfile(data as Profile);
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

      <BottomNav />
    </div>
  );
}
