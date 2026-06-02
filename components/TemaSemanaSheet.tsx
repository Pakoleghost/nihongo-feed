"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FuriganaText from "@/components/FuriganaText";
import type { TemaSemana, SlotPlantilla, OpcionSlot } from "@/lib/temas-semana";
import type { WeeklyTopic } from "@/lib/weekly-topics";

// ── constants ─────────────────────────────────────────────────────────────────

const TEAL = "#4ECDC4";

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

// ── shared pieces ─────────────────────────────────────────────────────────────

const STEP_LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: TEAL,
  margin: "0 0 14px",
};

/** Renders a pattern string, turning "___" into styled blanks. */
function PatternLine({ jp }: { jp: string }) {
  const parts = jp.split("___");
  return (
    <span
      style={{
        fontFamily: "var(--font-noto-serif-jp), serif",
        fontSize: 26,
        fontWeight: 600,
        lineHeight: 1.7,
        color: "#FFFFFF",
      }}
    >
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && (
            <span
              style={{
                display: "inline-block",
                minWidth: 54,
                textAlign: "center",
                color: TEAL,
                background: "rgba(78,205,196,0.13)",
                border: "1.5px dashed rgba(78,205,196,0.5)",
                borderRadius: 6,
                padding: "0 8px",
                margin: "0 2px",
              }}
            >
              ？
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

/** Primary advance button. */
function NextButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "15px 0",
        borderRadius: 13,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 15,
        fontWeight: 800,
        background: disabled ? "rgba(255,255,255,0.07)" : TEAL,
        color: disabled ? "rgba(255,255,255,0.28)" : "#12121F",
        transition: "background 180ms ease, color 180ms ease",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}
    >
      {label}
    </button>
  );
}

/** Live preview: Japanese sentence + Spanish translation. */
function LivePreview({
  segs, slots, sel, esText,
}: { segs: Segment[]; slots: SlotPlantilla[]; sel: Selections; esText: string }) {
  return (
    <div
      style={{
        background: "rgba(0,0,0,0.22)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: "16px 18px",
        marginBottom: 18,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-noto-serif-jp), serif",
          fontSize: 24, fontWeight: 600, lineHeight: 1.7, color: "#FFFFFF",
          display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2px 1px",
        }}
      >
        {segs.map((seg, i) => {
          if (seg.type === "text") return <span key={i}>{seg.value}</span>;
          const slot = slots.find(s => s.id === seg.slotId);
          const chosen = sel[seg.slotId];
          return chosen ? (
            <span key={i} style={{ color: TEAL, fontWeight: 800, background: "rgba(78,205,196,0.13)", borderRadius: 6, padding: "0 7px" }}>
              {chosen.jp}
            </span>
          ) : (
            <span
              key={i}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.07)",
                border: "1.5px dashed rgba(255,255,255,0.18)", borderRadius: 6,
                padding: "0 12px", fontSize: 15, minWidth: 56,
                fontFamily: "var(--font-noto-sans-jp), sans-serif",
              }}
            >
              {slot?.etiqueta ?? "…"}
            </span>
          );
        })}
      </div>
      <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "12px 0" }} />
      <p style={{ margin: 0, fontSize: 15, fontStyle: "italic", color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
        {esText}
      </p>
    </div>
  );
}

/** Chips for one slot — jp + es stacked. */
function SlotChips({
  slot, selected, onSelect,
}: { slot: SlotPlantilla; selected: OpcionSlot | undefined; onSelect: (op: OpcionSlot) => void }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ margin: "0 0 9px", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
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
                display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
                background: isActive ? TEAL : "rgba(255,255,255,0.07)",
                border: isActive ? "none" : "1px solid rgba(255,255,255,0.10)",
                borderRadius: 11, padding: "8px 14px", cursor: "pointer",
                transition: "background 140ms ease, transform 100ms ease",
                transform: isActive ? "scale(1.04)" : "scale(1)",
              }}
            >
              <span style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif", fontSize: 16, fontWeight: 700, color: isActive ? "#12121F" : "#FFFFFF", lineHeight: 1.3 }}>
                {op.jp}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? "rgba(18,18,31,0.65)" : "rgba(255,255,255,0.4)", lineHeight: 1.2 }}>
                {op.es}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── slide animation variants ────────────────────────────────────────────────

const slide = {
  enter: (dir: number) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -48 : 48, opacity: 0 }),
};

// ── main component ────────────────────────────────────────────────────────────

const TOTAL_STEPS = 4;

