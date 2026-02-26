"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type NotificationRow = {
  id: number;
  user_id: string;
  message?: string | null;
  link?: string | null;
  post_id?: string | number | null;
  is_read?: boolean | null;
  created_at?: string | null;
  actor_user_id?: string | null;
  from_user_id?: string | null;
  source_user_id?: string | null;
  target_user_id?: string | null;
};

type ActorPreview = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

const isSignupNotification = (n: NotificationRow) =>
  (n.message || "").toLowerCase().includes("registro");

const isLikeNotification = (n: NotificationRow) => {
  const msg = (n.message || "").toLowerCase();
  return (
    msg.includes("liked your post") ||
    msg.includes("le gustó tu publicación") ||
    msg.includes("le gusto tu publicacion")
  );
};

const getUserIdFromLink = (link?: string | null) => {
  if (!link?.startsWith("/profile/")) return null;
  return link.split("/").filter(Boolean).pop() || null;
};

const getPostIdFromLink = (link?: string | null) => {
  if (!link?.startsWith("/post/")) return null;
  return link.split("/").filter(Boolean).pop() || null;
};

const getPostIdFromNotification = (n: NotificationRow) => {
  if (n.post_id != null && String(n.post_id).trim()) return String(n.post_id);
  return getPostIdFromLink(n.link);
};

const getActorIdFromNotification = (n: NotificationRow) =>
  n.actor_user_id || n.from_user_id || n.source_user_id || n.target_user_id || null;

