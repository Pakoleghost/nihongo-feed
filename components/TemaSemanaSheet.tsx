"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import FuriganaText from "@/components/FuriganaText";
import type { TemaSemana, SlotPlantilla } from "@/lib/temas-semana";
import type { WeeklyTopic } from "@/lib/weekly-topics";

// ── constants ─────────────────────────────────────────────────────────────────

const TEAL  = "#4ECDC4";
const AMBER = "#F0A500";

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: TEAL,
  marginBottom: 10,
};

const DIVIDER: React.CSSProperties = {
  height: 1,
  background: "rgba(255,255,255,0.06)",
  margin: "20px 0",
};

// ── types ─────────────────────────────────────────────────────────────────────

type Selections = Record<string, string>;

type Props = {
  onClose: () => void;
  onUseSentence: (sentence: string) => void;
  tema: TemaSemana | null;
  fallback: WeeklyTopic;
};

// ── template parser ───────────────────────────────────────────────────────────

type Segment = { type: "text"; value: string } | { type: "slot"; slotId: string };

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

function buildSentence(estructura: string, selections: Selections): string {
  return estructura.replace(/\{\{([^}]+)\}\}/g, (_, id) => selections[id] ?? "");
}

// ── vocab helpers ─────────────────────────────────────────────────────────────

function splitVocab(item: string): { jp: string; es: string } {
  const idx = item.indexOf(" = ");
  if (idx === -1) return { jp: item, es: "" };
  return { jp: item.slice(0, idx), es: item.slice(idx + 3) };
}

// ── sub-components ────────────────────────────────────────────────────────────

/** Live sentence preview with filled/unfilled slots */
function SentencePreview({
  segs,
  slots,
  selections,
}: {
  segs: Segment[];
  slots: SlotPlantilla[];
  selections: Selections;
}) {
  return (
    <div
      style={{
        fontFamily: "var(--font-noto-serif-jp), serif",
        fontSize: 20,
        fontWeight: 500,
        lineHeight: 1.8,
        letterSpacing: "0.01em",
        padding: "14px 18px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 12,
        marginBottom: 16,
        minHeight: 56,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "2px 0",
      }}
    >
      {segs.map((seg, i) => {
        if (seg.type === "text") {
          return (
            <span key={i} style={{ color: "#FFFFFF" }}>
              {seg.value}
            </span>
          );
        }
        const slot = slots.find(s => s.id === seg.slotId);
        const selected = selections[seg.slotId];
        return selected ? (
          <span
            key={i}
            style={{
              color: TEAL,
              fontWeight: 800,
              background: "rgba(78,205,196,0.12)",
              borderRadius: 5,
              padding: "0 6px",
            }}
          >
            {selected}
          </span>
        ) : (
          <span
            key={i}
            style={{
              display: "inline-flex",
              alignItems: "center",
              color: "rgba(255,255,255,0.28)",
              background: "rgba(255,255,255,0.06)",
              borderRadius: 5,
              padding: "0 10px",
              fontSize: 14,
              minWidth: 48,
              justifyContent: "center",
            }}
          >
            {slot?.etiqueta ?? "…"}
          </span>
        );
      })}
    </div>
  );
}

