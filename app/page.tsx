"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setMyProfile(prof);

    if (prof?.is_approved || prof?.is_admin) {
      // Cargar Posts
      const { data: postsData } = await supabase.from("posts").select(`
        *,
        profiles:user_id (username, avatar_url, group_name, is_admin)
      `).order("created_at", { ascending: false });
      setPosts(postsData || []);

      // Cargar conteo de notificaciones no leídas
      const { count } = await supabase.from("notifications")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      setUnreadCount(count || 0);

      const saved = localStorage.getItem("dismissed_posts");
      if (saved) setDismissedAnnouncements(JSON.parse(saved));
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!loading && myProfile && !myProfile.is_approved && !myProfile.is_admin) {
    return (
      <div style={{ textAlign: "center", padding: "100px 20px", fontFamily: "sans-serif" }}>
        <h1 style={{ fontSize: "50px" }}>⏳</h1>
        <h2>¡Hola, {myProfile.username}!</h2>
        <p style={{ color: "#666" }}>Tu cuenta espera aprobación de Pako-sensei.</p>
        <button onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} style={{ marginTop: "20px", padding: "10px 20px", borderRadius: "20px", cursor: "pointer" }}>Cerrar sesión</button>
      </div>
    );
  }

  const teacherDirectives = posts.filter(p => p.profiles?.is_admin && (p.type === 'assignment' || p.type === 'announcement') && (p.target_group === myProfile?.group_name || p.target_group === "Todos"));
  const regularFeed = posts.filter(p => !p.profiles?.is_admin || (p.type !== 'assignment' && p.type !== 'announcement') || dismissedAnnouncements.includes(p.id));

  return (
    <div style={{ maxWidth: "650px", margin: "0 auto", fontFamily: "sans-serif", backgroundColor: "#fff", minHeight: "100vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", padding: "15px 20px", borderBottom: "1px solid #eee", position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 10 }}>
        <h1 style={{ margin: 0, fontSize: "18px", color: "#2cb696", fontWeight: "bold" }}>Nihongo Note</h1>
        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          <Link href="/notifications" style={{ textDecoration: "none", position: "relative", fontSize: "20px" }}>
            🔔 {unreadCount > 0 && <span style={{ position: "absolute", top: "-5px", right: "-5px", backgroundColor: "#d9534f", color: "#fff", fontSize: "10px", padding: "2px 5px", borderRadius: "10px" }}>{unreadCount}</span>}
          </Link>
          <Link href="/resources" style={{ fontSize: "12px", color: "#888", textDecoration: "none" }}>📚 Recursos</Link>
          <Link href="/write" style={{ padding: "6px 15px", backgroundColor: "#2cb696", color: "#fff", borderRadius: "20px", textDecoration: "none", fontSize: "14px", fontWeight: "bold" }}>書く</Link>
          <Link href={`/profile/${myProfile?.id}`} style={{ width: "32px", height: "32px", borderRadius: "50%", overflow: "hidden", border: "1px solid #ddd" }}>
            {myProfile?.avatar_url ? <img src={myProfile.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
          </Link>
        </div>
      </header>

      <main>
        {!showArchived && teacherDirectives.filter(p => !dismissedAnnouncements.includes(p.id)).map(post => (
          <div key={post.id} style={{ margin: "10px 20px", padding: "15px", borderRadius: "12px", backgroundColor: post.type === 'assignment' ? "#f0fdf4" : "#eff6ff", border: `1px solid ${post.type === 'assignment' ? "#2cb696" : "#3b82f6"}`, position: "relative" }}>
            <button onClick={() => { const newD = [...dismissedAnnouncements, post.id]; setDismissedAnnouncements(newD); localStorage.setItem("dismissed_posts", JSON.stringify(newD)); }} style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", cursor: "pointer" }}>✕</button>
            <div style={{ fontSize: "10px", fontWeight: "bold", color: post.type === 'assignment' ? "#2cb696" : "#3b82f6", marginBottom: "5px" }}>{post.type === 'assignment' ? "📝 TAREA" : "📢 AVISO"}</div>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>{post.content.split('\n')[0]}</h3>
            <div style={{ display: "flex", gap: "10px" }}>
              {post.assignment_subtype === 'internal' && <Link href={`/write?assignment_id=${post.id}&title=${encodeURIComponent(post.content.split('\n')[0])}`} style={{ backgroundColor: "#2cb696", color: "#fff", padding: "6px 12px", borderRadius: "15px", textDecoration: "none", fontSize: "12px", fontWeight: "bold" }}>✍️ Responder</Link>}
              <Link href={`/post/${post.id}`} style={{ fontSize: "12px", color: "#666" }}>Detalles</Link>
            </div>
          </div>
        ))}

        {regularFeed.map(post => {
          const [titulo, ...cuerpo] = post.content.split('\n');
          return (
            <article key={post.id} style={{ padding: "20px", borderBottom: "1px solid #eee", display: "flex", gap: "15px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "5px", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: "bold" }}>{post.profiles?.is_admin ? "👨‍🏫 Sensei" : post.profiles?.username}</span>
                  {post.is_reviewed && <span style={{ fontSize: "10px", color: "#2cb696", fontWeight: "bold" }}>済 Sumi</span>}
                </div>
                <Link href={`/post/${post.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <h2 style={{ margin: "0 0 5px 0", fontSize: "17px", fontWeight: "bold" }}>{titulo}</h2>
                  <p style={{ fontSize: "14px", color: "#666", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{cuerpo.join(' ')}</p>
                </Link>
              </div>
              {post.image_url && <img src={post.image_url} style={{ width: "80px", height: "80px", borderRadius: "8px", objectFit: "cover" }} />}
            </article>
          );
        })}
      </main>
    </div>
  );
}