"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GENKI_VOCAB_BY_LESSON } from "@/lib/genki-vocab-by-lesson";
import { setLastActivity } from "@/lib/streak";
import { getVocabLessonSummary, loadVocabProgress, type VocabProgressMap } from "@/lib/vocab-progress";
import { getPracticeSessionContext } from "@/lib/practice-srs";
import { GENKI_LESSON_NAMES } from "@/lib/genki-lesson-names";
import BottomNav from "@/components/BottomNav";

const LESSONS = Object.keys(GENKI_VOCAB_BY_LESSON)
  .map(Number)
  .sort((a, b) => a - b);

const USER_KEY = "anon";

type VocabularioModuleScreenProps = {
  initialLesson?: number;
};

export default function VocabularioModuleScreen({ initialLesson }: VocabularioModuleScreenProps) {
  const router = useRouter();
  const [lesson, setLesson] = useState(() =>
    initialLesson && LESSONS.includes(initialLesson) ? initialLesson : 1,
  );
  const [progress, setProgress] = useState<VocabProgressMap>({});

  const lessonItems = useMemo(() => GENKI_VOCAB_BY_LESSON[lesson] ?? [], [lesson]);
  const lessonTitle = GENKI_LESSON_NAMES[lesson] ?? `Lección ${lesson}`;
  const lessonSummary = useMemo(
    () => getVocabLessonSummary(lesson, lessonItems, progress),
    [lesson, lessonItems, progress],
  );
  const practiceSessionContext = useMemo(() => getPracticeSessionContext(lessonSummary), [lessonSummary]);

  const seen = lessonSummary.total - lessonSummary.nuevos;
  const seenPct = lessonSummary.total > 0 ? Math.round((seen / lessonSummary.total) * 100) : 0;

  useEffect(() => {
    setProgress(loadVocabProgress(USER_KEY));
  }, []);

  useEffect(() => {
    if (!initialLesson || !LESSONS.includes(initialLesson)) return;
    setLesson(initialLesson);
  }, [initialLesson]);

  useEffect(() => {
    setLastActivity(`Vocabulario · L${lesson}`, "/practicar/vocabulario");
  }, [lesson]);

  function selectLesson(nextLesson: number) {
    setLesson(nextLesson);
    router.replace(`/practicar/vocabulario?lesson=${nextLesson}`, { scroll: false });
  }

  function goToFlashcards() {
    router.push(`/practicar/vocabulario/flashcards?lesson=${lesson}`);
  }

  function goToPracticeSession() {
    const params = new URLSearchParams({ lesson: String(lesson), focus: practiceSessionContext.sortKey });
    router.push(`/practicar/vocabulario/practicar?${params.toString()}`);
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#FFF8E7",
        padding: "24px 20px calc(100px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* ── Header ── */}
      <h1 style={{ fontSize: 42, fontWeight: 800, color: "#1A1A2E", margin: 0, lineHeight: 1, letterSpacing: "-0.04em" }}>
        Vocabulario
      </h1>
      <p style={{ fontSize: 14, color: "#9CA3AF", margin: "6px 0 0" }}>
        {lessonItems.length} palabras · L{lesson} · {lessonTitle}
      </p>

      {/* ── Lesson tabs ── */}
      <div
        style={{
          marginTop: 20,
          display: "flex",
          gap: 8,
          overflowX: "auto",
          scrollbarWidth: "none",
          paddingBottom: 2,
        }}
      >
        {LESSONS.map((value) => {
          const active = lesson === value;
          return (
            <button
              key={value}
              onClick={() => selectLesson(value)}
              style={{
                flexShrink: 0,
                padding: "8px 14px",
                borderRadius: 999,
                border: "none",
                background: active ? "#1A1A2E" : "#FFFFFF",
                color: active ? "#FFFFFF" : "#1A1A2E",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                boxShadow: active ? "none" : "0 2px 8px rgba(26,26,46,0.07)",
                whiteSpace: "nowrap",
              }}
            >
              L{value}
            </button>
          );
        })}
      </div>

      {/* ── Progress bar ── */}
      {lessonSummary.total > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Repasadas
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#53596B" }}>
              {seen}/{lessonSummary.total}
            </span>
          </div>
          <div style={{ height: 4, background: "#F0EDE8", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${seenPct}%`, background: "#4ECDC4", borderRadius: 999, transition: "width 0.4s ease" }} />
          </div>
        </div>
      )}

      {/* ── CTAs ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
        {/* Primary */}
        <button
          onClick={goToFlashcards}
          style={{
            background: "#1A1A2E",
            borderRadius: 14,
            border: "none",
            cursor: "pointer",
            padding: "20px 22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 4px 16px rgba(26,26,46,0.18)",
          }}
        >
          <div style={{ textAlign: "left" }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>
              Flashcards
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
              Toca para voltear
            </p>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#E63946", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="11" viewBox="0 0 18 12" fill="none">
              <path d="M1 6h15m0 0l-5-5m5 5l-5 5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>

        {/* Secondary */}
        <button
          onClick={goToPracticeSession}
          style={{
            background: "#FFFFFF",
            borderRadius: 14,
            border: "none",
            cursor: "pointer",
            padding: "16px 22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 10px rgba(26,26,46,0.07)",
          }}
        >
          <div style={{ textAlign: "left" }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1A1A2E" }}>Quiz</p>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: "#9CA3AF" }}>Elige la traducción correcta</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 18l6-6-6-6" stroke="#C4BAB0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
