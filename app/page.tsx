"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { requireSession } from "@/lib/authGuard";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";

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
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  // header hide/show on scroll
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollYRef = useRef(0);

  // LOGIN UI
  const [email, setEmail] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authMessage, setAuthMessage] = useState<string>("");
  const [pendingEmailConfirmation, setPendingEmailConfirmation] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);

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
  const [myUsername, setMyUsername] = useState<string>("");
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  // comments
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  // likes in-flight guard (prevents double-click duplicate inserts)
  const [likeBusyByPost, setLikeBusyByPost] = useState<Record<string, boolean>>({});

  const BASE_URL = useMemo(() => {
    const env = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const raw = env || origin;
    return raw.replace(/\/$/, "");
  }, []);

  const EMAIL_REDIRECT_TO = useMemo(() => `${BASE_URL}/auth/callback`, [BASE_URL]);

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

  // open composer when coming from /new (/?compose=1)
  useEffect(() => {
    if (!userId) return;
    if (checkingProfile || needsUsername) return;

    const compose =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("compose")
        : null;
    if (compose !== "1") return;

    // focus + scroll to composer
    setTimeout(() => {
      try {
        composerRef.current?.focus();
        composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {
        // ignore
      }
    }, 50);

    // clean URL so refresh doesn't reopen
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("compose");
      window.history.replaceState({}, "", url.toString());
    } catch {
      // ignore
    }
  }, [userId, checkingProfile, needsUsername]);

  // Hide header when scrolling down. Show again when scrolling up.
  useEffect(() => {
    if (typeof window === "undefined") return;

    lastScrollYRef.current = window.scrollY;

    let ticking = false;

    const onScroll = () => {
      const y = window.scrollY;
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        const last = lastScrollYRef.current;
        const delta = y - last;

        // small dead-zone so it doesn't flicker
        if (Math.abs(delta) > 8) {
          if (delta > 0 && y > 40) {
            setHeaderHidden(true);
          } else {
            setHeaderHidden(false);
          }
          lastScrollYRef.current = y;
        }

        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

    const uRaw = (data?.username ?? "").toString().trim();
    const uLower = uRaw.toLowerCase();
    const a = data?.avatar_url ?? null;

    const isAutoGenerated =
      /^user_[a-f0-9]{6,}$/i.test(uRaw) ||
      /^user-[a-f0-9]{6,}$/i.test(uRaw);

    const hasRealUsername = !!uRaw && uLower !== "unknown" && !isAutoGenerated;

    setMyUsername(hasRealUsername ? uRaw : "unknown");
    setMyAvatarUrl(a);
    setNeedsUsername(!hasRealUsername);
    setCheckingProfile(false);

    // load feed once we pass gate
    if (hasRealUsername) void loadAll(uid);
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
    if (saveBusy) return;
    if (usernameError) return;

    const activeUserId = userId ?? (await requireSession());
    if (!activeUserId) return;

    setSaveBusy(true);

    const { error } = await supabase.from("profiles").upsert({
      id: activeUserId,
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
    await loadAll(activeUserId);
  }

  async function loginWithPassword() {
    if (authBusy) return;
    if (!email.trim() || !password) return;

    setAuthMessage("");
    setAuthBusy(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setAuthBusy(false);

    if (error) {
      const trimmedEmail = email.trim();
      const lower = error.message.toLowerCase();

      if (lower.includes("email") && lower.includes("confirm")) {
        setPendingEmailConfirmation(trimmedEmail || pendingEmailConfirmation);
        setAuthMessage(
          "Email not confirmed. Check your inbox or resend the confirmation email."
        );
        if (trimmedEmail) void resendConfirmation(trimmedEmail);
        return;
      }

      setAuthMessage(error.message);
      return;
    }

    setPassword("");
    setPendingEmailConfirmation(null);
    setAuthMessage("");
  }

  async function signUpWithPassword() {
    if (authBusy) return;
    if (!email.trim() || !password) return;

    setAuthMessage("");
    setAuthBusy(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: EMAIL_REDIRECT_TO },
    });

    setAuthBusy(false);

    if (error) {
      console.error("Sign up error:", error);
      setAuthMessage(error.message);
      return;
    }

    const trimmedEmail = email.trim();
    setPassword("");

    if (data.session || data.user?.email_confirmed_at) {
      setAuthMode("login");
      setAuthMessage("Account created. You can now log in with your password.");
      setPendingEmailConfirmation(null);
      return;
    }

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: trimmedEmail,
      options: { emailRedirectTo: EMAIL_REDIRECT_TO },
    });

    if (resendError) {
      setAuthMessage(
        `Check your email to confirm your account, then log in. Resend failed: ${resendError.message}`
      );
      setPendingEmailConfirmation(trimmedEmail);
      return;
    }

    setPendingEmailConfirmation(trimmedEmail);
    setAuthMessage(
      "Check your email to confirm your account. We just sent another confirmation email."
    );
  }

  async function resendConfirmation(targetEmail?: string) {
    if (resendBusy) return;

    const emailToSend = (targetEmail ?? pendingEmailConfirmation ?? email).trim();
    if (!emailToSend) {
      setAuthMessage("Enter your email first.");
      return;
    }

    setResendBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: emailToSend,
      options: { emailRedirectTo: EMAIL_REDIRECT_TO },
    });
    setResendBusy(false);

    if (error) {
      console.error("Resend confirmation error:", error);
      setAuthMessage(`Could not resend confirmation email: ${error.message}`);
      return;
    }

    setPendingEmailConfirmation(emailToSend);
    setAuthMessage("Sent another confirmation email. Check your inbox and spam folder.");
  }

  async function logout() {
    await supabase.auth.signOut();
    setUserId(null);
    setEmail("");
    setPassword("");
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
          id: String(row.id),
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
      // posts.id are numeric-looking strings, likes.post_id is bigint.
      // Convert IDs to numbers so the bigint filter matches.
      const postIdsNum = postIds.map((id) => Number(id)).filter((n) => Number.isFinite(n));

      const { data: likesData } = await supabase
        .from("likes")
        .select("post_id, user_id")
        .in("post_id", postIdsNum as any);

      const likeMap = new Map<string, { count: number; mine: boolean }>();
      for (const pid of postIdsNum) likeMap.set(String(pid), { count: 0, mine: false });

      (likesData ?? []).forEach((r: any) => {
        const key = String(r.post_id);
        const cur = likeMap.get(key);
        if (!cur) return;
        cur.count += 1;
        if (uid && r.user_id === uid) cur.mine = true;
        likeMap.set(key, cur);
      });

      normalized.forEach((p) => {
        const v = likeMap.get(String(p.id));
        if (v) {
          p.likes = v.count;
          p.likedByMe = v.mine;
        }
      });
    }

    if (postIds.length) {
      const postIdsNum = postIds.map((id) => Number(id)).filter((n) => Number.isFinite(n));
      const { data: commentRows } = await supabase
        .from("comments")
        .select("post_id")
        .in("post_id", postIdsNum as any);

      const countMap = new Map<string, number>();
      for (const pid of postIdsNum) countMap.set(String(pid), 0);
      (commentRows ?? []).forEach((r: any) => {
        const key = String(r.post_id);
        countMap.set(key, (countMap.get(key) ?? 0) + 1);
      });

      normalized.forEach((p) => (p.commentCount = countMap.get(String(p.id)) ?? 0));
    }

    setPosts(normalized);
    setLoading(false);
  }

  async function createPost() {
    if (busy) return;
    if (!text.trim() && !imageFile) return;

    const activeUserId = userId ?? (await requireSession());
    if (!activeUserId) return;

    setBusy(true);

    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({ content: text.trim(), user_id: activeUserId })
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
    void loadAll(activeUserId);
  }

  async function toggleLike(postId: string) {
    if (likeBusyByPost[postId]) return;
    setLikeBusyByPost((prev) => ({ ...prev, [postId]: true }));

    try {
      const activeUserId = userId ?? (await requireSession());
      if (!activeUserId) return;

      const p = posts.find((x) => x.id === postId);
      if (!p) return;

      // optimistic UI
      setPosts((prev) =>
        prev.map((x) =>
          x.id === postId
            ? { ...x, likedByMe: !x.likedByMe, likes: x.likedByMe ? x.likes - 1 : x.likes + 1 }
            : x
        )
      );

      // DB uses bigint post_id.
      const pid = Number(postId);

      if (p.likedByMe) {
        // unlike
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", pid)
          .eq("user_id", activeUserId);

        if (error) {
          alert(error.message);
          void loadAll(activeUserId);
        }
      } else {
        // like
        const { error } = await supabase.from("likes").insert({ post_id: pid, user_id: activeUserId });

        if (error) {
          const msg = (error.message || "").toLowerCase();
          const code = (error as any).code;

          // Ignore duplicate like errors (unique constraint) because the end state is already "liked".
          if (code === "23505" || msg.includes("duplicate") || msg.includes("unique")) {
            // no alert
          } else {
            alert(error.message);
          }
          void loadAll(activeUserId);
        }
      }
    } finally {
      setLikeBusyByPost((prev) => ({ ...prev, [postId]: false }));
    }
  }

  async function deletePost(postId: string) {
    const activeUserId = userId ?? (await requireSession());
    if (!activeUserId) return;
    const ok = confirm("Delete this post?");
    if (!ok) return;

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId)
      .eq("user_id", activeUserId);
    if (error) return alert(error.message);

    if (openCommentsFor === postId) setOpenCommentsFor(null);
    void loadAll(activeUserId);
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
    const activeUserId = userId ?? (await requireSession());
    if (!activeUserId) return;
    if (commentBusy) return;
    if (!commentText.trim()) return;

    setCommentBusy(true);

    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      user_id: activeUserId,
      content: commentText.trim(),
    });

    setCommentBusy(false);

    if (error) return alert(error.message);

    setCommentText("");
    await loadComments(postId);
    await loadAll(activeUserId);
  }

  async function openComments(postId: string) {
    const next = openCommentsFor === postId ? null : postId;
    setOpenCommentsFor(next);
    setCommentText("");
    if (next) await loadComments(next);
  }

  async function uploadMyAvatar(file: File) {
    const activeUserId = userId ?? (await requireSession());
    if (!activeUserId) return;
    if (avatarBusy) return;

    setAvatarBusy(true);

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `avatars/${activeUserId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setAvatarBusy(false);
      return alert(uploadError.message);
    }

    const { data: pub } = supabase.storage.from("post-images").getPublicUrl(path);

    const { error: updateError } = await supabase.from("profiles").upsert({
      id: activeUserId,
      username: myUsername === "unknown" ? normalizedNewUsername || null : myUsername,
      avatar_url: pub.publicUrl,
    });

    setAvatarBusy(false);

    if (updateError) return alert(updateError.message);

    setMyAvatarUrl(pub.publicUrl);
    void loadAll(activeUserId);
  }


  const headerAvatarInitial = useMemo(() => (myUsername?.[0] || "?").toUpperCase(), [myUsername]);


  const linkStyle: React.CSSProperties = { color: "inherit", textDecoration: "none" };

  // --------- SCREENS ---------

  if (!userId) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ width: 360, background: "#111", color: "#fff", borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 0 }} className="brand">
            フィード
          </div>
          <div style={{ opacity: 0.7, marginTop: 6, marginBottom: 14, fontSize: 13 }}>
            Log in with email and password
          </div>

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
              marginBottom: 8,
            }}
            autoFocus
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
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

          {pendingEmailConfirmation ? (
            <div style={{ marginBottom: 10, fontSize: 12, lineHeight: 1.5, color: "#d1d5ff" }}>
              We’ve sent a confirmation link to {pendingEmailConfirmation}. Confirm your email, then log in.
            </div>
          ) : null}

          <button
            onClick={authMode === "login" ? loginWithPassword : signUpWithPassword}
            disabled={authBusy || !email.trim() || !password}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "0",
              background: "#fff",
              color: "#111",
              fontWeight: 800,
              cursor: "pointer",
              opacity: authBusy || !email.trim() || !password ? 0.6 : 1,
              marginTop: 4,
            }}
          >
            {authBusy ? "Loading…" : authMode === "login" ? "Log in" : "Sign up"}
          </button>

          {pendingEmailConfirmation ? (
            <button
              onClick={() => resendConfirmation()}
              disabled={resendBusy}
              style={{
                marginTop: 10,
                width: "100%",
                padding: 10,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(255,255,255,.05)",
                color: "#fff",
                cursor: resendBusy ? "not-allowed" : "pointer",
              }}
            >
              {resendBusy ? "Resending…" : "Resend confirmation email"}
            </button>
          ) : null}

          <button
            onClick={() => setAuthMode((prev) => (prev === "login" ? "signup" : "login"))}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.1)",
              background: "transparent",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              marginTop: 10,
            }}
          >
            {authMode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
          </button>

          {authMessage ? (
            <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.4, color: "#cfd4ff" }}>
              {authMessage}
            </div>
          ) : null}
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
  const myProfileHref = userId ? `/profile/${encodeURIComponent(userId)}` : "/";
  return (
    <>
      <div className="feed" style={{ paddingBottom: 80, minHeight: "100vh" }}>
      <div
        className="header"
        style={{
          transform: headerHidden ? "translateY(-110%)" : "translateY(0)",
          transition: "transform 180ms ease",
          willChange: "transform",
        }}
      >
        <div className="headerInner">
          <div className="brand" style={{ fontSize: 30, fontWeight: 900, letterSpacing: 0 }}>
            フィード
          </div>
        </div>
      </div>


      <div className="composer">
        <div className="composer-row">
          <textarea
            className="textarea"
            ref={composerRef}
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
        <div style={{ display: "grid", gap: 12 }}>
          {posts.map((p) => {
            const initial = (p.username?.[0] || "?").toUpperCase();
            const canDelete = !!userId && p.user_id === userId;
            // Link posts and avatars using the user_id rather than the username to ensure stable routing.
            const profileHref = p.user_id ? `/profile/${encodeURIComponent(p.user_id)}` : "";

            return (
              <div className="post" key={p.id}>
                <div className="post-header">
                  {profileHref ? (
                    <Link href={profileHref} className="avatar" style={linkStyle} aria-label={`Open profile ${p.username || "unknown"}`}>
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
                          まだコメントはありません。
                        </div>
                      ) : (
                        (commentsByPost[p.id] ?? []).map((c) => {
                          const ci = (c.username?.[0] || "?").toUpperCase();
                          // Use comment author's user_id for profile links, falling back to empty string if missing
                          const cProfileHref = c.user_id ? `/profile/${encodeURIComponent(c.user_id)}` : "";

                          return (
                            <div key={c.id} className="comment">
                              {cProfileHref ? (
                                <Link href={cProfileHref} className="cAvatar" style={linkStyle} aria-label={`Open profile ${c.username || "unknown"}`}>
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
          })}
        </div>
      )}
      </div>

      <BottomNav
        profileHref={myProfileHref}
        profileAvatarUrl={myAvatarUrl ?? null}
        profileInitial={(myUsername?.[0] ?? "?").toUpperCase()}
      />
    </>
  );
}
