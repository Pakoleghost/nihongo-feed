"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KANA_ITEMS } from "@/lib/kana-data";
import type { KanaItem } from "@/lib/kana-data";
import { getKanaProgressSummary, getKanaStateCounts, loadKanaProgress } from "@/lib/kana-progress";
import { getKanaSmartRecommendation } from "@/lib/kana-smart";

type ChipKey = "hiragana" | "katakana" | "ambos" | "tenten" | "maru" | "combinaciones";
type Mode = "smart" | "libre";

const CHIPS: { key: ChipKey; label: string }[] = [
  { key: "hiragana", label: "Hiragana" },
  { key: "katakana", label: "Katakana" },
  { key: "ambos", label: "Ambos" },
  { key: "tenten", label: "Dakuten" },
  { key: "maru", label: "Handakuten" },
  { key: "combinaciones", label: "Combinaciones" },
];

const DEPENDENT_CHIPS: ChipKey[] = ["tenten", "maru", "combinaciones"];
const BASE_CHIPS: ChipKey[] = ["hiragana", "katakana"];

function uniqueById(items: KanaItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function matchesSelectedScript(item: KanaItem, selectedSets: ChipKey[]) {
  const includesHiragana = selectedSets.includes("hiragana");
  const includesKatakana = selectedSets.includes("katakana");
  const hasScriptFilter = includesHiragana || includesKatakana;
  if (!hasScriptFilter) return true;
  if (item.script === "hiragana") return includesHiragana;
  if (item.script === "katakana") return includesKatakana;
  return true;
}

// Map new chip keys to pool filter logic
function getPool(selectedSets: ChipKey[]): KanaItem[] {
  const pool: KanaItem[] = [];
  // When dependent chips are selected, base chips act as script filters only.
  // Mirrors the same logic in quiz/page.tsx buildPool.
  const hasDependent = selectedSets.some((k) => DEPENDENT_CHIPS.includes(k));
  for (const key of selectedSets) {
    if (key === "hiragana" && !hasDependent) pool.push(...KANA_ITEMS.filter((i) => i.script === "hiragana" && i.set === "basic"));
    if (key === "katakana" && !hasDependent) pool.push(...KANA_ITEMS.filter((i) => i.script === "katakana" && i.set === "basic"));
    if (key === "tenten") pool.push(...KANA_ITEMS.filter((i) => i.set === "dakuten" && matchesSelectedScript(i, selectedSets)));
    if (key === "maru") pool.push(...KANA_ITEMS.filter((i) => i.set === "handakuten" && matchesSelectedScript(i, selectedSets)));
    if (key === "combinaciones") pool.push(...KANA_ITEMS.filter((i) => i.set === "yoon" && matchesSelectedScript(i, selectedSets)));
  }
  return uniqueById(pool);
}

// Map chip keys to quiz URL param values (quiz/page.tsx uses old names internally)
function chipToUrlParam(key: ChipKey): string {
  if (key === "ambos") return "hiragana,katakana";
  if (key === "tenten") return "dakuon";
  if (key === "maru") return "handakuon";
  if (key === "combinaciones") return "yoon";
  return key;
}

function urlParamToChip(value: string): ChipKey | null {
  if (value === "hiragana") return "hiragana";
  if (value === "katakana") return "katakana";
  if (value === "dakuon") return "tenten";
  if (value === "handakuon") return "maru";
  if (value === "yoon") return "combinaciones";
  return null;
}

function ConfigurarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = (searchParams.get("mode") as Mode) ?? "smart";
  const forceLibre = initialMode === "libre";
  const initialSets = (searchParams.get("sets") ?? "")
    .split(",")
    .map(urlParamToChip)
    .filter((key): key is ChipKey => Boolean(key));

  const [mode, setMode] = useState<Mode>(initialMode);
  const [selectedSets, setSelectedSets] = useState<ChipKey[]>(
    initialSets.length > 0 ? initialSets : ["hiragana"],
  );
  const [questionCount, setQuestionCount] = useState(20);
  const [validationMsg, setValidationMsg] = useState(false);
  const validationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pool = mode === "libre" ? getPool(selectedSets) : KANA_ITEMS;
  const maxQuestions = Math.max(5, pool.length);

  useEffect(() => {
    setQuestionCount((prev) => Math.min(prev, maxQuestions));
  }, [maxQuestions]);

  function showValidation() {
    setValidationMsg(true);
    if (validationTimer.current) clearTimeout(validationTimer.current);
    validationTimer.current = setTimeout(() => setValidationMsg(false), 2000);
  }

  function toggleChip(key: ChipKey) {
    const isDependent = DEPENDENT_CHIPS.includes(key);
    const isBase = BASE_CHIPS.includes(key);

    setSelectedSets((prev) => {
      if (key === "ambos") {
        const dependents = prev.filter((k) => DEPENDENT_CHIPS.includes(k));
        return ["hiragana", "katakana", ...dependents];
      }

      if (prev.includes(key)) {
        // Deselecting
        if (!isDependent && prev.length === 1) return prev; // must keep at least one base
        const next = prev.filter((k) => k !== key);

        // If deselecting a base chip and no base remains, also remove dependents
        if (isBase) {
          const hasBase = next.some((k) => BASE_CHIPS.includes(k));
          if (!hasBase) {
            const cleaned = next.filter((k) => !DEPENDENT_CHIPS.includes(k));
            if (cleaned.length === 0) return prev; // can't deselect if it would leave empty
            if (cleaned.length < next.length) showValidation();
            return cleaned;
          }
        }
        return next;
      }

      // Selecting
      if (isBase) {
        return [key, ...prev.filter((k) => !BASE_CHIPS.includes(k))];
      }

      if (isDependent) {
        const hasBase = prev.some((k) => BASE_CHIPS.includes(k));
        if (!hasBase) {
          showValidation();
          return prev; // block selection
        }
      }
      return [...prev, key];
    });
  }

  function changeCount(delta: number) {
    setQuestionCount((prev) => Math.max(5, Math.min(maxQuestions, prev + delta)));
  }

  function handleStart() {
    const params = new URLSearchParams({
      mode,
      taskMode: "mixed",
      count: String(questionCount),
    });
    if (mode === "libre") {
      params.set("sets", selectedSets.map(chipToUrlParam).join(","));
    } else {
      const progress = loadKanaProgress("anon");
      const stateCounts = getKanaStateCounts(KANA_ITEMS, progress);
      const progressSummary = getKanaProgressSummary(KANA_ITEMS, progress);
      const recommendation = getKanaSmartRecommendation(progress, {
        vistos: progressSummary.practiced,
        aprendiendo: stateCounts.aprendiendo + stateCounts.en_repaso,
        dominados: stateCounts.fijado,
      });
      params.set("items", recommendation.itemIds.join(","));
      params.set("focusItems", recommendation.focusItemIds.join(","));
      params.set("contextPrimary", recommendation.contextPrimary);
      if (recommendation.contextSecondary) {
        params.set("contextSecondary", recommendation.contextSecondary);
      }
    }
    router.push(`/kana/quiz?${params.toString()}`);
  }

  return (
    <div className="sesh-layout" style={{ overflowY: "auto" }}>
      <div style={{ flex: 1, padding: "0 0 140px", maxWidth: 760, width: "100%", margin: "0 auto" }}>
        {/* Back */}
        <button
          onClick={() => router.back()}
          style={{
            width: 42, height: 42, borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.09)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 24,
          }}
          aria-label="Volver"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <h1 style={{ fontSize: 34, fontWeight: 800, color: "#F4F4F8", margin: "0 0 28px", lineHeight: 1.1, letterSpacing: -0.5 }}>
          Configurar<br />práctica
        </h1>

        {/* Mode toggle */}
        {!forceLibre && (
          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 999, padding: 4, display: "flex", marginBottom: 28, border: "1px solid rgba(255,255,255,0.09)" }}>
            {(["smart", "libre"] as Mode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: "12px 0", borderRadius: 999, border: "none", cursor: "pointer",
                fontWeight: 700, fontSize: 16, fontFamily: "inherit",
                background: mode === m ? "#E63946" : "transparent",
                color: mode === m ? "#FFFFFF" : "rgba(244,244,248,0.45)",
                transition: "background 0.2s, color 0.2s",
              }}>
                {m === "smart" ? "Smart" : "Libre"}
              </button>
            ))}
          </div>
        )}

        {/* Chip selection — libre only */}
        {mode === "libre" && (
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: "1.4px", textTransform: "uppercase", color: "rgba(244,244,248,0.34)", margin: "0 0 12px" }}>
              Kana a practicar
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {CHIPS.map(({ key, label }) => {
                const active = key === "ambos"
                  ? selectedSets.includes("hiragana") && selectedSets.includes("katakana")
                  : selectedSets.includes(key);
                const isDependent = DEPENDENT_CHIPS.includes(key);
                const hasBase = selectedSets.some((k) => BASE_CHIPS.includes(k));
                const dimmed = isDependent && !hasBase;
                return (
                  <button key={key} onClick={() => toggleChip(key)} style={{
                    padding: "11px 20px", borderRadius: 999, border: "1.5px solid",
                    borderColor: active ? "#E63946" : "rgba(255,255,255,0.09)",
                    cursor: "pointer",
                    background: active ? "rgba(230,57,70,0.14)" : "rgba(255,255,255,0.06)",
                    color: active ? "#F4F4F8" : dimmed ? "rgba(244,244,248,0.3)" : "rgba(244,244,248,0.6)",
                    fontWeight: 700, fontSize: 15, fontFamily: "inherit",
                    opacity: dimmed ? 0.5 : 1,
                    flexGrow: key === "combinaciones" ? 1 : 0,
                    justifyContent: key === "combinaciones" ? "center" : undefined,
                    display: "flex", alignItems: "center", gap: 6,
                    transition: "background 0.15s, border-color 0.15s",
                  }}>
                    {label}
                    {active && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="#F4F4F8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 13, color: "rgba(244,244,248,0.4)", margin: "10px 0 0", minHeight: 18, transition: "opacity 0.3s", opacity: validationMsg ? 1 : 0 }}>
              Selecciona Hiragana o Katakana primero
            </p>
          </div>
        )}

        {/* Stepper */}
        <div>
          <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: "1.4px", textTransform: "uppercase", color: "rgba(244,244,248,0.34)", margin: "0 0 12px" }}>
            Número de ítems
          </p>
          <div className="sesh-itemcard" style={{ padding: "20px 22px", flexDirection: "row", justifyContent: "space-between", flex: "none", marginTop: 0 }}>
            <button onClick={() => changeCount(-5)} disabled={questionCount <= 5} style={{
              width: 52, height: 52, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.09)",
              background: "rgba(255,255,255,0.09)", cursor: questionCount <= 5 ? "not-allowed" : "pointer",
              fontSize: 26, fontWeight: 700, color: questionCount <= 5 ? "rgba(244,244,248,0.2)" : "#F4F4F8",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>−</button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 52, fontWeight: 800, color: "#F4F4F8", letterSpacing: -1, lineHeight: 1 }}>{questionCount}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(244,244,248,0.56)", marginTop: 4 }}>{questionCount} de {pool.length} · ~{Math.max(1, Math.round(questionCount * 7 / 60))} min</div>
            </div>
            <button onClick={() => changeCount(5)} disabled={questionCount >= maxQuestions} style={{
              width: 52, height: 52, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.09)",
              background: "rgba(255,255,255,0.09)", cursor: questionCount >= maxQuestions ? "not-allowed" : "pointer",
              fontSize: 26, fontWeight: 700, color: questionCount >= maxQuestions ? "rgba(244,244,248,0.2)" : "#F4F4F8",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>+</button>
          </div>
        </div>
      </div>

      {/* Bottom button */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "16px 20px", paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))", background: "linear-gradient(to top, #0D0D1A 70%, transparent)" }}>
        <button onClick={handleStart} className="sesh-btn sesh-btn-red">
          Empezar · {questionCount} ítems
        </button>
      </div>
    </div>
  );
}

export default function ConfigurarPage() {
  return (
    <Suspense>
      <ConfigurarContent />
    </Suspense>
  );
}
