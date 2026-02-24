"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [myUsername, setMyUsername] = useState<string | null>(null);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false); // Nuevo estado de admin

  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("posts")
      .select(`
        id, content, created_at, user_id, image_url,
        profiles (username, avatar_url)
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const formatted = (data as any).map((row: any) => ({
        id: row.id,
        content: row.content || "",
        created_at: row.created_at,
        user_id: row.user_id,
        username: row.profiles?.username || "Usuario",
        avatar_url: row.profiles?.avatar_url || null,
        image_url: row.image_url || null,
      }));
      setPosts(formatted);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const checkUserAndData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
      } else {
        // Buscamos perfil incluyendo el campo is_admin
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, avatar_url, is_admin")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setMyUsername(profile.username);
          setMyAvatarUrl(profile.avatar_url);
          setIsAdmin(profile.is_admin); // Activamos el botón si es TRUE
        }
        await fetchPosts();
      }
    };

    checkUserAndData();
  }, [router, fetchPosts]);

  if (loading) return <div style={{ textAlign: "center", padding: "50px" }}>Cargando...</div>;

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif" }}>
      {/* HEADER */}
      <header style={{ 
        display: "flex", justifyContent: "space-between", alignItems: "center", 
        padding: "15px 20px", borderBottom: "1px solid #eee", position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 10
      }}>
        <Link href="/" style={{ textDecoration: "none", color: "#333", fontWeight: "bold", fontSize: "20px" }}>Nihongo Note</Link>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          
          {/* BOTÓN SOLO PARA ADMINS */}
          {isAdmin && (
            <Link href="/admin/groups" style={{ 
              padding: "8px 12px", border: "1px solid #2cb696", color: "#2cb696", borderRadius: "20px", textDecoration: "none", fontSize: "13px", fontWeight: "bold" 
            }}>
              ⚙️ Grupos
            </Link>
          )}

          <Link href="/write" style={{ padding: "8px 15px", backgroundColor: "#2cb696", color: "#fff", borderRadius: "20px", textDecoration: "none", fontSize: "14px", fontWeight: "bold" }}>Escribir</Link>
          
          <Link href="/profile" style={{ width: "35px", height: "35px", borderRadius: "50%", backgroundColor: "#eee", overflow: "hidden", display: "block", border: "1px solid #ddd" }}>
            {myAvatarUrl ? (
              <img src={myAvatarUrl} alt="Perfil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ textAlign: "center", lineHeight: "35px" }}>👤</div>
            )}
          </Link>
        </div>
      </header>

      {/* FEED */}
      <main style={{ padding: "10px 20px" }}>
        {posts.map((post) => (
          <article key={post.id} style={{ padding: "20px 0", borderBottom: "1px solid #eee" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <div style={{ width: "25px", height: "25px", borderRadius: "50%", backgroundColor: "#eee", overflow: "hidden" }}>
                {post.avatar_url && <img src={post.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              </div>
              <span style={{ fontSize: "14px", fontWeight: "bold" }}>{post.username}</span>
            </div>
            <Link href={`/post/${post.id}`} style={{ textDecoration: "none", color: "inherit", display: "flex", gap: "15px" }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: "0 0 5px 0" }}>{post.content.split('\n')[0]}</h3>
                <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>{post.content.substring(0, 100)}...</p>
              </div>
              {post.image_url && (
                <img src={post.image_url} style={{ width: "80px", height: "80px", borderRadius: "8px", objectFit: "cover" }} />
              )}
            </Link>
          </article>
        ))}
      </main>
    </div>
  );
}