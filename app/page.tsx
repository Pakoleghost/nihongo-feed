"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function IconSpark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function IconCards() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="6" width="14" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10h6M8 13h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8.5 4h9A2.5 2.5 0 0 1 20 6.5V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconTarget() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
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

function getLocalWeekStart(date = new Date()) {
  const value = new Date(date);
  const day = value.getDay();
  const diff = day === 0 ? 6 : day - 1;
  value.setHours(0, 0, 0, 0);
  value.setDate(value.getDate() - diff);
  return value;
}

function getNextLocalWeekStart(date = new Date()) {
  const start = getLocalWeekStart(date);
  start.setDate(start.getDate() + 7);
  return start;
}

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}

function parseDismissedList(raw: string | null) {
  if (!raw) return [] as string[];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [] as string[];
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [] as string[];
  }
}

function safeStorageGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

type HomeKanaMode = "hiragana" | "katakana";
type HomeKanaRow = {
  user_id: string;
  mode: HomeKanaMode;
  best_score: number;
  profiles?: { username?: string | null; full_name?: string | null } | null;
};

function homeRankBadgeStyles(index: number) {
  if (index === 0) return { bg: "linear-gradient(135deg,#fbbf24,#f59e0b)", border: "#f59e0b", color: "#111114" };
  if (index === 1) return { bg: "linear-gradient(135deg,#d1d5db,#9ca3af)", border: "#9ca3af", color: "#111114" };
  if (index === 2) return { bg: "linear-gradient(135deg,#f59e0b,#b45309)", border: "#b45309", color: "#fff" };
  return { bg: "#fff", border: "#d1d5db", color: "#6b7280" };
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
  const [homeKanaLeaders, setHomeKanaLeaders] = useState<Record<HomeKanaMode, HomeKanaRow[]>>({ hiragana: [], katakana: [] });
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [weeklyResetLabel, setWeeklyResetLabel] = useState("");
  const [studyExpanded, setStudyExpanded] = useState(false);
  const inFlightRef = useRef(false);
  const homeWeekKeyRef = useRef(getLocalWeekStart().toISOString().slice(0, 10));
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

      if (prof?.is_admin) {
        const { count: pendingCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("is_approved", false);
        setPendingApprovalsCount(pendingCount || 0);
      } else {
        setPendingApprovalsCount(0);
      }

      const { data: kanaRows } = await supabase
        .from("study_kana_scores")
        .select("user_id, mode, best_score, profiles:user_id (username, full_name)")
        .gte("updated_at", getLocalWeekStart().toISOString())
        .order("best_score", { ascending: false })
        .order("updated_at", { ascending: true })
        .limit(120);
      const parsedRows = (kanaRows || []) as HomeKanaRow[];
      setHomeKanaLeaders({
        hiragana: parsedRows.filter((row) => row.mode === "hiragana").slice(0, 3),
        katakana: parsedRows.filter((row) => row.mode === "katakana").slice(0, 3),
      });

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
    }
    inFlightRef.current = false;
    setLoading(false);
    setRefreshing(false);
  }, [router]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const weekKey = getLocalWeekStart(now).toISOString().slice(0, 10);
      if (homeWeekKeyRef.current !== weekKey) {
        homeWeekKeyRef.current = weekKey;
        void fetchData({ silent: true });
      }
      const next = getNextLocalWeekStart(now);
      setWeeklyResetLabel(formatCountdown(next.getTime() - now.getTime()));
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
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
    const scopedKey = `dismissed_posts:${currentUserId}`;
    const scoped = parseDismissedList(safeStorageGet(scopedKey));
    const legacy = parseDismissedList(safeStorageGet("dismissed_posts"));
    const merged = Array.from(new Set([...legacy, ...scoped]));
    setDismissedAnnouncements(merged);
    safeStorageSet(scopedKey, JSON.stringify(merged));
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    const scopedKey = `dismissed_posts:${currentUserId}`;
    const deduped = Array.from(new Set(dismissedAnnouncements.map((id) => String(id))));
    safeStorageSet(scopedKey, JSON.stringify(deduped));
  }, [dismissedAnnouncements, currentUserId]);

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
  const dismissedSet = useMemo(() => new Set(dismissedAnnouncements.map((id) => String(id))), [dismissedAnnouncements]);
  const pinnedAnnouncementsBase = visiblePosts.filter(
    (p) =>
      p.profiles?.is_admin &&
      !p.parent_assignment_id &&
      (p.type === "announcement" || (p.type === "assignment" && isTaskAnnouncementSubtype(p.assignment_subtype))) &&
      !dismissedSet.has(String(p.id)),
  );
  const regularFeedBase = visiblePosts.filter(
    (p) =>
      !(
        p.profiles?.is_admin &&
        !p.parent_assignment_id &&
        (p.type === "announcement" || (p.type === "assignment" && isTaskAnnouncementSubtype(p.assignment_subtype))) &&
        !dismissedSet.has(String(p.id))
      ),
  );
  const totalRegularFeedBase = totalVisiblePosts.filter(
    (p) =>
      !(
        p.profiles?.is_admin &&
        !p.parent_assignment_id &&
        (p.type === "announcement" || (p.type === "assignment" && isTaskAnnouncementSubtype(p.assignment_subtype))) &&
        !dismissedSet.has(String(p.id))
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
  const studyTools = [
    {
      href: "/study?view=exam",
      label: "Exámenes",
      desc: "20 preguntas por lección.",
      tone: "#FFF8E7",
      accent: "#E63946",
      icon: <IconTarget />,
    },
    {
      href: "/study?view=flashcards",
      label: "Flashcards",
      desc: "Repaso rápido por deck.",
      tone: "#FFF8E7",
      accent: "#4ECDC4",
      icon: <IconCards />,
    },
    {
      href: "/study?view=kana",
      label: "Kana Sprint",
      desc: "Ranking semanal.",
      tone: "#FFF8E7",
      accent: "#F4A261",
      icon: <IconSpark />,
    },
    {
      href: "/study?view=sprint",
      label: "Vocab+Kanji Sprint",
      desc: "Ranking mensual.",
      tone: "#FFF8E7",
      accent: "#457B9D",
      icon: <IconBook />,
    },
  ];

  return (
    <div className="homePage">
      <div className="homeShell">
        <header className="homeHeader">
          <Link
            href="/"
            onClick={(e) => {
              e.preventDefault();
              void softRefresh();
            }}
            className="brandBlock"
          >
            <span className="brandKicker">Nihongo Feed</span>
            <span className="brandTitle">フィード</span>
          </Link>

          <div className="headerActions">
            <Link href="/write" className="writeButton">書く</Link>
            <button type="button" onClick={() => setMenuOpen(true)} className="iconButton" aria-label="Abrir menú">
              <IconMenu />
              {unreadNotifications > 0 && <span className="notifDot">{unreadNotifications > 9 ? "9+" : unreadNotifications}</span>}
            </button>
          </div>
        </header>

        <main className="homeMain">
          <section className="feedControlCard">
            <div className="feedControlRow">
              <div>
                <div className="sectionKicker">Home</div>
                <h1 className="feedHeading">Tu feed</h1>
              </div>
              <div className="feedStats">{refreshing ? "Actualizando..." : `${totalFeedCount}`}</div>
            </div>
            <div className="segmentedControl">
              <button type="button" onClick={() => setFeedMode("all")} className={feedMode === "all" ? "active" : ""}>Todo</button>
              <button type="button" onClick={() => setFeedMode("tasks")} className={feedMode === "tasks" ? "active" : ""}>Tareas</button>
            </div>
          </section>

          <section className="studyCard">
            <div className="studyHeader">
              <div>
                <div className="sectionKicker accentTurquoise">Estudio</div>
                <h2 className="studyTitle">Herramientas rápidas</h2>
              </div>
              <div className="studyActions">
                <Link href="/study" className="studyOpenButton">Abrir</Link>
                <button type="button" onClick={() => setStudyExpanded((prev) => !prev)} className="studyGhostButton">
                  {studyExpanded ? "Menos" : "Ranking"}
                </button>
              </div>
            </div>

            <div className="toolGrid">
              {studyTools.map((tool) => (
                <Link key={tool.href} href={tool.href} className="toolCard">
                  <span className="toolIcon" style={{ color: tool.accent, borderColor: `${tool.accent}33` }}>{tool.icon}</span>
                  <span className="toolCopy">
                    <strong>{tool.label}</strong>
                    <small>{tool.desc}</small>
                  </span>
                </Link>
              ))}
            </div>

            {studyExpanded && (
              <div className="leaderboardWrap">
                <div className="leaderboardHead">
                  <span>Reset kana en {weeklyResetLabel || "..."}</span>
                  <Link href="/study?view=kana">Jugar</Link>
                </div>
                <div className="leaderboardGrid">
                  {(["hiragana", "katakana"] as HomeKanaMode[]).map((mode) => (
                    <div key={mode} className="leaderboardCard">
                      <div className="leaderboardLabel">{mode}</div>
                      <div className="leaderboardList">
                        {(homeKanaLeaders[mode] || []).map((row, index) => (
                          <div key={`${mode}-${row.user_id}-${index}`} className="leaderboardRow">
                            <span className="leaderboardUser">
                              <span
                                className="leaderboardRank"
                                style={{
                                  borderColor: homeRankBadgeStyles(index).border,
                                  background: homeRankBadgeStyles(index).bg,
                                  color: homeRankBadgeStyles(index).color,
                                }}
                              >
                                {index + 1}
                              </span>
                              <span className="leaderboardName">{row.profiles?.username || row.profiles?.full_name || "usuario"}</span>
                            </span>
                            <strong>{row.best_score}</strong>
                          </div>
                        ))}
                        {(homeKanaLeaders[mode] || []).length === 0 && <div className="leaderboardEmpty">Sin puntajes</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {hasFreshPosts && (
            <section className="refreshBanner">
              <span>Hay publicaciones nuevas</span>
              <button type="button" onClick={() => void softRefresh()}>Actualizar</button>
            </section>
          )}

          {pinnedAnnouncements.map((post) => (
            <section key={post.id} className={`announceCard ${post.type === "assignment" ? "task" : "info"}`}>
              <button
                type="button"
                onClick={() => {
                  const id = String(post.id);
                  setDismissedAnnouncements((prev) => (prev.includes(id) ? prev : [...prev, id]));
                }}
                className="dismissButton"
                aria-label="Cerrar anuncio"
              >
                ✕
              </button>
              <div className="announceKicker">{post.type === "assignment" ? "Anuncio de tarea" : "Anuncio"}</div>
              <h3>{getPostParts(post.content || "").title}</h3>
              <Link href={`/post/${post.id}`}>Abrir</Link>
            </section>
          ))}

          <section className="feedStack">
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

              return (
                <article key={post.id} className={`feedCard ${isAssignmentPost ? "taskCard" : ""} ${idx === 0 ? "firstCard" : ""}`}>
                  <div className="feedCardMain">
                    <div className="postHeader">
                      <div className="avatarMini">
                        {post.profiles?.avatar_url ? (
                          <img src={post.profiles.avatar_url} alt="" />
                        ) : (
                          <AvatarPlaceholder size={30} />
                        )}
                      </div>
                      <div className="postHeaderCopy">
                        <div className="authorRow">
                          <Link href={`/profile/${post.user_id}`}>{post.profiles?.is_admin ? "Sensei" : post.profiles?.username}</Link>
                          <span className="dotSep" />
                          <span>{formatFeedDate(post.created_at)}</span>
                          {edited && <span className="tinyTag neutral">editado</span>}
                          {post.is_reviewed && <span className="tinyTag mint">済 Sumi</span>}
                        </div>
                      </div>
                    </div>

                    <Link href={`/post/${post.id}`} className="cardLinkBlock">
                      {isAssignmentPost && (
                        <span className={`postTypeTag ${isForumAccent ? "forum" : "task"}`}>
                          {isForumAssignment ? (isAssignedToMe ? "Tarea foro" : "Foro abierto") : "Tarea"}
                        </span>
                      )}
                      <h2 className={`postTitle ${fontScale === "large" ? "large" : ""}`}>{titulo}</h2>
                      {preview && <p className={`postPreview ${fontScale === "large" ? "large" : ""}`}>{preview}</p>}
                    </Link>

                    <div className="postFooter">
                      <span>{post.target_group || post.profiles?.group_name || "General"}</span>
                      {isAssignmentPost && (
                        <div className="taskActions">
                          <Link href={isForumAssignment ? `/post/${post.id}` : `/write?assignment_id=${post.id}&title=${encodeURIComponent(titulo || "Tarea")}`}>
                            {isForumAssignment ? "Entrar" : "Entregar"}
                          </Link>
                          {!post.parent_assignment_id && (
                            <span className={`statusPill ${submissionByAssignment[String(post.id)]?.submitted ? (submissionByAssignment[String(post.id)]?.late ? "late" : "done") : "pending"}`}>
                              {submissionByAssignment[String(post.id)]?.submitted
                                ? submissionByAssignment[String(post.id)]?.late
                                  ? "Tardía"
                                  : "Entregada"
                                : "Pendiente"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {post.image_url && (
                    <Link href={`/post/${post.id}`} className="feedThumb">
                      <img src={post.image_url} alt="" />
                    </Link>
                  )}
                </article>
              );
            })}
            {hasMore && <div ref={loadMoreRef} style={{ height: 24 }} />}
            {loadingMore && <div className="loadingMore">Cargando más...</div>}
          </section>
        </main>
      </div>

      {menuOpen && (
        <>
          <button type="button" onClick={() => setMenuOpen(false)} className="menuBackdrop" aria-label="Cerrar menú" />
          <aside className="menuPanel">
            <div className="menuHead">
              <strong>Menú</strong>
              <button type="button" onClick={() => setMenuOpen(false)}>Cerrar</button>
            </div>
            <div className="menuList">
              <Link href={`/profile/${myProfile?.id}`} onClick={() => setMenuOpen(false)} className="menuLink">
                <AvatarPlaceholder size={18} /> Perfil
              </Link>
              <Link href="/resources" onClick={() => setMenuOpen(false)} className="menuLink">
                <IconBook /> Recursos
              </Link>
              <Link href="/notifications" onClick={() => setMenuOpen(false)} className="menuLink split">
                <span className="menuLabel"><IconBell /> Notificaciones</span>
                {unreadNotifications > 0 && <span className="menuBadge">{unreadNotifications}</span>}
              </Link>
              {myProfile?.is_admin && (
                <Link href="/admin/groups" onClick={() => setMenuOpen(false)} className="menuLink split">
                  <span className="menuLabel"><IconSettings /> Panel maestro</span>
                  {pendingApprovalsCount > 0 && <span className="menuBadge">{pendingApprovalsCount > 99 ? "99+" : pendingApprovalsCount}</span>}
                </Link>
              )}
            </div>

            <div className="menuSection">
              <div className="menuSectionTitle">Estudio</div>
              <div className="menuList">
                {studyTools.map((tool) => (
                  <Link key={`menu-${tool.href}`} href={tool.href} onClick={() => setMenuOpen(false)} className="menuLink">
                    {tool.icon} {tool.label}
                  </Link>
                ))}
                {myProfile?.is_admin && (
                  <Link href="/study?view=dictionary" onClick={() => setMenuOpen(false)} className="menuLink">
                    <IconBook /> Diccionario
                  </Link>
                )}
              </div>
            </div>

            <div className="menuSection">
              <div className="menuSectionTitle">Texto</div>
              <div className="segmentedControl panelSegmented">
                <button type="button" onClick={() => setFontScale("normal")} className={fontScale === "normal" ? "active" : ""}>Normal</button>
                <button type="button" onClick={() => setFontScale("large")} className={fontScale === "large" ? "active" : ""}>Grande</button>
              </div>
            </div>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              className="logoutButton"
            >
              Cerrar sesión
            </button>
          </aside>
        </>
      )}

      <style jsx>{`
        .homePage {
          min-height: 100vh;
          background:
            radial-gradient(900px 460px at 50% -10%, rgba(78, 205, 196, 0.18), transparent 60%),
            linear-gradient(180deg, #fff8e7 0%, #fffdf8 46%, #fff8e7 100%);
          color: #1a1a2e;
        }
        .homeShell {
          width: min(100%, 760px);
          margin: 0 auto;
          padding: 0 14px 28px;
        }
        .homeHeader {
          position: sticky;
          top: 0;
          z-index: 30;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 18px 0 14px;
          background: linear-gradient(180deg, rgba(255, 248, 231, 0.96), rgba(255, 248, 231, 0.82));
          backdrop-filter: blur(10px);
        }
        .brandBlock {
          text-decoration: none;
          color: inherit;
          min-width: 0;
          display: grid;
          gap: 3px;
        }
        .brandKicker {
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #457b9d;
          font-weight: 800;
        }
        .brandTitle {
          font-size: 28px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: #1a1a2e;
        }
        .headerActions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .writeButton,
        .studyOpenButton,
        .studyGhostButton,
        .iconButton,
        .dismissButton,
        .menuHead button,
        .logoutButton {
          appearance: none;
          border: 0;
          font: inherit;
        }
        .writeButton {
          min-height: 42px;
          padding: 0 18px;
          border-radius: 999px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #e63946;
          color: #fff8e7;
          font-size: 14px;
          font-weight: 800;
          box-shadow: 0 10px 22px rgba(230, 57, 70, 0.2);
        }
        .iconButton {
          position: relative;
          width: 42px;
          height: 42px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.88);
          color: #1a1a2e;
          border: 1px solid rgba(26, 26, 46, 0.08);
          cursor: pointer;
        }
        .notifDot {
          position: absolute;
          top: -4px;
          right: -4px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 999px;
          background: #e63946;
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 800;
        }
        .homeMain {
          display: grid;
          gap: 12px;
        }
        .feedControlCard,
        .studyCard,
        .announceCard,
        .feedCard {
          border-radius: 22px;
          border: 1px solid rgba(26, 26, 46, 0.08);
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 14px 34px rgba(26, 26, 46, 0.05);
        }
        .feedControlCard {
          padding: 18px;
          display: grid;
          gap: 14px;
        }
        .feedControlRow,
        .studyHeader,
        .leaderboardHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .sectionKicker {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #e63946;
        }
        .accentTurquoise {
          color: #4ecdc4;
        }
        .feedHeading,
        .studyTitle {
          margin: 4px 0 0;
          font-size: clamp(24px, 5vw, 34px);
          line-height: 0.98;
          color: #1a1a2e;
          letter-spacing: -0.03em;
        }
        .feedStats {
          min-width: 54px;
          height: 42px;
          padding: 0 16px;
          border-radius: 999px;
          background: #1a1a2e;
          color: #fff8e7;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 800;
        }
        .segmentedControl {
          display: inline-flex;
          gap: 4px;
          padding: 4px;
          border-radius: 999px;
          background: rgba(26, 26, 46, 0.06);
          width: fit-content;
        }
        .segmentedControl button {
          border: 0;
          background: transparent;
          min-height: 38px;
          padding: 0 14px;
          border-radius: 999px;
          color: #4d5162;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }
        .segmentedControl button.active {
          background: #fff;
          color: #1a1a2e;
          box-shadow: 0 4px 12px rgba(26, 26, 46, 0.08);
        }
        .studyCard {
          padding: 18px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(255, 248, 231, 0.9)),
            #fff;
          display: grid;
          gap: 14px;
        }
        .studyActions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .studyOpenButton,
        .studyGhostButton {
          min-height: 38px;
          padding: 0 14px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .studyOpenButton {
          background: #4ecdc4;
          color: #1a1a2e;
        }
        .studyGhostButton {
          background: rgba(26, 26, 46, 0.06);
          color: #1a1a2e;
        }
        .toolGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .toolCard {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          border-radius: 18px;
          text-decoration: none;
          color: #1a1a2e;
          background: #fff8e7;
          border: 1px solid rgba(26, 26, 46, 0.07);
        }
        .toolIcon {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          background: #fff;
          border: 1px solid;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .toolCopy {
          display: grid;
          gap: 2px;
          min-width: 0;
        }
        .toolCopy strong {
          font-size: 14px;
          line-height: 1.2;
        }
        .toolCopy small {
          font-size: 12px;
          color: #606579;
          line-height: 1.35;
        }
        .leaderboardWrap {
          padding-top: 4px;
          border-top: 1px dashed rgba(26, 26, 46, 0.12);
          display: grid;
          gap: 10px;
        }
        .leaderboardHead span {
          font-size: 12px;
          color: #606579;
          font-weight: 700;
        }
        .leaderboardHead a {
          min-height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          background: #1a1a2e;
          color: #fff8e7;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
        }
        .leaderboardGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .leaderboardCard {
          padding: 12px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(26, 26, 46, 0.07);
        }
        .leaderboardLabel {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #457b9d;
        }
        .leaderboardList {
          margin-top: 10px;
          display: grid;
          gap: 8px;
        }
        .leaderboardRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          font-size: 12px;
        }
        .leaderboardUser {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .leaderboardRank {
          min-width: 20px;
          height: 20px;
          border-radius: 999px;
          border: 1px solid;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 5px;
          font-size: 10px;
          font-weight: 800;
          flex-shrink: 0;
        }
        .leaderboardName {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .leaderboardEmpty {
          font-size: 12px;
          color: #8e93a5;
        }
        .refreshBanner {
          padding: 12px 14px;
          border-radius: 18px;
          background: rgba(78, 205, 196, 0.14);
          border: 1px solid rgba(78, 205, 196, 0.35);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }
        .refreshBanner span {
          font-size: 13px;
          font-weight: 800;
          color: #1a1a2e;
        }
        .refreshBanner button {
          border: 0;
          min-height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          background: #fff;
          color: #1a1a2e;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }
        .announceCard {
          position: relative;
          padding: 18px;
          display: grid;
          gap: 12px;
        }
        .announceCard.task {
          background: linear-gradient(135deg, rgba(78, 205, 196, 0.16), rgba(255, 255, 255, 0.94));
        }
        .announceCard.info {
          background: linear-gradient(135deg, rgba(69, 123, 157, 0.13), rgba(255, 255, 255, 0.94));
        }
        .announceKicker {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #e63946;
        }
        .announceCard h3 {
          margin: 0;
          font-size: 18px;
          line-height: 1.3;
          color: #1a1a2e;
        }
        .announceCard a {
          width: fit-content;
          min-height: 36px;
          padding: 0 14px;
          border-radius: 999px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #1a1a2e;
          color: #fff8e7;
          font-size: 13px;
          font-weight: 800;
        }
        .dismissButton {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 30px;
          height: 30px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.9);
          color: #6d7284;
          cursor: pointer;
        }
        .feedStack {
          display: grid;
          gap: 12px;
        }
        .feedCard {
          padding: 16px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 116px;
          gap: 14px;
          align-items: center;
        }
        .taskCard {
          background: linear-gradient(180deg, rgba(78, 205, 196, 0.08), rgba(255, 255, 255, 0.92));
        }
        .feedCardMain {
          min-width: 0;
          display: grid;
          gap: 10px;
        }
        .postHeader {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .avatarMini {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          overflow: hidden;
          border: 1px solid rgba(26, 26, 46, 0.08);
          background: #fff;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }
        .avatarMini img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .postHeaderCopy {
          min-width: 0;
        }
        .authorRow {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
          color: #656a7b;
          font-size: 12px;
          font-weight: 700;
        }
        .authorRow a {
          text-decoration: none;
          color: #1a1a2e;
          font-weight: 800;
        }
        .dotSep {
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: #aab0c0;
        }
        .tinyTag {
          min-height: 18px;
          padding: 0 7px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 800;
        }
        .tinyTag.neutral {
          background: rgba(26, 26, 46, 0.06);
          color: #5f6577;
        }
        .tinyTag.mint {
          background: rgba(78, 205, 196, 0.16);
          color: #1a1a2e;
        }
        .cardLinkBlock {
          display: grid;
          gap: 8px;
          text-decoration: none;
          color: inherit;
        }
        .postTypeTag {
          width: fit-content;
          min-height: 24px;
          padding: 0 10px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .postTypeTag.task {
          background: rgba(78, 205, 196, 0.16);
          color: #1a1a2e;
        }
        .postTypeTag.forum {
          background: rgba(69, 123, 157, 0.14);
          color: #1a1a2e;
        }
        .postTitle {
          margin: 0;
          color: #1a1a2e;
          font-size: 18px;
          line-height: 1.28;
          font-weight: 850;
          letter-spacing: -0.02em;
        }
        .postTitle.large {
          font-size: 19px;
        }
        .postPreview {
          margin: 0;
          color: #5b6072;
          font-size: 13.5px;
          line-height: 1.55;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .postPreview.large {
          font-size: 14.5px;
        }
        .postFooter {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          font-size: 12px;
          color: #74798a;
          font-weight: 700;
        }
        .taskActions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .taskActions a {
          min-height: 32px;
          padding: 0 12px;
          border-radius: 999px;
          background: #1a1a2e;
          color: #fff8e7;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
        }
        .statusPill {
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
        }
        .statusPill.done {
          background: rgba(78, 205, 196, 0.16);
          color: #1a1a2e;
        }
        .statusPill.late {
          background: rgba(244, 162, 97, 0.2);
          color: #8c4d17;
        }
        .statusPill.pending {
          background: rgba(26, 26, 46, 0.06);
          color: #5e6476;
        }
        .feedThumb {
          width: 116px;
          height: 96px;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid rgba(26, 26, 46, 0.08);
          display: block;
          flex-shrink: 0;
        }
        .feedThumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .loadingMore {
          padding: 6px 8px;
          color: #767b8b;
          font-size: 12px;
          font-weight: 700;
        }
        .menuBackdrop {
          position: fixed;
          inset: 0;
          background: rgba(26, 26, 46, 0.3);
          border: 0;
          z-index: 50;
        }
        .menuPanel {
          position: fixed;
          top: 0;
          right: 0;
          width: min(360px, 88vw);
          height: 100vh;
          z-index: 60;
          background: #fff8e7;
          border-left: 1px solid rgba(26, 26, 46, 0.08);
          padding: 18px 16px;
          display: grid;
          align-content: start;
          gap: 14px;
          overflow-y: auto;
        }
        .menuHead {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }
        .menuHead strong {
          font-size: 18px;
          color: #1a1a2e;
        }
        .menuHead button {
          min-height: 36px;
          padding: 0 12px;
          border-radius: 999px;
          background: rgba(26, 26, 46, 0.06);
          color: #1a1a2e;
          cursor: pointer;
        }
        .menuSection {
          display: grid;
          gap: 8px;
        }
        .menuSectionTitle {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #457b9d;
        }
        .menuList {
          display: grid;
          gap: 8px;
        }
        .menuLink {
          min-height: 46px;
          padding: 0 14px;
          border-radius: 16px;
          border: 1px solid rgba(26, 26, 46, 0.07);
          background: rgba(255, 255, 255, 0.88);
          color: #1a1a2e;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 700;
        }
        .menuLink.split {
          justify-content: space-between;
        }
        .menuLabel {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }
        .menuBadge {
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          border-radius: 999px;
          background: #e63946;
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 800;
        }
        .panelSegmented {
          width: 100%;
        }
        .panelSegmented button {
          flex: 1 1 0;
        }
        .logoutButton {
          min-height: 46px;
          border-radius: 16px;
          background: rgba(230, 57, 70, 0.1);
          color: #a92b36;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }
        @media (max-width: 640px) {
          .homeShell {
            padding: 0 12px 24px;
          }
          .feedControlCard,
          .studyCard,
          .announceCard,
          .feedCard {
            border-radius: 18px;
          }
          .feedControlCard,
          .studyCard,
          .announceCard,
          .feedCard {
            padding-left: 14px;
            padding-right: 14px;
          }
          .toolGrid,
          .leaderboardGrid {
            grid-template-columns: 1fr;
          }
          .feedCard {
            grid-template-columns: minmax(0, 1fr) 92px;
            gap: 12px;
            padding-top: 14px;
            padding-bottom: 14px;
          }
          .feedThumb {
            width: 92px;
            height: 84px;
            border-radius: 14px;
          }
        }
        @media (max-width: 480px) {
          .homeHeader {
            padding-top: 14px;
          }
          .brandTitle {
            font-size: 26px;
          }
          .feedHeading,
          .studyTitle {
            font-size: 28px;
          }
          .feedControlRow,
          .studyHeader,
          .leaderboardHead {
            align-items: flex-start;
          }
          .segmentedControl,
          .panelSegmented {
            width: 100%;
          }
          .segmentedControl button,
          .panelSegmented button {
            flex: 1 1 0;
          }
          .feedCard {
            grid-template-columns: minmax(0, 1fr);
          }
          .feedThumb {
            width: 100%;
            height: 180px;
          }
          .postFooter {
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
