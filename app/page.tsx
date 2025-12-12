"use client";

import { useEffect, useState } from "react";
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
  likes: number;
  likedByMe: boolean;
};

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    void loadAll();
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    setLoading(true);

    const { data, error } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id, profiles(username)")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const normalized =
      (data as unknown as DbPostRow[] | null)?.map((row) => {
        const p: any = row.profiles as any;
        const username = (Array.isArray(p) ? p?.[0]?.username : p?.username) ?? "unknown";
        return {
          id: row.id,
          content: row.content,
          created_at: row.created_at,
          user_id: row.user_id,
          username,
          likes: 0,
          likedByMe: false,
        };
      }) ?? [];

    // load likes for these posts (count + whether I liked)
    const postIds = normalized.map((p) => p.id);
    if (postIds.length) {
      const { data: likesData } = await supabase
        .from("reactions")
        .select("post_id, user_id")
        .in("post_id", postIds);

      const likeMap = new Map<string, { count: number; mine: boolean }>();
      for (const pid of postIds) likeMap.set(pid, { count: 0, mine: false });

      (likesData ?? []).forEach((r: any) => {
        const cur = likeMap.get(r.post_id);
        if (!cur) return;
        cur.count += 1;
        if (userId && r.user_id === userId) cur.mine = true;
        likeMap.set(r.post_id, cur);
      });

      normalized.forEach((p) => {
        const v = likeMap.get(p.id);
        if (v) {
          p.likes = v.count;
          p.likedByMe = v.mine;
        }
      });
    }

    setPosts(normalized);
    setLoading(false);
  }

  async function createPost() {
    if (!userId) {
      alert("Log in first.");
      return;
    }
    if (busy) return;
    if (!text.trim()) return;

    setBusy(true);
    const { error } = await supabase.from("posts").insert({
      content: text.trim(),
      user_id: userId,
    });
    setBusy(false);

    if (error) {
      alert(error.message);
      return;
    }

    setText("");
    void loadAll();
  }

  async function toggleLike(postId: string) {
    if (!userId) {
      alert("Log in first.");
      return;
    }

    const p = posts.find((x) => x.id === postId);
    if (!p) return;

    // optimistic UI
    setPosts((prev) =>
      prev.map((x) =>
        x.id === postId
          ? { ...x, likedByMe: !x.likedByMe, likes: x.likedByMe ? x.likes - 1 : x.likes + 1 }
          : x
      )
    );

    if (p.likedByMe) {
      // unlike
      const { error } = await supabase
        .from("reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);

      if (error) {
        alert(error.message);
        void loadAll();
      }
    } else {
      // like
      const { error } = await supabase.from("reactions").insert({
        post_id: postId,
        user_id: userId,
      });

      if (error) {
        alert(error.message);
        void loadAll();
      }
    }
  }

  return (
    <div className="feed">
      <div className="header">Nihongo Feed</div>

      <div className="composer">
        <textarea
          className="textarea"
          placeholder="日本語で書いてね…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="row">
          <div className="muted" style={{ fontSize: 12 }}>
            {userId ? "ログイン中" : "未ログイン"}
          </div>
          <button className="btn btnPrimary" onClick={createPost} disabled={busy || !text.trim()}>
            {busy ? "投稿中…" : "投稿"}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 16 }} className="muted">
          Loading…
        </div>
      ) : (
        posts.map((p) => {
          const initial = (p.username?.[0] || "?").toUpperCase();
          return (
            <div className="post" key={p.id}>
              <div className="post-header">
                <div className="avatar">{initial}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>@{p.username}</div>
                  <div className="meta">{new Date(p.created_at).toLocaleString()}</div>
                </div>
              </div>

              <div className="post-content">{p.content}</div>

              <div className="actions">
                <button className="likeBtn" onClick={() => toggleLike(p.id)}>
                  {p.likedByMe ? "💙" : "🤍"} いいね <span className="muted">{p.likes}</span>
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}