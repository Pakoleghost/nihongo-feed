"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { markActiveToday, getStreak, getLastActivity } from "@/lib/streak";
import { getDueKanaCount } from "@/lib/kana-due";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "Buenos días,";
  if (h >= 12 && h < 20) return "Buenas tardes,";
  return "Buenas noches,";
}

export default function InicioPage() {
  const [streak, setStreak] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [lastActivity, setLastActivityState] = useState<{ label: string; path: string } | null>(null);

  useEffect(() => {
    markActiveToday();
    setStreak(getStreak());
    setLastActivityState(getLastActivity());

    supabase.auth.getUser().then(({ data }) => {
      const userKey = data.user?.id ?? "anon";
      setDueCount(getDueKanaCount(userKey));
    });
  }, []);

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "56px 20px 100px",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px",
        }}
      >
        <div>
          <p style={{ fontSize: "15px", color: "#9CA3AF", margin: 0, lineHeight: 1.3 }}>
            {getGreeting()}
          </p>
          <h1
            style={{
              fontSize: "30px",
              fontWeight: 800,
              color: "#1A1A2E",
              margin: "2px 0 0",
              lineHeight: 1.15,
            }}
          >
            ¿Qué hacemos hoy?
          </h1>
        </div>

        {/* Streak pill */}
        <div
          style={{
            background: "rgba(230,57,70,0.12)",
            borderRadius: "999px",
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            flexShrink: 0,
            marginTop: "4px",
          }}
        >
          <span style={{ fontSize: "16px" }}>🔥</span>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#E63946" }}>{streak}</span>
        </div>
      </div>

      {/* Urgent kana card — only when dueCount > 0 */}
      {dueCount > 0 && (
        <div
          style={{
            background: "#E63946",
            borderRadius: "24px",
            padding: "24px",
            marginTop: "28px",
          }}
        >
          <p
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "#FFFFFF",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {dueCount} kana por repasar
          </p>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.82)", margin: "6px 0 18px" }}>
            Tienes repasos vencidos
          </p>
          <Link
            href="/kana/quiz?mode=smart&difficulty=automatico&count=20"
            style={{
              display: "block",
              background: "#FFFFFF",
              color: "#E63946",
              borderRadius: "999px",
              padding: "14px",
              fontWeight: 700,
              fontSize: "16px",
              textDecoration: "none",
              textAlign: "center",
            }}
          >
            Repasar ahora
          </Link>
        </div>
      )}

      {/* Continue card */}
      <div
        style={{
          background: "#1A1A2E",
          borderRadius: "24px",
          padding: "24px",
          marginTop: dueCount > 0 ? "14px" : "28px",
        }}
      >
        <p
          style={{
            fontSize: "24px",
            fontWeight: 800,
            color: "#FFFFFF",
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          Continuar
        </p>
        <p style={{ fontSize: "15px", color: "#9CA3AF", margin: "4px 0 18px" }}>
          {lastActivity?.label ?? "Empieza por Kana"}
        </p>
        <Link
          href={lastActivity?.path ?? "/kana"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#4ECDC4",
            color: "#1A1A2E",
            borderRadius: "999px",
            padding: "14px 20px",
            fontWeight: 700,
            fontSize: "16px",
            textDecoration: "none",
          }}
        >
          <span>Continuar</span>
          <span>→</span>
        </Link>
      </div>

      {/* Quick chips */}
      <div style={{ display: "flex", gap: "10px", marginTop: "24px", flexWrap: "wrap" }}>
        {[
          { label: "Kana Sprint", href: "/practicar/sprint" },
          { label: "Vocab", href: "/practicar/vocab" },
          { label: "Repaso", href: "/practicar/repaso" },
        ].map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            style={{
              background: "#FFFFFF",
              color: "#1A1A2E",
              borderRadius: "999px",
              padding: "10px 18px",
              fontWeight: 600,
              fontSize: "15px",
              textDecoration: "none",
              boxShadow: "0 2px 10px rgba(26,26,46,0.08)",
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
