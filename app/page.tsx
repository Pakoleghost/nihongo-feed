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
  image_url: string | null; // Recuperado
  type: 'post' | 'assignment' | 'announcement';
  group_name: string | null;
  target_group: string | null;
  deadline?: string;
};

export default function HomePage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [filter, setFilter] = useState("Todos");
  const [groups, setGroups] = useState<any[]>([]);

  const fetchPosts = useCallback(async (groupFilter: string) => {
    setLoading(true);
    // 1. Traemos todo: contenido del post, su imagen Y los datos del perfil del autor
    let query = supabase.from("posts").select(`
      *,
      profiles:user_id (username, avatar_url, group_name)
    `);

    const { data, error } = await query.order("created_at", { ascending: false });

    if (data) {
      const formatted = data.map((row: any) => ({
        ...row,
        username: row.profiles?.username || "Usuario",
        avatar_url: row.profiles?.avatar_url,
        group_name: row.profiles?.group_name
      }));

      // Filtrado por grupo (si no es "Todos")
      let filteredData = formatted;
      if (groupFilter !== "Todos") {
        filteredData = formatted.filter(p => 
          p.target_group === groupFilter || p.group_name === groupFilter
        );
      }

      // Prioridad: Tareas de mi grupo arriba
      const sorted = filteredData.sort((a, b) => {
        if (a.type === 'assignment' && a.target_group === myProfile?.group_name) return -1;
        if (b.type === 'assignment' && b.target_group === myProfile?.group_name) return 1;
        return 0;
      });

      setPosts(sorted);
    }
    setLoading(false);
  }, [myProfile]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setMyProfile(prof);

      const { data: grps } = await supabase.from("groups").select("name").order("name");
      setGroups(grps || []);
      
      fetchPosts("Todos");
    };
    init();
  }, [router, fetchPosts]);

  const getPostStyle = (type: string) => {
    switch(type) {
      case 'assignment': return { bg: "#eefaf5", border: "#2cb696", label: "宿題", icon: "📝" };
      case 'announcement': return { bg: "#f0f7ff", border: "#0070f3", label: "お知らせ", icon: "📢" };
      default: return { bg: "#fff", border: "#eee", label: "", icon: "" };
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif", backgroundColor: "#fafafa", minHeight: "100vh" }}>
      {/* HEADER */}
      <header style={{ 
        display: "flex", justifyContent: "space-between", alignItems: "center", 
        padding: "12px 20px", position: "sticky", top: 0, backgroundColor: "#fff", 
        borderBottom: "1px solid #eee", zIndex: 10 
      }}>
        <h1 style={{ margin: 0, fontSize: "18px", color: "#2cb696", fontWeight: "bold" }}>Nihongo Note</h1>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {myProfile?.is_admin && <Link href="/admin/groups" style={{ fontSize: "12px", color: "#666", textDecoration: "none" }}>⚙️ Panel</Link>}
          <Link href="/write" style={{ padding: "6px 14px", backgroundColor: "#2cb696", color: "#fff", borderRadius: "20px", textDecoration: "none", fontSize: "14px", fontWeight: "bold" }}>書く</Link>
          <Link href="/profile" style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#eee", overflow: "hidden", border: "1px solid #ddd" }}>
            {myProfile?.avatar_url ? <img src={myProfile.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ textAlign: "center", lineHeight: "32px" }}>👤</div>}
          </Link>
        </div>
      </header>

      {/* FILTROS DE GRUPO */}
      <div style={{ display: "flex", gap: "8px", padding: "12px 20px", overflowX: "auto", backgroundColor: "#fff", borderBottom: "1px solid #eee" }}>
        <button onClick={() => { setFilter("Todos"); fetchPosts("Todos"); }} style={{ padding: "6px 14px", borderRadius: "15px", border: "none", backgroundColor: filter === "Todos" ? "#2cb696" : "#f0f0f0", color: filter === "Todos" ? "#fff" : "#666", cursor: "pointer", fontSize: "13px" }}>Todos</button>
        {groups.map(g => (
          <button key={g.name} onClick={() => { setFilter(g.name); fetchPosts(g.name); }} style={{ padding: "6px 14px", borderRadius: "15px", border: "none", backgroundColor: filter === g.name ? "#2cb696" : "#f0f0f0", color: filter === g.name ? "#fff" : "#666", cursor: "pointer", fontSize: "13px", whiteSpace: "nowrap" }}>{g.name}</button>
        ))}
      </div>

      {/* FEED DE POSTS */}
      <main style={{ padding: "15px" }}>
        {loading ? (
          <p style={{ textAlign: "center", color: "#999", marginTop: "20px" }}>Cargando...</p>
        ) : (
          posts.map((post) => {
            const style = getPostStyle(post.type);
            return (
              <article key={post.id} style={{ 
                backgroundColor: style.bg, 
                border: `1px solid ${style.border}`,
                borderRadius: "16px",
                padding: "16px",
                marginBottom: "16px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
              }}>
                {/* Cabecera del Post: Avatar + Nombre */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#fff", border: "1px solid #ddd", overflow: "hidden" }}>
                      {post.avatar_url ? <img src={post.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ textAlign: "center", lineHeight: "36px" }}>👤</div>}
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "bold", color: "#333" }}>{post.username}</div>
                      <div style={{ fontSize: "11px", color: "#888" }}>{post.group_name || "Sensei"} • {new Date(post.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  {style.label && (
                    <span style={{ fontSize: "10px", fontWeight: "bold", color: style.border, backgroundColor: "#fff", padding: "4px 8px", borderRadius: "10px", border: `1px solid ${style.border}` }}>
                      {style.icon} {style.label}
                    </span>
                  )}
                </div>

                {/* Contenido de Texto */}
                <p style={{ margin: "0 0 12px 0", fontSize: "15px", lineHeight: "1.6", color: "#444", whiteSpace: "pre-wrap" }}>
                  {post.content}
                </p>

                {/* IMAGEN DEL POST (Recuperada) */}
                {post.image_url && (
                  <div style={{ width: "100%", borderRadius: "12px", overflow: "hidden", border: "1px solid #eee", marginBottom: "10px" }}>
                    <img src={post.image_url} alt="Post content" style={{ width: "100%", display: "block" }} />
                  </div>
                )}

                {/* Deadline si es tarea */}
                {post.deadline && (
                  <div style={{ fontSize: "12px", color: "#d9534f", fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px" }}>
                    ⏰ Límite de entrega: {new Date(post.deadline).toLocaleDateString()}
                  </div>
                )}
              </article>
            );
          })
        )}
      </main>
    </div>
  );
}