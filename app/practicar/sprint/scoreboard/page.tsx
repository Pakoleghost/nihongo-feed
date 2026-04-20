"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ScoreRow = {
  user_id: string;
  best_score: number;
  updated_at: string;
  username: string | null;
  avatar_url: string | null;
};

type Period = "all" | "week";

function AvatarCircle({ url, name }: { url: string | null; name: string | null }) {
  const size = 36;
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name ?? "avatar"}
        width={size}
        height={size}
        style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
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
        fontSize: 14,
        fontWeight: 700,
        color: "#53596B",
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}

function rankColor(rank: number): string {
  if (rank === 1) return "#E63946";
  if (rank === 3) return "#4ECDC4";
  return "#53596B";
}

export default function ScoreboardPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("all");
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    }
    loadUser();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);

      // Build query — filter by updated_at for weekly view
      let query = supabase
        .from("study_kana_scores")
        .select("user_id, best_score, updated_at")
        .eq("mode", "mixed")
        .order("best_score", { ascending: false })
        .limit(20);

      if (period === "week") {
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte("updated_at", cutoff);
      }

      const { data: scoreData } = await query;
      const scores = (scoreData as { user_id: string; best_score: number; updated_at: string }[] | null) ?? [];

      if (scores.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      // Fetch profiles for all user_ids
      const uids = scores.map((s) => s.user_id);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", uids);

      const profileMap: Record<string, { username: string | null; avatar_url: string | null }> = {};
      (profileData as { id: string; username: string | null; avatar_url: string | null }[] | null)?.forEach(
        (p) => { profileMap[p.id] = { username: p.username, avatar_url: p.avatar_url }; }
      );

      setRows(
        scores.map((s) => ({
          ...s,
          username: profileMap[s.user_id]?.username ?? null,
          avatar_url: profileMap[s.user_id]?.avatar_url ?? null,
        }))
      );
      setLoading(false);
    }

    load();
  }, [period]);

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        paddingBottom: "48px",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          padding: "20px 20px 0",
        }}
      >
        <button
          onClick={() => router.push("/practicar/sprint")}
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
          Scoreboard
        </h1>
      </div>

      {/* Period toggle */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          padding: "20px 20px 16px",
        }}
      >
        {(["all", "week"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: "10px 20px",
              borderRadius: "999px",
              border: "none",
              cursor: "pointer",
              background: period === p ? "#1A1A2E" : "#E8E3DC",
              color: period === p ? "#FFFFFF" : "#9CA3AF",
              fontWeight: 700,
              fontSize: "14px",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {p === "all" ? "Todo el tiempo" : "Esta semana"}
          </button>
        ))}
      </div>

      {/* Ranking list */}
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#9CA3AF", padding: "40px 0" }}>
            Cargando...
          </div>
        ) : rows.length === 0 ? (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "1.5rem",
              padding: "32px",
              textAlign: "center",
              boxShadow: "0 4px 20px rgba(26,26,46,0.07)",
            }}
          >
            <p style={{ fontSize: "28px", margin: "0 0 8px" }}>🏅</p>
            <p style={{ fontSize: "15px", color: "#9CA3AF", margin: 0 }}>
              {period === "week" ? "Sin scores esta semana." : "Aún no hay scores."}
            </p>
          </div>
        ) : (
          rows.map((row, i) => {
            const rank = i + 1;
            const isMe = row.user_id === userId;
            return (
              <div
                key={row.user_id}
                style={{
                  background: isMe ? "rgba(78,205,196,0.15)" : "#FFFFFF",
                  borderRadius: "1.5rem",
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  boxShadow: "0 2px 12px rgba(26,26,46,0.07)",
                }}
              >
                {/* Rank */}
                <span
                  style={{
                    fontSize: rank <= 3 ? "22px" : "18px",
                    fontWeight: 800,
                    color: rankColor(rank),
                    minWidth: "28px",
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                >
                  {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
                </span>

                {/* Avatar + username */}
                <AvatarCircle url={row.avatar_url} name={row.username} />
                <p
                  style={{
                    flex: 1,
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#1A1A2E",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.username ?? "Usuario"}
                  {isMe && (
                    <span style={{ fontSize: "12px", color: "#4ECDC4", fontWeight: 600, marginLeft: "6px" }}>
                      (tú)
                    </span>
                  )}
                </p>

                {/* Score */}
                <span
                  style={{
                    fontSize: "22px",
                    fontWeight: 800,
                    color: "#1A1A2E",
                    flexShrink: 0,
                  }}
                >
                  {row.best_score}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
