"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type GroupRow = { name: string };

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
  const [postType, setPostType] = useState<"post" | "assignment" | "announcement" | "forum">("post");
  const [targetGroup, setTargetGroup] = useState("");
  const [deadline, setDeadline] = useState("");
  const [assignmentSubtype, setAssignmentSubtype] = useState<"internal" | "external">("external");
  const [availableGroups, setAvailableGroups] = useState<GroupRow[]>([]);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
      if (profile?.is_admin) {
        setIsAdmin(true);
        const { data: groups } = await supabase.from("groups").select("name").order("name");
        if (groups) setAvailableGroups(groups as GroupRow[]);
      }
      if (assignmentId) setPostType("assignment");
    };

    void checkUser();
  }, [router, assignmentId]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const handlePublish = async () => {
    if (!title.trim() || !body.trim()) return alert("Escribe título y contenido.");
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No auth");

      let imageUrl = null;
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const filePath = `post-images/${fileName}`;
        await supabase.storage.from("uploads").upload(filePath, imageFile);
        const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }

      await supabase.from("posts").insert({
        content: `${title}\n${body}`,
        user_id: user.id,
        image_url: imageUrl,
        type: postType === "forum" ? "assignment" : postType,
        is_forum: postType === "forum",
        parent_assignment_id: assignmentId ? parseInt(assignmentId, 10) : null,
        target_group: postType !== "post" ? targetGroup : null,
        deadline: postType === "assignment" || postType === "forum" ? deadline || null : null,
        assignment_subtype:
          postType === "assignment" ? assignmentSubtype : postType === "forum" ? "internal" : null,
      });

      router.push("/");
    } catch {
      alert("Error al publicar");
    } finally {
      setLoading(false);
    }
  };

  const estimatedRead = useMemo(() => {
    const words = `${title} ${body}`.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 180));
  }, [title, body]);

  return (
    <>
      <div className="writePage">
        <div className="writeShell">
          <header className="writeTopBar">
            <div className="leftTop">
              <Link href="/" className="ghostPill">Cancelar</Link>
              <div className="pageLabel">
                <span className="eyebrow">Editor</span>
                <strong>{assignmentId ? "Entrega de tarea" : "Nueva publicación"}</strong>
              </div>
            </div>

            <button onClick={handlePublish} disabled={loading} className="publishBtn">
              {assignmentId ? "📤 Entregar" : loading ? "Publicando..." : "Publicar"}
            </button>
          </header>

          <div className="editorGrid">
            <section className="editorCard">
              <div className="fieldBlock">
                <label className="label">Título</label>
                <input
                  type="text"
                  placeholder="Título de tu publicación..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="titleInput"
                />
              </div>

              <div className="fieldBlock">
                <label className="label">Contenido</label>
                <textarea
                  placeholder="Escribe aquí..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="bodyTextarea"
                />
              </div>
            </section>

            <aside className="sideStack">
              <section className="sideCard">
                <div className="sideHeader">
                  <span className="eyebrow">Vista rápida</span>
                  <span className="muted">{estimatedRead} min lectura</span>
                </div>

                <div className="previewCard">
                  <h3>{title.trim() || "Sin título aún"}</h3>
                  <p>{body.trim() || "Tu contenido aparecerá aquí en una vista resumida."}</p>
                </div>
              </section>

              <section className="sideCard">
                <div className="sideHeader">
                  <span className="eyebrow">Imagen</span>
                  <span className="muted">{imageFile ? imageFile.name : "Opcional"}</span>
                </div>
                <label className="uploadBox">
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
                  <span>{imageFile ? "Cambiar imagen" : "Seleccionar imagen"}</span>
                </label>
                {previewUrl && (
                  <div className="imagePreviewWrap">
                    <img src={previewUrl} alt="Preview" className="imagePreview" />
                  </div>
                )}
              </section>

              {isAdmin && !assignmentId && (
                <section className="sideCard toneMint">
                  <div className="sideHeader">
                    <span className="eyebrow">Modo Sensei</span>
                  </div>

                  <div className="formGrid">
                    <label className="miniField">
                      <span>Tipo</span>
                      <select value={postType} onChange={(e) => setPostType(e.target.value as any)}>
                        <option value="post">Post normal</option>
                        <option value="assignment">宿題 (Tarea)</option>
                        <option value="forum">掲示板 (Foro)</option>
                        <option value="announcement">お知らせ (Anuncio)</option>
                      </select>
                    </label>

                    {postType !== "post" && (
                      <label className="miniField">
                        <span>Grupo</span>
                        <select value={targetGroup} onChange={(e) => setTargetGroup(e.target.value)}>
                          <option value="">Seleccionar…</option>
                          <option value="Todos">Todos</option>
                          {availableGroups.map((g) => (
                            <option key={g.name} value={g.name}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    {(postType === "assignment" || postType === "forum") && (
                      <label className="miniField">
                        <span>Fecha límite</span>
                        <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                      </label>
                    )}

                    {postType === "assignment" && (
                      <label className="miniField">
                        <span>Tipo de tarea</span>
                        <select
                          value={assignmentSubtype}
                          onChange={(e) => setAssignmentSubtype(e.target.value as "internal" | "external")}
                        >
                          <option value="external">Externa</option>
                          <option value="internal">Interna</option>
                        </select>
                      </label>
                    )}
                  </div>
                </section>
              )}
            </aside>
          </div>
        </div>
      </div>

      <style jsx>{`
        .writePage {
          min-height: 100vh;
          background: radial-gradient(900px 420px at 50% -10%, rgba(44, 182, 150, 0.08), transparent 65%), #f6f7f8;
          padding: 14px;
        }
        .writeShell {
          max-width: 1240px;
          margin: 0 auto;
        }
        .writeTopBar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          position: sticky;
          top: 0;
          z-index: 20;
          background: rgba(246, 247, 248, 0.84);
          backdrop-filter: blur(10px);
          padding: 10px 0 14px;
          margin-bottom: 4px;
        }
        .leftTop {
          display: flex;
          gap: 10px;
          align-items: center;
          min-width: 0;
        }
        .ghostPill {
          border: 1px solid rgba(17, 17, 20, 0.1);
          background: #fff;
          color: #222;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 13px;
          text-decoration: none;
          flex-shrink: 0;
        }
        .pageLabel {
          display: grid;
          min-width: 0;
        }
        .pageLabel strong {
          color: #111114;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .eyebrow {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #7a7a84;
          font-weight: 800;
        }
        .publishBtn {
          border: 0;
          background: linear-gradient(135deg, #34c5a6, #25a98f);
          color: #fff;
          border-radius: 999px;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 8px 18px rgba(44, 182, 150, 0.2);
        }
        .publishBtn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          box-shadow: none;
        }
        .editorGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 14px;
        }
        .editorCard {
          background: #fff;
          border: 1px solid rgba(17, 17, 20, 0.07);
          border-radius: 22px;
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.04);
          padding: 16px;
        }
        .fieldBlock + .fieldBlock {
          margin-top: 14px;
        }
        .label {
          display: block;
          margin-bottom: 8px;
          font-size: 12px;
          color: #666a73;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .titleInput {
          width: 100%;
          border: 1px solid rgba(17, 17, 20, 0.08);
          background: #fbfbfc;
          border-radius: 14px;
          padding: 14px 14px;
          font-size: 24px;
          line-height: 1.2;
          font-weight: 800;
          outline: none;
          color: #111114;
          letter-spacing: -0.02em;
        }
        .bodyTextarea {
          width: 100%;
          min-height: 42vh;
          border: 1px solid rgba(17, 17, 20, 0.08);
          background: #fbfbfc;
          border-radius: 16px;
          padding: 14px;
          font-size: 16px;
          line-height: 1.75;
          resize: vertical;
          outline: none;
          color: #222;
          font-family: inherit;
        }
        .titleInput:focus,
        .bodyTextarea:focus,
        .miniField select:focus,
        .miniField input:focus {
          border-color: rgba(44, 182, 150, 0.35);
          box-shadow: 0 0 0 4px rgba(44, 182, 150, 0.08);
          background: #fff;
        }
        .sideStack {
          display: grid;
          gap: 14px;
          align-content: start;
        }
        .sideCard {
          background: #fff;
          border: 1px solid rgba(17, 17, 20, 0.07);
          border-radius: 18px;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.03);
          padding: 14px;
        }
        .toneMint {
          background: linear-gradient(180deg, #f4fffb 0%, #ffffff 38%);
          border-color: rgba(44, 182, 150, 0.16);
        }
        .sideHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 10px;
        }
        .muted {
          color: #7c7c85;
          font-size: 12px;
        }
        .previewCard {
          border: 1px solid rgba(17,17,20,.06);
          border-radius: 14px;
          padding: 12px;
          background: #fbfbfc;
        }
        .previewCard h3 {
          margin: 0 0 8px;
          font-size: 16px;
          line-height: 1.3;
          color: #17171b;
          letter-spacing: -0.01em;
        }
        .previewCard p {
          margin: 0;
          font-size: 13px;
          color: #666a73;
          line-height: 1.55;
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
          white-space: pre-wrap;
        }
        .uploadBox {
          display: grid;
          place-items: center;
          border: 1px dashed rgba(17, 17, 20, 0.16);
          background: #fbfbfc;
          border-radius: 14px;
          min-height: 82px;
          cursor: pointer;
          font-size: 13px;
          color: #2cb696;
          font-weight: 700;
        }
        .imagePreviewWrap {
          margin-top: 10px;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(17,17,20,.06);
          background: #f5f5f5;
        }
        .imagePreview {
          width: 100%;
          height: 180px;
          object-fit: cover;
          display: block;
        }
        .formGrid {
          display: grid;
          gap: 10px;
        }
        .miniField {
          display: grid;
          gap: 6px;
          font-size: 12px;
          color: #555;
          font-weight: 600;
        }
        .miniField select,
        .miniField input {
          width: 100%;
          border: 1px solid rgba(17,17,20,.1);
          border-radius: 10px;
          background: #fff;
          padding: 9px 10px;
          font-size: 13px;
          font-family: inherit;
          color: #222;
          outline: none;
        }

        @media (min-width: 1040px) {
          .writePage {
            padding: 18px 22px 28px;
          }
          .editorGrid {
            grid-template-columns: minmax(0, 1fr) 360px;
            align-items: start;
          }
          .sideStack {
            position: sticky;
            top: 76px;
          }
          .editorCard {
            padding: 18px;
          }
          .bodyTextarea {
            min-height: 70vh;
            font-size: 17px;
          }
        }
      `}</style>
    </>
  );
}

export default function WritePage() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Cargando…</div>}>
      <WriteContent />
    </Suspense>
  );
}
