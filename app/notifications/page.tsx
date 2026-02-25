"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user?.id).order("created_at", { ascending: false });
    setNotifications(data || []);
    setLoading(false);
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user?.id);
  };

  useEffect(() => { fetchNotifications(); }, []);

  const handleUserAction = async (notifId: number, userId: string, approve: boolean) => {
    if (approve) {
      await supabase.from("profiles").update({ is_approved: true }).eq("id", userId);
      alert("Alumno aprobado ✅");
    } else {
      // Opcional: eliminar notificación o manejar rechazo
      alert("Solicitud ignorada");
    }
    await supabase.from("notifications").delete().eq("id", notifId);
    fetchNotifications();
  };

  return (
    <div style={{ maxWidth: "600px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif" }}>
      <Link href="/" style={{ color: "#2cb696", textDecoration: "none", fontWeight: "bold" }}>← Volver</Link>
      <h1 style={{ fontSize: "24px", margin: "20px 0" }}>Notificaciones</h1>
      
      {notifications.map(n => (
        <div key={n.id} style={{ padding: "15px", border: "1px solid #eee", borderRadius: "10px", marginBottom: "10px", backgroundColor: "#fff" }}>
          <p style={{ margin: "0 0 10px 0" }}>{n.message}</p>
          
          {/* Si el mensaje contiene "signup" o "registro", mostramos botones de acción */}
          {n.message.toLowerCase().includes("registro") && (
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => handleUserAction(n.id, n.link.split('/').pop(), true)} style={{ backgroundColor: "#2cb696", color: "#fff", border: "none", padding: "5px 12px", borderRadius: "5px", cursor: "pointer" }}>Aprobar</button>
              <button onClick={() => handleUserAction(n.id, n.link.split('/').pop(), false)} style={{ backgroundColor: "#eee", color: "#666", border: "none", padding: "5px 12px", borderRadius: "5px", cursor: "pointer" }}>Ignorar</button>
            </div>
          )}
          {!n.message.toLowerCase().includes("registro") && n.link && <Link href={n.link} style={{ fontSize: "12px", color: "#2cb696" }}>Ver detalle →</Link>}
        </div>
      ))}
    </div>
  );
}