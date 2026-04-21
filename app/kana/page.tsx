"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KANA_ITEMS } from "@/lib/kana-data";
import { loadKanaProgress, getKanaItemState } from "@/lib/kana-progress";
import BottomNav from "@/components/BottomNav";

const TOTAL = KANA_ITEMS.length;

export default function KanaPage() {
  const [dominados, setDominados] = useState(0);

  useEffect(() => {
    const progress = loadKanaProgress("anon");
    const count = KANA_ITEMS.filter(
      (item) => getKanaItemState(progress[item.id]) === "fijado"
    ).length;
    setDominados(count);
  }, []);

  const pct = TOTAL > 0 ? Math.round((dominados / TOTAL) * 100) : 0;

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "20px 20px 100px",
      }}
    >
      {/* Title row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "42px",
              fontWeight: 800,
              color: "#E63946",
              margin: 0,
              lineHeight: 1,
            }}
          >
            Kana
          </h1>
          <p
            style={{
              fontSize: "15px",
              color: "#53596B",
              margin: "10px 0 0",
              lineHeight: 1.4,
            }}
          >
            {dominados} dominados de {TOTAL} · {pct}% completado
          </p>
        </div>
        <Link
          href="/kana/tabla"
          style={{
            background: "#FFFFFF",
            borderRadius: "999px",
            padding: "10px 18px",
            fontSize: "14px",
            fontWeight: 700,
            color: "#1A1A2E",
            textDecoration: "none",
            boxShadow: "0 2px 10px rgba(26,26,46,0.08)",
            whiteSpace: "nowrap",
          }}
        >
          Ver tabla
        </Link>
      </div>

      {/* Cards */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          marginTop: "24px",
          flex: 1,
        }}
      >
        {/* Smart card */}
        <Link
          href="/kana/configurar?mode=smart"
          style={{
            background: "#E63946",
            borderRadius: "24px",
            padding: "24px 24px 22px",
            display: "flex",
            flexDirection: "column",
            textDecoration: "none",
            minHeight: "160px",
            boxShadow: "0 8px 32px rgba(230,57,70,0.3)",
          }}
        >
          <span
            style={{
              alignSelf: "flex-start",
              background: "rgba(255,255,255,0.18)",
              borderRadius: "999px",
              padding: "7px 11px",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.04em",
              color: "#FFFFFF",
              marginBottom: "18px",
              textTransform: "uppercase",
            }}
          >
            Recomendado
          </span>
          <p
            style={{
              fontSize: "32px",
              fontWeight: 800,
              color: "#FFFFFF",
              margin: 0,
              lineHeight: 1,
            }}
          >
            Smart
          </p>
          <p
            style={{
              fontSize: "15px",
              color: "rgba(255,255,255,0.85)",
              margin: "8px 0 0",
              lineHeight: 1.35,
            }}
          >
            La app decide qué practicar ahora.
          </p>
          <p
            style={{
              fontSize: "14px",
              color: "rgba(255,255,255,0.7)",
              margin: "12px 0 0",
              fontWeight: 700,
            }}
          >
            Empieza aquí
          </p>
        </Link>

        {/* Libre card */}
        <Link
          href="/kana/configurar?mode=libre"
          style={{
            background: "#FFFFFF",
            borderRadius: "24px",
            padding: "22px 24px",
            display: "flex",
            flexDirection: "column",
            textDecoration: "none",
            minHeight: "136px",
            boxShadow: "0 6px 24px rgba(26,26,46,0.08)",
          }}
        >
          <p
            style={{
              fontSize: "30px",
              fontWeight: 800,
              color: "#1A1A2E",
              margin: 0,
              lineHeight: 1,
            }}
          >
            Libre
          </p>
          <p
            style={{
              fontSize: "15px",
              color: "#53596B",
              margin: "8px 0 0",
              lineHeight: 1.35,
            }}
          >
            Tú eliges qué practicar.
          </p>
        </Link>
      </div>

      <BottomNav />
    </div>
  );
}
