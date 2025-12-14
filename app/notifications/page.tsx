"use client";

import BottomNav from "@/components/BottomNav";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DbNotificationRow = {
  id: string;
  created_at: string;
  user_id: string;
  type: string | null;
  actor_id: string | null;
  post_id: string | number | null;
  message: string | null;
  read: boolean | null;
};

type MiniProfile = {
  username: string | null;
  avatar_url: string | null;
};

type ActorMap = Record<string, MiniProfile>;

type PostMini = { id: string | number; image_url: string | null };

type GroupedNotification = {
  key: string;
  type: "like" | "comment" | "other";
  post_id: string | number | null;
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

  useEffect(() => {
    let mounted = true;

    const load = async (uid: string) => {
      setLoading(true);
      setErrorMsg(null);

      // Load current user's profile for BottomNav avatar/initial
      const { data: prof } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", uid)
        .maybeSingle();
      setMyProfile((prof as MiniProfile) ?? null);

      try {
        // Expect a table named `notifications` with at least: id, created_at, type, actor_id, post_id, message, read
        const { data, error } = await supabase
          .from("notifications")
          .select("id, created_at, user_id, type, actor_id, post_id, message, read")
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

  const grouped = useMemo(() => {
    const normType = (t: string | null) => {
      const v = (t ?? "").toLowerCase();
      if (v.includes("like")) return "like" as const;
      if (v.includes("comment")) return "comment" as const;
      return "other" as const;
    };

    const byKey = new Map<string, GroupedNotification>();

    for (const n of items) {
      const t = normType(n.type);
      const postKey = n.post_id != null ? String(n.post_id) : null;
      const key = (t === "like" || t === "comment") && postKey ? `${t}:${postKey}` : `single:${n.id}`;

      const actor = n.actor_id ? actors[n.actor_id] : null;

      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, {
          key,
          type: t,
          post_id: n.post_id ?? null,
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

  const openPostFromNotification = useCallback(
    async (g: GroupedNotification) => {
      await markGroupRead(g);
      if (!g.post_id) return;
      const id = encodeURIComponent(String(g.post_id));
      // Safe fallback: always route to home feed with a post query.
      // If the feed supports deep-linking, it can focus the post.
      router.push(`/?post=${id}`);
    },
    [markGroupRead, router]
  );

  const emptyHint = useMemo(() => {
    if (loading) return "Loading…";
    if (errorMsg) return errorMsg;
    return "まだ通知はありません。";
  }, [loading, errorMsg]);

  return (
    <>
      <main className="feed" style={{ minHeight: "100vh", padding: 16, paddingBottom: 80 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>通知</h2>
          <div style={{ marginTop: 10 }}>
            {grouped.length === 0 ? (
              <p style={{ margin: 0, opacity: 0.7 }}>{emptyHint}</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
                {grouped.map((g) => {
                  const when = timeAgoJP(g.created_at);
                  const actorText = formatActorsJP(g.actors);

                  const isLike = g.type === "like";
                  const isComment = g.type === "comment";

                  const chip = isLike ? "いいね！" : isComment ? "コメント" : "通知";

                  const body = isLike
                    ? `${actorText}があなたの投稿にいいね！しました。`
                    : isComment
                    ? `${actorText}があなたの投稿にコメントしました。`
                    : (g.latestMessage ?? "通知があります。");

                  // Optional comment preview
                  const commentPreview = isComment && g.latestMessage
                    ? `「${g.latestMessage}」`
                    : null;

                  const thumbUrl = g.post_id != null ? (postThumbs[String(g.post_id)] ?? null) : null;

                  return (
                    <li
                      key={g.key}
                      onClick={() => void openPostFromNotification(g)}
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
                              {commentPreview ? (
                                <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>{commentPreview}</div>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* Post thumbnail (if post has image) */}
                        {thumbUrl ? (
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 10,
                              overflow: "hidden",
                              border: "1px solid rgba(17,17,20,.10)",
                              flexShrink: 0,
                              background: "#fff",
                            }}
                            aria-label="post thumbnail"
                          >
                            <img
                              src={thumbUrl}
                              alt="post"
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              loading="lazy"
                            />
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </main>

      <BottomNav
        profileHref={myProfileHref}
        profileAvatarUrl={myProfile?.avatar_url ? myProfile.avatar_url : null}
        profileInitial={((myProfile?.username ?? "?").toString().trim()[0] ?? "?").toUpperCase()}
      />
    </>
  );
}