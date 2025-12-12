"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type DbPostRow = {
  id: string;
  content: string | null;
  image_path: string | null;
  created_at: string;
  user_id: string;
  profiles: { username: string | null } | { username: string | null }[] | null;
};

type Post = {
  id: string;
  content: string;
  image_path: string | null;
  created_at: string;
  user_id: string;
  username: string;
};

export default function HomePage() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  // auth
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  // username gate
  const [username, setUsername] = useState("");
  const [hasProfile, setHasProfile] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);

  // feed
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // composer
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [postBusy, setPostBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Auth listener
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load posts always (public feed)
  useEffect(() => {
    void loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After login: check profile
  useEffect(() => {
    if (!user) {
      setHasProfile(false);
      setUsername("");
      return;
    }
    void checkProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const normalizedUsername = useMemo(() => username.trim().toLowerCase(), [username]);

  const usernameError = useMemo(() => {
    if (!normalizedUsername) return "Type a username.";
    if (normalizedUsername.length < 3) return "Minimum 3 characters.";
    if (normalizedUsername.length > 20) return "Maximum 20 characters.";
    if (!/^[a-z0-9_]+$/.test(normalizedUsername)) return "Use only a-z, 0-9, underscore (_).";
    return "";
  }, [normalizedUsername]);

  async function loadPosts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("posts")
      .select("id, content, image_path, created_at, user_id, profiles(username)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const normalized: Post[] =
      (data as unknown as DbPostRow[] | null)?.map((row) => {
        const p = row.profiles as any;
        const u = (Array.isArray(p) ? p?.[0]?.username : p?.username) ?? "unknown";

        return {
          id: row.id,
          content: (row.content ?? "").toString(),
          image_path: row.image_path ?? null,
          created_at: row.created_at,
          user_id: row.user_id,
          username: u,
        };
      }) ?? [];

    setPosts(normalized);
    setLoading(false);
  }

  async function checkProfile() {
    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    if (error) {
      // If row doesn't exist yet, keep hasProfile false
      setHasProfile(false);
      return;
    }

    if (data?.username) setHasProfile(true);
    else setHasProfile(false);
  }

  async function createProfile() {
    if (profileBusy) return;
    if (usernameError) return;

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

  async function createPost() {
    if (!user) return;
    if (!hasProfile) return;
    if (postBusy) return;
    if (!text.trim() && !image) return;

    setPostBusy(true);

    let imagePath: string | null = null;

    // 1) Upload image if present
    if (image) {
      const ext = (image.name.split(".").pop() || "jpg").toLowerCase();
      const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
      const fileName = `${user.id}/${Date.now()}.${safeExt}`;

      const { error: upErr } = await supabase.storage
        .from("post-images")
        .upload(fileName, image, { upsert: false });

      if (upErr) {
        setPostBusy(false);
        alert(upErr.message);
        return;
      }

      imagePath = fileName;
    }

    // 2) Insert post row
    const { error: insErr } = await supabase.from("posts").insert({
      content: text.trim() ? text.trim() : null,
      image_path: imagePath,
      user_id: user.id,
    });

    setPostBusy(false);

    if (insErr) {
      alert(insErr.message);
      return;
    }

    // 3) Clear composer
    setText("");
    setImage(null);
    if (fileRef.current) fileRef.current.value = "";

    // 4) Refresh feed
    void loadPosts();
  }

  const canPost = !!user && hasProfile;

  return (
    <div className="feed">
      <div className="header">
        Nihongo Feed
        {!!user && (
          <button onClick={logout} style={{ float: "right" }}>
            ↩
          </button>
        )}
      </div>

      {/* AUTH / USERNAME */}
      {!user && (
        <div style={{ padding: 12, borderBottom: "1px solid #eee" }}>
          <div className="muted" style={{ marginBottom: 8 }}>
            Log in to post. Feed is public.
          </div>
          <input
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              border: "1px solid #ddd",
              borderRadius: 10,
              marginBottom: 8,
            }}
            autoComplete="email"
          />
          <button onClick={sendMagicLink} disabled={authBusy || !email.trim()}>
            {authBusy ? "Sending..." : "Send link"}
          </button>
        </div>
      )}

      {!!user && !hasProfile && (
        <div style={{ padding: 12, borderBottom: "1px solid #eee" }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Choose a username</div>
          <input
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              border: "1px solid #ddd",
              borderRadius: 10,
              marginBottom: 8,
            }}
            autoComplete="off"
          />
          {!!usernameError && (
            <div style={{ fontSize: 12, color: "#b00020", marginBottom: 8 }}>{usernameError}</div>
          )}
          <button onClick={createProfile} disabled={profileBusy || !!usernameError}>
            {profileBusy ? "Saving..." : "Save"}
          </button>
        </div>
      )}

      {/* COMPOSER */}
      {canPost && (
        <div style={{ padding: 12, borderBottom: "1px solid #eee" }}>
          <textarea
            placeholder="Write in Japanese…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{
              width: "100%",
              height: 70,
              padding: 10,
              border: "1px solid #ddd",
              borderRadius: 12,
              fontSize: 14,
              marginBottom: 8,
            }}
          />

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
            style={{ marginBottom: 8 }}
          />

          <button onClick={createPost} disabled={postBusy || (!text.trim() && !image)}>
            {postBusy ? "Posting..." : "Post"}
          </button>
        </div>
      )}

      {/* FEED */}
      {loading ? (
        <div className="muted" style={{ padding: 12 }}>
          Loading…
        </div>
      ) : (
        posts.map((p) => {
          const initial = (p.username?.[0] || "?").toUpperCase();
          const imgUrl = p.image_path
            ? `${SUPABASE_URL}/storage/v1/object/public/post-images/${p.image_path}`
            : null;

          return (
            <div className="post" key={p.id}>
              <div className="post-header">
                <div className="avatar">{initial}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>@{p.username}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {new Date(p.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {imgUrl && (
                <div style={{ padding: "0 12px 12px" }}>
                  <img
                    src={imgUrl}
                    alt="post image"
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      border: "1px solid #eee",
                      display: "block",
                    }}
                  />
                </div>
              )}

              {p.content && <div className="post-content">{p.content}</div>}
            </div>
          );
        })
      )}
    </div>
  );
}