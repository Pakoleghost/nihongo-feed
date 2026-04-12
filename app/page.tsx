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
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
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

      if (prof?.is_admin) {
        const { count: pendingCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("is_approved", false);
        setPendingApprovalsCount(pendingCount || 0);
      } else {
        setPendingApprovalsCount(0);
      }

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
  const rootAssignments = regularFeedBase.filter((p) => p.type === "assignment" && !p.parent_assignment_id);
  const taskCards = rootAssignments
    .map((post) => {
      const { title, preview } = getPostParts(post.content || "");
      const submission = submissionByAssignment[String(post.id)];
      const isForum = Boolean(post.is_forum || isForumTaskSubtype(post.assignment_subtype));
      return {
        id: String(post.id),
        title: title || "Tarea",
        preview,
        href: isForum ? `/post/${post.id}` : `/write?assignment_id=${post.id}&title=${encodeURIComponent(title || "Tarea")}`,
        cta: isForum ? "Entrar" : "Resolver",
        submitted: Boolean(submission?.submitted),
        late: Boolean(submission?.late),
        group: isPublicTargetGroup(post.target_group) ? "General" : post.target_group || post.profiles?.group_name || "General",
      };
    })
    .sort((a, b) => Number(a.submitted) - Number(b.submitted))
    .slice(0, 4);
  const pendingTaskCount = taskCards.filter((task) => !task.submitted).length;
  const announcementCount = pinnedAnnouncements.length;

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
            <Link href="/study" className="ghostButton">Estudio</Link>
            <Link href="/write" className="writeButton">書く</Link>
            <button type="button" onClick={() => setMenuOpen(true)} className="iconButton" aria-label="Abrir menú">
              <IconMenu />
              {unreadNotifications > 0 && <span className="notifDot">{unreadNotifications > 9 ? "9+" : unreadNotifications}</span>}
            </button>
          </div>
        </header>

        <main className="homeMain">
          <section className="heroPanel">
            <div className="heroCopy">
              <div className="sectionKicker">Centro de estudio</div>
              <h1 className="heroTitle">Estudia sin perderte</h1>
              <p className="heroText">Tus herramientas, tareas y recursos en un solo lugar.</p>
            </div>
            <div className="heroStats">
              <div className="heroStat">
                <span>Pendientes</span>
                <strong>{pendingTaskCount}</strong>
              </div>
              <div className="heroStat mint">
                <span>Anuncios</span>
                <strong>{announcementCount}</strong>
              </div>
              <div className="heroStat blue">
                <span>Recursos</span>
                <strong>→</strong>
              </div>
            </div>
            <div className="heroActions">
              <Link href="/study" className="primaryAction">Abrir estudio</Link>
              <Link href="/resources" className="secondaryAction">Ver recursos</Link>
            </div>
          </section>

          {hasFreshPosts && (
            <section className="refreshBanner">
              <span>Hay actualizaciones nuevas</span>
              <button type="button" onClick={() => void softRefresh()}>Actualizar</button>
            </section>
          )}

          <section className="shortcutGrid">
            <Link href="/study?view=flashcards" className="shortcutCard accentRed">
              <span className="shortcutIcon"><IconCards /></span>
              <div>
                <strong>Flashcards</strong>
                <small>Repasa por deck</small>
              </div>
            </Link>
            <Link href="/study?view=exam" className="shortcutCard accentMint">
              <span className="shortcutIcon"><IconTarget /></span>
              <div>
                <strong>Exámenes</strong>
                <small>Autoevaluación</small>
              </div>
            </Link>
            <Link href="/study?view=kana" className="shortcutCard accentOrange">
              <span className="shortcutIcon"><IconSpark /></span>
              <div>
                <strong>Kana Sprint</strong>
                <small>Velocidad semanal</small>
              </div>
            </Link>
            <Link href="/resources" className="shortcutCard accentBlue">
              <span className="shortcutIcon"><IconBook /></span>
              <div>
                <strong>Recursos</strong>
                <small>Material y tareas</small>
              </div>
            </Link>
          </section>

          <section className="dashboardPanel">
            <div className="panelHead">
              <div>
                <div className="sectionKicker">Tareas</div>
                <h2>Lo importante</h2>
              </div>
              <Link href="/resources">Abrir recursos</Link>
            </div>
            <div className="taskList">
              {taskCards.map((task) => (
                <article key={task.id} className="taskCard">
                  <div className="taskDot" />
                  <div className="taskCopy">
                    <strong>{task.title}</strong>
                    {task.preview && <p>{task.preview}</p>}
                    <div className="taskMetaLine">
                      <span>{task.group}</span>
                      <span className={`statusPill ${task.submitted ? (task.late ? "late" : "done") : "pending"}`}>
                        {task.submitted ? (task.late ? "Tardía" : "Entregada") : "Pendiente"}
                      </span>
                    </div>
                  </div>
                  <Link href={task.href} className="taskLink">{task.cta}</Link>
                </article>
              ))}
              {taskCards.length === 0 && (
                <div className="emptyFeed">
                  <strong>No hay tareas activas.</strong>
                  <span>Cuando tengas una nueva, aparecerá aquí.</span>
                </div>
              )}
            </div>
          </section>

          {pinnedAnnouncements.length > 0 && (
            <section className="dashboardPanel">
              <div className="panelHead">
                <div>
                  <div className="sectionKicker">Avisos</div>
                  <h2>Novedades</h2>
                </div>
              </div>
              <div className="noticeList">
                {pinnedAnnouncements.slice(0, 3).map((post) => (
                  <article key={post.id} className={`noticeRow ${post.type === "assignment" ? "task" : "info"}`}>
                    <div className="noticeCopy">
                      <strong>{getPostParts(post.content || "").title}</strong>
                      <span>{post.type === "assignment" ? "Tarea nueva" : "Aviso del curso"}</span>
                    </div>
                    <div className="noticeActions">
                      <Link href={`/post/${post.id}`}>Abrir</Link>
                      <button
                        type="button"
                        onClick={() => {
                          const id = String(post.id);
                          setDismissedAnnouncements((prev) => (prev.includes(id) ? prev : [...prev, id]));
                        }}
                        className="dismissNotice"
                        aria-label="Cerrar aviso"
                      >
                        ✕
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
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
              <Link href="/study" onClick={() => setMenuOpen(false)} className="menuLink">
                <IconSpark /> Estudio
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
                <Link href="/study?view=exam" onClick={() => setMenuOpen(false)} className="menuLink"><IconTarget /> Exámenes</Link>
                <Link href="/study?view=flashcards" onClick={() => setMenuOpen(false)} className="menuLink"><IconCards /> Flashcards</Link>
                <Link href="/study?view=kana" onClick={() => setMenuOpen(false)} className="menuLink"><IconSpark /> Kana Sprint</Link>
                <Link href="/study?view=sprint" onClick={() => setMenuOpen(false)} className="menuLink"><IconBook /> Vocab+Kanji Sprint</Link>
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
            radial-gradient(620px 280px at 50% -6%, rgba(78, 205, 196, 0.08), transparent 58%),
            linear-gradient(180deg, #fff8e7 0%, #fffdf9 64%, #fff8e7 100%);
          color: #1a1a2e;
        }
        .homeShell {
          width: min(100%, 760px);
          margin: 0 auto;
          padding: 0 14px 26px;
        }
        .homeHeader {
          position: sticky;
          top: 0;
          z-index: 30;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 0 10px;
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
          font-size: 30px;
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
        .ghostButton,
        .writeButton,
        .iconButton,
        .dismissButton,
        .menuHead button,
        .logoutButton {
          appearance: none;
          border: 0;
          font: inherit;
        }
        .ghostButton {
          min-height: 40px;
          padding: 0 14px;
          border-radius: 999px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(26, 26, 46, 0.06);
          color: #1a1a2e;
          font-size: 13px;
          font-weight: 800;
        }
        .writeButton {
          min-height: 40px;
          padding: 0 16px;
          border-radius: 999px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #e63946;
          color: #fff8e7;
          font-size: 13px;
          font-weight: 800;
          box-shadow: 0 8px 18px rgba(230, 57, 70, 0.16);
        }
        .iconButton {
          position: relative;
          width: 40px;
          height: 40px;
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
          gap: 10px;
        }
        .heroPanel,
        .shortcutGrid,
        .dashboardPanel {
          border-radius: 16px;
          border: 1px solid rgba(26, 26, 46, 0.08);
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 8px 22px rgba(26, 26, 46, 0.04);
        }
        .heroPanel {
          padding: 18px;
          display: grid;
          gap: 16px;
        }
        .heroCopy {
          display: grid;
          gap: 4px;
        }
        .heroTitle {
          margin: 0;
          font-size: clamp(28px, 6vw, 40px);
          line-height: 0.98;
          letter-spacing: -0.04em;
          color: #1a1a2e;
        }
        .heroText {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          color: #5f6577;
          max-width: 34ch;
        }
        .heroStats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .heroStat {
          padding: 14px 12px;
          border-radius: 16px;
          background: rgba(230, 57, 70, 0.08);
          display: grid;
          gap: 6px;
        }
        .heroStat.mint {
          background: rgba(78, 205, 196, 0.12);
        }
        .heroStat.blue {
          background: rgba(69, 123, 157, 0.12);
        }
        .heroStat span {
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #6a7081;
          font-weight: 800;
        }
        .heroStat strong {
          font-size: 28px;
          line-height: 1;
          color: #1a1a2e;
        }
        .heroActions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .sectionKicker {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #e63946;
        }
        .primaryAction,
        .secondaryAction {
          min-height: 42px;
          padding: 0 16px;
          border-radius: 999px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 800;
        }
        .primaryAction {
          background: #1a1a2e;
          color: #fff8e7;
        }
        .secondaryAction {
          background: rgba(26, 26, 46, 0.06);
          color: #1a1a2e;
        }
        .shortcutGrid {
          padding: 8px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          background: transparent;
          border: 0;
          box-shadow: none;
        }
        .shortcutCard {
          border-radius: 18px;
          padding: 14px;
          text-decoration: none;
          color: #1a1a2e;
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(26, 26, 46, 0.08);
          box-shadow: 0 8px 20px rgba(26, 26, 46, 0.03);
        }
        .shortcutCard strong {
          display: block;
          font-size: 15px;
          line-height: 1.2;
        }
        .shortcutCard small {
          display: block;
          margin-top: 3px;
          font-size: 12px;
          color: #646a7a;
        }
        .shortcutIcon {
          width: 38px;
          height: 38px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .accentRed .shortcutIcon {
          background: rgba(230, 57, 70, 0.1);
          color: #e63946;
        }
        .accentMint .shortcutIcon {
          background: rgba(78, 205, 196, 0.14);
          color: #1a1a2e;
        }
        .accentOrange .shortcutIcon {
          background: rgba(244, 162, 97, 0.18);
          color: #8c4d17;
        }
        .accentBlue .shortcutIcon {
          background: rgba(69, 123, 157, 0.16);
          color: #1a1a2e;
        }
        .refreshBanner {
          padding: 10px 12px;
          border-radius: 14px;
          background: rgba(78, 205, 196, 0.12);
          border: 1px solid rgba(78, 205, 196, 0.28);
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
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
        .dashboardPanel {
          padding: 16px;
          display: grid;
          gap: 14px;
        }
        .panelHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .panelHead h2 {
          margin: 4px 0 0;
          font-size: 24px;
          line-height: 1;
          letter-spacing: -0.03em;
          color: #1a1a2e;
        }
        .panelHead a {
          min-height: 36px;
          padding: 0 12px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          background: rgba(26, 26, 46, 0.06);
          color: #1a1a2e;
          font-size: 12px;
          font-weight: 800;
        }
        .taskList,
        .noticeList {
          display: grid;
          gap: 10px;
        }
        .taskCard,
        .noticeRow {
          border-radius: 18px;
          border: 1px solid rgba(26, 26, 46, 0.08);
          background: rgba(255, 255, 255, 0.92);
          padding: 14px;
        }
        .taskCard {
          display: grid;
          grid-template-columns: 14px minmax(0, 1fr) auto;
          gap: 12px;
          align-items: start;
        }
        .taskDot {
          width: 14px;
          height: 14px;
          border-radius: 999px;
          border: 2px solid #e63946;
          margin-top: 5px;
        }
        .taskCopy {
          min-width: 0;
        }
        .taskCopy strong,
        .noticeCopy strong {
          display: block;
          font-size: 16px;
          line-height: 1.28;
          color: #1a1a2e;
          letter-spacing: -0.02em;
        }
        .taskCopy p {
          margin: 6px 0 0;
          font-size: 13px;
          line-height: 1.5;
          color: #646a7a;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .taskMetaLine {
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
          font-size: 11px;
          color: #74798a;
          font-weight: 700;
        }
        .taskLink,
        .noticeActions a {
          min-height: 36px;
          padding: 0 12px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          background: rgba(26, 26, 46, 0.08);
          color: #1a1a2e;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }
        .noticeRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .noticeRow.task {
          background: linear-gradient(135deg, rgba(78, 205, 196, 0.08), rgba(255,255,255,.98));
        }
        .noticeRow.info {
          background: linear-gradient(135deg, rgba(69, 123, 157, 0.08), rgba(255,255,255,.98));
        }
        .noticeCopy {
          min-width: 0;
        }
        .noticeCopy span {
          display: block;
          margin-top: 4px;
          font-size: 12px;
          color: #646a7a;
          font-weight: 700;
        }
        .noticeActions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .dismissNotice {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 0;
          background: rgba(26, 26, 46, 0.06);
          color: #6d7284;
          cursor: pointer;
          font: inherit;
        }
        .statusPill {
          min-height: 26px;
          padding: 0 9px;
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
        .emptyFeed {
          padding: 28px 18px;
          display: grid;
          gap: 6px;
          text-align: center;
          color: #6c7182;
        }
        .emptyFeed strong {
          color: #1a1a2e;
          font-size: 15px;
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
          width: min(340px, 86vw);
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
          .heroPanel,
          .dashboardPanel {
            border-radius: 14px;
          }
          .heroStats,
          .shortcutGrid {
            grid-template-columns: 1fr 1fr;
          }
          .taskCard {
            grid-template-columns: 14px minmax(0, 1fr);
          }
          .taskLink {
            grid-column: 2;
            width: fit-content;
          }
        }
        @media (max-width: 480px) {
          .homeHeader {
            padding-top: 14px;
          }
          .headerActions {
            gap: 6px;
          }
          .ghostButton {
            display: none;
          }
          .brandTitle {
            font-size: 26px;
          }
          .heroPanel,
          .dashboardPanel {
            padding: 14px;
          }
          .heroTitle {
            font-size: 30px;
          }
          .heroStats,
          .shortcutGrid {
            grid-template-columns: 1fr;
          }
          .segmentedControl,
          .panelSegmented {
            width: 100%;
          }
          .segmentedControl button,
          .panelSegmented button {
            flex: 1 1 0;
          }
          .heroActions,
          .feedToolbar,
          .noticeRow {
            flex-wrap: wrap;
          }
          .noticeActions {
            width: 100%;
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
