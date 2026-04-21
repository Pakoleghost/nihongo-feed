"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GENKI_VOCAB_BY_LESSON } from "@/lib/genki-vocab-by-lesson";
import type { GenkiVocabItem } from "@/lib/genki-vocab-by-lesson";
import { getStreak, setLastActivity } from "@/lib/streak";

const LESSONS = Object.keys(GENKI_VOCAB_BY_LESSON)
  .map(Number)
  .sort((a, b) => a - b);

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

type Mode = "aprender" | "practicar";
type QuizPhase = "question" | "feedback";
type QuizItem = { display: string; reading: string; es: string };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toQuizItems(items: GenkiVocabItem[]): QuizItem[] {
  return items.map((item) => ({
    display: item.kanji || item.hira,
    reading: item.hira,
    es: item.es,
  }));
}

function getOptions(correct: QuizItem, pool: QuizItem[]): string[] {
  const correctEs = correct.es;
  const others = [...new Set(pool.map((item) => item.es).filter((es) => es !== correctEs))];
  const supplemented =
    others.length < 3
      ? [
          ...new Set(
            toQuizItems(Object.values(GENKI_VOCAB_BY_LESSON).flat())
              .map((item) => item.es)
              .filter((es) => es !== correctEs),
          ),
        ]
      : others;
  const wrong3 = shuffle(supplemented).slice(0, 3);
  return shuffle([correctEs, ...wrong3]);
}

