"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function MyProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [bio, setBio] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);
      setBio(data.bio || "");
      setFullName(data.full_name || "");
      setLoading(false);
    };
    fetchProfile();
  }, [router]);

  const handleAvatarUpload = async (e: any) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.id}-${Math.random()}.${fileExt}`;
      
      await supabase.storage.from('uploads').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(filePath);
      
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", profile.id);
      setProfile({ ...profile, avatar_url: publicUrl });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    await supabase.from("profiles").update({ bio, full_name: fullName }).eq("id", profile.id);
    alert("¡Perfil actualizado!");
    router.push("/");
  };

  if (loading) return <p style={{ textAlign: "center", padding: "50px" }}>Cargando...</p>;

  return (
    <div style={{ maxWidth: "500px", margin: "50px auto", padding: "20px", fontFamily: "sans-serif", textAlign: "center" }}>
      <div style={{ width: "120px", height: "120px", borderRadius: "50%", overflow: "hidden", margin: "0 auto 20px", border: "3px solid #2cb696", position: "relative" }}>
        {profile.avatar_url ? <img src={profile.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
        {uploading && <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>Subiendo...</div>}
      </div>
      
      <label style={{ cursor: "pointer", color: "#2cb696", fontSize: "13px", fontWeight: "bold" }}>
        Cambiar foto
        <input type="file" onChange={handleAvatarUpload} style={{ display: "none" }} />
      </label>

      <div style={{ marginTop: "30px", textAlign: "left" }}>
        <label style={{ fontSize: "12px", color: "#888" }}>Nombre Real</label>
        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} style={{ width: "100%", padding: "10px", margin: "5px 0 20px", borderRadius: "8px", border: "1px solid #ddd" }} />
        
        <label style={{ fontSize: "12px", color: "#888" }}>Biografía (Jidoushoukai)</label>
        <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="¡Preséntate en japonés!" style={{ width: "100%", padding: "10px", height: "100px", borderRadius: "8px", border: "1px solid #ddd" }} />
        
        <button onClick={handleSave} style={{ width: "100%", backgroundColor: "#2cb696", color: "#fff", border: "none", padding: "12px", borderRadius: "25px", fontWeight: "bold", marginTop: "20px", cursor: "pointer" }}>Guardar cambios</button>
      </div>
    </div>
  );
}