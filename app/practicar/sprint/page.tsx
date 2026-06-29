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
type CountdownStep = number | "¡Ya!" | null;

export default function SprintPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState<CountdownStep>(3);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [correctCount, setCorrectCount] = useState(0);
  const [current, setCurrent] = useState(() => nextQuestion(SPRINT_POOL));
  const [kanaKey, setKanaKey] = useState(0); // used to re-mount kana for animation
  const [phase, setPhase] = useState<Phase>("question");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef = useRef(false);

  // Countdown before game starts: 3 → 2 → 1 → ¡Ya! → null (game begins)
  useEffect(() => {
    const t1 = setTimeout(() => setCountdown(2), 800);
    const t2 = setTimeout(() => setCountdown(1), 1600);
    const t3 = setTimeout(() => setCountdown("¡Ya!"), 2400);
    const t4 = setTimeout(() => setCountdown(null), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  // Game timer — only starts once countdown finishes
  useEffect(() => {
    if (countdown !== null) return;

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
  }, [countdown]);

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
        position: "relative",
      }}
    >
      {/* Countdown overlay */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 20,
              background: "#1A1A2E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AnimatePresence mode="wait">
              <motion.p
                key={String(countdown)}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [0.5, 1.2, 1], opacity: [0, 1, 1], transition: { duration: 0.8, times: [0, 0.55, 1], ease: "easeOut" } }}
                exit={{ scale: 1.3, opacity: 0, transition: { duration: 0.15 } }}
                style={{
                  fontSize: countdown === "¡Ya!" ? "72px" : "120px",
                  fontWeight: 800,
                  color: countdown === "¡Ya!" ? "#4ECDC4" : "#FFFFFF",
                  margin: 0,
                  lineHeight: 1,
                  userSelect: "none",
                }}
              >
                {countdown}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

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

        {/* Scoreboard button */}
        <button
          onClick={() => router.push("/practicar/sprint/scoreboard")}
          style={{
            marginLeft: "auto",
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.12)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            flexShrink: 0,
          }}
          aria-label="Scoreboard"
        >
          🏆
        </button>
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