export default function VocabularioModuleScreen() {
  const router = useRouter();
  const [lesson, setLesson] = useState(1);
  const [mode, setMode] = useState<Mode>("aprender");
  const [streak, setStreak] = useState(0);

  const [cards, setCards] = useState<GenkiVocabItem[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [cardsDone, setCardsDone] = useState(false);

  const [questions, setQuestions] = useState<{ item: QuizItem; options: string[] }[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizPhase, setQuizPhase] = useState<QuizPhase>("question");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);

  const lessonItems = useMemo(() => GENKI_VOCAB_BY_LESSON[lesson] ?? [], [lesson]);
  const lessonTitle = LESSON_LABELS[lesson] ?? `Lección ${lesson}`;
  const currentCard = cards[currentCardIndex];
  const currentQuestion = questions[currentQuestionIndex];
  const learnProgressPct = cards.length > 0 ? (currentCardIndex / cards.length) * 100 : 0;
  const practiceProgressPct = questions.length > 0 ? (currentQuestionIndex / questions.length) * 100 : 0;

  useEffect(() => {
    setStreak(getStreak());
  }, []);

  useEffect(() => {
    const modeLabel = mode === "aprender" ? "Aprender" : "Practicar";
    setLastActivity(`Vocabulario · ${modeLabel} · L${lesson}`, "/practicar/vocabulario");
  }, [lesson, mode]);

  useEffect(() => {
    const items = shuffle(lessonItems);
    setCards(items);
    setCurrentCardIndex(0);
    setKnown(0);
    setFlipped(false);
    setCardsDone(false);
  }, [lessonItems]);

  useEffect(() => {
    const items = toQuizItems(lessonItems);
    const shuffled = shuffle(items);
    setQuestions(shuffled.map((item) => ({ item, options: getOptions(item, items) })));
    setCurrentQuestionIndex(0);
    setQuizPhase("question");
    setSelectedOption(null);
    setCorrect(0);
  }, [lessonItems]);

  function handleKnow(knows: boolean) {
    if (cardsDone) return;
    if (knows) setKnown((value) => value + 1);
    setFlipped(false);
    if (currentCardIndex + 1 >= cards.length) {
      setCardsDone(true);
    } else {
      setCurrentCardIndex((value) => value + 1);
    }
  }

  function restartLearnSession() {
    const items = shuffle(lessonItems);
    setCards(items);
    setCurrentCardIndex(0);
    setKnown(0);
    setFlipped(false);
    setCardsDone(false);
  }

  function restartPracticeSession() {
    const items = toQuizItems(lessonItems);
    const shuffled = shuffle(items);
    setQuestions(shuffled.map((item) => ({ item, options: getOptions(item, items) })));
    setCurrentQuestionIndex(0);
    setQuizPhase("question");
    setSelectedOption(null);
    setCorrect(0);
  }

  function handleOption(option: string) {
    if (quizPhase !== "question" || !currentQuestion) return;
    setSelectedOption(option);
    setQuizPhase("feedback");
    const isCorrect = option === currentQuestion.item.es;
    if (isCorrect) setCorrect((value) => value + 1);
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
            background: "rgba(230,57,70,0.10)",
            borderRadius: "999px",
            padding: "7px 14px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <span style={{ fontSize: "14px" }}>🔥</span>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#E63946" }}>
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
          Vocabulario
        </p>
        <p
          style={{
            fontSize: "15px",
            color: "#6B7280",
            margin: "8px 0 0",
            lineHeight: 1.45,
          }}
        >
          Estudia y practica por lección con el vocabulario de Genki 1.
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
              background: "#FFF1F2",
              color: "#E63946",
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
                    ? "Repasa tarjetas y significado."
                    : "Comprueba si reconoces el vocabulario."}
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
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#1A1A2E" }}>Aprender</p>
              <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#6B7280" }}>
                Voltea cada tarjeta y marca si ya la recuerdas.
              </p>
            </div>
            {!cardsDone && (
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: "999px",
                  padding: "8px 12px",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#E63946",
                  boxShadow: "0 2px 10px rgba(26,26,46,0.06)",
                }}
              >
                {currentCardIndex + 1}/{cards.length || 0}
              </div>
            )}
          </div>

          {cardsDone ? (
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: "24px",
                padding: "28px 24px",
                boxShadow: "0 8px 28px rgba(26,26,46,0.08)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                gap: "12px",
                flex: 1,
              }}
            >
              <p style={{ fontSize: "40px", margin: 0 }}>🎉</p>
              <p style={{ fontSize: "24px", fontWeight: 800, color: "#1A1A2E", margin: 0 }}>Lección repasada</p>
              <p style={{ fontSize: "15px", color: "#6B7280", margin: 0 }}>
                Marcaste {known} de {cards.length} como conocidas.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", width: "100%", marginTop: "8px" }}>
                <button
                  onClick={restartLearnSession}
                  style={{
                    padding: "14px 18px",
                    borderRadius: "999px",
                    border: "none",
                    cursor: "pointer",
                    background: "#E63946",
                    color: "#FFFFFF",
                    fontWeight: 700,
                    fontSize: "15px",
                  }}
                >
                  Repetir lección
                </button>
                <button
                  onClick={() => setMode("practicar")}
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
                  Ir a practicar
                </button>
              </div>
            </div>
          ) : currentCard ? (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em", color: "#9CA3AF" }}>
                  REPASO
                </span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#E63946" }}>
                  {known} conocidas
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
                    width: `${learnProgressPct}%`,
                    background: "#E63946",
                    borderRadius: "999px",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>

              <div style={{ perspective: "1200px", flex: 1, cursor: "pointer" }} onClick={() => setFlipped((value) => !value)}>
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    minHeight: "320px",
                    height: "100%",
                    transformStyle: "preserve-3d",
                    transition: "transform 0.45s cubic-bezier(0.4,0,0.2,1)",
                    transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backfaceVisibility: "hidden",
                      background: "#FFFFFF",
                      borderRadius: "24px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      padding: "32px",
                      boxShadow: "0 8px 32px rgba(26,26,46,0.09)",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "60px",
                        fontWeight: 800,
                        color: "#1A1A2E",
                        margin: 0,
                        fontFamily: "var(--font-noto-sans-jp), sans-serif",
                        lineHeight: 1,
                        textAlign: "center",
                      }}
                    >
                      {currentCard.kanji || currentCard.hira}
                    </p>
                    {currentCard.kanji && (
                      <p
                        style={{
                          fontSize: "20px",
                          color: "#9CA3AF",
                          margin: 0,
                          fontFamily: "var(--font-noto-sans-jp), sans-serif",
                        }}
                      >
                        {currentCard.hira}
                      </p>
                    )}
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#C4BAB0",
                        margin: "24px 0 0",
                      }}
                    >
                      Toca para ver el significado
                    </p>
                  </div>

                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                      background: "#FFFFFF",
                      borderRadius: "24px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "32px",
                      boxShadow: "0 8px 32px rgba(26,26,46,0.09)",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "26px",
                        fontWeight: 700,
                        color: "#1A1A2E",
                        margin: 0,
                        textAlign: "center",
                        lineHeight: 1.3,
                      }}
                    >
                      {currentCard.es}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "16px" }}>
                <button
                  onClick={() => handleKnow(false)}
                  style={{
                    padding: "18px 12px",
                    borderRadius: "999px",
                    border: "none",
                    cursor: "pointer",
                    background: "#E63946",
                    color: "#FFFFFF",
                    fontWeight: 700,
                    fontSize: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 16px rgba(230,57,70,0.28)",
                  }}
                >
                  <span style={{ fontSize: "18px" }}>✕</span>
                  Aún no
                </button>
                <button
                  onClick={() => handleKnow(true)}
                  style={{
                    padding: "18px 12px",
                    borderRadius: "999px",
                    border: "none",
                    cursor: "pointer",
                    background: "#4ECDC4",
                    color: "#1A1A2E",
                    fontWeight: 700,
                    fontSize: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 16px rgba(78,205,196,0.28)",
                  }}
                >
                  <span style={{ fontSize: "18px" }}>✓</span>
                  Ya la sé
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
                No hay vocabulario para esta lección.
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
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#1A1A2E" }}>Practicar</p>
              <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#6B7280" }}>
                Reconoce el significado correcto en español.
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
              {correct} correctas
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
                  padding: "32px 24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 20px rgba(26,26,46,0.08)",
                  minHeight: "220px",
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
                    textAlign: "center",
                  }}
                >
                  {currentQuestion.item.display}
                </p>
                {currentQuestion.item.reading !== currentQuestion.item.display && (
                  <p
                    style={{
                      fontSize: "18px",
                      color: "#9CA3AF",
                      margin: "10px 0 0",
                      fontFamily: "var(--font-noto-sans-jp), sans-serif",
                    }}
                  >
                    {currentQuestion.item.reading}
                  </p>
                )}
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
                        padding: "18px 12px",
                        borderRadius: "18px",
                        border: "none",
                        cursor: quizPhase === "feedback" ? "default" : "pointer",
                        background,
                        color,
                        fontSize: "16px",
                        fontWeight: 700,
                        boxShadow: "0 4px 14px rgba(26,26,46,0.08)",
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
                background: "#FFFFFF",
                borderRadius: "24px",
                padding: "28px 24px",
                boxShadow: "0 8px 28px rgba(26,26,46,0.08)",
              }}
            >
              <p style={{ margin: 0, fontSize: "15px", color: "#6B7280", textAlign: "center" }}>
                No hay vocabulario para practicar en esta lección.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
