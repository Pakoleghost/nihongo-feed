import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import ProfileHeaderClient from "./profile-header-client";

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
};

export default async function ProfileByIdPage({
  params,
}: {
  params: { id: string };
}) {
  const rawId = decodeURIComponent(params.id || "").trim();

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

  const Shell = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="feed">
      <div className="header">
        <div className="headerInner">
          <div className="brand">フィード</div>
          <div className="me">
            <Link href="/" className="miniBtn" style={{ textDecoration: "none" }}>
              ← Back
            </Link>
            <Link
              href="/leaderboard"
              className="miniBtn"
              style={{ marginLeft: 8, textDecoration: "none" }}
            >
              Leaderboard
            </Link>
          </div>
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

  if (!rawId) return <Shell title="Profile not found" subtitle="Missing id." />;

  // who is viewing?
  const { data: authData } = await supabase.auth.getUser();
  const viewerId = authData?.user?.id ?? null;

  // profile
  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio, level, group")
    .eq("id", rawId)
    .maybeSingle<ProfileRow>();

  if (profErr) return <Shell title="Error loading profile" subtitle={profErr.message} />;
  if (!prof) return <Shell title="Profile not found" subtitle="No existe este usuario." />;

  const profileId = (prof.id ?? "").toString();
  const username = (prof.username ?? "").toString().trim().toLowerCase() || "unknown";
  const avatarUrl = prof.avatar_url ?? null;

  const isOwn = !!viewerId && viewerId === profileId;

  // posts
  const { data: postRows, error: postsErr } = await supabase
    .from("posts")
    .select("id, content, created_at, user_id, image_url")
    .eq("user_id", profileId)
    .order("created_at", { ascending: false });

  if (postsErr) return <Shell title="Error loading posts" subtitle={postsErr.message} />;

  const posts: Post[] =
    (postRows as any[] | null)?.map((row) => ({
      id: row.id,
      content: (row.content ?? "").toString(),
      created_at: row.created_at,
      user_id: row.user_id,
      image_url: row.image_url ?? null,
    })) ?? [];

  const { count: commentCount } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profileId);

  return (
    <div className="feed">
      <div className="header">
        <div className="headerInner">
          <div className="brand">フィード</div>
          <div className="me">
            <Link href="/" className="miniBtn" style={{ textDecoration: "none" }}>
              ← Back
            </Link>
            <Link
              href="/leaderboard"
              className="miniBtn"
              style={{ marginLeft: 8, textDecoration: "none" }}
            >
              Leaderboard
            </Link>
          </div>
        </div>
      </div>

      <div className="post" style={{ marginTop: 12 }}>
        <ProfileHeaderClient
          isOwn={isOwn}
          profileId={profileId}
          username={username}
          avatarUrl={avatarUrl}
          bio={(prof.bio ?? "").toString().trim()}
          level={(prof.level ?? "").toString().trim()}
          group={(prof.group ?? "").toString().trim()}
          postCount={posts.length}
          commentCount={commentCount ?? 0}
        />
      </div>

      {posts.length === 0 ? (
        <div style={{ padding: 16 }} className="muted">
          No posts yet.
        </div>
      ) : (
        posts.map((p) => (
          <div className="post" key={p.id}>
            <div className="post-header">
              <div className="avatar" aria-label="Profile avatar">
                {avatarUrl ? <img src={avatarUrl} alt={username} /> : <span>{username[0]?.toUpperCase() || "?"}</span>}
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
    </div>
  );
}