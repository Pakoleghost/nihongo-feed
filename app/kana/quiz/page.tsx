"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { KANA_ITEMS } from "@/lib/kana-data";
import type { KanaItem } from "@/lib/kana-data";
import type { KanaQuestionType, KanaSessionMode } from "@/lib/kana-data";
import KanaTraceCanvas from "@/components/KanaTraceCanvas";
import {
  loadKanaProgress,
  saveKanaProgress,
  applyKanaRating,
} from "@/lib/kana-progress";
import type { KanaProgressMap } from "@/lib/kana-progress";
import { buildKanaSmartSessionItems } from "@/lib/kana-smart";
import { hasKanaTraceData } from "@/lib/kana-trace";

type QuizQuestion = {
  item: KanaItem;
  taskType: KanaQuestionType;
  options: string[];
};

type QuestionResult = {
  item: KanaItem;
  correct: boolean;
  userAnswer: string;
};

type Phase = "question" | "feedback";
type KanaAnim = "idle" | "bounce" | "shake";
const MIXED_TASK_TYPES: KanaQuestionType[] = [
  "kana_to_romaji_choice",
  "romaji_to_kana_choice",
  "kana_to_romaji_input",
];

function formatQuizContext(primary: string, secondary: string, sets: string[]) {
  if (primary || secondary) {
    return `${primary}${secondary ? ` · ${secondary}` : ""}`.trim();
  }

  const uniqueSets = [...new Set(sets.filter(Boolean))];
  if (uniqueSets.length === 1) {
    if (uniqueSets[0] === "hiragana") return "Hiragana";
    if (uniqueSets[0] === "katakana") return "Katakana";
    if (uniqueSets[0] === "dakuon") return "Dakuten";
    if (uniqueSets[0] === "handakuon") return "Handakuten";
    if (uniqueSets[0] === "yoon") return "Combinaciones";
  }

  if (uniqueSets.length === 2 && uniqueSets.includes("hiragana") && uniqueSets.includes("katakana")) {
    return "Hiragana y Katakana";
  }

  return "Kana";
}

