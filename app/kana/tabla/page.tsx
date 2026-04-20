"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { KANA_ITEMS } from "@/lib/kana-data";
import type { KanaItem } from "@/lib/kana-data";
import KanaStrokeAnimation from "@/components/KanaStrokeAnimation";

// ─── lookup: kana character → KanaItem ───────────────────────────────────────
const KANA_MAP = new Map<string, KanaItem>(KANA_ITEMS.map((i) => [i.kana, i]));

type Script = "hiragana" | "katakana";
type Row = (string | null)[];

// ─── table data ──────────────────────────────────────────────────────────────

const MAIN_ROWS: Record<Script, Row[]> = {
  hiragana: [
    ["あ", "い", "う", "え", "お"],
    ["か", "き", "く", "け", "こ"],
    ["さ", "し", "す", "せ", "そ"],
    ["た", "ち", "つ", "て", "と"],
    ["な", "に", "ぬ", "ね", "の"],
    ["は", "ひ", "ふ", "へ", "ほ"],
    ["ま", "み", "む", "め", "も"],
    ["や", null, "ゆ", null, "よ"],
    ["ら", "り", "る", "れ", "ろ"],
    ["わ", null, null, null, "を"],
  ],
  katakana: [
    ["ア", "イ", "ウ", "エ", "オ"],
    ["カ", "キ", "ク", "ケ", "コ"],
    ["サ", "シ", "ス", "セ", "ソ"],
    ["タ", "チ", "ツ", "テ", "ト"],
    ["ナ", "ニ", "ヌ", "ネ", "ノ"],
    ["ハ", "ヒ", "フ", "ヘ", "ホ"],
    ["マ", "ミ", "ム", "メ", "モ"],
    ["ヤ", null, "ユ", null, "ヨ"],
    ["ラ", "リ", "ル", "レ", "ロ"],
    ["ワ", null, null, null, "ヲ"],
  ],
};
const MAIN_ROW_LABELS = ["a", "k", "s", "t", "n", "h", "m", "y", "r", "w"];
const MAIN_COL_LABELS = ["a", "i", "u", "e", "o"];
const N_KANA: Record<Script, string> = { hiragana: "ん", katakana: "ン" };

const TENTEN_ROWS: Record<Script, Row[]> = {
  hiragana: [
    ["が", "ぎ", "ぐ", "げ", "ご"],
    ["ざ", "じ", "ず", "ぜ", "ぞ"],
    ["だ", "ぢ", "づ", "で", "ど"],
    ["ば", "び", "ぶ", "べ", "ぼ"],
  ],
  katakana: [
    ["ガ", "ギ", "グ", "ゲ", "ゴ"],
    ["ザ", "ジ", "ズ", "ゼ", "ゾ"],
    ["ダ", "ヂ", "ヅ", "デ", "ド"],
    ["バ", "ビ", "ブ", "ベ", "ボ"],
  ],
};
const TENTEN_ROW_LABELS = ["g", "z", "d", "b"];

const MARU_ROWS: Record<Script, Row[]> = {
  hiragana: [["ぱ", "ぴ", "ぷ", "ぺ", "ぽ"]],
  katakana: [["パ", "ピ", "プ", "ペ", "ポ"]],
};

const YOON_ROWS: Record<Script, Row[]> = {
  hiragana: [
    ["きゃ", "きゅ", "きょ"],
    ["しゃ", "しゅ", "しょ"],
    ["ちゃ", "ちゅ", "ちょ"],
    ["にゃ", "にゅ", "にょ"],
    ["ひゃ", "ひゅ", "ひょ"],
    ["みゃ", "みゅ", "みょ"],
    ["りゃ", "りゅ", "りょ"],
    ["ぎゃ", "ぎゅ", "ぎょ"],
    ["じゃ", "じゅ", "じょ"],
    ["びゃ", "びゅ", "びょ"],
    ["ぴゃ", "ぴゅ", "ぴょ"],
  ],
  katakana: [
    ["キャ", "キュ", "キョ"],
    ["シャ", "シュ", "ショ"],
    ["チャ", "チュ", "チョ"],
    ["ニャ", "ニュ", "ニョ"],
    ["ヒャ", "ヒュ", "ヒョ"],
    ["ミャ", "ミュ", "ミョ"],
    ["リャ", "リュ", "リョ"],
    ["ギャ", "ギュ", "ギョ"],
    ["ジャ", "ジュ", "ジョ"],
    ["ビャ", "ビュ", "ビョ"],
    ["ピャ", "ピュ", "ピョ"],
  ],
};
const YOON_ROW_LABELS = ["ky", "sh", "ch", "ny", "hy", "my", "ry", "gy", "j", "by", "py"];
const YOON_COL_LABELS = ["ya", "yu", "yo"];

// ─── sub-components ──────────────────────────────────────────────────────────

