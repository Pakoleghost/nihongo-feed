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
  group_name: string | null;
};

export default function HomePage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<{name: string}[]>([]);
  const [filter, setFilter] = useState<string>("Todos");
  
  const [myProfile, setMyProfile] = useState<{avatar_url: string | null, is_admin: boolean} | null>(null);

  const fetchPosts = useCallback(async (groupFilter: string) => {
    setLoading(true);
    let query = supabase
      .from("posts")
      .select(`
        id, content, created_at, image_url,
        profiles (username, avatar_url, group_name)
      `)
      .order("created_at", { ascending: false });

    // Si hay un filtro seleccionado, filtramos por la columna de la tabla profiles
    if (groupFilter !== "Todos") {
      query = query.eq("profiles.group_name", groupFilter);
    }

    const { data, error } = await query;

    if (!error && data) {
      const formatted = (data as any).map((row: any) => ({
        id: row.id,
        content: row.content || "",
        created_at: row.created_at,
        username: row.profiles?.username || "Usuario",
        avatar_url: row.profiles?.avatar_url || null,
        image_url: row.image_url || null,
        group_name: row.profiles?.group_name || "Sin grupo"
      }));
      setPosts(formatted);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Cargar mi perfil
      const { data: prof } = await supabase.from("profiles").select("avatar_url, is_admin").eq("id", user.id).single();
      setMyProfile(prof);

      // Cargar grupos para el filtro
      const { data: grps } = await supabase.from("groups").select("name").order("name");
      if (grps) setGroups(grps);

      await fetchPosts("Todos");
    };
    init();
  }, [router, fetchPosts]);

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif" }}>
      {/* HEADER */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 20px", borderBottom: "1px solid #eee", sticky: "top", backgroundColor: "#fff", zIndex: 10 }}>
        <h1 style={{ margin: 0, fontSize: "20px" }}>Nihongo Note</h1>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {myProfile?.is_admin && <Link href="/admin/groups" style={{ fontSize: "12px", color: "#2cb696", textDecoration: "none" }}>⚙️ Grupos</Link>}
          <Link href="/write" style={{ padding: "6px 12px", backgroundColor: "#2cb696", color: "#fff", borderRadius: "20px", textDecoration: "none", fontSize: "14px" }}>Escribir</Link>
          <Link href="/profile" style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#eee", overflow: "hidden" }}>
            {myProfile?.avatar_url ? <img src={myProfile.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ textAlign: "center", lineHeight: "32px" }}>👤</div>}
          </Link>
        </div>
      </header>

      {/* BARRA DE FILTROS */}
      <div style={{ display: "flex", gap: "10px", padding: "15px 20px", overflowX: "auto", borderBottom: "1px solid #f0f0f0" }}>
        <button 
          onClick={() => { setFilter("Todos"); fetchPosts("Todos"); }}
          style={{ padding: "6px 15px", borderRadius: "15px", border: "1px solid #ddd", backgroundColor: filter === "Todos" ? "#2cb696" : "#fff", color: filter === "Todos" ? "#fff" : "#666", cursor: "pointer", whiteSpace: "nowrap" }}
        >
          Todos
        </button>
        {groups.map(g => (
          <button 
            key={g.name}
            onClick={() => { setFilter(g.name); fetchPosts(g.name); }}
            style={{ padding: "6px 15px", borderRadius: "15px", border: "1px solid #ddd", backgroundColor: filter === g.name ? "#2cb696" : "#fff", color: filter === g.name ? "#fff" : "#666", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {g.name}
          </button>
        ))}
      </div>

      {/* FEED */}
      <main style={{ padding: "0 20px" }}>
        {loading ? <p style={{ textAlign: "center", padding: "20px" }}>Cargando...</p> : posts.map((post) => (
          <article key={post.id} style={{ padding: "20px 0", borderBottom: "1px solid #eee" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <span style={{ fontSize: "14px", fontWeight: "bold" }}>{post.username}</span>
              <span style={{ fontSize: "12px", color: "#999" }}>• {post.group_name}</span>
            </div>
            <p style={{ margin: 0 }}>{post.content}</p>
            {post.image_url && <img src={post.image_url} style={{ width: "100%", marginTop: "10px", borderRadius: "8px" }} />}
          </article>
        ))}
      </main>
    </div>
  );
}