"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GENKI_VOCAB_BY_LESSON } from "@/lib/genki-vocab-by-lesson";
import type { GenkiVocabItem } from "@/lib/genki-vocab-by-lesson";
import { setLastActivity } from "@/lib/streak";
import { loadVocabProgress, recordVocabExposure, saveVocabProgress, type VocabProgressMap } from "@/lib/vocab-progress";
import PracticeSessionHeader from "@/components/practicar/PracticeSessionHeader";
import PracticeSessionLayout from "@/components/practicar/PracticeSessionLayout";
import { GENKI_LESSON_NAMES } from "@/lib/genki-lesson-names";

const USER_KEY = "anon";

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
  const lessonTitle = GENKI_LESSON_NAMES[lesson] ?? `Lección ${lesson}`;
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
      <PracticeSessionLayout accent="red">
        <PracticeSessionHeader
          typeLabel="Vocabulario"
          lesson={`L${lesson} · ${lessonTitle}`}
          progressCurrent={0}
          progressTotal={0}
          onExit={() => router.push("/practicar")}
        />
      </PracticeSessionLayout>
    );
  }

  return (
    <PracticeSessionLayout accent="red">
      <PracticeSessionHeader
        typeLabel="Vocabulario"
        lesson={`L${lesson} · ${lessonTitle}`}
        progressCurrent={currentCardIndex}
        progressTotal={cards.length}
        onExit={() => router.push("/practicar")}
      />

      <div style={{ marginTop: "12px", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {cardsDone ? (
          <div
            style={{
              background: "#1E2235",
              borderRadius: "24px",
              padding: "22px 20px",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: "10px",
              flex: 1,
            }}
          >
            <p style={{ fontSize: "22px", fontWeight: 800, color: "#FFFFFF", margin: 0 }}>Lección repasada</p>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.42)", margin: 0, lineHeight: 1.4 }}>
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
              onClick={() => router.push("/practicar")}
              style={{
                marginTop: "2px",
                padding: "11px 16px",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.65)",
                fontWeight: 700,
                fontSize: "13px",
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
              <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.1em", color: "rgba(255,255,255,0.42)" }}>
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
                    background: "#1E2235",
                    borderRadius: "24px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "24px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "54px",
                      fontWeight: 800,
                      color: "#FFFFFF",
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
                        color: "rgba(255,255,255,0.42)",
                        margin: 0,
                        fontFamily: "var(--font-noto-sans-jp), sans-serif",
                      }}
                    >
                      {currentCard.hira}
                    </p>
                  )}
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", margin: "16px 0 0" }}>Toca para ver el significado</p>
                </div>

                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    background: "#252B3F",
                    borderRadius: "24px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "24px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "24px",
                      fontWeight: 700,
                      color: "#FFFFFF",
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
                  border: "1px solid rgba(255,255,255,0.10)",
                  cursor: "pointer",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.65)",
                  fontWeight: 700,
                  fontSize: "15px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
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
