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

type DbCommentRow = {
  id: string;
  post_id: string;
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

  reactionCounts: Record<string, number>;
  myReactions: Set<string>;
  commentsCount: number;
};

type Comment = {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
  user_id: string;
  username: string;
};

const REACTION_TYPES = ["heart", "like", "star"] as const;
type ReactionType = (typeof REACTION_TYPES)[number];

function getUsernameFromProfiles(
  profiles: { username: string | null } | { username: string | null }[] | null
) {
  if (!profiles) return "unknown";
  if (Array.isArray(profiles)) return profiles?.[0]?.username ?? "unknown";
  return profiles.username ?? "unknown";
}

export default function HomePage() {
  const [user, setUser] = useState<any>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);

  // Auth (optional): feed is public, posting/commenting/reacting requires login
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    void loadEverything();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function loadEverything() {
    setLoading(true);

    const { data: postRows, error: postErr } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id, profiles(username)")
      .order("created_at", { ascending: false });

    if (postErr) {
      console.error(postErr);
      setPosts([]);
      setLoading(false);
      return;
    }

    const base: Post[] =
      (postRows as unknown as DbPostRow[] | null)?.map((row) => ({
        id: row.id,
        content: row.content,
        created_at: row.created_at,
        user_id: row.user_id,
        username: getUsernameFromProfiles(row.profiles),
        reactionCounts: { heart: 0, like: 0, star: 0 },
        myReactions: new Set<string>(),
        commentsCount: 0,
      })) ?? [];

    const ids = base.map((p) => p.id);
    if (ids.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    // Reactions summary
    // expected schema: reactions(post_id uuid, user_id uuid, type text)
    const { data: rxRows } = await supabase
      .from("reactions")
      .select("post_id, user_id, type")
      .in("post_id", ids);

    const rxByPost: Record<string, Record<string, number>> = {};
    const myRxByPost: Record<string, Set<string>> = {};

    for (const id of ids) {
      rxByPost[id] = { heart: 0, like: 0, star: 0 };
      myRxByPost[id] = new Set<string>();
    }

    if (rxRows) {
      for (const r of rxRows as any[]) {
        const pid = String(r.post_id);
        const t = String(r.type) as ReactionType;
        if (!rxByPost[pid]) continue;
        if (!REACTION_TYPES.includes(t)) continue;

        rxByPost[pid][t] = (rxByPost[pid][t] ?? 0) + 1;

        if (user?.id && String(r.user_id) === String(user.id)) {
          myRxByPost[pid].add(t);
        }
      }
    }

    // Comments count
    const { data: cRows } = await supabase
      .from("comments")
      .select("post_id")
      .in("post_id", ids);

    const cCountByPost: Record<string, number> = {};
    for (const id of ids) cCountByPost[id] = 0;

    if (cRows) {
      for (const c of cRows as any[]) {
        const pid = String(c.post_id);
        cCountByPost[pid] = (cCountByPost[pid] ?? 0) + 1;
      }
    }

    const merged = base.map((p) => ({
      ...p,
      reactionCounts: rxByPost[p.id] ?? { heart: 0, like: 0, star: 0 },
      myReactions: myRxByPost[p.id] ?? new Set<string>(),
      commentsCount: cCountByPost[p.id] ?? 0,
    }));

    setPosts(merged);
    setLoading(false);
  }

  async function createPost() {
    if (!user) return;
    if (posting) return;

    const content = newPost.trim();
    if (!content) return;

    setPosting(true);

    const { error } = await supabase.from("posts").insert({
      content,
      user_id: user.id,
    });

    setPosting(false);

    if (error) {
      alert(error.message);
      return;
    }

    setNewPost("");
    await loadEverything();
  }

  async function toggleReaction(postId: string, type: ReactionType) {
    if (!user) return;

    const p = posts.find((x) => x.id === postId);
    if (!p) return;

    const has = p.myReactions.has(type);

    // optimistic UI
    setPosts((prev) =>
      prev.map((x) => {
        if (x.id !== postId) return x;
        const nextSet = new Set(Array.from(x.myReactions));
        const nextCounts = { ...x.reactionCounts };

        if (has) {
          nextSet.delete(type);
          nextCounts[type] = Math.max(0, (nextCounts[type] ?? 0) - 1);
        } else {
          nextSet.add(type);
          nextCounts[type] = (nextCounts[type] ?? 0) + 1;
        }

        return { ...x, myReactions: nextSet, reactionCounts: nextCounts };
      })
    );

    if (has) {
      const { error } = await supabase
        .from("reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .eq("type", type);

      if (error) {
        alert(error.message);
        await loadEverything();
      }
    } else {
      const { error } = await supabase.from("reactions").insert({
        post_id: postId,
        user_id: user.id,
        type,
      });

      if (error) {
        alert(error.message);
        await loadEverything();
      }
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  const headerRight = useMemo(() => {
    if (!user) return <span className="muted">Public</span>;
    return (
      <button className="btn-ghost" onClick={logout} title="Log out">
        ↩
      </button>
    );
  }, [user]);

  if (loading) return <div className="p-6 muted">Loading…</div>;

  return (
    <div className="feed">
      <div className="header">
        <span>Nihongo Feed</span>
        <span style={{ float: "right" }}>{headerRight}</span>
      </div>

      {/* Composer (only if logged in) */}
      <div className="composer">
        {user ? (
          <>
            <textarea
              className="composer-textarea"
              placeholder="日本語で書いてね…"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
            />
            <button className="btn" onClick={createPost} disabled={posting || !newPost.trim()}>
              {posting ? "Posting…" : "Post"}
            </button>
          </>
        ) : (
          <div className="muted" style={{ padding: 12 }}>
            View-only. Log in to post, react, and comment.
          </div>
        )}
      </div>

      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          authed={!!user}
          onReact={(t) => void toggleReaction(p.id, t)}
        />
      ))}

      {/* Minimal CSS hooks for your globals.css (uses your existing classes too) */}
      <style jsx global>{`
        .composer {
          border-bottom: 1px solid #eee;
          background: #fff;
          padding: 12px;
        }
        .composer-textarea {
          width: 100%;
          height: 80px;
          resize: vertical;
          border: 1px solid #ddd;
          border-radius: 12px;
          padding: 10px;
          font-size: 14px;
          outline: none;
        }
        .btn {
          margin-top: 8px;
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #111;
          background: #111;
          color: #fff;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-ghost {
          border: 1px solid #ddd;
          background: #fff;
          border-radius: 10px;
          padding: 6px 10px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

function PostCard({
  post,
  authed,
  onReact,
}: {
  post: Post;
  authed: boolean;
  onReact: (type: ReactionType) => void;
}) {
  const [openComments, setOpenComments] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);

  const initial = (post.username?.[0] || "?").toUpperCase();

  async function loadComments() {
    setLoadingComments(true);

    const { data, error } = await supabase
      .from("comments")
      .select("id, post_id, content, created_at, user_id, profiles(username)")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });

    setLoadingComments(false);

    if (error) {
      alert(error.message);
      return;
    }

    const normalized: Comment[] =
      (data as unknown as DbCommentRow[] | null)?.map((row) => ({
        id: row.id,
        post_id: row.post_id,
        content: row.content,
        created_at: row.created_at,
        user_id: row.user_id,
        username: getUsernameFromProfiles(row.profiles),
      })) ?? [];

    setComments(normalized);
  }

  async function addComment() {
    if (!authed) return;
    if (commentBusy) return;

    const content = newComment.trim();
    if (!content) return;

    setCommentBusy(true);

    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) {
      setCommentBusy(false);
      return;
    }

    const { error } = await supabase.from("comments").insert({
      post_id: post.id,
      user_id: uid,
      content,
    });

    setCommentBusy(false);

    if (error) {
      alert(error.message);
      return;
    }

    setNewComment("");
    await loadComments();
  }

  function pill(active: boolean) {
    return {
      border: "1px solid #e5e5e5",
      background: active ? "#111" : "#fff",
      color: active ? "#fff" : "#111",
      borderRadius: 999,
      padding: "6px 10px",
      fontSize: 13,
      fontWeight: 700 as const,
      cursor: authed ? "pointer" : "default",
      opacity: authed ? 1 : 0.5,
      userSelect: "none" as const,
    };
  }

  return (
    <div className="post">
      <div className="post-header">
        <div className="avatar">{initial}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 13 }}>@{post.username}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {new Date(post.created_at).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="post-content">{post.content}</div>

      {/* Reactions bar */}
      <div style={{ padding: "0 12px 12px", display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span
          style={pill(post.myReactions.has("heart"))}
          onClick={() => authed && onReact("heart")}
          title="Love"
        >
          ❤️ {post.reactionCounts.heart ?? 0}
        </span>
        <span
          style={pill(post.myReactions.has("like"))}
          onClick={() => authed && onReact("like")}
          title="Like"
        >
          👍 {post.reactionCounts.like ?? 0}
        </span>
        <span
          style={pill(post.myReactions.has("star"))}
          onClick={() => authed && onReact("star")}
          title="Star"
        >
          ⭐ {post.reactionCounts.star ?? 0}
        </span>

        <span
          style={{
            marginLeft: "auto",
            fontSize: 13,
            color: "#666",
            cursor: "pointer",
            userSelect: "none",
          }}
          onClick={async () => {
            const next = !openComments;
            setOpenComments(next);
            if (next && comments.length === 0) await loadComments();
          }}
        >
          💬 {post.commentsCount} {openComments ? "Hide" : "Comments"}
        </span>
      </div>

      {/* Comments */}
      {openComments && (
        <div style={{ borderTop: "1px solid #eee", padding: 12 }}>
          {loadingComments ? (
            <div className="muted">Loading comments…</div>
          ) : comments.length === 0 ? (
            <div className="muted">No comments yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {comments.map((c) => (
                <div key={c.id} style={{ fontSize: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: 12, color: "#333" }}>@{c.username}</div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{c.content}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={authed ? "Add a comment…" : "Log in to comment"}
              disabled={!authed}
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #ddd",
                borderRadius: 12,
                fontSize: 14,
                outline: "none",
                opacity: authed ? 1 : 0.6,
              }}
            />
            <button
              onClick={() => void addComment()}
              disabled={!authed || commentBusy || !newComment.trim()}
              style={{
                marginTop: 8,
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                fontWeight: 800,
                cursor: "pointer",
                opacity: !authed || !newComment.trim() ? 0.5 : 1,
              }}
            >
              {commentBusy ? "Posting…" : "Comment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}