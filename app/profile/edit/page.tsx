"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function EditProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>({ username: "", full_name: "", bio: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (data) setProfile(data);
      }
    };
    getProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({
        username: profile.username,
        full_name: profile.full_name,
        bio: profile.bio
      }).eq("id", user.id);
      router.push(`/profile/${user.id}`);
    }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: "500px", margin: "60px auto", padding: "0 20px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "30px" }}>Editar perfil</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontSize: "14px", color: "#666", marginBottom: "8px" }}>Nombre de usuario</label>
          <input 
            type="text" 
            value={profile.username} 
            onChange={e => setProfile({...profile, username: e.target.value})}
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "15px" }}
          />
        </div>
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontSize: "14px", color: "#666", marginBottom: "8px" }}>Nombre completo</label>
          <input 
            type="text" 
            value={profile.full_name || ""} 
            onChange={e => setProfile({...profile, full_name: e.target.value})}
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "15px" }}
          />
        </div>
        <div style={{ marginBottom: "30px" }}>
          <label style={{ display: "block", fontSize: "14px", color: "#666", marginBottom: "8px" }}>Biografía</label>
          <textarea 
            value={profile.bio || ""} 
            onChange={e => setProfile({...profile, bio: e.target.value})}
            placeholder="Escribe algo sobre ti..."
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "15px", minHeight: "120px", fontFamily: "inherit", resize: "vertical" }}
          />
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button type="submit" disabled={saving} style={{ flex: 1, backgroundColor: "#2cb696", color: "#fff", border: "none", padding: "14px", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          <button type="button" onClick={() => router.back()} style={{ flex: 1, backgroundColor: "#eee", color: "#666", border: "none", padding: "14px", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}