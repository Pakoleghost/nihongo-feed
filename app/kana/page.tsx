"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KANA_ITEMS } from "@/lib/kana-data";
import { getKanaProgressSummary, getKanaStateCounts, loadKanaProgress } from "@/lib/kana-progress";
import BottomNav from "@/components/BottomNav";

const TOTAL = KANA_ITEMS.length;

type KanaHomeSummary = {
  vistos: number;
  aprendiendo: number;
  dominados: number;
  siguienteMeta: string;
};

function buildKanaHomeSummary(): KanaHomeSummary {
  const progress = loadKanaProgress("anon");
  const stateCounts = getKanaStateCounts(KANA_ITEMS, progress);
  const progressSummary = getKanaProgressSummary(KANA_ITEMS, progress);

  let siguienteMeta = "Empieza con Smart y verás tu progreso aquí.";

  if (progressSummary.practiced > 0 && stateCounts.fijado === 0) {
    siguienteMeta = "Vas bien: ahora toca dominar el primero.";
  } else if (stateCounts.en_repaso > 0) {
    siguienteMeta = `Te faltan ${stateCounts.en_repaso} por dominar.`;
  } else if (stateCounts.aprendiendo > 0) {
    siguienteMeta = `Sigue así: ya tienes ${stateCounts.aprendiendo} en marcha.`;
  } else if (stateCounts.fijado > 0) {
    siguienteMeta = "Muy bien. Vamos por el siguiente.";
  }

  return {
    vistos: progressSummary.practiced,
    aprendiendo: stateCounts.aprendiendo + stateCounts.en_repaso,
    dominados: stateCounts.fijado,
    siguienteMeta,
  };
}

export default function KanaPage() {
  const [summary, setSummary] = useState<KanaHomeSummary>({
    vistos: 0,
    aprendiendo: 0,
    dominados: 0,
    siguienteMeta: "Empieza con Smart y verás tu progreso aquí.",
  });

  useEffect(() => {
    const refreshSummary = () => {
      setSummary(buildKanaHomeSummary());
    };

    refreshSummary();
    window.addEventListener("focus", refreshSummary);
    document.addEventListener("visibilitychange", refreshSummary);

    return () => {
      window.removeEventListener("focus", refreshSummary);
      document.removeEventListener("visibilitychange", refreshSummary);
    };
  }, []);

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
            {summary.vistos} vistos · {summary.aprendiendo} en aprendizaje · {summary.dominados} dominados
          </p>
          <p
            style={{
              fontSize: "14px",
              color: "#7A7F8D",
              margin: "6px 0 0",
              lineHeight: 1.4,
            }}
          >
            {summary.siguienteMeta}
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
            La app elige tu siguiente paso.
          </p>
          <p
            style={{
              fontSize: "14px",
              color: "rgba(255,255,255,0.7)",
              margin: "12px 0 0",
              fontWeight: 700,
            }}
          >
            Sigue con lo más importante
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
            Tú eliges qué kana practicar.
          </p>
          <p
            style={{
              fontSize: "14px",
              color: "#7A7F8D",
              margin: "12px 0 0",
              fontWeight: 700,
            }}
          >
            Elige a tu ritmo
          </p>
        </Link>
      </div>

      <BottomNav />
    </div>
  );
}
