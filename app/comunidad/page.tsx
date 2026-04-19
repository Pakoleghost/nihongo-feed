"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

type Post = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  likes: number;
  created_at: string;
};

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${days}d`;
}

function AvatarCircle({
  url,
  name,
  size = 44,
}: {
  url: string | null;
  name: string | null;
  size?: number;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name ?? "avatar"}
        width={size}
        height={size}
        style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  const initials = (name ?? "?").charAt(0).toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#E5E7EB",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 700,
        color: "#53596B",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

export default function ComunidadPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const uid = user?.id ?? null;
      setUserId(uid);

      // Fetch posts
      const { data: postData } = await supabase
        .from("comunidad_posts")
        .select("*")
        .order("created_at", { ascending: false });

      const fetchedPosts = (postData as Post[] | null) ?? [];
      setPosts(fetchedPosts);

      // Fetch profiles for post authors
      const userIds = [...new Set(fetchedPosts.map((p) => p.user_id))];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", userIds);
        const profileMap: Record<string, Profile> = {};
        (profileData as Profile[] | null)?.forEach((p) => {
          profileMap[p.id] = p;
        });
        setProfiles(profileMap);
      }

      // Fetch likes for current user
      if (uid) {
        const { data: likesData } = await supabase
          .from("comunidad_likes")
          .select("post_id")
          .eq("user_id", uid);
        const likedSet = new Set<string>(
          (likesData as { post_id: string }[] | null)?.map((l) => l.post_id) ?? []
        );
        setLikedIds(likedSet);
      }

      setLoading(false);
    }

    load();
  }, []);

  async function toggleLike(post: Post) {
    if (!userId) {
      router.push("/login");
      return;
    }

    const alreadyLiked = likedIds.has(post.id);
    const newCount = post.likes + (alreadyLiked ? -1 : 1);

    // Optimistic update
    setLikedIds((prev) => {
      const next = new Set(prev);
      alreadyLiked ? next.delete(post.id) : next.add(post.id);
      return next;
    });
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, likes: newCount } : p))
    );

    if (alreadyLiked) {
      await supabase
        .from("comunidad_likes")
        .delete()
        .match({ post_id: post.id, user_id: userId });
      await supabase
        .from("comunidad_posts")
        .update({ likes: Math.max(0, newCount) })
        .eq("id", post.id);
    } else {
      await supabase
        .from("comunidad_likes")
        .insert({ post_id: post.id, user_id: userId });
      await supabase
        .from("comunidad_posts")
        .update({ likes: newCount })
        .eq("id", post.id);
    }
  }

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        paddingBottom: "100px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "56px 20px 20px",
        }}
      >
        <h1
          style={{
            fontSize: "36px",
            fontWeight: 800,
            color: "#1A1A2E",
            margin: 0,
            lineHeight: 1,
          }}
        >
          Comunidad
        </h1>
        <Link
          href="/comunidad/publicar"
          style={{
            background: "#E63946",
            color: "#FFFFFF",
            borderRadius: "999px",
            padding: "10px 18px",
            fontWeight: 700,
            fontSize: "15px",
            textDecoration: "none",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 16px rgba(230,57,70,0.28)",
          }}
        >
          + Publicar
        </Link>
      </div>

      {/* Feed */}
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#9CA3AF", padding: "40px 0" }}>
            Cargando...
          </div>
        ) : posts.length === 0 ? (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "24px",
              padding: "32px",
              textAlign: "center",
              boxShadow: "0 4px 20px rgba(26,26,46,0.07)",
            }}
          >
            <p style={{ fontSize: "28px", margin: "0 0 8px" }}>💬</p>
            <p style={{ fontSize: "16px", color: "#9CA3AF", margin: 0 }}>
              Sé el primero en publicar.
            </p>
          </div>
        ) : (
          posts.map((post) => {
            const profile = profiles[post.user_id];
            const liked = likedIds.has(post.id);
            return (
              <div
                key={post.id}
                style={{
                  background: "#FFFFFF",
                  borderRadius: "24px",
                  padding: "20px",
                  boxShadow: "0 4px 20px rgba(26,26,46,0.07)",
                }}
              >
                {/* Author row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "12px",
                  }}
                >
                  <AvatarCircle
                    url={profile?.avatar_url ?? null}
                    name={profile?.username ?? null}
                  />
                  <div>
                    <p
                      style={{
                        fontSize: "15px",
                        fontWeight: 700,
                        color: "#1A1A2E",
                        margin: 0,
                      }}
                    >
                      {profile?.username ?? "Usuario"}
                    </p>
                    <p style={{ fontSize: "13px", color: "#9CA3AF", margin: 0 }}>
                      {timeAgo(post.created_at)}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <p
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#1A1A2E",
                    margin: "0 0 12px",
                    lineHeight: 1.5,
                    fontFamily: "var(--font-noto-sans-jp), sans-serif",
                  }}
                >
                  {post.content}
                </p>

                {/* Image */}
                {post.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.image_url}
                    alt="publicación"
                    style={{
                      width: "100%",
                      borderRadius: "14px",
                      display: "block",
                      marginBottom: "12px",
                      objectFit: "cover",
                      maxHeight: "260px",
                    }}
                  />
                )}

                {/* Footer */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    onClick={() => toggleLike(post)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: liked
                        ? "rgba(230,57,70,0.10)"
                        : "rgba(26,26,46,0.06)",
                      borderRadius: "999px",
                      padding: "7px 14px",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: liked ? "#E63946" : "#53596B",
                      transition: "background 0.15s",
                    }}
                  >
                    <span style={{ fontSize: "16px" }}>{liked ? "❤️" : "🤍"}</span>
                    いいね！ {post.likes}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
}
