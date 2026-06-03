"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import { optimizeImageFile, validateImageFile } from "@/lib/client-image-upload";
import { useStudentViewMode } from "@/lib/use-student-view-mode";
import { markActiveToday, getStreak } from "@/lib/streak";
import { getWeeklyTopic, fetchTopicOverride, saveTopicOverride, fetchAnnouncement, type WeeklyTopic } from "@/lib/weekly-topics";
import Link from "next/link";
import RepliesSheet from "@/components/RepliesSheet";
import TemaSemanaSheet from "@/components/TemaSemanaSheet";
import { getCurrentCurriculumModule, getCurriculumModuleIndex, CURRICULUM_MODULES } from "@/lib/curriculum-modules";
import { TEMAS_SEMANA, type TemaSemana } from "@/lib/temas-semana";

type Post = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  likes: number;
  created_at: string;
  from_tema?: boolean;  // set when post was created via the weekly-topic wizard
};

// Reaction types shown on posts (in Japanese — no emojis)
const REACTIONS = [
  { type: "like",     label: "いいね" },
  { type: "sugoii",   label: "すごい" },
  { type: "wakaru",   label: "わかる" },
  { type: "ganbatte", label: "がんばれ" },
] as const;

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
        background: "linear-gradient(135deg, #4ECDC4 0%, #4ECDC4AA 100%)",
        display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: size * 0.4, fontWeight: 800,
        color: "#1A1A2E", flexShrink: 0,
        boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.16), 0 2px 6px rgba(0,0,0,0.25)",
        letterSpacing: "-0.02em",
      }}
    >
      {(name ?? "?").charAt(0).toUpperCase()}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [topic, setTopic] = useState<WeeklyTopic>(getWeeklyTopic());
  const [editingTopic, setEditingTopic] = useState(false);
  const [topicDraft, setTopicDraft] = useState<WeeklyTopic>({ kana: "", prompt: "" });
  const [savingTopic, setSavingTopic] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  // reactions: postId → reaction type the current user has given
  const [myReactions, setMyReactions] = useState<Record<string, string>>({});
  // reactionCounts: postId → { like: N, sugoii: M, ... }
  const [reactionCounts, setReactionCounts] = useState<Record<string, Record<string, number>>>({});
  // true when the next publish came from the tema wizard
  const fromTemaRef = useRef(false);
  // teacher announcement banner
  const [announcement, setAnnouncement] = useState<string | null>(null);
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

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false); // shadow for IntersectionObserver closure

  // Who liked
  const [likerNames, setLikerNames] = useState<Record<string, string[]>>({});
  const [openLikersId, setOpenLikersId] = useState<string | null>(null);
  const [fetchingLikers, setFetchingLikers] = useState(false);

  // Replies
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [replyPostId, setReplyPostId] = useState<string | null>(null);

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

  // Like burst animation
  const [justLikedId, setJustLikedId] = useState<string | null>(null);
  const likeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Progress mini-card
  const [groupName, setGroupName] = useState<string | null>(null);
  const [showProgreso, setShowProgreso] = useState(false);
  const [currentLesson, setCurrentLesson] = useState<number | null>(null);

  // Tema de la semana sheet
  const [showTemaSheet, setShowTemaSheet] = useState(false);
  const [currentTema, setCurrentTema] = useState<TemaSemana | null>(null);

  // Lightbox — no extra refs needed (framer-motion drag handles it)

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

    if (visible.length === 0) return;

    const postIds = visible.map((p) => p.id);
    const userIds = [...new Set([...visible.map((p) => p.user_id), ...(uid ? [uid] : [])])];

    // Fire secondary queries in parallel
    const [profileData, likesData, countsData, allReactionsData] = await Promise.all([
      userIds.length > 0
        ? supabase.from("profiles").select("id, username, avatar_url").in("id", userIds).then(r => r.data)
        : Promise.resolve(null),
      uid
        ? supabase.from("comunidad_likes").select("post_id, reaction").eq("user_id", uid).in("post_id", postIds).then(r => r.error ? null : r.data)
        : Promise.resolve(null),
      supabase.from("comunidad_comments").select("post_id").in("post_id", postIds).then(r => r.data),
      // All reactions for these posts (for counts per type)
      supabase.from("comunidad_likes").select("post_id, reaction").in("post_id", postIds).then(r => r.error ? null : r.data),
    ]);

    // Profiles
    const map: Record<string, Profile> = {};
    (profileData as Profile[] | null)?.forEach((p) => { map[p.id] = p; });
    if (userIds.length > 0) {
      setProfiles((cur) => ({ ...cur, ...map }));
      if (uid && map[uid]) setMyProfile(map[uid]);
    }

    // Likes + reactions
    const likeRows = (likesData as { post_id: string; reaction?: string }[] | null) ?? [];
    const ids = likeRows.map(l => l.post_id);
    if (ids.length > 0) {
      setLikedIds((cur) => { const next = new Set(cur); ids.forEach(id => next.add(id)); return next; });
      // Track per-type reaction for current user
      const newMyReactions: Record<string, string> = {};
      likeRows.forEach(l => { newMyReactions[l.post_id] = l.reaction ?? "like"; });
      setMyReactions(prev => ({ ...prev, ...newMyReactions }));
    }

    // Aggregate reaction counts for all posts
    const allRows = (allReactionsData as { post_id: string; reaction?: string }[] | null) ?? [];
    const newCounts: Record<string, Record<string, number>> = {};
    allRows.forEach(r => {
      const pid = r.post_id; const rt = r.reaction ?? "like";
      if (!newCounts[pid]) newCounts[pid] = {};
      newCounts[pid][rt] = (newCounts[pid][rt] ?? 0) + 1;
    });
    setReactionCounts(prev => ({ ...prev, ...newCounts }));

    // Comment counts
    const countMap: Record<string, number> = {};
    (countsData as { post_id: string }[] | null)?.forEach(r => {
      countMap[r.post_id] = (countMap[r.post_id] ?? 0) + 1;
    });
    setCommentCounts(prev => ({ ...prev, ...countMap }));
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
        const { data: adminRow } = await supabase.from("profiles").select("is_admin, group_name").eq("id", uid).single();
        const adminData = adminRow as { is_admin: boolean | null; group_name: string | null } | null;
        const isAdminUser = adminData?.is_admin === true;
        setIsAdmin(isAdminUser);

        // Determine effective group (student view uses localStorage group; students use their own)
        const { readStudentViewPreference, readStudentViewGroup } = await import("@/lib/student-view");
        const svActive = isAdminUser && readStudentViewPreference();
        const effectiveGroup = svActive ? readStudentViewGroup() : (adminData?.group_name ?? null);

        if (effectiveGroup && (!isAdminUser || svActive)) {
          setGroupName(effectiveGroup);
          // Check show_progreso from Flask via proxy
          fetch("/api/grupos-progreso")
            .then(r => r.ok ? r.json() : {})
            .then((map: Record<string, boolean>) => {
              const progreso = Boolean(map[effectiveGroup]);
              setShowProgreso(progreso);
              // Fetch lesson in background (non-blocking)
              // Flask keys clases_log.json by coleccion.nombre (e.g. "Nihongo ゴジラ"),
              // not by the short Supabase group name — resolve via /api/colecciones first.
              if (progreso) {
                fetch("/api/colecciones")
                  .then(r => r.ok ? r.json() : {})
                  .then((cols: Record<string, { nombre: string }>) => {
                    // Find coleccion whose nombre contains the group name (substring match)
                    const nameLower = effectiveGroup.toLowerCase();
                    const match = Object.values(cols).find(c =>
                      c.nombre.toLowerCase().includes(nameLower)
                    );
                    const flaskGrupo = match?.nombre ?? effectiveGroup;
                    return fetch(`/api/clase-notas?grupo=${encodeURIComponent(flaskGrupo)}`);
                  })
                  .then(r => r.json())
                  .then((notas: Array<{ tema?: string }>) => {
                    let max = 0;
                    for (const n of notas) {
                      const m = n.tema?.match(/^L(\d+)/);
                      if (m) { const l = parseInt(m[1], 10); if (l > max) max = l; }
                    }
                    if (max > 0) setCurrentLesson(max);
                  })
                  .catch(() => {/* silent */});
              }
            })
            .catch(() => {/* silent */});
        }
      } else {
        setIsAdmin(false);
      }

      // Fetch topic override + announcement in parallel
      const [override, ann] = await Promise.all([
        fetchTopicOverride(supabase),
        fetchAnnouncement(supabase),
      ]);
      if (override) setTopic(override);
      setAnnouncement(ann);

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

  useEffect(() => {
    return () => { if (likeTimerRef.current) clearTimeout(likeTimerRef.current); };
  }, []);

  async function loadMorePosts() {
    if (loadingMoreRef.current || !hasMorePosts || !nextPostsCursor) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      await loadPostsBatch({ uid: userId, cursor: nextPostsCursor, reset: false });
    } catch {
      setFeedError("No pudimos cargar más. Intenta otra vez.");
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }

  // IntersectionObserver — auto-load when sentinel enters viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMorePosts && !loadingMoreRef.current) {
          loadMorePosts();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMorePosts, nextPostsCursor]);

  async function fetchLikers(postId: string) {
    if (likerNames[postId] !== undefined) {
      setOpenLikersId(openLikersId === postId ? null : postId);
      return;
    }
    setFetchingLikers(true);
    setOpenLikersId(postId);
    try {
      const { data } = await supabase
        .from("comunidad_likes")
        .select("user_id")
        .eq("post_id", postId);
      const userIds = (data as { user_id: string }[] | null)?.map((r) => r.user_id) ?? [];
      if (userIds.length === 0) {
        setLikerNames((prev) => ({ ...prev, [postId]: [] }));
        return;
      }
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", userIds);
      const names = (profileData as { id: string; username: string | null }[] | null)
        ?.map((p) => p.username ?? "Anónimo") ?? [];
      setLikerNames((prev) => ({ ...prev, [postId]: names }));
    } finally {
      setFetchingLikers(false);
    }
  }

  async function handleShare(post: Post, profile: Profile | undefined) {
    const username = profile?.username ?? "Anónimo";
    const params = new URLSearchParams({ content: post.content, username });
    if (post.image_url) params.set("imageUrl", post.image_url);
    const cardUrl = `/api/share-card?${params.toString()}`;
    const fullUrl = `${window.location.origin}${cardUrl}`;

    // Web Share API (iOS/Android native sheet)
    if (navigator.share) {
      try {
        // Fetch the image blob so we can share it as a file
        const res = await fetch(cardUrl);
        const blob = await res.blob();
        const file = new File([blob], "feed-post.png", { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: "フィード" });
          return;
        }
        // Fall back to sharing URL
        await navigator.share({ url: fullUrl, title: "フィード" });
        return;
      } catch {/* user cancelled or share failed */}
    }

    // Fallback: open image in new tab so user can long-press to save
    window.open(fullUrl, "_blank");
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
        const optimized = await optimizeImageFile(composeImage, { maxWidth: 1200, maxHeight: 1200, quality: 0.72 });
        const ext = optimized.name.split(".").pop() ?? "jpg";
        const path = `${userId}/${Date.now()}.${ext}`;
        const { data: up, error: upErr } = await supabase.storage.from("comunidad-images").upload(path, optimized, { upsert: false });
        if (upErr) throw new Error(upErr.message);
        if (up) imageUrl = supabase.storage.from("comunidad-images").getPublicUrl(up.path).data.publicUrl;
        else throw new Error("No se pudo subir la imagen.");
      }
      const isTema = fromTemaRef.current;
      fromTemaRef.current = false;
      // Try with from_tema column; gracefully fall back if column doesn't exist yet
      let insertResult = await supabase
        .from("comunidad_posts")
        .insert({ user_id: userId, content: composeText.trim(), image_url: imageUrl, likes: 0, created_at: new Date().toISOString(), ...(isTema ? { from_tema: true } : {}) })
        .select().single();
      if (insertResult.error?.code === "42703" /* column does not exist */) {
        insertResult = await supabase
          .from("comunidad_posts")
          .insert({ user_id: userId, content: composeText.trim(), image_url: imageUrl, likes: 0, created_at: new Date().toISOString() })
          .select().single();
      }
      const { data: inserted, error: insertErr } = insertResult;
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
    // Trigger heart burst only when liking (not unliking)
    if (!liked) {
      if (likeTimerRef.current) clearTimeout(likeTimerRef.current);
      setJustLikedId(post.id);
      likeTimerRef.current = setTimeout(() => setJustLikedId(null), 900);
    }
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

  async function toggleReaction(postId: string, reactionType: string) {
    if (!userId) { router.push("/login"); return; }
    const current = myReactions[postId] ?? "";
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (current === reactionType) {
      // Remove reaction
      setMyReactions(prev => { const n = { ...prev }; delete n[postId]; return n; });
      setLikedIds(prev => { const n = new Set(prev); n.delete(postId); return n; });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: Math.max(0, p.likes - 1) } : p));
      setReactionCounts(prev => {
        const n = { ...prev, [postId]: { ...(prev[postId] ?? {}) } };
        n[postId][reactionType] = Math.max(0, (n[postId][reactionType] ?? 1) - 1);
        return n;
      });
      await supabase.from("comunidad_likes").delete().match({ post_id: postId, user_id: userId });
      await supabase.from("comunidad_posts").update({ likes: Math.max(0, post.likes - 1) }).eq("id", postId);
    } else if (current) {
      // Switch reaction type
      setMyReactions(prev => ({ ...prev, [postId]: reactionType }));
      setReactionCounts(prev => {
        const n = { ...prev, [postId]: { ...(prev[postId] ?? {}) } };
        n[postId][current] = Math.max(0, (n[postId][current] ?? 1) - 1);
        n[postId][reactionType] = (n[postId][reactionType] ?? 0) + 1;
        return n;
      });
      try {
        await supabase.from("comunidad_likes").update({ reaction: reactionType }).match({ post_id: postId, user_id: userId });
      } catch {/* reaction column may not exist yet */}
    } else {
      // New reaction
      setMyReactions(prev => ({ ...prev, [postId]: reactionType }));
      setLikedIds(prev => { const n = new Set(prev); n.add(postId); return n; });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: p.likes + 1 } : p));
      setReactionCounts(prev => ({
        ...prev,
        [postId]: { ...(prev[postId] ?? {}), [reactionType]: ((prev[postId] ?? {})[reactionType] ?? 0) + 1 },
      }));
      if (likeTimerRef.current) clearTimeout(likeTimerRef.current);
      setJustLikedId(postId);
      likeTimerRef.current = setTimeout(() => setJustLikedId(null), 900);
      try {
        await supabase.from("comunidad_likes").insert({ post_id: postId, user_id: userId, reaction: reactionType });
      } catch {
        await supabase.from("comunidad_likes").insert({ post_id: postId, user_id: userId });
      }
      await supabase.from("comunidad_posts").update({ likes: post.likes + 1 }).eq("id", postId);
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

  const canPublish = composeText.trim().length > 0 && !publishing && !!userId;

  return (
    <div
      style={{
        background: "#1A1A2E",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
        position: "relative",
      }}
    >
      {/* Ambient teal glow top-left */}
      <div style={{ position: "fixed", top: -160, left: -100, width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle, rgba(78,205,196,0.10) 0%, rgba(78,205,196,0) 60%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {/* ── Header ── */}
      <div
        style={{
          padding: "calc(env(safe-area-inset-top, 20px) + 20px) 20px 16px",
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
            style={{ display: "block", filter: "brightness(0) invert(1)", width: "auto" }}
          />
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.42)", margin: "4px 0 0", fontWeight: 500 }}>{getGreeting()}</p>
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
      <div style={{ padding: "0 16px 12px" }}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            const found = TEMAS_SEMANA.find(t => t.kana === topic.kana) ?? null;
            setCurrentTema(found);
            setShowTemaSheet(true);
          }}
          onKeyDown={e => {
            if (e.key === "Enter" || e.key === " ") {
              const found = TEMAS_SEMANA.find(t => t.kana === topic.kana) ?? null;
              setCurrentTema(found);
              setShowTemaSheet(true);
            }
          }}
          style={{
            position: "relative",
            background: "#1E2235",
            borderRadius: "16px",
            padding: "20px 20px 20px",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.06)",
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {/* Corner fold teal */}
          <motion.div
            aria-hidden="true"
            animate={{ scale: [1, 1.18, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "absolute", top: 0, right: 0, width: 44, height: 44, background: "#4ECDC4", borderBottomLeftRadius: 44, pointerEvents: "none", transformOrigin: "top right" }}
          />

          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "#4ECDC4", textTransform: "uppercase", margin: 0 }}>
              Tema de la semana
            </p>
            {effectiveIsAdmin && !editingTopic && (
              <button
                onClick={e => { e.stopPropagation(); setTopicDraft({ kana: topic.kana, prompt: topic.prompt }); setEditingTopic(true); }}
                style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, marginRight: 32 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>Editar</span>
              </button>
            )}
          </div>

          {editingTopic ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                value={topicDraft.kana}
                onChange={e => setTopicDraft(d => ({ ...d, kana: e.target.value }))}
                placeholder="Texto en kana (ej. きょうのてんき)"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: "10px 14px", color: "#FFFFFF", fontSize: 16, fontFamily: "var(--font-noto-serif-jp), serif", outline: "none", width: "100%", boxSizing: "border-box" }}
              />
              <input
                value={topicDraft.prompt}
                onChange={e => setTopicDraft(d => ({ ...d, prompt: e.target.value }))}
                placeholder="Prompt en español"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: "10px 14px", color: "#FFFFFF", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={async () => {
                    if (!userId || !topicDraft.kana.trim() || !topicDraft.prompt.trim()) return;
                    setSavingTopic(true);
                    const ok = await saveTopicOverride(supabase, topicDraft, userId);
                    if (ok) { setTopic(topicDraft); setEditingTopic(false); }
                    setSavingTopic(false);
                  }}
                  disabled={savingTopic}
                  style={{ flex: 1, background: "#4ECDC4", color: "#1A1A2E", border: "none", borderRadius: 10, padding: "10px 0", fontWeight: 700, fontSize: 14, cursor: savingTopic ? "not-allowed" : "pointer" }}
                >
                  {savingTopic ? "Guardando…" : "Guardar"}
                </button>
                <button
                  onClick={() => setEditingTopic(false)}
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)", border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <p style={{ fontSize: "28px", fontWeight: 700, color: "#FFFFFF", margin: "0 0 8px", fontFamily: "var(--font-noto-sans-jp), sans-serif", lineHeight: 1.15, letterSpacing: "0.01em" }}>
                {topic.kana}
              </p>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.65)", margin: "0 0 14px", lineHeight: 1.5, maxWidth: 280 }}>
                {topic.prompt}
              </p>
              {/* Hint: tap to see examples */}
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#4ECDC4", letterSpacing: "0.04em" }}>
                  Te ayudo a publicar paso a paso
                </span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18l6-6-6-6" stroke="#4ECDC4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Mi Camino mini-card ── */}
      {showProgreso && !effectiveIsAdmin && (() => {
        const currentModule = getCurrentCurriculumModule(currentLesson);
        const moduleIndex = getCurriculumModuleIndex(currentLesson);
        const subtitle = `${currentModule.nombreJa} · ${currentModule.nombre}`;
        return (
          <div style={{ padding: "0 16px 12px" }}>
            <Link
              href={groupName ? `/progreso?grupo=${encodeURIComponent(groupName)}` : "/progreso"}
              style={{ textDecoration: "none", display: "block" }}
            >
              <div style={{
                background: "linear-gradient(135deg, #0E1829 0%, #1A2B3C 55%, #0E1829 100%)",
                borderRadius: 16,
                padding: "14px 16px 14px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 0 0 1.5px rgba(78,205,196,0.35), 0 6px 28px rgba(78,205,196,0.14)",
              }}>
                {/* teal glow blob */}
                <div style={{
                  position: "absolute", top: -24, right: 52, width: 110, height: 110,
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(78,205,196,0.28) 0%, rgba(78,205,196,0) 70%)",
                  pointerEvents: "none",
                }} />

                {/* icon + text */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, position: "relative" }}>
                  {/* winding-path icon */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: "rgba(78,205,196,0.13)",
                    border: "1.5px solid rgba(78,205,196,0.32)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M3 17c2-2 4-3 6-1s4 3 6 1" stroke="#4ECDC4" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M3 11c2-2 4-3 6-1s4 3 6 1" stroke="rgba(78,205,196,0.55)" strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="19" cy="7" r="2" fill="#4ECDC4"/>
                      <path d="M19 9v4" stroke="rgba(78,205,196,0.4)" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                      <span style={{ fontSize: 17, fontWeight: 800, color: "#FFFFFF", lineHeight: 1, letterSpacing: "-0.02em" }}>
                        Mi Camino
                      </span>
                      <span style={{
                        fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase",
                        color: "#0E1829", background: "#4ECDC4",
                        padding: "2px 6px", borderRadius: 5, lineHeight: 1.6,
                      }}>
                        NUEVO
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12.5, color: "rgba(255,255,255,0.48)", lineHeight: 1.35, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {subtitle}
                    </p>
                    <p style={{ margin: "3px 0 0", fontSize: 11, color: "rgba(78,205,196,0.72)", lineHeight: 1.25, fontWeight: 700 }}>
                      Módulo {moduleIndex + 1} / {CURRICULUM_MODULES.length}
                    </p>
                  </div>
                </div>

                {/* arrow */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, position: "relative" }}>
                  <path d="M9 18l6-6-6-6" stroke="#4ECDC4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </Link>
          </div>
        );
      })()}

      {/* ── Announcement banner (teacher broadcast) ── */}
      {announcement && (
        <div style={{ padding: "0 16px 12px" }}>
          <div style={{ background: "rgba(78,205,196,0.10)", border: "1px solid rgba(78,205,196,0.25)", borderRadius: 13, padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ECDC4", flexShrink: 0, marginTop: 6 }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#FFFFFF", lineHeight: 1.5, fontFamily: "var(--font-noto-sans-jp), sans-serif" }}>
              {announcement}
            </p>
          </div>
        </div>
      )}

      {/* ── Compose box ── */}
      {userId && (
        <div style={{ padding: "0 16px 16px" }}>
          <div
            style={{
              background: "#1E2235",
              borderRadius: "14px",
              padding: "14px",
              border: "1px solid rgba(255,255,255,0.06)",
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
                  color: "#FFFFFF", lineHeight: 1.5, padding: "4px 0", overflow: "hidden",
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

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                aria-label="Agregar imagen"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", color: "rgba(255,255,255,0.42)" }}
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
                  background: canPublish ? "#E63946" : "rgba(255,255,255,0.07)",
                  color: canPublish ? "#FFFFFF" : "rgba(255,255,255,0.25)", borderRadius: "8px", padding: "7px 16px",
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
      <div
        style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}
        onClick={() => { setOpenMenuId(null); setOpenLikersId(null); }}
      >
        {loading ? (
          /* Skeleton cards */
          <>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ background: "#1E2235", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
                {/* Shimmer image placeholder */}
                {i < 2 && <div style={{ width: "100%", height: 200, background: "linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%)", backgroundSize: "400% 100%", animation: "shimmer 1.4s ease-in-out infinite" }} />}
                <div style={{ padding: "14px 16px" }}>
                  {/* Avatar + name skeleton */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ width: "35%", height: 12, borderRadius: 6, background: "rgba(255,255,255,0.08)", marginBottom: 6 }} />
                      <div style={{ width: "20%", height: 10, borderRadius: 6, background: "rgba(255,255,255,0.05)" }} />
                    </div>
                  </div>
                  {/* Text lines */}
                  <div style={{ width: "100%", height: 12, borderRadius: 6, background: "rgba(255,255,255,0.08)", marginBottom: 7 }} />
                  <div style={{ width: "80%", height: 12, borderRadius: 6, background: "rgba(255,255,255,0.05)" }} />
                </div>
              </div>
            ))}
            <style>{`@keyframes shimmer { 0%{background-position:100% 50%} 100%{background-position:-100% 50%} }`}</style>
          </>
        ) : feedError && posts.length === 0 ? (
          <div style={{ background: "#1E2235", borderRadius: "14px", padding: "28px", textAlign: "center", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: 15, color: "#FF6470", fontWeight: 700, margin: "0 0 14px" }}>{feedError}</p>
            <button onClick={reloadFeed}
              style={{ border: "none", borderRadius: "8px", background: "#4ECDC4", color: "#1A1A2E", padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Reintentar
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div style={{ background: "#1E2235", borderRadius: "14px", padding: "32px 20px", textAlign: "center", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#FFFFFF", margin: "0 0 6px" }}>Sé el primero en publicar</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.42)", margin: 0 }}>Usa el tema de esta semana como inspiración.</p>
          </div>
        ) : (
          <>
            {posts.map((post, index) => {
              const profile = profiles[post.user_id];
              const liked = likedIds.has(post.id);
              const isOwn = post.user_id === userId;
              const isEditing = editingPostId === post.id;
              const isConfirmDelete = confirmDeleteId === post.id;
              const showHeartBurst = justLikedId === post.id;

              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, delay: Math.min(index, 6) * 0.055, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    background: "#1E2235",
                    borderRadius: "16px",
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {/* Image — full-bleed at top when present */}
                  {post.image_url && !isEditing && !isConfirmDelete && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.image_url}
                      alt="publicación"
                      onClick={() => setLightboxUrl(post.image_url)}
                      style={{ width: "100%", aspectRatio: "4/3", display: "block", objectFit: "cover", cursor: "pointer" }}
                    />
                  )}

                  <div style={{ padding: "14px 16px" }}>
                    {/* Author row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: post.content || isEditing || isConfirmDelete ? 10 : 0 }}>
                      <button
                        onClick={() => router.push(`/perfil/${post.user_id}`)}
                        style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: "pointer", background: "none", border: "none", padding: 0, textAlign: "left" }}
                      >
                        <AvatarCircle url={profile?.avatar_url ?? null} name={profile?.username ?? null} size={36} />
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF", margin: 0, lineHeight: 1.2 }}>
                            {profile?.username ?? "Usuario"}
                          </p>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", fontWeight: 500 }}>{timeAgo(post.created_at)}</span>
                            {post.from_tema && (
                              <span style={{ fontSize: 10, fontWeight: 800, color: "#4ECDC4", background: "rgba(78,205,196,0.13)", borderRadius: 4, padding: "1px 6px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                                tema
                              </span>
                            )}
                          </div>
                        </div>
                      </button>

                      {isOwn && (
                        <div style={{ position: "relative", flexShrink: 0 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === post.id ? null : post.id); }}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "rgba(255,255,255,0.35)", padding: "4px 8px", borderRadius: 8, letterSpacing: 2 }}
                            aria-label="Opciones"
                          >···</button>
                          {openMenuId === post.id && (
                            <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 10, background: "#252A40", borderRadius: "12px", boxShadow: "0 4px 24px rgba(0,0,0,0.4)", overflow: "hidden", minWidth: 130, border: "1px solid rgba(255,255,255,0.08)" }}>
                              <button onClick={() => startEdit(post)}
                                style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 16px", border: "none", background: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#FFFFFF" }}>
                                Editar
                              </button>
                              <button onClick={() => { setConfirmDeleteId(post.id); setOpenMenuId(null); }}
                                style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 16px", border: "none", background: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#FF6470", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                                Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    {isEditing ? (
                      <div style={{ marginBottom: 10 }}>
                        <textarea
                          autoFocus value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Escape") { setEditingPostId(null); setEditContent(""); } }}
                          style={{ width: "100%", border: "none", borderBottom: "2px solid #4ECDC4", background: "rgba(255,255,255,0.06)", borderRadius: "8px 8px 0 0", padding: "8px 10px", fontSize: 15, fontFamily: "var(--font-noto-sans-jp), inherit", color: "#FFFFFF", resize: "none", outline: "none", lineHeight: 1.5, boxSizing: "border-box", minHeight: 72 }}
                        />
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <button onClick={() => handleSaveEdit(post.id)} disabled={savingEdit || !editContent.trim()}
                            style={{ background: "#4ECDC4", color: "#1A1A2E", borderRadius: "8px", padding: "7px 16px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                            {savingEdit ? "…" : "Guardar"}
                          </button>
                          <button onClick={() => { setEditingPostId(null); setEditContent(""); }}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.42)", padding: "7px 8px" }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : isConfirmDelete ? (
                      <div style={{ marginBottom: 10, padding: "12px 14px", background: "rgba(230,57,70,0.10)", borderRadius: "10px" }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF", margin: "0 0 10px" }}>¿Eliminar esta publicación?</p>
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
                      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.88)", margin: "0 0 10px", lineHeight: 1.6, fontFamily: "var(--font-noto-sans-jp), sans-serif" }}>
                        {post.content}
                      </p>
                    ) : null}

                    {/* Footer */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, position: "relative" }}>
                      {/* Reaction pills — Japanese labels, no emojis */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, position: "relative" }}>
                        {REACTIONS.map(r => {
                          const isActive = myReactions[post.id] === r.type;
                          const count = reactionCounts[post.id]?.[r.type] ?? 0;
                          return (
                            <motion.button
                              key={r.type}
                              onClick={() => toggleReaction(post.id, r.type)}
                              whileTap={{ scale: 1.12 }}
                              transition={{ type: "spring", stiffness: 500, damping: 20 }}
                              style={{
                                display: "flex", alignItems: "center", gap: 5,
                                background: isActive ? "rgba(78,205,196,0.14)" : "rgba(255,255,255,0.04)",
                                border: `1px solid ${isActive ? "rgba(78,205,196,0.3)" : "rgba(255,255,255,0.07)"}`,
                                borderRadius: 8, padding: "5px 10px",
                                cursor: "pointer", fontSize: 13, fontWeight: 700,
                                color: isActive ? "#4ECDC4" : "rgba(255,255,255,0.5)",
                                fontFamily: "var(--font-noto-sans-jp), sans-serif",
                                transition: "background 140ms ease, border-color 140ms ease, color 140ms ease",
                              }}
                            >
                              {r.label}
                              {count > 0 && (
                                <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>{count}</span>
                              )}
                            </motion.button>
                          );
                        })}
                        {/* Float-up burst on new reaction */}
                        <AnimatePresence>
                          {showHeartBurst && (
                            <motion.div
                              key="burst"
                              initial={{ opacity: 1, y: 0, scale: 1 }}
                              animate={{ opacity: 0, y: -28, scale: 1.4 }}
                              exit={{}}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                              style={{ position: "absolute", top: 0, left: 10, pointerEvents: "none", zIndex: 10, fontSize: 14, fontWeight: 900, color: "#4ECDC4", fontFamily: "var(--font-noto-sans-jp), sans-serif" }}
                            >
                              いいね
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Reply + share row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          onClick={() => setReplyPostId(post.id)}
                          style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "6px 10px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)" }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {commentCounts[post.id] ? <span>{commentCounts[post.id]}</span> : null}
                        </button>
                        <button
                          onClick={() => handleShare(post, profiles[post.user_id])}
                          style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "6px 10px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)", marginLeft: "auto" }}
                          aria-label="Compartir"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        {effectiveIsAdmin && !isOwn && (
                          <button onClick={() => setConfirmDeleteId(confirmDeleteId === post.id ? null : post.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: "4px 8px", borderRadius: 8, opacity: 0.5 }}
                            aria-label="Eliminar (admin)">🗑️</button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {feedError && (
              <div style={{ borderRadius: 12, background: "rgba(230,57,70,0.10)", color: "#FF6470", padding: 14, fontSize: 13, fontWeight: 700, textAlign: "center" }}>
                {feedError}
              </div>
            )}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} style={{ height: 1 }} />
            {loadingMore && (
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: 600, textAlign: "center", margin: "4px 0 0" }}>
                Cargando…
              </p>
            )}
            {!hasMorePosts && posts.length > 0 && (
              <p style={{ color: "rgba(255,255,255,0.22)", fontSize: 12, fontWeight: 700, letterSpacing: "0.16em", textAlign: "center", margin: "4px 0 16px", textTransform: "uppercase" }}>
                · fin ·
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightboxUrl && (
          <>
            {/* Backdrop — tap to close, stays fixed */}
            <motion.div
              key="lb-bg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.22 } }}
              transition={{ duration: 0.18 }}
              onClick={() => setLightboxUrl(null)}
              style={{
                position: "fixed", inset: 0, zIndex: 200,
                background: "rgba(0,0,0,0.88)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
              }}
            />

            {/* Image — full-screen drag container */}
            <motion.div
              key="lb-img"
              initial={{ opacity: 0, scale: 0.88, y: 32 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, y: 500, transition: { duration: 0.28, ease: [0.4, 0, 1, 1] } }}
              transition={{ type: "spring", damping: 30, stiffness: 340, mass: 0.85 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.35 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90 || info.velocity.y > 500) setLightboxUrl(null);
              }}
              onClick={() => setLightboxUrl(null)}
              style={{
                position: "fixed", inset: 0, zIndex: 201,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                cursor: "grab",
                touchAction: "pan-y",
              }}
            >
              {/* Drag handle pill */}
              <div
                style={{
                  position: "absolute", top: 14, left: "50%",
                  transform: "translateX(-50%)",
                  width: 40, height: 4, borderRadius: 2,
                  background: "rgba(255,255,255,0.3)",
                  pointerEvents: "none",
                }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxUrl}
                alt="imagen ampliada"
                draggable={false}
                onClick={(e) => e.stopPropagation()}
                style={{
                  maxWidth: "92%", maxHeight: "80dvh",
                  objectFit: "contain", borderRadius: 16,
                  display: "block",
                  boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
                  pointerEvents: "auto",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Tema de la semana sheet ── */}
      <AnimatePresence>
        {showTemaSheet && (
          <TemaSemanaSheet
            key="tema-sheet"
            onClose={() => setShowTemaSheet(false)}
            onUseSentence={(sentence) => {
              fromTemaRef.current = true;
              setComposeText(sentence);
              setShowTemaSheet(false);
              // Give time for the sheet exit animation, then focus
              setTimeout(() => {
                if (textareaRef.current) {
                  textareaRef.current.focus();
                  textareaRef.current.style.height = "auto";
                  textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
                }
              }, 280);
            }}
            tema={currentTema}
            fallback={topic}
          />
        )}
      </AnimatePresence>

      {/* ── Replies sheet ── */}
      {replyPostId && (() => {
        const post = posts.find(p => p.id === replyPostId);
        if (!post) return null;
        const profile = profiles[post.user_id];
        return (
          <RepliesSheet
            postId={replyPostId}
            postContent={post.content}
            postAuthorName={profile?.username ?? null}
            userId={userId}
            onClose={() => setReplyPostId(null)}
            onCountChange={(pid, delta) => setCommentCounts(prev => ({ ...prev, [pid]: (prev[pid] ?? 0) + delta }))}
          />
        );
      })()}

      <BottomNav />
      </div>
    </div>
  );
}
