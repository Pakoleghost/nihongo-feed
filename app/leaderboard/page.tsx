"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

type Row = {
  user_id: string;
  username: string | null;
  streak?: number | null;
  posts?: number | null;
};

type Item = {
  user_id: string;
  username: string;
  streak: number;
  posts: number;
};

function normalize(r: Row): Item {
  const u = (r.username ?? "").toString().trim().toLowerCase();
  return {
    user_id: r.user_id,
    username: u || "unknown",
    streak: Number(r.streak ?? 0),
    posts: Number(r.posts ?? 0),
  };
}

export default function LeaderboardPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [mode, setMode] = useState<"streak" | "posts">("streak");
  const [myProfileHref, setMyProfileHref] = useState("/profile");

  useEffect(() => {
    void initAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function initAndLoad() {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (uid) setMyProfileHref(`/profile/${encodeURIComponent(uid)}`);
    await load();
  }

  async function load() {
    setLoading(true);
    setErr("");

    const q =
      mode === "streak"
        ? supabase
            .from("leaderboard_streak")
            .select("user_id, username, streak, posts")
            .order("streak", { ascending: false })
            .order("posts", { ascending: false })
        : supabase
            .from("leaderboard_posts")
            .select("user_id, username, posts")
            .order("posts", { ascending: false });

    const { data, error } = await q.limit(50);

    if (error) {
      setErr(error.message);
      setItems([]);
      setLoading(false);
      return;
    }

    setItems((data ?? []).map(normalize));
    setLoading(false);
  }

  return (
    <div className="feed">
      <div className="header">
        <div className="headerInner">
          <div className="brand">フィード</div>
        </div>
      </div>

      <div className="post" style={{ marginTop: 12 }}>
        <div className="post-header">
          <div className="postMeta" style={{ width: "100%" }}>
            <div className="nameRow" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Leaderboard</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="miniBtn"
                  onClick={() => setMode("streak")}
                  style={
                    mode === "streak"
                      ? { background: "#111", color: "#fff", borderColor: "#111" }
                      : undefined
                  }
                >
                  Streak
                </button>
                <button
                  type="button"
                  className="miniBtn"
                  onClick={() => setMode("posts")}
                  style={
                    mode === "posts"
                      ? { background: "#111", color: "#fff", borderColor: "#111" }
                      : undefined
                  }
                >
                  Posts
                </button>
              </div>
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              {mode === "streak" ? "🔥 Weekly streak (posts only)" : "📝 Total posts"}
            </div>
          </div>
        </div>
      </div>

      {err ? (
        <div style={{ padding: 16 }}>
          <div style={{ fontWeight: 900 }}>Error</div>
          <div className="muted" style={{ marginTop: 6 }}>{err}</div>
        </div>
      ) : loading ? (
        <div style={{ padding: 16 }} className="muted">Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: 16 }} className="muted">No data.</div>
      ) : (
        items.map((x, idx) => {
          const href = `/profile/${encodeURIComponent(x.user_id)}`;
          const initial = (x.username[0] || "?").toUpperCase();

          return (
            <div className="post" key={x.user_id}>
              <div className="post-header">
                <Link href={href} className="avatar" style={{ textDecoration: "none" }}>
                  <span>{initial}</span>
                </Link>

                <div className="postMeta" style={{ width: "100%" }}>
                  <div className="nameRow" style={{ justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div className="muted" style={{ width: 28, textAlign: "right" }}>
                        #{idx + 1}
                      </div>
                      <Link href={href} className="handle" style={{ textDecoration: "none" }}>
                        @{x.username}
                      </Link>
                    </div>

                    <div className="muted" style={{ fontSize: 12 }}>
                      {mode === "streak" ? `🔥 ${x.streak}` : `📝 ${x.posts}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
      <BottomNav profileHref={myProfileHref} />
    </div>
  );
}