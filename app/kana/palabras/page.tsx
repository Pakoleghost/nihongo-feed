"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  KANA_WORD_PRACTICE_ITEMS,
  isKanaWordAnswerCorrect,
  type KanaWordPracticeItem,
} from "@/lib/kana-word-practice";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function normalizeRomaji(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function buildSession(lessonFilter: number | "all", count: number): KanaWordPracticeItem[] {
  const pool =
    lessonFilter === "all"
      ? KANA_WORD_PRACTICE_ITEMS
      : KANA_WORD_PRACTICE_ITEMS.filter((item) => item.lesson === lessonFilter);
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

const AVAILABLE_LESSONS = [...new Set(KANA_WORD_PRACTICE_ITEMS.map((i) => i.lesson))].sort(
  (a, b) => a - b,
);

const SESSION_COUNTS = [10, 15, 20];

// ─── Component ────────────────────────────────────────────────────────────────

type Phase = "intro" | "session" | "summary";

export default function PalabrasPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Intro state
  const [lessonFilter, setLessonFilter] = useState<number | "all">("all");
  const [sessionCount, setSessionCount] = useState(15);

  // Session state
  const [phase, setPhase] = useState<Phase>("intro");
  const [items, setItems] = useState<KanaWordPracticeItem[]>([]);
  const [index, setIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState<{ correct: boolean; correctAnswer: string; userAnswer: string } | null>(null);
  const [results, setResults] = useState<{ item: KanaWordPracticeItem; correct: boolean }[]>([]);
  const [startTime, setStartTime] = useState(0);

  const currentItem = items[index] ?? null;
  const isLastQuestion = index >= items.length - 1;

  // Auto-focus input on new question
  useEffect(() => {
    if (phase === "session" && !feedback) {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [phase, index, feedback]);

  function startSession() {
    const sessionItems = buildSession(lessonFilter, sessionCount);
    if (sessionItems.length === 0) return;
    setItems(sessionItems);
    setIndex(0);
    setInputValue("");
    setFeedback(null);
    setResults([]);
    setStartTime(Date.now());
    setPhase("session");
  }

  function handleCheck() {
    if (!currentItem || feedback) return;
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const correct = isKanaWordAnswerCorrect(currentItem, trimmed);
    setFeedback({ correct, correctAnswer: currentItem.romaji, userAnswer: trimmed });
    setResults((prev) => [...prev, { item: currentItem, correct }]);
  }

  function handleNext() {
    if (!feedback) return;
    if (isLastQuestion) {
      setPhase("summary");
    } else {
      setIndex((i) => i + 1);
      setInputValue("");
      setFeedback(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      if (!feedback) handleCheck();
      else handleNext();
    }
  }

  function handleDontKnow() {
    if (!currentItem || feedback) return;
    setFeedback({ correct: false, correctAnswer: currentItem.romaji, userAnswer: "" });
    setResults((prev) => [...prev, { item: currentItem, correct: false }]);
  }

  function handleRestartWithMissed() {
    const missed = results.filter((r) => !r.correct).map((r) => r.item);
    if (missed.length === 0) return;
    setItems(shuffle(missed));
    setIndex(0);
    setInputValue("");
    setFeedback(null);
    setResults([]);
    setStartTime(Date.now());
    setPhase("session");
  }

  const progressPct = items.length > 0 ? index / items.length : 0;
  const durationMs = phase === "summary" ? Date.now() - startTime : 0;
  const correct = results.filter((r) => r.correct).length;
  const missed = results.filter((r) => !r.correct);
  const pct = results.length > 0 ? Math.round((correct / results.length) * 100) : 0;
  const durationLabel = (() => {
    const s = Math.round(durationMs / 1000);
    return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
  })();

  // ── Intro ──────────────────────────────────────────────────────────────────
  if (phase === "intro") {
    const poolSize =
      lessonFilter === "all"
        ? KANA_WORD_PRACTICE_ITEMS.length
        : KANA_WORD_PRACTICE_ITEMS.filter((i) => i.lesson === lessonFilter).length;
    const effectiveCount = Math.min(sessionCount, poolSize);

    return (
      <div
        style={{
          background: "#FFF8E7",
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          padding: "52px 20px calc(32px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {/* Back */}
        <button
          onClick={() => router.push("/kana")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, alignSelf: "flex-start", marginBottom: 20, color: "#9CA3AF" }}
          aria-label="Volver"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Header */}
        <h1 style={{ fontSize: 36, fontWeight: 800, color: "#1A1A2E", margin: "0 0 6px", lineHeight: 1, letterSpacing: "-0.03em" }}>
          Leer palabras
        </h1>
        <p style={{ fontSize: 14, color: "#9CA3AF", margin: "0 0 28px" }}>
          Ve una palabra en kana y escribe su romaji.
        </p>

        {/* Lesson filter */}
        <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 10px" }}>
          Lección
        </p>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 4, marginBottom: 20 }}>
          <button
            onClick={() => setLessonFilter("all")}
            style={{ flexShrink: 0, padding: "8px 16px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: lessonFilter === "all" ? "#1A1A2E" : "#FFFFFF", color: lessonFilter === "all" ? "#FFFFFF" : "#1A1A2E", boxShadow: lessonFilter === "all" ? "none" : "inset 0 0 0 2px rgba(26,26,46,0.08)" }}
          >
            Todas
          </button>
          {AVAILABLE_LESSONS.map((l) => (
            <button
              key={l}
              onClick={() => setLessonFilter(l)}
              style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: lessonFilter === l ? "#1A1A2E" : "#FFFFFF", color: lessonFilter === l ? "#FFFFFF" : "#1A1A2E", boxShadow: lessonFilter === l ? "none" : "inset 0 0 0 2px rgba(26,26,46,0.08)" }}
            >
              L{l}
            </button>
          ))}
        </div>

        {/* Count */}
        <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 10px" }}>
          Palabras por sesión
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
          {SESSION_COUNTS.map((n) => (
            <button
              key={n}
              onClick={() => setSessionCount(n)}
              style={{ padding: "8px 20px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, background: sessionCount === n ? "#1A1A2E" : "#FFFFFF", color: sessionCount === n ? "#FFFFFF" : "#1A1A2E", boxShadow: sessionCount === n ? "none" : "inset 0 0 0 2px rgba(26,26,46,0.08)" }}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Start */}
        <button
          onClick={startSession}
          disabled={poolSize === 0}
          style={{ width: "100%", padding: "18px", borderRadius: 14, border: "none", cursor: poolSize > 0 ? "pointer" : "default", background: poolSize > 0 ? "#E63946" : "#E0D9D0", color: "#FFFFFF", fontSize: 17, fontWeight: 800, letterSpacing: "-0.01em" }}
        >
          Empezar · {effectiveCount} palabras
        </button>

        {poolSize === 0 && (
          <p style={{ textAlign: "center", color: "#9CA3AF", fontSize: 13, marginTop: 12 }}>
            No hay palabras disponibles para esta selección.
          </p>
        )}
      </div>
    );
  }

  // ── Session ────────────────────────────────────────────────────────────────
  if (phase === "session" && currentItem) {
    const isCorrect = feedback?.correct === true;
    const isWrong = feedback?.correct === false;

    return (
      <div
        style={{
          background: "#FFF8E7",
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "max(16px, env(safe-area-inset-top, 16px)) 20px 12px",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setPhase("intro")}
            style={{ width: 36, height: 36, borderRadius: 12, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          {/* Progress bar */}
          <div style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(26,26,46,0.08)", overflow: "hidden" }}>
            <div style={{ width: `${progressPct * 100}%`, height: "100%", background: "#E63946", transition: "width 280ms ease" }} />
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", flexShrink: 0 }}>
            {index + 1} / {items.length}
          </div>
        </div>

        {/* Meaning hint */}
        {!feedback && (
          <div style={{ padding: "10px 24px 0", fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9CA3AF" }}>
            ¿Cómo se lee?
          </div>
        )}

        {/* Kana word — centrepiece */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px 32px" }}>
          <div
            style={{
              fontFamily: "var(--font-noto-serif-jp), serif",
              fontSize: "clamp(64px, 20vw, 120px)",
              lineHeight: 1,
              color: feedback
                ? isCorrect ? "#178A83" : "#C53340"
                : "#1A1A2E",
              transition: "color 150ms ease",
              userSelect: "none",
              textAlign: "center",
            }}
          >
            {currentItem.kana}
          </div>
          {/* Meaning shown after answer */}
          {feedback && (
            <div style={{ marginTop: 12, fontSize: 14, color: "#9CA3AF", fontWeight: 500 }}>
              {currentItem.meaningEs}
            </div>
          )}
        </div>

        {/* Feedback banner */}
        {feedback && (
          <div style={{ padding: "0 24px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: isCorrect ? "#178A83" : "#C53340" }}>
              {isCorrect ? "Correcto" : "No era eso"}
            </div>
            <div style={{ fontSize: 13, color: "#53596B" }}>
              lee{" "}
              <span style={{ fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#1A1A2E" }}>
                {feedback.correctAnswer.toUpperCase()}
              </span>
            </div>
            {feedback.userAnswer && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 16, background: "rgba(26,26,46,0.05)", marginTop: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "#9CA3AF" }}>Tú</span>
                <span style={{ fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: isCorrect ? "#178A83" : "#C53340" }}>
                  {feedback.userAnswer.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            padding: "8px 16px calc(16px + env(safe-area-inset-bottom, 0px))",
            borderTop: "1px solid rgba(26,26,46,0.06)",
            background: "#FFF8E7",
          }}
        >
          {feedback ? (
            <button
              onClick={handleNext}
              style={{ width: "100%", padding: "16px 22px", background: "#1A1A2E", color: "#FFF8E7", border: "none", borderRadius: 14, cursor: "pointer", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
            >
              {isLastQuestion ? "Ver resumen" : "Continuar"}
              <svg width="16" height="10" viewBox="0 0 18 12" fill="none">
                <path d="M1 6h15m0 0l-5-5m5 5l-5 5" stroke="#FFF8E7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#FFFFFF", border: "1px solid rgba(26,26,46,0.12)", borderRadius: 14 }}>
                <input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe el romaji…"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="text"
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontFamily: "var(--font-study), sans-serif", fontSize: 18, fontWeight: 600, color: "#1A1A2E" }}
                />
                <span style={{ fontSize: 12, color: "#C4BAB0", flexShrink: 0 }}>enter ↩</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleDontKnow}
                  style={{ flex: 1, padding: "13px 16px", background: "#F3F0EB", color: "#9CA3AF", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  No sé
                </button>
                <button
                  onClick={handleCheck}
                  disabled={!inputValue.trim()}
                  style={{ flex: 2, padding: "13px 16px", background: inputValue.trim() ? "#1A1A2E" : "#F3F0EB", color: inputValue.trim() ? "#FFF8E7" : "#C4BAB0", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: inputValue.trim() ? "pointer" : "default", transition: "background 120ms ease, color 120ms ease" }}
                >
                  Comprobar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  if (phase === "summary") {
    const headline = pct === 100 ? "¡Perfecto!" : pct >= 75 ? "¡Buen trabajo!" : pct >= 50 ? "Sigue así." : "Vamos mejorando.";
    const missedItems = results.filter((r) => !r.correct);

    return (
      <div
        style={{
          background: "#FFF8E7",
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          padding: "52px 20px calc(32px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {/* Close */}
        <button
          onClick={() => router.push("/kana")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, alignSelf: "flex-start", marginBottom: 20 }}
          aria-label="Cerrar"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Headline */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 36, fontWeight: 800, color: "#1A1A2E", margin: 0, lineHeight: 1, letterSpacing: "-0.03em" }}>
            {headline}
          </p>
          <p style={{ fontSize: 14, color: "#9CA3AF", margin: "6px 0 0" }}>
            {pct === 100 ? "Cero errores." : `${correct} de ${results.length} correctas.`}
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
          {[
            { label: "Precisión", value: `${pct}%`, color: "#1A1A2E" },
            { label: "Correctas", value: correct, color: "#178A83" },
            { label: "Tiempo", value: durationLabel, color: "#1A1A2E" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#FFFFFF", borderRadius: 16, padding: "14px 10px", textAlign: "center", boxShadow: "0 2px 10px rgba(26,26,46,0.06)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Missed words */}
        {missedItems.length > 0 && (
          <div style={{ background: "#FFFFFF", borderRadius: 16, padding: "16px", marginBottom: 20, boxShadow: "0 2px 10px rgba(26,26,46,0.06)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>
              Por repasar · {missedItems.length}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {missedItems.map(({ item }) => (
                <div key={item.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "rgba(230,57,70,0.06)", borderRadius: 10, padding: "10px 14px", minWidth: 60 }}>
                  <span style={{ fontSize: 24, fontFamily: "var(--font-noto-serif-jp), serif", color: "#E63946", lineHeight: 1 }}>
                    {item.kana}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#53596B" }}>{item.romaji}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {missedItems.length > 0 && (
            <button
              onClick={handleRestartWithMissed}
              style={{ width: "100%", padding: "16px", borderRadius: 14, border: "none", cursor: "pointer", background: "#1A1A2E", color: "#FFFFFF", fontSize: 16, fontWeight: 800 }}
            >
              Repasar {missedItems.length} {missedItems.length === 1 ? "error" : "errores"}
            </button>
          )}
          <button
            onClick={startSession}
            style={{ width: "100%", padding: "16px", borderRadius: 14, border: "none", cursor: "pointer", background: "#E63946", color: "#FFFFFF", fontSize: 16, fontWeight: 800 }}
          >
            Nueva sesión
          </button>
          <button
            onClick={() => router.push("/kana")}
            style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", cursor: "pointer", background: "transparent", color: "#9CA3AF", fontSize: 15, fontWeight: 600 }}
          >
            Volver a Kana
          </button>
        </div>
      </div>
    );
  }

  return null;
}
