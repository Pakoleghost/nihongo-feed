"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function PostDetailPage() {
  const { id } = useParams();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchPost = useCallback(async () => {
    const { data } = await supabase.from("posts").select("*, profiles:user_id(*)").eq("id", id).single();
    setPost(data);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchPost(); }, [fetchPost]);

  if (loading || !post) return <div style={{ padding: "40px", textAlign: "center" }}>Cargando post...</div>;

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      <Link href="/" style={{ color: "#2cb696", textDecoration: "none" }}>← Volver</Link>
      <article style={{ marginTop: "30px" }}>
        <h1>{post.content.split('\n')[0]}</h1>
        <p style={{ color: "#666" }}>Por {post.profiles?.username}</p>
        <div style={{ fontSize: "18px", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>
          {post.content.split('\n').slice(1).join('\n')}
        </div>
      </article>
    </div>
  );
}