"use client";

import { useCallback, useEffect, useState } from "react";
import { requireApprovedSession } from "@/lib/authGuard";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import NextImage from "next/image";

// Tipos simplificados para el Feed
type DbPostRow = {
  id: string;
  content: string | null;
  created_at: string;
  user_id: string;
  image_url?: string | null;
  profiles:
    | { username: string | null; avatar_url: string | null }
    | { username: string | null; avatar_url: string | null }[]
    | null;
};

type Post = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  image_url: string | null;
  likes: number;
  likedByMe: boolean;
};

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para tu usuario actual (para el avatar del header)
  const [myUsername, setMyUsername] = useState<string | null>(null);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    // 1. Aquí debes poner tu lógica de supabase para traer los posts recientes.
    // Este es un ejemplo básico basado en tu código anterior:
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

    // Transformar los datos de la DB al formato Post
    const formattedPosts: Post[] = (data as unknown as DbPostRow[]).map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        id: row.id,
        content: row.content || "",
        created_at: row.created_at,
        user_id: row.user_id,
        username: profile?.username || "Usuario Anónimo",
        avatar_url: profile?.avatar_url || null,
        image_url: row.image_url || null,
        likes: 0, // Aquí puedes mantener tu lógica de likes
        likedByMe: false,
      };
    });

    setPosts(formattedPosts);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Reemplaza esto con la forma en que obtienes tu usuario
    // requireApprovedSession().then(...)
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif", backgroundColor: "#fff", minHeight: "100vh" }}>
      
      {/* HEADER TIPO NOTE.COM */}
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
        {/* Logo o Nombre de la App */}
        <Link href="/" style={{ textDecoration: "none", color: "#333" }}>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "bold" }}>Nihongo Note</h1>
        </Link>

        {/* Botones de Acción */}
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <Link 
            href="/write" 
            style={{ 
              padding: "8px 16px", 
              backgroundColor: "#2cb696", // Color verde característico de Note
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
            href="/profile" // Link a tu página de perfil
            style={{ 
              display: "block", 
              width: "36px", 
              height: "36px", 
              borderRadius: "50%", 
              backgroundColor: "#f0f0f0", 
              overflow: "hidden" 
            }}
          >
            {myAvatarUrl ? (
              <img src={myAvatarUrl} alt="Mi Perfil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>
                {myUsername ? myUsername[0].toUpperCase() : "?"}
              </div>
            )}
          </Link>
        </div>
      </header>

      {/* FEED DE PREVIEWS */}
      <main style={{ padding: "0 20px" }}>
        {loading ? (
          <p style={{ textAlign: "center", marginTop: "40px", color: "#888" }}>Cargando...</p>
        ) : posts.length === 0 ? (
          <p style={{ textAlign: "center", marginTop: "40px", color: "#888" }}>No hay posts aún. ¡Anímate a escribir el primero!</p>
        ) : (
          posts.map((post) => (
            <article key={post.id} style={{ borderBottom: "1px solid #eaeaea", padding: "24px 0" }}>
              
              {/* Información del Autor */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#eee", overflow: "hidden" }}>
                  {post.avatar_url && <img src={post.avatar_url} alt={post.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <span style={{ fontSize: "14px", color: "#333", fontWeight: "500" }}>{post.username}</span>
                <span style={{ fontSize: "12px", color: "#888" }}>
                  {new Date(post.created_at).toLocaleDateString("ja-JP", { month: 'short', day: 'numeric' })}
                </span>
              </div>

              {/* Contenido (Preview) clickeable hacia el artículo completo */}
              <Link href={`/post/${post.id}`} style={{ textDecoration: "none", color: "inherit", display: "flex", gap: "16px", justifyContent: "space-between" }}>
                <div style={{ flex: 1 }}>
                  {/* Título o primera línea del post */}
                  <h2 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "bold", color: "#222", lineHeight: "1.4", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {post.content.split('\n')[0] || "Sin título"}
                  </h2>
                  
                  {/* Fragmento de texto / Preview */}
                  <p style={{ margin: 0, fontSize: "15px", color: "#555", lineHeight: "1.6", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {post.content}
                  </p>
                </div>

                {/* Imagen miniatura (si existe) */}
                {post.image_url && (
                  <div style={{ width: "120px", height: "120px", borderRadius: "8px", overflow: "hidden", flexShrink: 0, backgroundColor: "#fafafa" }}>
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