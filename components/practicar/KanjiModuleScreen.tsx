"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GENKI_KANJI_BY_LESSON } from "@/lib/genki-kanji-by-lesson";
import { setLastActivity } from "@/lib/streak";
import { getKanjiLessonSummary, loadKanjiProgress, type KanjiProgressMap } from "@/lib/kanji-progress";
import { getPracticeNextAction, getPracticeSessionContext } from "@/lib/practice-srs";
import { GENKI_LESSON_NAMES } from "@/lib/genki-lesson-names";
import BottomNav from "@/components/BottomNav";

const LESSONS = Object.keys(GENKI_KANJI_BY_LESSON)
  .map(Number)
  .sort((a, b) => a - b);

const USER_KEY = "anon";

type KanjiModuleScreenProps = {
  initialLesson?: number;
};

export default function KanjiModuleScreen({ initialLesson }: KanjiModuleScreenProps) {
  const router = useRouter();
  const [lesson, setLesson] = useState(() =>
    initialLesson && LESSONS.includes(initialLesson) ? initialLesson : (LESSONS[0] ?? 3),
  );
  const [progress, setProgress] = useState<KanjiProgressMap>({});

  const lessonItems = useMemo(() => GENKI_KANJI_BY_LESSON[lesson] ?? [], [lesson]);
  const lessonTitle = GENKI_LESSON_NAMES[lesson] ?? `Lección ${lesson}`;
  const lessonSummary = useMemo(
    () => getKanjiLessonSummary(lesson, lessonItems, progress),
    [lesson, lessonItems, progress],
  );
  const nextAction = useMemo(() => getPracticeNextAction(lessonSummary), [lessonSummary]);
  const practiceSessionContext = useMemo(() => getPracticeSessionContext(lessonSummary), [lessonSummary]);
  const recommendPracticar = nextAction.targetMode === "practicar";

  useEffect(() => {
    setProgress(loadKanjiProgress(USER_KEY));
  }, []);

  useEffect(() => {
    if (!initialLesson || !LESSONS.includes(initialLesson)) return;
    setLesson(initialLesson);
  }, [initialLesson]);

  useEffect(() => {
    setLastActivity(`Kanji · L${lesson}`, "/practicar/kanji");
  }, [lesson]);

  function selectLesson(nextLesson: number) {
    setLesson(nextLesson);
    router.replace(`/practicar/kanji?lesson=${nextLesson}`, { scroll: false });
  }

  function goToLearnSession() {
    router.push(`/practicar/kanji/aprender?lesson=${lesson}`);
  }

  function goToPracticeSession() {
    const params = new URLSearchParams({ lesson: String(lesson), focus: practiceSessionContext.sortKey });
    router.push(`/practicar/kanji/practicar?${params.toString()}`);
  }

  const primaryAction = recommendPracticar
    ? { label: "Practicar", sub: "Pon a prueba tu lectura", onClick: goToPracticeSession }
    : { label: "Aprender", sub: "Repasa kanjis nuevos", onClick: goToLearnSession };

  const secondaryAction = recommendPracticar
    ? { label: "Aprender", sub: "Repasa kanjis nuevos", onClick: goToLearnSession }
    : { label: "Practicar", sub: "Pon a prueba tu lectura", onClick: goToPracticeSession };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0D0D1A",
        padding: "24px 20px calc(100px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* ── Header ── */}
      <h1 style={{ fontSize: 42, fontWeight: 800, color: "#FFFFFF", margin: 0, lineHeight: 1, letterSpacing: "-0.04em" }}>
        Kanji
      </h1>
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.42)", margin: "6px 0 0" }}>
        {lessonItems.length} kanji · L{lesson} · {lessonTitle}
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
                padding: "8px 16px",
                borderRadius: 999,
                border: "none",
                background: active ? "#FFFFFF" : "rgba(255,255,255,0.08)",
                color: active ? "#1A1A2E" : "rgba(255,255,255,0.55)",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              L{value}
            </button>
          );
        })}
      </div>

      {/* ── Mini stats ── */}
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        {[
          { label: "Nuevas", value: lessonSummary.nuevos, color: "rgba(255,255,255,0.65)" },
          { label: "Pendientes", value: lessonSummary.pendientes, color: "#E63946" },
          { label: "Dominadas", value: lessonSummary.dominados, color: "#4ECDC4" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              background: "#16161F",
              borderRadius: 12,
              padding: "10px 0",
              textAlign: "center",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>
              {s.value}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── CTAs ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
        {/* Primary */}
        <button
          onClick={primaryAction.onClick}
          style={{
            background: "#16161F",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.10)",
            cursor: "pointer",
            padding: "20px 22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ textAlign: "left" }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>
              {primaryAction.label}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
              {primaryAction.sub}
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
          onClick={secondaryAction.onClick}
          style={{
            background: "rgba(255,255,255,0.06)",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer",
            padding: "16px 22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ textAlign: "left" }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>{secondaryAction.label}</p>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: "rgba(255,255,255,0.42)" }}>{secondaryAction.sub}</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 18l6-6-6-6" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
