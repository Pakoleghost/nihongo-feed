"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KANA_ITEMS } from "@/lib/kana-data";
import { loadKanaProgress, getKanaItemState } from "@/lib/kana-progress";
import BottomNav from "@/components/BottomNav";

const TOTAL = KANA_ITEMS.length;

function CircleProgress({ pct, size = 88 }: { pct: number; size?: number }) {
  const strokeW = 7;
  const R = (size - strokeW * 2) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * R;
  const filled = circumference * (pct / 100);
  const gap = circumference - filled;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)" }}
        aria-hidden="true"
      >
        <circle
          cx={cx}
          cy={cx}
          r={R}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeW}
        />
        <circle
          cx={cx}
          cy={cx}
          r={R}
          fill="none"
          stroke="#4ECDC4"
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${gap}`}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "16px",
          fontWeight: 700,
          color: "#1A1A2E",
        }}
      >
        {pct}%
      </div>
    </div>
  );
}

export default function KanaPage() {
  const [dominados, setDominados] = useState(0);

  useEffect(() => {
    const progress = loadKanaProgress("anon");
    const count = KANA_ITEMS.filter(
      (item) => getKanaItemState(progress[item.id]) === "fijado"
    ).length;
    setDominados(count);
  }, []);

  const pct = TOTAL > 0 ? Math.round((dominados / TOTAL) * 100) : 0;

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "20px 20px 100px",
      }}
    >
      {/* Title */}
      <h1
        style={{
          fontSize: "42px",
          fontWeight: 800,
          color: "#E63946",
          margin: 0,
          lineHeight: 1,
        }}
      >
        Kana
      </h1>

      {/* Progress section */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "28px",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "#1A1A2E",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Progreso
          </p>
          <p
            style={{
              fontSize: "15px",
              color: "#53596B",
              margin: "4px 0 0",
            }}
          >
            {dominados} dominados
          </p>
        </div>
        <CircleProgress pct={pct} />
      </div>

      {/* Cards */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          marginTop: "32px",
          flex: 1,
        }}
      >
        {/* Smart card */}
        <Link
          href="/kana/configurar?mode=smart"
          style={{
            flex: 1,
            background: "#E63946",
            borderRadius: "24px",
            padding: "28px 28px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            textDecoration: "none",
            minHeight: "180px",
            boxShadow: "0 8px 32px rgba(230,57,70,0.3)",
          }}
        >
          <p
            style={{
              fontSize: "34px",
              fontWeight: 800,
              color: "#FFFFFF",
              margin: 0,
              lineHeight: 1,
            }}
          >
            Smart
          </p>
          <p
            style={{
              fontSize: "16px",
              color: "rgba(255,255,255,0.85)",
              margin: "6px 0 0",
            }}
          >
            El sistema elige por ti
          </p>
        </Link>

        {/* Libre card */}
        <Link
          href="/kana/configurar?mode=libre"
          style={{
            flex: 1,
            background: "#4ECDC4",
            borderRadius: "24px",
            padding: "28px 28px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            textDecoration: "none",
            minHeight: "180px",
            boxShadow: "0 8px 32px rgba(78,205,196,0.3)",
          }}
        >
          <p
            style={{
              fontSize: "34px",
              fontWeight: 800,
              color: "#1A1A2E",
              margin: 0,
              lineHeight: 1,
            }}
          >
            Libre
          </p>
          <p
            style={{
              fontSize: "16px",
              color: "rgba(26,26,46,0.7)",
              margin: "6px 0 0",
            }}
          >
            Elige qué practicar
          </p>
        </Link>
      </div>

      <BottomNav />
    </div>
  );
}
