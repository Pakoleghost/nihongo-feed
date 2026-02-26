"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type GroupRow = { name: string };

async function compressImageFile(file: File, options?: { maxWidth?: number; maxHeight?: number; quality?: number }) {
  if (!file.type.startsWith("image/")) return file;

  const maxWidth = options?.maxWidth ?? 1800;
  const maxHeight = options?.maxHeight ?? 1800;
  const quality = options?.quality ?? 0.82;

  const imageUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("No se pudo leer imagen"));
      el.src = imageUrl;
    });

    let { width, height } = img;
    const scale = Math.min(1, maxWidth / width, maxHeight / height);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outType, outType === "image/png" ? undefined : quality),
    );
    if (!blob) return file;

    const outName =
      outType === "image/png"
        ? file.name.replace(/\.[^.]+$/, ".png")
        : file.name.replace(/\.[^.]+$/, ".jpg");
    return new File([blob], outName, { type: outType });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

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
  const [inlineUploading, setInlineUploading] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [postType, setPostType] = useState<"post" | "assignment" | "announcement" | "linkpost">("post");
  const [targetGroup, setTargetGroup] = useState("Todos");
  const [deadline, setDeadline] = useState("");
  const [assignmentSubtype, setAssignmentSubtype] = useState<"internal" | "external">("external");
  const [linkUrl, setLinkUrl] = useState("");
  const [availableGroups, setAvailableGroups] = useState<GroupRow[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const inlineImageInputRef = useRef<HTMLInputElement | null>(null);

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

  const uploadToStorage = async (userId: string, file: File, folder: "post-images" | "inline-images") => {
    const compressed = await compressImageFile(file, {
      maxWidth: folder === "inline-images" ? 1600 : 2000,
      maxHeight: folder === "inline-images" ? 1600 : 2000,
      quality: 0.82,
    });
    const fileExt = compressed.name.split(".").pop() || "jpg";
    const fileName = `${userId}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;
    const { error } = await supabase.storage.from("uploads").upload(filePath, compressed);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(filePath);
    return urlData.publicUrl;
  };

  const insertAtCursor = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setBody((prev) => `${prev}${prev.endsWith("\n") || !prev ? "" : "\n"}${snippet}`);
      return;
    }

    const start = textarea.selectionStart ?? body.length;
    const end = textarea.selectionEnd ?? body.length;
    const next = `${body.slice(0, start)}${snippet}${body.slice(end)}`;
    setBody(next);

    requestAnimationFrame(() => {
      textarea.focus();
      const caret = start + snippet.length;
      textarea.setSelectionRange(caret, caret);
    });
  };

  const handleInlineImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setInlineUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("Inicia sesión de nuevo.");
        return;
      }

      const publicUrl = await uploadToStorage(user.id, file, "inline-images");
      const safeAlt = (file.name || "imagen").replace(/\.[^.]+$/, "");
      const prefix = body && !body.endsWith("\n") ? "\n" : "";
      insertAtCursor(`${prefix}![${safeAlt}](${publicUrl})\n`);
    } catch {
      alert("No se pudo subir la imagen inline.");
    } finally {
      setInlineUploading(false);
      if (inlineImageInputRef.current) inlineImageInputRef.current.value = "";
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) return alert("Escribe un título.");
    if (postType !== "linkpost" && !body.trim()) return alert("Escribe contenido.");
    if (postType === "linkpost" && !linkUrl.trim()) return alert("Pega el link que quieres publicar.");
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No auth");

      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadToStorage(user.id, imageFile, "post-images");
      }

      const normalizedTargetGroup = isAdmin && !assignmentId ? (targetGroup || "Todos") : null;
      const finalType = postType === "linkpost" ? "post" : postType;
      const finalContent =
        postType === "linkpost"
          ? `${title}\n${linkUrl.trim()}\n${body}`.trim()
          : `${title}\n${body}`;

      const { data: insertedPost, error: insertError } = await supabase.from("posts").insert({
        content: finalContent,
        user_id: user.id,
        image_url: imageUrl,
        type: finalType,
        is_forum: !assignmentId && postType === "assignment" && assignmentSubtype === "internal",
        parent_assignment_id: assignmentId ? parseInt(assignmentId, 10) : null,
        target_group: assignmentId ? null : normalizedTargetGroup,
        deadline: postType === "assignment" ? deadline || null : null,
        assignment_subtype:
          postType === "assignment" ? assignmentSubtype : null,
      }).select("id, type, target_group").single();
      if (insertError) throw insertError;

      // Notify students when the teacher posts announcements or new assignments.
      if (
        isAdmin &&
        !assignmentId &&
        insertedPost &&
        (postType === "announcement" || postType === "assignment")
      ) {
        let recipientsQuery = supabase
          .from("profiles")
          .select("id, group_name")
          .eq("is_admin", false)
          .eq("is_approved", true);

        if (normalizedTargetGroup && normalizedTargetGroup !== "Todos") {
          recipientsQuery = recipientsQuery.eq("group_name", normalizedTargetGroup);
        }

        const { data: recipients } = await recipientsQuery;
        const notifications = (recipients || [])
          .filter((r: any) => r?.id && r.id !== user.id)
          .map((r: any) => ({
            user_id: r.id,
            message:
              postType === "announcement"
                ? `Nuevo anuncio: ${title}`
                : `Nueva tarea: ${title}`,
            link: `/post/${insertedPost.id}`,
            post_id: insertedPost.id,
            actor_user_id: user.id,
            type: postType === "announcement" ? "announcement" : "assignment",
            is_read: false,
          }));

        if (notifications.length > 0) {
          const { error: notifError } = await supabase.from("notifications").insert(notifications);
          if (notifError) {
            await supabase.from("notifications").insert(
              notifications.map((n) => ({
                user_id: n.user_id,
                message: n.message,
                link: n.link,
                is_read: n.is_read,
              })),
            );
          }
        }
      }

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
                <label className="label">{postType === "announcement" ? "Título del anuncio" : postType === "assignment" ? "Título de la tarea" : postType === "linkpost" ? "Título del link" : "Título"}</label>
                <input
                  type="text"
                  placeholder="Título de tu publicación..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="titleInput"
                />
              </div>

              <div className="fieldBlock">
                <div className="contentLabelRow">
                  <label className="label" style={{ marginBottom: 0 }}>Contenido</label>
                  <div className="contentTools">
                    <button
                      type="button"
                      className="miniToolBtn"
                      onClick={() => inlineImageInputRef.current?.click()}
                      disabled={inlineUploading || loading}
                    >
                      {inlineUploading ? "Subiendo imagen…" : "+ Imagen en texto"}
                    </button>
                    <input
                      ref={inlineImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleInlineImagePick}
                      style={{ display: "none" }}
                    />
                  </div>
                </div>
                <textarea
                  ref={textareaRef}
                  placeholder="Escribe aquí..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="bodyTextarea"
                />
                <div className="bodyHelp">
                  Puedes insertar imágenes dentro del texto con el botón de arriba. Se guardan como bloques entre párrafos.
                </div>
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
                    <p>{(postType === "linkpost" && linkUrl ? `${linkUrl}\n${body}` : body).trim() || "Tu contenido aparecerá aquí en una vista resumida."}</p>
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
                        <option value="announcement">お知らせ (Anuncio)</option>
                        <option value="linkpost">Link en el feed</option>
                        <option value="assignment">宿題 (Tarea)</option>
                      </select>
                    </label>

                    <label className="miniField">
                      <span>Visible para</span>
                      <select value={targetGroup} onChange={(e) => setTargetGroup(e.target.value)}>
                        <option value="Todos">Todos</option>
                        {availableGroups.map((g) => (
                          <option key={g.name} value={g.name}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    {postType === "linkpost" && (
                      <label className="miniField">
                        <span>URL del link</span>
                        <input
                          type="url"
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          placeholder="https://..."
                        />
                      </label>
                    )}

                    {postType === "assignment" && (
                      <label className="miniField">
                        <span>Modalidad de tarea</span>
                        <select
                          value={assignmentSubtype}
                          onChange={(e) => setAssignmentSubtype(e.target.value as "internal" | "external")}
                        >
                          <option value="external">Tarea tipo post (entrega en editor)</option>
                          <option value="internal">Tarea tipo foro (responden en el post)</option>
                        </select>
                      </label>
                    )}

                    {postType === "assignment" && (
                      <label className="miniField">
                        <span>Fecha límite</span>
                        <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
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
        .contentLabelRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }
        .contentTools {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .label {
          display: block;
          font-size: 12px;
          color: #666a73;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .miniToolBtn {
          border: 1px solid rgba(17,17,20,.1);
          background: #fff;
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 600;
          color: #333;
          cursor: pointer;
        }
        .miniToolBtn:disabled {
          opacity: .6;
          cursor: not-allowed;
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
        .bodyHelp {
          margin-top: 8px;
          color: #7c7c85;
          font-size: 12px;
          line-height: 1.4;
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
