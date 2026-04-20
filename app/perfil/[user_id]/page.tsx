"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type PublicProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  group_name: string | null;
};

function AvatarCircle({ url, name, size }: { url: string | null; name: string | null; size: number }) {
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
  const initial = (name ?? "?").charAt(0).toUpperCase();
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
      {initial}
    </div>
  );
}

export default function PublicProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = typeof params.user_id === "string" ? params.user_id : null;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userId) { setNotFound(true); setLoading(false); return; }

    supabase
      .from("profiles")
      .select("id, username, avatar_url, group_name")
      .eq("id", userId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
        } else {
          setProfile(data as PublicProfile);
        }
        setLoading(false);
      });
  }, [userId]);

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "20px 20px 8px" }}>
        <button
          onClick={() => router.back()}
          style={{
            width: "40px", height: "40px", borderRadius: "50%",
            background: "#FFFFFF", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 10px rgba(26,26,46,0.10)", flexShrink: 0,
          }}
          aria-label="Volver"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="#1A1A2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#1A1A2E", margin: 0, lineHeight: 1 }}>
          Perfil
        </h1>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#9CA3AF", padding: "60px 0" }}>Cargando...</div>
      ) : notFound ? (
        <div style={{ textAlign: "center", color: "#9CA3AF", padding: "60px 20px" }}>
          <p style={{ fontSize: "28px", margin: "0 0 8px" }}>🔍</p>
          <p style={{ fontSize: "16px", margin: 0 }}>Usuario no encontrado</p>
        </div>
      ) : (
        <>
          {/* Avatar */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "32px 20px 24px",
              gap: "12px",
            }}
          >
            <AvatarCircle url={profile?.avatar_url ?? null} name={profile?.username ?? null} size={120} />
            <p style={{ fontSize: "24px", fontWeight: 800, color: "#1A1A2E", margin: 0 }}>
              {profile?.username ?? "Usuario"}
            </p>
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
              <div style={{ padding: "18px 20px", borderBottom: "1px solid #F0EDE8" }}>
                <p style={{ fontSize: "12px", color: "#9CA3AF", margin: "0 0 4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Usuario
                </p>
                <p style={{ fontSize: "16px", fontWeight: 700, color: "#1A1A2E", margin: 0 }}>
                  {profile?.username ?? "—"}
                </p>
              </div>
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
        </>
      )}
    </div>
  );
}
