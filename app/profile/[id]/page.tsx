import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type Post = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  image_url: string | null;
};

type Profile = {
  id: string; // profiles.id (uuid)
  username: string;
  avatar_url: string | null;
};

export default async function ProfileByIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rawId = decodeURIComponent(id || "").trim();

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
        <div style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>{title}</div>
        {subtitle ? (
          <div className="muted" style={{ marginTop: 6 }}>
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (!rawId) {
    return <Shell title="Profile not found" subtitle="Missing id." />;
  }

  // 1) Profile by UUID
  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .eq("id", rawId)
    .maybeSingle();

  if (profErr) {
    return <Shell title="Error loading profile" subtitle={String(profErr.message ?? profErr)} />;
  }

  if (!prof) {
    return <Shell title="Profile not found" subtitle="No existe este usuario." />;
  }

  const profile: Profile = {
    id: (prof.id ?? "").toString(),
    username: (prof.username ?? "").toString().trim().toLowerCase(),
    avatar_url: prof.avatar_url ?? null,
  };

  const initial = (profile.username?.[0] || "?").toUpperCase();

  // 2) Posts
  const { data: postRows, error: postsErr } = await supabase
    .from("posts")
    .select("id, content, created_at, user_id, image_url")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  if (postsErr) {
    return <Shell title="Error loading posts" subtitle={String(postsErr.message ?? postsErr)} />;
  }

  const posts: Post[] =
    (postRows as any[] | null)?.map((row) => ({
      id: row.id,
      content: (row.content ?? "").toString(),
      created_at: row.created_at,
      user_id: row.user_id,
      image_url: row.image_url ?? null,
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
          <Link href="/" className="miniBtn" style={{ textDecoration: "none" }}>
            ← Back
          </Link>
        </div>
      </div>

      {/* Profile header */}
      <div className="post" style={{ marginTop: 12 }}>
        <div className="post-header">
          <div className="avatar" aria-label="Profile avatar">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username} />
            ) : (
              <span>{initial}</span>
            )}
          </div>

          <div className="postMeta">
            <div className="nameRow">
              <span className="handle" style={{ color: "inherit" }}>
                @{profile.username || "unknown"}
              </span>
            </div>

            <div className="muted" style={{ fontSize: 12 }}>
              Posts: <span className="muted">{posts.length}</span> · Comments:{" "}
              <span className="muted">{commentCount ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Posts list */}
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
                  <img src={profile.avatar_url} alt={profile.username} />
                ) : (
                  <span>{initial}</span>
                )}
              </div>

              <div className="postMeta">
                <div className="nameRow">
                  <span className="handle" style={{ color: "inherit" }}>
                    @{profile.username || "unknown"}
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