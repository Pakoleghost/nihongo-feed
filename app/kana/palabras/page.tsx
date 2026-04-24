"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getKanaWordPracticeSession,
  isKanaWordAnswerCorrect,
  type KanaWordPracticeItem,
} from "@/lib/kana-word-practice";

type Phase = "question" | "feedback" | "done";
type AnswerResult = {
  item: KanaWordPracticeItem;
  answer: string;
  correct: boolean;
};

function buildSession() {
  return getKanaWordPracticeSession(12);
}

export default function KanaWordsPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const items = useMemo(() => buildSession(), [sessionKey]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("question");
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState<AnswerResult[]>([]);

  const currentItem = items[currentIndex] ?? null;
  const lastResult = results[results.length - 1] ?? null;
  const correctCount = results.filter((result) => result.correct).length;
  const progressPct = items.length > 0 ? (currentIndex / items.length) * 100 : 0;

  function resetSession() {
    setSessionKey((value) => value + 1);
    setCurrentIndex(0);
    setPhase("question");
    setAnswer("");
    setResults([]);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentItem || phase !== "question" || !answer.trim()) return;

    const correct = isKanaWordAnswerCorrect(currentItem, answer);
    setResults((previous) => [...previous, { item: currentItem, answer: answer.trim(), correct }]);
    setPhase("feedback");
  }

  function handleNext() {
    if (currentIndex + 1 >= items.length) {
      setPhase("done");
      return;
    }

    setCurrentIndex((index) => index + 1);
    setAnswer("");
    setPhase("question");
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  if (!currentItem) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#FFF8E7",
          display: "grid",
          placeItems: "center",
          padding: 20,
          color: "#53596B",
        }}
      >
        No hay palabras disponibles para practicar.
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FFF8E7",
        display: "flex",
        flexDirection: "column",
        padding: "44px 20px 28px",
      }}
    >
      <div style={{ display: "grid", gap: "16px", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            type="button"
            onClick={() => router.push("/kana")}
            aria-label="Volver a Kana"
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              border: "none",
              background: "#FFFFFF",
              boxShadow: "0 2px 10px rgba(26,26,46,0.10)",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 12H5M12 5l-7 7 7 7"
                stroke="#1A1A2E"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div style={{ flex: 1, display: "grid", gap: 7 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#53596B" }}>Leer palabras</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#7A7F8D" }}>
                {Math.min(currentIndex + 1, items.length)} / {items.length}
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: "#E5E7EB", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${phase === "done" ? 100 : progressPct}%`,
                  borderRadius: 999,
                  background: "#4ECDC4",
                  transition: "width 0.2s ease",
                }}
              />
            </div>
          </div>
        </div>

        <div>
          <h1
            style={{
              fontSize: 34,
              fontWeight: 800,
              color: "#1A1A2E",
              margin: "0 0 8px",
              lineHeight: 1.05,
            }}
          >
            Lee la palabra
          </h1>
          <p style={{ fontSize: 15, color: "#6E737F", margin: 0, lineHeight: 1.35 }}>
            Escribe la lectura en romaji. Después verás el significado.
          </p>
        </div>

        {phase === "done" ? (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 28,
              padding: "28px 22px",
              boxShadow: "0 10px 28px rgba(26,26,46,0.08)",
              display: "grid",
              gap: 18,
              alignSelf: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#4ECDC4", marginBottom: 8 }}>
                Sesión completa
              </div>
              <div style={{ fontSize: 34, fontWeight: 800, color: "#1A1A2E", lineHeight: 1.05 }}>
                {correctCount} / {items.length} correctas
              </div>
              <p style={{ fontSize: 15, color: "#6E737F", margin: "10px 0 0", lineHeight: 1.35 }}>
                Practicaste lectura de palabras Genki escritas en kana.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                type="button"
                onClick={resetSession}
                style={{
                  border: "none",
                  borderRadius: 999,
                  background: "#1A1A2E",
                  color: "#FFFFFF",
                  padding: "15px 12px",
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Otra sesión
              </button>
              <button
                type="button"
                onClick={() => router.push("/kana")}
                style={{
                  border: "none",
                  borderRadius: 999,
                  background: "#4ECDC4",
                  color: "#1A1A2E",
                  padding: "15px 12px",
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Volver
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 30,
              padding: "26px 22px",
              boxShadow: "0 10px 28px rgba(26,26,46,0.08)",
              display: "grid",
              gap: 18,
              alignSelf: "center",
            }}
          >
            <div style={{ textAlign: "center", display: "grid", gap: 10 }}>
              <div
                style={{
                  justifySelf: "center",
                  borderRadius: 999,
                  background: "#F5FCFB",
                  color: "#178A83",
                  padding: "7px 12px",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                Lección {currentItem.lesson}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-noto-sans-jp), sans-serif",
                  fontSize: "clamp(52px, 17vw, 82px)",
                  fontWeight: 800,
                  color: "#1A1A2E",
                  lineHeight: 1.05,
                  wordBreak: "keep-all",
                }}
              >
                {currentItem.kana}
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
              <input
                ref={inputRef}
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                disabled={phase !== "question"}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Escribe romaji"
                style={{
                  border: "none",
                  borderRadius: 22,
                  background: "#F7F3ED",
                  color: "#1A1A2E",
                  fontSize: 24,
                  fontWeight: 800,
                  padding: "16px 18px",
                  outline: "none",
                  textAlign: "center",
                  boxShadow:
                    phase === "feedback"
                      ? `inset 0 0 0 2px ${lastResult?.correct ? "#4ECDC4" : "#E63946"}`
                      : "inset 0 0 0 2px transparent",
                }}
              />

              {phase === "question" ? (
                <button
                  type="submit"
                  disabled={!answer.trim()}
                  style={{
                    border: "none",
                    borderRadius: 999,
                    background: answer.trim() ? "#E63946" : "#E5E7EB",
                    color: answer.trim() ? "#FFFFFF" : "#9CA3AF",
                    padding: "16px 18px",
                    fontSize: 16,
                    fontWeight: 800,
                    cursor: answer.trim() ? "pointer" : "not-allowed",
                  }}
                >
                  Comprobar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  style={{
                    border: "none",
                    borderRadius: 999,
                    background: "#4ECDC4",
                    color: "#1A1A2E",
                    padding: "16px 18px",
                    fontSize: 16,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Siguiente
                </button>
              )}
            </form>

            {phase === "feedback" && lastResult && (
              <div
                style={{
                  borderRadius: 24,
                  background: lastResult.correct ? "rgba(78,205,196,0.14)" : "rgba(230,57,70,0.10)",
                  padding: "16px",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: lastResult.correct ? "#178A83" : "#C53340",
                  }}
                >
                  {lastResult.correct ? "Correcto" : "No era esa"}
                </div>
                <div style={{ fontSize: 14, color: "#53596B", lineHeight: 1.35 }}>
                  Lectura: <strong style={{ color: "#1A1A2E" }}>{currentItem.romaji}</strong>
                </div>
                <div style={{ fontSize: 15, color: "#53596B", lineHeight: 1.35 }}>
                  Significado: <strong style={{ color: "#1A1A2E" }}>{currentItem.meaningEs}</strong>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