function buildPool(mode: string, sets: string[]): KanaItem[] {
  if (mode === "smart" || mode === "repeat") return KANA_ITEMS;
  const pool: KanaItem[] = [];
  for (const key of sets) {
    if (key === "hiragana") pool.push(...KANA_ITEMS.filter((i) => i.script === "hiragana" && i.set === "basic"));
    else if (key === "katakana") pool.push(...KANA_ITEMS.filter((i) => i.script === "katakana" && i.set === "basic"));
    else if (key === "dakuon") pool.push(...KANA_ITEMS.filter((i) => i.set === "dakuten"));
    else if (key === "handakuon") pool.push(...KANA_ITEMS.filter((i) => i.set === "handakuten"));
    else if (key === "yoon") pool.push(...KANA_ITEMS.filter((i) => i.set === "yoon"));
  }
  return pool;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getOptions(correctItem: KanaItem, pool: KanaItem[]): string[] {
  const correct = correctItem.romaji;
  const uniqueWrong = [...new Set(pool.map((i) => i.romaji).filter((r) => r !== correct))];
  const finalPool =
    uniqueWrong.length < 3
      ? [...new Set(KANA_ITEMS.map((i) => i.romaji).filter((r) => r !== correct))]
      : uniqueWrong;
  const wrong3 = shuffle(finalPool).slice(0, 3);
  return shuffle([correct, ...wrong3]);
}

function getKanaOptions(correctItem: KanaItem, pool: KanaItem[]): string[] {
  const correct = correctItem.kana;
  const uniqueWrong = [...new Set(pool.map((i) => i.kana).filter((kana) => kana !== correct))];
  const finalPool =
    uniqueWrong.length < 3
      ? [...new Set(KANA_ITEMS.map((i) => i.kana).filter((kana) => kana !== correct))]
      : uniqueWrong;
  const wrong3 = shuffle(finalPool).slice(0, 3);
  return shuffle([correct, ...wrong3]);
}

function buildMixedTaskSequence(length: number): KanaQuestionType[] {
  const tasks: KanaQuestionType[] = [];
  let previous: KanaQuestionType | null = null;

  while (tasks.length < length) {
    const cycle = shuffle(MIXED_TASK_TYPES);
    if (previous && cycle[0] === previous && cycle.length > 1) {
      [cycle[0], cycle[1]] = [cycle[1], cycle[0]];
    }
    for (const taskType of cycle) {
      if (tasks.length >= length) break;
      tasks.push(taskType);
      previous = taskType;
    }
  }

  return tasks;
}

function getLegacyTaskMode(rawDifficulty: string | null): KanaSessionMode {
  if (!rawDifficulty) return "mixed";
  return "mixed";
}

function getQuestionTaskLabel(taskType: KanaQuestionType) {
  if (taskType === "kana_to_romaji_choice") return "Kana -> romaji";
  if (taskType === "romaji_to_kana_choice") return "Romaji -> kana";
  if (taskType === "kana_to_romaji_input") return "Escribir romaji";
  return "Trazar";
}

function getQuestionInstruction(taskType: KanaQuestionType) {
  if (taskType === "kana_to_romaji_choice") return "Toca el romaji correcto.";
  if (taskType === "romaji_to_kana_choice") return "Toca el kana correcto.";
  if (taskType === "kana_to_romaji_input") return "Escribe su lectura en romaji.";
  return "Traza el kana siguiendo la guía.";
}

function getQuestionPromptValue(question: QuizQuestion) {
  if (question.taskType === "romaji_to_kana_choice" || question.taskType === "romaji_to_kana_trace") {
    return question.item.romaji;
  }
  return question.item.kana;
}

function getQuestionPromptKind(taskType: KanaQuestionType) {
  if (taskType === "romaji_to_kana_choice" || taskType === "romaji_to_kana_trace") return "romaji";
  return "kana";
}

function isInputTask(taskType: KanaQuestionType) {
  return taskType === "kana_to_romaji_input";
}

function getCorrectChoiceValue(question: QuizQuestion) {
  return question.taskType === "romaji_to_kana_choice" ? question.item.kana : question.item.romaji;
}

function isCorrectChoiceAnswer(question: QuizQuestion, answer: string) {
  if (question.taskType === "romaji_to_kana_choice") return answer === question.item.kana;
  return isCorrectAnswer(question.item, answer);
}

function isCorrectAnswer(item: KanaItem, answer: string): boolean {
  const a = answer.trim().toLowerCase();
  return a === item.romaji || (item.alternatives?.includes(a) ?? false);
}

function buildQuiz(
  mode: string,
  sets: string[],
  taskMode: KanaSessionMode,
  count: number,
  itemIds: string[],
  progress: KanaProgressMap
): QuizQuestion[] {
  let items: KanaItem[];
  const smartPool = mode === "smart" && itemIds.length > 0
    ? KANA_ITEMS.filter((item) => itemIds.includes(item.id))
    : null;
  const pool = smartPool && smartPool.length > 0 ? smartPool : buildPool(mode, sets);

  if (mode === "repeat") {
    const idSet = new Set(itemIds);
    items = KANA_ITEMS.filter((i) => idSet.has(i.id));
  } else if (mode === "smart") {
    items = buildKanaSmartSessionItems(pool, progress, count);
  } else {
    items = shuffle(pool).slice(0, Math.min(count, pool.length));
  }

  if (taskMode === "trace") {
    const traceItems = items.filter((item) => hasKanaTraceData(item.kana));
    return traceItems.map((item) => ({
      item,
      taskType: "romaji_to_kana_trace",
      options: [],
    }));
  }

  const effectivePool = pool.length > 0 ? pool : KANA_ITEMS;
  const taskSequence = buildMixedTaskSequence(items.length);

  return items.map((item, index) => {
    const taskType = taskSequence[index] ?? "kana_to_romaji_choice";
    const options =
      taskType === "romaji_to_kana_choice"
        ? getKanaOptions(item, effectivePool)
        : taskType === "kana_to_romaji_choice"
          ? getOptions(item, effectivePool)
          : [];

    return {
      item,
      taskType,
      options,
    };
  });
}

// Framer Motion variants — use `Variants` type so TypeScript accepts easing strings
const kanaEnter: Variants = {
  initial: { x: 60, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.25, ease: "easeOut" } },
  exit: { x: -40, opacity: 0, transition: { duration: 0.15, ease: "easeIn" } },
};

