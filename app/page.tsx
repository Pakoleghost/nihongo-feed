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
  const [groups, setGroups] = useState<any[]>([]);
  const [filter, setFilter] = useState("Todos");
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("posts").select(`
      *,
      profiles:user_id (username, avatar_url, group_name, is_admin)
    `).order("created_at", { ascending: false });

    if (data) setPosts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setMyProfile(prof);

      const { data: grps } = await supabase.from("groups").select("name").order("name");
      setGroups(grps || []);

      const saved = localStorage.getItem("dismissed_posts");
      if (saved) setDismissedAnnouncements(JSON.parse(saved));

      fetchPosts();
    };
    init();
  }, [router, fetchPosts]);

  const handleDismiss = (id: string) => {
    const newDismissed = [...dismissedAnnouncements, id];
    setDismissedAnnouncements(newDismissed);
    localStorage.setItem("dismissed_posts", JSON.stringify(newDismissed));
  };

  const toggleReview = async (postId: string, currentStatus: boolean) => {
    await supabase.from("posts").update({ is_reviewed: !currentStatus }).eq("id", postId);
    fetchPosts();
  };

  // Filtrar directivas del Sensei (Anuncios y Tareas activas)
  const teacherDirectives = posts.filter(p => 
    p.profiles?.is_admin && 
    (p.type === 'assignment' || p.type === 'announcement') &&
    (p.target_group === myProfile?.group_name || p.target_group === "Todos")
  );

  // El resto del feed (Posts regulares y anuncios cerrados)
  const regularFeed = posts.filter(p => 
    (!p.profiles?.is_admin || (p.type !== 'assignment' && p.type !== 'announcement')) || 
    dismissedAnnouncements.includes(p.id)
  );

  return (
    <div style={{ maxWidth: "650px", margin: "0 auto", fontFamily: "sans-serif", color: "#333", backgroundColor: "#fff", minHeight: "100vh" }}>
      
      {/* HEADER CORREGIDO */}
      <header style={{ 
        display: "flex", justifyContent: "space-between", alignItems: "center", 
        padding: "15px 20px", borderBottom: "1px solid #eee", 
        position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 10 
      }}>
        <h1 style={{ margin: 0, fontSize: "18px", color: "#2cb696", fontWeight: "bold" }}>Nihongo Note</h1>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button onClick={() => setShowArchived(!showArchived)} style={{ background: "none", border: "none", fontSize: "12px", color: "#888", cursor: "pointer" }}>
            {showArchived ? "📖 Ver Feed" : "📑 Instrucciones"}
          </button>
          <Link href="/write" style={{ padding: "6px 15px", backgroundColor: "#2cb696", color: "#fff", borderRadius: "20px", textDecoration: "none", fontSize: "14px", fontWeight: "bold" }}>書く</Link>
          <Link href="/profile" style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#eee", overflow: "hidden", border: "1px solid #ddd" }}>
            {myProfile?.avatar_url ? <img src={myProfile.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ textAlign: "center", lineHeight: "32px" }}>👤</div>}
          </Link>
        </div>
      </header>

      <main>
        {/* SECCIÓN DE BANNERS ACTIVOS */}
        {!showArchived && teacherDirectives.filter(p => !dismissedAnnouncements.includes(p.id)).map(post => (
          <div key={post.id} style={{ 
            margin: "10px 20px", padding: "15px", borderRadius: "12px", 
            backgroundColor: post.type === 'assignment' ? "#f0fdf4" : "#eff6ff",
            border: `1px solid ${post.type === 'assignment' ? "#2cb696" : "#3b82f6"}`,
            position: "relative"
          }}>
            <button onClick={() => handleDismiss(post.id)} style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", color: "#888", cursor: "pointer" }}>✕</button>
            <div style={{ fontSize: "10px", fontWeight: "bold", color: post.type === 'assignment' ? "#2cb696" : "#3b82f6", marginBottom: "5px" }}>
              {post.type === 'assignment' ? "📝 TAREA PENDIENTE" : "📢 AVISO DEL SENSEI"}
            </div>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", fontWeight: "bold" }}>{post.content.split('\n')[0]}</h3>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {post.type === 'assignment' && post.assignment_subtype === 'internal' && (
                <Link href={`/write?assignment_id=${post.id}&title=${encodeURIComponent(post.content.split('\n')[0])}`} style={{ 
                  backgroundColor: "#2cb696", color: "#fff", padding: "6px 12px", borderRadius: "15px", textDecoration: "none", fontSize: "12px", fontWeight: "bold"
                }}>
                  ✍️ Escribir entrada
                </Link>
              )}
              <Link href={`/post/${post.id}`} style={{ fontSize: "12px", color: "#666" }}>Ver detalles</Link>
            </div>
          </div>
        ))}

        {/* FEED REGULAR O INSTRUCCIONES ARCHIVADAS */}
        {(showArchived ? teacherDirectives : regularFeed).map(post => {
          const isSensei = post.profiles?.is_admin;
          const [titulo, ...cuerpo] = post.content.split('\n');
          return (
            <article key={post.id} style={{ padding: "20px", borderBottom: "1px solid #eee", display: "flex", gap: "15px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "bold" }}>
                    {isSensei ? "👨‍🏫 Sensei" : post.profiles?.username}
                  </span>
                  <span style={{ fontSize: "10px", color: "#aaa" }}>
                    # {post.type === 'assignment' ? "Tarea" : "Práctica"}
                  </span>
                  {post.is_reviewed && <span style={{ fontSize: "10px", color: "#2cb696", fontWeight: "bold" }}>済 Sumi</span>}
                </div>
                <Link href={`/post/${post.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <h2 style={{ margin: "0 0 5px 0", fontSize: "18px", fontWeight: "bold" }}>{titulo}</h2>
                  <p style={{ margin: 0, fontSize: "14px", color: "#666", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {cuerpo.join(' ')}
                  </p>
                </Link>
                {myProfile?.is_admin && post.user_id !== myProfile.id && (
                  <button onClick={() => toggleReview(post.id, post.is_reviewed)} style={{ marginTop: "10px", fontSize: "11px", padding: "4px 8px", borderRadius: "10px", border: "1px solid #ddd", cursor: "pointer", backgroundColor: post.is_reviewed ? "#2cb696" : "#fff", color: post.is_reviewed ? "#fff" : "#666" }}>
                    {post.is_reviewed ? "✅ Revisado" : "◯ Marcar Revisado"}
                  </button>
                )}
              </div>
              {post.image_url && (
                <div style={{ width: "80px", height: "80px", borderRadius: "8px", overflow: "hidden", flexShrink: 0, border: "1px solid #f0f0f0" }}>
                  <img src={post.image_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
            </article>
          );
        })}
      </main>
    </div>
  );
}