"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GENKI_KANJI_BY_LESSON } from "@/lib/genki-kanji-by-lesson";
import type { GenkiKanjiItem } from "@/lib/genki-kanji-by-lesson";
import { setLastActivity } from "@/lib/streak";
import {
  getKanjiLessonSummary,
  getKanjiProgressId,
  loadKanjiProgress,
  recordKanjiResult,
  saveKanjiProgress,
  type KanjiProgressMap,
} from "@/lib/kanji-progress";
import {
  getPracticeNextAction,
  getPracticeSessionContext,
  getPracticeSessionContextForSortKey,
  isPracticeDifficult,
  isPracticeDominated,
  isPracticeDue,
  type PracticeNextAction,
  type PracticeSessionContext,
  type PracticeSessionSortKey,
} from "@/lib/practice-srs";
import PracticeSessionHeader from "@/components/practicar/PracticeSessionHeader";

const USER_KEY = "anon";

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

type QuizPhase = "question" | "feedback";
type ReadingQuestion = {
  item: GenkiKanjiItem;
  options: string[];
};
type PracticeSessionResult = {
  practiced: number;
  correct: number;
  incorrect: number;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getReadingOptions(correct: GenkiKanjiItem, pool: GenkiKanjiItem[]) {
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
    return a.kanji.localeCompare(b.kanji, "ja");
  });
}

type Props = {
  initialLesson: number;
  initialFocusKey?: PracticeSessionSortKey | null;
};

export default function KanjiPracticeSessionScreen({ initialLesson, initialFocusKey = null }: Props) {
  const router = useRouter();
  const [progress, setProgress] = useState<KanjiProgressMap>(() =>
    typeof window === "undefined" ? {} : loadKanjiProgress(USER_KEY),
  );
  const [questions, setQuestions] = useState<ReadingQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizPhase, setQuizPhase] = useState<QuizPhase>("question");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [practiceResult, setPracticeResult] = useState<PracticeSessionResult | null>(null);

  const lesson = initialLesson;
  const lessonTitle = LESSON_LABELS[lesson] ?? `Lección ${lesson}`;
  const lessonItems = useMemo(() => GENKI_KANJI_BY_LESSON[lesson] ?? [], [lesson]);
  const lessonSummary = useMemo(
    () => getKanjiLessonSummary(lesson, lessonItems, progress),
    [lesson, lessonItems, progress],
  );
  const nextAction = useMemo(() => getPracticeNextAction(lessonSummary), [lessonSummary]);
  const sessionContext = useMemo<PracticeSessionContext>(
    () =>
      initialFocusKey
        ? getPracticeSessionContextForSortKey(initialFocusKey)
        : getPracticeSessionContext(lessonSummary),
    [initialFocusKey, lessonSummary],
  );
  const currentQuestion = questions[currentQuestionIndex];
  const practiceProgressPct = questions.length > 0 ? (currentQuestionIndex / questions.length) * 100 : 0;

  useEffect(() => {
    setLastActivity(`Kanji · Practicar · L${lesson}`, "/practicar/kanji");
  }, [lesson]);

  function startSession(context: PracticeSessionContext) {
    const prioritized = sortLessonItemsForPractice(lessonItems, progress, lesson, context.sortKey);
    setQuestions(prioritized.map((item) => ({ item, options: getReadingOptions(item, lessonItems) })));
    setCurrentQuestionIndex(0);
    setQuizPhase("question");
    setSelectedOption(null);
    setCorrectCount(0);
    setPracticeResult(null);
  }

  useEffect(() => {
    startSession(sessionContext);
    // lesson/focus start a new session intentionally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson, initialFocusKey]);

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

    setTimeout(() => {
      if (currentQuestionIndex + 1 >= questions.length) {
        setPracticeResult({
          practiced: questions.length,
          correct: nextCorrectCount,
          incorrect: Math.max(questions.length - nextCorrectCount, 0),
        });
        setCurrentQuestionIndex(questions.length);
        setQuizPhase("question");
        setSelectedOption(null);
      } else {
        setCurrentQuestionIndex((value) => value + 1);
        setQuizPhase("question");
        setSelectedOption(null);
      }
    }, isCorrect ? 700 : 1000);
  }

  if (lessonItems.length === 0) {
    return (
      <div style={{ background: "#FFF8E7", minHeight: "100vh", padding: "24px 20px 40px" }}>
        <PracticeSessionHeader
          moduleName="Kanji"
          lesson={lesson}
          lessonTitle={lessonTitle}
          sessionLabel="Práctica de la lección"
          sessionHelper="No hay palabras con kanji disponibles para esta sesión."
          progressCurrent={0}
          progressTotal={0}
          progressPct={0}
          metricLabel="correctas"
          metricValue={0}
          accentColor="#4ECDC4"
          accentSurface="rgba(78,205,196,0.14)"
          onExit={() => router.push(`/practicar/kanji?lesson=${lesson}`)}
        />
      </div>
    );
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
      <PracticeSessionHeader
        moduleName="Kanji"
        lesson={lesson}
        lessonTitle={lessonTitle}
        sessionLabel={sessionContext.label}
        sessionHelper={sessionContext.helper}
        progressCurrent={currentQuestionIndex + 1}
        progressTotal={questions.length}
        progressPct={practiceProgressPct}
        metricLabel="correctas"
        metricValue={correctCount}
        accentColor="#4ECDC4"
        accentSurface="rgba(78,205,196,0.14)"
        onExit={() => router.push(`/practicar/kanji?lesson=${lesson}`)}
      />

      <div style={{ marginTop: "18px", flex: 1, display: "flex", flexDirection: "column" }}>
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
                {sessionContext.label} · L{lesson}
              </div>
            </div>
            <p style={{ margin: 0, fontSize: "15px", color: "#1A1A2E", lineHeight: 1.45 }}>
              Practicaste {practiceResult.practiced} · {practiceResult.correct} correctas ·{" "}
              {practiceResult.incorrect} incorrectas
            </p>
            <p style={{ margin: 0, fontSize: "14px", color: "#6B7280", lineHeight: 1.45 }}>
              {sessionContext.helper}
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
                onClick={() => startSession(sessionContext)}
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
                onClick={() => router.push(`/practicar/kanji?lesson=${lesson}`)}
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
                Volver al módulo
              </button>
            </div>
          </div>
        ) : currentQuestion ? (
          <>
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
                minHeight: "240px",
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
              <p style={{ margin: "16px 0 0", fontSize: "13px", color: "#9CA3AF", lineHeight: 1.4 }}>
                Elige la lectura correcta para esta palabra.
              </p>
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
                      minHeight: "84px",
                    }}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
