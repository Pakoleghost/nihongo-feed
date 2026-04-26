"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KANA_ITEMS } from "@/lib/kana-data";
import { getKanaProgressSummary, getKanaStateCounts, loadKanaProgress } from "@/lib/kana-progress";
import { getKanaSmartRecommendation, type KanaSmartRecommendation } from "@/lib/kana-smart";
import BottomNav from "@/components/BottomNav";

const TOTAL = KANA_ITEMS.length;

type KanaHomeSummary = {
  vistos: number;
  aprendiendo: number;
  dominados: number;
  pendientes: number;
  progressPct: number;
  goal: string;
  smartPlan: KanaSmartRecommendation;
};

function buildKanaHomeSummary(): KanaHomeSummary {
  const progress = loadKanaProgress("anon");
  const stateCounts = getKanaStateCounts(KANA_ITEMS, progress);
  const progressSummary = getKanaProgressSummary(KANA_ITEMS, progress);

  const vistos = progressSummary.practiced;
  const aprendiendo = stateCounts.aprendiendo + stateCounts.en_repaso;
  const dominados = stateCounts.fijado;
  const pendientes = progressSummary.due;
  const progressPct = TOTAL > 0 ? Math.round((vistos / TOTAL) * 100) : 0;
  const smartPlan = getKanaSmartRecommendation(progress, { vistos, aprendiendo, dominados });

  let goal = "Meta actual: empezar hiragana básico";

  if (pendientes > 0) {
    goal = `Meta actual: repasar ${pendientes} pendientes`;
  } else if (vistos > 0 && dominados === 0) {
    goal = "Meta actual: dominar tu primer kana";
  } else if (smartPlan.kind === "learn") {
    goal = `Meta actual: completar ${smartPlan.contextSecondary.toLowerCase() || smartPlan.contextPrimary.toLowerCase()}`;
  } else if (dominados > 0) {
    goal = "Meta actual: sumar más dominados";
  }

  return {
    vistos,
    aprendiendo,
    dominados,
    pendientes,
    progressPct,
    goal,
    smartPlan,
  };
}

export default function KanaPage() {
  const [summary, setSummary] = useState<KanaHomeSummary>(() => buildKanaHomeSummary());

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
              color: "#1A1A2E",
              margin: 0,
              lineHeight: 1,
            }}
          >
            Kana
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "#7A7F8D",
              margin: "8px 0 0",
              lineHeight: 1.35,
            }}
          >
            {summary.progressPct}% del repertorio ya pasó por tus prácticas
          </p>
        </div>
        <Link
          href="/kana/tabla"
          style={{
            background: "#FFFFFF",
            borderRadius: "10px",
            padding: "8px 14px",
            fontSize: "13px",
            fontWeight: 700,
            color: "#1A1A2E",
            textDecoration: "none",
            boxShadow: "0 2px 8px rgba(26,26,46,0.08)",
            whiteSpace: "nowrap",
          }}
        >
          Ver tabla
        </Link>
      </div>

      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "16px",
          padding: "16px",
          marginTop: "18px",
          boxShadow: "0 4px 16px rgba(26,26,46,0.07)",
          display: "grid",
          gap: "14px",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
          {[
            { label: "Vistos", value: summary.vistos, tint: "rgba(26,26,46,0.06)", color: "#1A1A2E" },
            { label: "En aprendizaje", value: summary.aprendiendo, tint: "rgba(78,205,196,0.12)", color: "#1A1A2E" },
            { label: "Dominados", value: summary.dominados, tint: "rgba(230,57,70,0.10)", color: "#E63946" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: stat.tint,
                borderRadius: 10,
                padding: "12px 8px",
                textAlign: "center",
                display: "grid",
                gap: 4,
              }}
            >
              <div
                style={{
                  fontSize: "26px",
                  fontWeight: 800,
                  color: stat.color,
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  color: "#6E737F",
                  textTransform: "uppercase",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              background: "#F1ECE5",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.max(summary.progressPct, summary.vistos > 0 ? 6 : 0)}%`,
                height: "100%",
                borderRadius: 999,
                background: "#E63946",
              }}
            />
          </div>
          <div
            style={{
              fontSize: "14px",
              color: "#53596B",
              lineHeight: 1.35,
            }}
          >
            {summary.vistos} vistos · {summary.aprendiendo} en aprendizaje · {summary.dominados} dominados
          </div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "#1A1A2E",
              lineHeight: 1.35,
            }}
          >
            {summary.goal}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          marginTop: "18px",
          flex: 1,
        }}
      >
        <Link
          href="/kana/configurar?mode=smart"
          style={{
            background: "#E63946",
            borderRadius: "18px",
            padding: "18px 18px 16px",
            display: "grid",
            gap: 14,
            textDecoration: "none",
            boxShadow: "0 8px 24px rgba(26,26,46,0.12)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.16)",
                  padding: "4px 8px",
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: "0.05em",
                  color: "#FFFFFF",
                  textTransform: "uppercase",
                }}
              >
                Smart recomendado
              </div>
              <div
                style={{
                  fontSize: "30px",
                  fontWeight: 800,
                  color: "#FFFFFF",
                  marginTop: 14,
                  lineHeight: 1.02,
                }}
              >
                {summary.smartPlan.title}
              </div>
              <div
                style={{
                  fontSize: "15px",
                  color: "rgba(255,255,255,0.84)",
                  marginTop: 8,
                  lineHeight: 1.3,
                }}
              >
                {summary.smartPlan.detail}
              </div>
            </div>

            <div
              aria-hidden="true"
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.14)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                <path d="M1 6h15m0 0l-5-5m5 5l-5 5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {summary.smartPlan.chips.map((chip) => (
              <span
                key={chip}
                style={{
                  borderRadius: 6,
                  padding: "5px 10px",
                  background: "rgba(255,255,255,0.14)",
                  color: "#FFFFFF",
                  fontSize: "12px",
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {chip}
              </span>
            ))}
          </div>
        </Link>

        <Link
          href="/kana/palabras"
          style={{
            background: "#FFFFFF",
            borderRadius: "12px",
            padding: "18px 20px 18px 22px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            textDecoration: "none",
            boxShadow: "inset 4px 0 0 #1A1A2E, 0 2px 10px rgba(26,26,46,0.07)",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#1A1A2E", lineHeight: 1.1 }}>
              Leer palabras
            </div>
            <div style={{ fontSize: "13px", color: "#7A7F8D", marginTop: 5, lineHeight: 1.35 }}>
              Lee vocabulario Genki en kana y escribe su romaji.
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M9 18l6-6-6-6" stroke="#C4BAB0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        <Link
          href="/kana/configurar?mode=libre"
          style={{
            background: "#FFFFFF",
            borderRadius: "12px",
            padding: "18px 20px 18px 22px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            textDecoration: "none",
            boxShadow: "inset 4px 0 0 #C4BAB0, 0 2px 10px rgba(26,26,46,0.07)",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#1A1A2E", lineHeight: 1.1 }}>
              Libre
            </div>
            <div style={{ fontSize: "13px", color: "#7A7F8D", marginTop: 5, lineHeight: 1.35 }}>
              Elige script, bloques y número de preguntas.
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M9 18l6-6-6-6" stroke="#C4BAB0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      <BottomNav />
    </div>
  );
}
