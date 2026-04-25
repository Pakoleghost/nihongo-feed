"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import { optimizeImageFile, validateImageFile } from "@/lib/client-image-upload";

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

function AvatarCircle({
  url,
  name,
  size = 44,
}: {
  url: string | null;
  name: string | null;
  size?: number;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name ?? "avatar"}
        width={size}
        height={size}
        style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  const initials = (name ?? "?").charAt(0).toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#E5E7EB",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 700,
        color: "#53596B",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

export default function ComunidadPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Compose state
  const [composeText, setComposeText] = useState("");
  const [composeImage, setComposeImage] = useState<File | null>(null);
  const [composePreview, setComposePreview] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Post edit / delete state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  // Lightbox swipe-down to close
  const lbTouchStartY = useRef(0);

  useEffect(() => {
    async function load() {
      // getSession() reads from localStorage immediately (no network call).
      // This ensures the compose box and user-specific UI appear on first
      // render even before the token is validated against the server.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      setUserId(uid);

      const { data: postData } = await supabase
        .from("comunidad_posts")
        .select("*")
        .order("created_at", { ascending: false });

      const fetchedPosts = (postData as Post[] | null) ?? [];
      setPosts(fetchedPosts);

      const userIds = [...new Set([
        ...fetchedPosts.map((p) => p.user_id),
        ...(uid ? [uid] : []),
      ])];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", userIds);
        const profileMap: Record<string, Profile> = {};
        (profileData as Profile[] | null)?.forEach((p) => {
          profileMap[p.id] = p;
        });
        setProfiles(profileMap);
        if (uid && profileMap[uid]) {
          setMyProfile(profileMap[uid]);
          // Check admin flag separately
          const { data: adminRow } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", uid)
            .single();
          setIsAdmin((adminRow as { is_admin: boolean | null } | null)?.is_admin === true);
        }
      }

      if (uid) {
        const { data: likesData } = await supabase
          .from("comunidad_likes")
          .select("post_id")
          .eq("user_id", uid);
        const likedSet = new Set<string>(
          (likesData as { post_id: string }[] | null)?.map((l) => l.post_id) ?? []
        );
        setLikedIds(likedSet);
      }

      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    return () => {
      if (composePreview) URL.revokeObjectURL(composePreview);
    };
  }, [composePreview]);

  // Auto-resize textarea
  function handleTextareaInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setComposeText(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPublishError(null);
    try {
      validateImageFile(file);
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo usar esta imagen.");
      e.target.value = "";
      return;
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
        const optimizedImage = await optimizeImageFile(composeImage, {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.8,
        });
        const ext = optimizedImage.name.split(".").pop() ?? "jpg";
        const path = `${userId}/${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("comunidad-images")
          .upload(path, optimizedImage, { upsert: false });
        if (uploadError) {
          throw new Error(uploadError.message);
        } else if (uploadData) {
          const { data: urlData } = supabase.storage
            .from("comunidad-images")
            .getPublicUrl(uploadData.path);
          imageUrl = urlData.publicUrl;
        } else {
          throw new Error("No se pudo subir la imagen.");
        }
      }

      const { data: inserted, error: insertError } = await supabase
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

      if (insertError) {
        throw new Error(insertError.message);
      }

      if (inserted) {
        setPosts((prev) => [inserted as Post, ...prev]);
        if (myProfile) setProfiles((prev) => ({ ...prev, [userId]: myProfile }));
      }

      setComposeText("");
      clearComposeImage();
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } catch (error) {
      setPublishError(
        composeImage
          ? `No se publicó. No pudimos completar la publicación con imagen: ${error instanceof Error ? error.message : "intenta otra vez."}`
          : "No pudimos publicar. Intenta otra vez.",
      );
    } finally {
      setPublishing(false);
    }
  }

  async function toggleLike(post: Post) {
    if (!userId) { router.push("/login"); return; }
    const alreadyLiked = likedIds.has(post.id);
    const newCount = post.likes + (alreadyLiked ? -1 : 1);
    setLikedIds((prev) => {
      const next = new Set(prev);
      alreadyLiked ? next.delete(post.id) : next.add(post.id);
      return next;
    });
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, likes: newCount } : p)));
    if (alreadyLiked) {
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
    const targetPost = posts.find((p) => p.id === postId);
    if (!targetPost) return;

    setDeletingPostId(postId);

    let deleteError: { message: string } | null = null;

    if (targetPost.user_id === userId) {
      // Own post — include user_id in the filter so RLS always matches
      const { error } = await supabase
        .from("comunidad_posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", userId!);
      deleteError = error;
    } else {
      // Admin deleting another user's post — no user_id constraint
      const { error } = await supabase
        .from("comunidad_posts")
        .delete()
        .eq("id", postId);
      deleteError = error;
    }

    setDeletingPostId(null);

    if (deleteError) {
      alert("No se pudo eliminar la publicación. Inténtalo de nuevo.");
      return;
    }

    // Only remove from local state AFTER the DB confirms the delete
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setConfirmDeleteId(null);
  }

  function handleLbTouchStart(e: React.TouchEvent) {
    lbTouchStartY.current = e.touches[0].clientY;
  }

  function handleLbTouchEnd(e: React.TouchEvent) {
    const deltaY = e.changedTouches[0].clientY - lbTouchStartY.current;
    if (deltaY > 80) setLightboxUrl(null);
  }

  const canPublish = composeText.trim().length > 0 && !publishing && !!userId;

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        paddingBottom: "100px",
      }}
    >
      {/* Header */}
      <div style={{ padding: "20px 20px 16px" }}>
        <h1 style={{ fontSize: "36px", fontWeight: 800, color: "#1A1A2E", margin: 0, lineHeight: 1 }}>
          Comunidad
        </h1>
      </div>

      <div style={{ padding: "0 16px 16px" }}>
        <Link
          href="/comunidad/foros"
          style={{
            background: "#1A1A2E",
            borderRadius: "24px",
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            color: "#FFFFFF",
            textDecoration: "none",
            boxShadow: "0 6px 22px rgba(26,26,46,0.16)",
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>Foros de clase</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", marginTop: 6 }}>
              Temas por grupo y respuestas de clase.
            </div>
          </div>
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
            <path d="M1 6h13m0 0-5-5m5 5-5 5" stroke="#4ECDC4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      {/* Inline compose box */}
      {userId && (
        <div style={{ padding: "0 16px 16px" }}>
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "2rem",
              padding: "16px",
              boxShadow: "0 4px 20px rgba(26,26,46,0.07)",
            }}
          >
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <AvatarCircle url={myProfile?.avatar_url ?? null} name={myProfile?.username ?? null} size={38} />
              <textarea
                ref={textareaRef}
                value={composeText}
                onChange={handleTextareaInput}
                placeholder="¿Qué aprendiste hoy?"
                rows={1}
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  resize: "none", fontSize: "15px",
                  fontFamily: "var(--font-noto-sans-jp), inherit",
                  color: "#1A1A2E", lineHeight: 1.5, padding: "6px 0", overflow: "hidden",
                }}
              />
            </div>

            {composePreview && (
              <div style={{ position: "relative", display: "inline-block", margin: "10px 0 0 50px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={composePreview}
                  alt="preview"
                  style={{ width: "56px", height: "56px", borderRadius: "12px", objectFit: "cover", display: "block" }}
                />
                <button
                  onClick={clearComposeImage}
                  style={{
                    position: "absolute", top: "-6px", right: "-6px",
                    width: "20px", height: "20px", borderRadius: "50%",
                    background: "#1A1A2E", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#FFFFFF", fontSize: "11px", lineHeight: 1,
                  }}
                  aria-label="Quitar imagen"
                >
                  ×
                </button>
              </div>
            )}

            {publishError && (
              <p style={{ color: "#C53340", fontSize: 13, fontWeight: 700, margin: "10px 0 0 50px", lineHeight: 1.35 }}>
                {publishError}
              </p>
            )}

            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #F0EDE8",
              }}
            >
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "22px", padding: "4px", lineHeight: 1 }}
                aria-label="Agregar imagen"
              >
                🖼️
              </button>
              <button
                onClick={handlePublish}
                disabled={!canPublish}
                style={{
                  background: canPublish ? "#E63946" : "#C4BAB0",
                  color: "#FFFFFF", borderRadius: "999px", padding: "8px 20px",
                  border: "none", cursor: canPublish ? "pointer" : "not-allowed",
                  fontSize: "14px", fontWeight: 700, transition: "background 0.15s",
                  boxShadow: canPublish ? "0 4px 14px rgba(230,57,70,0.28)" : "none",
                }}
              >
                {publishing ? "Publicando…" : "Publicar"}
              </button>
            </div>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
        </div>
      )}

      {/* Feed */}
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#9CA3AF", padding: "40px 0" }}>Cargando...</div>
        ) : posts.length === 0 ? (
          <div style={{ background: "#FFFFFF", borderRadius: "24px", padding: "32px", textAlign: "center", boxShadow: "0 4px 20px rgba(26,26,46,0.07)" }}>
            <p style={{ fontSize: "28px", margin: "0 0 8px" }}>💬</p>
            <p style={{ fontSize: "16px", color: "#9CA3AF", margin: 0 }}>Sé el primero en publicar.</p>
          </div>
        ) : (
          posts.map((post) => {
            const profile = profiles[post.user_id];
            const liked = likedIds.has(post.id);
            const isOwn = post.user_id === userId;
            const isEditing = editingPostId === post.id;
            const isConfirmDelete = confirmDeleteId === post.id;

            return (
              <div
                key={post.id}
                style={{ background: "#FFFFFF", borderRadius: "24px", padding: "20px", boxShadow: "0 4px 20px rgba(26,26,46,0.07)" }}
              >
                {/* Author row */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  {/* Clickable author area */}
                  <div
                    onClick={() => router.push(`/perfil/${post.user_id}`)}
                    style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, cursor: "pointer" }}
                  >
                    <AvatarCircle url={profile?.avatar_url ?? null} name={profile?.username ?? null} />
                    <div>
                      <p style={{ fontSize: "15px", fontWeight: 700, color: "#1A1A2E", margin: 0 }}>
                        {profile?.username ?? "Usuario"}
                      </p>
                      <p style={{ fontSize: "13px", color: "#9CA3AF", margin: 0 }}>
                        {timeAgo(post.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* ··· menu — own posts only */}
                  {isOwn && (
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === post.id ? null : post.id); }}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          fontSize: "18px", color: "#9CA3AF", padding: "4px 8px",
                          borderRadius: "8px", letterSpacing: "2px",
                        }}
                        aria-label="Opciones"
                      >
                        ···
                      </button>
                      {openMenuId === post.id && (
                        <div
                          style={{
                            position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 10,
                            background: "#FFFFFF", borderRadius: "1rem",
                            boxShadow: "0 4px 20px rgba(26,26,46,0.15)",
                            overflow: "hidden", minWidth: "130px",
                          }}
                        >
                          <button
                            onClick={() => startEdit(post)}
                            style={{
                              display: "block", width: "100%", textAlign: "left",
                              padding: "12px 16px", border: "none", background: "none",
                              cursor: "pointer", fontSize: "14px", fontWeight: 600, color: "#1A1A2E",
                            }}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => { setConfirmDeleteId(post.id); setOpenMenuId(null); }}
                            style={{
                              display: "block", width: "100%", textAlign: "left",
                              padding: "12px 16px", border: "none", background: "none",
                              cursor: "pointer", fontSize: "14px", fontWeight: 600, color: "#E63946",
                              borderTop: "1px solid #F0EDE8",
                            }}
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Content / inline edit / confirm delete */}
                {isEditing ? (
                  <div style={{ marginBottom: "12px" }}>
                    <textarea
                      autoFocus
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Escape") { setEditingPostId(null); setEditContent(""); } }}
                      style={{
                        width: "100%", border: "none", borderBottom: "2px solid #4ECDC4",
                        background: "#F8F7F4", borderRadius: "8px 8px 0 0",
                        padding: "8px 10px", fontSize: "15px",
                        fontFamily: "var(--font-noto-sans-jp), inherit",
                        color: "#1A1A2E", resize: "none", outline: "none",
                        lineHeight: 1.5, boxSizing: "border-box", minHeight: "72px",
                      }}
                    />
                    <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                      <button
                        onClick={() => handleSaveEdit(post.id)}
                        disabled={savingEdit || !editContent.trim()}
                        style={{
                          background: "#4ECDC4", color: "#1A1A2E", borderRadius: "999px",
                          padding: "7px 18px", border: "none", cursor: "pointer",
                          fontSize: "13px", fontWeight: 700,
                        }}
                      >
                        {savingEdit ? "…" : "Guardar"}
                      </button>
                      <button
                        onClick={() => { setEditingPostId(null); setEditContent(""); }}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          fontSize: "13px", fontWeight: 600, color: "#9CA3AF", padding: "7px 8px",
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : isConfirmDelete ? (
                  <div style={{ marginBottom: "12px", padding: "12px 14px", background: "#FFF1F2", borderRadius: "14px" }}>
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "#1A1A2E", margin: "0 0 10px" }}>
                      ¿Eliminar esta publicación?
                    </p>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => handleDelete(post.id)}
                        disabled={deletingPostId === post.id}
                        style={{
                          background: deletingPostId === post.id ? "#C4BAB0" : "#E63946",
                          color: "#FFFFFF", borderRadius: "999px",
                          padding: "7px 16px", border: "none",
                          cursor: deletingPostId === post.id ? "not-allowed" : "pointer",
                          fontSize: "13px", fontWeight: 700,
                        }}
                      >
                        {deletingPostId === post.id ? "Eliminando…" : "Sí, eliminar"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          fontSize: "13px", fontWeight: 600, color: "#9CA3AF", padding: "7px 8px",
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  post.content && (
                    <p
                      style={{
                        fontSize: "16px", fontWeight: 600, color: "#1A1A2E",
                        margin: "0 0 12px", lineHeight: 1.5,
                        fontFamily: "var(--font-noto-sans-jp), sans-serif",
                      }}
                    >
                      {post.content}
                    </p>
                  )
                )}

                {/* Image */}
                {post.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.image_url}
                    alt="publicación"
                    onClick={() => setLightboxUrl(post.image_url)}
                    style={{
                      width: "100%", aspectRatio: "4/3", borderRadius: "1rem",
                      display: "block", marginBottom: "12px",
                      objectFit: "cover", cursor: "pointer",
                    }}
                  />
                )}

                {/* Footer */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    onClick={() => toggleLike(post)}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      background: liked ? "rgba(230,57,70,0.10)" : "rgba(26,26,46,0.06)",
                      borderRadius: "999px", padding: "7px 14px",
                      border: "none", cursor: "pointer", fontSize: "14px",
                      fontWeight: 600, color: liked ? "#E63946" : "#53596B",
                      transition: "background 0.15s",
                    }}
                  >
                    <span style={{ fontSize: "16px" }}>{liked ? "❤️" : "🤍"}</span>
                    いいね！ {post.likes}
                  </button>

                  {/* Admin delete — non-own posts */}
                  {isAdmin && !isOwn && (
                    <button
                      onClick={() => setConfirmDeleteId(confirmDeleteId === post.id ? null : post.id)}
                      style={{
                        marginLeft: "auto", background: "none", border: "none",
                        cursor: "pointer", fontSize: "18px", padding: "4px 8px",
                        borderRadius: "8px", opacity: 0.5,
                      }}
                      aria-label="Eliminar (admin)"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Lightbox — animated */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2 }}
            onClick={() => setLightboxUrl(null)}
            onTouchStart={handleLbTouchStart}
            onTouchEnd={handleLbTouchEnd}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.95)",
              zIndex: 200,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setLightboxUrl(null)}
              style={{
                position: "absolute", top: "20px", right: "20px",
                width: "40px", height: "40px", borderRadius: "50%",
                background: "rgba(255,255,255,0.15)", border: "none",
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", zIndex: 201,
              }}
              aria-label="Cerrar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>

            {/* Image — scale animation */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              style={{ display: "flex", maxWidth: "100%", maxHeight: "100dvh" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxUrl}
                alt="imagen ampliada"
                style={{ maxWidth: "100%", maxHeight: "100dvh", objectFit: "contain" }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
