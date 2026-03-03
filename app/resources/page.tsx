"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isPublicTargetGroup, normalizeGroupValue, isForumTaskSubtype, isTaskAnnouncementSubtype } from "@/lib/feed-utils";

type ResourceRow = {
  id: number | string;
  title: string;
  url: string | null;
  category: string | null;
  created_at?: string | null;
};

type ResourceKind = "link" | "file" | "note";

type ResourceDraft = {
  id?: number | string;
  title: string;
  folder: string;
  kind: ResourceKind;
  url: string;
  noteText: string;
};

const EMPTY_DRAFT: ResourceDraft = {
  title: "",
  folder: "General",
  kind: "link",
  url: "",
  noteText: "",
};

function inferKind(resource: ResourceRow): ResourceKind {
  const url = (resource.url || "").trim();
  if (!url) return "link";
  if (url.startsWith("data:text/plain")) return "note";
  return "file" === "file" &&
    /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|zip|jpg|jpeg|png|webp|mp4)$/i.test(url.split("?")[0])
    ? "file"
    : "link";
}

function decodeNoteUrl(url?: string | null): string {
  if (!url || !url.startsWith("data:text/plain")) return "";
  const comma = url.indexOf(",");
  if (comma < 0) return "";
  try {
    return decodeURIComponent(url.slice(comma + 1));
  } catch {
    return "";
  }
}

