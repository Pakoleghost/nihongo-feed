"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import KanaHandwritingPad, { type KanaHandwritingRating } from "@/components/study/KanaHandwritingPad";
import PracticeShell, { PracticeStageCard } from "@/components/study/PracticeShell";
import StudySelectorGroup from "@/components/study/StudySelectorGroup";
import {
  KANA_ITEMS,
  KANA_QUESTION_COUNT_OPTIONS,
  filterKanaItemsForSelection,
  getKanaTableSections,
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
import { DS, NavDrawer } from "@/components/study/ds";

type AprenderKanaModuleProps = {
  userKey: string;
  onRecordActivity?: (detail?: string) => void;
  initialMode?: "learn" | null;
  onTabChange?: (tab: "home" | "learn" | "review" | "practice" | "vault") => void;
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
  count: number;
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

// Ordered hiragana groups for progressive Learn mode introduction
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

function getCurrentLearnBatch(hiraganaBasic: KanaItem[], progress: KanaProgressMap): number {
  const kanaToItem = new Map(hiraganaBasic.map((item) => [item.kana, item]));
  for (let i = 0; i < HIRAGANA_BASIC_GROUPS.length; i++) {
    const groupItems = HIRAGANA_BASIC_GROUPS[i]
      .map((k) => kanaToItem.get(k))
      .filter((item): item is KanaItem => Boolean(item));
    const allStable = groupItems.every((item) => {
      const entry = progress[item.id];
      return entry && entry.level >= 1 && !entry.difficult;
    });
    if (!allStable) return i;
  }
  return HIRAGANA_BASIC_GROUPS.length - 1;
}

function isDueReview(nextReview?: string | null) {
  if (!nextReview) return true;
  return new Date(nextReview).getTime() <= Date.now();
}

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

function buildLearnSession(hiraganaBasic: KanaItem[], progress: KanaProgressMap) {
  const kanaToItem = new Map(hiraganaBasic.map((item) => [item.kana, item]));
  const batchIdx = getCurrentLearnBatch(hiraganaBasic, progress);

  // All unlocked items: batches 0..batchIdx
  const unlockedItems = HIRAGANA_BASIC_GROUPS.slice(0, batchIdx + 1)
    .flat()
    .map((k) => kanaToItem.get(k))
    .filter((item): item is KanaItem => Boolean(item));

  // Current batch items
  const currentBatchItems = HIRAGANA_BASIC_GROUPS[batchIdx]
    .map((k) => kanaToItem.get(k))
    .filter((item): item is KanaItem => Boolean(item));

  // Items in current batch that still need to reach level >= 1
  const unstableInBatch = currentBatchItems.filter((item) => {
    const entry = progress[item.id];
    return !entry || entry.level < 1 || entry.difficult;
  });

  // Due/difficult reviews from earlier unlocked batches
  const currentBatchIds = new Set(currentBatchItems.map((item) => item.id));
  const reviewPool = unlockedItems.filter((item) => {
    if (currentBatchIds.has(item.id)) return false;
    const entry = progress[item.id];
    if (!entry) return false;
    return isDueReview(entry.nextReview) || entry.difficult;
  });

  let pool: KanaItem[];
  if (unstableInBatch.length > 0) {
    const maxReview = unstableInBatch.length >= 3 ? 3 : 5;
    pool = uniqueKanaItems([...unstableInBatch, ...reviewPool.slice(0, maxReview)]);
  } else if (reviewPool.length > 0) {
    pool = reviewPool;
  } else {
    pool = unlockedItems.length > 0 ? unlockedItems : currentBatchItems;
  }

  const sessionCount = Math.min(12, Math.max(5, pool.length));
  // Rank by SRS priority, then shuffle so order differs every session
  const ranked = buildKanaSessionItems(pool, progress, sessionCount);
  const items = shuffle(ranked);
  const fallbackPool = uniqueKanaItems([...hiraganaBasic, ...unlockedItems]);
  const questions = buildQuestionsForItems(items, fallbackPool, ["multiple_choice"]);
  return { setKey: "learn", modes: ["multiple_choice"] as KanaPracticeMode[], count: sessionCount, questions };
}

// Full 5-column hiragana chart (nulls = empty cells for y/w rows)
const KANA_CHART_ROWS: Array<{ label: string; chars: Array<string | null> }> = [
  { label: "a", chars: ["あ", "い", "う", "え", "お"] },
  { label: "k", chars: ["か", "き", "く", "け", "こ"] },
  { label: "s", chars: ["さ", "し", "す", "せ", "そ"] },
  { label: "t", chars: ["た", "ち", "つ", "て", "と"] },
  { label: "n", chars: ["な", "に", "ぬ", "ね", "の"] },
  { label: "h", chars: ["は", "ひ", "ふ", "へ", "ほ"] },
  { label: "m", chars: ["ま", "み", "む", "め", "も"] },
  { label: "y", chars: ["や", null, "ゆ", null, "よ"] },
  { label: "r", chars: ["ら", "り", "る", "れ", "ろ"] },
  { label: "w", chars: ["わ", null, null, null, "を"] },
  { label: "n", chars: ["ん", null, null, null, null] },
];

export default function AprenderKanaModule({ userKey, onRecordActivity, initialMode = null, onTabChange }: AprenderKanaModuleProps) {
  const [screen, setScreen] = useState<"home" | "table" | "learn" | "setup">("home");
  const [tableScript, setTableScript] = useState<KanaScript>("hiragana");
  const [tableFilter, setTableFilter] = useState<"basic" | "dakuten" | "handakuten" | "yoon" | "mixed">("basic");
  const [selectedScopeKeys, setSelectedScopeKeys] = useState<KanaScopeKey[]>(["hiragana:basic"]);
  const [practiceModes, setPracticeModes] = useState<KanaPracticeMode[]>(["multiple_choice"]);
  const [questionCount, setQuestionCount] = useState<KanaQuestionCount>(20);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [progress, setProgress] = useState<KanaProgressMap>({});
  const [progressReady, setProgressReady] = useState(false);
  const [session, setSession] = useState<KanaSession | null>(null);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [sessionResults, setSessionResults] = useState<KanaSessionResult[]>([]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [romajiValue, setRomajiValue] = useState("");
  const [romajiFeedback, setRomajiFeedback] = useState<null | { correct: boolean; answer: string }>(null);
  const [multipleChoiceAnswer, setMultipleChoiceAnswer] = useState<string | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedback | null>(null);
  const [handwritingRating, setHandwritingRating] = useState<KanaHandwritingRating | null>(null);
  const [sessionNewItemIds, setSessionNewItemIds] = useState<Set<string>>(new Set());
  const [sessionStartBatchIdx, setSessionStartBatchIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [streakPulse, setStreakPulse] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const romajiInputRef = useRef<HTMLInputElement | null>(null);
  const advanceTimerRef = useRef<number | null>(null);
  const autoStartedLearnRef = useRef(false);

  const btnPrimary = { background: DS.ink, color: DS.bg, border: "none", borderRadius: 18, padding: "14px 22px", fontFamily: DS.fontHead, fontSize: 14, fontWeight: 600 as const, cursor: "pointer" as const };
  const btnGhost = { background: "none", border: "none", cursor: "pointer" as const, fontFamily: DS.fontHead, fontSize: 13, fontWeight: 600 as const, color: DS.inkSoft };
  const btnSecondary = { background: DS.surfaceAlt, color: DS.ink, border: "none", borderRadius: 18, padding: "14px 22px", fontFamily: DS.fontHead, fontSize: 14, fontWeight: 600 as const, cursor: "pointer" as const };

  useEffect(() => {
    setProgress(loadKanaProgress(userKey));
    setProgressReady(true);
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
        return { key: scopeKey, script, set, count: items.length };
      }),
    [selectedScopeKeys],
  );
  const selectedKanaCount = selectedScopeDetails.reduce((sum, entry) => sum + entry.count, 0);
  const selectedScriptSummary = Array.from(
    new Set(selectedScopeDetails.map((entry) => (entry.script === "hiragana" ? "Hiragana" : "Katakana"))),
  ).join(" · ");
  const selectedSetSummary = selectedScopeDetails
    .map((entry) => `${entry.script === "hiragana" ? "H" : "K"} ${KANA_SCOPE_LABELS[entry.set]}`)
    .join(", ");

  const learnProgressContext = useMemo(() => {
    const kanaToItem = new Map(basicHiragana.map((item) => [item.kana, item]));
    const batchIdx = getCurrentLearnBatch(basicHiragana, progress);

    const learnedCount = basicHiragana.filter((item) => {
      const entry = progress[item.id];
      return entry && entry.level >= 1 && !entry.difficult;
    }).length;

    const currentBatchItems = HIRAGANA_BASIC_GROUPS[batchIdx]
      .map((k) => kanaToItem.get(k))
      .filter((item): item is KanaItem => Boolean(item));

    const unstableInBatch = currentBatchItems.filter((item) => {
      const entry = progress[item.id];
      return !entry || entry.level < 1 || entry.difficult;
    });

    const unlockedItems = HIRAGANA_BASIC_GROUPS.slice(0, batchIdx + 1)
      .flat()
      .map((k) => kanaToItem.get(k))
      .filter((item): item is KanaItem => Boolean(item));

    const currentBatchIds = new Set(currentBatchItems.map((item) => item.id));
    const reviewCount = unlockedItems.filter((item) => {
      if (currentBatchIds.has(item.id)) return false;
      const entry = progress[item.id];
      if (!entry) return false;
      return isDueReview(entry.nextReview) || entry.difficult;
    }).length;

    const nextBatchIdx = batchIdx + 1;
    const nextBatchKana =
      nextBatchIdx < HIRAGANA_BASIC_GROUPS.length ? HIRAGANA_BASIC_GROUPS[nextBatchIdx].join(" ") : null;

    return {
      learnedCount,
      totalCount: basicHiragana.length,
      batchIdx,
      freshCount: unstableInBatch.length,
      reviewCount,
      currentBatchKana: HIRAGANA_BASIC_GROUPS[batchIdx].join(" "),
      nextBatchKana,
    };
  }, [basicHiragana, progress]);

  const learnPreviewKana = useMemo(() => {
    const kanaToItem = new Map(basicHiragana.map((item) => [item.kana, item]));
    const group = HIRAGANA_BASIC_GROUPS[learnProgressContext.batchIdx] ?? [];
    return group.slice(0, 3).map((k) => kanaToItem.get(k)).filter((item): item is KanaItem => Boolean(item));
  }, [basicHiragana, learnProgressContext.batchIdx]);

  const kanaGridData = useMemo(() => {
    const kanaToItem = new Map(basicHiragana.map((item) => [item.kana, item]));
    return KANA_CHART_ROWS.map((row) => ({
      label: row.label,
      cells: row.chars.map((kanaChar) => {
        if (!kanaChar) return null;
        const item = kanaToItem.get(kanaChar);
        if (!item) return null;
        const entry = progress[item.id];
        const level = entry?.level ?? 0;
        const seen = Boolean(entry);
        // 0=locked, 1=new/seen, 2=learning, 3=reviewing, 4=mastered
        const masteryLevel = !seen ? 0 : level === 0 ? 1 : level === 1 ? 2 : level <= 3 ? 3 : 4;
        return { kana: kanaChar, id: item.id, masteryLevel };
      }),
    }));
  }, [basicHiragana, progress]);

  const learnEndSummary = useMemo(() => {
    const kanaToItem = new Map(basicHiragana.map((item) => [item.kana, item]));
    const startBatchIds = new Set(
      (HIRAGANA_BASIC_GROUPS[sessionStartBatchIdx] || [])
        .map((k) => kanaToItem.get(k))
        .filter((item): item is KanaItem => Boolean(item))
        .map((item) => item.id),
    );
    const masteredMap = new Map<string, KanaItem>();
    sessionResults.forEach((r) => {
      if (startBatchIds.has(r.item.id) && r.rating === "correct") masteredMap.set(r.item.id, r.item);
    });
    const masteredInSession = Array.from(masteredMap.values());
    const reviewedCount = new Set(
      sessionResults.filter((r) => !sessionNewItemIds.has(r.item.id)).map((r) => r.item.id),
    ).size;
    const newPracticed = new Set(
      sessionResults.filter((r) => sessionNewItemIds.has(r.item.id)).map((r) => r.item.id),
    ).size;
    return { masteredInSession, reviewedCount, newPracticed };
  }, [sessionResults, sessionNewItemIds, sessionStartBatchIdx, basicHiragana]);

  const subtlePillStyle: CSSProperties = {
    borderRadius: 999,
    padding: "7px 10px",
    border: `1px solid ${DS.line}`,
    background: DS.surfaceAlt,
    color: DS.ink,
    fontFamily: DS.fontHead,
    fontSize: 12,
    fontWeight: 600,
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
      {
        item,
        rating,
        mode: currentQuestion?.mode || practiceModes[0] || "multiple_choice",
        recognitionScore: extra?.recognitionScore,
      },
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
    setHandwritingRating(null);
    setSessionIndex((value) => value + 1);
  };

  useEffect(() => {
    setMultipleChoiceAnswer(null);
    setRomajiValue("");
    setRomajiFeedback(null);
    setAnswerFeedback(null);
    setHandwritingRating(null);
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
      setHandwritingRating(null);
      setSessionNewItemIds(new Set());
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
    setHandwritingRating(null);
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
          count: overrideItems.length,
          questions: buildQuestionsForItems(uniqueKanaItems(overrideItems), practicePool, practiceModes),
        }
      : buildSession(selectedScopeKeys, practiceModes, questionCount, progress);

    openSession(nextSession, `${selectedScriptSummary || "Kana"} · ${selectedSetSummary || "Basic"}`);
  };

  const startLearnSession = () => {
    const batchIdx = getCurrentLearnBatch(basicHiragana, progress);
    setSessionStartBatchIdx(batchIdx);
    const s = buildLearnSession(basicHiragana, progress);
    const newIds = new Set(s.questions.map((q) => q.item.id).filter((id) => !progress[id]));
    setSessionNewItemIds(newIds);
    openSession(s, "Learn");
  };

  useEffect(() => {
    if (!progressReady || initialMode !== "learn" || autoStartedLearnRef.current || session) return;
    autoStartedLearnRef.current = true;
    startLearnSession();
  }, [initialMode, progressReady, session]);

  const TAB_BAR_ITEMS = [
    { k: "home" as const, label: "Home", icon: (c: string) => (<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 10l8-7 8 7v8a1.5 1.5 0 01-1.5 1.5H13v-6h-4v6H4.5A1.5 1.5 0 013 18v-8z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/></svg>) },
    { k: "learn" as const, label: "Learn", icon: (c: string) => (<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 5.5a2 2 0 012-2h5v15H5a2 2 0 01-2-2v-11zM12 3.5h5a2 2 0 012 2v11a2 2 0 01-2 2h-5v-15z" stroke={c} strokeWidth="1.5"/></svg>) },
    { k: "review" as const, label: "Review", icon: (c: string) => (<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M18 11a7 7 0 11-2.05-4.95M18 3v4h-4" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>) },
    { k: "practice" as const, label: "Practice", icon: (c: string) => (<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M6 3v16M10 5v12M14 7v8M18 9v4" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>) },
    { k: "vault" as const, label: "Vault", icon: (c: string) => (<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="5" width="16" height="13" rx="2" stroke={c} strokeWidth="1.5"/><path d="M3 8h16M8 5V3.5h6V5" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>) },
  ] as const;

  const renderTabBar = () => (
    <div style={{ position: "sticky", bottom: 0, height: 84, background: `linear-gradient(to top, ${DS.bg} 60%, transparent)`, display: "flex", alignItems: "center", justifyContent: "space-around", zIndex: 10, padding: "0 8px 24px" }}>
      {TAB_BAR_ITEMS.map((tab) => {
        const isActive = tab.k === "learn";
        return (
          <button
            key={tab.k}
            type="button"
            onClick={() => onTabChange?.(tab.k)}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", flex: 1, padding: "4px 0", position: "relative" }}
          >
            {tab.icon(isActive ? DS.accent : DS.inkFaint)}
            <div style={{ fontFamily: DS.fontHead, fontSize: 9.5, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: isActive ? DS.ink : DS.inkFaint }}>
              {tab.label}
            </div>
            {isActive && <div style={{ position: "absolute", bottom: -8, width: 4, height: 4, borderRadius: 2, background: DS.accent }} />}
          </button>
        );
      })}
    </div>
  );

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
      .slice(0, 4)
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
  const isLearnSession = session?.setKey === "learn";

  const handleMultipleChoiceAnswer = (option: string) => {
    if (answerFeedback) return;
    const correct = option === currentQuestion!.item.romaji;
    setMultipleChoiceAnswer(option);
    setAnswerFeedback({ status: correct ? "correct" : "wrong", answer: currentQuestion!.item.romaji });
    recordResult(currentQuestion!.item, correct ? "correct" : "wrong");
    if (correct) {
      setStreak((value) => {
        const next = value + 1;
        setStreakPulse(next);
        return next;
      });
      advanceTimerRef.current = window.setTimeout(moveToNext, 700);
    } else {
      setStreak(0);
    }
  };

  const handleRomajiSubmit = () => {
    if (romajiFeedback || !currentQuestion) return;
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
      advanceTimerRef.current = window.setTimeout(moveToNext, 700);
    } else {
      setStreak(0);
    }
  };

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} onNavigate={(tab) => onTabChange?.(tab)} />
      {/* ── HOME — Kana System design ── */}
      {screen === "home" && (
        <div>

          {/* TopBar: menu · 禅 · avatar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 20px 16px" }}>
            <button type="button" onClick={() => setMenuOpen(true)} style={{ width: 38, height: 38, borderRadius: 12, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}>
              <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                <path d="M1 1h16M1 6h16M1 11h10" stroke={DS.ink} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <div style={{ fontFamily: DS.fontKana, fontSize: 20, fontWeight: 500, color: DS.ink, letterSpacing: 1 }}>禅</div>
            <button type="button" style={{ width: 38, height: 38, borderRadius: 19, background: DS.surfaceAlt, border: `1px solid ${DS.line}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DS.fontHead, fontSize: 11, fontWeight: 600, color: DS.inkSoft, padding: 0, flexShrink: 0 }}>
              MK
            </button>
          </div>

          {/* Scrollable body */}
          <div style={{ paddingBottom: 110 }}>

            {/* Screen title: "Learn" + "hiragana." + progress */}
            <div style={{ padding: "0 24px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: DS.fontHead, fontSize: 32, fontWeight: 700, color: DS.ink, letterSpacing: -0.8, lineHeight: 1.05 }}>Aprender</div>
                </div>
                <div style={{ textAlign: "right", paddingTop: 4 }}>
                  <div style={{ fontFamily: DS.fontHead, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: DS.inkSoft }}>
                    Progreso
                  </div>
                  <div style={{ fontFamily: DS.fontHead, fontSize: 20, fontWeight: 600, color: DS.ink, marginTop: 4, letterSpacing: -0.3 }}>
                    {learnProgressContext.learnedCount}
                    <span style={{ color: DS.inkFaint, fontWeight: 400 }}> / {learnProgressContext.totalCount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress line */}
            <div style={{ padding: "0 24px" }}>
              <div style={{ height: 3, borderRadius: 3, background: DS.surfaceAlt, overflow: "hidden" }}>
                <div style={{ width: `${(learnProgressContext.learnedCount / learnProgressContext.totalCount) * 100}%`, height: "100%", background: DS.accent, transition: "width 0.4s ease" }} />
              </div>
            </div>

            {/* Next kana tiles */}
            {learnPreviewKana.length > 0 && (
              <div style={{ padding: "28px 24px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                  <div style={{ fontFamily: DS.fontHead, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: DS.accent }}>
                    {learnProgressContext.freshCount > 0 ? "Practicando" : "Siguiente"}
                    {" · "}
                    {(["A", "K", "S", "T", "N", "H", "M", "Y", "R", "W"])[learnProgressContext.batchIdx] ?? ""}
                    {"-row"}
                  </div>
                  <div style={{ fontFamily: DS.fontBody, fontSize: 11, color: DS.inkSoft, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    {learnPreviewKana.length} de {(HIRAGANA_BASIC_GROUPS[learnProgressContext.batchIdx] ?? []).length}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {learnPreviewKana.map((item, idx) => {
                    const entry = progress[item.id];
                    const level = entry?.level ?? 0;
                    const masteryLevel = !entry ? 0 : level === 0 ? 1 : level === 1 ? 2 : level <= 3 ? 3 : 4;
                    const isActive = idx === 0;
                    return (
                      <div
                        key={item.id}
                        style={{
                          aspectRatio: "1 / 1.08",
                          background: isActive ? DS.card : DS.surfaceAlt,
                          border: isActive ? `1px solid ${DS.lineStrong}` : "1px solid transparent",
                          borderRadius: 20,
                          display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center",
                          position: "relative",
                          boxShadow: isActive ? "0 4px 24px rgba(28,27,23,0.05)" : "none",
                        }}
                      >
                        {/* Level pips */}
                        <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 3 }}>
                          {[0, 1, 2, 3].map((n) => (
                            <div key={n} style={{ width: 4, height: 4, borderRadius: 2, background: n < masteryLevel ? DS.accent : DS.lineStrong }} />
                          ))}
                        </div>
                        <div style={{ fontFamily: DS.fontKana, fontSize: 58, color: DS.ink, lineHeight: 1 }}>{item.kana}</div>
                        <div style={{ fontFamily: DS.fontBody, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: DS.inkSoft, marginTop: 8 }}>{item.romaji}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Session card: Today's queue + PlayButton */}
            <div style={{ padding: "24px 24px 0" }}>
              <div style={{ background: DS.card, borderRadius: 24, padding: "20px 22px", display: "flex", alignItems: "center", gap: 18, border: `1px solid ${DS.line}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: DS.fontHead, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: DS.inkSoft }}>
                    Sesión de hoy
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 8 }}>
                    {learnProgressContext.reviewCount > 0 && (
                      <div>
                        <span style={{ fontFamily: DS.fontHead, fontSize: 28, fontWeight: 700, color: DS.ink, letterSpacing: -0.5 }}>{learnProgressContext.reviewCount}</span>
                        <span style={{ fontFamily: DS.fontBody, fontSize: 12, color: DS.inkSoft, marginLeft: 6 }}>pendientes</span>
                      </div>
                    )}
                    {learnProgressContext.reviewCount > 0 && learnProgressContext.freshCount > 0 && (
                      <div style={{ width: 1, height: 18, background: DS.lineStrong }} />
                    )}
                    {learnProgressContext.freshCount > 0 && (
                      <div>
                        <span style={{ fontFamily: DS.fontHead, fontSize: 28, fontWeight: 700, color: DS.ink, letterSpacing: -0.5 }}>{learnProgressContext.freshCount}</span>
                        <span style={{ fontFamily: DS.fontBody, fontSize: 12, color: DS.inkSoft, marginLeft: 6 }}>nuevas</span>
                      </div>
                    )}
                    {learnProgressContext.reviewCount === 0 && learnProgressContext.freshCount === 0 && (
                      <span style={{ fontFamily: DS.fontBody, fontSize: 13, color: DS.inkSoft }}>Repaso guiado</span>
                    )}
                  </div>
                </div>
                {/* Primary CTA — play button */}
                <button
                  type="button"
                  onClick={startLearnSession}
                  style={{ background: DS.ink, color: DS.card, border: "none", borderRadius: 999, width: 68, height: 68, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 6px 20px rgba(28,27,23,0.18)", padding: 0 }}
                >
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-label="Start session">
                    <path d="M7 4l11 7-11 7V4z" fill="currentColor" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Mastery chart */}
            <div style={{ padding: "28px 24px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: DS.fontHead, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: DS.inkSoft }}>
                    Hiragana
                  </div>
                  <div style={{ fontFamily: DS.fontHead, fontSize: 15, fontWeight: 600, color: DS.ink, marginTop: 2 }}>
                    <span style={{ color: DS.accent }}>{learnProgressContext.learnedCount}</span>
                    <span style={{ color: DS.inkFaint }}> / {learnProgressContext.totalCount} </span>
                    <span style={{ color: DS.inkSoft, fontSize: 12, fontWeight: 500 }}>dominadas</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", fontFamily: DS.fontBody, fontSize: 10, color: DS.inkSoft }}>
                  {([{ c: DS.accent, l: "estables" }, { c: DS.accentSoft, l: "aprendiendo" }, { c: DS.surfaceAlt, l: "nuevas" }] as const).map(({ c, l }) => (
                    <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {kanaGridData.map((row, rowIdx) => (
                  <div key={rowIdx} style={{ display: "grid", gridTemplateColumns: "16px repeat(5, 1fr)", gap: 6, alignItems: "center" }}>
                    <div style={{ fontFamily: DS.fontBody, fontSize: 10, color: DS.inkFaint, letterSpacing: 1, textTransform: "uppercase" }}>{row.label}</div>
                    {row.cells.map((cell, ci) => {
                      if (!cell) return <div key={ci} style={{ width: 28, height: 28 }} />;
                      const { kana: kanaChar, masteryLevel } = cell;
                      const fills = [
                        { bg: "transparent", fg: DS.inkFaint, op: 0.35, border: `1px dashed ${DS.lineStrong}` },
                        { bg: DS.surfaceAlt, fg: DS.ink, op: 1, border: "none" },
                        { bg: DS.accentSoft, fg: DS.ink, op: 1, border: "none" },
                        { bg: DS.accentSoft, fg: DS.accent, op: 1, border: "none" },
                        { bg: DS.accent, fg: DS.accentInk, op: 1, border: "none" },
                      ] as const;
                      const f = fills[masteryLevel];
                      return (
                        <div key={ci} style={{ width: 28, height: 28, borderRadius: 10, background: f.bg, border: f.border, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DS.fontKana, fontSize: 14, fontWeight: 500, color: f.fg, opacity: f.op }}>
                          {kanaChar}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Tab bar — 5-tab global nav */}
          {renderTabBar()}

        </div>
      )}

      {/* ── KANA TABLE ── */}
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
                  <div
                    style={{
                      fontSize: "var(--text-label)",
                      color: "var(--color-text-muted)",
                      fontWeight: 800,
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {section.label}
                  </div>
                )}
                <div style={{ display: "grid", gap: 8 }}>
                  {section.rows.map((row, rowIndex) => (
                    <div
                      key={`${section.key}-${rowIndex}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${section.columns}, minmax(0, 1fr))`,
                        gap: 8,
                      }}
                    >
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
                            <div
                              style={{
                                fontSize: section.columns === 5 ? 28 : 26,
                                lineHeight: 1,
                                fontWeight: 800,
                                color: "var(--color-text)",
                              }}
                            >
                              {item.kana}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 700 }}>
                              {item.romaji}
                            </div>
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

      {/* ── CUSTOM PRACTICE SETUP ── */}
      {screen === "setup" && (
        <div
          style={{
            display: "grid",
            gap: "var(--space-3)",
            minHeight: "min(100dvh - 160px, 680px)",
            alignContent: "space-between",
          }}
        >
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: "var(--text-h3)", fontWeight: 800, color: "var(--color-text)" }}>
                Custom Practice
              </div>
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 800 }}>
                  Kana seleccionados
                </div>
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.35 }}>
                  {selectedSetSummary || "Toca para elegir"}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-accent-strong)", fontWeight: 800 }}>Editar</div>
              </div>
            </button>

            <StudySelectorGroup
              options={KANA_QUESTION_COUNT_OPTIONS.map((value) => ({
                key: String(value) as "10" | "20" | "30",
                label: String(value),
              }))}
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 700 }}>
                {practiceModes.length > 0
                  ? `${practiceModes.length} modo${practiceModes.length > 1 ? "s" : ""}`
                  : "Sin modo"}
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
              Empezar
            </button>
          </div>
        </div>
      )}

      {/* ── KANA SCOPE MODAL ── */}
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
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
              <div
                style={{
                  textAlign: "center",
                  fontSize: "var(--text-body-sm)",
                  fontWeight: 800,
                  color: "var(--color-text)",
                }}
              >
                Hiragana
              </div>
              <div
                style={{
                  textAlign: "center",
                  fontSize: "var(--text-body-sm)",
                  fontWeight: 800,
                  color: "var(--color-text)",
                }}
              >
                Katakana
              </div>

              {KANA_SCOPE_ROWS.map((row) => (
                <div key={row.set} style={{ display: "contents" }}>
                  <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 700 }}>
                    {row.label}
                  </div>
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
                          cursor: "pointer",
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

      {/* ── PRACTICE SHELL ── */}
      <PracticeShell
        open={Boolean(session)}
        visible={sheetVisible}
        title={isLearnSession ? "Aprender" : "Práctica"}
        subtitle={
          sessionFinished
            ? "Resultado"
            : `${Math.min(sessionIndex + 1, session?.questions.length || 0)} / ${session?.questions.length || 0}`
        }
        current={sessionFinished ? undefined : Math.min(sessionIndex + 1, session?.questions.length || 0)}
        total={sessionFinished ? undefined : session?.questions.length || 0}
        streak={sessionFinished ? 0 : streak}
        streakPulseKey={streakPulse}
        onClose={closeSession}
      >
        {/* Active question */}
        {!sessionFinished && currentQuestion ? (
          <div
            key={`${currentQuestion.item.id}-${sessionIndex}`}
            style={{ display: "grid", gap: 20, animation: "kanaPracticeStepIn 200ms cubic-bezier(.22,1,.36,1)" }}
          >
            <PracticeStageCard
              label={activeQuestionLabel}
              compact={currentQuestion.mode === "handwriting"}
              feedback={
                currentQuestion.mode === "handwriting"
                  ? handwritingRating === "correct"
                    ? "correct"
                    : handwritingRating === "wrong"
                      ? "wrong"
                      : null
                  : answerFeedback?.status || null
              }
              value={
                <div
                  style={{
                    fontSize:
                      currentQuestion.mode === "handwriting"
                        ? "clamp(28px, 8vw, 42px)"
                        : "clamp(96px, 32vw, 154px)",
                    lineHeight: 1,
                    letterSpacing: currentQuestion.mode === "handwriting" ? "-0.03em" : 0,
                    fontWeight: currentQuestion.mode === "handwriting" ? 600 : 400,
                    color: DS.ink,
                    fontFamily: currentQuestion.mode === "handwriting" ? DS.fontHead : DS.fontKana,
                  }}
                >
                  {currentQuestion.mode === "handwriting" ? currentQuestion.item.romaji : currentQuestion.item.kana}
                </div>
              }
            />

            {/* Multiple choice */}
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
                        onClick={() => handleMultipleChoiceAnswer(option)}
                        style={{
                          minHeight: 110,
                          borderRadius: 24,
                          border: showAnswer && isCorrect
                            ? `1px solid ${DS.correct}`
                            : showAnswer && isChosen && !isCorrect
                              ? `1px solid ${DS.wrong}`
                              : `1px solid ${DS.line}`,
                          background:
                            showAnswer && isCorrect
                              ? DS.correctSoft
                              : showAnswer && isChosen && !isCorrect
                                ? DS.wrongSoft
                                : DS.surfaceAlt,
                          color:
                            showAnswer && isCorrect
                              ? DS.correct
                              : showAnswer && isChosen && !isCorrect
                                ? DS.wrong
                                : DS.ink,
                          fontFamily: DS.fontHead,
                          fontSize: 24,
                          fontWeight: 600,
                          letterSpacing: "0.04em",
                          cursor: showAnswer ? "default" : "pointer",
                          transition: "background 110ms ease, border-color 110ms ease, color 90ms ease",
                        }}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                {answerFeedback && (
                  <div style={{ display: "grid", gap: 10 }}>
                    {answerFeedback.status === "correct" ? (
                      <div
                        style={{
                          textAlign: "center",
                          fontFamily: DS.fontHead,
                          fontSize: 13,
                          color: DS.correct,
                          fontWeight: 600,
                          letterSpacing: "0.06em",
                        }}
                      >
                        Correcto
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", display: "grid", gap: 2 }}>
                        <div style={{
                          fontFamily: DS.fontHead, fontSize: 10, fontWeight: 600,
                          color: DS.inkFaint, textTransform: "uppercase", letterSpacing: "0.18em",
                        }}>
                          Era
                        </div>
                        <div style={{
                          fontFamily: DS.fontHead, fontSize: 22, fontWeight: 600,
                          color: DS.ink, letterSpacing: "0.06em",
                        }}>
                          {currentQuestion.item.romaji}
                        </div>
                      </div>
                    )}
                    {answerFeedback.status === "wrong" && (
                      <button type="button" onClick={moveToNext} style={{ ...btnPrimary, width: "100%" }}>
                        {sessionIndex >= sessionQuestionCount - 1 ? "Ver resumen" : "Siguiente"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Romaji input */}
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
                    if (event.key === "Enter" && !romajiFeedback) handleRomajiSubmit();
                  }}
                  style={{
                    width: "100%",
                    maxWidth: 340,
                    textAlign: "center",
                    fontFamily: DS.fontHead,
                    fontSize: 28,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    minHeight: 64,
                    borderRadius: 20,
                    border: `1px solid ${DS.line}`,
                    background: DS.surfaceAlt,
                    color: DS.ink,
                    outline: "none",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={handleRomajiSubmit}
                    disabled={Boolean(romajiFeedback) || normalizeRomaji(romajiValue).length === 0}
                    style={btnPrimary}
                  >
                    Comprobar
                  </button>
                  {romajiFeedback && (
                    <button type="button" onClick={moveToNext} style={btnSecondary}>
                      {sessionIndex >= sessionQuestionCount - 1 ? "Ver resumen" : "Siguiente"}
                    </button>
                  )}
                </div>
                {romajiFeedback && (
                  <div
                    style={{
                      fontFamily: DS.fontHead,
                      fontSize: 13,
                      color: romajiFeedback.correct ? DS.correct : DS.inkSoft,
                      fontWeight: 600,
                      textAlign: "center",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {romajiFeedback.correct ? "Correcto" : `Era: ${romajiFeedback.answer}`}
                  </div>
                )}
              </div>
            )}

            {/* Handwriting */}
            {currentQuestion.mode === "handwriting" && (
              <div style={{ display: "grid", gap: 10 }}>
                <KanaHandwritingPad
                  key={`${currentQuestion.item.id}-${sessionIndex}`}
                  targetKana={currentQuestion.item.kana}
                  onRated={(rating: KanaHandwritingRating, score) => {
                    setHandwritingRating(rating);
                    recordResult(currentQuestion.item, rating, { recognitionScore: score });
                    if (rating === "correct") {
                      setAnswerFeedback({ status: "correct", answer: currentQuestion.item.kana });
                      setStreak((value) => {
                        const next = value + 1;
                        setStreakPulse(next);
                        return next;
                      });
                      advanceTimerRef.current = window.setTimeout(moveToNext, 700);
                    } else {
                      setAnswerFeedback({ status: "wrong", answer: currentQuestion.item.kana });
                      setStreak(0);
                    }
                  }}
                />
                {handwritingRating && handwritingRating !== "correct" ? (
                  <button type="button" onClick={moveToNext} style={{ ...btnPrimary, width: "100%" }}>
                    {sessionIndex >= sessionQuestionCount - 1 ? "Ver resumen" : "Siguiente"}
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {/* Summary — Learn */}
        {sessionFinished && isLearnSession ? (
          <div style={{ display: "grid", gap: 24 }}>
            <div
              style={{
                display: "grid",
                gap: 20,
                padding: "24px 0 20px",
              }}
            >
              {/* Header */}
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontFamily: DS.fontHead, fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.22em", color: DS.inkSoft }}>
                  Hiragana básico · en progreso
                </div>
                <div style={{ fontFamily: DS.fontHead, fontSize: "clamp(24px, 6vw, 30px)", fontWeight: 700, color: DS.ink, lineHeight: 1.05, letterSpacing: -0.5 }}>
                  Buen progreso
                </div>
              </div>

              {/* Session stats */}
              {(learnEndSummary.reviewedCount > 0 || learnEndSummary.newPracticed > 0) && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {learnEndSummary.reviewedCount > 0 && (
                    <div style={subtlePillStyle}>
                      {learnEndSummary.reviewedCount} repasado{learnEndSummary.reviewedCount > 1 ? "s" : ""}
                    </div>
                  )}
                  {learnEndSummary.newPracticed > 0 && (
                    <div style={{ ...subtlePillStyle, color: DS.correct, background: DS.correctSoft, border: `1px solid ${DS.correct}` }}>
                      +{learnEndSummary.newPracticed} nuevo{learnEndSummary.newPracticed > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              )}

              {/* Practiced kana — visual cards */}
              {learnEndSummary.masteredInSession.length > 0 && (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ fontFamily: DS.fontHead, fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.22em", color: DS.inkSoft }}>
                    Practicados
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {learnEndSummary.masteredInSession.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: "grid",
                          justifyItems: "center",
                          gap: 4,
                          padding: "10px 14px",
                          borderRadius: 14,
                          background: DS.surfaceAlt,
                        }}
                      >
                        <div style={{ fontFamily: DS.fontKana, fontSize: 26, fontWeight: 400, lineHeight: 1, color: DS.ink }}>{item.kana}</div>
                        <div style={{ fontFamily: DS.fontBody, fontSize: 10, fontWeight: 600, color: DS.inkSoft, letterSpacing: "0.14em", textTransform: "uppercase" }}>{item.romaji}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Batch unlocked */}
              {learnProgressContext.batchIdx > sessionStartBatchIdx && (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ fontFamily: DS.fontHead, fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.22em", color: DS.correct }}>
                    Grupo desbloqueado
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {HIRAGANA_BASIC_GROUPS[learnProgressContext.batchIdx].map((k) => (
                      <div
                        key={k}
                        style={{
                          fontFamily: DS.fontKana,
                          fontSize: 28,
                          fontWeight: 400,
                          color: DS.ink,
                          padding: "8px 12px",
                          borderRadius: 12,
                          background: DS.surfaceAlt,
                        }}
                      >
                        {k}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next group preview — only when no unlock this session */}
              {learnProgressContext.nextBatchKana && learnProgressContext.batchIdx === sessionStartBatchIdx && (
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontFamily: DS.fontHead, fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.22em", color: DS.inkSoft }}>
                    Próximo grupo
                  </div>
                  <div style={{ fontFamily: DS.fontKana, fontSize: 20, fontWeight: 400, color: DS.inkSoft, letterSpacing: 2 }}>
                    {learnProgressContext.nextBatchKana}
                  </div>
                </div>
              )}

              {/* Total progress */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: 14,
                  borderTop: `1px solid ${DS.line}`,
                }}
              >
                <div style={{ fontFamily: DS.fontHead, fontSize: 12, color: DS.inkSoft, fontWeight: 600 }}>
                  Progreso total
                </div>
                <div style={{ fontFamily: DS.fontHead, fontWeight: 600, color: DS.ink, fontSize: 12 }}>
                  {learnProgressContext.learnedCount} / {learnProgressContext.totalCount} kana
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <button type="button" onClick={startLearnSession} style={{ ...btnPrimary, width: "100%", minHeight: 54 }}>
                Continuar
              </button>
              <button
                type="button"
                onClick={() => { closeSession(); setScreen("home"); }}
                style={btnGhost}
              >
                Salir
              </button>
            </div>
          </div>
        ) : null}

        {/* Summary — Custom Practice */}
        {sessionFinished && !isLearnSession ? (
          <div style={{ display: "grid", gap: 24 }}>
            <div
              style={{
                display: "grid",
                gap: 16,
                padding: "24px 0 20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
                <div
                  style={{
                    fontFamily: DS.fontHead,
                    fontSize: "clamp(42px, 12vw, 62px)",
                    lineHeight: 0.9,
                    letterSpacing: "-.04em",
                    fontWeight: 700,
                    color: DS.ink,
                  }}
                >
                  {summary.correct} / {session?.questions.length || 0}
                </div>
                <div style={{ fontFamily: DS.fontHead, fontSize: 17, fontWeight: 600, color: DS.inkSoft, paddingBottom: 6 }}>
                  {Math.round((summary.correct / Math.max(1, session?.questions.length || 1)) * 100)}%
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                <div style={{ ...subtlePillStyle, textAlign: "center", color: summary.correct > 0 ? DS.correct : DS.inkSoft }}>
                  ✓ {summary.correct}
                </div>
                <div style={{ ...subtlePillStyle, textAlign: "center" }}>～ {summary.almost}</div>
                <div style={{ ...subtlePillStyle, textAlign: "center", color: summary.wrong > 0 ? DS.wrong : DS.inkSoft }}>
                  ✕ {summary.wrong}
                </div>
              </div>

              {hardestSessionKana.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    paddingTop: 12,
                    borderTop: `1px solid ${DS.line}`,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: DS.fontHead,
                      fontSize: 10.5,
                      color: DS.inkSoft,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.22em",
                      flexShrink: 0,
                    }}
                  >
                    Complicados
                  </div>
                  {hardestSessionKana.map((item) => (
                    <div key={item.id} style={subtlePillStyle}>
                      {item.kana} · {item.romaji}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {repeatCandidates.length > 0 ? (
                <button
                  type="button"
                  onClick={() => startSession(repeatCandidates.slice(0, Math.min(repeatCandidates.length, 20)))}
                  style={btnPrimary}
                >
                  Practicar falladas ({repeatCandidates.length})
                </button>
              ) : (
                <button type="button" onClick={() => startSession()} style={btnPrimary}>
                  Otra sesión
                </button>
              )}
              <button
                type="button"
                onClick={() => { closeSession(); setScreen("home"); }}
                style={btnGhost}
              >
                Volver
              </button>
            </div>
          </div>
        ) : null}
      </PracticeShell>

      <style jsx>{`
        @keyframes kanaPracticeStepIn {
          from {
            opacity: 0;
            transform: translateY(6px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
