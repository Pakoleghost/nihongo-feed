"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
      const delay = isCorrect ? 600 : 800;
      setTimeout(() => {
        setCurrent(nextQuestion(SPRINT_POOL));
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

  return (
    <div
      style={{
        background: "#1A1A2E",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "52px 20px 0",
          position: "relative",
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
            color: "#FFFFFF",
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
              fontSize: "44px",
              fontWeight: 800,
              color: "#4ECDC4",
              margin: 0,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {timerLabel}
          </p>
          <p
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#53596B",
              margin: "4px 0 0",
              letterSpacing: "0.08em",
            }}
          >
            {correctCount} CORRECTAS
          </p>
        </div>
      </div>

      {/* Kana character */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: "140px",
            fontWeight: 700,
            color: "#FFFFFF",
            fontFamily: "var(--font-noto-sans-jp), sans-serif",
            lineHeight: 1,
            userSelect: "none",
          }}
        >
          {current.item.kana}
        </span>
      </div>

      {/* Answer grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          padding: "0 20px 52px",
        }}
      >
        {current.options.map((option) => {
          const isSelected = selectedOption === option;
          const isCorrectOpt = option === current.item.romaji;
          let bg = "rgba(255,255,255,0.10)";
          let color = "#FFFFFF";

          if (phase === "feedback") {
            if (isCorrectOpt) {
              bg = "#4ECDC4";
              color = "#1A1A2E";
            } else if (isSelected) {
              bg = "#E63946";
              color = "#FFFFFF";
            }
          }

          return (
            <button
              key={option}
              onClick={() => handleOption(option)}
              disabled={phase === "feedback"}
              style={{
                padding: "22px 12px",
                borderRadius: "18px",
                border: "none",
                cursor: phase === "feedback" ? "default" : "pointer",
                background: bg,
                color,
                fontSize: "22px",
                fontWeight: 700,
                transition: "background 0.15s",
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
