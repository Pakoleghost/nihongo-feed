"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function EditProfilePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 1. Cargar datos actuales
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single();

      if (data) {
        setUsername(data.username || "");
        setAvatarUrl(data.avatar_url);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [router]);

  // 2. Manejar cambio de imagen
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setPreviewUrl(URL.createObjectURL(file)); // Vista previa inmediata
    }
  };

  // 3. Guardar cambios
  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No usuario");

      let finalAvatarUrl = avatarUrl;

      // A) Si hay nueva imagen, subirla
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `avatars/${user.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('uploads')
          .getPublicUrl(fileName);

        finalAvatarUrl = urlData.publicUrl;
      }

      // B) Actualizar tabla profiles
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          username: username,
          avatar_url: finalAvatarUrl,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Éxito: Volver al perfil
      router.push("/profile");
      router.refresh();

    } catch (error) {
      console.error("Error actualizando perfil:", error);
      alert("Error al guardar cambios.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>Cargando...</div>;

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      
      <header style={{ marginBottom: "40px" }}>
        <Link href="/profile" style={{ color: "#888", textDecoration: "none" }}>← Cancelar</Link>
      </header>

      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "32px", textAlign: "center" }}>Editar Perfil</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "400px", margin: "0 auto" }}>
        
        {/* AVATAR */}
        <div style={{ textAlign: "center" }}>
          <div style={{ 
            width: "120px", height: "120px", borderRadius: "50%", 
            overflow: "hidden", margin: "0 auto 16px", backgroundColor: "#eee",
            border: "1px solid #ddd"
          }}>
            {(previewUrl || avatarUrl) ? (
              <img src={previewUrl || avatarUrl!} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>:)</div>
            )}
          </div>
          
          <label style={{ 
            cursor: "pointer", color: "#2cb696", fontWeight: "bold", fontSize: "14px",
            padding: "8px 16px", borderRadius: "20px", border: "1px solid #2cb696"
          }}>
            Cambiar Foto
            <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
          </label>
        </div>

        {/* NOMBRE */}
        <div>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px", color: "#333" }}>
            Nombre de usuario
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ 
              width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ccc",
              fontSize: "16px"
            }}
          />
        </div>

        {/* BOTÓN GUARDAR */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            backgroundColor: "#2cb696", color: "white", border: "none",
            padding: "14px", borderRadius: "30px", fontWeight: "bold", fontSize: "16px",
            cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
            marginTop: "16px"
          }}
        >
          {saving ? "Guardando..." : "Guardar Cambios"}
        </button>

      </div>
    </div>
  );
}