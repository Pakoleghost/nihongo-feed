"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useStudentViewMode } from "@/lib/use-student-view-mode";

function FileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const FOLDER_MARKER_TITLE = "__folder__";

type ResourceRow = {
  id: number;
  title: string;
  url: string | null;
  category: string | null;
};

type AdminAction = "link" | "file" | "folder";

function isFolderMarker(resource: ResourceRow) {
  return resource.title === FOLDER_MARKER_TITLE && !resource.url;
}

function getCategory(resource: Pick<ResourceRow, "category">) {
  return resource.category?.trim() || "General";
}

function isFile(url: string | null): boolean {
  if (!url) return false;
  const path = url.split("?")[0];
  if (/\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|zip|mp4|jpg|jpeg|png|webp)$/i.test(path)) return true;
  if (url.includes("/storage/v1/object/public/uploads/")) return true;
  return false;
}

function getFileExtension(url: string | null) {
  if (!url) return "";
  try {
    const fileName = decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
    return fileName.split(".").pop()?.toUpperCase() || "";
  } catch {
    const fileName = decodeURIComponent(url.split("/").pop() || "");
    return fileName.split(".").pop()?.toUpperCase() || "";
  }
}

function looksLikeStorageFileName(value: string | null | undefined) {
  const text = value?.trim() ?? "";
  return /^\d{10,}-[a-z0-9]+\.[a-z0-9]+$/i.test(text);
}

function getResourceTitle(resource: ResourceRow) {
  const title = resource.title?.trim();
  if (title && !looksLikeStorageFileName(title)) return title;
  const extension = getFileExtension(resource.url);
  return extension ? `Archivo ${extension}` : "Material del curso";
}

function getResourceSubtitle(url: string | null) {
  return isFile(url) ? "Archivo" : "Enlace";
}

