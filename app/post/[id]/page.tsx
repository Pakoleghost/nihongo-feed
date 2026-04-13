"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ConfirmDialog from "@/components/ConfirmDialog";
import AppTopNav from "@/components/AppTopNav";

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

type BodyBlock =
  | { type: "paragraph"; text: string }
  | { type: "image"; url: string; alt: string };

function parseBodyBlocks(body: string): BodyBlock[] {
  const lines = body.split("\n");
  const blocks: BodyBlock[] = [];
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    const text = paragraphBuffer.join("\n").trim();
    if (text) blocks.push({ type: "paragraph", text });
    paragraphBuffer = [];
  };

  const imageLineRegex = /^\s*!\[(.*?)\]\((.+?)\)\s*$/;

  for (const line of lines) {
    const match = line.match(imageLineRegex);
    if (match) {
      flushParagraph();
      blocks.push({ type: "image", alt: match[1] || "", url: match[2] || "" });
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    paragraphBuffer.push(line);
  }

  flushParagraph();
  return blocks;
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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

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
  const isEdited = useMemo(() => {
    if (!post?.updated_at || !post?.created_at) return false;
    return new Date(post.updated_at).getTime() - new Date(post.created_at).getTime() > 60_000;
  }, [post]);
  const bodyBlocks = useMemo(() => parseBodyBlocks(parsed.body || ""), [parsed.body]);
  const canEditPost = Boolean(myId && (myId === post?.user_id || post?.profiles?.is_admin));

  const handleDeletePost = async () => {
    if (!canEditPost) return;
    try {
      const { error } = await supabase.from("posts").delete().eq("id", Number(postId));
      if (error) throw error;
      router.push("/study");
    } catch {
      alert("No se pudo borrar el post.");
    } finally {
      setConfirmDeleteOpen(false);
    }
  };

  if (loading || !post) {
    return (
      <div style={{ padding: "120px 20px", textAlign: "center", color: "var(--color-text-muted)" }}>
        Cargando publicación…
      </div>
    );
  }

  return (
    <>
      <div className="postPage">
        <div className="postChrome ds-container">
          <AppTopNav />

          <header className="postTopBar">
            <div className="topBarMain">
              <button type="button" onClick={() => router.back()} className="ghostBtn">
                Volver
              </button>
              <div className="topBarCopy">
                <div className="eyebrow">Publicación</div>
                <h1>{parsed.title}</h1>
              </div>
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
                <div className="authorRow">
                  <Link
                    href={`/profile/${post.user_id}`}
                    className="authorAvatar"
                  >
                    {post.profiles?.avatar_url ? (
                      <img src={post.profiles.avatar_url} alt="" className="authorAvatarImg" />
                    ) : (
                      <AvatarFallback size={42} />
                    )}
                  </Link>
                  <div className="authorMeta">
                    <Link href={`/profile/${post.user_id}`} className="authorName">
                      {post.profiles?.username || "usuario"}
                    </Link>
                    <div className="authorSub">
                      <span>{formatPostDate(post.created_at)}</span>
                      {post.profiles?.group_name ? <span>{post.profiles.group_name}</span> : null}
                      {post.profiles?.is_admin ? <span>Sensei</span> : null}
                      {isEdited && <span>Editado</span>}
                    </div>
                  </div>
                </div>

                <h2 className="postTitle">{parsed.title}</h2>

                {parsed.body && (
                  <div className="postContent">
                    {bodyBlocks.map((block, index) =>
                      block.type === "paragraph" ? (
                        <p key={`p-${index}`} className="bodyParagraph">
                          {block.text}
                        </p>
                      ) : (
                        <figure key={`img-${index}`} className="inlineFigure">
                          <img src={block.url} alt={block.alt} className="inlineImage" />
                          {block.alt && <figcaption>{block.alt}</figcaption>}
                        </figure>
                      ),
                    )}
                  </div>
                )}

              </div>
            </article>

            <aside className="postSidebar">
              <section className="sideCard">
                <p className="sideLabel">Guardar</p>
                <button
                  type="button"
                  onClick={handleLike}
                  disabled={publishingLike}
                  className={`likeBtn ${isLiked ? "liked" : ""}`}
                >
                  <HeartIcon filled={isLiked} />
                  <span>{likesCount > 0 ? likesCount : "Me gusta"}</span>
                </button>
              </section>

              <section className="sideCard">
                <p className="sideLabel">Acciones</p>
                <div className="sideActions">
                  <Link href={`/profile/${post.user_id}`} className="pillLink">Ver perfil</Link>
                  {canEditPost && <Link href={`/write?edit_id=${post.id}`} className="pillLink">Editar</Link>}
                  {canEditPost && (
                    <button type="button" onClick={() => setConfirmDeleteOpen(true)} className="pillDangerBtn">
                      Borrar
                    </button>
                  )}
                </div>
              </section>
            </aside>
          </main>
        </div>
      </div>

      <style jsx>{`
        .postPage {
          min-height: 100vh;
          background: var(--color-bg);
          padding: var(--page-padding);
        }
        .postChrome {
          display: grid;
          gap: var(--space-4);
        }
        .postTopBar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-3);
          padding: var(--space-2) 0;
          flex-wrap: wrap;
        }
        .topBarMain {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          min-width: 0;
        }
        .topBarCopy {
          display: grid;
          gap: 2px;
          min-width: 0;
        }
        .topBarCopy h1 {
          margin: 0;
          font-size: var(--text-h1);
          line-height: 0.98;
          letter-spacing: -0.04em;
          color: var(--color-text);
          overflow-wrap: anywhere;
        }
        .topBarActions {
          display: flex;
          gap: var(--space-2);
          align-items: center;
          flex-wrap: wrap;
        }
        .ghostBtn,
        .ghostBtnLink {
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          border-radius: var(--radius-pill);
          padding: 10px 14px;
          font-size: var(--text-body-sm);
          font-weight: 700;
          color: var(--color-text);
          text-decoration: none;
          cursor: pointer;
        }
        .primaryBtnLink {
          text-decoration: none;
          border-radius: var(--radius-pill);
          padding: 10px 14px;
          font-size: var(--text-body-sm);
          font-weight: 700;
          color: #fff;
          background: var(--color-primary);
        }
        .postGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: var(--space-4);
        }
        .postCard {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-card);
        }
        .heroImageWrap {
          width: 100%;
          height: 260px;
          border: 0;
          padding: 0;
          margin: 0;
          background: var(--color-surface-muted);
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
          background: var(--color-surface);
        }
        .heroHint {
          position: absolute;
          right: 12px;
          bottom: 12px;
          background: color-mix(in srgb, var(--color-text) 75%, transparent);
          color: white;
          font-size: var(--text-label);
          font-weight: 600;
          border-radius: var(--radius-pill);
          padding: 6px 10px;
        }
        .postBodyShell {
          padding: var(--space-5);
        }
        .eyebrow {
          font-size: var(--text-label);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 800;
          color: var(--color-text-muted);
        }
        .postTitle {
          margin: 0 0 var(--space-4);
          font-size: var(--text-h2);
          line-height: 1.16;
          color: var(--color-text);
          letter-spacing: -0.02em;
          font-weight: 700;
          overflow-wrap: anywhere;
        }
        .authorRow {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: 0 0 var(--space-4);
          border-bottom: 1px solid var(--color-border);
          margin-bottom: var(--space-4);
        }
        .authorAvatar {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          overflow: hidden;
          display: block;
          flex-shrink: 0;
          border: 1px solid var(--color-border);
          background: var(--color-surface-muted);
        }
        .authorAvatarImg {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .authorMeta {
          min-width: 0;
        }
        .authorName {
          font-size: var(--text-body);
          font-weight: 700;
          color: var(--color-text);
          text-decoration: none;
        }
        .authorSub {
          margin-top: 2px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          font-size: var(--text-body-sm);
          color: var(--color-text-muted);
        }
        .postContent {
          font-size: var(--text-body-lg);
          line-height: 1.85;
          color: var(--color-text);
          letter-spacing: 0.01em;
        }
        .bodyParagraph {
          margin: 0 0 var(--space-4);
          white-space: pre-wrap;
        }
        .bodyParagraph:last-child {
          margin-bottom: 0;
        }
        .inlineFigure {
          margin: 0 0 var(--space-4);
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid var(--color-border);
          background: var(--color-surface-muted);
        }
        .inlineImage {
          width: 100%;
          max-height: 620px;
          object-fit: contain;
          display: block;
          background: var(--color-surface-muted);
        }
        .inlineFigure figcaption {
          padding: 8px 10px;
          font-size: var(--text-body-sm);
          color: var(--color-text-muted);
          border-top: 1px solid var(--color-border);
          background: var(--color-surface);
        }
        .postSidebar {
          display: grid;
          gap: var(--space-3);
          align-content: start;
        }
        .sideCard {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-4);
          box-shadow: var(--shadow-card);
        }
        .sideLabel {
          margin: 0 0 var(--space-3);
          font-size: var(--text-label);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 800;
          color: var(--color-text-muted);
        }
        .likeBtn {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          border-radius: var(--radius-pill);
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text);
          padding: 11px 14px;
          cursor: pointer;
          font-weight: 700;
          font-size: var(--text-body);
        }
        .likeBtn.liked {
          border-color: color-mix(in srgb, var(--color-primary) 20%, var(--color-border));
          background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));
          color: var(--color-primary);
        }
        .likeBtn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .sideActions {
          display: grid;
          gap: var(--space-2);
        }
        .pillLink {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 10px 12px;
          background: var(--color-surface);
          color: var(--color-text);
          text-decoration: none;
          font-size: var(--text-body-sm);
          font-weight: 600;
        }
        .pillLink:hover {
          background: var(--color-surface-muted);
        }
        .pillDangerBtn {
          border: 1px solid color-mix(in srgb, var(--color-primary) 24%, var(--color-border));
          border-radius: var(--radius-md);
          padding: 10px 12px;
          background: var(--color-surface);
          color: var(--color-primary);
          text-align: left;
          font-size: var(--text-body-sm);
          font-weight: 700;
          cursor: pointer;
        }
        .pillDangerBtn:hover {
          background: color-mix(in srgb, var(--color-primary) 6%, var(--color-surface));
        }

        @media (min-width: 980px) {
          .postGrid {
            grid-template-columns: minmax(0, 1fr) 240px;
            align-items: start;
          }
          .postSidebar {
            position: sticky;
            top: 24px;
          }
          .heroImageWrap {
            height: 340px;
          }
          .postBodyShell {
            padding: var(--space-6);
          }
          .postTitle {
            font-size: calc(var(--text-h1) - 2px);
          }
          .postContent {
            font-size: var(--text-body-lg);
            line-height: 1.9;
          }
        }
        @media (max-width: 680px) {
          .postTopBar {
            align-items: flex-start;
          }
          .topBarMain {
            width: 100%;
          }
          .topBarActions {
            width: 100%;
          }
          .postBodyShell {
            padding: var(--space-4);
          }
        }
      `}</style>
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="¿Borrar publicación?"
        description="Esta acción eliminará el post de forma permanente."
        confirmLabel="Sí, borrar"
        destructive
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDeletePost()}
      />
    </>
  );
}
