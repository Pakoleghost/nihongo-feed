"use client";

import type { ReactNode } from "react";
import { DS } from "./ds";

type PracticeShellProps = {
  open: boolean;
  visible: boolean;
  title: string;
  subtitle?: string;
  current?: number;
  total?: number;
  streak?: number;
  streakPulseKey?: number | string;
  onClose: () => void;
  children: ReactNode;
};

type PracticeStageCardProps = {
  label?: string;
  value: ReactNode;
  compact?: boolean;
  feedback?: "correct" | "wrong" | null;
  children?: ReactNode;
};

export function PracticeStageCard({ label, value, compact = false, feedback = null, children }: PracticeStageCardProps) {
  const bg =
    feedback === "correct" ? DS.correctSoft :
    feedback === "wrong" ? DS.wrongSoft : DS.surface;
  const border =
    feedback === "correct" ? `1.5px solid ${DS.correct}` :
    feedback === "wrong" ? `1.5px solid ${DS.wrong}` :
    `1.5px solid ${DS.line}`;

  return (
    <div style={{
      display: "grid", gap: 10, justifyItems: "center", textAlign: "center",
      minHeight: compact ? 148 : 220, alignContent: "center",
      padding: compact ? "12px 12px 10px" : "24px 20px",
      borderRadius: 32, background: bg, border,
      transition: "background 130ms ease, border-color 130ms ease",
      position: "relative", overflow: "hidden",
    }}>
      {label && (
        <div style={{
          fontFamily: DS.fontHead, fontSize: 10, fontWeight: 600,
          color: DS.inkSoft, letterSpacing: "0.18em", textTransform: "uppercase",
        }}>{label}</div>
      )}
      <div>{value}</div>
      {children}
      {feedback === "correct" ? <PracticeSuccessBurst /> : null}
    </div>
  );
}

export function PracticeSuccessBurst() {
  return (
    <>
      <div style={{
        position: "absolute", inset: "14% 18%", borderRadius: 999,
        border: `2px solid ${DS.correct}`,
        opacity: 0.22,
        animation: "practiceSuccessPulse 560ms ease-out", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", top: 14, right: 14,
        width: 38, height: 38, borderRadius: 999,
        display: "grid", placeItems: "center",
        background: DS.correctSoft, color: DS.correct,
        fontFamily: DS.fontHead, fontWeight: 700, fontSize: 18,
        animation: "practiceCheckBurst 460ms ease-out",
      }}>✓</div>
    </>
  );
}

export default function PracticeShell({
  open, visible, title, subtitle, current, total,
  streak = 0, streakPulseKey, onClose, children,
}: PracticeShellProps) {
  if (!open) return null;

  const hasProgress = typeof current === "number" && typeof total === "number" && total > 0;
  const pct = hasProgress ? Math.round((Math.min(current, total) / total) * 100) : 0;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 90,
      background: DS.bg, fontFamily: DS.fontHead,
      transform: visible ? "translateY(0)" : "translateY(100%)",
      opacity: visible ? 1 : 0,
      transition: "transform 260ms ease, opacity 220ms ease",
      display: "flex", flexDirection: "column",
      overscrollBehavior: "contain",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center",
        padding: "calc(env(safe-area-inset-top) + 14px) 20px 12px",
        gap: 12, flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: 38, height: 38, borderRadius: 12,
            background: DS.surfaceAlt, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
            <path d="M7 1L1 7l6 6" stroke={DS.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div style={{ flex: 1, textAlign: "center" }}>
          {hasProgress ? (
            <div style={{ fontFamily: DS.fontHead, fontSize: 13, fontWeight: 600, color: DS.inkSoft }}>
              {current} / {total}
            </div>
          ) : (
            <div style={{ fontFamily: DS.fontHead, fontSize: 13, fontWeight: 600, color: DS.inkSoft }}>
              {subtitle || title}
            </div>
          )}
        </div>

        <div style={{ width: 38, height: 38, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
          {streak > 0 && (
            <div
              key={streakPulseKey}
              style={{
                borderRadius: 999, padding: "5px 10px",
                background: DS.accentSoft, color: DS.accent,
                fontFamily: DS.fontHead, fontSize: 11, fontWeight: 700,
                animation: "practiceStreakPop 300ms cubic-bezier(.2,.9,.2,1)",
                whiteSpace: "nowrap",
              }}
            >
              {streak} ✦
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {hasProgress && (
        <div style={{ height: 2, background: DS.surfaceAlt, flexShrink: 0, margin: "0 20px" }}>
          <div style={{
            height: "100%", width: `${pct}%`,
            background: DS.accent, borderRadius: 1,
            transition: "width 220ms ease",
          }} />
        </div>
      )}

      {/* Content */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "20px 20px calc(24px + env(safe-area-inset-bottom))",
        display: "grid", gap: 16, alignContent: "start",
      }}>
        {children}
      </div>

      <style jsx>{`
        @keyframes practiceSuccessPulse {
          0% { opacity: .9; transform: scale(.76); }
          75% { opacity: .14; }
          100% { opacity: 0; transform: scale(1.26); }
        }
        @keyframes practiceCheckBurst {
          0% { opacity: 0; transform: scale(.54) rotate(-8deg); }
          55% { opacity: 1; transform: scale(1.16); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes practiceStreakPop {
          0% { transform: translateY(5px) scale(.82); opacity: .3; }
          50% { transform: translateY(-2px) scale(1.12); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
