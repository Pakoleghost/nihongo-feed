"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Post = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  image_url: string | null;
};

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
};

export default function UserProfilePage({ params }: { params: { username: string } }) {
  const username = useMemo(
    () => decodeURIComponent(params.username || "").trim().toLowerCase(),
    [params.username]
  );

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [rlsBlocked, setRlsBlocked] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
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
    setRlsBlocked(false);
    setProfile(null);
    setPosts([]);
    setPostCount(0);
    setCommentCount(0);

    // 1) Fetch profile by exact username (lowercase). Use maybeSingle to avoid hard-fail.
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .eq("username", u)
      .maybeSingle();

    if (profErr) {
      console.error("profile lookup error:", profErr);

      // If RLS blocks, Supabase typically returns 401/403-like behavior or permission error text.
      const msg = (profErr as any)?.message?.toString?.() ?? "";
      if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("rls")) {
        setRlsBlocked(true);
      } else {
        // Unknown error: still show not found screen, but log already printed.
        setNotFound(true);
      }

      setLoading(false);
      return;
    }

    if (!prof?.id) {
      // Clean "not found" (0 rows)
      setNotFound(true);
      setLoading(false);
      return;
    }

    const normalizedProfile: Profile = {
      id: prof.id,
      username: (prof.username ?? "").toString().trim().toLowerCase(),
      avatar_url: prof.avatar_url ?? null,
    };

    setProfile(normalizedProfile);

    // 2) Fetch posts by user id. DO NOT embed profiles here (avoids RLS join/null issues).
    const { data: postRows, error: postErr } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id, image_url")
      .eq("user_id", normalizedProfile.id)
      .order("created_at", { ascending: false });

    if (postErr) console.error("posts error:", postErr);

    const normalizedPosts: Post[] =
      (postRows as any[] | null)?.map((row) => ({
        id: row.id,
        content: (row.content ?? "").toString(),
        created_at: row.created_at,
        user_id: row.user_id,
        image_url: row.image_url ?? null,
      })) ?? [];

    setPosts(normalizedPosts);
    setPostCount(normalizedPosts.length);

    // 3) Count comments (ok if blocked, we keep page usable)
    const { count, error: cErr } = await supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", normalizedProfile.id);

    if (cErr) console.error("comments count error:", cErr);
    setCommentCount(count ?? 0);

    setLoading(false);
  }

  const shownUsername = profile?.username || username;
  const initial = (shownUsername?.[0] || "?").toUpperCase();
  const profileHref = shownUsername ? `/u/${encodeURIComponent(shownUsername)}` : "";

  if (loading) {
    return (
      <div style={{ padding: 16 }} className="muted">
        Loading…
      </div>
    );
  }

  if (rlsBlocked) {
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
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>No access</div>
          <div className="muted" style={{ marginTop: 6 }}>
            No tienes permisos para ver este perfil (RLS).
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
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
          <div className="muted" style={{ marginTop: 6 }}>
            No existe este usuario.
          </div>
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

      {/* Profile header */}
      <div className="post" style={{ marginTop: 12 }}>
        <div className="post-header">
          <div className="avatar" aria-label="Profile avatar">
            {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.username} /> : <span>{initial}</span>}
          </div>

          <div className="postMeta">
            <div className="nameRow">
              <Link href={profileHref} className="handle" style={{ textDecoration: "none" }}>
                @{profile.username}
              </Link>
            </div>

            <div className="muted" style={{ fontSize: 12 }}>
              Posts: <span className="muted">{postCount}</span> · Comments: <span className="muted">{commentCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Posts list */}
      {posts.length === 0 ? (
        <div style={{ padding: 16 }} className="muted">
          No posts yet.
        </div>
      ) : (
        posts.map((p) => (
          <div className="post" key={p.id}>
            <div className="post-header">
              <Link href={profileHref} className="avatar" style={{ textDecoration: "none" }}>
                {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.username} /> : <span>{initial}</span>}
              </Link>

              <div className="postMeta">
                <div className="nameRow">
                  <Link href={profileHref} className="handle" style={{ textDecoration: "none" }}>
                    @{profile.username}
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
        ))
      )}
    </div>
  );
}
