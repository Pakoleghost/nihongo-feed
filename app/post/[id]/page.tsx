"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation"; // Para capturar el ID de la URL
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import NextImage from "next/image";

type PostDetail = {
  id: string;
  content: string;
  created_at: string;
  image_url: string | null;
  user_id: string;
  username: string;
  avatar_url: string | null;
};

export default function PostPage() {
  const params = useParams();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      // Obtenemos el ID de la URL
      const postId = params?.id; 
      if (!postId) return;

      setLoading(true);

      const { data, error } = await supabase
        .from("posts")
        .select(`
          id, content, created_at, image_url, user_id,
          profiles (username, avatar_url)
        `)
        .eq("id", postId)
        .single();

      if (error) {
        console.error("Error cargando post:", error);
        setLoading(false);
        return;
      }

      // Mapeo seguro de datos
      const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
      
      setPost({
        id: data.id,
        content: data.content || "",
        created_at: data.created_at,
        image_url: data.image_url || null,
        user_id: data.user_id,
        username: profile?.username || "Usuario Anónimo",
        avatar_url: profile?.avatar_url || null,
      });

      setLoading(false);
    };

    fetchPost();
  }, [params]);

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>Cargando artículo...</div>;
  }

  if (!post) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Post no encontrado.</div>;
  }

  return (
    <div style={{ backgroundColor: "#fff", minHeight: "100vh", paddingBottom: "80px" }}>
      
      {/* HEADER SIMPLE (Solo botón volver y Logo pequeño) */}
      <header style={{ 
        maxWidth: "800px", margin: "0 auto", padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" 
      }}>
        <Link href="/" style={{ textDecoration: "none", color: "#888", fontSize: "14px" }}>
          ← Volver al inicio
        </Link>
        {/* Opcional: Nombre de la app discreto */}
        <span style={{ fontWeight: "bold", color: "#eee" }}>Nihongo Note</span>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <article style={{ maxWidth: "680px", margin: "0 auto", padding: "0 20px" }}>
        
        {/* IMAGEN DE CABECERA (Si existe) */}
        {post.image_url && (
          <div style={{ 
            width: "100%", 
            height: "300px", 
            position: "relative", 
            marginBottom: "32px", 
            borderRadius: "8px", 
            overflow: "hidden",
            backgroundColor: "#f5f5f5"
          }}>
             {/* Usamos img normal por simplicidad, puedes cambiar a NextImage si configuraste dominios */}
            <img 
              src={post.image_url} 
              alt="Cover" 
              style={{ width: "100%", height: "100%", objectFit: "cover" }} 
            />
          </div>
        )}

        {/* TÍTULO (Usamos la primera línea del contenido como título simulado si no tienes campo 'title') */}
        <h1 style={{ 
          fontSize: "32px", 
          fontWeight: "bold", 
          lineHeight: "1.4", 
          marginBottom: "16px", 
          color: "#222" 
        }}>
          {post.content.split('\n')[0]}
        </h1>

        {/* INFO DEL AUTOR */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", overflow: "hidden", backgroundColor: "#eee" }}>
            {post.avatar_url ? (
              <img src={post.avatar_url} alt={post.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontWeight: "bold" }}>
                {post.username[0].toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontWeight: "bold", fontSize: "16px", color: "#333" }}>{post.username}</div>
            <div style={{ fontSize: "13px", color: "#888" }}>
              {new Date(post.created_at).toLocaleDateString("ja-JP", { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>

        {/* CUERPO DEL ARTÍCULO */}
        <div style={{ 
          fontSize: "18px", 
          lineHeight: "1.8", 
          color: "#333", 
          whiteSpace: "pre-wrap", // Mantiene los saltos de línea que el usuario escribió
          fontFamily: "Georgia, 'Times New Roman', serif" // Toque más "editorial" para lectura
        }}>
          {/* Renderizamos todo el contenido, o podrías quitar la primera línea si la usaste de título */}
          {post.content}
        </div>

      </article>
      
      {/* SECCIÓN FINAL / FOOTER DEL POST */}
      <div style={{ maxWidth: "680px", margin: "40px auto 0", borderTop: "1px solid #eaeaea", paddingTop: "32px", paddingLeft: "20px", paddingRight: "20px", textAlign: "center" }}>
        <p style={{ color: "#888", marginBottom: "16px" }}>¿Te gustó este artículo?</p>
        <button style={{ 
          padding: "10px 24px", 
          borderRadius: "30px", 
          border: "1px solid #2cb696", 
          backgroundColor: "#fff", 
          color: "#2cb696", 
          fontWeight: "bold",
          cursor: "pointer"
        }}>
          ♡ Dar Like
        </button>
      </div>

    </div>
  );
}