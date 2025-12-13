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
  id: string;
  username: string;
  avatar_url: string | null;
};

export default async function UserProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const rawParam = decodeURIComponent(params.username || "").trim();

  const normalizedUsername = rawParam
    .toLowerCase()
    .replace(/^@+/, "")
    .trim();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawParam);

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        // In a Server Component we only need read access for this page.
        // Writing cookies is not required here.
        setAll() {},
      },
    }
  );

  if (!rawParam) {
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
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>Profile not found</div>
          <div className="muted" style={{ marginTop: 6 }}>
            No existe este usuario.
          </div>
        </div>
      </div>
    );
  }

  // 1) Profile
  const profileQuery = supabase
    .from("profiles")
    .select("id, username, avatar_url");

  const { data: prof, error: profErr } = isUuid
    ? await profileQuery.eq("id", rawParam).maybeSingle() // uuid matches profiles.id
    : await profileQuery.eq("username", normalizedUsername).maybeSingle();

  if (profErr) {
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
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>Error loading profile</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {String((profErr as any)?.message ?? "Unknown error")}
          </div>
        </div>
      </div>
    );
  }

  if (!prof) {
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
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>Profile not found</div>
          <div className="muted" style={{ marginTop: 6 }}>
            No existe este usuario.
          </div>
        </div>
      </div>
    );
  }

  const profile: Profile = {
    id: (prof.id ?? "").toString(),
    username: (prof.username ?? "").toString().trim().toLowerCase(),
    avatar_url: prof.avatar_url ?? null,
  };

  if (!profile.id) {
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
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>Profile incomplete</div>
          <div className="muted" style={{ marginTop: 6 }}>
            El perfil existe, pero no tiene id.
          </div>
        </div>
      </div>
    );
  }

  const initial = (profile.username?.[0] || "?").toUpperCase();
  const profileHref = `/u/${encodeURIComponent(profile.id)}`; // stable internal link

  // 2) Posts
  const { data: postRows } = await supabase
    .from("posts")
    .select("id, content, created_at, user_id, image_url")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const posts: Post[] =
    (postRows as any[] | null)?.map((row) => ({
      id: row.id,
      content: (row.content ?? "").toString(),
      created_at: row.created_at,
      user_id: row.user_id,
      image_url: row.image_url ?? null,
    })) ?? [];

  const postCount = posts.length;

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

            <Link
              href="/leaderboard"
              className="miniBtn"
              style={{ marginLeft: 8, textDecoration: "none" }}
            >
              🏆 Leaderboard
            </Link>
          </div>
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
              <Link href={profileHref} className="handle" style={{ textDecoration: "none" }}>
                @{profile.username}
              </Link>
            </div>

            <div className="muted" style={{ fontSize: 12 }}>
              Posts: <span className="muted">{postCount}</span> · Comments:{" "}
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
              <Link href={profileHref} className="avatar" style={{ textDecoration: "none" }}>
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.username} />
                ) : (
                  <span>{initial}</span>
                )}
              </Link>

              <div className="postMeta">
                <div className="nameRow">
                  <Link href={profileHref} className="handle" style={{ textDecoration: "none" }}>
                    @{profile.username}
                  </Link>
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
