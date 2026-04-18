"use client";

import type { ReactNode } from "react";

// ─── Tokens ──────────────────────────────────────────────────────────────────

export const DS = {
  bg: "#fbf8f1",
  surface: "#fdfaf3",
  surfaceAlt: "#f4efe3",
  card: "#ffffff",
  ink: "#1c1b17",
  inkSoft: "#66645c",
  inkFaint: "#bcb9af",
  line: "rgba(28,27,23,0.06)",
  lineStrong: "rgba(28,27,23,0.12)",
  accent: "#ac3e53",
  accentSoft: "rgba(172,62,83,0.10)",
  accentInk: "#ffffff",
  correct: "oklch(0.48 0.12 150)",
  correctSoft: "oklch(0.48 0.12 150 / 0.10)",
  wrong: "oklch(0.55 0.16 25)",
  wrongSoft: "oklch(0.55 0.16 25 / 0.10)",
  fontHead: "var(--font-study), 'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif",
  fontBody: "'Inter', system-ui, sans-serif",
  fontKana: "var(--font-noto-serif-jp), 'Noto Serif JP', var(--font-noto-sans-jp), 'Noto Sans JP', serif",
} as const;

export type DSTab = "home" | "learn" | "review" | "practice" | "vault";

// ─── TopBar ───────────────────────────────────────────────────────────────────

