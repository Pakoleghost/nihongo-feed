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

  // Verificar si el usuario está logueado
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Si no está logueado, redirigir al login (ajusta la ruta si es distinta)
        router.push("/login"); 
      }
    };
    checkUser();
  }, [router]);

  // Manejar selección de imagen
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

      // 1. Subir Imagen (si existe)
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const filePath = `post-images/${fileName}`;

        // Subimos al bucket 'uploads'
        const { error: uploadError } = await supabase.storage
          .from('uploads') 
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        // Obtenemos la URL pública
        const { data: urlData } = supabase.storage
          .from('uploads')
          .getPublicUrl(filePath);
          
        imageUrl = urlData.publicUrl;
      }

      // 2. Guardar Post en Base de Datos
      // Unimos Título + Cuerpo para guardarlo en 'content'
      const fullContent = `${title}\n${body}`;

      const { error: insertError } = await supabase
        .from("posts")
        .insert({
          content: fullContent,
          user_id: user.id,
          image_url: imageUrl,
        });

      if (insertError) throw insertError;

      // Éxito: volver al home y refrescar
      router.push("/");
      router.refresh(); 

    } catch (error) {
      console.error("Error publicando:", error);
      alert("Hubo un error al publicar. Revisa la consola.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      
      {/* HEADER DEL EDITOR */}
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
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? "Publicando..." : "Publicar"}
        </button>
      </header>

      <main>
        {/* INPUT DE IMAGEN */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px", color: "#666", fontSize: "14px" }}>
            <span>📷 Agregar imagen de portada</span>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageChange} 
              style={{ display: "none" }} 
            />
          </label>
          
          {previewUrl && (
            <div style={{ marginTop: "10px", width: "100%", height: "200px", borderRadius: "8px", overflow: "hidden", backgroundColor: "#f0f0f0" }}>
              <img src={previewUrl} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
        </div>

        {/* TÍTULO */}
        <input
          type="text"
          placeholder="Título del artículo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ 
            width: "100%", 
            fontSize: "32px", 
            fontWeight: "bold", 
            border: "none", 
            outline: "none", 
            marginBottom: "20px",
            color: "#333"
          }}
        />

        {/* CUERPO */}
        <textarea
          placeholder="Escribe tu historia aquí..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{ 
            width: "100%", 
            minHeight: "400px", 
            fontSize: "18px", 
            lineHeight: "1.8", 
            border: "none", 
            outline: "none", 
            resize: "none",
            color: "#444",
            fontFamily: "Georgia, serif"
          }}
        />
      </main>
    </div>
  );
}