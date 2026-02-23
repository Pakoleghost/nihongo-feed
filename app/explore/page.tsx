"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

type PostRow = {
  id: string;
  content: string | null;
  created_at: string;
  user_id: string;
  image_url?: string | null;
  profiles:
    | { username: string | null; avatar_url: string | null }
    | { username: string | null; avatar_url: string | null }[]
    | null;
};

type Post = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  image_url: string | null;
  likes: number;
  commentCount: number;
};

function parseEntry(content: string): { title: string | null; body: string } {
  if (content.startsWith("[ENTRY_TITLE]")) {
    const end = content.indexOf("[/ENTRY_TITLE]");
    if (end !== -1) {
      const title = content.slice("[ENTRY_TITLE]".length, end).trim();
      const body = content.slice(end + "[/ENTRY_TITLE]".length).trim();
      return { title: title || null, body };
    }
  }
  return { title: null, body: content };
}

function timeAgoJa(iso: string): string {
  try {
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return "";
    const diffMs = Math.max(0, Date.now() - t);
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return "ただ今";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}分前`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}時間前`;
    const d = Math.floor(hr / 24);
    if (d < 30) return `${d}日前`;
    const mo = Math.floor(d / 30);
    return `${mo}ヶ月前`;
  } catch {
    return "";
  }
}

export default function ExplorePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<{ username: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? null;
      if (!mounted) return;
      setUserId(uid);

      if (uid) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", uid)
          .maybeSingle();
        if (!mounted) return;
        setMyProfile(prof as any);
      }

      const { data: rows } = await supabase
        .from("posts")
        .select("id, content, created_at, user_id, image_url, profiles(username, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!mounted) return;

      const postIds = ((rows as any[]) ?? []).map((r) => r.id);

      let likeCounts: Record<string, number> = {};
      let commentCounts: Record<string, number> = {};

      if (postIds.length) {
        const { data: likes } = await supabase
          .from("likes")
          .select("post_id")
          .in("post_id", postIds);
        (likes ?? []).forEach((l: any) => {
          likeCounts[l.post_id] = (likeCounts[l.post_id] ?? 0) + 1;
        });

        const { data: comments } = await supabase
          .from("comments")
          .select("post_id")
          .in("post_id", postIds);
        (comments ?? []).forEach((c: any) => {
          commentCounts[c.post_id] = (commentCounts[c.post_id] ?? 0) + 1;
        });
      }

      const mapped: Post[] = ((rows as PostRow[]) ?? []).map((r) => {
        const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        return {
          id: String(r.id),
          content: r.content ?? "",
          created_at: r.created_at,
          user_id: r.user_id,
          username: prof?.username ?? "",
          avatar_url: prof?.avatar_url ?? null,
          image_url: r.image_url ?? null,
          likes: likeCounts[r.id] ?? 0,
          commentCount: commentCounts[r.id] ?? 0,
        };
      });

      if (!mounted) return;
      setPosts(mapped);
      setLoading(false);
    };

    void load();
    return () => { mounted = false; };
  }, []);

  const myProfileHref = userId ? `/profile/${encodeURIComponent(userId)}` : "/";

  return (
    <>
      <style>{`
        .exploreGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          padding: 0 14px;
        }
        @media (min-width: 540px) {
          .exploreGrid { grid-template-columns: repeat(3, 1fr); }
        }
        .exploreCard {
          border-radius: 14px;
          border: 1px solid rgba(0,0,0,0.07);
          background: #fff;
          overflow: hidden;
          transition: box-shadow 0.15s ease;
        }
        .exploreCard:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); }
      `}</style>

      <div style={{ minHeight: "100vh", paddingBottom: 80, background: "#f6f6f7" }}>
        <div style={{ padding: "16px 16px 8px", fontWeight: 900, fontSize: 18 }}>
          みんなの日記
        </div>

        {loading ? (
          <div style={{ padding: 16, textAlign: "center", color: "#aaa", fontSize: 14 }}>Loading…</div>
        ) : posts.length === 0 ? (
          <div style={{ padding: 16, textAlign: "center", color: "#aaa", fontSize: 14 }}>まだ投稿はありません。</div>
        ) : (
          <div className="exploreGrid">
            {posts.map((p) => {
              const { title, body } = parseEntry(p.content);
              const initial = (p.username?.[0] || "?").toUpperCase();

              return (
                <Link
                  key={p.id}
                  href={`/post/${encodeURIComponent(p.id)}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div className="exploreCard">
                    {/* Thumbnail */}
                    {p.image_url ? (
                      <div style={{ aspectRatio: "4/3", overflow: "hidden", background: "#f0f0f0" }}>
                        <img src={p.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      </div>
                    ) : null}
                    <div style={{ padding: "10px 12px" }}>
                      {/* Title */}
                      {title ? (
                        <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.35, color: "#111", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {title}
                        </div>
                      ) : null}
                      {/* Body preview */}
                      {body ? (
                        <div style={{ fontSize: 12, lineHeight: 1.5, color: "#666", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {body}
                        </div>
                      ) : null}
                      {/* Author + meta */}
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, fontSize: 11, color: "#aaa" }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: 999, overflow: "hidden",
                          border: "1px solid rgba(0,0,0,0.08)", background: "#fff",
                          display: "grid", placeItems: "center", fontSize: 8, fontWeight: 900, flexShrink: 0,
                        }}>
                          {p.avatar_url ? (
                            <img src={p.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span>{initial}</span>
                          )}
                        </div>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          @{p.username || "unknown"}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 11, color: "#bbb" }}>
                        {p.likes > 0 ? <span>🤍 {p.likes}</span> : null}
                        {p.commentCount > 0 ? <span>💬 {p.commentCount}</span> : null}
                        <span style={{ marginLeft: "auto" }}>{timeAgoJa(p.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav
        profileHref={myProfileHref}
        profileAvatarUrl={myProfile?.avatar_url ?? null}
        profileInitial={((myProfile?.username ?? "?").toString().trim()[0] ?? "?").toUpperCase()}
      />
    </>
  );
}
