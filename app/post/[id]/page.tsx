"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill={filled ? "#ff2d55" : "none"}
    stroke={filled ? "#ff2d55" : "#666"}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

function AvatarFallback({ size = 40 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: "#f3f4f6",
        display: "grid",
        placeItems: "center",
        color: "#9ca3af",
        fontSize: Math.max(12, Math.floor(size * 0.35)),
      }}
    >
      👤
    </div>
  );
}

function formatPostDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export default function PostDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const postId = String(id ?? "");

  const [post, setPost] = useState<any>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isExpandedImage, setIsExpandedImage] = useState(false);
  const [publishingLike, setPublishingLike] = useState(false);

  const fetchPostAndLikes = useCallback(async () => {
    setLoading(true);

    const { data: postData } = await supabase
      .from("posts")
      .select("*, profiles:user_id(*)")
      .eq("id", postId)
      .single();
    setPost(postData);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    setMyId(user?.id || null);

    if (postData) {
      const { count } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);
      setLikesCount(count || 0);

      if (user) {
        const { data: like } = await supabase
          .from("likes")
          .select("*")
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .single();
        setIsLiked(!!like);
      } else {
        setIsLiked(false);
      }
    }

    setLoading(false);
  }, [postId]);

  useEffect(() => {
    void fetchPostAndLikes();
  }, [fetchPostAndLikes]);

  const handleLike = async () => {
    if (!myId || publishingLike) return;
    setPublishingLike(true);

    try {
      if (isLiked) {
        await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", myId);
        setLikesCount((prev) => Math.max(0, prev - 1));
        setIsLiked(false);
        return;
      }

      const { error: likeError } = await supabase.from("likes").insert({ post_id: postId, user_id: myId });
      if (likeError) return;

      setLikesCount((prev) => prev + 1);
      setIsLiked(true);

      if (post?.user_id && post.user_id !== myId) {
        const { data: actor } = await supabase
          .from("profiles")
          .select("full_name, username")
          .eq("id", myId)
          .maybeSingle();
        const actorName = actor?.full_name || actor?.username || "Un estudiante";
        const postTitle = (post.content || "").split("\n")[0] || "tu publicación";

        await supabase.from("notifications").insert({
          user_id: post.user_id,
          message: `${actorName} indicó que le gustó: ${postTitle}`,
          link: `/post/${postId}`,
          post_id: postId,
          actor_user_id: myId,
          type: "like",
          is_read: false,
        });
      }
    } finally {
      setPublishingLike(false);
    }
  };

  const parsed = useMemo(() => {
    if (!post?.content) return { title: "Sin título", body: "" };
    const [title, ...rest] = String(post.content).split("\n");
    return {
      title: title?.trim() || "Sin título",
      body: rest.join("\n").trim(),
    };
  }, [post]);

  if (loading || !post) {
    return (
      <div style={{ padding: "120px 20px", textAlign: "center", color: "#9ca3af" }}>
        Cargando publicación…
      </div>
    );
  }

  return (
    <>
      <div className="postPage">
        <div className="postChrome">
          <header className="postTopBar">
            <button type="button" onClick={() => router.back()} className="ghostBtn">
              ← Volver
            </button>
            <div className="topBarActions">
              <Link href="/" className="ghostBtnLink">Home</Link>
              <Link href="/write" className="primaryBtnLink">Escribir</Link>
            </div>
          </header>

          <main className="postGrid">
            <article className="postCard">
              {post.image_url && (
                <button
                  type="button"
                  onClick={() => setIsExpandedImage((v) => !v)}
                  className={`heroImageWrap ${isExpandedImage ? "expanded" : ""}`}
                  aria-label={isExpandedImage ? "Reducir imagen" : "Expandir imagen"}
                >
                  <img src={post.image_url} alt="" className="heroImage" />
                  <span className="heroHint">{isExpandedImage ? "Reducir" : "Expandir"}</span>
                </button>
              )}

              <div className="postBodyShell">
                <div className="eyebrowRow">
                  <span className="eyebrow">POST</span>
                  <span className="eyebrowDot" />
                  <span className="eyebrowMeta">{formatPostDate(post.created_at)}</span>
                </div>

                <h1 className="postTitle">{parsed.title}</h1>

                <div className="authorRow">
                  <Link href={`/profile/${post.user_id}`} className="authorAvatar">
                    {post.profiles?.avatar_url ? (
                      <img src={post.profiles.avatar_url} alt="" />
                    ) : (
                      <AvatarFallback size={42} />
                    )}
                  </Link>
                  <div className="authorMeta">
                    <Link href={`/profile/${post.user_id}`} className="authorName">
                      {post.profiles?.username || "usuario"}
                    </Link>
                    <div className="authorSub">
                      {post.profiles?.group_name || "General"}
                      {post.profiles?.is_admin ? " · Sensei" : ""}
                    </div>
                  </div>
                </div>

                {parsed.body && <div className="postContent">{parsed.body}</div>}
              </div>
            </article>

            <aside className="postSidebar">
              <section className="sideCard">
                <p className="sideLabel">Interacción</p>
                <button
                  type="button"
                  onClick={handleLike}
                  disabled={publishingLike}
                  className={`likeBtn ${isLiked ? "liked" : ""}`}
                >
                  <HeartIcon filled={isLiked} />
                  <span>{likesCount > 0 ? likesCount : "Suki"}</span>
                </button>
                <p className="sideHint">
                  {isLiked ? "Te gusta esta publicación" : "Marca esta publicación para apoyar al autor"}
                </p>
              </section>

              <section className="sideCard">
                <p className="sideLabel">Acciones</p>
                <div className="sideActions">
                  <Link href={`/profile/${post.user_id}`} className="pillLink">Ver perfil</Link>
                  <Link href="/write" className="pillLink">Escribir nuevo post</Link>
                </div>
              </section>
            </aside>
          </main>
        </div>
      </div>

      <style jsx>{`
        .postPage {
          min-height: 100vh;
          background: radial-gradient(900px 420px at 50% -10%, rgba(52, 197, 166, 0.08), transparent 65%), #f6f7f8;
          padding: 14px;
        }
        .postChrome {
          max-width: 1180px;
          margin: 0 auto;
        }
        .postTopBar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 2px 14px;
          position: sticky;
          top: 0;
          z-index: 20;
          background: rgba(246, 247, 248, 0.82);
          backdrop-filter: blur(10px);
        }
        .topBarActions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .ghostBtn,
        .ghostBtnLink {
          border: 1px solid rgba(17, 17, 20, 0.1);
          background: #fff;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 13px;
          color: #222;
          text-decoration: none;
          cursor: pointer;
        }
        .primaryBtnLink {
          text-decoration: none;
          border-radius: 999px;
          padding: 9px 14px;
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          background: linear-gradient(135deg, #34c5a6, #25a98f);
          box-shadow: 0 8px 18px rgba(44, 182, 150, 0.2);
        }
        .postGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 14px;
        }
        .postCard {
          background: #fff;
          border: 1px solid rgba(17, 17, 20, 0.07);
          border-radius: 22px;
          overflow: hidden;
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.04);
        }
        .heroImageWrap {
          width: 100%;
          height: 260px;
          border: 0;
          padding: 0;
          margin: 0;
          background: #f3f4f6;
          display: block;
          position: relative;
          cursor: zoom-in;
        }
        .heroImageWrap.expanded {
          height: auto;
          max-height: 80vh;
          cursor: zoom-out;
        }
        .heroImage {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }
        .heroImageWrap.expanded .heroImage {
          object-fit: contain;
          max-height: 80vh;
          background: #f8fafc;
        }
        .heroHint {
          position: absolute;
          right: 12px;
          bottom: 12px;
          background: rgba(17, 17, 20, 0.6);
          color: #fff;
          font-size: 11px;
          font-weight: 600;
          border-radius: 999px;
          padding: 6px 10px;
        }
        .postBodyShell {
          padding: 20px 18px 24px;
        }
        .eyebrowRow {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #71717a;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .eyebrow {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 800;
          color: #2cb696;
        }
        .eyebrowDot {
          width: 3px;
          height: 3px;
          border-radius: 999px;
          background: #b4b4bd;
        }
        .eyebrowMeta {
          font-size: 12px;
        }
        .postTitle {
          margin: 0 0 18px;
          font-size: 30px;
          line-height: 1.18;
          color: #111114;
          letter-spacing: -0.02em;
          font-weight: 800;
        }
        .authorRow {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 0 18px;
          border-bottom: 1px solid rgba(17, 17, 20, 0.07);
          margin-bottom: 18px;
        }
        .authorAvatar {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          overflow: hidden;
          display: block;
          flex-shrink: 0;
          border: 1px solid rgba(17, 17, 20, 0.08);
          background: #f5f5f5;
        }
        .authorAvatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .authorMeta {
          min-width: 0;
        }
        .authorName {
          font-size: 14px;
          font-weight: 700;
          color: #17171b;
          text-decoration: none;
        }
        .authorSub {
          margin-top: 2px;
          font-size: 12px;
          color: #7c7c85;
        }
        .postContent {
          white-space: pre-wrap;
          font-size: 17px;
          line-height: 1.9;
          color: #2a2a31;
          letter-spacing: 0.01em;
        }
        .postSidebar {
          display: grid;
          gap: 14px;
          align-content: start;
        }
        .sideCard {
          background: #fff;
          border: 1px solid rgba(17, 17, 20, 0.07);
          border-radius: 18px;
          padding: 16px;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.03);
        }
        .sideLabel {
          margin: 0 0 12px;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 800;
          color: #7a7a84;
        }
        .likeBtn {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 999px;
          border: 1px solid rgba(17, 17, 20, 0.12);
          background: #fff;
          color: #555;
          padding: 11px 14px;
          cursor: pointer;
          font-weight: 700;
          font-size: 14px;
        }
        .likeBtn.liked {
          border-color: #ffd6df;
          background: #fff4f7;
          color: #ff2d55;
        }
        .likeBtn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .sideHint {
          margin: 10px 0 0;
          color: #7c7c85;
          font-size: 12px;
          line-height: 1.45;
        }
        .sideActions {
          display: grid;
          gap: 8px;
        }
        .pillLink {
          border: 1px solid rgba(17, 17, 20, 0.1);
          border-radius: 12px;
          padding: 10px 12px;
          background: #fff;
          color: #222;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
        }
        .pillLink:hover {
          background: #fafafa;
        }

        @media (min-width: 980px) {
          .postPage {
            padding: 18px 22px 28px;
          }
          .postGrid {
            grid-template-columns: minmax(0, 1fr) 300px;
            align-items: start;
          }
          .postSidebar {
            position: sticky;
            top: 74px;
          }
          .heroImageWrap {
            height: 340px;
          }
          .postBodyShell {
            padding: 24px 28px 30px;
          }
          .postTitle {
            font-size: 38px;
          }
          .postContent {
            font-size: 18px;
            line-height: 1.95;
          }
        }
      `}</style>
    </>
  );
}