const formatTimeAgo = (value?: string | null) => {
  if (!value) return "Ahora";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "Ahora";
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diffSec < 60) return "Ahora";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} d`;
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
  }).format(new Date(t));
};

const formatFullDate = (value?: string | null) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
};

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.5 9a4.5 4.5 0 1 1 9 0v2.4c0 .8.24 1.58.7 2.24l.55.8c.42.6 0 1.42-.73 1.42H6.98c-.73 0-1.15-.82-.73-1.42l.55-.8c.46-.66.7-1.44.7-2.24V9Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function DotIcon({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        background: color,
        display: "inline-block",
      }}
    />
  );
}

function AvatarFallback() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "grid",
        placeItems: "center",
        color: "#9097a1",
        fontSize: 13,
        background: "#f5f5f5",
      }}
    >
      👤
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [actorsByNotifId, setActorsByNotifId] = useState<Record<number, ActorPreview>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setNotifications([]);
      setActorsByNotifId({});
      setLoading(false);
      return;
    }

    const { data: myProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    const amAdmin = Boolean(myProfile?.is_admin);
    setIsAdmin(amAdmin);

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const rawNotifications = (data || []) as NotificationRow[];
    const visibleNotifications = rawNotifications.filter((n) => amAdmin || !isSignupNotification(n));
    setNotifications(visibleNotifications);

    const actorIds = Array.from(new Set(
      visibleNotifications
        .map((n) => getActorIdFromNotification(n) || (isLikeNotification(n) ? getUserIdFromLink(n.link) : null))
        .filter((id): id is string => Boolean(id))
    ));

    const actorsMapById: Record<string, ActorPreview> = {};
    if (actorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", actorIds);

      (profiles || []).forEach((p: any) => {
        actorsMapById[p.id] = {
          id: p.id,
          username: p.username || null,
          avatar_url: p.avatar_url || null,
        };
      });
    }

    const nextActorsByNotifId: Record<number, ActorPreview> = {};
    visibleNotifications.forEach((n) => {
      const actorId =
        getActorIdFromNotification(n) || (isLikeNotification(n) ? getUserIdFromLink(n.link) : null);
      if (actorId && actorsMapById[actorId]) nextActorsByNotifId[n.id] = actorsMapById[actorId];
    });

    // Fallback for older like notifications that only stored a post link/message.
    const missingLikeNotifs = visibleNotifications.filter(
      (n) => isLikeNotification(n) && !nextActorsByNotifId[n.id]
    );
    await Promise.all(
      missingLikeNotifs.map(async (n) => {
        const postId = getPostIdFromNotification(n);
        if (!postId) return;

        const { data: likes } = await supabase
          .from("likes")
          .select("user_id, created_at")
          .eq("post_id", postId)
          .order("created_at", { ascending: false })
          .limit(8);

        const candidateUserIds = Array.from(
          new Set(
            (likes || [])
              .map((row: any) => row?.user_id)
              .filter((id: any): id is string => Boolean(id))
          )
        );
        if (candidateUserIds.length === 0) return;

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", candidateUserIds);

        const profileById: Record<string, ActorPreview> = {};
        (profiles || []).forEach((p: any) => {
          if (!p?.id) return;
          profileById[p.id] = {
            id: p.id,
            username: p.username || null,
            avatar_url: p.avatar_url || null,
          };
        });

        const bestLike = (likes || []).find((row: any) => row?.user_id && profileById[row.user_id]) as any;
        const bestProfile = bestLike?.user_id ? profileById[bestLike.user_id] : null;

        if (bestProfile?.id) {
          nextActorsByNotifId[n.id] = {
            id: bestProfile.id,
            username: bestProfile.username || null,
            avatar_url: bestProfile.avatar_url || null,
          };
        }
      })
    );

    setActorsByNotifId(nextActorsByNotifId);
    setLoading(false);

    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id);
  };

  useEffect(() => {
    void fetchNotifications();
  }, []);

  const approveUser = async (notifId: number, userId: string) => {
    if (!userId || !isAdmin) return;
    const { error } = await supabase.from("profiles").update({ is_approved: true }).eq("id", userId);
    if (!error) {
      await supabase.from("notifications").delete().eq("id", notifId);
      alert("¡Alumno aprobado! ✅");
      await fetchNotifications();
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "#fff",
          color: "#777",
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            padding: "8px 0",
            fontSize: 14,
          }}
        >
          読み込み中... Cargando notificaciones
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fff",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px 40px" }}>
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 5,
            marginBottom: 8,
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(8px)",
            borderBottom: "1px solid #f0f0f0",
            padding: "14px 0 12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <Link
                href="/"
                style={{
                  textDecoration: "none",
                  color: "#222",
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 17,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
                aria-label="Volver"
              >
                ←
              </Link>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      display: "grid",
                      placeItems: "center",
                      color: "#2cb696",
                      background: "#f5fbf8",
                      border: "1px solid #e8f5f0",
                      flexShrink: 0,
                    }}
                  >
                    <BellIcon />
                  </span>
                  <h1 style={{ margin: 0, fontSize: 18, color: "#111827", lineHeight: 1.2 }}>
                    Notificaciones
                  </h1>
                </div>
              </div>
            </div>

            <button
              onClick={() => void fetchNotifications()}
              style={{
                border: "1px solid #ececec",
                background: "#fff",
                color: "#555",
                borderRadius: 999,
                padding: "7px 11px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                flexShrink: 0,
              }}
              title="Actualizar"
            >
              Recargar
            </button>
          </div>
        </header>

        {notifications.length === 0 ? (
          <section
            style={{
              borderRadius: 12,
              border: "1px solid #f0f0f0",
              background: "#fff",
              padding: "28px 20px",
              textAlign: "center",
              marginTop: 16,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                margin: "0 auto 12px",
                display: "grid",
                placeItems: "center",
                color: "#2cb696",
                background: "#f5fbf8",
                border: "1px solid #e8f5f0",
              }}
            >
              <BellIcon />
            </div>
            <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#222" }}>Sin novedades</p>
            <p style={{ margin: 0, color: "#777", fontSize: 14 }}>
              Cuando alguien interactúe contigo o haya avisos del sistema, aparecerán aquí.
            </p>
          </section>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {notifications.map((n) => {
              const isSignup = isSignupNotification(n);
              const isLike = isLikeNotification(n);
              const targetUserId = getUserIdFromLink(n.link);
              const actor = actorsByNotifId[n.id];
              const clickableHref = isSignup
                ? null
                : n.post_id != null
                  ? `/post/${n.post_id}`
                  : n.link || null;
              const clickable = Boolean(clickableHref);
              const actorProfileHref = actor?.id ? `/profile/${actor.id}` : null;

              return (
                <div
                  key={n.id}
                  onClick={() => clickable && router.push(clickableHref!)}
                  onKeyDown={(e) => {
                    if (!clickable) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(clickableHref!);
                    }
                  }}
                  role={clickable ? "button" : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  aria-label={clickable ? `Abrir notificación ${n.id}` : undefined}
                  style={{
                    borderRadius: 0,
                    borderBottom: "1px solid #f3f3f3",
                    background: "#fff",
                    padding: "14px 0",
                    cursor: clickable ? "pointer" : "default",
                    outline: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 999,
                        overflow: "hidden",
                        border: "1px solid #efefef",
                        background: "#f5f5f5",
                        flexShrink: 0,
                      }}
                    >
                      {actor?.avatar_url ? (
                        <img
                          src={actor.avatar_url}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <AvatarFallback />
                      )}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          marginBottom: 6,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          {!n.is_read && <DotIcon color="#2cb696" />}
                        </div>
                        <time
                          dateTime={n.created_at || undefined}
                          title={formatFullDate(n.created_at)}
                          style={{ fontSize: 12, color: "#888", flexShrink: 0 }}
                        >
                          {formatTimeAgo(n.created_at)}
                        </time>
                      </div>

                      {isLike && actor ? (
                        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "#222" }}>
                          {actorProfileHref ? (
                            <Link
                              href={actorProfileHref}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                color: "#222",
                                fontWeight: 600,
                                textDecoration: "none",
                              }}
                            >
                              @{actor.username || "usuario"}
                            </Link>
                          ) : (
                            <strong>@{actor.username || "usuario"}</strong>
                          )}{" "}
                          le gustó tu publicación
                        </p>
                      ) : (
                        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "#222" }}>
                          {n.message || "Aviso del sistema"}
                        </p>
                      )}

                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        {isSignup && targetUserId && isAdmin ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void approveUser(n.id, targetUserId);
                            }}
                            style={{
                              background: "#2cb696",
                              color: "#fff",
                              border: "none",
                              padding: "8px 13px",
                              borderRadius: 8,
                              cursor: "pointer",
                              fontWeight: 600,
                              fontSize: 12,
                            }}
                          >
                            Aprobar alumno
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: "#999" }}>
                            {clickable ? "Toca para abrir" : "Notificación informativa"}
                          </span>
                        )}

                        {clickableHref && (
                          <span
                            style={{
                              fontSize: 12,
                              color: "#2cb696",
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            Ver detalle <span aria-hidden="true">→</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
