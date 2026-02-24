"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminGroups() {
  const [groupName, setGroupName] = useState("");
  const [groups, setGroups] = useState<{name: string}[]>([]);

  const fetchGroups = async () => {
    const { data } = await supabase.from("groups").select("name").order("name");
    if (data) setGroups(data);
  };

  useEffect(() => { fetchGroups(); }, []);

  const addGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("groups").insert([{ name: groupName }]);
    if (error) alert("Ese grupo ya existe o hubo un error");
    else {
      setGroupName("");
      fetchGroups();
    }
  };

  return (
    <div style={{ maxWidth: "500px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif" }}>
      <h2>Panel de Control: Crear Clases</h2>
      <form onSubmit={addGroup} style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input 
          type="text" placeholder="Nombre de la nueva clase..." value={groupName} 
          onChange={(e) => setGroupName(e.target.value)} required 
          style={{ flex: 1, padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }}
        />
        <button type="submit" style={{ padding: "10px 20px", backgroundColor: "#2cb696", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
          Añadir
        </button>
      </form>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {groups.map((g, i) => (
          <li key={i} style={{ padding: "10px", borderBottom: "1px solid #eee" }}>🏫 {g.name}</li>
        ))}
      </ul>
    </div>
  );
}