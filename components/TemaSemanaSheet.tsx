"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import FuriganaText from "@/components/FuriganaText";
import type { TemaSemana, SlotPlantilla, OpcionSlot } from "@/lib/temas-semana";
import type { WeeklyTopic } from "@/lib/weekly-topics";

// ── constants ─────────────────────────────────────────────────────────────────

const TEAL  = "#4ECDC4";
const AMBER = "#F0A500";

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: TEAL,
  margin: "0 0 12px",
};

// ── types ─────────────────────────────────────────────────────────────────────

type Selections = Record<string, OpcionSlot>;  // slotId -> chosen option

type Props = {
  onClose: () => void;
  onUseSentence: (sentence: string) => void;
  tema: TemaSemana | null;
  fallback: WeeklyTopic;
};

type Segment = { type: "text"; value: string } | { type: "slot"; slotId: string };

// ── template parsing ──────────────────────────────────────────────────────────

function parseTemplate(estructura: string): Segment[] {
  const segs: Segment[] = [];
  const re = /\{\{([^}]+)\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
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

// ── sub-components ──────────────────────────────────────────────────────────────

/** Live preview: Japanese sentence with filled/blank slots */
function JpPreview({
  segs, slots, sel,
}: { segs: Segment[]; slots: SlotPlantilla[]; sel: Selections }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-noto-serif-jp), serif",
        fontSize: 25,
        fontWeight: 600,
        lineHeight: 1.7,
        color: "#FFFFFF",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "2px 1px",
      }}
    >
      {segs.map((seg, i) => {
        if (seg.type === "text") {
          return <span key={i}>{seg.value}</span>;
        }
        const slot = slots.find(s => s.id === seg.slotId);
        const chosen = sel[seg.slotId];
        return chosen ? (
          <span
            key={i}
            style={{
              color: TEAL,
              fontWeight: 800,
              background: "rgba(78,205,196,0.13)",
              borderRadius: 6,
              padding: "0 7px",
            }}
          >
            {chosen.jp}
          </span>
        ) : (
          <span
            key={i}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.3)",
              background: "rgba(255,255,255,0.07)",
              border: "1.5px dashed rgba(255,255,255,0.18)",
              borderRadius: 6,
              padding: "0 12px",
              fontSize: 15,
              minWidth: 56,
              fontFamily: "var(--font-noto-sans-jp), sans-serif",
            }}
          >
            {slot?.etiqueta ?? "…"}
          </span>
        );
      })}
    </div>
  );
}