function KanaCell({
  kana,
  selected,
  onSelect,
}: {
  kana: string | null;
  selected: string | null;
  onSelect: (k: string) => void;
}) {
  if (!kana) {
    return (
      <div
        style={{
          borderRadius: "10px",
          background: "#EDE9E3",
          minHeight: "54px",
        }}
      />
    );
  }
  const item = KANA_MAP.get(kana);
  const isSelected = selected === kana;
  return (
    <button
      onClick={() => onSelect(kana)}
      style={{
        background: isSelected ? "#4ECDC4" : "#FFFFFF",
        borderRadius: "10px",
        border: "none",
        cursor: "pointer",
        padding: "5px 2px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "54px",
        width: "100%",
        boxShadow: isSelected
          ? "0 2px 8px rgba(78,205,196,0.35)"
          : "0 1px 4px rgba(26,26,46,0.07)",
        transition: "background 0.12s, box-shadow 0.12s",
      }}
    >
      <span
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: "#1A1A2E",
          lineHeight: 1.1,
          fontFamily: "var(--font-noto-sans-jp), sans-serif",
        }}
      >
        {kana}
      </span>
      <span
        style={{
          fontSize: "10px",
          color: isSelected ? "rgba(26,26,46,0.7)" : "#9CA3AF",
          marginTop: "2px",
          fontWeight: 600,
          letterSpacing: "0.02em",
        }}
      >
        {item?.romaji ?? ""}
      </span>
    </button>
  );
}

