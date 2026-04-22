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
      key: "aprender" as const,
      title: "Aprender",
      body: "Repasa forma, lectura y significado antes de ponerte a prueba.",
      buttonLabel: "Abrir Aprender",
      onClick: goToLearnSession,
      background: recommendedMode === "aprender" ? "#FFF1F2" : "#FFF8E7",
      border: recommendedMode === "aprender" ? "1px solid rgba(230,57,70,0.22)" : "1px solid rgba(26,26,46,0.06)",
      buttonBackground: "#E63946",
      buttonColor: "#FFFFFF",
      accent: "#E63946",
      recommended: recommendedMode === "aprender",
    },
    {
      key: "practicar" as const,
      title: "Practicar",
      body: "Elige la lectura correcta y refuerza lo que ya has visto.",
      buttonLabel: nextAction.targetMode === "practicar" ? nextAction.label : "Abrir Practicar",
      onClick: goToPracticeSession,
      background: recommendedMode === "practicar" ? "#F5FCFB" : "#FFF8E7",
      border: recommendedMode === "practicar" ? "1px solid rgba(78,205,196,0.28)" : "1px solid rgba(26,26,46,0.06)",
      buttonBackground: recommendedMode === "practicar" ? "#1A1A2E" : "#4ECDC4",
      buttonColor: recommendedMode === "practicar" ? "#FFFFFF" : "#1A1A2E",
      accent: "#0F766E",
      recommended: recommendedMode === "practicar",
    },
  ];

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
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#1A1A2E" }}>Racha de {streak} días</span>
        </div>
      </div>

      <div style={{ paddingTop: "18px" }}>
        <p
          style={{
            fontSize: "40px",
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
            fontSize: "14px",
            color: "#6B7280",
            margin: "6px 0 0",
            lineHeight: 1.4,
          }}
        >
          Lectura por lección.
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
              LECCIÓN
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
              onClick={() => selectLesson(value)}
              style={{
                flexShrink: 0,
                padding: "10px 16px",
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
            background: "#FFF8E7",
            borderRadius: "18px",
            padding: "14px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "10px",
            }}
          >
            {[
              { label: "Nuevas", value: lessonSummary.nuevos },
              { label: "Pendientes", value: lessonSummary.pendientes },
              { label: "Dominadas", value: lessonSummary.dominados },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: "#FFFFFF",
                  borderRadius: "14px",
                  padding: "12px 10px 10px",
                  boxShadow: "0 2px 8px rgba(26,26,46,0.05)",
                  textAlign: "center",
                }}
              >
                <p style={{ margin: 0, fontSize: "11px", fontWeight: 800, color: "#9CA3AF", lineHeight: 1.2 }}>
                  {item.label}
                </p>
                <p style={{ margin: "5px 0 0", fontSize: "20px", fontWeight: 800, color: "#1A1A2E", lineHeight: 1 }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "18px",
          background: "#FFFFFF",
          borderRadius: "24px",
          padding: "18px",
          boxShadow: "0 8px 28px rgba(26,26,46,0.08)",
        }}
      >
        <div>
          <p style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", color: "#9CA3AF", margin: 0 }}>
            CÓMO QUIERES ESTUDIAR
          </p>
          <p style={{ fontSize: "20px", fontWeight: 800, color: "#1A1A2E", margin: "6px 0 0" }}>
            Elige entre aprender o practicar esta lección
          </p>
        </div>

        <div
          style={{
            marginTop: "14px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          {actionCards.map((action) => (
            <div
              key={action.key}
              style={{
                background: action.background,
                borderRadius: "18px",
                padding: "14px 16px",
                border: action.border,
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                <p style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#1A1A2E" }}>{action.title}</p>
                {action.recommended ? (
                  <span
                    style={{
                      background: "#FFFFFF",
                      color: action.accent,
                      borderRadius: "999px",
                      padding: "6px 10px",
                      fontSize: "11px",
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Recomendado
                  </span>
                ) : null}
              </div>
              <p style={{ margin: 0, fontSize: "14px", color: "#6B7280", lineHeight: 1.45 }}>{action.body}</p>
              {action.recommended ? (
                <p style={{ margin: 0, fontSize: "12px", color: action.accent, lineHeight: 1.35, fontWeight: 700 }}>
                  {nextAction.label}
                </p>
              ) : null}
              <button
                onClick={action.onClick}
                style={{
                  marginTop: "auto",
                  width: "100%",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  background: action.buttonBackground,
                  color: action.buttonColor,
                  fontSize: "15px",
                  fontWeight: 800,
                }}
              >
                {action.buttonLabel}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
