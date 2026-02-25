"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function StudentProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const cefrLevels = ["A1.1", "A1.2", "A2.1", "A2.2", "A2+", "B1.1", "B1.2"];
  const jlptLevels = ["Ninguno", "N5", "N4", "N3", "N2", "N1"];

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: me } = await supabase.from("profiles").select("*").eq("id", user?.id).single();
    setMyProfile(me);

    const { data: target } = await supabase.from("profiles").select("*").eq("id", id).single();
    setProfile(target);

    const { data: grps } = await supabase.from("groups").select("name");
    setGroups(grps || []);

    if (target) {
      const { data: asgn } = await supabase.from("posts")
        .select("*")
        .eq("type", "assignment")
        .eq("target_group", target.group_name)
        .order("created_at", { ascending: false });
      
      const { data: subs } = await supabase.from("posts")
        .select("*")
        .eq("user_id", id)
        .not("parent_assignment_id", "is", null);

      setAssignments(asgn || []);
      setSubmissions(subs || []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpdate = async (field: string, value: string) => {
    const { error } = await supabase.from("profiles").update({ [field]: value }).eq("id", id);
    if (!error) setProfile({ ...profile, [field]: value });
  };

  if (loading || !profile) return <div style={{ padding: "50px", textAlign: "center" }}>Cargando perfil...</div>;

  const isAdmin = myProfile?.is_admin;

  return (
    <div style={{ maxWidth: "700px", margin: "40px auto", padding: "0 20px", fontFamily: "sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#2cb696", cursor: "pointer", fontWeight: "bold" }}>← Volver</button>
        {isAdmin && (
          <button onClick={() => setIsEditing(!isEditing)} style={{ backgroundColor: isEditing ? "#333" : "#2cb696", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "20px", cursor: "pointer", fontSize: "12px" }}>
            {isEditing ? "Guardar y Cerrar" : "✏️ Editar Niveles / Grupo"}
          </button>
        )}
      </header>

      <section style={{ backgroundColor: "#fff", padding: "30px", borderRadius: "20px", border: "1px solid #eee", textAlign: "center", marginBottom: "30px" }}>
        <div style={{ width: "100px", height: "100px", borderRadius: "50%", overflow: "hidden", margin: "0 auto 15px", border: "3px solid #2cb696" }}>
          {profile.avatar_url ? <img src={profile.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ fontSize: "40px", lineHeight: "100px", backgroundColor: "#f0f0f0" }}>👤</div>}
        </div>

        {isEditing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "300px", margin: "0 auto" }}>
            <input type="text" value={profile.full_name || ""} onChange={(e) => handleUpdate("full_name", e.target.value)} placeholder="Nombre Real" style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ddd", textAlign: "center" }} />
            <select value={profile.group_name || ""} onChange={(e) => handleUpdate("group_name", e.target.value)} style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ddd" }}>
              <option value="">Sin Grupo</option>
              {groups.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
            </select>
          </div>
        ) : (
          <>
            <h1 style={{ margin: "0 0 5px 0", fontSize: "24px" }}>{profile.full_name || profile.username}</h1>
            <p style={{ margin: 0, color: "#888", fontSize: "14px" }}>@{profile.username} • {profile.group_name || "Sin grupo"}</p>
          </>
        )}

        <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "20px" }}>
          <div style={{ padding: "10px 20px", backgroundColor: "#eefaf5", border: "1px solid #2cb696", borderRadius: "12px" }}>
            <div style={{ fontSize: "10px", color: "#2cb696", fontWeight: "bold" }}>CURSO</div>
            {isEditing ? (
              <select value={profile.cefr_level || "A1.1"} onChange={(e) => handleUpdate("cefr_level", e.target.value)} style={{ border: "none", background: "none", fontWeight: "bold", textAlign: "center" }}>
                {cefrLevels.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            ) : <div style={{ fontWeight: "bold", fontSize: "18px" }}>{profile.cefr_level || "A1.1"}</div>}
          </div>
          <div style={{ padding: "10px 20px", backgroundColor: "#fff5f5", border: "1px solid #f87171", borderRadius: "12px" }}>
            <div style={{ fontSize: "10px", color: "#f87171", fontWeight: "bold" }}>JLPT</div>
            {isEditing ? (
              <select value={profile.jlpt_level || "Ninguno"} onChange={(e) => handleUpdate("jlpt_level", e.target.value)} style={{ border: "none", background: "none", fontWeight: "bold", textAlign: "center" }}>
                {jlptLevels.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            ) : <div style={{ fontWeight: "bold", fontSize: "18px" }}>{profile.jlpt_level || "---"}</div>}
          </div>
        </div>
      </section>

      <section>
        <h3 style={{ fontSize: "18px", marginBottom: "15px" }}>Estado de Tareas</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {assignments.map(asgn => {
            const sub = submissions.find(s => s.parent_assignment_id === asgn.id);
            return (
              <div key={asgn.id} style={{ display: "flex", justifyContent: "space-between", padding: "15px", backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #eee" }}>
                <span style={{ fontWeight: "500" }}>{asgn.content.split('\n')[0]}</span>
                <span style={{ fontWeight: "bold", fontSize: "12px", color: sub ? (sub.is_reviewed ? "#2cb696" : "#b45309") : "#f87171" }}>
                  {sub ? (sub.is_reviewed ? "済 Revisado" : "📥 Entregado") : "❌ Pendiente"}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}