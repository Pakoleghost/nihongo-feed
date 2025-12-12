"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type DbPostRow = {
  id: string;
  content: string | null;
  created_at: string;
  user_id: string;
  image_url?: string | null;
  profiles: { username: string | null } | { username: string | null }[] | null;
};

type Post = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username: string;
  image_url: string | null;
  likes: number;
  likedByMe: boolean;
};

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      if (!mounted) return;
      setUserId(uid);
      void loadAll(uid);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      void loadAll(uid);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll(uid: string | null = userId) {
    setLoading(true);

    // ⚠️ Asegúrate de que exista posts.image_url en tu tabla.
    const { data, error } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id, image_url, profiles(username)")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const normalized: Post[] =
      (data as unknown as DbPostRow[] | null)?.map((row) => {
        const p: any = row.profiles as any;
        const username =
          (Array.isArray(p) ? p?.[0]?.username : p?.username) ?? "unknown";

        return {
          id: row.id,
          content: (row.content ?? "").toString(),
          created_at: row.created_at,
          user_id: row.user_id,
          username,
          image_url: (row as any).image_url ?? null,
          likes: 0,
          likedByMe: false,
        };
      }) ?? [];

    // likes (count + mine)
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

    setPosts(normalized);
    setLoading(false);
  }

  async function createPost() {
    if (!userId) {
      alert("Log in first.");
      return;
    }
    if (busy) return;
    if (!text.trim() && !imageFile) return;

    setBusy(true);

    // 1) crear post (content puede ir vacío si es solo imagen)
    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({
        content: text.trim(),
        user_id: userId,
      })
      .select("id")
      .single();

    if (postError || !post) {
      setBusy(false);
      alert(postError?.message ?? "Post error");
      return;
    }

    // 2) subir imagen (si hay)
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

      const { error: updateError } = await supabase
        .from("posts")
        .update({ image_url: pub.publicUrl })
        .eq("id", post.id);

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
    if (!userId) {
      alert("Log in first.");
      return;
    }

    const p = posts.find((x) => x.id === postId);
    if (!p) return;

    // optimistic UI
    setPosts((prev) =>
      prev.map((x) =>
        x.id === postId
          ? {
              ...x,
              likedByMe: !x.likedByMe,
              likes: x.likedByMe ? x.likes - 1 : x.likes + 1,
            }
          : x
      )
    );

    if (p.likedByMe) {
      const { error } = await supabase
        .from("reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);

      if (error) {
        alert(error.message);
        void loadAll(userId);
      }
    } else {
      const { error } = await supabase.from("reactions").insert({
        post_id: postId,
        user_id: userId,
      });

      if (error) {
        alert(error.message);
        void loadAll(userId);
      }
    }
  }

  return (
    <div className="feed">
      <div className="header">Nihongo Feed</div>

      <div className="composer">
        <div className="composer-row">
          <textarea
            className="textarea"
            placeholder="日本語で書いてね…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <button
            className="postBtn"
            onClick={createPost}
            disabled={busy || (!text.trim() && !imageFile)}
          >
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
            {userId ? "ログイン中" : "未ログイン"}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 16 }} className="muted">
          Loading…
        </div>
      ) : (
        posts.map((p) => {
          const initial = (p.username?.[0] || "?").toUpperCase();

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

              {p.content ? <div className="post-content">{p.content}</div> : null}

              {p.image_url ? (
                <div style={{ padding: "0 12px 12px" }}>
                  <img
                    src={p.image_url}
                    alt="post"
                    style={{
                      width: "100%",
                      display: "block",
                      borderRadius: 12,
                      border: "1px solid var(--line)",
                    }}
                  />
                </div>
              ) : null}

              <div className="actions" style={{ padding: "0 12px 12px" }}>
                <button className="likeBtn" onClick={() => toggleLike(p.id)}>
                  {p.likedByMe ? "💙" : "🤍"} いいね{" "}
                  <span className="muted">{p.likes}</span>
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}