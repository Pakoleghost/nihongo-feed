"use client";

import { useEffect, useState, useCallback } from "react";
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

  // 1. Verificar permisos y cargar grupos
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

  // 2. Cargar datos cruzados (Matriz)
  const loadMatrixData = useCallback(async (groupName: string) => {
    if (!groupName) return;
    setLoading(true);
    setSelectedGroup(groupName);

    // Alumnos del grupo
    const { data: stud } = await supabase.from("profiles").select("id, username, full_name").eq("group_name", groupName).order("username");
    
    // Tareas que TÚ publicaste para este grupo
    const { data: asgn } = await supabase.from("posts")
      .select("id, content, deadline, is_forum")
      .eq("type", "assignment")
      .eq("target_group", groupName)
      .order("created_at", { ascending: true });

    // Entregas que los alumnos han hecho vinculadas a esas tareas
    const { data: subs } = await supabase.from("posts")
      .select("id, user_id, parent_assignment_id, is_reviewed, created_at")
      .eq("type", "assignment")
      .not("parent_assignment_id", "is", null);

    setStudents(stud || []);
    setAssignments(asgn || []);
    setSubmissions(subs || []);
    setLoading(false);
  }, []);

  const getStatus = (studentId: string, assignmentId: number) => {
    const sub = submissions.find(s => s.user_id === studentId && s.parent_assignment_id === assignmentId);
    if (!sub) return { icon: "❌", color: "#fff5f5", text: "Pendiente" };
    const assignment = assignments.find(a => a.id === assignmentId);
    const isLate = assignment?.deadline ? new Date(sub.created_at).getTime() > new Date(assignment.deadline).getTime() : false;
    if (sub.is_reviewed) return { icon: isLate ? "⏰" : "済", color: isLate ? "#fff7ed" : "#f0fdf4", text: isLate ? "Revisado (tardía)" : "Revisado", id: sub.id };
    if (isLate) return { icon: "⏰", color: "#fff7ed", text: "Entregado tarde", id: sub.id };
    return { icon: "📥", color: "#fffbeb", text: "Entregado", id: sub.id };
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "40px auto", padding: "0 20px", fontFamily: "sans-serif", color: "#333" }}>
      
      {/* NAVEGACIÓN IDÉNTICA AL OTRO PANEL */}
      <nav style={{ marginBottom: "30px", borderBottom: "1px solid #eee", paddingBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "20px" }}>
          <Link href="/admin/groups" style={{ textDecoration: "none", color: "#888", fontWeight: "500" }}>
            Alumnos y Grupos
          </Link>
          <Link href="/admin/assignments" style={{ textDecoration: "none", color: "#2cb696", fontWeight: "bold", borderBottom: "2px solid #2cb696", paddingBottom: "15px", marginBottom: "-17px" }}>
            Matriz de Tareas (Shukudai)
          </Link>
        </div>
        <Link href="/" style={{ textDecoration: "none", color: "#888", fontSize: "14px" }}>← Volver al Home</Link>
      </nav>

      <header style={{ marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: "24px", margin: "0 0 5px 0" }}>Control de Entregas</h1>
          <p style={{ color: "#888", fontSize: "14px", margin: 0 }}>Visualiza quién ha completado las tareas de cada grupo.</p>
        </div>
        
        <select 
          onChange={(e) => loadMatrixData(e.target.value)} 
          style={{ padding: "10px 15px", borderRadius: "8px", border: "1px solid #ddd", width: "250px", outline: "none", cursor: "pointer" }}
        >
          <option value="">Selecciona un grupo...</option>
          {groups.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
        </select>
      </header>

      {loading ? (
        <div style={{ textAlign: "center", padding: "100px", color: "#999" }}>Generando matriz...</div>
      ) : selectedGroup && assignments.length > 0 ? (
        <div style={{ overflowX: "auto", backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #eee", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ backgroundColor: "#fcfcfc", borderBottom: "2px solid #eee" }}>
                <th style={{ padding: "20px", textAlign: "left", borderRight: "1px solid #eee", width: "200px", color: "#999", fontWeight: "bold", fontSize: "11px", textTransform: "uppercase" }}>Alumno</th>
                {assignments.map(a => (
                  <th key={a.id} style={{ padding: "15px", minWidth: "100px", textAlign: "center", color: "#666" }}>
                    <div title={a.content.split('\n')[0]}>
                      {a.content.split('\n')[0].substring(0, 12)}...
                      {a.deadline && <div style={{ fontSize: "10px", color: "#999", marginTop: "4px" }}>⏱</div>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                  <td style={{ padding: "15px 20px", fontWeight: "600", borderRight: "1px solid #eee", color: "#444" }}>
                    <div>{s.full_name || s.username}</div>
                    {s.username && s.full_name && <div style={{ fontSize: "11px", color: "#999", fontWeight: 500 }}>@{s.username}</div>}
                  </td>
                  {assignments.map(a => {
                    const status = getStatus(s.id, a.id);
                    return (
                      <td key={a.id} style={{ padding: "0", textAlign: "center", backgroundColor: status.color }}>
                        {status.id ? (
                          <Link href={`/post/${status.id}`} style={{ textDecoration: "none", display: "block", padding: "15px", fontSize: "16px" }}>
                            {status.icon}
                          </Link>
                        ) : (
                          <div style={{ padding: "15px", color: "#ccc", fontSize: "14px" }}>{status.icon}</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : selectedGroup ? (
        <div style={{ textAlign: "center", padding: "80px", backgroundColor: "#f9f9f9", borderRadius: "12px", border: "1px solid #eee" }}>
          <p style={{ margin: 0, color: "#999" }}>No has publicado ninguna tarea para el grupo <strong>{selectedGroup}</strong> aún.</p>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "100px", color: "#ccc" }}>
          <p style={{ fontSize: "40px", margin: "0 0 10px 0" }}>📊</p>
          <p>Selecciona un grupo arriba para ver el progreso de los alumnos.</p>
        </div>
      )}
    </div>
  );
}