export function TopBar({ onMenu }: { onMenu?: () => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "8px 20px 16px", flexShrink: 0,
    }}>
      <button
        type="button"
        onClick={onMenu}
        style={{
          width: 38, height: 38, borderRadius: 12,
          background: "transparent", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
        }}
      >
        <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
          <path d="M1 1h16M1 6h16M1 11h10" stroke={DS.ink} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <div style={{
        fontFamily: DS.fontKana, fontSize: 20, fontWeight: 500,
        color: DS.ink, letterSpacing: 1,
      }}>禅</div>
      <div style={{
        width: 38, height: 38, borderRadius: 19,
        background: DS.surfaceAlt, border: `1px solid ${DS.line}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: DS.fontHead, fontSize: 11, fontWeight: 600,
        color: DS.inkSoft,
      }}>MK</div>
    </div>
  );
}

// ─── TabBar (5 tabs) ──────────────────────────────────────────────────────────

const TAB_ITEMS: Array<{ k: DSTab; label: string; icon: (c: string) => ReactNode }> = [
  {
    k: "home", label: "Home",
    icon: (c) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M3 10l8-7 8 7v8a1.5 1.5 0 01-1.5 1.5H13v-6h-4v6H4.5A1.5 1.5 0 013 18v-8z" stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    k: "learn", label: "Learn",
    icon: (c) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M3 5.5a2 2 0 012-2h5v15H5a2 2 0 01-2-2v-11zM12 3.5h5a2 2 0 012 2v11a2 2 0 01-2 2h-5v-15z" stroke={c} strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    k: "review", label: "Review",
    icon: (c) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M18 11a7 7 0 11-2.05-4.95M18 3v4h-4" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    k: "practice", label: "Practice",
    icon: (c) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M6 3v16M10 5v12M14 7v8M18 9v4" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    k: "vault", label: "Vault",
    icon: (c) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="5" width="16" height="13" rx="2" stroke={c} strokeWidth="1.5" />
        <path d="M3 8h16M8 5V3.5h6V5" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function TabBar({ active, onTab }: { active: DSTab; onTab: (tab: DSTab) => void }) {
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      height: 84,
      background: `linear-gradient(to top, ${DS.bg} 60%, transparent)`,
      display: "flex", alignItems: "center", justifyContent: "space-around",
      zIndex: 10, padding: "0 8px 24px",
    }}>
      {TAB_ITEMS.map((t) => {
        const isActive = t.k === active;
        return (
          <button
            key={t.k}
            type="button"
            onClick={() => onTab(t.k)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              background: "none", border: "none", cursor: "pointer",
              flex: 1, padding: "4px 0", position: "relative",
            }}
          >
            {t.icon(isActive ? DS.accent : DS.inkFaint)}
            <div style={{
              fontFamily: DS.fontHead, fontSize: 9.5, fontWeight: 600,
              letterSpacing: 0.6, textTransform: "uppercase",
              color: isActive ? DS.ink : DS.inkFaint,
            }}>{t.label}</div>
            {isActive && (
              <div style={{
                position: "absolute", bottom: -8,
                width: 4, height: 4, borderRadius: 2, background: DS.accent,
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Eyebrow ──────────────────────────────────────────────────────────────────

export function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <div style={{
      fontFamily: DS.fontHead, fontSize: 10.5, fontWeight: 600,
      letterSpacing: "0.22em", textTransform: "uppercase",
      color: color || DS.inkSoft,
    }}>{children}</div>
  );
}

// ─── ScreenTitle ──────────────────────────────────────────────────────────────

export function ScreenTitle({
  title, subtitle, right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div style={{ padding: "0 24px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: DS.fontHead, fontSize: 32, fontWeight: 700,
            color: DS.ink, letterSpacing: -0.8, lineHeight: 1.05,
          }}>{title}</div>
          {subtitle && (
            <div style={{
              fontFamily: DS.fontHead, fontSize: 32, fontWeight: 300,
              color: DS.inkSoft, letterSpacing: -0.8, lineHeight: 1.05, fontStyle: "italic",
            }}>{subtitle}</div>
          )}
        </div>
        {right}
      </div>
    </div>
  );
}

// ─── ProgressLine ─────────────────────────────────────────────────────────────

export function ProgressLine({ pct, height = 3 }: { pct: number; height?: number }) {
  return (
    <div style={{ height, borderRadius: height, background: DS.surfaceAlt, overflow: "hidden" }}>
      <div style={{
        width: `${Math.min(1, Math.max(0, pct)) * 100}%`, height: "100%",
        background: DS.accent, transition: "width 0.4s ease",
      }} />
    </div>
  );
}

// ─── LevelPips ────────────────────────────────────────────────────────────────

export function LevelPips({ level = 2, size = "sm" }: { level: number; size?: "sm" | "lg" }) {
  const isLg = size === "lg";
  const w = isLg ? 20 : 4;
  const h = isLg ? 3 : 4;
  const gap = isLg ? 4 : 3;
  return (
    <div style={{ display: "flex", gap }}>
      {[0, 1, 2, 3].map((n) => (
        <div key={n} style={{
          width: w,
          height: isLg ? h : w,
          borderRadius: isLg ? h / 2 : w / 2,
          background: n < level ? DS.accent : DS.lineStrong,
        }} />
      ))}
    </div>
  );
}

// ─── MasteryCell ──────────────────────────────────────────────────────────────

export function MasteryCell({
  kana, masteryLevel = 0, size = 34,
}: {
  kana: string | null;
  masteryLevel?: number;
  size?: number;
}) {
  if (!kana) return <div style={{ width: size, height: size }} />;
  const lvl = Math.min(masteryLevel, 4);
  const fills = [
    { bg: "transparent", fg: DS.inkFaint, op: 0.35, border: `1px dashed ${DS.lineStrong}` },
    { bg: DS.surfaceAlt, fg: DS.ink, op: 1, border: "none" },
    { bg: DS.accentSoft, fg: DS.ink, op: 1, border: "none" },
    { bg: DS.accentSoft, fg: DS.accent, op: 1, border: "none" },
    { bg: DS.accent, fg: DS.accentInk, op: 1, border: "none" },
  ];
  const f = fills[lvl];
  return (
    <div style={{
      width: size, height: size, borderRadius: 10,
      background: f.bg, border: f.border,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: DS.fontKana, fontSize: size * 0.52, fontWeight: 500,
      color: f.fg, opacity: f.op,
    }}>{kana}</div>
  );
}

// ─── PlayButton ───────────────────────────────────────────────────────────────

export function PlayButton({ onClick, size = 68 }: { onClick?: () => void; size?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: DS.ink, color: DS.bg,
        border: "none", borderRadius: 999,
        width: size, height: size, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", boxShadow: "0 6px 20px rgba(28,27,23,0.18)", padding: 0,
      }}
    >
      <svg width={size * 0.32} height={size * 0.32} viewBox="0 0 22 22" fill="none">
        <path d="M7 4l11 7-11 7V4z" fill="currentColor" />
      </svg>
    </button>
  );
}

// ─── StatusSpacer ─────────────────────────────────────────────────────────────

export function StatusSpacer() {
  return <div style={{ height: 54 }} />;
}
