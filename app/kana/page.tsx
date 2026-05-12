"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KANA_ITEMS } from "@/lib/kana-data";
import {
  getKanaItemState,
  getKanaStateCounts,
  loadKanaProgress,
  resetKanaProgress,
  getKanaProgressSummary,
  type KanaProgressMap,
} from "@/lib/kana-progress";
import { getKanaSmartRecommendation } from "@/lib/kana-smart";
import { syncKanaProgressOnLoad } from "@/lib/kana-progress-sync";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

const TOTAL = KANA_ITEMS.length;

type GroupStat = { label: string; symbol: string; total: number; seen: number; dominated: number };

const GROUP_DEFS = [
  { label: "Hiragana",      symbol: "あ",  filter: (s: string, g: string) => s === "hiragana"  && g === "basic"     },
  { label: "Katakana",      symbol: "ア",  filter: (s: string, g: string) => s === "katakana"  && g === "basic"     },
  { label: "Dakuten",       symbol: "が",  filter: (_: string, g: string) => g === "dakuten"                        },
  { label: "Handakuten",    symbol: "ぱ",  filter: (_: string, g: string) => g === "handakuten"                     },
  { label: "Combinaciones", symbol: "きゃ", filter: (_: string, g: string) => g === "yoon"                          },
] as const;

function buildGroupStats(progress: KanaProgressMap): GroupStat[] {
  return GROUP_DEFS.map(({ label, symbol, filter }) => {
    const items = KANA_ITEMS.filter(i => filter(i.script, i.set));
    let seen = 0, dominated = 0;
    items.forEach(item => {
      const entry = progress[item.id];
      if (entry && entry.level > 0) seen++;
      const st = getKanaItemState(entry);
      if (st === "fijado" || st === "quemado") dominated++;
    });
    return { label, symbol, total: items.length, seen, dominated };
  });
}

function buildSummary() {
  const progress = loadKanaProgress("anon");
  const counts = getKanaStateCounts(KANA_ITEMS, progress);
  const summary = getKanaProgressSummary(KANA_ITEMS, progress);
  const dominados = counts.fijado + counts.quemado;
  const smartPlan = getKanaSmartRecommendation(progress, {
    vistos: counts.aprendiendo + counts.en_repaso + counts.fijado,
    aprendiendo: counts.aprendiendo + counts.en_repaso,
    dominados,
  });
  const groups = buildGroupStats(progress);
  const smartCount = 20;
  const sp = new URLSearchParams({
    mode: "smart", taskMode: "mixed", count: String(smartCount),
    items: smartPlan.itemIds.join(","),
    focusItems: smartPlan.focusItemIds.join(","),
    contextPrimary: smartPlan.contextPrimary,
  });
  if (smartPlan.contextSecondary) sp.set("contextSecondary", smartPlan.contextSecondary);
  return { dominados, smartPlan, groups, smartHref: `/kana/quiz?${sp.toString()}`, practiced: summary.practiced };
}

