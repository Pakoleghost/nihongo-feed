"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  optimizeImageFile,
  validateImageFile,
} from "@/lib/client-image-upload";
import { supabase } from "@/lib/supabase";
import {
  TEMAS_SEMANA,
  type OpcionSlot,
  type TemaSemana,
} from "@/lib/temas-semana";
import {
  fetchAnnouncement,
  fetchTopicOverride,
  getWeeklyTopic,
  type WeeklyTopic,
} from "@/lib/weekly-topics";
import { KanaSprintWidget } from "./KanaSprintWidget";
import styles from "./CommunityScreen.module.css";

type Post = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  likes: number;
  created_at: string;
  from_tema?: boolean;
};

type Profile = {
  id: string;
  username: string | null;
  group_name?: string | null;
  avatar_url: string | null;
};

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

const POSTS_PAGE_SIZE = 20;

type TopicSelections = Record<string, OpcionSlot>;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${days}d`;
}

function Avatar({
  url,
  name,
  size = 42,
}: {
  url: string | null;
  name: string | null;
  size?: number;
}) {
  const initial = (name ?? "?").trim()[0]?.toUpperCase() ?? "?";

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={styles.avatarImage}
        src={url}
        alt=""
        style={{ width: size, height: size, flexBasis: size }}
      />
    );
  }

  return (
    <span
      className={styles.avatar}
      style={{
        width: size,
        height: size,
        flexBasis: size,
        fontSize: Math.max(13, size * 0.4),
      }}
    >
      {initial}
    </span>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return <span aria-hidden="true">{children}</span>;
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
    >
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function buildTopicSentence(template: string, selections: TopicSelections) {
  return template.replace(
    /\{\{([^}]+)\}\}/g,
    (_, id) => selections[id]?.jp ?? "",
  );
}

function buildTopicTranslation(template: string, selections: TopicSelections) {
  return template.replace(
    /\{\{([^}]+)\}\}/g,
    (_, id) => selections[id]?.es ?? "____",
  );
}

export function CommunityScreen({ home = false }: { home?: boolean }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);

  const [topic, setTopic] = useState<WeeklyTopic>(getWeeklyTopic());
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(
    {},
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [nextPostsCursor, setNextPostsCursor] = useState<string | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);

  const [composeText, setComposeText] = useState("");
  const [composeImage, setComposeImage] = useState<File | null>(null);
  const [composePreview, setComposePreview] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [commentsPost, setCommentsPost] = useState<Post | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [topicHelpOpen, setTopicHelpOpen] = useState(false);

  const currentTema = useMemo(
    () => TEMAS_SEMANA.find((tema) => tema.kana === topic.kana) ?? null,
    [topic.kana],
  );

  async function loadPostsBatch({
    uid,
    cursor,
    reset,
  }: {
    uid: string | null;
    cursor: string | null;
    reset: boolean;
  }) {
    let query = supabase
      .from("comunidad_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(POSTS_PAGE_SIZE + 1);

    if (cursor) query = query.lt("created_at", cursor);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const batch = (data as Post[] | null) ?? [];
    const visible = batch.slice(0, POSTS_PAGE_SIZE);
    setHasMorePosts(batch.length > POSTS_PAGE_SIZE);
    setNextPostsCursor(visible.at(-1)?.created_at ?? null);
    setPosts((current) => {
      if (reset) return visible;
      const seen = new Set(current.map((post) => post.id));
      return [...current, ...visible.filter((post) => !seen.has(post.id))];
    });

    if (visible.length === 0) return;

    const postIds = visible.map((post) => post.id);
    const userIds = [
      ...new Set([
        ...visible.map((post) => post.user_id),
        ...(uid ? [uid] : []),
      ]),
    ];

    const [profileData, likeData, commentData] = await Promise.all([
      userIds.length
        ? supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", userIds)
            .then((result) => result.data)
        : Promise.resolve(null),
      uid
        ? supabase
            .from("comunidad_likes")
            .select("post_id")
            .eq("user_id", uid)
            .in("post_id", postIds)
            .then((result) => result.data)
        : Promise.resolve(null),
      supabase
        .from("comunidad_comments")
        .select("post_id")
        .in("post_id", postIds)
        .then((result) => result.data),
    ]);

    const profileMap: Record<string, Profile> = {};
    (profileData as Profile[] | null)?.forEach((profile) => {
      profileMap[profile.id] = profile;
    });
    setProfiles((current) => ({ ...current, ...profileMap }));
    if (uid && profileMap[uid]) setMyProfile(profileMap[uid]);

    const nextLiked = (likeData as { post_id: string }[] | null) ?? [];
    if (nextLiked.length) {
      setLikedIds((current) => {
        const next = new Set(current);
        nextLiked.forEach((like) => next.add(like.post_id));
        return next;
      });
    }

    const counts: Record<string, number> = {};
    (commentData as { post_id: string }[] | null)?.forEach((comment) => {
      counts[comment.post_id] = (counts[comment.post_id] ?? 0) + 1;
    });
    setCommentCounts((current) => ({ ...current, ...counts }));
  }

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setFeedError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      if (!active) return;

      setUserId(uid);

      if (uid) {
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, group_name, is_admin")
          .eq("id", uid)
          .single();
        const profile = profileRow as
          (Profile & { is_admin?: boolean | null }) | null;
        if (profile) {
          setMyProfile(profile);
          setIsAdmin(profile.is_admin === true);
          setProfiles((current) => ({ ...current, [profile.id]: profile }));
        }
      }

      const [topicOverride, nextAnnouncement] = await Promise.all([
        fetchTopicOverride(supabase),
        fetchAnnouncement(supabase),
      ]);
      if (!active) return;
      if (topicOverride) setTopic(topicOverride);
      setAnnouncement(nextAnnouncement);

      try {
        await loadPostsBatch({ uid, cursor: null, reset: true });
      } catch {
        if (active)
          setFeedError("No pudimos cargar la comunidad. Intenta otra vez.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (composePreview) URL.revokeObjectURL(composePreview);
    };
  }, [composePreview]);

  async function loadMorePosts() {
    if (loadingMoreRef.current || !hasMorePosts || !nextPostsCursor) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      await loadPostsBatch({
        uid: userId,
        cursor: nextPostsCursor,
        reset: false,
      });
    } catch {
      setFeedError("No pudimos cargar más publicaciones.");
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMorePosts();
      },
      { rootMargin: "700px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMorePosts, nextPostsCursor, userId]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPublishError(null);

    try {
      validateImageFile(file);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "No se pudo usar esta imagen.",
      );
      event.target.value = "";
      return;
    }

    if (composePreview) URL.revokeObjectURL(composePreview);
    setComposeImage(file);
    setComposePreview(URL.createObjectURL(file));
    event.target.value = "";
  }

  function clearComposeImage() {
    if (composePreview) URL.revokeObjectURL(composePreview);
    setComposeImage(null);
    setComposePreview(null);
  }

  async function handlePublish() {
    if (!composeText.trim() || publishing) return;
    if (!userId) {
      router.push("/login");
      return;
    }

    setPublishing(true);
    setPublishError(null);

    try {
      let imageUrl: string | null = null;
      if (composeImage) {
        const optimized = await optimizeImageFile(composeImage, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.74,
        });
        const ext = optimized.name.split(".").pop() ?? "jpg";
        const path = `${userId}/${Date.now()}.${ext}`;
        const { data, error } = await supabase.storage
          .from("comunidad-images")
          .upload(path, optimized, { upsert: false });
        if (error) throw new Error(error.message);
        if (!data) throw new Error("No se pudo subir la imagen.");
        imageUrl = supabase.storage
          .from("comunidad-images")
          .getPublicUrl(data.path).data.publicUrl;
      }

      const insert = await supabase
        .from("comunidad_posts")
        .insert({
          user_id: userId,
          content: composeText.trim(),
          image_url: imageUrl,
          likes: 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insert.error) throw new Error(insert.error.message);
      if (insert.data) {
        const post = insert.data as Post;
        setPosts((current) => [post, ...current]);
        setCommentCounts((current) => ({ ...current, [post.id]: 0 }));
        if (myProfile)
          setProfiles((current) => ({ ...current, [userId]: myProfile }));
      }

      setComposeText("");
      clearComposeImage();
    } catch (error) {
      setPublishError(
        composeImage
          ? `No se publicó la imagen: ${error instanceof Error ? error.message : "intenta otra vez."}`
          : "No pudimos publicar. Intenta otra vez.",
      );
    } finally {
      setPublishing(false);
    }
  }

  async function reloadFeed() {
    if (loading) return;
    setLoading(true);
    setFeedError(null);
    try {
      await loadPostsBatch({ uid: userId, cursor: null, reset: true });
    } catch {
      setFeedError("No pudimos cargar la comunidad. Intenta otra vez.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleLike(post: Post) {
    if (!userId) {
      router.push("/login");
      return;
    }

    const liked = likedIds.has(post.id);
    const nextCount = Math.max(0, post.likes + (liked ? -1 : 1));
    setLikedIds((current) => {
      const next = new Set(current);
      if (liked) next.delete(post.id);
      else next.add(post.id);
      return next;
    });
    setPosts((current) =>
      current.map((item) =>
        item.id === post.id ? { ...item, likes: nextCount } : item,
      ),
    );

    if (liked) {
      await supabase
        .from("comunidad_likes")
        .delete()
        .match({ post_id: post.id, user_id: userId });
    } else {
      await supabase
        .from("comunidad_likes")
        .insert({ post_id: post.id, user_id: userId });
    }
    await supabase
      .from("comunidad_posts")
      .update({ likes: nextCount })
      .eq("id", post.id);
  }

  function startEdit(post: Post) {
    setEditContent(post.content);
    setEditingPostId(post.id);
    setOpenMenuId(null);
  }

  async function handleSaveEdit(postId: string) {
    if (!editContent.trim() || savingEdit) return;
    setSavingEdit(true);
    const { error } = await supabase
      .from("comunidad_posts")
      .update({ content: editContent.trim() })
      .eq("id", postId);
    if (!error) {
      setPosts((current) =>
        current.map((post) =>
          post.id === postId ? { ...post, content: editContent.trim() } : post,
        ),
      );
      setEditingPostId(null);
      setEditContent("");
    }
    setSavingEdit(false);
  }

  async function handleDelete(postId: string) {
    if (deletingPostId || !userId) return;
    const target = posts.find((post) => post.id === postId);
    if (!target) return;
    setDeletingPostId(postId);

    const isOwn = target.user_id === userId;
    const { error } = isOwn
      ? await supabase
          .from("comunidad_posts")
          .delete()
          .eq("id", postId)
          .eq("user_id", userId)
      : await supabase.from("comunidad_posts").delete().eq("id", postId);

    setDeletingPostId(null);
    if (error) {
      alert("No se pudo eliminar. Inténtalo de nuevo.");
      return;
    }

    setPosts((current) => current.filter((post) => post.id !== postId));
    setConfirmDeleteId(null);
  }

  async function handleShare(post: Post, profile: Profile | undefined) {
    const username = profile?.username ?? "Anónimo";
    const params = new URLSearchParams({ content: post.content, username });
    if (post.image_url) params.set("imageUrl", post.image_url);
    const cardUrl = `/api/share-card?${params.toString()}`;
    const fullUrl = `${window.location.origin}${cardUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({ url: fullUrl, title: "Pako Nihongo" });
        return;
      } catch {
        // Fall through to opening the generated card.
      }
    }

    window.open(fullUrl, "_blank");
  }

  const canPublish = Boolean(composeText.trim()) && !publishing;
  return (
    <div className={styles.communityPage}>
      {home ? (
        <header className={styles.communityHeader}>
          <h1>Comunidad</h1>
          <p>Lo que practica la clase hoy</p>
        </header>
      ) : (
        <section className={styles.hero}>
          <div className={styles.heroLeft}>
            <div className={styles.heroIcon}>話</div>
            <div>
              <h1>Comunidad</h1>
              <p>
                Un espacio para escribir en japonés, responder a tus compañeros
                y practicar con el tema de la semana.
              </p>
            </div>
          </div>
        </section>
      )}

      <div className={styles.layout}>
        <main className={styles.mainColumn}>
          {!home && (
            <section className={`${styles.card} ${styles.topicCard}`}>
              <div className={styles.labelRow}>
                <span className={styles.eyebrow}>
                  <span className={styles.dot} />
                  Tema de la semana
                </span>
                <button
                  type="button"
                  className={styles.topicHelpButton}
                  onClick={() => setTopicHelpOpen(true)}
                >
                  Te ayudo
                </button>
              </div>
              <p className={styles.topicKana}>{topic.kana}</p>
              <p className={styles.topicPrompt}>{topic.prompt}</p>
            </section>
          )}

          {announcement && (
            <section className={`${styles.card} ${styles.sideCard}`}>
              <span className={styles.eyebrow}>
                <span className={styles.dot} />
                Aviso de clase
              </span>
              <p>{announcement}</p>
            </section>
          )}

          <section
            className={`${styles.card} ${styles.composer}`}
            aria-label="Nueva publicación"
          >
            <div className={styles.composerTop}>
              <Avatar
                url={myProfile?.avatar_url ?? null}
                name={myProfile?.username ?? "Tú"}
              />
              <textarea
                className={styles.composerText}
                value={composeText}
                onChange={(event) => setComposeText(event.target.value)}
                placeholder={
                  userId
                    ? "Escribe algo en japonés..."
                    : "Inicia sesión para publicar"
                }
                disabled={!userId}
              />
            </div>

            {composePreview && (
              <div className={styles.previewWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.previewImage}
                  src={composePreview}
                  alt="Vista previa"
                />
                <button
                  type="button"
                  className={styles.removeImage}
                  onClick={clearComposeImage}
                  aria-label="Quitar imagen"
                >
                  ×
                </button>
              </div>
            )}

            {publishError && <p className={styles.errorText}>{publishError}</p>}

            <div className={styles.composerFooter}>
              <div
                className={styles.modalFooter}
                style={{ padding: 0, border: 0 }}
              >
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!userId}
                >
                  <Icon>＋</Icon>
                  Imagen
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </div>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handlePublish}
                disabled={!canPublish}
              >
                {publishing ? "Publicando..." : "Publicar"}
              </button>
            </div>
          </section>

          <section
            className={styles.feed}
            aria-label="Publicaciones de la comunidad"
            onClick={() => setOpenMenuId(null)}
          >
            {loading ? (
              <>
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className={`${styles.card} ${styles.skeleton}`}
                  >
                    <span>Cargando publicaciones...</span>
                  </div>
                ))}
              </>
            ) : feedError && posts.length === 0 ? (
              <div className={`${styles.card} ${styles.error}`}>
                <strong>{feedError}</strong>
                <span>
                  La conexión con la comunidad no respondió como esperábamos.
                </span>
                <div style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={reloadFeed}
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            ) : posts.length === 0 ? (
              <div className={`${styles.card} ${styles.empty}`}>
                <strong>Sé el primero en publicar</strong>
                <span>Usa el tema de la semana como punto de partida.</span>
              </div>
            ) : (
              posts.map((post) => {
                const profile = profiles[post.user_id];
                const liked = likedIds.has(post.id);
                const isOwn = post.user_id === userId;
                const canModerate = isOwn || isAdmin;
                const isEditing = editingPostId === post.id;
                const isDeleting = confirmDeleteId === post.id;

                return (
                  <article
                    key={post.id}
                    className={`${styles.card} ${styles.postCard}`}
                  >
                    <div className={styles.postInner}>
                      <header className={styles.postHeader}>
                        <button
                          type="button"
                          onClick={() => router.push(`/dashboard/perfil/${post.user_id}`)}
                          style={{
                            border: 0,
                            background: "transparent",
                            padding: 0,
                          }}
                          aria-label="Ver perfil"
                        >
                          <Avatar
                            url={profile?.avatar_url ?? null}
                            name={profile?.username ?? "Usuario"}
                          />
                        </button>
                        <div className={styles.postAuthor}>
                          <strong>{profile?.username ?? "Usuario"}</strong>
                          <span>{timeAgo(post.created_at)}</span>
                        </div>
                        {post.from_tema && (
                          <span className={styles.topicBadge}>Tema</span>
                        )}
                        {canModerate && (
                          <div className={styles.menuWrap}>
                            <button
                              type="button"
                              className={styles.menuButton}
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenMenuId(
                                  openMenuId === post.id ? null : post.id,
                                );
                              }}
                              aria-label="Opciones de publicación"
                            >
                              ···
                            </button>
                            {openMenuId === post.id && (
                              <div className={styles.menu}>
                                <button
                                  type="button"
                                  onClick={() => startEdit(post)}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmDeleteId(post.id);
                                    setOpenMenuId(null);
                                  }}
                                >
                                  Eliminar
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </header>

                      {isEditing ? (
                        <div>
                          <textarea
                            className={styles.editText}
                            value={editContent}
                            onChange={(event) =>
                              setEditContent(event.target.value)
                            }
                            autoFocus
                          />
                          <div
                            className={styles.editActions}
                            style={{ marginTop: 10 }}
                          >
                            <button
                              type="button"
                              className={styles.primaryButton}
                              onClick={() => handleSaveEdit(post.id)}
                              disabled={savingEdit || !editContent.trim()}
                            >
                              {savingEdit ? "Guardando..." : "Guardar"}
                            </button>
                            <button
                              type="button"
                              className={styles.ghostButton}
                              onClick={() => {
                                setEditingPostId(null);
                                setEditContent("");
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : isDeleting ? (
                        <div className={styles.error}>
                          <strong>¿Eliminar esta publicación?</strong>
                          <span>Esta acción no se puede deshacer.</span>
                          <div
                            className={styles.editActions}
                            style={{ justifyContent: "center", marginTop: 14 }}
                          >
                            <button
                              type="button"
                              className={styles.dangerButton}
                              onClick={() => handleDelete(post.id)}
                              disabled={deletingPostId === post.id}
                            >
                              {deletingPostId === post.id
                                ? "Eliminando..."
                                : "Sí, eliminar"}
                            </button>
                            <button
                              type="button"
                              className={styles.ghostButton}
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className={styles.postText}>{post.content}</p>
                          {post.image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              className={styles.postImage}
                              src={post.image_url}
                              alt="Publicación"
                              onClick={() => setLightboxUrl(post.image_url)}
                            />
                          )}
                        </>
                      )}

                      <footer className={styles.postActions}>
                        <button
                          type="button"
                          className={`${styles.actionButton} ${liked ? styles.actionButtonActive : ""}`}
                          onClick={() => toggleLike(post)}
                        >
                          <HeartIcon filled={liked} />
                          {post.likes > 0 ? post.likes : "Me gusta"}
                        </button>
                        <button
                          type="button"
                          className={styles.actionButton}
                          onClick={() => setCommentsPost(post)}
                        >
                          <CommentIcon />
                          {commentCounts[post.id]
                            ? commentCounts[post.id]
                            : "Responder"}
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionButton} ${styles.shareButton}`}
                          onClick={() => handleShare(post, profile)}
                        >
                          <ShareIcon />
                          Compartir
                        </button>
                      </footer>
                    </div>
                  </article>
                );
              })
            )}

            <div ref={sentinelRef} style={{ height: 50 }} />
            {loadingMore && (
              <div className={`${styles.card} ${styles.skeleton}`}>
                Cargando más...
              </div>
            )}
          </section>
        </main>

        <aside className={styles.sideColumn}>
          {!home && <KanaSprintWidget />}
          <section className={`${styles.card} ${styles.sideCard} ${home ? styles.patternsCard : ""}`}>
            <h2>{home ? "Patrones de hoy" : "Prompts útiles"}</h2>
            <div className={styles.quickIdea}>
              <strong>〜がすきです。</strong>
              <span>Para hablar de algo que te gusta.</span>
            </div>
            <div className={styles.quickIdea}>
              <strong>〜にいきました。</strong>
              <span>Para contar a dónde fuiste.</span>
            </div>
            <div className={styles.quickIdea}>
              <strong>どうおもいますか。</strong>
              <span>Para invitar respuestas.</span>
            </div>
          </section>
        </aside>
      </div>

      {commentsPost && (
        <CommentsModal
          post={commentsPost}
          userId={userId}
          author={profiles[commentsPost.user_id]}
          onClose={() => setCommentsPost(null)}
          onCountChange={(postId, delta) => {
            setCommentCounts((current) => ({
              ...current,
              [postId]: Math.max(0, (current[postId] ?? 0) + delta),
            }));
          }}
        />
      )}

      {topicHelpOpen && (
        <TopicHelpModal
          tema={currentTema}
          fallback={topic}
          onClose={() => setTopicHelpOpen(false)}
          onUseSentence={(sentence) => {
            setComposeText(sentence);
            setTopicHelpOpen(false);
          }}
        />
      )}

      {lightboxUrl && (
        <div
          className={styles.overlay}
          onClick={() => setLightboxUrl(null)}
          role="presentation"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.lightboxImage} src={lightboxUrl} alt="" />
        </div>
      )}
    </div>
  );
}

function TopicHelpModal({
  tema,
  fallback,
  onClose,
  onUseSentence,
}: {
  tema: TemaSemana | null;
  fallback: WeeklyTopic;
  onClose: () => void;
  onUseSentence: (sentence: string) => void;
}) {
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<TopicSelections>({});
  const [extras, setExtras] = useState<Set<number>>(new Set());
  const totalSteps = tema ? 5 : 1;

  const allFilled = useMemo(
    () =>
      tema
        ? tema.plantilla.slots.every((slot) => Boolean(selections[slot.id]))
        : false,
    [selections, tema],
  );
  const builtJp =
    tema && allFilled
      ? buildTopicSentence(tema.plantilla.estructura, selections)
      : "";
  const builtEs = tema
    ? buildTopicTranslation(tema.plantilla.estructuraEs, selections)
    : fallback.prompt;

  function toggleExtra(index: number) {
    setExtras((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function useCurrentSentence() {
    if (!tema) {
      onUseSentence(fallback.kana);
      return;
    }

    const extraText = Array.from(extras)
      .sort((a, b) => a - b)
      .map((index) => tema.extensiones[index]?.jp)
      .filter(Boolean);
    onUseSentence([builtJp, ...extraText].join("\n"));
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <section
        className={styles.topicModal}
        role="dialog"
        aria-modal="true"
        aria-label="Ayuda del tema semanal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.topicModalHeader}>
          <div>
            <span>Ayuda paso a paso</span>
            <h2>{tema?.kana ?? fallback.kana}</h2>
            <p>{tema?.meta ?? fallback.prompt}</p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <div
          className={styles.stepTrack}
          aria-label={`Paso ${step + 1} de ${totalSteps}`}
        >
          {Array.from({ length: totalSteps }).map((_, index) => (
            <span
              key={index}
              className={index <= step ? styles.stepDotActive : ""}
            />
          ))}
        </div>

        {!tema ? (
          <div className={styles.topicStep}>
            <div className={styles.patternCard}>
              <strong>{fallback.kana}</strong>
              <span>{fallback.prompt}</span>
            </div>
          </div>
        ) : (
          <div className={styles.topicStep}>
            {step === 0 && (
              <>
                <p className={styles.stepLabel}>Patrón</p>
                <div className={styles.patternCard}>
                  <strong>{tema.patron.jp}</strong>
                  <span>{tema.patron.es}</span>
                </div>
                <p className={styles.stepNote}>{tema.nota}</p>
              </>
            )}

            {step === 1 && (
              <>
                <p className={styles.stepLabel}>Ejemplo</p>
                <div className={styles.patternCard}>
                  <strong>{tema.ejemplo.jp}</strong>
                  <span>{tema.ejemplo.es}</span>
                </div>
                <p className={styles.stepNote}>
                  Primero mira el modelo; luego hacemos tu propia frase.
                </p>
              </>
            )}

            {step === 2 && (
              <>
                <p className={styles.stepLabel}>Arma tu frase</p>
                <div className={styles.livePreview}>
                  <strong>
                    {builtJp ||
                      tema.plantilla.estructura.replace(
                        /\{\{([^}]+)\}\}/g,
                        "____",
                      )}
                  </strong>
                  <span>{builtEs}</span>
                </div>
                {tema.plantilla.slots.map((slot) => (
                  <div key={slot.id} className={styles.slotGroup}>
                    <p>Elige: {slot.etiqueta}</p>
                    <div>
                      {slot.opciones.map((option) => {
                        const active = selections[slot.id]?.jp === option.jp;
                        return (
                          <button
                            key={option.jp}
                            type="button"
                            className={active ? styles.slotChipActive : ""}
                            onClick={() =>
                              setSelections((current) => ({
                                ...current,
                                [slot.id]: option,
                              }))
                            }
                          >
                            <strong>{option.jp}</strong>
                            <span>{option.es}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}

            {step === 3 && (
              <>
                <p className={styles.stepLabel}>Extras opcionales</p>
                <div className={styles.livePreview}>
                  <strong>{builtJp}</strong>
                  <span>{builtEs}</span>
                </div>
                <div className={styles.extraList}>
                  {tema.extensiones.map((extra, index) => (
                    <button
                      key={extra.jp}
                      type="button"
                      className={extras.has(index) ? styles.extraActive : ""}
                      onClick={() => toggleExtra(index)}
                    >
                      <strong>{extra.jp}</strong>
                      <span>{extra.es}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <p className={styles.stepLabel}>Lista para publicar</p>
                <div className={styles.livePreview}>
                  <strong>
                    {[
                      builtJp,
                      ...Array.from(extras)
                        .sort((a, b) => a - b)
                        .map((index) => tema.extensiones[index]?.jp)
                        .filter(Boolean),
                    ].join("\n")}
                  </strong>
                  <span>{tema.fotoSugerencia}</span>
                </div>
              </>
            )}
          </div>
        )}

        <footer className={styles.topicModalFooter}>
          <button
            type="button"
            className={styles.ghostButton}
            onClick={
              step === 0
                ? onClose
                : () => setStep((current) => Math.max(0, current - 1))
            }
          >
            {step === 0 ? "Cerrar" : "Atrás"}
          </button>
          {step < totalSteps - 1 ? (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() =>
                setStep((current) => Math.min(totalSteps - 1, current + 1))
              }
              disabled={tema ? step === 2 && !allFilled : false}
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={useCurrentSentence}
              disabled={Boolean(tema) && !allFilled}
            >
              Usar esta frase
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

function CommentsModal({
  post,
  userId,
  author,
  onClose,
  onCountChange,
}: {
  post: Post;
  userId: string | null;
  author: Profile | undefined;
  onClose: () => void;
  onCountChange: (postId: string, delta: number) => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("comunidad_comments")
        .select("*")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });

      if (!active) return;
      const list = (data as Comment[] | null) ?? [];
      setComments(list);

      const userIds = [...new Set(list.map((comment) => comment.user_id))];
      if (userIds.length) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", userIds);
        if (!active) return;
        const nextProfiles: Record<string, Profile> = {};
        (profileData as Profile[] | null)?.forEach((profile) => {
          nextProfiles[profile.id] = profile;
        });
        setProfiles(nextProfiles);
      }

      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [post.id]);

  async function handleSend() {
    if (!text.trim() || !userId || sending) return;
    setSending(true);
    const { data } = await supabase
      .from("comunidad_comments")
      .insert({ post_id: post.id, user_id: userId, content: text.trim() })
      .select()
      .single();

    if (data) {
      setComments((current) => [...current, data as Comment]);
      onCountChange(post.id, 1);
      setText("");
    }

    setSending(false);
  }

  const preview =
    post.content.length > 110
      ? `${post.content.slice(0, 107)}...`
      : post.content;
  const canSend = Boolean(text.trim()) && Boolean(userId) && !sending;

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Respuestas"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <div>
            <h2>Respuestas</h2>
            <p>
              {author?.username ?? "Usuario"}: {preview}
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <div className={styles.comments}>
          {loading ? (
            <div className={styles.skeleton}>Cargando respuestas...</div>
          ) : comments.length === 0 ? (
            <div className={styles.empty}>
              <strong>Sin respuestas todavía</strong>
              <span>Sé el primero en responder.</span>
            </div>
          ) : (
            comments.map((comment) => {
              const profile = profiles[comment.user_id];
              return (
                <div key={comment.id} className={styles.commentRow}>
                  <Avatar
                    url={profile?.avatar_url ?? null}
                    name={profile?.username ?? "Usuario"}
                    size={34}
                  />
                  <div className={styles.commentBubble}>
                    <div className={styles.commentMeta}>
                      <strong>{profile?.username ?? "Usuario"}</strong>
                      <span>{timeAgo(comment.created_at)}</span>
                    </div>
                    <p className={styles.commentText}>{comment.content}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <footer className={styles.modalFooter}>
          <textarea
            className={styles.commentInput}
            rows={1}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={
              userId
                ? "Escribe una respuesta..."
                : "Inicia sesión para responder"
            }
            disabled={!userId}
          />
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleSend}
            disabled={!canSend}
          >
            {sending ? "Enviando..." : "Responder"}
          </button>
        </footer>
      </section>
    </div>
  );
}
