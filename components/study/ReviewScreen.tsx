"use client";

import { useMemo, useState } from "react";
import { DS, TopBar, TabBar, Eyebrow, ScreenTitle, LevelPips, NavDrawer, type DSTab } from "./ds";
import { filterKanaItemsForSelection } from "@/lib/kana-data";
import { loadKanaProgress } from "@/lib/kana-progress";

type ReviewScreenProps = {
  userKey: string;
  onTabChange: (tab: DSTab) => void;
  onStartReview: () => void;
};

function isDueReview(nextReview?: string | null) {
  if (!nextReview) return true;
  return new Date(nextReview).getTime() <= Date.now();
}

export default function ReviewScreen({ userKey, onTabChange, onStartReview }: ReviewScreenProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const basicHiragana = useMemo(() => filterKanaItemsForSelection("hiragana", "basic"), []);
  const progress = useMemo(() => loadKanaProgress(userKey), [userKey]);

  const { dueNow, later } = useMemo(() => {
    const dueNowItems: Array<{ kana: string; romaji: string; level: number }> = [];
    const laterItems: Array<{ kana: string; romaji: string; when: string }> = [];

    for (const item of basicHiragana) {
      const entry = progress[item.id];
      if (!entry || entry.level === 0) continue;

      if (isDueReview(entry.nextReview) || entry.difficult) {
        dueNowItems.push({ kana: item.kana, romaji: item.romaji, level: Math.min(entry.level, 4) });
      } else if (entry.nextReview) {
        const ms = new Date(entry.nextReview).getTime() - Date.now();
        const hours = Math.floor(ms / 3_600_000);
        const days = Math.floor(ms / 86_400_000);
        const whenLabel = days >= 1 ? `en ${days}d` : hours >= 1 ? `en ${hours}h` : "pronto";
        if (laterItems.length < 5) {
          laterItems.push({ kana: item.kana, romaji: item.romaji, when: whenLabel });
        }
      }
    }

    return { dueNow: dueNowItems, later: laterItems };
  }, [basicHiragana, progress]);

  const dueCount = dueNow.length;
  const estMinutes = Math.max(1, Math.round(dueCount * 0.6));

  const levelLabel = (l: number) =>
    (["bloqueada", "nueva", "aprendiendo", "repasando", "dominada"])[l] ?? "nueva";

  return (
    <div style={{ minHeight: "100vh", background: DS.bg, display: "flex", flexDirection: "column" }}>
      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} onNavigate={onTabChange} />
      <div style={{ height: 54 }} />
      <TopBar onMenu={() => setMenuOpen(true)} />

      <div style={{ flex: 1, overflow: "auto", paddingBottom: 0 }}>
        <ScreenTitle title="Repasar" subtitle="lo que toca." />

        {/* Hero: due count + start */}
        <div style={{ padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, paddingBottom: 18 }}>
            <div style={{
              fontFamily: DS.fontHead, fontSize: 88, fontWeight: 700,
              color: DS.ink, lineHeight: 0.9, letterSpacing: -3,
            }}>{dueCount}</div>
            <div style={{ paddingBottom: 8 }}>
              <div style={{ fontFamily: DS.fontHead, fontSize: 15, fontWeight: 600, color: DS.ink }}>
                pendientes
              </div>
              <div style={{ fontFamily: DS.fontBody, fontSize: 12, color: DS.inkSoft, marginTop: 2 }}>
                {dueCount === 0 ? "¡Al día!" : `~${estMinutes} min a tu ritmo`}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onStartReview}
            disabled={dueCount === 0}
            style={{
              width: "100%", padding: "18px 22px",
              background: dueCount === 0 ? DS.surfaceAlt : DS.ink,
              color: dueCount === 0 ? DS.inkSoft : DS.bg,
              border: "none", borderRadius: 20, cursor: dueCount === 0 ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              fontFamily: DS.fontHead, fontSize: 15, fontWeight: 600,
            }}
          >
            <span>{dueCount === 0 ? "Nada pendiente ahora" : "Empezar repaso"}</span>
            {dueCount > 0 && (
              <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                <path d="M1 6h15m0 0l-5-5m5 5l-5 5" stroke={DS.bg} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>

        {/* Due now list */}
        {dueNow.length > 0 && (
          <div style={{ padding: "36px 24px 0" }}>
            <Eyebrow>Pendientes ahora</Eyebrow>
            <div style={{ marginTop: 14 }}>
              {dueNow.slice(0, 8).map((q, i) => (
                <div key={q.kana + i} style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "14px 0",
                  borderBottom: i < Math.min(dueNow.length, 8) - 1 ? `1px solid ${DS.line}` : "none",
                }}>
                  <div style={{
                    fontFamily: DS.fontKana, fontSize: 32,
                    color: DS.ink, width: 44, textAlign: "center", lineHeight: 1,
                  }}>{q.kana}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: DS.fontHead, fontSize: 14, fontWeight: 600,
                      color: DS.ink, letterSpacing: "0.14em", textTransform: "uppercase",
                    }}>{q.romaji}</div>
                    <div style={{ fontFamily: DS.fontBody, fontSize: 11, color: DS.inkSoft, marginTop: 2 }}>
                      {levelLabel(q.level)}
                    </div>
                  </div>
                  <LevelPips level={q.level} size="lg" />
                </div>
              ))}
              {dueNow.length > 8 && (
                <div style={{ fontFamily: DS.fontBody, fontSize: 12, color: DS.inkSoft, paddingTop: 12 }}>
                  +{dueNow.length - 8} más
                </div>
              )}
            </div>
          </div>
        )}

        {/* Later list */}
        {later.length > 0 && (
          <div style={{ padding: "32px 24px 0" }}>
            <Eyebrow>Más tarde</Eyebrow>
            <div style={{ marginTop: 14 }}>
              {later.map((q, i) => (
                <div key={q.kana + i} style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "12px 0",
                  borderBottom: i < later.length - 1 ? `1px solid ${DS.line}` : "none",
                  opacity: 0.65,
                }}>
                  <div style={{
                    fontFamily: DS.fontKana, fontSize: 26,
                    color: DS.inkSoft, width: 44, textAlign: "center", lineHeight: 1,
                  }}>{q.kana}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: DS.fontHead, fontSize: 13, fontWeight: 500,
                      color: DS.inkSoft, letterSpacing: "0.14em", textTransform: "uppercase",
                    }}>{q.romaji}</div>
                  </div>
                  <div style={{ fontFamily: DS.fontBody, fontSize: 11, color: DS.inkFaint }}>
                    {q.when}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {dueCount === 0 && later.length === 0 && (
          <div style={{ padding: "40px 24px 0", textAlign: "center" }}>
            <div style={{ fontFamily: DS.fontKana, fontSize: 48, color: DS.inkFaint }}>✓</div>
            <div style={{ fontFamily: DS.fontHead, fontSize: 15, fontWeight: 600, color: DS.inkSoft, marginTop: 12 }}>
              Sin kana que repasar aún
            </div>
            <div style={{ fontFamily: DS.fontBody, fontSize: 12, color: DS.inkFaint, marginTop: 6 }}>
              Empieza a aprender para llenar la cola
            </div>
          </div>
        )}

        <div style={{ height: 16 }} />
      </div>

      <TabBar active="review" onTab={onTabChange} />
    </div>
  );
}
