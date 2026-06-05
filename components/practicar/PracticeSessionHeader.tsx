"use client";

type PracticeSessionHeaderProps = {
  typeLabel: string;
  lesson: string;
  progressCurrent: number;
  progressTotal: number;
  onExit: () => void;
};

export default function PracticeSessionHeader({
  typeLabel,
  lesson,
  progressCurrent,
  progressTotal,
  onExit,
}: PracticeSessionHeaderProps) {
  const pct = progressTotal > 0 ? (progressCurrent / progressTotal) * 100 : 0;

  return (
    <div className="sesh-head">
      <div className="sesh-head-row">
        <button className="sesh-iconbtn" onClick={onExit} aria-label="Cerrar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>

        <span className="sesh-pill">
          <span className="sesh-pill-type">{typeLabel}</span>
          {lesson && <span className="sesh-pill-lesson">{lesson}</span>}
        </span>

        <span className="sesh-count">
          <b>{Math.min(progressCurrent + 1, progressTotal)}</b> / {progressTotal}
        </span>
      </div>

      <div className="sesh-ptrack">
        <div className="sesh-pfill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
