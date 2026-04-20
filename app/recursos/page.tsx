"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

type ResourceRow = {
  id: number;
  title: string;
  url: string | null;
  category: string | null;
};

function isFile(url: string | null): boolean {
  if (!url) return false;
  const path = url.split("?")[0];
  if (/\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|zip|mp4|jpg|jpeg|png|webp)$/i.test(path)) return true;
  if (url.includes("/storage/v1/object/public/uploads/")) return true;
  return false;
}

function openResource(url: string | null) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function RecursosPage() {
  const router = useRouter();
  const [grouped, setGrouped] = useState<[string, ResourceRow[]][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("resources")
        .select("id, title, url, category")
        .order("category", { ascending: true })
        .order("title", { ascending: true });
      const rows = (data as ResourceRow[] | null) ?? [];
      // Group by category
      const map = new Map<string, ResourceRow[]>();
      rows.forEach((r) => {
        const cat = r.category ?? "General";
        if (!map.has(cat)) map.set(cat, []);
        map.get(cat)!.push(r);
      });
      setGrouped([...map.entries()]);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        paddingBottom: "100px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "56px 20px 24px",
        }}
      >
        <button
          onClick={() => router.push("/")}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "#FFFFFF",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 10px rgba(26,26,46,0.10)",
            flexShrink: 0,
          }}
          aria-label="Volver"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5M12 5l-7 7 7 7"
              stroke="#1A1A2E"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 800,
            color: "#1A1A2E",
            margin: 0,
            lineHeight: 1,
          }}
        >
          Recursos
        </h1>
      </div>

      {/* Content */}
      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: "28px" }}>
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
            <p style={{ fontSize: "28px", margin: "0 0 8px" }}>📂</p>
            <p style={{ fontSize: "16px", color: "#9CA3AF", margin: 0 }}>
              El profesor aún no ha subido material.
            </p>
          </div>
        ) : (
          grouped.map(([category, items]) => (
            <div key={category}>
              {/* Section title */}
              <p
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#53596B",
                  margin: "0 0 10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {category}
              </p>

              {/* Item cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {items.map((item) => {
                  const file = isFile(item.url);
                  return (
                    <button
                      key={item.id}
                      onClick={() => openResource(item.url)}
                      disabled={!item.url}
                      style={{
                        background: "#FFFFFF",
                        borderRadius: "1.5rem",
                        padding: "14px 16px",
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
                      {/* Icon circle */}
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "50%",
                          background: "rgba(230,57,70,0.10)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "22px",
                          flexShrink: 0,
                        }}
                      >
                        {file ? "📄" : "🔗"}
                      </div>

                      {/* Text */}
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
                          {item.title}
                        </p>
                        <p
                          style={{
                            fontSize: "12px",
                            color: "#9CA3AF",
                            margin: "2px 0 0",
                          }}
                        >
                          {file ? "Archivo" : "Enlace"}
                        </p>
                      </div>

                      {/* Chevron */}
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
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
