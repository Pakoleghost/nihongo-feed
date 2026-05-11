"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KANA_ITEMS } from "@/lib/kana-data";
import { getKanaStateCounts, loadKanaProgress, resetKanaProgress } from "@/lib/kana-progress";
import { getKanaSmartRecommendation } from "@/lib/kana-smart";
import { syncKanaProgressOnLoad } from "@/lib/kana-progress-sync";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

const TOTAL = KANA_ITEMS.length;

function buildSummary() {
  const progress = loadKanaProgress("anon");
  const counts = getKanaStateCounts(KANA_ITEMS, progress);
  const dominados = counts.fijado + counts.quemado;
  const smartPlan = getKanaSmartRecommendation(progress, {
    vistos: counts.aprendiendo + counts.en_repaso + counts.fijado,
    aprendiendo: counts.aprendiendo + counts.en_repaso,
    dominados,
  });
  return { dominados, smartPlan };
}

export default function KanaPage() {
  const router = useRouter();
  const [summary, setSummary] = useState(() => buildSummary());
  const [confirmReset, setConfirmReset] = useState(false);

  // Sync with Supabase on mount (background, non-blocking)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const userId = data?.user?.id;
      if (!userId) return;
      syncKanaProgressOnLoad(userId, "anon", () => {
        setSummary(buildSummary());
      });
    });
  }, []);

  useEffect(() => {
    const refresh = () => setSummary(buildSummary());
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  function handleReset() {
    resetKanaProgress("anon");
    setSummary(buildSummary());
    setConfirmReset(false);
  }

  const smartHref = `/kana/configurar?mode=smart&ids=${summary.smartPlan.itemIds.join(",")}&focus=${summary.smartPlan.focusItemIds.join(",")}&primary=${encodeURIComponent(summary.smartPlan.contextPrimary)}&secondary=${encodeURIComponent(summary.smartPlan.contextSecondary)}`;

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        padding: "24px 20px calc(80px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "42px", fontWeight: 800, color: "#1A1A2E", margin: 0, lineHeight: 1 }}>
            Kana
          </h1>
          <p style={{ fontSize: "14px", color: "#9CA3AF", margin: "8px 0 0" }}>
            {summary.dominados} de {TOTAL} dominados
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

      {/* Main CTA */}
      <Link
        href={smartHref}
        style={{
          marginTop: "28px",
          background: "#E63946",
          borderRadius: "16px",
          padding: "24px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          textDecoration: "none",
          boxShadow: "0 8px 24px rgba(26,26,46,0.12)",
        }}
      >
        <div>
          <p style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.7)", margin: "0 0 8px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Recomendado
          </p>
          <p style={{ fontSize: "26px", fontWeight: 800, color: "#FFFFFF", margin: 0, lineHeight: 1.1 }}>
            {summary.smartPlan.title}
          </p>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.8)", margin: "6px 0 0" }}>
            {summary.smartPlan.detail}
          </p>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
            <path d="M1 6h15m0 0l-5-5m5 5l-5 5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </Link>

      {/* Secondary options */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
        <Link
          href="/kana/configurar?mode=libre"
          style={{
            background: "#FFFFFF",
            borderRadius: "12px",
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            textDecoration: "none",
            boxShadow: "0 2px 10px rgba(26,26,46,0.07)",
          }}
        >
          <div>
            <p style={{ fontSize: "16px", fontWeight: 700, color: "#1A1A2E", margin: 0 }}>Modo libre</p>
            <p style={{ fontSize: "13px", color: "#9CA3AF", margin: "3px 0 0" }}>Elige script y bloques</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 18l6-6-6-6" stroke="#C4BAB0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      {/* Reset — small, at the bottom */}
      <div style={{ marginTop: "auto", paddingTop: 32, display: "flex", justifyContent: "center" }}>
        {confirmReset ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "#9CA3AF" }}>¿Reiniciar todo tu progreso?</span>
            <button
              onClick={handleReset}
              style={{ fontSize: 13, fontWeight: 700, color: "#E63946", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}
            >
              Sí, reiniciar
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              style={{ fontSize: 13, color: "#9CA3AF", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            style={{ fontSize: 12, color: "#C4BAB0", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}
          >
            Reiniciar progreso
          </button>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
