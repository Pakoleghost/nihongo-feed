"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";

type PostRow = {
  id: string | number;
  content: string | null;
  created_at: string;
  user_id: string;
  image_url: string | null;
};

type MiniProfile = { username: string | null; avatar_url: string | null };

type CommentRow = {
  id: string;
  created_at: string;
  user_id: string;
  post_id: string | number;
  content: string | null;
};

export default function PostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const postId = params?.id;

  const [userId, setUserId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<MiniProfile | null>(null);

  const [post, setPost] = useState<PostRow | null>(null);
  const [postAuthor, setPostAuthor] = useState<MiniProfile | null>(null);

  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentAuthors, setCommentAuthors] = useState<Record<string, MiniProfile>>({});

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // For BottomNav profile button
  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      if (!mounted) return;
      setUserId(uid);

      if (uid) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", uid)
          .maybeSingle();

        if (!mounted) return;
        setMyProfile((prof as MiniProfile) ?? null);
      } else {
        setMyProfile(null);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Load post + comments
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!postId) return;

      setLoading(true);
      setErr(null);

      try {
        // 1) Post
        const { data: p, error: pErr } = await supabase
          .from("posts")
          .select("id, content, created_at, user_id, image_url")
          .eq("id", postId as any)
          .maybeSingle();

        if (pErr) throw pErr;
        if (!p) {
          setPost(null);
          setErr("Post not found.");
          return;
        }
        if (!mounted) return;
        setPost(p as PostRow);

        // 2) Author
        const { data: a } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", (p as any).user_id)
          .maybeSingle();

        if (!mounted) return;
        setPostAuthor((a as MiniProfile) ?? null);

        // 3) Comments
        const { data: cs, error: cErr } = await supabase
          .from("comments")
          .select("id, created_at, user_id, post_id, content")
          .eq("post_id", postId as any)
          .order("created_at", { ascending: true });

        if (cErr) throw cErr;
        if (!mounted) return;
        setComments((cs as CommentRow[]) ?? []);

        // 4) Comment authors (batch)
        const ids = Array.from(new Set(((cs as any[]) ?? []).map((x) => x?.user_id).filter(Boolean)));
        if (ids.length) {
          const { data: profs } = await supabase.from("profiles").select("id, username, avatar_url").in("id", ids);
          const map: Record<string, MiniProfile> = {};
          (profs as any[] | null)?.forEach((pp) => {
            if (!pp?.id) return;
            map[String(pp.id)] = { username: pp.username ?? null, avatar_url: pp.avatar_url ?? null };
          });
          if (!mounted) return;
          setCommentAuthors(map);
        } else {
          setCommentAuthors({});
        }
      } catch (e: any) {
        console.error(e);
        if (!mounted) return;
        setErr("Failed to load post.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [postId]);

  const myProfileHref = userId ? `/profile/${encodeURIComponent(userId)}` : "/";

  const title = "投稿"; // simple

  return (
    <>
      <main className="feed" style={{ minHeight: "100vh", padding: 16, paddingBottom: 80 }}>
        <div className="header" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => router.back()}
            style={{
              border: "1px solid rgba(17,17,20,.10)",
              background: "#fff",
              borderRadius: 12,
              padding: "8px 10px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            戻る
          </button>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>{title}</h2>
        </div>

        <div style={{ marginTop: 12 }}>
          {loading ? (
            <p style={{ margin: 0, opacity: 0.7 }}>Loading…</p>
          ) : err ? (
            <p style={{ margin: 0, opacity: 0.7 }}>{err}</p>
          ) : post ? (
            <div
              style={{
                border: "1px solid rgba(17,17,20,.10)",
                borderRadius: 16,
                background: "#fff",
                padding: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 999,
                    overflow: "hidden",
                    border: "1px solid rgba(17,17,20,.10)",
                    background: "#fff",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 900,
                  }}
                >
                  {postAuthor?.avatar_url ? (
                    <img
                      src={postAuthor.avatar_url}
                      alt={(postAuthor.username ?? "").toString()}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      loading="lazy"
                    />
                  ) : (
                    <span style={{ opacity: 0.8 }}>
                      {((postAuthor?.username ?? "?").toString().trim()[0] ?? "?").toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900 }}>{`@${(postAuthor?.username ?? "user").toString()}`}</div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>{new Date(post.created_at).toLocaleString()}</div>
                </div>
              </div>

              {post.content ? <div style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{post.content}</div> : null}

              {post.image_url ? (
                <div style={{ marginTop: 12, overflow: "hidden", borderRadius: 14, border: "1px solid rgba(17,17,20,.10)" }}>
                  <img src={post.image_url} alt="post image" style={{ width: "100%", height: "auto", display: "block" }} />
                </div>
              ) : null}

              <div style={{ marginTop: 14, fontWeight: 900, opacity: 0.85 }}>コメント</div>

              {comments.length === 0 ? (
                <div style={{ marginTop: 8, opacity: 0.7 }}>まだコメントはありません。</div>
              ) : (
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {comments.map((c) => {
                    const a = commentAuthors[String(c.user_id)];
                    const uname = (a?.username ?? "user").toString();
                    return (
                      <div key={c.id} style={{ border: "1px solid rgba(17,17,20,.10)", borderRadius: 14, padding: 10 }}>
                        <div style={{ fontWeight: 900, fontSize: 13 }}>{`@${uname}`}</div>
                        <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{c.content ?? ""}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </main>

      <BottomNav
        profileHref={myProfileHref}
        profileAvatarUrl={myProfile?.avatar_url ? myProfile.avatar_url : null}
        profileInitial={((myProfile?.username ?? "?").toString().trim()[0] ?? "?").toUpperCase()}
      />
    </>
  );
}