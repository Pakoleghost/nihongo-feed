"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GENKI_KANJI_BY_LESSON } from "@/lib/genki-kanji-by-lesson";
import type { GenkiKanjiItem } from "@/lib/genki-kanji-by-lesson";
import { setLastActivity } from "@/lib/streak";
import { loadKanjiProgress, recordKanjiExposure, saveKanjiProgress, type KanjiProgressMap } from "@/lib/kanji-progress";
import PracticeSessionHeader from "@/components/practicar/PracticeSessionHeader";
import PracticeSessionLayout from "@/components/practicar/PracticeSessionLayout";

const USER_KEY = "anon";

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

const KANJI_ENTRY_TYPE_PRIORITY: Record<GenkiKanjiItem["entry_type"], number> = {
  word: 0,
  verb: 1,
  adjective_i: 2,
  na_adjective: 3,
  suru_verb: 4,
  single_kanji_word: 5,
  weekday: 6,
  phrase: 7,
  time_expression: 8,
  proper_name: 9,
};

function compareByKanjiPriority(a: GenkiKanjiItem, b: GenkiKanjiItem) {
  const rankDiff = KANJI_ENTRY_TYPE_PRIORITY[a.entry_type] - KANJI_ENTRY_TYPE_PRIORITY[b.entry_type];
  if (rankDiff !== 0) return rankDiff;

  const rowDiff = a.source_row - b.source_row;
  if (rowDiff !== 0) return rowDiff;

  return a.kanji.localeCompare(b.kanji, "ja");
}

type Props = {
  initialLesson: number;
};

export default function KanjiLearnSessionScreen({ initialLesson }: Props) {
  const router = useRouter();
  const learnExposureIdsRef = useRef<Set<string>>(new Set());
  const [progress, setProgress] = useState<KanjiProgressMap>(() =>
    typeof window === "undefined" ? {} : loadKanjiProgress(USER_KEY),
  );
  const [currentStudyIndex, setCurrentStudyIndex] = useState(0);
  const [studyComplete, setStudyComplete] = useState(false);

  const lesson = initialLesson;
  const lessonTitle = LESSON_LABELS[lesson] ?? `Lección ${lesson}`;
  const lessonItems = useMemo(() => GENKI_KANJI_BY_LESSON[lesson] ?? [], [lesson]);
  const studyItems = useMemo(() => [...lessonItems].sort(compareByKanjiPriority), [lessonItems]);
  const currentStudyItem = studyItems[currentStudyIndex];
  const studyProgressPct = studyItems.length > 0 ? (currentStudyIndex / studyItems.length) * 100 : 0;

  useEffect(() => {
    setLastActivity(`Kanji · Aprender · L${lesson}`, "/practicar/kanji");
  }, [lesson]);

  useEffect(() => {
    learnExposureIdsRef.current = new Set();
    setCurrentStudyIndex(0);
    setStudyComplete(false);
  }, [studyItems]);

  useEffect(() => {
    if (!currentStudyItem) return;
    const itemId = `${lesson}:${currentStudyItem.kanji}:${currentStudyItem.hira}:${currentStudyItem.es}`;
    if (learnExposureIdsRef.current.has(itemId)) return;
    learnExposureIdsRef.current.add(itemId);
    setProgress((previous) => {
      const next = recordKanjiExposure(previous, lesson, currentStudyItem);
      saveKanjiProgress(USER_KEY, next);
      return next;
    });
  }, [lesson, currentStudyItem]);

  function restartLearnSession() {
    learnExposureIdsRef.current = new Set();
    setCurrentStudyIndex(0);
    setStudyComplete(false);
  }

  function handleNext() {
    if (currentStudyIndex + 1 >= studyItems.length) {
      setStudyComplete(true);
      return;
    }
    setCurrentStudyIndex((value) => value + 1);
  }

  if (lessonItems.length === 0) {
    return (
      <PracticeSessionLayout>
        <PracticeSessionHeader
          moduleName="Kanji"
          lesson={lesson}
          lessonTitle={lessonTitle}
          sessionLabel="Aprender la lección"
          sessionHelper="No hay palabras con kanji disponibles para esta lección."
          progressCurrent={0}
          progressTotal={0}
          progressPct={0}
          metricLabel="vistos"
          metricValue={0}
          accentColor="#E63946"
          accentSurface="rgba(230,57,70,0.10)"
          onExit={() => router.push(`/practicar/kanji?lesson=${lesson}`)}
        />
      </PracticeSessionLayout>
    );
  }

  return (
    <PracticeSessionLayout>
      <PracticeSessionHeader
        moduleName="Kanji"
        lesson={lesson}
        lessonTitle={lessonTitle}
        sessionLabel="Aprender la lección"
        sessionHelper="Estudia forma, lectura y significado antes de practicar la lectura."
        progressCurrent={currentStudyIndex + 1}
        progressTotal={studyItems.length}
        progressPct={studyProgressPct}
        metricLabel="vistos"
        metricValue={Math.min(currentStudyIndex + 1, studyItems.length)}
        accentColor="#E63946"
        accentSurface="rgba(230,57,70,0.10)"
        onExit={() => router.push(`/practicar/kanji?lesson=${lesson}`)}
      />

      <div style={{ marginTop: "18px", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {studyComplete ? (
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
            <p style={{ fontSize: "15px", color: "#6B7280", margin: 0, lineHeight: 1.45 }}>
              Revisaste {studyItems.length} palabras con kanji de esta lección.
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
                onClick={() => router.push(`/practicar/kanji/practicar?lesson=${lesson}`)}
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
            <button
              onClick={() => router.push(`/practicar/kanji?lesson=${lesson}`)}
              style={{
                marginTop: "4px",
                padding: "12px 18px",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                background: "#FFFFFF",
                color: "#1A1A2E",
                fontWeight: 700,
                fontSize: "14px",
                boxShadow: "0 2px 10px rgba(26,26,46,0.08)",
              }}
            >
              Volver al módulo
            </button>
          </div>
        ) : currentStudyItem ? (
          <>
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
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#E63946" }}>Lectura + apoyo</span>
            </div>

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
                flex: 1,
                justifyContent: "center",
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
                onClick={handleNext}
                style={{
                  padding: "16px 12px",
                  borderRadius: "999px",
                  border: "none",
                  cursor: "pointer",
                  background: "#4ECDC4",
                  color: "#1A1A2E",
                  fontWeight: 800,
                  fontSize: "16px",
                  boxShadow: "0 4px 16px rgba(78,205,196,0.28)",
                }}
              >
                {currentStudyIndex + 1 >= studyItems.length ? "Terminar" : "Siguiente"}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </PracticeSessionLayout>
  );
}
