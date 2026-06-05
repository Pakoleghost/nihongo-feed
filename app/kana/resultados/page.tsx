"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KANA_ITEMS } from "@/lib/kana-data";
import { loadKanaProgress, getKanaStateCounts, getKanaProgressSummary } from "@/lib/kana-progress";
import { getKanaSmartRecommendation } from "@/lib/kana-smart";

type MissedKana = {
  kana: string;
  romaji: string;
  id: string;
};

type QuizResults = {
  total: number;
  correct: number;
  missed: MissedKana[];
  mode: string;
  taskMode?: string;
  difficulty?: string;
};

function getHeadline(pct: number, errors: number) {
  if (errors === 0) return "Sesión limpia";
  if (pct >= 80) return "Buen avance";
  if (pct >= 50) return "Vas tomando ritmo";
  return "Sigue practicando";
}

function getHeadlineColor(pct: number, errors: number) {
  if (errors === 0) return "#4ECDC4";
  if (pct >= 50) return "#FFFFFF";
  return "#E63946";
}

function getModeLabel(mode: string) {
  if (mode === "smart") return "Smart";
  if (mode === "repeat") return "Repaso de errores";
  return "Libre";
}

function getTaskModeLabel(taskMode?: string, difficulty?: string) {
  if (taskMode === "recognition") return "Reconocimiento";
  if (taskMode === "production") return "Escritura";
  if (taskMode === "mixed") return "Mixto";
  if (difficulty === "automatico") return "Automático";
  return "Mixto";
}

function getNextStepText(results: QuizResults) {
  const errors = results.total - results.correct;
  if (errors > 0) return `Te conviene repetir ${errors} ${errors === 1 ? "error" : "errores"} antes de seguir.`;
  if (results.mode === "smart") return "Buen cierre. Puedes seguir con Smart para continuar el recorrido.";
  return "Buen cierre. Puedes volver a Kana o seguir con Smart.";
}

