"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { setLastActivity } from "@/lib/streak";
import { loadVocabProgress } from "@/lib/vocab-progress";
import { loadKanaProgress, getKanaStateCounts } from "@/lib/kana-progress";
import { KANA_ITEMS } from "@/lib/kana-data";
import { GENKI_VOCAB_BY_LESSON } from "@/lib/genki-vocab-by-lesson";
import BottomNav from "@/components/BottomNav";

const TOTAL_VOCAB = Object.values(GENKI_VOCAB_BY_LESSON).flat().length;

export default function PracticarPage() {
  const [vocabReviewed, setVocabReviewed] = useState<number | null>(null);
  const [kanaDominados, setKanaDominados] = useState<number | null>(null);
  const TOTAL_KANA = KANA_ITEMS.length;

  useEffect(() => {
    setLastActivity("Practicar", "/practicar");
    const vocabProgress = loadVocabProgress("anon");
    setVocabReviewed(Object.keys(vocabProgress).length);
    const kanaProgress = loadKanaProgress("anon");
    const counts = getKanaStateCounts(KANA_ITEMS, kanaProgress);
    setKanaDominados(counts.fijado + counts.quemado);
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

        {/* ── Kana ── */}
        <Link
          href="/kana"
          style={{
            position: "relative",
            background: "#1A1A2E",
            borderRadius: "14px",
            padding: "20px 20px 22px",
            display: "block",
            textDecoration: "none",
            boxShadow: "0 4px 16px rgba(26,26,46,0.18)",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "20px", fontWeight: 800, color: "#FFFFFF", margin: 0, lineHeight: 1.1, letterSpacing: "-0.03em" }}>
                Kana
              </p>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", margin: "5px 0 0", lineHeight: 1.35 }}>
                Hiragana · Katakana · Smart SRS
              </p>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#E63946", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="16" height="11" viewBox="0 0 18 12" fill="none">
                <path d="M1 6h15m0 0l-5-5m5 5l-5 5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Dominados
              </span>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>
                {kanaDominados ?? "—"} / {TOTAL_KANA}
              </span>
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 999 }}>
              <div style={{ height: "100%", width: `${kanaDominados !== null ? Math.min(100, (kanaDominados / TOTAL_KANA) * 100) : 0}%`, background: "#4ECDC4", borderRadius: 999, transition: "width 0.4s ease" }} />
            </div>
          </div>
        </Link>

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
              Genki I · lecciones 3–23
            </p>
          </div>
        </Link>

      </div>

      <BottomNav />
    </div>
  );
}
