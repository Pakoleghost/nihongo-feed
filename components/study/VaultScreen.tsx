"use client";

import { useMemo, useState } from "react";
import { DS, TopBar, TabBar, Eyebrow, ScreenTitle, type DSTab } from "./ds";
import { filterKanaItemsForSelection } from "@/lib/kana-data";
import { loadKanaProgress } from "@/lib/kana-progress";

const KANA_ROWS = [
  { label: "a", chars: ["あ", "い", "う", "え", "お"], romaji: ["a", "i", "u", "e", "o"] },
  { label: "k", chars: ["か", "き", "く", "け", "こ"], romaji: ["ka", "ki", "ku", "ke", "ko"] },
  { label: "s", chars: ["さ", "し", "す", "せ", "そ"], romaji: ["sa", "shi", "su", "se", "so"] },
  { label: "t", chars: ["た", "ち", "つ", "て", "と"], romaji: ["ta", "chi", "tsu", "te", "to"] },
  { label: "n", chars: ["な", "に", "ぬ", "ね", "の"], romaji: ["na", "ni", "nu", "ne", "no"] },
  { label: "h", chars: ["は", "ひ", "ふ", "へ", "ほ"], romaji: ["ha", "hi", "fu", "he", "ho"] },
  { label: "m", chars: ["ま", "み", "む", "め", "も"], romaji: ["ma", "mi", "mu", "me", "mo"] },
  { label: "y", chars: ["や", null, "ゆ", null, "よ"],  romaji: ["ya", null, "yu", null, "yo"] },
  { label: "r", chars: ["ら", "り", "る", "れ", "ろ"], romaji: ["ra", "ri", "ru", "re", "ro"] },
  { label: "w", chars: ["わ", null, null, null, "を"],  romaji: ["wa", null, null, null, "wo"] },
  { label: "n", chars: ["ん", null, null, null, null],  romaji: ["n",  null, null, null, null] },
] as const;

type FilterKey = "all" | "mastered" | "learning" | "new";

type VaultScreenProps = {
  userKey: string;
  onTabChange: (tab: DSTab) => void;
};

export default function VaultScreen({ userKey, onTabChange }: VaultScreenProps) {
  const [filter, setFilter] = useState<FilterKey>("all");

  const basicHiragana = useMemo(() => filterKanaItemsForSelection("hiragana", "basic"), []);
  const progress = useMemo(() => loadKanaProgress(userKey), [userKey]);

  const kanaToItem = useMemo(
    () => new Map(basicHiragana.map((item) => [item.kana, item])),
    [basicHiragana],
  );

  const getMastery = (kana: string | null): number => {
    if (!kana) return -1;
    const item = kanaToItem.get(kana);
    if (!item) return 0;
    const entry = progress[item.id];
    if (!entry) return 0;
    return Math.min(entry.level, 4);
  };

  const masteredCount = basicHiragana.filter((item) => {
    const entry = progress[item.id];
    return entry && entry.level >= 4;
  }).length;

  const filters: Array<{ key: FilterKey; label: string }> = [
    { key: "all", label: "All" },
    { key: "mastered", label: "Mastered" },
    { key: "learning", label: "Learning" },
    { key: "new", label: "New" },
  ];

  const passesFilter = (kana: string | null): boolean => {
    if (!kana) return filter === "all";
    const lvl = getMastery(kana);
    if (filter === "all") return true;
    if (filter === "mastered") return lvl >= 4;
    if (filter === "learning") return lvl >= 1 && lvl < 4;
    if (filter === "new") return lvl === 0;
    return true;
  };

  return (
    <div style={{ minHeight: "100vh", background: DS.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ height: 54 }} />
      <TopBar />

      <div style={{ flex: 1, overflow: "auto", paddingBottom: 84 }}>
        <ScreenTitle
          title="Vault"
          right={
            <div style={{ textAlign: "right", paddingTop: 4 }}>
              <Eyebrow>Mastered</Eyebrow>
              <div style={{
                fontFamily: DS.fontHead, fontSize: 20, fontWeight: 600,
                color: DS.ink, marginTop: 4, letterSpacing: -0.3,
              }}>
                <span style={{ color: DS.accent }}>{masteredCount}</span>
                <span style={{ color: DS.inkFaint, fontWeight: 400 }}> / 46</span>
              </div>
            </div>
          }
        />

        {/* Search bar */}
        <div style={{ padding: "0 24px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 16px",
            background: DS.surfaceAlt, borderRadius: 14,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke={DS.inkSoft} strokeWidth="1.5" />
              <path d="M9.5 9.5L13 13" stroke={DS.inkSoft} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span style={{ fontFamily: DS.fontBody, fontSize: 14, color: DS.inkSoft }}>
              Search kana…
            </span>
          </div>
        </div>

        {/* Filter pills */}
        <div style={{ padding: "18px 24px 0", display: "flex", gap: 14 }}>
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              style={{
                padding: "4px 0", background: "transparent", border: "none",
                borderBottom: filter === f.key ? `1.5px solid ${DS.ink}` : "1.5px solid transparent",
                fontFamily: DS.fontHead, fontSize: 12, fontWeight: 600,
                color: filter === f.key ? DS.ink : DS.inkSoft,
                letterSpacing: 0.2, textTransform: "capitalize", cursor: "pointer",
              }}
            >{f.label}</button>
          ))}
        </div>

        {/* Kana grid by rows */}
        <div style={{ padding: "24px 24px 0" }}>
          {KANA_ROWS.map((row, ri) => {
            const visibleCells = row.chars.filter((k) => k && passesFilter(k));
            if (filter !== "all" && visibleCells.length === 0) return null;

            const rowMastered = row.chars.filter((k) => k && getMastery(k) >= 4).length;
            const rowTotal = row.chars.filter((k) => k).length;

            return (
              <div key={ri} style={{ marginBottom: 22 }}>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "baseline",
                  paddingBottom: 10,
                  borderBottom: `1px solid ${DS.line}`,
                  marginBottom: 10,
                }}>
                  <Eyebrow>{row.label}-row</Eyebrow>
                  <div style={{ fontFamily: DS.fontBody, fontSize: 11, color: DS.inkFaint }}>
                    {rowMastered} / {rowTotal}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                  {row.chars.map((k, ci) => {
                    if (!k) return <div key={ci} />;
                    const lvl = getMastery(k);
                    const passes = passesFilter(k);
                    if (!passes) return <div key={ci} />;
                    const romaji = row.romaji[ci] as string | null;

                    return (
                      <div key={ci} style={{
                        display: "flex", flexDirection: "column", alignItems: "center",
                        padding: "12px 0",
                        opacity: lvl === 0 ? 0.3 : 1,
                      }}>
                        <div style={{
                          fontFamily: DS.fontKana, fontSize: 28,
                          color: DS.ink, lineHeight: 1,
                        }}>{k}</div>
                        <div style={{
                          fontFamily: DS.fontBody, fontSize: 10,
                          color: DS.inkSoft, marginTop: 6, letterSpacing: 0.4,
                        }}>{romaji ?? ""}</div>
                        <div style={{
                          marginTop: 6, width: 16, height: 2, borderRadius: 1,
                          background: lvl >= 4 ? DS.accent : lvl > 0 ? DS.accentSoft : "transparent",
                        }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ height: 16 }} />
      </div>

      <TabBar active="vault" onTab={onTabChange} />
    </div>
  );
}
