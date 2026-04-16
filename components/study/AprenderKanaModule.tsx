"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import KanaHandwritingPad, { type KanaHandwritingRating } from "@/components/study/KanaHandwritingPad";
import PracticeShell, { PracticeStageCard } from "@/components/study/PracticeShell";
import StudySelectorGroup from "@/components/study/StudySelectorGroup";
import {
  KANA_ITEMS,
  KANA_PRACTICE_MODE_OPTIONS,
  KANA_QUESTION_COUNT_OPTIONS,
  getKanaTableSections,
  filterKanaItemsForSelection,
  getKanaSetLabel,
  type KanaItem,
  type KanaPracticeMode,
  type KanaQuestionCount,
  type KanaScript,
} from "@/lib/kana-data";
import {
  applyKanaRating,
  buildKanaSessionItems,
  getKanaProgressSummary,
  loadKanaProgress,
  saveKanaProgress,
  type KanaProgressMap,
  type KanaRating,
} from "@/lib/kana-progress";
import { recordStudyResultToStorage } from "@/lib/study-srs";

type AprenderKanaModuleProps = {
  userKey: string;
  onRecordActivity?: (detail?: string) => void;
  initialMode?: "learn" | null;
};

type KanaSessionQuestion = {
  item: KanaItem;
  mode: KanaPracticeMode;
  options?: string[];
};

type KanaSessionResult = {
  item: KanaItem;
  rating: KanaRating;
  mode: KanaPracticeMode;
  recognitionScore?: number;
};

type KanaSession = {
  setKey: string;
  modes: KanaPracticeMode[];
  count: KanaQuestionCount;
  questions: KanaSessionQuestion[];
};

type AnswerFeedback = {
  status: "correct" | "wrong";
  answer: string;
};

type KanaSelectableSet = "basic" | "dakuten" | "handakuten" | "yoon";
type KanaScopeKey = `${KanaScript}:${KanaSelectableSet}`;

const KANA_SCOPE_ROWS: Array<{ set: KanaSelectableSet; label: string }> = [
  { set: "basic", label: "Basic" },
  { set: "dakuten", label: "Dakuten" },
  { set: "handakuten", label: "Handakuten" },
  { set: "yoon", label: "Yōon" },
];

const KANA_SCOPE_LABELS: Record<KanaSelectableSet, string> = {
  basic: "Basic",
  dakuten: "Dakuten",
  handakuten: "Handakuten",
  yoon: "Yōon",
};

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
}

