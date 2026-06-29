"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { kanjiStrokes } from "@/lib/kanji-stroke-data";

type StrokeSpeed = "slow" | "normal" | "fast";

type Props = {
  kanji: string;
  size?: number;
  autoPlay?: boolean;
  speed?: StrokeSpeed;
  showGrid?: boolean;
};

const SPEED_TIMINGS: Record<
  StrokeSpeed,
  { duration: number; stagger: number }
> = {
  slow: { duration: 0.72, stagger: 0.92 },
  normal: { duration: 0.45, stagger: 0.6 },
  fast: { duration: 0.28, stagger: 0.38 },
};

export default function KanjiStrokeAnimation({
  kanji,
  size = 184,
  autoPlay = true,
  speed = "normal",
  showGrid = true,
}: Props) {
  const paths = kanjiStrokes[kanji] ?? [];
  const [replayKey, setReplayKey] = useState(0);
  const timing = SPEED_TIMINGS[speed];

  if (paths.length === 0) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 28,
          background: "#F8FAFC",
          border: "1px solid rgba(26,26,46,0.08)",
          display: "grid",
          placeItems: "center",
          color: "#1A1A2E",
          boxShadow: "0 18px 42px rgba(26,26,46,0.08)",
        }}
      >
        <span
          style={{
            fontFamily:
              "var(--font-zen-kaku), var(--font-noto-sans-jp), sans-serif",
            fontSize: size * 0.46,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          {kanji}
        </span>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg
        viewBox="0 0 109 109"
        width={size}
        height={size}
        style={{
          display: "block",
          borderRadius: 28,
          background: "#F8FAFC",
          border: "1px solid rgba(26,26,46,0.08)",
          boxShadow: "0 18px 42px rgba(26,26,46,0.08)",
        }}
      >
        {showGrid && (
          <>
            <line
              x1="54.5"
              y1="4"
              x2="54.5"
              y2="105"
              stroke="rgba(26,26,46,0.08)"
              strokeWidth="0.6"
              strokeDasharray="4 3"
            />
            <line
              x1="4"
              y1="54.5"
              x2="105"
              y2="54.5"
              stroke="rgba(26,26,46,0.08)"
              strokeWidth="0.6"
              strokeDasharray="4 3"
            />
            <rect
              x="13"
              y="13"
              width="83"
              height="83"
              fill="none"
              stroke="rgba(26,26,46,0.06)"
              strokeWidth="0.65"
            />
          </>
        )}

        {paths.map((d, index) => (
          <motion.path
            key={`${kanji}-${replayKey}-${index}`}
            d={d}
            fill="none"
            stroke="#1A1A2E"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3.15"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              pathLength: {
                duration: timing.duration,
                ease: "easeInOut",
                delay: autoPlay ? index * timing.stagger : 0,
              },
              opacity: {
                duration: 0.01,
                delay: autoPlay ? index * timing.stagger : 0,
              },
            }}
          />
        ))}
      </svg>

      <div
        style={{
          position: "absolute",
          bottom: 9,
          left: 12,
          color: "rgba(26,26,46,0.42)",
          fontSize: 11,
          fontWeight: 800,
          pointerEvents: "none",
        }}
      >
        {paths.length} {paths.length === 1 ? "trazo" : "trazos"}
      </div>

      <button
        type="button"
        onClick={() => setReplayKey((key) => key + 1)}
        aria-label="Repetir orden de trazos"
        style={{
          position: "absolute",
          right: 8,
          bottom: 8,
          width: 32,
          height: 32,
          border: 0,
          borderRadius: "50%",
          background: "#4ECDC4",
          color: "#1A1A2E",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
          fontSize: 16,
          fontWeight: 900,
          boxShadow: "0 10px 20px rgba(78,205,196,0.28)",
        }}
      >
        ↺
      </button>
    </div>
  );
}
