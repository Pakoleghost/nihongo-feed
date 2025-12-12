"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type DbPostRow = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { username: string | null } | { username: string | null }[] | null;
};

type Post = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username: string;
};

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadPosts();
  }, []);

  async function loadPosts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id, profiles(username)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const normalized: Post[] =
      (data as unknown as DbPostRow[] | null)?.map((row) => {
        const p = row.profiles as any;
        const username =
          (Array.isArray(p) ? p?.[0]?.username : p?.username) ?? "unknown";

        return {
          id: row.id,
          content: row.content,
          created_at: row.created_at,
          user_id: row.user_id,
          username,
        };
      }) ?? [];

    setPosts(normalized);
    setLoading(false);
  }

  if (loading) return <div className="p-6 muted">Loading…</div>;

  return (
    <div className="feed">
      <div className="header">Nihongo Feed</div>

      {posts.map((p) => {
        const initial = (p.username?.[0] || "?").toUpperCase();

        return (
          <div className="post" key={p.id}>
            <div className="post-header">
              <div className="avatar">{initial}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13 }}>@{p.username}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {new Date(p.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="post-content">{p.content}</div>
          </div>
        );
      })}
    </div>
  );
}