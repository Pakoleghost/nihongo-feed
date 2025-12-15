"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import ProfileHeaderClient from "./profile-header-client";
import { supabase } from "@/lib/supabase";

type Post = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  image_url: string | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio?: string | null;
  level?: string | null;
  group?: string | null;
  jlpt_level?: string | null;
  jlpt_verified?: boolean | null;
};

export default function ProfileByIdPage() {
  const params = useParams<{ id?: string }>();

  const rawId = useMemo(() => {
    const v = (params?.id ?? "").toString();
    try {
      return decodeURIComponent(v).trim();
    } catch {
      return v.trim();
    }
  }, [params]);

  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerUsername, setViewerUsername] = useState<string>("");
  const [viewerAvatarUrl, setViewerAvatarUrl] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [commentCount, setCommentCount] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const myProfileHref = viewerId ? `/profile/${encodeURIComponent(viewerId)}` : "/";
  const myProfileInitial = (viewerUsername?.[0] ?? "?").toUpperCase();

  const isOwn = !!viewerId && !!profile?.id && viewerId === profile.id;

  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      if (!rawId) {
        if (mounted) {
          setErrorMsg("Missing id.");
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setErrorMsg("");

      // session
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id ?? null;
      if (mounted) setViewerId(uid);

      // viewer profile for BottomNav avatar
      if (uid) {
        const { data: vp } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", uid)
          .maybeSingle<{ username: string | null; avatar_url: string | null }>();

        const uname = (vp?.username ?? "").toString().trim().toLowerCase();
        if (mounted) {
          setViewerUsername(uname);
          setViewerAvatarUrl(vp?.avatar_url ?? null);
        }
      } else {
        if (mounted) {
          setViewerUsername("");
          setViewerAvatarUrl(null);
        }
      }

      // profile
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio, level, group, jlpt_level, jlpt_verified")
        .eq("id", rawId)
        .maybeSingle<ProfileRow>();

      if (profErr) {
        if (mounted) {
          setErrorMsg(profErr.message);
          setLoading(false);
        }
        return;
      }

      if (!prof) {
        if (mounted) {
          setProfile(null);
          setPosts([]);
          setCommentCount(0);
          setLoading(false);
        }
        return;
      }

      if (mounted) setProfile(prof);

      // posts
      const { data: postRows, error: postsErr } = await supabase
        .from("posts")
        .select("id, content, created_at, user_id, image_url")
        .eq("user_id", prof.id)
        .order("created_at", { ascending: false });

      if (postsErr) {
        if (mounted) {
          setErrorMsg(postsErr.message);
          setLoading(false);
        }
        return;
      }

      const mapped: Post[] =
        (postRows as any[] | null)?.map((row) => ({
          id: row.id,
          content: (row.content ?? "").toString(),
          created_at: row.created_at,
          user_id: row.user_id,
          image_url: row.image_url ?? null,
        })) ?? [];

      if (mounted) setPosts(mapped);

      // comments count
      const { count } = await supabase
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", prof.id);

      if (mounted) {
        setCommentCount(count ?? 0);
        setLoading(false);
      }
    }

    void loadAll();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void loadAll();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [rawId]);

  const Shell = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="feed" style={{ paddingBottom: 80, minHeight: "100vh" }}>
      <div className="header">
        <div className="headerInner">
          <div className="headerTitle">フィード</div>
          <div className="me" />
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>{title}</div>
        {subtitle ? (
          <div className="muted" style={{ marginTop: 6 }}>
            {subtitle}
          </div>
        ) : null}
      </div>

      <BottomNav
        profileHref={myProfileHref}
        profileAvatarUrl={viewerAvatarUrl}
        profileInitial={myProfileInitial}
      />
    </div>
  );

  if (!rawId) return <Shell title="Profile not found" subtitle="Missing id." />;
  if (loading) return <Shell title="Loading…" />;
  if (errorMsg) return <Shell title="Error" subtitle={errorMsg} />;
  if (!profile) return <Shell title="Profile not found" subtitle="No existe este usuario." />;

  const username = (profile.username ?? "").toString().trim().toLowerCase() || "unknown";
  const avatarUrl = profile.avatar_url ?? null;

  return (
    <div className="feed" style={{ paddingBottom: 80, minHeight: "100vh" }}>
      <div className="header">
        <div className="headerInner">
          <div className="headerTitle">フィード</div>
          <div className="me" />
        </div>
      </div>

      <div className="post" style={{ marginTop: 12 }}>
        <ProfileHeaderClient
          isOwn={isOwn}
          profileId={profile.id}
          username={username}
          avatarUrl={avatarUrl}
          bio={profile.bio ?? ""}
          level={profile.level ?? ""}
          group={profile.group ?? ""}
          jlptLevel={profile.jlpt_verified ? profile.jlpt_level : null}
          postCount={posts.length}
          commentCount={commentCount}
        />
      </div>

      {posts.length === 0 ? (
        <div style={{ padding: 16 }} className="muted">
          まだ投稿はありません。
        </div>
      ) : (
        posts.map((p) => (
          <div className="post" key={p.id}>
            <div className="post-header">
              <div className="avatar" aria-label="Profile avatar">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={username} />
                ) : (
                  <span>{username[0]?.toUpperCase() || "?"}</span>
                )}
              </div>

              <div className="postMeta">
                <div className="nameRow">
                  <span className="handle" style={{ color: "inherit" }}>
                    @{username}
                  </span>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {new Date(p.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            {p.content ? <div className="post-content">{p.content}</div> : null}

            {p.image_url ? (
              <div style={{ padding: "0 12px 12px" }}>
                <img src={p.image_url} alt="post" className="postImage" />
              </div>
            ) : null}
          </div>
        ))
      )}

      <BottomNav
        profileHref={myProfileHref}
        profileAvatarUrl={viewerAvatarUrl}
        profileInitial={myProfileInitial}
      />
    </div>
  );
}