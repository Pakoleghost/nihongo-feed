"use client";

import BottomNav from "@/components/BottomNav";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DbNotificationRow = {
  id: string;
  created_at: string;
  user_id: string;
  type: string | null;
  actor_id: string | null;
  post_id: string | number | null;
  comment_id?: string | null;
  jlpt_submission_id?: string | null;
  message: string | null;
  read: boolean | null;
};

type MiniProfile = {
  id?: string | null;
  username: string | null;
  avatar_url: string | null;
};

type ActorMap = Record<string, MiniProfile>;

type PostMini = { id: string | number; image_url: string | null };

type GroupedNotification = {
  key: string;
  type: "like" | "comment" | "reply" | "application" | "jlpt" | "other";
  post_id: string | number | null;
  comment_id: string | null;
  created_at: string;
  read: boolean;
  ids: string[];
  actors: MiniProfile[];
  latestMessage: string | null;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<DbNotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<MiniProfile | null>(null);
  const [actors, setActors] = useState<ActorMap>({});
  const [postThumbs, setPostThumbs] = useState<Record<string, string | null>>({});
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [openApplicationId, setOpenApplicationId] = useState<string | null>(null);
  const [appsById, setAppsById] = useState<Record<string, any>>({});
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [openJlptId, setOpenJlptId] = useState<string | null>(null);
  const [jlptById, setJlptById] = useState<Record<string, any>>({});
  const [jlptSignedUrlById, setJlptSignedUrlById] = useState<Record<string, string | null>>({});
  const [jlptModalId, setJlptModalId] = useState<string | null>(null);

  const unreadIdsRef = useRef<string[]>([]);

  useEffect(() => {
    let mounted = true;

    const load = async (uid: string) => {
      setLoading(true);
      setErrorMsg(null);

      // Load current user's profile for BottomNav avatar/initial, and admin flag
      const { data: prof } = await supabase
        .from("profiles")
        .select("username, avatar_url, is_admin")
        .eq("id", uid)
        .maybeSingle();
      setMyProfile((prof as MiniProfile) ?? null);
      setIsAdmin(!!(prof as any)?.is_admin);

      try {
        // Expect a table named `notifications` with at least: id, created_at, type, actor_id, post_id, message, read
        const { data, error } = await supabase
          .from("notifications")
          .select("id, created_at, user_id, type, actor_id, post_id, comment_id, jlpt_submission_id, message, read")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          console.error("Notifications fetch error:", error);
          // Friendly guidance when the table/view isn't set up yet
          setErrorMsg(
            "Notifications table is not set up yet. Create a `notifications` table (or view) with columns: user_id, created_at, type, actor_id, post_id, message, read."
          );
          setItems([]);
          return;
        }

        if (!mounted) return;
        setItems((data as DbNotificationRow[]) ?? []);

        const rows = ((data as DbNotificationRow[]) ?? []).filter(Boolean);

        // Load actor profiles (username + avatar)
        const actorIds = Array.from(
          new Set(rows.map((r) => r.actor_id).filter((v): v is string => !!v))
        );
        if (actorIds.length > 0) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", actorIds);

          const map: ActorMap = {};
          (profs as any[] | null)?.forEach((p) => {
            const id = p?.id;
            if (!id) return;
            map[id] = {
              id,
              username: p?.username ?? null,
              avatar_url: p?.avatar_url ?? null,
            };
          });
          if (mounted) setActors(map);
        } else {
          if (mounted) setActors({});
        }

        // Load post thumbnails (image_url) for notifications that have post_id
        const postIds = Array.from(
          new Set(rows.map((r) => r.post_id).filter((v) => v !== null && v !== undefined))
        );
        if (postIds.length > 0) {
          const { data: postsData } = await supabase
            .from("posts")
            .select("id, image_url")
            // Supabase accepts mixed types; cast to any
            .in("id", postIds as any);

          const pm: Record<string, string | null> = {};
          (postsData as any[] | null)?.forEach((p) => {
            const id = p?.id;
            if (id === null || id === undefined) return;
            pm[String(id)] = p?.image_url ?? null;
          });
          if (mounted) setPostThumbs(pm);
        } else {
          if (mounted) setPostThumbs({});
        }

        // --- ADMIN: Load application details (when notifications include application_id in comment_id) ---
        if ((prof as any)?.is_admin) {
          const applicationIds = Array.from(
            new Set(
              rows
                .filter((r) => (r.type ?? "").toLowerCase().includes("application"))
                .map((r) => (r as any).comment_id)
                .filter((v): v is string => !!v)
                .map((v) => String(v))
            )
          );

          if (applicationIds.length > 0) {
            const { data: apps } = await supabase
              .from("applications")
              .select(
                "id, user_id, created_at, status, full_name, campus, class_level, jlpt_level, gender, date_of_birth"
              )
              .in("id", applicationIds as any);

            const map: Record<string, any> = {};
            (apps as any[] | null)?.forEach((a) => {
              const id = a?.id;
              if (!id) return;
              map[String(id)] = a;
            });
            if (mounted) setAppsById(map);
          } else {
            if (mounted) setAppsById({});
          }

          // --- ADMIN: Load JLPT submissions (when notifications include jlpt_submission_id) ---
          const jlptIds = Array.from(
            new Set(
              rows
                .filter((r) => (r.type ?? "").toLowerCase().includes("jlpt"))
                .map((r) => (r as any).jlpt_submission_id)
                .filter((v): v is string => !!v)
                .map((v) => String(v))
            )
          );

          if (jlptIds.length > 0) {
            const { data: subs } = await supabase
              .from("jlpt_submissions")
              .select("id, user_id, image_path, status, assigned_badge, submitted_at")
              .in("id", jlptIds as any);

            const map: Record<string, any> = {};
            (subs as any[] | null)?.forEach((s) => {
              const id = s?.id;
              if (!id) return;
              map[String(id)] = s;
            });
            if (mounted) setJlptById(map);

            // Signed URLs for previews (private bucket)
            const urlMap: Record<string, string | null> = {};
            for (const sid of jlptIds) {
              const row = map[sid];
              const path = row?.image_path;
              if (!path) {
                urlMap[sid] = null;
                continue;
              }
              const { data: signed } = await supabase.storage
                .from("jlpt-certificates")
                .createSignedUrl(String(path), 60 * 30);
              urlMap[sid] = signed?.signedUrl ?? null;
            }
            if (mounted) setJlptSignedUrlById(urlMap);
          } else {
            if (mounted) {
              setJlptById({});
              setJlptSignedUrlById({});
            }
          }
          // --- END ADMIN JLPT ---
        } else {
          if (mounted) setAppsById({});
          if (mounted) {
            setJlptById({});
            setJlptSignedUrlById({});
          }
        }
        // --- END ADMIN ---
      } finally {
        if (mounted) setLoading(false);
      }
    };

    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      if (!mounted) return;
      setUserId(uid);
      if (uid) void load(uid);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) void load(uid);
      else {
        setItems([]);
        setErrorMsg(null);
        setMyProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();

      // Mark remaining unread as read when leaving the page.
      // Do NOT update local UI here so cards stay "new" until you tap them or you leave.
      const ids = unreadIdsRef.current;
      if (ids.length > 0) {
        void supabase.from("notifications").update({ read: true }).in("id", ids as any);
      }
    };
  }, []);

  const myProfileHref = userId ? `/profile/${encodeURIComponent(userId)}` : "/";


  const timeAgoJP = useCallback((iso: string) => {
    const t = new Date(iso).getTime();
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - t) / 1000));
    if (diffSec < 60) return "ただ今";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}分前`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}時間前`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}日前`;
  }, []);

  const formatActorsJP = useCallback((list: MiniProfile[]) => {
    const names = list
      .map((a) => (a.username ?? "").toString().trim())
      .filter(Boolean)
      .map((n) => `@${n}`);

    if (names.length === 0) return "誰か";
    if (names.length === 1) return `${names[0]}さん`;
    if (names.length === 2) return `${names[0]}さん、${names[1]}さん`;
    return `${names[0]}さん、${names[1]}さん、他${names.length - 2}人`;
  }, []);

  const renderActorsJP = useCallback((list: MiniProfile[]) => {
    const clean = list
      .map((a) => ({
        id: a.id ?? null,
        username: (a.username ?? "").toString().trim(),
      }))
      .filter((a) => a.username || a.id);

    if (clean.length === 0) return <span>誰か</span>;

    const first = clean[0].username;
    const second = clean.length > 1 ? clean[1].username : null;
    const rest = clean.length > 2 ? clean.length - 2 : 0;

    const nameLink = (u: string, id: string | null) => {
      const label = `@${u || "user"}`;
      if (!id) return <span style={{ fontWeight: 900 }}>{label}</span>;

      return (
        <Link
          href={`/profile/${encodeURIComponent(String(id))}`}
          onClick={(e) => e.stopPropagation()}
          style={{
            fontWeight: 900,
            textDecoration: "none",
            color: "inherit",
          }}
        >
          {label}
        </Link>
      );
    };

    if (clean.length === 1) return <>{nameLink(first, clean[0].id)}さん</>;
    if (clean.length === 2)
      return <>{nameLink(first, clean[0].id)}さん、{nameLink(second!, clean[1].id)}さん</>;

    return (
      <>
        {nameLink(first, clean[0].id)}さん、{nameLink(second!, clean[1].id)}さん、他{rest}人
      </>
    );
  }, []);

  const grouped = useMemo(() => {
    const normType = (t: string | null) => {
      const v = (t ?? "").toLowerCase();
      if (v.includes("like")) return "like" as const;
      if (v.includes("reply")) return "reply" as const;
      if (v.includes("comment")) return "comment" as const;
      if (v.includes("application")) return "application" as const;
      if (v.includes("jlpt")) return "jlpt" as const;
      return "other" as const;
    };

    const byKey = new Map<string, GroupedNotification>();

    for (const n of items) {
      const t = normType(n.type);
      const postKey = n.post_id != null ? String(n.post_id) : null;
      const jlptId = (n as any).jlpt_submission_id ? String((n as any).jlpt_submission_id) : "";
      const key =
        t === "jlpt" && jlptId
          ? `jlpt:${jlptId}`
          : (t === "like" || t === "comment" || t === "reply") && postKey
          ? `${t}:${postKey}`
          : `single:${n.id}`;

      const actor = n.actor_id ? actors[n.actor_id] : null;

      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, {
          key,
          type: t,
          post_id: n.post_id ?? null,
          comment_id: t === "jlpt" ? (((n as any).jlpt_submission_id ?? null) as any) : ((n as any).comment_id ?? null),
          created_at: n.created_at,
          read: !!n.read,
          ids: [n.id],
          actors: actor ? [actor] : [],
          latestMessage: n.message ?? null,
        });
      } else {
        existing.ids.push(n.id);
        existing.read = existing.read && !!n.read;
        // Keep most recent time/message
        if (new Date(n.created_at).getTime() > new Date(existing.created_at).getTime()) {
          existing.created_at = n.created_at;
          existing.latestMessage = n.message ?? existing.latestMessage;
          existing.comment_id =
            t === "jlpt"
              ? (((n as any).jlpt_submission_id ?? null) as any)
              : ((n as any).comment_id ?? existing.comment_id);
        }
        if (actor) {
          const uname = (actor.username ?? "").toString();
          if (!existing.actors.some((a) => (a.username ?? "").toString() === uname)) {
            existing.actors.push(actor);
          }
        }
      }
    }

    return Array.from(byKey.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [items, actors]);

  const markGroupRead = useCallback(async (g: GroupedNotification) => {
    if (g.read) return;
    // optimistic update
    setItems((prev) => prev.map((it) => (g.ids.includes(it.id) ? { ...it, read: true } : it)));
    try {
      await supabase.from("notifications").update({ read: true }).in("id", g.ids as any);
    } catch {
      // ignore
    }
  }, []);

  const removeGroupFromUI = useCallback((g: GroupedNotification) => {
    setItems((prev) => prev.filter((it) => !g.ids.includes(it.id)));
    // Also clear any open panel for this application
    if (g.type === "application") {
      const appId = (g.comment_id ?? "").toString();
      if (appId) setOpenApplicationId((prev) => (prev === appId ? null : prev));
    }
  }, []);

  const openPostFromNotification = useCallback(
    async (g: GroupedNotification) => {
      await markGroupRead(g);

      // Normalize IDs (Supabase may return bigint as string)
      const rawPostId = g.post_id == null ? "" : String(g.post_id).trim();
      if (!rawPostId) return;

      const postId = encodeURIComponent(rawPostId);

      // If this is a comment or reply notification and we have a comment id, deep-link to highlight it.
      const rawCommentId = g.comment_id == null ? "" : String(g.comment_id).trim();
      if ((g.type === "comment" || g.type === "reply") && rawCommentId) {
        const commentId = encodeURIComponent(rawCommentId);
        router.push(`/post/${postId}?c=${commentId}`);
        return;
      }

      router.push(`/post/${postId}`);
    },
    [markGroupRead, router]
  );

  const emptyHint = useMemo(() => {
    if (loading) return "Loading…";
    if (errorMsg) return errorMsg;
    return "まだ通知はありません。";
  }, [loading, errorMsg]);

  useEffect(() => {
    unreadIdsRef.current = items.filter((n) => !n.read).map((n) => n.id);
  }, [items]);

  return (
    <>
      <main className="feed" style={{ minHeight: "100vh", paddingBottom: 80 }}>
        <header className="header">
          <div
            className="headerInner"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div className="headerTitle">通知</div>
          </div>
        </header>

        <div style={{ padding: 16 }}>
          {actionMsg ? (
            <div
              style={{
                marginBottom: 10,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(17,17,20,.10)",
                background: "rgba(17,17,20,.03)",
                fontSize: 13,
              }}
            >
              {actionMsg}
            </div>
          ) : null}
          <div style={{ marginTop: 8 }}>
            {grouped.length === 0 ? (
              <p style={{ margin: 0, opacity: 0.7 }}>{emptyHint}</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
                {grouped.map((g) => {
                  const when = timeAgoJP(g.created_at);
                  const actorText = renderActorsJP(g.actors);

                  const isApplication = g.type === "application";
                  const isLike = g.type === "like";
                  const isComment = g.type === "comment";
                  const isReply = g.type === "reply";
                  const isJlpt = g.type === "jlpt";

                  const chip = isApplication
                    ? "APPLICATION"
                    : isJlpt
                    ? "JLPT"
                    : isLike
                    ? "いいね！"
                    : isReply
                    ? "返信"
                    : isComment
                    ? "コメント"
                    : "通知";

                  const body = isApplication ? (
                    <>New user application pending approval.</>
                  ) : isJlpt ? (
                    <>{actorText} submitted a JLPT certificate.</>
                  ) : isLike ? (
                    <>{actorText}があなたの投稿にいいね！しました。</>
                  ) : isReply ? (
                    <>{actorText}があなたのコメントに返信しました。</>
                  ) : isComment ? (
                    <>{actorText}があなたの投稿にコメントしました。</>
                  ) : (
                    <>{g.latestMessage ?? "通知があります。"}</>
                  );

                  const thumbUrl = g.post_id != null ? (postThumbs[String(g.post_id)] ?? null) : null;
                  const jlptId = isJlpt ? (g.comment_id ?? "").toString() : "";
                  const jlptPreview = jlptId ? (jlptSignedUrlById[jlptId] ?? null) : null;
                  const appIdStr = (g.comment_id ?? "").toString();
                  const appRow = appIdStr ? (appsById as any)[appIdStr] : null;
                  const alreadyReviewed = !!appRow && (appRow.status === "approved" || appRow.status === "rejected");

                  return (
                    <li
                      key={g.key}
                      onClick={() => {
                        if (g.type === "application") {
                          const appId = (g.comment_id ?? "").toString();
                          if (appId) {
                            setOpenApplicationId((prev) => (prev === appId ? null : appId));
                          }
                          void markGroupRead(g);
                          return;
                        }
                        if (g.type === "jlpt") {
                          const sid = (g.comment_id ?? "").toString();
                          if (sid) setOpenJlptId((prev) => (prev === sid ? null : sid));
                          void markGroupRead(g);
                          return;
                        }
                        if (g.post_id != null) void openPostFromNotification(g);
                      }}
                      style={{
                        border: "1px solid rgba(17,17,20,.10)",
                        background: g.read ? "#fff" : "rgba(17,17,20,.03)",
                        borderRadius: 14,
                        padding: 12,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          {/* Actor avatar (first actor) */}
                          {g.actors[0]?.id ? (
                            <Link
                              href={`/profile/${encodeURIComponent(String(g.actors[0].id))}`}
                              onClick={(e) => e.stopPropagation()}
                              style={{ textDecoration: "none", color: "inherit" }}
                              aria-label="Open profile"
                            >
                              <div
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 999,
                                  overflow: "hidden",
                                  border: "1px solid rgba(17,17,20,.10)",
                                  flexShrink: 0,
                                  background: "#fff",
                                  display: "grid",
                                  placeItems: "center",
                                  fontSize: 12,
                                  fontWeight: 900,
                                }}
                              >
                                {g.actors[0]?.avatar_url ? (
                                  <img
                                    src={g.actors[0].avatar_url as string}
                                    alt={(g.actors[0]?.username ?? "").toString()}
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    loading="lazy"
                                  />
                                ) : (
                                  <span style={{ opacity: 0.8 }}>
                                    {((g.actors[0]?.username ?? "?").toString().trim()[0] ?? "?").toUpperCase()}
                                  </span>
                                )}
                              </div>
                            </Link>
                          ) : (
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 999,
                                overflow: "hidden",
                                border: "1px solid rgba(17,17,20,.10)",
                                flexShrink: 0,
                                background: "#fff",
                                display: "grid",
                                placeItems: "center",
                                fontSize: 12,
                                fontWeight: 900,
                              }}
                            >
                              {g.actors[0]?.avatar_url ? (
                                <img
                                  src={g.actors[0].avatar_url as string}
                                  alt={(g.actors[0]?.username ?? "").toString()}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  loading="lazy"
                                />
                              ) : (
                                <span style={{ opacity: 0.8 }}>
                                  {((g.actors[0]?.username ?? "?").toString().trim()[0] ?? "?").toUpperCase()}
                                </span>
                              )}
                            </div>
                          )}

                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div
                                style={{
                                  fontWeight: 900,
                                  fontSize: 11,
                                  letterSpacing: 0.2,
                                  opacity: 0.85,
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  background: "rgba(17,17,20,.06)",
                                }}
                              >
                                {chip}
                              </div>
                              <div style={{ fontSize: 12, opacity: 0.6 }}>{when}</div>
                            </div>

                            <div style={{ marginTop: 6, lineHeight: 1.35, fontSize: 13, wordBreak: "break-word" }}>
                              {body}
                            </div>
                          </div>
                        </div>

                        {/* Post thumbnail (if post has image) OR JLPT preview */}
                        {thumbUrl || jlptPreview ? (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isJlpt && jlptId) {
                                setJlptModalId(jlptId);
                              }
                            }}
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 10,
                              overflow: "hidden",
                              border: "1px solid rgba(17,17,20,.10)",
                              flexShrink: 0,
                              background: "#fff",
                            }}
                            aria-label="thumbnail"
                          >
                            <img
                              src={(isJlpt ? (jlptPreview as any) : (thumbUrl as any)) as string}
                              alt={isJlpt ? "jlpt certificate" : "post"}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              loading="lazy"
                            />
                          </div>
                        ) : null}
                      </div>
                      {isApplication && isAdmin ? (
                        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                          <button
                            disabled={alreadyReviewed || actionBusyId === (g.comment_id ?? "").toString()}
                            onClick={async (e) => {
                              e.stopPropagation();
                              setActionMsg(null);

                              const appId = (g.comment_id ?? "").toString();
                              const app = appId ? (appsById as any)[appId] : null;
                              if (!appId || !app) {
                                setActionMsg("Missing application details for this notification.");
                                return;
                              }

                              setActionBusyId(appId);
                              try {
                                const r = await supabase.rpc("review_application", {
                                  application_id: appId,
                                  new_status: "approved",
                                  note: null,
                                } as any);

                                if (r.error) {
                                  console.error("review_application failed:", r.error);
                                  setActionMsg(`Approve failed: ${r.error.message ?? "Unknown error"}`);
                                  return;
                                }

                                // Optimistic local update
                                setAppsById((prev) => {
                                  const next = { ...prev } as any;
                                  if (next[appId]) next[appId] = { ...next[appId], status: "approved" };
                                  return next;
                                });

                                await markGroupRead(g);
                                removeGroupFromUI(g);
                                setActionMsg("Approved.");
                              } finally {
                                setActionBusyId(null);
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: "6px 10px",
                              borderRadius: 10,
                              border: "1px solid rgba(17,17,20,.12)",
                              background: "#111",
                              color: "#fff",
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            {alreadyReviewed
                              ? (appRow?.status === "approved" ? "Approved" : "Already reviewed")
                              : actionBusyId === (g.comment_id ?? "").toString()
                              ? "Approving…"
                              : "Approve"}
                          </button>

                          <button
                            disabled={alreadyReviewed || actionBusyId === (g.comment_id ?? "").toString()}
                            onClick={async (e) => {
                              e.stopPropagation();
                              setActionMsg(null);

                              const appId = (g.comment_id ?? "").toString();
                              const app = appId ? (appsById as any)[appId] : null;
                              if (!appId || !app) {
                                setActionMsg("Missing application details for this notification.");
                                return;
                              }

                              setActionBusyId(appId);
                              try {
                                const r = await supabase.rpc("review_application", {
                                  application_id: appId,
                                  new_status: "rejected",
                                  note: null,
                                } as any);

                                if (r.error) {
                                  console.error("review_application failed:", r.error);
                                  setActionMsg(`Reject failed: ${r.error.message ?? "Unknown error"}`);
                                  return;
                                }

                                setAppsById((prev) => {
                                  const next = { ...prev } as any;
                                  if (next[appId]) next[appId] = { ...next[appId], status: "rejected" };
                                  return next;
                                });

                                await markGroupRead(g);
                                removeGroupFromUI(g);
                                setActionMsg("Rejected.");
                              } finally {
                                setActionBusyId(null);
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: "6px 10px",
                              borderRadius: 10,
                              border: "1px solid rgba(17,17,20,.12)",
                              background: "#fff",
                              color: "#111",
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            {alreadyReviewed
                              ? (appRow?.status === "rejected" ? "Rejected" : "Already reviewed")
                              : actionBusyId === (g.comment_id ?? "").toString()
                              ? "Rejecting…"
                              : "Reject"}
                          </button>
                        </div>
                      ) : null}
                      {/* Application detail panel for admins */}
                      {isJlpt && isAdmin ? (
                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                          <button
                            disabled={actionBusyId === jlptId}
                            onClick={async (e) => {
                              e.stopPropagation();
                              setActionMsg(null);
                              if (!jlptId) return;
                              setActionBusyId(jlptId);
                              try {
                                const r = await supabase.rpc(
                                  "review_jlpt_submission",
                                  { submission_id: jlptId, new_status: "rejected", badge: null } as any
                                );
                                if (r.error) {
                                  console.error("review_jlpt_submission failed:", r.error);
                                  setActionMsg(`Reject failed: ${r.error.message ?? "Unknown error"}`);
                                  return;
                                }
                                setJlptById((prev) => {
                                  const next = { ...prev } as any;
                                  if (next[jlptId]) next[jlptId] = { ...next[jlptId], status: "rejected" };
                                  return next;
                                });
                                await markGroupRead(g);
                                removeGroupFromUI(g);
                                setActionMsg("Rejected.");
                              } finally {
                                setActionBusyId(null);
                              }
                            }}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 10,
                              border: "1px solid rgba(17,17,20,.12)",
                              background: "#fff",
                              color: "#111",
                              fontSize: 12,
                              fontWeight: 600,
                              minWidth: 92,
                            }}
                          >
                            {actionBusyId === jlptId ? "Rejecting…" : "Reject"}
                          </button>

                          {(["N5", "N4", "N3", "N2", "N1"] as const).map((badge) => (
                            <button
                              key={badge}
                              disabled={actionBusyId === jlptId}
                              onClick={async (e) => {
                                e.stopPropagation();
                                setActionMsg(null);
                                if (!jlptId) return;
                                setActionBusyId(jlptId);
                                try {
                                  const r = await supabase.rpc(
                                    "review_jlpt_submission",
                                    { submission_id: jlptId, new_status: "approved", badge } as any
                                  );
                                  if (r.error) {
                                    console.error("review_jlpt_submission failed:", r.error);
                                    setActionMsg(`Approve failed: ${r.error.message ?? "Unknown error"}`);
                                    return;
                                  }
                                  setJlptById((prev) => {
                                    const next = { ...prev } as any;
                                    if (next[jlptId]) next[jlptId] = { ...next[jlptId], status: "approved", assigned_badge: badge };
                                    return next;
                                  });
                                  await markGroupRead(g);
                                  removeGroupFromUI(g);
                                  setActionMsg(`Approved. Badge: ${badge}`);
                                } finally {
                                  setActionBusyId(null);
                                }
                              }}
                              style={{
                                padding: "6px 10px",
                                borderRadius: 10,
                                border: "1px solid rgba(17,17,20,.12)",
                                background: "#111",
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: 700,
                                minWidth: 52,
                              }}
                            >
                              {actionBusyId === jlptId ? "…" : badge}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {isJlpt && isAdmin && openJlptId && openJlptId === jlptId ? (
                        <div
                          style={{
                            marginTop: 10,
                            padding: 10,
                            borderRadius: 10,
                            background: "rgba(17,17,20,.04)",
                            fontSize: 12,
                            lineHeight: 1.4,
                          }}
                        >
                          {(() => {
                            if (!jlptId) return null;
                            const row = (jlptById as any)[jlptId];
                            if (!row) return null;
                            return (
                              <>
                                <div><strong>Submission:</strong> {jlptId}</div>
                                <div><strong>Status:</strong> {row.status ?? "pending"}</div>
                                <div><strong>Assigned badge:</strong> {row.assigned_badge ?? "—"}</div>
                              </>
                            );
                          })()}
                        </div>
                      ) : null}

                      {/* Application detail panel for admins */}
                      {isApplication && isAdmin && openApplicationId && openApplicationId === (g.comment_id ?? "").toString() ? (
                        <div
                          style={{
                            marginTop: 10,
                            padding: 10,
                            borderRadius: 10,
                            background: "rgba(17,17,20,.04)",
                            fontSize: 12,
                            lineHeight: 1.4,
                          }}
                        >
                          {(() => {
                            const appId = (g.comment_id ?? "").toString();
                            const app = appId ? (appsById as any)[appId] : null;
                            const appRow = appId ? (appsById as any)[appId] : null;
                            if (!app) return null;

                            const age =
                              app.date_of_birth
                                ? Math.floor(
                                    (Date.now() - new Date(app.date_of_birth).getTime()) /
                                      (1000 * 60 * 60 * 24 * 365)
                                  )
                                : null;

                            return (
                              <>
                                <div><strong>Name:</strong> {app.full_name}</div>
                                <div><strong>Campus:</strong> {app.campus}</div>
                                <div><strong>Class:</strong> {app.class_level}</div>
                                <div><strong>JLPT:</strong> {app.jlpt_level ?? "—"}</div>
                                <div><strong>Gender:</strong> {app.gender}</div>
                                {age !== null && <div><strong>Age:</strong> {age}</div>}
                                <div><strong>Status:</strong> {(appRow?.status ?? app.status) ?? "—"}</div>
                              </>
                            );
                          })()}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </main>

      {jlptModalId ? (
        <div
          onClick={() => setJlptModalId(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.35)",
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 92vw)",
              borderRadius: 14,
              background: "#fff",
              border: "1px solid rgba(17,17,20,.12)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>JLPT Certificate</div>
              <button
                onClick={() => setJlptModalId(null)}
                style={{
                  border: "1px solid rgba(17,17,20,.12)",
                  background: "#fff",
                  borderRadius: 10,
                  padding: "6px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Close
              </button>
            </div>
            <div style={{ borderTop: "1px solid rgba(17,17,20,.08)" }} />
            <div style={{ padding: 10 }}>
              {jlptSignedUrlById[jlptModalId] ? (
                <img
                  src={jlptSignedUrlById[jlptModalId] as string}
                  alt="jlpt certificate"
                  style={{ width: "100%", height: "auto", display: "block", borderRadius: 10 }}
                />
              ) : (
                <div style={{ fontSize: 13, opacity: 0.7 }}>No preview available.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <BottomNav
        profileHref={myProfileHref}
        profileAvatarUrl={myProfile?.avatar_url ? myProfile.avatar_url : null}
        profileInitial={((myProfile?.username ?? "?").toString().trim()[0] ?? "?").toUpperCase()}
      />
    </>
  );
}