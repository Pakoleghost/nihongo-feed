"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function ResourcesPage() {
  const [resources, setResources] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', url: '', category: 'General', type: 'link' });

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from("profiles").select("is_admin, group_name").eq("id", user?.id).single();
    setIsAdmin(prof?.is_admin || false);

    const { data } = await supabase.from("resources").select("*").order("category", { ascending: true });
    setResources(data || []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    await supabase.from("resources").insert([newItem]);
    setShowForm(false);
    fetchData();
  };

  // Agrupar por categorías (Carpetas)
  const categories = [...new Set(resources.map(r => r.category))];

  return (
    <div style={{ maxWidth: "700px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <Link href="/" style={{ color: "#2cb696", textDecoration: "none", fontWeight: "bold" }}>← Volver</Link>
        {isAdmin && <button onClick={() => setShowForm(!showForm)} style={{ backgroundColor: "#2cb696", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "20px" }}>+ Nuevo Recurso</button>}
      </header>

      {showForm && (
        <div style={{ backgroundColor: "#f9f9f9", padding: "20px", borderRadius: "15px", marginBottom: "30px" }}>
          <input placeholder="Título" onChange={e => setNewItem({...newItem, title: e.target.value})} style={{ display: "block", width: "100%", padding: "10px", marginBottom: "10px" }} />
          <input placeholder="URL (PDF, Youtube, Drive)" onChange={e => setNewItem({...newItem, url: e.target.value})} style={{ display: "block", width: "100%", padding: "10px", marginBottom: "10px" }} />
          <input placeholder="Carpeta (ej: Genki I)" onChange={e => setNewItem({...newItem, category: e.target.value})} style={{ display: "block", width: "100%", padding: "10px", marginBottom: "10px" }} />
          <button onClick={handleAdd} style={{ backgroundColor: "#2cb696", color: "#fff", width: "100%", padding: "10px", borderRadius: "10px", border: "none" }}>Guardar</button>
        </div>
      )}

      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: "30px" }}>
          <h2 style={{ fontSize: "18px", color: "#666", borderBottom: "1px solid #eee", paddingBottom: "5px" }}>📁 {cat}</h2>
          <div style={{ display: "grid", gap: "10px", marginTop: "10px" }}>
            {resources.filter(r => r.category === cat).map(r => (
              <a key={r.id} href={r.url} target="_blank" style={{ padding: "15px", border: "1px solid #eee", borderRadius: "10px", textDecoration: "none", color: "#333", backgroundColor: "#fff" }}>
                <strong>{r.title}</strong>
                <div style={{ fontSize: "12px", color: "#2cb696" }}>Abrir recurso →</div>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}