"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GENKI_VOCAB_BY_LESSON } from "@/lib/genki-vocab-by-lesson";
import type { GenkiVocabItem } from "@/lib/genki-vocab-by-lesson";
import { setLastActivity } from "@/lib/streak";
import {
  getVocabLessonSummary,
  getVocabProgressId,
  loadVocabProgress,
  recordVocabResult,
  saveVocabProgress,
  type VocabProgressMap,
} from "@/lib/vocab-progress";
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
import PracticeSessionLayout from "@/components/practicar/PracticeSessionLayout";

const USER_KEY = "anon";

const LESSON_LABELS: Record<number, string> = {
  1: "Saludos",
  2: "Números",
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
type QuizItem = { display: string; reading: string; es: string };
type VocabQuestion = { item: QuizItem; source: GenkiVocabItem; options: string[] };
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

function hasKanji(item: GenkiVocabItem) {
  return item.kanji.trim().length > 0;
}

function getMeaningShape(meaning: string) {
  if (meaning.includes(";")) return "multi";
  if (meaning.includes("(") || meaning.includes("[")) return "annotated";
  return "simple";
}

function getOptions(correct: QuizItem, source: GenkiVocabItem, lessonPool: GenkiVocabItem[], allPool: GenkiVocabItem[]) {
  const correctEs = correct.es;
  const correctHasKanji = hasKanji(source);
  const correctMeaningShape = getMeaningShape(correctEs);
  const seen = new Set<string>([correctEs]);

  const rankedCandidates = [...lessonPool, ...allPool]
    .filter((candidate) => candidate !== source)
    .map((candidate) => {
      const candidateMeaning = candidate.es;
      return {
        meaning: candidateMeaning,
        rank:
          (lessonPool.includes(candidate) ? 0 : 10) +
          (hasKanji(candidate) === correctHasKanji ? 0 : 2) +
          (getMeaningShape(candidateMeaning) === correctMeaningShape ? 0 : 1),
      };
    })
    .sort((a, b) => a.rank - b.rank);

  const wrong3: string[] = [];
  for (const candidate of rankedCandidates) {
    if (seen.has(candidate.meaning)) continue;
    seen.add(candidate.meaning);
    wrong3.push(candidate.meaning);
    if (wrong3.length === 3) break;
  }

  return shuffle([correctEs, ...wrong3]);
}

function sortLessonItemsForPractice(
  items: GenkiVocabItem[],
  progress: VocabProgressMap,
  lesson: number,
  actionKey: PracticeNextAction["key"],
) {
  const shuffled = shuffle(items);

  function getRank(item: GenkiVocabItem) {
    const id = getVocabProgressId(lesson, item);
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

  return [...shuffled].sort((a, b) => getRank(a) - getRank(b));
}

type Props = {
  initialLesson: number;
  initialFocusKey?: PracticeSessionSortKey | null;
};

export default function VocabularioPracticeSessionScreen({ initialLesson, initialFocusKey = null }: Props) {
  const router = useRouter();
  const [progress, setProgress] = useState<VocabProgressMap>(() =>
    typeof window === "undefined" ? {} : loadVocabProgress(USER_KEY),
  );
  const [questions, setQuestions] = useState<VocabQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizPhase, setQuizPhase] = useState<QuizPhase>("question");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [practiceResult, setPracticeResult] = useState<PracticeSessionResult | null>(null);

  const lesson = initialLesson;
  const lessonTitle = LESSON_LABELS[lesson] ?? `Lección ${lesson}`;
  const lessonItems = useMemo(() => GENKI_VOCAB_BY_LESSON[lesson] ?? [], [lesson]);
  const allVocabItems = useMemo(() => Object.values(GENKI_VOCAB_BY_LESSON).flat(), []);
  const lessonSummary = useMemo(
    () => getVocabLessonSummary(lesson, lessonItems, progress),
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
    setLastActivity(`Vocabulario · Practicar · L${lesson}`, "/practicar/vocabulario");
  }, [lesson]);

  function startSession(context: PracticeSessionContext) {
    const sorted = sortLessonItemsForPractice(lessonItems, progress, lesson, context.sortKey);
    setQuestions(
      sorted.map((source) => {
        const item = {
          display: source.kanji || source.hira,
          reading: source.hira,
          es: source.es,
        };
        return { item, source, options: getOptions(item, source, lessonItems, allVocabItems) };
      }),
    );
    setCurrentQuestionIndex(0);
    setQuizPhase("question");
    setSelectedOption(null);
    setCorrect(0);
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
    const isCorrect = option === currentQuestion.item.es;
    const nextCorrect = correct + (isCorrect ? 1 : 0);
    if (isCorrect) setCorrect((value) => value + 1);
    setProgress((previous) => {
      const next = recordVocabResult(previous, lesson, currentQuestion.source, isCorrect ? "correct" : "wrong");
      saveVocabProgress(USER_KEY, next);
      return next;
    });

    setTimeout(() => {
      if (currentQuestionIndex + 1 >= questions.length) {
        setPracticeResult({
          practiced: questions.length,
          correct: nextCorrect,
          incorrect: Math.max(questions.length - nextCorrect, 0),
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
      <PracticeSessionLayout>
        <PracticeSessionHeader
          moduleName="Vocabulario"
          lesson={lesson}
          lessonTitle={lessonTitle}
          sessionLabel="Práctica de la lección"
          sessionHelper="No hay vocabulario disponible para esta sesión."
          progressCurrent={0}
          progressTotal={0}
          progressPct={0}
          metricLabel="correctas"
          metricValue={0}
          accentColor="#4ECDC4"
          accentSurface="rgba(78,205,196,0.14)"
          onExit={() => router.push(`/practicar/vocabulario?lesson=${lesson}`)}
        />
      </PracticeSessionLayout>
    );
  }

  return (
    <PracticeSessionLayout>
      <PracticeSessionHeader
        moduleName="Vocabulario"
        lesson={lesson}
        lessonTitle={lessonTitle}
        sessionLabel={sessionContext.label}
        sessionHelper={sessionContext.helper}
        progressCurrent={currentQuestionIndex + 1}
        progressTotal={questions.length}
        progressPct={practiceProgressPct}
        metricLabel="correctas"
        metricValue={correct}
        accentColor="#4ECDC4"
        accentSurface="rgba(78,205,196,0.14)"
        onExit={() => router.push(`/practicar/vocabulario?lesson=${lesson}`)}
      />

      <div style={{ marginTop: "18px", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
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
              flex: 1,
              justifyContent: "center",
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
                onClick={() => router.push(`/practicar/vocabulario?lesson=${lesson}`)}
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
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 20px rgba(26,26,46,0.08)",
                minHeight: "min(36dvh, 340px)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  alignSelf: "stretch",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                  gap: "12px",
                }}
              >
                <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.08em", color: "#9CA3AF" }}>
                  PALABRA
                </span>
                <span
                  style={{
                    background: currentQuestion.source.kanji ? "#FFF8E7" : "#F5FCFB",
                    color: "#6B7280",
                    borderRadius: "999px",
                    padding: "7px 10px",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  {currentQuestion.source.kanji ? "Con kanji" : "Solo en kana"}
                </span>
              </div>
              <p
                style={{
                  fontSize: "64px",
                  fontWeight: 800,
                  color: "#1A1A2E",
                  margin: 0,
                  fontFamily: "var(--font-noto-sans-jp), sans-serif",
                  lineHeight: 1,
                  textAlign: "center",
                }}
              >
                {currentQuestion.item.display}
              </p>
              {currentQuestion.item.reading !== currentQuestion.item.display && (
                <div
                  style={{
                    marginTop: "16px",
                    background: "#FFF8E7",
                    borderRadius: "18px",
                    padding: "12px 16px",
                    minWidth: "min(100%, 240px)",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "11px", fontWeight: 800, letterSpacing: "0.08em", color: "#9CA3AF" }}>
                    LECTURA
                  </p>
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: "22px",
                      fontWeight: 800,
                      color: "#1A1A2E",
                      fontFamily: "var(--font-noto-sans-jp), sans-serif",
                    }}
                  >
                    {currentQuestion.item.reading}
                  </p>
                </div>
              )}
              <p style={{ margin: "16px 0 0", fontSize: "13px", color: "#9CA3AF", lineHeight: 1.4 }}>
                Elige el significado más preciso para esta palabra.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                paddingTop: "16px",
                paddingBottom: "4px",
              }}
            >
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedOption === option;
                const isCorrectOption = option === currentQuestion.item.es;
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
                      padding: "16px 14px",
                      borderRadius: "18px",
                      border: "none",
                      cursor: quizPhase === "feedback" ? "default" : "pointer",
                      background,
                      color,
                      fontSize: "15px",
                      fontWeight: 700,
                      boxShadow: "0 4px 14px rgba(26,26,46,0.08)",
                      transition: "background 0.15s",
                      textAlign: "left",
                      minHeight: "88px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                    }}
                  >
                    <span
                      style={{
                        width: "26px",
                        height: "26px",
                        borderRadius: "50%",
                        background:
                          quizPhase === "feedback" && isCorrectOption
                            ? "rgba(255,255,255,0.22)"
                            : "rgba(26,26,46,0.08)",
                        color,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "13px",
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span style={{ lineHeight: 1.35 }}>{option}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </PracticeSessionLayout>
  );
}
