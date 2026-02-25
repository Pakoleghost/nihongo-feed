"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Post = {
  id: string;
  content: string;
  created_at: string;
  username: string;
  avatar_url: string | null;
  image_url: string | null;
  type: 'post' | 'assignment' | 'announcement';
  group_name: string | null;
  target_group: string | null;
  deadline?: string;
  is_reviewed: boolean;
  user_id: string;
};

export default function HomePage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<{name: string}[]>([]);
  const [filter, setFilter] = useState("Todos");
  const [myProfile, setMyProfile] = useState<any>(null);

  const fetchPosts = useCallback(async (groupFilter: string, userGroup: string | null) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("posts")
      .select(`*, profiles:user_id (username, avatar_url, group_name, is_admin)`)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const formatted = data.map((row: any) => ({
        ...row,
        username: row.profiles?.username || "Usuario",
        avatar_url: row.profiles?.avatar_url,
        group_name: row.profiles?.group_name,
        is_admin_post: row.profiles?.is_admin
      }));

      let filtered = formatted;
      if (groupFilter !== "Todos") {
        filtered = formatted.filter(p => p.target_group === groupFilter || p.group_name === groupFilter);
      }

      // Prioridad: Tareas del grupo del usuario arriba
      filtered.sort((a, b) => {
        if (a.type === 'assignment' && a.target_group === userGroup && !a.is_reviewed) return -1;
        if (b.type === 'assignment' && b.target_group === userGroup && !b.is_reviewed) return 1;
        return 0;
      });

      setPosts(filtered);
    }
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

      fetchPosts("Todos", prof?.group_name || null);
    };
    init();
  }, [router, fetchPosts]);

  const toggleReview = async (postId: string, currentStatus: boolean) => {
    const { error } = await supabase.from("posts").update({ is_reviewed: !currentStatus }).eq("id", postId);
    if (!error) fetchPosts(filter, myProfile?.group_name);
  };

  const getPostStyles = (type: string) => {
    switch(type) {
      case 'assignment': return { bg: "#f0fdf4", badge: "宿題", color: "#2cb696" };
      case 'announcement': return { bg: "#eff6ff", badge: "お知らせ", color: "#3b82f6" };
      default: return { bg: "#fff", badge: "", color: "#eee" };
    }
  };

  return (
    <div style={{ maxWidth: "650px", margin: "0 auto", fontFamily: "sans-serif", color: "#333", backgroundColor: "#fff", minHeight: "100vh" }}>
      {/* HEADER */}
      <header style={{ 
        display: "flex", justifyContent: "space-between", alignItems: "center", 
        padding: "15px 20px", borderBottom: "1px solid #eee", position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 10 
      }}>
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "bold", color: "#2cb696" }}>Nihongo Note</h1>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {myProfile?.is_admin && <Link href="/admin/groups" style={{ fontSize: "12px", color: "#888", textDecoration: "none" }}>⚙️ Maestro</Link>}
          <Link href="/write" style={{ padding: "7px 15px", backgroundColor: "#2cb696", color: "#fff", borderRadius: "20px", textDecoration: "none", fontSize: "14px", fontWeight: "bold" }}>書く</Link>
          <Link href="/profile" style={{ width: "34px", height: "34px", borderRadius: "50%", backgroundColor: "#eee", overflow: "hidden", border: "1px solid #ddd" }}>
            {myProfile?.avatar_url ? <img src={myProfile.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ textAlign: "center", lineHeight: "34px" }}>👤</div>}
          </Link>
        </div>
      </header>

      {/* FILTROS */}
      <div style={{ display: "flex", gap: "10px", padding: "12px 20px", overflowX: "auto", borderBottom: "1px solid #f5f5f5", scrollbarWidth: "none" }}>
        <button onClick={() => { setFilter("Todos"); fetchPosts("Todos", myProfile?.group_name); }} style={{ padding: "6px 14px", borderRadius: "15px", border: "none", backgroundColor: filter === "Todos" ? "#2cb696" : "#f0f0f0", color: filter === "Todos" ? "#fff" : "#666", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}>Todos</button>
        {groups.map(g => (
          <button key={g.name} onClick={() => { setFilter(g.name); fetchPosts(g.name, myProfile?.group_name); }} style={{ padding: "6px 14px", borderRadius: "15px", border: "none", backgroundColor: filter === g.name ? "#2cb696" : "#f0f0f0", color: filter === g.name ? "#fff" : "#666", cursor: "pointer", fontSize: "13px", whiteSpace: "nowrap", fontWeight: "500" }}>{g.name}</button>
        ))}
      </div>

      {/* FEED */}
      <main>
        {loading ? <p style={{ textAlign: "center", padding: "40px", color: "#999" }}>Cargando...</p> : posts.map((post: any) => {
          const styles = getPostStyles(post.type);
          const lines = post.content.split('\n');
          const titulo = lines[0];
          const cuerpo = lines.slice(1).join(' ');
          
          return (
            <article key={post.id} style={{ 
              padding: "20px", borderBottom: "1px solid #eee", backgroundColor: styles.bg 
            }}>
              {/* Info de Usuario y Tags */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", overflow: "hidden", border: "1px solid #ddd" }}>
                    {post.avatar_url ? <img src={post.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ textAlign: "center", backgroundColor: "#eee", fontSize: "10px", lineHeight: "24px" }}>👤</div>}
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: "700" }}>
                    {post.is_admin_post ? "👨‍🏫 " : ""}{post.username}
                  </span>
                  <span style={{ fontSize: "11px", color: "#999" }}>in {post.group_name || "Sensei"}</span>
                  <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: post.type === 'assignment' ? "#2cb696" : "#eee", color: post.type === 'assignment' ? "#fff" : "#888", fontWeight: "bold" }}>
                    {post.type === 'assignment' ? "#Tarea" : "#Práctica"}
                  </span>
                </div>
                {post.is_reviewed && <span style={{ color: "#2cb696", fontWeight: "bold", fontSize: "12px", border: "1px solid #2cb696", padding: "2px 6px", borderRadius: "4px" }}>済 Sumi</span>}
              </div>

              {/* Contenido (Diseño Medium) */}
              <div style={{ display: "flex", gap: "20px" }}>
                <div style={{ flex: 1 }}>
                  <Link href={`/post/${post.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <h2 style={{ margin: "0 0 5px 0", fontSize: "18px", fontWeight: "bold", lineHeight: "1.3" }}>{titulo}</h2>
                    <p style={{ margin: 0, fontSize: "14px", color: "#666", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {cuerpo}
                    </p>
                  </Link>

                  {/* Acciones de Tarea */}
                  <div style={{ display: "flex", gap: "10px", marginTop: "12px", alignItems: "center" }}>
                    {post.type === 'assignment' && post.is_admin_post && !myProfile?.is_admin && (
                      <Link href={`/write?assignment_id=${post.id}&title=${encodeURIComponent(titulo)}`} style={{ fontSize: "12px", padding: "5px 12px", border: "1px solid #2cb696", borderRadius: "15px", textDecoration: "none", color: "#2cb696", fontWeight: "bold" }}>
                        ✎ Entregar Tarea
                      </Link>
                    )}
                    
                    {myProfile?.is_admin && post.user_id !== myProfile.id && (
                      <button onClick={() => toggleReview(post.id, post.is_reviewed)} style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "10px", border: "1px solid #ccc", cursor: "pointer", backgroundColor: post.is_reviewed ? "#2cb696" : "#fff", color: post.is_reviewed ? "#fff" : "#666" }}>
                        {post.is_reviewed ? "✅ Revisado" : "◯ Marcar Revisado"}
                      </button>
                    )}

                    {post.deadline && (
                      <span style={{ fontSize: "11px", color: "#d9534f", fontWeight: "bold" }}>
                        ⏰ Límite: {new Date(post.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {post.image_url && (
                  <div style={{ width: "80px", height: "80px", borderRadius: "8px", overflow: "hidden", flexShrink: 0, border: "1px solid #f0f0f0" }}>
                    <img src={post.image_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </main>
    </div>
  );
}