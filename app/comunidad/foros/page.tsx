"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import ModerationConfirmDialog from "@/components/comunidad/ModerationConfirmDialog";
import { useStudentViewMode } from "@/lib/use-student-view-mode";

type Profile = {
  id: string;
  username: string | null;
  avatar_url?: string | null;
  group_name: string | null;
  is_admin: boolean | null;
};

type ClassForum = {
  id: string;
  group_name: string;
  title: string;
  created_at: string;
  is_active: boolean;
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

type ThreadView = ForumThread & {
  authorName: string;
  replyCount: number;
};

type PendingModerationAction =
  | { type: "pin"; thread: ThreadView }
  | { type: "unpin"; thread: ThreadView }
  | { type: "lock"; thread: ThreadView }
  | { type: "unlock"; thread: ThreadView }
  | { type: "delete-thread"; thread: ThreadView };

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

function getThreadActivity(thread: ForumThread) {
  return thread.last_reply_at ?? thread.updated_at ?? thread.created_at;
}

function sortThreads(left: ThreadView, right: ThreadView) {
  if (left.is_pinned !== right.is_pinned) return left.is_pinned ? -1 : 1;
  return new Date(getThreadActivity(right)).getTime() - new Date(getThreadActivity(left)).getTime();
}

const moderationButtonStyle = {
  border: "none",
  borderRadius: 999,
  background: "#FFFFFF",
  color: "#53596B",
  padding: "7px 10px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};

function getModerationDialogCopy(action: PendingModerationAction) {
  switch (action.type) {
    case "pin":
      return {
        title: "Fijar tema",
        description: "Este tema aparecerá arriba en el foro del grupo.",
        confirmLabel: "Fijar",
        tone: "neutral" as const,
      };
    case "unpin":
      return {
        title: "Desfijar tema",
        description: "El tema volverá al orden normal por actividad reciente.",
        confirmLabel: "Desfijar",
        tone: "neutral" as const,
      };
    case "lock":
      return {
        title: "Cerrar tema",
        description: "El grupo podrá leerlo, pero ya no podrá agregar respuestas.",
        confirmLabel: "Cerrar tema",
        tone: "neutral" as const,
      };
    case "unlock":
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
  }
}

export default function ComunidadForosPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [forums, setForums] = useState<ClassForum[]>([]);
  const [threads, setThreads] = useState<ThreadView[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupMissing, setSetupMissing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [moderatingThreadId, setModeratingThreadId] = useState<string | null>(null);
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [moderationNotice, setModerationNotice] = useState<string | null>(null);
  const [pendingModerationAction, setPendingModerationAction] = useState<PendingModerationAction | null>(null);
  const { studentViewActive, studentViewGroupName, effectiveIsAdmin } = useStudentViewMode(Boolean(profile?.is_admin));

  useEffect(() => {
    async function loadForums() {
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
      const canSeeAllGroups = Boolean(currentProfile.is_admin && !studentViewActive);
      const previewGroupName = currentProfile.is_admin && studentViewActive ? studentViewGroupName : null;
      const visibleGroupName = canSeeAllGroups ? null : previewGroupName || currentProfile.group_name;

      if (!canSeeAllGroups && !visibleGroupName) {
        setForums([]);
        setThreads([]);
        setLoading(false);
        return;
      }

      let forumsQuery = supabase
        .from("class_forums")
        .select("id, group_name, title, created_at, is_active")
        .eq("is_active", true)
        .order("group_name", { ascending: true });

      if (!canSeeAllGroups) {
        forumsQuery = forumsQuery.eq("group_name", visibleGroupName);
      }

      const { data: forumData, error: forumError } = await forumsQuery;

      if (forumError) {
        if (forumError.code === "42P01" || forumError.message.toLowerCase().includes("class_forums")) {
          setSetupMissing(true);
          setLoading(false);
          return;
        }
        setErrorMessage("No pudimos cargar los foros de clase.");
        setLoading(false);
        return;
      }

      const visibleForums = (forumData as ClassForum[] | null) ?? [];
      setForums(visibleForums);

      const forumIds = visibleForums.map((forum) => forum.id);
      if (forumIds.length === 0) {
        setThreads([]);
        setLoading(false);
        return;
      }

      const { data: threadData, error: threadError } = await supabase
        .from("forum_threads")
        .select("id, forum_id, group_name, author_id, title, body, tag, is_pinned, is_locked, created_at, updated_at, last_reply_at")
        .in("forum_id", forumIds)
        .is("deleted_at", null);

      if (threadError) {
        setErrorMessage("No pudimos cargar los temas del foro.");
        setLoading(false);
        return;
      }

      const rawThreads = (threadData as ForumThread[] | null) ?? [];
      const threadIds = rawThreads.map((thread) => thread.id);
      const authorIds = [...new Set(rawThreads.map((thread) => thread.author_id))];

      const replyCounts = new Map<string, number>();
      if (threadIds.length > 0) {
        const { data: replyData } = await supabase
          .from("forum_replies")
          .select("thread_id")
          .in("thread_id", threadIds)
          .is("deleted_at", null);

        ((replyData as { thread_id: string }[] | null) ?? []).forEach((reply) => {
          replyCounts.set(reply.thread_id, (replyCounts.get(reply.thread_id) ?? 0) + 1);
        });
      }

      const authorNames = new Map<string, string>();
      if (authorIds.length > 0) {
        const { data: authorData } = await supabase
          .from("profiles")
          .select("id, username, is_admin")
          .in("id", authorIds);

        ((authorData as Array<{ id: string; username: string | null; is_admin: boolean | null }> | null) ?? []).forEach(
          (author) => {
            authorNames.set(author.id, author.username ?? (author.is_admin ? "Sensei" : "Alumno"));
          },
        );
      }

      setThreads(
        rawThreads
          .map((thread) => ({
            ...thread,
            authorName: authorNames.get(thread.author_id) ?? "Usuario",
            replyCount: replyCounts.get(thread.id) ?? 0,
          }))
          .sort(sortThreads),
      );
      setLoading(false);
    }

    loadForums();
  }, [studentViewActive, studentViewGroupName]);

  const groupedThreads = forums.map((forum) => ({
    forum,
    threads: threads.filter((thread) => thread.forum_id === forum.id),
  }));

  async function updateThreadModeration(threadId: string, changes: Partial<Pick<ForumThread, "is_pinned" | "is_locked">>) {
    if (!effectiveIsAdmin || moderatingThreadId) return;

    setModeratingThreadId(threadId);
    setModerationError(null);
    setModerationNotice(null);

    const { error } = await supabase.from("forum_threads").update(changes).eq("id", threadId);

    setModeratingThreadId(null);

    if (error) {
      setModerationError("No pudimos actualizar el tema.");
      return;
    }

    setThreads((current) =>
      current
        .map((thread) => (thread.id === threadId ? { ...thread, ...changes, updated_at: new Date().toISOString() } : thread))
        .sort(sortThreads),
    );
    setModerationNotice("Tema actualizado.");
  }

  async function deleteThread(threadId: string) {
    if (!effectiveIsAdmin || moderatingThreadId) return;

    setModeratingThreadId(threadId);
    setModerationError(null);
    setModerationNotice(null);

    const { error } = await supabase.from("forum_threads").update({ deleted_at: new Date().toISOString() }).eq("id", threadId);

    setModeratingThreadId(null);

    if (error) {
      setModerationError("No pudimos eliminar el tema.");
      return;
    }

    setThreads((current) => current.filter((thread) => thread.id !== threadId));
    setModerationNotice("Tema eliminado.");
  }

  async function confirmPendingModerationAction() {
    if (!pendingModerationAction) return;

    const action = pendingModerationAction;
    if (action.type === "pin") {
      await updateThreadModeration(action.thread.id, { is_pinned: true });
    } else if (action.type === "unpin") {
      await updateThreadModeration(action.thread.id, { is_pinned: false });
    } else if (action.type === "lock") {
      await updateThreadModeration(action.thread.id, { is_locked: true });
    } else if (action.type === "unlock") {
      await updateThreadModeration(action.thread.id, { is_locked: false });
    } else {
      await deleteThread(action.thread.id);
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
        padding: "20px 20px calc(112px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <button
          type="button"
          onClick={() => router.push("/comunidad")}
          aria-label="Volver a Comunidad"
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
          <h1 style={{ fontSize: "34px", fontWeight: 800, color: "#1A1A2E", margin: 0, lineHeight: 1 }}>
            Foros de clase
          </h1>
          <p style={{ fontSize: 14, color: "#6E737F", margin: "6px 0 0", lineHeight: 1.35 }}>
            Temas y respuestas por grupo.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#9CA3AF", padding: "48px 0" }}>Cargando foros...</div>
      ) : setupMissing ? (
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 26,
            padding: 24,
            boxShadow: "0 6px 22px rgba(26,26,46,0.08)",
            color: "#53596B",
            lineHeight: 1.45,
          }}
        >
          <strong style={{ color: "#1A1A2E" }}>Falta activar la base de datos.</strong>
          <p style={{ margin: "8px 0 0" }}>
            Ejecuta el SQL de `docs/supabase-class-forums.sql` en Supabase para crear los foros.
          </p>
        </div>
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
          <p style={{ margin: 0, color: "#53596B" }}>Inicia sesión para ver los foros de tu clase.</p>
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
      ) : errorMessage ? (
        <div style={{ background: "#FFFFFF", borderRadius: 26, padding: 24, color: "#C53340" }}>{errorMessage}</div>
      ) : !effectiveIsAdmin && !(studentViewActive ? studentViewGroupName || profile.group_name : profile.group_name) ? (
        <div style={{ background: "#FFFFFF", borderRadius: 26, padding: 24, color: "#53596B" }}>
          Aún no tienes grupo asignado. Cuando tu cuenta tenga grupo, aquí aparecerá tu foro de clase.
        </div>
      ) : groupedThreads.length === 0 ? (
        <div style={{ background: "#FFFFFF", borderRadius: 26, padding: 24, color: "#53596B" }}>
          Todavía no hay un foro activo para{" "}
          {effectiveIsAdmin ? "los grupos" : studentViewActive ? studentViewGroupName || profile.group_name : profile.group_name}.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {moderationError && (
            <div
              style={{
                borderRadius: 20,
                background: "rgba(230,57,70,0.10)",
                color: "#C53340",
                padding: 14,
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              {moderationError}
            </div>
          )}
          {moderationNotice && (
            <div
              style={{
                borderRadius: 20,
                background: "rgba(78,205,196,0.14)",
                color: "#178A83",
                padding: 14,
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              {moderationNotice}
            </div>
          )}

          {groupedThreads.map(({ forum, threads: forumThreads }) => (
            <section
              key={forum.id}
              style={{
                background: "#FFFFFF",
                borderRadius: 28,
                padding: 18,
                boxShadow: "0 6px 22px rgba(26,26,46,0.08)",
                display: "grid",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div>
                  <div
                    style={{
                      display: "inline-flex",
                      borderRadius: 999,
                      padding: "6px 10px",
                      background: "rgba(78,205,196,0.14)",
                      color: "#178A83",
                      fontSize: 12,
                      fontWeight: 800,
                      marginBottom: 8,
                    }}
                  >
                    {forum.group_name}
                  </div>
                  <h2 style={{ fontSize: 23, fontWeight: 800, color: "#1A1A2E", margin: 0, lineHeight: 1.1 }}>
                    {forum.title}
                  </h2>
                </div>
                <div style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 800, whiteSpace: "nowrap" }}>
                  {forumThreads.length} temas
                </div>
              </div>

              {effectiveIsAdmin ? (
                <Link
                  href={`/comunidad/foros/nuevo?forum=${forum.id}`}
                  style={{
                    justifySelf: "start",
                    borderRadius: 999,
                    background: "#1A1A2E",
                    color: "#FFFFFF",
                    padding: "11px 16px",
                    fontSize: 14,
                    fontWeight: 800,
                    textDecoration: "none",
                  }}
                >
                  Nuevo tema
                </Link>
              ) : null}

              {forumThreads.length === 0 ? (
                <div
                  style={{
                    borderRadius: 22,
                    background: "#F8F4EE",
                    padding: 18,
                    color: "#6E737F",
                    fontSize: 15,
                    lineHeight: 1.4,
                  }}
                >
                  Todavía no hay temas en este foro.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {forumThreads.map((thread) => (
                    <article
                      key={thread.id}
                      style={{
                        borderRadius: 22,
                        background: thread.is_pinned ? "rgba(78,205,196,0.10)" : "#F8F4EE",
                        padding: 16,
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      <Link
                        href={`/comunidad/foros/${thread.id}`}
                        style={{ display: "grid", gap: 10, textDecoration: "none" }}
                      >
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {thread.is_pinned && (
                            <span
                              style={{
                                borderRadius: 999,
                                background: "#4ECDC4",
                                color: "#1A1A2E",
                                padding: "5px 9px",
                                fontSize: 11,
                                fontWeight: 900,
                              }}
                            >
                              FIJADO
                            </span>
                          )}
                          {thread.tag && (
                            <span
                              style={{
                                borderRadius: 999,
                                background: "#FFFFFF",
                                color: "#53596B",
                                padding: "5px 9px",
                                fontSize: 11,
                                fontWeight: 800,
                              }}
                            >
                              {thread.tag}
                            </span>
                          )}
                          {thread.is_locked && (
                            <span
                              style={{
                                borderRadius: 999,
                                background: "rgba(230,57,70,0.10)",
                                color: "#C53340",
                                padding: "5px 9px",
                                fontSize: 11,
                                fontWeight: 800,
                              }}
                            >
                              CERRADO
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1A1A2E", margin: "0 0 5px" }}>
                            {thread.title}
                          </h3>
                          <p
                            style={{
                              fontSize: 14,
                              color: "#6E737F",
                              lineHeight: 1.4,
                              margin: 0,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {thread.body}
                          </p>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "#9CA3AF", fontSize: 12, fontWeight: 700 }}>
                          <span>{thread.authorName}</span>
                          <span>
                            {thread.replyCount} respuestas · {timeAgo(getThreadActivity(thread))}
                          </span>
                        </div>
                      </Link>

                      {effectiveIsAdmin && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 2 }}>
                          <button
                            type="button"
                            onClick={() => setPendingModerationAction({ type: thread.is_pinned ? "unpin" : "pin", thread })}
                            disabled={moderatingThreadId === thread.id}
                            style={moderationButtonStyle}
                          >
                            {thread.is_pinned ? "Desfijar" : "Fijar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingModerationAction({ type: thread.is_locked ? "unlock" : "lock", thread })}
                            disabled={moderatingThreadId === thread.id}
                            style={moderationButtonStyle}
                          >
                            {thread.is_locked ? "Abrir" : "Cerrar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingModerationAction({ type: "delete-thread", thread })}
                            disabled={moderatingThreadId === thread.id}
                            style={{ ...moderationButtonStyle, color: "#C53340" }}
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {pendingModerationAction && moderationDialogCopy && (
        <ModerationConfirmDialog
          open
          title={moderationDialogCopy.title}
          description={moderationDialogCopy.description}
          confirmLabel={moderationDialogCopy.confirmLabel}
          tone={moderationDialogCopy.tone}
          busy={moderatingThreadId === pendingModerationAction.thread.id}
          onCancel={() => setPendingModerationAction(null)}
          onConfirm={confirmPendingModerationAction}
        />
      )}

      <BottomNav />
    </div>
  );
}
