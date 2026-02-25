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

  const [isAdmin, setIsAdmin] = useState(false);
  const [postType, setPostType] = useState<'post' | 'assignment' | 'announcement' | 'forum'>('post');
  const [targetGroup, setTargetGroup] = useState("");
  const [deadline, setDeadline] = useState("");
  const [assignmentSubtype, setAssignmentSubtype] = useState<'internal' | 'external'>('external');
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

  const handlePublish = async () => {
    if (!title.trim() || !body.trim()) return alert("Completa los campos.");
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let imageUrl = null;
      if (imageFile) {
        const filePath = `post-images/${user?.id}-${Math.random()}`;
        await supabase.storage.from('uploads').upload(filePath, imageFile);
        const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }

      await supabase.from("posts").insert({
        content: `${title}\n${body}`,
        user_id: user?.id,
        image_url: imageUrl,
        type: postType === 'forum' ? 'assignment' : postType,
        is_forum: postType === 'forum',
        parent_assignment_id: assignmentId ? parseInt(assignmentId) : null,
        target_group: postType !== 'post' ? targetGroup : null,
        deadline: (postType === 'assignment' || postType === 'forum') ? (deadline || null) : null,
        assignment_subtype: postType === 'assignment' ? assignmentSubtype : (postType === 'forum' ? 'internal' : null)
      });
      router.push("/");
    } catch (e) { alert("Error"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
        <Link href="/" style={{ color: "#888", textDecoration: "none" }}>Cancelar</Link>
        <button onClick={handlePublish} disabled={loading} style={{ backgroundColor: "#2cb696", color: "white", padding: "10px 24px", borderRadius: "20px", fontWeight: "bold" }}>Publicar</button>
      </header>
      {isAdmin && (
        <div style={{ backgroundColor: "#f0fdf4", padding: "20px", borderRadius: "12px", marginBottom: "30px" }}>
          <select value={postType} onChange={(e) => setPostType(e.target.value as any)} style={{ padding: "8px", borderRadius: "6px" }}>
            <option value="post">Post Normal</option>
            <option value="assignment">宿題 (Tarea)</option>
            <option value="forum">掲示板 (Foro)</option>
            <option value="announcement">お知らせ (Anuncio)</option>
          </select>
        </div>
      )}
      <input type="text" placeholder="Título..." value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", fontSize: "32px", fontWeight: "bold", border: "none", outline: "none" }} />
      <textarea placeholder="Contenido..." value={body} onChange={(e) => setBody(e.target.value)} style={{ width: "100%", minHeight: "300px", fontSize: "18px", border: "none", outline: "none", resize: "none" }} />
    </div>
  );
}

export default function WritePage() {
  return <Suspense fallback={<div>Cargando...</div>}><WriteContent /></Suspense>;
}