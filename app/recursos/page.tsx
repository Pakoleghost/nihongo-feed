"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Carpeta = {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
};

type ItemCount = {
  carpeta_id: string;
  tipo: string;
};

function FolderIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#E63946">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  );
}

export default function RecursosPage() {
  const router = useRouter();
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, { total: number; links: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: carpetaData } = await supabase
        .from("recursos_carpetas")
        .select("id, nombre, descripcion, orden")
        .order("orden", { ascending: true });

      const fetchedCarpetas = (carpetaData as Carpeta[] | null) ?? [];
      setCarpetas(fetchedCarpetas);

      if (fetchedCarpetas.length > 0) {
        const { data: itemData } = await supabase
          .from("recursos_items")
          .select("carpeta_id, tipo");

        const counts: Record<string, { total: number; links: number }> = {};
        (itemData as ItemCount[] | null)?.forEach(({ carpeta_id, tipo }) => {
          if (!counts[carpeta_id]) counts[carpeta_id] = { total: 0, links: 0 };
          counts[carpeta_id].total++;
          if (tipo === "link") counts[carpeta_id].links++;
        });
        setItemCounts(counts);
      }

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
        padding: "56px 20px 48px",
      }}
    >
      {/* Header */}
      <h1
        style={{
          fontSize: "36px",
          fontWeight: 800,
          color: "#1A1A2E",
          margin: "0 0 28px",
          lineHeight: 1,
        }}
      >
        Recursos
      </h1>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: "center", color: "#9CA3AF", padding: "40px 0" }}>
          Cargando...
        </div>
      ) : carpetas.length === 0 ? (
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
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {carpetas.map((carpeta) => {
            const counts = itemCounts[carpeta.id] ?? { total: 0, links: 0 };
            const label =
              counts.total === 0
                ? "0 archivos"
                : counts.total === counts.links
                ? `${counts.total} enlaces`
                : `${counts.total} archivos`;

            return (
              <button
                key={carpeta.id}
                onClick={() => router.push(`/recursos/${carpeta.id}`)}
                style={{
                  background: "#FFFFFF",
                  borderRadius: "20px",
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  boxShadow: "0 2px 12px rgba(26,26,46,0.07)",
                  width: "100%",
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "rgba(230,57,70,0.10)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <FolderIcon />
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      color: "#1A1A2E",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {carpeta.nombre}
                  </p>
                  {carpeta.descripcion && (
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#9CA3AF",
                        margin: "2px 0 0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {carpeta.descripcion}
                    </p>
                  )}
                  <p style={{ fontSize: "12px", color: "#C4BAB0", margin: "2px 0 0" }}>
                    {label}
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
      )}
    </div>
  );
}
