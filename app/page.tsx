"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type Post = {
  id: number; // bigint in DB
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  profiles?: { username: string | null; avatar_url: string | null } | null;
  reactions_count?: number;
  my_reaction?: string | null;
  comments_count?: number;
};

type Comment = {
  id: string;
  post_id: number;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: { username: string | null; avatar_url: string | null } | null;
};

const REACTIONS: { key: string; label: string; emoji: string }[] = [
  { key: "like", label: "いいね", emoji: "♡" },
  { key: "love", label: "すき", emoji: "❤" },
  { key: "haha", label: "笑", emoji: "😂" },
  { key: "wow", label: "びっくり", emoji: "😮" },
  { key: "sad", label: "かなしい", emoji: "🥲" },
];

export default function Home() {
  const [user, setUser] = useState<any>(null);

  // auth
  const [email, setEmail] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  // profile gate
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);

  // feed
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  // composer
  const [text, setText] = useState("");
  const [postBusy, setPostBusy] = useState(false);

  // comments sheet
  const [openPost, setOpenPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);

  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  // auth init
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // after login: load profile + feed
  useEffect(() => {
    if (!user) return;
    (async () => {
      await loadProfile();
      await loadFeed();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const normalizedUsername = useMemo(() => username.trim().toLowerCase(), [username]);

  const usernameError = useMemo(() => {
    if (!normalizedUsername) return "ユーザー名を入力してください";
    if (normalizedUsername.length < 3) return "3文字以上";
    if (normalizedUsername.length > 20) return "20文字以内";
    if (!/^[a-z0-9_]+$/.test(normalizedUsername)) return "a-z / 0-9 / _ のみ";
    return "";
  }, [normalizedUsername]);

  async function loadProfile() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error(error);
      setProfile(null);
      return;
    }

    setProfile((data as Profile) ?? null);
  }

  async function saveProfile() {
    if (profileBusy) return;
    if (usernameError) return;

    setProfileBusy(true);

    const payload = {
      id: user.id,
      username: normalizedUsername,
      display_name: normalizedUsername,
    };

    const { error } = await supabase.from("profiles").upsert(payload);

    setProfileBusy(false);

    if (error) {
      alert(error.message);
      return;
    }

    await loadProfile();
  }

  async function loadFeed() {
    setLoadingFeed(true);

    // posts + profile join
    const { data: postsData, error: postsErr } = await supabase
      .from("posts")
      .select("id, content, image_url, created_at, user_id, profiles(username, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (postsErr) {
      setLoadingFeed(false);
      alert(postsErr.message);
      return;
    }

    const base = (postsData as any[]).map((p) => ({
      ...p,
      reactions_count: 0,
      my_reaction: null,
      comments_count: 0,
    })) as Post[];

    // counts (simple, fast enough for 20 students)
    const ids = base.map((p) => p.id);
    if (ids.length) {
      const [reactionsAgg, myReact, commentsAgg] = await Promise.all([
        supabase.from("reactions").select("post_id, type").in("post_id", ids),
        supabase.from("reactions").select("post_id, type").eq("user_id", user.id).in("post_id", ids),
        supabase.from("comments").select("post_id").in("post_id", ids),
      ]);

      const countMap = new Map<number, number>();
      (reactionsAgg.data || []).forEach((r: any) => {
        countMap.set(r.post_id, (countMap.get(r.post_id) || 0) + 1);
      });

      const myMap = new Map<number, string>();
      (myReact.data || []).forEach((r: any) => {
        myMap.set(r.post_id, r.type);
      });

      const cMap = new Map<number, number>();
      (commentsAgg.data || []).forEach((c: any) => {
        cMap.set(c.post_id, (cMap.get(c.post_id) || 0) + 1);
      });

      base.forEach((p) => {
        p.reactions_count = countMap.get(p.id) || 0;
        p.my_reaction = myMap.get(p.id) || null;
        p.comments_count = cMap.get(p.id) || 0;
      });
    }

    setPosts(base);
    setLoadingFeed(false);
  }

  async function createPost() {
    if (postBusy) return;
    const content = text.trim();
    if (!content) return;

    setPostBusy(true);

    const { error } = await supabase.from("posts").insert({
      content,
      user_id: user.id,
      image_url: null, // UI now, images next step
    });

    setPostBusy(false);

    if (error) {
      alert(error.message);
      return;
    }

    setText("");
    await loadFeed();
  }

  async function toggleReaction(post: Post, type: string) {
    // if same -> remove, else upsert
    const current = post.my_reaction;

    if (current === type) {
      const { error } = await supabase
        .from("reactions")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", user.id);
      if (error) return alert(error.message);
    } else {
      const { error } = await supabase.from("reactions").upsert({
        post_id: post.id,
        user_id: user.id,
        type,
      });
      if (error) return alert(error.message);
    }

    await loadFeed();
  }

  async function openComments(post: Post) {
    setOpenPost(post);
    setComments([]);
    setCommentText("");
    await loadComments(post.id);
  }

  async function loadComments(postId: number) {
    const { data, error } = await supabase
      .from("comments")
      .select("id, post_id, user_id, content, created_at, profiles(username, avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setComments((data as any[]) as Comment[]);
  }

  async function addComment() {
    if (!openPost) return;
    if (commentBusy) return;
    const content = commentText.trim();
    if (!content) return;

    setCommentBusy(true);

    const { error } = await supabase.from("comments").insert({
      post_id: openPost.id,
      user_id: user.id,
      content,
    });

    setCommentBusy(false);

    if (error) return alert(error.message);

    setCommentText("");
    await loadComments(openPost.id);
    await loadFeed();
  }

  async function sendMagicLink() {
    if (authBusy) return;
    const e = email.trim();
    if (!e) return;

    setAuthBusy(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: { emailRedirectTo: SITE_URL },
    });

    setAuthBusy(false);

    if (error) alert(error.message);
    else alert("メールを確認してください");
  }

  async function logout() {
    await supabase.auth.signOut();
    setProfile(null);
    setUsername("");
  }

  // LOGIN
  if (!user) {
    return (
      <Shell>
        <Card>
          <Title>Nihongo Feed</Title>
          <Sub>メールでログイン</Sub>
          <Input
            placeholder="email"
            value={email}
            onChange={(v) => setEmail(v)}
            autoComplete="email"
          />
          <PrimaryButton disabled={authBusy || !email.trim()} onClick={sendMagicLink}>
            {authBusy ? "送信中…" : "リンクを送る"}
          </PrimaryButton>
          <Note>登録者だけ投稿できます。閲覧は公開にできます。</Note>
        </Card>
      </Shell>
    );
  }

  // USERNAME GATE
  if (!profile?.username) {
    return (
      <Shell>
        <Card>
          <Title>はじめに</Title>
          <Sub>ユーザー名を決めてください</Sub>
          <Input
            placeholder="username (a-z, 0-9, _)"
            value={username}
            onChange={(v) => setUsername(v)}
            autoComplete="off"
          />
          {usernameError ? <ErrorText>{usernameError}</ErrorText> : null}
          <PrimaryButton disabled={!!usernameError || profileBusy} onClick={saveProfile}>
            {profileBusy ? "保存中…" : "保存"}
          </PrimaryButton>
          <GhostButton onClick={logout}>ログアウト</GhostButton>
        </Card>
      </Shell>
    );
  }

  // FEED
  return (
    <Shell>
      <Phone>
        <TopBar
          left={<Brand>Nihongo</Brand>}
          right={
            <IconButton title="Log out" onClick={logout}>
              ⤺
            </IconButton>
          }
        />
        <Composer>
          <AvatarCircle
            src={profile.avatar_url || undefined}
            fallback={(profile.username?.[0] || "N").toUpperCase()}
          />
          <ComposerBox>
            <Textarea
              placeholder="日本語で書いてね…"
              value={text}
              onChange={(v) => setText(v)}
            />
            <Row>
              <Hint>{profile.username}</Hint>
              <PrimaryButton disabled={postBusy || !text.trim()} onClick={createPost}>
                {postBusy ? "投稿中…" : "投稿"}
              </PrimaryButton>
            </Row>
          </ComposerBox>
        </Composer>

        <Divider />

        {loadingFeed ? (
          <Centered>読み込み中…</Centered>
        ) : posts.length === 0 ? (
          <Centered>まだ投稿がありません</Centered>
        ) : (
          <Feed>
            {posts.map((p) => (
              <PostCard key={p.id}>
                <PostHeader>
                  <AvatarCircle
                    src={p.profiles?.avatar_url || undefined}
                    fallback={(p.profiles?.username?.[0] || "?").toUpperCase()}
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <PostUser>{p.profiles?.username || "user"}</PostUser>
                    <PostMeta>{formatTime(p.created_at)}</PostMeta>
                  </div>
                </PostHeader>

                <PostBody>{p.content}</PostBody>

                {p.image_url ? <PostImage src={p.image_url} /> : null}

                <PostFooter>
                  <ReactionsRow>
                    {REACTIONS.map((r) => (
                      <Chip
                        key={r.key}
                        active={p.my_reaction === r.key}
                        onClick={() => toggleReaction(p, r.key)}
                        title={r.label}
                      >
                        <span style={{ fontSize: 16 }}>{r.emoji}</span>
                        <span style={{ fontSize: 12 }}>{r.label}</span>
                      </Chip>
                    ))}
                  </ReactionsRow>

                  <Row style={{ justifyContent: "space-between" }}>
                    <Small>
                      {p.reactions_count ? `${p.reactions_count} リアクション` : " "}
                    </Small>
                    <LinkButton onClick={() => openComments(p)}>
                      💬 コメント {p.comments_count || 0}
                    </LinkButton>
                  </Row>
                </PostFooter>
              </PostCard>
            ))}
          </Feed>
        )}

        {openPost ? (
          <Sheet onClose={() => setOpenPost(null)}>
            <SheetHeader>
              <strong>コメント</strong>
              <IconButton onClick={() => setOpenPost(null)}>×</IconButton>
            </SheetHeader>

            <SheetBody>
              <div style={{ marginBottom: 10 }}>
                <Small>
                  {openPost.profiles?.username || "user"} · {formatTime(openPost.created_at)}
                </Small>
                <div style={{ marginTop: 6 }}>{openPost.content}</div>
              </div>

              <Divider />

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {comments.map((c) => (
                  <CommentRow key={c.id}>
                    <AvatarCircle
                      small
                      src={c.profiles?.avatar_url || undefined}
                      fallback={(c.profiles?.username?.[0] || "?").toUpperCase()}
                    />
                    <div style={{ flex: 1 }}>
                      <CommentUser>{c.profiles?.username || "user"}</CommentUser>
                      <CommentText>{c.content}</CommentText>
                    </div>
                  </CommentRow>
                ))}
              </div>
            </SheetBody>

            <SheetFooter>
              <Input
                placeholder="コメントを書く…"
                value={commentText}
                onChange={(v) => setCommentText(v)}
              />
              <PrimaryButton disabled={commentBusy || !commentText.trim()} onClick={addComment}>
                {commentBusy ? "…" : "送信"}
              </PrimaryButton>
            </SheetFooter>
          </Sheet>
        ) : null}
      </Phone>
    </Shell>
  );
}

/* ---------- UI components (minimal, Japanese) ---------- */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={ui.shell}>
      <div style={ui.bgGlow} />
      {children}
    </div>
  );
}

