"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { setLastActivity } from "@/lib/streak";
import { loadVocabProgress } from "@/lib/vocab-progress";
import { GENKI_VOCAB_BY_LESSON } from "@/lib/genki-vocab-by-lesson";
import BottomNav from "@/components/BottomNav";

const TOTAL_VOCAB = Object.values(GENKI_VOCAB_BY_LESSON).flat().length;

export default function PracticarPage() {
  const [vocabReviewed, setVocabReviewed] = useState<number | null>(null);

  useEffect(() => {
    setLastActivity("Practicar", "/practicar");
    const progress = loadVocabProgress("anon");
    setVocabReviewed(Object.keys(progress).length);
  }, []);

  const vocabPct =
    vocabReviewed !== null ? Math.min(100, (vocabReviewed / TOTAL_VOCAB) * 100) : 0;

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        padding: "24px 20px calc(100px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <h1
        style={{
          fontSize: "42px",
          fontWeight: 800,
          color: "#1A1A2E",
          margin: 0,
          lineHeight: 1,
          letterSpacing: "-0.04em",
        }}
      >
        Practicar
      </h1>
      <p
        style={{
          fontSize: "14px",
          color: "#7A7F8D",
          margin: "8px 0 24px",
          lineHeight: 1.4,
        }}
      >
        Pon a prueba lo que aprendes.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

        {/* ── Kana Sprint ── */}
        <div>
          <Link
            href="/practicar/sprint"
            style={{
              position: "relative",
              background: "#FFFFFF",
              borderRadius: "14px",
              padding: "20px 20px 22px",
              display: "block",
              textDecoration: "none",
              boxShadow: "0 2px 10px rgba(26,26,46,0.07)",
              overflow: "hidden",
            }}
          >
            {/* Corner fold */}
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: 40,
                height: 40,
                background: "#1A1A2E",
                borderBottomLeftRadius: 40,
              }}
            />

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 48 }}>
                <p
                  style={{
                    fontSize: "20px",
                    fontWeight: 800,
                    color: "#1A1A2E",
                    margin: 0,
                    lineHeight: 1.1,
                    letterSpacing: "-0.03em",
                  }}
                >
                  Kana Sprint
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#7A7F8D",
                    margin: "5px 0 0",
                    lineHeight: 1.35,
                  }}
                >
                  ¿Cuántos adivinas en 60 segundos?
                </p>
              </div>
            </div>

            {/* Score row */}
            <div
              style={{
                marginTop: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  background: "#1A1A2E",
                  borderRadius: 6,
                  padding: "4px 10px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                    stroke="#FFF8E7"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#FFF8E7",
                    letterSpacing: "0.06em",
                  }}
                >
                  MODO JUEGO
                </span>
              </div>
              <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
                Hiragana · Katakana
              </span>
            </div>
          </Link>

          <Link
            href="/practicar/sprint/scoreboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              marginTop: 8,
              marginLeft: 20,
              fontSize: "12px",
              fontWeight: 600,
              color: "#9CA3AF",
              textDecoration: "none",
              letterSpacing: "0.02em",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path
                d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
                stroke="#9CA3AF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Ver scoreboard
          </Link>
        </div>

        {/* ── Vocabulario ── */}
        <Link
          href="/practicar/vocabulario"
          style={{
            position: "relative",
            background: "#FFFFFF",
            borderRadius: "14px",
            padding: "20px 20px 22px",
            display: "block",
            textDecoration: "none",
            boxShadow: "0 2px 10px rgba(26,26,46,0.07)",
            overflow: "hidden",
          }}
        >
          {/* Corner fold */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 40,
              height: 40,
              background: "#E63946",
              borderBottomLeftRadius: 40,
            }}
          />

          <div style={{ paddingRight: 48 }}>
            <p
              style={{
                fontSize: "20px",
                fontWeight: 800,
                color: "#1A1A2E",
                margin: 0,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
              }}
            >
              Vocabulario
            </p>
            <p
              style={{
                fontSize: "13px",
                color: "#7A7F8D",
                margin: "5px 0 0",
                lineHeight: 1.35,
              }}
            >
              Genki I · lecciones 3–23
            </p>
          </div>

          {/* Progress section */}
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: "12px", color: "#7A7F8D" }}>
                {vocabReviewed !== null ? (
                  <>
                    <span style={{ fontWeight: 700, color: "#1A1A2E" }}>
                      {vocabReviewed}
                    </span>
                    {" de "}
                    <span style={{ fontWeight: 700, color: "#1A1A2E" }}>
                      {TOTAL_VOCAB}
                    </span>
                    {" palabras practicadas"}
                  </>
                ) : (
                  "Cargando…"
                )}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#4ECDC4",
                  letterSpacing: "0.04em",
                }}
              >
                {vocabReviewed !== null ? `${Math.round(vocabPct)}%` : "—"}
              </span>
            </div>

            {/* Progress bar */}
            <div
              style={{
                height: 4,
                background: "#F0EDE8",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${vocabPct}%`,
                  background: "#4ECDC4",
                  borderRadius: 999,
                  transition: "width 0.6s ease",
                }}
              />
            </div>
          </div>
        </Link>

        {/* ── Kanji ── */}
        <Link
          href="/practicar/kanji"
          style={{
            position: "relative",
            background: "#FFFFFF",
            borderRadius: "14px",
            padding: "20px 20px 22px",
            display: "block",
            textDecoration: "none",
            boxShadow: "0 2px 10px rgba(26,26,46,0.07)",
            overflow: "hidden",
          }}
        >
          {/* Corner fold */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 40,
              height: 40,
              background: "#4ECDC4",
              borderBottomLeftRadius: 40,
            }}
          />

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ flex: 1, minWidth: 0, paddingRight: 48 }}>
              <p
                style={{
                  fontSize: "20px",
                  fontWeight: 800,
                  color: "#1A1A2E",
                  margin: 0,
                  lineHeight: 1.1,
                  letterSpacing: "-0.03em",
                }}
              >
                Kanji
              </p>
              <p
                style={{
                  fontSize: "13px",
                  color: "#7A7F8D",
                  margin: "5px 0 0",
                  lineHeight: 1.35,
                }}
              >
                Kanji por lección
              </p>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "#F0EDE8",
                borderRadius: 6,
                padding: "4px 10px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#9CA3AF",
                  letterSpacing: "0.06em",
                }}
              >
                PRÓXIMAMENTE
              </span>
            </div>
          </div>
        </Link>

      </div>

      <BottomNav />
    </div>
  );
}
