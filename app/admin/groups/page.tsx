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
      // Corrección: Filtramos alumnos donde group_name es NULL o es un string vacío
      query = query.or('group_name.is.null,group_name.eq.""');
    } else {
      query = query.eq("group_name", groupName);
    }

    const { data, error } = await query.order("username", { ascending: true });
    
    if (error) {
      console.error("Error al buscar alumnos:", error);
    } else {
      setStudents(data || []);
    }
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
      <header style={{ marginBottom: "40px" }}>
        <button onClick={() => router.push("/")} style={{ background: "none", border: "none", color: "#2cb696", cursor: "pointer", fontWeight: "bold", padding: 0, fontSize: "14px" }}>
          ← Panel de Inicio
        </button>
        <h1 style={{ fontSize: "28px", margin: "10px 0 5px 0" }}>Control de Alumnos</h1>
        <p style={{ color: "#888", margin: 0 }}>Gestiona grupos y asigna alumnos a sus clases correspondientes.</p>
      </header>
      
      {/* CREAR GRUPO */}
      <div style={{ marginBottom: "30px", display: "flex", gap: "12px", backgroundColor: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #eee", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <input 
          type="text" placeholder="Ej: Genki 1 - Martes y Jueves" 
          value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
          style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px" }}
        />
        <button onClick={async () => {
          if (!newGroupName) return;
          await supabase.from("groups").insert([{ name: newGroupName }]);
          setNewGroupName("");
          fetchGroups();
        }} style={{ padding: "12px 24px", backgroundColor: "#2cb696", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>
          Crear Clase
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "30px", alignItems: "start" }}>
        
        {/* LISTA DE CLASES */}
        <div style={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #eee", overflow: "hidden" }}>
          <h3 style={{ padding: "15px 20px", margin: 0, backgroundColor: "#fcfcfc", borderBottom: "1px solid #eee", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#999" }}>Tus Clases</h3>
          {groups.map((g) => (
            <div key={g.name} 
              onClick={() => fetchStudents(g.name)}
              style={{ 
                display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 20px", cursor: "pointer",
                borderBottom: "1px solid #f5f5f5", backgroundColor: selectedGroup === g.name ? "#eefaf5" : "transparent",
                transition: "background 0.2s"
              }}>
              {editingGroup === g.name && g.name !== SIN_GRUPO_LABEL ? (
                <input 
                  value={renameValue} onChange={(e) => setRenameValue(e.target.value)} 
                  onBlur={() => renameGroup(g.name)} autoFocus 
                  style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #2cb696", width: "80%" }}
                />
              ) : (
                <span style={{ fontWeight: selectedGroup === g.name ? "bold" : "normal", color: g.name === SIN_GRUPO_LABEL ? "#d9534f" : "#333" }}>
                  {g.name === SIN_GRUPO_LABEL ? "👤 " : "🏫 "} {g.name}
                </span>
              )}
              {g.name !== SIN_GRUPO_LABEL && (
                <button onClick={(e) => { e.stopPropagation(); setEditingGroup(g.name); setRenameValue(g.name); }} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer" }}>✏️</button>
              )}
            </div>
          ))}
        </div>

        {/* LISTA DE ALUMNOS */}
        <div style={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #eee", minHeight: "400px" }}>
          <h3 style={{ padding: "15px 20px", margin: 0, backgroundColor: "#fcfcfc", borderBottom: "1px solid #eee", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#999" }}>
            Alumnos {selectedGroup ? `en ${selectedGroup}` : ""}
          </h3>
          
          {loadingStudents ? (
            <p style={{ padding: "40px", textAlign: "center", color: "#999" }}>Cargando alumnos...</p>
          ) : students.length > 0 ? (
            students.map((s) => (
              <div key={s.id} style={{ padding: "15px 20px", borderBottom: "1px solid #f5f5f5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: "bold", fontSize: "15px" }}>{s.username}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "12px", color: "#aaa" }}>Mover a:</span>
                  <select 
                    value={s.group_name || SIN_GRUPO_LABEL} 
                    onChange={(e) => changeStudentGroup(s.id, e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px", outline: "none" }}
                  >
                    {groups.map(g => (
                      <option key={g.name} value={g.name}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#ccc" }}>
              <div style={{ fontSize: "40px", marginBottom: "10px" }}>{selectedGroup ? "空" : "👈"}</div>
              <p>{selectedGroup ? "No hay alumnos en esta clase." : "Selecciona una clase de la izquierda para ver a los alumnos."}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}