const bounceVariants: Variants = {
  idle: { y: 0 },
  bounce: {
    y: [0, -8, 0],
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

const shakeVariants: Variants = {
  idle: { x: 0 },
  shake: {
    x: [0, -10, 10, -6, 6, 0],
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

function QuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = searchParams.get("mode") ?? "smart";
  const sets = (searchParams.get("sets") ?? "hiragana").split(",");
  const taskMode = ((searchParams.get("taskMode") as KanaSessionMode | null)
    ?? getLegacyTaskMode(searchParams.get("difficulty")));
  const count = parseInt(searchParams.get("count") ?? "20", 10);
  const itemIds = (searchParams.get("items") ?? "").split(",").filter(Boolean);
  const contextPrimary = searchParams.get("contextPrimary") ?? "";
  const contextSecondary = searchParams.get("contextSecondary") ?? "";

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [kanaKey, setKanaKey] = useState(0); // trigger re-mount for entrance animation
  const [phase, setPhase] = useState<Phase>("question");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [scaledOption, setScaledOption] = useState<string | null>(null); // for correct-button scale
  const [kanaAnim, setKanaAnim] = useState<KanaAnim>("idle");
  const [textAnswer, setTextAnswer] = useState("");
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [progressMap, setProgressMap] = useState<KanaProgressMap>({});
  const [isReady, setIsReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const prog = loadKanaProgress("anon");
    setProgressMap(prog);
    const quiz = buildQuiz(mode, sets, taskMode, count, itemIds, prog);
    setQuestions(quiz);
    setIsReady(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (taskMode !== "trace") return;

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousHtmlOverscroll = html.style.overscrollBehavior;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;

    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      html.style.overscrollBehavior = previousHtmlOverscroll;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [taskMode]);

  const currentQ = questions[currentIndex];
  const progressPct = questions.length > 0 ? (currentIndex / questions.length) * 100 : 0;

  useEffect(() => {
    if (!currentQ || !isInputTask(currentQ.taskType) || phase !== "question") return;

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [currentQ?.item.id, currentQ?.taskType, phase]);

  const advance = useCallback(
    (result: QuestionResult, updatedProgress: KanaProgressMap) => {
      const newResults = [...results, result];
      setResults(newResults);

      if (currentIndex + 1 >= questions.length) {
        const missed = newResults
          .filter((r) => !r.correct)
          .map((r) => ({ kana: r.item.kana, romaji: r.item.romaji, id: r.item.id }));
        sessionStorage.setItem(
          "kana-quiz-results",
          JSON.stringify({
            total: newResults.length,
            correct: newResults.filter((r) => r.correct).length,
            missed,
            mode,
            taskMode,
          })
        );
        router.push("/kana/resultados");
      } else {
        setCurrentIndex((i) => i + 1);
        setKanaKey((k) => k + 1);
        setPhase("question");
        setSelectedOption(null);
        setScaledOption(null);
        setKanaAnim("idle");
        setTextAnswer("");
      }
    },
    [results, currentIndex, questions.length, mode, taskMode, router]
  );

  function handleOptionSelect(option: string) {
    if (phase !== "question" || !currentQ) return;
    setSelectedOption(option);
    setPhase("feedback");

    const correct = isCorrectChoiceAnswer(currentQ, option);
    const updated = applyKanaRating(progressMap, currentQ.item, correct ? "correct" : "wrong");
    setProgressMap(updated);
    saveKanaProgress("anon", updated);

    if (correct) {
      setScaledOption(option);
      setKanaAnim("bounce");
      setTimeout(() => advance({ item: currentQ.item, correct, userAnswer: option }, updated), 800);
    } else {
      setKanaAnim("shake");
      setTimeout(() => advance({ item: currentQ.item, correct, userAnswer: option }, updated), 1200);
    }
  }

  function handleConfirm() {
    if (phase !== "question" || !currentQ || !textAnswer.trim()) return;
    setPhase("feedback");

    const correct = isCorrectAnswer(currentQ.item, textAnswer);
    const updated = applyKanaRating(progressMap, currentQ.item, correct ? "correct" : "wrong");
    setProgressMap(updated);
    saveKanaProgress("anon", updated);

    if (correct) {
      setKanaAnim("bounce");
    } else {
      setKanaAnim("shake");
    }

    setTimeout(
      () => advance({ item: currentQ.item, correct, userAnswer: textAnswer.trim() }, updated),
      correct ? 800 : 1200
    );
  }

  function handleTraceComplete(result: { retries: number; strokes: number }) {
    if (!currentQ || phase !== "question") return;
    setPhase("feedback");

    const rating = result.retries > 0 ? "almost" : "correct";
    const updated = applyKanaRating(progressMap, currentQ.item, rating);
    setProgressMap(updated);
    saveKanaProgress("anon", updated);
    setKanaAnim("bounce");

    setTimeout(
      () => advance({ item: currentQ.item, correct: true, userAnswer: currentQ.item.kana }, updated),
      700,
    );
  }

  function handleExit() {
    saveKanaProgress("anon", progressMap);
    if (confirm("Puedes salir ahora. Guardaremos lo que ya practicaste.")) {
      router.push("/kana");
    }
  }

  if (!isReady && questions.length === 0) {
    return (
      <div
        style={{
          background: "#FFF8E7",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "#53596B", fontSize: "16px" }}>Preparando sesión…</p>
      </div>
    );
  }

  if (taskMode === "trace" && questions.length === 0) {
    return (
      <div
        style={{
          background: "#FFF8E7",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          padding: "52px 20px 32px",
        }}
      >
        <button
          onClick={() => router.push("/kana/configurar")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            alignSelf: "flex-start",
            marginBottom: "24px",
          }}
          aria-label="Volver"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5M12 5l-7 7 7 7"
              stroke="#1A1A2E"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "28px",
            padding: "24px 22px",
            boxShadow: "0 10px 28px rgba(26,26,46,0.08)",
            display: "grid",
            gap: "14px",
          }}
        >
          <div
            style={{
              borderRadius: "999px",
              background: "rgba(26,26,46,0.06)",
              color: "#53596B",
              fontSize: "12px",
              fontWeight: 800,
              padding: "8px 12px",
              justifySelf: "flex-start",
            }}
          >
            Trazar
          </div>
          <div style={{ fontSize: "32px", lineHeight: 1.05, fontWeight: 800, color: "#1A1A2E" }}>
            No hay trazos listos
          </div>
          <p style={{ margin: 0, fontSize: "16px", lineHeight: 1.45, color: "#5E6472" }}>
            Esta selección no tiene suficientes kana con guía de trazos. Prueba otra selección o usa Mixto.
          </p>
          <div style={{ display: "grid", gap: "10px", marginTop: "8px" }}>
            <button
              onClick={() => router.push(`/kana/configurar?mode=${mode}&taskMode=mixed`)}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                background: "#1A1A2E",
                color: "#FFFFFF",
                fontSize: "16px",
                fontWeight: 800,
              }}
            >
              Usar Mixto por ahora
            </button>
            <button
              onClick={() => router.push("/kana")}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                background: "transparent",
                color: "#1A1A2E",
                fontSize: "16px",
                fontWeight: 700,
              }}
            >
              Volver a Kana
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div
        style={{
          background: "#FFF8E7",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "#53596B", fontSize: "16px" }}>Preparando quiz…</p>
      </div>
    );
  }

  if (!currentQ) return null;

  const feedbackIsInputCorrect = phase === "feedback" && isCorrectAnswer(currentQ.item, textAnswer);
  const quizContext = formatQuizContext(contextPrimary, contextSecondary, sets);
  const questionModeLabel = getQuestionTaskLabel(currentQ.taskType);
  const questionInstruction = getQuestionInstruction(currentQ.taskType);
  const promptKind = getQuestionPromptKind(currentQ.taskType);
  const promptValue = getQuestionPromptValue(currentQ);
  const correctChoiceValue = getCorrectChoiceValue(currentQ);
  const feedbackIsCorrect = isInputTask(currentQ.taskType)
    ? feedbackIsInputCorrect
    : selectedOption === correctChoiceValue;
  const feedbackLabel = feedbackIsCorrect ? "Correcto" : "No era esa";
  const feedbackBg = feedbackIsCorrect ? "rgba(78,205,196,0.14)" : "rgba(230,57,70,0.12)";
  const feedbackColor = feedbackIsCorrect ? "#178A83" : "#C53340";
  const sharedCardStyle = {
    background: "#FFFFFF",
    borderRadius: "28px",
    boxShadow: "0 10px 28px rgba(26,26,46,0.08)",
  } as const;

  if (taskMode === "trace") {
    return (
      <div
        style={{
          background: "#FFF8E7",
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "44px 20px 0",
            display: "grid",
            gap: "12px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <button
              onClick={handleExit}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                flexShrink: 0,
              }}
              aria-label="Salir"
              title="Salir y guardar progreso"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M19 12H5M12 5l-7 7 7 7"
                  stroke="#1A1A2E"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div style={{ flex: 1, display: "grid", gap: "8px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#53596B",
                  }}
                >
                  Trazando
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#7A7F8D",
                    whiteSpace: "nowrap",
                  }}
                >
                  {currentIndex + 1} / {questions.length}
                </div>
              </div>
              <div
                style={{
                  height: "6px",
                  background: "#E5E7EB",
                  borderRadius: "999px",
                  overflow: "hidden",
                }}
              >
                <motion.div
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  style={{
                    height: "100%",
                    background: "#4ECDC4",
                    borderRadius: "999px",
                  }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                borderRadius: "999px",
                background: "#FFFFFF",
                color: "#53596B",
                fontSize: "12px",
                fontWeight: 700,
                padding: "8px 12px",
                boxShadow: "0 2px 10px rgba(26,26,46,0.08)",
              }}
            >
              {quizContext}
            </div>
            <div
              style={{
                borderRadius: "999px",
                background: "rgba(78,205,196,0.12)",
                color: "#178A83",
                fontSize: "12px",
                fontWeight: 700,
                padding: "8px 12px",
              }}
            >
              Trazar
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flex: 1,
            minHeight: 0,
            padding: "12px 20px 20px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              ...sharedCardStyle,
              width: "100%",
              maxWidth: "420px",
              height: "100%",
              maxHeight: "100%",
              padding: "18px 18px 16px",
              display: "grid",
              gridTemplateRows: "auto auto 1fr auto",
              gap: "12px",
            }}
          >
            <div style={{ display: "grid", gap: "8px", textAlign: "center" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#8A8F9B",
                }}
              >
                {questionModeLabel}
              </div>
              <div
                style={{
                  fontSize: "54px",
                  fontWeight: 800,
                  color: "#1A1A2E",
                  lineHeight: 1,
                }}
              >
                {currentQ.item.romaji}
              </div>
              <p
                style={{
                  fontSize: "14px",
                  color: "#6E737F",
                  margin: 0,
                  lineHeight: 1.35,
                }}
              >
                {questionInstruction}
              </p>
            </div>

            <KanaTraceCanvas
              key={`${currentQ.item.id}-${currentIndex}`}
              kana={currentQ.item.kana}
              disabled={phase === "feedback"}
              onKanaComplete={handleTraceComplete}
            />
          </div>
        </div>
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
      }}
    >
      {/* Top bar */}
      <div
        style={{
          padding: "52px 20px 0",
          display: "grid",
          gap: "14px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <button
            onClick={handleExit}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              flexShrink: 0,
            }}
            aria-label="Salir"
            title="Salir y guardar progreso"
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
          <div style={{ flex: 1, display: "grid", gap: "8px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#53596B",
                }}
              >
                Practicando
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#7A7F8D",
                  whiteSpace: "nowrap",
                }}
              >
                {currentIndex + 1} / {questions.length}
              </div>
            </div>
            <div
              style={{
                height: "6px",
                background: "#E5E7EB",
                borderRadius: "999px",
                overflow: "hidden",
              }}
            >
              <motion.div
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                style={{
                  height: "100%",
                  background: "#4ECDC4",
                  borderRadius: "999px",
                }}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              borderRadius: "999px",
              background: "#FFFFFF",
              color: "#53596B",
              fontSize: "12px",
              fontWeight: 700,
              padding: "8px 12px",
              boxShadow: "0 2px 10px rgba(26,26,46,0.08)",
            }}
          >
            {quizContext}
          </div>
          <div
            style={{
              borderRadius: "999px",
              background: "rgba(230,57,70,0.10)",
              color: "#C53340",
              fontSize: "12px",
              fontWeight: 700,
              padding: "8px 12px",
            }}
          >
            {questionModeLabel}
          </div>
        </div>
      </div>

      {/* Kana character */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          padding: "18px 20px 16px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            ...sharedCardStyle,
            width: "100%",
            maxWidth: "420px",
            padding: "26px 20px 24px",
            display: "grid",
            justifyItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#8A8F9B",
            }}
          >
            {questionModeLabel}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={kanaKey}
              variants={kanaEnter}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
            >
              <motion.div
                variants={kanaAnim === "bounce" ? bounceVariants : shakeVariants}
                animate={kanaAnim}
                style={{
                  fontSize: promptKind === "kana" ? "112px" : "64px",
                  fontWeight: 700,
                  color: "#1A1A2E",
                  lineHeight: 1,
                  fontFamily: promptKind === "kana" ? "var(--font-noto-sans-jp), sans-serif" : "inherit",
                  userSelect: "none",
                  textAlign: "center",
                }}
              >
                {promptValue}
              </motion.div>
            </motion.div>
          </AnimatePresence>

          <p
            style={{
              fontSize: "15px",
              color: "#6E737F",
              margin: 0,
              textAlign: "center",
            }}
          >
            {questionInstruction}
          </p>
        </div>

        {phase === "feedback" && (
          <div
            style={{
              marginTop: "14px",
              borderRadius: "999px",
              background: feedbackBg,
              color: feedbackColor,
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: 800,
              letterSpacing: "0.02em",
            }}
          >
            {feedbackLabel}
          </div>
        )}
      </div>

      {/* Answer area */}
      {isInputTask(currentQ.taskType) ? (
        /* Kana -> romaji input */
        <div style={{ padding: "0 20px 40px" }}>
          <div
            style={{
              ...sharedCardStyle,
              padding: "20px 18px 18px",
              display: "grid",
              gap: "14px",
            }}
          >
            <div
              style={{
                borderRadius: "20px",
                background: "#F7F3ED",
                border: `2px solid ${
                  phase === "feedback" ? (feedbackIsInputCorrect ? "#4ECDC4" : "#E63946") : "transparent"
                }`,
                padding: "6px 16px",
                transition: "border-color 0.2s",
              }}
            >
            <input
              ref={inputRef}
              type="text"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); }}
              disabled={phase === "feedback"}
              placeholder="Escribe el romaji"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "22px",
                fontWeight: 600,
                color: "#1A1A2E",
                textAlign: "center",
                padding: "14px 0",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div
            style={{
              minHeight: "24px",
              textAlign: "center",
              fontSize: "14px",
              fontWeight: 700,
              color: phase === "feedback" ? feedbackColor : "#8A8F9B",
            }}
          >
            {phase === "feedback"
              ? feedbackIsInputCorrect
                ? "Respuesta correcta"
                : `Respuesta: ${currentQ.item.romaji}`
              : "Pulsa Enter o toca comprobar"}
          </div>
          <button
            onClick={handleConfirm}
            disabled={phase === "feedback" || !textAnswer.trim()}
            style={{
              width: "100%",
              padding: "18px",
              borderRadius: "999px",
              border: "none",
              cursor: phase === "feedback" || !textAnswer.trim() ? "not-allowed" : "pointer",
              background:
                phase === "feedback"
                  ? feedbackIsInputCorrect
                    ? "#4ECDC4"
                    : "#E63946"
                  : "#1A1A2E",
              color: "#FFFFFF",
              fontSize: "18px",
              fontWeight: 700,
              transition: "background 0.2s",
            }}
          >
            {phase === "feedback" ? feedbackLabel : "Comprobar"}
          </button>
          </div>
        </div>
      ) : (
        /* Choice tasks */
        <div
          style={{
            padding: "0 20px 40px",
          }}
        >
          <div
            style={{
              ...sharedCardStyle,
              padding: "16px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            {currentQ.options.map((option) => {
              const isSelected = selectedOption === option;
              const isCorrectOpt = option === correctChoiceValue;
              let bg = "#FFFFFF";
              let color = "#1A1A2E";
              let borderColor = "rgba(26,26,46,0.08)";

              if (phase === "feedback") {
                if (isCorrectOpt) {
                  bg = "#4ECDC4";
                  color = "#FFFFFF";
                  borderColor = "#4ECDC4";
                } else if (isSelected) {
                  bg = "#E63946";
                  color = "#FFFFFF";
                  borderColor = "#E63946";
                }
              }

              return (
                <motion.button
                  key={option}
                  onClick={() => handleOptionSelect(option)}
                  disabled={phase === "feedback"}
                  animate={
                    scaledOption === option
                      ? { scale: [1, 1.08, 1], transition: { duration: 0.2 } }
                      : { scale: 1 }
                  }
                  style={{
                    minHeight: "78px",
                    padding: "18px 12px",
                    borderRadius: "20px",
                    border: `1px solid ${borderColor}`,
                    cursor: phase === "feedback" ? "default" : "pointer",
                    background: bg,
                    color,
                    fontSize: currentQ.taskType === "romaji_to_kana_choice" ? "34px" : "22px",
                    fontWeight: 700,
                    boxShadow: phase === "feedback" ? "none" : "0 4px 14px rgba(26,26,46,0.06)",
                    transition: "background 0.2s, color 0.2s, border-color 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    textTransform: currentQ.taskType === "romaji_to_kana_choice" ? "none" : "lowercase",
                    fontFamily:
                      currentQ.taskType === "romaji_to_kana_choice"
                        ? "var(--font-noto-sans-jp), sans-serif"
                        : "inherit",
                  }}
                >
                  {option}
                  {phase === "feedback" && isCorrectOpt && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {phase === "feedback" && isSelected && !isCorrectOpt && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  )}
                </motion.button>
              );
            })}
          </div>
          <div
            style={{
              minHeight: "24px",
              textAlign: "center",
              fontSize: "14px",
              fontWeight: 700,
              color: phase === "feedback" ? feedbackColor : "#8A8F9B",
              marginTop: "12px",
            }}
          >
            {phase === "feedback"
              ? feedbackIsCorrect
                ? "Respuesta correcta"
                : `Correcta: ${correctChoiceValue}`
              : "Toca una opción para responder"}
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense>
      <QuizContent />
    </Suspense>
  );
}