function TableGrid({
  rows,
  rowLabels,
  colLabels,
  selected,
  onSelect,
}: {
  rows: Row[];
  rowLabels: string[];
  colLabels: string[];
  selected: string | null;
  onSelect: (k: string) => void;
}) {
  const cols = colLabels.length;
  const gridCols = `28px repeat(${cols}, 1fr)`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      {/* Column header */}
      <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: "5px" }}>
        <div />
        {colLabels.map((c) => (
          <div
            key={c}
            style={{
              textAlign: "center",
              fontSize: "11px",
              fontWeight: 700,
              color: "#9CA3AF",
              letterSpacing: "0.06em",
              padding: "2px 0 4px",
            }}
          >
            {c}
          </div>
        ))}
      </div>
      {/* Rows */}
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: "grid", gridTemplateColumns: gridCols, gap: "5px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: 700,
              color: "#9CA3AF",
            }}
          >
            {rowLabels[ri]}
          </div>
          {row.map((kana, ci) => (
            <KanaCell key={ci} kana={kana} selected={selected} onSelect={onSelect} />
          ))}
        </div>
      ))}
    </div>
  );
}

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: "1.5rem",
        overflow: "hidden",
        boxShadow: "0 2px 12px rgba(26,26,46,0.06)",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: "15px", fontWeight: 700, color: "#1A1A2E" }}>{title}</span>
        <span
          style={{
            fontSize: "16px",
            color: "#9CA3AF",
            display: "inline-block",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          ▾
        </span>
      </button>
      {open && <div style={{ padding: "0 16px 16px" }}>{children}</div>}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function TablaPage() {
  const router = useRouter();
  const [script, setScript] = useState<Script>("hiragana");
  const [selected, setSelected] = useState<string | null>(null);
  const [openTenten, setOpenTenten] = useState(false);
  const [openMaru, setOpenMaru] = useState(false);
  const [openYoon, setOpenYoon] = useState(false);
  const [modalKana, setModalKana] = useState<string | null>(null);
  const [replayKey, setReplayKey] = useState(0);

  function handleSelect(kana: string) {
    setSelected(kana);
    setModalKana(kana);
    setReplayKey(0);
  }

  function closeModal() {
    setModalKana(null);
    setSelected(null);
  }

  const nKana = N_KANA[script];
  const nItem = KANA_MAP.get(nKana);

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        paddingBottom: "48px",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          padding: "20px 20px 0",
        }}
      >
        <button
          onClick={() => router.push("/kana")}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "#FFFFFF",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 10px rgba(26,26,46,0.10)",
            flexShrink: 0,
          }}
          aria-label="Volver"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5M12 5l-7 7 7 7"
              stroke="#1A1A2E"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 800,
            color: "#1A1A2E",
            margin: 0,
            lineHeight: 1,
          }}
        >
          Tabla
        </h1>
      </div>

      {/* Script toggle */}
      <div style={{ padding: "20px 20px 0" }}>
        <div
          style={{
            display: "inline-flex",
            background: "#E8E3DC",
            borderRadius: "999px",
            padding: "4px",
          }}
        >
          {(["hiragana", "katakana"] as Script[]).map((s) => (
            <button
              key={s}
              onClick={() => { setScript(s); setSelected(null); }}
              style={{
                padding: "9px 22px",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                background: script === s ? "#E63946" : "transparent",
                color: script === s ? "#FFFFFF" : "#9CA3AF",
                fontWeight: 700,
                fontSize: "14px",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {s === "hiragana" ? "Hiragana" : "Katakana"}
            </button>
          ))}
        </div>
      </div>

      {/* Main table */}
      <div style={{ padding: "20px 16px 0" }}>
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "1.5rem",
            padding: "16px",
            boxShadow: "0 2px 12px rgba(26,26,46,0.06)",
          }}
        >
          <TableGrid
            rows={MAIN_ROWS[script]}
            rowLabels={MAIN_ROW_LABELS}
            colLabels={MAIN_COL_LABELS}
            selected={selected}
            onSelect={handleSelect}
          />

          {/* ん / ン — full-width */}
          <div style={{ marginTop: "5px", display: "grid", gridTemplateColumns: "28px 1fr", gap: "5px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontWeight: 700,
                color: "#9CA3AF",
              }}
            >
              n
            </div>
            <button
              onClick={() => handleSelect(nKana)}
              style={{
                background: selected === nKana ? "#4ECDC4" : "#FFFFFF",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
                padding: "10px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow:
                  selected === nKana
                    ? "0 2px 8px rgba(78,205,196,0.35)"
                    : "0 1px 4px rgba(26,26,46,0.07)",
                transition: "background 0.12s",
              }}
            >
              <span
                style={{
                  fontSize: "28px",
                  fontWeight: 700,
                  color: "#1A1A2E",
                  fontFamily: "var(--font-noto-sans-jp), sans-serif",
                  lineHeight: 1,
                }}
              >
                {nKana}
              </span>
              <span style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "3px", fontWeight: 600 }}>
                {nItem?.romaji ?? "n"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible sections */}
      <div style={{ padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: "10px" }}>

        <CollapsibleSection
          title="Tenten ＂ (濁音)"
          open={openTenten}
          onToggle={() => setOpenTenten((v) => !v)}
        >
          <TableGrid
            rows={TENTEN_ROWS[script]}
            rowLabels={TENTEN_ROW_LABELS}
            colLabels={MAIN_COL_LABELS}
            selected={selected}
            onSelect={handleSelect}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Maru ° (半濁音)"
          open={openMaru}
          onToggle={() => setOpenMaru((v) => !v)}
        >
          <TableGrid
            rows={MARU_ROWS[script]}
            rowLabels={["p"]}
            colLabels={MAIN_COL_LABELS}
            selected={selected}
            onSelect={handleSelect}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Combinaciones (拗音)"
          open={openYoon}
          onToggle={() => setOpenYoon((v) => !v)}
        >
          <TableGrid
            rows={YOON_ROWS[script]}
            rowLabels={YOON_ROW_LABELS}
            colLabels={YOON_COL_LABELS}
            selected={selected}
            onSelect={handleSelect}
          />
        </CollapsibleSection>

      </div>

      {/* ── Stroke order modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {modalKana && (() => {
          const item = KANA_MAP.get(modalKana);
          return (
            <motion.div
              key="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeModal}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
                padding: "24px",
              }}
            >
              <motion.div
                key="modal-card"
                initial={{ scale: 0.88, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.88, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.34, 1.2, 0.64, 1] }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: "#FFFFFF",
                  borderRadius: "2rem",
                  padding: "28px 24px 24px",
                  width: "100%",
                  maxWidth: "320px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "6px",
                  position: "relative",
                }}
              >
                {/* Close button */}
                <button
                  onClick={closeModal}
                  style={{
                    position: "absolute",
                    top: "14px",
                    right: "14px",
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "#F3F0EB",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    color: "#9CA3AF",
                    lineHeight: 1,
                  }}
                  aria-label="Cerrar"
                >
                  ×
                </button>

                {/* Kana */}
                <p
                  style={{
                    fontSize: "72px",
                    fontWeight: 800,
                    color: "#E63946",
                    margin: 0,
                    lineHeight: 1,
                    fontFamily: "var(--font-noto-sans-jp), sans-serif",
                  }}
                >
                  {modalKana}
                </p>

                {/* Romaji */}
                <p
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "#9CA3AF",
                    margin: "0 0 12px",
                    letterSpacing: "0.04em",
                  }}
                >
                  {item?.romaji ?? ""}
                </p>

                {/* Stroke animation */}
                <KanaStrokeAnimation
                  key={`${modalKana}-${replayKey}`}
                  kana={modalKana}
                  size={200}
                  autoPlay
                />

                {/* Replay button */}
                <button
                  onClick={() => setReplayKey((k) => k + 1)}
                  style={{
                    marginTop: "14px",
                    background: "#4ECDC4",
                    border: "none",
                    borderRadius: "999px",
                    padding: "12px 32px",
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#1A1A2E",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                  }}
                >
                  <span style={{ fontSize: "18px" }}>↺</span>
                  Repetir
                </button>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
