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

  // 1. Cargar la lista de grupos (incluyendo la opción manual de "Sin asignar")
  const fetchGroups = useCallback(async () => {
    const { data } = await supabase.from("groups").select("name").order("name");
    // Agregamos manualmente la opción para ver alumnos sin clase
    const allGroups = data ? [...data, { name: "⚠️ Sin asignar" }] : [{ name: "⚠️ Sin asignar" }];
    setGroups(allGroups);
  }, []);

  // 2. Cargar alumnos de un grupo específico o los que no tienen grupo
  const fetchStudents = async (groupName: string) => {
    setSelectedGroup(groupName);
    setLoadingStudents(true);
    
    let query = supabase.from("profiles").select("id, username, group_name");
    
    if (groupName === "⚠️ Sin asignar") {
      // Busca alumnos antiguos con campo nulo o vacío
      query = query.or('group_name.is.null,group_name.eq.""');
    } else {
      query = query.eq("group_name", groupName);
    }

    const { data } = await query;
    setStudents(data || []);
    setLoadingStudents(false);
  };

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const renameGroup = async (oldName: string) => {
    if (!renameValue || oldName === "⚠️ Sin asignar") return;
    
    // Actualizar tabla de grupos
    await supabase.from("groups").update({ name: renameValue }).eq("name", oldName);
    // Actualizar a todos los alumnos vinculados
    await supabase.from("profiles").update({ group_name: renameValue }).eq("group_name", oldName);
    
    setEditingGroup(null);
    fetchGroups();
    if (selectedGroup === oldName) fetchStudents(renameValue);
  };

  const changeStudentGroup = async (studentId: string, newGroup: string) => {
    // Si lo movemos desde "Sin asignar" a una clase real
    const groupToSave = newGroup === "⚠️ Sin asignar" ? null : newGroup;
    
    const { error } = await supabase
      .from("profiles")
      .update({ group_name: groupToSave })
      .eq("id", studentId);

    if (!error && selectedGroup) {
      fetchStudents(selectedGroup);
    }
  };

  return (
    <div style={{ maxWidth: "900px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif" }}>
      <button onClick={() => router.push("/")} style={{ marginBottom: "20px", background: "none", border: "none", color: "#2cb696", cursor: "pointer", fontWeight: "bold" }}>
        ← Volver al Home
      </button>

      <h1>Panel de Control de Clases</h1>
      
      {/* SECCIÓN CREAR GRUPO */}
      <div style={{ marginBottom: "30px", display: "flex", gap: "10px", backgroundColor: "#f9f9f9", padding: "15px", borderRadius: "8px" }}>
        <input 
          type="text" placeholder="Nueva clase (ej. Genki 1 - Martes)" 
          value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
          style={{ flex: 1, padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }}
        />
        <button onClick={async () => {
          if (!newGroupName) return;
          await supabase.from("groups").insert([{ name: newGroupName }]);
          setNewGroupName("");
          fetchGroups();
        }} style={{ padding: "10px 20px", backgroundColor: "#2cb696", color: "#fff", border: "none", borderRadius: "5px", fontWeight: "bold", cursor: "pointer" }}>
          + Crear Clase
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
        
        {/* COLUMNA IZQUIERDA: LISTA DE CLASES */}
        <div>
          <h3 style={{ borderBottom: "2px solid #2cb696", paddingBottom: "10px" }}>Tus Clases</h3>
          {groups.map((g) => (
            <div key={g.name} style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              padding: "12px", 
              border: "1px solid #eee", 
              marginBottom: "8px", 
              borderRadius: "8px", 
              backgroundColor: selectedGroup === g.name ? "#e6f7f3" : "#fff",
              boxShadow: selectedGroup === g.name ? "0 2px 4px rgba(0,0,0,0.05)" : "none"
            }}>
              {editingGroup === g.name && g.name !== "⚠️ Sin asignar" ? (
                <input 
                  value={renameValue} 
                  onChange={(e) => setRenameValue(e.target.value)} 
                  onBlur={() => renameGroup(g.name)} 
                  autoFocus 
                  style={{ padding: "4px", width: "150px" }}
                />
              ) : (
                <span 
                  onClick={() => fetchStudents(g.name)} 
                  style={{ cursor: "pointer", fontWeight: "bold", color: g.name === "⚠️ Sin asignar" ? "#d9534f" : "#333" }}
                >
                  {g.name}
                </span>
              )}
              
              {g.name !== "⚠️ Sin asignar" && (
                <button 
                  onClick={() => { setEditingGroup(g.name); setRenameValue(g.name); }} 
                  style={{ fontSize: "14px", background: "none", border: "none", color: "#888", cursor: "pointer" }}
                >
                  ✏️
                </button>
              )}
            </div>
          ))}
        </div>

        {/* COLUMNA DERECHA: LISTA DE ALUMNOS */}
        <div>
          <h3 style={{ borderBottom: "2px solid #2cb696", paddingBottom: "10px" }}>
            Alumnos {selectedGroup ? `en ${selectedGroup}` : ""}
          </h3>
          
          {loadingStudents ? (
            <p style={{ color: "#999" }}>Cargando lista...</p>
          ) : students.length > 0 ? (
            students.map((s) => (
              <div key={s.id} style={{ 
                padding: "15px", 
                borderBottom: "1px solid #eee", 
                backgroundColor: "#fff",
                display: "flex",
                flexDirection: "column",
                gap: "5px"
              }}>
                <strong style={{ fontSize: "16px" }}>{s.username}</strong>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "12px", color: "#888" }}>Asignar a:</span>
                  <select 
                    value={s.group_name || "⚠️ Sin asignar"} 
                    onChange={(e) => changeStudentGroup(s.id, e.target.value)}
                    style={{ padding: "4px", fontSize: "13px", borderRadius: "4px", border: "1px solid #ccc" }}
                  >
                    {groups.map(g => (
                      <option key={g.name} value={g.name}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: "center", padding: "40px", color: "#ccc" }}>
              <p style={{ fontSize: "40px", margin: 0 }}>👥</p>
              <p>Selecciona una clase para ver o mover alumnos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}