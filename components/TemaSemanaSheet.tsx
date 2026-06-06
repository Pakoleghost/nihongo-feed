"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FuriganaText from "@/components/FuriganaText";
import type { TemaSemana, SlotPlantilla, OpcionSlot, FraseBilingue, BloqueDesglose, TipoBloque } from "@/lib/temas-semana";
import type { WeeklyTopic } from "@/lib/weekly-topics";

// ── constants ─────────────────────────────────────────────────────────────────

const TEAL = "#4ECDC4";
const TOTAL_STEPS = 5;   // 0 intro · 1 fórmula · 2 ejemplo · 3 arma · 4 ¡lista!

type Selections = Record<string, OpcionSlot>;

type Props = {
  onClose: () => void;
  onUseSentence: (sentence: string) => void;
  tema: TemaSemana | null;
  fallback: WeeklyTopic;
};

type Segment = { type: "text"; value: string } | { type: "slot"; slotId: string };

// ── template helpers ──────────────────────────────────────────────────────────

function parseTemplate(estructura: string): Segment[] {
  const segs: Segment[] = [];
  const re = /\{\{([^}]+)\}\}/g;
  let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(estructura)) !== null) {
    if (m.index > last) segs.push({ type: "text", value: estructura.slice(last, m.index) });
    segs.push({ type: "slot", slotId: m[1] });
    last = re.lastIndex;
  }
  if (last < estructura.length) segs.push({ type: "text", value: estructura.slice(last) });
  return segs;
}

function buildJp(estructura: string, sel: Selections): string {
  return estructura.replace(/\{\{([^}]+)\}\}/g, (_, id) => sel[id]?.jp ?? "");
}

function buildEs(estructuraEs: string, sel: Selections): string {
  return estructuraEs.replace(/\{\{([^}]+)\}\}/g, (_, id) => sel[id]?.es ?? "____");
}

// ── shared UI pieces ──────────────────────────────────────────────────────────

const LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 900, letterSpacing: "0.12em",
  textTransform: "uppercase", color: TEAL, margin: "0 0 14px",
};

