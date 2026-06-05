"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type UserRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  group_name: string | null;
  email: string | null;
  is_approved: boolean | null;
};

function AvatarCircle({ url, name, size = 48 }: { url: string | null; name: string | null; size?: number }) {
  const initial = ((name ?? "?").charAt(0)).toUpperCase();
  // generate a stable color from name
  const colors = ["#E63946", "#4ECDC4", "#A8DADC", "#F4A261", "#8338EC", "#3A86FF", "#FB8500"];
  const colorIndex = (name ?? "?").charCodeAt(0) % colors.length;

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
      background: colors[colorIndex],
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: "#FFFFFF", flexShrink: 0,
    }}>
      {initial}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M20 6L9 17l-5-5" stroke="#4ECDC4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18M6 6l12 12" stroke="#E63946" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AdminUsuariosPage() {
  const router = useRouter();
  const [pending, setPending] = useState<UserRow[]>([]);
  const [approved, setApproved] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // Group editing state: userId → draft value | null (not editing)
  const [editingGroup, setEditingGroup] = useState<Record<string, string | null>>({});
  const groupInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async (accessToken: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/requests", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) { setLoading(false); return; }
      const { pending: p, past: a } = await res.json();
      setPending((p ?? []) as UserRow[]);
      setApproved((a ?? []) as UserRow[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      const t = data.session?.access_token ?? null;
      setToken(t);
      if (t) load(t);
    }
    init();
  }, [load]);

  async function handleApprove(user: UserRow) {
    await supabase.from("profiles")
      .update({ is_approved: true, group_name: user.group_name ?? "Estudiante" })
      .eq("id", user.id);
    setPending((prev) => prev.filter((u) => u.id !== user.id));
    setApproved((prev) => [{ ...user, is_approved: true }, ...prev]);
  }

  async function handleReject(user: UserRow) {
    if (!token) return;
    await fetch(`/api/admin/users/${user.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setPending((prev) => prev.filter((u) => u.id !== user.id));
  }

  function startEditGroup(user: UserRow) {
    setEditingGroup((prev) => ({ ...prev, [user.id]: user.group_name ?? "" }));
    setTimeout(() => groupInputRefs.current[user.id]?.focus(), 50);
  }

  function cancelEditGroup(userId: string) {
    setEditingGroup((prev) => { const next = { ...prev }; delete next[userId]; return next; });
  }

  async function saveGroup(user: UserRow) {
    const newGroup = editingGroup[user.id];
    if (newGroup === null || newGroup === undefined) return;
    await supabase.from("profiles").update({ group_name: newGroup.trim() || null }).eq("id", user.id);
    setApproved((prev) => prev.map((u) => u.id === user.id ? { ...u, group_name: newGroup.trim() || null } : u));
    cancelEditGroup(user.id);
  }

  return (
    <div style={{ background: "#FFF8E7", minHeight: "100vh", display: "flex", flexDirection: "column", paddingBottom: "48px" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "20px 20px 0" }}>
        <button
          onClick={() => router.push("/")}
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
          Usuarios
        </h1>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#9CA3AF", padding: "60px 0" }}>Cargando...</div>
      ) : (
        <div style={{ padding: "24px 16px 0", display: "flex", flexDirection: "column", gap: "28px" }}>

          {/* Section 1 — Pending */}
          <div>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 4px 12px" }}>
              Solicitudes de acceso
            </p>
            {pending.length === 0 ? (
              <div style={{ background: "#FFFFFF", borderRadius: "1.5rem", padding: "24px", textAlign: "center", boxShadow: "0 2px 12px rgba(26,26,46,0.07)", color: "#9CA3AF", fontSize: "15px" }}>
                Sin solicitudes pendientes
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {pending.map((user) => (
                  <div key={user.id} style={{
                    background: "#FFFFFF", borderRadius: "1.5rem", padding: "14px 16px",
                    display: "flex", alignItems: "center", gap: "12px",
                    boxShadow: "0 2px 12px rgba(26,26,46,0.07)",
                  }}>
                    <AvatarCircle url={user.avatar_url} name={user.username ?? user.full_name} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "15px", fontWeight: 700, color: "#1A1A2E", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {user.username ?? user.full_name ?? "—"}
                      </p>
                      <p style={{ fontSize: "12px", color: "#9CA3AF", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {user.email ?? "sin email"}
                      </p>
                    </div>
                    {/* Approve */}
                    <button
                      onClick={() => handleApprove(user)}
                      style={{
                        width: "40px", height: "40px", borderRadius: "50%",
                        background: "rgba(78,205,196,0.15)", border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}
                      aria-label="Aprobar"
                    >
                      <CheckIcon />
                    </button>
                    {/* Reject */}
                    <button
                      onClick={() => handleReject(user)}
                      style={{
                        width: "40px", height: "40px", borderRadius: "50%",
                        background: "rgba(230,57,70,0.12)", border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}
                      aria-label="Rechazar"
                    >
                      <XIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2 — Approved */}
          <div>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 4px 12px" }}>
              Todos los usuarios
            </p>
            {approved.length === 0 ? (
              <div style={{ background: "#FFFFFF", borderRadius: "1.5rem", padding: "24px", textAlign: "center", boxShadow: "0 2px 12px rgba(26,26,46,0.07)", color: "#9CA3AF", fontSize: "15px" }}>
                Sin usuarios
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {approved.map((user) => {
                  const isEditing = editingGroup[user.id] !== undefined && editingGroup[user.id] !== null;
                  return (
                    <div key={user.id} style={{
                      background: "#FFFFFF", borderRadius: "1.5rem", padding: "14px 16px",
                      display: "flex", alignItems: "center", gap: "12px",
                      boxShadow: "0 2px 12px rgba(26,26,46,0.07)",
                    }}>
                      <AvatarCircle url={user.avatar_url} name={user.username ?? user.full_name} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "15px", fontWeight: 700, color: "#1A1A2E", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {user.username ?? user.full_name ?? "—"}
                        </p>
                        <p style={{ fontSize: "12px", color: "#9CA3AF", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {user.group_name ?? "Sin grupo"}
                        </p>
                      </div>

                      {/* Group chip / editor */}
                      {isEditing ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                          <input
                            ref={(el) => { groupInputRefs.current[user.id] = el; }}
                            value={editingGroup[user.id] ?? ""}
                            onChange={(e) => setEditingGroup((prev) => ({ ...prev, [user.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") saveGroup(user); if (e.key === "Escape") cancelEditGroup(user.id); }}
                            style={{
                              width: "110px", border: "none", borderBottom: "2px solid #4ECDC4",
                              background: "transparent", outline: "none", fontSize: "13px",
                              fontWeight: 600, color: "#1A1A2E", padding: "2px 0", fontFamily: "inherit",
                            }}
                          />
                          <button onClick={() => saveGroup(user)} style={{ background: "#4ECDC4", border: "none", borderRadius: "999px", padding: "4px 10px", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "#1A1A2E" }}>✓</button>
                          <button onClick={() => cancelEditGroup(user.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "#9CA3AF", padding: "4px" }}>✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditGroup(user)}
                          style={{
                            display: "flex", alignItems: "center", gap: "6px",
                            background: "#F0EDE8", border: "none", borderRadius: "999px",
                            padding: "7px 12px", cursor: "pointer", flexShrink: 0,
                          }}
                        >
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "#1A1A2E", maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {user.group_name ?? "Sin grupo"}
                          </span>
                          <span style={{ color: "#9CA3AF", flexShrink: 0 }}><PencilIcon /></span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
