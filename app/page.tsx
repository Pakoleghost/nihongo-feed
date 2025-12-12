"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type PostRow = {
  id: number;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: { username: string } | null;
};

type ReactionRow = {
  id: number;
  post_id: number;
  user_id: string;
  type: string;
};

export default function Home() {
  const [user, setUser] = useState<any>(null);

  // auth
  const [email, setEmail] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  // username gate
  const [username, setUsername] = useState("");
  const [hasProfile, setHasProfile] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);

  // feed
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [text, setText] = useState("");
  const [postBusy, setPostBusy] = useState(false);

  // reactions
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});
  const [likedByMe, setLikedByMe] = useState<Record<number, boolean>>({});
  const [likeBusy, setLikeBusy] = useState<Record<number, boolean>>({});

  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // After login: check profile + load posts
  useEffect(() => {
    if (!user) return;
    checkProfile();
    loadPosts();
  }, [user]);

  async function checkProfile() {
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    if (data?.username) setHasProfile(true);
  }

  const normalizedUsername = useMemo(() => username.trim().toLowerCase(), [username]);

  const usernameError = useMemo(() => {
    if (!normalizedUsername) return "Type a username.";
    if (normalizedUsername.length < 3) return "Minimum 3 characters.";
    if (normalizedUsername.length > 20) return "Maximum 20 characters.";
    if (!/^[a-z0-9_]+$/.test(normalizedUsername)) return "Use only a-z, 0-9, underscore (_).";
    return "";
  }, [normalizedUsername]);

  async function createProfile() {
    if (profileBusy) return;
    if (!!usernameError) return;

    setProfileBusy(true);

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      username: normalizedUsername,
    });

    setProfileBusy(false);

    if (error) {
      alert(error.message);
      return;
    }

    setHasProfile(true);
  }

  async function loadPosts() {
    const { data, error } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id, profiles(username)")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    const rows = (data || []) as PostRow[];
    setPosts(rows);

    // load reactions for these posts
    await loadLikesForPosts(rows.map((p) => p.id));
  }

  async function loadLikesForPosts(postIds: number[]) {
    if (!postIds.length) return;

    // counts
    const { data: allLikes, error: likesErr } = await supabase
      .from("reactions")
      .select("post_id, user_id, type")
      .in("post_id", postIds)
      .eq("type", "like");

    if (likesErr) {
      alert(likesErr.message);
      return;
    }

    const counts: Record<number, number> = {};
    const mine: Record<number, boolean> = {};

    for (const r of (allLikes || []) as Pick<ReactionRow, "post_id" | "user_id" | "type">[]) {
      counts[r.post_id] = (counts[r.post_id] || 0) + 1;
      if (user?.id && r.user_id === user.id) mine[r.post_id] = true;
    }

    setLikeCounts(counts);
    setLikedByMe(mine);
  }

  async function toggleLike(postId: number) {
    if (!user) return;
    if (likeBusy[postId]) return;

    setLikeBusy((s) => ({ ...s, [postId]: true }));

    const alreadyLiked = !!likedByMe[postId];

    if (alreadyLiked) {
      const { error } = await supabase
        .from("reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .eq("type", "like");

      if (error) alert(error.message);
      else {
        setLikedByMe((m) => ({ ...m, [postId]: false }));
        setLikeCounts((c) => ({ ...c, [postId]: Math.max(0, (c[postId] || 1) - 1) }));
      }
    } else {
      const { error } = await supabase.from("reactions").insert({
        post_id: postId,
        user_id: user.id,
        type: "like",
      });

      if (error) alert(error.message);
      else {
        setLikedByMe((m) => ({ ...m, [postId]: true }));
        setLikeCounts((c) => ({ ...c, [postId]: (c[postId] || 0) + 1 }));
      }
    }

    setLikeBusy((s) => ({ ...s, [postId]: false }));
  }

  async function createPost() {
    if (postBusy) return;
    if (!text.trim()) return;

    setPostBusy(true);

    const { error } = await supabase.from("posts").insert({
      content: text.trim(),
      user_id: user.id,
    });

    setPostBusy(false);

    if (error) {
      alert(error.message);
      return;
    }

    setText("");
    loadPosts();
  }

  async function sendMagicLink() {
    if (authBusy) return;
    if (!email.trim()) return;

    setAuthBusy(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: SITE_URL },
    });

    setAuthBusy(false);

    if (error) alert(error.message);
    else alert("Check your email.");
  }

  async function logout() {
    await supabase.auth.signOut();
    setHasProfile(false);
    setUsername("");
  }

  // LOGIN
  if (!user) {
    return (
      <main style={styles.page}>
        <div style={styles.card}>
          <h2 style={{ margin: 0 }}>Nihongo Feed 🇯🇵</h2>

          <input
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            autoComplete="email"
          />

          <button onClick={sendMagicLink} disabled={authBusy || !email.trim()}>
            {authBusy ? "Sending..." : "Send link"}
          </button>
        </div>
      </main>
    );
  }

  // USERNAME GATE
  if (!hasProfile) {
    return (
      <main style={styles.page}>
        <div style={styles.card}>
          <h2 style={{ margin: 0 }}>Choose a username</h2>

          <input
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
            autoFocus
            autoComplete="off"
          />

          {!!usernameError && <div style={styles.hint}>{usernameError}</div>}

          <button onClick={createProfile} disabled={profileBusy || !!usernameError}>
            {profileBusy ? "Saving..." : "Save"}
          </button>

          <button onClick={logout} style={{ marginTop: 8 }}>
            Log out
          </button>
        </div>
      </main>
    );
  }

  // FEED
  return (
    <main style={styles.page}>
      <div style={styles.phone}>
        <header style={styles.header}>
          Nihongo Feed
          <button onClick={logout} style={styles.logoutBtn}>
            ↩
          </button>
        </header>

        <div style={{ padding: 12 }}>
          <textarea
            placeholder="Write in Japanese…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={styles.textarea}
          />
          <button onClick={createPost} disabled={postBusy || !text.trim()}>
            {postBusy ? "Posting..." : "Post"}
          </button>
        </div>

        <div style={styles.feed}>
          {posts.map((p) => {
            const liked = !!likedByMe[p.id];
            const count = likeCounts[p.id] || 0;

            return (
              <div key={p.id} style={styles.post}>
                <div style={styles.postHeader}>
                  <div style={styles.avatar}>
                    {(p.profiles?.username?.[0] || "?").toUpperCase()}
                  </div>
                  <span style={styles.usernameText}>{p.profiles?.username || "user"}</span>
                </div>

                <div style={styles.postBody}>{p.content}</div>

                <div style={styles.actionsRow}>
                  <button
                    onClick={() => toggleLike(p.id)}
                    disabled={!!likeBusy[p.id]}
                    style={{
                      ...styles.actionBtn,
                      opacity: likeBusy[p.id] ? 0.6 : 1,
                    }}
                    aria-label="Like"
                  >
                    {liked ? "❤️" : "🤍"} <span style={{ fontSize: 13 }}>{count}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={styles.footerHint}>Minimal · Japanese · Class feed</div>
      </div>
    </main>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f2f2f2",
    display: "flex",
    justifyContent: "center",
    paddingTop: 40,
    paddingBottom: 40,
  },
  phone: {
    width: 390,
    background: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    boxShadow: "0 10px 30px rgba(0,0,0,.15)",
  },
  header: {
    padding: 16,
    borderBottom: "1px solid #eee",
    fontWeight: 800,
    textAlign: "center",
    position: "relative",
    letterSpacing: 0.2,
  },
  logoutBtn: {
    position: "absolute",
    right: 12,
    top: 12,
  },
  feed: {
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  post: {
    border: "1px solid #eee",
    borderRadius: 14,
    overflow: "hidden",
  },
  postHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderBottom: "1px solid #eee",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#ddd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
  },
  usernameText: {
    fontSize: 14,
    fontWeight: 800,
  },
  postBody: {
    padding: 12,
    fontSize: 14,
    lineHeight: 1.45,
  },
  actionsRow: {
    padding: "8px 10px",
    borderTop: "1px solid #eee",
    display: "flex",
    gap: 10,
  },
  actionBtn: {
    border: "1px solid #e5e5e5",
    background: "#fff",
    padding: "6px 10px",
    borderRadius: 999,
    cursor: "pointer",
  },
  footerHint: {
    padding: 12,
    textAlign: "center",
    fontSize: 12,
    color: "#777",
    borderTop: "1px solid #eee",
  },
  card: {
    background: "#fff",
    padding: 24,
    borderRadius: 12,
    width: 340,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    boxShadow: "0 10px 30px rgba(0,0,0,.10)",
  },
  input: {
    padding: 10,
    border: "1px solid #ddd",
    borderRadius: 10,
    fontSize: 14,
  },
  hint: {
    fontSize: 13,
    color: "#b00020",
    marginTop: -6,
  },
  textarea: {
    width: "100%",
    height: 70,
    marginBottom: 7,
    padding: 10,
    border: "1px solid #ddd",
    borderRadius: 12,
    fontSize: 14,
  },
};