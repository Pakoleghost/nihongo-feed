"use client";

import { useMemo } from "react";
import { DS, TopBar, TabBar, type DSTab } from "./ds";
import { filterKanaItemsForSelection } from "@/lib/kana-data";
import { loadKanaProgress, getKanaStateCounts, isKanaDue } from "@/lib/kana-progress";

const HIRAGANA_BASIC_GROUPS: readonly (readonly string[])[] = [
  ["あ", "い", "う", "え", "お"],
  ["か", "き", "く", "け", "こ"],
  ["さ", "し", "す", "せ", "そ"],
  ["た", "ち", "つ", "て", "と"],
  ["な", "に", "ぬ", "ね", "の"],
  ["は", "ひ", "ふ", "へ", "ほ"],
  ["ま", "み", "む", "め", "も"],
  ["や", "ゆ", "よ"],
  ["ら", "り", "る", "れ", "ろ"],
  ["わ", "を", "ん"],
];

type HomeScreenProps = {
  userKey: string;
  onTabChange: (tab: DSTab) => void;
  weeklyActiveDays?: number;
  dueCount?: number;
};

export default function HomeScreen({
  userKey,
  onTabChange,
}: HomeScreenProps) {
  const hour = new Date().getHours();
  const greeting =
    hour < 5 ? "Buenas noches" :
    hour < 12 ? "Buenos días" :
    hour < 18 ? "Buenas tardes" : "Buenas noches";

  const basicHiragana = useMemo(() => filterKanaItemsForSelection("hiragana", "basic"), []);
  const progress = useMemo(() => loadKanaProgress(userKey), [userKey]);

  const stateCounts = useMemo(
    () => getKanaStateCounts(basicHiragana, progress),
    [basicHiragana, progress],
  );

  const kanaDueCount = useMemo(
    () => basicHiragana.filter((item) => isKanaDue(progress[item.id])).length,
    [basicHiragana, progress],
  );

  const kanaToItem = useMemo(
    () => new Map(basicHiragana.map((item) => [item.kana, item])),
    [basicHiragana],
  );

  const batchIdx = useMemo(() => {
    for (let i = 0; i < HIRAGANA_BASIC_GROUPS.length; i++) {
      const stable = HIRAGANA_BASIC_GROUPS[i].every((k) => {
        const item = kanaToItem.get(k);
        if (!item) return false;
        const entry = progress[item.id];
        return entry && entry.level >= 3;
      });
      if (!stable) return i;
    }
    return HIRAGANA_BASIC_GROUPS.length - 1;
  }, [kanaToItem, progress]);

  const heroKana = HIRAGANA_BASIC_GROUPS[batchIdx]?.[0] ?? "あ";
  const hasPending = kanaDueCount > 0;
  const progressPct = basicHiragana.length > 0
    ? Math.round((stateCounts.fijado / basicHiragana.length) * 100)
    : 0;

  return (
    <div style={{ minHeight: "100vh", background: DS.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ height: 54 }} />
      <TopBar />

      <div style={{ flex: 1, overflow: "auto", paddingBottom: 84 }}>

        {/* Greeting */}
        <div style={{ padding: "16px 24px 0" }}>
          <div style={{
            fontFamily: DS.fontHead, fontSize: 11, fontWeight: 600,
            letterSpacing: "0.22em", textTransform: "uppercase", color: DS.inkSoft,
          }}>{greeting}</div>
          <div style={{
            fontFamily: DS.fontHead, fontSize: 30, fontWeight: 800,
            color: DS.ink, letterSpacing: -0.8, lineHeight: 1.05, marginTop: 8,
          }}>¿Qué hacemos hoy?</div>
        </div>

        {/* Primary Action Card */}
        <div style={{ padding: "20px 24px 0" }}>
          <div style={{
            borderRadius: 48, background: DS.dark,
            padding: "28px 24px",
            position: "relative", overflow: "hidden",
          }}>
            <div aria-hidden="true" style={{
              position: "absolute", right: -10, top: -14,
              fontFamily: DS.fontKana, fontSize: 140,
              color: "#ffffff", opacity: 0.04,
              lineHeight: 1, userSelect: "none", pointerEvents: "none",
            }}>{heroKana}</div>

            <div style={{ position: "relative" }}>
              <div style={{
                fontFamily: DS.fontHead, fontSize: 10.5, fontWeight: 600,
                letterSpacing: "0.2em", textTransform: "uppercase",
                color: hasPending ? DS.accent : DS.teal,
                marginBottom: 6,
              }}>{hasPending ? "Pendientes" : "Continuar"}</div>
              <div style={{
                fontFamily: DS.fontHead, fontSize: 22, fontWeight: 700,
                color: "#ffffff", letterSpacing: -0.5, marginBottom: 4,
              }}>Hiragana básico</div>
              <div style={{
                fontFamily: DS.fontBody, fontSize: 13,
                color: "rgba(255,255,255,0.50)",
                marginBottom: 22, lineHeight: 1.4,
              }}>
                {stateCounts.fijado} fijados · {stateCounts.aprendiendo + stateCounts.en_repaso} en curso · {stateCounts.nuevo} nuevos
              </div>

              <div style={{ height: 5, borderRadius: 5, background: "rgba(255,255,255,0.10)", overflow: "hidden", marginBottom: 22 }}>
                <div style={{
                  width: `${progressPct}%`, height: "100%",
                  background: hasPending
                    ? `linear-gradient(to right, ${DS.accent}, #c42b38)`
                    : `linear-gradient(to right, ${DS.teal}, ${DS.tealDark})`,
                  borderRadius: 5, transition: "width 0.5s ease",
                  minWidth: stateCounts.fijado > 0 ? 12 : 0,
                }} />
              </div>

              <button
                type="button"
                onClick={() => onTabChange("learn")}
                style={{
                  width: "100%", padding: "16px",
                  background: hasPending
                    ? `linear-gradient(135deg, ${DS.accent} 0%, #c42b38 100%)`
                    : `linear-gradient(135deg, ${DS.teal} 0%, ${DS.tealDark} 100%)`,
                  color: hasPending ? "#ffffff" : DS.dark,
                  border: "none", borderRadius: 999,
                  fontFamily: DS.fontHead, fontSize: 15, fontWeight: 700,
                  cursor: "pointer", letterSpacing: -0.2,
                  boxShadow: hasPending
                    ? "0 8px 20px rgba(230,57,70,0.35)"
                    : "0 8px 20px rgba(78,205,196,0.35)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {hasPending ? "Repasar pendientes" : "Continuar aprendiendo"}
                <svg width="16" height="10" viewBox="0 0 18 12" fill="none">
                  <path d="M1 6h15m0 0l-5-5m5 5l-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Stats row — Bento */}
        <div style={{ padding: "14px 24px 0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {([
              {
                label: "Por repasar",
                value: kanaDueCount,
                color: kanaDueCount > 0 ? DS.accent : DS.inkFaint,
                bg: kanaDueCount > 0 ? "rgba(230,57,70,0.06)" : DS.card,
              },
              {
                label: "Aprendiendo",
                value: stateCounts.aprendiendo,
                color: DS.teal,
                bg: DS.card,
              },
              {
                label: "Fijados",
                value: stateCounts.fijado,
                color: DS.tealDark,
                bg: stateCounts.fijado > 0 ? "rgba(78,205,196,0.08)" : DS.card,
              },
            ] as const).map(({ label, value, color, bg }) => (
              <div key={label} style={{
                padding: "18px 12px", borderRadius: 28,
                background: bg,
                boxShadow: "0 4px 16px rgba(26,26,46,0.04)",
                textAlign: "center",
              }}>
                <div style={{
                  fontFamily: DS.fontHead, fontSize: 28, fontWeight: 800,
                  color, letterSpacing: -0.5,
                }}>{value}</div>
                <div style={{
                  fontFamily: DS.fontBody, fontSize: 10, color: DS.inkSoft,
                  marginTop: 4, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600,
                }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation shortcuts */}
        <div style={{ padding: "28px 24px 0" }}>
          <div style={{
            fontFamily: DS.fontHead, fontSize: 10.5, fontWeight: 600,
            letterSpacing: "0.2em", textTransform: "uppercase", color: DS.inkSoft,
            marginBottom: 12,
          }}>Ir a</div>
          {([
            {
              k: "learn" as DSTab,
              label: "Aprender Kana",
              sub: `${stateCounts.aprendiendo + stateCounts.en_repaso} en curso · ${stateCounts.nuevo} por ver`,
              kana: heroKana,
            },
            {
              k: "practice" as DSTab,
              label: "Practicar",
              sub: "Sprint · Tarjetas · Repaso mixto",
              kana: "練",
            },
            {
              k: "recursos" as DSTab,
              label: "Recursos",
              sub: "Material, notas y referencias",
              kana: "本",
            },
          ] as const).map((item, i, arr) => (
            <button
              key={item.k}
              type="button"
              onClick={() => onTabChange(item.k)}
              style={{
                display: "flex", alignItems: "center", gap: 16,
                padding: "16px 0",
                background: "none", border: "none",
                borderBottomStyle: "solid",
                borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                borderBottomColor: DS.line,
                width: "100%", cursor: "pointer", textAlign: "left",
              }}
            >
              <div style={{
                fontFamily: DS.fontKana, fontSize: 24,
                color: DS.inkSoft, width: 32, textAlign: "center", lineHeight: 1, flexShrink: 0,
              }}>{item.kana}</div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: DS.fontHead, fontSize: 15, fontWeight: 600,
                  color: DS.ink, letterSpacing: -0.1,
                }}>{item.label}</div>
                <div style={{
                  fontFamily: DS.fontBody, fontSize: 12, color: DS.inkSoft, marginTop: 2,
                }}>{item.sub}</div>
              </div>
              <svg width="10" height="12" viewBox="0 0 10 12" fill="none" style={{ flexShrink: 0 }}>
                <path d="M1 1l5 5-5 5" stroke={DS.inkFaint} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>

        <div style={{ height: 16 }} />
      </div>

      <TabBar active="home" onTab={onTabChange} />
    </div>
  );
}