export default function KanaPage() {
  const router = useRouter();
  const [summary, setSummary] = useState(() => buildSummary());
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const userId = data?.user?.id;
      if (!userId) return;
      syncKanaProgressOnLoad(userId, "anon", () => setSummary(buildSummary()));
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

  const { dominados, smartPlan, groups, smartHref } = summary;
  const overallPct = Math.round((dominados / TOTAL) * 100);

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
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 42, fontWeight: 800, color: "#1A1A2E", margin: 0, lineHeight: 1 }}>Kana</h1>
          <p style={{ fontSize: 14, color: "#9CA3AF", margin: "6px 0 0" }}>
            {dominados} de {TOTAL} dominados
          </p>
        </div>
        <Link
          href="/kana/tabla"
          style={{ background: "#FFFFFF", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700, color: "#1A1A2E", textDecoration: "none", boxShadow: "0 2px 8px rgba(26,26,46,0.08)", whiteSpace: "nowrap", alignSelf: "center" }}
        >
          Ver tabla
        </Link>
      </div>

      {/* ── Smart CTA ── */}
      <Link
        href={smartHref}
        style={{ background: "#1A1A2E", borderRadius: 16, padding: "20px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, textDecoration: "none", boxShadow: "0 8px 24px rgba(26,26,46,0.18)", marginTop: 8 }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 22, fontWeight: 800, color: "#FFFFFF", margin: "0 0 6px", letterSpacing: "-0.02em", lineHeight: 1 }}>
            Smart Kana
          </p>
          <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", margin: 0, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {smartPlan.title} · 20 preguntas
          </p>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "#E63946", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
            <path d="M1 6h15m0 0l-5-5m5 5l-5 5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </Link>

      {/* ── Secondary CTAs row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
        {/* Modo libre */}
        <Link
          href="/kana/configurar?mode=libre"
          style={{ position: "relative", background: "#FFFFFF", borderRadius: 14, padding: "16px 16px 18px", display: "flex", flexDirection: "column", justifyContent: "space-between", textDecoration: "none", boxShadow: "0 2px 10px rgba(26,26,46,0.07)", overflow: "hidden", minHeight: 80 }}
        >
          <div style={{ position: "absolute", top: 0, right: 0, width: 28, height: 28, background: "#4ECDC4", borderBottomLeftRadius: 28 }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: "#1A1A2E", margin: 0 }}>Modo libre</p>
          <p style={{ fontSize: 12, color: "#9CA3AF", margin: "4px 0 0" }}>Elige script y bloques</p>
        </Link>
        {/* Leer palabras */}
        <Link
          href="/kana/palabras"
          style={{ position: "relative", background: "#FFFFFF", borderRadius: 14, padding: "16px 16px 18px", display: "flex", flexDirection: "column", justifyContent: "space-between", textDecoration: "none", boxShadow: "0 2px 10px rgba(26,26,46,0.07)", overflow: "hidden", minHeight: 80 }}
        >
          <div style={{ position: "absolute", top: 0, right: 0, width: 28, height: 28, background: "#E63946", borderBottomLeftRadius: 28 }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: "#1A1A2E", margin: 0 }}>Leer palabras</p>
          <p style={{ fontSize: 12, color: "#9CA3AF", margin: "4px 0 0" }}>Escribe el romaji</p>
        </Link>
      </div>

      {/* ── Progress breakdown ── */}
      <div
        style={{ background: "#FFFFFF", borderRadius: 16, padding: "18px 18px 14px", boxShadow: "0 2px 10px rgba(26,26,46,0.07)", marginTop: 16 }}
      >
        {/* Section header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1A1A2E", margin: 0 }}>Tu progreso</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* Mini overall ring */}
            <svg width="32" height="32" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(26,26,46,0.07)" strokeWidth="4" />
              <circle
                cx="16" cy="16" r="12" fill="none"
                stroke={overallPct >= 80 ? "#4ECDC4" : overallPct >= 40 ? "#1A1A2E" : "#E63946"}
                strokeWidth="4" strokeLinecap="round"
                strokeDasharray={`${(overallPct / 100) * 75.4} 75.4`}
              />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#1A1A2E" }}>{overallPct}%</span>
          </div>
        </div>

        {/* Group rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {groups.map((g) => {
            const domPct = g.total > 0 ? (g.dominated / g.total) * 100 : 0;
            const seenPct = g.total > 0 ? (g.seen / g.total) * 100 : 0;
            const allDone = g.dominated === g.total;
            return (
              <div key={g.label}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15, fontFamily: "var(--font-noto-serif-jp), serif", lineHeight: 1, minWidth: 24, display: "inline-block" }}>
                      {g.symbol}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: allDone ? "#178A83" : "#1A1A2E" }}>
                      {g.label}
                    </span>
                    {allDone && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#178A83", background: "rgba(78,205,196,0.14)", borderRadius: 5, padding: "1px 6px", letterSpacing: "0.04em" }}>
                        ✓
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF" }}>
                    {g.dominated}/{g.total}
                  </span>
                </div>
                {/* Double-layer progress bar: seen (light) + dominated (solid) */}
                <div style={{ height: 5, background: "#F0EDE8", borderRadius: 999, overflow: "hidden", position: "relative" }}>
                  {/* Seen layer */}
                  <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${seenPct}%`, background: "rgba(26,26,46,0.10)", borderRadius: 999 }} />
                  {/* Dominated layer */}
                  <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${domPct}%`, background: allDone ? "#4ECDC4" : "#1A1A2E", borderRadius: 999, transition: "width 0.4s ease" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 12, borderTop: "1px solid #F0EDE8" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 4, borderRadius: 2, background: "rgba(26,26,46,0.12)" }} />
            <span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600 }}>Vistas</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 4, borderRadius: 2, background: "#1A1A2E" }} />
            <span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600 }}>Dominadas</span>
          </div>
        </div>
      </div>

      {/* ── Reset ── */}
      <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
        {confirmReset ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "#9CA3AF" }}>¿Reiniciar todo tu progreso?</span>
            <button onClick={handleReset} style={{ fontSize: 13, fontWeight: 700, color: "#E63946", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>
              Sí, reiniciar
            </button>
            <button onClick={() => setConfirmReset(false)} style={{ fontSize: 13, color: "#9CA3AF", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>
              Cancelar
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmReset(true)} style={{ fontSize: 12, color: "#C4BAB0", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>
            Reiniciar progreso
          </button>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
