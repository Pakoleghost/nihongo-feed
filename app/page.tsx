"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

// Tipos para el Feed
type DbPostRow = {
  id: string;
  content: string | null;
  created_at: string;
  user_id: string;
  image_url?: string | null;
  profiles: { username: string | null; avatar_url: string | null } | null;
};

type Post = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  image_url: string | null;
};

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para tu usuario actual
  const [myUsername, setMyUsername] = useState<string | null>(null);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);

  // 1. Función para cargar los posts
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("posts")
      .select(`
        id, content, created_at, user_id, image_url,
        profiles (username, avatar_url)
      `)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching posts:", error);
      setLoading(false);
      return;
    }

    const formattedPosts: Post[] = (data as any).map((row: DbPostRow) => ({
      id: row.id,
      content: row.content || "",
      created_at: row.created_at,
      user_id: row.user_id,
      username: row.profiles?.username || "Usuario Anónimo",
      avatar_url: row.profiles?.avatar_url || null,
      image_url: row.image_url || null,
    }));

    setPosts(formattedPosts);
    setLoading(false);
  }, []);

  // 2. Función para cargar MI perfil (para el header)
  const fetchMyProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single();
      
      if (profile) {
        setMyUsername(profile.username);
        setMyAvatarUrl(profile.avatar_url);
      }
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchMyProfile();
  }, [fetchPosts, fetchMyProfile]);

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif", backgroundColor: "#fff", minHeight: "100vh" }}>
      
      {/* HEADER */}
      <header style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        padding: "16px 20px", 
        borderBottom: "1px solid #eaeaea",
        position: "sticky",
        top: 0,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        zIndex: 10
      }}>
        <Link href="/" style={{ textDecoration: "none", color: "#333" }}>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "bold" }}>Nihongo Note</h1>
        </Link>

        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <Link 
            href="/write" 
            style={{ 
              padding: "8px 16px", 
              backgroundColor: "#2cb696", 
              color: "#fff", 
              borderRadius: "20px", 
              textDecoration: "none", 
              fontSize: "14px", 
              fontWeight: "bold" 
            }}
          >
            書く (Escribir)
          </Link>
          <Link 
            href="/profile" 
            style={{ 
              display: "block", 
              width: "36px", 
              height: "36px", 
              borderRadius: "50%", 
              backgroundColor: "#f0f0f0", 
              overflow: "hidden",
              border: "1px solid #ddd"
            }}
          >
            {myAvatarUrl ? (
              <img src={myAvatarUrl} alt="Mi Perfil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: "14px" }}>
                {myUsername ? myUsername[0].toUpperCase() : "👤"}
              </div>
            )}
          </Link>
        </div>
      </header>

      {/* FEED */}
      <main style={{ padding: "0 20px" }}>
        {loading ? (
          <p style={{ textAlign: "center", marginTop: "40px", color: "#888" }}>Cargando...</p>
        ) : (
          posts.map((post) => (
            <article key={post.id} style={{ borderBottom: "1px solid #eaeaea", padding: "24px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#eee", overflow: "hidden" }}>
                  {post.avatar_url && <img src={post.avatar_url} alt={post.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <span style={{ fontSize: "14px", color: "#333", fontWeight: "500" }}>{post.username}</span>
              </div>

              <Link href={`/post/${post.id}`} style={{ textDecoration: "none", color: "inherit", display: "flex", gap: "16px", justifyContent: "space-between" }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "bold", color: "#222" }}>
                    {post.content.split('\n')[0] || "Sin título"}
                  </h2>
                  <p style={{ margin: 0, fontSize: "15px", color: "#555", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {post.content}
                  </p>
                </div>
                {post.image_url && (
                  <div style={{ width: "80px", height: "80px", borderRadius: "8px", overflow: "hidden", flexShrink: 0 }}>
                    <img src={post.image_url} alt="Thumbnail" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
              </Link>
            </article>
          ))
        )}
      </main>
    </div>
  );
}