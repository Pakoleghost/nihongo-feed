"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GENKI_KANJI_BY_LESSON } from "@/lib/genki-kanji-by-lesson";
import type { GenkiKanjiItem } from "@/lib/genki-kanji-by-lesson";
import { getStreak, setLastActivity } from "@/lib/streak";
import {
  getKanjiLessonSummary,
  getKanjiProgressId,
  loadKanjiProgress,
  recordKanjiExposure,
  recordKanjiResult,
  saveKanjiProgress,
  type KanjiProgressMap,
} from "@/lib/kanji-progress";
import {
  getPracticeNextAction,
  getPracticeSessionContext,
  isPracticeDifficult,
  isPracticeDominated,
  isPracticeDue,
  type PracticeNextAction,
  type PracticeSessionContext,
} from "@/lib/practice-srs";

const LESSONS = Object.keys(GENKI_KANJI_BY_LESSON)
  .map(Number)
  .sort((a, b) => a - b);

const LESSON_LABELS: Record<number, string> = {
  3: "Familia",
  4: "Horario",
  5: "Mi día",
  6: "Deportes",
  7: "Ciudad",
  8: "Fin de semana",
  9: "Viajes",
  10: "Invierno",
  11: "Recuerdos",
  12: "Festivales",
};

type Mode = "aprender" | "practicar";
type QuizPhase = "question" | "feedback";
type ReadingQuestion = {
  item: GenkiKanjiItem;
  options: string[];
};
type PracticeSessionResult = {
  practiced: number;
  correct: number;
  incorrect: number;
  label: string;
  helper: string;
};

const USER_KEY = "anon";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getReadingOptions(correct: GenkiKanjiItem, pool: GenkiKanjiItem[]): string[] {
  const correctReading = correct.hira;
  const others = [...new Set(pool.map((item) => item.hira).filter((hira) => hira !== correctReading))];
  const supplemented =
    others.length < 3
      ? [
          ...new Set(
            Object.values(GENKI_KANJI_BY_LESSON)
              .flat()
              .map((item) => item.hira)
              .filter((hira) => hira !== correctReading),
          ),
        ]
      : others;
  const wrong3 = shuffle(supplemented).slice(0, 3);
  return shuffle([correctReading, ...wrong3]);
}

const KANJI_ENTRY_TYPE_PRIORITY: Record<GenkiKanjiItem["entry_type"], number> = {
  word: 0,
  verb: 1,
  adjective_i: 2,
  na_adjective: 3,
  suru_verb: 4,
  single_kanji_word: 5,
  weekday: 6,
  phrase: 7,
  time_expression: 8,
  proper_name: 9,
};

function compareByKanjiPriority(a: GenkiKanjiItem, b: GenkiKanjiItem) {
  const rankDiff = KANJI_ENTRY_TYPE_PRIORITY[a.entry_type] - KANJI_ENTRY_TYPE_PRIORITY[b.entry_type];
  if (rankDiff !== 0) return rankDiff;

  const rowDiff = a.source_row - b.source_row;
  if (rowDiff !== 0) return rowDiff;

  return a.kanji.localeCompare(b.kanji, "ja");
}

function sortLessonItemsByEntryType(items: GenkiKanjiItem[]) {
  return [...items].sort(compareByKanjiPriority);
}