function openResource(url: string | null) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function RecursosPage() {
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminAction, setAdminAction] = useState<AdminAction>("link");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [folderName, setFolderName] = useState("");
  const [category, setCategory] = useState("General");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const { effectiveIsAdmin } = useStudentViewMode(isAdmin);

  function toggleFolder(name: string) {
    setOpenFolders(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  async function load() {
    setLoading(true);
    setErrorMessage(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token ?? null;
    setAccessToken(token);

    if (sessionData.session?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", sessionData.session.user.id)
        .maybeSingle();
      setIsAdmin(Boolean(profile?.is_admin));
    } else {
      setIsAdmin(false);
    }

    const { data, error } = await supabase
      .from("resources")
      .select("id, title, url, category")
      .order("category", { ascending: true })
      .order("title", { ascending: true });

    if (error) {
      setResources([]);
      setErrorMessage("No se pudieron cargar los recursos.");
    } else {
      setResources((data as ResourceRow[] | null) ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const folders = useMemo(() => {
    const names = new Set<string>(["General"]);
    resources.forEach((resource) => names.add(getCategory(resource)));
    return [...names].sort((a, b) => a.localeCompare(b, "es"));
  }, [resources]);

  useEffect(() => {
    if (!folders.includes(category)) setCategory(folders[0] ?? "General");
  }, [category, folders]);

  const grouped = useMemo(() => {
    const visibleResources = resources.filter((resource) => !isFolderMarker(resource));
    const groups = folders.map((folder) => [
      folder,
      visibleResources.filter((resource) => getCategory(resource) === folder),
    ] as [string, ResourceRow[]]);
    return effectiveIsAdmin ? groups : groups.filter(([, items]) => items.length > 0);
  }, [effectiveIsAdmin, folders, resources]);

  function resetForm() {
    setTitle("");
    setUrl("");
    setFolderName("");
    setCategory(folders[0] ?? "General");
    setFile(null);
  }

  async function postAdminResource(payload: Record<string, unknown>) {
    if (!accessToken) throw new Error("AUTH");
    const response = await fetch("/api/resources", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("SAVE");
    return response.json();
  }

  async function uploadFileForResource(selectedFile: File) {
    const ext = selectedFile.name.split(".").pop() || "bin";
    const safeExt = ext.replace(/[^a-z0-9]/gi, "").slice(0, 12) || "bin";
    const path = `resources/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
    const { data, error } = await supabase.storage.from("uploads").upload(path, selectedFile);
    if (error || !data?.path) throw new Error("UPLOAD");
    return supabase.storage.from("uploads").getPublicUrl(data.path).data.publicUrl;
  }

  async function handleAdminSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!effectiveIsAdmin || saving) return;

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (adminAction === "folder") {
        const cleanFolder = folderName.trim();
        if (!cleanFolder) {
          setErrorMessage("Escribe el nombre de la carpeta.");
          return;
        }
        await postAdminResource({ action: "create_folder", category: cleanFolder });
        setSuccessMessage("Carpeta creada.");
      } else if (adminAction === "link") {
        if (!title.trim() || !url.trim()) {
          setErrorMessage("Escribe título y enlace.");
          return;
        }
        await postAdminResource({
          action: "create_resource",
          title: title.trim(),
          url: url.trim(),
          category,
        });
        setSuccessMessage("Enlace agregado.");
      } else {
        if (!file) {
          setErrorMessage("Selecciona un archivo.");
          return;
        }
        const publicUrl = await uploadFileForResource(file);
        await postAdminResource({
          action: "create_resource",
          title: title.trim() || file.name,
          url: publicUrl,
          category,
        });
        setSuccessMessage("Archivo agregado.");
      }

      resetForm();
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message === "UPLOAD"
          ? "No se pudo subir el archivo."
          : "No se pudo guardar el material.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
        position: "relative",
      }}
    >
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100%" }}>

      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: "18px" }}>
        {effectiveIsAdmin && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4, marginBottom: -8 }}>
            <span style={{ fontSize: "17px", fontWeight: 800, letterSpacing: "-0.2px", color: "#F4F4F8" }}>Materiales del curso</span>
            <button type="button" onClick={() => setShowAdminPanel((v) => !v)} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              height: 36, padding: "0 14px 0 11px", borderRadius: 999,
              background: "transparent", border: "1.5px solid rgba(78,205,196,0.45)",
              color: "#4ECDC4", fontFamily: "inherit", fontSize: "13.5px", fontWeight: 800,
              cursor: "pointer", whiteSpace: "nowrap",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/>
              </svg>
              {showAdminPanel ? "Cerrar" : "Agregar"}
            </button>
          </div>
        )}
        {effectiveIsAdmin && showAdminPanel ? (
          <form
            onSubmit={handleAdminSubmit}
            style={{
              background: "#16161F",
              borderRadius: "24px",
              padding: "16px",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.25)",
              display: "grid",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {[
                ["link", "Enlace"],
                ["file", "Archivo"],
                ["folder", "Carpeta"],
              ].map(([key, label]) => {
                const active = adminAction === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAdminAction(key as AdminAction)}
                    style={{
                      border: `1px solid ${active ? "rgba(78,205,196,0.40)" : "rgba(255,255,255,0.12)"}`,
                      borderRadius: "999px",
                      background: active ? "rgba(78,205,196,0.15)" : "rgba(255,255,255,0.07)",
                      color: active ? "#4ECDC4" : "rgba(255,255,255,0.55)",
                      padding: "8px 12px",
                      fontSize: "13px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {adminAction === "folder" ? (
              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 800, color: "rgba(255,255,255,0.42)" }}>Nombre de carpeta</span>
                <input
                  value={folderName}
                  onChange={(event) => setFolderName(event.target.value)}
                  placeholder="Ej. Lección 4"
                  style={fieldStyle}
                />
              </label>
            ) : (
              <>
                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 800, color: "rgba(255,255,255,0.42)" }}>Título</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={adminAction === "file" ? "Nombre visible del archivo" : "Nombre del enlace"}
                    style={fieldStyle}
                  />
                </label>

                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 800, color: "rgba(255,255,255,0.42)" }}>Carpeta</span>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    style={fieldStyle}
                  >
                    {folders.map((folder) => (
                      <option key={folder} value={folder}>
                        {folder}
                      </option>
                    ))}
                  </select>
                </label>

                {adminAction === "link" ? (
                  <label style={{ display: "grid", gap: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 800, color: "rgba(255,255,255,0.42)" }}>URL</span>
                    <input
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      placeholder="https://..."
                      style={fieldStyle}
                    />
                  </label>
                ) : (
                  <label style={{ display: "grid", gap: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 800, color: "rgba(255,255,255,0.42)" }}>Archivo</span>
                    <input
                      type="file"
                      onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                      style={{
                        ...fieldStyle,
                        padding: "10px",
                      }}
                    />
                  </label>
                )}
              </>
            )}

            {errorMessage ? (
              <div style={{ borderRadius: "16px", background: "rgba(230,57,70,0.12)", color: "#FF6470", padding: "10px 12px", fontSize: "13px", fontWeight: 700 }}>
                {errorMessage}
              </div>
            ) : null}
            {successMessage ? (
              <div style={{ borderRadius: "16px", background: "rgba(78,205,196,0.14)", color: "#4ECDC4", padding: "10px 12px", fontSize: "13px", fontWeight: 700 }}>
                {successMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              style={{
                border: "none",
                borderRadius: "999px",
                background: saving ? "rgba(255,255,255,0.07)" : "#E63946",
                color: saving ? "rgba(255,255,255,0.25)" : "#FFFFFF",
                padding: "13px 16px",
                fontSize: "15px",
                fontWeight: 800,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Guardando..." : adminAction === "folder" ? "Crear carpeta" : "Guardar material"}
            </button>
          </form>
        ) : errorMessage && !loading ? (
          <div style={{ borderRadius: "18px", background: "rgba(230,57,70,0.12)", color: "#FF6470", padding: "12px 14px", fontSize: "14px", fontWeight: 700 }}>
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.42)", padding: "48px 0", fontSize: 14 }}>
            Cargando…
          </div>
        ) : grouped.length === 0 ? (
          <div style={{ background: "#16161F", borderRadius: "16px", padding: "40px 24px", textAlign: "center", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ width: 84, height: 84, borderRadius: 24, background: "#1C1C28", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "rgba(244,244,248,0.3)" }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <p style={{ fontSize: "19px", fontWeight: 800, color: "#F4F4F8", margin: "0 0 8px" }}>Sin material aún</p>
            <p style={{ fontSize: "14px", color: "rgba(244,244,248,0.5)", margin: 0, lineHeight: 1.5, maxWidth: "28ch", marginInline: "auto" }}>El profesor subirá los archivos aquí cuando estén listos.</p>
          </div>
        ) : (
          grouped.map(([folder, items]) => {
            const isOpen = openFolders.has(folder);
            return (
            <section key={folder}>
              {/* Folder header — tap to toggle */}
              <button
                onClick={() => toggleFolder(folder)}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  width: "100%", background: "none", border: "none",
                  cursor: "pointer", padding: "0 0 10px", textAlign: "left",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <div style={{
                  display: "flex", alignItems: "center", gap: "7px", flex: 1,
                  background: isOpen ? "#F4F4F8" : "#16161F",
                  borderRadius: "999px",
                  padding: "0 12px 0 10px", height: 38,
                  border: `1.5px solid ${isOpen ? "#F4F4F8" : "rgba(255,255,255,0.07)"}`,
                  transition: "background 140ms ease, border-color 140ms ease",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"
                      stroke={isOpen ? "#0D0D1A" : "rgba(244,244,248,0.45)"}
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: isOpen ? "#0D0D1A" : "rgba(244,244,248,0.5)", flex: 1, transition: "color 140ms ease" }}>
                    {folder}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: isOpen ? "rgba(13,13,26,0.4)" : "rgba(244,244,248,0.28)" }}>
                    {items.length}
                  </span>
                </div>
                {/* Chevron */}
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                  style={{ flexShrink: 0, display: "flex" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M6 9l6 6 6-6" stroke="rgba(255,255,255,0.35)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  style={{ overflow: "hidden" }}
                >
              {items.length === 0 ? (
                <div style={{ background: "#1C1C28", borderRadius: "12px", padding: "16px", color: "rgba(255,255,255,0.25)", fontSize: "13px", fontWeight: 600, textAlign: "center", marginBottom: 12 }}>
                  Carpeta vacía
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "8px" }}>
                  {items.map((item) => {
                    const fileResource = isFile(item.url);
                    const ext = fileResource ? getFileExtension(item.url) : null;
                    const domain = !fileResource && item.url
                      ? (() => { try { return new URL(item.url).hostname.replace("www.", ""); } catch { return null; } })()
                      : null;

                    return (
                      <button
                        key={item.id}
                        onClick={() => openResource(item.url)}
                        disabled={!item.url}
                        style={{
                          background: "#16161F",
                          borderRadius: "16px",
                          padding: "13px 14px",
                          display: "flex",
                          alignItems: "center",
                          gap: "13px",
                          border: "1px solid rgba(255,255,255,0.07)",
                          cursor: item.url ? "pointer" : "default",
                          textAlign: "left",
                          width: "100%",
                          opacity: item.url ? 1 : 0.45,
                        }}
                      >
                        {/* Icon */}
                        <div style={{
                          width: 44, height: 44, borderRadius: "12px", flexShrink: 0,
                          background: "#1C1C28", border: "1px solid rgba(255,255,255,0.07)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: fileResource ? "#E63946" : "#4ECDC4",
                        }}>
                          {fileResource ? <FileIcon /> : <LinkIcon />}
                        </div>

                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "15px", fontWeight: 700, color: "#F4F4F8", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {getResourceTitle(item)}
                          </p>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                            <span style={{
                              display: "inline-flex", alignItems: "center", height: 20, padding: "0 8px",
                              borderRadius: 6, fontSize: "10.5px", fontWeight: 800, letterSpacing: "0.4px",
                              background: fileResource ? "rgba(230,57,70,0.14)" : "rgba(78,205,196,0.12)",
                              color: fileResource ? "#FF9CA3" : "#4ECDC4",
                            }}>
                              {fileResource ? (ext || "PDF") : "LINK"}
                            </span>
                            <span style={{ fontSize: "12.5px", fontWeight: 600, color: "rgba(244,244,248,0.5)" }}>
                              {ext ? "" : domain ?? ""}
                            </span>
                          </div>
                        </div>

                        {/* Action icon */}
                        {fileResource ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: "rgba(244,244,248,0.3)" }}>
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: "rgba(244,244,248,0.3)" }}>
                            <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
                </motion.div>
              )}
              </AnimatePresence>
            </section>
            );
          })
        )}
      </div>


      </div>
    </div>
  );
}

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.07)",
  color: "#FFFFFF",
  padding: "12px 13px",
  fontSize: "15px",
  fontWeight: 700,
  outline: "none",
} satisfies React.CSSProperties;
