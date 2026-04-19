"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GENKI_VOCAB_BY_LESSON } from "@/lib/genki-vocab-by-lesson";
import type { GenkiVocabItem } from "@/lib/genki-vocab-by-lesson";
import { getStreak, setLastActivity } from "@/lib/streak";

const LESSON_LABELS: Record<number, string> = {
  1: "Saludos", 2: "Números", 3: "Familia", 4: "Horario",
  5: "Mi día", 6: "Deportes", 7: "Ciudad", 8: "Fin de semana",
  9: "Viajes", 10: "Invierno", 11: "Recuerdos", 12: "Festivales",
};

const LESSONS = Object.keys(GENKI_VOCAB_BY_LESSON)
  .map(Number)
  .sort((a, b) => a - b);

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FlashcardsPage() {
  const router = useRouter();
  const [lesson, setLesson] = useState(1);
  const [cards, setCards] = useState<GenkiVocabItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [streak, setStreak] = useState(0);
  const [done, setDone] = useState(false);
  const lessonRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStreak(getStreak());
    setLastActivity(`Flashcards · L${lesson}`, "/practicar/flashcards");
  }, [lesson]);

  useEffect(() => {
    const items = shuffle(GENKI_VOCAB_BY_LESSON[lesson] ?? []);
    setCards(items);
    setCurrentIndex(0);
    setKnown(0);
    setFlipped(false);
    setDone(false);
  }, [lesson]);

  function handleFlip() {
    setFlipped((f) => !f);
  }

  function handleKnow(knows: boolean) {
    if (done) return;
    if (knows) setKnown((k) => k + 1);
    setFlipped(false);
    if (currentIndex + 1 >= cards.length) {
      setDone(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  const card = cards[currentIndex];
  const total = cards.length;
  const progressPct = total > 0 ? ((currentIndex) / total) * 100 : 0;

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          padding: "52px 20px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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
          }}
          aria-label="Volver"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="#1A1A2E" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Streak pill center */}
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

        {/* Dots placeholder */}
        <button
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
            fontSize: "18px",
            color: "#1A1A2E",
            fontWeight: 700,
          }}
          aria-label="Opciones"
        >
          ···
        </button>
      </div>

      {/* Lesson chips */}
      <div
        ref={lessonRowRef}
        style={{
          display: "flex",
          gap: "10px",
          overflowX: "auto",
          padding: "16px 20px 0",
          scrollbarWidth: "none",
        }}
      >
        {LESSONS.map((l) => (
          <button
            key={l}
            onClick={() => setLesson(l)}
            style={{
              flexShrink: 0,
              padding: "10px 18px",
              borderRadius: "999px",
              border: "none",
              cursor: "pointer",
              background: lesson === l ? "#1A1A2E" : "#FFFFFF",
              color: lesson === l ? "#FFFFFF" : "#1A1A2E",
              fontWeight: 700,
              fontSize: "14px",
              boxShadow: lesson === l ? "none" : "0 2px 8px rgba(26,26,46,0.08)",
              whiteSpace: "nowrap",
            }}
          >
            L{l}: {LESSON_LABELS[l] ?? `Lección ${l}`}
          </button>
        ))}
      </div>

      {/* Card area */}
      <div
        style={{
          flex: 1,
          padding: "20px 20px 0",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {done ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
            }}
          >
            <p style={{ fontSize: "40px", margin: 0 }}>🎉</p>
            <p style={{ fontSize: "22px", fontWeight: 800, color: "#1A1A2E", margin: 0 }}>
              ¡Completado!
            </p>
            <p style={{ fontSize: "15px", color: "#9CA3AF", margin: 0 }}>
              {known} de {total} conocidos
            </p>
            <button
              onClick={() => {
                const items = shuffle(GENKI_VOCAB_BY_LESSON[lesson] ?? []);
                setCards(items);
                setCurrentIndex(0);
                setKnown(0);
                setFlipped(false);
                setDone(false);
              }}
              style={{
                marginTop: "8px",
                padding: "14px 32px",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                background: "#E63946",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "16px",
              }}
            >
              Reiniciar
            </button>
          </div>
        ) : card ? (
          /* Flip card */
          <div
            style={{ perspective: "1200px", flex: 1, cursor: "pointer" }}
            onClick={handleFlip}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minHeight: "340px",
                transformStyle: "preserve-3d",
                transition: "transform 0.45s cubic-bezier(0.4,0,0.2,1)",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Front */}
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
                  }}
                >
                  {card.kanji || card.hira}
                </p>
                {card.kanji && (
                  <p
                    style={{
                      fontSize: "20px",
                      color: "#9CA3AF",
                      margin: 0,
                      fontFamily: "var(--font-noto-sans-jp), sans-serif",
                    }}
                  >
                    {card.hira}
                  </p>
                )}
                <p
                  style={{
                    fontSize: "13px",
                    color: "#C4BAB0",
                    margin: "24px 0 0",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  ↻ toca para voltear
                </p>
              </div>

              {/* Back */}
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
                  {card.es}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Progress + buttons */}
      {!done && (
        <div style={{ padding: "16px 20px 48px" }}>
          {/* Progress */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em" }}>
              PROGRESO
            </span>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#E63946" }}>
              {currentIndex + 1}/{total}
            </span>
          </div>
          <div
            style={{
              height: "5px",
              background: "#E5E7EB",
              borderRadius: "999px",
              overflow: "hidden",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progressPct}%`,
                background: "#E63946",
                borderRadius: "999px",
                transition: "width 0.3s ease",
              }}
            />
          </div>

          {/* Lo sé / No lo sé */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
              No lo sé
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
              Lo sé
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
