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
      <path d="M12 2.75l1.15 2.65 2.88.23-2.2 1.88.67 2.82L12 8.9l-2.5 1.43.67-2.82-2.2-1.88 2.88-.23L12 2.75Z" stroke="currentColor" strokeWidth="1.45" strokeLinejoin="round" />
      <path d="M21.25 12l-2.65 1.15-.23 2.88-1.88-2.2-2.82.67L15.1 12l-1.43-2.5 2.82.67 1.88-2.2.23 2.88L21.25 12Z" stroke="currentColor" strokeWidth="1.45" strokeLinejoin="round" />
      <path d="M12 21.25l-1.15-2.65-2.88-.23 2.2-1.88-.67-2.82L12 15.1l2.5-1.43-.67 2.82 2.2 1.88-2.88.23L12 21.25Z" stroke="currentColor" strokeWidth="1.45" strokeLinejoin="round" />
      <path d="M2.75 12l2.65-1.15.23-2.88 1.88 2.2 2.82-.67L8.9 12l1.43 2.5-2.82-.67-1.88 2.2-.23-2.88L2.75 12Z" stroke="currentColor" strokeWidth="1.45" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth="1.6" />
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

function formatFeedDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (hours < 1) return "ahora";
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
}

function normalizeGroupValue(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function isPublicTargetGroup(value?: string | null) {
  const normalized = normalizeGroupValue(value);
  return !normalized || normalized === "todos" || normalized === "general";
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

  useEffect(() => {
    if (!myProfile || myProfile.is_approved || myProfile.is_admin) return;
    const timer = setInterval(() => {
      void fetchData();
    }, 6000);
    return () => clearInterval(timer);
  }, [myProfile, fetchData]);

  if (!loading && myProfile && !myProfile.is_approved && !myProfile.is_admin) {
    return <div style={{ textAlign: "center", padding: "100px 20px", fontFamily: "sans-serif" }}>⏳ Tu cuenta espera aprobación de Pako-sensei...</div>;
  }

  const canSeePost = (p: any) => {
    if (myProfile?.is_admin) return true;
    const target = p?.target_group;
    if (isPublicTargetGroup(target)) return true;
    return normalizeGroupValue(target) === normalizeGroupValue(myProfile?.group_name);
  };

  const visibleRootPosts = posts.filter((p) => canSeePost(p) && !p.parent_assignment_id);
  const pinnedAnnouncements = visibleRootPosts.filter(
    (p) => p.profiles?.is_admin && p.type === "announcement" && !dismissedAnnouncements.includes(p.id),
  );
  const regularFeed = visibleRootPosts.filter(
    (p) => p.type !== "announcement" || dismissedAnnouncements.includes(p.id),
  );

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', minHeight: "100vh", paddingBottom: "28px" }}>
      <header style={{ 
        display: "flex", justifyContent: "space-between", alignItems: "center", 
        padding: "14px 16px", borderBottom: "1px solid rgba(17,17,20,.08)", position: "sticky", 
        top: 0, background: "rgba(255,255,255,.88)", backdropFilter: "blur(12px)", zIndex: 20,
        boxShadow: "0 8px 30px rgba(0,0,0,.03)"
      }}>
        <Link href="/" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", flexShrink: 1, minWidth: 0, textDecoration: "none" }}>
          <span style={{ fontSize: "10px", color: "#7f7f88", letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 700 }}>Nihongo Feed</span>
          <span style={{ fontSize: "28px", lineHeight: 1, fontWeight: 900, color: "#111114", letterSpacing: "-0.02em" }}>フィード</span>
        </Link>
        
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Link href="/resources" title="Recursos" aria-label="Recursos" style={{ color: "#555", display: "inline-flex", alignItems: "center", justifyContent: "center", width: "38px", height: "38px", borderRadius: "999px", border: "1px solid rgba(17,17,20,.08)", background: "#fff" }}>
            <IconBook />
          </Link>
          <Link href="/notifications" title="Notificaciones" aria-label="Notificaciones" style={{ position: "relative", color: "#555", display: "inline-flex", alignItems: "center", justifyContent: "center", width: "38px", height: "38px", borderRadius: "999px", border: "1px solid rgba(17,17,20,.08)", background: "#fff" }}>
            <IconBell />
            {unreadNotifications > 0 && <span style={{ position: "absolute", top: "-6px", right: "-8px", backgroundColor: "#ff2d55", color: "#fff", fontSize: "10px", padding: "2px 5px", borderRadius: "10px", fontWeight: "bold", lineHeight: 1.2 }}>{unreadNotifications}</span>}
          </Link>
          {myProfile?.is_admin && (
            <Link href="/admin/groups" title="Panel Maestro" aria-label="Panel Maestro" style={{ color: "#555", display: "inline-flex", alignItems: "center", justifyContent: "center", width: "38px", height: "38px", borderRadius: "999px", border: "1px solid rgba(17,17,20,.08)", background: "#fff" }}>
              <IconSettings />
            </Link>
          )}
          <Link href="/write" style={{ background: "linear-gradient(135deg, #34c5a6, #25a98f)", color: "#fff", padding: "10px 20px", borderRadius: "999px", textDecoration: "none", fontSize: "14px", fontWeight: "700", boxShadow: "0 8px 18px rgba(44,182,150,.22)" }}>書く</Link>

          <Link href={`/profile/${myProfile?.id}`} style={{ width: "38px", height: "38px", borderRadius: "50%", overflow: "hidden", border: "2px solid #fff", boxShadow: "0 0 0 1px rgba(17,17,20,.08)", flexShrink: 0 }}>
            {myProfile?.avatar_url ? <img src={myProfile.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", background: "#f5f5f5" }}><AvatarPlaceholder size={28} /></div>}
          </Link>
        </div>
      </header>

      <main style={{ paddingTop: "14px", background: "linear-gradient(to bottom, rgba(255,255,255,.8), rgba(255,255,255,.7))" }}>
        <section style={{ margin: "0 14px 14px", padding: "14px 16px 12px", borderRadius: "16px", background: "#fff", border: "1px solid rgba(17,17,20,.07)", boxShadow: "0 10px 28px rgba(0,0,0,.03)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
            <div>
              <div style={{ fontSize: "12px", letterSpacing: ".08em", textTransform: "uppercase", color: "#7a7a84", fontWeight: 700 }}>Home Feed</div>
              <h1 style={{ margin: "4px 0 0", fontSize: "28px", lineHeight: 1.05, color: "#111114", fontWeight: 800 }}>フィード</h1>
            </div>
            <div style={{ fontSize: "12px", color: "#777", background: "#f6f7f8", border: "1px solid rgba(17,17,20,.06)", borderRadius: "999px", padding: "6px 10px", fontWeight: 600 }}>
              {regularFeed.length} posts
            </div>
          </div>
        </section>

        {pinnedAnnouncements.map(post => (
          <div key={post.id} style={{ margin: "0 14px 12px", padding: "16px 16px 14px 18px", borderRadius: "16px", backgroundColor: post.type === 'assignment' ? "#f2fffa" : "#f4fbff", border: "1px solid rgba(17,17,20,0.06)", position: "relative", boxShadow: "0 8px 24px rgba(0,0,0,.025)" }}>
            <div style={{ position: "absolute", left: "0", top: "12px", bottom: "12px", width: "4px", borderRadius: "0 6px 6px 0", background: post.type === "assignment" ? "#2cb696" : "#58a8ff" }} />
            <button onClick={() => { const newD = [...dismissedAnnouncements, post.id]; setDismissedAnnouncements(newD); localStorage.setItem("dismissed_posts", JSON.stringify(newD)); }} style={{ position: "absolute", top: "10px", right: "10px", background: "#fff", border: "1px solid rgba(17,17,20,.08)", color: "#8b8b93", cursor: "pointer", fontSize: "13px", width: "24px", height: "24px", borderRadius: "999px", lineHeight: 1 }}>✕</button>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "10px", fontSize: "11px", fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "#3d81ce" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "999px", background: "currentColor" }} />
              Anuncio
            </div>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", lineHeight: 1.35, fontWeight: "800", color: "#222" }}>{post.content.split('\n')[0]}</h3>
            <Link href={`/post/${post.id}`} style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#3d81ce", fontWeight: 700, textDecoration: "none", background: "#fff", border: "1px solid rgba(88,168,255,.2)", padding: "8px 10px", borderRadius: "999px" }}>Abrir anuncio</Link>
          </div>
        ))}

        <section style={{ margin: "0 14px", background: "#fff", borderRadius: "20px", border: "1px solid rgba(17,17,20,.06)", overflow: "hidden", boxShadow: "0 12px 34px rgba(0,0,0,.035)" }}>
        {regularFeed.map((post, idx) => {
          const [titulo, ...cuerpo] = post.content.split('\n');
          const isAssignmentPost = post.type === "assignment" && !post.parent_assignment_id;
          const rowBg = isAssignmentPost ? "#f6fffb" : idx % 2 === 0 ? "rgba(255,255,255,1)" : "rgba(251,251,252,1)";
          return (
            <article key={post.id} style={{ padding: "18px 16px", borderBottom: idx === regularFeed.length - 1 ? "none" : "1px solid rgba(17,17,20,.06)", display: "flex", gap: "14px", alignItems: "flex-start", background: rowBg }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center", minWidth: 0 }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", overflow: "hidden", background: "#f5f5f5", flexShrink: 0, border: "1px solid rgba(17,17,20,.06)" }}>
                    {post.profiles?.avatar_url ? (
                      <img src={post.profiles.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : <div style={{ textAlign: "center", fontSize: "12px", lineHeight: "26px", color: "#ccc" }}>👤</div>}
                  </div>
                  <Link href={`/profile/${post.user_id}`} style={{ textDecoration: "none", color: "#2b2b30", fontWeight: 700, fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "44%" }}>
                    {post.profiles?.is_admin ? "Sensei" : post.profiles?.username}
                  </Link>
                  <span style={{ width: "3px", height: "3px", borderRadius: "50%", background: "#b7b7bf", flexShrink: 0 }} />
                  <span style={{ color: "#7c7c85", fontSize: "12px", fontWeight: 500, whiteSpace: "nowrap" }}>{formatFeedDate(post.created_at)}</span>
                  {post.is_reviewed && <span style={{ fontSize: "10px", color: "#2cb696", fontWeight: "700", border: "1px solid #2cb696", padding: "1px 6px", borderRadius: "4px" }}>済 Sumi</span>}
                </div>
                <Link href={`/post/${post.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  {isAssignmentPost && (
                    <div style={{ marginBottom: "8px", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "10px", letterSpacing: ".06em", textTransform: "uppercase", fontWeight: 800, color: "#159578", background: "#ecfdf5", border: "1px solid #bbf7d0", borderRadius: "999px", padding: "4px 8px" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "999px", background: "currentColor" }} />
                      {post.is_forum ? "Tarea Foro" : "Tarea"}
                    </div>
                  )}
                  <h2 style={{ margin: "0 0 8px 0", fontSize: "17px", fontWeight: 800, lineHeight: "1.35", color: "#17171b", letterSpacing: "-0.01em" }}>{titulo}</h2>
                  {cuerpo.length > 0 && (
                    <p style={{ margin: 0, fontSize: "13.5px", color: "#666a73", lineHeight: "1.55", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{cuerpo.join(' ')}</p>
                  )}
                </Link>
                <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "8px", color: "#8a8a94", fontSize: "12px", fontWeight: 500 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ width: "14px", height: "14px", borderRadius: "999px", border: "1.4px solid currentColor", display: "inline-block" }} />
                    投稿
                  </span>
                  <span>·</span>
                  <span>{post.target_group || post.profiles?.group_name || "General"}</span>
                </div>
                {isAssignmentPost && (
                  <div style={{ marginTop: "10px" }}>
                    <Link href={post.is_forum ? `/post/${post.id}` : `/write?assignment_id=${post.id}&title=${encodeURIComponent(titulo || "Tarea")}`} style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#147f68", fontWeight: 700, textDecoration: "none", background: "#fff", border: "1px solid rgba(44,182,150,.2)", padding: "7px 10px", borderRadius: "999px" }}>
                      {post.is_forum ? "Entrar al foro" : "Entregar tarea"}
                    </Link>
                  </div>
                )}
              </div>
              {post.image_url && (
                <Link href={`/post/${post.id}`} style={{ flexShrink: 0, alignSelf: "center" }}>
                  <img src={post.image_url} style={{ width: "120px", height: "88px", borderRadius: "12px", objectFit: "cover", border: "1px solid rgba(17,17,20,.06)", boxShadow: "0 8px 20px rgba(0,0,0,.08)" }} />
                </Link>
              )}
            </article>
          );
        })}
        </section>
      </main>
    </div>
  );
}
