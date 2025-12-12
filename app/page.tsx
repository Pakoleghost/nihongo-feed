"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type PostRow = {
  id: string;
  content: string | null;
  image_path: string | null;
  created_at: string;
  user_id: string;
  profiles?: { username: string | null } | null;
};

export default function Home() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const [user, setUser] = useState<any>(null);

  // Auth UI
  const [email, setEmail] = useState("");
  const [sendingLink, setSendingLink] = useState(false);

  // Username gate
  const [username, setUsername] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  // Composer
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);

  const supabasePublicBase = "https://ufysagkmcdbtsdhsatzn.supabase.co";

  const imageUrlFor = (path: string) =>
    `${supabasePublicBase}/storage/v1/object/public/post-images/${path}`;

  // Session
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Load posts always (public read ok)
  useEffect(() => {
    loadPosts();
  }, []);

  // When user changes, check profile
  useEffect(() => {
    if (!user) {
      setHasProfile(null);
      setUsername("");
      return;
    }
    checkProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function loadPosts() {
    setLoadingPosts(true);
    const { data, error } = await supabase
      .from("posts")
      .select("id, content, image_path, created_at, user_id, profiles(username)")
      .order("created_at", { ascending: false });

    setLoadingPosts(false);

    if (error) {
      console.log(error);
      alert(error.message);
      return;
    }

    setPosts((data as any) ?? []);
  }

  async function checkProfile() {
    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.log(error);
      // If RLS blocks, you'll see it here
      alert(error.message);
      return;
    }

    if (data?.username) {
      setHasProfile(true);
      setUsername(data.username);
    } else {
      setHasProfile(false);
    }
  }

  async function saveProfileUsername() {
    const u = username.trim();
    if (!u) return alert("Escribe un username.");
    if (!/^[a-zA-Z0-9._-]{3,20}$/.test(u))
      return alert("Username: 3–20 caracteres. Letras/números . _ -");

    setSavingUsername(true);

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, username: u });

    setSavingUsername(false);

    if (error) {
      alert(error.message);
      return;
    }

    setHasProfile(true);
    await loadPosts();
  }

  async function sendMagicLink() {
    const e = email.trim();
    if (!e) return;

    setSendingLink(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: {
        // production URL works too. localhost is fine for dev.
        emailRedirectTo:
          typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
      },
    });

    setSendingLink(false);

    if (error) alert(error.message);
    else alert("Revisa tu correo. Abre el enlace para iniciar sesión.");
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  async function createPost() {
    if (!user) return alert("Inicia sesión.");
    if (hasProfile === false) return alert("Primero crea tu username.");
    if (!text.trim() && !image) return;

    setPosting(true);

    let imagePath: string | null = null;

    if (image) {
      const ext = image.name.split(".").pop() || "jpg";
      const fileName = `${user.id}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("post-images")
        .upload(fileName, image, { upsert: false });

      if (upErr) {
        setPosting(false);
        alert(upErr.message);
        return;
      }

      imagePath = fileName;
    }

    const { error } = await supabase.from("posts").insert({
      content: text.trim() ? text : null,
      image_path: imagePath,
      user_id: user.id,
    });

    setPosting(false);

    if (error) {
      alert(error.message);
      return;
    }

    setText("");
    setImage(null);

    await loadPosts();
  }

  const canPost = useMemo(() => !!user && hasProfile === true, [user, hasProfile]);

  return (
    <main style={styles.page}>
      <div style={styles.phone}>
        <header style={styles.header}>Nihongo Feed</header>

        {/* AUTH STRIP */}
        <div style={styles.topPanel}>
          {!user ? (
            <>
              <div style={{ fontSize: 13, opacity: 0.9 }}>
                Login con correo para publicar.
              </div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu correo"
                style={styles.input}
              />
              <button onClick={sendMagicLink} style={styles.primaryBtn} disabled={sendingLink}>
                {sendingLink ? "Enviando..." : "Enviar enlace"}
              </button>
            </>
          ) : (
            <div style={styles.loggedRow}>
              <div style={{ fontSize: 13 }}>
                Sesión activa
                {username ? ` · @${username}` : ""}
              </div>
              <button onClick={logout} style={styles.ghostBtn}>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>

        {/* USERNAME GATE */}
        {user && hasProfile === false && (
          <div style={styles.gate}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Crea tu username</div>
            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 10 }}>
              Esto se mostrará en tus publicaciones.
            </div>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ej: pako_jp"
              style={styles.input}
            />
            <button
              onClick={saveProfileUsername}
              style={styles.primaryBtn}
              disabled={savingUsername}
            >
              {savingUsername ? "Guardando..." : "Guardar username"}
            </button>
          </div>
        )}

        {/* COMPOSER */}
        <div style={styles.composer}>
          <textarea
            placeholder={canPost ? "Escribe algo en japonés…" : "Inicia sesión y crea tu username para publicar…"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={styles.textarea}
            disabled={!canPost}
          />

          <div style={styles.composerRow}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              style={{ fontSize: 12 }}
              disabled={!canPost}
            />

            <button onClick={createPost} style={styles.primaryBtn} disabled={!canPost || posting}>
              {posting ? "Publicando..." : "Publicar"}
            </button>
          </div>

          {image && (
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
              Imagen seleccionada: {image.name}
            </div>
          )}
        </div>

        {/* FEED */}
        <div style={styles.feed}>
          {loadingPosts && <div style={{ fontSize: 13, opacity: 0.8 }}>Cargando…</div>}

          {!loadingPosts && posts.length === 0 && (
            <div style={{ fontSize: 13, opacity: 0.8 }}>
              No hay posts todavía.
            </div>
          )}

          {posts.map((post) => (
            <PostCard
              key={post.id}
              username={post.profiles?.username ?? "usuario"}
              text={post.content ?? ""}
              imageUrl={post.image_path ? imageUrlFor(post.image_path) : null}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

function PostCard({
  username,
  text,
  imageUrl,
}: {
  username: string;
  text: string;
  imageUrl: string | null;
}) {
  const initial = (username?.[0] || "ユ").toUpperCase();

  return (
    <div style={styles.post}>
      <div style={styles.postHeader}>
        <div style={styles.avatar}>{initial}</div>
        <span style={styles.username}>@{username}</span>
      </div>

      {imageUrl && (
        <img
          src={imageUrl}
          alt="post"
          style={{ width: "100%", display: "block", borderBottom: "1px solid #eee" }}
        />
      )}

      {text ? <div style={styles.postBody}>{text}</div> : null}

      <div style={styles.actions}>❤️&nbsp;&nbsp;💬&nbsp;&nbsp;🔖</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f2f2f2",
    display: "flex",
    justifyContent: "center",
    paddingTop: 24,
    paddingBottom: 24,
  },
  phone: {
    width: 390,
    backgroundColor: "#fff",
    borderRadius: 18,
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
    overflow: "hidden",
    border: "1px solid #e9e9e9",
  },
  header: {
    padding: "14px 16px",
    fontSize: 16,
    fontWeight: 700,
    textAlign: "center",
    borderBottom: "1px solid #e5e5e5",
    letterSpacing: 0.2,
  },
  topPanel: {
    padding: 12,
    borderBottom: "1px solid #eee",
    display: "grid",
    gap: 8,
  },
  loggedRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gate: {
    padding: 12,
    borderBottom: "1px solid #eee",
    backgroundColor: "#fafafa",
  },
  composer: {
    padding: 12,
    borderBottom: "1px solid #eee",
  },
  composerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 10,
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e5e5",
    outline: "none",
    fontSize: 14,
  },
  textarea: {
    width: "100%",
    height: 86,
    padding: 12,
    borderRadius: 14,
    border: "1px solid #e5e5e5",
    outline: "none",
    fontSize: 14,
    resize: "none",
  },
  primaryBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #111",
    backgroundColor: "#111",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 13,
    whiteSpace: "nowrap",
  },
  ghostBtn: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid #e5e5e5",
    backgroundColor: "#fff",
    color: "#111",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 13,
  },
  feed: {
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  post: {
    border: "1px solid #e5e5e5",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  postHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderBottom: "1px solid #eee",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    backgroundColor: "#ddd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 14,
  },
  username: {
    fontSize: 14,
    fontWeight: 700,
  },
  postBody: {
    padding: 12,
    fontSize: 14,
    lineHeight: 1.5,
  },
  actions: {
    padding: "10px 12px",
    borderTop: "1px solid #eee",
    fontSize: 18,
  },
};