function normalizeRomaji(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function isKanaAnswerCorrect(item: KanaItem, rawValue: string) {
  const answer = normalizeRomaji(rawValue);
  if (!answer) return false;
  const accepted = new Set([item.romaji, ...(item.alternatives || [])].map(normalizeRomaji));
  return accepted.has(answer);
}

function buildMultipleChoiceQuestions(items: KanaItem[], fallbackPool: KanaItem[] = items) {
  const recentDistractors: string[] = [];
  let previousSet = new Set<string>();

  return items.map((item) => {
    const pool = [...items, ...fallbackPool]
      .filter((candidate) => candidate.id !== item.id && candidate.romaji !== item.romaji)
      .map((candidate) => candidate.romaji);
    const uniquePool = Array.from(new Set(pool));

    const scored = uniquePool
      .map((value) => ({
        value,
        penalty:
          recentDistractors.filter((entry) => entry === value).length * 3 +
          (previousSet.has(value) ? 2 : 0),
      }))
      .sort((a, b) => a.penalty - b.penalty || a.value.localeCompare(b.value));

    const selected: string[] = [];
    for (const candidate of scored) {
      if (selected.length >= 3) break;
      selected.push(candidate.value);
    }

    if (selected.length < 3) {
      uniquePool.forEach((value) => {
        if (selected.length >= 3 || selected.includes(value)) return;
        selected.push(value);
      });
    }

    const options = shuffle([item.romaji, ...selected.slice(0, 3)]).slice(0, Math.min(4, selected.length + 1));
    previousSet = new Set(selected.slice(0, 3));
    recentDistractors.push(...selected.slice(0, 3));
    if (recentDistractors.length > 9) recentDistractors.splice(0, recentDistractors.length - 9);

    return { item, options };
  });
}

function uniqueKanaItems(items: KanaItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function collectPracticeItems(scopeKeys: KanaScopeKey[]) {
  return uniqueKanaItems(
    scopeKeys.flatMap((scopeKey) => {
      const [script, set] = scopeKey.split(":") as [KanaScript, KanaSelectableSet];
      return filterKanaItemsForSelection(script, set);
    }),
  );
}

function buildModeSequence(count: number, modes: KanaPracticeMode[]) {
  if (modes.length === 0) return [];
  if (modes.length === 1) return Array.from({ length: count }, () => modes[0]);

  const sequence: KanaPracticeMode[] = [];
  let bag = shuffle(modes);

  while (sequence.length < count) {
    if (bag.length === 0) bag = shuffle(modes);
    const previous = sequence[sequence.length - 1];
    let next = bag.find((mode) => mode !== previous) || bag[0];
    bag = bag.filter((mode, index) => index !== bag.indexOf(next));
    sequence.push(next);
  }

  return sequence;
}

function buildQuestionsForItems(items: KanaItem[], fallbackPool: KanaItem[], modes: KanaPracticeMode[]) {
  const modeSequence = buildModeSequence(items.length, modes);
  const multipleChoiceMap = new Map(
    buildMultipleChoiceQuestions(
      items.filter((_, index) => modeSequence[index] === "multiple_choice"),
      fallbackPool,
    ).map((question) => [question.item.id, question.options] as const),
  );
  return items.map((item, index) => ({
    item,
    mode: modeSequence[index] || modes[0],
    options: modeSequence[index] === "multiple_choice" ? multipleChoiceMap.get(item.id) : undefined,
  }));
}

function buildSession(
  scopeKeys: KanaScopeKey[],
  modes: KanaPracticeMode[],
  count: KanaQuestionCount,
  progress: KanaProgressMap,
) {
  const baseItems = collectPracticeItems(scopeKeys);
  const items = buildKanaSessionItems(baseItems, progress, count);
  const questions = buildQuestionsForItems(items, baseItems, modes);
  return { setKey: scopeKeys.join("+"), modes, count, questions };
}

function isDueReview(nextReview?: string | null) {
  if (!nextReview) return true;
  return new Date(nextReview).getTime() <= Date.now();
}

function buildLearnSession(progress: KanaProgressMap) {
  const basicHiragana = filterKanaItemsForSelection("hiragana", "basic");
  const due = KANA_ITEMS.filter((item) => {
    const entry = progress[item.id];
    return entry && isDueReview(entry.nextReview);
  });
  const difficult = KANA_ITEMS.filter((item) => progress[item.id]?.difficult);
  const almostKnown = KANA_ITEMS.filter((item) => (progress[item.id]?.timesAlmost || 0) > 0);

  let learnPool = uniqueKanaItems([...due, ...difficult, ...almostKnown]);
  if (learnPool.length === 0) {
    learnPool = basicHiragana.slice(0, 5);
  }

  if (learnPool.length < 8) {
    const additions = basicHiragana.filter((item) => !learnPool.some((entry) => entry.id === item.id));
    learnPool = uniqueKanaItems([...learnPool, ...additions.slice(0, 8 - learnPool.length)]);
  }

  const items = buildKanaSessionItems(learnPool, progress, Math.min(10, Math.max(5, learnPool.length)));
  const questions = buildQuestionsForItems(items, learnPool, ["multiple_choice"]);
  return {
    setKey: "learn",
    modes: ["multiple_choice"] as KanaPracticeMode[],
    count: 10 as KanaQuestionCount,
    questions,
  };
}

export default function AprenderKanaModule({ userKey, onRecordActivity, initialMode = null }: AprenderKanaModuleProps) {
  const [screen, setScreen] = useState<"home" | "table" | "learn" | "setup">("home");
  const [tableScript, setTableScript] = useState<KanaScript>("hiragana");
  const [tableFilter, setTableFilter] = useState<"basic" | "dakuten" | "handakuten" | "yoon" | "mixed">("basic");
  const [selectedScopeKeys, setSelectedScopeKeys] = useState<KanaScopeKey[]>(["hiragana:basic"]);
  const [practiceModes, setPracticeModes] = useState<KanaPracticeMode[]>(["multiple_choice"]);
  const [questionCount, setQuestionCount] = useState<KanaQuestionCount>(20);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [progress, setProgress] = useState<KanaProgressMap>({});
  const [session, setSession] = useState<KanaSession | null>(null);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [sessionResults, setSessionResults] = useState<KanaSessionResult[]>([]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [romajiValue, setRomajiValue] = useState("");
  const [romajiFeedback, setRomajiFeedback] = useState<null | { correct: boolean; answer: string }>(null);
  const [multipleChoiceAnswer, setMultipleChoiceAnswer] = useState<string | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedback | null>(null);
  const [streak, setStreak] = useState(0);
  const [streakPulse, setStreakPulse] = useState(0);
  const romajiInputRef = useRef<HTMLInputElement | null>(null);
  const advanceTimerRef = useRef<number | null>(null);
  const autoStartedLearnRef = useRef(false);

  useEffect(() => {
    setProgress(loadKanaProgress(userKey));
  }, [userKey]);

  useEffect(() => {
    saveKanaProgress(userKey, progress);
  }, [progress, userKey]);

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(() => setSheetVisible(true), 18);
    return () => window.clearTimeout(timer);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [session]);

  const sessionFinished = Boolean(session) && sessionIndex >= (session?.questions.length || 0);
  const currentQuestion = session?.questions[sessionIndex] || null;
  const sessionQuestionCount = session?.questions.length || 0;
  const progressPercent = session?.questions.length ? Math.round((Math.min(sessionIndex + 1, session.questions.length) / session.questions.length) * 100) : 0;

  useEffect(() => {
    if (currentQuestion?.mode !== "romaji_input" || sessionFinished) return;
    const timer = window.setTimeout(() => romajiInputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [currentQuestion?.mode, sessionFinished, sessionIndex]);

  const allKanaSummary = useMemo(() => getKanaProgressSummary(KANA_ITEMS, progress), [progress]);
  const tableSections = useMemo(() => getKanaTableSections(tableScript, tableFilter), [tableFilter, tableScript]);
  const practicePool = useMemo(() => collectPracticeItems(selectedScopeKeys), [selectedScopeKeys]);
  const basicHiragana = useMemo(() => filterKanaItemsForSelection("hiragana", "basic"), []);

  const selectedScopeDetails = useMemo(
    () =>
      selectedScopeKeys.map((scopeKey) => {
        const [script, set] = scopeKey.split(":") as [KanaScript, KanaSelectableSet];
        const items = filterKanaItemsForSelection(script, set);
        return {
          key: scopeKey,
          script,
          set,
          count: items.length,
        };
      }),
    [selectedScopeKeys],
  );
  const selectedKanaCount = selectedScopeDetails.reduce((sum, entry) => sum + entry.count, 0);
  const selectedScriptSummary = Array.from(new Set(selectedScopeDetails.map((entry) => (entry.script === "hiragana" ? "Hiragana" : "Katakana")))).join(" · ");
  const selectedSetSummary = selectedScopeDetails
    .map((entry) => `${entry.script === "hiragana" ? "H" : "K"} ${KANA_SCOPE_LABELS[entry.set]}`)
    .join(", ");
  const learnReadyItems = useMemo(() => {
    const dueItems = KANA_ITEMS.filter((item) => {
      const entry = progress[item.id];
      return entry && isDueReview(entry.nextReview);
    });
    const difficultItems = KANA_ITEMS.filter((item) => progress[item.id]?.difficult);
    const almostItems = KANA_ITEMS.filter((item) => (progress[item.id]?.timesAlmost || 0) > 0);
    const base = uniqueKanaItems([...dueItems, ...difficultItems, ...almostItems]);
    if (base.length > 0) return base;
    return basicHiragana.slice(0, 5);
  }, [basicHiragana, progress]);
  const learnSummary = useMemo(() => {
    const due = KANA_ITEMS.filter((item) => {
      const entry = progress[item.id];
      return entry && isDueReview(entry.nextReview);
    }).length;
    const difficult = KANA_ITEMS.filter((item) => progress[item.id]?.difficult).length;
    const almost = KANA_ITEMS.filter((item) => (progress[item.id]?.timesAlmost || 0) > 0).length;
    const fresh = basicHiragana.filter((item) => !progress[item.id]).length;
    return { due, difficult, almost, fresh };
  }, [basicHiragana, progress]);

  const subtlePillStyle: CSSProperties = {
    borderRadius: 999,
    padding: "7px 10px",
    border: "1px solid var(--color-border)",
    background: "color-mix(in srgb, var(--color-surface) 82%, white)",
    color: "var(--color-text)",
    fontSize: "var(--text-body-sm)",
    fontWeight: 700,
  };

  const toggleScopeKey = (scopeKey: KanaScopeKey) => {
    setSelectedScopeKeys((previous) =>
      previous.includes(scopeKey) ? previous.filter((entry) => entry !== scopeKey) : [...previous, scopeKey],
    );
    setSetupError(null);
  };

  const togglePracticeMode = (value: KanaPracticeMode) => {
    setPracticeModes((previous) =>
      previous.includes(value) ? previous.filter((entry) => entry !== value) : [...previous, value],
    );
    setSetupError(null);
  };

  const recordResult = (item: KanaItem, rating: KanaRating, extra?: { recognitionScore?: number }) => {
    setProgress((previous) => applyKanaRating(previous, item, rating));
    recordStudyResultToStorage(userKey, {
      itemId: item.id,
      itemType: "kana",
      sourceTool: "learnkana",
      label: `${item.kana} · ${item.romaji}`,
      rating,
    });
    setSessionResults((previous) => [
      ...previous,
      { item, rating, mode: currentQuestion?.mode || practiceModes[0] || "multiple_choice", recognitionScore: extra?.recognitionScore },
    ]);
  };

  const moveToNext = () => {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setMultipleChoiceAnswer(null);
    setRomajiValue("");
    setRomajiFeedback(null);
    setAnswerFeedback(null);
    setSessionIndex((value) => value + 1);
  };

  useEffect(() => {
    setMultipleChoiceAnswer(null);
    setRomajiValue("");
    setRomajiFeedback(null);
    setAnswerFeedback(null);
  }, [sessionIndex, currentQuestion?.mode, currentQuestion?.item.id]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  const closeSession = () => {
    setSheetVisible(false);
    window.setTimeout(() => {
      setSession(null);
      setSessionIndex(0);
      setSessionResults([]);
      setMultipleChoiceAnswer(null);
      setRomajiValue("");
      setRomajiFeedback(null);
      setAnswerFeedback(null);
      setStreak(0);
    }, 220);
  };

  const openSession = (nextSession: KanaSession, activityLabel: string) => {
    setSession(nextSession);
    setSessionIndex(0);
    setSessionResults([]);
    setMultipleChoiceAnswer(null);
    setRomajiValue("");
    setRomajiFeedback(null);
    setAnswerFeedback(null);
    setStreak(0);
    setSetupError(null);
    onRecordActivity?.(activityLabel);
  };

  const startSession = (overrideItems?: KanaItem[]) => {
    if (selectedScopeKeys.length === 0) {
      setSetupError("Selecciona al menos un bloque de kana.");
      return;
    }
    if (practiceModes.length === 0) {
      setSetupError("Selecciona al menos un modo.");
      return;
    }
    if (practicePool.length === 0) {
      setSetupError("No hay kana disponibles con esa selección.");
      return;
    }

    const nextSession = overrideItems
      ? {
          setKey: selectedScopeKeys.join("+"),
          modes: practiceModes,
          count: overrideItems.length as KanaQuestionCount,
          questions: buildQuestionsForItems(uniqueKanaItems(overrideItems), practicePool, practiceModes),
        }
      : buildSession(selectedScopeKeys, practiceModes, questionCount, progress);

    openSession(nextSession, `${selectedScriptSummary || "Kana"} · ${selectedSetSummary || "Basic"}`);
  };

  const startLearnSession = () => {
    openSession(buildLearnSession(progress), "Learn");
  };

  useEffect(() => {
    if (initialMode !== "learn" || autoStartedLearnRef.current || session) return;
    autoStartedLearnRef.current = true;
    startLearnSession();
  }, [initialMode, progress, session]);

  const hardestSessionKana = useMemo(() => {
    const buckets = new Map<string, { item: KanaItem; weight: number }>();
    sessionResults.forEach((result) => {
      const weight = result.rating === "wrong" ? 2 : result.rating === "almost" ? 1 : 0;
      const current = buckets.get(result.item.id) || { item: result.item, weight: 0 };
      current.weight += weight;
      buckets.set(result.item.id, current);
    });
    return Array.from(buckets.values())
      .filter((entry) => entry.weight > 0)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map((entry) => entry.item);
  }, [sessionResults]);

  const summary = useMemo(
    () => ({
      correct: sessionResults.filter((result) => result.rating === "correct").length,
      almost: sessionResults.filter((result) => result.rating === "almost").length,
      wrong: sessionResults.filter((result) => result.rating === "wrong").length,
    }),
    [sessionResults],
  );

  const repeatCandidates = useMemo(
    () => sessionResults.filter((result) => result.rating !== "correct").map((result) => result.item),
    [sessionResults],
  );

  const activeQuestionLabel = currentQuestion ? getKanaSetLabel(currentQuestion.item) : "";
  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      {screen === "home" && (
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          {allKanaSummary.practiced > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div style={subtlePillStyle}>{allKanaSummary.practiced} practicados</div>
              {allKanaSummary.difficult > 0 && <div style={subtlePillStyle}>{allKanaSummary.difficult} difíciles</div>}
              {allKanaSummary.due > 0 && <div style={subtlePillStyle}>{allKanaSummary.due} pendientes</div>}
            </div>
          )}

          <div style={{ display: "grid", gap: "var(--space-2)", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
            <button
              type="button"
              onClick={() => setScreen("table")}
              style={{
                border: "1px solid var(--color-border)",
                background: "color-mix(in srgb, var(--color-surface) 86%, white)",
                borderRadius: 28,
                padding: "18px 18px 16px",
                textAlign: "left",
                display: "grid",
                gap: 10,
                color: "var(--color-text)",
              }}
            >
              <div style={{ fontSize: "clamp(24px, 5vw, 30px)", lineHeight: 1, fontWeight: 800 }}>Kana table</div>
              <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 700 }}>
                Hiragana · Katakana
              </div>
            </button>

            <button
              type="button"
              onClick={() => setScreen("learn")}
              style={{
                border: "1px solid transparent",
                background: "color-mix(in srgb, var(--color-highlight-soft) 66%, white)",
                borderRadius: 28,
                padding: "18px 18px 16px",
                textAlign: "left",
                display: "grid",
                gap: 10,
                color: "var(--color-text)",
              }}
            >
              <div style={{ fontSize: "clamp(24px, 5vw, 30px)", lineHeight: 1, fontWeight: 800 }}>Learn</div>
              <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 700 }}>
                Guiado · progresivo
              </div>
            </button>

            <button
              type="button"
              onClick={() => setScreen("setup")}
              style={{
                border: "1px solid var(--color-border)",
                background: "color-mix(in srgb, var(--color-surface-muted) 74%, white)",
                borderRadius: 28,
                padding: "18px 18px 16px",
                textAlign: "left",
                display: "grid",
                gap: 10,
                color: "var(--color-text)",
              }}
            >
              <div style={{ fontSize: "clamp(24px, 5vw, 30px)", lineHeight: 1, fontWeight: 800 }}>Custom Practice</div>
              <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 700 }}>
                Scripts · modos · preguntas
              </div>
            </button>
          </div>
        </div>
      )}

      {screen === "learn" && (
        <div
          style={{
            display: "grid",
            gap: "var(--space-3)",
            minHeight: "min(100dvh - 160px, 680px)",
            alignContent: "space-between",
          }}
        >
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontSize: "var(--text-h3)", fontWeight: 800, color: "var(--color-text)" }}>Learn</div>
                <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 700 }}>
                  Repasa primero lo pendiente y añade kana nuevos sin saturarte.
                </div>
              </div>
              <button type="button" onClick={() => setScreen("home")} className="ds-btn-ghost">
                Volver
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gap: 12,
                padding: "18px 18px 16px",
                borderRadius: 28,
                border: "1px solid var(--color-border)",
                background: "color-mix(in srgb, var(--color-surface) 88%, white)",
                boxShadow: "0 18px 30px rgba(26, 26, 46, 0.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 800 }}>
                  Sesión guiada
                </div>
                <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text)", fontWeight: 800 }}>
                  {Math.min(10, Math.max(5, learnReadyItems.length))} preguntas
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {learnSummary.due > 0 ? <div style={subtlePillStyle}>{learnSummary.due} pendientes</div> : null}
                {learnSummary.difficult > 0 ? <div style={subtlePillStyle}>{learnSummary.difficult} difíciles</div> : null}
                {learnSummary.almost > 0 ? <div style={subtlePillStyle}>{learnSummary.almost} por fijar</div> : null}
                {learnSummary.due === 0 && learnSummary.difficult === 0 && (
                  <div style={subtlePillStyle}>{Math.min(5, learnSummary.fresh)} nuevos</div>
                )}
              </div>
              <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", lineHeight: 1.45 }}>
                {learnSummary.due > 0 || learnSummary.difficult > 0
                  ? "Esta sesión va a priorizar lo que ya necesita repaso antes de meter kana nuevos."
                  : "Si todavía no tienes progreso, Learn empieza con hiragana básico y lo amplía poco a poco."}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 8,
              padding: "14px 16px calc(14px + env(safe-area-inset-bottom))",
              borderRadius: 26,
              background: "color-mix(in srgb, var(--color-surface) 86%, white)",
              border: "1px solid var(--color-border)",
            }}
          >
            <button type="button" onClick={startLearnSession} className="ds-btn" style={{ width: "100%", minHeight: 54 }}>
              Empezar Learn
            </button>
            <button type="button" onClick={() => setScreen("setup")} className="ds-btn-ghost">
              Abrir práctica personalizada
            </button>
          </div>
        </div>
      )}

      {screen === "table" && (
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0, flex: "1 1 280px" }}>
              <StudySelectorGroup
                options={[
                  { key: "hiragana", label: "Hiragana", tone: "color-mix(in srgb, var(--color-accent-soft) 72%, white)" },
                  { key: "katakana", label: "Katakana", tone: "color-mix(in srgb, rgba(69, 123, 157, 0.14) 70%, white)" },
                ]}
                value={tableScript}
                onSelect={(value) => setTableScript(value)}
                layout="row"
                compact
                minItemWidth={118}
              />
            </div>
            <button type="button" onClick={() => setScreen("home")} className="ds-btn-ghost">
              Volver
            </button>
          </div>

          <StudySelectorGroup
            options={[
              { key: "basic", label: "Basic" },
              { key: "dakuten", label: "Dakuten" },
              { key: "handakuten", label: "Handakuten" },
              { key: "yoon", label: "Yōon" },
              { key: "mixed", label: "Todo" },
            ]}
            value={tableFilter}
            onSelect={(value) => setTableFilter(value)}
            layout="grid"
            compact
            minItemWidth={106}
          />

          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            {tableSections.map((section) => (
              <div key={section.key} style={{ display: "grid", gap: 10 }}>
                {tableFilter === "mixed" && (
                  <div style={{ fontSize: "var(--text-label)", color: "var(--color-text-muted)", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>
                    {section.label}
                  </div>
                )}
                <div style={{ display: "grid", gap: 8 }}>
                  {section.rows.map((row, rowIndex) => (
                    <div key={`${section.key}-${rowIndex}`} style={{ display: "grid", gridTemplateColumns: `repeat(${section.columns}, minmax(0, 1fr))`, gap: 8 }}>
                      {row.map((item, cellIndex) =>
                        item ? (
                          <div
                            key={item.id}
                            style={{
                              borderRadius: 18,
                              background: "color-mix(in srgb, var(--color-surface) 84%, white)",
                              padding: "12px 6px 10px",
                              display: "grid",
                              gap: 4,
                              justifyItems: "center",
                              minHeight: 74,
                            }}
                          >
                            <div style={{ fontSize: section.columns === 5 ? 28 : 26, lineHeight: 1, fontWeight: 800, color: "var(--color-text)" }}>{item.kana}</div>
                            <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 700 }}>{item.romaji}</div>
                          </div>
                        ) : (
                          <div key={`${section.key}-blank-${rowIndex}-${cellIndex}`} aria-hidden="true" />
                        ),
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {screen === "setup" && (
        <div
          style={{
            display: "grid",
            gap: "var(--space-3)",
            minHeight: "min(100dvh - 160px, 720px)",
            alignContent: "space-between",
          }}
        >
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontSize: "var(--text-h3)", fontWeight: 800, color: "var(--color-text)" }}>Practice</div>
              <button type="button" onClick={() => setScreen("home")} className="ds-btn-ghost">
                Volver
              </button>
            </div>

            <StudySelectorGroup
              options={[
                { key: "multiple_choice", label: "Opciones" },
                { key: "romaji_input", label: "Romaji" },
                { key: "handwriting", label: "Manual" },
              ]}
              values={practiceModes}
              multiple
              onToggle={togglePracticeMode}
              layout="grid"
              compact
              minItemWidth={96}
            />

            <button
              type="button"
              onClick={() => setScopeModalOpen(true)}
              style={{
                display: "grid",
                gap: 6,
                textAlign: "left",
                border: "1px solid var(--color-border)",
                borderRadius: 24,
                background: "color-mix(in srgb, var(--color-surface) 86%, white)",
                padding: "14px 16px",
                color: "var(--color-text)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 800 }}>Kana seleccionados</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: "var(--text-body)", fontWeight: 800 }}>{selectedKanaCount}</div>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 999,
                      display: "grid",
                      placeItems: "center",
                      background: "color-mix(in srgb, var(--color-highlight-soft) 64%, white)",
                      color: "var(--color-accent-strong)",
                      fontSize: 14,
                      fontWeight: 800,
                    }}
                    aria-hidden="true"
                  >
                    ↗
                  </div>
                </div>
              </div>
              <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text)", fontWeight: 700 }}>
                {selectedScriptSummary || "Ninguno"}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.35 }}>
                  {selectedSetSummary || "Toca para elegir"}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-accent-strong)", fontWeight: 800 }}>
                  Editar
                </div>
              </div>
            </button>

            <StudySelectorGroup
              options={KANA_QUESTION_COUNT_OPTIONS.map((value) => ({ key: String(value) as "10" | "20" | "30", label: String(value) }))}
              value={String(questionCount) as "10" | "20" | "30"}
              onSelect={(value) => setQuestionCount(Number(value) as KanaQuestionCount)}
              layout="row"
              minItemWidth={82}
              compact
            />

            {setupError ? (
              <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-accent-strong)", fontWeight: 700 }}>
                {setupError}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              padding: "14px 16px calc(14px + env(safe-area-inset-bottom))",
              borderRadius: 26,
              background: "color-mix(in srgb, var(--color-surface) 86%, white)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 700 }}>
                {practiceModes.length > 0 ? `${practiceModes.length} modo${practiceModes.length > 1 ? "s" : ""}` : "Sin modo"}
              </div>
              <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text)", fontWeight: 800 }}>
                {questionCount} preguntas
              </div>
            </div>
            <button
              type="button"
              onClick={() => startSession()}
              disabled={selectedScopeKeys.length === 0 || practiceModes.length === 0}
              className="ds-btn"
              style={{
                width: "100%",
                minHeight: 54,
                opacity: selectedScopeKeys.length === 0 || practiceModes.length === 0 ? 0.5 : 1,
                cursor: selectedScopeKeys.length === 0 || practiceModes.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              Start
            </button>
          </div>
        </div>
      )}

      {scopeModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 95,
            background: "rgba(26, 26, 46, 0.18)",
            backdropFilter: "blur(10px)",
            display: "grid",
            alignItems: "end",
            padding: "12px",
          }}
        >
          <div
            style={{
              width: "min(100%, 560px)",
              margin: "0 auto",
              display: "grid",
              gap: 14,
              padding: "16px 16px calc(16px + env(safe-area-inset-bottom))",
              borderRadius: 30,
              background: "color-mix(in srgb, var(--color-surface) 90%, white)",
              border: "1px solid var(--color-border)",
              boxShadow: "0 20px 40px rgba(26,26,46,.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-text)" }}>Kana</div>
              <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 700 }}>
                {selectedKanaCount}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "112px repeat(2, minmax(0, 1fr))",
                gap: 8,
                alignItems: "center",
              }}
            >
              <div />
              <div style={{ textAlign: "center", fontSize: "var(--text-body-sm)", fontWeight: 800, color: "var(--color-text)" }}>Hiragana</div>
              <div style={{ textAlign: "center", fontSize: "var(--text-body-sm)", fontWeight: 800, color: "var(--color-text)" }}>Katakana</div>

              {KANA_SCOPE_ROWS.map((row) => (
                <div key={row.set} style={{ display: "contents" }}>
                  <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 700 }}>{row.label}</div>
                  {(["hiragana", "katakana"] as KanaScript[]).map((script) => {
                    const key = `${script}:${row.set}` as KanaScopeKey;
                    const selected = selectedScopeKeys.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleScopeKey(key)}
                        style={{
                          minHeight: 54,
                          borderRadius: 18,
                          border: selected ? "1px solid transparent" : "1px solid var(--color-border)",
                          background: selected
                            ? script === "hiragana"
                              ? "color-mix(in srgb, var(--color-accent-soft) 74%, white)"
                              : "color-mix(in srgb, rgba(69, 123, 157, 0.14) 72%, white)"
                            : "color-mix(in srgb, var(--color-surface) 82%, white)",
                          color: "var(--color-text)",
                          fontSize: "var(--text-body)",
                          fontWeight: 800,
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        {selected ? "✓" : ""}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setScopeModalOpen(false)}
              className="ds-btn"
              style={{ width: "100%", minHeight: 54 }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <PracticeShell
        open={Boolean(session)}
        visible={sheetVisible}
        title="Aprender Kana"
        subtitle={sessionFinished ? "Resumen" : `Pregunta ${Math.min(sessionIndex + 1, session?.questions.length || 0)} / ${session?.questions.length || 0}`}
        current={sessionFinished ? undefined : Math.min(sessionIndex + 1, session?.questions.length || 0)}
        total={sessionFinished ? undefined : session?.questions.length || 0}
        streak={sessionFinished ? 0 : streak}
        streakPulseKey={streakPulse}
        onClose={closeSession}
      >
        {!sessionFinished && currentQuestion ? (
                <div key={`${currentQuestion.item.id}-${sessionIndex}`} style={{ display: "grid", gap: "var(--space-4)", animation: "kanaPracticeStepIn 180ms ease" }}>
                  <PracticeStageCard
                    label={activeQuestionLabel}
                    compact={currentQuestion.mode === "handwriting"}
                    feedback={answerFeedback?.status || null}
                    value={
                      <div
                        style={{
                          fontSize: currentQuestion.mode === "handwriting" ? "clamp(28px, 8vw, 42px)" : "clamp(96px, 32vw, 154px)",
                          lineHeight: 0.92,
                          letterSpacing: "-.05em",
                          fontWeight: 800,
                          color: "var(--color-text)",
                        }}
                      >
                        {currentQuestion.mode === "handwriting" ? currentQuestion.item.romaji : currentQuestion.item.kana}
                      </div>
                    }
                  />

                  {currentQuestion.mode === "multiple_choice" && currentQuestion.options && (
                    <div style={{ display: "grid", gap: 12 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                        {currentQuestion.options.map((option) => {
                          const isChosen = multipleChoiceAnswer === option;
                          const isCorrect = option === currentQuestion.item.romaji;
                          const showAnswer = Boolean(answerFeedback);
                          return (
                            <button
                              key={option}
                              type="button"
                              disabled={showAnswer}
                              onClick={() => {
                                if (answerFeedback) return;
                                const correct = option === currentQuestion.item.romaji;
                                setMultipleChoiceAnswer(option);
                                setAnswerFeedback({ status: correct ? "correct" : "wrong", answer: currentQuestion.item.romaji });
                                recordResult(currentQuestion.item, correct ? "correct" : "wrong");
                                if (correct) {
                                  setStreak((value) => {
                                    const next = value + 1;
                                    setStreakPulse(next);
                                    return next;
                                  });
                                  advanceTimerRef.current = window.setTimeout(() => {
                                    moveToNext();
                                  }, 650);
                                } else {
                                  setStreak(0);
                                }
                              }}
                              style={{
                                minHeight: 128,
                                borderRadius: 28,
                                border: "1px solid color-mix(in srgb, var(--color-border) 88%, white)",
                                background:
                                  showAnswer && isCorrect
                                    ? "color-mix(in srgb, var(--color-accent-soft) 76%, white)"
                                    : showAnswer && isChosen && !isCorrect
                                      ? "color-mix(in srgb, var(--color-highlight-soft) 76%, white)"
                                      : "color-mix(in srgb, var(--color-surface) 82%, white)",
                                color: "var(--color-text)",
                                fontSize: 28,
                                fontWeight: 800,
                                cursor: showAnswer ? "default" : "pointer",
                                boxShadow: showAnswer && isCorrect ? "0 12px 26px rgba(78,205,196,.14)" : "0 10px 22px rgba(26,26,46,.04)",
                              }}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                      {answerFeedback && (
                        <div style={{ display: "grid", gap: 10, justifyItems: "center", textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: "var(--text-body)",
                              color: answerFeedback.status === "correct" ? "#117964" : "var(--color-text-muted)",
                              fontWeight: 800,
                            }}
                          >
                            {answerFeedback.status === "correct" ? "Correcto" : `Respuesta: ${currentQuestion.item.romaji}`}
                          </div>
                          {answerFeedback.status === "wrong" ? (
                            <button type="button" onClick={moveToNext} className="ds-btn">
                              {sessionIndex >= sessionQuestionCount - 1 ? "Ver resumen" : "Siguiente"}
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )}

                  {currentQuestion.mode === "romaji_input" && (
                    <div style={{ display: "grid", gap: 12, justifyItems: "center" }}>
                      <input
                        ref={romajiInputRef}
                        value={romajiValue}
                        onChange={(event) => setRomajiValue(event.target.value)}
                        placeholder="romaji"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        inputMode="text"
                        enterKeyHint="done"
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !romajiFeedback) {
                            const correct = isKanaAnswerCorrect(currentQuestion.item, romajiValue);
                            setRomajiFeedback({ correct, answer: currentQuestion.item.romaji });
                            setAnswerFeedback({ status: correct ? "correct" : "wrong", answer: currentQuestion.item.romaji });
                            recordResult(currentQuestion.item, correct ? "correct" : "wrong");
                            if (correct) {
                              setStreak((value) => {
                                const next = value + 1;
                                setStreakPulse(next);
                                return next;
                              });
                              advanceTimerRef.current = window.setTimeout(() => {
                                moveToNext();
                              }, 650);
                            } else {
                              setStreak(0);
                            }
                          }
                        }}
                        style={{ width: "100%", maxWidth: 340, textAlign: "center", fontSize: 30, fontWeight: 800, minHeight: 64, borderRadius: 20, border: "1px solid var(--color-border)", background: "color-mix(in srgb, var(--color-surface) 90%, white)" }}
                      />
                      <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => {
                            const correct = isKanaAnswerCorrect(currentQuestion.item, romajiValue);
                            setRomajiFeedback({ correct, answer: currentQuestion.item.romaji });
                            setAnswerFeedback({ status: correct ? "correct" : "wrong", answer: currentQuestion.item.romaji });
                            recordResult(currentQuestion.item, correct ? "correct" : "wrong");
                            if (correct) {
                              setStreak((value) => {
                                const next = value + 1;
                                setStreakPulse(next);
                                return next;
                              });
                              advanceTimerRef.current = window.setTimeout(() => {
                                moveToNext();
                              }, 650);
                            } else {
                              setStreak(0);
                            }
                          }}
                          disabled={Boolean(romajiFeedback) || normalizeRomaji(romajiValue).length === 0}
                          className="ds-btn"
                        >
                          Submit
                        </button>
                        {romajiFeedback && (
                          <button type="button" onClick={moveToNext} className="ds-btn-secondary">
                            {sessionIndex >= sessionQuestionCount - 1 ? "Ver resumen" : "Siguiente"}
                          </button>
                        )}
                      </div>
                      {romajiFeedback && (
                        <div style={{ fontSize: "var(--text-body)", color: romajiFeedback.correct ? "#117964" : "var(--color-text-muted)", fontWeight: 800, textAlign: "center" }}>
                          {romajiFeedback.correct ? "Correcto" : `Respuesta correcta: ${romajiFeedback.answer}`}
                        </div>
                      )}
                    </div>
                  )}

                  {currentQuestion.mode === "handwriting" && (
                    <div style={{ display: "grid", gap: 10, justifyItems: "center", textAlign: "center" }}>
                      <KanaHandwritingPad
                        key={`${currentQuestion.item.id}-${sessionIndex}`}
                        targetKana={currentQuestion.item.kana}
                        onRated={(rating: KanaHandwritingRating, score) => {
                          recordResult(currentQuestion.item, rating, { recognitionScore: score });
                          if (rating === "correct") {
                            setAnswerFeedback({ status: "correct", answer: currentQuestion.item.kana });
                            setStreak((value) => {
                              const next = value + 1;
                              setStreakPulse(next);
                              return next;
                            });
                            advanceTimerRef.current = window.setTimeout(() => {
                              moveToNext();
                            }, 620);
                          } else {
                            setAnswerFeedback({ status: rating === "almost" ? "correct" : "wrong", answer: currentQuestion.item.kana });
                            setStreak(0);
                          }
                        }}
                      />
                      {answerFeedback && answerFeedback.status === "wrong" ? (
                        <button type="button" onClick={moveToNext} className="ds-btn">
                          {sessionIndex >= sessionQuestionCount - 1 ? "Ver resumen" : "Siguiente"}
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null}

        {sessionFinished ? (
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            <div
              style={{
                display: "grid",
                gap: 14,
                padding: "18px 18px 16px",
                borderRadius: 30,
                background: "color-mix(in srgb, var(--color-surface) 86%, white)",
                boxShadow: "0 18px 34px rgba(26,26,46,.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: "var(--text-label)", color: "var(--color-text-muted)", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>
                    Resultado
                  </div>
                  <div style={{ fontSize: "clamp(38px, 12vw, 62px)", lineHeight: 0.92, letterSpacing: "-.05em", fontWeight: 800, color: "var(--color-text)" }}>
                    {summary.correct} / {session?.questions.length || 0}
                  </div>
                </div>
                <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 700 }}>
                  {Math.round((summary.correct / Math.max(1, session?.questions.length || 1)) * 100)}%
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                <div style={{ ...subtlePillStyle, textAlign: "center" }}>✓ {summary.correct}</div>
                <div style={{ ...subtlePillStyle, textAlign: "center" }}>～ {summary.almost}</div>
                <div style={{ ...subtlePillStyle, textAlign: "center" }}>✕ {summary.wrong}</div>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 8,
                  padding: "12px 14px",
                  borderRadius: 22,
                  background: "color-mix(in srgb, var(--color-highlight-soft) 52%, white)",
                }}
              >
                <div style={{ fontSize: "var(--text-label)", color: "var(--color-text-muted)", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>
                  Hardest kana
                </div>
                {hardestSessionKana.length > 0 ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {hardestSessionKana.map((item) => (
                      <div key={item.id} style={subtlePillStyle}>
                        {item.kana} · {item.romaji}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 700 }}>
                    Nada problemático en esta sesión.
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {repeatCandidates.length > 0 ? (
                <button
                  type="button"
                  onClick={() => startSession(repeatCandidates.slice(0, Math.min(repeatCandidates.length, 20)))}
                  className="ds-btn"
                >
                  Practicar falladas
                </button>
              ) : null}
              <button type="button" onClick={() => startSession()} className="ds-btn-secondary">
                Otra sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  closeSession();
                  setScreen("home");
                }}
                className="ds-btn-ghost"
              >
                Volver a Aprender Kana
              </button>
            </div>
          </div>
        ) : null}
      </PracticeShell>

      <style jsx>{`
        @keyframes kanaPracticeStepIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
