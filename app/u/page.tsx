"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type ProfileStats = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  level: string | null;
  group: string | null;
  posts_count: number;
  likes_count: number;
  comments_count: number;
};

export default function UserProfilePage({ params }: { params: { username: string } }) {
  const username = decodeURIComponent(params.username);

  const [profile, setProfile] = useState<ProfileStats | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const { data: pData, error: pErr } = await supabase
        .from("profile_stats")
        .select("*")
        .eq("username", username)
        .maybeSingle();

      if (pErr || !pData) {
        if (!cancelled) {
          setProfile(null);
          setPosts([]);
          setLoading(false);
        }
        return;
      }

      const { data: postData } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", (pData as any).profile_id ?? null) // si tu vista no expone profile_id, quita esto
        .order("created_at", { ascending: false });

      if (!cancelled) {
        setProfile(pData as any);
        setPosts(postData ?? []);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;

  if (!profile) {
    return (
      <div style={{ padding: 16 }}>
        <div>User not found.</div>
        <div style={{ marginTop: 8 }}>
          <Link href="/">Back</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {profile.avatar_url ? (
          // si usas next/image, cámbialo
          <img src={profile.avatar_url} alt="" width={56} height={56} style={{ borderRadius: 999 }} />
        ) : (
          <div style={{ width: 56, height: 56, borderRadius: 999, background: "#ddd" }} />
        )}

        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            {profile.display_name ?? profile.username}
          </div>
          <div style={{ opacity: 0.8 }}>@{profile.username}</div>

          {(profile.level || profile.group) && (
            <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {profile.level && <span style={{ padding: "2px 8px", border: "1px solid #ccc", borderRadius: 999 }}>{profile.level}</span>}
              {profile.group && <span style={{ padding: "2px 8px", border: "1px solid #ccc", borderRadius: 999 }}>{profile.group}</span>}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
        <div><b>{profile.posts_count}</b> posts</div>
        <div><b>{profile.likes_count}</b> likes</div>
        <div><b>{profile.comments_count}</b> comments</div>
      </div>

      <div style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 12 }}>Posts</h3>
        {posts.length === 0 ? (
          <div style={{ opacity: 0.8 }}>No posts yet.</div>
        ) : (
          posts.map((post) => (
            <div key={post.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, marginBottom: 12 }}>
              <div style={{ opacity: 0.8, fontSize: 12 }}>{new Date(post.created_at).toLocaleString()}</div>
              <div style={{ marginTop: 6 }}>{post.content ?? post.text ?? ""}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}