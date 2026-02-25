"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase.from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
      
    setNotifications(data || []);
    setLoading(false);

    // Marcar como leídas de forma segura si hay usuario
    await supabase.from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id);
  };

  useEffect(() => { fetchNotifications(); }, []);

  const approveUser = async (notifId: number, userId: string) => {
    if (!userId) return;
    const { error } = await supabase.from("profiles").update({ is_approved: true }).eq("id", userId);
    if (!error) {
      await supabase.from("notifications").delete().eq("id", notifId);
      alert("¡Alumno aprobado! ✅");
      fetchNotifications();
    }
  };

  const ignoreNotification = async (notifId: number) => {
    const { error } = await supabase.from("notifications").delete().eq("id", notifId);
    if (!error) {
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
          // Añadimos comprobación de existencia del mensaje para evitar crashes
          const isSignup = n.message?.toLowerCase().includes("registro");
          const targetUserId = n.link ? n.link.split('/').pop() : null;

          return (
            <div key={n.id} style={{ 
              padding: "15px", 
              border: "1px solid #eee", 
              borderRadius: "10px", 
              marginBottom: "10px", 
              backgroundColor: n.is_read ? "#fff" : "#f0fdf4" 
            }}>
              <p style={{ margin: "0 0 10px 0", fontSize: "14px", lineHeight: "1.4" }}>{n.message || "Aviso del sistema"}</p>
              
              {isSignup && targetUserId ? (
                <div style={{ display: "flex", gap: "10px" }}>
                  <button 
                    onClick={() => approveUser(n.id, targetUserId)} 
                    style={{ backgroundColor: "#2cb696", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}
                  >
                    Aprobar Alumno
                  </button>
                  <button 
                    onClick={() => ignoreNotification(n.id)} 
                    style={{ backgroundColor: "#eee", color: "#666", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}
                  >
                    Ignorar
                  </button>
                </div>
              ) : (
                n.link && <Link href={n.link} style={{ fontSize: "12px", color: "#2cb696", fontWeight: "bold" }}>Ver detalle →</Link>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}