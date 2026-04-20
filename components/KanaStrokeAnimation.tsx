"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { kanaStrokes } from "@/lib/kana-stroke-data";

interface Props {
  kana: string;
  size?: number;
  autoPlay?: boolean;
}

export default function KanaStrokeAnimation({ kana, size = 200, autoPlay = true }: Props) {
  const paths = kanaStrokes[kana] ?? [];
  const [animKey, setAnimKey] = useState(0);

  // Reset when kana changes
  useEffect(() => {
    setAnimKey(0);
  }, [kana]);

  // No stroke data — show static character
  if (paths.length === 0) {
    return (
      <div
        style={{
          width: size,
          height: size,
          background: "#FFF8E7",
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
            fontSize: size * 0.45,
            fontFamily: "var(--font-noto-sans-jp), sans-serif",
            color: "#1A1A2E",
            lineHeight: 1,
          }}
        >
          {kana}
        </span>
        <span style={{ fontSize: "11px", color: "#C4BAB0", fontWeight: 600 }}>
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
        style={{ background: "#FFF8E7", borderRadius: "1rem", display: "block" }}
      >
        {/* Reference crosshair */}
        <line x1="54.5" y1="4" x2="54.5" y2="105" stroke="#E0DAD3" strokeWidth="0.5" strokeDasharray="4 3" />
        <line x1="4" y1="54.5" x2="105" y2="54.5" stroke="#E0DAD3" strokeWidth="0.5" strokeDasharray="4 3" />

        {paths.map((d, index) => (
          <motion.path
            key={`${animKey}-${index}`}
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
                duration: 0.45,
                ease: "easeInOut",
                delay: autoPlay ? index * 0.6 : 0,
              },
              opacity: {
                duration: 0.01,
                delay: autoPlay ? index * 0.6 : 0,
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
          color: "#9CA3AF",
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
        aria-label="Repetir animación"
      >
        ↺
      </button>
    </div>
  );
}
