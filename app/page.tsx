"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import { optimizeImageFile, validateImageFile } from "@/lib/client-image-upload";
import { useStudentViewMode } from "@/lib/use-student-view-mode";
import { markActiveToday, getStreak } from "@/lib/streak";
import { getWeeklyTopic } from "@/lib/weekly-topics";
import Link from "next/link";

type Post = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  likes: number;
  created_at: string;
};

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

const POSTS_PAGE_SIZE = 10;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "おはようございます";
  if (h >= 12 && h < 18) return "こんにちは";
  return "こんばんは";
}

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

function AvatarCircle({ url, name, size = 40 }: { url: string | null; name: string | null; size?: number }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name ?? "avatar"}
        width={size}
        height={size}
        style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0, display: "block" }}
      />
    );
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: "#E5E7EB", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: size * 0.38, fontWeight: 700,
        color: "#53596B", flexShrink: 0,
      }}
    >
      {(name ?? "?").charAt(0).toUpperCase()}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const topic = getWeeklyTopic();

  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [nextPostsCursor, setNextPostsCursor] = useState<string | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { effectiveIsAdmin } = useStudentViewMode(isAdmin);

  // Compose
  const [composeText, setComposeText] = useState("");
  const [composeImage, setComposeImage] = useState<File | null>(null);
  const [composePreview, setComposePreview] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Post actions
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  // Lightbox swipe-down
  const lbTouchStartY = useRef(0);

  async function loadPostsBatch({ uid, cursor, reset }: { uid: string | null; cursor: string | null; reset: boolean }) {
    let q = supabase
      .from("comunidad_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(POSTS_PAGE_SIZE + 1);
    if (cursor) q = q.lt("created_at", cursor);

    const { data: postData, error: postError } = await q;
    if (postError) throw new Error(postError.message);

    const batch = (postData as Post[] | null) ?? [];
    const visible = batch.slice(0, POSTS_PAGE_SIZE);
    setHasMorePosts(batch.length > POSTS_PAGE_SIZE);
    setNextPostsCursor(visible.at(-1)?.created_at ?? null);
    setPosts((cur) => {
      if (reset) return visible;
      const seen = new Set(cur.map((p) => p.id));
      return [...cur, ...visible.filter((p) => !seen.has(p.id))];
    });

    const userIds = [...new Set([...visible.map((p) => p.user_id), ...(uid ? [uid] : [])])];
    if (userIds.length > 0) {
      const { data: profileData } = await supabase.from("profiles").select("id, username, avatar_url").in("id", userIds);
      const map: Record<string, Profile> = {};
      (profileData as Profile[] | null)?.forEach((p) => { map[p.id] = p; });
      setProfiles((cur) => ({ ...cur, ...map }));
      if (uid && map[uid]) setMyProfile(map[uid]);
    }

    if (uid && visible.length > 0) {
      const { data: likesData } = await supabase
        .from("comunidad_likes").select("post_id").eq("user_id", uid)
        .in("post_id", visible.map((p) => p.id));
      const ids = (likesData as { post_id: string }[] | null)?.map((l) => l.post_id) ?? [];
      setLikedIds((cur) => { const next = new Set(cur); ids.forEach((id) => next.add(id)); return next; });
    }
  }

  useEffect(() => {
    markActiveToday();
    setStreak(getStreak());

    async function load() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      setUserId(uid);

      if (uid) {
        const { data: adminRow } = await supabase.from("profiles").select("is_admin").eq("id", uid).single();
        setIsAdmin((adminRow as { is_admin: boolean | null } | null)?.is_admin === true);
      }

      try {
        await loadPostsBatch({ uid, cursor: null, reset: true });
      } catch {
        setFeedError("No pudimos cargar la comunidad. Intenta otra vez.");
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => { if (composePreview) URL.revokeObjectURL(composePreview); };
  }, [composePreview]);

  async function loadMorePosts() {
    if (loadingMore || !hasMorePosts || !nextPostsCursor) return;
    setLoadingMore(true);
    try {
      await loadPostsBatch({ uid: userId, cursor: nextPostsCursor, reset: false });
    } catch {
      setFeedError("No pudimos cargar más. Intenta otra vez.");
    } finally {
      setLoadingMore(false);
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

  function handleTextareaInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setComposeText(e.target.value);
    const el = textareaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPublishError(null);
    try { validateImageFile(file); } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo usar esta imagen.");
      e.target.value = ""; return;
    }
    if (composePreview) URL.revokeObjectURL(composePreview);
    setComposeImage(file);
    setComposePreview(URL.createObjectURL(file));
    e.target.value = "";
  }

  function clearComposeImage() {
    if (composePreview) URL.revokeObjectURL(composePreview);
    setComposeImage(null);
    setComposePreview(null);
  }

  async function handlePublish() {
    if (!composeText.trim() || publishing || !userId) return;
    setPublishing(true);
    setPublishError(null);
    try {
      let imageUrl: string | null = null;
      if (composeImage) {
        const optimized = await optimizeImageFile(composeImage, { maxWidth: 1600, maxHeight: 1600, quality: 0.8 });
        const ext = optimized.name.split(".").pop() ?? "jpg";
        const path = `${userId}/${Date.now()}.${ext}`;
        const { data: up, error: upErr } = await supabase.storage.from("comunidad-images").upload(path, optimized, { upsert: false });
        if (upErr) throw new Error(upErr.message);
        if (up) imageUrl = supabase.storage.from("comunidad-images").getPublicUrl(up.path).data.publicUrl;
        else throw new Error("No se pudo subir la imagen.");
      }
      const { data: inserted, error: insertErr } = await supabase
        .from("comunidad_posts")
        .insert({ user_id: userId, content: composeText.trim(), image_url: imageUrl, likes: 0, created_at: new Date().toISOString() })
        .select().single();
      if (insertErr) throw new Error(insertErr.message);
      if (inserted) {
        setPosts((prev) => [inserted as Post, ...prev]);
        if (myProfile) setProfiles((prev) => ({ ...prev, [userId]: myProfile }));
      }
      setComposeText("");
      clearComposeImage();
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } catch (err) {
      setPublishError(
        composeImage
          ? `No se publicó: ${err instanceof Error ? err.message : "intenta otra vez."}`
          : "No pudimos publicar. Intenta otra vez.",
      );
    } finally {
      setPublishing(false);
    }
  }

  async function toggleLike(post: Post) {
    if (!userId) { router.push("/login"); return; }
    const liked = likedIds.has(post.id);
    const newCount = post.likes + (liked ? -1 : 1);
    setLikedIds((prev) => { const next = new Set(prev); liked ? next.delete(post.id) : next.add(post.id); return next; });
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, likes: newCount } : p)));
    if (liked) {
      await supabase.from("comunidad_likes").delete().match({ post_id: post.id, user_id: userId });
      await supabase.from("comunidad_posts").update({ likes: Math.max(0, newCount) }).eq("id", post.id);
    } else {
      await supabase.from("comunidad_likes").insert({ post_id: post.id, user_id: userId });
      await supabase.from("comunidad_posts").update({ likes: newCount }).eq("id", post.id);
    }
  }

  function startEdit(post: Post) {
    setEditContent(post.content);
    setEditingPostId(post.id);
    setOpenMenuId(null);
  }

  async function handleSaveEdit(postId: string) {
    if (!editContent.trim()) return;
    setSavingEdit(true);
    await supabase.from("comunidad_posts").update({ content: editContent.trim() }).eq("id", postId);
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, content: editContent.trim() } : p));
    setEditingPostId(null);
    setEditContent("");
    setSavingEdit(false);
  }

  async function handleDelete(postId: string) {
    if (deletingPostId) return;
    const target = posts.find((p) => p.id === postId);
    if (!target) return;
    setDeletingPostId(postId);
    const isOwn = target.user_id === userId;
    const { error } = isOwn
      ? await supabase.from("comunidad_posts").delete().eq("id", postId).eq("user_id", userId!)
      : await supabase.from("comunidad_posts").delete().eq("id", postId);
    setDeletingPostId(null);
    if (error) { alert("No se pudo eliminar. Inténtalo de nuevo."); return; }
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setConfirmDeleteId(null);
  }

  function handleLbTouchStart(e: React.TouchEvent) { lbTouchStartY.current = e.touches[0].clientY; }
  function handleLbTouchEnd(e: React.TouchEvent) {
    if (e.changedTouches[0].clientY - lbTouchStartY.current > 80) setLightboxUrl(null);
  }

  const canPublish = composeText.trim().length > 0 && !publishing && !!userId;

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: "20px 20px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-header.png"
            alt="フィード"
            height={30}
            style={{ display: "block", mixBlendMode: "multiply", width: "auto" }}
          />
          <p style={{ fontSize: "11px", color: "#9CA3AF", margin: "4px 0 0", fontWeight: 500 }}>{getGreeting()}</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {streak > 0 && (
            <div
              style={{
                background: "rgba(230,57,70,0.10)",
                borderRadius: "10px",
                padding: "6px 10px",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span style={{ fontSize: "14px" }}>🔥</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#E63946" }}>{streak}</span>
            </div>
          )}
          <Link href="/perfil" style={{ display: "block", flexShrink: 0 }}>
            <AvatarCircle url={myProfile?.avatar_url ?? null} name={myProfile?.username ?? null} size={38} />
          </Link>
        </div>
      </div>

      {/* ── Tema de la semana ── */}
      <div style={{ padding: "0 16px 16px" }}>
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "14px",
            padding: "16px 18px",
            boxShadow: "inset 4px 0 0 #4ECDC4, 0 2px 10px rgba(26,26,46,0.07)",
          }}
        >
          <p
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "#4ECDC4",
              textTransform: "uppercase",
              margin: "0 0 8px",
            }}
          >
            Tema de la semana
          </p>
          <p
            style={{
              fontSize: "22px",
              fontWeight: 600,
              color: "#1A1A2E",
              margin: "0 0 6px",
              fontFamily: "var(--font-noto-serif-jp), serif",
              lineHeight: 1.2,
            }}
          >
            {topic.kana}
          </p>
          <p style={{ fontSize: "14px", color: "#53596B", margin: 0, lineHeight: 1.45 }}>
            {topic.prompt}
          </p>
        </div>
      </div>

      {/* ── Compose box ── */}
      {userId && (
        <div style={{ padding: "0 16px 16px" }}>
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "14px",
              padding: "14px",
              boxShadow: "0 2px 10px rgba(26,26,46,0.07)",
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <AvatarCircle url={myProfile?.avatar_url ?? null} name={myProfile?.username ?? null} size={36} />
              <textarea
                ref={textareaRef}
                value={composeText}
                onChange={handleTextareaInput}
                placeholder={topic.prompt}
                rows={1}
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  resize: "none", fontSize: "15px",
                  fontFamily: "var(--font-noto-sans-jp), inherit",
                  color: "#1A1A2E", lineHeight: 1.5, padding: "4px 0", overflow: "hidden",
                }}
              />
            </div>

            {composePreview && (
              <div style={{ position: "relative", display: "inline-block", margin: "10px 0 0 48px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={composePreview} alt="preview"
                  style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", display: "block" }} />
                <button onClick={clearComposeImage} aria-label="Quitar imagen"
                  style={{
                    position: "absolute", top: -6, right: -6,
                    width: 20, height: 20, borderRadius: "50%",
                    background: "#1A1A2E", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#FFFFFF", fontSize: 11,
                  }}
                >×</button>
              </div>
            )}

            {publishError && (
              <p style={{ color: "#C53340", fontSize: 13, fontWeight: 700, margin: "10px 0 0 48px", lineHeight: 1.35 }}>
                {publishError}
              </p>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 10, borderTop: "1px solid #F0EDE8" }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                aria-label="Agregar imagen"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", color: "#9CA3AF" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                  <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                onClick={handlePublish}
                disabled={!canPublish}
                style={{
                  background: canPublish ? "#E63946" : "#C4BAB0",
                  color: "#FFFFFF", borderRadius: "8px", padding: "7px 16px",
                  border: "none", cursor: canPublish ? "pointer" : "not-allowed",
                  fontSize: "13px", fontWeight: 700, transition: "background 0.15s",
                }}
              >
                {publishing ? "Publicando…" : "Publicar"}
              </button>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
        </div>
      )}

      {/* ── Feed ── */}
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#9CA3AF", padding: "48px 0", fontSize: 14 }}>Cargando…</div>
        ) : feedError && posts.length === 0 ? (
          <div style={{ background: "#FFFFFF", borderRadius: "14px", padding: "28px", textAlign: "center", boxShadow: "0 2px 10px rgba(26,26,46,0.07)" }}>
            <p style={{ fontSize: 15, color: "#C53340", fontWeight: 700, margin: "0 0 14px" }}>{feedError}</p>
            <button onClick={reloadFeed}
              style={{ border: "none", borderRadius: "8px", background: "#1A1A2E", color: "#FFFFFF", padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Reintentar
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div style={{ background: "#FFFFFF", borderRadius: "14px", padding: "32px 20px", textAlign: "center", boxShadow: "0 2px 10px rgba(26,26,46,0.07)" }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#1A1A2E", margin: "0 0 6px" }}>Sé el primero en publicar</p>
            <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>Usa el tema de esta semana como inspiración.</p>
          </div>
        ) : (
          <>
            {posts.map((post) => {
              const profile = profiles[post.user_id];
              const liked = likedIds.has(post.id);
              const isOwn = post.user_id === userId;
              const isEditing = editingPostId === post.id;
              const isConfirmDelete = confirmDeleteId === post.id;

              return (
                <div
                  key={post.id}
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "16px",
                    padding: "16px",
                    boxShadow: "0 2px 10px rgba(26,26,46,0.07)",
                  }}
                >
                  {/* Author row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div
                      onClick={() => router.push(`/perfil/${post.user_id}`)}
                      style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: "pointer" }}
                    >
                      <AvatarCircle url={profile?.avatar_url ?? null} name={profile?.username ?? null} size={38} />
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#1A1A2E", margin: 0 }}>
                          {profile?.username ?? "Usuario"}
                        </p>
                        <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>{timeAgo(post.created_at)}</p>
                      </div>
                    </div>

                    {isOwn && (
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === post.id ? null : post.id); }}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#9CA3AF", padding: "4px 8px", borderRadius: 8, letterSpacing: 2 }}
                          aria-label="Opciones"
                        >···</button>
                        {openMenuId === post.id && (
                          <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 10, background: "#FFFFFF", borderRadius: "12px", boxShadow: "0 4px 20px rgba(26,26,46,0.15)", overflow: "hidden", minWidth: 130 }}>
                            <button onClick={() => startEdit(post)}
                              style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 16px", border: "none", background: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#1A1A2E" }}>
                              Editar
                            </button>
                            <button onClick={() => { setConfirmDeleteId(post.id); setOpenMenuId(null); }}
                              style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 16px", border: "none", background: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#E63946", borderTop: "1px solid #F0EDE8" }}>
                              Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  {isEditing ? (
                    <div style={{ marginBottom: 12 }}>
                      <textarea
                        autoFocus value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Escape") { setEditingPostId(null); setEditContent(""); } }}
                        style={{ width: "100%", border: "none", borderBottom: "2px solid #4ECDC4", background: "#F8F7F4", borderRadius: "8px 8px 0 0", padding: "8px 10px", fontSize: 15, fontFamily: "var(--font-noto-sans-jp), inherit", color: "#1A1A2E", resize: "none", outline: "none", lineHeight: 1.5, boxSizing: "border-box", minHeight: 72 }}
                      />
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button onClick={() => handleSaveEdit(post.id)} disabled={savingEdit || !editContent.trim()}
                          style={{ background: "#4ECDC4", color: "#1A1A2E", borderRadius: "8px", padding: "7px 16px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                          {savingEdit ? "…" : "Guardar"}
                        </button>
                        <button onClick={() => { setEditingPostId(null); setEditContent(""); }}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#9CA3AF", padding: "7px 8px" }}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : isConfirmDelete ? (
                    <div style={{ marginBottom: 12, padding: "12px 14px", background: "#FFF1F2", borderRadius: "10px" }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E", margin: "0 0 10px" }}>¿Eliminar esta publicación?</p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => handleDelete(post.id)} disabled={deletingPostId === post.id}
                          style={{ background: deletingPostId === post.id ? "#C4BAB0" : "#E63946", color: "#FFFFFF", borderRadius: "8px", padding: "7px 14px", border: "none", cursor: deletingPostId === post.id ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700 }}>
                          {deletingPostId === post.id ? "Eliminando…" : "Sí, eliminar"}
                        </button>
                        <button onClick={() => setConfirmDeleteId(null)}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#9CA3AF", padding: "7px 8px" }}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : post.content ? (
                    <p style={{ fontSize: 15, color: "#1A1A2E", margin: "0 0 12px", lineHeight: 1.55, fontFamily: "var(--font-noto-sans-jp), sans-serif" }}>
                      {post.content}
                    </p>
                  ) : null}

                  {/* Image */}
                  {post.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.image_url} alt="publicación"
                      onClick={() => setLightboxUrl(post.image_url)}
                      style={{ width: "100%", aspectRatio: "4/3", borderRadius: "10px", display: "block", marginBottom: 12, objectFit: "cover", cursor: "pointer" }}
                    />
                  )}

                  {/* Footer */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => toggleLike(post)}
                      style={{ display: "flex", alignItems: "center", gap: 6, background: liked ? "rgba(230,57,70,0.10)" : "rgba(26,26,46,0.06)", borderRadius: "8px", padding: "5px 10px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: liked ? "#E63946" : "#53596B", transition: "background 0.15s" }}>
                      <span style={{ fontSize: 15 }}>{liked ? "❤️" : "🤍"}</span>
                      いいね！ {post.likes}
                    </button>
                    {effectiveIsAdmin && !isOwn && (
                      <button onClick={() => setConfirmDeleteId(confirmDeleteId === post.id ? null : post.id)}
                        style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: "4px 8px", borderRadius: 8, opacity: 0.5 }}
                        aria-label="Eliminar (admin)">🗑️</button>
                    )}
                  </div>
                </div>
              );
            })}

            {feedError && (
              <div style={{ borderRadius: 12, background: "rgba(230,57,70,0.08)", color: "#C53340", padding: 14, fontSize: 13, fontWeight: 700, textAlign: "center" }}>
                {feedError}
              </div>
            )}

            {hasMorePosts ? (
              <button onClick={loadMorePosts} disabled={loadingMore}
                style={{ border: "none", borderRadius: "10px", background: loadingMore ? "#C4BAB0" : "#1A1A2E", color: "#FFFFFF", padding: "13px 18px", fontSize: 14, fontWeight: 700, cursor: loadingMore ? "not-allowed" : "pointer" }}>
                {loadingMore ? "Cargando…" : "Cargar más"}
              </button>
            ) : posts.length > 0 ? (
              <p style={{ color: "#9CA3AF", fontSize: 12, fontWeight: 600, textAlign: "center", margin: "4px 0 0" }}>
                Ya viste todas las publicaciones.
              </p>
            ) : null}
          </>
        )}
      </div>

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2 }}
            onClick={() => setLightboxUrl(null)}
            onTouchStart={handleLbTouchStart} onTouchEnd={handleLbTouchEnd}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <button onClick={() => setLightboxUrl(null)}
              style={{ position: "absolute", top: 20, right: 20, width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 201 }}
              aria-label="Cerrar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              style={{ display: "flex", maxWidth: "100%", maxHeight: "100dvh" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lightboxUrl} alt="imagen ampliada"
                style={{ maxWidth: "100%", maxHeight: "100dvh", objectFit: "contain" }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
