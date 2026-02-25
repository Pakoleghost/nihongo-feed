"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminGroupsPage() {
  const [activeTab, setActiveTab] = useState<'groups' | 'approvals'>('groups');
  const [groups, setGroups] = useState<{ name: string }[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const SIN_GRUPO_LABEL = "⚠️ Sin asignar";

  const fetchInitialData = useCallback(async () => {
    const { data: grps } = await supabase.from("groups").select("name").order("name");
    setGroups(grps ? [...grps, { name: SIN_GRUPO_LABEL }] : [{ name: SIN_GRUPO_LABEL }]);
    
    // Alumnos que no han sido aprobados
    const { data: pending } = await supabase.from("profiles").select("*").eq("is_approved", false).order("created_at");
    setPendingUsers(pending || []);
  }, []);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  const approveUser = async (userId: string) => {
    const { error } = await supabase.from("profiles").update({ is_approved: true }).eq("id", userId);
    if (!error) fetchInitialData();
  };

  const fetchStudents = async (groupName: string) => {
    setSelectedGroup(groupName);
    setLoading(true);
    let query = supabase.from("profiles").select("*").eq("is_approved", true);
    if (groupName === SIN_GRUPO_LABEL) {
      query = query.or('group_name.is.null,group_name.eq."",group_name.eq."Sin Grupo"');
    } else {
      query = query.eq("group_name", groupName);
    }
    const { data } = await query.order("username");
    setStudents(data || []);
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "40px auto", padding: "0 20px", fontFamily: "sans-serif" }}>
      <nav style={{ marginBottom: "30px", borderBottom: "1px solid #eee", display: "flex", gap: "20px" }}>
        <Link href="/admin/groups" style={{ color: "#2cb696", fontWeight: "bold", borderBottom: "2px solid #2cb696", paddingBottom: "15px", textDecoration: "none" }}>Gestión</Link>
        <Link href="/admin/assignments" style={{ color: "#888", textDecoration: "none" }}>Matriz Tareas</Link>
        <Link href="/admin/resources" style={{ color: "#888", textDecoration: "none" }}>Recursos 📚</Link>
        <Link href="/" style={{ color: "#888", textDecoration: "none", marginLeft: "auto" }}>← Home</Link>
      </nav>

      <div style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
        <button onClick={() => setActiveTab('groups')} style={{ padding: "10px 20px", borderRadius: "8px", border: "none", backgroundColor: activeTab === 'groups' ? "#333" : "#eee", color: activeTab === 'groups' ? "#fff" : "#333", cursor: "pointer", fontWeight: "bold" }}>Grupos y Alumnos</button>
        <button onClick={() => setActiveTab('approvals')} style={{ padding: "10px 20px", borderRadius: "8px", border: "none", backgroundColor: activeTab === 'approvals' ? "#d9534f" : "#eee", color: activeTab === 'approvals' ? "#fff" : "#333", cursor: "pointer", fontWeight: "bold" }}>
          Solicitudes {pendingUsers.length > 0 && `(${pendingUsers.length})`}
        </button>
      </div>

      {activeTab === 'approvals' ? (
        <section style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #eee" }}>
          <h3 style={{ marginTop: 0 }}>Nuevos Registros</h3>
          {pendingUsers.length === 0 ? <p style={{ color: "#999" }}>No hay solicitudes pendientes.</p> : 
            pendingUsers.map(u => (
              <div key={u.id} style={{ display: "flex", justifyContent: "space-between", padding: "15px", borderBottom: "1px solid #f5f5f5", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: "bold" }}>{u.username}</div>
                  <div style={{ fontSize: "12px", color: "#888" }}>{new Date(u.created_at).toLocaleDateString()}</div>
                </div>
                <button onClick={() => approveUser(u.id)} style={{ backgroundColor: "#2cb696", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>Autorizar Alumno</button>
              </div>
            ))
          }
        </section>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "20px" }}>
          <div style={{ border: "1px solid #eee", borderRadius: "12px", overflow: "hidden" }}>
            {groups.map(g => (
              <div key={g.name} onClick={() => fetchStudents(g.name)} style={{ padding: "15px", cursor: "pointer", backgroundColor: selectedGroup === g.name ? "#eefaf5" : "#fff", borderBottom: "1px solid #f5f5f5", fontWeight: selectedGroup === g.name ? "bold" : "normal" }}>{g.name}</div>
            ))}
          </div>
          <div style={{ border: "1px solid #eee", borderRadius: "12px", padding: "20px", minHeight: "300px" }}>
            {loading ? "Cargando..." : (
              students.length > 0 ? students.map(s => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f9f9f9" }}>
                  <span style={{ fontWeight: "500" }}>{s.username}</span>
                  <Link href={`/profile/${s.id}`} style={{ fontSize: "12px", color: "#2cb696", textDecoration: "none", fontWeight: "bold" }}>Ver Perfil →</Link>
                </div>
              )) : <p style={{ textAlign: "center", color: "#ccc", marginTop: "50px" }}>Selecciona un grupo para ver alumnos.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}