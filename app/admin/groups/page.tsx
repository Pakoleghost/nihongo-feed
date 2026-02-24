"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<{ name: string }[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => { fetchGroups(); }, []);

  const fetchGroups = async () => {
    const { data } = await supabase.from("groups").select("name").order("name");
    if (data) setGroups(data);
  };

  const fetchStudents = async (groupName: string) => {
    setSelectedGroup(groupName);
    const { data } = await supabase.from("profiles").select("id, username, group_name").eq("group_name", groupName);
    setStudents(data || []);
  };

  const renameGroup = async (oldName: string) => {
    if (!renameValue) return;
    // 1. Actualizar tabla de grupos
    await supabase.from("groups").update({ name: renameValue }).eq("name", oldName);
    // 2. Actualizar a todos los alumnos que estaban en ese grupo
    await supabase.from("profiles").update({ group_name: renameValue }).eq("group_name", oldName);
    
    setEditingGroup(null);
    fetchGroups();
    if (selectedGroup === oldName) fetchStudents(renameValue);
  };

  const changeStudentGroup = async (studentId: string, newGroup: string) => {
    await supabase.from("profiles").update({ group_name: newGroup }).eq("id", studentId);
    if (selectedGroup) fetchStudents(selectedGroup);
  };

  return (
    <div style={{ maxWidth: "800px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Panel de Control de Clases</h1>
      
      {/* CREAR GRUPO */}
      <div style={{ marginBottom: "30px", display: "flex", gap: "10px" }}>
        <input 
          type="text" placeholder="Nueva clase (ej. Genki 1 - Lunes)" 
          value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
          style={{ flex: 1, padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }}
        />
        <button onClick={async () => {
          await supabase.from("groups").insert([{ name: newGroupName }]);
          setNewGroupName("");
          fetchGroups();
        }} style={{ padding: "10px", backgroundColor: "#2cb696", color: "#fff", border: "none", borderRadius: "5px" }}>+ Crear</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* LISTA DE GRUPOS */}
        <div>
          <h3>Tus Clases</h3>
          {groups.map((g) => (
            <div key={g.name} style={{ display: "flex", justifyContent: "space-between", padding: "10px", border: "1px solid #eee", marginBottom: "5px", borderRadius: "5px", backgroundColor: selectedGroup === g.name ? "#e6f7f3" : "#fff" }}>
              {editingGroup === g.name ? (
                <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onBlur={() => renameGroup(g.name)} autoFocus />
              ) : (
                <span onClick={() => fetchStudents(g.name)} style={{ cursor: "pointer", fontWeight: "bold" }}>🏫 {g.name}</span>
              )}
              <button onClick={() => { setEditingGroup(g.name); setRenameValue(g.name); }} style={{ fontSize: "12px", background: "none", border: "none", color: "#888", cursor: "pointer" }}>✏️</button>
            </div>
          ))}
        </div>

        {/* LISTA DE ALUMNOS */}
        <div>
          <h3>Alumnos en {selectedGroup || "..."}</h3>
          {students.length > 0 ? students.map((s) => (
            <div key={s.id} style={{ padding: "10px", borderBottom: "1px solid #eee", fontSize: "14px" }}>
              <strong>{s.username}</strong>
              <select 
                value={s.group_name} 
                onChange={(e) => changeStudentGroup(s.id, e.target.value)}
                style={{ marginLeft: "10px", fontSize: "12px" }}
              >
                {groups.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
              </select>
            </div>
          )) : <p style={{ color: "#999" }}>Selecciona una clase para ver a los alumnos.</p>}
        </div>
      </div>
    </div>
  );
}