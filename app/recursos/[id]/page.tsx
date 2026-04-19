"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Carpeta = {
  id: string;
  nombre: string;
};

type Item = {
  id: string;
  carpeta_id: string;
  nombre: string;
  descripcion: string | null;
  tipo: "archivo" | "link";
  url: string | null;
  orden: number;
};

export default function RecursosCarpetaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [carpeta, setCarpeta] = useState<Carpeta | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function load() {
      const [{ data: carpetaData }, { data: itemData }] = await Promise.all([
        supabase
          .from("recursos_carpetas")
          .select("id, nombre")
          .eq("id", id)
          .single(),
        supabase
          .from("recursos_items")
          .select("id, carpeta_id, nombre, descripcion, tipo, url, orden")
          .eq("carpeta_id", id)
          .order("orden", { ascending: true }),
      ]);

      setCarpeta(carpetaData as Carpeta | null);
      setItems((itemData as Item[] | null) ?? []);
      setLoading(false);
    }

    load();
  }, [id]);

  function handleItemTap(item: Item) {
    if (item.url) {
      window.open(item.url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "52px 20px 48px",
      }}
    >
      {/* Back button */}
      <button
        onClick={() => router.back()}
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          background: "#FFFFFF",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 10px rgba(26,26,46,0.10)",
          marginBottom: "20px",
          flexShrink: 0,
        }}
        aria-label="Volver"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M19 12H5M12 5l-7 7 7 7"
            stroke="#1A1A2E"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Title */}
      <h1
        style={{
          fontSize: "28px",
          fontWeight: 800,
          color: "#1A1A2E",
          margin: "0 0 24px",
          lineHeight: 1.2,
        }}
      >
        {carpeta?.nombre ?? "Recursos"}
      </h1>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: "center", color: "#9CA3AF", padding: "40px 0" }}>
          Cargando...
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "20px",
            padding: "32px",
            textAlign: "center",
            boxShadow: "0 4px 20px rgba(26,26,46,0.07)",
          }}
        >
          <p style={{ fontSize: "28px", margin: "0 0 8px" }}>📭</p>
          <p style={{ fontSize: "16px", color: "#9CA3AF", margin: 0 }}>
            Esta carpeta está vacía.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemTap(item)}
              disabled={!item.url}
              style={{
                background: "#FFFFFF",
                borderRadius: "18px",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                border: "none",
                cursor: item.url ? "pointer" : "default",
                textAlign: "left",
                boxShadow: "0 2px 12px rgba(26,26,46,0.07)",
                width: "100%",
                opacity: item.url ? 1 : 0.6,
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "14px",
                  background: item.tipo === "link"
                    ? "rgba(78,205,196,0.15)"
                    : "rgba(26,26,46,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                  flexShrink: 0,
                }}
              >
                {item.tipo === "link" ? "🔗" : "📄"}
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
                  {item.nombre}
                </p>
                {item.descripcion && (
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#9CA3AF",
                      margin: "3px 0 0",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.descripcion}
                  </p>
                )}
              </div>

              {/* External link indicator */}
              {item.url && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ flexShrink: 0 }}
                >
                  <path
                    d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"
                    stroke="#C4BAB0"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
