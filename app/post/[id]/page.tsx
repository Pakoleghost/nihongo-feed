"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

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
  // Validamos que postId sea string
  const postId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : null;

  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados para Likes
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // 1. Obtener usuario actual
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setCurrentUserId(session.user.id);
    });
  }, []);

  // 2. Cargar Post y Likes
  const fetchPostData = useCallback(async () => {
    if (!postId) return;
    setLoading(true);

    // A) Cargar contenido del post
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

    // B) Cargar conteo de likes
    const { count } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true }) // head: true significa "solo cuenta, no traigas datos"
      .eq("post_id", postId);
    
    setLikesCount(count || 0);

    // C) Verificar si YO le di like
    if (currentUserId) {
      const { data: likeData } = await supabase
        .from("likes")
        .select("user_id")
        .eq("post_id", postId)
        .eq("user_id", currentUserId)
        .single();
      
      setIsLiked(!!likeData);
    }

    setLoading(false);
  }, [postId, currentUserId]);

  useEffect(() => {
    fetchPostData();
  }, [fetchPostData]);


  // 3. Manejar el Click en Like
  const handleToggleLike = async () => {
    if (!currentUserId) {
      alert("Debes iniciar sesión para dar like.");
      return;
    }
    if (!postId) return;

    // Optimism UI: Actualizamos visualmente antes de esperar a la base de datos
    const previousIsLiked = isLiked;
    const previousCount = likesCount;

    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);

    try {
      if (previousIsLiked) {
        // Quitar Like
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", currentUserId);
        if (error) throw error;
      } else {
        // Dar Like
        const { error } = await supabase
          .from("likes")
          .insert({ post_id: postId, user_id: currentUserId });
        if (error) throw error;
      }
    } catch (error) {
      console.error("Error al dar like:", error);
      // Revertir cambios si falló
      setIsLiked(previousIsLiked);
      setLikesCount(previousCount);
    }
  };


  if (loading) return <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>Cargando...</div>;
  if (!post) return <div style={{ padding: "40px", textAlign: "center" }}>Post no encontrado.</div>;

  return (
    <div style={{ backgroundColor: "#fff", minHeight: "100vh", paddingBottom: "80px" }}>
      
      <header style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
        <Link href="/" style={{ textDecoration: "none", color: "#888", fontSize: "14px" }}>
          ← Volver al inicio
        </Link>
      </header>

      <article style={{ maxWidth: "680px", margin: "0 auto", padding: "0 20px" }}>
        
        {post.image_url && (
          <div style={{ width: "100%", height: "300px", marginBottom: "32px", borderRadius: "8px", overflow: "hidden", backgroundColor: "#f5f5f5" }}>
            <img src={post.image_url} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}

        <h1 style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "16px", color: "#222" }}>
          {post.content.split('\n')[0]}
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", overflow: "hidden", backgroundColor: "#eee" }}>
            {post.avatar_url ? (
              <img src={post.avatar_url} alt={post.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "#999" }}>
                {post.username[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontWeight: "bold", fontSize: "14px" }}>{post.username}</div>
            <div style={{ fontSize: "12px", color: "#888" }}>
              {new Date(post.created_at).toLocaleDateString("ja-JP", { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>

        <div style={{ fontSize: "18px", lineHeight: "1.8", color: "#333", whiteSpace: "pre-wrap", fontFamily: "Georgia, serif" }}>
          {post.content}
        </div>

      </article>
      
      {/* SECCIÓN DE LIKES */}
      <div style={{ maxWidth: "680px", margin: "40px auto 0", borderTop: "1px solid #eaeaea", paddingTop: "32px", textAlign: "center" }}>
        <p style={{ color: "#888", marginBottom: "16px", fontSize: "14px" }}>¿Te gustó este artículo?</p>
        
        <button 
          onClick={handleToggleLike}
          style={{ 
            padding: "10px 24px", 
            borderRadius: "30px", 
            border: isLiked ? "none" : "1px solid #2cb696", 
            backgroundColor: isLiked ? "#ff4d4f" : "#fff", 
            color: isLiked ? "#fff" : "#2cb696", 
            fontWeight: "bold",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "16px",
            transition: "all 0.2s ease"
          }}
        >
          {isLiked ? "♥" : "♡"} <span>{likesCount}</span>
        </button>
      </div>

    </div>
  );
}