"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

type Profile = { id: string; username: string | null; avatar_url: string | null };
type Comment = { id: string; post_id: string; user_id: string; content: string; created_at: string };

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

function Avatar({ url, name, size = 32 }: { url: string | null; name: string | null; size?: number }) {
  if (url) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name ?? "avatar"} width={size} height={size}
      style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0, display: "block" }} />
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg, #4ECDC4 0%, #4ECDC4AA 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 800, color: "#1A1A2E", flexShrink: 0,
    }}>
      {(name ?? "?").charAt(0).toUpperCase()}
    </div>
  );
}

type RepliesSheetProps = {
  postId: string;
  postContent: string;
  postAuthorName: string | null;
  userId: string | null;
  onClose: () => void;
  onCountChange: (postId: string, delta: number) => void;
};

export default function RepliesSheet({ postId, postContent, postAuthorName, userId, onClose, onCountChange }: RepliesSheetProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("comunidad_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      const list = (data as Comment[] | null) ?? [];
      setComments(list);

      const ids = [...new Set(list.map(c => c.user_id))];
      if (ids.length > 0) {
        const { data: pData } = await supabase.from("profiles").select("id, username, avatar_url").in("id", ids);
        const map: Record<string, Profile> = {};
        (pData as Profile[] | null)?.forEach(p => { map[p.id] = p; });
        setProfiles(map);
      }
      setLoading(false);
    }
    load();
  }, [postId]);

  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [loading, comments.length]);

  async function handleSend() {
    if (!text.trim() || !userId || sending) return;
    setSending(true);
    const { data } = await supabase
      .from("comunidad_comments")
      .insert({ post_id: postId, user_id: userId, content: text.trim() })
      .select().single();
    if (data) {
      const c = data as Comment;
      setComments(prev => [...prev, c]);
      onCountChange(postId, 1);
      setText("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
    setSending(false);
  }

  const preview = postContent.length > 90 ? postContent.slice(0, 87) + "…" : postContent;
  const canSend = Boolean(text.trim()) && Boolean(userId) && !sending;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="replies-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 400 }}
      />

      {/* Panel */}
      <motion.div
        key="replies-panel"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320, mass: 0.9 }}
        onClick={e => e.stopPropagation()}
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 401,
          background: "#12121F",
          borderRadius: "20px 20px 0 0",
          maxHeight: "88dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 6px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.14)" }} />
        </div>

        {/* Header — post preview */}
        <div style={{ padding: "8px 18px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#4ECDC4", margin: "0 0 5px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {postAuthorName ?? "Publicación"}
          </p>
          <p style={{
            fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.55)",
            margin: 0, lineHeight: 1.45,
            fontFamily: "var(--font-noto-sans-jp), sans-serif",
          }}>
            {preview}
          </p>
        </div>

        {/* Comments list */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "14px 18px",
          display: "flex", flexDirection: "column", gap: 14,
        }}>
          {loading ? (
            /* Skeleton */
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 4 }}>
              {[0, 1].map(i => (
                <div key={i} style={{ display: "flex", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.07)", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ width: "30%", height: 10, borderRadius: 5, background: "rgba(255,255,255,0.07)", marginBottom: 8 }} />
                    <div style={{ width: "80%", height: 12, borderRadius: 5, background: "rgba(255,255,255,0.05)" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 0 20px" }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.22)", margin: "0 0 4px" }}>
                Sin respuestas aún
              </p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.18)", margin: 0 }}>
                Sé el primero en responder
              </p>
            </div>
          ) : comments.map(c => {
            const p = profiles[c.user_id];
            const isOwn = c.user_id === userId;
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
              >
                <Avatar url={p?.avatar_url ?? null} name={p?.username ?? null} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: isOwn ? "#4ECDC4" : "#FFFFFF" }}>
                      {p?.username ?? "Anónimo"}
                    </span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)" }}>{timeAgo(c.created_at)}</span>
                  </div>
                  <p style={{
                    fontSize: 14, color: "rgba(255,255,255,0.82)", margin: 0, lineHeight: 1.5,
                    background: isOwn ? "rgba(78,205,196,0.08)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${isOwn ? "rgba(78,205,196,0.18)" : "rgba(255,255,255,0.06)"}`,
                    borderRadius: isOwn ? "12px 12px 0 12px" : "0 12px 12px 12px",
                    padding: "9px 13px",
                    fontFamily: "var(--font-noto-sans-jp), sans-serif",
                  }}>
                    {c.content}
                  </p>
                </div>
              </motion.div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Compose bar */}
        <div style={{
          padding: "10px 14px",
          paddingBottom: "max(14px, env(safe-area-inset-bottom, 14px))",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "flex-end",
          gap: 10,
          background: "#1A1A2E",
        }}>
          <textarea
            ref={inputRef}
            value={text}
            onChange={e => {
              setText(e.target.value);
              const el = e.target;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
            placeholder={userId ? "Escribe una respuesta…" : "Inicia sesión para responder"}
            disabled={!userId}
            rows={1}
            style={{
              flex: 1,
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 12,
              background: "#16161F",
              padding: "10px 13px",
              fontSize: 14,
              fontFamily: "var(--font-noto-sans-jp), inherit",
              resize: "none",
              outline: "none",
              color: "#FFFFFF",
              lineHeight: 1.4,
              maxHeight: 120,
              overflow: "auto",
              transition: "border-color 140ms ease",
            }}
          />
          <motion.button
            onClick={handleSend}
            disabled={!canSend}
            whileTap={canSend ? { scale: 0.9 } : {}}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
            style={{
              width: 40, height: 40, borderRadius: "50%",
              background: canSend ? "#E63946" : "rgba(255,255,255,0.07)",
              border: "none",
              cursor: canSend ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.15s",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                stroke={canSend ? "#FFFFFF" : "rgba(255,255,255,0.25)"}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
