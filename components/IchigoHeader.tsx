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
        width={34}
        height={34}
        style={{ borderRadius: "50%", objectFit: "cover", display: "block" }}
      />
    );
  }

  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        background: "#4ECDC4",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontWeight: 900,
        color: "#1A1A2E",
      }}
    >
      {letter}
    </div>
  );
}

export default function IchigoHeader() {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadProfile() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!alive || !session?.user) return;
      setUserId(session.user.id);

      const { data } = await supabase
        .from("profiles")
        .select("username, avatar_url, is_admin")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!alive) return;
      setAvatarUrl(data?.avatar_url ?? null);
      setUsername(data?.username ?? null);
      setIsAdmin(Boolean(data?.is_admin));
    }

    void loadProfile();

    return () => {
      alive = false;
    };
  }, []);

  function openProfileArea() {
    if (!userId) return;
    router.push("/perfil");
  }

  return (
    <header className="ichigo-hdr">
      <span className="ichigo-logo">
        ichig<b>o</b>
      </span>

      {userId && (
        <button
          type="button"
          onClick={openProfileArea}
          aria-label={isAdmin ? "Abrir panel de admin" : "Abrir perfil"}
          style={{
            position: "absolute",
            right: 18,
            bottom: 8,
            width: 38,
            height: 38,
            borderRadius: "50%",
            border: "none",
            background: "transparent",
            padding: 2,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AvatarBubble url={avatarUrl} name={username} />
        </button>
      )}
    </header>
  );
}
