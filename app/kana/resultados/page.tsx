"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  if (errors === 0) return "#178A83";
  if (pct >= 50) return "#1A1A2E";
  return "#C53340";
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
  const arcColor = errors === 0 ? "#4ECDC4" : pct >= 50 ? "#1A1A2E" : "#E63946";

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        padding: "52px 20px 40px",
      }}
    >
      <button
        onClick={() => router.push("/kana")}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px",
          alignSelf: "flex-start",
          marginBottom: "20px",
          color: "#9CA3AF",
        }}
        aria-label="Cerrar"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M18 6L6 18M6 6l12 12"
            stroke="#9CA3AF"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Hero card */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "24px",
          boxShadow: "0 4px 20px rgba(26,26,46,0.08)",
          padding: "28px 20px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
        }}
      >
        {/* Mode badges */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "center" }}>
          <span style={{ borderRadius: "6px", padding: "4px 10px", background: "#F3F0EB", color: "#53596B", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {modeLabel}
          </span>
          <span style={{ borderRadius: "6px", padding: "4px 10px", background: "rgba(26,26,46,0.06)", color: "#53596B", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {taskModeLabel}
          </span>
        </div>

        {/* Score ring */}
        <div style={{ position: "relative", width: 128, height: 128, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="128" height="128" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
            <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(26,26,46,0.07)" strokeWidth="10" />
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
            <div style={{ fontSize: "32px", fontWeight: 800, color: "#1A1A2E", lineHeight: 1 }}>{pct}%</div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#9CA3AF", marginTop: 2 }}>{correct}/{total}</div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ textAlign: "center", display: "grid", gap: "6px" }}>
          <p style={{ fontSize: "22px", fontWeight: 800, color: headlineColor, margin: 0, letterSpacing: "-0.03em" }}>
            {headline}
          </p>
          <p style={{ fontSize: "14px", color: "#7A7F8D", margin: 0, lineHeight: 1.4 }}>
            {errors === 0
              ? "Cero errores en esta sesión. ¡Sesión perfecta!"
              : `Acertaste ${correct} de ${total}. Te quedan ${errors} ${errors === 1 ? "kana" : "kana"} por repasar.`
            }
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px", width: "100%" }}>
          {[
            { label: "Practicados", value: total, bg: "rgba(26,26,46,0.05)", color: "#1A1A2E" },
            { label: "Correctos", value: correct, bg: "rgba(78,205,196,0.12)", color: "#178A83" },
            { label: "Por revisar", value: errors, bg: errors > 0 ? "rgba(230,57,70,0.10)" : "rgba(26,26,46,0.04)", color: errors > 0 ? "#C53340" : "#9CA3AF" },
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
              <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9CA3AF" }}>
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
            background: "#FFFFFF",
            borderRadius: "20px",
            boxShadow: "0 2px 10px rgba(26,26,46,0.07)",
            padding: "18px 18px 16px",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>
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
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#53596B" }}>
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
              border: "none",
              cursor: "pointer",
              background: "#1A1A2E",
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
          onClick={() => router.push("/kana/configurar?mode=smart")}
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
          onClick={() => router.push("/kana")}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "14px",
            border: "none",
            cursor: "pointer",
            background: "transparent",
            color: "#9CA3AF",
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
