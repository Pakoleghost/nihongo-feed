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

  const fetchData = useCallback(async () => {
    const { data: grps } = await supabase.from("groups").select("name").order("name");
    setGroups(grps || []);
    const { data: pending } = await supabase.from("profiles").select("*").eq("is_approved", false);
    setPendingUsers(pending || []);
    
    let query = supabase.from("profiles").select("*").eq("is_approved", true);
    if (selectedGroup !== "Todos") query = query.eq("group_name", selectedGroup);
    const { data: stds } = await query.order("username");
    setStudents(stds || []);
  }, [selectedGroup]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
        <button onClick={() => setActiveTab('groups')} style={{ border: "none", background: "none", fontWeight: activeTab === 'groups' ? "bold" : "normal", color: activeTab === 'groups' ? "#2cb696" : "#888" }}>Grupos</button>
        <button onClick={() => setActiveTab('approvals')} style={{ border: "none", background: "none", fontWeight: activeTab === 'approvals' ? "bold" : "normal", color: activeTab === 'approvals' ? "#d9534f" : "#888" }}>Solicitudes ({pendingUsers.length})</button>
      </nav>

      {activeTab === 'approvals' ? (
        <div>
          {pendingUsers.map(u => (
            <div key={u.id} style={{ display: "flex", justifyContent: "space-between", padding: "15px", border: "1px solid #eee", borderRadius: "10px", marginBottom: "10px" }}>
              <span>{u.username}</span>
              <button onClick={() => handleApprove(u.id)} style={{ backgroundColor: "#2cb696", color: "#fff", border: "none", padding: "5px 15px", borderRadius: "5px" }}>Aprobar</button>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} style={{ marginBottom: "20px", padding: "10px", borderRadius: "8px" }}>
            <option value="Todos">Ver todos los alumnos</option>
            {groups.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
          </select>
          {students.map(s => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "15px", borderBottom: "1px solid #eee", alignItems: "center" }}>
              <Link href={`/profile/${s.id}`} style={{ fontWeight: "bold", textDecoration: "none", color: "#333" }}>{s.username}</Link>
              <select value={s.group_name || ""} onChange={e => handleUpdateGroup(s.id, e.target.value)} style={{ padding: "5px", borderRadius: "5px" }}>
                <option value="">Sin grupo</option>
                {groups.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}