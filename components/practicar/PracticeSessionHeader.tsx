"use client";

type PracticeSessionHeaderProps = {
  moduleName: string;
  lesson: number;
  lessonTitle: string;
  sessionLabel: string;
  sessionHelper: string;
  progressCurrent: number;
  progressTotal: number;
  progressPct: number;
  metricLabel: string;
  metricValue: number;
  accentColor: string;
  accentSurface: string;
  onExit: () => void;
};

export default function PracticeSessionHeader({
  moduleName,
  lesson,
  lessonTitle,
  sessionLabel,
  sessionHelper,
  progressCurrent,
  progressTotal,
  progressPct,
  metricLabel,
  metricValue,
  accentColor,
  accentSurface,
  onExit,
}: PracticeSessionHeaderProps) {
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <button
          onClick={onExit}
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
          aria-label="Salir"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="#1A1A2E" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>

        <div
          style={{
            background: accentSurface,
            borderRadius: "999px",
            padding: "7px 14px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span style={{ fontSize: "13px", fontWeight: 800, color: accentColor }}>{moduleName}</span>
          <span style={{ fontSize: "13px", color: "#6B7280" }}>
            L{lesson} · {lessonTitle}
          </span>
        </div>
      </div>

      <div style={{ marginTop: "18px" }}>
        <p
          style={{
            fontSize: "32px",
            fontWeight: 800,
            color: "#1A1A2E",
            margin: 0,
            lineHeight: 1.05,
          }}
        >
          {sessionLabel}
        </p>
        <p
          style={{
            fontSize: "14px",
            color: "#6B7280",
            margin: "8px 0 0",
            lineHeight: 1.45,
          }}
        >
          {sessionHelper}
        </p>
      </div>

      <div
        style={{
          marginTop: "16px",
          background: "#FFFFFF",
          borderRadius: "18px",
          padding: "14px 16px",
          boxShadow: "0 4px 14px rgba(26,26,46,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            marginBottom: "10px",
          }}
        >
          <span style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", color: "#9CA3AF" }}>
            SESIÓN
          </span>
          <span style={{ fontSize: "13px", fontWeight: 700, color: accentColor }}>
            {metricValue} {metricLabel}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#1A1A2E" }}>
            {Math.min(progressCurrent, progressTotal)}/{progressTotal || 0}
          </span>
          <span style={{ fontSize: "13px", color: "#6B7280" }}>Progreso de la práctica</span>
        </div>
        <div
          style={{
            height: "5px",
            background: "#E5E7EB",
            borderRadius: "999px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progressPct}%`,
              background: accentColor,
              borderRadius: "999px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>
    </>
  );
}
