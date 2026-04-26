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
    accent: "#1A1A2E",
    scoreboard: true,
  },
  {
    href: "/practicar/vocabulario",
    title: "Vocabulario",
    sub: "Vocabulario por lección",
    accent: "#E63946",
    scoreboard: false,
  },
  {
    href: "/practicar/kanji",
    title: "Kanji",
    sub: "Kanji por lección",
    accent: "#4ECDC4",
    scoreboard: false,
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
          margin: 0,
          lineHeight: 1,
        }}
      >
        Practicar
      </h1>
      <p style={{ fontSize: "14px", color: "#7A7F8D", margin: "8px 0 24px", lineHeight: 1.4 }}>
        Pon a prueba lo que aprendes.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {CARDS.map(({ href, title, sub, accent, scoreboard }) => (
          <div key={href}>
            <Link
              href={href}
              style={{
                background: "#FFFFFF",
                borderRadius: "18px",
                padding: "22px 20px 22px 24px",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                textDecoration: "none",
                boxShadow: `inset 4px 0 0 ${accent}, 0 2px 10px rgba(26,26,46,0.07)`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: "20px",
                    fontWeight: 800,
                    color: "#1A1A2E",
                    margin: 0,
                    lineHeight: 1.1,
                  }}
                >
                  {title}
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#7A7F8D",
                    margin: "5px 0 0",
                    lineHeight: 1.35,
                  }}
                >
                  {sub}
                </p>
              </div>

              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                style={{ flexShrink: 0 }}
              >
                <path
                  d="M9 18l6-6-6-6"
                  stroke="#C4BAB0"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>

            {scoreboard && (
              <Link
                href="/practicar/sprint/scoreboard"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  marginTop: "8px",
                  marginLeft: "24px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#9CA3AF",
                  textDecoration: "none",
                  letterSpacing: "0.01em",
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
