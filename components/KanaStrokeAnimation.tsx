"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { kanaStrokes } from "@/lib/kana-stroke-data";

interface Props {
  kana: string;
  size?: number;
  autoPlay?: boolean;
  speed?: "slow" | "normal" | "fast";
}

const SPEED_TIMINGS = {
  slow: { duration: 0.72, stagger: 0.92 },
  normal: { duration: 0.45, stagger: 0.6 },
  fast: { duration: 0.28, stagger: 0.38 },
} as const;

export default function KanaStrokeAnimation({
  kana,
  size = 200,
  autoPlay = true,
  speed = "normal",
}: Props) {
  const paths = kanaStrokes[kana] ?? [];
  const [animKey, setAnimKey] = useState(0);
  const timing = SPEED_TIMINGS[speed];
  const isCompoundKana = Array.from(kana).length > 1;

  if (paths.length === 0) {
    return (
      <div
        style={{
          width: size,
          height: size,
          background: "#F8FAFC",
          border: "1px solid rgba(26,26,46,0.08)",
          borderRadius: "1rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <span
          style={{
            fontSize: size * (isCompoundKana ? 0.32 : 0.45),
            fontFamily: "var(--font-noto-sans-jp), sans-serif",
            color: "#1A1A2E",
            lineHeight: 1,
            letterSpacing: isCompoundKana ? "-0.08em" : 0,
            overflowWrap: "normal",
            whiteSpace: "nowrap",
            wordBreak: "keep-all",
            writingMode: "horizontal-tb",
          }}
        >
          {kana}
        </span>
        <span
          style={{
            fontSize: "11px",
            color: "rgba(26,26,46,0.42)",
            fontWeight: 600,
          }}
        >
          Sin datos de trazos
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
          background: "#F8FAFC",
          border: "1px solid rgba(26,26,46,0.08)",
          borderRadius: "1rem",
          display: "block",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.82)",
        }}
      >
        {/* Reference crosshair */}
        <line
          x1="54.5"
          y1="4"
          x2="54.5"
          y2="105"
          stroke="rgba(26,26,46,0.09)"
          strokeWidth="0.6"
          strokeDasharray="4 3"
        />
        <line
          x1="4"
          y1="54.5"
          x2="105"
          y2="54.5"
          stroke="rgba(26,26,46,0.09)"
          strokeWidth="0.6"
          strokeDasharray="4 3"
        />

        {paths.map((d, index) => (
          <motion.path
            key={`${kana}-${animKey}-${index}`}
            d={d}
            fill="none"
            stroke="#1A1A2E"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
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

      {/* Stroke count */}
      <div
        style={{
          position: "absolute",
          bottom: 7,
          left: 9,
          fontSize: "10px",
          color: "rgba(26,26,46,0.42)",
          fontWeight: 600,
          pointerEvents: "none",
        }}
      >
        {paths.length} {paths.length === 1 ? "trazo" : "trazos"}
      </div>

      {/* Internal replay button */}
      <button
        onClick={() => setAnimKey((k) => k + 1)}
        style={{
          position: "absolute",
          bottom: 5,
          right: 5,
          background: "#4ECDC4",
          border: "none",
          borderRadius: "50%",
          width: 28,
          height: 28,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "15px",
          color: "#1A1A2E",
        }}
        aria-label="Reproducir animación"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3.4 2.3v7.4L9 6 3.4 2.3Z"
            fill="currentColor"
            stroke="currentColor"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
