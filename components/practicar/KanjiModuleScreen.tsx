"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GENKI_KANJI_BY_LESSON } from "@/lib/genki-kanji-by-lesson";
import type { GenkiKanjiItem } from "@/lib/genki-kanji-by-lesson";
import { getStreak, setLastActivity } from "@/lib/streak";
import { loadKanjiProgress, recordKanjiResult, saveKanjiProgress, type KanjiProgressMap } from "@/lib/kanji-progress";

const LESSONS = Object.keys(GENKI_KANJI_BY_LESSON)
  .map(Number)
  .sort((a, b) => a - b);

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

type Mode = "aprender" | "practicar";
type QuizPhase = "question" | "feedback";
type ReadingQuestion = {
  item: GenkiKanjiItem;
  options: string[];
};

const USER_KEY = "anon";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getReadingOptions(correct: GenkiKanjiItem, pool: GenkiKanjiItem[]): string[] {
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

export default function KanjiModuleScreen() {
  const router = useRouter();
  const [lesson, setLesson] = useState(LESSONS[0] ?? 3);
  const [mode, setMode] = useState<Mode>("aprender");
  const [streak, setStreak] = useState(0);

  const [studyItems, setStudyItems] = useState<GenkiKanjiItem[]>([]);
  const [currentStudyIndex, setCurrentStudyIndex] = useState(0);
  const [, setProgress] = useState<KanjiProgressMap>({});

  const [questions, setQuestions] = useState<ReadingQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizPhase, setQuizPhase] = useState<QuizPhase>("question");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const lessonItems = useMemo(() => GENKI_KANJI_BY_LESSON[lesson] ?? [], [lesson]);
  const lessonTitle = LESSON_LABELS[lesson] ?? `Lección ${lesson}`;
  const currentStudyItem = studyItems[currentStudyIndex];
  const currentQuestion = questions[currentQuestionIndex];
  const studyProgressPct = studyItems.length > 0 ? (currentStudyIndex / studyItems.length) * 100 : 0;
  const practiceProgressPct = questions.length > 0 ? (currentQuestionIndex / questions.length) * 100 : 0;

  useEffect(() => {
    setStreak(getStreak());
    setProgress(loadKanjiProgress(USER_KEY));
  }, []);

  useEffect(() => {
    const modeLabel = mode === "aprender" ? "Aprender" : "Practicar";
    setLastActivity(`Kanji · ${modeLabel} · L${lesson}`, "/practicar/kanji");
  }, [lesson, mode]);

  useEffect(() => {
    setStudyItems(lessonItems);
    setCurrentStudyIndex(0);
  }, [lessonItems]);

  useEffect(() => {
    const shuffled = shuffle(lessonItems);
    setQuestions(shuffled.map((item) => ({ item, options: getReadingOptions(item, lessonItems) })));
    setCurrentQuestionIndex(0);
    setQuizPhase("question");
    setSelectedOption(null);
    setCorrectCount(0);
  }, [lessonItems]);

  function restartPracticeSession() {
    const shuffled = shuffle(lessonItems);
    setQuestions(shuffled.map((item) => ({ item, options: getReadingOptions(item, lessonItems) })));
    setCurrentQuestionIndex(0);
    setQuizPhase("question");
    setSelectedOption(null);
    setCorrectCount(0);
  }

  function handleOption(option: string) {
    if (quizPhase !== "question" || !currentQuestion) return;
    setSelectedOption(option);
    setQuizPhase("feedback");
    const isCorrect = option === currentQuestion.item.hira;
    if (isCorrect) setCorrectCount((value) => value + 1);
    setProgress((previous) => {
      const next = recordKanjiResult(previous, lesson, currentQuestion.item, isCorrect ? "correct" : "wrong");
      saveKanjiProgress(USER_KEY, next);
      return next;
    });
    const delay = isCorrect ? 700 : 1000;

    setTimeout(() => {
      if (currentQuestionIndex + 1 >= questions.length) {
        restartPracticeSession();
      } else {
        setCurrentQuestionIndex((value) => value + 1);
        setQuizPhase("question");
        setSelectedOption(null);
      }
    }, delay);
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
      <div
        style={{
          paddingTop: "28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <button
          onClick={() => router.push("/practicar")}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "#FFFFFF",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 10px rgba(26,26,46,0.10)",
            flexShrink: 0,
          }}
          aria-label="Volver"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="#1A1A2E" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>

        <div
          style={{
            background: "rgba(78,205,196,0.14)",
            borderRadius: "999px",
            padding: "7px 14px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <span style={{ fontSize: "14px" }}>🔥</span>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#1A1A2E" }}>
            Racha de {streak} días
          </span>
        </div>
      </div>

      <div style={{ paddingTop: "18px" }}>
        <p
          style={{
            fontSize: "42px",
            fontWeight: 800,
            color: "#1A1A2E",
            margin: 0,
            lineHeight: 1,
          }}
        >
          Kanji
        </p>
        <p
          style={{
            fontSize: "15px",
            color: "#6B7280",
            margin: "8px 0 0",
            lineHeight: 1.45,
          }}
        >
          Estudia palabras con kanji por lección y practica su lectura.
        </p>
      </div>

      <div
        style={{
          marginTop: "18px",
          background: "#FFFFFF",
          borderRadius: "24px",
          padding: "18px 18px 16px",
          boxShadow: "0 8px 28px rgba(26,26,46,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div>
            <p style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", color: "#9CA3AF", margin: 0 }}>
              LECCIÓN ACTUAL
            </p>
            <p style={{ fontSize: "20px", fontWeight: 800, color: "#1A1A2E", margin: "6px 0 0" }}>
              L{lesson} · {lessonTitle}
            </p>
          </div>
          <div
            style={{
              background: "#EDFDFC",
              color: "#0F766E",
              borderRadius: "999px",
              padding: "8px 12px",
              fontSize: "13px",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {lessonItems.length} palabras
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            overflowX: "auto",
            paddingTop: "16px",
            scrollbarWidth: "none",
          }}
        >
          {LESSONS.map((value) => (
            <button
              key={value}
              onClick={() => setLesson(value)}
              style={{
                flexShrink: 0,
                padding: "10px 18px",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                background: lesson === value ? "#1A1A2E" : "#FFF8E7",
                color: lesson === value ? "#FFFFFF" : "#1A1A2E",
                fontWeight: 700,
                fontSize: "14px",
                boxShadow: lesson === value ? "none" : "0 2px 8px rgba(26,26,46,0.06)",
                whiteSpace: "nowrap",
              }}
            >
              L{value}
            </button>
          ))}
        </div>

        <div
          style={{
            marginTop: "16px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
          }}
        >
          {(["aprender", "practicar"] as const).map((value) => {
            const active = mode === value;
            return (
              <button
                key={value}
                onClick={() => setMode(value)}
                style={{
                  border: "none",
                  cursor: "pointer",
                  borderRadius: "18px",
                  padding: "14px 16px",
                  textAlign: "left",
                  background: active ? (value === "aprender" ? "#E63946" : "#4ECDC4") : "#F4EFE7",
                  color: active ? "#FFFFFF" : "#1A1A2E",
                  boxShadow: active ? "0 8px 22px rgba(26,26,46,0.10)" : "none",
                }}
              >
                <p style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>
                  {value === "aprender" ? "Aprender" : "Practicar"}
                </p>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "13px",
                    lineHeight: 1.35,
                    color: active ? "rgba(255,255,255,0.86)" : "#6B7280",
                  }}
                >
                  {value === "aprender"
                    ? "Estudia forma, lectura y significado."
                    : "Elige la lectura correcta."}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {mode === "aprender" ? (
        <div
          style={{
            marginTop: "18px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
              gap: "12px",
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#1A1A2E" }}>Aprender</p>
              <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#6B7280" }}>
                Repasa cómo se leen las palabras de esta lección.
              </p>
            </div>
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: "999px",
                padding: "8px 12px",
                fontSize: "13px",
                fontWeight: 700,
                color: "#E63946",
                boxShadow: "0 2px 10px rgba(26,26,46,0.06)",
                whiteSpace: "nowrap",
              }}
            >
              {currentStudyIndex + 1}/{studyItems.length || 0}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em", color: "#9CA3AF" }}>
              ESTUDIO
            </span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#E63946" }}>
              Lectura + apoyo
            </span>
          </div>
          <div
            style={{
              height: "5px",
              background: "#E5E7EB",
              borderRadius: "999px",
              overflow: "hidden",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${studyProgressPct}%`,
                background: "#E63946",
                borderRadius: "999px",
                transition: "width 0.3s ease",
              }}
            />
          </div>

          {currentStudyItem ? (
            <>
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: "24px",
                  padding: "30px 24px",
                  boxShadow: "0 8px 28px rgba(26,26,46,0.08)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
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
                  {currentStudyItem.kanji}
                </p>
                <div
                  style={{
                    marginTop: "18px",
                    background: "#FFF8E7",
                    borderRadius: "18px",
                    padding: "14px 16px",
                    width: "100%",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", color: "#9CA3AF" }}>
                    LECTURA
                  </p>
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: "28px",
                      fontWeight: 800,
                      color: "#1A1A2E",
                      fontFamily: "var(--font-noto-sans-jp), sans-serif",
                    }}
                  >
                    {currentStudyItem.hira}
                  </p>
                </div>
                <div
                  style={{
                    marginTop: "12px",
                    background: "#F5FCFB",
                    borderRadius: "18px",
                    padding: "14px 16px",
                    width: "100%",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", color: "#9CA3AF" }}>
                    SIGNIFICADO
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: "18px", fontWeight: 700, color: "#1A1A2E", lineHeight: 1.35 }}>
                    {currentStudyItem.es}
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "16px" }}>
                <button
                  onClick={() => setCurrentStudyIndex((value) => Math.max(0, value - 1))}
                  disabled={currentStudyIndex === 0}
                  style={{
                    padding: "16px 12px",
                    borderRadius: "999px",
                    border: "none",
                    cursor: currentStudyIndex === 0 ? "default" : "pointer",
                    background: currentStudyIndex === 0 ? "#E5E7EB" : "#FFFFFF",
                    color: currentStudyIndex === 0 ? "#9CA3AF" : "#1A1A2E",
                    fontWeight: 700,
                    fontSize: "16px",
                    boxShadow: currentStudyIndex === 0 ? "none" : "0 4px 16px rgba(26,26,46,0.08)",
                  }}
                >
                  Anterior
                </button>
                <button
                  onClick={() =>
                    setCurrentStudyIndex((value) => (value + 1 >= studyItems.length ? value : value + 1))
                  }
                  disabled={currentStudyIndex + 1 >= studyItems.length}
                  style={{
                    padding: "16px 12px",
                    borderRadius: "999px",
                    border: "none",
                    cursor: currentStudyIndex + 1 >= studyItems.length ? "default" : "pointer",
                    background: currentStudyIndex + 1 >= studyItems.length ? "#E5E7EB" : "#4ECDC4",
                    color: currentStudyIndex + 1 >= studyItems.length ? "#9CA3AF" : "#1A1A2E",
                    fontWeight: 800,
                    fontSize: "16px",
                    boxShadow:
                      currentStudyIndex + 1 >= studyItems.length ? "none" : "0 4px 16px rgba(78,205,196,0.28)",
                  }}
                >
                  Siguiente
                </button>
              </div>
            </>
          ) : (
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: "24px",
                padding: "28px 24px",
                boxShadow: "0 8px 28px rgba(26,26,46,0.08)",
              }}
            >
              <p style={{ margin: 0, fontSize: "15px", color: "#6B7280", textAlign: "center" }}>
                No hay palabras con kanji para esta lección.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            marginTop: "18px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
              gap: "12px",
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#1A1A2E" }}>Practicar</p>
              <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#6B7280" }}>
                Lee la palabra con kanji y elige su lectura correcta.
              </p>
            </div>
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: "999px",
                padding: "8px 12px",
                fontSize: "13px",
                fontWeight: 700,
                color: "#1A1A2E",
                boxShadow: "0 2px 10px rgba(26,26,46,0.06)",
                whiteSpace: "nowrap",
              }}
            >
              {currentQuestionIndex + 1}/{questions.length || 0}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em", color: "#9CA3AF" }}>
              PRÁCTICA
            </span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#4ECDC4" }}>
              {correctCount} correctas
            </span>
          </div>
          <div
            style={{
              height: "5px",
              background: "#E5E7EB",
              borderRadius: "999px",
              overflow: "hidden",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${practiceProgressPct}%`,
                background: "#4ECDC4",
                borderRadius: "999px",
                transition: "width 0.3s ease",
              }}
            />
          </div>

          {currentQuestion ? (
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
                  minHeight: "220px",
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
                background: "#FFFFFF",
                borderRadius: "24px",
                padding: "28px 24px",
                boxShadow: "0 8px 28px rgba(26,26,46,0.08)",
              }}
            >
              <p style={{ margin: 0, fontSize: "15px", color: "#6B7280", textAlign: "center" }}>
                No hay palabras con kanji para practicar en esta lección.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
