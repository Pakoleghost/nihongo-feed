"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
      query = query.or('group_name.is.null,group_name.eq."",group_name.eq."Sin Grupo"');
    } else {
      query = query.eq("group_name", groupName);
    }
    const { data } = await query.order("username", { ascending: true });
    setStudents(data || []);
    setLoadingStudents(false);
  };

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const changeStudentGroup = async (studentId: string, newGroup: string) => {
    const groupToSave = newGroup === SIN_GRUPO_LABEL ? null : newGroup;
    const { error } = await supabase.from("profiles").update({ group_name: groupToSave }).eq("id", studentId);
    if (!error && selectedGroup) fetchStudents(selectedGroup);
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "40px auto", padding: "0 20px", fontFamily: "sans-serif", color: "#333" }}>
      
      {/* NAVEGACIÓN DEL PANEL */}
      <nav style={{ marginBottom: "30px", borderBottom: "1px solid #eee", paddingBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "20px" }}>
          <Link href="/admin/groups" style={{ textDecoration: "none", color: "#2cb696", fontWeight: "bold", borderBottom: "2px solid #2cb696", paddingBottom: "15px", marginBottom: "-17px" }}>
            Alumnos y Grupos
          </Link>
          <Link href="/admin/assignments" style={{ textDecoration: "none", color: "#888", fontWeight: "500" }}>
            Matriz de Tareas (Shukudai)
          </Link>
        </div>
        <Link href="/" style={{ textDecoration: "none", color: "#888", fontSize: "14px" }}>← Volver al Home</Link>
      </nav>

      <header style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "24px", margin: "0 0 10px 0" }}>Gestión de Clases</h1>
        <p style={{ color: "#888", fontSize: "14px" }}>Crea grupos y organiza a tus alumnos antiguos o nuevos.</p>
      </header>
      
      {/* SECCIÓN CREAR GRUPO */}
      <div style={{ marginBottom: "30px", display: "flex", gap: "10px", backgroundColor: "#f9f9f9", padding: "20px", borderRadius: "12px" }}>
        <input 
          type="text" placeholder="Nombre de la nueva clase..." 
          value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
          style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #ddd" }}
        />
        <button onClick={async () => {
          if (!newGroupName) return;
          await supabase.from("groups").insert([{ name: newGroupName }]);
          setNewGroupName("");
          fetchGroups();
        }} style={{ padding: "12px 24px", backgroundColor: "#2cb696", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>
          + Crear Grupo
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "30px" }}>
        
        {/* COLUMNA GRUPOS */}
        <div style={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #eee", overflow: "hidden" }}>
          <div style={{ padding: "12px 15px", backgroundColor: "#fcfcfc", borderBottom: "1px solid #eee", fontSize: "11px", fontWeight: "bold", color: "#999" }}>GRUPOS ACTIVOS</div>
          {groups.map((g) => (
            <div key={g.name} 
              onClick={() => fetchStudents(g.name)}
              style={{ 
                display: "flex", justifyContent: "space-between", padding: "14px 15px", cursor: "pointer",
                borderBottom: "1px solid #f9f9f9", backgroundColor: selectedGroup === g.name ? "#eefaf5" : "transparent"
              }}>
              <span style={{ fontWeight: selectedGroup === g.name ? "700" : "400", color: g.name === SIN_GRUPO_LABEL ? "#d9534f" : "#333" }}>
                {g.name}
              </span>
            </div>
          ))}
        </div>

        {/* COLUMNA ALUMNOS */}
        <div style={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #eee", minHeight: "400px" }}>
          <div style={{ padding: "12px 15px", backgroundColor: "#fcfcfc", borderBottom: "1px solid #eee", fontSize: "11px", fontWeight: "bold", color: "#999" }}>
            LISTA DE ALUMNOS: {selectedGroup || "---"}
          </div>
          
          {loadingStudents ? (
            <p style={{ padding: "30px", textAlign: "center", color: "#999" }}>Cargando datos...</p>
          ) : students.length > 0 ? (
            students.map((s) => (
              <div key={s.id} style={{ padding: "15px", borderBottom: "1px solid #f9f9f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: "500" }}>{s.username}</span>
                <select 
                  value={s.group_name || SIN_GRUPO_LABEL} 
                  onChange={(e) => changeStudentGroup(s.id, e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px" }}
                >
                  {groups.map(g => (
                    <option key={g.name} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>
            ))
          ) : (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "#ccc" }}>
              <p>Selecciona un grupo a la izquierda para gestionar alumnos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}