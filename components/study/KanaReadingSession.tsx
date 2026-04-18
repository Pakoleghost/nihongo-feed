"use client";

import { useEffect, useRef, useState } from "react";
import { DS } from "./ds";

// ─── Types ────────────────────────────────────────────────────────────────────

export type KanaSessionFeedback = {
  status: "correct" | "wrong";
  userAnswer: string;
  correctAnswer: string;
};

export type KanaSessionSummaryData = {
  correct: number;
  wrong: number;
  total: number;
  durationMs: number;
  streak: number;
  newlySet: Array<{ kana: string; romaji: string }>;
  upNextLabel?: string;
  upNextKana?: string;
};

type Props = {
  open: boolean;
  visible: boolean;
  /** Kana character to display */
  kana: string;
  /** Expected romaji answer */
  romaji: string;
  /** Optional memory hint shown in question */
  hint?: string;
  /** 1-based current question index */
  questionIndex: number;
  totalQuestions: number;
  feedback: KanaSessionFeedback | null;
  isFinished: boolean;
  summary: KanaSessionSummaryData | null;
  onAnswer: (value: string) => void;
  onDontKnow: () => void;
  onNext: () => void;
  onRestart: () => void;
  onClose: () => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ─── Summary screen ───────────────────────────────────────────────────────────

function SummaryScreen({
  summary,
  onRestart,
  onClose,
}: {
  summary: KanaSessionSummaryData;
  onRestart: () => void;
  onClose: () => void;
}) {
  const accuracy = summary.total > 0 ? Math.round((summary.correct / summary.total) * 100) : 0;

  const headline =
    accuracy >= 90 ? "¡Perfecto!" :
    accuracy >= 70 ? "¡Buen trabajo!" :
    accuracy >= 50 ? "Sigue así." : "Vamos mejorando.";

  const sub =
    accuracy >= 90 ? "Lo tienes dominado." :
    accuracy >= 70 ? "Estás progresando." :
    accuracy >= 50 ? "La práctica hace al maestro." : "Cada sesión cuenta.";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 92,
      background: "#FFF8E7",
      display: "flex", flexDirection: "column",
      fontFamily: DS.fontHead,
    }}>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "flex-end",
          padding: "max(20px, env(safe-area-inset-top)) 20px 12px",
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 38, height: 38, borderRadius: 999,
              background: "#FAF3E2", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="#1E1C12" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div style={{ padding: "8px 24px 32px" }}>
          {/* Celebration headline */}
          <div style={{ marginBottom: 28 }}>
            <div style={{
              fontSize: "clamp(36px, 11vw, 48px)", fontWeight: 800,
              color: "#1E1C12", letterSpacing: -1, lineHeight: 1.0,
            }}>{headline}</div>
            <div style={{
              fontSize: "clamp(17px, 5vw, 20px)", fontWeight: 400,
              color: "#5B403F", marginTop: 6, lineHeight: 1.3,
            }}>{sub}</div>
          </div>

          {/* Stats — 3 column grid of cards */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10,
            marginBottom: 24,
          }}>
            {([
              { l: "Precisión", v: `${accuracy}%` },
              { l: "Tiempo", v: formatDuration(summary.durationMs) },
              { l: "Racha", v: `${summary.streak}` },
            ] as const).map((x) => (
              <div key={x.l} style={{
                padding: "16px 12px", borderRadius: 20,
                background: "#FFFFFF",
                boxShadow: "0 4px 20px rgba(26,26,46,0.05)",
                textAlign: "center",
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: "0.18em",
                  textTransform: "uppercase", color: "#5B403F", marginBottom: 6,
                }}>{x.l}</div>
                <div style={{
                  fontSize: 24, fontWeight: 800, color: "#1E1C12", letterSpacing: -0.5,
                }}>{x.v}</div>
              </div>
            ))}
          </div>

          {/* Newly mastered kana */}
          {summary.newlySet.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{
                fontSize: 10.5, fontWeight: 600, letterSpacing: "0.2em",
                textTransform: "uppercase", color: "#5B403F", marginBottom: 12,
              }}>Kana dominados hoy</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {summary.newlySet.map((item) => (
                  <div
                    key={item.kana}
                    style={{
                      width: 60, height: 60, borderRadius: 20,
                      background: "#FFFFFF",
                      boxShadow: "0 6px 20px rgba(26,26,46,0.07)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: DS.fontKana, fontSize: 26, color: "#E63946",
                    }}
                  >{item.kana}</div>
                ))}
              </div>
            </div>
          )}

          {/* Up next card */}
          {summary.upNextLabel && (
            <div style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: "18px 20px", borderRadius: 24,
              background: "#FAF3E2",
              marginBottom: 28,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: "0.2em",
                  textTransform: "uppercase", color: "#5B403F", marginBottom: 4,
                }}>Próximo</div>
                <div style={{
                  fontFamily: DS.fontKana, fontSize: 22, color: "#1E1C12", letterSpacing: 2,
                }}>{summary.upNextKana}</div>
                <div style={{
                  fontFamily: DS.fontBody, fontSize: 12, color: "#5B403F", marginTop: 2,
                }}>{summary.upNextLabel}</div>
              </div>
              <button
                type="button"
                onClick={onRestart}
                style={{
                  width: 52, height: 52, borderRadius: 999,
                  background: "#E63946", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 6px 16px rgba(230,57,70,0.25)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                  <path d="M7 4l11 7-11 7V4z" fill="#fff" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Done button */}
      <div style={{ padding: "12px 24px calc(16px + env(safe-area-inset-bottom))" }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%", padding: "18px 22px",
            background: "linear-gradient(135deg, #E63946 0%, #c42b38 100%)",
            color: "#fff",
            border: "none", borderRadius: 999, cursor: "pointer",
            fontFamily: DS.fontHead, fontSize: 15, fontWeight: 700,
            boxShadow: "0 8px 24px rgba(230,57,70,0.28)",
          }}
        >Listo</button>
      </div>
    </div>
  );
}

