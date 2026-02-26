"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import Link from "next/link";

// Icono de Corazón Minimalista SVG
const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill={filled ? "#ff2d55" : "none"} 
    stroke={filled ? "#ff2d55" : "#666"} 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    style={{ transition: "all 0.2s ease" }}
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
);

export default function PostDetailPage() {
  const { id } = useParams();
  const [post, setPost] = useState<any>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchPostAndLikes = useCallback(async () => {
    const { data } = await supabase.from("posts").select("*, profiles:user_id(*)").eq("id", id).single();
    setPost(data);

    const { data: { user } } = await supabase.auth.getUser();
    setMyId(user?.id || null);

    if (data) {
      const { count } = await supabase.from("likes").select("*", { count: 'exact', head: true }).eq("post_id", id);
      setLikesCount(count || 0);

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
      setIsLiked(false);
      return;
    }

    const { error: likeError } = await supabase.from("likes").insert({ post_id: id, user_id: myId });
    if (likeError) return;

    setLikesCount(prev => prev + 1);
    setIsLiked(true);

    if (post?.user_id && post.user_id !== myId) {
      const { data: actor } = await supabase.from("profiles").select("full_name,username").eq("id", myId).maybeSingle();
      const actorName = actor?.full_name || actor?.username || "Un estudiante";
      const postTitle = (post.content || "").split("\n")[0] || "tu publicación";

      await supabase.from("notifications").insert({
        user_id: post.user_id,
        message: `${actorName} indicó que le gustó: ${postTitle}`,
        link: `/post/${id}`,
        is_read: false,
      });
    }
  };

  if (loading || !post) return <div style={{ padding: "100px 20px", textAlign: "center", color: "#ccc" }}>...</div>;

  const [titulo, ...cuerpo] = post.content.split('\n');
  const formattedDate = new Date(post.created_at).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div style={{ maxWidth: "620px", margin: "0 auto", padding: "60px 0", fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif' }}>
      
      {/* Portada Horizontal Estilo Note.com */}
      {post.image_url && (
        <div 
          onClick={() => setIsExpanded(!isExpanded)} 
          style={{ 
            width: "100%", 
            // Altura reducida a 260px para un look más horizontal y estético
            height: isExpanded ? "auto" : "260px", 
            maxHeight: isExpanded ? "85vh" : "260px", 
            overflow: "hidden", 
            marginBottom: "40px",
            backgroundColor: "#f9f9f9",
            cursor: isExpanded ? "zoom-out" : "zoom-in",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.3s ease-in-out" 
          }}
        >
          <img 
            src={post.image_url} 
            style={{ 
              width: "100%", 
              height: isExpanded ? "auto" : "100%", 
              objectFit: isExpanded ? "contain" : "cover", 
              objectPosition: "center",
              display: "block",
              maxHeight: isExpanded ? "85vh" : "260px"
            }} 
            alt="Portada" 
          />
        </div>
      )}

      <article style={{ padding: "0 20px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700", lineHeight: "1.4", color: "#222", marginBottom: "32px", letterSpacing: "-0.02em" }}>
          {titulo}
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" }}>
          <Link href={`/profile/${post.user_id}`} style={{ width: "42px", height: "42px", borderRadius: "50%", overflow: "hidden", display: "block", flexShrink: 0, border: "1px solid #f0f0f0" }}>
            {post.profiles?.avatar_url ? (
              <img src={post.profiles.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : <div style={{ background: "#eee", width: "100%", height: "100%", textAlign: "center", lineHeight: "42px", color: "#999" }}>👤</div>}
          </Link>
          <div>
            <Link href={`/profile/${post.user_id}`} style={{ textDecoration: "none", color: "#222", fontWeight: "500", fontSize: "15px" }}>
              {post.profiles?.username}
            </Link>
            <div style={{ fontSize: "13px", color: "#888", marginTop: "2px" }}>{formattedDate}</div>
          </div>
        </div>

        <div style={{ fontSize: "18px", lineHeight: "1.9", color: "#333", whiteSpace: "pre-wrap", letterSpacing: "0.01em" }}>
          {cuerpo.join('\n')}
        </div>

        <footer style={{ marginTop: "80px", paddingTop: "40px", borderTop: "1px solid #eee" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button 
              onClick={handleLike} 
              style={{ 
                background: isLiked ? "#fff0f0" : "none", 
                border: isLiked ? "1px solid #ffccd5" : "1px solid #ddd", 
                padding: "10px 24px", 
                borderRadius: "30px", 
                cursor: "pointer", 
                display: "flex", 
                alignItems: "center", 
                gap: "8px",
                transition: "all 0.2s ease"
              }}
            >
              <HeartIcon filled={isLiked} />
              <span style={{ fontWeight: "600", color: isLiked ? "#ff2d55" : "#666", fontSize: "15px" }}>
                {likesCount > 0 ? likesCount : "Suki"}
              </span>
            </button>
          </div>
        </footer>
      </article>
    </div>
  );
}