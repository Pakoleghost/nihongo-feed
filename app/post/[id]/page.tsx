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

async function compressSmallImage(file: File) {
  if (!file.type.startsWith("image/")) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("img"));
      el.src = url;
    });
    const max = 1600;
    let { width, height } = img;
    const scale = Math.min(1, max / width, max / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
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
  const [taskReplies, setTaskReplies] = useState<any[]>([]);
  const [replyBody, setReplyBody] = useState("");
  const [replyImageFile, setReplyImageFile] = useState<File | null>(null);
  const [replyImagePreview, setReplyImagePreview] = useState<string | null>(null);
  const [postingReply, setPostingReply] = useState(false);

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

      if (postData.type === "assignment") {
        const { data: replies } = await supabase
          .from("posts")
          .select("*, profiles:user_id(username, avatar_url, group_name)")
          .eq("parent_assignment_id", postId)
          .order("created_at", { ascending: true });
        setTaskReplies(replies || []);
      } else {
        setTaskReplies([]);
      }
    }

    setLoading(false);
  }, [postId]);

  useEffect(() => {
    void fetchPostAndLikes();
  }, [fetchPostAndLikes]);

  useEffect(() => {
    return () => {
      if (replyImagePreview) URL.revokeObjectURL(replyImagePreview);
    };
  }, [replyImagePreview]);

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

        const notificationPayload = {
          user_id: post.user_id,
          message: `${actorName} indicó que le gustó: ${postTitle}`,
          link: `/post/${postId}`,
          post_id: postId,
          actor_user_id: myId,
          type: "like",
          is_read: false,
        };
        const { error: notifError } = await supabase.from("notifications").insert(notificationPayload);
        if (notifError) {
          await supabase.from("notifications").insert({
            user_id: post.user_id,
            message: `${actorName} indicó que le gustó: ${postTitle}`,
            link: `/post/${postId}`,
            is_read: false,
          });
        }
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
  const bodyBlocks = useMemo(() => parseBodyBlocks(parsed.body || ""), [parsed.body]);
  const isRootAssignment = post?.type === "assignment" && !post?.parent_assignment_id;
  const isForumAssignment = Boolean(isRootAssignment && (post?.is_forum || post?.assignment_subtype === "internal"));
  const isPostAssignment = Boolean(isRootAssignment && !isForumAssignment);
  const postDeadline = post?.deadline ? new Date(post.deadline) : null;
  const deadlinePassed = Boolean(postDeadline && postDeadline.getTime() < Date.now());

  const mySubmission = useMemo(
    () => taskReplies.find((reply) => reply.user_id === myId) || null,
    [taskReplies, myId],
  );
  const canSeeAllTaskReplies = Boolean(myId && (myId === post?.user_id || post?.profiles?.is_admin));
  const visibleTaskReplies = isForumAssignment
    ? taskReplies
    : canSeeAllTaskReplies
      ? taskReplies
      : taskReplies.filter((reply) => reply.user_id === myId);

  const submitForumReply = async () => {
    if (!myId || !isForumAssignment || postingReply) return;
    if (!replyBody.trim() && !replyImageFile) return alert("Escribe una respuesta o agrega una imagen.");

    setPostingReply(true);
    try {
      let imageUrl: string | null = null;
      if (replyImageFile) {
        const compressed = await compressSmallImage(replyImageFile);
        const ext = compressed.name.split(".").pop() || "jpg";
        const path = `forum-replies/${myId}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("uploads").upload(path, compressed);
        if (error) throw error;
        const { data } = supabase.storage.from("uploads").getPublicUrl(path);
        imageUrl = data.publicUrl;
      }

      const title = `Respuesta · ${new Date().toLocaleString("es-MX")}`;
      const content = `${title}\n${replyBody}`.trim();
      const { error } = await supabase.from("posts").insert({
        user_id: myId,
        content,
        image_url: imageUrl,
        type: "assignment",
        parent_assignment_id: Number(postId),
        target_group: null,
      });
      if (error) throw error;

      setReplyBody("");
      setReplyImageFile(null);
      if (replyImagePreview) URL.revokeObjectURL(replyImagePreview);
      setReplyImagePreview(null);
      await fetchPostAndLikes();
    } catch {
      alert("No se pudo publicar la respuesta del foro.");
    } finally {
      setPostingReply(false);
    }
  };

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
                      {post.profiles?.group_name || "General"}
                      {post.profiles?.is_admin ? " · Sensei" : ""}
                    </div>
                  </div>
                </div>

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

                {isRootAssignment && (
                  <div className="assignmentPanel">
                    <div className={`assignmentBanner ${isForumAssignment ? "forum" : "task"}`}>
                      <div>
                        <div className="assignmentEyebrow">{isForumAssignment ? "Tarea tipo foro" : "Tarea"}</div>
                        <p className="assignmentText">
                          {isForumAssignment
                            ? "Responde directamente en esta página. Tu participación contará como entrega."
                            : "Entrega tu tarea usando el editor. Tu entrega contará para la matriz de tareas."}
                        </p>
                        {postDeadline && (
                          <p className="assignmentDeadline">
                            Deadline: {formatPostDate(post.deadline)}
                            {deadlinePassed ? " · vencido (se marcará tardía)" : ""}
                          </p>
                        )}
                      </div>
                      {isPostAssignment && (
                        <Link
                          href={`/write?assignment_id=${post.id}&title=${encodeURIComponent(parsed.title)}`}
                          className="assignmentCTA"
                        >
                          {mySubmission ? "Actualizar entrega" : "Entregar tarea"}
                        </Link>
                      )}
                    </div>

                    {isForumAssignment && (
                      <div className="forumComposer">
                        <h3>Responder en el foro</h3>
                        <textarea
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          placeholder="Escribe tu respuesta..."
                          className="forumTextarea"
                        />
                        <div className="forumComposerRow">
                          <label className="forumFileBtn">
                            {replyImageFile ? "Cambiar imagen" : "Agregar imagen"}
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: "none" }}
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setReplyImageFile(file);
                                if (replyImagePreview) URL.revokeObjectURL(replyImagePreview);
                                setReplyImagePreview(file ? URL.createObjectURL(file) : null);
                              }}
                            />
                          </label>
                          <button type="button" onClick={submitForumReply} className="forumSendBtn" disabled={postingReply}>
                            {postingReply ? "Publicando..." : "Publicar respuesta"}
                          </button>
                        </div>
                        {replyImagePreview && (
                          <img src={replyImagePreview} alt="" className="forumPreviewImage" />
                        )}
                      </div>
                    )}

                    <div className="forumReplies">
                      <h3>{isForumAssignment ? "Respuestas" : "Entregas"}</h3>
                      {visibleTaskReplies.length === 0 ? (
                        <p className="emptyReplies">
                          {isForumAssignment ? "Todavía no hay respuestas." : "Todavía no hay entregas visibles."}
                        </p>
                      ) : (
                        <div className="replyList">
                          {visibleTaskReplies.map((reply: any) => {
                            const [replyTitle, ...replyRest] = String(reply.content || "").split("\n");
                            const isLate = postDeadline ? new Date(reply.created_at).getTime() > postDeadline.getTime() : false;
                            return (
                              <article key={reply.id} className="replyCard">
                                <div className="replyHead">
                                  <div className="replyAuthor">
                                    <div className="replyAvatar">
                                      {reply.profiles?.avatar_url ? (
                                        <img src={reply.profiles.avatar_url} alt="" />
                                      ) : (
                                        <AvatarFallback size={30} />
                                      )}
                                    </div>
                                    <div>
                                      <div className="replyAuthorName">{reply.profiles?.username || "usuario"}</div>
                                      <div className="replyMeta">
                                        {formatPostDate(reply.created_at)}
                                        {isLate && <span className="lateTag">Entrega tardía</span>}
                                      </div>
                                    </div>
                                  </div>
                                  <Link href={`/post/${reply.id}`} className="miniReplyLink">
                                    Abrir
                                  </Link>
                                </div>
                                <div className="replyTitle">{replyTitle || "Respuesta"}</div>
                                {replyRest.join("\n").trim() && <p className="replyBody">{replyRest.join("\n").trim()}</p>}
                                {reply.image_url && <img src={reply.image_url} alt="" className="replyImage" />}
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
          font-size: 19px;
          line-height: 1.95;
          color: #2a2a31;
          letter-spacing: 0.01em;
        }
        .bodyParagraph {
          margin: 0 0 18px;
          white-space: pre-wrap;
        }
        .bodyParagraph:last-child {
          margin-bottom: 0;
        }
        .inlineFigure {
          margin: 0 0 18px;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(17, 17, 20, 0.07);
          background: #fafafa;
        }
        .inlineImage {
          width: 100%;
          max-height: 620px;
          object-fit: contain;
          display: block;
          background: #f5f5f5;
        }
        .inlineFigure figcaption {
          padding: 8px 10px;
          font-size: 12px;
          color: #71717a;
          border-top: 1px solid rgba(17, 17, 20, 0.06);
          background: #fff;
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
        .assignmentPanel {
          margin-top: 22px;
          display: grid;
          gap: 14px;
          border-top: 1px solid rgba(17,17,20,.07);
          padding-top: 18px;
        }
        .assignmentBanner {
          border: 1px solid rgba(17,17,20,.07);
          border-radius: 14px;
          padding: 14px;
          background: #fbfffd;
          display: grid;
          gap: 10px;
        }
        .assignmentBanner.task {
          background: linear-gradient(180deg, #f2fffa 0%, #fff 55%);
          border-color: rgba(44,182,150,.18);
        }
        .assignmentBanner.forum {
          background: linear-gradient(180deg, #f4fbff 0%, #fff 55%);
          border-color: rgba(88,168,255,.18);
        }
        .assignmentEyebrow {
          font-size: 11px;
          letter-spacing: .08em;
          text-transform: uppercase;
          font-weight: 800;
          color: #159578;
        }
        .assignmentBanner.forum .assignmentEyebrow { color: #3d81ce; }
        .assignmentText {
          margin: 6px 0 0;
          font-size: 13px;
          line-height: 1.45;
          color: #444;
        }
        .assignmentDeadline {
          margin: 8px 0 0;
          font-size: 12px;
          color: #7c7c85;
        }
        .assignmentCTA {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          border-radius: 999px;
          background: #fff;
          border: 1px solid rgba(44,182,150,.22);
          color: #147f68;
          padding: 9px 12px;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
        }
        .forumComposer {
          border: 1px solid rgba(17,17,20,.07);
          border-radius: 14px;
          padding: 14px;
          background: #fff;
        }
        .forumComposer h3,
        .forumReplies h3 {
          margin: 0 0 10px;
          font-size: 15px;
          color: #17171b;
        }
        .forumTextarea {
          width: 100%;
          min-height: 120px;
          border: 1px solid rgba(17,17,20,.1);
          border-radius: 12px;
          padding: 10px 12px;
          font-family: inherit;
          font-size: 14px;
          line-height: 1.6;
          resize: vertical;
          outline: none;
          background: #fbfbfc;
        }
        .forumComposerRow {
          margin-top: 10px;
          display: flex;
          gap: 8px;
          justify-content: space-between;
          flex-wrap: wrap;
        }
        .forumFileBtn {
          border: 1px solid rgba(17,17,20,.1);
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 600;
          color: #333;
          background: #fff;
          cursor: pointer;
        }
        .forumSendBtn {
          border: 0;
          border-radius: 999px;
          padding: 9px 13px;
          background: linear-gradient(135deg, #34c5a6, #25a98f);
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .forumSendBtn:disabled { opacity: .6; cursor: not-allowed; }
        .forumPreviewImage {
          margin-top: 10px;
          width: 100%;
          max-height: 220px;
          object-fit: cover;
          border-radius: 12px;
          border: 1px solid rgba(17,17,20,.06);
          display: block;
          background: #f5f5f5;
        }
        .forumReplies {
          border: 1px solid rgba(17,17,20,.07);
          border-radius: 14px;
          padding: 14px;
          background: #fff;
        }
        .emptyReplies {
          margin: 0;
          color: #8a8a94;
          font-size: 13px;
        }
        .replyList { display: grid; gap: 10px; }
        .replyCard {
          border: 1px solid rgba(17,17,20,.06);
          border-radius: 12px;
          padding: 10px;
          background: #fbfbfc;
        }
        .replyHead {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        .replyAuthor {
          display: flex;
          gap: 8px;
          align-items: center;
          min-width: 0;
        }
        .replyAvatar {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          overflow: hidden;
          border: 1px solid rgba(17,17,20,.08);
          background: #f5f5f5;
          flex-shrink: 0;
        }
        .replyAvatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .replyAuthorName { font-size: 13px; font-weight: 700; color: #222; }
        .replyMeta {
          font-size: 11px;
          color: #7c7c85;
          display: flex;
          gap: 6px;
          align-items: center;
          flex-wrap: wrap;
        }
        .lateTag {
          color: #b45309;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 999px;
          padding: 2px 6px;
          font-weight: 700;
        }
        .miniReplyLink {
          font-size: 12px;
          color: #2cb696;
          font-weight: 700;
          text-decoration: none;
        }
        .replyTitle {
          font-size: 13px;
          color: #17171b;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .replyBody {
          margin: 0;
          font-size: 13px;
          color: #444;
          line-height: 1.5;
          white-space: pre-wrap;
        }
        .replyImage {
          margin-top: 8px;
          width: 100%;
          max-height: 260px;
          object-fit: cover;
          border-radius: 10px;
          border: 1px solid rgba(17,17,20,.06);
          display: block;
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
            font-size: 20px;
            line-height: 2;
          }
        }
      `}</style>
    </>
  );
}
