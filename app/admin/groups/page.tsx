"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import ConfirmDialog from "@/components/ConfirmDialog";

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

  const fetchData = useCallback(async () => {
    const { data: grps } = await supabase.from("groups").select("name").order("name");
    setGroups(grps || []);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
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
    <div style={{ maxWidth: "800px", margin: "40px auto", padding: "0 20px", fontFamily: "sans-serif" }}>
      <nav style={{ marginBottom: "20px", display: "flex", gap: "20px", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
        <Link href="/" style={{ color: "#2cb696", textDecoration: "none", fontWeight: "bold" }}>← Volver</Link>
        <button onClick={() => setActiveTab('groups')} style={{ border: "none", background: "none", fontWeight: activeTab === 'groups' ? "bold" : "normal", color: activeTab === 'groups' ? "#2cb696" : "#888", cursor: "pointer" }}>Grupos</button>
        <button onClick={() => setActiveTab('approvals')} style={{ border: "none", background: "none", fontWeight: activeTab === 'approvals' ? "bold" : "normal", color: activeTab === 'approvals' ? "#d9534f" : "#888", cursor: "pointer" }}>Solicitudes ({pendingUsers.length})</button>
      </nav>

      {activeTab === 'approvals' ? (
        <div>
          {pendingUsers.length === 0 ? <p style={{color: "#999", textAlign: "center"}}>No hay solicitudes pendientes.</p> : 
            pendingUsers.map(u => (
              <div key={u.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "15px", border: "1px solid #eee", borderRadius: "10px", marginBottom: "10px", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#333" }}>{u.full_name || u.username || "Sin nombre"}</div>
                  {u.username && <div style={{ fontSize: "12px", color: "#888" }}>@{u.username}</div>}
                  {u.email && <div style={{ fontSize: "12px", color: "#888" }}>{u.email}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <select
                    value={pendingGroupByUser[u.id] || ""}
                    onChange={(e) => setPendingGroupByUser((prev) => ({ ...prev, [u.id]: e.target.value }))}
                    style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ddd" }}
                  >
                    <option value="">Elegir grupo…</option>
                    {groups.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
                  </select>
                  <button onClick={() => handleApprove(u.id)} style={{ backgroundColor: "#2cb696", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>Aprobar</button>
                  <button onClick={() => handleDeleteUser(u.id)} style={{ backgroundColor: "#fff", color: "#b42318", border: "1px solid #f3c7c1", padding: "8px 12px", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>Borrar</button>
                </div>
              </div>
            ))
          }

          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 10, color: "#555" }}>Solicitudes pasadas</h3>
            {pastRequests.length === 0 ? (
              <p style={{ color: "#999" }}>Aún no hay solicitudes aprobadas registradas.</p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {pastRequests.map((u) => (
                  <div key={u.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "12px 14px", border: "1px solid #f0f0f0", borderRadius: 10, background: "#fafafa" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#333" }}>{u.full_name || u.username || "Sin nombre"}</div>
                      {u.username && <div style={{ fontSize: "12px", color: "#888" }}>@{u.username}</div>}
                      {u.email && <div style={{ fontSize: "12px", color: "#888" }}>{u.email}</div>}
                    </div>
                    <button onClick={() => handleDeleteUser(u.id)} style={{ backgroundColor: "#fff", color: "#b42318", border: "1px solid #f3c7c1", padding: "8px 12px", borderRadius: "5px", cursor: "pointer", fontWeight: "bold", height: "fit-content" }}>Borrar</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ backgroundColor: "#f9f9f9", padding: "15px", borderRadius: "10px", marginBottom: "20px", display: "flex", gap: "10px" }}>
            <input 
              type="text" 
              placeholder="Nombre del nuevo grupo..." 
              value={newGroupName} 
              onChange={e => setNewGroupName(e.target.value)}
              style={{ flex: 1, padding: "8px", borderRadius: "5px", border: "1px solid #ddd" }}
            />
            <button onClick={handleCreateGroup} style={{ backgroundColor: "#333", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>+ Crear Grupo</button>
          </div>

          <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} style={{ marginBottom: "20px", padding: "10px", borderRadius: "8px", width: "100%", border: "1px solid #ddd" }}>
            <option value="Todos">Ver todos los alumnos</option>
            {groups.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
          </select>

          {students.map(s => {
            return (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "15px", borderBottom: "1px solid #eee", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <Link href={`/profile/${s.id}`} style={{ fontWeight: "bold", textDecoration: "none", color: "#333", display: "block" }}>
                    {s.full_name || s.username || "Sin nombre"}
                  </Link>
                  {s.username && <div style={{ fontSize: "12px", color: "#888" }}>@{s.username}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <select value={s.group_name || ""} onChange={e => handleUpdateGroup(s.id, e.target.value)} style={{ padding: "5px", borderRadius: "5px", border: "1px solid #ddd" }}>
                    <option value="">Sin grupo</option>
                    {groups.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
                  </select>
                  <button onClick={() => handleDeleteUser(s.id)} style={{ backgroundColor: "#fff", color: "#b42318", border: "1px solid #f3c7c1", padding: "8px 10px", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
                    Borrar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
