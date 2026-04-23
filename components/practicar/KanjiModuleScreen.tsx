"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GENKI_KANJI_BY_LESSON } from "@/lib/genki-kanji-by-lesson";
import { getStreak, setLastActivity } from "@/lib/streak";
import { getKanjiLessonSummary, loadKanjiProgress, type KanjiProgressMap } from "@/lib/kanji-progress";
import { getPracticeNextAction, getPracticeSessionContext } from "@/lib/practice-srs";

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

const USER_KEY = "anon";

type KanjiModuleScreenProps = {
  initialLesson?: number;
};

export default function KanjiModuleScreen({ initialLesson }: KanjiModuleScreenProps) {
  const router = useRouter();
  const [lesson, setLesson] = useState(() =>
    initialLesson && LESSONS.includes(initialLesson) ? initialLesson : (LESSONS[0] ?? 3),
  );
  const [streak, setStreak] = useState(0);
  const [progress, setProgress] = useState<KanjiProgressMap>({});

  const lessonItems = useMemo(() => GENKI_KANJI_BY_LESSON[lesson] ?? [], [lesson]);
  const lessonTitle = LESSON_LABELS[lesson] ?? `Lección ${lesson}`;
  const lessonSummary = useMemo(
    () => getKanjiLessonSummary(lesson, lessonItems, progress),
    [lesson, lessonItems, progress],
  );
  const nextAction = useMemo(() => getPracticeNextAction(lessonSummary), [lessonSummary]);
  const practiceSessionContext = useMemo(() => getPracticeSessionContext(lessonSummary), [lessonSummary]);
  const recommendedMode = nextAction.targetMode;

  useEffect(() => {
    setStreak(getStreak());
    setProgress(loadKanjiProgress(USER_KEY));
  }, []);

  useEffect(() => {
    if (!initialLesson || !LESSONS.includes(initialLesson)) return;
    setLesson(initialLesson);
  }, [initialLesson]);

  useEffect(() => {
    setLastActivity(`Kanji · L${lesson}`, "/practicar/kanji");
  }, [lesson]);

  function selectLesson(nextLesson: number) {
    setLesson(nextLesson);
    router.replace(`/practicar/kanji?lesson=${nextLesson}`, { scroll: false });
  }

  function goToLearnSession() {
    router.push(`/practicar/kanji/aprender?lesson=${lesson}`);
  }

  function goToPracticeSession() {
    const params = new URLSearchParams({ lesson: String(lesson), focus: practiceSessionContext.sortKey });
    router.push(`/practicar/kanji/practicar?${params.toString()}`);
  }

  const actionCards = [
    {
      key: "learn",
      mode: "aprender",
      title: "Aprender",
      subtitle: "Repasa kanjis nuevos",
      background: "#4ECDC4",
      color: "#1A1A2E",
      buttonBackground: "#1A1A2E",
      buttonColor: "#FFFFFF",
      buttonLabel: "Empezar",
      deco: "字",
      onClick: goToLearnSession,
    },
    {
      key: "practice",
      mode: "practicar",
      title: "Practicar",
      subtitle: "Pon a prueba tu lectura",
      background: "#1A1A2E",
      color: "#FFFFFF",
      buttonBackground: "#E63946",
      buttonColor: "#FFFFFF",
      buttonLabel: "Empezar",
      deco: "読",
      onClick: goToPracticeSession,
    },
  ] as const;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#FFF8E7",
        padding: "32px 16px 16px",
        fontFamily: "var(--font-study), var(--font-latin), sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <button
          onClick={() => router.push("/practicar")}
          aria-label="Volver"
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "999px",
            border: "none",
            background: "#FFFFFF",
            color: "#1A1A2E",
            cursor: "pointer",
            boxShadow: "0 10px 24px rgba(26,26,46,0.08)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15 18l-6-6 6-6"
              stroke="#1A1A2E"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div
          style={{
            borderRadius: "999px",
            background: "rgba(78,205,196,0.18)",
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#1A1A2E",
            fontWeight: 700,
            fontSize: "12px",
          }}
        >
          <span style={{ fontSize: "16px", lineHeight: 1 }}>🔥</span>
          <span>Racha de {streak} días</span>
        </div>
      </div>

      <div style={{ marginTop: "12px" }}>
        <h1
          style={{
            margin: 0,
            fontSize: "24px",
            lineHeight: 1.1,
            fontWeight: 700,
            color: "#1A1A2E",
          }}
        >
          Kanji
        </h1>
        <p
          style={{
            margin: "6px 0 0",
            fontSize: "14px",
            lineHeight: 1.35,
            color: "#9CA3AF",
            fontWeight: 400,
          }}
        >
          Lectura por lección.
        </p>
      </div>

      <div
        style={{
          marginTop: "12px",
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        {LESSONS.map((value) => {
          const active = lesson === value;
          return (
            <button
              key={value}
              onClick={() => selectLesson(value)}
              style={{
                flexShrink: 0,
                minWidth: "80px",
                height: "48px",
                borderRadius: "999px",
                border: "none",
                boxShadow: active ? "none" : "inset 0 0 0 2px rgba(26,26,46,0.05)",
                background: active ? "#1A1A2E" : "#FFF5E6",
                color: active ? "#FFFFFF" : "#1A1A2E",
                fontWeight: 700,
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              L{value}
            </button>
          );
        })}
      </div>

      <div
        style={{
          marginTop: "12px",
          background: "#FFFFFF",
          borderRadius: "2rem",
          padding: "12px",
          boxShadow: "0 16px 40px rgba(26,26,46,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                letterSpacing: "0.18em",
                fontWeight: 600,
                color: "#9CA3AF",
              }}
            >
              LECCIÓN
            </p>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: "16px",
                lineHeight: 1.2,
                fontWeight: 700,
                color: "#1A1A2E",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              L{lesson} · {lessonTitle}
            </p>
          </div>

          <div
            style={{
              borderRadius: "999px",
              background: "rgba(78,205,196,0.18)",
              color: "#1A1A2E",
              padding: "10px 14px",
              fontSize: "12px",
              fontWeight: 600,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {lessonItems.length} palabras
          </div>
        </div>

        <div
          style={{
            marginTop: "8px",
            background: "#FFF5E6",
            borderRadius: "2rem",
            padding: "8px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "8px",
            }}
          >
            {[
              { label: "NUEVAS", value: lessonSummary.nuevos, color: "#9CA3AF" },
              { label: "PEND.", value: lessonSummary.pendientes, color: "#E63946" },
              { label: "DOM.", value: lessonSummary.dominados, color: "#4ECDC4" },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: "#FFFFFF",
                  borderRadius: "2rem",
                  padding: "8px",
                  boxShadow: "0 8px 24px rgba(26,26,46,0.06)",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "12px",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    color: "#9CA3AF",
                    textTransform: "uppercase",
                  }}
                >
                  {stat.label}
                </p>
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: "20px",
                    lineHeight: 1,
                    fontWeight: 700,
                    color: stat.color,
                  }}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "12px",
          background: recommendedMode === "practicar" ? "rgba(26,26,46,0.05)" : "rgba(255,255,255,0.78)",
          borderRadius: "2rem",
          padding: "12px",
          boxShadow: "0 12px 30px rgba(26,26,46,0.06)",
        }}
      >
        <p
          style={{
            margin: "0 0 10px",
            fontSize: "11px",
            letterSpacing: "0.12em",
            fontWeight: 700,
            color: "#9CA3AF",
            textTransform: "uppercase",
          }}
        >
          Cómo quieres estudiar
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {actionCards.map((card) => {
            const isRecommended = card.mode === recommendedMode;
            const isLearn = card.key === "learn";
            const surface =
              isLearn
                ? isRecommended
                  ? "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,252,251,0.98) 100%)"
                  : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,252,251,0.94) 100%)"
                : isRecommended
                  ? "#1A1A2E"
                  : "rgba(255,255,255,0.84)";
            const textColor = isLearn ? "#1A1A2E" : isRecommended ? card.color : "#1A1A2E";
            const subColor =
              !isLearn && card.key === "practice" && isRecommended
                ? "rgba(255,255,255,0.82)"
                : isLearn && isRecommended
                  ? "#5F6B7A"
                  : isLearn
                    ? "#6B7280"
                  : "#6B7280";

            return (
              <div
                key={card.key}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  background: surface,
                  color: textColor,
                  borderRadius: "2rem",
                  padding: isRecommended ? "14px" : "12px",
                  height: isRecommended ? "124px" : "112px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: isRecommended
                    ? "0 16px 36px rgba(26,26,46,0.12)"
                    : "0 8px 18px rgba(26,26,46,0.05)",
                  transform: isRecommended ? "translateY(-1px)" : "none",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    right: "16px",
                    top: "14px",
                    fontSize: isLearn ? (isRecommended ? "68px" : "56px") : isRecommended ? "78px" : "66px",
                    fontWeight: 800,
                    lineHeight: 1,
                    opacity: isLearn ? (isRecommended ? 0.16 : 0.08) : isRecommended ? 0.14 : 0.08,
                    color: isLearn ? "#4ECDC4" : textColor,
                    pointerEvents: "none",
                  }}
                >
                  {card.deco}
                </span>

                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: isRecommended ? "19px" : "17px",
                        lineHeight: 1,
                        fontWeight: 700,
                        color: textColor,
                      }}
                    >
                      {card.title}
                    </p>
                    {isRecommended ? (
                      <span
                        style={{
                          borderRadius: "999px",
                          background:
                            card.key === "practice" ? "rgba(255,255,255,0.14)" : "rgba(78,205,196,0.14)",
                          color: card.key === "practice" ? "#FFFFFF" : "#0F766E",
                          padding: "4px 8px",
                          fontSize: "10px",
                          fontWeight: 800,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        Recomendado
                      </span>
                    ) : null}
                  </div>
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: "12px",
                      lineHeight: 1.2,
                      fontWeight: 400,
                      color: subColor,
                      maxWidth: "180px",
                    }}
                  >
                    {card.subtitle}
                  </p>
                </div>

                <button
                  onClick={card.onClick}
                  style={{
                    position: "relative",
                    zIndex: 1,
                    alignSelf: "flex-start",
                    border: "none",
                    borderRadius: "3rem",
                    background: isLearn
                      ? isRecommended
                        ? "#1A1A2E"
                        : "#4ECDC4"
                      : isRecommended
                        ? card.buttonBackground
                        : "#1A1A2E",
                    color: isLearn
                      ? isRecommended
                        ? "#FFFFFF"
                        : "#1A1A2E"
                      : isRecommended
                        ? card.buttonColor
                        : "#FFFFFF",
                    padding: isRecommended ? "7px 16px" : "6px 14px",
                    fontWeight: 700,
                    fontSize: "12px",
                    cursor: "pointer",
                    opacity: isRecommended ? 1 : 0.92,
                  }}
                >
                  {card.buttonLabel}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
