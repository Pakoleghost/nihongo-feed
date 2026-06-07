"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useStudentViewMode } from "@/lib/use-student-view-mode";

type UserRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  group_name: string | null;
  email: string | null;
  is_approved: boolean | null;
};

// coleccion_slug may not exist yet (migration pending) — always treat as nullable
type GroupRow = {
  name: string;
  coleccion_slug: string | null;
};

type ColeccionesMap = Record<string, { nombre: string }>;

// ─── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ url, name, size = 44 }: { url: string | null; name: string | null; size?: number }) {
  const COLORS = ["#E63946", "#4ECDC4", "#A8DADC", "#F4A261", "#8338EC", "#3A86FF"];
  const idx = (name ?? "?").charCodeAt(0) % COLORS.length;
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={name ?? "avatar"} width={size} height={size}
        style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: COLORS[idx],
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: "#FFF", flexShrink: 0,
    }}>
      {(name ?? "?").charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AdminUsuariosPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [isCurrentAdmin, setIsCurrentAdmin] = useState(false);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [colecciones, setColecciones] = useState<ColeccionesMap>({});
  const [hasColeccionSlug, setHasColeccionSlug] = useState(false); // migration ran?
  const [pending, setPending] = useState<UserRow[]>([]);
  const [approved, setApproved] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [newGroup, setNewGroup] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [renaming, setRenaming] = useState<{ old: string; draft: string } | null>(null);
  const [savingRename, setSavingRename] = useState(false);
  const [pendingGroupFor, setPendingGroupFor] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  // ── Notification broadcast ───────────────────────────────────────────────────
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [notifGroups, setNotifGroups] = useState<string[]>([]);
  const [notifSending, setNotifSending] = useState(false);
  const [notifResult, setNotifResult] = useState<{ sent: number; failed: number } | null>(null);
  const [notifError, setNotifError] = useState<string | null>(null);

  const [progresoMap, setProgresoMap] = useState<Record<string, boolean>>({});

  const { studentViewActive, studentViewGroupName, setStudentViewActive, setStudentViewGroupName } =
    useStudentViewMode(isCurrentAdmin);

  // ── Loaders ─────────────────────────────────────────────────────────────────

  const loadGroups = useCallback(async (): Promise<GroupRow[]> => {
    // Try with coleccion_slug first (requires migration). Fall back to just name.
    const { data, error } = await supabase.from("groups").select("name, coleccion_slug").order("name");
    if (!error && data) {
      setHasColeccionSlug(true);
      return data as GroupRow[];
    }
    // Column doesn't exist yet — safe fallback
    const { data: fallback } = await supabase.from("groups").select("name").order("name");
    return (fallback ?? []).map((g: { name: string }) => ({ name: g.name, coleccion_slug: null }));
  }, []);

  const loadUsers = useCallback(async (accessToken: string) => {
    const res = await fetch("/api/admin/requests", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { pending: [] as UserRow[], approved: [] as UserRow[] };
    const { pending: p, past: a } = await res.json();
    return { pending: (p ?? []) as UserRow[], approved: (a ?? []) as UserRow[] };
  }, []);

  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession();
      const t = sessionData.session?.access_token ?? null;
      setToken(t);

      // Check admin status — redirect non-admins immediately
      if (sessionData.session?.user) {
        const { data: prof } = await supabase.from("profiles").select("is_admin")
          .eq("id", sessionData.session.user.id).maybeSingle();
        const admin = Boolean(prof?.is_admin);
        setIsCurrentAdmin(admin);
        if (!admin) { router.replace("/"); return; }
      } else {
        router.replace("/login");
        return;
      }

      const [grps, colRes, progresoRes] = await Promise.all([
        loadGroups(),
        fetch("/api/colecciones").then((r) => r.ok ? r.json() : {}).catch(() => ({})),
        fetch("/api/grupos-progreso", { cache: "no-store" }).then((r) => r.ok ? r.json() : {}).catch(() => ({})),
      ]);
      setProgresoMap(progresoRes as Record<string, boolean>);
      setGroups(grps);
      const slim: ColeccionesMap = {};
      Object.entries(colRes as Record<string, { nombre: string }>).forEach(([slug, col]) => {
        slim[slug] = { nombre: col.nombre };
      });
      setColecciones(slim);

      if (t) {
        const { pending: p, approved: a } = await loadUsers(t);
        setPending(p);
        setApproved(a);
        const firstGroup = grps[0]?.name ?? "";
        setPendingGroupFor((prev) => {
          const next = { ...prev };
          p.forEach((u) => { if (!next[u.id]) next[u.id] = firstGroup; });
          return next;
        });
      }
      setLoading(false);
    }
    void init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!groups.length) return;
    setPendingGroupFor((prev) => {
      const next = { ...prev };
      pending.forEach((u) => { if (!next[u.id]) next[u.id] = groups[0]?.name ?? ""; });
      return next;
    });
  }, [groups, pending]);

  // ── Group actions ───────────────────────────────────────────────────────────

  async function handleCreateGroup() {
    const name = newGroup.trim();
    if (!name) return;
    setCreatingGroup(true);
    await supabase.from("groups").insert([{ name }]);
    setNewGroup("");
    setGroups(await loadGroups());
    setCreatingGroup(false);
  }

  async function handleRenameGroup() {
    if (!renaming) return;
    const { old: oldName, draft } = renaming;
    const newName = draft.trim();
    if (!newName || newName === oldName) { setRenaming(null); return; }
    setSavingRename(true);
    await supabase.from("groups").update({ name: newName }).eq("name", oldName);
    await supabase.from("profiles").update({ group_name: newName }).eq("group_name", oldName);
    setGroups((prev) => prev.map((g) => g.name === oldName ? { ...g, name: newName } : g));
    setApproved((prev) => prev.map((u) => u.group_name === oldName ? { ...u, group_name: newName } : u));
    setSavingRename(false);
    setRenaming(null);
  }

  async function handleToggleProgreso(groupName: string) {
    const next = !progresoMap[groupName];
    setProgresoMap((prev) => ({ ...prev, [groupName]: next }));
    await fetch(`/api/admin/progreso-toggle?grupo=${encodeURIComponent(groupName)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ show_progreso: next }),
    }).catch(() => {
      // revert on error
      setProgresoMap((prev) => ({ ...prev, [groupName]: !next }));
    });
  }

  async function handleMapColeccion(groupName: string, slug: string) {
    if (!hasColeccionSlug) return; // migration not run yet
    await supabase.from("groups").update({ coleccion_slug: slug || null }).eq("name", groupName);
    setGroups((prev) => prev.map((g) => g.name === groupName ? { ...g, coleccion_slug: slug || null } : g));
  }

  // ── User actions ────────────────────────────────────────────────────────────

  async function handleApprove(user: UserRow) {
    const group = pendingGroupFor[user.id] ?? groups[0]?.name ?? "";
    if (!group) { alert("Selecciona un grupo."); return; }
    await supabase.from("profiles").update({ is_approved: true, group_name: group }).eq("id", user.id);
    setPending((prev) => prev.filter((u) => u.id !== user.id));
    setApproved((prev) => [{ ...user, is_approved: true, group_name: group }, ...prev]);
  }

  async function handleReject(user: UserRow) {
    if (!token) return;
    await fetch(`/api/admin/users/${user.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setPending((prev) => prev.filter((u) => u.id !== user.id));
  }

  async function handleChangeGroup(userId: string, newGroupName: string) {
    await supabase.from("profiles").update({ group_name: newGroupName || null }).eq("id", userId);
    setApproved((prev) => prev.map((u) => u.id === userId ? { ...u, group_name: newGroupName || null } : u));
  }

  function confirmDelete(user: UserRow) {
    setDeleteTarget({ id: user.id, label: user.full_name ?? user.username ?? user.id });
  }

  async function executeDelete() {
    if (!deleteTarget || !token) return;
    await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setApproved((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  async function handleBroadcast() {
    if (!token || !notifTitle.trim() || !notifBody.trim()) return;
    setNotifSending(true);
    setNotifResult(null);
    setNotifError(null);
    try {
      const res = await fetch("/api/push/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: notifTitle.trim(),
          body: notifBody.trim(),
          groups: notifGroups.length > 0 ? notifGroups : undefined,
        }),
      });
      const data = await res.json() as { sent?: number; failed?: number; error?: string; note?: string };
      if (!res.ok) {
        setNotifError(data.error ?? "Error al enviar");
      } else {
        setNotifResult({ sent: data.sent ?? 0, failed: data.failed ?? 0 });
        setNotifTitle("");
        setNotifBody("");
        setNotifGroups([]);
      }
    } catch {
      setNotifError("Error de red");
    }
    setNotifSending(false);
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const groupNames = groups.map((g) => g.name);
  const ungrouped = approved.filter((u) => !u.group_name || !groupNames.includes(u.group_name));
  const groupedApproved = groups.map((g) => ({
    group: g,
    users: approved.filter((u) => u.group_name === g.name),
  }));
  const coleccionEntries = Object.entries(colecciones);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <div style={{
        background: "#FFF8E7", minHeight: "100dvh", display: "flex",
        flexDirection: "column", paddingBottom: "calc(140px + env(safe-area-inset-bottom, 0px))",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "20px 20px 4px" }}>
          <button onClick={() => router.back()} aria-label="Volver" style={{
            width: 40, height: 40, borderRadius: "50%", background: "#FFFFFF",
            border: "none", cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", boxShadow: "0 2px 10px rgba(26,26,46,0.10)", flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 5l-7 7 7 7" stroke="#1A1A2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "#1A1A2E", margin: 0, lineHeight: 1 }}>
            Alumnos
          </h1>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "#9CA3AF", padding: "60px 0" }}>Cargando…</div>
        ) : (
          <div style={{ padding: "20px 16px 0", display: "flex", flexDirection: "column", gap: "24px" }}>

            {/* ── Student view ─────────────────────────────────────────────── */}
            {isCurrentAdmin && (
              <section>
                <p style={sectionLabel}>Vista de estudiante</p>
                <div style={{ ...cardStyle, padding: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <p style={{ fontSize: 13, color: "#53596B", margin: 0 }}>
                      {studentViewActive
                        ? `Activa · ${studentViewGroupName ?? "sin grupo"}`
                        : "Revisa la app como si fueras un alumno"}
                    </p>
                    <button
                      type="button"
                      onClick={() => setStudentViewActive(!studentViewActive)}
                      style={{
                        border: "none", borderRadius: 999,
                        background: studentViewActive ? "#4ECDC4" : "#1A1A2E",
                        color: "#FFFFFF",
                        padding: "9px 16px", fontSize: 13, fontWeight: 800,
                        cursor: "pointer", flexShrink: 0,
                        transition: "background 140ms ease",
                      }}
                    >
                      {studentViewActive ? "Salir" : "Activar"}
                    </button>
                  </div>
                  {!studentViewActive && groupNames.length > 0 && (
                    <select
                      value={studentViewGroupName ?? ""}
                      onChange={(e) => setStudentViewGroupName(e.target.value || null)}
                      style={{ marginTop: 10, ...groupSelect, maxWidth: "100%", width: "100%" }}
                    >
                      <option value="">Elegir grupo…</option>
                      {groupNames.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  )}
                </div>
              </section>
            )}

            {/* ── Groups + coleccion mapping ────────────────────────────────── */}
            <section>
              <p style={sectionLabel}>Grupos</p>
              <div style={cardStyle}>
                {groups.length === 0 && (
                  <p style={{ fontSize: 13, color: "#9CA3AF", margin: "10px 0" }}>Sin grupos todavía.</p>
                )}
                {groups.map((g) => (
                  <div key={g.name} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 0", borderBottom: "1px solid rgba(26,26,46,0.06)",
                  }}>
                    {/* Rename trigger */}
                    <button type="button" onClick={() => setRenaming({ old: g.name, draft: g.name })}
                      style={{ flex: 1, textAlign: "left", background: "none", border: "none",
                        cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#1A1A2E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {g.name}
                      </span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                          stroke="#C4BAB0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {/* Coleccion mapping (only when migration ran) */}
                    {/* Progreso toggle */}
                    <button
                      type="button"
                      title={progresoMap[g.name] ? "Progreso activo" : "Activar línea de progreso"}
                      onClick={() => void handleToggleProgreso(g.name)}
                      style={{
                        width: 36, height: 20, borderRadius: 10, border: "none",
                        background: progresoMap[g.name] ? "#4ECDC4" : "rgba(26,26,46,0.10)",
                        position: "relative", flexShrink: 0, cursor: "pointer",
                        transition: "background 140ms ease",
                      }}
                    >
                      <span style={{
                        position: "absolute", top: 2,
                        left: progresoMap[g.name] ? 18 : 2,
                        width: 16, height: 16, borderRadius: "50%",
                        background: "#FFFFFF",
                        transition: "left 140ms ease",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
                      }} />
                    </button>

                    {hasColeccionSlug && coleccionEntries.length > 0 && (
                      <select
                        value={g.coleccion_slug ?? ""}
                        onChange={(e) => void handleMapColeccion(g.name, e.target.value)}
                        title="Grabaciones Zoom"
                        style={{
                          border: "none", borderRadius: 10,
                          background: g.coleccion_slug ? "rgba(78,205,196,0.12)" : "#F7F3ED",
                          color: g.coleccion_slug ? "#178A83" : "#9CA3AF",
                          padding: "7px 10px", fontSize: 12, fontWeight: 700,
                          outline: "none", flexShrink: 0, maxWidth: 140, fontFamily: "inherit",
                        }}
                      >
                        <option value="">Sin grabaciones</option>
                        {coleccionEntries.map(([slug, col]) => (
                          <option key={slug} value={slug}>{col.nombre}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}

                {/* Rename editor */}
                {renaming && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 0 4px" }}>
                    <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, flexShrink: 0 }}>Renombrar:</span>
                    <input autoFocus value={renaming.draft}
                      onChange={(e) => setRenaming({ ...renaming, draft: e.target.value })}
                      onKeyDown={(e) => { if (e.key === "Enter") void handleRenameGroup(); if (e.key === "Escape") setRenaming(null); }}
                      style={{ ...fieldStyle, flex: 1 }} />
                    <button type="button" disabled={savingRename} onClick={() => void handleRenameGroup()}
                      style={{ ...btnSmall, background: "#4ECDC4", color: "#1A1A2E" }}>
                      {savingRename ? "…" : "✓"}
                    </button>
                    <button type="button" onClick={() => setRenaming(null)}
                      style={{ ...btnSmall, background: "#F7F3ED", color: "#9CA3AF" }}>✕</button>
                  </div>
                )}

                {/* New group */}
                <div style={{ display: "flex", gap: 8, paddingTop: 12 }}>
                  <input value={newGroup} onChange={(e) => setNewGroup(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void handleCreateGroup(); }}
                    placeholder="Nuevo grupo…" style={{ ...fieldStyle, flex: 1 }} />
                  <button type="button" onClick={() => void handleCreateGroup()}
                    disabled={creatingGroup || !newGroup.trim()}
                    style={{
                      border: "none", borderRadius: 12,
                      background: !newGroup.trim() ? "#E5E7EB" : "#1A1A2E",
                      color: !newGroup.trim() ? "#9CA3AF" : "#FFFFFF",
                      padding: "0 16px", fontSize: 13, fontWeight: 700,
                      cursor: !newGroup.trim() ? "not-allowed" : "pointer", flexShrink: 0,
                    }}>
                    {creatingGroup ? "…" : "Crear"}
                  </button>
                </div>
              </div>
            </section>

            {/* ── Pending ──────────────────────────────────────────────────── */}
            <section>
              <p style={sectionLabel}>
                Solicitudes
                {pending.length > 0 && (
                  <span style={{ marginLeft: 8, background: "rgba(230,57,70,0.12)", color: "#C53340", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 800 }}>
                    {pending.length}
                  </span>
                )}
              </p>
              {pending.length === 0 ? (
                <div style={emptyCard}>Sin solicitudes pendientes</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {pending.map((user) => (
                    <div key={user.id} style={userCardStyle}>
                      <Avatar url={user.avatar_url} name={user.full_name ?? user.username} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={userName}>{user.full_name ?? user.username ?? "—"}</p>
                        {user.username && <p style={userSub}>@{user.username}</p>}
                        {!user.username && user.email && <p style={userSub}>{user.email}</p>}
                      </div>
                      <select value={pendingGroupFor[user.id] ?? ""}
                        onChange={(e) => setPendingGroupFor((prev) => ({ ...prev, [user.id]: e.target.value }))}
                        style={groupSelect}>
                        <option value="">Elegir…</option>
                        {groups.map((g) => <option key={g.name} value={g.name}>{g.name}</option>)}
                      </select>
                      <button type="button" onClick={() => void handleApprove(user)}
                        style={iconBtn("rgba(78,205,196,0.15)")} aria-label="Aprobar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17l-5-5" stroke="#4ECDC4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button type="button" onClick={() => void handleReject(user)}
                        style={iconBtn("rgba(230,57,70,0.12)")} aria-label="Rechazar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M18 6L6 18M6 6l12 12" stroke="#E63946" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Sin grupo — primero ───────────────────────────────────────── */}
            {ungrouped.length > 0 && (
              <section>
                <p style={sectionLabel}>
                  Sin grupo
                  <span style={{ marginLeft: 6, fontSize: 11, color: "#C4BAB0", fontWeight: 600 }}>{ungrouped.length}</span>
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {ungrouped.map((user) => (
                    <ApprovedUserRow key={user.id} user={user} groups={groupNames}
                      onChangeGroup={handleChangeGroup} onDelete={confirmDelete} />
                  ))}
                </div>
              </section>
            )}

            {/* ── By group ─────────────────────────────────────────────────── */}
            {groupedApproved.map(({ group, users }) => (
              <section key={group.name}>
                <p style={sectionLabel}>
                  {group.name}
                  <span style={{ marginLeft: 6, fontSize: 11, color: "#C4BAB0", fontWeight: 600 }}>
                    {users.length} {users.length === 1 ? "alumno" : "alumnos"}
                  </span>
                  {group.coleccion_slug && (
                    <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: "#4ECDC4", textTransform: "none", letterSpacing: 0 }}>● grabaciones</span>
                  )}
                </p>
                {users.length === 0 ? (
                  <div style={emptyCard}>Sin alumnos en este grupo</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {users.map((user) => (
                      <ApprovedUserRow key={user.id} user={user} groups={groupNames}
                        onChangeGroup={handleChangeGroup} onDelete={confirmDelete} />
                    ))}
                  </div>
                )}
              </section>
            ))}

            {/* ── Notificaciones ───────────────────────────────────────── */}
            <section>
              <p style={sectionLabel}>Notificaciones</p>
              <div style={{ ...cardStyle, padding: "14px", gap: "12px" }}>
                <input
                  type="text"
                  placeholder="Título"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  style={{ ...fieldStyle, width: "100%", boxSizing: "border-box" }}
                />
                <textarea
                  placeholder="Mensaje"
                  value={notifBody}
                  onChange={(e) => setNotifBody(e.target.value)}
                  rows={2}
                  style={{ ...fieldStyle, width: "100%", boxSizing: "border-box", resize: "none", lineHeight: 1.5 }}
                />
                {/* Destinatarios */}
                <div>
                  <p style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 700, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Destinatarios
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <button type="button"
                      onClick={() => setNotifGroups([])}
                      style={{ ...btnSmall, background: notifGroups.length === 0 ? "#1A1A2E" : "#F7F3ED", color: notifGroups.length === 0 ? "#FFFFFF" : "#53596B" }}>
                      Todos
                    </button>
                    {groupNames.map((g) => {
                      const sel = notifGroups.includes(g);
                      return (
                        <button type="button" key={g}
                          onClick={() => setNotifGroups((prev) => sel ? prev.filter((x) => x !== g) : [...prev, g])}
                          style={{ ...btnSmall, background: sel ? "#1A1A2E" : "#F7F3ED", color: sel ? "#FFFFFF" : "#53596B" }}>
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={notifSending || !notifTitle.trim() || !notifBody.trim()}
                  onClick={() => void handleBroadcast()}
                  style={{ ...btnSmall, background: "#E63946", color: "#FFFFFF", padding: "11px 18px", fontSize: 14, opacity: (notifSending || !notifTitle.trim() || !notifBody.trim()) ? 0.5 : 1 }}>
                  {notifSending ? "Enviando…" : "Enviar notificación"}
                </button>
                {notifResult && (
                  <p style={{ fontSize: 13, color: "#178A83", fontWeight: 700, margin: 0 }}>
                    ✓ Enviada a {notifResult.sent} {notifResult.sent === 1 ? "dispositivo" : "dispositivos"}
                    {notifResult.failed > 0 ? ` · ${notifResult.failed} fallaron` : ""}
                  </p>
                )}
                {notifError && (
                  <p style={{ fontSize: 13, color: "#C53340", fontWeight: 700, margin: 0 }}>
                    Error: {notifError}
                  </p>
                )}
              </div>
            </section>

          </div>
        )}

  
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="¿Eliminar alumno?"
        description={deleteTarget ? `Se eliminará a ${deleteTarget.label}. Perderá acceso a la app inmediatamente.` : ""}
        confirmLabel="Sí, eliminar" destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void executeDelete()}
      />
    </>
  );
}

function ApprovedUserRow({ user, groups, onChangeGroup, onDelete }: {
  user: UserRow; groups: string[];
  onChangeGroup: (id: string, group: string) => void;
  onDelete: (user: UserRow) => void;
}) {
  return (
    <div style={userCardStyle}>
      <Avatar url={user.avatar_url} name={user.full_name ?? user.username} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={userName}>{user.full_name ?? user.username ?? "—"}</p>
        {user.username && <p style={userSub}>@{user.username}</p>}
      </div>
      <select value={user.group_name ?? ""} onChange={(e) => onChangeGroup(user.id, e.target.value)} style={groupSelect}>
        <option value="">Sin grupo</option>
        {groups.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>
      <button type="button" onClick={() => onDelete(user)} style={iconBtn("rgba(230,57,70,0.10)")} aria-label="Eliminar">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="#C53340" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em",
  textTransform: "uppercase", margin: "0 4px 10px", display: "flex", alignItems: "center",
};
const cardStyle: React.CSSProperties = {
  background: "#FFFFFF", borderRadius: 16, padding: "4px 14px 14px",
  boxShadow: "0 2px 10px rgba(26,26,46,0.07)", display: "flex", flexDirection: "column",
};
const userCardStyle: React.CSSProperties = {
  background: "#FFFFFF", borderRadius: 16, padding: "12px 14px",
  display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 10px rgba(26,26,46,0.07)",
};
const userName: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: "#1A1A2E", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const userSub: React.CSSProperties = { fontSize: 11, color: "#9CA3AF", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const emptyCard: React.CSSProperties = { background: "#FFFFFF", borderRadius: 16, padding: 20, textAlign: "center", boxShadow: "0 2px 10px rgba(26,26,46,0.07)", color: "#9CA3AF", fontSize: 14 };
const groupSelect: React.CSSProperties = { border: "none", borderRadius: 10, background: "#F7F3ED", color: "#1A1A2E", padding: "8px 10px", fontSize: 13, fontWeight: 700, outline: "none", flexShrink: 0, maxWidth: 110, fontFamily: "inherit" };
const fieldStyle: React.CSSProperties = { border: "none", borderRadius: 12, background: "#F7F3ED", color: "#1A1A2E", padding: "10px 13px", fontSize: 14, fontWeight: 600, outline: "none", fontFamily: "inherit" };
const btnSmall: React.CSSProperties = { border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 };
function iconBtn(bg: string): React.CSSProperties {
  return { width: 36, height: 36, borderRadius: "50%", background: bg, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
}
