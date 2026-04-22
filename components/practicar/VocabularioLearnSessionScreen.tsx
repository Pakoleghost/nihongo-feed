"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GENKI_VOCAB_BY_LESSON } from "@/lib/genki-vocab-by-lesson";
import type { GenkiVocabItem } from "@/lib/genki-vocab-by-lesson";
import { setLastActivity } from "@/lib/streak";
import { loadVocabProgress, recordVocabExposure, saveVocabProgress, type VocabProgressMap } from "@/lib/vocab-progress";
import PracticeSessionHeader from "@/components/practicar/PracticeSessionHeader";
import PracticeSessionLayout from "@/components/practicar/PracticeSessionLayout";

const USER_KEY = "anon";

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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Props = {
  initialLesson: number;
};

export default function VocabularioLearnSessionScreen({ initialLesson }: Props) {
  const router = useRouter();
  const learnExposureIdsRef = useRef<Set<string>>(new Set());
  const [progress, setProgress] = useState<VocabProgressMap>(() =>
    typeof window === "undefined" ? {} : loadVocabProgress(USER_KEY),
  );
  const [cards, setCards] = useState<GenkiVocabItem[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [cardsDone, setCardsDone] = useState(false);

  const lesson = initialLesson;
  const lessonTitle = LESSON_LABELS[lesson] ?? `Lección ${lesson}`;
  const lessonItems = useMemo(() => GENKI_VOCAB_BY_LESSON[lesson] ?? [], [lesson]);
  const currentCard = cards[currentCardIndex];
  const learnProgressPct = cards.length > 0 ? (currentCardIndex / cards.length) * 100 : 0;

  useEffect(() => {
    setLastActivity(`Vocabulario · Aprender · L${lesson}`, "/practicar/vocabulario");
  }, [lesson]);

  useEffect(() => {
    learnExposureIdsRef.current = new Set();
    const items = shuffle(lessonItems);
    setCards(items);
    setCurrentCardIndex(0);
    setKnown(0);
    setFlipped(false);
    setCardsDone(false);
  }, [lessonItems]);

  useEffect(() => {
    if (!currentCard) return;
    const itemId = `${lesson}:${currentCard.kanji || currentCard.hira}:${currentCard.hira}:${currentCard.es}`;
    if (learnExposureIdsRef.current.has(itemId)) return;
    learnExposureIdsRef.current.add(itemId);
    setProgress((previous) => {
      const next = recordVocabExposure(previous, lesson, currentCard);
      saveVocabProgress(USER_KEY, next);
      return next;
    });
  }, [lesson, currentCard]);

  function restartLearnSession() {
    learnExposureIdsRef.current = new Set();
    const items = shuffle(lessonItems);
    setCards(items);
    setCurrentCardIndex(0);
    setKnown(0);
    setFlipped(false);
    setCardsDone(false);
  }

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

  if (lessonItems.length === 0) {
    return (
      <PracticeSessionLayout>
        <PracticeSessionHeader
          moduleName="Vocabulario"
          lesson={lesson}
          lessonTitle={lessonTitle}
          sessionLabel="Aprender vocabulario"
          sessionHelper="No hay vocabulario en esta lección."
          progressCurrent={0}
          progressTotal={0}
          progressPct={0}
          metricLabel="marcadas"
          metricValue={0}
          accentColor="#E63946"
          accentSurface="rgba(230,57,70,0.10)"
          onExit={() => router.push(`/practicar/vocabulario?lesson=${lesson}`)}
        />
      </PracticeSessionLayout>
    );
  }

  return (
    <PracticeSessionLayout>
      <PracticeSessionHeader
        moduleName="Vocabulario"
        lesson={lesson}
        lessonTitle={lessonTitle}
        sessionLabel="Aprender vocabulario"
        sessionHelper="Mira las palabras nuevas antes de practicar."
        progressCurrent={currentCardIndex + 1}
        progressTotal={cards.length}
        progressPct={learnProgressPct}
        metricLabel="recordadas"
        metricValue={known}
        accentColor="#E63946"
        accentSurface="rgba(230,57,70,0.10)"
        onExit={() => router.push(`/practicar/vocabulario?lesson=${lesson}`)}
      />

      <div style={{ marginTop: "12px", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {cardsDone ? (
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
              Conocías {known} de {cards.length}.
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
                onClick={() => router.push(`/practicar/vocabulario/practicar?lesson=${lesson}`)}
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
              onClick={() => router.push(`/practicar/vocabulario?lesson=${lesson}`)}
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
        ) : currentCard ? (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.1em", color: "#9CA3AF" }}>
                REPASO
              </span>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#E63946" }}>
                {known} conocidas
              </span>
            </div>

            <div style={{ perspective: "1200px", cursor: "pointer" }} onClick={() => setFlipped((value) => !value)}>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  minHeight: "280px",
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
                    gap: "6px",
                    padding: "24px",
                    boxShadow: "0 8px 32px rgba(26,26,46,0.09)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "54px",
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
                        fontSize: "18px",
                        color: "#9CA3AF",
                        margin: 0,
                        fontFamily: "var(--font-noto-sans-jp), sans-serif",
                      }}
                    >
                      {currentCard.hira}
                    </p>
                  )}
                  <p style={{ fontSize: "12px", color: "#C4BAB0", margin: "16px 0 0" }}>Toca para ver el significado</p>
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
                    padding: "24px",
                    boxShadow: "0 8px 32px rgba(26,26,46,0.09)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "24px",
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "12px" }}>
              <button
                onClick={() => handleKnow(false)}
                style={{
                  padding: "16px 12px",
                  borderRadius: "999px",
                  border: "none",
                  cursor: "pointer",
                  background: "#E63946",
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: "15px",
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
                  padding: "16px 12px",
                  borderRadius: "999px",
                  border: "none",
                  cursor: "pointer",
                  background: "#4ECDC4",
                  color: "#1A1A2E",
                  fontWeight: 700,
                  fontSize: "15px",
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
        ) : null}
      </div>
    </PracticeSessionLayout>
  );
}