/** Vocab chips for one slot */
function SlotChips({
  slot, selected, onSelect,
}: { slot: SlotPlantilla; selected: OpcionSlot | undefined; onSelect: (op: OpcionSlot) => void }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p
        style={{
          margin: "0 0 9px",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.4)",
        }}
      >
        Elige: {slot.etiqueta}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {slot.opciones.map(op => {
          const isActive = op.jp === selected?.jp;
          return (
            <button
              key={op.jp}
              type="button"
              onClick={() => onSelect(op)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1,
                background: isActive ? TEAL : "rgba(255,255,255,0.07)",
                border: isActive ? "none" : "1px solid rgba(255,255,255,0.10)",
                borderRadius: 11,
                padding: "8px 14px",
                cursor: "pointer",
                transition: "background 140ms ease, transform 100ms ease",
                transform: isActive ? "scale(1.04)" : "scale(1)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-noto-sans-jp), sans-serif",
                  fontSize: 16,
                  fontWeight: 700,
                  color: isActive ? "#12121F" : "#FFFFFF",
                  lineHeight: 1.3,
                }}
              >
                {op.jp}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: isActive ? "rgba(18,18,31,0.65)" : "rgba(255,255,255,0.4)",
                  lineHeight: 1.2,
                }}
              >
                {op.es}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function TemaSemanaSheet({ onClose, onUseSentence, tema, fallback }: Props) {
  const kana   = tema?.kana   ?? fallback.kana;
  const prompt = tema?.prompt ?? fallback.prompt;

  const [sel, setSel] = useState<Selections>({});

  const segs = useMemo(
    () => tema ? parseTemplate(tema.plantilla.estructura) : [],
    [tema],
  );

  const allFilled = useMemo(
    () => tema ? tema.plantilla.slots.every(s => Boolean(sel[s.id])) : false,
    [tema, sel],
  );

  const esPreview = useMemo(
    () => tema ? buildEs(tema.plantilla.estructuraEs, sel) : "",
    [tema, sel],
  );

  function handleUse() {
    if (!tema || !allFilled) return;
    onUseSentence(buildJp(tema.plantilla.estructura, sel));
  }

  return (
    <>
      {/* ── Backdrop ── */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 500,
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />

      {/* ── Panel ── */}
      <motion.div
        key="panel"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
        transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.85 }}
        onClick={e => e.stopPropagation()}
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 501,
          background: "#12121F",
          borderRadius: "22px 22px 0 0",
          maxHeight: "92dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ── Sticky header ── */}
        <div style={{ flexShrink: 0, background: "#12121F", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px 8px" }}>
            <div style={{ width: 28 }} />
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.14)" }} />
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              aria-label="Cerrar"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="rgba(255,255,255,0.55)" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div style={{ padding: "4px 22px 18px" }}>
            {tema?.detalle.patron && (
              <div style={{ display: "inline-flex", alignItems: "center", background: "rgba(78,205,196,0.12)", borderRadius: 6, padding: "5px 11px", marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: TEAL, fontFamily: "var(--font-noto-sans-jp), sans-serif", letterSpacing: "0.02em" }}>
                  {tema.detalle.patron}
                </span>
              </div>
            )}
            <div style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 30, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.2, letterSpacing: "0.01em", marginBottom: 7 }}>
              {kana}
            </div>
            <div style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
              {prompt}
            </div>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "22px", paddingBottom: "calc(28px + env(safe-area-inset-bottom, 0px))" }}>
          {tema ? (
            <>
              {/* ─── ¿Cómo funciona? ─── */}
              <p style={SECTION_LABEL}>¿Cómo se dice?</p>
              <p style={{ margin: "0 0 0", fontSize: 15, lineHeight: 1.65, color: "rgba(255,255,255,0.72)" }}>
                {tema.detalle.explicacion}
              </p>
              {tema.detalle.consejo && (
                <div style={{ background: "rgba(240,165,0,0.08)", border: "1px solid rgba(240,165,0,0.18)", borderRadius: 12, padding: "12px 14px", marginTop: 14, display: "flex", gap: 9, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>💡</span>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "rgba(240,165,0,0.92)" }}>
                    {tema.detalle.consejo}
                  </p>
                </div>
              )}

              {/* ─── Sentence builder (HERO) ─── */}
              <div
                style={{
                  marginTop: 26,
                  borderRadius: 18,
                  border: `1px solid rgba(78,205,196,0.22)`,
                  background: "linear-gradient(160deg, rgba(78,205,196,0.07), rgba(78,205,196,0.02))",
                  padding: 18,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <p style={{ ...SECTION_LABEL, margin: 0 }}>Arma tu oración</p>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#12121F", background: TEAL, borderRadius: 5, padding: "2px 7px" }}>
                    toca y elige
                  </div>
                </div>

                {/* Live preview — JP + ES */}
                <div
                  style={{
                    background: "rgba(0,0,0,0.22)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 14,
                    padding: "16px 18px",
                    marginBottom: 18,
                  }}
                >
                  <JpPreview segs={segs} slots={tema.plantilla.slots} sel={sel} />
                  <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "12px 0" }} />
                  <p style={{ margin: 0, fontSize: 15, fontStyle: "italic", color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
                    {esPreview}
                  </p>
                </div>

                {/* Chips per slot */}
                {tema.plantilla.slots.map(slot => (
                  <SlotChips
                    key={slot.id}
                    slot={slot}
                    selected={sel[slot.id]}
                    onSelect={op => setSel(prev => ({ ...prev, [slot.id]: op }))}
                  />
                ))}

                {/* CTA */}
                <button
                  type="button"
                  onClick={handleUse}
                  disabled={!allFilled}
                  style={{
                    width: "100%",
                    marginTop: 4,
                    padding: "15px 0",
                    borderRadius: 13,
                    border: "none",
                    cursor: allFilled ? "pointer" : "not-allowed",
                    fontSize: 15,
                    fontWeight: 800,
                    letterSpacing: "0.01em",
                    background: allFilled ? TEAL : "rgba(255,255,255,0.07)",
                    color: allFilled ? "#12121F" : "rgba(255,255,255,0.28)",
                    transition: "background 200ms ease, color 200ms ease",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  {allFilled ? (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="#12121F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Usar esta oración
                    </>
                  ) : (
                    "Elige una palabra arriba ↑"
                  )}
                </button>
              </div>

              {/* ─── Ejemplos ─── */}
              <p style={{ ...SECTION_LABEL, marginTop: 28 }}>Más ejemplos</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {tema.detalle.ejemplos.map((ej, i) => {
                  const isBasico    = ej.nivel === "básico";
                  const accentColor = isBasico ? TEAL : AMBER;
                  const badgeBg     = isBasico ? "rgba(78,205,196,0.14)" : "rgba(240,165,0,0.14)";
                  return (
                    <div
                      key={i}
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: 14,
                        padding: "16px 18px",
                        boxShadow: `inset 3px 0 0 ${accentColor}`,
                      }}
                    >
                      <div style={{ marginBottom: 12 }}>
                        <span style={{ display: "inline-block", background: badgeBg, color: accentColor, borderRadius: 5, padding: "3px 9px", fontSize: 10, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                          {isBasico ? "Fácil" : "Un poco más"}
                        </span>
                      </div>
                      <FuriganaText
                        text={ej.texto}
                        rtColor="rgba(255,255,255,0.55)"
                        style={{
                          display: "block",
                          fontFamily: "var(--font-noto-serif-jp), serif",
                          fontSize: 21, fontWeight: 500,
                          color: "#FFFFFF", lineHeight: 1.75,
                          marginBottom: 10, letterSpacing: "0.01em",
                        }}
                      />
                      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: "rgba(255,255,255,0.5)" }}>
                        {ej.espanol}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* footer nudge */}
              <p style={{ marginTop: 22, fontSize: 13, color: "rgba(255,255,255,0.32)", lineHeight: 1.5, textAlign: "center" }}>
                Puedes editar la oración o escribir la tuya.<br/>¡No hay respuesta incorrecta! 🌱
              </p>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>✍️</div>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF", margin: "0 0 8px" }}>¡Es tu turno!</p>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.5 }}>
                Escribe algo sobre el tema de esta semana. Una oración está perfecto.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
