"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import ModerationConfirmDialog from "@/components/comunidad/ModerationConfirmDialog";

type Profile = {
  id: string;
  username: string | null;
  avatar_url?: string | null;
  group_name: string | null;
  is_admin: boolean | null;
};

type ForumThread = {
  id: string;
  forum_id: string;
  group_name: string;
  author_id: string;
  title: string;
  body: string;
  tag: string | null;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  last_reply_at: string | null;
};

type ForumReply = {
  id: string;
  thread_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

type ReplyView = ForumReply & {
  authorName: string;
};

type PendingModerationAction =
  | { type: "pin-thread" }
  | { type: "unpin-thread" }
  | { type: "lock-thread" }
  | { type: "unlock-thread" }
  | { type: "delete-thread" }
  | { type: "delete-reply"; reply: ReplyView };

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${days}d`;
}

function displayName(profile: Pick<Profile, "username" | "is_admin"> | null | undefined) {
  return profile?.username ?? (profile?.is_admin ? "Sensei" : "Usuario");
}

const moderationButtonStyle = {
  border: "none",
  borderRadius: 999,
  background: "#F8F4EE",
  color: "#53596B",
  padding: "8px 11px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};

function getModerationDialogCopy(action: PendingModerationAction) {
  switch (action.type) {
    case "pin-thread":
      return {
        title: "Fijar tema",
        description: "Este tema aparecerá arriba en el foro del grupo.",
        confirmLabel: "Fijar",
        tone: "neutral" as const,
      };
    case "unpin-thread":
      return {
        title: "Desfijar tema",
        description: "El tema volverá al orden normal por actividad reciente.",
        confirmLabel: "Desfijar",
        tone: "neutral" as const,
      };
    case "lock-thread":
      return {
        title: "Cerrar tema",
        description: "El grupo podrá leerlo, pero ya no podrá agregar respuestas.",
        confirmLabel: "Cerrar tema",
        tone: "neutral" as const,
      };
    case "unlock-thread":
      return {
        title: "Abrir tema",
        description: "El grupo podrá volver a responder en este tema.",
        confirmLabel: "Abrir tema",
        tone: "neutral" as const,
      };
    case "delete-thread":
      return {
        title: "Eliminar tema",
        description: "El tema se ocultará del foro. Esta acción es de moderación y no se mostrará al grupo.",
        confirmLabel: "Eliminar",
        tone: "danger" as const,
      };
    case "delete-reply":
      return {
        title: "Eliminar respuesta",
        description: `La respuesta de ${action.reply.authorName} se ocultará del tema.`,
        confirmLabel: "Eliminar",
        tone: "danger" as const,
      };
  }
}

export default function ForumThreadPage() {
  const router = useRouter();
  const params = useParams<{ threadId: string }>();
  const threadId = params.threadId;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [thread, setThread] = useState<ForumThread | null>(null);
  const [threadAuthor, setThreadAuthor] = useState("Usuario");
  const [replies, setReplies] = useState<ReplyView[]>([]);
  const [replyBody, setReplyBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [postingReply, setPostingReply] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [moderationNotice, setModerationNotice] = useState<string | null>(null);
  const [pendingModerationAction, setPendingModerationAction] = useState<PendingModerationAction | null>(null);

  useEffect(() => {
    async function loadThread() {
      setLoading(true);
      setErrorMessage(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, group_name, is_admin")
        .eq("id", session.user.id)
        .single();

      if (profileError || !profileData) {
        setErrorMessage("No pudimos cargar tu perfil.");
        setLoading(false);
        return;
      }

      const currentProfile = profileData as Profile;
      setProfile(currentProfile);

      const { data: threadData, error: threadError } = await supabase
        .from("forum_threads")
        .select("id, forum_id, group_name, author_id, title, body, tag, is_pinned, is_locked, created_at, updated_at, last_reply_at")
        .eq("id", threadId)
        .is("deleted_at", null)
        .single();

      if (threadError || !threadData) {
        setErrorMessage("No encontramos este tema o no tienes acceso.");
        setLoading(false);
        return;
      }

      const loadedThread = threadData as ForumThread;
      setThread(loadedThread);

      const { data: authorData } = await supabase
        .from("profiles")
        .select("id, username, is_admin")
        .eq("id", loadedThread.author_id)
        .maybeSingle();
      setThreadAuthor(displayName(authorData as Pick<Profile, "username" | "is_admin"> | null));

      const { data: replyData, error: replyLoadError } = await supabase
        .from("forum_replies")
        .select("id, thread_id, author_id, body, created_at, updated_at")
        .eq("thread_id", loadedThread.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (replyLoadError) {
        setErrorMessage("No pudimos cargar las respuestas.");
        setLoading(false);
        return;
      }

      const rawReplies = (replyData as ForumReply[] | null) ?? [];
      const authorIds = [...new Set(rawReplies.map((reply) => reply.author_id))];
      const authorNames = new Map<string, string>();

      if (authorIds.length > 0) {
        const { data: replyAuthors } = await supabase
          .from("profiles")
          .select("id, username, is_admin")
          .in("id", authorIds);

        ((replyAuthors as Array<{ id: string; username: string | null; is_admin: boolean | null }> | null) ?? []).forEach(
          (author) => {
            authorNames.set(author.id, displayName(author));
          },
        );
      }

      setReplies(
        rawReplies.map((reply) => ({
          ...reply,
          authorName: authorNames.get(reply.author_id) ?? "Usuario",
        })),
      );
      setLoading(false);
    }

    loadThread();
  }, [threadId]);

  async function handleReplySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!thread || !profile || postingReply || thread.is_locked || !replyBody.trim()) return;

    setPostingReply(true);
    setReplyError(null);

    const { data, error } = await supabase
      .from("forum_replies")
      .insert({
        thread_id: thread.id,
        author_id: profile.id,
        body: replyBody.trim(),
      })
      .select("id, thread_id, author_id, body, created_at, updated_at")
      .single();

    setPostingReply(false);

    if (error || !data) {
      setReplyError("No pudimos publicar tu respuesta. Intenta otra vez.");
      return;
    }

    const insertedReply = data as ForumReply;
    setReplies((current) => [
      ...current,
      {
        ...insertedReply,
        authorName: displayName(profile),
      },
    ]);
    setReplyBody("");
  }

  async function updateThreadModeration(changes: Partial<Pick<ForumThread, "is_pinned" | "is_locked">>) {
    if (!thread || !profile?.is_admin || moderating) return;

    setModerating(true);
    setModerationError(null);
    setModerationNotice(null);

    const { error } = await supabase.from("forum_threads").update(changes).eq("id", thread.id);

    setModerating(false);

    if (error) {
      setModerationError("No pudimos actualizar este tema.");
      return;
    }

    setThread((current) => (current ? { ...current, ...changes, updated_at: new Date().toISOString() } : current));
    setModerationNotice("Tema actualizado.");
  }

  async function deleteThread() {
    if (!thread || !profile?.is_admin || moderating) return;

    setModerating(true);
    setModerationError(null);
    setModerationNotice(null);

    const { error } = await supabase
      .from("forum_threads")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", thread.id);

    setModerating(false);

    if (error) {
      setModerationError("No pudimos eliminar este tema.");
      return;
    }

    router.push("/comunidad/foros");
  }

  async function deleteReply(replyId: string) {
    if (!profile?.is_admin || moderating) return;

    setModerating(true);
    setModerationError(null);
    setModerationNotice(null);

    const { error } = await supabase
      .from("forum_replies")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", replyId);

    setModerating(false);

    if (error) {
      setModerationError("No pudimos eliminar la respuesta.");
      return;
    }

    setReplies((current) => current.filter((reply) => reply.id !== replyId));
    setModerationNotice("Respuesta eliminada.");
  }

  async function confirmPendingModerationAction() {
    if (!pendingModerationAction) return;

    const action = pendingModerationAction;
    if (action.type === "pin-thread") {
      await updateThreadModeration({ is_pinned: true });
    } else if (action.type === "unpin-thread") {
      await updateThreadModeration({ is_pinned: false });
    } else if (action.type === "lock-thread") {
      await updateThreadModeration({ is_locked: true });
    } else if (action.type === "unlock-thread") {
      await updateThreadModeration({ is_locked: false });
    } else if (action.type === "delete-thread") {
      await deleteThread();
    } else {
      await deleteReply(action.reply.id);
    }

    setPendingModerationAction(null);
  }

  const moderationDialogCopy = pendingModerationAction ? getModerationDialogCopy(pendingModerationAction) : null;

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "20px 20px 100px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <button
          type="button"
          onClick={() => router.push("/comunidad/foros")}
          aria-label="Volver a Foros"
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            border: "none",
            background: "#FFFFFF",
            boxShadow: "0 2px 10px rgba(26,26,46,0.10)",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5M12 5l-7 7 7 7"
              stroke="#1A1A2E"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div>
          <h1 style={{ fontSize: "30px", fontWeight: 800, color: "#1A1A2E", margin: 0, lineHeight: 1 }}>
            Tema del foro
          </h1>
          <p style={{ fontSize: 14, color: "#6E737F", margin: "6px 0 0", lineHeight: 1.35 }}>
            Lee y responde con tu grupo.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#9CA3AF", padding: "48px 0" }}>Cargando tema...</div>
      ) : !profile ? (
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 26,
            padding: 24,
            boxShadow: "0 6px 22px rgba(26,26,46,0.08)",
            display: "grid",
            gap: 12,
          }}
        >
          <p style={{ margin: 0, color: "#53596B" }}>Inicia sesión para ver este foro.</p>
          <Link
            href="/login"
            style={{
              justifySelf: "start",
              background: "#E63946",
              color: "#FFFFFF",
              borderRadius: 999,
              padding: "10px 16px",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            Iniciar sesión
          </Link>
        </div>
      ) : errorMessage || !thread ? (
        <div style={{ background: "#FFFFFF", borderRadius: 26, padding: 24, color: "#C53340" }}>
          {errorMessage ?? "No encontramos este tema."}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <article
            style={{
              background: "#FFFFFF",
              borderRadius: 28,
              padding: 20,
              boxShadow: "0 6px 22px rgba(26,26,46,0.08)",
              display: "grid",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  borderRadius: 999,
                  background: "rgba(78,205,196,0.14)",
                  color: "#178A83",
                  padding: "6px 10px",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                {thread.group_name}
              </span>
              {thread.tag && (
                <span
                  style={{
                    borderRadius: 999,
                    background: "#F8F4EE",
                    color: "#53596B",
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {thread.tag}
                </span>
              )}
              {thread.is_pinned && (
                <span
                  style={{
                    borderRadius: 999,
                    background: "#4ECDC4",
                    color: "#1A1A2E",
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  FIJADO
                </span>
              )}
              {thread.is_locked && (
                <span
                  style={{
                    borderRadius: 999,
                    background: "rgba(230,57,70,0.10)",
                    color: "#C53340",
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  CERRADO
                </span>
              )}
            </div>

            <div>
              <h2 style={{ fontSize: 27, fontWeight: 800, color: "#1A1A2E", margin: 0, lineHeight: 1.08 }}>
                {thread.title}
              </h2>
              <p style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 700, margin: "8px 0 0" }}>
                {threadAuthor} · {timeAgo(thread.created_at)}
              </p>
            </div>

            <p
              style={{
                fontSize: 16,
                color: "#1A1A2E",
                lineHeight: 1.55,
                margin: 0,
                whiteSpace: "pre-wrap",
              }}
            >
              {thread.body}
            </p>

            {profile.is_admin && (
              <div style={{ display: "grid", gap: 8 }}>
                {moderationError && <p style={{ color: "#C53340", fontSize: 13, fontWeight: 800, margin: 0 }}>{moderationError}</p>}
                {moderationNotice && <p style={{ color: "#178A83", fontSize: 13, fontWeight: 800, margin: 0 }}>{moderationNotice}</p>}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setPendingModerationAction({ type: thread.is_pinned ? "unpin-thread" : "pin-thread" })}
                    disabled={moderating}
                    style={moderationButtonStyle}
                  >
                    {thread.is_pinned ? "Desfijar" : "Fijar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingModerationAction({ type: thread.is_locked ? "unlock-thread" : "lock-thread" })}
                    disabled={moderating}
                    style={moderationButtonStyle}
                  >
                    {thread.is_locked ? "Abrir tema" : "Cerrar tema"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingModerationAction({ type: "delete-thread" })}
                    disabled={moderating}
                    style={{ ...moderationButtonStyle, color: "#C53340" }}
                  >
                    Eliminar tema
                  </button>
                </div>
              </div>
            )}
          </article>

          <section style={{ display: "grid", gap: 10 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1A1A2E", margin: "2px 0 0" }}>
              Respuestas
            </h3>
            {replies.length === 0 ? (
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: 24,
                  padding: 18,
                  color: "#6E737F",
                  boxShadow: "0 4px 18px rgba(26,26,46,0.06)",
                }}
              >
                Aún no hay respuestas.
              </div>
            ) : (
              replies.map((reply) => (
                <article
                  key={reply.id}
                  style={{
                    background: "#FFFFFF",
                    borderRadius: 24,
                    padding: 18,
                    boxShadow: "0 4px 18px rgba(26,26,46,0.06)",
                    display: "grid",
                    gap: 9,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "#9CA3AF", fontSize: 12, fontWeight: 800 }}>
                    <span>{reply.authorName}</span>
                    <span>{timeAgo(reply.created_at)}</span>
                  </div>
                  <p style={{ margin: 0, color: "#1A1A2E", fontSize: 15, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                    {reply.body}
                  </p>
                  {profile.is_admin && (
                    <button
                      type="button"
                      onClick={() => setPendingModerationAction({ type: "delete-reply", reply })}
                      disabled={moderating}
                      style={{ ...moderationButtonStyle, justifySelf: "start", color: "#C53340" }}
                    >
                      Eliminar respuesta
                    </button>
                  )}
                </article>
              ))
            )}
          </section>

          {thread.is_locked ? (
            <div
              style={{
                borderRadius: 24,
                background: "rgba(230,57,70,0.10)",
                color: "#C53340",
                padding: 16,
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              Este tema está cerrado y ya no acepta respuestas.
            </div>
          ) : (
            <form
              onSubmit={handleReplySubmit}
              style={{
                background: "#FFFFFF",
                borderRadius: 26,
                padding: 18,
                boxShadow: "0 6px 22px rgba(26,26,46,0.08)",
                display: "grid",
                gap: 12,
              }}
            >
              <label style={{ fontSize: 15, fontWeight: 800, color: "#1A1A2E" }} htmlFor="forum-reply-body">
                Responder
              </label>
              <textarea
                id="forum-reply-body"
                value={replyBody}
                onChange={(event) => setReplyBody(event.target.value)}
                placeholder="Escribe una respuesta..."
                rows={4}
                style={{
                  border: "none",
                  borderRadius: 18,
                  background: "#F8F4EE",
                  color: "#1A1A2E",
                  padding: "13px 14px",
                  fontSize: 15,
                  lineHeight: 1.45,
                  resize: "vertical",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              {replyError && <p style={{ color: "#C53340", fontSize: 13, margin: 0 }}>{replyError}</p>}
              <button
                type="submit"
                disabled={postingReply || !replyBody.trim()}
                style={{
                  border: "none",
                  borderRadius: 999,
                  background: postingReply || !replyBody.trim() ? "#C4BAB0" : "#E63946",
                  color: "#FFFFFF",
                  padding: "14px 16px",
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: postingReply || !replyBody.trim() ? "not-allowed" : "pointer",
                }}
              >
                {postingReply ? "Publicando..." : "Publicar respuesta"}
              </button>
            </form>
          )}
        </div>
      )}

      {pendingModerationAction && moderationDialogCopy && (
        <ModerationConfirmDialog
          open
          title={moderationDialogCopy.title}
          description={moderationDialogCopy.description}
          confirmLabel={moderationDialogCopy.confirmLabel}
          tone={moderationDialogCopy.tone}
          busy={moderating}
          onCancel={() => setPendingModerationAction(null)}
          onConfirm={confirmPendingModerationAction}
        />
      )}

      <BottomNav />
    </div>
  );
}
