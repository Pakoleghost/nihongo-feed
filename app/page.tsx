"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Post = {
  id: string;
  content: string;
  created_at: string;
  profiles?: { username: string };
};

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [hasProfile, setHasProfile] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Check profile + load posts
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

  async function createProfile() {
    if (!username.trim()) return;

    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      username,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setHasProfile(true);
  }

  async function loadPosts() {
    const { data } = await supabase
      .from("posts")
      .select("id, content, created_at, profiles(username)")
      .order("created_at", { ascending: false });

    if (data) setPosts(data as Post[]);
  }

  async function createPost() {
    if (!text.trim()) return;

    await supabase.from("posts").insert({
      content: text,
      user_id: user.id,
    });

    setText("");
    loadPosts();
  }

  async function sendMagicLink() {
    if (!email.trim()) return;

    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });

    alert("Check your email.");
  }

  async function logout() {
    await supabase.auth.signOut();
    setHasProfile(false);
  }

  // LOGIN SCREEN
  if (!user) {
    return (
      <main style={styles.page}>
        <div style={styles.card}>
          <h2>Nihongo Feed 🇯🇵</h2>
          <input
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />
          <button onClick={sendMagicLink}>Send link</button>
        </div>
      </main>
    );
  }

  // USERNAME SCREEN
  if (!hasProfile) {
    return (
      <main style={styles.page}>
        <div style={styles.card}>
          <h2>Choose a username</h2>
          <input
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
          />
          <button onClick={createProfile}>Save</button>
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
          <button onClick={logout} style={{ float: "right" }}>↩</button>
        </header>

        <div style={{ padding: 12 }}>
          <textarea
            placeholder="Write in Japanese…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={styles.textarea}
          />
          <button onClick={createPost}>Post</button>
        </div>

        <div style={styles.feed}>
          {posts.map((p) => (
            <div key={p.id} style={styles.post}>
              <div style={styles.postHeader}>
                <div style={styles.avatar}>
                  {p.profiles?.username[0]?.toUpperCase()}
                </div>
                <span>{p.profiles?.username}</span>
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
    fontWeight: 600,
    textAlign: "center",
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
    fontWeight: 700,
  },
  postBody: {
    padding: 12,
    fontSize: 14,
  },
  card: {
    background: "#fff",
    padding: 24,
    borderRadius: 12,
    width: 320,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  input: {
    padding: 8,
  },
  textarea: {
    width: "100%",
    height: 70,
    marginBottom: 8,
  },
};