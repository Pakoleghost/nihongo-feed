"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AssignmentTracker() {
  const router = useRouter();
  const [groups, setGroups] = useState<{ name: string }[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data: prof } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
      if (!prof?.is_admin) return router.push("/");

      const { data: grps } = await supabase.from("groups").select("name").order("name");
      setGroups(grps || []);
    };
    init();
  }, [router]);

  const loadData = async (groupName: string) => {
    setLoading(true);
    setSelectedGroup(groupName);

    // 1. Cargar Alumnos del grupo
    const { data: stud } = await supabase.from("profiles").select("id, username").eq("group_name", groupName);
    
    // 2. Cargar Tareas (Assignments) creadas para ese grupo
    const { data: asgn } = await supabase.from("posts").select("id, content, created_at")
      .eq("type", "assignment")
      .eq("target_group", groupName)
      .order("created_at", { ascending: true });

    // 3. Cargar todas las entregas de ese grupo
    const { data: subs } = await supabase.from("posts").select("id, user_id, parent_assignment_id, is_reviewed")
      .eq("type", "assignment")
      .not("parent_assignment_id", "is", null);

    setStudents(stud || []);
    setAssignments(asgn || []);
    setSubmissions(subs || []);
    setLoading(false);
  };

  const getStatus = (studentId: string, assignmentId: number) => {
    const sub = submissions.find(s => s.user_id === studentId && s.parent_assignment_id === assignmentId);
    if (!sub) return { icon: "❌", color: "#fee2e2", text: "Pendiente" };
    if (sub.is_reviewed) return { icon: "済", color: "#dcfce7", text: "Revisado" };
    return { icon: "📥", color: "#fef9c3", text: "Entregado", id: sub.id };
  };

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "1200px", margin: "0 auto" }}>
      <header style={{ marginBottom: "30px" }}>
        <Link href="/" style={{ color: "#2cb696", textDecoration: "none", fontWeight: "bold" }}>← Volver</Link>
        <h1 style={{ fontSize: "24px", margin: "10px 0" }}>Seguimiento de Tareas (宿題)</h1>
        
        <select 
          onChange={(e) => loadData(e.target.value)} 
          style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", width: "250px" }}
        >
          <option value="">Selecciona un grupo...</option>
          {groups.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
        </select>
      </header>

      {selectedGroup && (
        <div style={{ overflowX: "auto", backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #eee" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f9f9f9", borderBottom: "2px solid #eee" }}>
                <th style={{ padding: "15px", textAlign: "left", borderRight: "1px solid #eee" }}>Alumno</th>
                {assignments.map(a => (
                  <th key={a.id} style={{ padding: "10px", minWidth: "120px", textAlign: "center", fontSize: "11px" }}>
                    {a.content.split('\n')[0].substring(0, 15)}...
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "15px", fontWeight: "bold", borderRight: "1px solid #eee" }}>{s.username}</td>
                  {assignments.map(a => {
                    const status = getStatus(s.id, a.id);
                    return (
                      <td key={a.id} style={{ padding: "10px", textAlign: "center", backgroundColor: status.color }}>
                        {status.id ? (
                          <Link href={`/post/${status.id}`} style={{ textDecoration: "none", fontSize: "16px" }}>
                            {status.icon}
                          </Link>
                        ) : (
                          <span style={{ fontSize: "16px" }}>{status.icon}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {!selectedGroup && <p style={{ textAlign: "center", color: "#999", marginTop: "50px" }}>Selecciona un grupo para ver la matriz de entregas.</p>}
    </div>
  );
}