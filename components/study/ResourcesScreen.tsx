"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DS, TopBar, TabBar, Eyebrow, ScreenTitle, type DSTab } from "./ds";

type ResourceRow = {
  id: number | string;
  title: string;
  url: string | null;
  category: string | null;
  created_at?: string | null;
};

type ResourceKind = "link" | "file" | "note";

function inferKind(resource: ResourceRow): ResourceKind {
  const url = (resource.url || "").trim();
  if (!url) return "link";
  if (url.startsWith("data:text/plain")) return "note";
  return /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|zip|jpg|jpeg|png|webp|mp4)$/i.test(url.split("?")[0])
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

function domainLabelFromUrl(url?: string | null): string {
  if (!url) return "Enlace";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Enlace";
  }
}

type ResourcesScreenProps = {
  onTabChange: (tab: DSTab) => void;
};

export default function ResourcesScreen({ onTabChange }: ResourcesScreenProps) {
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string>("General");
  const [selectedNoteId, setSelectedNoteId] = useState<number | string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("resources").select("*").order("category").order("title");
      if (!error && data) {
        setResources(data as ResourceRow[]);
      }
      setLoading(false);
    };
    void fetchData();
  }, []);

  const folders = useMemo(() => {
    const dbFolders = resources
      .map((resource) => (resource.category || "General").trim())
      .filter(Boolean);
    const merged = Array.from(new Set(["General", ...dbFolders]));
    return merged.sort((a, b) => a.localeCompare(b));
  }, [resources]);

  useEffect(() => {
    if (folders.length > 0 && !folders.includes(selectedFolder)) {
      setSelectedFolder(folders[0]);
    }
  }, [folders, selectedFolder]);

  const resourcesInFolder = useMemo(() => {
    return resources.filter((resource) => (resource.category || "General") === selectedFolder);
  }, [resources, selectedFolder]);

  return (
    <div style={{ minHeight: "100vh", background: DS.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ height: 54 }} />
      <TopBar />

      <div style={{ flex: 1, overflow: "auto", paddingBottom: 84 }}>
        <ScreenTitle title="Recursos" />

        {/* Folder selector (horizontal scroll) */}
        <div style={{
          display: "flex", gap: 12, overflowX: "auto", padding: "0 24px 16px",
          scrollbarWidth: "none", msOverflowStyle: "none",
        }}>
          {folders.map((folder) => (
            <button
              key={folder}
              type="button"
              onClick={() => setSelectedFolder(folder)}
              style={{
                padding: "8px 16px", borderRadius: 12, border: "none",
                background: selectedFolder === folder ? DS.ink : DS.surfaceAlt,
                color: selectedFolder === folder ? DS.bg : DS.inkSoft,
                fontFamily: DS.fontHead, fontSize: 13, fontWeight: 600,
                whiteSpace: "nowrap", cursor: "pointer",
              }}
            >
              {folder}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: DS.inkFaint }}>
            Cargando recursos...
          </div>
        ) : resourcesInFolder.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: DS.inkFaint }}>
            No hay recursos en esta carpeta.
          </div>
        ) : (
          <div style={{ padding: "0 24px", display: "grid", gap: 12 }}>
            {resourcesInFolder.map((resource) => {
              const kind = inferKind(resource);
              const isSelectedNote = selectedNoteId === resource.id;

              return (
                <div key={resource.id} style={{
                  background: DS.card, borderRadius: 20, border: `1px solid ${DS.line}`,
                  padding: "16px", display: "grid", gap: 12,
                }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 12,
                      background: DS.surfaceAlt, display: "flex", alignItems: "center",
                      justifyContent: "center", flexShrink: 0,
                    }}>
                      {kind === "link" ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                           <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke={DS.inkSoft} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                           <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke={DS.inkSoft} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : kind === "file" ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9l-7-7z" stroke={DS.inkSoft} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M13 2v7h7" stroke={DS.inkSoft} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke={DS.inkSoft} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: DS.fontHead, fontSize: 15, fontWeight: 600,
                        color: DS.ink, lineHeight: 1.2,
                      }}>{resource.title}</div>
                      <div style={{
                        fontFamily: DS.fontBody, fontSize: 11, color: DS.inkSoft,
                        marginTop: 4, letterSpacing: 0.2, textTransform: "uppercase",
                      }}>
                        {kind === "link" ? domainLabelFromUrl(resource.url) : kind === "file" ? "Archivo" : "Nota"}
                      </div>
                    </div>
                    {kind === "note" ? (
                      <button
                        type="button"
                        onClick={() => setSelectedNoteId(isSelectedNote ? null : resource.id)}
                        style={{
                          background: DS.ink, color: DS.bg, border: "none",
                          borderRadius: 8, padding: "6px 12px", fontFamily: DS.fontHead,
                          fontSize: 12, fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        {isSelectedNote ? "Cerrar" : "Ver"}
                      </button>
                    ) : (
                      resource.url && (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            background: DS.ink, color: DS.bg, textDecoration: "none",
                            borderRadius: 8, padding: "6px 12px", fontFamily: DS.fontHead,
                            fontSize: 12, fontWeight: 600,
                          }}
                        >
                          Abrir
                        </a>
                      )
                    )}
                  </div>

                  {isSelectedNote && (
                    <div style={{
                      marginTop: 8, padding: 12, background: DS.surfaceAlt,
                      borderRadius: 12, border: `1px solid ${DS.line}`,
                    }}>
                      <pre style={{
                        margin: 0, whiteSpace: "pre-wrap", fontFamily: DS.fontBody,
                        fontSize: 13, color: DS.ink, lineHeight: 1.5,
                      }}>
                        {decodeNoteUrl(resource.url)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div style={{ height: 16 }} />
      </div>

      <TabBar active="resources" onTab={onTabChange} />
    </div>
  );
}
