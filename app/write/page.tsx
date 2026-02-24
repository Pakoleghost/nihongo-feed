"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function WritePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Estados nuevos para el Maestro
  const [isAdmin, setIsAdmin] = useState(false);
  const [postType, setPostType] = useState<'post' | 'assignment' | 'announcement'>('post');
  const [targetGroup, setTargetGroup] = useState("");
  const [deadline, setDeadline] = useState("");
  const [availableGroups, setAvailableGroups] = useState<{name: string}[]>([]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // 1. Verificamos si es admin y cargamos su perfil
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      
      if (profile?.is_admin) {
        setIsAdmin(true);
        // 2. Si es admin, cargamos los grupos disponibles para asignar tarea
        const { data: groups } = await supabase.from("groups").select("name").order("name");
        if (groups) setAvailableGroups(groups);
      }
    };
    checkUser();
  }, [router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handlePublish = async () => {
    if (!title.trim() || !body.trim()) {
      alert("Por favor escribe un título y contenido.");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay usuario autenticado");

      let imageUrl = null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const filePath = `post-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('uploads') 
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('uploads')
          .getPublicUrl(filePath);
          
        imageUrl = urlData.publicUrl;
      }

      const fullContent = `${title}\n${body}`;

      // Insertamos con los nuevos campos de maestro
      const { error: insertError } = await supabase
        .from("posts")
        .insert({
          content: fullContent,
          user_id: user.id,
          image_url: imageUrl,
          type: postType,
          target_group: postType !== 'post' ? targetGroup : null,
          deadline: postType === 'assignment' ? (deadline || null) : null
        });

      if (insertError) throw insertError;

      router.push("/");
      router.refresh(); 

    } catch (error) {
      console.error("Error publicando:", error);
      alert("Hubo un error al publicar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <Link href="/" style={{ color: "#888", textDecoration: "none" }}>Cancelar</Link>
        <button 
          onClick={handlePublish}
          disabled={loading}
          style={{ 
            backgroundColor: "#2cb696", 
            color: "white", 
            border: "none", 
            padding: "10px 24px", 
            borderRadius: "20px", 
            fontWeight: "bold",
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Publicando..." : "Publicar"}
        </button>
      </header>

      {/* PANEL DE MAESTRO (Solo visible para ti) */}
      {isAdmin && (
        <div style={{ backgroundColor: "#f0fdf4", padding: "20px", borderRadius: "12px", marginBottom: "30px", border: "1px solid #dcfce7" }}>
          <h3 style={{ margin: "0 0 15px 0", fontSize: "16px", color: "#166534" }}>Configuración de Sensei</h3>
          
          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
            {/* Tipo de Post */}
            <div style={{ flex: 1, minWidth: "150px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "5px" }}>Tipo de Publicación</label>
              <select 
                value={postType} 
                onChange={(e) => setPostType(e.target.value as any)}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }}
              >
                <option value="post">Post Normal</option>
                <option value="assignment">宿題 (Tarea)</option>
                <option value="announcement">お知らせ (Anuncio)</option>
              </select>
            </div>

            {/* Grupo Destino */}
            {(postType === 'assignment' || postType === 'announcement') && (
              <div style={{ flex: 1, minWidth: "150px" }}>
                <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "5px" }}>Dirigido a:</label>
                <select 
                  value={targetGroup} 
                  onChange={(e) => setTargetGroup(e.target.value)}
                  required
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }}
                >
                  <option value="">Selecciona un grupo</option>
                  {availableGroups.map(g => (
                    <option key={g.name} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Fecha Límite */}
            {postType === 'assignment' && (
              <div style={{ flex: 1, minWidth: "150px" }}>
                <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "5px" }}>Fecha Límite (Deadline)</label>
                <input 
                  type="date" 
                  value={deadline} 
                  onChange={(e) => setDeadline(e.target.value)}
                  style={{ width: "100%", padding: "7px", borderRadius: "6px", border: "1px solid #ccc" }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <main>
        <div style={{ marginBottom: "20px" }}>
          <label style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px", color: "#666", fontSize: "14px" }}>
            <span>📷 Agregar imagen de portada</span>
            <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
          </label>
          {previewUrl && (
            <div style={{ marginTop: "10px", width: "100%", height: "200px", borderRadius: "8px", overflow: "hidden" }}>
              <img src={previewUrl} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
        </div>

        <input
          type="text"
          placeholder="Título del artículo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: "100%", fontSize: "32px", fontWeight: "bold", border: "none", outline: "none", marginBottom: "20px" }}
        />

        <textarea
          placeholder="Escribe tu historia aquí..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{ width: "100%", minHeight: "300px", fontSize: "18px", lineHeight: "1.8", border: "none", outline: "none", resize: "none" }}
        />
      </main>
    </div>
  );
}