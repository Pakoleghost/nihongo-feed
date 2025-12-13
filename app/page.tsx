"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type DbPostRow = {
  id: string;
  content: string | null;
  created_at: string;
  user_id: string;
  image_url?: string | null;
  profiles:
    | { username: string | null; avatar_url: string | null }
    | { username: string | null; avatar_url: string | null }[]
    | null;
};

type Post = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username: string; // "" si no hay
  avatar_url: string | null;
  image_url: string | null;
  likes: number;
  likedByMe: boolean;
  commentCount: number;
};

type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles:
    | { username: string | null; avatar_url: string | null }
    | { username: string | null; avatar_url: string | null }[]
    | null;
};

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username: string; // "" si no hay
  avatar_url: string | null;
};

function normalizeProfile(p: any): { username: string; avatar_url: string | null } {
  const obj = Array.isArray(p) ? p?.[0] : p;

  const raw = (obj?.username ?? "").toString().trim().toLowerCase();

  // Si no hay username real, NO generes link
  const username = raw && raw !== "unknown" ? raw : "";

  return {
    username,
    avatar_url: obj?.avatar_url ?? null,
  };
}

export default function HomePage() {
  const [userId, setUserId] = useState<string | null>(null);

  // LOGIN UI
  const [email, setEmail] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  // USERNAME GATE
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);

  // feed composer
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  // feed
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // my profile
  const [myUsername, setMyUsername] = useState<string>("unknown");
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  // comments
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});

  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  // auth bootstrap
  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const uid = data.user?.id ?? null;
      setUserId(uid);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // after login: check profile gate
  useEffect(() => {
    if (!userId) {
      setCheckingProfile(false);
      setNeedsUsername(false);
      return;
    }
    void checkMyProfile(userId);
  }, [userId]);

  async function checkMyProfile(uid: string) {
    setCheckingProfile(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", uid)
      .single();

    // if no row yet, we need username
    if (error) {
      setNeedsUsername(true);
      setMyUsername("unknown");
      setMyAvatarUrl(null);
      setCheckingProfile(false);
      return;
    }

    const u = (data?.username ?? "").toString().trim();
    const a = data?.avatar_url ?? null;

    setMyUsername(u || "unknown");
    setMyAvatarUrl(a);
    setNeedsUsername(!u); // only gate if empty username
    setCheckingProfile(false);

    // load feed once we pass gate
    if (u) void loadAll(uid);
  }

  const normalizedNewUsername = useMemo(() => newUsername.trim().toLowerCase(), [newUsername]);

  const usernameError = useMemo(() => {
    if (!normalizedNewUsername) return "Type a username.";
    if (normalizedNewUsername.length < 3) return "Minimum 3 characters.";
    if (normalizedNewUsername.length > 20) return "Maximum 20 characters.";
    if (!/^[a-z0-9_]+$/.test(normalizedNewUsername)) return "Use only a-z, 0-9, underscore (_).";
    return "";
  }, [normalizedNewUsername]);

  async function saveUsername() {
    if (!userId) return;
    if (saveBusy) return;
    if (usernameError) return;

    setSaveBusy(true);

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      username: normalizedNewUsername,
      avatar_url: myAvatarUrl,
    });

    setSaveBusy(false);

    if (error) {
      alert(error.message);
      return;
    }

    setMyUsername(normalizedNewUsername);
    setNeedsUsername(false);
    await loadAll(userId);
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
    setUserId(null);
    setEmail("");
    setNeedsUsername(false);
    setNewUsername("");
    setPosts([]);
  }

  async function loadAll(uid: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id, image_url, profiles(username, avatar_url)")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const normalized: Post[] =
      (data as unknown as DbPostRow[] | null)?.map((row) => {
        const prof = normalizeProfile(row.profiles as any);
        return {
          id: row.id,
          content: (row.content ?? "").toString(),
          created_at: row.created_at,
          user_id: row.user_id,
          username: prof.username, // "" si no hay
          avatar_url: prof.avatar_url,
          image_url: (row as any).image_url ?? null,
          likes: 0,
          likedByMe: false,
          commentCount: 0,
        };
      }) ?? [];

    const postIds = normalized.map((p) => p.id);

    if (postIds.length) {
      const { data: likesData } = await supabase
        .from("reactions")
        .select("post_id, user_id")
        .in("post_id", postIds);

      const likeMap = new Map<string, { count: number; mine: boolean }>();
      for (const pid of postIds) likeMap.set(pid, { count: 0, mine: false });

      (likesData ?? []).forEach((r: any) => {
        const cur = likeMap.get(r.post_id);
        if (!cur) return;
        cur.count += 1;
        if (uid && r.user_id === uid) cur.mine = true;
        likeMap.set(r.post_id, cur);
      });

      normalized.forEach((p) => {
        const v = likeMap.get(p.id);
        if (v) {
          p.likes = v.count;
          p.likedByMe = v.mine;
        }
      });
    }

    if (postIds.length) {
      const { data: commentRows } = await supabase.from("comments").select("post_id").in("post_id", postIds);

      const countMap = new Map<string, number>();
      for (const pid of postIds) countMap.set(pid, 0);
      (commentRows ?? []).forEach((r: any) => {
        countMap.set(r.post_id, (countMap.get(r.post_id) ?? 0) + 1);
      });

      normalized.forEach((p) => (p.commentCount = countMap.get(p.id) ?? 0));
    }

    setPosts(normalized);
    setLoading(false);
  }

  async function createPost() {
    if (!userId) return alert("Log in first.");
    if (busy) return;
    if (!text.trim() && !imageFile) return;

    setBusy(true);

    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({ content: text.trim(), user_id: userId })
      .select("id")
      .single();

    if (postError || !post) {
      setBusy(false);
      alert(postError?.message ?? "Post error");
      return;
    }

    if (imageFile) {
      const ext = (imageFile.name.split(".").pop() || "jpg").toLowerCase();
      const path = `posts/${post.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(path, imageFile, { upsert: true });

      if (uploadError) {
        setBusy(false);
        alert(uploadError.message);
        return;
      }

      const { data: pub } = supabase.storage.from("post-images").getPublicUrl(path);

      const { error: updateError } = await supabase.from("posts").update({ image_url: pub.publicUrl }).eq("id", post.id);

      if (updateError) {
        setBusy(false);
        alert(updateError.message);
        return;
      }
    }

    setText("");
    setImageFile(null);
    setBusy(false);
    void loadAll(userId);
  }

  async function toggleLike(postId: string) {
    if (!userId) return alert("Log in first.");

    const p = posts.find((x) => x.id === postId);
    if (!p) return;

    setPosts((prev) =>
      prev.map((x) =>
        x.id === postId
          ? { ...x, likedByMe: !x.likedByMe, likes: x.likedByMe ? x.likes - 1 : x.likes + 1 }
          : x
      )
    );

    if (p.likedByMe) {
      const { error } = await supabase.from("reactions").delete().eq("post_id", postId).eq("user_id", userId);
      if (error) {
        alert(error.message);
        void loadAll(userId);
      }
    } else {
      const { error } = await supabase.from("reactions").insert({ post_id: postId, user_id: userId });
      if (error) {
        alert(error.message);
        void loadAll(userId);
      }
    }
  }

  async function deletePost(postId: string) {
    if (!userId) return alert("Log in first.");
    const ok = confirm("Delete this post?");
    if (!ok) return;

    const { error } = await supabase.from("posts").delete().eq("id", postId).eq("user_id", userId);
    if (error) return alert(error.message);

    if (openCommentsFor === postId) setOpenCommentsFor(null);
    void loadAll(userId);
  }

  async function loadComments(postId: string) {
    const { data, error } = await supabase
      .from("comments")
      .select("id, post_id, user_id, content, created_at, profiles(username, avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) return alert(error.message);

    const normalized: Comment[] =
      (data as unknown as CommentRow[] | null)?.map((row) => {
        const prof = normalizeProfile(row.profiles as any);
        return {
          id: row.id,
          post_id: row.post_id,
          user_id: row.user_id,
          content: row.content,
          created_at: row.created_at,
          username: prof.username, // "" si no hay
          avatar_url: prof.avatar_url,
        };
      }) ?? [];

    setCommentsByPost((prev) => ({ ...prev, [postId]: normalized }));
  }

  async function addComment(postId: string) {
    if (!userId) return alert("Log in first.");
    if (commentBusy) return;
    if (!commentText.trim()) return;

    setCommentBusy(true);

    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      user_id: userId,
      content: commentText.trim(),
    });

    setCommentBusy(false);

    if (error) return alert(error.message);

    setCommentText("");
    await loadComments(postId);
    await loadAll(userId);
  }

  async function openComments(postId: string) {
    const next = openCommentsFor === postId ? null : postId;
    setOpenCommentsFor(next);
    setCommentText("");
    if (next) await loadComments(next);
  }

  async function uploadMyAvatar(file: File) {
    if (!userId) return alert("Log in first.");
    if (avatarBusy) return;

    setAvatarBusy(true);

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `avatars/${userId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setAvatarBusy(false);
      return alert(uploadError.message);
    }

    const { data: pub } = supabase.storage.from("post-images").getPublicUrl(path);

    const { error: updateError } = await supabase.from("profiles").upsert({
      id: userId,
      username: myUsername === "unknown" ? normalizedNewUsername || null : myUsername,
      avatar_url: pub.publicUrl,
    });

    setAvatarBusy(false);

    if (updateError) return alert(updateError.message);

    setMyAvatarUrl(pub.publicUrl);
    void loadAll(userId);
  }

  const headerAvatarInitial = useMemo(() => (myUsername?.[0] || "?").toUpperCase(), [myUsername]);

  const linkStyle: React.CSSProperties = { color: "inherit", textDecoration: "none" };

  // --------- SCREENS ---------

  if (!userId) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ width: 360, background: "#111", color: "#fff", borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 2 }}>フィード</div>
          <div style={{ opacity: 0.7, marginTop: 6, marginBottom: 14, fontSize: 13 }}>Log in with email</div>

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.15)",
              background: "rgba(255,255,255,.06)",
              color: "#fff",
              outline: "none",
              marginBottom: 10,
            }}
          />

          <button
            onClick={sendMagicLink}
            disabled={authBusy || !email.trim()}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "0",
              background: "#fff",
              color: "#111",
              fontWeight: 800,
              cursor: "pointer",
              opacity: authBusy || !email.trim() ? 0.6 : 1,
            }}
          >
            {authBusy ? "Sending…" : "Send link"}
          </button>
        </div>
      </main>
    );
  }

  if (checkingProfile) {
    return <div style={{ padding: 24, color: "#777" }}>Loading…</div>;
  }

  if (needsUsername) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ width: 360, background: "#111", color: "#fff", borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>Choose a username</div>
          <div style={{ opacity: 0.7, marginTop: 6, marginBottom: 14, fontSize: 13 }}>This will show on your posts.</div>

          <input
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="username"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.15)",
              background: "rgba(255,255,255,.06)",
              color: "#fff",
              outline: "none",
              marginBottom: 8,
            }}
            autoFocus
          />

          {usernameError ? (
            <div style={{ color: "#ffb4b4", fontSize: 12, marginBottom: 10 }}>{usernameError}</div>
          ) : null}

          <button
            onClick={saveUsername}
            disabled={saveBusy || !!usernameError}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "0",
              background: "#fff",
              color: "#111",
              fontWeight: 800,
              cursor: "pointer",
              opacity: saveBusy || !!usernameError ? 0.6 : 1,
            }}
          >
            {saveBusy ? "Saving…" : "Save"}
          </button>

          <button
            onClick={logout}
            style={{
              width: "100%",
              marginTop: 10,
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.15)",
              background: "transparent",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Log out
          </button>
        </div>
      </main>
    );
  }

  // FEED
  return (
    <div className="feed">
      <div className="header">
        <div className="headerInner">
          <div className="brand">フィード</div>

          <div className="me">
            <div className="meAvatar">{myAvatarUrl ? <img src={myAvatarUrl} alt="me" /> : <span>{headerAvatarInitial}</span>}</div>

            <label className={`miniBtn ${avatarBusy ? "disabled" : ""}`}>
              {avatarBusy ? "…" : "写真"}
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadMyAvatar(f);
                  e.currentTarget.value = "";
                }}
              />
            </label>

            <button className="miniBtn" onClick={logout} style={{ marginLeft: 8 }}>
              出る
            </button>
          </div>
        </div>
      </div>

      <div className="composer">
        <div className="composer-row">
          <textarea
            className="textarea"
            placeholder="日本語で書いてね…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <button className="postBtn" onClick={createPost} disabled={busy || (!text.trim() && !imageFile)}>
            {busy ? "投稿中…" : "投稿"}
          </button>
        </div>

        <div className="fileRow">
          <input id="image" className="fileInput" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />

          <label className="fileBtn" htmlFor="image">
            画像
          </label>

          <div className="fileName">{imageFile ? imageFile.name : "画像なし"}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 16 }} className="muted">
          Loading…
        </div>
      ) : (
        posts.map((p) => {
          const initial = (p.username?.[0] || "?").toUpperCase();
          const canDelete = !!userId && p.user_id === userId;
          const profileHref = p.username ? `/u/${encodeURIComponent(p.username)}` : "";

          return (
            <div className="post" key={p.id}>
              <div className="post-header">
                {p.username ? (
                  <Link href={profileHref} className="avatar" style={linkStyle} aria-label={`Open profile ${p.username}`}>
                    {p.avatar_url ? <img src={p.avatar_url} alt={p.username} /> : <span>{initial}</span>}
                  </Link>
                ) : (
                  <div className="avatar" aria-label="No profile">
                    {p.avatar_url ? <img src={p.avatar_url} alt="unknown" /> : <span>{initial}</span>}
                  </div>
                )}

                <div className="postMeta">
                  <div className="nameRow">
                    {p.username ? (
                      <Link href={profileHref} className="handle" style={linkStyle}>
                        @{p.username}
                      </Link>
                    ) : (
                      <span className="handle muted">@unknown</span>
                    )}

                    {canDelete ? (
                      <button className="ghostBtn" onClick={() => deletePost(p.id)} title="Delete">
                        削除
                      </button>
                    ) : null}
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

              <div className="actionsRow">
                <button className="likeBtn" onClick={() => toggleLike(p.id)}>
                  <span className="icon">{p.likedByMe ? "💙" : "🤍"}</span>
                  <span>いいね</span>
                  <span className="muted">{p.likes}</span>
                </button>

                <button className="commentBtn" onClick={() => void openComments(p.id)}>
                  <span className="icon">💬</span>
                  <span>コメント</span>
                  <span className="muted">{p.commentCount}</span>
                </button>
              </div>

              {openCommentsFor === p.id ? (
                <div className="comments">
                  <div className="commentsList">
                    {(commentsByPost[p.id] ?? []).length === 0 ? (
                      <div className="muted" style={{ fontSize: 13, padding: 8 }}>
                        No comments yet.
                      </div>
                    ) : (
                      (commentsByPost[p.id] ?? []).map((c) => {
                        const ci = (c.username?.[0] || "?").toUpperCase();
                        const cProfileHref = c.username ? `/u/${encodeURIComponent(c.username)}` : "";

                        return (
                          <div key={c.id} className="comment">
                            {c.username ? (
                              <Link href={cProfileHref} className="cAvatar" style={linkStyle} aria-label={`Open profile ${c.username}`}>
                                {c.avatar_url ? <img src={c.avatar_url} alt={c.username} /> : <span>{ci}</span>}
                              </Link>
                            ) : (
                              <div className="cAvatar">
                                {c.avatar_url ? <img src={c.avatar_url} alt="unknown" /> : <span>{ci}</span>}
                              </div>
                            )}

                            <div className="cBody">
                              <div className="cTop">
                                <div className="cUser">
                                  {c.username ? (
                                    <Link href={cProfileHref} style={linkStyle}>
                                      @{c.username}
                                    </Link>
                                  ) : (
                                    "@unknown"
                                  )}
                                </div>
                                <div className="muted" style={{ fontSize: 11 }}>
                                  {new Date(c.created_at).toLocaleString()}
                                </div>
                              </div>
                              <div className="cText">{c.content}</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="commentComposer">
                    <input
                      className="commentInput"
                      placeholder="コメントを書く…"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                    />
                    <button className="miniPost" disabled={commentBusy || !commentText.trim()} onClick={() => void addComment(p.id)}>
                      {commentBusy ? "…" : "送信"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}