"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";
import ProfileHeaderClient, { type ProfileHeaderClientProps } from "./profile-header-client";
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
  full_name?: string | null;
  bio?: string | null;
  level?: string | null;
  group?: string | null;
  jlpt_level?: string | null;
  jlpt_verified?: boolean | null;
};

// Compile-time safety: ensure the props we pass match the component's props type.
const _profileHeaderPropsCheck = (p: ProfileHeaderClientProps) => p;

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
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false);
  const [hasPendingJlpt, setHasPendingJlpt] = useState(false);

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
          .select("username, avatar_url, is_admin")
          .eq("id", uid)
          .maybeSingle<{ username: string | null; avatar_url: string | null; is_admin?: boolean }>();

        const uname = (vp?.username ?? "").toString().trim().toLowerCase();
        const isAdmin = !!(vp as any)?.is_admin;
        if (mounted) {
          setViewerUsername(uname);
          setViewerAvatarUrl(vp?.avatar_url ?? null);
          setViewerIsAdmin(isAdmin);
        }
      } else {
        if (mounted) {
          setViewerUsername("");
          setViewerAvatarUrl(null);
          setViewerIsAdmin(false);
        }
      }

      // profile
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, full_name, bio, level, group, jlpt_level, jlpt_verified")
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

      if (uid && uid === prof.id) {
        const { data: pending } = await supabase
          .from("jlpt_submissions")
          .select("id")
          .eq("user_id", uid)
          .eq("status", "pending")
          .limit(1);

        if (mounted) setHasPendingJlpt((pending?.length ?? 0) > 0);
      } else {
        if (mounted) setHasPendingJlpt(false);
      }

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

  async function setJlptVerified(next: boolean) {
    if (!viewerIsAdmin) return;
    if (!profile?.id) return;

    const { error } = await supabase
      .from("profiles")
      .update({ jlpt_verified: next })
      .eq("id", profile.id);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    // Refresh local profile state
    setProfile((p) => (p ? { ...p, jlpt_verified: next } : p));
  }

  const Shell = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="feed" style={{ paddingBottom: 80, minHeight: "100vh" }}>
      <div className="header">
        <div className="headerInner">
          <div className="headerTitle">
            <Image
              src="/logo.png"
              alt="フィード"
              width={180}
              height={40}
              priority
              style={{ height: 40, width: "auto", display: "block" }}
            />
          </div>
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
          <div className="headerTitle">
            <Image
              src="/logo.png"
              alt="フィード"
              width={180}
              height={40}
              priority
              style={{ height: 40, width: "auto", display: "block" }}
            />
          </div>
          <div className="me" />
        </div>
      </div>

      <div className="post" style={{ marginTop: 12 }}>
        <ProfileHeaderClient
          {..._profileHeaderPropsCheck({
            isOwn,
            hasPendingJlpt,
            profileId: profile.id,
            username,
            fullName: profile.full_name ?? null,
            viewerIsAdmin,
            avatarUrl,
            bio: profile.bio ?? "",
            level: profile.level ?? "",
            group: profile.group ?? "",
            jlptLevel: profile.jlpt_verified ? profile.jlpt_level : null,
            postCount: posts.length,
            commentCount,
          })}
        />
        {viewerIsAdmin && !isOwn ? (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,.08)",
              background: "rgba(255,255,255,.72)",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8, opacity: 0.85 }}>
              Admin
            </div>

            <div style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.85 }}>
              <div>
                <strong>JLPT claimed:</strong>{" "}
                {profile.jlpt_level ? profile.jlpt_level : "—"}
              </div>
              <div>
                <strong>Verified:</strong>{" "}
                {profile.jlpt_verified ? "yes" : "no"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => void setJlptVerified(true)}
                disabled={!profile.jlpt_level || !!profile.jlpt_verified}
                style={{ padding: "10px 12px", borderRadius: 12 }}
              >
                Approve JLPT
              </button>
              <button
                type="button"
                onClick={() => void setJlptVerified(false)}
                disabled={!profile.jlpt_verified}
                style={{ padding: "10px 12px", borderRadius: 12 }}
              >
                Reject JLPT
              </button>
            </div>

            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.6 }}>
              JLPT badge is public only when verified.
            </div>
          </div>
        ) : null}
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