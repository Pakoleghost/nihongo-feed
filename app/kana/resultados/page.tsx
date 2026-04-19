"use client";

import { useEffect, useState } from "react";
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
  difficulty: string;
};

function getSubtitle(pct: number): string {
  if (pct >= 80) return "¡Excelente!";
  if (pct >= 50) return "¡Buen trabajo!";
  return "Sigue practicando";
}

function getSubtitleColor(pct: number): string {
  if (pct >= 80) return "#4ECDC4";
  if (pct >= 50) return "#4ECDC4";
  return "#E63946";
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

  if (!results) return null;

  const { total, correct, missed } = results;
  const errors = total - correct;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const subtitle = getSubtitle(pct);
  const subtitleColor = getSubtitleColor(pct);

  function handleRepeatErrors() {
    if (missed.length === 0) return;
    const ids = missed.map((m) => m.id).join(",");
    router.push(`/kana/quiz?mode=repeat&items=${ids}&difficulty=${results?.difficulty ?? "facil"}&count=${missed.length}`);
  }

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "52px 20px 48px",
      }}
    >
      {/* X button */}
      <button
        onClick={() => router.push("/kana")}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px",
          alignSelf: "flex-start",
          marginBottom: "32px",
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

      {/* Score */}
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <p
          style={{
            fontSize: "72px",
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
            fontSize: "24px",
            fontWeight: 700,
            color: subtitleColor,
            margin: "12px 0 0",
          }}
        >
          {subtitle}
        </p>
      </div>

      {/* Stats pills */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          justifyContent: "center",
          marginBottom: "40px",
        }}
      >
        <div
          style={{
            background: "#4ECDC4",
            color: "#FFFFFF",
            borderRadius: "999px",
            padding: "12px 24px",
            fontWeight: 700,
            fontSize: "16px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          ✓ Correctas {correct}
        </div>
        <div
          style={{
            background: "rgba(230,57,70,0.12)",
            color: "#E63946",
            borderRadius: "999px",
            padding: "12px 24px",
            fontWeight: 700,
            fontSize: "16px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          ✗ Errores {errors}
        </div>
      </div>

      {/* Missed kana section */}
      <div style={{ flex: 1 }}>
        {missed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <p style={{ fontSize: "24px", margin: 0 }}>¡Sin errores! 🎉</p>
          </div>
        ) : (
          <>
            <p
              style={{
                fontSize: "17px",
                fontWeight: 700,
                color: "#1A1A2E",
                margin: "0 0 14px",
              }}
            >
              Kana a repasar
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {missed.map((m) => (
                <div
                  key={m.id}
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "16px",
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "0",
                    boxShadow: "0 4px 16px rgba(26,26,46,0.07)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "32px",
                      fontWeight: 700,
                      color: "#E63946",
                      fontFamily: "var(--font-noto-sans-jp), sans-serif",
                      minWidth: "60px",
                    }}
                  >
                    {m.kana}
                  </span>
                  <div
                    style={{
                      width: "1px",
                      height: "32px",
                      background: "#E5E7EB",
                      margin: "0 16px",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "18px",
                      fontWeight: 600,
                      color: "#1A1A2E",
                    }}
                  >
                    {m.romaji}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom buttons */}
      <div
        style={{
          marginTop: "32px",
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
              fontWeight: 700,
            }}
          >
            Repetir errores
          </button>
        )}
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
            fontWeight: 600,
          }}
        >
          Volver a Kana
        </button>
      </div>
    </div>
  );
}
