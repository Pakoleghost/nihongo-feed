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
import { GENKI_LESSON_NAMES } from "@/lib/genki-lesson-names";

const USER_KEY = "anon";

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

function getVocabPracticeTitle() {
  return "Práctica de vocabulario";
}

function getVocabPracticeHelper(context: PracticeSessionContext) {
  switch (context.sortKey) {
    case "practice_due":
      return "Repasa lo que ya toca reforzar.";
    case "practice_weak":
      return "Refuerza las palabras que más cuestan.";
    case "practice_now":
      return "Practica lo que ya viste en Aprender.";
    case "review_lesson":
    default:
      return "Repaso breve de esta lección.";
  }
}

function getVocabSessionTag(context: PracticeSessionContext) {
  switch (context.sortKey) {
    case "practice_due":
      return "Pendientes";
    case "practice_weak":
      return "Débiles";
    case "practice_now":
      return "Lo visto";
    case "review_lesson":
    default:
      return "Repaso";
  }
}

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
  const [wrongItems, setWrongItems] = useState<VocabQuestion[]>([]);
  const [practiceResult, setPracticeResult] = useState<PracticeSessionResult | null>(null);

  const lesson = initialLesson;
  const lessonTitle = GENKI_LESSON_NAMES[lesson] ?? `Lección ${lesson}`;
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
    setWrongItems([]);
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
    if (isCorrect) setCorrect((v) => v + 1);
    else setWrongItems((arr) => [...arr, currentQuestion]);
    setProgress((previous) => {
      const next = recordVocabResult(previous, lesson, currentQuestion.source, isCorrect ? "correct" : "wrong");
      saveVocabProgress(USER_KEY, next);
      return next;
    });
  }

  function advance() {
    if (!currentQuestion) return;
    const isCorrect = selectedOption === currentQuestion.item.es;
    const nextCorrect = correct + (isCorrect ? 0 : 0); // already set
    if (currentQuestionIndex + 1 >= questions.length) {
      setPracticeResult({
        practiced: questions.length,
        correct: correct + (isCorrect ? 0 : 0),
        incorrect: wrongItems.length + (isCorrect ? 0 : 1),
      });
      setCurrentQuestionIndex(questions.length);
      setQuizPhase("question");
      setSelectedOption(null);
    } else {
      setCurrentQuestionIndex((v) => v + 1);
      setQuizPhase("question");
      setSelectedOption(null);
    }
  }

  function repeatWrong() {
    const wrong = wrongItems;
    setQuestions(shuffle(wrong));
    setCurrentQuestionIndex(0);
    setQuizPhase("question");
    setSelectedOption(null);
    setCorrect(0);
    setWrongItems([]);
    setPracticeResult(null);
  }

  const exit = () => router.push("/practicar");

  // Results screen
  if (practiceResult) {
    const total = practiceResult.practiced;
    const pctCorrect = total > 0 ? Math.round((practiceResult.correct / total) * 100) : 0;
    const ringColor = pctCorrect >= 70 ? "#34D399" : pctCorrect >= 40 ? "#4ECDC4" : "#E63946";
    const headline = pctCorrect >= 80 ? "¡Excelente!" : pctCorrect >= 50 ? "¡Buen trabajo!" : "A seguir practicando";
    const r = 72;
    const circ = 2 * Math.PI * r;
    return (
      <PracticeSessionLayout accent="teal">
        <div className="sesh-res">
          <div className="sesh-res-top">
            <div style={{ position: "relative", width: 184, height: 184 }}>
              <svg width="184" height="184" viewBox="0 0 184 184">
                <circle cx="92" cy="92" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
                <circle cx="92" cy="92" r={r} fill="none" stroke={ringColor} strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={circ} strokeDashoffset={circ - (circ * pctCorrect) / 100}
                  transform="rotate(-90 92 92)" style={{ filter: `drop-shadow(0 0 8px ${ringColor})` }} />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 46, fontWeight: 800, letterSpacing: -1, color: "#F4F4F8" }}>{pctCorrect}%</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(244,244,248,0.56)", letterSpacing: 0.5 }}>{practiceResult.correct} DE {total}</span>
              </div>
            </div>
            <div className="sesh-res-title">{headline}</div>
            <div className="sesh-res-stats">
              <div className="sesh-stat good"><span className="v">{practiceResult.correct}</span><span className="k">Correctas</span></div>
              <div className="sesh-stat bad"><span className="v">{practiceResult.incorrect}</span><span className="k">Para repasar</span></div>
            </div>
          </div>
          <div className="sesh-res-foot">
            {wrongItems.length > 0 && (
              <button className="sesh-btn sesh-btn-red" onClick={repeatWrong}>
                Repetir las {wrongItems.length} que fallé
              </button>
            )}
            <button className="sesh-btn sesh-btn-ghost" onClick={exit}>Terminar</button>
          </div>
        </div>
      </PracticeSessionLayout>
    );
  }

  if (lessonItems.length === 0) {
    return (
      <PracticeSessionLayout accent="teal">
        <PracticeSessionHeader typeLabel="Vocabulario" lesson={`L${lesson} · ${lessonTitle}`}
          progressCurrent={0} progressTotal={0} onExit={exit} />
      </PracticeSessionLayout>
    );
  }

  const isAnswerCorrect = selectedOption !== null && currentQuestion && selectedOption === currentQuestion.item.es;

  return (
    <PracticeSessionLayout accent="teal">
      <PracticeSessionHeader
        typeLabel="Vocabulario"
        lesson={`L${lesson} · ${lessonTitle}`}
        progressCurrent={currentQuestionIndex}
        progressTotal={questions.length}
        onExit={exit}
      />

      <div style={{ marginTop: 0, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {currentQuestion && (
          <>
            <div className="qzone">
              <div className="qbig word">{currentQuestion.item.display}</div>
              {currentQuestion.item.reading !== currentQuestion.item.display && (
                <div className="qread">{currentQuestion.item.reading}</div>
              )}
              <div className="qinstr">Elige el significado correcto</div>
            </div>

            <div className="sesh-answers">
              {currentQuestion.options.map((opt) => {
                let cls = "sesh-ans sesh-ans-ui";
                if (quizPhase === "feedback") {
                  cls += " locked";
                  if (opt === currentQuestion.item.es) cls += " correct";
                  else if (opt === selectedOption) cls += " wrong";
                  else cls += " muted";
                }
                return (
                  <button key={opt} className={cls} onClick={() => handleOption(opt)}>
                    {opt}
                  </button>
                );
              })}
            </div>

            {quizPhase === "feedback" && (
              <div className="sesh-feedback">
                {isAnswerCorrect ? (
                  <div className="sesh-fbline ok">
                    <span className="sesh-fbbadge ok">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M4 12.5l5 5L20 6.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    ¡Correcto!
                  </div>
                ) : (
                  <div className="sesh-fbline no">
                    <span className="sesh-fbbadge no">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    </span>
                    Casi —&nbsp;<span className="sub">la respuesta es «{currentQuestion.item.es}»</span>
                  </div>
                )}
                <button className={`sesh-btn ${isAnswerCorrect ? "sesh-btn-green" : "sesh-btn-red"}`} onClick={advance}>
                  {currentQuestionIndex + 1 < questions.length ? "Continuar" : "Ver resultados"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </PracticeSessionLayout>
  );
}
