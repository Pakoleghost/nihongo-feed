"use client";

import Link from "next/link";
import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type NotificationItem = {
  id: number;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
  type?: string | null;
  post_id?: string | number | null;
  actor_user_id?: string | null;
  from_user_id?: string | null;
  source_user_id?: string | null;
  payload?: Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
};

type PendingUser = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

type ActorPreview = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

const pageShell: CSSProperties = {
  maxWidth: "760px",
  margin: "24px auto 100px",
  padding: "0 16px",
};

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="18" height="18" aria-hidden="true">
      <path d="M6.2 9.9a5.8 5.8 0 1111.6 0v3.1c0 .7.2 1.3.6 1.8l1.1 1.5H4.5l1.1-1.5c.4-.5.6-1.1.6-1.8V9.9z" />
      <path d="M9.5 18.1a2.5 2.5 0 005 0" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" aria-hidden="true">
      <path d="M4.5 12.5l5 5 10-11" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function extractTargetUserId(notification: NotificationItem): string | null {
  const payloadUser = typeof notification.payload === "object" && notification.payload ? (notification.payload as Record<string, unknown>).user_id : null;
  if (typeof payloadUser === "string" && payloadUser.trim()) return payloadUser;

  const metaUser = typeof notification.meta === "object" && notification.meta ? (notification.meta as Record<string, unknown>).user_id : null;
  if (typeof metaUser === "string" && metaUser.trim()) return metaUser;

  if (!notification.link) return null;
  const parts = notification.link.split("/").filter(Boolean);
  const maybeId = parts.at(-1);
  return maybeId && maybeId.length > 10 ? maybeId : null;
}

function looksLikeApprovalNotification(notification: NotificationItem): boolean {
  const text = `${notification.type ?? ""} ${notification.message ?? ""}`.toLowerCase();
  return ["registro", "solicitud", "pending", "approve", "aprob", "new user", "nuevo usuario"].some((token) => text.includes(token));
}

function looksLikeLikeNotification(notification: NotificationItem): boolean {
  const text = `${notification.type ?? ""} ${notification.message ?? ""}`.toLowerCase();
  return [
    "liked your post",
    "someone liked your post",
    "le gustó tu publicación",
    "le gusto tu publicacion",
    "like",
  ].some((token) => text.includes(token));
}

function extractPostId(notification: NotificationItem): string | null {
  if (notification.post_id != null && String(notification.post_id).trim()) return String(notification.post_id);

  const payloadPost = typeof notification.payload === "object" && notification.payload ? (notification.payload as Record<string, unknown>).post_id : null;
  if (typeof payloadPost === "string" && payloadPost.trim()) return payloadPost;
  if (typeof payloadPost === "number") return String(payloadPost);

  const metaPost = typeof notification.meta === "object" && notification.meta ? (notification.meta as Record<string, unknown>).post_id : null;
  if (typeof metaPost === "string" && metaPost.trim()) return metaPost;
  if (typeof metaPost === "number") return String(metaPost);

  if (notification.link?.startsWith("/post/")) {
    return notification.link.split("/").filter(Boolean).at(-1) ?? null;
  }

  return null;
}

function extractActorId(notification: NotificationItem): string | null {
  const direct =
    notification.actor_user_id ||
    notification.from_user_id ||
    notification.source_user_id;
  if (typeof direct === "string" && direct.trim()) return direct;

  const payloadActor = typeof notification.payload === "object" && notification.payload
    ? (notification.payload as Record<string, unknown>).actor_user_id ??
      (notification.payload as Record<string, unknown>).from_user_id ??
      (notification.payload as Record<string, unknown>).source_user_id
    : null;
  if (typeof payloadActor === "string" && payloadActor.trim()) return payloadActor;

  const metaActor = typeof notification.meta === "object" && notification.meta
    ? (notification.meta as Record<string, unknown>).actor_user_id ??
      (notification.meta as Record<string, unknown>).from_user_id ??
      (notification.meta as Record<string, unknown>).source_user_id
    : null;
  if (typeof metaActor === "string" && metaActor.trim()) return metaActor;

  return null;
}

function resolveNotificationHref(notification: NotificationItem): string | null {
  const postId = extractPostId(notification);
  if (postId) return `/post/${postId}`;
  return notification.link || null;
}

function relativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [actorsByNotificationId, setActorsByNotificationId] = useState<Record<number, ActorPreview>>({});
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("No pudimos validar tu sesión. Vuelve a iniciar sesión.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("profiles read failed", profileError);
    }

    const nextIsAdmin = Boolean(profile?.is_admin);
    setIsAdmin(nextIsAdmin);

    const { data: notificationsData, error: notificationsError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (notificationsError) {
      setErrorMessage("No se pudieron cargar las notificaciones.");
      setNotifications([]);
      setActorsByNotificationId({});
    } else {
      const nextNotifications = (notificationsData as NotificationItem[]) ?? [];
      setNotifications(nextNotifications);

      const actorMapByNotificationId: Record<number, ActorPreview> = {};
      const directActorIds = new Set<string>();

      nextNotifications.forEach((notification) => {
        const actorId = extractActorId(notification);
        if (actorId) directActorIds.add(actorId);
      });

      if (directActorIds.size > 0) {
        const { data: directProfiles } = await supabase
          .from("profiles")
          .select("id,username,avatar_url")
          .in("id", Array.from(directActorIds));

        const directById: Record<string, ActorPreview> = {};
        (directProfiles || []).forEach((p: any) => {
          if (!p?.id) return;
          directById[p.id] = { id: p.id, username: p.username ?? null, avatar_url: p.avatar_url ?? null };
        });

        nextNotifications.forEach((notification) => {
          const actorId = extractActorId(notification);
          if (actorId && directById[actorId]) {
            actorMapByNotificationId[notification.id] = directById[actorId];
          }
        });
      }

      const likeNotificationsWithoutActor = nextNotifications.filter(
        (notification) => looksLikeLikeNotification(notification) && !actorMapByNotificationId[notification.id],
      );

      await Promise.all(
        likeNotificationsWithoutActor.map(async (notification) => {
          const postId = extractPostId(notification);
          if (!postId) return;

          const { data: likes } = await supabase
            .from("likes")
            .select("user_id, created_at")
            .eq("post_id", postId)
            .order("created_at", { ascending: false })
            .limit(8);

          const likeUserIds = Array.from(
            new Set((likes || []).map((row: any) => row?.user_id).filter((id: any): id is string => Boolean(id))),
          );
          if (likeUserIds.length === 0) return;

          const { data: likeProfiles } = await supabase
            .from("profiles")
            .select("id,username,avatar_url")
            .in("id", likeUserIds);

          const profileById: Record<string, ActorPreview> = {};
          (likeProfiles || []).forEach((p: any) => {
            if (!p?.id) return;
            profileById[p.id] = { id: p.id, username: p.username ?? null, avatar_url: p.avatar_url ?? null };
          });

          const bestLike = (likes || []).find((row: any) => row?.user_id && profileById[row.user_id]) as any;
          if (!bestLike?.user_id) return;

          actorMapByNotificationId[notification.id] = profileById[bestLike.user_id];
        }),
      );

      setActorsByNotificationId(actorMapByNotificationId);

      await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    }

    if (nextIsAdmin) {
      const { data: pendingData, error: pendingError } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url,created_at")
        .eq("is_approved", false)
        .eq("is_admin", false)
        .order("created_at", { ascending: true });

      if (pendingError) {
        console.error("pending users read failed", pendingError);
      }

      setPendingUsers((pendingData as PendingUser[]) ?? []);
    } else {
      setPendingUsers([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const run = async () => {
      await loadData();
    };

    void run();
  }, [loadData]);

  const approveUser = useCallback(
    async (userId: string, notificationId?: number) => {
      if (!userId || processingUserId) return;

      setProcessingUserId(userId);
      const { error } = await supabase.from("profiles").update({ is_approved: true }).eq("id", userId);

      if (error) {
        setErrorMessage("No pudimos aprobar al usuario. Intenta nuevamente.");
        setProcessingUserId(null);
        return;
      }

      if (notificationId) {
        await supabase.from("notifications").delete().eq("id", notificationId);
      }

      await loadData();
      setProcessingUserId(null);
    },
    [loadData, processingUserId],
  );

  const ignoreNotification = useCallback(async (notificationId: number) => {
    await supabase.from("notifications").delete().eq("id", notificationId);
    await loadData();
  }, [loadData]);

  const pendingByNotification = useMemo(
    () =>
      notifications
        .filter((notification) => looksLikeApprovalNotification(notification))
        .map((notification) => ({
          notification,
          targetUserId: extractTargetUserId(notification),
        }))
        .filter((item): item is { notification: NotificationItem; targetUserId: string } => Boolean(item.targetUserId)),
    [notifications],
  );

  if (loading) {
    return <div style={{ padding: "90px 16px", textAlign: "center", color: "#6b7280" }}>Cargando notificaciones…</div>;
  }

  return (
    <main style={pageShell}>
      <header style={{ marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        <Link href="/" style={{ color: "#111", fontSize: "14px", border: "1px solid #e5e7eb", borderRadius: "999px", padding: "8px 14px" }}>
          Volver al inicio
        </Link>
        <h1 style={{ margin: 0, fontSize: "28px", letterSpacing: "0.01em" }}>Notificaciones</h1>
      </header>

      {errorMessage && (
        <div style={{ marginBottom: "14px", border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", borderRadius: "12px", padding: "12px 14px", fontSize: "14px" }}>
          {errorMessage}
        </div>
      )}

      {isAdmin && (
        <section style={{ marginBottom: "18px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "16px" }}>
          <h2 style={{ margin: "0 0 10px", fontSize: "17px" }}>Aprobación de nuevos usuarios</h2>
          {pendingUsers.length === 0 ? (
            <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>No hay solicitudes pendientes en este momento.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "10px" }}>
              {pendingUsers.map((pendingUser) => (
                <li key={pendingUser.id} style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "10px", border: "1px solid #f1f5f9", borderRadius: "12px", background: "#fcfcfd" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{pendingUser.full_name || pendingUser.username || "Usuario sin nombre"}</p>
                    <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "12px" }}>{relativeDate(pendingUser.created_at)}</p>
                  </div>
                  <button
                    type="button"
                    disabled={processingUserId === pendingUser.id}
                    onClick={() => approveUser(pendingUser.id)}
                    style={{ border: "1px solid #0f766e", borderRadius: "999px", padding: "7px 12px", background: processingUserId === pendingUser.id ? "#ccfbf1" : "#f0fdfa", color: "#0f766e", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <CheckIcon />
                    Aprobar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {pendingByNotification.length > 0 && (
        <section style={{ marginBottom: "18px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "16px" }}>
          <h2 style={{ margin: "0 0 10px", fontSize: "17px" }}>Solicitudes detectadas en notificaciones</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "8px" }}>
            {pendingByNotification.map(({ notification, targetUserId }) => (
              <li key={notification.id} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px" }}>
                <p style={{ margin: "0 0 8px", fontSize: "14px" }}>{notification.message}</p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" onClick={() => approveUser(targetUserId, notification.id)} style={{ border: "1px solid #0f766e", borderRadius: "999px", padding: "6px 12px", background: "#f0fdfa", color: "#0f766e", fontWeight: 600, cursor: "pointer" }}>
                    Aprobar desde notificación
                  </button>
                  <button type="button" onClick={() => ignoreNotification(notification.id)} style={{ border: "1px solid #d1d5db", borderRadius: "999px", padding: "6px 12px", background: "#fff", color: "#374151", cursor: "pointer" }}>
                    Omitir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "14px 16px", borderBottom: "1px solid #f1f5f9", fontWeight: 600 }}>
          <BellIcon />
          Historial reciente
        </div>

        {notifications.length === 0 ? (
          <p style={{ margin: 0, padding: "24px", textAlign: "center", color: "#6b7280", fontSize: "14px" }}>No tienes notificaciones por ahora.</p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {notifications.map((notification) => (
              <li key={notification.id} style={{ padding: "14px 16px", borderTop: "1px solid #f8fafc", display: "grid", gap: "10px", background: notification.is_read ? "#fff" : "#f8fffc" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "999px", overflow: "hidden", border: "1px solid #f0f0f0", background: "#f5f5f5", flexShrink: 0 }}>
                    {actorsByNotificationId[notification.id]?.avatar_url ? (
                      <img
                        src={actorsByNotificationId[notification.id].avatar_url || ""}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#999", fontSize: "12px" }}>👤</div>
                    )}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.5 }}>
                      {looksLikeLikeNotification(notification) && actorsByNotificationId[notification.id] ? (
                        <>
                          <Link
                            href={`/profile/${actorsByNotificationId[notification.id].id}`}
                            style={{ color: "#111827", textDecoration: "none", fontWeight: 600 }}
                          >
                            @{actorsByNotificationId[notification.id].username || "usuario"}
                          </Link>{" "}
                          le gustó tu publicación
                        </>
                      ) : (
                        notification.message || "Notificación del sistema"
                      )}
                    </p>
                  <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "12px" }}>{relativeDate(notification.created_at)}</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {resolveNotificationHref(notification) && (
                    <Link href={resolveNotificationHref(notification) || "#"} style={{ border: "1px solid #d1d5db", borderRadius: "999px", padding: "6px 12px", fontSize: "12px", color: "#111827" }}>
                      Ver detalle
                    </Link>
                  )}
                  <button type="button" onClick={() => ignoreNotification(notification.id)} style={{ border: "1px solid #d1d5db", borderRadius: "999px", padding: "6px 10px", fontSize: "12px", color: "#374151", background: "#fff", display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                    <CloseIcon />
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
