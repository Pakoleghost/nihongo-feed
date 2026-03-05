"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getPostParts,
  isForumTaskSubtype,
  isPublicTargetGroup,
  isTaskAnnouncementSubtype,
  isTaskPostSubtype,
  normalizeGroupValue,
} from "@/lib/feed-utils";

function IconBook() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h11.5v15.5H7A2.5 2.5 0 0 0 4.5 21V5.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M7 3v15.5A2.5 2.5 0 0 0 4.5 21H17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7.5 9a4.5 4.5 0 1 1 9 0v2.4c0 .8.24 1.58.7 2.24l.55.8c.42.6 0 1.42-.73 1.42H6.98c-.73 0-1.15-.82-.73-1.42l.55-.8c.46-.66.7-1.44.7-2.24V9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2.75l1.15 2.65 2.88.23-2.2 1.88.67 2.82L12 8.9l-2.5 1.43.67-2.82-2.2-1.88 2.88-.23L12 2.75Z" stroke="currentColor" strokeWidth="1.45" strokeLinejoin="round" />
      <path d="M21.25 12l-2.65 1.15-.23 2.88-1.88-2.2-2.82.67L15.1 12l-1.43-2.5 2.82.67 1.88-2.2.23 2.88L21.25 12Z" stroke="currentColor" strokeWidth="1.45" strokeLinejoin="round" />
      <path d="M12 21.25l-1.15-2.65-2.88-.23 2.2-1.88-.67-2.82L12 15.1l2.5-1.43-.67 2.82 2.2 1.88-2.88.23L12 21.25Z" stroke="currentColor" strokeWidth="1.45" strokeLinejoin="round" />
      <path d="M2.75 12l2.65-1.15.23-2.88 1.88 2.2 2.82-.67L8.9 12l1.43 2.5-2.82-.67-1.88 2.2-.23-2.88L2.75 12Z" stroke="currentColor" strokeWidth="1.45" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function AvatarPlaceholder({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="11.5" fill="#f7f7f7" stroke="#e8e8e8" />
      <circle cx="12" cy="9.2" r="3.2" fill="#cfcfd4" />
      <path d="M6.7 18.1c1.1-2.3 3.05-3.4 5.3-3.4c2.25 0 4.2 1.1 5.3 3.4" stroke="#cfcfd4" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function formatFeedDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (hours < 1) return "ahora";
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
}

export default function HomePage() {
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastCursor, setLastCursor] = useState<string | null>(null);
  const [allFeedRows, setAllFeedRows] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [hasFreshPosts, setHasFreshPosts] = useState(false);
  const [feedMode, setFeedMode] = useState<"all" | "tasks">("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [fontScale, setFontScale] = useState<"normal" | "large">("normal");
  const [submissionByAssignment, setSubmissionByAssignment] = useState<Record<string, { submitted: boolean; late: boolean }>>({});
  const inFlightRef = useRef(false);
  const pullStartY = useRef<number | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const canSeePostForProfile = useCallback((p: any, profile: any) => {
    if (profile?.is_admin) return true;
    if (p?.parent_assignment_id) {
      const parentSubtype = normalizeGroupValue(p?.parent?.assignment_subtype);
      if (parentSubtype === "forum" || parentSubtype === "internal") return false;
      if (isTaskPostSubtype(parentSubtype)) return true;
      if (p?.parent?.is_forum === true) return false;
      if (p?.type === "assignment" && String(p?.content || "").startsWith("Respuesta ·")) return false;
      return p?.parent?.id ? true : false;
    }
    if (p?.type === "assignment" && (p?.is_forum || isForumTaskSubtype(p?.assignment_subtype))) return true;
    const target = p?.target_group;
    if (isPublicTargetGroup(target)) return true;
    return normalizeGroupValue(target) === normalizeGroupValue(profile?.group_name);
  }, []);

  const fetchPostsBatch = useCallback(async (opts?: { reset?: boolean; userId?: string }) => {
    const uid = opts?.userId || currentUserId;
    if (!uid) return;
    const PAGE_SIZE = 24;
    if (!opts?.reset && (!hasMore || loadingMore)) return;
    if (opts?.reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    let query = supabase
      .from("posts")
      .select(`*, profiles:user_id (username, avatar_url, group_name, is_admin), parent:parent_assignment_id (id, assignment_subtype, is_forum, target_group)`)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (!opts?.reset && lastCursor) {
      query = query.lt("created_at", lastCursor);
    }

    const { data: batch } = await query;
    const rows = batch || [];
    setPosts((prev) => (opts?.reset ? rows : [...prev, ...rows]));
    const nextCursor = rows.length > 0 ? rows[rows.length - 1].created_at || null : null;
    if (nextCursor) setLastCursor(nextCursor);
    setHasMore(rows.length === PAGE_SIZE);
    setLoading(false);
    setLoadingMore(false);
  }, [currentUserId, hasMore, lastCursor, loadingMore]);

  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (!opts?.silent) setLoading(true);
    else setRefreshing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      inFlightRef.current = false;
      if (!opts?.silent) setLoading(false);
      setRefreshing(false);
      return router.push("/login");
    }
    setCurrentUserId(user.id);

    let { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (!prof) {
      const meta: any = user.user_metadata || {};
      const baseUsername = String(meta?.username || user.email?.split("@")[0] || `user_${user.id.slice(0, 8)}`)
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "")
        .slice(0, 24);
      const fallbackUsername = baseUsername || `user_${user.id.slice(0, 8)}`;
      await supabase.from("profiles").upsert(
        {
          id: user.id,
          username: fallbackUsername,
          full_name: meta?.full_name || null,
          group_name: meta?.group_name || null,
          is_approved: false,
        },
        { onConflict: "id" },
      );
      const retry = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      prof = retry.data || null;
    }
    setMyProfile(prof || null);

    if (prof?.is_approved || prof?.is_admin) {
      const PAGE_SIZE = 24;
      setPosts([]);
      setAllFeedRows([]);
      setLastCursor(null);
      setHasMore(true);
      const { data: firstPage } = await supabase
        .from("posts")
        .select(`*, profiles:user_id (username, avatar_url, group_name, is_admin), parent:parent_assignment_id (id, assignment_subtype, is_forum, target_group)`)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      const initialRows = firstPage || [];
      setPosts(initialRows);
      const initialCursor = initialRows.length > 0 ? initialRows[initialRows.length - 1].created_at || null : null;
      setLastCursor(initialCursor);
      setHasMore(initialRows.length === PAGE_SIZE);
      setHasFreshPosts(false);

      const { data: feedRows } = await supabase
        .from("posts")
        .select("id, type, target_group, parent_assignment_id, assignment_subtype, is_forum, content, profiles:user_id (is_admin), parent:parent_assignment_id (id, assignment_subtype, is_forum, target_group)");
      setAllFeedRows(feedRows || []);

      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .or("is_read.eq.false,is_read.is.null");
      setUnreadNotifications(count || 0);

      const { data: mySubs } = await supabase
        .from("posts")
        .select("parent_assignment_id, created_at")
        .eq("user_id", user.id)
        .not("parent_assignment_id", "is", null)
        .eq("type", "assignment");
      const { data: assignments } = await supabase
        .from("posts")
        .select("id, deadline")
        .eq("type", "assignment")
        .is("parent_assignment_id", null);
      const deadlineById: Record<string, number> = {};
      (assignments || []).forEach((p: any) => {
        if (!p?.id || !p?.deadline) return;
        const ts = new Date(p.deadline).getTime();
        if (!Number.isNaN(ts)) deadlineById[String(p.id)] = ts;
      });
      const next: Record<string, { submitted: boolean; late: boolean }> = {};
      (mySubs || []).forEach((s: any) => {
        if (!s?.parent_assignment_id) return;
        const pid = String(s.parent_assignment_id);
        const submittedAt = new Date(s.created_at || "").getTime();
        const deadline = deadlineById[pid];
        const late = Boolean(deadline && !Number.isNaN(submittedAt) && submittedAt > deadline);
        next[pid] = { submitted: true, late };
      });
      setSubmissionByAssignment(next);

      const saved = localStorage.getItem("dismissed_posts");
      if (saved) setDismissedAnnouncements(JSON.parse(saved));
    }
    inFlightRef.current = false;
    setLoading(false);
    setRefreshing(false);
  }, [router]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!myProfile || myProfile.is_approved || myProfile.is_admin) return;
    const timer = setInterval(() => {
      void fetchData({ silent: true });
    }, 6000);
    return () => clearInterval(timer);
  }, [myProfile, fetchData]);

  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel(`feed-live-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        () => setHasFreshPosts(true),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const softRefresh = useCallback(async () => {
    await fetchData({ silent: true });
  }, [fetchData]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 2) pullStartY.current = e.touches[0]?.clientY ?? null;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (pullStartY.current == null) return;
      const endY = e.changedTouches[0]?.clientY ?? pullStartY.current;
      const delta = endY - pullStartY.current;
      pullStartY.current = null;
      if (window.scrollY <= 2 && delta > 85) {
        void softRefresh();
      }
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [softRefresh]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && hasMore && !loadingMore) {
        void fetchPostsBatch();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, fetchPostsBatch]);

  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel(`notif-count-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${currentUserId}` },
        async () => {
          const { count } = await supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", currentUserId)
            .or("is_read.eq.false,is_read.is.null");
          setUnreadNotifications(count || 0);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  if (!loading && myProfile && !myProfile.is_approved && !myProfile.is_admin) {
    return <div style={{ textAlign: "center", padding: "100px 20px", fontFamily: "sans-serif" }}>⏳ Tu cuenta espera aprobación de Pako-sensei...</div>;
  }

  const canSeePost = (p: any) => canSeePostForProfile(p, myProfile);

  const visiblePosts = posts.filter((p) => canSeePost(p));
  const totalVisiblePosts = allFeedRows.filter((p) => canSeePostForProfile(p, myProfile));
  const pinnedAnnouncementsBase = visiblePosts.filter(
    (p) =>
      p.profiles?.is_admin &&
      !p.parent_assignment_id &&
      (p.type === "announcement" || (p.type === "assignment" && isTaskAnnouncementSubtype(p.assignment_subtype))) &&
      !dismissedAnnouncements.includes(p.id),
  );
  const regularFeedBase = visiblePosts.filter(
    (p) =>
      !(
        p.profiles?.is_admin &&
        !p.parent_assignment_id &&
        (p.type === "announcement" || (p.type === "assignment" && isTaskAnnouncementSubtype(p.assignment_subtype))) &&
        !dismissedAnnouncements.includes(p.id)
      ),
  );
  const totalRegularFeedBase = totalVisiblePosts.filter(
    (p) =>
      !(
        p.profiles?.is_admin &&
        !p.parent_assignment_id &&
        (p.type === "announcement" || (p.type === "assignment" && isTaskAnnouncementSubtype(p.assignment_subtype))) &&
        !dismissedAnnouncements.includes(p.id)
      ),
  );

  const isTaskPost = (p: any) =>
    p?.type === "assignment" || Boolean(p?.parent_assignment_id);

  const pinnedAnnouncements = feedMode === "tasks"
    ? pinnedAnnouncementsBase.filter((p) => p.type === "assignment")
    : pinnedAnnouncementsBase;

  const regularFeedRaw = feedMode === "tasks"
    ? regularFeedBase.filter((p) => isTaskPost(p))
    : regularFeedBase;
  const regularFeed = regularFeedRaw;
  const totalFeedCount = feedMode === "tasks"
    ? totalRegularFeedBase.filter((p) => isTaskPost(p)).length
    : totalRegularFeedBase.length;

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', minHeight: "100vh", paddingBottom: "28px" }}>
      <header style={{ 
        display: "flex", justifyContent: "space-between", alignItems: "center", 
        padding: "14px 16px", borderBottom: "1px solid rgba(17,17,20,.08)", position: "sticky", 
        top: 0, background: "rgba(255,255,255,.88)", backdropFilter: "blur(12px)", zIndex: 20,
        boxShadow: "0 8px 30px rgba(0,0,0,.03)"
      }}>
        <Link
          href="/"
          onClick={(e) => {
            e.preventDefault();
            void softRefresh();
          }}
          style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", flexShrink: 1, minWidth: 0, textDecoration: "none" }}
        >
          <span style={{ fontSize: "10px", color: "#7f7f88", letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 700 }}>Nihongo Feed</span>
          <span style={{ fontSize: "28px", lineHeight: 1, fontWeight: 900, color: "#111114", letterSpacing: "-0.02em" }}>フィード</span>
        </Link>
        
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Link href="/write" style={{ background: "linear-gradient(135deg, #34c5a6, #25a98f)", color: "#fff", padding: "10px 20px", borderRadius: "999px", textDecoration: "none", fontSize: "14px", fontWeight: "700", boxShadow: "0 8px 18px rgba(44,182,150,.22)" }}>書く</Link>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            title="Menú"
            aria-label="Abrir menú"
            style={{ color: "#555", display: "inline-flex", alignItems: "center", justifyContent: "center", width: "38px", height: "38px", borderRadius: "999px", border: "1px solid rgba(17,17,20,.08)", background: "#fff", position: "relative" }}
          >
            <IconMenu />
            {unreadNotifications > 0 && (
              <span style={{ position: "absolute", top: "-6px", right: "-8px", backgroundColor: "#ff2d55", color: "#fff", fontSize: "10px", padding: "2px 5px", borderRadius: "10px", fontWeight: "bold", lineHeight: 1.2 }}>
                {unreadNotifications}
              </span>
            )}
          </button>
        </div>
      </header>

      <main style={{ paddingTop: "14px", background: "linear-gradient(to bottom, rgba(255,255,255,.8), rgba(255,255,255,.7))" }}>
        <section style={{ margin: "0 14px 14px", padding: "12px 14px", borderRadius: "16px", background: "#fff", border: "1px solid rgba(17,17,20,.07)", boxShadow: "0 10px 28px rgba(0,0,0,.03)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
            <div style={{ fontSize: "12px", color: "#777", background: "#f6f7f8", border: "1px solid rgba(17,17,20,.06)", borderRadius: "999px", padding: "6px 10px", fontWeight: 600 }}>
              {refreshing ? "actualizando..." : `${totalFeedCount} posts`}
            </div>
            <div style={{ display: "inline-flex", gap: 4, border: "1px solid rgba(17,17,20,.08)", borderRadius: 999, padding: 3, background: "#fff" }}>
              <button
                type="button"
                onClick={() => setFeedMode("all")}
                style={{
                  border: 0,
                  borderRadius: 999,
                  padding: "7px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  color: feedMode === "all" ? "#fff" : "#666a73",
                  background: feedMode === "all" ? "#111114" : "transparent",
                }}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFeedMode("tasks")}
                style={{
                  border: 0,
                  borderRadius: 999,
                  padding: "7px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  color: feedMode === "tasks" ? "#fff" : "#666a73",
                  background: feedMode === "tasks" ? "#111114" : "transparent",
                }}
              >
                Tareas
              </button>
            </div>
            <Link href="/study" style={{ textDecoration: "none", color: "#0f766e", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 999, padding: "7px 10px", fontSize: 12, fontWeight: 800 }}>
              Estudio
            </Link>
          </div>
        </section>

        <section style={{ margin: "0 14px 12px", padding: "14px 16px", borderRadius: 16, border: "1px solid rgba(17,17,20,.07)", background: "linear-gradient(140deg,#f7fffc,#ffffff)", boxShadow: "0 10px 24px rgba(0,0,0,.03)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "#0f766e", fontWeight: 800 }}>Estudio activo</div>
              <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800, color: "#111114", letterSpacing: "-.01em" }}>Kana Sprint, Flashcards y Quiz</div>
              <p style={{ margin: "6px 0 0", color: "#667085", fontSize: 13 }}>Practica diario con seguimiento y leaderboard.</p>
            </div>
            <Link href="/study?kana=1" style={{ textDecoration: "none", background: "linear-gradient(135deg,#34c5a6,#25a98f)", color: "#fff", borderRadius: 999, padding: "9px 14px", fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", boxShadow: "0 8px 18px rgba(44,182,150,.2)" }}>
              Entrar a Estudio
            </Link>
          </div>
        </section>

        {hasFreshPosts && (
          <section style={{ margin: "0 14px 12px", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(44,182,150,.24)", background: "#ecfdf5", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#0f766e", fontSize: 13, fontWeight: 700 }}>Hay publicaciones nuevas</span>
            <button
              type="button"
              onClick={() => void softRefresh()}
              style={{ border: "1px solid rgba(44,182,150,.35)", background: "#fff", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#0f766e" }}
            >
              Actualizar
            </button>
          </section>
        )}

        {pinnedAnnouncements.map(post => (
          <div key={post.id} style={{ margin: "0 14px 12px", padding: "16px 16px 14px 18px", borderRadius: "16px", backgroundColor: post.type === 'assignment' ? "#f2fffa" : "#f4fbff", border: "1px solid rgba(17,17,20,0.06)", position: "relative", boxShadow: "0 8px 24px rgba(0,0,0,.025)" }}>
            <div style={{ position: "absolute", left: "0", top: "12px", bottom: "12px", width: "4px", borderRadius: "0 6px 6px 0", background: post.type === "assignment" ? "#2cb696" : "#58a8ff" }} />
            <button onClick={() => { const newD = [...dismissedAnnouncements, post.id]; setDismissedAnnouncements(newD); localStorage.setItem("dismissed_posts", JSON.stringify(newD)); }} style={{ position: "absolute", top: "10px", right: "10px", background: "#fff", border: "1px solid rgba(17,17,20,.08)", color: "#8b8b93", cursor: "pointer", fontSize: "13px", width: "24px", height: "24px", borderRadius: "999px", lineHeight: 1 }}>✕</button>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "10px", fontSize: "11px", fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "#3d81ce" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "999px", background: "currentColor" }} />
              {post.type === "assignment" ? "Anuncio de tarea" : "Anuncio"}
            </div>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", lineHeight: 1.35, fontWeight: "800", color: "#222" }}>{getPostParts(post.content || "").title}</h3>
            <Link href={`/post/${post.id}`} style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#3d81ce", fontWeight: 700, textDecoration: "none", background: "#fff", border: "1px solid rgba(88,168,255,.2)", padding: "8px 10px", borderRadius: "999px" }}>Abrir anuncio</Link>
          </div>
        ))}

        <section style={{ margin: "0 14px", background: "#fff", borderRadius: "20px", border: "1px solid rgba(17,17,20,.06)", overflow: "hidden", boxShadow: "0 12px 34px rgba(0,0,0,.035)" }}>
        {regularFeed.map((post, idx) => {
          const { title: titulo, preview } = getPostParts(post.content || "");
          const edited = Boolean(
            post?.updated_at &&
              post?.created_at &&
              new Date(post.updated_at).getTime() - new Date(post.created_at).getTime() > 60_000,
          );
          const isAssignmentPost = post.type === "assignment" && !post.parent_assignment_id;
          const isForumAssignment = isAssignmentPost && (post.is_forum || isForumTaskSubtype(post.assignment_subtype));
          const isAssignedToMe = isPublicTargetGroup(post.target_group) || normalizeGroupValue(post.target_group) === normalizeGroupValue(myProfile?.group_name);
          const isForumAccent = isForumAssignment && isAssignedToMe;
          const isHighlightedTask = isAssignmentPost && (!isForumAssignment || isAssignedToMe);
          const rowBg = isHighlightedTask ? "#f6fffb" : idx % 2 === 0 ? "rgba(255,255,255,1)" : "rgba(251,251,252,1)";
          return (
            <article key={post.id} style={{ padding: "18px 16px", borderBottom: idx === regularFeed.length - 1 ? "none" : "1px solid rgba(17,17,20,.06)", display: "flex", gap: "14px", alignItems: "flex-start", background: rowBg }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center", minWidth: 0 }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", overflow: "hidden", background: "#f5f5f5", flexShrink: 0, border: "1px solid rgba(17,17,20,.06)" }}>
                    {post.profiles?.avatar_url ? (
                      <img src={post.profiles.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : <div style={{ textAlign: "center", fontSize: "12px", lineHeight: "26px", color: "#ccc" }}>👤</div>}
                  </div>
                  <Link href={`/profile/${post.user_id}`} style={{ textDecoration: "none", color: "#2b2b30", fontWeight: 700, fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "44%" }}>
                    {post.profiles?.is_admin ? "Sensei" : post.profiles?.username}
                  </Link>
                  <span style={{ width: "3px", height: "3px", borderRadius: "50%", background: "#b7b7bf", flexShrink: 0 }} />
                  <span style={{ color: "#7c7c85", fontSize: "12px", fontWeight: 500, whiteSpace: "nowrap" }}>{formatFeedDate(post.created_at)}</span>
                  {edited && <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 700, border: "1px solid #cbd5e1", padding: "1px 6px", borderRadius: "4px" }}>editado</span>}
                  {post.is_reviewed && <span style={{ fontSize: "10px", color: "#2cb696", fontWeight: "700", border: "1px solid #2cb696", padding: "1px 6px", borderRadius: "4px" }}>済 Sumi</span>}
                </div>
                <Link href={`/post/${post.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  {isAssignmentPost && (
                    <div style={{ marginBottom: "8px", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "10px", letterSpacing: ".06em", textTransform: "uppercase", fontWeight: 800, color: isForumAccent ? "#3d81ce" : isForumAssignment ? "#667085" : "#159578", background: isForumAccent ? "#eff6ff" : isForumAssignment ? "#f8fafc" : "#ecfdf5", border: `1px solid ${isForumAccent ? "#bfdbfe" : isForumAssignment ? "#e4e7ec" : "#bbf7d0"}`, borderRadius: "999px", padding: "4px 8px" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "999px", background: "currentColor" }} />
                      {isForumAssignment ? (isAssignedToMe ? "Tarea Foro" : "Foro Abierto") : "Tarea"}
                    </div>
                  )}
                  <h2 style={{ margin: "0 0 8px 0", fontSize: fontScale === "large" ? "18px" : "17px", fontWeight: 800, lineHeight: "1.35", color: "#17171b", letterSpacing: "-0.01em" }}>{titulo}</h2>
                  {preview && (
                    <p style={{ margin: 0, fontSize: fontScale === "large" ? "14.5px" : "13.5px", color: "#666a73", lineHeight: "1.55", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{preview}</p>
                  )}
                </Link>
                <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "8px", color: "#8a8a94", fontSize: "12px", fontWeight: 500 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ width: "14px", height: "14px", borderRadius: "999px", border: "1.4px solid currentColor", display: "inline-block" }} />
                    投稿
                  </span>
                  <span>·</span>
                  <span>{post.target_group || post.profiles?.group_name || "General"}</span>
                </div>
                {isAssignmentPost && (
                  <div style={{ marginTop: "10px" }}>
                    <Link href={isForumAssignment ? `/post/${post.id}` : `/write?assignment_id=${post.id}&title=${encodeURIComponent(titulo || "Tarea")}`} style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "12px", color: isForumAccent ? "#3d81ce" : isForumAssignment ? "#667085" : "#147f68", fontWeight: 700, textDecoration: "none", background: "#fff", border: `1px solid ${isForumAccent ? "rgba(61,129,206,.24)" : isForumAssignment ? "#e4e7ec" : "rgba(44,182,150,.2)"}`, padding: "7px 10px", borderRadius: "999px" }}>
                      {isForumAssignment ? "Entrar al foro" : "Entregar tarea"}
                    </Link>
                    {!post.parent_assignment_id && (
                      <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: submissionByAssignment[String(post.id)]?.submitted ? (submissionByAssignment[String(post.id)]?.late ? "#b45309" : "#147f68") : "#7c7c85", background: submissionByAssignment[String(post.id)]?.submitted ? (submissionByAssignment[String(post.id)]?.late ? "#fffbeb" : "#ecfdf5") : "#f8fafc", border: `1px solid ${submissionByAssignment[String(post.id)]?.submitted ? (submissionByAssignment[String(post.id)]?.late ? "#fde68a" : "#bbf7d0") : "#e2e8f0"}`, borderRadius: 999, padding: "4px 8px" }}>
                        {submissionByAssignment[String(post.id)]?.submitted ? (submissionByAssignment[String(post.id)]?.late ? "Entregada tardía" : "Entregada") : "Pendiente"}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {post.image_url && (
                <Link href={`/post/${post.id}`} style={{ flexShrink: 0, alignSelf: "center" }}>
                  <img src={post.image_url} style={{ width: "120px", height: "88px", borderRadius: "12px", objectFit: "cover", border: "1px solid rgba(17,17,20,.06)", boxShadow: "0 8px 20px rgba(0,0,0,.08)" }} />
                </Link>
              )}
            </article>
          );
        })}
        {hasMore && <div ref={loadMoreRef} style={{ height: 24 }} />}
        {loadingMore && <div style={{ padding: "8px 12px", color: "#7c7c85", fontSize: 12 }}>Cargando más...</div>}
        </section>
      </main>

      {menuOpen && (
        <>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.28)", border: 0, zIndex: 50 }}
            aria-label="Cerrar menú"
          />
          <aside style={{ position: "fixed", top: 0, right: 0, height: "100vh", width: "min(360px, 86vw)", background: "#fff", borderLeft: "1px solid rgba(17,17,20,.08)", zIndex: 60, padding: 16, display: "grid", gap: 12, alignContent: "start" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: 16 }}>Menú</strong>
              <button onClick={() => setMenuOpen(false)} style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 999, background: "#fff", padding: "6px 10px", cursor: "pointer" }}>Cerrar</button>
            </div>
            <Link href={`/profile/${myProfile?.id}`} onClick={() => setMenuOpen(false)} style={{ textDecoration: "none", color: "#222", border: "1px solid rgba(17,17,20,.08)", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}><AvatarPlaceholder size={18} /> Perfil</Link>
            <Link href="/resources" onClick={() => setMenuOpen(false)} style={{ textDecoration: "none", color: "#222", border: "1px solid rgba(17,17,20,.08)", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}><IconBook /> Recursos</Link>
            <Link href="/study" onClick={() => setMenuOpen(false)} style={{ textDecoration: "none", color: "#222", border: "1px solid rgba(17,17,20,.08)", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}><IconBook /> Estudio</Link>
            <Link href="/notifications" onClick={() => setMenuOpen(false)} style={{ textDecoration: "none", color: "#222", border: "1px solid rgba(17,17,20,.08)", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><IconBell /> Notificaciones</span>{unreadNotifications > 0 && <span style={{ background: "#ff2d55", color: "#fff", borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "2px 6px" }}>{unreadNotifications}</span>}</Link>
            {myProfile?.is_admin && <Link href="/admin/groups" onClick={() => setMenuOpen(false)} style={{ textDecoration: "none", color: "#222", border: "1px solid rgba(17,17,20,.08)", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}><IconSettings /> Panel maestro</Link>}
            <div style={{ border: "1px solid rgba(17,17,20,.08)", borderRadius: 12, padding: 10 }}>
              <div style={{ fontSize: 12, color: "#666a73", marginBottom: 6, fontWeight: 700 }}>Tamaño de texto</div>
              <div style={{ display: "inline-flex", gap: 4, border: "1px solid rgba(17,17,20,.08)", borderRadius: 999, padding: 3 }}>
                <button onClick={() => setFontScale("normal")} style={{ border: 0, borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700, color: fontScale === "normal" ? "#fff" : "#666a73", background: fontScale === "normal" ? "#111114" : "transparent" }}>Normal</button>
                <button onClick={() => setFontScale("large")} style={{ border: 0, borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700, color: fontScale === "large" ? "#fff" : "#666a73", background: fontScale === "large" ? "#111114" : "transparent" }}>Grande</button>
              </div>
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              style={{ border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 12, padding: "10px 12px", background: "#fff", textAlign: "left", cursor: "pointer" }}
            >
              Cerrar sesión
            </button>
          </aside>
        </>
      )}
    </div>
  );
}
