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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (!loading && myProfile && !myProfile.is_approved && !myProfile.is_admin) {
    return <div style={{ textAlign: "center", padding: "100px 20px", fontFamily: "sans-serif" }}>⏳ Tu cuenta espera aprobación de Pako-sensei...</div>;
  }

  const teacherDirectives = posts.filter(p => p.profiles?.is_admin && (p.type === 'assignment' || p.type === 'announcement') && (p.target_group === myProfile?.group_name || p.target_group === "Todos"));
  const regularFeed = posts.filter(p => !p.profiles?.is_admin || (p.type !== 'assignment' && p.type !== 'announcement') || dismissedAnnouncements.includes(p.id));

  return (
    <div style={{ maxWidth: "650px", margin: "0 auto", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: "#fff", minHeight: "100vh" }}>
      <header style={{ 
        display: "flex", justifyContent: "space-between", alignItems: "center", 
        padding: "8px 20px", borderBottom: "1px solid #f2f2f2", position: "sticky", 
        top: 0, backgroundColor: "#fff", zIndex: 10
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{ height: "60px", width: "auto", display: "block", imageRendering: "auto" }} 
          />
        </Link>
        
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <Link href="/resources" title="Recursos" style={{ textDecoration: "none", fontSize: "20px" }}>📚</Link>
          <Link href="/notifications" style={{ position: "relative", textDecoration: "none", fontSize: "20px" }}>
            🔔 {unreadNotifications > 0 && <span style={{ position: "absolute", top: "-5px", right: "-5px", backgroundColor: "#ff2d55", color: "#fff", fontSize: "10px", padding: "2px 5px", borderRadius: "10px", fontWeight: "bold" }}>{unreadNotifications}</span>}
          </Link>
          {myProfile?.is_admin && <Link href="/admin/groups" title="Panel Maestro" style={{ textDecoration: "none", fontSize: "20px" }}>⚙️</Link>}
          <Link href="/write" style={{ backgroundColor: "#2cb696", color: "#fff", padding: "8px 18px", borderRadius: "24px", textDecoration: "none", fontSize: "14px", fontWeight: "bold" }}>書く</Link>
          
          <button onClick={handleSignOut} title="Cerrar sesión" style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", padding: 0 }}>🚪</button>

          <Link href={`/profile/${myProfile?.id}`} style={{ width: "34px", height: "34px", borderRadius: "50%", overflow: "hidden", border: "1px solid #eee", flexShrink: 0 }}>
            {myProfile?.avatar_url ? <img src={myProfile.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ lineHeight: "34px", textAlign: "center", background: "#f5f5f5", color: "#ccc" }}>👤</div>}
          </Link>
        </div>
      </header>

      <main style={{ paddingTop: "20px" }}>
        {teacherDirectives.filter(p => !dismissedAnnouncements.includes(p.id)).map(post => (
          <div key={post.id} style={{ margin: "0 20px 20px", padding: "18px", borderRadius: "12px", backgroundColor: post.type === 'assignment' ? "#f0fdf4" : "#f0f9ff", border: "1px solid rgba(0,0,0,0.05)", position: "relative" }}>
            <button onClick={() => { const newD = [...dismissedAnnouncements, post.id]; setDismissedAnnouncements(newD); localStorage.setItem("dismissed_posts", JSON.stringify(newD)); }} style={{ position: "absolute", top: "12px", right: "12px", background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: "16px" }}>✕</button>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "700", color: "#333" }}>{post.content.split('\n')[0]}</h3>
            <Link href={`/write?assignment_id=${post.id}&title=${encodeURIComponent(post.content.split('\n')[0])}`} style={{ fontSize: "13px", color: "#2cb696", fontWeight: "bold", textDecoration: "none" }}>✍️ Entregar tarea</Link>
          </div>
        ))}

        {regularFeed.map(post => {
          const [titulo, ...cuerpo] = post.content.split('\n');
          return (
            <article key={post.id} style={{ padding: "24px 20px", borderBottom: "1px solid #f2f2f2", display: "flex", gap: "20px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "center" }}>
                  <div style={{ width: "26px", height: "26px", borderRadius: "50%", overflow: "hidden", background: "#f5f5f5", flexShrink: 0 }}>
                    {post.profiles?.avatar_url ? (
                      <img src={post.profiles.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : <div style={{ textAlign: "center", fontSize: "12px", lineHeight: "26px", color: "#ccc" }}>👤</div>}
                  </div>
                  <Link href={`/profile/${post.user_id}`} style={{ textDecoration: "none", color: "#222", fontWeight: "500", fontSize: "13px" }}>
                    {post.profiles?.is_admin ? "Sensei" : post.profiles?.username}
                  </Link>
                  {post.is_reviewed && <span style={{ fontSize: "10px", color: "#2cb696", fontWeight: "700", border: "1px solid #2cb696", padding: "1px 6px", borderRadius: "4px" }}>済 Sumi</span>}
                </div>
                <Link href={`/post/${post.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <h2 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "700", lineHeight: "1.4", color: "#222" }}>{titulo}</h2>
                  <p style={{ fontSize: "14px", color: "#666", lineHeight: "1.6", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{cuerpo.join(' ')}</p>
                </Link>
              </div>
              {post.image_url && (
                <Link href={`/post/${post.id}`} style={{ flexShrink: 0 }}>
                  <img src={post.image_url} style={{ width: "100px", height: "100px", borderRadius: "6px", objectFit: "cover" }} />
                </Link>
              )}
            </article>
          );
        })}
      </main>
    </div>
  );
}