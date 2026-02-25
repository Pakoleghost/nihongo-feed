"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setMyId(user?.id || null);
    
    const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user?.id).single();
    setIsAdmin(me?.is_admin || false);

    const { data: target } = await supabase.from("profiles").select("*").eq("id", id).single();
    setProfile(target);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name,
      bio: profile.bio,
      cefr_level: profile.cefr_level,
      jlpt_level: profile.jlpt_level
    }).eq("id", id);
    if (!error) setIsEditing(false);
  };

  if (loading || !profile) return <div style={{ padding: "50px", textAlign: "center" }}>Cargando...</div>;

  const canEdit = isAdmin || myId === id;

  return (
    <div style={{ maxWidth: "600px", margin: "40px auto", padding: "0 20px", fontFamily: "sans-serif" }}>
      <header style={{ textAlign: "center", marginBottom: "30px" }}>
        <div style={{ width: "120px", height: "120px", borderRadius: "50%", overflow: "hidden", margin: "0 auto 20px", border: "4px solid #2cb696" }}>
          {profile.avatar_url ? <img src={profile.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ fontSize: "50px", lineHeight: "120px", backgroundColor: "#f0f0f0" }}>👤</div>}
        </div>
        
        {isEditing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input type="text" value={profile.full_name || ""} onChange={e => setProfile({...profile, full_name: e.target.value})} placeholder="Nombre Real" style={{ padding: "10px", textAlign: "center", fontSize: "20px", fontWeight: "bold" }} />
            <textarea value={profile.bio || ""} onChange={e => setProfile({...profile, bio: e.target.value})} placeholder="Cuéntanos sobre ti en japonés..." style={{ padding: "10px", minHeight: "80px", borderRadius: "8px" }} />
            <button onClick={handleSave} style={{ backgroundColor: "#2cb696", color: "#fff", border: "none", padding: "10px", borderRadius: "20px", fontWeight: "bold" }}>Guardar Cambios</button>
          </div>
        ) : (
          <>
            <h1 style={{ margin: "0 0 5px 0" }}>{profile.full_name || profile.username}</h1>
            <p style={{ color: "#888", margin: "0 0 20px 0" }}>@{profile.username} • {profile.group_name || "Sin grupo"}</p>
            <p style={{ fontStyle: "italic", color: "#555", backgroundColor: "#f9f9f9", padding: "15px", borderRadius: "10px" }}>
              {profile.bio || "Este alumno aún no ha escrito su biografía."}
            </p>
            {canEdit && <button onClick={() => setIsEditing(true)} style={{ marginTop: "15px", background: "none", border: "1px solid #ddd", padding: "5px 15px", borderRadius: "15px", cursor: "pointer" }}>Editar Perfil</button>}
          </>
        )}
      </header>
      
      {/* Badges de Nivel (JLPT / CEFR) */}
      <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
        <div style={{ padding: "10px 20px", backgroundColor: "#eefaf5", borderRadius: "10px", border: "1px solid #2cb696", textAlign: "center" }}>
          <div style={{ fontSize: "10px", color: "#2cb696" }}>CURSO</div>
          <div style={{ fontWeight: "bold", fontSize: "18px" }}>{profile.cefr_level || "A1.1"}</div>
        </div>
        <div style={{ padding: "10px 20px", backgroundColor: "#fff5f5", borderRadius: "10px", border: "1px solid #f87171", textAlign: "center" }}>
          <div style={{ fontSize: "10px", color: "#f87171" }}>JLPT</div>
          <div style={{ fontWeight: "bold", fontSize: "18px" }}>{profile.jlpt_level || "---"}</div>
        </div>
      </div>
    </div>
  );
}