"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setLastActivity } from "@/lib/streak";

type TypeId = "kana" | "vocab" | "kanji" | "repaso";

const TYPES = [
  { id: "kana"   as TypeId, glyph: "かな", name: "Kana",        desc: "Hiragana y katakana → romaji" },
  { id: "vocab"  as TypeId, glyph: "語",   name: "Vocabulario", desc: "Palabra → significado" },
  { id: "kanji"  as TypeId, glyph: "字",   name: "Kanji",       desc: "Kanji → lectura" },
  { id: "repaso" as TypeId, glyph: "復",   name: "Repaso",      desc: "Flashcards · SRS" },
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
  const estMin = Math.max(1, Math.round((count * (typeId === "repaso" ? 9 : 7)) / 60));

  useEffect(() => {
    setLastActivity("Practicar", "/practicar");
  }, []);

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
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", overflowY: "auto", background: "#0D0D1A" }}>
      <div style={{ flex: 1, paddingBottom: 120, maxWidth: 760, width: "100%", margin: "0 auto", padding: "20px 20px 120px" }}>

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
                  cursor: "pointer", borderRadius: 16, padding: "14px", textAlign: "left",
                  background: active ? "rgba(78,205,196,0.12)" : "#16161F",
                  border: `1.5px solid ${active ? "#4ECDC4" : "rgba(255,255,255,0.07)"}`,
                  display: "flex", flexDirection: "column", gap: 8, minHeight: 78,
                  justifyContent: "space-between",
                  transition: "border-color .15s, background .15s",
                }}>
                  <span style={{ fontFamily: "var(--font-zen-kaku, 'Zen Kaku Gothic New'), sans-serif", fontSize: 13, fontWeight: 500, color: active ? "#4ECDC4" : "rgba(244,244,248,0.3)", lineHeight: 1 }}>
                    {t.glyph}
                  </span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#F4F4F8" }}>{t.name}</div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: "rgba(244,244,248,0.5)", lineHeight: 1.3, marginTop: 2 }}>{t.desc}</div>
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
                  flexShrink: 0, cursor: "pointer", borderRadius: 999, padding: "0 16px",
                  height: 38, fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", fontFamily: "inherit",
                  display: "flex", alignItems: "center",
                  background: active ? "#F4F4F8" : "#16161F",
                  border: `1.5px solid ${active ? "#F4F4F8" : "rgba(255,255,255,0.07)"}`,
                  color: active ? "#0D0D1A" : "rgba(244,244,248,0.5)",
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
            background: "#16161F", border: "1px solid rgba(255,255,255,0.07)",
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

      {/* Start button — fixed at bottom, above nav pill (~80px) */}
      <div style={{
        position: "fixed", bottom: "calc(60px + env(safe-area-inset-bottom, 0px))", left: 0, right: 0,
        padding: "16px 20px 0",
        background: "linear-gradient(to top, #0D0D1A 65%, transparent)",
        pointerEvents: "none",
      }}>
        <button
          onClick={start}
          className="sesh-btn"
          style={{
            background: "#E63946",
            color: "#fff",
            pointerEvents: "all",
          }}
        >
          Empezar · {count} {typeId === "repaso" ? "tarjetas" : "ítems"}
        </button>
      </div>
    </div>
  );
}