export default function ResultadosPage() {
  const router = useRouter();
  const [results, setResults] = useState<QuizResults | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("kana-quiz-results");
    if (raw) {
      try {
        setResults(JSON.parse(raw) as QuizResults);
      } catch {
        router.replace("/kana");
      }
    } else {
      router.replace("/kana");
    }
  }, [router]);

  const summary = useMemo(() => {
    if (!results) return null;

    const errors = results.total - results.correct;
    const pct = results.total > 0 ? Math.round((results.correct / results.total) * 100) : 0;

    return {
      errors,
      pct,
      headline: getHeadline(pct, errors),
      headlineColor: getHeadlineColor(pct, errors),
      modeLabel: getModeLabel(results.mode),
      taskModeLabel: getTaskModeLabel(results.taskMode, results.difficulty),
      nextStep: getNextStepText(results),
    };
  }, [results]);

  if (!results || !summary) return null;

  const { total, correct, missed } = results;
  const { errors, pct, headline, headlineColor, modeLabel, taskModeLabel } = summary;
  const uniqueMissed = [...new Map(missed.map((item) => [item.id, item])).values()];

  function handleRepeatErrors() {
    if (uniqueMissed.length === 0) return;
    const ids = uniqueMissed.map((m) => m.id).join(",");
    router.push(`/kana/quiz?mode=repeat&items=${ids}&taskMode=mixed&count=${uniqueMissed.length}`);
  }

  // SVG arc for score ring
  const R = 52;
  const circ = 2 * Math.PI * R;
  const arcLen = (pct / 100) * circ;
  const arcColor = errors === 0 ? "#4ECDC4" : pct >= 50 ? "#FFFFFF" : "#E63946";

  return (
    <div
      style={{
        background: "#1A1A2E",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        padding: "calc(env(safe-area-inset-top, 20px) + 28px) 20px 40px",
      }}
    >
      <button
        onClick={() => router.push("/practicar")}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px",
          alignSelf: "flex-start",
          marginBottom: "20px",
          color: "rgba(255,255,255,0.42)",
        }}
        aria-label="Cerrar"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M18 6L6 18M6 6l12 12"
            stroke="rgba(255,255,255,0.42)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Hero card */}
      <div
        style={{
          background: "#1E2235",
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.08)",
          padding: "28px 20px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
        }}
      >
        {/* Mode badges */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "center" }}>
          <span style={{ borderRadius: "6px", padding: "4px 10px", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.65)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {modeLabel}
          </span>
          <span style={{ borderRadius: "6px", padding: "4px 10px", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.65)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {taskModeLabel}
          </span>
        </div>

        {/* Score ring */}
        <div style={{ position: "relative", width: 128, height: 128, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="128" height="128" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
            <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="10" />
            <circle
              cx="64" cy="64" r={R} fill="none"
              stroke={arcColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${arcLen} ${circ}`}
              style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1)" }}
            />
          </svg>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "32px", fontWeight: 800, color: "#FFFFFF", lineHeight: 1 }}>{pct}%</div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.42)", marginTop: 2 }}>{correct}/{total}</div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ textAlign: "center", display: "grid", gap: "6px" }}>
          <p style={{ fontSize: "22px", fontWeight: 800, color: headlineColor, margin: 0, letterSpacing: "-0.03em" }}>
            {headline}
          </p>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", margin: 0, lineHeight: 1.4 }}>
            {errors === 0
              ? "Cero errores en esta sesión. ¡Sesión perfecta!"
              : `Acertaste ${correct} de ${total}. Te quedan ${errors} ${errors === 1 ? "kana" : "kana"} por repasar.`
            }
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px", width: "100%" }}>
          {[
            { label: "Practicados", value: total, bg: "rgba(255,255,255,0.06)", color: "#FFFFFF" },
            { label: "Correctos", value: correct, bg: "rgba(78,205,196,0.12)", color: "#4ECDC4" },
            { label: "Por revisar", value: errors, bg: errors > 0 ? "rgba(230,57,70,0.12)" : "rgba(255,255,255,0.06)", color: errors > 0 ? "#E63946" : "rgba(255,255,255,0.42)" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: stat.bg,
                borderRadius: "14px",
                padding: "12px 8px",
                display: "grid",
                gap: "3px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "24px", fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.4)" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Missed kana */}
      {uniqueMissed.length > 0 && (
        <div
          style={{
            marginTop: "16px",
            background: "#1E2235",
            borderRadius: "20px",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "18px 18px 16px",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>
            Por repasar · {uniqueMissed.length}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {uniqueMissed.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "3px",
                  background: "rgba(230,57,70,0.06)",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  minWidth: "54px",
                }}
              >
                <span style={{ fontSize: "28px", fontWeight: 700, color: "#E63946", lineHeight: 1, fontFamily: "var(--font-noto-serif-jp), serif" }}>
                  {m.kana}
                </span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.65)" }}>
                  {m.romaji}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          marginTop: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {errors > 0 && (
          <button
            onClick={handleRepeatErrors}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.10)",
              cursor: "pointer",
              background: "#1E2235",
              color: "#FFFFFF",
              fontSize: "16px",
              fontWeight: 800,
              letterSpacing: "-0.01em",
            }}
          >
            Repetir {errors} {errors === 1 ? "error" : "errores"}
          </button>
        )}
        <button
          onClick={() => {
            const prog = loadKanaProgress("anon");
            const counts = getKanaStateCounts(KANA_ITEMS, prog);
            const summary = getKanaProgressSummary(KANA_ITEMS, prog);
            const rec = getKanaSmartRecommendation(prog, {
              vistos: summary.practiced,
              aprendiendo: counts.aprendiendo + counts.en_repaso,
              dominados: counts.fijado + counts.quemado,
            });
            const count = Math.min(Math.max(rec.itemIds.length, 5), 20);
            const sp = new URLSearchParams({ mode: "smart", taskMode: "mixed", count: String(count), items: rec.itemIds.join(","), focusItems: rec.focusItemIds.join(","), contextPrimary: rec.contextPrimary });
            if (rec.contextSecondary) sp.set("contextSecondary", rec.contextSecondary);
            router.push(`/kana/quiz?${sp.toString()}`);
          }}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "14px",
            border: "none",
            cursor: "pointer",
            background: "#E63946",
            color: "#FFFFFF",
            fontSize: "16px",
            fontWeight: 800,
            letterSpacing: "-0.01em",
          }}
        >
          Seguir con Smart
        </button>
        <button
          onClick={() => router.push("/practicar")}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "14px",
            border: "none",
            cursor: "pointer",
            background: "transparent",
            color: "rgba(255,255,255,0.42)",
            fontSize: "15px",
            fontWeight: 600,
          }}
        >
          Volver a Kana
        </button>
      </div>
    </div>
  );
}
