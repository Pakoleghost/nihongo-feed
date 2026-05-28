"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GENKI_VOCAB_BY_LESSON } from "@/lib/genki-vocab-by-lesson";
import type { GenkiVocabItem } from "@/lib/genki-vocab-by-lesson";
import { GENKI_KANJI_BY_LESSON } from "@/lib/genki-kanji-by-lesson";
import type { GenkiKanjiItem } from "@/lib/genki-kanji-by-lesson";
import { setLastActivity } from "@/lib/streak";
import { GENKI_LESSON_NAMES } from "@/lib/genki-lesson-names";

const VOCAB_LESSONS = Object.keys(GENKI_VOCAB_BY_LESSON)
  .map(Number)
  .sort((a, b) => a - b);
const KANJI_LESSONS = Object.keys(GENKI_KANJI_BY_LESSON)
  .map(Number)
  .sort((a, b) => a - b);

type QuizKind = "vocab" | "kanji";
type Phase = "question" | "feedback";
type QuizItem = { display: string; reading: string; es: string };

function toQuizItems(items: (GenkiVocabItem | GenkiKanjiItem)[]): QuizItem[] {
  return items.map((i) => ({
    display: i.kanji || i.hira,
    reading: i.hira,
    es: i.es,
  }));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getOptions(correct: QuizItem, pool: QuizItem[]): string[] {
  const correctEs = correct.es;
  const others = [...new Set(pool.map((i) => i.es).filter((e) => e !== correctEs))];
  const supplemented =
    others.length < 3
      ? [
          ...new Set(
            toQuizItems(Object.values(GENKI_VOCAB_BY_LESSON).flat())
              .map((i) => i.es)
              .filter((e) => e !== correctEs),
          ),
        ]
      : others;
  const wrong3 = shuffle(supplemented).slice(0, 3);
  return shuffle([correctEs, ...wrong3]);
}

type KanjiQuizScreenProps = {
  initialType: QuizKind;
  allowTypeToggle: boolean;
  activityLabel: string;
  activityPath: string;
  backHref?: string;
};

export default function KanjiQuizScreen({
  initialType,
  allowTypeToggle,
  activityLabel,
  activityPath,
  backHref = "/practicar",
}: KanjiQuizScreenProps) {
  const router = useRouter();
  const [lesson, setLesson] = useState(1);
  const [type, setType] = useState<QuizKind>(initialType);
  const [pool, setPool] = useState<QuizItem[]>([]);
  const [questions, setQuestions] = useState<{ item: QuizItem; options: string[] }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("question");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);

  useEffect(() => {
    setType(initialType);
  }, [initialType]);

  useEffect(() => {
    setLastActivity(`${activityLabel} · L${lesson}`, activityPath);
  }, [activityLabel, activityPath, lesson]);

  const availableLessons = type === "vocab" ? VOCAB_LESSONS : KANJI_LESSONS;

  useEffect(() => {
    if (!availableLessons.includes(lesson)) {
      setLesson(availableLessons[0] ?? 1);
    }
  }, [availableLessons, lesson, type]);

  useEffect(() => {
    const raw =
      type === "vocab" ? (GENKI_VOCAB_BY_LESSON[lesson] ?? []) : (GENKI_KANJI_BY_LESSON[lesson] ?? []);
    const items = toQuizItems(raw);
    const shuffled = shuffle(items);
    setPool(items);
    setQuestions(shuffled.map((item) => ({ item, options: getOptions(item, items) })));
    setCurrentIndex(0);
    setPhase("question");
    setSelectedOption(null);
    setCorrect(0);
  }, [lesson, type]);

  const currentQ = questions[currentIndex];
  const progressPct = questions.length > 0 ? (currentIndex / questions.length) * 100 : 0;

  function handleOption(option: string) {
    if (phase !== "question" || !currentQ) return;
    setSelectedOption(option);
    setPhase("feedback");
    const isCorrect = option === currentQ.item.es;
    if (isCorrect) setCorrect((c) => c + 1);
    const delay = isCorrect ? 700 : 1000;
    setTimeout(() => {
      if (currentIndex + 1 >= questions.length) {
        const raw =
          type === "vocab"
            ? (GENKI_VOCAB_BY_LESSON[lesson] ?? [])
            : (GENKI_KANJI_BY_LESSON[lesson] ?? []);
        const items = toQuizItems(raw);
        const shuffled = shuffle(items);
        setPool(items);
        setQuestions(shuffled.map((item) => ({ item, options: getOptions(item, items) })));
        setCurrentIndex(0);
        setCorrect(0);
      } else {
        setCurrentIndex((i) => i + 1);
      }
      setPhase("question");
      setSelectedOption(null);
    }, delay);
  }

  return (
    <div
      style={{
        background: "#1A1A2E",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "52px 20px 0",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <button
          onClick={() => router.push(backHref)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            flexShrink: 0,
          }}
          aria-label="Volver"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="rgba(255,255,255,0.65)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
        <div
          style={{
            flex: 1,
            height: "6px",
            background: "rgba(255,255,255,0.10)",
            borderRadius: "999px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progressPct}%`,
              background: "#4ECDC4",
              borderRadius: "999px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          overflowX: "auto",
          padding: "16px 20px 0",
          scrollbarWidth: "none",
        }}
      >
        {availableLessons.map((l) => (
          <button
            key={l}
            onClick={() => setLesson(l)}
            style={{
              flexShrink: 0,
              padding: "10px 18px",
              borderRadius: "999px",
              border: "none",
              cursor: "pointer",
              background: lesson === l ? "#FFFFFF" : "rgba(255,255,255,0.08)",
              color: lesson === l ? "#1A1A2E" : "rgba(255,255,255,0.55)",
              fontWeight: 700,
              fontSize: "14px",
              whiteSpace: "nowrap",
            }}
          >
            L{l}: {GENKI_LESSON_NAMES[l] ?? `Lección ${l}`}
          </button>
        ))}
      </div>

      {allowTypeToggle && (
        <div style={{ display: "flex", gap: "10px", padding: "14px 20px 0" }}>
          {(["vocab", "kanji"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              style={{
                padding: "10px 22px",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                background: type === t ? "#E63946" : "rgba(255,255,255,0.08)",
                color: type === t ? "#FFFFFF" : "rgba(255,255,255,0.42)",
                fontWeight: 700,
                fontSize: "15px",
                transition: "background 0.15s",
              }}
            >
              {t === "vocab" ? "Vocabulario" : "Kanji"}
            </button>
          ))}
        </div>
      )}

      {currentQ ? (
        <>
          <div
            style={{
              margin: "16px 20px 0",
              background: "#1E2235",
              borderRadius: "24px",
              padding: "32px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(255,255,255,0.08)",
              minHeight: "200px",
            }}
          >
            <p
              style={{
                fontSize: "64px",
                fontWeight: 800,
                color: "#FFFFFF",
                margin: 0,
                fontFamily: "var(--font-noto-sans-jp), sans-serif",
                lineHeight: 1,
              }}
            >
              {currentQ.item.display}
            </p>
            {currentQ.item.reading !== currentQ.item.display && (
              <p
                style={{
                  fontSize: "18px",
                  color: "rgba(255,255,255,0.42)",
                  margin: "10px 0 0",
                  fontFamily: "var(--font-noto-sans-jp), sans-serif",
                }}
              >
                {currentQ.item.reading}
              </p>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              padding: "16px 20px 48px",
            }}
          >
            {currentQ.options.map((option) => {
              const isSelected = selectedOption === option;
              const isCorrectOpt = option === currentQ.item.es;
              let bg = "rgba(255,255,255,0.08)";
              let color = "#FFFFFF";

              if (phase === "feedback") {
                if (isCorrectOpt) {
                  bg = "#4ECDC4";
                  color = "#FFFFFF";
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
                    padding: "18px 12px",
                    borderRadius: "18px",
                    border: phase === "feedback" ? "none" : "1px solid rgba(255,255,255,0.08)",
                    cursor: phase === "feedback" ? "default" : "pointer",
                    background: bg,
                    color,
                    fontSize: "16px",
                    fontWeight: 700,
                    transition: "background 0.15s",
                    textAlign: "center",
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
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p style={{ color: "#9CA3AF" }}>No hay datos para esta lección.</p>
        </div>
      )}
    </div>
  );
}
