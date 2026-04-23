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
  if (errors === 0) return "Sesion limpia";
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
  if (taskMode === "trace") return "Trazar";
  if (taskMode === "mixed") return "Mixto";
  if (difficulty === "automatico") return "Mixto";
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

  const { total, correct, missed, taskMode } = results;
  const { errors, headline, headlineColor, modeLabel, taskModeLabel, nextStep } = summary;

  function handleRepeatErrors() {
    if (missed.length === 0) return;
    const ids = missed.map((m) => m.id).join(",");
    router.push(`/kana/quiz?mode=repeat&items=${ids}&taskMode=${taskMode || "mixed"}&count=${missed.length}`);
  }

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100vh",
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
          marginBottom: "24px",
          color: "#E63946",
        }}
        aria-label="Cerrar"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M18 6L6 18M6 6l12 12"
            stroke="#E63946"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "30px",
          boxShadow: "0 10px 30px rgba(26,26,46,0.08)",
          padding: "24px 20px 22px",
          display: "grid",
          gap: "18px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
          <div
            style={{
              borderRadius: "999px",
              padding: "8px 12px",
              background: "#F6F1EA",
              color: "#5E6472",
              fontSize: "12px",
              fontWeight: 800,
            }}
          >
            {modeLabel}
          </div>
          <div
            style={{
              borderRadius: "999px",
              padding: "8px 12px",
              background: "rgba(230,57,70,0.10)",
              color: "#C53340",
              fontSize: "12px",
              fontWeight: 800,
            }}
            >
            {taskModeLabel}
          </div>
        </div>

        <div style={{ textAlign: "center", display: "grid", gap: "10px" }}>
          <p
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: headlineColor,
              margin: 0,
              letterSpacing: "0.02em",
            }}
          >
            {headline}
          </p>
          <p
            style={{
              fontSize: "60px",
              fontWeight: 800,
              color: "#1A1A2E",
              margin: 0,
              lineHeight: 1,
            }}
          >
            {correct}/{total}
          </p>
          <p
            style={{
              fontSize: "15px",
              color: "#5E6472",
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            Acertaste {correct} de {total} en esta practica.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px" }}>
          {[
            { label: "Practicados", value: total, bg: "rgba(26,26,46,0.06)", color: "#1A1A2E" },
            { label: "Correctos", value: correct, bg: "rgba(78,205,196,0.14)", color: "#178A83" },
            { label: "Por revisar", value: errors, bg: "rgba(230,57,70,0.12)", color: "#C53340" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: stat.bg,
                borderRadius: "18px",
                padding: "14px 8px",
                display: "grid",
                gap: "4px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "26px", fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "#6E737F",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            borderRadius: "20px",
            background: "#F8F4EE",
            padding: "16px 16px 14px",
            display: "grid",
            gap: "6px",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 800, color: "#1A1A2E", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Lo importante
          </div>
          <p style={{ fontSize: "14px", color: "#5E6472", margin: 0, lineHeight: 1.45 }}>
            Esta pantalla resume lo que practicaste hoy. Los aciertos ayudan a tu progreso, pero no significan por si solos que esos kana ya esten dominados.
          </p>
        </div>
      </div>

      <div style={{ flex: 1, marginTop: "20px", display: "grid", gap: "14px" }}>
        {missed.length > 0 ? (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "26px",
              boxShadow: "0 10px 28px rgba(26,26,46,0.08)",
              padding: "18px 18px 16px",
              display: "grid",
              gap: "14px",
            }}
          >
            <div style={{ display: "grid", gap: "4px" }}>
              <div style={{ fontSize: "17px", fontWeight: 800, color: "#1A1A2E" }}>
                Repasar errores
              </div>
              <div style={{ fontSize: "14px", color: "#5E6472", lineHeight: 1.4 }}>
                Estos kana necesitan otra vuelta antes de seguir.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {missed.map((m) => (
                <div
                  key={m.id}
                  style={{
                    background: "#FFF8F7",
                    borderRadius: "18px",
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "30px",
                      fontWeight: 700,
                      color: "#E63946",
                      fontFamily: "var(--font-noto-sans-jp), sans-serif",
                      minWidth: "54px",
                      textAlign: "center",
                    }}
                  >
                    {m.kana}
                  </span>
                  <div
                    style={{
                      width: "1px",
                      height: "30px",
                      background: "#ECDDD8",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: "#1A1A2E",
                    }}
                  >
                    {m.romaji}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "26px",
              boxShadow: "0 10px 28px rgba(26,26,46,0.08)",
              padding: "22px 20px",
              textAlign: "center",
              display: "grid",
              gap: "8px",
            }}
          >
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#178A83" }}>
              Sin errores en esta sesion
            </div>
            <div style={{ fontSize: "14px", color: "#5E6472", lineHeight: 1.45 }}>
              Buen momento para seguir con Smart o volver a Kana y empezar otra practica.
            </div>
          </div>
        )}

        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "24px",
            boxShadow: "0 10px 28px rgba(26,26,46,0.08)",
            padding: "18px",
            display: "grid",
            gap: "8px",
          }}
        >
          <div style={{ fontSize: "16px", fontWeight: 800, color: "#1A1A2E" }}>
            Siguiente paso
          </div>
          <div style={{ fontSize: "14px", color: "#5E6472", lineHeight: 1.45 }}>
            {nextStep}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "22px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {errors > 0 && (
          <button
            onClick={handleRepeatErrors}
            style={{
              width: "100%",
              padding: "18px",
              borderRadius: "999px",
              border: "none",
              cursor: "pointer",
              background: "#1A1A2E",
              color: "#FFFFFF",
              fontSize: "17px",
              fontWeight: 800,
            }}
          >
            Repetir errores
          </button>
        )}
        <button
          onClick={() => router.push("/kana/configurar?mode=smart")}
          style={{
            width: "100%",
            padding: "18px",
            borderRadius: "999px",
            border: "none",
            cursor: "pointer",
            background: "#E63946",
            color: "#FFFFFF",
            fontSize: "17px",
            fontWeight: 800,
            boxShadow: "0 4px 20px rgba(230,57,70,0.24)",
          }}
        >
          Seguir con Smart
        </button>
        <button
          onClick={() => router.push("/kana")}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "999px",
            border: "none",
            cursor: "pointer",
            background: "transparent",
            color: "#1A1A2E",
            fontSize: "17px",
            fontWeight: 700,
          }}
        >
          Volver a Kana
        </button>
      </div>
    </div>
  );
}
