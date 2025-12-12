"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  username: string;
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
  username: string;
  avatar_url: string | null;
};

function normalizeProfile(p: any): { username: string; avatar_url: string | null } {
  const obj = Array.isArray(p) ? p?.[0] : p;
  return {
    username: (obj?.username ?? "unknown").toString(),
    avatar_url: obj?.avatar_url ?? null,
  };
}

export default function HomePage() {
  // auth
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  // composer
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

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const uid = data.user?.id ?? null;
      setUserId(uid);
      void loadAll(uid);
      if (uid) void loadMyProfile(uid);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      void loadAll(uid);
      if (uid) void loadMyProfile(uid);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function sendMagicLink() {
    const e = email.trim();
    if (!e) return;

    setAuthBusy(true);
    const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;

    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: { emailRedirectTo: redirectTo },
    });

    setAuthBusy(false);

    if (error) return alert(error.message);
    alert("Check your email and open the link to log in.");
  }

  async function logout() {
    await supabase.auth.signOut();
    setUserId(null);
    setEmail("");
    setText("");
    setImageFile(null);
    setOpenCommentsFor(null);
  }

  async function loadMyProfile(uid: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", uid)
      .single();

    if (error) return;

    setMyUsername((data?.username ?? "unknown").toString());
    setMyAvatarUrl(data?.avatar_url ?? null);
  }

  async function loadAll(uid: string | null = userId) {
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
          username: prof.username,
          avatar_url: prof.avatar_url,
          image_url: (row as any).image_url ?? null,
          likes: 0,
          likedByMe: false,
          commentCount: 0,
        };
      }) ?? [];

    const postIds = normalized.map((p) => p.id);

    if (postIds.length) {
      const { data: likesData, error: likesErr } = await supabase
        .from("reactions")
        .select("post_id, user_id")
        .in("post_id", postIds);

      if (!likesErr) {
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
    }

    if (postIds.length) {
      const { data: commentRows, error: cErr } = await supabase
        .from("comments")
        .select("post_id")
        .in("post_id", postIds);

      if (!cErr) {
        const countMap = new Map<string, number>();
        for (const pid of postIds) countMap.set(pid, 0);
        (commentRows ?? []).forEach((r: any) => {
          countMap.set(r.post_id, (countMap.get(r.post_id) ?? 0) + 1);
        });
        normalized.forEach((p) => (p.commentCount = countMap.get(p.id) ?? 0));
      }
    }

    setPosts(normalized);
    setLoading(false);
  }

  async function createPost() {
    if (!userId) return;
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
    if (!userId) return;

    const p = posts.find((x) => x.id === postId);
    if (!p) return;

    // optimistic
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
    if (!userId) return;

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
          username: prof.username,
          avatar_url: prof.avatar_url,
        };
      }) ?? [];

    setCommentsByPost((prev) => ({ ...prev, [postId]: normalized }));
  }

  async function addComment(postId: string) {
    if (!userId) return;
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
    if (!userId) return;
    if (avatarBusy) return;

    setAvatarBusy(true);

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `avatars/${userId}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("post-images").upload(path, file, { upsert: true });

    if (uploadError) {
      setAvatarBusy(false);
      return alert(uploadError.message);
    }

    const { data: pub } = supabase.storage.from("post-images").getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("profiles")
      .upsert({ id: userId, username: myUsername, avatar_url: pub.publicUrl });

    setAvatarBusy(false);

    if (updateError) return alert(updateError.message);

    setMyAvatarUrl(pub.publicUrl);
    void loadAll(userId);
  }

  const headerAvatarInitial = useMemo(() => (myUsername?.[0] || "?").toUpperCase(), [myUsername]);

  return (
    <div className="feed">
      <div className="header">
        <div className="headerInner">
          <div className="brand">Nihongo Feed</div>

          {/* RIGHT SIDE: login or me */}
          {!userId ? (
            <div className="loginInline">
              <input
                className="loginInput"
                placeholder="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <button className="miniBtn" onClick={sendMagicLink} disabled={authBusy || !email.trim()}>
                {authBusy ? "…" : "Login"}
              </button>
            </div>
          ) : (
            <div className="me">
              <div className="meAvatar">
                {myAvatarUrl ? <img src={myAvatarUrl} alt="me" /> : <span>{headerAvatarInitial}</span>}
              </div>

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

              <button className="miniBtn" onClick={logout} title="Logout">
                ↩
              </button>
            </div>
          )}
        </div>

        {!userId ? (
          <div className="muted" style={{ fontSize: 12, paddingTop: 8 }}>
            Public feed. Log in to post, like, or comment.
          </div>
        ) : null}
      </div>

      {/* COMPOSER only if logged in */}
      {userId ? (
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
            <input
              id="image"
              className="fileInput"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />

            <label className="fileBtn" htmlFor="image">
              画像
            </label>

            <div className="fileName">{imageFile ? imageFile.name : "画像なし"}</div>
            <div className="muted" style={{ marginLeft: "auto", fontSize: 12 }}>
              ログイン中
            </div>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div style={{ padding: 16 }} className="muted">
          Loading…
        </div>
      ) : (
        posts.map((p) => {
          const initial = (p.username?.[0] || "?").toUpperCase();
          const canDelete = !!userId && p.user_id === userId;

          return (
            <div className="post" key={p.id}>
              <div className="post-header">
                <div className="avatar">
                  {p.avatar_url ? <img src={p.avatar_url} alt={p.username} /> : <span>{initial}</span>}
                </div>

                <div className="postMeta">
                  <div className="nameRow">
                    <div className="handle">@{p.username}</div>
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
                <button className="likeBtn" onClick={() => (userId ? toggleLike(p.id) : alert("Log in first."))}>
                  <span className="icon">{p.likedByMe ? "💙" : "🤍"}</span>
                  <span>いいね</span>
                  <span className="muted">{p.likes}</span>
                </button>

                <button className="commentBtn" onClick={() => (userId ? void openComments(p.id) : alert("Log in first."))}>
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
                        return (
                          <div key={c.id} className="comment">
                            <div className="cAvatar">
                              {c.avatar_url ? <img src={c.avatar_url} alt={c.username} /> : <span>{ci}</span>}
                            </div>
                            <div className="cBody">
                              <div className="cTop">
                                <div className="cUser">@{c.username}</div>
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
                    <button
                      className="miniPost"
                      disabled={commentBusy || !commentText.trim()}
                      onClick={() => void addComment(p.id)}
                    >
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