"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { KANA_ITEMS } from "@/lib/kana-data";
import { getKanaStateCounts, type KanaProgressMap } from "@/lib/kana-progress";
import BottomNav from "@/components/BottomNav";

type PublicProfile = {
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
        width: size, height: size, borderRadius: "50%",
        background: "#E5E7EB", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, color: "#53596B",
      }}
    >
      {initial}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function PublicProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = typeof params.user_id === "string" ? params.user_id : null;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [kanaCount, setKanaCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userId) { setNotFound(true); setLoading(false); return; }

    async function load() {
      // Profile
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, group_name")
        .eq("id", userId)
        .single();
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setProfile(data as PublicProfile);

      // Kana progress from Supabase
      const { data: kanaRows } = await supabase
        .from("kana_progress")
        .select("kana_id, level, times_seen, times_wrong, next_review, next_due_at, difficult")
        .eq("user_id", userId);

      if (kanaRows && kanaRows.length > 0) {
        const progressMap: KanaProgressMap = {};
        for (const row of kanaRows as {
          kana_id: string; level: number; times_seen: number; times_wrong: number;
          next_review: string | null; next_due_at: number | null; difficult: boolean | null;
        }[]) {
          progressMap[row.kana_id] = {
            level: row.level,
            timesSeen: row.times_seen,
            timesCorrect: 0,
            timesWrong: row.times_wrong,
            timesAlmost: 0,
            lastReviewed: null,
            nextReview: row.next_review ?? null,
            next_due_at: row.next_due_at ?? null,
            difficult: row.difficult ?? false,
            ease: 2.5,
            kana: "",
            romaji: "",
            script: "hiragana",
            set: "basic",
          };
        }
        const counts = getKanaStateCounts(KANA_ITEMS, progressMap);
        setKanaCount(counts.fijado + counts.quemado);
      }

      // Posts
      const [{ data: posts }, { count }] = await Promise.all([
        supabase.from("comunidad_posts").select("id, content, created_at")
          .eq("user_id", userId).order("created_at", { ascending: false }).limit(3),
        supabase.from("comunidad_posts").select("id", { count: "exact", head: true })
          .eq("user_id", userId),
      ]);
      setPostCount(count ?? 0);
      setRecentPosts((posts as RecentPost[]) ?? []);
      setLoading(false);
    }
    load();
  }, [userId]);

  if (loading) {
    return (
      <div style={{ background: "#FFF8E7", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 600 }}>Cargando…</span>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ background: "#FFF8E7", minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="8" stroke="#C4BAB0" strokeWidth="2"/>
          <path d="M21 21l-4.35-4.35" stroke="#C4BAB0" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <p style={{ fontSize: 16, color: "#9CA3AF", margin: 0, fontWeight: 600 }}>Usuario no encontrado</p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        paddingBottom: "100px",
      }}
    >
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "20px 20px 8px" }}>
        <button
          onClick={() => router.back()}
          style={{
            width: 40, height: 40, borderRadius: "50%",
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
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1A1A2E", margin: 0, lineHeight: 1 }}>
          Perfil
        </h1>
      </div>

      {/* Avatar section */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 20px 16px", gap: 10 }}>
        <AvatarCircle url={profile?.avatar_url ?? null} name={profile?.username ?? null} size={100} />
        <p style={{ fontSize: 18, fontWeight: 800, color: "#1A1A2E", margin: 0, letterSpacing: "-0.03em" }}>
          {profile?.username ?? "Usuario"}
        </p>
        {profile?.group_name && (
          <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", background: "rgba(26,26,46,0.06)", borderRadius: 6, padding: "3px 10px" }}>
            {profile.group_name}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div style={{ padding: "0 20px 16px", display: "flex", gap: 10 }}>
        {/* Kana */}
        <div style={{ flex: 1, background: "#FFFFFF", borderRadius: 14, boxShadow: "0 2px 10px rgba(26,26,46,0.07)", padding: "14px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke="#4ECDC4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke="#4ECDC4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: 26, fontWeight: 800, color: "#1A1A2E", lineHeight: 1, letterSpacing: "-0.04em" }}>
            {kanaCount}
            <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF" }}>/96</span>
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Kana
          </span>
        </div>

        {/* Posts */}
        <div style={{ flex: 1, background: "#FFFFFF", borderRadius: 14, boxShadow: "0 2px 10px rgba(26,26,46,0.07)", padding: "14px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: 26, fontWeight: 800, color: "#1A1A2E", lineHeight: 1, letterSpacing: "-0.04em" }}>
            {postCount}
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Posts
          </span>
        </div>
      </div>

      {/* Recent posts */}
      <div style={{ padding: "0 20px" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1A1A2E", margin: "0 0 12px", letterSpacing: "-0.03em" }}>
          Publicaciones
        </h2>
        {recentPosts.length === 0 ? (
          <div style={{ background: "#FFFFFF", borderRadius: 14, boxShadow: "0 2px 10px rgba(26,26,46,0.07)", padding: "24px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 15, color: "#9CA3AF", margin: 0, fontWeight: 500 }}>
              Todavía no hay publicaciones.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recentPosts.map((post) => (
              <div
                key={post.id}
                style={{ background: "#FFFFFF", borderRadius: 14, boxShadow: "0 2px 10px rgba(26,26,46,0.07)", padding: "14px 16px" }}
              >
                <p style={{ fontSize: 14, color: "#1A1A2E", margin: "0 0 8px", lineHeight: 1.5, fontWeight: 500, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {post.content}
                </p>
                <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0, fontWeight: 600 }}>
                  {formatDate(post.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
