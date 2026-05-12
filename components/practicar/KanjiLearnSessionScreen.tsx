"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GENKI_KANJI_BY_LESSON } from "@/lib/genki-kanji-by-lesson";
import type { GenkiKanjiItem } from "@/lib/genki-kanji-by-lesson";
import { setLastActivity } from "@/lib/streak";
import { loadKanjiProgress, recordKanjiExposure, saveKanjiProgress, type KanjiProgressMap } from "@/lib/kanji-progress";
import PracticeSessionHeader from "@/components/practicar/PracticeSessionHeader";
import PracticeSessionLayout from "@/components/practicar/PracticeSessionLayout";
import { GENKI_LESSON_NAMES } from "@/lib/genki-lesson-names";

const USER_KEY = "anon";

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
  const lessonTitle = GENKI_LESSON_NAMES[lesson] ?? `Lección ${lesson}`;
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
          progressCurrent={0}
          progressTotal={0}
          progressPct={0}
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
        progressCurrent={currentStudyIndex + 1}
        progressTotal={studyItems.length}
        progressPct={studyProgressPct}
        accentColor="#E63946"
        accentSurface="rgba(230,57,70,0.10)"
        onExit={() => router.push(`/practicar/kanji?lesson=${lesson}`)}
      />

      <div style={{ marginTop: "12px", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {studyComplete ? (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "24px",
              padding: "22px 20px",
              boxShadow: "0 8px 28px rgba(26,26,46,0.08)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: "10px",
              flex: 1,
            }}
          >
            <p style={{ fontSize: "22px", fontWeight: 800, color: "#1A1A2E", margin: 0 }}>Lección repasada</p>
            <p style={{ fontSize: "14px", color: "#6B7280", margin: 0, lineHeight: 1.4 }}>
              Revisaste {studyItems.length} palabras.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", width: "100%", marginTop: "4px" }}>
              <button
                onClick={restartLearnSession}
                style={{
                  padding: "13px 16px",
                  borderRadius: "999px",
                  border: "none",
                  cursor: "pointer",
                  background: "#E63946",
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: "14px",
                }}
              >
                Repetir lección
              </button>
              <button
                onClick={() => router.push(`/practicar/kanji/practicar?lesson=${lesson}`)}
                style={{
                  padding: "13px 16px",
                  borderRadius: "999px",
                  border: "none",
                  cursor: "pointer",
                  background: "#4ECDC4",
                  color: "#1A1A2E",
                  fontWeight: 800,
                  fontSize: "14px",
                }}
              >
                Ir a practicar
              </button>
            </div>
            <button
              onClick={() => router.push(`/practicar/kanji?lesson=${lesson}`)}
              style={{
                marginTop: "2px",
                padding: "11px 16px",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                background: "#FFFFFF",
                color: "#1A1A2E",
                fontWeight: 700,
                fontSize: "13px",
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
                background: "#FFFFFF",
                borderRadius: 20,
                padding: "28px 24px",
                boxShadow: "0 4px 20px rgba(26,26,46,0.08)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              {/* Big kanji */}
              <p
                style={{
                  fontSize: 68,
                  fontWeight: 800,
                  color: "#1A1A2E",
                  margin: 0,
                  fontFamily: "var(--font-noto-sans-jp), sans-serif",
                  lineHeight: 1,
                }}
              >
                {currentStudyItem.kanji}
              </p>

              {/* Reading */}
              <p
                style={{
                  margin: "14px 0 0",
                  fontSize: 24,
                  color: "#53596B",
                  fontFamily: "var(--font-noto-sans-jp), sans-serif",
                }}
              >
                {currentStudyItem.hira}
              </p>

              {/* Divider */}
              <div style={{ width: 40, height: 1, background: "#F0EDE8", margin: "16px 0" }} />

              {/* Meaning */}
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1A1A2E", lineHeight: 1.4 }}>
                {currentStudyItem.es}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "12px" }}>
              <button
                onClick={() => setCurrentStudyIndex((value) => Math.max(0, value - 1))}
                disabled={currentStudyIndex === 0}
                style={{
                  padding: "14px 12px",
                  borderRadius: "999px",
                  border: "none",
                  cursor: currentStudyIndex === 0 ? "default" : "pointer",
                  background: currentStudyIndex === 0 ? "#E5E7EB" : "#FFFFFF",
                  color: currentStudyIndex === 0 ? "#9CA3AF" : "#1A1A2E",
                  fontWeight: 700,
                  fontSize: "15px",
                  boxShadow: currentStudyIndex === 0 ? "none" : "0 4px 16px rgba(26,26,46,0.08)",
                }}
              >
                Anterior
              </button>
              <button
                onClick={handleNext}
                style={{
                  padding: "14px 12px",
                  borderRadius: "999px",
                  border: "none",
                  cursor: "pointer",
                  background: "#4ECDC4",
                  color: "#1A1A2E",
                  fontWeight: 800,
                  fontSize: "15px",
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
