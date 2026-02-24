"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<{ name: string }[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const router = useRouter();

  const SIN_GRUPO_LABEL = "⚠️ Sin asignar";

  const fetchGroups = useCallback(async () => {
    const { data } = await supabase.from("groups").select("name").order("name");
    const allGroups = data ? [...data, { name: SIN_GRUPO_LABEL }] : [{ name: SIN_GRUPO_LABEL }];
    setGroups(allGroups);
  }, []);

  const fetchStudents = async (groupName: string) => {
    setSelectedGroup(groupName);
    setLoadingStudents(true);
    
    let query = supabase.from("profiles").select("id, username, group_name");
    
    if (groupName === SIN_GRUPO_LABEL) {
      // BUSCA ALUMNOS CON CAMPO NULO O VACÍO
      query = query.or('group_name.is.null,group_name.eq.""');
    } else {
      query = query.eq("group_name", groupName);
    }

    const { data, error } = await query.order("username", { ascending: true });
    
    if (error) console.error("Error cargando alumnos:", error);
    setStudents(data || []);
    setLoadingStudents(false);
  };

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const renameGroup = async (oldName: string) => {
    if (!renameValue || oldName === SIN_GRUPO_LABEL) return;
    await supabase.from("groups").update({ name: renameValue }).eq("name", oldName);
    await supabase.from("profiles").update({ group_name: renameValue }).eq("group_name", oldName);
    setEditingGroup(null);
    fetchGroups();
    if (selectedGroup === oldName) fetchStudents(renameValue);
  };

  const changeStudentGroup = async (studentId: string, newGroup: string) => {
    const groupToSave = newGroup === SIN_GRUPO_LABEL ? null : newGroup;
    const { error } = await supabase
      .from("profiles")
      .update({ group_name: groupToSave })
      .eq("id", studentId);

    if (!error && selectedGroup) {
      fetchStudents(selectedGroup);
    }
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "40px auto", padding: "0 20px", fontFamily: "sans-serif", color: "#333" }}>
      <header style={{ marginBottom: "30px" }}>
        <button onClick={() => router.push("/")} style={{ background: "none", border: "none", color: "#2cb696", cursor: "pointer", fontWeight: "bold", fontSize: "14px", padding: 0 }}>
          ← Volver al Home
        </button>
        <h1 style={{ fontSize: "24px", margin: "10px 0" }}>Control de Alumnos</h1>
      </header>
      
      {/* CREAR GRUPO */}
      <div style={{ marginBottom: "30px", display: "flex", gap: "10px", backgroundColor: "#fff", padding: "15px", borderRadius: "10px", border: "1px solid #eee" }}>
        <input 
          type="text" placeholder="Nombre de nueva clase..." 
          value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
          style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid #ddd" }}
        />
        <button onClick={async () => {
          if (!newGroupName) return;
          await supabase.from("groups").insert([{ name: newGroupName }]);
          setNewGroupName("");
          fetchGroups();
        }} style={{ padding: "10px 20px", backgroundColor: "#2cb696", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
          Crear Clase
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "20px" }}>
        
        {/* LISTA DE CLASES */}
        <div style={{ backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #eee", overflow: "hidden" }}>
          <div style={{ padding: "10px 15px", backgroundColor: "#f9f9f9", borderBottom: "1px solid #eee", fontSize: "12px", color: "#888", fontWeight: "bold" }}>MIS GRUPOS</div>
          {groups.map((g) => (
            <div key={g.name} 
              onClick={() => fetchStudents(g.name)}
              style={{ 
                display: "flex", justifyContent: "space-between", padding: "12px 15px", cursor: "pointer",
                borderBottom: "1px solid #f9f9f9", backgroundColor: selectedGroup === g.name ? "#eefaf5" : "transparent"
              }}>
              <span style={{ fontWeight: selectedGroup === g.name ? "bold" : "normal", color: g.name === SIN_GRUPO_LABEL ? "#d9534f" : "#333" }}>
                {g.name}
              </span>
              {g.name !== SIN_GRUPO_LABEL && (
                <button onClick={(e) => { e.stopPropagation(); setEditingGroup(g.name); setRenameValue(g.name); }} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer" }}>✏️</button>
              )}
            </div>
          ))}
        </div>

        {/* LISTA DE ALUMNOS */}
        <div style={{ backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #eee", minHeight: "300px" }}>
          <div style={{ padding: "10px 15px", backgroundColor: "#f9f9f9", borderBottom: "1px solid #eee", fontSize: "12px", color: "#888", fontWeight: "bold" }}>
            ALUMNOS EN: {selectedGroup?.toUpperCase() || "---"}
          </div>
          
          {loadingStudents ? (
            <p style={{ padding: "20px", textAlign: "center", color: "#999" }}>Cargando...</p>
          ) : students.length > 0 ? (
            students.map((s) => (
              <div key={s.id} style={{ padding: "12px 15px", borderBottom: "1px solid #f9f9f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: "500" }}>{s.username}</span>
                <select 
                  value={s.group_name || SIN_GRUPO_LABEL} 
                  onChange={(e) => changeStudentGroup(s.id, e.target.value)}
                  style={{ padding: "5px", borderRadius: "4px", border: "1px solid #ddd", fontSize: "13px" }}
                >
                  {groups.map(g => (
                    <option key={g.name} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>
            ))
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: "#ccc" }}>
              <p style={{ margin: 0 }}>No hay alumnos para mostrar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}