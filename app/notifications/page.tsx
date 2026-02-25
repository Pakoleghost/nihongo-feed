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

  const approveUser = async (notifId: number, userId: string) => {
    await supabase.from("profiles").update({ is_approved: true }).eq("id", userId);
    await supabase.from("notifications").delete().eq("id", notifId);
    alert("¡Alumno aprobado! ✅");
    fetchNotifications();
  };

  return (
    <div style={{ maxWidth: "600px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif" }}>
      <header style={{ marginBottom: "20px" }}>
        <Link href="/" style={{ color: "#2cb696", textDecoration: "none", fontWeight: "bold" }}>← Volver</Link>
        <h1 style={{ fontSize: "24px", marginTop: "10px" }}>Notificaciones</h1>
      </header>
      
      {notifications.map(n => (
        <div key={n.id} style={{ padding: "15px", border: "1px solid #eee", borderRadius: "10px", marginBottom: "10px", backgroundColor: "#fff" }}>
          <p style={{ margin: "0 0 10px 0" }}>{n.message}</p>
          {n.message.toLowerCase().includes("registro") && (
            <button onClick={() => approveUser(n.id, n.link.split('/').pop()!)} style={{ backgroundColor: "#2cb696", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>Aprobar Alumno</button>
          )}
          {!n.message.toLowerCase().includes("registro") && n.link && <Link href={n.link} style={{ fontSize: "12px", color: "#2cb696" }}>Ver detalle →</Link>}
        </div>
      ))}
    </div>
  );
}