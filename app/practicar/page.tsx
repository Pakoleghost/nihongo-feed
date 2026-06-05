"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setLastActivity } from "@/lib/streak";

type TypeId = "kana" | "vocab" | "kanji" | "repaso";

const TYPES = [
  { id: "kana"   as TypeId, glyph: "あ", name: "Kana",        desc: "Hiragana y katakana → romaji", accent: "#E63946", accentBg: "rgba(230,57,70,0.14)" },
  { id: "vocab"  as TypeId, glyph: "語", name: "Vocabulario", desc: "Palabra → significado",         accent: "#4ECDC4", accentBg: "rgba(78,205,196,0.14)" },
  { id: "kanji"  as TypeId, glyph: "字", name: "Kanji",       desc: "Kanji → lectura",               accent: "#4ECDC4", accentBg: "rgba(78,205,196,0.14)" },
  { id: "repaso" as TypeId, glyph: "復", name: "Repaso",      desc: "Flashcards con memoria · SRS",  accent: "#4ECDC4", accentBg: "rgba(78,205,196,0.14)" },
];

const KANA_FILTERS = [
  { key: "hiragana", label: "Hiragana" },
  { key: "katakana", label: "Katakana" },
  { key: "ambos",    label: "Ambos" },
];

const LESSON_FILTERS = ["Todas","L1","L2","L3","L4","L5","L6","L7","L8","L9","L10","L11","L12"];

const DEFAULTS: Record<TypeId, { filter: string; count: number; max: number }> = {
  kana:   { filter: "hiragana", count: 10, max: 46 },
  vocab:  { filter: "Todas",    count: 10, max: 66 },
  kanji:  { filter: "Todas",    count: 10, max: 48 },
  repaso: { filter: "Todas",    count: 8,  max: 30 },
};

