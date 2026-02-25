"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function ResourcesPage() {
  const [resources, setResources] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', url: '', category: 'General' });

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from("profiles").select("is_admin").eq("id", user?.id).single();
    setIsAdmin(prof?.is_admin || false);
    const { data } = await supabase.from("resources").select("*").order("category");
    setResources(data || []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    await supabase.from("resources").insert([newItem]);
    setShowForm(false);
    fetchData();
  };

  const categories = [...new Set(resources.map(r => r.category))];

  return (
    <div style={{ maxWidth: "700px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
        <Link href="/" style={{ color: "#2cb696", textDecoration: "none", fontWeight: "bold" }}>← Volver</Link>
        <h1 style={{ fontSize: "24px", margin: 0 }}>Recursos 📚</h1>
        {isAdmin && <button onClick={() => setShowForm(!showForm)} style={{ backgroundColor: "#2cb696", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "20px" }}>+ Nuevo</button>}
      </header>

      {showForm && (
        <div style={{ backgroundColor: "#f9f9f9", padding: "20px", borderRadius: "15px", marginBottom: "20px" }}>
          <input placeholder="Título" onChange={e => setNewItem({...newItem, title: e.target.value})} style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
          <input placeholder="URL" onChange={e => setNewItem({...newItem, url: e.target.value})} style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
          <input placeholder="Categoría (Carpeta)" onChange={e => setNewItem({...newItem, category: e.target.value})} style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
          <button onClick={handleAdd} style={{ width: "100%", backgroundColor: "#2cb696", color: "#fff", padding: "10px", border: "none", borderRadius: "10px" }}>Guardar</button>
        </div>
      )}

      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: "20px" }}>
          <h2 style={{ fontSize: "18px", color: "#666" }}>📁 {cat}</h2>
          {resources.filter(r => r.category === cat).map(r => (
            <a key={r.id} href={r.url} target="_blank" style={{ display: "block", padding: "12px", border: "1px solid #eee", borderRadius: "8px", textDecoration: "none", color: "#333", marginTop: "5px" }}>{r.title} →</a>
          ))}
        </div>
      ))}
    </div>
  );
}