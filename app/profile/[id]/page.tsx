"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

function AvatarPlaceholder({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="11.5" fill="#f7f7f7" stroke="#e8e8e8" />
      <circle cx="12" cy="9.2" r="3.2" fill="#cfcfd4" />
      <path d="M6.7 18.1c1.1-2.3 3.05-3.4 5.3-3.4c2.25 0 4.2 1.1 5.3 3.4" stroke="#cfcfd4" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

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
    <div style={{ maxWidth: "650px", margin: "0 auto", padding: "24px 16px 40px", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: "#fff", minHeight: "100vh" }}>
      <div style={{ textAlign: "center", marginBottom: "28px", padding: "12px 8px 24px", borderBottom: "1px solid #f1f1f1" }}>
        <div style={{ width: "108px", height: "108px", borderRadius: "50%", overflow: "hidden", margin: "0 auto 15px", border: "2px solid #eee", background: "#f8f8f8", display: "grid", placeItems: "center" }}>
          {profile.avatar_url ? <img src={profile.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <AvatarPlaceholder size={92} />}
        </div>
        <h1 style={{ fontSize: "24px", margin: "0 0 5px 0", color: "#222", letterSpacing: "-0.01em" }}>{profile.full_name || profile.username}</h1>
        <p style={{ color: "#888", fontSize: "14px", margin: "0 0 18px 0" }}>@{profile.username} • {profile.group_name || "Sin grupo"}</p>
        
        {profile.bio && (
          <p style={{ fontSize: "15px", color: "#444", lineHeight: "1.65", maxWidth: "460px", margin: "0 auto", whiteSpace: "pre-wrap" }}>
            {profile.bio}
          </p>
        )}

        {isMe && (
          <Link href="/profile/edit" style={{ display: "inline-block", marginTop: "20px", fontSize: "13px", color: "#2cb696", textDecoration: "none", border: "1px solid #2cb696", padding: "6px 20px", borderRadius: "20px", fontWeight: "bold" }}>
            Editar perfil
          </Link>
        )}
      </div>

      <div style={{ paddingTop: "4px" }}>
        <h2 style={{ fontSize: "12px", color: "#999", textTransform: "uppercase", letterSpacing: "1.2px", margin: "0 4px 14px" }}>Publicaciones</h2>
        {posts.length === 0 && (
          <div style={{ padding: "20px 8px", color: "#999", fontSize: "14px" }}>Todavía no hay publicaciones.</div>
        )}
        {posts.map(post => {
          const [titulo, ...cuerpo] = (post.content || "").split('\n');
          const preview = cuerpo.join(" ").trim();
          return (
            <article key={post.id} style={{ padding: "18px 4px", borderBottom: "1px solid #f2f2f2", display: "flex", gap: "16px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={`/post/${post.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: 700, lineHeight: 1.4, margin: "0 0 8px 0", color: "#222" }}>
                    {titulo || "Sin título"}
                  </h3>
                  {preview && (
                    <p style={{ fontSize: "14px", color: "#666", lineHeight: 1.6, margin: "0 0 10px 0", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {preview}
                    </p>
                  )}
                  <div style={{ fontSize: "12px", color: "#aaa" }}>
                    {new Date(post.created_at).toLocaleDateString()}
                  </div>
                </Link>
              </div>
              {post.image_url && (
                <Link href={`/post/${post.id}`} style={{ flexShrink: 0, display: "block" }}>
                  <img
                    src={post.image_url}
                    alt=""
                    style={{ width: "96px", height: "96px", borderRadius: "8px", objectFit: "cover", display: "block", background: "#f3f3f3" }}
                  />
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
