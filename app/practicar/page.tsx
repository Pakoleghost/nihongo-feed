"use client";

import { useEffect } from "react";
import Link from "next/link";
import { setLastActivity } from "@/lib/streak";
import BottomNav from "@/components/BottomNav";

const CARDS = [
  {
    href: "/practicar/sprint",
    title: "Kana Sprint",
    sub: "¿Cuántos adivinas en 60 segundos?",
    bg: "#1A1A2E",
    color: "#FFFFFF",
    subColor: "rgba(255,255,255,0.6)",
    shadow: "0 8px 28px rgba(26,26,46,0.35)",
  },
  {
    href: "/practicar/vocabulario",
    title: "Vocabulario",
    sub: "Vocabulario por lección",
    bg: "#E63946",
    color: "#FFFFFF",
    subColor: "rgba(255,255,255,0.82)",
    shadow: "0 8px 28px rgba(230,57,70,0.28)",
  },
  {
    href: "/practicar/kanji",
    title: "Kanji",
    sub: "Kanji por lección",
    bg: "#4ECDC4",
    color: "#1A1A2E",
    subColor: "rgba(26,26,46,0.65)",
    shadow: "0 8px 28px rgba(78,205,196,0.28)",
  },
] as const;

export default function PracticarPage() {
  useEffect(() => {
    setLastActivity("Practicar", "/practicar");
  }, []);

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
      <h1
        style={{
          fontSize: "42px",
          fontWeight: 800,
          color: "#1A1A2E",
          margin: "0 0 28px",
          lineHeight: 1,
        }}
      >
        Practicar
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
        {CARDS.map(({ href, title, sub, bg, color, subColor, shadow }) => (
          <div key={href}>
            <Link
              href={href}
              style={{
                background: bg,
                borderRadius: "24px",
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                textDecoration: "none",
                minHeight: "150px",
                boxShadow: shadow,
              }}
            >
              <p style={{ fontSize: "28px", fontWeight: 800, color, margin: 0, lineHeight: 1.1 }}>
                {title}
              </p>
              <p style={{ fontSize: "15px", color: subColor, margin: "6px 0 0" }}>{sub}</p>
            </Link>

            {/* Scoreboard link — only below Kana Sprint */}
            {href === "/practicar/sprint" && (
              <Link
                href="/practicar/sprint/scoreboard"
                style={{
                  display: "inline-block",
                  marginTop: "10px",
                  marginLeft: "8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#4ECDC4",
                  textDecoration: "none",
                }}
              >
                🏆 Ver scoreboard
              </Link>
            )}
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
