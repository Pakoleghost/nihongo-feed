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
  banner_url: string | null;
  bio: string | null;
  level: string | null;
  group: string | null;
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
          <Link href="/" className="miniBtn" style={{ textDecoration: "none" }}>
            ← Back
          </Link>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ color: "#111", fontWeight: 900, fontSize: 18 }}>{title}</div>
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
  const { data: auth } = await supabase.auth.getUser();
  const viewerId = auth.user?.id ?? null;

  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, banner_url, bio, level, group")
    .eq("id", rawId)
    .maybeSingle();

  if (profErr) return <Shell title="Error loading profile" subtitle={profErr.message} />;
  if (!prof) return <Shell title="Profile not found" subtitle="No existe este usuario." />;

  const profile: ProfileRow = prof as any;

  const username = (profile.username ?? "").toString().trim().toLowerCase() || "unknown";

  const isMe = !!viewerId && viewerId === profile.id;

  // posts
  const { data: postRows, error: postsErr } = await supabase
    .from("posts")
    .select("id, content, created_at, user_id, image_url")
    .eq("user_id", profile.id)
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
          </div>
        </div>
      </div>

      <ProfileHeaderClient
        isMe={isMe}
        profileId={profile.id}
        username={username}
        avatarUrl={profile.avatar_url ?? null}
        bannerUrl={profile.banner_url ?? null}
        bio={profile.bio ?? ""}
        level={profile.level ?? ""}
        group={profile.group ?? ""}
        postCount={posts.length}
        commentCount={commentCount ?? 0}
      />

      {/* Posts */}
      {posts.length === 0 ? (
        <div style={{ padding: 16 }} className="muted">
          No posts yet.
        </div>
      ) : (
        posts.map((p) => (
          <div className="post" key={p.id}>
            <div className="post-header">
              <div className="avatar" aria-label="Profile avatar">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={username} />
                ) : (
                  <span>{(username?.[0] || "?").toUpperCase()}</span>
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
    </div>
  );
}