// ─── Main session screen ──────────────────────────────────────────────────────

export default function KanaReadingSession({
  open,
  visible,
  kana,
  romaji,
  hint,
  questionIndex,
  totalQuestions,
  feedback,
  isFinished,
  summary,
  onAnswer,
  onDontKnow,
  onNext,
  onRestart,
  onClose,
}: Props) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset input on new question
  useEffect(() => {
    if (!feedback && !isFinished) {
      setInputValue("");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [kana, feedback, isFinished]);

  if (!open) return null;

  const progressPct = totalQuestions > 0 ? questionIndex / totalQuestions : 0;

  const handleCheck = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onAnswer(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (!feedback) handleCheck();
      else onNext();
    }
  };

  if (isFinished && summary) {
    return (
      <SummaryScreen
        summary={summary}
        onRestart={onRestart}
        onClose={onClose}
      />
    );
  }

  const isCorrect = feedback?.status === "correct";
  const isWrong = feedback?.status === "wrong";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 92,
        background: DS.bg,
        display: "flex", flexDirection: "column",
        transform: visible ? "translateY(0)" : "translateY(100%)",
        opacity: visible ? 1 : 0,
        transition: "transform 260ms ease, opacity 220ms ease",
        fontFamily: DS.fontHead,
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "max(16px, env(safe-area-inset-top)) 20px 12px",
        flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: 12,
            background: "transparent", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke={DS.ink} strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        {/* Progress bar */}
        <div style={{
          flex: 1, height: 3, borderRadius: 2,
          background: DS.surfaceAlt, overflow: "hidden",
        }}>
          <div style={{
            width: `${progressPct * 100}%`, height: "100%",
            background: DS.accent, transition: "width 280ms ease",
          }} />
        </div>

        {/* Count */}
        <div style={{
          fontFamily: DS.fontBody, fontSize: 12, fontWeight: 600,
          color: DS.inkSoft, flexShrink: 0,
        }}>
          {questionIndex} / {totalQuestions}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Question label */}
        {!feedback && (
          <div style={{
            padding: "12px 24px 0",
            fontSize: 10.5, fontWeight: 600,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: DS.inkSoft,
          }}>¿Cómo se lee?</div>
        )}

        {/* Kana display */}
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px 32px",
        }}>
          <div style={{
            fontFamily: DS.fontKana,
            fontSize: "clamp(120px, 38vw, 200px)",
            lineHeight: 0.9,
            color: feedback
              ? isCorrect ? "oklch(0.48 0.14 150)" : "oklch(0.55 0.16 25)"
              : DS.ink,
            transition: "color 150ms ease",
            userSelect: "none",
          }}>{kana}</div>
        </div>

        {/* Feedback area (shown when answered) */}
        {feedback && (
          <div style={{
            padding: "0 24px 16px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: isCorrect ? "oklch(0.48 0.14 150)" : "oklch(0.55 0.16 25)",
            }}>
              {isCorrect ? "Correcto" : "No era eso"}
            </div>
            <div style={{
              fontFamily: DS.fontBody, fontSize: 13, color: DS.inkSoft,
            }}>
              lee <span style={{ fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: DS.ink }}>{feedback.correctAnswer.toUpperCase()}</span>
            </div>
            {/* User pill */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 16px", borderRadius: 20,
              background: DS.surfaceAlt, border: `1px solid ${DS.line}`,
              marginTop: 4,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 600, letterSpacing: "0.18em",
                textTransform: "uppercase", color: DS.inkSoft,
              }}>TÚ</span>
              <span style={{
                fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                color: isCorrect ? "oklch(0.48 0.14 150)" : "oklch(0.55 0.16 25)",
              }}>
                {feedback.userAnswer.toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: "8px 16px calc(16px + env(safe-area-inset-bottom))",
        borderTop: `1px solid ${DS.line}`,
        background: DS.bg,
      }}>
        {feedback ? (
          /* After answer: Continue button */
          <button
            type="button"
            onClick={onNext}
            style={{
              width: "100%", padding: "18px 22px",
              background: DS.ink, color: DS.bg,
              border: "none", borderRadius: 22, cursor: "pointer",
              fontFamily: DS.fontHead, fontSize: 15, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}
          >
            Continuar
            <svg width="16" height="10" viewBox="0 0 18 12" fill="none">
              <path d="M1 6h15m0 0l-5-5m5 5l-5 5" stroke={DS.bg} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
          /* Question input row */
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Text input */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 16px",
              background: DS.card,
              border: `1px solid ${DS.lineStrong}`,
              borderRadius: 18,
            }}>
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe el romaji…"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                inputMode="text"
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  fontFamily: DS.fontHead, fontSize: 18, fontWeight: 600,
                  color: DS.ink,
                }}
              />
              <span style={{
                fontFamily: DS.fontBody, fontSize: 12, color: DS.inkFaint,
                flexShrink: 0,
              }}>enter ↩</span>
            </div>
            {/* Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={onDontKnow}
                style={{
                  flex: 1, padding: "14px 16px",
                  background: DS.surfaceAlt, color: DS.inkSoft,
                  border: `1px solid ${DS.line}`, borderRadius: 18,
                  fontFamily: DS.fontHead, fontSize: 14, fontWeight: 600,
                  cursor: "pointer",
                }}
              >No sé</button>
              <button
                type="button"
                onClick={handleCheck}
                disabled={!inputValue.trim()}
                style={{
                  flex: 2, padding: "14px 16px",
                  background: inputValue.trim() ? DS.ink : DS.surfaceAlt,
                  color: inputValue.trim() ? DS.bg : DS.inkFaint,
                  border: "none", borderRadius: 18,
                  fontFamily: DS.fontHead, fontSize: 14, fontWeight: 600,
                  cursor: inputValue.trim() ? "pointer" : "default",
                  transition: "background 120ms ease, color 120ms ease",
                }}
              >Comprobar</button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes sessionSlideIn {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
