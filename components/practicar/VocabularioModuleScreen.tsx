"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GENKI_VOCAB_BY_LESSON } from "@/lib/genki-vocab-by-lesson";
import { getStreak, setLastActivity } from "@/lib/streak";
import { getVocabLessonSummary, loadVocabProgress, type VocabProgressMap } from "@/lib/vocab-progress";
import { getPracticeNextAction, getPracticeSessionContext } from "@/lib/practice-srs";

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
  const lessonHelper =
    lessonSummary.pendientes > 0
      ? `Tienes ${lessonSummary.pendientes} pendientes en esta lección.`
      : lessonSummary.debiles > 0
        ? `Hay ${lessonSummary.debiles} palabras débiles por reforzar.`
        : lessonSummary.solo_expuestos > 0
          ? `Ya viste ${lessonSummary.solo_expuestos} en Aprender. Practica para reforzarlas.`
          : lessonSummary.dominados > 0
            ? `Ya dominaste ${lessonSummary.dominados} palabras en esta lección.`
            : `Aún tienes ${lessonSummary.nuevos} palabras nuevas por trabajar.`;

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

  const secondaryAction =
    nextAction.targetMode === "aprender"
      ? {
          label: "Practicar lección",
          helper: "Haz una sesión objetiva con el vocabulario de esta lección.",
          onClick: goToPracticeSession,
          background: "#4ECDC4",
          color: "#1A1A2E",
        }
      : {
          label: "Abrir Aprender",
          helper: "Repasa primero las tarjetas y el significado.",
          onClick: goToLearnSession,
          background: "#FFFFFF",
          color: "#1A1A2E",
        };

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
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#E63946" }}>Racha de {streak} días</span>
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
          Elige una lección, revisa tu progreso y entra a estudiar o practicar.
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
              onClick={() => selectLesson(value)}
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
            background: "#FFF8E7",
            borderRadius: "18px",
            padding: "14px 14px 12px",
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
              { label: "Nuevos", value: lessonSummary.nuevos },
              { label: "Aprendiendo", value: lessonSummary.aprendiendo },
              { label: "En repaso", value: lessonSummary.en_repaso },
              { label: "Dominados", value: lessonSummary.dominados },
              { label: "Pendientes", value: lessonSummary.pendientes },
              { label: "Débiles", value: lessonSummary.debiles },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: "#FFFFFF",
                  borderRadius: "14px",
                  padding: "10px 10px 9px",
                  boxShadow: "0 2px 8px rgba(26,26,46,0.05)",
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

          <p style={{ margin: "10px 2px 0", fontSize: "13px", color: "#6B7280", lineHeight: 1.35 }}>{lessonHelper}</p>
        </div>
      </div>

      <div
        style={{
          marginTop: "18px",
          background: "#FFFFFF",
          borderRadius: "24px",
          padding: "18px",
          boxShadow: "0 8px 28px rgba(26,26,46,0.08)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div>
          <p style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", color: "#9CA3AF", margin: 0 }}>
            SIGUIENTE PASO
          </p>
          <p style={{ fontSize: "20px", fontWeight: 800, color: "#1A1A2E", margin: "6px 0 0" }}>{nextAction.label}</p>
          <p style={{ fontSize: "14px", color: "#6B7280", margin: "4px 0 0", lineHeight: 1.45 }}>{nextAction.helper}</p>
        </div>

        <button
          onClick={nextAction.targetMode === "aprender" ? goToLearnSession : goToPracticeSession}
          style={{
            width: "100%",
            border: "none",
            cursor: "pointer",
            borderRadius: "16px",
            padding: "15px 16px",
            background: nextAction.targetMode === "aprender" ? "#E63946" : "#1A1A2E",
            color: "#FFFFFF",
            fontSize: "16px",
            fontWeight: 800,
            boxShadow: "0 6px 18px rgba(26,26,46,0.12)",
          }}
        >
          {nextAction.label}
        </button>

        <div
          style={{
            background: "#FFF8E7",
            borderRadius: "18px",
            padding: "14px 16px",
          }}
        >
          <p style={{ margin: 0, fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", color: "#9CA3AF" }}>
            OTRA OPCIÓN
          </p>
          <p style={{ margin: "6px 0 0", fontSize: "16px", fontWeight: 800, color: "#1A1A2E" }}>
            {secondaryAction.label}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#6B7280", lineHeight: 1.45 }}>
            {secondaryAction.helper}
          </p>
          <button
            onClick={secondaryAction.onClick}
            style={{
              marginTop: "12px",
              width: "100%",
              border: "none",
              cursor: "pointer",
              borderRadius: "14px",
              padding: "14px 16px",
              background: secondaryAction.background,
              color: secondaryAction.color,
              fontSize: "15px",
              fontWeight: 800,
            }}
          >
            {secondaryAction.label}
          </button>
        </div>
      </div>
    </div>
  );
}
