"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function PostDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [post, setPost] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPostAndUser = async () => {
      setLoading(true);
      
      // 1. Obtener perfil del usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setMyProfile(prof);
      }

      // 2. Obtener detalle del post con info del autor
      const { data: postData } = await supabase
        .from("posts")
        .select(`*, profiles:user_id (username, avatar_url, group_name, is_admin)`)
        .eq("id", id)
        .single();

      if (postData) setPost(postData);
      setLoading(false);
    };

    fetchPostAndUser();
  }, [id]);

  const toggleReview = async () => {
    const { error } = await supabase
      .from("posts")
      .update({ is_reviewed: !post.is_reviewed })
      .eq("id", id);
    
    if (!error) setPost({ ...post, is_reviewed: !post.is_reviewed });
  };

  if (loading) return <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>読み込み中... (Cargando)</div>;
  if (!post) return <div style={{ padding: "40px", textAlign: "center" }}>Post no encontrado.</div>;

  const isSenseiPost = post.profiles?.is_admin;
  const [titulo, ...cuerpo] = post.content.split('\n');

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif", color: "#333" }}>
      
      {/* HEADER: Volver */}
      <nav style={{ marginBottom: "30px" }}>
        <Link href="/" style={{ textDecoration: "none", color: "#2cb696", fontWeight: "bold", fontSize: "14px" }}>
          ← Volver al inicio
        </Link>
      </nav>

      <article>
        {/* INFO DEL AUTOR */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "45px", height: "45px", borderRadius: "50%", overflow: "hidden", border: "1px solid #eee" }}>
              {post.profiles?.avatar_url ? (
                <img src={post.profiles.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", backgroundColor: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center" }}>👤</div>
              )}
            </div>
            <div>
              <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                {isSenseiPost ? "👨‍🏫 " : ""}{post.profiles?.username}
                {isSenseiPost && <span style={{ color: "#2cb696", fontSize: "12px", marginLeft: "5px" }}>先生</span>}
              </div>
              <div style={{ fontSize: "12px", color: "#999" }}>
                {post.profiles?.group_name || "Sensei"} • {new Date(post.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* TAGS Y SELLO SUMI */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ 
              fontSize: "11px", padding: "4px 10px", borderRadius: "20px", 
              backgroundColor: post.type === 'assignment' ? "#eefaf5" : "#f5f5f5",
              color: post.type === 'assignment' ? "#2cb696" : "#888",
              border: `1px solid ${post.type === 'assignment' ? "#2cb696" : "#ddd"}`
            }}>
              {post.type === 'assignment' ? "# Tarea" : post.type === 'announcement' ? "# Aviso" : "# Práctica"}
            </span>
            {post.is_reviewed && (
              <div style={{ 
                border: "3px solid #d9534f", color: "#d9534f", padding: "5px 10px", 
                borderRadius: "5px", fontWeight: "900", transform: "rotate(-10px)",
                fontSize: "18px", letterSpacing: "2px"
              }}>
                済 SUMI
              </div>
            )}
          </div>
        </div>

        {/* IMAGEN DE PORTADA */}
        {post.image_url && (
          <div style={{ width: "100%", borderRadius: "15px", overflow: "hidden", marginBottom: "30px", border: "1px solid #eee" }}>
            <img src={post.image_url} alt="Portada" style={{ width: "100%", display: "block" }} />
          </div>
        )}

        {/* CONTENIDO TEXTO */}
        <h1 style={{ fontSize: "32px", fontWeight: "800", marginBottom: "20px", lineHeight: "1.2" }}>{titulo}</h1>
        <div style={{ fontSize: "18px", lineHeight: "1.8", color: "#444", whiteSpace: "pre-wrap", marginBottom: "40px" }}>
          {cuerpo.join('\n')}
        </div>

        {/* PANEL DE ACCIONES (FOOTER DEL POST) */}
        <footer style={{ padding: "30px", backgroundColor: "#f9f9f9", borderRadius: "15px", border: "1px solid #eee" }}>
          
          {/* Caso 1: Es una tarea del Sensei y el alumno quiere entregar */}
          {post.type === 'assignment' && isSenseiPost && !myProfile?.is_admin && (
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: "0 0 15px 0", fontSize: "14px", color: "#666" }}>¿Listo para tu entrega de blog?</p>
              <Link href={`/write?assignment_id=${post.id}&title=${encodeURIComponent(titulo)}`} style={{ 
                backgroundColor: "#2cb696", color: "#fff", padding: "12px 30px", 
                borderRadius: "25px", textDecoration: "none", fontWeight: "bold", display: "inline-block"
              }}>
                ✍️ Escribir mi tarea ahora
              </Link>
            </div>
          )}

          {/* Caso 2: El Sensei está revisando la tarea de un alumno */}
          {myProfile?.is_admin && post.user_id !== myProfile.id && (
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: "0 0 15px 0", fontSize: "14px", color: "#666" }}>Acciones de Sensei:</p>
              <button 
                onClick={toggleReview}
                style={{ 
                  backgroundColor: post.is_reviewed ? "#fff" : "#2cb696", 
                  color: post.is_reviewed ? "#2cb696" : "#fff", 
                  border: `2px solid #2cb696`,
                  padding: "10px 25px", borderRadius: "25px", fontWeight: "bold", cursor: "pointer"
                }}
              >
                {post.is_reviewed ? "◯ Quitar sello revisado" : "✅ Marcar como Revisado (済)"}
              </button>
            </div>
          )}

          {/* Información de Deadline */}
          {post.deadline && (
            <p style={{ textAlign: "center", fontSize: "12px", color: "#d9534f", marginTop: "15px", fontWeight: "bold" }}>
              ⏰ Fecha límite: {new Date(post.deadline).toLocaleDateString()}
            </p>
          )}
        </footer>
      </article>
    </div>
  );
}