"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function ResourcesPage() {
  const [resources, setResources] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', url: '', category: 'General' });

  // Aditivo: Estados para el manejo del archivo local y carga
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from("profiles").select("is_admin").eq("id", user?.id).single();
    setIsAdmin(prof?.is_admin || false);
    const { data } = await supabase.from("resources").select("*").order("category");
    setResources(data || []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!newItem.title) return alert("Escribe un título para el recurso");
    setUploading(true);

    let finalUrl = newItem.url;

    // Aditivo: Lógica para subir archivo local si existe
    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `resources/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('uploads') // Asegúrate de que el bucket 'uploads' exista en tu Supabase
        .upload(filePath, file);

      if (uploadError) {
        alert("Error al subir el archivo local");
        setUploading(false);
        return;
      }

      // Obtener la URL pública del archivo subido
      const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(uploadData.path);
      finalUrl = urlData.publicUrl;
    }

    if (!finalUrl) {
      alert("Debes subir un archivo o pegar un enlace");
      setUploading(false);
      return;
    }

    // Insertar el recurso con la URL final (sea link o archivo subido)
    const { error } = await supabase.from("resources").insert([{ ...newItem, url: finalUrl }]);
    
    if (!error) {
      setShowForm(false);
      setNewItem({ title: '', url: '', category: 'General' });
      setFile(null);
      fetchData();
    }
    setUploading(false);
  };

  const categories = [...new Set(resources.map(r => r.category))];

  return (
    <div style={{ maxWidth: "700px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
        <Link href="/" style={{ color: "#2cb696", textDecoration: "none", fontWeight: "bold" }}>← Volver</Link>
        <h1 style={{ fontSize: "24px", margin: 0 }}>Recursos 📚</h1>
        {isAdmin && <button onClick={() => setShowForm(!showForm)} style={{ backgroundColor: "#2cb696", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "20px" }}>{showForm ? "Cancelar" : "+ Nuevo"}</button>}
      </header>

      {showForm && (
        <div style={{ backgroundColor: "#f9f9f9", padding: "20px", borderRadius: "15px", marginBottom: "20px" }}>
          <input 
            placeholder="Título" 
            value={newItem.title}
            onChange={e => setNewItem({...newItem, title: e.target.value})} 
            style={{ width: "100%", padding: "10px", marginBottom: "10px", borderRadius: "8px", border: "1px solid #ddd" }} 
          />
          
          {/* Aditivo: Selector de archivos locales compatible con móviles */}
          <div style={{ marginBottom: "10px", padding: "15px", border: "2px dashed #ccc", borderRadius: "10px", textAlign: "center", backgroundColor: "#fff" }}>
            <label style={{ cursor: "pointer", color: "#2cb696", fontWeight: "bold", fontSize: "14px" }}>
              {file ? `📄 ${file.name}` : "📁 Seleccionar archivo local"}
              <input 
                type="file" 
                onChange={e => setFile(e.target.files ? e.target.files[0] : null)} 
                style={{ display: "none" }} 
              />
            </label>
          </div>

          <p style={{ fontSize: "12px", color: "#999", textAlign: "center", marginBottom: "10px" }}>— O —</p>

          <input 
            placeholder="Pegar URL (Drive, YouTube, etc.)" 
            value={newItem.url}
            onChange={e => setNewItem({...newItem, url: e.target.value})} 
            style={{ width: "100%", padding: "10px", marginBottom: "10px", borderRadius: "8px", border: "1px solid #ddd" }} 
          />
          <input 
            placeholder="Categoría (Carpeta)" 
            value={newItem.category}
            onChange={e => setNewItem({...newItem, category: e.target.value})} 
            style={{ width: "100%", padding: "10px", marginBottom: "10px", borderRadius: "8px", border: "1px solid #ddd" }} 
          />
          <button 
            onClick={handleAdd} 
            disabled={uploading}
            style={{ width: "100%", backgroundColor: "#2cb696", color: "#fff", padding: "12px", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: uploading ? "not-allowed" : "pointer" }}
          >
            {uploading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      )}

      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: "20px" }}>
          <h2 style={{ fontSize: "18px", color: "#666" }}>📁 {cat}</h2>
          {resources.filter(r => r.category === cat).map(r => (
            <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", padding: "12px", border: "1px solid #eee", borderRadius: "8px", textDecoration: "none", color: "#333", marginTop: "5px" }}>{r.title} →</a>
          ))}
        </div>
      ))}
    </div>
  );
}