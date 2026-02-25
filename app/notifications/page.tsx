"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setNotifications(data || []);
      
      // Marcar todas como leídas al entrar
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id);
      setLoading(false);
    };
    fetchNotifications();
  }, []);

  return (
    <div style={{ maxWidth: "600px", margin: "40px auto", padding: "0 20px", fontFamily: "sans-serif" }}>
      <header style={{ marginBottom: "30px" }}>
        <Link href="/" style={{ color: "#2cb696", textDecoration: "none", fontWeight: "bold" }}>← Volver</Link>
        <h1 style={{ fontSize: "24px", marginTop: "10px" }}>Notificaciones 🔔</h1>
      </header>

      {loading ? "Cargando..." : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {notifications.length === 0 ? <p style={{ color: "#999", textAlign: "center" }}>No tienes notificaciones aún.</p> : 
            notifications.map(n => (
              <Link key={n.id} href={n.link || "#"} style={{ 
                display: "block", padding: "15px", borderRadius: "10px", 
                backgroundColor: n.is_read ? "#fff" : "#f0fdf4",
                border: "1px solid #eee", textDecoration: "none", color: "#333"
              }}>
                <div style={{ fontSize: "14px" }}>{n.message}</div>
                <div style={{ fontSize: "11px", color: "#aaa", marginTop: "5px" }}>{new Date(n.created_at).toLocaleDateString()}</div>
              </Link>
            ))
          }
        </div>
      )}
    </div>
  );
}