export default function TemaSemanaSheet({ onClose, onUseSentence, tema, fallback }: Props) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [sel, setSel] = useState<Selections>({});

  const segs = useMemo(() => tema ? parseTemplate(tema.plantilla.estructura) : [], [tema]);
  const allFilled = useMemo(
    () => tema ? tema.plantilla.slots.every(s => Boolean(sel[s.id])) : false,
    [tema, sel],
  );
  const esPreview = useMemo(
    () => tema ? buildEs(tema.plantilla.estructuraEs, sel) : "",
    [tema, sel],
  );

  function goNext() { setDir(1); setStep(s => Math.min(s + 1, TOTAL_STEPS - 1)); }
  function goBack() { setDir(-1); setStep(s => Math.max(s - 1, 0)); }
  function handleUse() {
    if (!tema || !allFilled) return;
    onUseSentence(buildJp(tema.plantilla.estructura, sel));
  }

  // ── Step renderers ──
  function renderStep() {
    if (!tema) {
      return (
        <div style={{ textAlign: "center", padding: "12px 0 8px" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✍️</div>
          <div style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 28, fontWeight: 700, color: "#FFFFFF", marginBottom: 10 }}>
            {fallback.kana}
          </div>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", margin: "0 0 24px", lineHeight: 1.5 }}>
            {fallback.prompt}
          </p>
          <NextButton label="Entendido" onClick={onClose} />
        </div>
      );
    }

    switch (step) {
      // ── 0: Intro ──
      case 0:
        return (
          <div>
            <p style={STEP_LABEL}>Tema de la semana</p>
            <div style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 32, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.25, marginBottom: 8 }}>
              {tema.kana}
            </div>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", margin: "0 0 22px", lineHeight: 1.4 }}>
              {tema.prompt}
            </p>
            <div
              style={{
                background: "rgba(78,205,196,0.08)",
                border: "1px solid rgba(78,205,196,0.18)",
                borderRadius: 14,
                padding: "16px 18px",
                display: "flex", gap: 12, alignItems: "center",
                marginBottom: 24,
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>🎯</span>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#FFFFFF", lineHeight: 1.45 }}>
                {tema.meta}
              </p>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 22px", textAlign: "center", lineHeight: 1.5 }}>
              Te llevo de la mano en 3 pasitos. ¡Es fácil!
            </p>
            <NextButton label="Empezar →" onClick={goNext} />
          </div>
        );

      // ── 1: Pattern ──
      case 1:
        return (
          <div>
            <p style={STEP_LABEL}>Paso 1 · La fórmula</p>
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: "22px 20px",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              <PatternLine jp={tema.patron.jp} />
              <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "16px 0" }} />
              <p style={{ margin: 0, fontSize: 16, color: "rgba(255,255,255,0.62)", lineHeight: 1.4 }}>
                {tema.patron.es}
              </p>
            </div>
            <div style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 24, padding: "0 4px" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
              <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.55 }}>
                {tema.nota}
              </p>
            </div>
            <NextButton label="Siguiente →" onClick={goNext} />
          </div>
        );

      // ── 2: Example ──
      case 2:
        return (
          <div>
            <p style={STEP_LABEL}>Paso 2 · Un ejemplo</p>
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: "24px 20px",
                marginBottom: 16,
                boxShadow: `inset 3px 0 0 ${TEAL}`,
              }}
            >
              <FuriganaText
                text={tema.ejemplo.jp}
                rtColor="rgba(255,255,255,0.55)"
                style={{
                  display: "block",
                  fontFamily: "var(--font-noto-serif-jp), serif",
                  fontSize: 25, fontWeight: 500, color: "#FFFFFF",
                  lineHeight: 1.7, marginBottom: 12, letterSpacing: "0.01em",
                }}
              />
              <p style={{ margin: 0, fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.45 }}>
                {tema.ejemplo.es}
              </p>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 24px", textAlign: "center", lineHeight: 1.5 }}>
              Así se ve completa. ¡Ahora arma la tuya!
            </p>
            <NextButton label="Ahora tú →" onClick={goNext} />
          </div>
        );

      // ── 3: Builder ──
      case 3:
        return (
          <div>
            <p style={STEP_LABEL}>Paso 3 · Arma la tuya</p>
            <LivePreview segs={segs} slots={tema.plantilla.slots} sel={sel} esText={esPreview} />
            {tema.plantilla.slots.map(slot => (
              <SlotChips
                key={slot.id}
                slot={slot}
                selected={sel[slot.id]}
                onSelect={op => setSel(prev => ({ ...prev, [slot.id]: op }))}
              />
            ))}
            <div style={{ marginTop: 4 }}>
              <NextButton
                label={allFilled ? "✓ Usar esta oración" : "Elige una palabra arriba ↑"}
                onClick={handleUse}
                disabled={!allFilled}
              />
            </div>
            <p style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.32)", lineHeight: 1.5, textAlign: "center" }}>
              Luego puedes editarla o agregarle más. 🌱
            </p>
          </div>
        );

      default:
        return null;
    }
  }

  const showBack = tema !== null && step > 0;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
      />

      {/* Panel */}
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
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* Header: back / progress dots / close */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 12px" }}>
          {/* left: back or spacer */}
          {showBack ? (
            <button
              onClick={goBack}
              style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              aria-label="Atrás"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="rgba(255,255,255,0.6)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <div style={{ width: 30 }} />
          )}

          {/* center: progress dots (only when tema present) */}
          {tema ? (
            <div style={{ display: "flex", gap: 7 }}>
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === step ? 20 : 7,
                    height: 7,
                    borderRadius: 4,
                    background: i === step ? TEAL : "rgba(255,255,255,0.18)",
                    transition: "width 220ms ease, background 220ms ease",
                  }}
                />
              ))}
            </div>
          ) : (
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.14)" }} />
          )}

          {/* right: close */}
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

        {/* Animated step body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 22px",
            paddingBottom: "calc(28px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={tema ? step : "fallback"}
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
