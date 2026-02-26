"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  return msg.includes("liked your post") || msg.includes("le gustó tu publicación") || msg.includes("le gusto tu publicacion");
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

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [actorsByNotifId, setActorsByNotifId] = useState<Record<number, ActorPreview>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
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

    const { data } = await supabase.from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const rawNotifications = (data || []) as NotificationRow[];
    const visibleNotifications = rawNotifications.filter(n => amAdmin || !isSignupNotification(n));
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
        actorsMapById[p.id] = { id: p.id, username: p.username || null, avatar_url: p.avatar_url || null };
      });
    }

    const nextActorsByNotifId: Record<number, ActorPreview> = {};
    visibleNotifications.forEach(n => {
      const actorId = getActorIdFromNotification(n);
      if (actorId && actorsMapById[actorId]) nextActorsByNotifId[n.id] = actorsMapById[actorId];
    });

    // Fallback for older like notifications that only stored a post link/message.
    const missingLikeNotifs = visibleNotifications.filter(n => isLikeNotification(n) && !nextActorsByNotifId[n.id]);
    await Promise.all(
      missingLikeNotifs.map(async n => {
        const postId = getPostIdFromLink(n.link);
        if (!postId) return;
        const { data: likes } = await supabase
          .from("likes")
          .select("user_id, created_at, profiles:user_id(id, username, avatar_url)")
          .eq("post_id", postId)
          .order("created_at", { ascending: false })
          .limit(5);

        const best = (likes || []).find((like: any) => like?.profiles?.id) || null;
        if (best?.profiles?.id) {
          nextActorsByNotifId[n.id] = {
            id: best.profiles.id,
            username: best.profiles.username || null,
            avatar_url: best.profiles.avatar_url || null,
          };
        }
      })
    );
    setActorsByNotifId(nextActorsByNotifId);

    setLoading(false);

    // Marcar como leídas de forma segura si hay usuario
    await supabase.from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id);
  };

  useEffect(() => { fetchNotifications(); }, []);

  const approveUser = async (notifId: number, userId: string) => {
    if (!userId || !isAdmin) return;
    const { error } = await supabase.from("profiles").update({ is_approved: true }).eq("id", userId);
    if (!error) {
      await supabase.from("notifications").delete().eq("id", notifId);
      alert("¡Alumno aprobado! ✅");
      fetchNotifications();
    }
  };

  if (loading) return <div style={{ padding: "50px", textAlign: "center", fontFamily: "sans-serif", color: "#999" }}>読み込み中 (Cargando)...</div>;

  return (
    <div style={{ maxWidth: "600px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif" }}>
      <header style={{ marginBottom: "20px" }}>
        <Link href="/" style={{ color: "#2cb696", textDecoration: "none", fontWeight: "bold" }}>← Volver</Link>
        <h1 style={{ fontSize: "24px", marginTop: "10px" }}>Notificaciones</h1>
      </header>
      
      {notifications.length === 0 ? (
        <p style={{ color: "#999", textAlign: "center", marginTop: "40px" }}>No tienes notificaciones por ahora.</p>
      ) : (
        notifications.map(n => {
          const isSignup = isSignupNotification(n);
          const targetUserId = getUserIdFromLink(n.link);
          const actor = actorsByNotifId[n.id];
          const clickableHref = !isSignup && n.link ? n.link : null;
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
              style={{
              padding: "15px", 
              border: "1px solid #eee", 
              borderRadius: "10px", 
              marginBottom: "10px", 
              backgroundColor: n.is_read ? "#fff" : "#f0fdf4",
              cursor: clickable ? "pointer" : "default"
            }}
            >
              {isLikeNotification(n) && actor ? (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "50%", overflow: "hidden", background: "#f2f2f2", flexShrink: 0, border: "1px solid #eee" }}>
                    {actor.avatar_url ? (
                      <img src={actor.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#999", fontSize: "14px" }}>👤</div>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.4" }}>
                    {actorProfileHref ? (
                      <Link
                        href={actorProfileHref}
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: "#2cb696", fontWeight: "bold", textDecoration: "none" }}
                      >
                        @{actor.username || "usuario"}
                      </Link>
                    ) : (
                      <strong>@{actor.username || "usuario"}</strong>
                    )}{" "}
                    le gustó tu publicación
                  </p>
                </div>
              ) : (
                <p style={{ margin: "0 0 10px 0", fontSize: "14px", lineHeight: "1.4" }}>{n.message || "Aviso del sistema"}</p>
              )}
              
              {isSignup && targetUserId && isAdmin ? (
                <div style={{ display: "flex", gap: "10px" }}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      approveUser(n.id, targetUserId);
                    }}
                    style={{ backgroundColor: "#2cb696", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}
                  >
                    Aprobar Alumno
                  </button>
                </div>
              ) : (
                clickableHref && (
                  <div style={{ fontSize: "12px", color: "#2cb696", fontWeight: "bold" }}>
                    Ver detalle →
                  </div>
                )
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
