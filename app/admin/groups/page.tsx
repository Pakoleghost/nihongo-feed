"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function AdminGroupsPage() {
  const [activeTab, setActiveTab] = useState<'groups' | 'approvals'>('groups');
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("Todos");
  const [students, setStudents] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  
  // Estados nuevos (Aditivos)
  const [newGroupName, setNewGroupName] = useState("");
  const [assignmentsCount, setAssignmentsCount] = useState<Record<string, number>>({});
  const [submissionsCount, setSubmissionsCount] = useState<Record<string, number>>({});

  const fetchData = useCallback(async () => {
    // 1. Cargar Grupos
    const { data: grps } = await supabase.from("groups").select("name").order("name");
    setGroups(grps || []);
    
    // 2. Cargar Solicitudes Pendientes
    const { data: pending } = await supabase.from("profiles").select("*").eq("is_approved", false);
    setPendingUsers(pending || []);
    
    // 3. Cargar Alumnos
    let query = supabase.from("profiles").select("*").eq("is_approved", true);
    if (selectedGroup !== "Todos") query = query.eq("group_name", selectedGroup);
    const { data: stds } = await query.order("username");
    setStudents(stds || []);

    // 4. Lógica de Resumen de Tareas (Aditivo)
    if (stds) {
      // Contar tareas totales por grupo
      const { data: asgn } = await supabase.from("posts").select("id, target_group").eq("type", "assignment");
      const aCount: Record<string, number> = {};
      asgn?.forEach(a => {
        aCount[a.target_group] = (aCount[a.target_group] || 0) + 1;
        if (a.target_group !== "Todos") aCount["Todos"] = (aCount["Todos"] || 0) + 1;
      });
      setAssignmentsCount(aCount);

      // Contar entregas por alumno
      const studentIds = stds.map(s => s.id);
      const { data: subs } = await supabase.from("posts")
        .select("user_id")
        .in("user_id", studentIds)
        .not("parent_assignment_id", "is", null)
        .eq("type", "assignment");
      
      const sCount: Record<string, number> = {};
      subs?.forEach(s => {
        sCount[s.user_id] = (sCount[s.user_id] || 0) + 1;
      });
      setSubmissionsCount(sCount);
    }
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
    await supabase.from("profiles").update({ is_approved: true }).eq("id", userId);
    fetchData();
  };

  return (
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
              <div key={u.id} style={{ display: "flex", justifyContent: "space-between", padding: "15px", border: "1px solid #eee", borderRadius: "10px", marginBottom: "10px", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#333" }}>{u.full_name || u.username || "Sin nombre"}</div>
                  {u.username && <div style={{ fontSize: "12px", color: "#888" }}>@{u.username}</div>}
                </div>
                <button onClick={() => handleApprove(u.id)} style={{ backgroundColor: "#2cb696", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>Aprobar</button>
              </div>
            ))
          }
        </div>
      ) : (
        <div>
          {/* SECCIÓN CREAR GRUPO (Aditivo) */}
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
            const total = assignmentsCount[s.group_name] || assignmentsCount["Todos"] || 0;
            const done = submissionsCount[s.id] || 0;
            
            return (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "15px", borderBottom: "1px solid #eee", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <Link href={`/profile/${s.id}`} style={{ fontWeight: "bold", textDecoration: "none", color: "#333", display: "block" }}>
                    {s.full_name || s.username || "Sin nombre"}
                  </Link>
                  {s.username && <div style={{ fontSize: "12px", color: "#888" }}>@{s.username}</div>}
                  {/* RESUMEN DE TAREAS (Aditivo) */}
                  <div style={{ fontSize: "11px", color: done >= total && total > 0 ? "#2cb696" : "#888", fontWeight: "bold" }}>
                    Tareas: {done} / {total} {done >= total && total > 0 ? "✅" : ""}
                  </div>
                </div>
                <select value={s.group_name || ""} onChange={e => handleUpdateGroup(s.id, e.target.value)} style={{ padding: "5px", borderRadius: "5px", border: "1px solid #ddd" }}>
                  <option value="">Sin grupo</option>
                  {groups.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
