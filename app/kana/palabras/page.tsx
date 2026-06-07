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

  const [lessonFilter, setLessonFilter] = useState<number | "all">("all");
  const [sessionCount, setSessionCount] = useState(15);

  const [phase, setPhase] = useState<Phase>("intro");
  const [items, setItems] = useState<KanaWordPracticeItem[]>([]);
  const [index, setIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState<{ correct: boolean; correctAnswer: string; userAnswer: string } | null>(null);
  const [results, setResults] = useState<{ item: KanaWordPracticeItem; correct: boolean }[]>([]);
  const [startTime, setStartTime] = useState(0);

  const currentItem = items[index] ?? null;
  const isLastQuestion = index >= items.length - 1;

  useEffect(() => {
    if (phase === "session" && !feedback) {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [phase, index, feedback]);

  useEffect(() => {
    if (phase !== "session") return;
    document.body.classList.add("in-session");
    return () => document.body.classList.remove("in-session");
  }, [phase]);

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
          background: "#0D0D1A",
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          padding: "calc(env(safe-area-inset-top, 20px) + 24px) 20px calc(40px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {/* Back */}
        <button
          onClick={() => router.push("/kana")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, alignSelf: "flex-start", marginBottom: 20 }}
          aria-label="Volver"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Header */}
        <h1 style={{ fontSize: 42, fontWeight: 800, color: "#FFFFFF", margin: "0 0 6px", lineHeight: 1, letterSpacing: "-0.04em" }}>
          Leer palabras
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.42)", margin: "0 0 32px" }}>
          Ve una palabra en kana y escribe su romaji.
        </p>

        {/* Lesson filter */}
        <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 10px" }}>
          Lección
        </p>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 4, marginBottom: 24 }}>
          <button
            onClick={() => setLessonFilter("all")}
            style={{ flexShrink: 0, padding: "8px 16px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
              background: lessonFilter === "all" ? "#FFFFFF" : "rgba(255,255,255,0.08)",
              color: lessonFilter === "all" ? "#1A1A2E" : "rgba(255,255,255,0.55)" }}
          >
            Todas
          </button>
          {AVAILABLE_LESSONS.map((l) => (
            <button
              key={l}
              onClick={() => setLessonFilter(l)}
              style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                background: lessonFilter === l ? "#FFFFFF" : "rgba(255,255,255,0.08)",
                color: lessonFilter === l ? "#1A1A2E" : "rgba(255,255,255,0.55)" }}
            >
              L{l}
            </button>
          ))}
        </div>

        {/* Count */}
        <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 10px" }}>
          Palabras por sesión
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 36 }}>
          {SESSION_COUNTS.map((n) => (
            <button
              key={n}
              onClick={() => setSessionCount(n)}
              style={{ padding: "8px 20px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700,
                background: sessionCount === n ? "#FFFFFF" : "rgba(255,255,255,0.08)",
                color: sessionCount === n ? "#1A1A2E" : "rgba(255,255,255,0.55)" }}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Start */}
        <button
          onClick={startSession}
          disabled={poolSize === 0}
          style={{ width: "100%", padding: "18px", borderRadius: 14, border: "none", cursor: poolSize > 0 ? "pointer" : "default",
            background: poolSize > 0 ? "#E63946" : "rgba(255,255,255,0.08)",
            color: poolSize > 0 ? "#FFFFFF" : "rgba(255,255,255,0.25)",
            fontSize: 17, fontWeight: 800, letterSpacing: "-0.01em" }}
        >
          Empezar · {effectiveCount} palabras
        </button>

        {poolSize === 0 && (
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 13, marginTop: 12 }}>
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
          position: "fixed",
          inset: 0,
          zIndex: 600,
          background: "#0D0D1A",
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          overscrollBehavior: "contain",
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
            style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          {/* Progress bar */}
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.10)", overflow: "hidden" }}>
            <div style={{ width: `${progressPct * 100}%`, height: "100%", background: "#E63946", borderRadius: 2, transition: "width 280ms ease" }} />
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>
            {index + 1} / {items.length}
          </div>
        </div>

        {/* Meaning hint */}
        {!feedback && (
          <div style={{ padding: "10px 24px 0", fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>
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
                ? isCorrect ? "#4ECDC4" : "#E63946"
                : "#FFFFFF",
              transition: "color 150ms ease",
              userSelect: "none",
              textAlign: "center",
            }}
          >
            {currentItem.kana}
          </div>
          {feedback && (
            <div style={{ marginTop: 12, fontSize: 14, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
              {currentItem.meaningEs}
            </div>
          )}
        </div>

        {/* Feedback banner */}
        {feedback && (
          <div style={{ padding: "0 24px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: isCorrect ? "#4ECDC4" : "#E63946" }}>
              {isCorrect ? "Correcto" : "No era eso"}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
              lee{" "}
              <span style={{ fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#FFFFFF" }}>
                {feedback.correctAnswer.toUpperCase()}
              </span>
            </div>
            {feedback.userAnswer && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 16, background: "rgba(255,255,255,0.07)", marginTop: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>Tú</span>
                <span style={{ fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: isCorrect ? "#4ECDC4" : "#E63946" }}>
                  {feedback.userAnswer.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            padding: "8px 16px calc(20px + env(safe-area-inset-bottom, 0px))",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            background: "#0D0D1A",
            flexShrink: 0,
          }}
        >
          {feedback ? (
            <button
              onClick={handleNext}
              style={{ width: "100%", padding: "16px 22px", background: "#4ECDC4", color: "#1A1A2E", border: "none", borderRadius: 14, cursor: "pointer", fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
            >
              {isLastQuestion ? "Ver resumen" : "Continuar"}
              <svg width="16" height="10" viewBox="0 0 18 12" fill="none">
                <path d="M1 6h15m0 0l-5-5m5 5l-5 5" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14 }}>
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
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontFamily: "var(--font-study), sans-serif", fontSize: 18, fontWeight: 600, color: "#FFFFFF" }}
                />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.22)", flexShrink: 0 }}>enter ↩</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleDontKnow}
                  style={{ flex: 1, padding: "13px 16px", background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  No sé
                </button>
                <button
                  onClick={handleCheck}
                  disabled={!inputValue.trim()}
                  style={{ flex: 2, padding: "13px 16px",
                    background: inputValue.trim() ? "#4ECDC4" : "rgba(255,255,255,0.07)",
                    color: inputValue.trim() ? "#1A1A2E" : "rgba(255,255,255,0.22)",
                    border: "none", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: inputValue.trim() ? "pointer" : "default", transition: "background 120ms ease, color 120ms ease" }}
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
          background: "#0D0D1A",
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          padding: "calc(env(safe-area-inset-top, 20px) + 24px) 20px calc(40px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {/* Close */}
        <button
          onClick={() => router.push("/kana")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, alignSelf: "flex-start", marginBottom: 20 }}
          aria-label="Cerrar"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Headline */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 42, fontWeight: 800, color: "#FFFFFF", margin: 0, lineHeight: 1, letterSpacing: "-0.04em" }}>
            {headline}
          </p>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.42)", margin: "6px 0 0" }}>
            {pct === 100 ? "Cero errores." : `${correct} de ${results.length} correctas.`}
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
          {[
            { label: "Precisión", value: `${pct}%`, color: "#FFFFFF" },
            { label: "Correctas", value: correct, color: "#4ECDC4" },
            { label: "Tiempo", value: durationLabel, color: "#FFFFFF" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#16161F", borderRadius: 16, padding: "14px 10px", textAlign: "center", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Missed words */}
        {missedItems.length > 0 && (
          <div style={{ background: "#16161F", borderRadius: 16, padding: "16px", marginBottom: 20, border: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>
              Por repasar · {missedItems.length}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {missedItems.map(({ item }) => (
                <div key={item.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "rgba(230,57,70,0.12)", borderRadius: 10, padding: "10px 14px", minWidth: 60 }}>
                  <span style={{ fontSize: 24, fontFamily: "var(--font-noto-serif-jp), serif", color: "#E63946", lineHeight: 1 }}>
                    {item.kana}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>{item.romaji}</span>
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
              style={{ width: "100%", padding: "16px", borderRadius: 14, border: "none", cursor: "pointer", background: "#4ECDC4", color: "#1A1A2E", fontSize: 16, fontWeight: 800 }}
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
            style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", cursor: "pointer", background: "transparent", color: "rgba(255,255,255,0.42)", fontSize: 15, fontWeight: 600 }}
          >
            Volver a Kana
          </button>
        </div>
      </div>
    );
  }

  return null;
}
