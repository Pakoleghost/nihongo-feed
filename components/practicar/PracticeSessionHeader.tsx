"use client";

type PracticeSessionHeaderProps = {
  moduleName: string;
  lesson: number;
  lessonTitle: string;
  progressCurrent: number;
  progressTotal: number;
  progressPct: number;
  accentColor: string;
  accentSurface: string;
  onExit: () => void;
};

export default function PracticeSessionHeader({
  moduleName,
  lesson,
  lessonTitle,
  progressCurrent,
  progressTotal,
  progressPct,
  accentColor,
  accentSurface,
  onExit,
}: PracticeSessionHeaderProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Row: exit | badge | count */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onExit}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.10)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          aria-label="Salir"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>

        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              background: accentSurface,
              borderRadius: 999,
              padding: "5px 12px",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 800, color: accentColor }}>{moduleName}</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.42)" }}>L{lesson} · {lessonTitle}</span>
          </div>
        </div>

        <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.42)", flexShrink: 0 }}>
          {Math.min(progressCurrent, progressTotal)}/{progressTotal}
        </span>
      </div>

      {/* Thin progress bar */}
      <div style={{ height: 3, background: "rgba(255,255,255,0.10)", borderRadius: 999, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${progressPct}%`,
            background: accentColor,
            borderRadius: 999,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}
