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

      if (prof?.is_approved || prof?.is_admin) {
        fetchPosts();
        const saved = localStorage.getItem("dismissed_posts");
        if (saved) setDismissedAnnouncements(JSON.parse(saved));
      } else {
        setLoading(false);
      }
    };
    init();
  }, [router, fetchPosts]);

  if (!loading && myProfile && !myProfile.is_approved && !myProfile.is_admin) {
    return (
      <div style={{ textAlign: "center", padding: "100px 20px", fontFamily: "sans-serif" }}>
        <h1 style={{ fontSize: "50px" }}>⏳</h1>
        <h2>¡Hola, {myProfile.username}!</h2>
        <p style={{ color: "#666", maxWidth: "400px", margin: "0 auto" }}>
          Tu cuenta está en espera de aprobación por parte de Pako-sensei. 
          Te avisaremos en cuanto puedas acceder.
        </p>
        <button onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} style={{ marginTop: "20px", background: "none", border: "1px solid #ddd", padding: "10px 20px", borderRadius: "20px", cursor: "pointer" }}>Cerrar sesión</button>
      </div>
    );
  }

  // Filtrar las directivas del Sensei (Anuncios y Tareas)
  const teacherDirectives = posts.filter(p => 
    p.profiles?.is_admin && 
    (p.type === 'assignment' || p.type === 'announcement') &&
    (p.target_group === myProfile?.group_name || p.target_group === "Todos")
  );

  // El resto del feed (Posts de alumnos y posts tuyos que no son anuncios/tareas)
  const regularFeed = posts.filter(p => {
    const isDirective = p.profiles?.is_admin && (p.type === 'assignment' || p.type === 'announcement');
    return !isDirective || dismissedAnnouncements.includes(p.id);
  });

  return (
    <div style={{ maxWidth: "650px", margin: "0 auto", fontFamily: "sans-serif", color: "#333", backgroundColor: "#fff", minHeight: "100vh" }}>
      
      <header style={{ 
        display: "flex", justifyContent: "space-between", alignItems: "center", 
        padding: "15px 20px", borderBottom: "1px solid #eee", 
        position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 10 
      }}>
        <h1 style={{ margin: 0, fontSize: "18px", color: "#2cb696", fontWeight: "bold" }}>Nihongo Note</h1>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Link href="/resources" style={{ fontSize: "12px", color: "#888", textDecoration: "none" }}>📚 Recursos</Link>
          <button 
            onClick={() => setShowArchived(!showArchived)} 
            style={{ 
              background: showArchived ? "#f0f0f0" : "none", 
              border: "none", fontSize: "12px", color: showArchived ? "#2cb696" : "#888", 
              padding: "5px 10px", borderRadius: "10px", cursor: "pointer", fontWeight: showArchived ? "bold" : "normal"
            }}
          >
            {showArchived ? "📖 Ver Muro" : "📑 Instrucciones"}
          </button>
          <Link href="/write" style={{ padding: "6px 15px", backgroundColor: "#2cb696", color: "#fff", borderRadius: "20px", textDecoration: "none", fontSize: "14px", fontWeight: "bold" }}>書く</Link>
          <Link href={`/profile/${myProfile?.id}`} style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#eee", overflow: "hidden", border: "1px solid #ddd" }}>
            {myProfile?.avatar_url ? <img src={myProfile.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ textAlign: "center", lineHeight: "32px" }}>👤</div>}
          </Link>
        </div>
      </header>

      <main>
        {loading ? (
          <p style={{ textAlign: "center", padding: "40px", color: "#999" }}>読み込み中...</p>
        ) : (
          <>
            {/* VISTA 1: TABLÓN DE ANUNCIOS ACTIVOS (Solo se ve en el Muro) */}
            {!showArchived && (
              <div style={{ paddingTop: "10px" }}>
                {teacherDirectives.filter(p => !dismissedAnnouncements.includes(p.id)).length === 0 && (
                  <p style={{ textAlign: "center", fontSize: "12px", color: "#ccc", margin: "10px 0" }}>No hay anuncios nuevos</p>
                )}
                {teacherDirectives.filter(p => !dismissedAnnouncements.includes(p.id)).map(post => (
                  <div key={post.id} style={{ 
                    margin: "10px 20px", padding: "15px", borderRadius: "12px", 
                    backgroundColor: post.type === 'assignment' ? "#f0fdf4" : "#eff6ff",
                    border: `1px solid ${post.type === 'assignment' ? "#2cb696" : "#3b82f6"}`,
                    position: "relative"
                  }}>
                    <button 
                      onClick={() => {
                        const newD = [...dismissedAnnouncements, post.id];
                        setDismissedAnnouncements(newD);
                        localStorage.setItem("dismissed_posts", JSON.stringify(newD));
                      }} 
                      style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: "16px" }}
                    >✕</button>
                    <div style={{ fontSize: "10px", fontWeight: "bold", color: post.type === 'assignment' ? "#2cb696" : "#3b82f6", marginBottom: "5px" }}>
                      {post.type === 'assignment' ? "📝 TAREA PENDIENTE" : "📢 AVISO DEL SENSEI"}
                    </div>
                    <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", fontWeight: "bold" }}>{post.content.split('\n')[0]}</h3>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      {post.type === 'assignment' && post.assignment_subtype === 'internal' && (
                        <Link href={`/write?assignment_id=${post.id}&title=${encodeURIComponent(post.content.split('\n')[0])}`} style={{ 
                          backgroundColor: "#2cb696", color: "#fff", padding: "6px 12px", borderRadius: "15px", textDecoration: "none", fontSize: "12px", fontWeight: "bold"
                        }}>✍️ Responder</Link>
                      )}
                      <Link href={`/post/${post.id}`} style={{ fontSize: "12px", color: "#666", fontWeight: "500" }}>Ver detalles</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* VISTA 2: FEED REGULAR O LISTA COMPLETA DE INSTRUCCIONES */}
            <div style={{ marginTop: showArchived ? "20px" : "0" }}>
              {showArchived && (
                <div style={{ padding: "0 20px 10px", borderBottom: "1px solid #eee" }}>
                  <h2 style={{ fontSize: "20px", margin: 0 }}>Historial de Instrucciones</h2>
                  <p style={{ fontSize: "13px", color: "#888", margin: "5px 0 0 0" }}>Aquí aparecen todas las tareas y anuncios de tu grupo.</p>
                </div>
              )}

              {(showArchived ? teacherDirectives : regularFeed).length === 0 ? (
                <div style={{ textAlign: "center", padding: "100px 20px", color: "#ccc" }}>
                  <p>{showArchived ? "No hay instrucciones archivadas." : "El muro está vacío por ahora."}</p>
                </div>
              ) : (
                (showArchived ? teacherDirectives : regularFeed).map(post => {
                  const [titulo, ...cuerpo] = post.content.split('\n');
                  return (
                    <article key={post.id} style={{ padding: "20px", borderBottom: "1px solid #eee", display: "flex", gap: "15px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: "8px", marginBottom: "5px", alignItems: "center" }}>
                          <span style={{ fontSize: "12px", fontWeight: "bold" }}>
                            {post.profiles?.is_admin ? "👨‍🏫 Sensei" : post.profiles?.username}
                          </span>
                          <span style={{ fontSize: "10px", color: "#aaa" }}>
                            # {post.type === 'assignment' ? "Tarea" : post.type === 'announcement' ? "Aviso" : "Práctica"}
                          </span>
                          {post.is_reviewed && <span style={{ fontSize: "10px", color: "#2cb696", fontWeight: "bold" }}>済 Sumi</span>}
                        </div>
                        <Link href={`/post/${post.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                          <h2 style={{ margin: "0 0 5px 0", fontSize: "18px", fontWeight: "bold" }}>{titulo}</h2>
                          <p style={{ fontSize: "14px", color: "#666", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {cuerpo.join(' ')}
                          </p>
                        </Link>
                      </div>
                      {post.image_url && (
                        <div style={{ width: "80px", height: "80px", borderRadius: "8px", overflow: "hidden", flexShrink: 0, border: "1px solid #f0f0f0" }}>
                          <img src={post.image_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}