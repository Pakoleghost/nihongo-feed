"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GENKI_VOCAB_BY_LESSON } from "@/lib/genki-vocab-by-lesson";
import { getStreak, setLastActivity } from "@/lib/streak";
import { getVocabLessonSummary, loadVocabProgress, type VocabProgressMap } from "@/lib/vocab-progress";
import { getPracticeNextAction, getPracticeSessionContext } from "@/lib/practice-srs";
import ModuleActionChoices from "@/components/practicar/ModuleActionChoices";

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

const USER_KEY = "anon";

type VocabularioModuleScreenProps = {
  initialLesson?: number;
};

export default function VocabularioModuleScreen({ initialLesson }: VocabularioModuleScreenProps) {
  const router = useRouter();
  const [lesson, setLesson] = useState(() =>
    initialLesson && LESSONS.includes(initialLesson) ? initialLesson : 1,
  );
  const [streak, setStreak] = useState(0);
  const [progress, setProgress] = useState<VocabProgressMap>({});

  const lessonItems = useMemo(() => GENKI_VOCAB_BY_LESSON[lesson] ?? [], [lesson]);
  const lessonTitle = LESSON_LABELS[lesson] ?? `Lección ${lesson}`;
  const lessonSummary = useMemo(
    () => getVocabLessonSummary(lesson, lessonItems, progress),
    [lesson, lessonItems, progress],
  );
  const nextAction = useMemo(() => getPracticeNextAction(lessonSummary), [lessonSummary]);
  const practiceSessionContext = useMemo(() => getPracticeSessionContext(lessonSummary), [lessonSummary]);
  const recommendedMode = nextAction.targetMode;

  useEffect(() => {
    setStreak(getStreak());
    setProgress(loadVocabProgress(USER_KEY));
  }, []);

  useEffect(() => {
    if (!initialLesson || !LESSONS.includes(initialLesson)) return;
    setLesson(initialLesson);
  }, [initialLesson]);

  useEffect(() => {
    setLastActivity(`Vocabulario · L${lesson}`, "/practicar/vocabulario");
  }, [lesson]);

  function selectLesson(nextLesson: number) {
    setLesson(nextLesson);
    router.replace(`/practicar/vocabulario?lesson=${nextLesson}`, { scroll: false });
  }

  function goToLearnSession() {
    router.push(`/practicar/vocabulario/aprender?lesson=${lesson}`);
  }

  function goToPracticeSession() {
    const params = new URLSearchParams({ lesson: String(lesson), focus: practiceSessionContext.sortKey });
    router.push(`/practicar/vocabulario/practicar?${params.toString()}`);
  }

  const actionCards = [
    {
      title: "Aprender",
      subtitle: "Repasa palabras nuevas",
      buttonLabel: "Empezar",
      accent: "teal" as const,
      onClick: goToLearnSession,
    },
    {
      title: "Practicar",
      subtitle: "Pon a prueba lo que sabes",
      buttonLabel: "Empezar",
      accent: "red" as const,
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
            background: "rgba(230,57,70,0.10)",
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#E63946",
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
          Vocabulario
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
          Vocabulario por lección.
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

      <ModuleActionChoices
        recommendedMode={recommendedMode}
        learnCard={actionCards[0]}
        practiceCard={actionCards[1]}
      />
    </div>
  );
}
