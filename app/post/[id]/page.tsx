"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function PostPage() {
  const { id } = useParams();
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [myProfile, setMyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchPostAndComments = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setMyProfile(p);
    }

    const { data: postData } = await supabase.from("posts").select("*, profiles:user_id(*)").eq("id", id).single();
    const { data: comms } = await supabase.from("comments").select("*, profiles:user_id(*)").eq("post_id", id).order("created_at", { ascending: true });

    setPost(postData);
    setComments(comms || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchPostAndComments(); }, [fetchPostAndComments]);

  const postComment = async () => {
    if (!newComment.trim()) return;
    const { error } = await supabase.from("comments").insert({
      post_id: id,
      user_id: myProfile.id,
      content: newComment
    });
    if (!error) {
      setNewComment("");
      fetchPostAndComments();
    }
  };

  if (loading || !post) return <div style={{ padding: "50px", textAlign: "center" }}>Cargando...</div>;

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      <Link href="/" style={{ color: "#2cb696", textDecoration: "none", fontWeight: "bold" }}>← Volver</Link>
      
      <article style={{ marginTop: "30px" }}>
        <h1 style={{ fontSize: "32px", marginBottom: "10px" }}>{post.content.split('\n')[0]}</h1>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", color: "#888", fontSize: "14px", marginBottom: "20px" }}>
          <span>Por {post.profiles.username}</span>
          <span>• {post.is_forum ? "掲示板 Foro" : "Post"}</span>
        </div>
        
        {post.image_url && <img src={post.image_url} style={{ width: "100%", borderRadius: "15px", marginBottom: "20px" }} />}
        
        <div style={{ fontSize: "18px", lineHeight: "1.7", whiteSpace: "pre-wrap", marginBottom: "40px" }}>
          {post.content.split('\n').slice(1).join('\n')}
        </div>
      </article>

      <section style={{ borderTop: "2px solid #eee", paddingTop: "30px" }}>
        <h3 style={{ marginBottom: "20px" }}>Comentarios ({comments.length})</h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginBottom: "30px" }}>
          {comments.map(c => (
            <div key={c.id} style={{ display: "flex", gap: "12px" }}>
              <div style={{ width: "35px", height: "35px", borderRadius: "50%", backgroundColor: "#eee", flexShrink: 0, overflow: "hidden" }}>
                {c.profiles?.avatar_url && <img src={c.profiles.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              </div>
              <div style={{ backgroundColor: "#f5f5f5", padding: "12px", borderRadius: "12px", flex: 1 }}>
                <div style={{ fontWeight: "bold", fontSize: "13px", marginBottom: "4px" }}>{c.profiles?.username}</div>
                <div style={{ fontSize: "14px", color: "#444" }}>{c.content}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CUADRO PARA COMENTAR */}
        <div style={{ display: "flex", gap: "10px" }}>
          <textarea 
            value={newComment} onChange={e => setNewComment(e.target.value)}
            placeholder={post.is_forum ? "Participa en el foro..." : "Escribe un comentario..."}
            style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #ddd", resize: "none" }}
          />
          <button onClick={postComment} style={{ backgroundColor: "#2cb696", color: "#fff", border: "none", padding: "0 20px", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }}>Enviar</button>
        </div>
      </section>
    </div>
  );
}