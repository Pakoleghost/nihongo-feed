"use client";

import type { CSSProperties, ReactNode } from "react";

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
  const shadow =
    feedback === "correct"
      ? "0 0 0 1px rgba(78,205,196,.35), 0 18px 34px rgba(78,205,196,.16)"
      : feedback === "wrong"
        ? "0 0 0 1px rgba(230,57,70,.22), 0 18px 34px rgba(230,57,70,.1)"
        : "0 18px 34px rgba(26,26,46,.04)";

  return (
    <div
      style={{
        display: "grid",
        gap: 10,
        justifyItems: "center",
        textAlign: "center",
        minHeight: compact ? 148 : 220,
        alignContent: "center",
        padding: compact ? "12px 12px 10px" : "16px 14px",
        borderRadius: 32,
        background: "color-mix(in srgb, var(--color-surface) 82%, white)",
        boxShadow: shadow,
        transition: "box-shadow 130ms ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {label ? (
        <div
          style={{
            fontSize: "var(--text-label)",
            color: "var(--color-text-muted)",
            fontWeight: 800,
            letterSpacing: ".08em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
      ) : null}
      <div>{value}</div>
      {children}
      {feedback === "correct" ? <PracticeSuccessBurst /> : null}
    </div>
  );
}

export function PracticeSuccessBurst() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: "14% 18%",
          borderRadius: 999,
          border: "2px solid rgba(78,205,196,.24)",
          animation: "practiceSuccessPulse 560ms ease-out",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          width: 38,
          height: 38,
          borderRadius: 999,
          display: "grid",
          placeItems: "center",
          background: "rgba(78,205,196,.18)",
          color: "#1A1A2E",
          fontWeight: 900,
          fontSize: 20,
          animation: "practiceCheckBurst 460ms ease-out",
        }}
      >
        ✓
      </div>
      <div className="practiceSuccessDots" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </>
  );
}

export default function PracticeShell({
  open,
  visible,
  title,
  subtitle,
  current,
  total,
  streak = 0,
  streakPulseKey,
  onClose,
  children,
}: PracticeShellProps) {
  if (!open) return null;

  const hasProgress = typeof current === "number" && typeof total === "number" && total > 0;
  const progressPercent = hasProgress ? Math.round((Math.min(current, total) / total) * 100) : 0;
  const streakStyle: CSSProperties = {
    borderRadius: 999,
    padding: "8px 12px",
    background: "color-mix(in srgb, var(--color-accent-soft) 74%, white)",
    color: "var(--color-text)",
    fontSize: "var(--text-body-sm)",
    fontWeight: 800,
    animation: "practiceStreakPop 300ms cubic-bezier(.2,.9,.2,1)",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        background: "rgba(255, 248, 231, 0.94)",
        backdropFilter: "blur(10px)",
        transform: visible ? "translateY(0)" : "translateY(100%)",
        opacity: visible ? 1 : 0,
        transition: "transform 260ms ease, opacity 220ms ease",
        display: "grid",
        overscrollBehavior: "contain",
      }}
    >
      <div style={{ minHeight: "100vh", overflowY: "auto", padding: "16px", display: "grid", alignContent: "start" }}>
        <div className="ds-container" style={{ display: "grid", gap: "var(--space-4)", paddingBottom: "calc(var(--space-8) + env(safe-area-inset-bottom))" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap", paddingTop: "max(var(--space-2), env(safe-area-inset-top))" }}>
            <div style={{ display: "grid", gap: 4 }}>
              <div
                style={{
                  fontSize: "var(--text-label)",
                  color: "var(--color-text-muted)",
                  fontWeight: 800,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                }}
              >
                {title}
              </div>
              {subtitle ? (
                <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 700 }}>
                  {subtitle}
                </div>
              ) : null}
            </div>
            <button type="button" onClick={onClose} className="ds-btn-ghost">
              Cerrar
            </button>
          </div>

          {hasProgress ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 800 }}>
                  {current} / {total}
                </div>
                {streak > 0 ? (
                  <div key={streakPulseKey} style={streakStyle}>
                    {streak} en racha
                  </div>
                ) : null}
              </div>
              <div
                style={{
                  height: 10,
                  borderRadius: 999,
                  background: "color-mix(in srgb, var(--color-accent-soft) 72%, white)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progressPercent}%`,
                    background: "linear-gradient(90deg, #4ECDC4 0%, #E63946 100%)",
                    transition: "width 220ms ease",
                  }}
                />
              </div>
            </div>
          ) : null}

          {children}
        </div>
      </div>

      <style jsx>{`
        @keyframes practiceSuccessPulse {
          0% {
            opacity: 0.95;
            transform: scale(0.78);
          }
          75% {
            opacity: 0.16;
          }
          100% {
            opacity: 0;
            transform: scale(1.26);
          }
        }
        @keyframes practiceCheckBurst {
          0% {
            opacity: 0;
            transform: scale(0.56) rotate(-8deg);
          }
          55% {
            opacity: 1;
            transform: scale(1.18) rotate(0deg);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes practiceStreakPop {
          0% {
            transform: translateY(6px) scale(0.84);
            opacity: 0.3;
            box-shadow: none;
          }
          50% {
            transform: translateY(-2px) scale(1.14);
            opacity: 1;
            box-shadow: 0 0 0 4px rgba(78,205,196,.32), 0 0 0 8px rgba(78,205,196,.1);
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
            box-shadow: 0 0 0 0px rgba(78,205,196,0);
          }
        }
        .practiceSuccessDots {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .practiceSuccessDots span {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(78, 205, 196, 0.88);
          animation: practiceDotBurst 520ms ease-out forwards;
        }
        .practiceSuccessDots span:nth-child(1) {
          top: 18%;
          left: 20%;
        }
        .practiceSuccessDots span:nth-child(2) {
          top: 16%;
          right: 22%;
          background: rgba(244, 162, 97, 0.9);
        }
        .practiceSuccessDots span:nth-child(3) {
          top: 40%;
          left: 12%;
          background: rgba(69, 123, 157, 0.84);
        }
        .practiceSuccessDots span:nth-child(4) {
          top: 42%;
          right: 12%;
        }
        .practiceSuccessDots span:nth-child(5) {
          bottom: 20%;
          left: 26%;
          background: rgba(244, 162, 97, 0.9);
        }
        .practiceSuccessDots span:nth-child(6) {
          bottom: 18%;
          right: 26%;
          background: rgba(69, 123, 157, 0.84);
        }
        @keyframes practiceDotBurst {
          0% {
            opacity: 0;
            transform: scale(0.35);
          }
          28% {
            opacity: 1;
            transform: scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translateY(-12px) scale(0.88);
          }
        }
      `}</style>
    </div>
  );
}
