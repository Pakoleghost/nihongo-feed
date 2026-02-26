"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function StudentProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setMyId(user?.id || null);

    const { data: target } = await supabase.from("profiles").select("*").eq("id", id).single();
    setProfile(target);

    const { data: userPosts } = await supabase.from("posts").select("*").eq("user_id", id).order("created_at", { ascending: false });
    setPosts(userPosts || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !profile) return <div style={{ padding: "100px 20px", textAlign: "center", color: "#ccc" }}>...</div>;

  const isMe = myId === id;

  return (
    <div style={{ maxWidth: "650px", margin: "0 auto", padding: "40px 20px", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div style={{ width: "100px", height: "100px", borderRadius: "50%", overflow: "hidden", margin: "0 auto 15px", border: "2px solid #eee" }}>
          {profile.avatar_url ? <img src={profile.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ fontSize: "50px", lineHeight: "100px", background: "#f5f5f5", color: "#ccc" }}>👤</div>}
        </div>
        <h1 style={{ fontSize: "24px", margin: "0 0 5px 0", color: "#222" }}>{profile.full_name || profile.username}</h1>
        <p style={{ color: "#888", fontSize: "14px", margin: "0 0 20px 0" }}>@{profile.username} • {profile.group_name || "Sin grupo"}</p>
        
        {/* Biografía restaurada */}
        {profile.bio && (
          <p style={{ fontSize: "15px", color: "#444", lineHeight: "1.6", maxWidth: "450px", margin: "0 auto", whiteSpace: "pre-wrap" }}>
            {profile.bio}
          </p>
        )}

        {isMe && (
          <Link href="/profile/edit" style={{ display: "inline-block", marginTop: "20px", fontSize: "13px", color: "#2cb696", textDecoration: "none", border: "1px solid #2cb696", padding: "6px 20px", borderRadius: "20px", fontWeight: "bold" }}>
            Editar perfil
          </Link>
        )}
      </div>

      <div style={{ borderTop: "1px solid #eee", paddingTop: "30px" }}>
        <h2 style={{ fontSize: "14px", color: "#999", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "20px" }}>Publicaciones</h2>
        {posts.map(post => {
          const [titulo] = post.content.split('\n');
          return (
            <Link href={`/post/${post.id}`} key={post.id} style={{ display: "block", padding: "15px 0", borderBottom: "1px solid #f9f9f9", textDecoration: "none", color: "#222" }}>
              <h3 style={{ fontSize: "17px", margin: "0 0 5px 0" }}>{titulo}</h3>
              <div style={{ fontSize: "12px", color: "#aaa" }}>{new Date(post.created_at).toLocaleDateString()}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}