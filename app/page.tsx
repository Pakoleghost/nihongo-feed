"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setMyProfile(prof);

    if (prof?.is_approved || prof?.is_admin) {
      const { data: postsData } = await supabase.from("posts").select(`*, profiles:user_id (username, avatar_url, group_name, is_admin)` ).order("created_at", { ascending: false });
      setPosts(postsData || []);

      const { count } = await supabase.from("notifications").select("*", { count: 'exact', head: true }).eq("user_id", user.id).eq("is_read", false);
      setUnreadNotifications(count || 0);

      const saved = localStorage.getItem("dismissed_posts");
      if (saved) setDismissedAnnouncements(JSON.parse(saved));
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!loading && myProfile && !myProfile.is_approved && !myProfile.is_admin) {
    return <div style={{ textAlign: "center", padding: "100px 20px" }}>⏳ Esperando aprobación de Pako-sensei...</div>;
  }

  const teacherDirectives = posts.filter(p => p.profiles?.is_admin && (p.type === 'assignment' || p.type === 'announcement') && (p.target_group === myProfile?.group_name || p.target_group === "Todos"));
  const regularFeed = posts.filter(p => !p.profiles?.is_admin || (p.type !== 'assignment' && p.type !== 'announcement') || dismissedAnnouncements.includes(p.id));

  return (
    <div style={{ maxWidth: "650px", margin: "0 auto", fontFamily: "sans-serif", backgroundColor: "#fff", minHeight: "100vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", borderBottom: "1px solid #eee", position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 10 }}>
        <Link href="/" style={{ textDecoration: "none", color: "#2cb696", fontWeight: "bold", fontSize: "20px" }}>Nihongo Note</Link>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {myProfile?.is_admin && <Link href="/admin/groups" style={{ fontSize: "18px", textDecoration: "none" }}>⚙️</Link>}
          <Link href="/notifications" style={{ position: "relative", textDecoration: "none", fontSize: "18px" }}>
            🔔 {unreadNotifications > 0 && <span style={{ position: "absolute", top: "-5px", right: "-5px", backgroundColor: "#d9534f", color: "#fff", fontSize: "9px", padding: "2px 4px", borderRadius: "10px" }}>{unreadNotifications}</span>}
          </Link>
          <button onClick={() => setShowArchived(!showArchived)} style={{ background: "none", border: "none", fontSize: "12px", color: showArchived ? "#2cb696" : "#888", cursor: "pointer" }}>
            {showArchived ? "📖 Muro" : "📑 Tareas"}
          </button>
          <Link href="/write" style={{ backgroundColor: "#2cb696", color: "#fff", padding: "6px 16px", borderRadius: "20px", textDecoration: "none", fontSize: "13px", fontWeight: "bold", whiteSpace: "nowrap" }}>書く</Link>
          <Link href={`/profile/${myProfile?.id}`} style={{ width: "30px", height: "30px", borderRadius: "50%", overflow: "hidden", border: "1px solid #ddd" }}>
            {myProfile?.avatar_url ? <img src={myProfile.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
          </Link>
        </div>
      </header>

      <main>
        {!showArchived && teacherDirectives.filter(p => !dismissedAnnouncements.includes(p.id)).map(post => (
          <div key={post.id} style={{ margin: "10px 20px", padding: "15px", borderRadius: "12px", backgroundColor: post.type === 'assignment' ? "#f0fdf4" : "#eff6ff", border: `1px solid ${post.type === 'assignment' ? "#2cb696" : "#3b82f6"}`, position: "relative" }}>
            <button onClick={() => { const newD = [...dismissedAnnouncements, post.id]; setDismissedAnnouncements(newD); localStorage.setItem("dismissed_posts", JSON.stringify(newD)); }} style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", cursor: "pointer" }}>✕</button>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "15px" }}>{post.content.split('\n')[0]}</h3>
            <Link href={`/write?assignment_id=${post.id}&title=${encodeURIComponent(post.content.split('\n')[0])}`} style={{ fontSize: "12px", color: "#2cb696", fontWeight: "bold", textDecoration: "none" }}>✍️ Entregar tarea</Link>
          </div>
        ))}

        {(showArchived ? teacherDirectives : regularFeed).map(post => {
          const [titulo, ...cuerpo] = post.content.split('\n');
          return (
            <article key={post.id} style={{ padding: "20px", borderBottom: "1px solid #eee", display: "flex", gap: "15px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "5px", alignItems: "center" }}>
                  <Link href={`/profile/${post.user_id}`} style={{ textDecoration: "none", color: "#333", fontWeight: "bold", fontSize: "12px" }}>
                    {post.profiles?.is_admin ? "👨‍🏫 Sensei" : post.profiles?.username}
                  </Link>
                </div>
                <Link href={`/post/${post.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <h2 style={{ margin: "0 0 5px 0", fontSize: "17px", fontWeight: "bold" }}>{titulo}</h2>
                  <p style={{ fontSize: "14px", color: "#666", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{cuerpo.join(' ')}</p>
                </Link>
              </div>
              {post.image_url && <img src={post.image_url} style={{ width: "80px", height: "80px", borderRadius: "8px", objectFit: "cover" }} />}
            </article>
          );
        })}
      </main>
    </div>
  );
}