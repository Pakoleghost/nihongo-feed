"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { markActiveToday, getStreak, getLastActivity } from "@/lib/streak";
import { getDueKanaCount } from "@/lib/kana-due";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "おはようございます";
  if (h >= 12 && h < 18) return "こんにちは";
  return "こんばんは";
}

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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#E63946">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  );
}

export default function InicioPage() {
  const [streak, setStreak] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [lastActivity, setLastActivityState] = useState<{ label: string; path: string } | null>(null);
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, { total: number; links: number }>>({});

  useEffect(() => {
    markActiveToday();
    setStreak(getStreak());
    setLastActivityState(getLastActivity());

    supabase.auth.getUser().then(({ data }) => {
      const userKey = data.user?.id ?? "anon";
      setDueCount(getDueKanaCount(userKey));
    });

    // Fetch recursos
    supabase
      .from("recursos_carpetas")
      .select("id, nombre, descripcion, orden")
      .order("orden", { ascending: true })
      .then(({ data }) => {
        if (data) setCarpetas(data as Carpeta[]);
      });

    supabase
      .from("recursos_items")
      .select("carpeta_id, tipo")
      .then(({ data }) => {
        if (!data) return;
        const counts: Record<string, { total: number; links: number }> = {};
        (data as ItemCount[]).forEach(({ carpeta_id, tipo }) => {
          if (!counts[carpeta_id]) counts[carpeta_id] = { total: 0, links: 0 };
          counts[carpeta_id].total++;
          if (tipo === "link") counts[carpeta_id].links++;
        });
        setItemCounts(counts);
      });
  }, []);

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "56px 20px 100px",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px",
        }}
      >
        <div>
          <p style={{ fontSize: "15px", color: "#9CA3AF", margin: 0, lineHeight: 1.3 }}>
            {getGreeting()}
          </p>
          <h1
            style={{
              fontSize: "30px",
              fontWeight: 800,
              color: "#1A1A2E",
              margin: "2px 0 0",
              lineHeight: 1.15,
            }}
          >
            ¿Qué hacemos hoy?
          </h1>
        </div>

        {/* Streak pill */}
        <div
          style={{
            background: "rgba(230,57,70,0.12)",
            borderRadius: "999px",
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            flexShrink: 0,
            marginTop: "4px",
          }}
        >
          <span style={{ fontSize: "16px" }}>🔥</span>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#E63946" }}>{streak}</span>
        </div>
      </div>

      {/* Urgent kana card — only when dueCount > 0 */}
      {dueCount > 0 && (
        <div
          style={{
            background: "#E63946",
            borderRadius: "24px",
            padding: "24px",
            marginTop: "28px",
          }}
        >
          <p
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "#FFFFFF",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {dueCount} kana por repasar
          </p>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.82)", margin: "6px 0 18px" }}>
            Tienes repasos vencidos
          </p>
          <Link
            href="/kana/quiz?mode=smart&difficulty=automatico&count=20"
            style={{
              display: "block",
              background: "#FFFFFF",
              color: "#E63946",
              borderRadius: "999px",
              padding: "14px",
              fontWeight: 700,
              fontSize: "16px",
              textDecoration: "none",
              textAlign: "center",
            }}
          >
            Repasar ahora
          </Link>
        </div>
      )}

      {/* Continue card */}
      <div
        style={{
          background: "#1A1A2E",
          borderRadius: "24px",
          padding: "24px",
          marginTop: dueCount > 0 ? "14px" : "28px",
        }}
      >
        <p
          style={{
            fontSize: "24px",
            fontWeight: 800,
            color: "#FFFFFF",
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          Continuar
        </p>
        <p style={{ fontSize: "15px", color: "#9CA3AF", margin: "4px 0 18px" }}>
          {lastActivity?.label ?? "Empieza por Kana"}
        </p>
        <Link
          href={lastActivity?.path ?? "/kana"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#4ECDC4",
            color: "#1A1A2E",
            borderRadius: "999px",
            padding: "14px 20px",
            fontWeight: 700,
            fontSize: "16px",
            textDecoration: "none",
          }}
        >
          <span>Continuar</span>
          <span>→</span>
        </Link>
      </div>

      {/* Quick chips */}
      <div style={{ display: "flex", gap: "10px", marginTop: "24px", flexWrap: "wrap" }}>
        {[
          { label: "Kana Sprint", href: "/practicar/sprint" },
          { label: "Vocab", href: "/practicar/vocab" },
          { label: "Repaso", href: "/practicar/repaso" },
        ].map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            style={{
              background: "#FFFFFF",
              color: "#1A1A2E",
              borderRadius: "999px",
              padding: "10px 18px",
              fontWeight: 600,
              fontSize: "15px",
              textDecoration: "none",
              boxShadow: "0 2px 10px rgba(26,26,46,0.08)",
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Recursos del curso */}
      <div style={{ marginTop: "32px" }}>
        <p
          style={{
            fontSize: "17px",
            fontWeight: 700,
            color: "#1A1A2E",
            margin: "0 0 14px",
          }}
        >
          Recursos del curso
        </p>

        {carpetas.length === 0 ? (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "20px",
              padding: "20px",
              boxShadow: "0 2px 12px rgba(26,26,46,0.07)",
              color: "#9CA3AF",
              fontSize: "15px",
              textAlign: "center",
            }}
          >
            El profesor aún no ha subido material.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {carpetas.map((carpeta) => {
              const counts = itemCounts[carpeta.id] ?? { total: 0, links: 0 };
              const label =
                counts.total === 0
                  ? "0 archivos"
                  : counts.total === counts.links
                  ? `${counts.total} enlaces`
                  : `${counts.total} archivos`;
              return (
                <Link
                  key={carpeta.id}
                  href={`/recursos/${carpeta.id}`}
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "20px",
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    textDecoration: "none",
                    boxShadow: "0 2px 12px rgba(26,26,46,0.07)",
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
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
                      {carpeta.nombre}
                    </p>
                    <p style={{ fontSize: "13px", color: "#9CA3AF", margin: "2px 0 0" }}>
                      {label}
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 18l6-6-6-6"
                      stroke="#C4BAB0"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