function encodeNoteUrl(text: string): string {
  return `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
}

function fileLabelFromUrl(url?: string | null): string {
  if (!url) return "Archivo";
  try {
    const pathname = new URL(url).pathname;
    return pathname.split("/").pop() || "Archivo";
  } catch {
    return url.split("/").pop() || "Archivo";
  }
}

function IconFolder() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3.8 7.8a2 2 0 0 1 2-2h4l1.5 1.7h6.9a2 2 0 0 1 2 2v6.9a2 2 0 0 1-2 2H5.8a2 2 0 0 1-2-2V7.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10.5 13.5l3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.4 15.6l-1.5 1.5a3 3 0 1 1-4.2-4.2l3-3a3 3 0 0 1 4.2 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15.6 8.4l1.5-1.5a3 3 0 1 1 4.2 4.2l-3 3a3 3 0 0 1-4.2 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconFile() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3.8h7l4.2 4.2v11.2a1.8 1.8 0 0 1-1.8 1.8H7a1.8 1.8 0 0 1-1.8-1.8V5.6A1.8 1.8 0 0 1 7 3.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 3.8V8h4.2" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function IconNote() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 4.8h12a1.7 1.7 0 0 1 1.7 1.7v11a1.7 1.7 0 0 1-1.7 1.7H6a1.7 1.7 0 0 1-1.7-1.7v-11A1.7 1.7 0 0 1 6 4.8Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 9h8M8 12h8M8 15h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [draft, setDraft] = useState<ResourceDraft>(EMPTY_DRAFT);
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>("General");
  const [selectedNoteId, setSelectedNoteId] = useState<number | string | null>(null);
  const [extraFolders, setExtraFolders] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [contentMode, setContentMode] = useState<"resources" | "tasks">("resources");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("resources_extra_folders");
      if (raw) setExtraFolders(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("resources_extra_folders", JSON.stringify(extraFolders));
    } catch {}
  }, [extraFolders]);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setMyProfile(prof || null);
      setIsAdmin(Boolean(prof?.is_admin));

      const { data: taskRows } = await supabase
        .from("posts")
        .select("id, content, created_at, target_group, deadline, is_forum, assignment_subtype")
        .eq("type", "assignment")
        .is("parent_assignment_id", null)
        .order("created_at", { ascending: false });

      const visibleTasks = (taskRows || []).filter((task: any) => {
        if (prof?.is_admin) return true;
        if (task?.assignment_subtype === "forum" || task?.assignment_subtype === "internal" || task?.is_forum) return true;
        if (isPublicTargetGroup(task.target_group)) return true;
        return normalizeGroupValue(task.target_group) === normalizeGroupValue(prof?.group_name);
      });
      setTasks(visibleTasks);
    } else {
      setIsAdmin(false);
      setMyProfile(null);
      setTasks([]);
    }

    const { data, error } = await supabase.from("resources").select("*").order("category").order("title");
    if (error) {
      setErrorMsg("No se pudieron cargar los recursos.");
      setResources([]);
    } else {
      setResources((data as ResourceRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const folders = useMemo(() => {
    const dbFolders = resources
      .map((resource) => (resource.category || "General").trim())
      .filter(Boolean);
    const merged = Array.from(new Set(["General", ...dbFolders, ...extraFolders]));
    return merged.sort((a, b) => a.localeCompare(b));
  }, [resources, extraFolders]);

  useEffect(() => {
    if (!folders.includes(selectedFolder)) setSelectedFolder(folders[0] || "General");
  }, [folders, selectedFolder]);

  const resourcesInFolder = useMemo(() => {
    return resources.filter((resource) => (resource.category || "General") === selectedFolder);
  }, [resources, selectedFolder]);

  const selectedNote = useMemo(() => {
    return resources.find((resource) => resource.id === selectedNoteId) || null;
  }, [resources, selectedNoteId]);

  const resetComposer = () => {
    setDraft(EMPTY_DRAFT);
    setDraftFile(null);
    setEditingId(null);
    setShowComposer(false);
  };

  const startCreateInFolder = (folder: string) => {
    setDraft({ ...EMPTY_DRAFT, folder, kind: "link" });
    setDraftFile(null);
    setEditingId(null);
    setShowComposer(true);
  };

  const startEdit = (resource: ResourceRow) => {
    const kind = inferKind(resource);
    setDraft({
      id: resource.id,
      title: resource.title || "",
      folder: resource.category || "General",
      kind,
      url: kind === "note" ? "" : resource.url || "",
      noteText: kind === "note" ? decodeNoteUrl(resource.url) : "",
    });
    setDraftFile(null);
    setEditingId(resource.id);
    setShowComposer(true);
  };

  const addFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    if (!extraFolders.includes(name) && !folders.includes(name)) {
      setExtraFolders((prev) => [...prev, name]);
    }
    setSelectedFolder(name);
    setNewFolderName("");
  };

  const buildPayload = async (): Promise<{ title: string; url: string; category: string } | null> => {
    const title = draft.title.trim();
    const category = draft.folder.trim() || "General";
    if (!title) {
      alert("Escribe un título.");
      return null;
    }

    if (draft.kind === "link") {
      if (!draft.url.trim()) {
        alert("Pega un enlace.");
        return null;
      }
      return { title, url: draft.url.trim(), category };
    }

    if (draft.kind === "note") {
      if (!draft.noteText.trim()) {
        alert("Escribe contenido para la nota.");
        return null;
      }
      return { title, url: encodeNoteUrl(draft.noteText), category };
    }

    if (!draftFile && !editingId) {
      alert("Selecciona un archivo.");
      return null;
    }

    if (draftFile) {
      setUploading(true);
      const ext = draftFile.name.split(".").pop() || "bin";
      const path = `resources/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { data, error } = await supabase.storage.from("uploads").upload(path, draftFile);
      setUploading(false);
      if (error || !data?.path) {
        alert("No se pudo subir el archivo.");
        return null;
      }
      const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(data.path);
      return { title, url: urlData.publicUrl, category };
    }

    const existing = resources.find((r) => r.id === editingId);
    return { title, url: existing?.url || "", category };
  };

  const saveResource = async () => {
    if (!isAdmin || saving || uploading) return;
    setSaving(true);
    try {
      const payload = await buildPayload();
      if (!payload) return;

      if (editingId) {
        const { error } = await supabase.from("resources").update(payload).eq("id", editingId);
        if (error) {
          alert("No se pudo actualizar el recurso.");
          return;
        }
      } else {
        const { error } = await supabase.from("resources").insert([payload]);
        if (error) {
          alert("No se pudo guardar el recurso.");
          return;
        }
      }

      if (!extraFolders.includes(payload.category) && !folders.includes(payload.category)) {
        setExtraFolders((prev) => [...prev, payload.category]);
      }
      setSelectedFolder(payload.category);
      resetComposer();
      await fetchData();
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const deleteResource = async (resourceId: number | string) => {
    if (!isAdmin) return;
    if (!confirm("¿Eliminar este recurso?")) return;
    const { error } = await supabase.from("resources").delete().eq("id", resourceId);
    if (error) {
      alert("No se pudo eliminar el recurso.");
      return;
    }
    if (selectedNoteId === resourceId) setSelectedNoteId(null);
    await fetchData();
  };

  return (
    <>
      <div className="resourcesPage">
        <div className="resourcesShell">
          <header className="topBar">
            <div className="topLeft">
              <Link href="/" className="ghostBtn">← Volver</Link>
              <div>
                <div className="eyebrow">Recursos</div>
                <h1 className="title">Biblioteca</h1>
              </div>
            </div>
            <div className="topActions">
              <div className="toggleTabs" role="tablist" aria-label="Cambiar vista">
                <button type="button" className={`toggleTab ${contentMode === "resources" ? "active" : ""}`} onClick={() => setContentMode("resources")}>
                  Recursos
                </button>
                <button type="button" className={`toggleTab ${contentMode === "tasks" ? "active" : ""}`} onClick={() => setContentMode("tasks")}>
                  Tareas
                </button>
              </div>
              {isAdmin && (
                <button type="button" onClick={() => startCreateInFolder(selectedFolder)} className="primaryBtn">
                  + Nuevo recurso
                </button>
              )}
            </div>
          </header>

          {errorMsg && <div className="errorBox">{errorMsg}</div>}

          <div className="layoutGrid">
            {contentMode === "resources" ? (
            <aside className="foldersPanel">
              <div className="panelHead">
                <div>
                  <div className="eyebrow">Carpetas</div>
                  <h2>Organización</h2>
                </div>
                <span className="countPill">{folders.length}</span>
              </div>

              {isAdmin && (
                <div className="folderCreator">
                  <input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Nueva carpeta"
                  />
                  <button type="button" onClick={addFolder}>Crear</button>
                </div>
              )}

              <div className="folderList">
                {folders.map((folder) => {
                  const count = resources.filter((resource) => (resource.category || "General") === folder).length;
                  const active = folder === selectedFolder;
                  return (
                    <button
                      key={folder}
                      type="button"
                      className={`folderBtn ${active ? "active" : ""}`}
                      onClick={() => setSelectedFolder(folder)}
                    >
                      <span className="folderBtnLabel">
                        <IconFolder />
                        <span>{folder}</span>
                      </span>
                      <span className="folderCount">{count}</span>
                    </button>
                  );
                })}
              </div>

              <p className="panelHint">
                Las carpetas vacías se guardan localmente hasta que agregues contenido.
              </p>
            </aside>
            ) : (
              <aside className="foldersPanel">
                <div className="panelHead">
                  <div>
                    <div className="eyebrow">Tareas</div>
                    <h2>Asignadas</h2>
                  </div>
                  <span className="countPill">{tasks.length}</span>
                </div>
                <p className="panelHint">
                  {isAdmin ? "Vista de todas las tareas publicadas." : `Solo ves tareas para ${myProfile?.group_name || "tu grupo"} o para Todos.`}
                </p>
              </aside>
            )}

            <section className="contentPanel">
              <div className="panelHead">
                <div>
                  <div className="eyebrow">{contentMode === "resources" ? "Contenido" : "Tareas"}</div>
                  <h2>{contentMode === "resources" ? selectedFolder : "Pendientes y activas"}</h2>
                </div>
                <span className="countPill">{contentMode === "resources" ? `${resourcesInFolder.length} items` : `${tasks.length} tareas`}</span>
              </div>

              {contentMode === "resources" && showComposer && isAdmin && (
                <div className="composerCard">
                  <div className="composerHeader">
                    <strong>{editingId ? "Editar recurso" : "Nuevo recurso"}</strong>
                    <button type="button" onClick={resetComposer} className="miniGhost">Cancelar</button>
                  </div>

                  <div className="composerGrid">
                    <label className="field">
                      <span>Título</span>
                      <input
                        value={draft.title}
                        onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="Nombre del recurso"
                      />
                    </label>

                    <label className="field">
                      <span>Carpeta</span>
                      <input
                        value={draft.folder}
                        onChange={(e) => setDraft((prev) => ({ ...prev, folder: e.target.value }))}
                        placeholder="General"
                      />
                    </label>

                    <div className="field">
                      <span>Tipo</span>
                      <div className="kindTabs">
                        {(["link", "file", "note"] as ResourceKind[]).map((kind) => (
                          <button
                            key={kind}
                            type="button"
                            className={`kindTab ${draft.kind === kind ? "active" : ""}`}
                            onClick={() =>
                              setDraft((prev) => ({
                                ...prev,
                                kind,
                                url: kind === "link" ? prev.url : "",
                                noteText: kind === "note" ? prev.noteText : prev.noteText,
                              }))
                            }
                          >
                            {kind === "link" ? "Link" : kind === "file" ? "Archivo" : "Nota"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {draft.kind === "link" && (
                      <label className="field full">
                        <span>URL</span>
                        <input
                          value={draft.url}
                          onChange={(e) => setDraft((prev) => ({ ...prev, url: e.target.value }))}
                          placeholder="https://..."
                        />
                      </label>
                    )}

                    {draft.kind === "file" && (
                      <label className="field full">
                        <span>Archivo</span>
                        <div className="fileInputWrap">
                          <input type="file" onChange={(e) => setDraftFile(e.target.files?.[0] || null)} />
                          <small>{draftFile ? draftFile.name : editingId ? "Sube uno nuevo para reemplazar" : "PDF, DOC, imágenes, etc."}</small>
                        </div>
                      </label>
                    )}

                    {draft.kind === "note" && (
                      <label className="field full">
                        <span>Contenido de la nota</span>
                        <textarea
                          value={draft.noteText}
                          onChange={(e) => setDraft((prev) => ({ ...prev, noteText: e.target.value }))}
                          placeholder="Escribe una nota o mini documento de texto..."
                          rows={8}
                        />
                      </label>
                    )}
                  </div>

                  <div className="composerActions">
                    <button type="button" onClick={saveResource} className="primaryBtn" disabled={saving || uploading}>
                      {uploading ? "Subiendo..." : saving ? "Guardando..." : editingId ? "Guardar cambios" : "Guardar recurso"}
                    </button>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="emptyBox">Cargando recursos…</div>
              ) : contentMode === "tasks" ? (
                tasks.length === 0 ? (
                  <div className="emptyBox">
                    <p>No hay tareas visibles para ti.</p>
                  </div>
                ) : (
                  <div className="resourceList">
                    {tasks.map((task) => {
                      const [taskTitle, ...taskBody] = String(task.content || "").split("\n");
                      const deadline = task.deadline ? new Date(task.deadline) : null;
                      const isExpired = Boolean(deadline && deadline.getTime() < Date.now());
                      const isForum = Boolean(task.is_forum || isForumTaskSubtype(task.assignment_subtype));
                      const isAnnouncementTask = isTaskAnnouncementSubtype(task.assignment_subtype);
                      const isAssignedToMe =
                        isAdmin ||
                        isPublicTargetGroup(task.target_group) ||
                        normalizeGroupValue(task.target_group) === normalizeGroupValue(myProfile?.group_name);
                      return (
                        <Link key={task.id} href={`/post/${task.id}`} className="resourceRow" style={{ textDecoration: "none" }}>
                          <div className="resourceMain">
                            <div className="resourceIcon" style={{ color: isForum ? "#3d81ce" : isAnnouncementTask ? "#3d81ce" : "#159578", background: isForum ? "#eff6ff" : isAnnouncementTask ? "#f4fbff" : "#ecfdf5" }}>
                              {isForum ? "💬" : isAnnouncementTask ? "📌" : "📝"}
                            </div>
                            <div className="resourceText">
                              <div className="resourceTitleRow">
                                <strong>{taskTitle || "Tarea"}</strong>
                                <span className={`typeTag ${isForum ? "note" : "link"}`}>
                                  {isForum ? "foro" : isAnnouncementTask ? "anuncio" : "tarea"}
                                </span>
                              </div>
                              <p>{taskBody.join(" ").trim() || "Abrir para ver instrucciones."}</p>
                              <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                                <span className="typeTag" style={{ textTransform: "none", letterSpacing: 0, fontWeight: 700 }}>{task.target_group || "Todos"}</span>
                                {isForum && !isAssignedToMe && (
                                  <span className="typeTag" style={{ textTransform: "none", letterSpacing: 0, fontWeight: 700, color: "#64748b", background: "#f8fafc", borderColor: "#e2e8f0" }}>
                                    Foro abierto
                                  </span>
                                )}
                                {deadline && (
                                  <span className="typeTag" style={{ textTransform: "none", letterSpacing: 0, fontWeight: 700, color: isExpired ? "#b45309" : "#475569", background: isExpired ? "#fffbeb" : "#f8fafc", borderColor: isExpired ? "#fde68a" : "#e2e8f0" }}>
                                    {isExpired ? "Vencida" : "Deadline"} · {deadline.toLocaleString("es-MX")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="resourceActions">
                            <span className="miniGhost">Abrir</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )
              ) : resourcesInFolder.length === 0 ? (
                <div className="emptyBox">
                  <p>No hay recursos en esta carpeta.</p>
                  {isAdmin && (
                    <button type="button" className="secondaryBtn" onClick={() => startCreateInFolder(selectedFolder)}>
                      Agregar primer recurso
                    </button>
                  )}
                </div>
              ) : (
                <div className="resourceList">
                  {resourcesInFolder.map((resource) => {
                    const kind = inferKind(resource);
                    const isSelectedNote = selectedNoteId === resource.id && kind === "note";
                    const openHref = kind === "note" ? null : resource.url;
                    return (
                      <div key={resource.id} className={`resourceRow ${isSelectedNote ? "selected" : ""}`}>
                        <div className="resourceMain">
                          <div className="resourceIcon">
                            {kind === "link" ? <IconLink /> : kind === "file" ? <IconFile /> : <IconNote />}
                          </div>
                          <div className="resourceText">
                            <div className="resourceTitleRow">
                              <strong>{resource.title}</strong>
                              <span className={`typeTag ${kind}`}>{kind}</span>
                            </div>
                            <p>
                              {kind === "note"
                                ? decodeNoteUrl(resource.url).slice(0, 120) || "Nota de texto"
                                : kind === "file"
                                  ? fileLabelFromUrl(resource.url)
                                  : resource.url || "Sin URL"}
                            </p>
                          </div>
                        </div>

                        <div className="resourceActions">
                          {kind === "note" ? (
                            <button
                              type="button"
                              className="miniGhost"
                              onClick={() => setSelectedNoteId(isSelectedNote ? null : resource.id)}
                            >
                              {isSelectedNote ? "Cerrar" : "Ver"}
                            </button>
                          ) : (
                            openHref && (
                              <a href={openHref} target="_blank" rel="noopener noreferrer" className="miniGhost">
                                Abrir
                              </a>
                            )
                          )}

                          {isAdmin && (
                            <>
                              <button type="button" className="miniGhost" onClick={() => startEdit(resource)}>
                                Editar
                              </button>
                              <button type="button" className="miniDanger" onClick={() => deleteResource(resource.id)}>
                                Eliminar
                              </button>
                            </>
                          )}
                        </div>

                        {isSelectedNote && (
                          <div className="noteViewer">
                            <div className="noteViewerHeader">
                              <strong>{resource.title}</strong>
                            </div>
                            <pre>{decodeNoteUrl(resource.url)}</pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <style jsx>{`
        .resourcesPage {
          min-height: 100vh;
          background: radial-gradient(900px 420px at 50% -10%, rgba(88, 168, 255, 0.07), transparent 65%), #f6f7f8;
          padding: 14px;
        }
        .resourcesShell {
          max-width: 1320px;
          margin: 0 auto;
        }
        .topBar {
          position: sticky;
          top: 0;
          z-index: 20;
          background: rgba(246,247,248,.84);
          backdrop-filter: blur(10px);
          padding: 10px 0 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 4px;
        }
        .topLeft {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .ghostBtn {
          border: 1px solid rgba(17,17,20,.1);
          background: #fff;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 13px;
          text-decoration: none;
          color: #222;
          flex-shrink: 0;
        }
        .eyebrow {
          font-size: 11px;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: #7a7a84;
          font-weight: 800;
        }
        .title {
          margin: 4px 0 0;
          font-size: 28px;
          line-height: 1;
          letter-spacing: -.02em;
          color: #111114;
        }
        .topActions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .toggleTabs {
          display: inline-flex;
          gap: 4px;
          border: 1px solid rgba(17,17,20,.08);
          background: #fff;
          border-radius: 999px;
          padding: 3px;
        }
        .toggleTab {
          border: 0;
          background: transparent;
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 700;
          color: #666a73;
          cursor: pointer;
        }
        .toggleTab.active {
          background: #111114;
          color: #fff;
        }
        .primaryBtn, .secondaryBtn {
          border: 0;
          border-radius: 999px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .primaryBtn {
          color: #fff;
          background: linear-gradient(135deg, #34c5a6, #25a98f);
          box-shadow: 0 8px 18px rgba(44,182,150,.2);
        }
        .primaryBtn:disabled { opacity: .6; cursor: not-allowed; box-shadow: none; }
        .secondaryBtn {
          color: #222;
          background: #fff;
          border: 1px solid rgba(17,17,20,.1);
        }
        .errorBox {
          border: 1px solid #fecaca;
          background: #fff1f2;
          color: #9f1239;
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 10px;
          font-size: 14px;
        }
        .layoutGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 14px;
        }
        .foldersPanel, .contentPanel {
          background: #fff;
          border: 1px solid rgba(17,17,20,.07);
          border-radius: 20px;
          box-shadow: 0 12px 30px rgba(0,0,0,.035);
          padding: 14px;
        }
        .panelHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }
        .panelHead h2 {
          margin: 4px 0 0;
          font-size: 20px;
          line-height: 1;
          letter-spacing: -.01em;
          color: #111114;
        }
        .countPill {
          border-radius: 999px;
          border: 1px solid rgba(17,17,20,.07);
          background: #f6f7f8;
          color: #666a73;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 10px;
          white-space: nowrap;
        }
        .folderCreator {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          margin-bottom: 10px;
        }
        .folderCreator input {
          border: 1px solid rgba(17,17,20,.1);
          border-radius: 10px;
          padding: 9px 10px;
          outline: none;
          font-size: 13px;
          font-family: inherit;
          background: #fff;
        }
        .folderCreator button {
          border: 1px solid rgba(17,17,20,.1);
          background: #fff;
          border-radius: 10px;
          padding: 9px 12px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }
        .folderList {
          display: grid;
          gap: 6px;
        }
        .folderBtn {
          border: 1px solid rgba(17,17,20,.06);
          background: #fff;
          border-radius: 12px;
          padding: 10px 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          cursor: pointer;
          text-align: left;
        }
        .folderBtn.active {
          background: #f2fffa;
          border-color: rgba(44,182,150,.2);
        }
        .folderBtnLabel {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #222;
          font-size: 13px;
          font-weight: 600;
          min-width: 0;
        }
        .folderBtnLabel span:last-child {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .folderCount {
          font-size: 11px;
          color: #7c7c85;
          border-radius: 999px;
          background: #f5f5f5;
          padding: 3px 8px;
          font-weight: 700;
        }
        .panelHint {
          margin: 10px 2px 0;
          color: #8a8a94;
          font-size: 11px;
          line-height: 1.4;
        }
        .composerCard {
          border: 1px solid rgba(17,17,20,.07);
          border-radius: 16px;
          background: linear-gradient(180deg, #fcfffe 0%, #fff 50%);
          padding: 12px;
          margin-bottom: 12px;
        }
        .composerHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 10px;
        }
        .composerHeader strong {
          color: #111114;
          font-size: 14px;
        }
        .composerGrid {
          display: grid;
          gap: 10px;
          grid-template-columns: minmax(0, 1fr);
        }
        .field {
          display: grid;
          gap: 6px;
        }
        .field.full { grid-column: 1 / -1; }
        .field > span {
          color: #666a73;
          font-size: 12px;
          font-weight: 600;
        }
        .field input, .field textarea {
          width: 100%;
          border: 1px solid rgba(17,17,20,.1);
          border-radius: 10px;
          padding: 9px 10px;
          font-size: 13px;
          font-family: inherit;
          outline: none;
          background: #fff;
          color: #222;
        }
        .field textarea { resize: vertical; min-height: 120px; line-height: 1.55; }
        .kindTabs {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .kindTab {
          border: 1px solid rgba(17,17,20,.1);
          background: #fff;
          color: #444;
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .kindTab.active {
          border-color: rgba(44,182,150,.22);
          background: #f2fffa;
          color: #12745e;
        }
        .fileInputWrap {
          border: 1px dashed rgba(17,17,20,.16);
          border-radius: 10px;
          padding: 10px;
          background: #fbfbfc;
        }
        .fileInputWrap input {
          border: 0;
          padding: 0;
          background: transparent;
        }
        .fileInputWrap small {
          display: block;
          margin-top: 6px;
          color: #7c7c85;
          font-size: 11px;
        }
        .composerActions {
          margin-top: 10px;
          display: flex;
          justify-content: flex-end;
        }
        .miniGhost, .miniDanger {
          border: 1px solid rgba(17,17,20,.1);
          background: #fff;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          cursor: pointer;
          color: #444;
          text-decoration: none;
        }
        .miniDanger {
          border-color: #fecaca;
          color: #b91c1c;
          background: #fff;
        }
        .emptyBox {
          border: 1px dashed rgba(17,17,20,.12);
          border-radius: 14px;
          padding: 24px 16px;
          text-align: center;
          color: #8a8a94;
          background: #fcfcfd;
          font-size: 14px;
        }
        .emptyBox p { margin: 0 0 10px; }
        .resourceList {
          display: grid;
          gap: 8px;
        }
        .resourceRow {
          border: 1px solid rgba(17,17,20,.06);
          border-radius: 14px;
          background: #fff;
          padding: 10px;
          display: grid;
          gap: 10px;
        }
        .resourceRow.selected {
          border-color: rgba(44,182,150,.22);
          background: #fbfffd;
        }
        .resourceMain {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          min-width: 0;
        }
        .resourceIcon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: #f6f7f8;
          color: #5f636d;
          border: 1px solid rgba(17,17,20,.06);
          flex-shrink: 0;
        }
        .resourceText { min-width: 0; flex: 1; }
        .resourceTitleRow {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }
        .resourceTitleRow strong {
          color: #17171b;
          font-size: 14px;
          line-height: 1.3;
        }
        .typeTag {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .06em;
          border-radius: 999px;
          padding: 3px 7px;
          border: 1px solid rgba(17,17,20,.08);
          color: #666a73;
          background: #f6f7f8;
        }
        .typeTag.note {
          color: #2563eb;
          background: #eff6ff;
          border-color: #bfdbfe;
        }
        .typeTag.file {
          color: #7c3aed;
          background: #f5f3ff;
          border-color: #ddd6fe;
        }
        .typeTag.link {
          color: #0f766e;
          background: #ecfdf5;
          border-color: #bbf7d0;
        }
        .resourceText p {
          margin: 5px 0 0;
          color: #73737d;
          font-size: 12px;
          line-height: 1.45;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .resourceActions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .noteViewer {
          border-top: 1px solid rgba(17,17,20,.06);
          padding-top: 10px;
        }
        .noteViewerHeader {
          margin-bottom: 8px;
          font-size: 13px;
          color: #222;
        }
        .noteViewer pre {
          margin: 0;
          white-space: pre-wrap;
          font-family: inherit;
          font-size: 13px;
          line-height: 1.65;
          color: #2f2f35;
          background: #fbfbfc;
          border: 1px solid rgba(17,17,20,.06);
          border-radius: 12px;
          padding: 12px;
          max-height: 320px;
          overflow: auto;
        }

        @media (min-width: 1024px) {
          .resourcesPage { padding: 18px 22px 28px; }
          .layoutGrid {
            grid-template-columns: 320px minmax(0, 1fr);
            align-items: start;
          }
          .foldersPanel {
            position: sticky;
            top: 76px;
          }
          .composerGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </>
  );
}
