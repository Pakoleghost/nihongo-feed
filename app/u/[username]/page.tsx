// app/u/[username]/page.tsx
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
  }, [username]);

  async function loadProfile(u: string) {
    setLoading(true);
    setNotFound(false);

    // 1) encontrar user id por username
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
.eq("username", username.toLowerCase())      .single();

    if (profErr || !prof?.id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setAvatarUrl(prof.avatar_url ?? null);

    // 2) posts del usuario
    const { data: postRows } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id, image_url, profiles(username, avatar_url)")
      .eq("user_id", prof.id)
      .order("created_at", { ascending: false });

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

    // 3) comentarios del usuario (conteo)
    const { count } = await supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", prof.id);

    setCommentCount(count ?? 0);

    setLoading(false);
  }

  if (loading) {
    return <div style={{ padding: 24, color: "#777" }}>Loading…</div>;
  }

  if (notFound) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>Profile not found</div>
        <div style={{ marginTop: 8 }}>
          <Link href="/" style={{ color: "inherit" }}>
            ← Back to feed
          </Link>
        </div>
      </div>
    );
  }

  const initial = (username?.[0] || "?").toUpperCase();

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>
          ← Back
        </Link>
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 999,
            overflow: "hidden",
            background: "rgba(255,255,255,.08)",
            display: "grid",
            placeItems: "center",
            color: "#fff",
            fontWeight: 900,
          }}
        >
          {avatarUrl ? <img src={avatarUrl} alt={username} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initial}
        </div>

        <div>
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 20 }}>@{username}</div>
          <div style={{ color: "rgba(255,255,255,.65)", marginTop: 4, fontSize: 13 }}>
            Posts: {postCount} · Comments: {commentCount}
          </div>
        </div>
      </div>

      <div style={{ color: "rgba(255,255,255,.8)", fontWeight: 800, marginBottom: 10 }}>Posts</div>

      {posts.length === 0 ? (
        <div style={{ color: "rgba(255,255,255,.6)" }}>No posts yet.</div>
      ) : (
        posts.map((p) => (
          <div
            key={p.id}
            style={{
              background: "rgba(255,255,255,.06)",
              border: "1px solid rgba(255,255,255,.10)",
              borderRadius: 14,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <div style={{ color: "rgba(255,255,255,.6)", fontSize: 12, marginBottom: 8 }}>
              {new Date(p.created_at).toLocaleString()}
            </div>

            {p.content ? <div style={{ color: "#fff", whiteSpace: "pre-wrap" }}>{p.content}</div> : null}

            {p.image_url ? (
              <div style={{ marginTop: 10 }}>
                <img
                  src={p.image_url}
                  alt="post"
                  style={{ width: "100%", borderRadius: 12, border: "1px solid rgba(255,255,255,.10)" }}
                />
              </div>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}　　　