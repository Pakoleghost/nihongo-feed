"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { KANA_ITEMS } from "@/lib/kana-data";
import type { KanaItem } from "@/lib/kana-data";
import { setLastActivity } from "@/lib/streak";

const SPRINT_POOL = KANA_ITEMS.filter(
  (i) => i.set === "basic" && (i.script === "hiragana" || i.script === "katakana")
);
const DURATION = 60;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function nextQuestion(pool: KanaItem[]): { item: KanaItem; options: string[] } {
  const item = pool[Math.floor(Math.random() * pool.length)];
  const correct = item.romaji;
  const others = [...new Set(pool.map((i) => i.romaji).filter((r) => r !== correct))];
  const wrong3 = shuffle(others).slice(0, 3);
  return { item, options: shuffle([correct, ...wrong3]) };
}

type Phase = "question" | "feedback";

export default function SprintPage() {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [correctCount, setCorrectCount] = useState(0);
  const [current, setCurrent] = useState(() => nextQuestion(SPRINT_POOL));
  const [kanaKey, setKanaKey] = useState(0); // used to re-mount kana for animation
  const [phase, setPhase] = useState<Phase>("question");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    setLastActivity("Kana Sprint", "/practicar/sprint");

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (timeLeft === 0 && !doneRef.current) {
      doneRef.current = true;
      sessionStorage.setItem("sprint-score", String(correctCount));
      router.push("/practicar/sprint/resultados");
    }
  }, [timeLeft, correctCount, router]);

  const advance = useCallback(
    (isCorrect: boolean) => {
      const newCount = isCorrect ? correctCount + 1 : correctCount;
      setCorrectCount(newCount);
      // 0ms on correct, short delay on wrong to show red feedback
      const delay = isCorrect ? 0 : 600;
      setTimeout(() => {
        setCurrent(nextQuestion(SPRINT_POOL));
        setKanaKey((k) => k + 1);
        setPhase("question");
        setSelectedOption(null);
      }, delay);
    },
    [correctCount]
  );

  function handleOption(option: string) {
    if (phase !== "question" || timeLeft === 0) return;
    setSelectedOption(option);
    setPhase("feedback");
    advance(option === current.item.romaji);
  }

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timerLabel = `${mins}:${secs.toString().padStart(2, "0")}`;
  // Timer turns red in last 10 seconds
  const timerColor = timeLeft <= 10 ? "#E63946" : "#4ECDC4";

  return (
    <div
      style={{
        background: "#1A1A2E",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "52px 20px 16px",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => router.push("/practicar")}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.12)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          aria-label="Salir"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "40px",
              fontWeight: 800,
              color: timerColor,
              margin: 0,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
              transition: "color 0.3s",
            }}
          >
            {timerLabel}
          </p>
          <p
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#53596B",
              margin: "2px 0 0",
              letterSpacing: "0.08em",
            }}
          >
            {correctCount} CORRECTAS
          </p>
        </div>
      </div>

      {/* Kana character — animated swap */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={kanaKey}
            initial={{ y: 36, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -36, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{
              fontSize: "96px",
              fontWeight: 700,
              color: "#FFFFFF",
              fontFamily: "var(--font-noto-sans-jp), sans-serif",
              lineHeight: 1,
              userSelect: "none",
              display: "block",
            }}
          >
            {current.item.kana}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Answer grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          padding: "0 16px 40px",
          flexShrink: 0,
        }}
      >
        {current.options.map((option) => {
          const isSelected = selectedOption === option;
          const isCorrectOpt = option === current.item.romaji;
          let bg = "rgba(255,255,255,0.10)";
          let color = "#FFFFFF";

          if (phase === "feedback") {
            if (isCorrectOpt) { bg = "#4ECDC4"; color = "#1A1A2E"; }
            else if (isSelected) { bg = "#E63946"; color = "#FFFFFF"; }
          }

          return (
            <button
              key={option}
              onClick={() => handleOption(option)}
              disabled={phase === "feedback"}
              style={{
                padding: "18px 12px",
                borderRadius: "18px",
                border: "none",
                cursor: phase === "feedback" ? "default" : "pointer",
                background: bg,
                color,
                fontSize: "20px",
                fontWeight: 700,
                transition: "background 0.12s",
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