/** A pattern like "きょうは ___ です。" with a styled blank. */
function PatternLine({ jp }: { jp: string }) {
  return (
    <span style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 26, fontWeight: 600, lineHeight: 1.7, color: "#FFFFFF" }}>
      {jp.split("___").map((part, i, arr) => (
        <span key={i}>
          {part}
          {i < arr.length - 1 && (
            <span style={{ display: "inline-block", minWidth: 54, textAlign: "center", color: TEAL, background: "rgba(78,205,196,0.13)", border: "1.5px dashed rgba(78,205,196,0.5)", borderRadius: 6, padding: "0 8px", margin: "0 2px" }}>
              ？
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

function NextBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{ width: "100%", padding: "15px 0", borderRadius: 13, border: "none", cursor: disabled ? "not-allowed" : "pointer", fontSize: 15, fontWeight: 800, background: disabled ? "rgba(255,255,255,0.07)" : TEAL, color: disabled ? "rgba(255,255,255,0.28)" : "#12121F", transition: "background 180ms ease, color 180ms ease", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
      {label}
    </button>
  );
}

/** Live JP + ES preview for the builder. */
function LivePreview({ segs, slots, sel, esText }: { segs: Segment[]; slots: SlotPlantilla[]; sel: Selections; esText: string }) {
  return (
    <div style={{ background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "16px 18px", marginBottom: 18 }}>
      <div style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 24, fontWeight: 600, lineHeight: 1.7, color: "#FFFFFF", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2px 1px" }}>
        {segs.map((seg, i) => {
          if (seg.type === "text") return <span key={i}>{seg.value}</span>;
          const slot = slots.find(s => s.id === seg.slotId);
          const chosen = sel[seg.slotId];
          return chosen
            ? <span key={i} style={{ color: TEAL, fontWeight: 800, background: "rgba(78,205,196,0.13)", borderRadius: 6, padding: "0 7px" }}>{chosen.jp}</span>
            : <span key={i} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.07)", border: "1.5px dashed rgba(255,255,255,0.18)", borderRadius: 6, padding: "0 12px", fontSize: 15, minWidth: 56, fontFamily: "var(--font-noto-sans-jp), sans-serif" }}>{slot?.etiqueta ?? "…"}</span>;
        })}
      </div>
      <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "12px 0" }} />
      <p style={{ margin: 0, fontSize: 15, fontStyle: "italic", color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>{esText}</p>
    </div>
  );
}

/** Vocabulary chips with JP + ES stacked. */
function SlotChips({ slot, selected, onSelect }: { slot: SlotPlantilla; selected: OpcionSlot | undefined; onSelect: (op: OpcionSlot) => void }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ margin: "0 0 9px", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>Elige: {slot.etiqueta}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {slot.opciones.map(op => {
          const active = op.jp === selected?.jp;
          return (
            <button key={op.jp} type="button" onClick={() => { navigator.vibrate?.(8); onSelect(op); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, background: active ? TEAL : "rgba(255,255,255,0.07)", border: active ? "none" : "1px solid rgba(255,255,255,0.10)", borderRadius: 11, padding: "8px 14px", cursor: "pointer", transition: "background 140ms ease, transform 100ms ease", transform: active ? "scale(1.04)" : "scale(1)" }}>
              <span style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif", fontSize: 16, fontWeight: 700, color: active ? "#12121F" : "#FFFFFF", lineHeight: 1.3 }}>{op.jp}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: active ? "rgba(18,18,31,0.65)" : "rgba(255,255,255,0.4)", lineHeight: 1.2 }}>{op.es}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Extension bolt-on chips (step 4). */
function ExtensionChips({ extensiones, selected, onToggle }: { extensiones: FraseBilingue[]; selected: Set<number>; onToggle: (i: number) => void }) {
  return (
    <div>
      <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 900, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
        ¿Le agregamos algo? <span style={{ color: "rgba(255,255,255,0.28)", fontWeight: 600 }}>(opcional)</span>
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {extensiones.map((ext, i) => {
          const active = selected.has(i);
          return (
            <button key={i} type="button" onClick={() => { navigator.vibrate?.(6); onToggle(i); }} style={{ display: "flex", alignItems: "flex-start", gap: 12, textAlign: "left", background: active ? "rgba(78,205,196,0.10)" : "rgba(255,255,255,0.04)", border: active ? `1px solid rgba(78,205,196,0.35)` : "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 14px", cursor: "pointer", transition: "background 150ms ease, border-color 150ms ease" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${active ? TEAL : "rgba(255,255,255,0.2)"}`, background: active ? TEAL : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 150ms ease", marginTop: 2 }}>
                {active && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="#12121F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 17, fontWeight: 500, color: active ? "#FFFFFF" : "rgba(255,255,255,0.8)", lineHeight: 1.6, marginBottom: 3 }}>
                  {ext.jp}
                </div>
                <div style={{ fontSize: 13, color: active ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.38)", lineHeight: 1.3 }}>
                  {ext.es}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── desglose visual ───────────────────────────────────────────────────────────

const BLOQUE_STYLES: Record<TipoBloque, { bg: string; color: string; italic?: boolean; small?: boolean }> = {
  nom:  { bg: "rgba(78,205,196,0.14)",  color: "#4ECDC4" },
  part: { bg: "transparent",            color: "rgba(255,255,255,0.42)", italic: true },
  pred: { bg: "rgba(255,255,255,0.09)", color: "#FFFFFF" },
  aux:  { bg: "transparent",            color: "rgba(255,255,255,0.28)", small: true },
  adv:  { bg: "rgba(240,165,0,0.12)",   color: "rgba(240,165,0,0.85)" },
};

function DesgloseVisual({ bloques, sel }: { bloques: BloqueDesglose[]; sel: Record<string, import("@/lib/temas-semana").OpcionSlot> }) {
  return (
    <div>
      <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
        ¿Cómo funciona?
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "flex-end" }}>
        {bloques.map((b, i) => {
          const st = BLOQUE_STYLES[b.t];
          const word = b.txt.startsWith("{{") ? (sel[b.txt.slice(2,-2)]?.jp ?? b.txt) : b.txt;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{
                background: st.bg,
                borderRadius: 7,
                padding: b.t === "part" || b.t === "aux" ? "5px 6px" : "6px 10px",
                fontFamily: "var(--font-noto-serif-jp), serif",
                fontSize: b.t === "aux" ? 14 : 17,
                fontWeight: b.t === "nom" ? 800 : b.t === "pred" ? 700 : 500,
                color: st.color,
                fontStyle: st.italic ? "italic" : "normal",
                lineHeight: 1.3,
              }}>
                {word}
              </div>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.32)", fontWeight: 600, textAlign: "center", lineHeight: 1.2, maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {b.es}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── slide animation ────────────────────────────────────────────────────────────

const slide = {
  enter: (d: number) => ({ x: d > 0 ? 52 : -52, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (d: number) => ({ x: d > 0 ? -52 : 52, opacity: 0 }),
};

// ── main component ────────────────────────────────────────────────────────────

export default function TemaSemanaSheet({ onClose, onUseSentence, tema, fallback }: Props) {
  const [step, setStep] = useState(0);
  const [dir,  setDir]  = useState(1);
  const [sel,  setSel]  = useState<Selections>({});
  const [extSel, setExtSel] = useState<Set<number>>(new Set());

  const segs = useMemo(() => tema ? parseTemplate(tema.plantilla.estructura) : [], [tema]);

  const allFilled = useMemo(
    () => tema ? tema.plantilla.slots.every(s => Boolean(sel[s.id])) : false,
    [tema, sel],
  );

  const builtJp = useMemo(
    () => tema && allFilled ? buildJp(tema.plantilla.estructura, sel) : "",
    [tema, allFilled, sel],
  );

  const builtEs = useMemo(
    () => tema ? buildEs(tema.plantilla.estructuraEs, sel) : "",
    [tema, sel],
  );

  function next() { setDir(1);  setStep(s => Math.min(s + 1, TOTAL_STEPS - 1)); }
  function back() { setDir(-1); setStep(s => Math.max(s - 1, 0)); }

  function handleUse() {
    if (!builtJp) return;
    const extras = tema
      ? Array.from(extSel).sort().map(i => tema.extensiones[i].jp)
      : [];
    const fullText = [builtJp, ...extras].join("\n");
    onUseSentence(fullText);
  }

  // ── step renderers ────────────────────────────────────────────────────────

  function renderStep() {
    // Fallback (no matching topic)
    if (!tema) return (
      <div style={{ textAlign: "center", padding: "12px 0 8px" }}>
        <div style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 28, fontWeight: 700, color: "#FFFFFF", marginBottom: 10 }}>{fallback.kana}</div>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", margin: "0 0 24px", lineHeight: 1.5 }}>{fallback.prompt}</p>
        <NextBtn label="Entendido" onClick={onClose} />
      </div>
    );

    switch (step) {

      // ── 0 Intro ──────────────────────────────────────────────────────────
      case 0:
        return (
          <div>
            <p style={LABEL}>Tema de la semana</p>
            <div style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 32, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.25, marginBottom: 8 }}>{tema.kana}</div>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", margin: "0 0 22px", lineHeight: 1.4 }}>{tema.prompt}</p>
            <div style={{ background: "rgba(78,205,196,0.08)", border: "1px solid rgba(78,205,196,0.18)", borderRadius: 14, padding: "16px 18px", display: "flex", gap: 12, alignItems: "center", marginBottom: 28 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>🎯</span>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#FFFFFF", lineHeight: 1.45 }}>{tema.meta}</p>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", margin: "0 0 22px", textAlign: "center" }}>Te llevo en 4 pasitos. ¡Es fácil!</p>
            <NextBtn label="Empezar →" onClick={next} />
          </div>
        );

      // ── 1 Fórmula ────────────────────────────────────────────────────────
      case 1:
        return (
          <div>
            <p style={LABEL}>Paso 1 · La fórmula</p>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "22px 20px", marginBottom: 16, textAlign: "center" }}>
              <PatternLine jp={tema.patron.jp} />
              <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "16px 0" }} />
              <p style={{ margin: 0, fontSize: 16, color: "rgba(255,255,255,0.62)", lineHeight: 1.4 }}>{tema.patron.es}</p>
            </div>
            <div style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 28, padding: "0 4px" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
              <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.55 }}>{tema.nota}</p>
            </div>
            <NextBtn label="Siguiente →" onClick={next} />
          </div>
        );

      // ── 2 Ejemplo ────────────────────────────────────────────────────────
      case 2:
        return (
          <div>
            <p style={LABEL}>Paso 2 · Un ejemplo</p>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "24px 20px", marginBottom: 16, boxShadow: `inset 3px 0 0 ${TEAL}` }}>
              <FuriganaText
                text={tema.ejemplo.jp}
                rtColor="rgba(255,255,255,0.55)"
                style={{ display: "block", fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 25, fontWeight: 500, color: "#FFFFFF", lineHeight: 1.7, marginBottom: 12, letterSpacing: "0.01em" }}
              />
              <p style={{ margin: 0, fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.45 }}>{tema.ejemplo.es}</p>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", margin: "0 0 28px", textAlign: "center" }}>
              Así se ve completa. ¡Ahora arma la tuya!
            </p>
            <NextBtn label="Ahora tú →" onClick={next} />
          </div>
        );

      // ── 3 Arma ───────────────────────────────────────────────────────────
      case 3:
        return (
          <div>
            <p style={LABEL}>Paso 3 · Arma la tuya</p>
            <LivePreview segs={segs} slots={tema.plantilla.slots} sel={sel} esText={builtEs} />
            {tema.plantilla.slots.map(slot => (
              <SlotChips key={slot.id} slot={slot} selected={sel[slot.id]} onSelect={op => setSel(p => ({ ...p, [slot.id]: op }))} />
            ))}
            <div style={{ marginTop: 4 }}>
              <NextBtn
                label={allFilled ? "¡Lista! Siguiente →" : "Elige una palabra arriba ↑"}
                onClick={next}
                disabled={!allFilled}
              />
            </div>
          </div>
        );

      // ── 4 ¡Lista! ────────────────────────────────────────────────────────
      case 4:
        return (
          <div>
            {/* Celebration */}
            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <div style={{ fontSize: 38, marginBottom: 10 }}>🎉</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: TEAL, margin: 0, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                ¡Tu oración está lista!
              </p>
            </div>

            {/* Completed sentence preview */}
            <div style={{ background: "linear-gradient(135deg, rgba(78,205,196,0.10), rgba(78,205,196,0.04))", border: `1px solid rgba(78,205,196,0.25)`, borderRadius: 14, padding: "18px 20px", marginBottom: 20 }}>
              <div style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 22, fontWeight: 600, color: "#FFFFFF", lineHeight: 1.7, marginBottom: 10 }}>
                {builtJp}
                {/* Preview of selected extensions */}
                {Array.from(extSel).sort().map(i => (
                  <span key={i} style={{ display: "block", color: "rgba(255,255,255,0.7)", fontWeight: 400, fontSize: 19 }}>
                    {tema.extensiones[i].jp}
                  </span>
                ))}
              </div>
              <div style={{ height: 1, background: "rgba(78,205,196,0.2)", margin: "10px 0" }} />
              <p style={{ margin: 0, fontSize: 14, fontStyle: "italic", color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>
                {buildEs(tema.plantilla.estructuraEs, sel)}
                {Array.from(extSel).sort().map(i => (
                  <span key={i} style={{ display: "block" }}>
                    {tema.extensiones[i].es}
                  </span>
                ))}
              </p>
            </div>

            {/* Desglose visual */}
            <div style={{ marginBottom: 22, padding: "14px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14 }}>
              <DesgloseVisual bloques={tema.plantilla.desglose} sel={sel} />
            </div>

            {/* Extension chips */}
            <ExtensionChips
              extensiones={tema.extensiones}
              selected={extSel}
              onToggle={i => setExtSel(prev => {
                const next = new Set(prev);
                next.has(i) ? next.delete(i) : next.add(i);
                return next;
              })}
            />

            {/* Free-write nudge */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", margin: "18px 0 16px", padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>✏️</span>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.55 }}>
                <strong style={{ color: "rgba(255,255,255,0.78)", fontWeight: 700 }}>¿Puedes agregar algo tuyo?</strong>
                {" "}Cuando publiques puedes escribir más. Una palabra extra o un emoji ya cuentan. 🌸
              </p>
            </div>

            {/* Photo invite */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "13px 16px", background: "rgba(240,165,0,0.07)", border: "1px solid rgba(240,165,0,0.18)", borderRadius: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>📷</span>
              <p style={{ margin: 0, fontSize: 14, color: "rgba(240,165,0,0.9)", lineHeight: 1.4, fontWeight: 600 }}>
                {tema.fotoSugerencia}
              </p>
            </div>

            {/* CTA */}
            <NextBtn label="✓ Usar esta oración" onClick={handleUse} />
          </div>
        );

      default: return null;
    }
  }

  // ── layout ────────────────────────────────────────────────────────────────

  return (
    <>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.72)" }}
      />

      <motion.div
        key="panel"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
        transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.85 }}
        onClick={e => e.stopPropagation()}
        style={{ position: "fixed", bottom: "calc(60px + env(safe-area-inset-bottom, 0px))", left: 0, right: 0, zIndex: 501, background: "#12121F", borderRadius: "22px 22px 0 0", maxHeight: "calc(92dvh - 60px - env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        {/* Header: back · dots · close */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 12px" }}>
          <button
            onClick={step > 0 ? back : onClose}
            style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            aria-label={step > 0 ? "Atrás" : "Cerrar"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="rgba(255,255,255,0.6)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {tema ? (
            <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div key={i} style={{ width: i === step ? 22 : 7, height: 7, borderRadius: 4, background: i <= step ? TEAL : "rgba(255,255,255,0.18)", transition: "width 220ms ease, background 220ms ease" }} />
              ))}
            </div>
          ) : (
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.14)" }} />
          )}

          <button
            onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            aria-label="Cerrar"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="rgba(255,255,255,0.55)" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Animated step content */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 22px", paddingBottom: 28 }}>
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={tema ? step : "fallback"}
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
