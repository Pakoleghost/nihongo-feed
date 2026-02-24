"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Post = {
  id: string;
  content: string;
  created_at: string;
  username: string;
  avatar_url: string | null;
  type: 'post' | 'assignment' | 'announcement';
  group_name: string | null;
  target_group: string | null;
  deadline?: string;
};

export default function HomePage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [filter, setFilter] = useState("Todos");
  const [groups, setGroups] = useState<any[]>([]);

  const fetchPosts = useCallback(async (groupFilter: string) => {
    setLoading(true);
    let query = supabase.from("posts").select(`*, profiles(username, avatar_url, group_name)` );

    // Filtro básico de feed
    if (groupFilter !== "Todos") {
      query = query.or(`target_group.eq.${groupFilter},profiles.group_name.eq.${groupFilter}`);
    }

    const { data } = await query.order("created_at", { ascending: false });

    if (data) {
      const formatted = data.map((row: any) => ({
        ...row,
        username: row.profiles?.username || "Usuario",
        avatar_url: row.profiles?.avatar_url,
        group_name: row.profiles?.group_name
      }));

      // Lógica de Orden: Tareas de MI grupo primero, luego el resto por fecha
      const sorted = formatted.sort((a, b) => {
        if (a.type === 'assignment' && a.target_group === myProfile?.group_name) return -1;
        if (b.type === 'assignment' && b.target_group === myProfile?.group_name) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setPosts(sorted);
    }
    setLoading(false);
  }, [myProfile]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setMyProfile(prof);

      const { data: grps } = await supabase.from("groups").select("name");
      setGroups(grps || []);
      
      fetchPosts("Todos");
    };
    init();
  }, [router, fetchPosts]);

  const getPostStyle = (type: string) => {
    switch(type) {
      case 'assignment': return { bg: "#eefaf5", border: "#2cb696", label: "宿題 (Tarea)", icon: "📝" };
      case 'announcement': return { bg: "#f0f7ff", border: "#0070f3", label: "お知らせ (Aviso)", icon: "📢" };
      default: return { bg: "#fff", border: "#eee", label: "", icon: "" };
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", padding: "15px", position: "sticky", top: 0, backgroundColor: "#fff", borderBottom: "1px solid #eee", zIndex: 10 }}>
        <h1 style={{ margin: 0, fontSize: "20px" }}>Nihongo Note</h1>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {myProfile?.is_admin && <Link href="/admin/groups" style={{ fontSize: "12px", color: "#2cb696", textDecoration: "none" }}>⚙️ Maestro</Link>}
          <Link href="/write" style={{ padding: "6px 15px", backgroundColor: "#2cb696", color: "#fff", borderRadius: "20px", textDecoration: "none" }}>書く</Link>
          <Link href="/profile" style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#eee", overflow: "hidden" }}>
            {myProfile?.avatar_url ? <img src={myProfile.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
          </Link>
        </div>
      </header>

      <main style={{ padding: "10px 20px" }}>
        {posts.map((post) => {
          const style = getPostStyle(post.type);
          return (
            <article key={post.id} style={{ 
              padding: "20px", 
              marginBottom: "15px", 
              borderRadius: "12px", 
              backgroundColor: style.bg, 
              border: `1px solid ${style.border}`,
              position: "relative"
            }}>
              {style.label && (
                <span style={{ position: "absolute", top: "10px", right: "15px", fontSize: "10px", fontWeight: "bold", color: style.border }}>
                  {style.icon} {style.label}
                </span>
              )}
              
              <div style={{ marginBottom: "10px", fontSize: "13px" }}>
                <strong>{post.username}</strong> 
                <span style={{ color: "#888" }}> • {post.group_name || "Sensei"}</span>
              </div>

              <p style={{ margin: 0, fontSize: "15px", lineHeight: "1.5" }}>{post.content}</p>
              
              {post.deadline && (
                <div style={{ marginTop: "10px", fontSize: "12px", color: "#d9534f", fontWeight: "bold" }}>
                  ⏰ Límite: {new Date(post.deadline).toLocaleDateString()}
                </div>
              )}
            </article>
          );
        })}
      </main>
    </div>
  );
}