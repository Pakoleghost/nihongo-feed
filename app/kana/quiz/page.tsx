"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { KANA_ITEMS } from "@/lib/kana-data";
import type { KanaItem } from "@/lib/kana-data";
import {
  loadKanaProgress,
  saveKanaProgress,
  applyKanaRating,
} from "@/lib/kana-progress";
import type { KanaProgressMap } from "@/lib/kana-progress";
import { buildKanaSmartSessionItems } from "@/lib/kana-smart";

type QuizQuestion = {
  item: KanaItem;
  isHard: boolean;
  options: string[];
};

type QuestionResult = {
  item: KanaItem;
  correct: boolean;
  userAnswer: string;
};

type Phase = "question" | "feedback";
type KanaAnim = "idle" | "bounce" | "shake";

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

function getIsHard(item: KanaItem, progress: KanaProgressMap, difficulty: string): boolean {
  if (difficulty === "facil") return false;
  if (difficulty === "dificil") return true;
  const entry = progress[item.id];
  if (!entry || entry.timesSeen === 0) return false;
  return entry.timesCorrect > entry.timesWrong;
}

function isCorrectAnswer(item: KanaItem, answer: string): boolean {
  const a = answer.trim().toLowerCase();
  return a === item.romaji || (item.alternatives?.includes(a) ?? false);
}

function buildQuiz(
  mode: string,
  sets: string[],
  difficulty: string,
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

  return items.map((item) => ({
    item,
    isHard: getIsHard(item, progress, difficulty),
    options: getOptions(item, pool.length > 0 ? pool : KANA_ITEMS),
  }));
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
  const difficulty = searchParams.get("difficulty") ?? "facil";
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const prog = loadKanaProgress("anon");
    setProgressMap(prog);
    const quiz = buildQuiz(mode, sets, difficulty, count, itemIds, prog);
    setQuestions(quiz);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentQ = questions[currentIndex];
  const progressPct = questions.length > 0 ? (currentIndex / questions.length) * 100 : 0;

  useEffect(() => {
    if (!currentQ?.isHard || phase !== "question") return;

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [currentQ?.item.id, currentQ?.isHard, phase]);

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
            difficulty,
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
    [results, currentIndex, questions.length, mode, difficulty, router]
  );

  function handleOptionSelect(option: string) {
    if (phase !== "question" || !currentQ) return;
    setSelectedOption(option);
    setPhase("feedback");

    const correct = isCorrectAnswer(currentQ.item, option);
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

  function handleExit() {
    saveKanaProgress("anon", progressMap);
    if (confirm("Puedes salir ahora. Guardaremos lo que ya practicaste.")) {
      router.push("/kana");
    }
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

  const feedbackIsHardCorrect = phase === "feedback" && isCorrectAnswer(currentQ.item, textAnswer);
  const quizContext = formatQuizContext(contextPrimary, contextSecondary, sets);
  const questionModeLabel = currentQ.isHard ? "Escribe en romaji" : "Elige la lectura";
  const feedbackIsCorrect = currentQ.isHard ? feedbackIsHardCorrect : selectedOption === currentQ.item.romaji;
  const feedbackLabel = feedbackIsCorrect ? "Correcto" : "No era esa";
  const feedbackBg = feedbackIsCorrect ? "rgba(78,205,196,0.14)" : "rgba(230,57,70,0.12)";
  const feedbackColor = feedbackIsCorrect ? "#178A83" : "#C53340";
  const sharedCardStyle = {
    background: "#FFFFFF",
    borderRadius: "28px",
    boxShadow: "0 10px 28px rgba(26,26,46,0.08)",
  } as const;

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
                  fontSize: "112px",
                  fontWeight: 700,
                  color: "#1A1A2E",
                  lineHeight: 1,
                  fontFamily: "var(--font-noto-sans-jp), sans-serif",
                  userSelect: "none",
                  textAlign: "center",
                }}
              >
                {currentQ.item.kana}
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
            {currentQ.isHard ? "Escribe su lectura en romaji." : "Toca la lectura correcta."}
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
      {currentQ.isHard ? (
        /* Hard mode — text input */
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
                  phase === "feedback" ? (feedbackIsHardCorrect ? "#4ECDC4" : "#E63946") : "transparent"
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
              ? feedbackIsHardCorrect
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
                  ? feedbackIsHardCorrect
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
        /* Easy mode — 2×2 grid */
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
              const isCorrectOpt = option === currentQ.item.romaji;
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
                    fontSize: "22px",
                    fontWeight: 700,
                    boxShadow: phase === "feedback" ? "none" : "0 4px 14px rgba(26,26,46,0.06)",
                    transition: "background 0.2s, color 0.2s, border-color 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    textTransform: "lowercase",
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
                : `Correcta: ${currentQ.item.romaji}`
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