/** Chips for a single slot */
function SlotChips({
  slot,
  selected,
  onSelect,
}: {
  slot: SlotPlantilla;
  selected: string | undefined;
  onSelect: (val: string) => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      {/* Slot label */}
      {<p
        style={{
          margin: "0 0 8px",
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.35)",
        }}
      >
        {slot.etiqueta}
      </p>}

      {/* Chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {slot.opciones.map(op => {
          const isActive = op === selected;
          return (
            <button
              key={op}
              type="button"
              onClick={() => onSelect(isActive ? "" : op)}
              style={{
                background: isActive ? TEAL : "rgba(255,255,255,0.07)",
                color: isActive ? "#12121F" : "#FFFFFF",
                border: isActive
                  ? "none"
                  : "1px solid rgba(255,255,255,0.10)",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 13,
                fontWeight: isActive ? 800 : 500,
                fontFamily: "var(--font-noto-sans-jp), sans-serif",
                cursor: "pointer",
                transition: "background 140ms ease, color 140ms ease, transform 100ms ease",
                transform: isActive ? "scale(1.03)" : "scale(1)",
                lineHeight: 1.4,
              }}
            >
              {op}
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

  // Selections for the sentence builder
  const [selections, setSelections] = useState<Selections>({});

  const segs = useMemo(
    () => tema ? parseTemplate(tema.plantilla.estructura) : [],
    [tema],
  );

  const allFilled = useMemo(
    () => tema ? tema.plantilla.slots.every(s => Boolean(selections[s.id])) : false,
    [tema, selections],
  );

  const completedSentence = useMemo(
    () => tema && allFilled ? buildSentence(tema.plantilla.estructura, selections) : "",
    [tema, allFilled, selections],
  );

  function handleSelect(slotId: string, value: string) {
    setSelections(prev => ({ ...prev, [slotId]: value }));
  }

  function handleUse() {
    if (!completedSentence) return;
    onUseSentence(completedSentence);
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
          position: "fixed",
          bottom: 0, left: 0, right: 0,
          zIndex: 501,
          background: "#12121F",
          borderRadius: "22px 22px 0 0",
          maxHeight: "90dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ── Sticky header ─────────────────────────────────── */}
        <div
          style={{
            flexShrink: 0,
            background: "#12121F",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Handle + close */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 18px 8px",
            }}
          >
            <div style={{ width: 28 }} />
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.14)" }} />
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              aria-label="Cerrar"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="rgba(255,255,255,0.55)" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Grammar chip + kana + prompt */}
          <div style={{ padding: "4px 22px 18px" }}>
            {tema?.detalle.patron && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  background: "rgba(78,205,196,0.12)",
                  borderRadius: 6,
                  padding: "4px 10px",
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 12, fontWeight: 700, color: TEAL,
                    fontFamily: "var(--font-noto-sans-jp), sans-serif",
                    letterSpacing: "0.02em",
                  }}
                >
                  {tema.detalle.patron}
                </span>
              </div>
            )}

            <div
              style={{
                fontFamily: "var(--font-noto-serif-jp), serif",
                fontSize: 28, fontWeight: 700,
                color: "#FFFFFF",
                lineHeight: 1.2,
                letterSpacing: "0.01em",
                marginBottom: 6,
              }}
            >
              {kana}
            </div>

            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.48)", lineHeight: 1.35 }}>
              {prompt}
            </div>
          </div>
        </div>

        {/* ── Scrollable body ─────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 22px",
            paddingBottom: "calc(28px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {tema ? (
            <>
              {/* ─── Cómo responder ─────────────────────────── */}
              <p style={SECTION_LABEL}>Cómo responder</p>

              <div
                style={{
                  background: "rgba(78,205,196,0.06)",
                  border: "1px solid rgba(78,205,196,0.16)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  marginBottom: 10,
                }}
              >
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.78)" }}>
                  {tema.detalle.comoResponder}
                </p>
              </div>

              <p style={{ margin: "0 0 0", fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.45)" }}>
                {tema.detalle.explicacion}
              </p>

              {tema.detalle.consejo && (
                <div
                  style={{
                    background: "rgba(240,165,0,0.07)",
                    border: "1px solid rgba(240,165,0,0.18)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    marginTop: 10,
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>💡</span>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "rgba(240,165,0,0.88)" }}>
                    {tema.detalle.consejo}
                  </p>
                </div>
              )}

              <div style={DIVIDER} />

              {/* ─── Vocabulario ────────────────────────────── */}
              <p style={SECTION_LABEL}>Vocabulario útil</p>

              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {tema.detalle.vocabulario.map((item, i) => {
                  const { jp, es } = splitVocab(item);
                  const isLast = i === tema.detalle.vocabulario.length - 1;
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "10px 14px",
                        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14, fontWeight: 700,
                          fontFamily: "var(--font-noto-sans-jp), sans-serif",
                          color: "#FFFFFF", flexShrink: 0,
                        }}
                      >
                        {jp}
                      </span>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", textAlign: "right", lineHeight: 1.35 }}>
                        {es}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={DIVIDER} />

              {/* ─── Ejemplos ───────────────────────────────── */}
              <p style={SECTION_LABEL}>Ejemplos</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {tema.detalle.ejemplos.map((ej, i) => {
                  const isBasico     = ej.nivel === "básico";
                  const accentColor  = isBasico ? TEAL : AMBER;
                  const badgeBg      = isBasico ? "rgba(78,205,196,0.14)" : "rgba(240,165,0,0.14)";

                  return (
                    <div
                      key={i}
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: 12,
                        padding: "14px 16px",
                        boxShadow: `inset 3px 0 0 ${accentColor}`,
                      }}
                    >
                      <div style={{ marginBottom: 10 }}>
                        <span
                          style={{
                            display: "inline-block",
                            background: badgeBg,
                            color: accentColor,
                            borderRadius: 5,
                            padding: "2px 8px",
                            fontSize: 10, fontWeight: 800,
                            letterSpacing: "0.07em",
                            textTransform: "uppercase",
                          }}
                        >
                          {isBasico ? "Básico" : "Medio"}
                        </span>
                      </div>

                      <FuriganaText
                        text={ej.texto}
                        rtColor="rgba(255,255,255,0.55)"
                        style={{
                          display: "block",
                          fontFamily: "var(--font-noto-serif-jp), serif",
                          fontSize: 18, fontWeight: 500,
                          color: "#FFFFFF", lineHeight: 1.7,
                          marginBottom: 8, letterSpacing: "0.01em",
                        }}
                      />

                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4, color: "rgba(255,255,255,0.42)" }}>
                        {ej.espanol}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div style={DIVIDER} />

              {/* ─── INTÉNTALO: interactive sentence builder ─── */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <p style={{ ...SECTION_LABEL, marginBottom: 0 }}>Inténtalo</p>
                <div
                  style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#12121F",
                    background: TEAL,
                    borderRadius: 4,
                    padding: "2px 6px",
                  }}
                >
                  nuevo
                </div>
              </div>

              {/* Sentence preview (live) */}
              <SentencePreview segs={segs} slots={tema.plantilla.slots} selections={selections} />

              {/* Slot chips */}
              {tema.plantilla.slots.map(slot => (
                <SlotChips
                  key={slot.id}
                  slot={slot}
                  selected={selections[slot.id]}
                  onSelect={val => handleSelect(slot.id, val)}
                />
              ))}

              {/* Use sentence CTA */}
              <button
                type="button"
                onClick={handleUse}
                disabled={!allFilled}
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: "14px 0",
                  borderRadius: 12,
                  border: "none",
                  cursor: allFilled ? "pointer" : "not-allowed",
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: "0.02em",
                  background: allFilled ? TEAL : "rgba(255,255,255,0.07)",
                  color: allFilled ? "#12121F" : "rgba(255,255,255,0.25)",
                  transition: "background 200ms ease, color 200ms ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {allFilled ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
                        stroke="#12121F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Usar esta oración en mi publicación
                  </>
                ) : (
                  "Elige palabras para completar la oración"
                )}
              </button>

              {/* Footer nudge */}
              <div
                style={{
                  marginTop: 20,
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  paddingTop: 18,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 30, height: 30, borderRadius: "50%",
                    background: "rgba(78,205,196,0.10)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
                      stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.30)", lineHeight: 1.4 }}>
                  La oración es solo el inicio — edítala y agrégale más. ¡No hay respuesta incorrecta!
                </p>
              </div>
            </>
          ) : (
            /* Fallback for custom admin topics without bank entry */
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>✍️</div>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF", margin: "0 0 8px" }}>
                ¡Es tu turno!
              </p>
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
