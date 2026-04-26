"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import { useStudentViewMode } from "@/lib/use-student-view-mode";

function FileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#E63946" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="14 2 14 8 20 8" stroke="#E63946" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="16" y1="13" x2="8" y2="13" stroke="#E63946" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="16" y1="17" x2="8" y2="17" stroke="#E63946" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="#4ECDC4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="#4ECDC4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
  const { effectiveIsAdmin } = useStudentViewMode(isAdmin);

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
        background: "#FFF8E7",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        paddingBottom: "calc(112px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "12px",
          padding: "20px 20px 16px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "42px",
              fontWeight: 800,
              color: "#1A1A2E",
              margin: 0,
              lineHeight: 1,
            }}
          >
            Recursos
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#7A7F8D", lineHeight: 1.35 }}>
            Materiales del curso
          </p>
        </div>

        {effectiveIsAdmin ? (
          <button
            type="button"
            onClick={() => setShowAdminPanel((value) => !value)}
            style={{
              border: "none",
              borderRadius: "10px",
              background: "#1A1A2E",
              color: "#FFFFFF",
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              flexShrink: 0,
              marginTop: "8px",
            }}
          >
            {showAdminPanel ? "Cerrar" : "Agregar"}
          </button>
        ) : null}
      </div>

      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: "18px" }}>
        {effectiveIsAdmin && showAdminPanel ? (
          <form
            onSubmit={handleAdminSubmit}
            style={{
              background: "#FFFFFF",
              borderRadius: "24px",
              padding: "16px",
              boxShadow: "0 8px 24px rgba(26,26,46,0.08)",
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
                      border: "none",
                      borderRadius: "999px",
                      background: active ? "#4ECDC4" : "#F7F3ED",
                      color: active ? "#1A1A2E" : "#53596B",
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
                <span style={{ fontSize: "12px", fontWeight: 800, color: "#9CA3AF" }}>Nombre de carpeta</span>
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
                  <span style={{ fontSize: "12px", fontWeight: 800, color: "#9CA3AF" }}>Título</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={adminAction === "file" ? "Nombre visible del archivo" : "Nombre del enlace"}
                    style={fieldStyle}
                  />
                </label>

                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 800, color: "#9CA3AF" }}>Carpeta</span>
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
                    <span style={{ fontSize: "12px", fontWeight: 800, color: "#9CA3AF" }}>URL</span>
                    <input
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      placeholder="https://..."
                      style={fieldStyle}
                    />
                  </label>
                ) : (
                  <label style={{ display: "grid", gap: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 800, color: "#9CA3AF" }}>Archivo</span>
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
              <div style={{ borderRadius: "16px", background: "rgba(230,57,70,0.10)", color: "#C53340", padding: "10px 12px", fontSize: "13px", fontWeight: 700 }}>
                {errorMessage}
              </div>
            ) : null}
            {successMessage ? (
              <div style={{ borderRadius: "16px", background: "rgba(78,205,196,0.16)", color: "#178A83", padding: "10px 12px", fontSize: "13px", fontWeight: 700 }}>
                {successMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              style={{
                border: "none",
                borderRadius: "999px",
                background: saving ? "#E5E7EB" : "#E63946",
                color: saving ? "#9CA3AF" : "#FFFFFF",
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
          <div style={{ borderRadius: "18px", background: "rgba(230,57,70,0.10)", color: "#C53340", padding: "12px 14px", fontSize: "14px", fontWeight: 700 }}>
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <div style={{ textAlign: "center", color: "#9CA3AF", padding: "40px 0" }}>
            Cargando...
          </div>
        ) : grouped.length === 0 ? (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "20px",
              padding: "32px",
              textAlign: "center",
              boxShadow: "0 4px 20px rgba(26,26,46,0.07)",
            }}
          >
            <p style={{ fontSize: "16px", color: "#9CA3AF", margin: 0 }}>
              El profesor aún no ha subido material.
            </p>
          </div>
        ) : (
          grouped.map(([folder, items]) => (
            <section key={folder}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "10px" }}>
                <p
                  style={{
                    fontSize: "15px",
                    fontWeight: 800,
                    color: "#53596B",
                    margin: 0,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {folder}
                </p>
                {effectiveIsAdmin ? (
                  <span
                    style={{
                      borderRadius: "6px",
                      background: "rgba(78,205,196,0.12)",
                      color: "#178A83",
                      padding: "3px 7px",
                      fontSize: "10px",
                      fontWeight: 700,
                    }}
                  >
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </span>
                ) : null}
              </div>

              {items.length === 0 ? (
                <div
                  style={{
                    background: "rgba(255,255,255,0.62)",
                    borderRadius: "20px",
                    padding: "18px",
                    color: "#9CA3AF",
                    fontSize: "14px",
                    fontWeight: 700,
                    textAlign: "center",
                  }}
                >
                  Carpeta vacía.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {items.map((item) => {
                    const fileResource = isFile(item.url);
                    return (
                      <button
                        key={item.id}
                        onClick={() => openResource(item.url)}
                        disabled={!item.url}
                        style={{
                          background: "#FFFFFF",
                          borderRadius: "12px",
                          padding: "12px 14px",
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                          border: "none",
                          cursor: item.url ? "pointer" : "default",
                          textAlign: "left",
                          boxShadow: "0 2px 12px rgba(26,26,46,0.07)",
                          width: "100%",
                          opacity: item.url ? 1 : 0.5,
                        }}
                      >
                        <div
                          style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "14px",
                            background: fileResource ? "rgba(230,57,70,0.08)" : "rgba(78,205,196,0.12)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {fileResource ? <FileIcon /> : <LinkIcon />}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              fontSize: "15px",
                              fontWeight: 700,
                              color: "#1A1A2E",
                              margin: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {getResourceTitle(item)}
                          </p>
                          <p
                            style={{
                              fontSize: "12px",
                              color: "#9CA3AF",
                              margin: "2px 0 0",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {getResourceSubtitle(item.url)}
                          </p>
                        </div>

                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                          <path
                            d="M9 18l6-6-6-6"
                            stroke="#C4BAB0"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "none",
  borderRadius: "16px",
  background: "#F7F3ED",
  color: "#1A1A2E",
  padding: "12px 13px",
  fontSize: "15px",
  fontWeight: 700,
  outline: "none",
} satisfies React.CSSProperties;
