"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GENKI_VOCAB_BY_LESSON } from "@/lib/genki-vocab-by-lesson";
import type { GenkiVocabItem } from "@/lib/genki-vocab-by-lesson";
import { setLastActivity } from "@/lib/streak";
import { GENKI_LESSON_NAMES } from "@/lib/genki-lesson-names";
import {
  loadVocabProgress,
  recordVocabResult,
  saveVocabProgress,
} from "@/lib/vocab-progress";

const LESSONS = Object.keys(GENKI_VOCAB_BY_LESSON)
  .map(Number)
  .sort((a, b) => a - b);

const USER_KEY = "anon";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Proyectar overlay ─────────────────────────────────────────────────────────

function ProyectarOverlay({
  card,
  lesson,
  currentIndex,
  total,
  onClose,
  onNext,
}: {
  card: GenkiVocabItem;
  lesson: number;
  currentIndex: number;
  total: number;
  onClose: () => void;
  onNext: () => void;
}) {
  const [revealed, setRevealed] = useState(false);

  function handleTap() {
    if (!revealed) {
      setRevealed(true);
    } else {
      setRevealed(false);
      onNext();
    }
  }

  return (
    <div
      onClick={handleTap}
      style={{
        position: "fixed",
        inset: 0,
        background: "#1A1A2E",
        zIndex: 300,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{
          position: "absolute", top: 24, right: 24,
          width: 40, height: 40, borderRadius: "50%",
          background: "rgba(255,255,255,0.12)", border: "none",
          cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", color: "rgba(255,255,255,0.7)",
          fontSize: 20, zIndex: 1,
        }}
        aria-label="Salir del modo proyectar"
      >×</button>

      <p style={{
        position: "absolute", top: 32, left: "50%",
        transform: "translateX(-50%)",
        fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.35)",
        letterSpacing: "0.08em", margin: 0,
      }}>
        L{lesson} · {currentIndex + 1}/{total}
      </p>

      <div style={{ textAlign: "center" }}>
        <p style={{
          fontSize: "clamp(64px, 12vw, 120px)", fontWeight: 800,
          color: "#FFFFFF", margin: 0, lineHeight: 1,
          fontFamily: "var(--font-noto-serif-jp), serif",
        }}>
          {card.kanji || card.hira}
        </p>
        {card.kanji && (
          <p style={{
            fontSize: "clamp(24px, 4vw, 40px)",
            color: "rgba(255,255,255,0.45)", margin: "12px 0 0",
            fontFamily: "var(--font-noto-sans-jp), sans-serif",
          }}>
            {card.hira}
          </p>
        )}
      </div>

      <div style={{ marginTop: 40, minHeight: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {revealed ? (
          <p style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 700, color: "#4ECDC4", margin: 0, textAlign: "center", padding: "0 32px" }}>
            {card.es}
          </p>
        ) : (
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.25)", margin: 0, letterSpacing: "0.06em", fontWeight: 600 }}>
            toca para revelar
          </p>
        )}
      </div>

      {revealed && (
        <p style={{ position: "absolute", bottom: 48, fontSize: 13, color: "rgba(255,255,255,0.3)", margin: 0, letterSpacing: "0.04em", fontWeight: 600 }}>
          toca de nuevo para continuar →
        </p>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

type VocabularioFlashcardsScreenProps = {
  activityPath: string;
  activityLabelPrefix: string;
  backHref?: string;
  initialLesson?: number;
};

export default function VocabularioFlashcardsScreen({
  activityPath,
  activityLabelPrefix,
  backHref = "/practicar",
  initialLesson,
}: VocabularioFlashcardsScreenProps) {
  const router = useRouter();
  const [lesson, setLesson] = useState(initialLesson && LESSONS.includes(initialLesson) ? initialLesson : 1);
  const [cards, setCards] = useState<GenkiVocabItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [missed, setMissed] = useState<GenkiVocabItem[]>([]);
  const [done, setDone] = useState(false);
  const [proyectar, setProyectar] = useState(false);
  const lessonRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLastActivity(`${activityLabelPrefix} · L${lesson}`, activityPath);
  }, [activityLabelPrefix, activityPath, lesson]);

  useEffect(() => {
    const items = shuffle(GENKI_VOCAB_BY_LESSON[lesson] ?? []);
    setCards(items);
    setCurrentIndex(0);
    setKnown(0);
    setMissed([]);
    setFlipped(false);
    setDone(false);
  }, [lesson]);

  function handleFlip() { setFlipped((f) => !f); }

  function handleKnow(knows: boolean) {
    if (done || !card) return;

    // Persist to vocab SRS progress
    const prog = loadVocabProgress(USER_KEY);
    const updated = recordVocabResult(prog, lesson, card, knows ? "correct" : "wrong");
    saveVocabProgress(USER_KEY, updated);

    if (knows) {
      setKnown((k) => k + 1);
    } else {
      setMissed((m) => [...m, card]);
    }

    setFlipped(false);
    if (currentIndex + 1 >= cards.length) {
      setDone(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  function restartWithMissed() {
    setCards(shuffle(missed));
    setMissed([]);
    setCurrentIndex(0);
    setKnown(0);
    setFlipped(false);
    setDone(false);
  }

  function restartAll() {
    const items = shuffle(GENKI_VOCAB_BY_LESSON[lesson] ?? []);
    setCards(items);
    setCurrentIndex(0);
    setKnown(0);
    setMissed([]);
    setFlipped(false);
    setDone(false);
  }

  const card = cards[currentIndex];
  const total = cards.length;
  const progressPct = total > 0 ? (currentIndex / total) * 100 : 0;
  const pct = total > 0 ? Math.round((known / total) * 100) : 0;

  return (
    <div style={{ background: "#FFF8E7", height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "52px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <button
          onClick={() => router.push(backHref)}
          style={{ width: 36, height: 36, borderRadius: "50%", background: "#FFFFFF", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(26,26,46,0.10)", flexShrink: 0 }}
          aria-label="Volver"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="#1A1A2E" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>

        <span style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", flex: 1, textAlign: "center" }}>
          Flashcards · L{lesson}
        </span>

        <button
          onClick={() => setProyectar(true)}
          title="Proyectar"
          style={{ width: 36, height: 36, borderRadius: "50%", background: "#FFFFFF", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(26,26,46,0.10)", flexShrink: 0 }}
          aria-label="Modo proyectar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="4" width="20" height="14" rx="2" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round"/>
            <path d="M8 20h8M12 18v2" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Lesson selector — compact, just L# */}
      <div
        ref={lessonRowRef}
        style={{ display: "flex", gap: 8, overflowX: "auto", padding: "10px 20px 0", scrollbarWidth: "none" }}
      >
        {LESSONS.map((l) => (
          <button
            key={l}
            onClick={() => setLesson(l)}
            style={{
              flexShrink: 0, padding: "6px 12px", borderRadius: 999, border: "none", cursor: "pointer",
              background: lesson === l ? "#1A1A2E" : "#FFFFFF",
              color: lesson === l ? "#FFFFFF" : "#9CA3AF",
              fontWeight: 700, fontSize: 12,
              boxShadow: lesson === l ? "none" : "0 1px 4px rgba(26,26,46,0.07)",
            }}
          >
            L{l}
          </button>
        ))}
      </div>

      {/* Card area */}
      <div style={{ flex: 1, minHeight: 0, padding: "20px 20px 0", display: "flex", flexDirection: "column" }}>
        {done ? (
          /* ── Completion screen ── */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 26, fontWeight: 800, color: "#1A1A2E", margin: 0 }}>
                {pct === 100 ? "¡Sesión perfecta!" : pct >= 70 ? "¡Buen repaso!" : "Sesión completada"}
              </p>
              <p style={{ fontSize: 14, color: "#9CA3AF", margin: "6px 0 0" }}>
                {GENKI_LESSON_NAMES[lesson] ?? `Lección ${lesson}`}
              </p>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ textAlign: "center", background: "rgba(78,205,196,0.12)", borderRadius: 14, padding: "14px 20px" }}>
                <p style={{ fontSize: 32, fontWeight: 800, color: "#178A83", margin: 0, lineHeight: 1 }}>{known}</p>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", margin: "4px 0 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Conocidas</p>
              </div>
              {missed.length > 0 && (
                <div style={{ textAlign: "center", background: "rgba(230,57,70,0.08)", borderRadius: 14, padding: "14px 20px" }}>
                  <p style={{ fontSize: 32, fontWeight: 800, color: "#E63946", margin: 0, lineHeight: 1 }}>{missed.length}</p>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", margin: "4px 0 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Falladas</p>
                </div>
              )}
            </div>

            {/* Missed words preview */}
            {missed.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 320 }}>
                {missed.slice(0, 8).map((item, i) => (
                  <span key={i} style={{ fontSize: 18, fontWeight: 700, color: "#E63946", background: "rgba(230,57,70,0.07)", borderRadius: 8, padding: "4px 10px", fontFamily: "var(--font-noto-serif-jp), serif" }}>
                    {item.kanji || item.hira}
                  </span>
                ))}
                {missed.length > 8 && (
                  <span style={{ fontSize: 13, color: "#9CA3AF", alignSelf: "center" }}>+{missed.length - 8} más</span>
                )}
              </div>
            )}

            {/* CTAs */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 320 }}>
              {missed.length > 0 && (
                <button
                  onClick={restartWithMissed}
                  style={{ width: "100%", padding: "16px", borderRadius: 14, border: "none", cursor: "pointer", background: "#1A1A2E", color: "#FFFFFF", fontSize: 16, fontWeight: 800 }}
                >
                  Repasar {missed.length} falladas
                </button>
              )}
              <button
                onClick={restartAll}
                style={{ width: "100%", padding: missed.length > 0 ? "12px" : "16px", borderRadius: 14, border: "none", cursor: "pointer", background: missed.length > 0 ? "rgba(26,26,46,0.06)" : "#E63946", color: missed.length > 0 ? "#9CA3AF" : "#FFFFFF", fontSize: missed.length > 0 ? 14 : 16, fontWeight: 700 }}
              >
                {missed.length > 0 ? "Reiniciar todo el mazo" : "Reiniciar"}
              </button>
            </div>
          </div>
        ) : card ? (
          /* ── Flashcard ── */
          <div style={{ perspective: "1200px", flex: 1, cursor: "pointer" }} onClick={handleFlip}>
            <div
              style={{
                position: "relative", width: "100%", height: "100%", minHeight: 340,
                transformStyle: "preserve-3d",
                transition: "transform 0.45s cubic-bezier(0.4,0,0.2,1)",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Front */}
              <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", background: "#FFFFFF", borderRadius: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 28, overflow: "hidden", boxShadow: "0 4px 16px rgba(26,26,46,0.08)" }}>
                {/* Corner fold */}
                <div style={{ position: "absolute", top: 0, right: 0, width: 44, height: 44, background: "#4ECDC4", borderBottomLeftRadius: 44 }} />
                <p style={{ fontSize: "clamp(28px, 11vw, 64px)", fontWeight: 800, color: "#1A1A2E", margin: 0, fontFamily: "var(--font-noto-sans-jp), sans-serif", lineHeight: 1.1, textAlign: "center", wordBreak: "break-word" }}>
                  {card.kanji || card.hira}
                </p>
                {card.kanji && (
                  <p style={{ fontSize: 18, color: "#9CA3AF", margin: 0, fontFamily: "var(--font-noto-sans-jp), sans-serif" }}>
                    {card.hira}
                  </p>
                )}
                <p style={{ fontSize: 12, color: "#C4BAB0", margin: "20px 0 0" }}>
                  ↻ toca para voltear
                </p>
              </div>

              {/* Back */}
              <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)", background: "#1A1A2E", borderRadius: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, overflow: "hidden", boxShadow: "0 4px 16px rgba(26,26,46,0.18)" }}>
                {/* Corner fold */}
                <div style={{ position: "absolute", top: 0, right: 0, width: 44, height: 44, background: "#E63946", borderBottomLeftRadius: 44 }} />
                <p style={{ fontSize: 28, fontWeight: 800, color: "#FFFFFF", margin: 0, textAlign: "center", lineHeight: 1.3 }}>
                  {card.es}
                </p>
                <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", margin: "12px 0 0", fontFamily: "var(--font-noto-sans-jp), sans-serif" }}>
                  {card.hira}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Proyectar overlay */}
      {proyectar && card && (
        <ProyectarOverlay
          card={card} lesson={lesson} currentIndex={currentIndex} total={total}
          onClose={() => setProyectar(false)}
          onNext={() => {
            setFlipped(false);
            if (currentIndex + 1 >= cards.length) { setDone(true); setProyectar(false); }
            else setCurrentIndex((i) => i + 1);
          }}
        />
      )}

      {/* Progress + action buttons */}
      {!done && (
        <div style={{ padding: "12px 20px", paddingBottom: "max(28px, env(safe-area-inset-bottom, 28px))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1, height: 3, background: "#E5E7EB", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progressPct}%`, background: "#1A1A2E", borderRadius: 999, transition: "width 0.3s ease" }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", flexShrink: 0 }}>
              {currentIndex + 1}/{total}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button
              onClick={() => handleKnow(false)}
              style={{ padding: "18px 12px", borderRadius: 14, border: "none", cursor: "pointer", background: "#FFFFFF", color: "#53596B", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 2px 8px rgba(26,26,46,0.08)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              No lo sé
            </button>
            <button
              onClick={() => handleKnow(true)}
              style={{ padding: "18px 12px", borderRadius: 14, border: "none", cursor: "pointer", background: "#1A1A2E", color: "#FFFFFF", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(26,26,46,0.18)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Lo sé
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