function Phone({ children }: { children: React.ReactNode }) {
  return <div style={ui.phone}>{children}</div>;
}

function TopBar({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div style={ui.topbar}>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}

function Brand({ children }: { children: React.ReactNode }) {
  return <div style={ui.brand}>{children}</div>;
}

function Composer({ children }: { children: React.ReactNode }) {
  return <div style={ui.composer}>{children}</div>;
}

function ComposerBox({ children }: { children: React.ReactNode }) {
  return <div style={{ flex: 1 }}>{children}</div>;
}

function Feed({ children }: { children: React.ReactNode }) {
  return <div style={ui.feed}>{children}</div>;
}

function PostCard({ children }: { children: React.ReactNode }) {
  return <div style={ui.postCard}>{children}</div>;
}

function PostHeader({ children }: { children: React.ReactNode }) {
  return <div style={ui.postHeader}>{children}</div>;
}

function PostUser({ children }: { children: React.ReactNode }) {
  return <div style={ui.postUser}>{children}</div>;
}

function PostMeta({ children }: { children: React.ReactNode }) {
  return <div style={ui.postMeta}>{children}</div>;
}

function PostBody({ children }: { children: React.ReactNode }) {
  return <div style={ui.postBody}>{children}</div>;
}

function PostFooter({ children }: { children: React.ReactNode }) {
  return <div style={ui.postFooter}>{children}</div>;
}

function ReactionsRow({ children }: { children: React.ReactNode }) {
  return <div style={ui.reactionsRow}>{children}</div>;
}

function Chip({
  children,
  active,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        ...ui.chip,
        ...(active ? ui.chipActive : null),
      }}
    >
      {children}
    </button>
  );
}

