"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function PostDetailPage() {
  const { id } = useParams();
  const [post, setPost] = useState<any>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPostAndLikes = useCallback(async () => {
    // 1. Obtener el post con el perfil del autor
    const { data } = await supabase.from("posts").select("*, profiles:user_id(*)").eq("id", id).single();
    setPost(data);

    // 2. Obtener mi sesión
    const { data: { user } } = await supabase.auth.getUser();
    setMyId(user?.id || null);

    if (data) {
      // 3. Contar likes
      const { count } = await supabase.from("likes").select("*", { count: 'exact', head: true }).eq("post_id", id);
      setLikesCount(count || 0);

      // 4. Ver si yo le di like
      if (user) {
        const { data: like } = await supabase.from("likes").select("*").eq("post_id", id).eq("user_id", user.id).single();
        setIsLiked(!!like);
      }
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchPostAndLikes(); }, [fetchPostAndLikes]);

  const handleLike = async () => {
    if (!myId) return;
    if (isLiked) {
      await supabase.from("likes").delete().eq("post_id", id).eq("user_id", myId);
      setLikesCount(prev => prev - 1);
    } else {
      await supabase.from("likes").insert({ post_id: id, user_id: myId });
      setLikesCount(prev => prev + 1);
    }
    setIsLiked(!isLiked);
  };

  if (loading || !post) return <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>Cargando post...</div>;

  const [titulo, ...cuerpo] = post.content.split('\n');

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif", color: "#333" }}>
      <Link href="/" style={{ color: "#2cb696", textDecoration: "none", fontWeight: "bold" }}>← Volver al muro</Link>
      
      <article style={{ marginTop: "30px" }}>
        {/* Cabecera: Foto y Nombre clicable */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <Link href={`/profile/${post.user_id}`} style={{ width: "45px", height: "45px", borderRadius: "50%", overflow: "hidden", border: "1px solid #eee", display: "block" }}>
            {post.profiles?.avatar_url ? (
              <img src={post.profiles.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : <div style={{ background: "#eee", width: "100%", height: "100%", textAlign: "center", lineHeight: "45px" }}>👤</div>}
          </Link>
          <div>
            <Link href={`/profile/${post.user_id}`} style={{ textDecoration: "none", color: "#333", fontWeight: "bold", fontSize: "16px" }}>
              {post.profiles?.username}
            </Link>
            <div style={{ fontSize: "12px", color: "#999" }}>{new Date(post.created_at).toLocaleDateString()}</div>
          </div>
        </div>

        <h1 style={{ fontSize: "28px", margin: "0 0 20px 0" }}>{titulo}</h1>

        {/* Imagen del post (si existe) */}
        {post.image_url && (
          <img src={post.image_url} style={{ width: "100%", borderRadius: "15px", marginBottom: "20px", border: "1px solid #eee" }} />
        )}

        <div style={{ fontSize: "18px", lineHeight: "1.7", whiteSpace: "pre-wrap", marginBottom: "30px" }}>
          {cuerpo.join('\n')}
        </div>

        {/* Botón de Like */}
        <div style={{ borderTop: "1px solid #eee", paddingTop: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <button 
            onClick={handleLike} 
            style={{ 
              background: isLiked ? "#fee2e2" : "#f3f4f6", 
              border: "none", padding: "10px 20px", borderRadius: "20px", 
              cursor: "pointer", display: "flex", alignItems: "center", gap: "5px",
              color: isLiked ? "#ef4444" : "#666", fontWeight: "bold", transition: "0.2s"
            }}
          >
            {isLiked ? "❤️" : "🤍"} {likesCount}
          </button>
        </div>
      </article>
    </div>
  );
}