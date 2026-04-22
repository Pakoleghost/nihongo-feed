"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GENKI_KANJI_BY_LESSON } from "@/lib/genki-kanji-by-lesson";
import { getStreak, setLastActivity } from "@/lib/streak";
import { getKanjiLessonSummary, loadKanjiProgress, type KanjiProgressMap } from "@/lib/kanji-progress";
import { getPracticeSessionContext } from "@/lib/practice-srs";

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
  const practiceSessionContext = useMemo(() => getPracticeSessionContext(lessonSummary), [lessonSummary]);

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
        padding: "24px 24px 40px",
        fontFamily: "var(--font-study), var(--font-latin), sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          paddingTop: "8px",
        }}
      >
        <button
          onClick={() => router.push("/practicar")}
          aria-label="Cerrar"
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "999px",
            border: "none",
            background: "#FFFFFF",
            color: "#1A1A2E",
            fontSize: "34px",
            lineHeight: 1,
            cursor: "pointer",
            boxShadow: "0 10px 24px rgba(26,26,46,0.08)",
            flexShrink: 0,
          }}
        >
          ×
        </button>

        <div
          style={{
            borderRadius: "999px",
            background: "rgba(78,205,196,0.18)",
            padding: "12px 22px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: "#1A1A2E",
            fontWeight: 800,
            fontSize: "15px",
          }}
        >
          <span style={{ fontSize: "22px", lineHeight: 1 }}>🔥</span>
          <span>Racha de {streak} días</span>
        </div>
      </div>

      <div style={{ marginTop: "28px" }}>
        <h1
          style={{
            margin: 0,
            fontSize: "72px",
            lineHeight: 0.94,
            fontWeight: 800,
            color: "#1A1A2E",
            letterSpacing: "-0.06em",
          }}
        >
          Kanji
        </h1>
        <p
          style={{
            margin: "14px 0 0",
            fontSize: "28px",
            lineHeight: 1.15,
            color: "#6B7280",
            fontWeight: 500,
          }}
        >
          Lectura por lección.
        </p>
      </div>

      <div
        style={{
          marginTop: "28px",
          background: "#FFFFFF",
          borderRadius: "2rem",
          padding: "24px",
          boxShadow: "0 16px 40px rgba(26,26,46,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "20px",
                letterSpacing: "0.08em",
                fontWeight: 800,
                color: "#9CA3AF",
              }}
            >
              LECCIÓN
            </p>
            <p
              style={{
                margin: "16px 0 0",
                fontSize: "56px",
                lineHeight: 0.98,
                fontWeight: 800,
                color: "#1A1A2E",
                letterSpacing: "-0.05em",
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
              padding: "16px 22px",
              fontSize: "18px",
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            {lessonItems.length} palabras
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "14px",
            overflowX: "auto",
            paddingTop: "24px",
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
                  minWidth: "112px",
                  height: "78px",
                  borderRadius: "999px",
                  border: "none",
                  boxShadow: active ? "none" : "inset 0 0 0 2px rgba(26,26,46,0.05)",
                  background: active ? "#1A1A2E" : "#FFF5E6",
                  color: active ? "#FFFFFF" : "#1A1A2E",
                  fontWeight: 800,
                  fontSize: "28px",
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
            marginTop: "24px",
            background: "#FFF5E6",
            borderRadius: "2rem",
            padding: "18px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "16px",
            }}
          >
            {[
              { label: "Nuevas", value: lessonSummary.nuevos, color: "#9CA3AF" },
              { label: "Pendientes", value: lessonSummary.pendientes, color: "#E63946" },
              { label: "Dominadas", value: lessonSummary.dominados, color: "#4ECDC4" },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: "#FFFFFF",
                  borderRadius: "2rem",
                  padding: "18px 12px",
                  boxShadow: "0 8px 24px rgba(26,26,46,0.06)",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "15px",
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    color: "#9CA3AF",
                    textTransform: "uppercase",
                  }}
                >
                  {stat.label}
                </p>
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: "32px",
                    lineHeight: 1,
                    fontWeight: 800,
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
          marginTop: "28px",
          background: "#FFFFFF",
          borderRadius: "2rem",
          padding: "24px",
          boxShadow: "0 16px 40px rgba(26,26,46,0.08)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          {actionCards.map((card) => (
            <div
              key={card.key}
              style={{
                position: "relative",
                overflow: "hidden",
                background: card.background,
                color: card.color,
                borderRadius: "2rem",
                padding: "24px",
                minHeight: "300px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  right: "16px",
                  top: "8px",
                  fontSize: "108px",
                  fontWeight: 800,
                  lineHeight: 1,
                  opacity: 0.12,
                  color: card.color,
                  pointerEvents: "none",
                }}
              >
                {card.deco}
              </span>

              <div style={{ position: "relative", zIndex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "48px",
                    lineHeight: 0.98,
                    fontWeight: 800,
                    letterSpacing: "-0.05em",
                    color: card.color,
                  }}
                >
                  {card.title}
                </p>
                <p
                  style={{
                    margin: "16px 0 0",
                    fontSize: "24px",
                    lineHeight: 1.2,
                    fontWeight: 500,
                    color: card.color,
                    opacity: 0.92,
                    maxWidth: "280px",
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
                  background: card.buttonBackground,
                  color: card.buttonColor,
                  padding: "18px 28px",
                  fontWeight: 800,
                  fontSize: "24px",
                  cursor: "pointer",
                }}
              >
                {card.buttonLabel}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
