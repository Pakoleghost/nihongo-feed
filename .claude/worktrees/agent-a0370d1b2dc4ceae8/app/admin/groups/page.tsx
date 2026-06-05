"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import ConfirmDialog from "@/components/ConfirmDialog";
import AppTopNav from "@/components/AppTopNav";
import { useStudentViewMode } from "@/lib/use-student-view-mode";

const cardStyle = {
  background: "#FFFFFF",
  borderRadius: 24,
  padding: 18,
  boxShadow: "0 8px 24px rgba(26,26,46,0.08)",
} satisfies React.CSSProperties;

const pillButtonStyle = {
  border: "none",
  borderRadius: 999,
  padding: "10px 14px",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
} satisfies React.CSSProperties;

export default function AdminGroupsPage() {
  const [activeTab, setActiveTab] = useState<'groups' | 'approvals'>('groups');
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("Todos");
  const [students, setStudents] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [pastRequests, setPastRequests] = useState<any[]>([]);
  const [pendingGroupByUser, setPendingGroupByUser] = useState<Record<string, string>>({});
  const [newGroupName, setNewGroupName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [isCurrentAdmin, setIsCurrentAdmin] = useState(false);
  const { studentViewActive, studentViewGroupName, setStudentViewActive, setStudentViewGroupName } =
    useStudentViewMode(isCurrentAdmin);

  const fetchData = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId = sessionData.session?.user.id;
    if (currentUserId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", currentUserId)
        .maybeSingle();
      setIsCurrentAdmin(Boolean(profile?.is_admin));
    } else {
      setIsCurrentAdmin(false);
    }

    const { data: grps } = await supabase.from("groups").select("name").order("name");
    setGroups(grps || []);
    
    try {
      const accessToken = sessionData.session?.access_token;
      const response = await fetch("/api/admin/requests", {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (response.ok) {
        const payload = await response.json();
        const pending = payload?.pending || [];
        const past = payload?.past || [];
        setPendingUsers(pending);
        setPastRequests(past);
        setPendingGroupByUser((prev) => {
          const next = { ...prev };
          const fallbackGroup = grps?.[0]?.name || "";
          pending.forEach((u: any) => {
            if (!next[u.id]) next[u.id] = fallbackGroup;
          });
          return next;
        });
      } else {
        const { data: pending } = await supabase.from("profiles").select("*").eq("is_approved", false);
        setPendingUsers(pending || []);
        setPastRequests([]);
      }
    } catch {
      const { data: pending } = await supabase.from("profiles").select("*").eq("is_approved", false);
      setPendingUsers(pending || []);
      setPastRequests([]);
    }
    
    let query = supabase.from("profiles").select("*").eq("is_approved", true);
    if (selectedGroup !== "Todos") query = query.eq("group_name", selectedGroup);
    const { data: stds } = await query.order("username");
    setStudents(stds || []);
  }, [selectedGroup]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    const { error } = await supabase.from("groups").insert([{ name: newGroupName.trim() }]);
    if (!error) {
      setNewGroupName("");
      fetchData();
    }
  };

  const handleUpdateGroup = async (userId: string, newGroup: string) => {
    const { error } = await supabase.from("profiles").update({ group_name: newGroup }).eq("id", userId);
    if (!error) fetchData();
  };

  const handleApprove = async (userId: string) => {
    const selected = pendingGroupByUser[userId] || "";
    if (!selected) {
      alert("Selecciona un grupo para aprobar.");
      return;
    }
    await supabase.from("profiles").update({ is_approved: true, group_name: selected }).eq("id", userId);
    fetchData();
  };

  const handleDeleteUser = async (userId: string) => {
    const target = [...pendingUsers, ...students, ...pastRequests].find((u: any) => u.id === userId);
    if (!target) return;
    setDeleteTarget({ id: userId, label: target.full_name || target.username || userId });
  };

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: "DELETE",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        alert(payload?.error || "No se pudo borrar el usuario.");
        return;
      }
      fetchData();
    } catch {
      alert("No se pudo borrar el usuario.");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
    <div style={{ background: "#FFF8E7", minHeight: "100vh", padding: "18px 16px 48px" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        <AppTopNav secondary="admin" />

        <header style={{ marginTop: 18, marginBottom: 18 }}>
          <p style={{ margin: 0, color: "#9CA3AF", fontSize: 12, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Administración
          </p>
          <h1 style={{ margin: "6px 0 0", color: "#1A1A2E", fontSize: 34, fontWeight: 900, lineHeight: 1 }}>
            Panel de control
          </h1>
          <p style={{ margin: "8px 0 0", color: "#53596B", fontSize: 15, lineHeight: 1.4 }}>
            Gestiona acceso, grupos, foros y revisa cómo se ve la app para estudiantes.
          </p>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginBottom: 18 }}>
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: 0, color: "#9CA3AF", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Acceso
                </p>
                <h2 style={{ margin: "8px 0 0", color: "#1A1A2E", fontSize: 22, fontWeight: 900 }}>Solicitudes</h2>
              </div>
              <span style={{ borderRadius: 999, background: pendingUsers.length ? "rgba(230,57,70,0.12)" : "rgba(78,205,196,0.14)", color: pendingUsers.length ? "#C53340" : "#178A83", padding: "7px 10px", fontSize: 13, fontWeight: 900 }}>
                {pendingUsers.length}
              </span>
            </div>
            <p style={{ margin: "10px 0 16px", color: "#53596B", fontSize: 14, lineHeight: 1.4 }}>
              Aprueba estudiantes nuevos y asígnales grupo.
            </p>
            <button type="button" onClick={() => setActiveTab("approvals")} style={{ ...pillButtonStyle, background: "#E63946", color: "#FFFFFF" }}>
              Revisar solicitudes
            </button>
          </div>

          <div style={cardStyle}>
            <p style={{ margin: 0, color: "#9CA3AF", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Comunidad
            </p>
            <h2 style={{ margin: "8px 0 0", color: "#1A1A2E", fontSize: 22, fontWeight: 900 }}>Foros de clase</h2>
            <p style={{ margin: "10px 0 16px", color: "#53596B", fontSize: 14, lineHeight: 1.4 }}>
              Entra a los foros para moderar, fijar o cerrar temas.
            </p>
            <Link href="/comunidad/foros" style={{ ...pillButtonStyle, display: "inline-flex", textDecoration: "none", background: "#1A1A2E", color: "#FFFFFF" }}>
              Abrir foros
            </Link>
          </div>

          <div style={cardStyle}>
            <p style={{ margin: 0, color: "#9CA3AF", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Vista
            </p>
            <h2 style={{ margin: "8px 0 0", color: "#1A1A2E", fontSize: 22, fontWeight: 900 }}>Vista de estudiante</h2>
            <p style={{ margin: "10px 0 16px", color: "#53596B", fontSize: 14, lineHeight: 1.4 }}>
              Elige un grupo y revisa la app sin controles admin.
            </p>
            <label
              style={{
                display: "grid",
                gap: 6,
                marginBottom: 12,
                color: "#53596B",
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              Grupo de vista
              <select
                value={studentViewGroupName ?? ""}
                disabled={!isCurrentAdmin}
                onChange={(event) => setStudentViewGroupName(event.target.value || null)}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: 14,
                  background: "#F8F4EE",
                  color: "#1A1A2E",
                  padding: "10px 12px",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: isCurrentAdmin ? "pointer" : "not-allowed",
                }}
              >
                <option value="">Usar mi grupo</option>
                {groups.map((group) => (
                  <option key={group.name} value={group.name}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={!isCurrentAdmin}
              onClick={() => setStudentViewActive(!studentViewActive)}
              style={{ ...pillButtonStyle, background: studentViewActive ? "#4ECDC4" : "#FFFFFF", color: !isCurrentAdmin ? "#9CA3AF" : "#1A1A2E", boxShadow: "inset 0 0 0 1px rgba(26,26,46,0.10)", cursor: isCurrentAdmin ? "pointer" : "not-allowed" }}
            >
              {!isCurrentAdmin ? "Solo admin" : studentViewActive ? "Salir de vista" : "Activar vista"}
            </button>
          </div>

          <div style={cardStyle}>
            <p style={{ margin: 0, color: "#9CA3AF", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Curso
            </p>
            <h2 style={{ margin: "8px 0 0", color: "#1A1A2E", fontSize: 22, fontWeight: 900 }}>Recursos</h2>
            <p style={{ margin: "10px 0 16px", color: "#53596B", fontSize: 14, lineHeight: 1.4 }}>
              Los materiales se administran directamente desde Recursos.
            </p>
            <Link href="/recursos" style={{ ...pillButtonStyle, display: "inline-flex", textDecoration: "none", background: "#FFFFFF", color: "#1A1A2E", boxShadow: "inset 0 0 0 1px rgba(26,26,46,0.10)" }}>
              Ir a Recursos
            </Link>
          </div>
        </section>

        <section style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: 18, borderBottom: "1px solid rgba(26,26,46,0.08)" }}>
            <p style={{ margin: 0, color: "#9CA3AF", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Gestión rápida
            </p>
            <h2 style={{ margin: "6px 0 0", color: "#1A1A2E", fontSize: 24, fontWeight: 900 }}>
              Usuarios y grupos
            </h2>
          </div>

          <nav style={{ display: "flex", gap: 8, padding: 14, background: "#F8F4EE", overflowX: "auto" }}>
            <button
              type="button"
              onClick={() => setActiveTab("groups")}
              style={{ ...pillButtonStyle, background: activeTab === "groups" ? "#1A1A2E" : "#FFFFFF", color: activeTab === "groups" ? "#FFFFFF" : "#53596B", flexShrink: 0 }}
            >
              Usuarios y grupos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("approvals")}
              style={{ ...pillButtonStyle, background: activeTab === "approvals" ? "#1A1A2E" : "#FFFFFF", color: activeTab === "approvals" ? "#FFFFFF" : "#53596B", flexShrink: 0 }}
            >
              Solicitudes ({pendingUsers.length})
            </button>
          </nav>

          <div style={{ padding: 18 }}>
            {activeTab === 'approvals' ? (
              <div>
                {pendingUsers.length === 0 ? <p style={{color: "#9CA3AF", textAlign: "center", padding: "16px 0"}}>No hay solicitudes pendientes.</p> :
                  pendingUsers.map(u => (
                    <div key={u.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "14px 0", borderBottom: "1px solid rgba(26,26,46,0.08)", alignItems: "center", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 800, color: "#1A1A2E" }}>{u.full_name || u.username || "Sin nombre"}</div>
                        {u.username && <div style={{ fontSize: "12px", color: "#888" }}>@{u.username}</div>}
                        {u.email && <div style={{ fontSize: "12px", color: "#888" }}>{u.email}</div>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <select
                          value={pendingGroupByUser[u.id] || ""}
                          onChange={(e) => setPendingGroupByUser((prev) => ({ ...prev, [u.id]: e.target.value }))}
                          style={{ padding: "9px 10px", borderRadius: "12px", border: "none", background: "#F8F4EE", width: "auto" }}
                        >
                          <option value="">Elegir grupo…</option>
                          {groups.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
                        </select>
                        <button onClick={() => handleApprove(u.id)} style={{ ...pillButtonStyle, background: "#4ECDC4", color: "#1A1A2E" }}>Aprobar</button>
                        <button onClick={() => handleDeleteUser(u.id)} style={{ ...pillButtonStyle, background: "rgba(230,57,70,0.10)", color: "#C53340" }}>Borrar</button>
                      </div>
                    </div>
                  ))
                }

                <div style={{ marginTop: 24 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 10, color: "#1A1A2E" }}>Solicitudes pasadas</h3>
                  {pastRequests.length === 0 ? (
                    <p style={{ color: "#9CA3AF" }}>Aún no hay solicitudes aprobadas registradas.</p>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {pastRequests.map((u) => (
                        <div key={u.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "12px 0", borderBottom: "1px solid rgba(26,26,46,0.06)" }}>
                          <div>
                            <div style={{ fontWeight: 800, color: "#1A1A2E" }}>{u.full_name || u.username || "Sin nombre"}</div>
                            {u.username && <div style={{ fontSize: "12px", color: "#888" }}>@{u.username}</div>}
                            {u.email && <div style={{ fontSize: "12px", color: "#888" }}>{u.email}</div>}
                          </div>
                          <button onClick={() => handleDeleteUser(u.id)} style={{ ...pillButtonStyle, background: "rgba(230,57,70,0.10)", color: "#C53340", height: "fit-content" }}>Borrar</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ backgroundColor: "#F8F4EE", padding: "14px", borderRadius: "18px", marginBottom: "16px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    placeholder="Nombre del nuevo grupo..."
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    style={{ flex: "1 1 180px", padding: "10px 12px", borderRadius: "12px", border: "none" }}
                  />
                  <button onClick={handleCreateGroup} style={{ ...pillButtonStyle, background: "#1A1A2E", color: "#FFFFFF" }}>Crear grupo</button>
                </div>

                <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} style={{ marginBottom: "16px", padding: "11px 12px", borderRadius: "14px", width: "100%", border: "none", background: "#F8F4EE" }}>
                  <option value="Todos">Ver todos los alumnos</option>
                  {groups.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
                </select>

                {students.map(s => {
                  return (
                    <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid rgba(26,26,46,0.08)", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <Link href={`/profile/${s.id}`} style={{ fontWeight: "bold", textDecoration: "none", color: "#1A1A2E", display: "block" }}>
                          {s.full_name || s.username || "Sin nombre"}
                        </Link>
                        {s.username && <div style={{ fontSize: "12px", color: "#888" }}>@{s.username}</div>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <select value={s.group_name || ""} onChange={e => handleUpdateGroup(s.id, e.target.value)} style={{ padding: "8px 10px", borderRadius: "12px", border: "none", background: "#F8F4EE", width: "auto" }}>
                          <option value="">Sin grupo</option>
                          {groups.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
                        </select>
                        <button onClick={() => handleDeleteUser(s.id)} style={{ ...pillButtonStyle, background: "rgba(230,57,70,0.10)", color: "#C53340" }}>
                          Borrar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
    <ConfirmDialog
      open={Boolean(deleteTarget)}
      title="¿Borrar usuario?"
      description={deleteTarget ? `Se borrará ${deleteTarget.label} para permitir re-registro limpio.` : ""}
      confirmLabel="Sí, borrar"
      destructive
      onCancel={() => setDeleteTarget(null)}
      onConfirm={() => void confirmDeleteUser()}
    />
    </>
  );
}
