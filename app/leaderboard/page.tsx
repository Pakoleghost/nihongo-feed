"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Row = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  streak_days: number | null;
  post_count: number | null;
  comment_count: number | null;
};

type Item = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  streak_days: number;
  post_count: number;
  comment_count: number;
};

function norm(r: Row): Item {
  const u = (r.username ?? "").toString().trim().toLowerCase();
  return {
    user_id: r.user_id,
    username: u || "unknown",
    avatar_url: r.avatar_url ?? null,
    streak_days: Number(r.streak_days ?? 0),
    post_count: Number(r.post_count ?? 0),
    comment_count: Number(r.comment_count ?? 0),
  };
}

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setErr("");

    const { data, error } = await supabase
      .from("leaderboard")
      .select("user_id, username, avatar_url, streak_days, post_count, comment_count")
      .order("streak_days", { ascending: false })
      .order("comment_count", { ascending: false })
      .order("post_count", { ascending: false })
      .limit(50);

    if (error) {
      setErr(error.message);
      setItems([]);
      setLoading(false);
      return;
    }

    setItems((data as Row[]).map(norm));
    setLoading(false);
  }

  return (
    <div className="feed">
      <div className="header">
        <div className="headerInner">
          <div className="brand">フィード</div>

          <div className="me">
            <Link href="/" className="miniBtn" style={{ textDecoration: "none" }}>
              ← Back
            </Link>
          </div>
        </div>
      </div>

      <div className="post" style={{ marginTop: 12 }}>
        <div className="post-header">
          <div className="postMeta">
            <div className="nameRow" style={{ alignItems: "baseline" }}>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>🏆 Leaderboard</div>
              <div className="muted" style={{ marginLeft: 10, fontSize: 12 }}>
                Streak hasta hoy · Comments · Posts
              </div>
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              Si hoy no termina, el streak no baja a 0 (eso lo define tu SQL).
            </div>
          </div>
        </div>
      </div>

      {err ? (
        <div style={{ padding: 16 }}>
          <div style={{ color: "#fff", fontWeight: 900 }}>Error</div>
          <div className="muted" style={{ marginTop: 6 }}>{err}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Revisa que exista el VIEW <code>leaderboard</code> y que RLS permita SELECT.
          </div>
        </div>
      ) : loading ? (
        <div style={{ padding: 16 }} className="muted">Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: 16 }} className="muted">No data.</div>
      ) : (
        items.map((x, idx) => {
          const href = x.username && x.username !== "unknown" ? `/u/${encodeURIComponent(x.username)}` : "";
          const initial = (x.username?.[0] || "?").toUpperCase();

          return (
            <div className="post" key={x.user_id}>
              <div className="post-header">
                {href ? (
                  <Link href={href} className="avatar" style={{ textDecoration: "none" }}>
                    {x.avatar_url ? <img src={x.avatar_url} alt={x.username} /> : <span>{initial}</span>}
                  </Link>
                ) : (
                  <div className="avatar">
                    {x.avatar_url ? <img src={x.avatar_url} alt="unknown" /> : <span>{initial}</span>}
                  </div>
                )}

                <div className="postMeta" style={{ width: "100%" }}>
                  <div className="nameRow" style={{ justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                      <div className="muted" style={{ width: 28, textAlign: "right" }}>
                        #{idx + 1}
                      </div>

                      {href ? (
                        <Link href={href} className="handle" style={{ textDecoration: "none" }}>
                          @{x.username}
                        </Link>
                      ) : (
                        <div className="handle">@unknown</div>
                      )}
                    </div>

                    <div className="muted" style={{ fontSize: 12 }}>
                      🔥 {x.streak_days} · 💬 {x.comment_count} · 📝 {x.post_count}
                    </div>
                  </div>

                  <div className="muted" style={{ fontSize: 12 }}>
                    Streak: {x.streak_days} days · Comments: {x.comment_count} · Posts: {x.post_count}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}