function CommentRow({ children }: { children: React.ReactNode }) {
  return <div style={ui.commentRow}>{children}</div>;
}

function CommentUser({ children }: { children: React.ReactNode }) {
  return <div style={ui.commentUser}>{children}</div>;
}

function CommentText({ children }: { children: React.ReactNode }) {
  return <div style={ui.commentText}>{children}</div>;
}

function PostImage({ src }: { src: string }) {
  return <img src={src} alt="" style={ui.postImage} />;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={ui.card}>{children}</div>;
}

function Title({ children }: { children: React.ReactNode }) {
  return <h2 style={ui.title}>{children}</h2>;
}

function Sub({ children }: { children: React.ReactNode }) {
  return <div style={ui.sub}>{children}</div>;
}

function Note({ children }: { children: React.ReactNode }) {
  return <div style={ui.note}>{children}</div>;
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <div style={ui.error}>{children}</div>;
}

function Input({
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      style={ui.input}
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={ui.textarea}
    />
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...ui.btn, ...(disabled ? ui.btnDisabled : null) }}>
      {children}
    </button>
  );
}

function GhostButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={ui.ghostBtn}>
      {children}
    </button>
  );
}

function LinkButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={ui.linkBtn}>
      {children}
    </button>
  );
}

function IconButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button onClick={onClick} title={title} style={ui.iconBtn}>
      {children}
    </button>
  );
}

