"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Post = {
  id: string;
  content: string;
  created_at: string;
  profiles?: { username: string } | null;
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const [postBusy, setPostBusy] = useState(false);

  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");

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
    loadPosts();
  }, [user]);

 

  const normalizedUsername = useMemo(() => username.trim().toLowerCase(), [username]);

  const usernameError = useMemo(() => {
    if (!normalizedUsername) return "Type a username.";
    if (normalizedUsername.length < 3) return "Minimum 3 characters.";
    if (normalizedUsername.length > 20) return "Maximum 20 characters.";
    if (!/^[a-z0-9_]+$/.test(normalizedUsername)) return "Use only a-z, 0-9, underscore (_).";
    return "";
  }, [normalizedUsername]);

async function createProfile() {
  if (username.trim().length < 3) {
    alert("Username must be at least 3 characters");
    return;
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    username: username.trim(),
  });

  if (error) {
    alert(error.message);
    return;
  }

  setHasProfile(true); // ✅ ONLY HERE
}

  async function loadPosts() {
    const { data } = await supabase
      .from("posts")
      .select("id, content, created_at, profiles(username)")
      .order("created_at", { ascending: false });

    if (data) setPosts(data as Post[]);
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
          {posts.map((p) => (
            <div key={p.id} style={styles.post}>
              <div style={styles.postHeader}>
                <div style={styles.avatar}>{(p.profiles?.username?.[0] || "?").toUpperCase()}</div>
                <span style={styles.usernameText}>{p.profiles?.username || "user"}</span>
              </div>
              <div style={styles.postBody}>{p.content}</div>
            </div>
          ))}
        </div>
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
    fontWeight: 700,
    textAlign: "center",
    position: "relative",
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
    borderRadius: 12,
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
    fontWeight: 800,
  },
  usernameText: {
    fontSize: 14,
    fontWeight: 700,
  },
  postBody: {
    padding: 12,
    fontSize: 14,
    lineHeight: 1.45,
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