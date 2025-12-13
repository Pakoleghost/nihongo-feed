import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import ProfileHeaderClient from "./profile-header-client";

export const dynamic = "force-dynamic";

type Post = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  image_url: string | null;
};

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string;
  level: string;
  group: string;
};

function Shell({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="feed">
      <div className="header">
        <div className="headerInner">
          <div className="brand">フィード</div>
          <Link href="/" className="miniBtn" style={{ textDecoration: "none" }}>
            ← Back
          </Link>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>{title}</div>
        {subtitle ? (
          <div className="muted" style={{ marginTop: 6 }}>
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default async function ProfileByIdPage(props: { params: { id?: string } }) {
  // Next 15-safe: handle either direct object or promise-like
  const paramsAny: any = props.params as any;
  const idVal = typeof paramsAny?.then === "function" ? (await paramsAny).id : props.params.id;

  const rawId = decodeURIComponent((idVal ?? "").toString()).trim();
  if (!rawId) return <Shell title="Profile not found" subtitle="Missing id." />;

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  // Viewer (used to decide if profile is editable)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1) Profile
  const { data: prof, error: profErr } = await supabase
    .from("profiles")
.select('id, username, avatar_url, bio, level, "group"')    .eq("id", rawId)
    .maybeSingle();

  if (profErr) return <Shell title="Error loading profile" subtitle={profErr.message} />;
  if (!prof) return <Shell title="Profile not found" subtitle="No existe este usuario." />;

  const profile: Profile = {
    id: (prof as any).id,
    username: ((prof as any).username ?? "").toString().trim().toLowerCase(),
    avatar_url: (prof as any).avatar_url ?? null,
    banner_url: (prof as any).banner_url ?? null,
    bio: ((prof as any).bio ?? "").toString(),
    level: ((prof as any).level ?? "").toString(),
    group: ((prof as any).group ?? "").toString(),
  };

  const isMe = !!user?.id && user.id === profile.id;

  // 2) Posts
  const { data: postRows, error: postsErr } = await supabase
    .from("posts")
    .select("id, content, created_at, user_id, image_url")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  if (postsErr) return <Shell title="Error loading posts" subtitle={postsErr.message} />;

  const posts: Post[] =
    (postRows ?? []).map((r: any) => ({
      id: r.id,
      content: (r.content ?? "").toString(),
      created_at: r.created_at,
      user_id: r.user_id,
      image_url: r.image_url ?? null,
    })) ?? [];

  // 3) Comment count (best-effort)
  const { count: commentCount } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id);

  return (
    <div className="feed">
      <div className="header">
        <div className="headerInner">
          <div className="brand">フィード</div>
          <div className="me">
            <Link href="/" className="miniBtn" style={{ textDecoration: "none" }}>
              ← Back
            </Link>
            <Link href="/leaderboard" className="miniBtn" style={{ marginLeft: 8, textDecoration: "none" }}>
              Leaderboard
            </Link>
          </div>
        </div>
      </div>

      <ProfileHeaderClient
        isMe={isMe}
        profileId={profile.id}
        username={profile.username || "unknown"}
        avatarUrl={profile.avatar_url}
        bannerUrl={profile.banner_url}
        bio={profile.bio}
        level={profile.level}
        group={profile.group}
        postCount={posts.length}
        commentCount={commentCount ?? 0}
      />

      {/* Posts list */}
      {posts.length === 0 ? (
        <div style={{ padding: 16 }} className="muted">
          No posts yet.
        </div>
      ) : (
        posts.map((p) => (
          <div className="post" key={p.id}>
            <div className="post-header">
              <div className="postMeta">
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
    </div>
  );
}