function Row({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ ...ui.row, ...(style || {}) }}>{children}</div>;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <div style={ui.hint}>{children}</div>;
}

function Small({ children }: { children: React.ReactNode }) {
  return <div style={ui.small}>{children}</div>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div style={ui.centered}>{children}</div>;
}

function Divider() {
  return <div style={ui.divider} />;
}

function AvatarCircle({
  src,
  fallback,
  small,
}: {
  src?: string;
  fallback: string;
  small?: boolean;
}) {
  const size = small ? 28 : 36;
  return (
    <div style={{ ...ui.avatar, width: size, height: size }}>
      {src ? (
        <img src={src} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
      ) : (
        <span style={{ fontSize: small ? 12 : 13, fontWeight: 800 }}>{fallback}</span>
      )}
    </div>
  );
}

/* ---------- Sheet (comments) ---------- */
function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={ui.sheetOverlay} onMouseDown={onClose}>
      <div style={ui.sheet} onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function SheetHeader({ children }: { children: React.ReactNode }) {
  return <div style={ui.sheetHeader}>{children}</div>;
}

function SheetBody({ children }: { children: React.ReactNode }) {
  return <div style={ui.sheetBody}>{children}</div>;
}

function SheetFooter({ children }: { children: React.ReactNode }) {
  return <div style={ui.sheetFooter}>{children}</div>;
}

