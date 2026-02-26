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

const getNotificationKind = (n: NotificationRow) => {
  if (isSignupNotification(n)) return "registro";
  if (isLikeNotification(n)) return "like";
  if (n.link?.startsWith("/post/")) return "post";
  if (n.link?.startsWith("/profile/")) return "perfil";
  return "sistema";
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
        boxShadow: `0 0 0 4px ${color}22`,
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
        background: "linear-gradient(180deg, #f7f7f8 0%, #f1f2f4 100%)",
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

    const actorIds = Array.from(
      new Set(
        visibleNotifications
          .map(getActorIdFromNotification)
          .filter((id): id is string => Boolean(id))
      )
    );

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
      const actorId = getActorIdFromNotification(n);
      if (actorId && actorsMapById[actorId]) nextActorsByNotifId[n.id] = actorsMapById[actorId];
    });

    // Fallback for older like notifications that only stored a post link/message.
    const missingLikeNotifs = visibleNotifications.filter(
      (n) => isLikeNotification(n) && !nextActorsByNotifId[n.id]
    );
    await Promise.all(
      missingLikeNotifs.map(async (n) => {
        const postId = getPostIdFromLink(n.link);
        if (!postId) return;

        const { data: likes } = await supabase
          .from("likes")
          .select("user_id, created_at, profiles:user_id(id, username, avatar_url)")
          .eq("post_id", postId)
          .order("created_at", { ascending: false })
          .limit(5);

        const best =
          (likes || []).find((like: any) => {
            const profile = Array.isArray(like?.profiles) ? like.profiles[0] : like?.profiles;
            return Boolean(profile?.id);
          }) || null;

        const bestProfile = best
          ? Array.isArray((best as any).profiles)
            ? (best as any).profiles[0]
            : (best as any).profiles
          : null;

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

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background:
            "radial-gradient(circle at 20% 0%, rgba(44,182,150,0.14), transparent 45%), #fafafa",
          color: "#6b7280",
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderRadius: 16,
            border: "1px solid #ececec",
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(8px)",
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
        background:
          "radial-gradient(circle at 12% -8%, rgba(44,182,150,0.15), transparent 38%), radial-gradient(circle at 100% 0%, rgba(14,165,233,0.09), transparent 32%), #fafafa",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "18px 14px 36px" }}>
        <header
          style={{
            position: "sticky",
            top: 10,
            zIndex: 5,
            marginBottom: 18,
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.75)",
            background: "rgba(255,255,255,0.78)",
            backdropFilter: "blur(14px)",
            boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
            padding: "12px 14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <Link
                href="/"
                style={{
                  textDecoration: "none",
                  color: "#0f172a",
                  border: "1px solid #e8eaed",
                  background: "#fff",
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 18,
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
                      width: 30,
                      height: 30,
                      borderRadius: 10,
                      display: "grid",
                      placeItems: "center",
                      color: "#116e5a",
                      background: "linear-gradient(180deg, #ddfbf2 0%, #c8f6ea 100%)",
                      border: "1px solid #b6ecdd",
                      flexShrink: 0,
                    }}
                  >
                    <BellIcon />
                  </span>
                  <h1 style={{ margin: 0, fontSize: 18, color: "#111827", lineHeight: 1.2 }}>
                    Notificaciones
                  </h1>
                </div>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 12,
                    color: "#6b7280",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {notifications.length === 0
                    ? "Tu bandeja está vacía"
                    : `${notifications.length} aviso${notifications.length === 1 ? "" : "s"}${unreadCount ? ` · ${unreadCount} nuevo${unreadCount === 1 ? "" : "s"}` : ""}`}
                </p>
              </div>
            </div>

            <button
              onClick={() => void fetchNotifications()}
              style={{
                border: "1px solid #dfe3e8",
                background: "#fff",
                color: "#334155",
                borderRadius: 12,
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 700,
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
              borderRadius: 22,
              border: "1px solid #eceff3",
              background: "rgba(255,255,255,0.9)",
              boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
              padding: "34px 20px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                margin: "0 auto 12px",
                display: "grid",
                placeItems: "center",
                color: "#0f766e",
                background: "linear-gradient(180deg, #e6fffb 0%, #cffafe 100%)",
                border: "1px solid #c7eef5",
              }}
            >
              <BellIcon />
            </div>
            <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#111827" }}>Sin novedades</p>
            <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
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
              const clickableHref = !isSignup && n.link ? n.link : null;
              const clickable = Boolean(clickableHref);
              const actorProfileHref = actor?.id ? `/profile/${actor.id}` : null;
              const kind = getNotificationKind(n);

              const accent =
                kind === "registro"
                  ? "#f59e0b"
                  : kind === "like"
                    ? "#ef4444"
                    : kind === "post"
                      ? "#3b82f6"
                      : kind === "perfil"
                        ? "#8b5cf6"
                        : "#2cb696";

              const badgeLabel =
                kind === "registro"
                  ? "Registro"
                  : kind === "like"
                    ? "Like"
                    : kind === "post"
                      ? "Post"
                      : kind === "perfil"
                        ? "Perfil"
                        : "Sistema";

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
                    borderRadius: 18,
                    border: n.is_read ? "1px solid #edf0f2" : `1px solid ${accent}33`,
                    background: n.is_read
                      ? "rgba(255,255,255,0.9)"
                      : `linear-gradient(180deg, ${accent}0f 0%, rgba(255,255,255,0.95) 48%)`,
                    boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
                    padding: 14,
                    cursor: clickable ? "pointer" : "default",
                    outline: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 14,
                        overflow: "hidden",
                        border: "1px solid #eceef2",
                        background: "#f8fafc",
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
                          marginBottom: 8,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          {!n.is_read && <DotIcon color={accent} />}
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              letterSpacing: 0.3,
                              color: accent,
                              background: `${accent}14`,
                              border: `1px solid ${accent}25`,
                              borderRadius: 999,
                              padding: "3px 8px",
                            }}
                          >
                            {badgeLabel}
                          </span>
                        </div>
                        <time
                          dateTime={n.created_at || undefined}
                          title={formatFullDate(n.created_at)}
                          style={{ fontSize: 12, color: "#64748b", flexShrink: 0 }}
                        >
                          {formatTimeAgo(n.created_at)}
                        </time>
                      </div>

                      {isLike && actor ? (
                        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: "#0f172a" }}>
                          {actorProfileHref ? (
                            <Link
                              href={actorProfileHref}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                color: "#0f172a",
                                fontWeight: 800,
                                textDecoration: "none",
                                borderBottom: "1px dashed #cbd5e1",
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
                        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: "#0f172a" }}>
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
                              background: "linear-gradient(180deg, #2cb696 0%, #22a487 100%)",
                              color: "#fff",
                              border: "none",
                              padding: "9px 14px",
                              borderRadius: 10,
                              cursor: "pointer",
                              fontWeight: 800,
                              fontSize: 12,
                              boxShadow: "0 6px 14px rgba(44,182,150,0.25)",
                            }}
                          >
                            Aprobar alumno
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: "#94a3b8" }}>
                            {clickable ? "Toca para abrir" : "Notificación informativa"}
                          </span>
                        )}

                        {clickableHref && (
                          <span
                            style={{
                              fontSize: 12,
                              color: accent,
                              fontWeight: 800,
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
