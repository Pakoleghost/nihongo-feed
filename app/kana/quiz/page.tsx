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
  buildKanaSessionItems,
} from "@/lib/kana-progress";
import type { KanaProgressMap } from "@/lib/kana-progress";

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
    items = buildKanaSessionItems(pool, progress, count);
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

  const advance = useCallback(
    (result: QuestionResult, updatedProgress: KanaProgressMap) => {
      const newResults = [...results, result];
      setResults(newResults);

      if (currentIndex + 1 >= questions.length) {
        saveKanaProgress("anon", updatedProgress);
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
        setTimeout(() => inputRef.current?.focus(), 50);
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
    if (confirm("¿Salir del quiz? Tu progreso actual se perderá.")) {
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
          gap: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
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
          <div
            style={{
              flex: 1,
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

        {(contextPrimary || contextSecondary) && (
          <div
            style={{
              alignSelf: "center",
              borderRadius: "999px",
              background: "#FFFFFF",
              color: "#53596B",
              fontSize: "12px",
              fontWeight: 700,
              padding: "8px 12px",
              boxShadow: "0 2px 10px rgba(26,26,46,0.08)",
            }}
          >
            {contextPrimary}{contextSecondary ? ` · ${contextSecondary}` : ""}
          </div>
        )}
      </div>

      {/* Kana character */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          padding: "32px 20px 24px",
          overflow: "hidden",
        }}
      >
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
                fontSize: "104px",
                fontWeight: 700,
                color: "#1A1A2E",
                lineHeight: 1,
                fontFamily: "var(--font-noto-sans-jp), sans-serif",
                marginBottom: "16px",
                userSelect: "none",
              }}
            >
              {currentQ.item.kana}
            </motion.div>
            <p style={{ fontSize: "15px", color: "#9CA3AF", margin: 0 }}>¿Cómo se lee?</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Answer area */}
      {currentQ.isHard ? (
        /* Hard mode — text input */
        <div style={{ padding: "0 24px 48px" }}>
          <div
            style={{
              borderBottom: `2px solid ${
                phase === "feedback" ? (feedbackIsHardCorrect ? "#4ECDC4" : "#E63946") : "#D1D5DB"
              }`,
              marginBottom: "8px",
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
              placeholder="escribe en romaji"
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
                fontSize: "20px",
                fontWeight: 600,
                color: "#1A1A2E",
                textAlign: "center",
                padding: "12px 0",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>
          {phase === "feedback" && !feedbackIsHardCorrect && (
            <p
              style={{
                textAlign: "center",
                color: "#4ECDC4",
                fontSize: "16px",
                fontWeight: 700,
                margin: "8px 0 16px",
              }}
            >
              Respuesta: {currentQ.item.romaji}
            </p>
          )}
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
              marginTop: "8px",
            }}
          >
            Confirmar
          </button>
        </div>
      ) : (
        /* Easy mode — 2×2 grid */
        <div
          style={{
            padding: "0 20px 48px",
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

            if (phase === "feedback") {
              if (isCorrectOpt) { bg = "#4ECDC4"; color = "#FFFFFF"; }
              else if (isSelected) { bg = "#E63946"; color = "#FFFFFF"; }
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
                  padding: "20px 12px",
                  borderRadius: "18px",
                  border: "none",
                  cursor: phase === "feedback" ? "default" : "pointer",
                  background: bg,
                  color,
                  fontSize: "20px",
                  fontWeight: 700,
                  boxShadow: "0 4px 16px rgba(26,26,46,0.08)",
                  transition: "background 0.2s, color 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
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
