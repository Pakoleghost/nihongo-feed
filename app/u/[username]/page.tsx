"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type DbPostRow = {
  id: string;
  content: string | null;
  created_at: string;
  user_id: string;
  image_url?: string | null;
  profiles:
    | { username: string | null; avatar_url: string | null }
    | { username: string | null; avatar_url: string | null }[]
    | null;
};

type Post = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  image_url: string | null;
};

function normalizeProfile(p: any): { username: string; avatar_url: string | null } {
  const obj = Array.isArray(p) ? p?.[0] : p;
  const raw = (obj?.username ?? "").toString().trim().toLowerCase();
  const username = raw && raw !== "unknown" ? raw : "";
  return { username, avatar_url: obj?.avatar_url ?? null };
}

export default function UserProfilePage({ params }: { params: { username: string } }) {
  const username = useMemo(() => decodeURIComponent(params.username || "").trim().toLowerCase(), [params.username]);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [postCount, setPostCount] = useState<number>(0);
  const [commentCount, setCommentCount] = useState<number>(0);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!username) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    void loadProfile(username);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  async function loadProfile(u: string) {
    setLoading(true);
    setNotFound(false);

    // 1) perfil por username (case-insensitive)
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .ilike("username", u)
      .limit(1)
      .single();

    if (profErr || !prof?.id) {
      console.error("profile lookup error:", profErr);
      setNotFound(true);
      setLoading(false);
      return;
    }

    setAvatarUrl(prof.avatar_url ?? null);

    // 2) posts del usuario (misma forma que el feed)
    const { data: postRows, error: postErr } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id, image_url, profiles(username, avatar_url)")
      .eq("user_id", prof.id)
      .order("created_at", { ascending: false });

    if (postErr) console.error("posts error:", postErr);

    const normalizedPosts: Post[] =
      (postRows as unknown as DbPostRow[] | null)?.map((row) => {
        const p = normalizeProfile(row.profiles as any);
        return {
          id: row.id,
          content: (row.content ?? "").toString(),
          created_at: row.created_at,
          user_id: row.user_id,
          username: p.username || u,
          avatar_url: p.avatar_url ?? null,
          image_url: (row as any).image_url ?? null,
        };
      }) ?? [];

    setPosts(normalizedPosts);
    setPostCount(normalizedPosts.length);

    // 3) conteo de comentarios
    const { count, error: cErr } = await supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", prof.id);

    if (cErr) console.error("comments count error:", cErr);

    setCommentCount(count ?? 0);
    setLoading(false);
  }

  const initial = (username?.[0] || "?").toUpperCase();
  const profileHref = username ? `/u/${encodeURIComponent(username)}` : "";

  if (loading) {
    return <div style={{ padding: 16 }} className="muted">Loading…</div>;
  }

  if (notFound) {
    return (
      <div className="feed">
        <div className="header">
          <div className="headerInner">
            <div className="brand">フィード</div>
            <Link href="/" className="miniBtn" style={{ textDecoration: "none" }}>
              ← Back
            </Link>
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>Profile not found</div>
          <div className="muted" style={{ marginTop: 6 }}>No existe o no tienes permisos (RLS).</div>
        </div>
      </div>
    );
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

            <Link href="/leaderboard" className="miniBtn" style={{ marginLeft: 8, textDecoration: "none" }}>
              🏆 Leaderboard
            </Link>
          </div>
        </div>
      </div>

      {/* “Header” de perfil con mismas piezas del feed */}
      <div className="post" style={{ marginTop: 12 }}>
        <div className="post-header">
          <div className="avatar" aria-label="Profile avatar">
            {avatarUrl ? <img src={avatarUrl} alt={username} /> : <span>{initial}</span>}
          </div>

          <div className="postMeta">
            <div className="nameRow">
              <Link href={profileHref} className="handle" style={{ textDecoration: "none" }}>
                @{username}
              </Link>
            </div>

            <div className="muted" style={{ fontSize: 12 }}>
              Posts: <span className="muted">{postCount}</span> · Comments: <span className="muted">{commentCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de posts, mismas cards que feed */}
      {posts.length === 0 ? (
        <div style={{ padding: 16 }} className="muted">No posts yet.</div>
      ) : (
        posts.map((p) => {
          const pi = (p.username?.[0] || "?").toUpperCase();

          return (
            <div className="post" key={p.id}>
              <div className="post-header">
                <Link href={profileHref} className="avatar" style={{ textDecoration: "none" }}>
                  {p.avatar_url ? <img src={p.avatar_url} alt={p.username} /> : <span>{pi}</span>}
                </Link>

                <div className="postMeta">
                  <div className="nameRow">
                    <Link href={profileHref} className="handle" style={{ textDecoration: "none" }}>
                      @{p.username}
                    </Link>
                  </div>

                  <div className="muted" style={{ fontSize: 12 }}>
                    {new Date(p.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {p.content ? <div className="post-content">{p.content}</div> : null}

              {p.image_url ? (
                <div style={{ padding: "0 12px 12px" }}>
                  <img src={p.image_url} alt="post" className="postImage" />
                </div>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}