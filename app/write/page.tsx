"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
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
  const editId = searchParams.get("edit_id");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inlineUploading, setInlineUploading] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [editingPostUserId, setEditingPostUserId] = useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [postType, setPostType] = useState<"post" | "linkpost">("post");
  const [targetGroup, setTargetGroup] = useState("Todos");
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

      if (editId) {
        setLoadingDraft(true);
        const { data: existing } = await supabase
          .from("posts")
          .select("*")
          .eq("id", editId)
          .maybeSingle();
        if (!existing) {
          alert("No se encontró el post a editar.");
          setLoadingDraft(false);
          return router.push("/");
        }
        const canEdit = existing.user_id === user.id || Boolean(profile?.is_admin);
        if (!canEdit) {
          alert("No tienes permisos para editar este post.");
          setLoadingDraft(false);
          return router.push(`/post/${editId}`);
        }
        setEditingPostUserId(existing.user_id || user.id);
        const [rawTitle, ...rest] = String(existing.content || "").split("\n");
        setTitle(rawTitle || "");
        setBody(rest.join("\n").trim());
        if (existing.image_url) setPreviewUrl(existing.image_url);
        setPostType("post");
        if (existing.target_group) setTargetGroup(existing.target_group);
        setLoadingDraft(false);
      } else {
        const draftKey = "write-draft-main";
        try {
          const raw = localStorage.getItem(draftKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            setTitle(parsed?.title || "");
            setBody(parsed?.body || "");
            if (parsed?.postType === "linkpost") setPostType("linkpost");
            else setPostType("post");
            if (parsed?.targetGroup) setTargetGroup(parsed.targetGroup);
            if (parsed?.linkUrl) setLinkUrl(parsed.linkUrl);
          }
        } catch {}
      }
    };

    void checkUser();
  }, [router, editId]);

  useEffect(() => {
    if (editId) return;
    const draftKey = "write-draft-main";
    const payload = {
      title,
      body,
      postType,
      targetGroup,
      linkUrl,
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem(draftKey, JSON.stringify(payload));
    } catch {}
  }, [title, body, postType, targetGroup, linkUrl, editId]);

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

      const normalizedTargetGroup = isAdmin ? (targetGroup || "Todos").trim() : null;
      const finalType = "post";
      const finalContent =
        postType === "linkpost"
          ? `${title}\n${linkUrl.trim()}\n${body}`.trim()
          : `${title}\n${body}`;

      const payload = {
        content: finalContent,
        user_id: editingPostUserId || user.id,
        image_url: imageUrl || (editId ? previewUrl : null),
        type: finalType,
        target_group: normalizedTargetGroup,
      } as any;

      let insertedPost: { id: number; type: string; target_group: string | null } | null = editId
        ? { id: Number(editId), type: finalType, target_group: normalizedTargetGroup }
        : null;
      if (editId) {
        const { error: updateError } = await supabase.from("posts").update(payload).eq("id", editId);
        if (updateError) throw updateError;
      } else {
        const { data: created, error: insertError } = await supabase.from("posts").insert(payload).select("id, type, target_group").single();
        if (insertError) throw insertError;
        if (created) insertedPost = created as any;
      }

      const draftKey = "write-draft-main";
      try {
        localStorage.removeItem(draftKey);
      } catch {}
      router.push("/");
    } catch {
      alert("Error al publicar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="writePage">
        <div className="writeShell">
          <header className="writeTopBar">
            <div className="leftTop">
              <Link href="/" className="ghostPill">Cancelar</Link>
              <div className="pageLabel">
                <span className="eyebrow">{editId ? "Editar" : "Escribir"}</span>
                <strong>{editId ? "Actualizar contenido" : "Nuevo contenido"}</strong>
              </div>
            </div>

            <button onClick={handlePublish} disabled={loading || loadingDraft} className="publishBtn">
              {editId ? "Guardar" : loading ? "Guardando..." : "Guardar"}
            </button>
          </header>

          <div className="editorGrid">
            <section className="editorCard">
              <div className="fieldBlock">
                <label className="label">{postType === "linkpost" ? "Título del link" : "Título"}</label>
                <input
                  type="text"
                  placeholder="Título"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="titleInput"
                />
              </div>

              {isAdmin && (
                <section className="inlineOptionsCard">
                  <div className="inlineOptionsHeader">
                    <span className="eyebrow">Opciones</span>
                  </div>

                  <div className="inlineOptionsGrid">
                    <label className="miniField">
                      <span>Tipo</span>
                      <select value={postType} onChange={(e) => setPostType(e.target.value as any)}>
                        <option value="post">Contenido</option>
                        <option value="linkpost">Link</option>
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
                      <label className="miniField fullWidthField">
                        <span>URL</span>
                        <input
                          type="url"
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          placeholder="https://..."
                        />
                      </label>
                    )}
                  </div>
                </section>
              )}

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
                      {inlineUploading ? "Subiendo…" : "Insertar Imagen en Texto"}
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
                  Inserta imágenes dentro del texto en la posición del cursor.
                </div>
              </div>
            </section>

            <aside className="sideStack">
              <section className="sideCard">
                <div className="sideHeader">
                  <span className="eyebrow">Portada</span>
                  <span className="muted">{imageFile ? "Lista" : "Opcional"}</span>
                </div>
                <label className="uploadBox">
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
                  <span>{imageFile ? "Cambiar portada" : "Seleccionar portada"}</span>
                </label>
                <p className="coverHelp">
                  Va arriba del contenido. No se inserta dentro del texto.
                </p>
                {previewUrl && (
                  <div className="imagePreviewWrap">
                    <img src={previewUrl} alt="Preview" className="imagePreview" />
                  </div>
                )}
              </section>
            </aside>
          </div>
        </div>
      </div>

      <style jsx>{`
        .writePage {
          min-height: 100vh;
          background: var(--color-bg);
          padding: var(--page-padding);
        }
        .writeShell {
          max-width: 960px;
          margin: 0 auto;
        }
        .writeTopBar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-3);
          position: sticky;
          top: 0;
          z-index: 20;
          background: color-mix(in srgb, var(--color-bg) 92%, transparent);
          backdrop-filter: blur(10px);
          padding: var(--space-2) 0 var(--space-4);
          margin-bottom: var(--space-2);
        }
        .leftTop {
          display: flex;
          gap: var(--space-3);
          align-items: center;
          min-width: 0;
        }
        .ghostPill {
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text);
          border-radius: var(--radius-pill);
          padding: 10px 14px;
          font-size: var(--text-body-sm);
          font-weight: 700;
          text-decoration: none;
          flex-shrink: 0;
        }
        .pageLabel {
          display: grid;
          min-width: 0;
          gap: 2px;
        }
        .pageLabel strong {
          color: var(--color-text);
          font-size: var(--text-body);
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .eyebrow {
          font-size: var(--text-label);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-text-muted);
          font-weight: 800;
        }
        .publishBtn {
          border: 0;
          background: var(--color-primary);
          color: #fff;
          border-radius: var(--radius-pill);
          padding: 11px 16px;
          font-size: var(--text-body-sm);
          font-weight: 800;
          cursor: pointer;
        }
        .publishBtn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .editorGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: var(--space-4);
        }
        .editorCard {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-card);
          padding: var(--space-5);
        }
        .fieldBlock + .fieldBlock {
          margin-top: var(--space-5);
        }
        .contentLabelRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-2);
          margin-bottom: var(--space-2);
          flex-wrap: wrap;
        }
        .contentTools {
          display: flex;
          gap: var(--space-2);
          align-items: center;
        }
        .label {
          display: block;
          font-size: var(--text-label);
          color: var(--color-text-muted);
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .miniToolBtn {
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          border-radius: var(--radius-pill);
          padding: 8px 12px;
          font-size: var(--text-body-sm);
          font-weight: 700;
          color: var(--color-text);
          cursor: pointer;
        }
        .miniToolBtn:disabled {
          opacity: .6;
          cursor: not-allowed;
        }
        .titleInput {
          width: 100%;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: 14px 14px;
          font-size: var(--text-h2);
          line-height: 1.2;
          font-weight: 800;
          outline: none;
          color: var(--color-text);
          letter-spacing: -0.02em;
        }
        .bodyTextarea {
          width: 100%;
          min-height: 48vh;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: 14px;
          font-size: var(--text-body);
          line-height: 1.7;
          resize: vertical;
          outline: none;
          color: var(--color-text);
          font-family: inherit;
        }
        .bodyHelp {
          margin-top: var(--space-2);
          color: var(--color-text-muted);
          font-size: var(--text-body-sm);
          line-height: 1.4;
        }
        .inlineOptionsCard {
          margin-top: var(--space-5);
          border-top: 1px solid var(--color-border);
          padding-top: var(--space-4);
          display: grid;
          gap: var(--space-3);
        }
        .inlineOptionsHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-2);
        }
        .inlineOptionsGrid {
          display: grid;
          gap: var(--space-3);
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .fullWidthField {
          grid-column: 1 / -1;
        }
        .titleInput:focus,
        .bodyTextarea:focus,
        .miniField select:focus,
        .miniField input:focus {
          border-color: var(--color-focus);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-focus) 16%, transparent);
          background: var(--color-surface);
        }
        .sideStack {
          display: grid;
          gap: var(--space-4);
          align-content: start;
        }
        .sideCard {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-card);
          padding: var(--space-4);
        }
        .sideHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-2);
          margin-bottom: var(--space-3);
        }
        .muted {
          color: var(--color-text-muted);
          font-size: var(--text-body-sm);
        }
        .uploadBox {
          display: grid;
          place-items: center;
          border: 1px dashed var(--color-border-strong);
          background: var(--color-surface);
          border-radius: var(--radius-md);
          min-height: 84px;
          cursor: pointer;
          font-size: var(--text-body-sm);
          color: var(--color-text);
          font-weight: 700;
        }
        .imagePreviewWrap {
          margin-top: var(--space-3);
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid var(--color-border);
          background: var(--color-surface-muted);
        }
        .imagePreview {
          width: 100%;
          height: 200px;
          object-fit: cover;
          display: block;
        }
        .coverHelp {
          margin: var(--space-2) 0 0;
          color: var(--color-text-muted);
          font-size: var(--text-body-sm);
          line-height: 1.45;
        }
        .miniField {
          display: grid;
          gap: 6px;
          font-size: var(--text-body-sm);
          color: var(--color-text-muted);
          font-weight: 600;
        }
        .miniField select,
        .miniField input {
          width: 100%;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-surface);
          padding: 10px 12px;
          font-size: var(--text-body-sm);
          font-family: inherit;
          color: var(--color-text);
          outline: none;
        }

        @media (min-width: 1040px) {
          .editorGrid {
            grid-template-columns: minmax(0, 1fr) 300px;
            align-items: start;
          }
          .sideStack {
            position: sticky;
            top: 84px;
          }
          .bodyTextarea {
            min-height: 64vh;
          }
        }

        @media (max-width: 720px) {
          .writeTopBar {
            align-items: flex-start;
          }
          .publishBtn {
            min-width: fit-content;
          }
          .inlineOptionsGrid {
            grid-template-columns: minmax(0, 1fr);
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
