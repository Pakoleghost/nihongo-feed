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
    const { data: target } = await supabase.from("profiles").select("*").eq("id", id).single();
    const { data: grps } = await supabase.from("groups").select("name");

    setMyProfile(me);
    setProfile(target);
    setGroups(grps || []);

    if (target) {
      const { data: asgn } = await supabase.from("posts").select("*").eq("type", "assignment").eq("target_group", target.group_name);
      const { data: subs } = await supabase.from("posts").select("*").eq("user_id", id).not("parent_assignment_id", "is", null);
      setAssignments(asgn || []);
      setSubmissions(subs || []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpdate = async (field: string, value: string) => {
    await supabase.from("profiles").update({ [field]: value }).eq("id", id);
    setProfile({ ...profile, [field]: value });
  };

  if (loading || !profile) return <div style={{ padding: "50px", textAlign: "center" }}>Cargando...</div>;

  return (
    <div style={{ maxWidth: "700px", margin: "40px auto", padding: "0 20px", fontFamily: "sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#2cb696", cursor: "pointer", fontWeight: "bold" }}>← Volver</button>
        {myProfile?.is_admin && (
          <button onClick={() => setIsEditing(!isEditing)} style={{ backgroundColor: "#2cb696", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "20px", cursor: "pointer" }}>
            {isEditing ? "Guardar" : "✏️ Editar Alumno"}
          </button>
        )}
      </header>

      <section style={{ textAlign: "center", marginBottom: "30px", padding: "30px", backgroundColor: "#fff", borderRadius: "20px", border: "1px solid #eee" }}>
        <div style={{ width: "100px", height: "100px", borderRadius: "50%", overflow: "hidden", margin: "0 auto 15px", border: "3px solid #2cb696" }}>
          {profile.avatar_url ? <img src={profile.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
        </div>
        {isEditing ? (
          <input type="text" value={profile.full_name || ""} onChange={(e) => handleUpdate("full_name", e.target.value)} style={{ textAlign: "center", fontSize: "20px", width: "100%" }} />
        ) : (
          <h1>{profile.full_name || profile.username}</h1>
        )}
        <p>@{profile.username} • {profile.group_name || "Sin grupo"}</p>
        
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "20px" }}>
          <div style={{ padding: "10px", backgroundColor: "#eefaf5", borderRadius: "10px", border: "1px solid #2cb696" }}>
            <div style={{ fontSize: "10px", color: "#2cb696" }}>CURSO</div>
            {isEditing ? (
              <select value={profile.cefr_level || ""} onChange={e => handleUpdate("cefr_level", e.target.value)}>
                {cefrLevels.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            ) : <strong>{profile.cefr_level || "A1.1"}</strong>}
          </div>
          <div style={{ padding: "10px", backgroundColor: "#fff5f5", borderRadius: "10px", border: "1px solid #f87171" }}>
            <div style={{ fontSize: "10px", color: "#f87171" }}>JLPT</div>
            {isEditing ? (
              <select value={profile.jlpt_level || ""} onChange={e => handleUpdate("jlpt_level", e.target.value)}>
                {jlptLevels.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            ) : <strong>{profile.jlpt_level || "---"}</strong>}
          </div>
        </div>
      </section>
    </div>
  );
}