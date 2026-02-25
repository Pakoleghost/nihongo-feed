"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";

export default function StudentProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: me } = await supabase.from("profiles").select("*").eq("id", user?.id).single();
    const { data: target } = await supabase.from("profiles").select("*").eq("id", id).single();
    
    setMyProfile(me);
    setProfile(target);

    if (target) {
      // Tareas y Foros del grupo
      const { data: asgn } = await supabase.from("posts").select("*").eq("target_group", target.group_name).eq("type", "assignment");
      // Entregas (posts hijos)
      const { data: subs } = await supabase.from("posts").select("*").eq("user_id", id).not("parent_assignment_id", "is", null);
      // Participaciones en Foros (comentarios)
      const { data: comms } = await supabase.from("comments").select("post_id").eq("user_id", id);
      
      setAssignments(asgn || []);
      setSubmissions([...(subs || []), ...(comms || [])]); // Combinamos entregas y comentarios
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateLevel = async (field: string, val: string) => {
    await supabase.from("profiles").update({ [field]: val }).eq("id", id);
    fetchData();
  };

  if (loading || !profile) return <div style={{ padding: "50px", textAlign: "center" }}>Cargando...</div>;

  return (
    <div style={{ maxWidth: "650px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif" }}>
      <header style={{ textAlign: "center", marginBottom: "40px" }}>
        <div style={{ width: "100px", height: "100px", borderRadius: "50%", backgroundColor: "#eee", margin: "0 auto 15px", overflow: "hidden" }}>
          {profile.avatar_url && <img src={profile.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        </div>
        <h1>{profile.full_name || profile.username}</h1>
        <p style={{ color: "#888" }}>{profile.group_name} • {profile.bio || "Sin biografía"}</p>
      </header>

      {/* GESTIÓN DE NIVELES (Solo para ti) */}
      {myProfile?.is_admin && (
        <div style={{ backgroundColor: "#f9f9f9", padding: "20px", borderRadius: "15px", marginBottom: "30px", border: "1px solid #eee" }}>
          <h3 style={{ fontSize: "14px", color: "#999", marginBottom: "15px" }}>PANEL DE SENSEI</h3>
          <div style={{ display: "flex", gap: "20px" }}>
            <div>
              <label style={{ fontSize: "11px", display: "block" }}>NIVEL CURSO</label>
              <select value={profile.cefr_level || ""} onChange={e => updateLevel("cefr_level", e.target.value)} style={{ padding: "5px", borderRadius: "5px" }}>
                {["A1.1", "A1.2", "A2.1", "A2.2", "A2+", "B1.1", "B1.2"].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "11px", display: "block" }}>JLPT</label>
              <select value={profile.jlpt_level || ""} onChange={e => updateLevel("jlpt_level", e.target.value)} style={{ padding: "5px", borderRadius: "5px" }}>
                {["Ninguno", "N5", "N4", "N3", "N2", "N1"].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* LISTA DE PROGRESO */}
      <section>
        <h3>Progreso de Tareas y Foros</h3>
        {assignments.map(a => {
          const isDone = submissions.some(s => s.parent_assignment_id === a.id || s.post_id === a.id);
          return (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "15px", borderBottom: "1px solid #eee" }}>
              <span>{a.content.split('\n')[0]} {a.is_forum && "(Foro)"}</span>
              <span style={{ fontWeight: "bold", color: isDone ? "#2cb696" : "#f87171" }}>
                {isDone ? "✅ Completado" : "❌ Pendiente"}
              </span>
            </div>
          );
        })}
      </section>
    </div>
  );
}