function sortLessonItemsForPractice(
  items: GenkiKanjiItem[],
  progress: KanjiProgressMap,
  lesson: number,
  actionKey: PracticeNextAction["key"],
) {
  function getRank(item: GenkiKanjiItem) {
    const id = getKanjiProgressId(lesson, item);
    const entry = progress[id];
    const exposedOnly = Boolean(entry && entry.exposure_count > 0 && entry.times_seen === 0);
    const due = isPracticeDue(entry);
    const weak = isPracticeDifficult(entry);
    const dominated = isPracticeDominated(entry);
    const practiced = Boolean(entry && entry.times_seen > 0);

    if (actionKey === "practice_due") {
      if (due) return 0;
      if (weak) return 1;
      if (exposedOnly) return 2;
      if (practiced && !dominated) return 3;
      return 4;
    }

    if (actionKey === "practice_weak") {
      if (weak) return 0;
      if (due) return 1;
      if (exposedOnly) return 2;
      if (practiced && !dominated) return 3;
      return 4;
    }

    if (actionKey === "practice_now") {
      if (exposedOnly) return 0;
      if (!practiced) return 1;
      if (due) return 2;
      if (weak) return 3;
      return 4;
    }

    if (due) return 0;
    if (weak) return 1;
    if (practiced && !dominated) return 2;
    if (exposedOnly) return 3;
    return 4;
  }

  return [...items].sort((a, b) => {
    const rankDiff = getRank(a) - getRank(b);
    if (rankDiff !== 0) return rankDiff;
    return compareByKanjiPriority(a, b);
  });
}