/* ---------- helpers ---------- */
function formatTime(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} ${hh}:${mm}`;
}

/* ---------- styles ---------- */
const ui: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: "100vh",
    background: "#F6F5F2",
    display: "flex",
    justifyContent: "center",
    padding: "28px 12px",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic', 'Meiryo', sans-serif",
    color: "#141414",
    position: "relative",
  },
  bgGlow: {
    position: "fixed",
    inset: 0,
    background:
      "radial-gradient(600px 300px at 20% 10%, rgba(20,20,20,0.06), transparent 60%), radial-gradient(600px 300px at 80% 30%, rgba(20,20,20,0.05), transparent 60%)",
    pointerEvents: "none",
  },
  phone: {
    width: 400,
    maxWidth: "100%",
    background: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    border: "1px solid rgba(20,20,20,0.10)",
    boxShadow: "0 16px 44px rgba(20,20,20,0.10)",
  },
  topbar: {
    padding: "14px 14px",
    borderBottom: "1px solid rgba(20,20,20,0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "rgba(255,255,255,0.9)",
    backdropFilter: "blur(8px)",
  },
  brand: { fontWeight: 800, letterSpacing: 0.3 },
  composer: {
    display: "flex",
    gap: 10,
    padding: 14,
    alignItems: "flex-start",
  },
  feed: { padding: 14, display: "flex", flexDirection: "column", gap: 12 },
  postCard: {
    border: "1px solid rgba(20,20,20,0.08)",
    borderRadius: 16,
    overflow: "hidden",
    background: "#fff",
  },
  postHeader: {
    padding: "12px 12px",
    display: "flex",
    gap: 10,
    alignItems: "center",
    borderBottom: "1px solid rgba(20,20,20,0.06)",
  },
  postUser: { fontWeight: 800, fontSize: 13 },
  postMeta: { fontSize: 12, opacity: 0.65 },
  postBody: { padding: 12, fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap" },
  postFooter: { padding: 12, borderTop: "1px solid rgba(20,20,20,0.06)" },
  reactionsRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 },
  chip: {
    border: "1px solid rgba(20,20,20,0.10)",
    borderRadius: 999,
    padding: "6px 10px",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
  },
  chipActive: {
    background: "rgba(20,20,20,0.06)",
    border: "1px solid rgba(20,20,20,0.18)",
  },
  postImage: { width: "100%", display: "block", objectFit: "cover", maxHeight: 520 },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  hint: { fontSize: 12, opacity: 0.6 },
  small: { fontSize: 12, opacity: 0.7 },
  divider: { height: 1, background: "rgba(20,20,20,0.08)" },
  centered: { padding: 24, textAlign: "center", opacity: 0.7 },
  avatar: {
    borderRadius: "50%",
    background: "rgba(20,20,20,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flex: "0 0 auto",
  },
  textarea: {
    width: "100%",
    height: 76,
    resize: "none",
    borderRadius: 14,
    border: "1px solid rgba(20,20,20,0.12)",
    padding: 10,
    fontSize: 14,
    outline: "none",
    background: "#fff",
  },
  btn: {
    borderRadius: 12,
    padding: "10px 12px",
    border: "1px solid rgba(20,20,20,0.14)",
    background: "#141414",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  btnDisabled: { opacity: 0.55, cursor: "not-allowed" as any },
  ghostBtn: {
    borderRadius: 12,
    padding: "10px 12px",
    border: "1px solid rgba(20,20,20,0.12)",
    background: "transparent",
    cursor: "pointer",
    fontWeight: 700,
  },
  linkBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12,
    opacity: 0.85,
  },
  iconBtn: {
    border: "1px solid rgba(20,20,20,0.12)",
    background: "#fff",
    borderRadius: 12,
    padding: "6px 10px",
    cursor: "pointer",
    fontWeight: 800,
  },
  card: {
    width: 360,
    maxWidth: "100%",
    background: "#fff",
    border: "1px solid rgba(20,20,20,0.10)",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 16px 44px rgba(20,20,20,0.10)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  title: { margin: 0, fontSize: 18, fontWeight: 900, letterSpacing: 0.2 },
  sub: { fontSize: 13, opacity: 0.7 },
  note: { fontSize: 12, opacity: 0.65, lineHeight: 1.4 },
  error: { fontSize: 12, color: "#B00020", fontWeight: 700 },
  input: {
    width: "100%",
    padding: 10,
    borderRadius: 12,
    border: "1px solid rgba(20,20,20,0.12)",
    outline: "none",
    fontSize: 14,
  },
  sheetOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.28)",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-end",
    padding: 12,
  },
  sheet: {
    width: 420,
    maxWidth: "100%",
    background: "#fff",
    borderRadius: 18,
    border: "1px solid rgba(20,20,20,0.10)",
    overflow: "hidden",
    boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
  },
  sheetHeader: {
    padding: 12,
    borderBottom: "1px solid rgba(20,20,20,0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sheetBody: { padding: 12, maxHeight: "55vh", overflowY: "auto" as any },
  sheetFooter: {
    padding: 12,
    borderTop: "1px solid rgba(20,20,20,0.08)",
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  commentRow: { display: "flex", gap: 10, alignItems: "flex-start" },
  commentUser: { fontSize: 12, fontWeight: 900, marginBottom: 2 },
  commentText: { fontSize: 13, lineHeight: 1.45, opacity: 0.9, whiteSpace: "pre-wrap" },
};