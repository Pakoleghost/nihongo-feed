"use client";

import { DS, TabBar, ScreenTitle, Eyebrow, type DSTab } from "./ds";

export type PracticeSubView = "sprint" | "vocabkanji" | "flashcards" | "exam";

type PracticeMode = {
  key: PracticeSubView;
  title: string;
  kana: string;
  desc: string;
  tag: string;
};

const MODES: PracticeMode[] = [
  { key: "sprint",     title: "Sprint de Kana",  kana: "速", desc: "Lee todos los kana que puedas en 60 segundos.", tag: "Velocidad" },
  { key: "flashcards", title: "Tarjetas",         kana: "札", desc: "Repaso clásico con autoevaluación.", tag: "Memoria" },
  { key: "vocabkanji", title: "Vocab + Kanji",    kana: "語", desc: "Practica vocabulario y lecturas de kanji.", tag: "Vocab" },
  { key: "exam",       title: "Repaso mixto",     kana: "復", desc: "Repaso combinado de gramática, vocab y kanji.", tag: "Mixto" },
];

type PracticeIndexScreenProps = {
  onTabChange: (tab: DSTab) => void;
  onSelectMode: (mode: PracticeSubView) => void;
  recentActivity?: Array<{ mode: string; when: string; stat: string }>;
};

export default function PracticeIndexScreen({
  onTabChange,
  onSelectMode,
  recentActivity = [],
}: PracticeIndexScreenProps) {
  return (
    <div style={{ minHeight: "100vh", background: DS.bg, display: "flex", flexDirection: "column" }}>


      <div style={{ flex: 1, overflow: "auto", paddingBottom: 84 }}>
        <ScreenTitle title="Practicar" />

        <div style={{ padding: "0 24px" }}>
          <div style={{
            fontFamily: DS.fontBody, fontSize: 13, color: DS.inkSoft,
            lineHeight: 1.5, maxWidth: 280,
          }}>
            Práctica libre que no afecta tu cola SRS. Elige un modo y empieza.
          </div>
        </div>

        {/* Mode list */}
        <div style={{ padding: "28px 24px 0" }}>
          {MODES.map((m, i) => (
            <button
              key={m.key}
              type="button"
              onClick={() => onSelectMode(m.key)}
              style={{
                display: "flex", alignItems: "center", gap: 18,
                padding: "18px 0", width: "100%", textAlign: "left",
                background: "none", border: "none", cursor: "pointer",
                borderTop: `1px solid ${DS.line}`,
                borderBottom: i === MODES.length - 1 ? `1px solid ${DS.line}` : "none",
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: DS.surfaceAlt,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: DS.fontKana, fontSize: 28, color: DS.ink,
                flexShrink: 0,
              }}>{m.kana}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <div style={{
                    fontFamily: DS.fontHead, fontSize: 17, fontWeight: 600,
                    color: DS.ink, letterSpacing: -0.2,
                  }}>{m.title}</div>
                  <div style={{
                    fontFamily: DS.fontHead, fontSize: 9.5, fontWeight: 600,
                    letterSpacing: "0.18em", textTransform: "uppercase", color: DS.accent,
                  }}>{m.tag}</div>
                </div>
                <div style={{
                  fontFamily: DS.fontBody, fontSize: 12, color: DS.inkSoft,
                  marginTop: 4, lineHeight: 1.5,
                }}>{m.desc}</div>
              </div>
              <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                <path d="M1 1l5 5-5 5" stroke={DS.inkFaint} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>

        {/* Recent */}
        {recentActivity.length > 0 && (
          <div style={{ padding: "32px 24px 0" }}>
            <Eyebrow>Reciente</Eyebrow>
            <div style={{ marginTop: 14 }}>
              {recentActivity.map((r, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "12px 0",
                  borderBottom: i < recentActivity.length - 1 ? `1px solid ${DS.line}` : "none",
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: DS.fontHead, fontSize: 13, fontWeight: 600, color: DS.ink }}>
                      {r.mode}
                    </div>
                    <div style={{ fontFamily: DS.fontBody, fontSize: 11, color: DS.inkSoft, marginTop: 2 }}>
                      {r.stat}
                    </div>
                  </div>
                  <div style={{ fontFamily: DS.fontBody, fontSize: 11, color: DS.inkFaint }}>{r.when}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ height: 16 }} />
      </div>

      <TabBar active="practice" onTab={onTabChange} />
    </div>
  );
}
