"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type DbPostRow = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { username: string | null } | { username: string | null }[] | null;
};

type Post = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username: string;
};

type ReactionsByPost = Record<string, number>;
type MyReactionsByPost = Record<string, boolean>;

export default function HomePage() {
  const [user, setUser] = useState<any>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const [likeCounts, setLikeCounts] = useState<ReactionsByPost>({});
  const [myLikes, setMyLikes] = useState<MyReactionsByPost>({});
  const [busyPostId, setBusyPostId] = useState<string>("");

  // Auth (para saber si puede dar like)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    void loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPosts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id, profiles(username)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const normalized: Post[] =
      (data as unknown as DbPostRow[] | null)?.map((row) => {
        const p = row.profiles as any;
        const username =
          (Array.isArray(p) ? p?.[0]?.username : p?.username) ?? "unknown";

        return {
          id: row.id,
          content: row.content,
          created_at: row.created_at,
          user_id: row.user_id,
          username,
        };
      }) ?? [];

    setPosts(normalized);
    setLoading(false);

    // Cargar reacciones para estos posts
    const postIds = normalized.map((p) => p.id);
    if (postIds.length) await loadReactions(postIds);
  }

  async function loadReactions(postIds: string[]) {
    // Trae todas las reacciones "like" de esos posts
    const { data, error } = await supabase
      .from("reactions")
      .select("post_id, user_id, kind")
      .in("post_id", postIds)
      .eq("kind", "like");

    if (error) {
      console.error(error);
      return;
    }

    const counts: ReactionsByPost = {};
    const mine: MyReactionsByPost = {};

    for (const row of data ?? []) {
      const pid = (row as any).post_id as string;
      const uid = (row as any).user_id as string;

      counts[pid] = (counts[pid] ?? 0) + 1;
      if (user?.id && uid === user.id) mine[pid] = true;
    }

    setLikeCounts(counts);
    setMyLikes(mine);
  }

  async function toggleLike(postId: string) {
    if (!user?.id) {
      alert("Primero inicia sesión para dar いいね.");
      return;
    }
    if (busyPostId) return;

    setBusyPostId(postId);

    const already = !!myLikes[postId];

    if (already) {
      const { error } = await supabase
        .from("reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .eq("kind", "like");

      if (error) alert(error.message);
      else {
        setMyLikes((m) => ({ ...m, [postId]: false }));
        setLikeCounts((c) => ({ ...c, [postId]: Math.max(0, (c[postId] ?? 0) - 1) }));
      }
    } else {
      const { error } = await supabase.from("reactions").insert({
        post_id: postId,
        user_id: user.id,
        kind: "like",
      });

      if (error) alert(error.message);
      else {
        setMyLikes((m) => ({ ...m, [postId]: true }));
        setLikeCounts((c) => ({ ...c, [postId]: (c[postId] ?? 0) + 1 }));
      }
    }

    setBusyPostId("");
  }

  const canLike = useMemo(() => !!user?.id, [user?.id]);

  if (loading) return <div className="p-6 muted">Loading…</div>;

  return (
    <div className="feed">
      <div className="header">Nihongo Feed</div>

      {posts.map((p) => {
        const initial = (p.username?.[0] || "?").toUpperCase();
        const liked = !!myLikes[p.id];
        const count = likeCounts[p.id] ?? 0;

        return (
          <div className="post" key={p.id}>
            <div className="post-header">
              <div className="avatar">{initial}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13 }}>@{p.username}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {new Date(p.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="post-content">{p.content}</div>

            <div style={{ padding: "0 12px 12px" }}>
              <button
                onClick={() => toggleLike(p.id)}
                disabled={!canLike || busyPostId === p.id}
                style={{
                  border: "1px solid #e5e5e5",
                  background: "#fff",
                  borderRadius: 999,
                  padding: "6px 10px",
                  cursor: canLike ? "pointer" : "not-allowed",
                  fontSize: 14,
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: 800 }}>{liked ? "❤️" : "♡"}</span>
                <span style={{ fontWeight: 800 }}>いいね</span>
                <span className="muted">{count}</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}