"use client";

import { useMemo } from "react";
import { DS, TopBar, TabBar, Eyebrow, PlayButton, type DSTab } from "./ds";
import { filterKanaItemsForSelection } from "@/lib/kana-data";
import { loadKanaProgress } from "@/lib/kana-progress";

const HIRAGANA_ROW_NAMES = ["A", "K", "S", "T", "N", "H", "M", "Y", "R", "W"];
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
  weeklyActiveDays = 0,
  dueCount = 0,
}: HomeScreenProps) {
  const hour = new Date().getHours();
  const greeting =
    hour < 5 ? "Good night" :
    hour < 12 ? "Good morning" :
    hour < 18 ? "Good afternoon" : "Good evening";

  const basicHiragana = useMemo(() => filterKanaItemsForSelection("hiragana", "basic"), []);
  const progress = useMemo(() => loadKanaProgress(userKey), [userKey]);

  const kanaToItem = useMemo(
    () => new Map(basicHiragana.map((item) => [item.kana, item])),
    [basicHiragana],
  );

  const learnedCount = useMemo(
    () => basicHiragana.filter((item) => {
      const entry = progress[item.id];
      return entry && entry.level >= 1 && !entry.difficult;
    }).length,
    [basicHiragana, progress],
  );

  const batchIdx = useMemo(() => {
    for (let i = 0; i < HIRAGANA_BASIC_GROUPS.length; i++) {
      const stable = HIRAGANA_BASIC_GROUPS[i].every((k) => {
        const item = kanaToItem.get(k);
        if (!item) return false;
        const entry = progress[item.id];
        return entry && entry.level >= 1 && !entry.difficult;
      });
      if (!stable) return i;
    }
    return HIRAGANA_BASIC_GROUPS.length - 1;
  }, [kanaToItem, progress]);

  const heroKana = HIRAGANA_BASIC_GROUPS[batchIdx]?.[0] ?? "あ";
  const rowName = `${HIRAGANA_ROW_NAMES[batchIdx] ?? "A"}-row`;

  const jumpItems: Array<{ k: DSTab; label: string; sub: string; kana: string }> = [
    { k: "learn", label: "Learn", sub: `Next · ${rowName}`, kana: heroKana },
    { k: "review", label: "Review", sub: dueCount > 0 ? `${dueCount} due now` : "All caught up", kana: "時" },
    { k: "practice", label: "Practice", sub: "Sprint · Flashcards · Repaso", kana: "練" },
    { k: "vault", label: "Vault", sub: `${learnedCount} kana mastered`, kana: "蔵" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: DS.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ height: 54 }} />
      <TopBar />

      <div style={{ flex: 1, overflow: "auto", paddingBottom: 84 }}>

        {/* Greeting */}
        <div style={{ padding: "0 24px 28px" }}>
          <Eyebrow>{greeting}</Eyebrow>
          <div style={{
            fontFamily: DS.fontHead, fontSize: 34, fontWeight: 700,
            color: DS.ink, letterSpacing: -0.8, lineHeight: 1.05, marginTop: 10,
          }}>
            Pick up where
          </div>
          <div style={{
            fontFamily: DS.fontHead, fontSize: 34, fontWeight: 300,
            color: DS.inkSoft, letterSpacing: -0.8, lineHeight: 1.05, fontStyle: "italic",
          }}>
            you left off.
          </div>
        </div>

        {/* Continue card */}
        <div style={{ padding: "0 24px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 18,
            padding: "22px 22px",
            background: DS.card, borderRadius: 24, border: `1px solid ${DS.line}`,
          }}>
            <div style={{
              width: 76, height: 76, borderRadius: 18,
              background: DS.surfaceAlt,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: DS.fontKana, fontSize: 44, color: DS.ink, flexShrink: 0,
            }}>{heroKana}</div>
            <div style={{ flex: 1 }}>
              <Eyebrow color={DS.accent}>Continue</Eyebrow>
              <div style={{
                fontFamily: DS.fontHead, fontSize: 15, fontWeight: 600,
                color: DS.ink, marginTop: 6,
              }}>{rowName} · learning</div>
              <div style={{
                fontFamily: DS.fontBody, fontSize: 12, color: DS.inkSoft, marginTop: 2,
              }}>{learnedCount} / {basicHiragana.length} kana mastered</div>
            </div>
            <PlayButton size={52} onClick={() => onTabChange("learn")} />
          </div>
        </div>

        {/* Today strip */}
        <div style={{ padding: "32px 24px 0" }}>
          <Eyebrow>Today</Eyebrow>
          <div style={{
            marginTop: 14,
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
            borderTop: `1px solid ${DS.line}`, borderBottom: `1px solid ${DS.line}`,
          }}>
            {([
              { l: "Due", v: String(dueCount), s: "review" },
              { l: "New", v: String(Math.max(0, basicHiragana.length - learnedCount)), s: "kana" },
              { l: "Streak", v: String(weeklyActiveDays), s: "days" },
            ] as const).map((x, i) => (
              <div key={x.l} style={{
                padding: "16px 0",
                borderRight: i < 2 ? `1px solid ${DS.line}` : "none",
                textAlign: i === 0 ? "left" : i === 1 ? "center" : "right",
              }}>
                <div style={{
                  fontFamily: DS.fontHead, fontSize: 10, fontWeight: 600,
                  color: DS.inkSoft, letterSpacing: "0.22em", textTransform: "uppercase",
                }}>{x.l}</div>
                <div style={{
                  marginTop: 6, fontFamily: DS.fontHead, fontSize: 24,
                  fontWeight: 700, color: DS.ink, letterSpacing: -0.5,
                }}>
                  {x.v}
                  <span style={{ color: DS.inkFaint, fontSize: 12, fontWeight: 400, marginLeft: 4 }}>{x.s}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Jump to */}
        <div style={{ padding: "32px 24px 0" }}>
          <Eyebrow>Jump to</Eyebrow>
          <div style={{ marginTop: 10 }}>
            {jumpItems.map((item, i) => (
              <button
                key={item.k}
                type="button"
                onClick={() => onTabChange(item.k)}
                style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "16px 0",
                  borderBottom: i < jumpItems.length - 1 ? `1px solid ${DS.line}` : "none",
                  background: "none", border: "none",
                  borderBottomStyle: "solid",
                  borderBottomWidth: i < jumpItems.length - 1 ? 1 : 0,
                  borderBottomColor: DS.line,
                  width: "100%", cursor: "pointer", textAlign: "left",
                }}
              >
                <div style={{
                  fontFamily: DS.fontKana, fontSize: 26,
                  color: DS.inkSoft, width: 36, textAlign: "center", lineHeight: 1,
                }}>{item.kana}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: DS.fontHead, fontSize: 15, fontWeight: 600, color: DS.ink }}>
                    {item.label}
                  </div>
                  <div style={{ fontFamily: DS.fontBody, fontSize: 12, color: DS.inkSoft, marginTop: 2 }}>
                    {item.sub}
                  </div>
                </div>
                <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                  <path d="M1 1l5 5-5 5" stroke={DS.inkFaint} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        <div style={{ height: 16 }} />
      </div>

      <TabBar active="home" onTab={onTabChange} />
    </div>
  );
}
