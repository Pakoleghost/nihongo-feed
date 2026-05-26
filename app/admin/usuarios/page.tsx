"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import ConfirmDialog from "@/components/ConfirmDialog";

type UserRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  group_name: string | null;
  email: string | null;
  is_approved: boolean | null;
};

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
  const [groups, setGroups] = useState<string[]>([]);
  const [pending, setPending] = useState<UserRow[]>([]);
  const [approved, setApproved] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  // New group creation
  const [newGroup, setNewGroup] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Group rename: { old, draft }
  const [renaming, setRenaming] = useState<{ old: string; draft: string } | null>(null);
  const [savingRename, setSavingRename] = useState(false);

  // Pending approval: userId → chosen group
  const [pendingGroupFor, setPendingGroupFor] = useState<Record<string, string>>({});

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadGroups = useCallback(async () => {
    const { data } = await supabase.from("groups").select("name").order("name");
    return (data ?? []).map((g: { name: string }) => g.name) as string[];
  }, []);

  const loadUsers = useCallback(async (accessToken: string) => {
    const res = await fetch("/api/admin/requests", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { pending: [] as UserRow[], approved: [] as UserRow[] };
    const { pending: p, past: a } = await res.json();
    return {
      pending: (p ?? []) as UserRow[],
      approved: (a ?? []) as UserRow[],
    };
  }, []);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      const t = data.session?.access_token ?? null;
      setToken(t);
      const grps = await loadGroups();
      setGroups(grps);
      if (t) {
        const { pending: p, approved: a } = await loadUsers(t);
        setPending(p);
        setApproved(a);
        const firstGroup = grps[0] ?? "";
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

  // Refresh pending selectors when groups change
  useEffect(() => {
    if (!groups.length) return;
    setPendingGroupFor((prev) => {
      const next = { ...prev };
      pending.forEach((u) => { if (!next[u.id]) next[u.id] = groups[0]; });
      return next;
    });
  }, [groups, pending]);

  // ── Group actions ───────────────────────────────────────────────────────────

  async function handleCreateGroup() {
    const name = newGroup.trim();
    if (!name) return;
    setCreatingGroup(true);
    const { error } = await supabase.from("groups").insert([{ name }]);
    if (!error) {
      setNewGroup("");
      const grps = await loadGroups();
      setGroups(grps);
    }
    setCreatingGroup(false);
  }

  async function handleRenameGroup() {
    if (!renaming) return;
    const { old: oldName, draft } = renaming;
    const newName = draft.trim();
    if (!newName || newName === oldName) { setRenaming(null); return; }
    setSavingRename(true);
    // Update groups table
    await supabase.from("groups").update({ name: newName }).eq("name", oldName);
    // Update all profiles with this group
    await supabase.from("profiles").update({ group_name: newName }).eq("group_name", oldName);
    // Update local state
    setGroups((prev) => prev.map((g) => (g === oldName ? newName : g)));
    setApproved((prev) =>
      prev.map((u) => u.group_name === oldName ? { ...u, group_name: newName } : u)
    );
    setSavingRename(false);
    setRenaming(null);
  }

  // ── User actions ────────────────────────────────────────────────────────────

  async function handleApprove(user: UserRow) {
    const group = pendingGroupFor[user.id] ?? groups[0] ?? "";
    if (!group) { alert("Selecciona un grupo antes de aprobar."); return; }
    await supabase.from("profiles")
      .update({ is_approved: true, group_name: group })
      .eq("id", user.id);
    setPending((prev) => prev.filter((u) => u.id !== user.id));
    setApproved((prev) => [{ ...user, is_approved: true, group_name: group }, ...prev]);
  }

  async function handleReject(user: UserRow) {
    if (!token) return;
    await fetch(`/api/admin/users/${user.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setPending((prev) => prev.filter((u) => u.id !== user.id));
  }

  async function handleChangeGroup(userId: string, newGroupName: string) {
    await supabase.from("profiles").update({ group_name: newGroupName || null }).eq("id", userId);
    setApproved((prev) =>
      prev.map((u) => u.id === userId ? { ...u, group_name: newGroupName || null } : u)
    );
  }

  function confirmDelete(user: UserRow) {
    setDeleteTarget({ id: user.id, label: user.full_name ?? user.username ?? user.id });
  }

  async function executeDelete() {
    if (!deleteTarget || !token) return;
    await fetch(`/api/admin/users/${deleteTarget.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setApproved((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  // ── Grouping ────────────────────────────────────────────────────────────────

  const ungrouped = approved.filter((u) => !u.group_name || !groups.includes(u.group_name));
  const groupedApproved = groups.map((g) => ({
    name: g,
    users: approved.filter((u) => u.group_name === g),
  }));

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <div style={{
        background: "#FFF8E7",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "20px 20px 4px" }}>
          <button
            onClick={() => router.back()}
            style={{
              width: "40px", height: "40px", borderRadius: "50%", background: "#FFFFFF",
              border: "none", cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", boxShadow: "0 2px 10px rgba(26,26,46,0.10)", flexShrink: 0,
            }}
            aria-label="Volver"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 5l-7 7 7 7" stroke="#1A1A2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#1A1A2E", margin: 0, lineHeight: 1 }}>
            Alumnos
          </h1>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "#9CA3AF", padding: "60px 0" }}>Cargando…</div>
        ) : (
          <div style={{ padding: "20px 16px 0", display: "flex", flexDirection: "column", gap: "24px" }}>

            {/* ── Groups ───────────────────────────────────────────────────── */}
            <section>
              <p style={sectionLabel}>Grupos</p>
              <div style={card}>

                {/* Existing groups — with rename */}
                {groups.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {groups.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setRenaming({ old: g, draft: g })}
                        style={{
                          display: "flex", alignItems: "center", gap: "5px",
                          background: "#F7F3ED",
                          borderRadius: "999px",
                          border: "none",
                          padding: "6px 12px",
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "#1A1A2E",
                          cursor: "pointer",
                        }}
                      >
                        {g}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                            stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: "13px", color: "#9CA3AF", margin: 0 }}>Sin grupos todavía.</p>
                )}

                {/* Rename inline editor */}
                {renaming && (
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", paddingTop: "4px" }}>
                    <span style={{ fontSize: "12px", color: "#9CA3AF", fontWeight: 600, flexShrink: 0 }}>
                      Renombrar:
                    </span>
                    <input
                      autoFocus
                      value={renaming.draft}
                      onChange={(e) => setRenaming({ ...renaming, draft: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleRenameGroup();
                        if (e.key === "Escape") setRenaming(null);
                      }}
                      style={{ ...fieldStyle, flex: 1 }}
                    />
                    <button
                      type="button"
                      disabled={savingRename}
                      onClick={() => void handleRenameGroup()}
                      style={{ ...btnSmall, background: "#4ECDC4", color: "#1A1A2E" }}
                    >
                      {savingRename ? "…" : "✓"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenaming(null)}
                      style={{ ...btnSmall, background: "#F7F3ED", color: "#9CA3AF" }}
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* New group */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void handleCreateGroup(); }}
                    placeholder="Nuevo grupo…"
                    style={{ ...fieldStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => void handleCreateGroup()}
                    disabled={creatingGroup || !newGroup.trim()}
                    style={{
                      border: "none",
                      borderRadius: "12px",
                      background: !newGroup.trim() ? "#E5E7EB" : "#1A1A2E",
                      color: !newGroup.trim() ? "#9CA3AF" : "#FFFFFF",
                      padding: "0 16px",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: !newGroup.trim() ? "not-allowed" : "pointer",
                      flexShrink: 0,
                    }}
                  >
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
                  <span style={{
                    marginLeft: "8px",
                    background: "rgba(230,57,70,0.12)",
                    color: "#C53340",
                    borderRadius: "999px",
                    padding: "2px 8px",
                    fontSize: "11px",
                    fontWeight: 800,
                  }}>
                    {pending.length}
                  </span>
                )}
              </p>
              {pending.length === 0 ? (
                <div style={emptyCard}>Sin solicitudes pendientes</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {pending.map((user) => (
                    <div key={user.id} style={userCardStyle}>
                      <Avatar url={user.avatar_url} name={user.full_name ?? user.username} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={userName}>{user.full_name ?? user.username ?? "—"}</p>
                        {user.username && <p style={userSub}>@{user.username}</p>}
                        {!user.username && user.email && <p style={userSub}>{user.email}</p>}
                      </div>
                      {/* Group selector */}
                      <select
                        value={pendingGroupFor[user.id] ?? ""}
                        onChange={(e) => setPendingGroupFor((prev) => ({ ...prev, [user.id]: e.target.value }))}
                        style={groupSelect}
                      >
                        <option value="">Elegir…</option>
                        {groups.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                      {/* Approve */}
                      <button type="button" onClick={() => void handleApprove(user)}
                        style={iconBtn("rgba(78,205,196,0.15)")} aria-label="Aprobar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17l-5-5" stroke="#4ECDC4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {/* Reject */}
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

            {/* ── Sin grupo — ARRIBA ────────────────────────────────────────── */}
            {ungrouped.length > 0 && (
              <section>
                <p style={sectionLabel}>
                  Sin grupo
                  <span style={{ marginLeft: "6px", fontSize: "11px", color: "#C4BAB0", fontWeight: 600 }}>
                    {ungrouped.length}
                  </span>
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {ungrouped.map((user) => (
                    <ApprovedUserRow key={user.id} user={user} groups={groups}
                      onChangeGroup={handleChangeGroup} onDelete={confirmDelete} />
                  ))}
                </div>
              </section>
            )}

            {/* ── By group ─────────────────────────────────────────────────── */}
            {groupedApproved.map(({ name, users }) => (
              <section key={name}>
                <p style={sectionLabel}>
                  {name}
                  <span style={{ marginLeft: "6px", fontSize: "11px", color: "#C4BAB0", fontWeight: 600 }}>
                    {users.length} {users.length === 1 ? "alumno" : "alumnos"}
                  </span>
                </p>
                {users.length === 0 ? (
                  <div style={emptyCard}>Sin alumnos en este grupo</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {users.map((user) => (
                      <ApprovedUserRow key={user.id} user={user} groups={groups}
                        onChangeGroup={handleChangeGroup} onDelete={confirmDelete} />
                    ))}
                  </div>
                )}
              </section>
            ))}

          </div>
        )}

        <BottomNav />
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="¿Eliminar alumno?"
        description={deleteTarget
          ? `Se eliminará a ${deleteTarget.label}. Perderá acceso a la app inmediatamente.`
          : ""}
        confirmLabel="Sí, eliminar"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void executeDelete()}
      />
    </>
  );
}

// ─── Approved user row ─────────────────────────────────────────────────────────

function ApprovedUserRow({
  user,
  groups,
  onChangeGroup,
  onDelete,
}: {
  user: UserRow;
  groups: string[];
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
      <select
        value={user.group_name ?? ""}
        onChange={(e) => onChangeGroup(user.id, e.target.value)}
        style={groupSelect}
      >
        <option value="">Sin grupo</option>
        {groups.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>
      <button type="button" onClick={() => onDelete(user)}
        style={iconBtn("rgba(230,57,70,0.10)")} aria-label="Eliminar">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
            stroke="#C53340" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

// ─── Shared styles ─────────────────────────────────────────────────────────────

const sectionLabel: React.CSSProperties = {
  fontSize: "12px", fontWeight: 700, color: "#9CA3AF",
  letterSpacing: "0.08em", textTransform: "uppercase",
  margin: "0 4px 10px", display: "flex", alignItems: "center",
};

const card: React.CSSProperties = {
  background: "#FFFFFF", borderRadius: "16px", padding: "14px",
  boxShadow: "0 2px 10px rgba(26,26,46,0.07)",
  display: "flex", flexDirection: "column", gap: "10px",
};

const userCardStyle: React.CSSProperties = {
  background: "#FFFFFF", borderRadius: "16px", padding: "12px 14px",
  display: "flex", alignItems: "center", gap: "10px",
  boxShadow: "0 2px 10px rgba(26,26,46,0.07)",
};

const userName: React.CSSProperties = {
  fontSize: "14px", fontWeight: 700, color: "#1A1A2E",
  margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
};

const userSub: React.CSSProperties = {
  fontSize: "11px", color: "#9CA3AF",
  margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
};

const emptyCard: React.CSSProperties = {
  background: "#FFFFFF", borderRadius: "16px", padding: "20px",
  textAlign: "center", boxShadow: "0 2px 10px rgba(26,26,46,0.07)",
  color: "#9CA3AF", fontSize: "14px",
};

const groupSelect: React.CSSProperties = {
  border: "none", borderRadius: "10px", background: "#F7F3ED",
  color: "#1A1A2E", padding: "8px 10px", fontSize: "13px",
  fontWeight: 700, outline: "none", flexShrink: 0,
  maxWidth: "110px", fontFamily: "inherit",
};

const fieldStyle: React.CSSProperties = {
  border: "none", borderRadius: "12px", background: "#F7F3ED",
  color: "#1A1A2E", padding: "10px 13px", fontSize: "14px",
  fontWeight: 600, outline: "none", fontFamily: "inherit",
};

const btnSmall: React.CSSProperties = {
  border: "none", borderRadius: "8px", padding: "8px 12px",
  fontSize: "13px", fontWeight: 700, cursor: "pointer", flexShrink: 0,
};

function iconBtn(bg: string): React.CSSProperties {
  return {
    width: "36px", height: "36px", borderRadius: "50%",
    background: bg, border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  };
}
