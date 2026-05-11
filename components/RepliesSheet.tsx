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
      width: size, height: size, borderRadius: "50%", background: "#E5E7EB",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 700, color: "#53596B", flexShrink: 0,
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

  const preview = postContent.length > 80 ? postContent.slice(0, 77) + "…" : postContent;

  return (
    <AnimatePresence>
      <motion.div
        key="sheet-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 400 }}
      />
      <motion.div
        key="sheet-panel"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320, mass: 0.9 }}
        onClick={e => e.stopPropagation()}
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 401,
          background: "#FFF8E7",
          borderRadius: "20px 20px 0 0",
          maxHeight: "88dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(26,26,46,0.15)" }} />
        </div>

        {/* Header — post preview */}
        <div style={{ padding: "8px 18px 12px", borderBottom: "1px solid rgba(26,26,46,0.08)" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", margin: "0 0 4px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {postAuthorName ?? "Publicación"}
          </p>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#53596B", margin: 0, lineHeight: 1.4 }}>
            {preview}
          </p>
        </div>

        {/* Comments list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          {loading ? (
            <p style={{ color: "#9CA3AF", fontSize: 14, textAlign: "center", margin: "24px 0" }}>Cargando…</p>
          ) : comments.length === 0 ? (
            <p style={{ color: "#C4BAB0", fontSize: 14, textAlign: "center", margin: "32px 0", fontWeight: 600 }}>
              Sin respuestas aún. ¡Sé el primero!
            </p>
          ) : comments.map(c => {
            const p = profiles[c.user_id];
            return (
              <div key={c.id} style={{ display: "flex", gap: 10 }}>
                <Avatar url={p?.avatar_url ?? null} name={p?.username ?? null} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1A2E" }}>{p?.username ?? "Anónimo"}</span>
                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>{timeAgo(c.created_at)}</span>
                  </div>
                  <p style={{ fontSize: 14, color: "#1A1A2E", margin: 0, lineHeight: 1.45, background: "#FFFFFF", borderRadius: "0 12px 12px 12px", padding: "8px 12px", boxShadow: "0 1px 4px rgba(26,26,46,0.07)" }}>
                    {c.content}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Compose */}
        <div style={{
          padding: "10px 14px",
          paddingBottom: "max(14px, env(safe-area-inset-bottom, 14px))",
          borderTop: "1px solid rgba(26,26,46,0.08)",
          display: "flex",
          alignItems: "flex-end",
          gap: 10,
          background: "#FFFFFF",
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
              border: "none",
              borderRadius: 12,
              background: "#F3F0EB",
              padding: "10px 13px",
              fontSize: 14,
              fontFamily: "inherit",
              resize: "none",
              outline: "none",
              color: "#1A1A2E",
              lineHeight: 1.4,
              maxHeight: 120,
              overflow: "auto",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || !userId || sending}
            style={{
              width: 38, height: 38, borderRadius: "50%",
              background: text.trim() && userId ? "#E63946" : "#E5E7EB",
              border: "none",
              cursor: text.trim() && userId ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.15s",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke={text.trim() && userId ? "#FFFFFF" : "#9CA3AF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
