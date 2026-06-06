"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function AvatarBubble({ url, name }: { url: string | null; name: string | null }) {
  const letter = name ? name[0].toUpperCase() : "?";
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name ?? "perfil"}
        width={32}
        height={32}
        style={{ borderRadius: "50%", objectFit: "cover", display: "block" }}
      />
    );
  }
  return (
    <div style={{
      width: 32, height: 32, borderRadius: "50%",
      background: "linear-gradient(135deg, #4ECDC4 0%, #4ECDC4AA 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 13, fontWeight: 800, color: "#1A1A2E",
    }}>
      {letter}
    </div>
  );
}

export default function IchigoHeader() {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!alive || !session?.user) return;
      setUserId(session.user.id);
      const { data } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", session.user.id)
        .maybeSingle();
      if (!alive) return;
      setAvatarUrl(data?.avatar_url ?? null);
      setUsername(data?.username ?? null);
    });
    return () => { alive = false; };
  }, []);

  return (
    <header className="ichigo-hdr">
      {/* Left spacer — same width as avatar to keep logo centered */}
      <div style={{ width: 38, flexShrink: 0 }} />

      <span className="ichigo-logo">
        ichig<b>o</b>
      </span>

      {/* Avatar → perfil */}
      <div style={{ width: 38, flexShrink: 0, display: "flex", justifyContent: "flex-end" }}>
        {userId && (
          <button
            onClick={() => router.push(`/perfil/${userId}`)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", borderRadius: "50%" }}
            aria-label="Mi perfil"
          >
            <AvatarBubble url={avatarUrl} name={username} />
          </button>
        )}
      </div>
    </header>
  );
}
