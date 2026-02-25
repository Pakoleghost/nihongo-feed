"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function WriteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assignmentId = searchParams.get("assignment_id");
  const assignmentTitle = searchParams.get("title");

  const [title, setTitle] = useState(assignmentTitle ? `Entrega: ${assignmentTitle}` : "");
  const [body, setBody] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Estados de Maestro
  const [isAdmin, setIsAdmin] = useState(false);
  const [postType, setPostType] = useState<'post' | 'assignment' | 'announcement' | 'forum'>('post');
  const [targetGroup, setTargetGroup] = useState("");
  const [deadline, setDeadline] = useState("");
  const [assignmentSubtype, setAssignmentSubtype] = useState<'internal' | 'external'>('external');
  const [isForumAssignment, setIsForumAssignment] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<{name: string}[]>([]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
      if (profile?.is_admin) {
        setIsAdmin(true);
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
    if (!title.trim() || !body.trim()) return alert("Escribe título y contenido.");
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No auth");

      let imageUrl = null;
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const filePath = `post-images/${fileName}`;
        await supabase.storage.from('uploads').upload(filePath, imageFile);
        const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("posts").insert({
        content: `${title}\n${body}`,
        user_id: user.id,
        image_url: imageUrl,
        type: postType === 'forum' ? 'assignment' : postType, // Los foros-tarea se guardan como assignment
        is_forum: postType === 'forum',
        parent_assignment_id: assignmentId ? parseInt(assignmentId) : null,
        target_group: postType !== 'post' ? targetGroup : null,
        deadline: (postType === 'assignment' || postType === 'forum') ? (deadline || null) : null,
        assignment_subtype: postType === 'assignment' ? assignmentSubtype : (postType === 'forum' ? 'internal' : null)
      });

      if (error) throw error;
      router.push("/");
    } catch (err) {
      alert("Error al publicar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
        <Link href="/" style={{ color: "#888", textDecoration: "none" }}>Cancelar</Link>
        <button onClick={handlePublish} disabled={loading} style={{ backgroundColor: "#2cb696", color: "white", border: "none", padding: "10px 24px", borderRadius: "20px", fontWeight: "bold", cursor: "pointer" }}>
          {loading ? "Publicando..." : "Publicar"}
        </button>
      </header>

      {isAdmin && (
        <div style={{ backgroundColor: "#f0fdf4", padding: "20px", borderRadius: "12px", marginBottom: "30px", border: "1px solid #dcfce7" }}>
          <h3 style={{ margin: "0 0 15px 0", fontSize: "14px", color: "#166534" }}>TIPO DE PUBLICACIÓN</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "15px" }}>
            <select value={postType} onChange={(e) => setPostType(e.target.value as any)} style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }}>
              <option value="post">Post Normal</option>
              <option value="assignment">宿題 (Tarea Blog/Libro)</option>
              <option value="forum">掲示板 (Foro / Tarea Grupal)</option>
              <option value="announcement">お知らせ (Anuncio)</option>
            </select>

            {postType !== 'post' && (
              <select value={targetGroup} onChange={(e) => setTargetGroup(e.target.value)} style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }}>
                <option value="">¿Para qué grupo?</option>
                <option value="Todos">Todos</option>
                {availableGroups.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
              </select>
            )}

            {postType === 'assignment' && (
              <select value={assignmentSubtype} onChange={(e) => setAssignmentSubtype(e.target.value as any)} style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }}>
                <option value="internal">Entrega en App (Blog)</option>
                <option value="external">Tarea Externa (Libro/PDF)</option>
              </select>
            )}
          </div>
        </div>
      )}

      <main>
        <div style={{ marginBottom: "20px" }}>
          <label style={{ cursor: "pointer", color: "#2cb696", fontSize: "14px", fontWeight: "bold" }}>
            📷 {previewUrl ? "Cambiar imagen" : "Agregar portada"}
            <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
          </label>
          {previewUrl && <img src={previewUrl} style={{ width: "100%", height: "200px", objectFit: "cover", borderRadius: "10px", marginTop: "10px" }} />}
        </div>
        <input type="text" placeholder="Título..." value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", fontSize: "32px", fontWeight: "bold", border: "none", outline: "none", marginBottom: "20px" }} />
        <textarea placeholder="Escribe aquí las instrucciones o tu post..." value={body} onChange={(e) => setBody(e.target.value)} style={{ width: "100%", minHeight: "300px", fontSize: "18px", border: "none", outline: "none", resize: "none" }} />
      </main>
    </div>
  );
}

export default function WritePage() {
  return <Suspense fallback={<div>Cargando...</div>}><WriteContent /></Suspense>;
}