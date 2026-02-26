"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

function IconBook() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h11.5v15.5H7A2.5 2.5 0 0 0 4.5 21V5.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M7 3v15.5A2.5 2.5 0 0 0 4.5 21H17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7.5 9a4.5 4.5 0 1 1 9 0v2.4c0 .8.24 1.58.7 2.24l.55.8c.42.6 0 1.42-.73 1.42H6.98c-.73 0-1.15-.82-.73-1.42l.55-.8c.46-.66.7-1.44.7-2.24V9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 8.75a3.25 3.25 0 1 0 0 6.5a3.25 3.25 0 0 0 0-6.5Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M19 12a7.5 7.5 0 0 0-.08-1.08l1.45-1.13-1.35-2.34-1.78.56a7.9 7.9 0 0 0-1.87-1.08L15.1 5h-2.7l-.27 1.93a7.9 7.9 0 0 0-1.87 1.08l-1.78-.56-1.35 2.34 1.45 1.13A7.5 7.5 0 0 0 5 12c0 .37.03.73.08 1.08l-1.45 1.13 1.35 2.34 1.78-.56c.56.46 1.2.83 1.87 1.08L12.4 19h2.7l.27-1.93c.67-.25 1.31-.62 1.87-1.08l1.78.56 1.35-2.34-1.45-1.13c.05-.35.08-.71.08-1.08Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function AvatarPlaceholder({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="11.5" fill="#f7f7f7" stroke="#e8e8e8" />
      <circle cx="12" cy="9.2" r="3.2" fill="#cfcfd4" />
      <path d="M6.7 18.1c1.1-2.3 3.05-3.4 5.3-3.4c2.25 0 4.2 1.1 5.3 3.4" stroke="#cfcfd4" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

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

  if (!loading && myProfile && !myProfile.is_approved && !myProfile.is_admin) {
    return <div style={{ textAlign: "center", padding: "100px 20px", fontFamily: "sans-serif" }}>⏳ Tu cuenta espera aprobación de Pako-sensei...</div>;
  }

  const teacherDirectives = posts.filter(p => p.profiles?.is_admin && (p.type === 'assignment' || p.type === 'announcement') && (p.target_group === myProfile?.group_name || p.target_group === "Todos"));
  const regularFeed = posts.filter(p => !p.profiles?.is_admin || (p.type !== 'assignment' && p.type !== 'announcement') || dismissedAnnouncements.includes(p.id));

  return (
    <div style={{ maxWidth: "650px", margin: "0 auto", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: "#fff", minHeight: "100vh" }}>
      <header style={{ 
        display: "flex", justifyContent: "space-between", alignItems: "center", 
        padding: "2px 16px", borderBottom: "1px solid #f2f2f2", position: "sticky", 
        top: 0, backgroundColor: "#fff", zIndex: 10
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{ height: "72px", width: "auto", display: "block", imageRendering: "auto" }} 
          />
        </Link>
        
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Link href="/resources" title="Recursos" aria-label="Recursos" style={{ color: "#555", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <IconBook />
          </Link>
          <Link href="/notifications" title="Notificaciones" aria-label="Notificaciones" style={{ position: "relative", color: "#555", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <IconBell />
            {unreadNotifications > 0 && <span style={{ position: "absolute", top: "-6px", right: "-8px", backgroundColor: "#ff2d55", color: "#fff", fontSize: "10px", padding: "2px 5px", borderRadius: "10px", fontWeight: "bold", lineHeight: 1.2 }}>{unreadNotifications}</span>}
          </Link>
          {myProfile?.is_admin && (
            <Link href="/admin/groups" title="Panel Maestro" aria-label="Panel Maestro" style={{ color: "#555", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <IconSettings />
            </Link>
          )}
          <Link href="/write" style={{ backgroundColor: "#2cb696", color: "#fff", padding: "8px 18px", borderRadius: "24px", textDecoration: "none", fontSize: "14px", fontWeight: "bold" }}>書く</Link>

          <Link href={`/profile/${myProfile?.id}`} style={{ width: "34px", height: "34px", borderRadius: "50%", overflow: "hidden", border: "1px solid #eee", flexShrink: 0 }}>
            {myProfile?.avatar_url ? <img src={myProfile.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", background: "#f5f5f5" }}><AvatarPlaceholder size={28} /></div>}
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