export default function KanjiModuleScreen() {
  const router = useRouter();
  const learnExposureIdsRef = useRef<Set<string>>(new Set());
  const [lesson, setLesson] = useState(LESSONS[0] ?? 3);
  const [mode, setMode] = useState<Mode>("aprender");
  const [streak, setStreak] = useState(0);

  const [studyItems, setStudyItems] = useState<GenkiKanjiItem[]>([]);
  const [currentStudyIndex, setCurrentStudyIndex] = useState(0);
  const [progress, setProgress] = useState<KanjiProgressMap>({});

  const [questions, setQuestions] = useState<ReadingQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizPhase, setQuizPhase] = useState<QuizPhase>("question");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [activePracticeSession, setActivePracticeSession] = useState<PracticeSessionContext | null>(null);
  const [practiceResult, setPracticeResult] = useState<PracticeSessionResult | null>(null);

  const lessonItems = useMemo(() => GENKI_KANJI_BY_LESSON[lesson] ?? [], [lesson]);
  const orderedLessonItems = useMemo(() => sortLessonItemsByEntryType(lessonItems), [lessonItems]);
  const lessonTitle = LESSON_LABELS[lesson] ?? `Lección ${lesson}`;
  const lessonSummary = useMemo(
    () => getKanjiLessonSummary(lesson, lessonItems, progress),
    [lesson, lessonItems, progress],
  );
  const nextAction = useMemo(() => getPracticeNextAction(lessonSummary), [lessonSummary]);
  const practiceSessionContext = useMemo(
    () => getPracticeSessionContext(lessonSummary),
    [lessonSummary],
  );
  const currentStudyItem = studyItems[currentStudyIndex];
  const currentQuestion = questions[currentQuestionIndex];
  const studyProgressPct = studyItems.length > 0 ? (currentStudyIndex / studyItems.length) * 100 : 0;
  const practiceProgressPct = questions.length > 0 ? (currentQuestionIndex / questions.length) * 100 : 0;
  const lessonHelper =
    lessonSummary.pendientes > 0
      ? `Tienes ${lessonSummary.pendientes} lecturas pendientes en esta lección.`
      : lessonSummary.debiles > 0
        ? `Hay ${lessonSummary.debiles} lecturas débiles por reforzar.`
        : lessonSummary.solo_expuestos > 0
          ? `Ya viste ${lessonSummary.solo_expuestos} en Aprender. Practica para fijar su lectura.`
        : lessonSummary.dominados > 0
          ? `Ya dominaste ${lessonSummary.dominados} palabras con kanji en esta lección.`
          : `Aún tienes ${lessonSummary.nuevos} palabras nuevas por trabajar.`;

  useEffect(() => {
    setStreak(getStreak());
    setProgress(loadKanjiProgress(USER_KEY));
  }, []);

  useEffect(() => {
    const modeLabel = mode === "aprender" ? "Aprender" : "Practicar";
    setLastActivity(`Kanji · ${modeLabel} · L${lesson}`, "/practicar/kanji");
  }, [lesson, mode]);

  useEffect(() => {
    learnExposureIdsRef.current = new Set();
    setStudyItems(orderedLessonItems);
    setCurrentStudyIndex(0);
  }, [orderedLessonItems]);

  useEffect(() => {
    if (mode !== "aprender" || !currentStudyItem) return;
    const itemId = `${lesson}:${currentStudyItem.kanji}:${currentStudyItem.hira}:${currentStudyItem.es}`;
    if (learnExposureIdsRef.current.has(itemId)) return;
    learnExposureIdsRef.current.add(itemId);
    setProgress((previous) => {
      const next = recordKanjiExposure(previous, lesson, currentStudyItem);
      saveKanjiProgress(USER_KEY, next);
      return next;
    });
  }, [mode, lesson, currentStudyItem]);

  useEffect(() => {
    setQuestions(orderedLessonItems.map((item) => ({ item, options: getReadingOptions(item, lessonItems) })));
    setCurrentQuestionIndex(0);
    setQuizPhase("question");
    setSelectedOption(null);
    setCorrectCount(0);
    setActivePracticeSession(null);
    setPracticeResult(null);
  }, [lessonItems, orderedLessonItems]);

  function restartPracticeSessionWithContext(sessionContext: PracticeSessionContext) {
    const prioritized = sortLessonItemsForPractice(orderedLessonItems, progress, lesson, sessionContext.sortKey);
    setQuestions(prioritized.map((item) => ({ item, options: getReadingOptions(item, lessonItems) })));
    setCurrentQuestionIndex(0);
    setQuizPhase("question");
    setSelectedOption(null);
    setCorrectCount(0);
    setActivePracticeSession(sessionContext);
    setPracticeResult(null);
  }

  function restartPracticeSession() {
    restartPracticeSessionWithContext(practiceSessionContext);
  }

  function handleNextAction() {
    if (nextAction.targetMode === "aprender") {
      setMode("aprender");
      learnExposureIdsRef.current = new Set();
      setCurrentStudyIndex(0);
      return;
    }

    setMode("practicar");
    restartPracticeSessionWithContext(practiceSessionContext);
  }

  function handleOption(option: string) {
    if (quizPhase !== "question" || !currentQuestion) return;
    setSelectedOption(option);
    setQuizPhase("feedback");
    const isCorrect = option === currentQuestion.item.hira;
    const nextCorrectCount = correctCount + (isCorrect ? 1 : 0);
    if (isCorrect) setCorrectCount((value) => value + 1);
    setProgress((previous) => {
      const next = recordKanjiResult(previous, lesson, currentQuestion.item, isCorrect ? "correct" : "wrong");
      saveKanjiProgress(USER_KEY, next);
      return next;
    });
    const delay = isCorrect ? 700 : 1000;

    setTimeout(() => {
      if (currentQuestionIndex + 1 >= questions.length) {
        const sessionContext = activePracticeSession ?? practiceSessionContext;
        setPracticeResult({
          practiced: questions.length,
          correct: nextCorrectCount,
          incorrect: Math.max(questions.length - nextCorrectCount, 0),
          label: sessionContext.label,
          helper: sessionContext.helper,
        });
        setCurrentQuestionIndex(questions.length);
        setQuizPhase("question");
        setSelectedOption(null);
      } else {
        setCurrentQuestionIndex((value) => value + 1);
        setQuizPhase("question");
        setSelectedOption(null);
      }
    }, delay);
  }

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "24px 20px 40px",
      }}
    >
      <div
        style={{
          paddingTop: "28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <button
          onClick={() => router.push("/practicar")}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "#FFFFFF",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 10px rgba(26,26,46,0.10)",
            flexShrink: 0,
          }}
          aria-label="Volver"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="#1A1A2E" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>

        <div
          style={{
            background: "rgba(78,205,196,0.14)",
            borderRadius: "999px",
            padding: "7px 14px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <span style={{ fontSize: "14px" }}>🔥</span>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#1A1A2E" }}>
            Racha de {streak} días
          </span>
        </div>
      </div>

      <div style={{ paddingTop: "18px" }}>
        <p
          style={{
            fontSize: "42px",
            fontWeight: 800,
            color: "#1A1A2E",
            margin: 0,
            lineHeight: 1,
          }}
        >
          Kanji
        </p>
        <p
          style={{
            fontSize: "15px",
            color: "#6B7280",
            margin: "8px 0 0",
            lineHeight: 1.45,
          }}
        >
          Estudia palabras con kanji por lección y practica su lectura.
        </p>
      </div>

      <div
        style={{
          marginTop: "18px",
          background: "#FFFFFF",
          borderRadius: "24px",
          padding: "18px 18px 16px",
          boxShadow: "0 8px 28px rgba(26,26,46,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div>
            <p style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", color: "#9CA3AF", margin: 0 }}>
              LECCIÓN ACTUAL
            </p>
            <p style={{ fontSize: "20px", fontWeight: 800, color: "#1A1A2E", margin: "6px 0 0" }}>
              L{lesson} · {lessonTitle}
            </p>
          </div>
          <div
            style={{
              background: "#EDFDFC",
              color: "#0F766E",
              borderRadius: "999px",
              padding: "8px 12px",
              fontSize: "13px",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {lessonItems.length} palabras
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            overflowX: "auto",
            paddingTop: "16px",
            scrollbarWidth: "none",
          }}
        >
          {LESSONS.map((value) => (
            <button
              key={value}
              onClick={() => setLesson(value)}
              style={{
                flexShrink: 0,
                padding: "10px 18px",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                background: lesson === value ? "#1A1A2E" : "#FFF8E7",
                color: lesson === value ? "#FFFFFF" : "#1A1A2E",
                fontWeight: 700,
                fontSize: "14px",
                boxShadow: lesson === value ? "none" : "0 2px 8px rgba(26,26,46,0.06)",
                whiteSpace: "nowrap",
              }}
            >
              L{value}
            </button>
          ))}
        </div>

        <div
          style={{
            marginTop: "16px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
          }}
        >
          {(["aprender", "practicar"] as const).map((value) => {
            const active = mode === value;
            return (
              <button
                key={value}
                onClick={() => {
                  if (value === "practicar") {
                    setMode("practicar");
                    restartPracticeSessionWithContext(practiceSessionContext);
                    return;
                  }
                  setMode("aprender");
                  setPracticeResult(null);
                }}
                style={{
                  border: "none",
                  cursor: "pointer",
                  borderRadius: "18px",
                  padding: "14px 16px",
                  textAlign: "left",
                  background: active ? (value === "aprender" ? "#E63946" : "#4ECDC4") : "#F4EFE7",
                  color: active ? "#FFFFFF" : "#1A1A2E",
                  boxShadow: active ? "0 8px 22px rgba(26,26,46,0.10)" : "none",
                }}
              >
                <p style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>
                  {value === "aprender" ? "Aprender" : "Practicar"}
                </p>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "13px",
                    lineHeight: 1.35,
                    color: active ? "rgba(255,255,255,0.86)" : "#6B7280",
                  }}
                >
                  {value === "aprender"
                    ? "Estudia forma, lectura y significado."
                    : "Elige la lectura correcta."}
                </p>
              </button>
            );
          })}
        </div>

        <div
          style={{
            marginTop: "16px",
            background: "#FFF8E7",
            borderRadius: "18px",
            padding: "14px 14px 12px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "8px",
            }}
          >
            {[
              { label: "Nuevos", value: lessonSummary.nuevos },
              { label: "Aprendiendo", value: lessonSummary.aprendiendo },
              { label: "En repaso", value: lessonSummary.en_repaso },
              { label: "Dominados", value: lessonSummary.dominados },
              { label: "Pendientes", value: lessonSummary.pendientes },
              { label: "Débiles", value: lessonSummary.debiles },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: "#FFFFFF",
                  borderRadius: "14px",
                  padding: "10px 10px 9px",
                  boxShadow: "0 2px 8px rgba(26,26,46,0.05)",
                }}
              >
                <p style={{ margin: 0, fontSize: "11px", fontWeight: 800, color: "#9CA3AF", lineHeight: 1.2 }}>
                  {item.label}
                </p>
                <p style={{ margin: "5px 0 0", fontSize: "20px", fontWeight: 800, color: "#1A1A2E", lineHeight: 1 }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <p style={{ margin: "10px 2px 0", fontSize: "13px", color: "#6B7280", lineHeight: 1.35 }}>
            {lessonHelper}
          </p>

          <div style={{ marginTop: "12px" }}>
            <button
              onClick={handleNextAction}
              style={{
                width: "100%",
                border: "none",
                cursor: "pointer",
                borderRadius: "16px",
                padding: "15px 16px",
                background: nextAction.targetMode === "aprender" ? "#E63946" : "#1A1A2E",
                color: "#FFFFFF",
                fontSize: "16px",
                fontWeight: 800,
                boxShadow: "0 6px 18px rgba(26,26,46,0.12)",
              }}
            >
              {nextAction.label}
            </button>
            <p style={{ margin: "8px 2px 0", fontSize: "13px", color: "#6B7280", lineHeight: 1.35 }}>
              {nextAction.helper}
            </p>
          </div>
        </div>
      </div>

      {mode === "aprender" ? (
        <div
          style={{
            marginTop: "18px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
              gap: "12px",
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#1A1A2E" }}>Aprender</p>
              <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#6B7280" }}>
                Repasa cómo se leen las palabras de esta lección.
              </p>
            </div>
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: "999px",
                padding: "8px 12px",
                fontSize: "13px",
                fontWeight: 700,
                color: "#E63946",
                boxShadow: "0 2px 10px rgba(26,26,46,0.06)",
                whiteSpace: "nowrap",
              }}
            >
              {currentStudyIndex + 1}/{studyItems.length || 0}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em", color: "#9CA3AF" }}>
              ESTUDIO
            </span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#E63946" }}>
              Lectura + apoyo
            </span>
          </div>
          <div
            style={{
              height: "5px",
              background: "#E5E7EB",
              borderRadius: "999px",
              overflow: "hidden",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${studyProgressPct}%`,
                background: "#E63946",
                borderRadius: "999px",
                transition: "width 0.3s ease",
              }}
            />
          </div>

          {currentStudyItem ? (
            <>
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: "24px",
                  padding: "30px 24px",
                  boxShadow: "0 8px 28px rgba(26,26,46,0.08)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    fontSize: "64px",
                    fontWeight: 800,
                    color: "#1A1A2E",
                    margin: 0,
                    fontFamily: "var(--font-noto-sans-jp), sans-serif",
                    lineHeight: 1,
                  }}
                >
                  {currentStudyItem.kanji}
                </p>
                <div
                  style={{
                    marginTop: "18px",
                    background: "#FFF8E7",
                    borderRadius: "18px",
                    padding: "14px 16px",
                    width: "100%",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", color: "#9CA3AF" }}>
                    LECTURA
                  </p>
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: "28px",
                      fontWeight: 800,
                      color: "#1A1A2E",
                      fontFamily: "var(--font-noto-sans-jp), sans-serif",
                    }}
                  >
                    {currentStudyItem.hira}
                  </p>
                </div>
                <div
                  style={{
                    marginTop: "12px",
                    background: "#F5FCFB",
                    borderRadius: "18px",
                    padding: "14px 16px",
                    width: "100%",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", color: "#9CA3AF" }}>
                    SIGNIFICADO
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: "18px", fontWeight: 700, color: "#1A1A2E", lineHeight: 1.35 }}>
                    {currentStudyItem.es}
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "16px" }}>
                <button
                  onClick={() => setCurrentStudyIndex((value) => Math.max(0, value - 1))}
                  disabled={currentStudyIndex === 0}
                  style={{
                    padding: "16px 12px",
                    borderRadius: "999px",
                    border: "none",
                    cursor: currentStudyIndex === 0 ? "default" : "pointer",
                    background: currentStudyIndex === 0 ? "#E5E7EB" : "#FFFFFF",
                    color: currentStudyIndex === 0 ? "#9CA3AF" : "#1A1A2E",
                    fontWeight: 700,
                    fontSize: "16px",
                    boxShadow: currentStudyIndex === 0 ? "none" : "0 4px 16px rgba(26,26,46,0.08)",
                  }}
                >
                  Anterior
                </button>
                <button
                  onClick={() =>
                    setCurrentStudyIndex((value) => (value + 1 >= studyItems.length ? value : value + 1))
                  }
                  disabled={currentStudyIndex + 1 >= studyItems.length}
                  style={{
                    padding: "16px 12px",
                    borderRadius: "999px",
                    border: "none",
                    cursor: currentStudyIndex + 1 >= studyItems.length ? "default" : "pointer",
                    background: currentStudyIndex + 1 >= studyItems.length ? "#E5E7EB" : "#4ECDC4",
                    color: currentStudyIndex + 1 >= studyItems.length ? "#9CA3AF" : "#1A1A2E",
                    fontWeight: 800,
                    fontSize: "16px",
                    boxShadow:
                      currentStudyIndex + 1 >= studyItems.length ? "none" : "0 4px 16px rgba(78,205,196,0.28)",
                  }}
                >
                  Siguiente
                </button>
              </div>
            </>
          ) : (
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: "24px",
                padding: "28px 24px",
                boxShadow: "0 8px 28px rgba(26,26,46,0.08)",
              }}
            >
              <p style={{ margin: 0, fontSize: "15px", color: "#6B7280", textAlign: "center" }}>
                No hay palabras con kanji para esta lección.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            marginTop: "18px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
              gap: "12px",
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#1A1A2E" }}>Practicar</p>
              <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#6B7280" }}>
                Lee la palabra con kanji y elige su lectura correcta.
              </p>
            </div>
            {!practiceResult && (
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: "999px",
                  padding: "8px 12px",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#1A1A2E",
                  boxShadow: "0 2px 10px rgba(26,26,46,0.06)",
                  whiteSpace: "nowrap",
                }}
              >
                {Math.min(currentQuestionIndex + 1, questions.length || 0)}/{questions.length || 0}
              </div>
            )}
          </div>

          {practiceResult ? (
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: "24px",
                padding: "28px 24px",
                boxShadow: "0 8px 28px rgba(26,26,46,0.08)",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: "#1A1A2E" }}>Sesión completada</p>
                <div
                  style={{
                    display: "inline-flex",
                    marginTop: "10px",
                    background: "#F5FCFB",
                    color: "#0F766E",
                    borderRadius: "999px",
                    padding: "8px 12px",
                    fontSize: "13px",
                    fontWeight: 800,
                  }}
                >
                  {practiceResult.label} · L{lesson}
                </div>
              </div>
              <p style={{ margin: 0, fontSize: "15px", color: "#1A1A2E", lineHeight: 1.45 }}>
                Practicaste {practiceResult.practiced} · {practiceResult.correct} correctas ·{" "}
                {practiceResult.incorrect} incorrectas
              </p>
              <p style={{ margin: 0, fontSize: "14px", color: "#6B7280", lineHeight: 1.45 }}>
                {practiceResult.helper}
              </p>
              <div
                style={{
                  background: "#FFF8E7",
                  borderRadius: "18px",
                  padding: "14px 16px",
                }}
              >
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", color: "#9CA3AF" }}>
                  QUÉ SIGUE
                </p>
                <p style={{ margin: "6px 0 0", fontSize: "16px", fontWeight: 800, color: "#1A1A2E" }}>
                  {nextAction.label}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#6B7280", lineHeight: 1.4 }}>
                  {nextAction.helper}
                </p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <button
                  onClick={() => restartPracticeSessionWithContext(practiceSessionContext)}
                  style={{
                    padding: "14px 18px",
                    borderRadius: "999px",
                    border: "none",
                    cursor: "pointer",
                    background: "#1A1A2E",
                    color: "#FFFFFF",
                    fontWeight: 800,
                    fontSize: "15px",
                  }}
                >
                  Otra sesión
                </button>
                <button
                  onClick={handleNextAction}
                  style={{
                    padding: "14px 18px",
                    borderRadius: "999px",
                    border: "none",
                    cursor: "pointer",
                    background: "#4ECDC4",
                    color: "#1A1A2E",
                    fontWeight: 800,
                    fontSize: "15px",
                  }}
                >
                  {nextAction.label}
                </button>
              </div>
            </div>
          ) : currentQuestion ? (
            <>
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: "18px",
                  padding: "14px 16px",
                  boxShadow: "0 4px 14px rgba(26,26,46,0.06)",
                  marginBottom: "12px",
                }}
              >
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", color: "#9CA3AF" }}>
                  TIPO DE SESIÓN
                </p>
                <p style={{ margin: "6px 0 0", fontSize: "17px", fontWeight: 800, color: "#1A1A2E" }}>
                  {(activePracticeSession ?? practiceSessionContext).label} · L{lesson}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#6B7280", lineHeight: 1.4 }}>
                  {(activePracticeSession ?? practiceSessionContext).helper}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em", color: "#9CA3AF" }}>
                  PRÁCTICA
                </span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#4ECDC4" }}>
                  {correctCount} correctas
                </span>
              </div>
              <div
                style={{
                  height: "5px",
                  background: "#E5E7EB",
                  borderRadius: "999px",
                  overflow: "hidden",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${practiceProgressPct}%`,
                    background: "#4ECDC4",
                    borderRadius: "999px",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>

              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: "24px",
                  padding: "30px 24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 20px rgba(26,26,46,0.08)",
                  minHeight: "220px",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    fontSize: "64px",
                    fontWeight: 800,
                    color: "#1A1A2E",
                    margin: 0,
                    fontFamily: "var(--font-noto-sans-jp), sans-serif",
                    lineHeight: 1,
                  }}
                >
                  {currentQuestion.item.kanji}
                </p>
                <div
                  style={{
                    marginTop: "14px",
                    background: "#FFF8E7",
                    borderRadius: "999px",
                    padding: "8px 12px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#6B7280",
                  }}
                >
                  Apoyo: {currentQuestion.item.es}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  paddingTop: "16px",
                }}
              >
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedOption === option;
                  const isCorrectOption = option === currentQuestion.item.hira;
                  let background = "#FFFFFF";
                  let color = "#1A1A2E";

                  if (quizPhase === "feedback") {
                    if (isCorrectOption) {
                      background = "#4ECDC4";
                      color = "#FFFFFF";
                    } else if (isSelected) {
                      background = "#E63946";
                      color = "#FFFFFF";
                    }
                  }

                  return (
                    <button
                      key={option}
                      onClick={() => handleOption(option)}
                      disabled={quizPhase === "feedback"}
                      style={{
                        padding: "18px 12px",
                        borderRadius: "18px",
                        border: "none",
                        cursor: quizPhase === "feedback" ? "default" : "pointer",
                        background,
                        color,
                        fontSize: "22px",
                        fontWeight: 800,
                        boxShadow: "0 4px 14px rgba(26,26,46,0.08)",
                        transition: "background 0.15s",
                        textAlign: "center",
                        fontFamily: "var(--font-noto-sans-jp), sans-serif",
                      }}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: "24px",
                padding: "28px 24px",
                boxShadow: "0 8px 28px rgba(26,26,46,0.08)",
              }}
            >
              <p style={{ margin: 0, fontSize: "15px", color: "#6B7280", textAlign: "center" }}>
                No hay palabras con kanji para practicar en esta lección.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