export default function PracticarPage() {
  const router = useRouter();
  const [typeId, setTypeId] = useState<TypeId>("kana");
  const [filter, setFilter] = useState("hiragana");
  const [count, setCount] = useState(10);

  const cfg = DEFAULTS[typeId];
  const type = TYPES.find((t) => t.id === typeId)!;
  const estMin = Math.max(1, Math.round((count * (typeId === "repaso" ? 9 : 7)) / 60));

  useEffect(() => { setLastActivity("Practicar", "/practicar"); }, []);

  function pickType(id: TypeId) {
    setTypeId(id);
    setFilter(DEFAULTS[id].filter);
    setCount(Math.min(count, DEFAULTS[id].max));
  }

  function start() {
    if (typeId === "kana") {
      const sets = filter === "ambos" ? "hiragana,katakana" : filter;
      router.push(`/kana/quiz?mode=libre&sets=${sets}&count=${count}&taskMode=mixed`);
    } else if (typeId === "vocab") {
      const lesson = filter === "Todas" ? 1 : parseInt(filter.replace("L", ""));
      router.push(`/practicar/vocabulario/practicar?lesson=${lesson}`);
    } else if (typeId === "kanji") {
      const lesson = filter === "Todas" ? 3 : parseInt(filter.replace("L", ""));
      router.push(`/practicar/kanji/practicar?lesson=${lesson}`);
    } else {
      const lesson = filter === "Todas" ? 1 : parseInt(filter.replace("L", ""));
      router.push(`/practicar/vocabulario/flashcards?lesson=${lesson}`);
    }
  }

  const chipFilters = typeId === "kana"
    ? KANA_FILTERS
    : LESSON_FILTERS.map((f) => ({ key: f, label: f }));

  return (
    <div className="sesh-layout" style={{ overflowY: "auto" }}>
      <div style={{ flex: 1, paddingBottom: 120, maxWidth: 760, width: "100%", margin: "0 auto" }}>

        {/* Title */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 34, fontWeight: 800, color: "#F4F4F8", letterSpacing: -0.5, lineHeight: 1.05 }}>Practicar</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: "rgba(244,244,248,0.56)", marginTop: 4 }}>Arma tu sesión y empieza cuando quieras.</div>
        </div>

        {/* Type cards 2×2 */}
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "1.4px", textTransform: "uppercase", color: "rgba(244,244,248,0.34)", marginBottom: 12 }}>
            Tipo de práctica
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {TYPES.map((t) => {
              const active = typeId === t.id;
              return (
                <button key={t.id} onClick={() => pickType(t.id)} style={{
                  cursor: "pointer", borderRadius: 20, padding: "16px 14px", textAlign: "left",
                  background: active ? t.accentBg : "rgba(255,255,255,0.06)",
                  border: `1.5px solid ${active ? t.accent : "rgba(255,255,255,0.09)"}`,
                  display: "flex", flexDirection: "column", gap: 8,
                  transition: "border-color .15s, background .15s",
                }}>
                  <span style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 28, fontWeight: 600, color: t.accent, lineHeight: 1 }}>
                    {t.glyph}
                  </span>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "#F4F4F8" }}>{t.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(244,244,248,0.56)", lineHeight: 1.3, marginTop: 2 }}>{t.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "1.4px", textTransform: "uppercase", color: "rgba(244,244,248,0.34)", marginBottom: 12 }}>
            {typeId === "kana" ? "Silabario" : "Lección"}
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginLeft: -20, marginRight: -20, paddingLeft: 20, paddingRight: 20, scrollbarWidth: "none" }}>
            {chipFilters.map(({ key, label }) => {
              const active = filter === key;
              return (
                <button key={key} onClick={() => setFilter(key)} style={{
                  flexShrink: 0, cursor: "pointer", borderRadius: 999, padding: "10px 18px",
                  fontSize: 15, fontWeight: 700, whiteSpace: "nowrap", fontFamily: "inherit",
                  background: active ? type.accentBg : "rgba(255,255,255,0.06)",
                  border: `1.5px solid ${active ? type.accent : "rgba(255,255,255,0.09)"}`,
                  color: active ? "#F4F4F8" : "rgba(244,244,248,0.56)",
                  transition: "background .15s, border-color .15s, color .15s",
                }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stepper */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "1.4px", textTransform: "uppercase", color: "rgba(244,244,248,0.34)", marginBottom: 12 }}>
            {typeId === "repaso" ? "Tarjetas por sesión" : "Número de ítems"}
          </div>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14,
            borderRadius: 22, padding: "18px",
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          }}>
            <button onClick={() => setCount((c) => Math.max(3, c - 1))} disabled={count <= 3} style={{
              width: 52, height: 52, flexShrink: 0, borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.09)",
              background: "rgba(255,255,255,0.09)",
              cursor: count <= 3 ? "not-allowed" : "pointer",
              fontSize: 26, fontWeight: 700,
              color: count <= 3 ? "rgba(244,244,248,0.2)" : "#F4F4F8",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>−</button>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 52, fontWeight: 800, color: "#F4F4F8", letterSpacing: -1, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {count}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(244,244,248,0.56)", marginTop: 4 }}>
                {count} de {cfg.max} · ~{estMin} min
              </div>
            </div>

            <button onClick={() => setCount((c) => Math.min(cfg.max, c + 1))} disabled={count >= cfg.max} style={{
              width: 52, height: 52, flexShrink: 0, borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.09)",
              background: "rgba(255,255,255,0.09)",
              cursor: count >= cfg.max ? "not-allowed" : "pointer",
              fontSize: 26, fontWeight: 700,
              color: count >= cfg.max ? "rgba(244,244,248,0.2)" : "#F4F4F8",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>+</button>
          </div>
        </div>
      </div>

      {/* Start button — fixed at bottom, above nav */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        padding: "16px 20px",
        paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))",
        background: "linear-gradient(to top, #0D0D1A 65%, transparent)",
        pointerEvents: "none",
      }}>
        <button
          onClick={start}
          className="sesh-btn"
          style={{
            background: type.accent,
            color: typeId === "kana" ? "#fff" : "#052B28",
            boxShadow: `0 10px 30px -8px ${type.accent}99`,
            pointerEvents: "all",
          }}
        >
          Empezar · {count} {typeId === "repaso" ? "tarjetas" : "ítems"}
        </button>
      </div>
    </div>
  );
}
