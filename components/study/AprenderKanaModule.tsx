"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import KanaHandwritingPad, { type KanaHandwritingRating } from "@/components/study/KanaHandwritingPad";
import KanaReadingSession, { type KanaSessionFeedback, type KanaSessionSummaryData } from "@/components/study/KanaReadingSession";
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
type LearnScript = "hiragana" | "katakana" | "ambos";
type HomeMode = "inteligente" | "personalizado";
type InteligenteAction = "seguir" | "pendientes" | "debiles" | "nuevos";

const KANA_SCOPE_ROWS: Array<{ set: KanaSelectableSet; label: string }> = [
  { set: "basic", label: "Básico" },
  { set: "dakuten", label: "Dakuten" },
  { set: "handakuten", label: "Handakuten" },
  { set: "yoon", label: "Yōon" },
];

const KANA_SCOPE_LABELS: Record<KanaSelectableSet, string> = {
  basic: "Básico",
  dakuten: "Dakuten",
  handakuten: "Handakuten",
  yoon: "Yōon",
};

// Ordered groups for progressive Learn mode introduction
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

const KATAKANA_BASIC_GROUPS: readonly (readonly string[])[] = [
  ["ア", "イ", "ウ", "エ", "オ"],
  ["カ", "キ", "ク", "ケ", "コ"],
  ["サ", "シ", "ス", "セ", "ソ"],
  ["タ", "チ", "ツ", "テ", "ト"],
  ["ナ", "ニ", "ヌ", "ネ", "ノ"],
  ["ハ", "ヒ", "フ", "ヘ", "ホ"],
  ["マ", "ミ", "ム", "メ", "モ"],
  ["ヤ", "ユ", "ヨ"],
  ["ラ", "リ", "ル", "レ", "ロ"],
  ["ワ", "ヲ", "ン"],
];

const ROW_LABELS = ["A", "K", "S", "T", "N", "H", "M", "Y", "R", "W"] as const;

function getCurrentLearnBatchForScript(
  basicItems: KanaItem[],
  groups: readonly (readonly string[])[],
  progress: KanaProgressMap,
): number {
  const kanaToItem = new Map(basicItems.map((item) => [item.kana, item]));
  for (let i = 0; i < groups.length; i++) {
    const groupItems = groups[i]
      .map((k) => kanaToItem.get(k))
      .filter((item): item is KanaItem => Boolean(item));
    const allStable = groupItems.every((item) => {
      const entry = progress[item.id];
      return entry && entry.level >= 1 && !entry.difficult;
    });
    if (!allStable) return i;
  }
  return groups.length - 1;
}

function getCurrentLearnBatch(hiraganaBasic: KanaItem[], progress: KanaProgressMap): number {
  return getCurrentLearnBatchForScript(hiraganaBasic, HIRAGANA_BASIC_GROUPS, progress);
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
  const questions = buildQuestionsForItems(items, fallbackPool, ["romaji_input"]);
  return { setKey: "learn", modes: ["romaji_input"] as KanaPracticeMode[], count: sessionCount, questions };
}

// Generic guided session for any script
function buildLearnSessionForItems(
  basicItems: KanaItem[],
  groups: readonly (readonly string[])[],
  progress: KanaProgressMap,
): KanaSession {
  const kanaToItem = new Map(basicItems.map((item) => [item.kana, item]));
  const batchIdx = getCurrentLearnBatchForScript(basicItems, groups, progress);
  const unlockedItems = groups.slice(0, batchIdx + 1).flat().map((k) => kanaToItem.get(k)).filter((item): item is KanaItem => Boolean(item));
  const currentBatchItems = groups[batchIdx].map((k) => kanaToItem.get(k)).filter((item): item is KanaItem => Boolean(item));
  const unstableInBatch = currentBatchItems.filter((item) => { const e = progress[item.id]; return !e || e.level < 1 || e.difficult; });
  const currentBatchIds = new Set(currentBatchItems.map((item) => item.id));
  const reviewPool = unlockedItems.filter((item) => {
    if (currentBatchIds.has(item.id)) return false;
    const e = progress[item.id];
    return e && (isDueReview(e.nextReview) || e.difficult);
  });
  let pool: KanaItem[];
  if (unstableInBatch.length > 0) {
    pool = uniqueKanaItems([...unstableInBatch, ...reviewPool.slice(0, unstableInBatch.length >= 3 ? 3 : 5)]);
  } else if (reviewPool.length > 0) {
    pool = reviewPool;
  } else {
    pool = unlockedItems.length > 0 ? unlockedItems : currentBatchItems;
  }
  const sessionCount = Math.min(12, Math.max(5, pool.length));
  const ranked = buildKanaSessionItems(pool, progress, sessionCount);
  const items = shuffle(ranked);
  const fallbackPool = uniqueKanaItems([...basicItems, ...unlockedItems]);
  const questions = buildQuestionsForItems(items, fallbackPool, ["romaji_input"]);
  return { setKey: "learn", modes: ["romaji_input"] as KanaPracticeMode[], count: sessionCount, questions };
}

function buildInteligenteSession(
  action: InteligenteAction,
  learnScript: LearnScript,
  hiraganaBasic: KanaItem[],
  katakanaBasic: KanaItem[],
  progress: KanaProgressMap,
): KanaSession | null {
  const scopeItems = learnScript === "hiragana" ? hiraganaBasic
    : learnScript === "katakana" ? katakanaBasic
    : uniqueKanaItems([...hiraganaBasic, ...katakanaBasic]);

  const mc: KanaPracticeMode[] = ["multiple_choice"];
  const makeSession = (items: KanaItem[]): KanaSession => ({
    setKey: "inteligente",
    modes: mc,
    count: items.length,
    questions: buildQuestionsForItems(items, scopeItems, mc),
  });

  if (action === "seguir") {
    if (learnScript === "ambos") {
      const hItems = buildLearnSessionForItems(hiraganaBasic, HIRAGANA_BASIC_GROUPS, progress).questions.map(q => q.item);
      const kItems = buildLearnSessionForItems(katakanaBasic, KATAKANA_BASIC_GROUPS, progress).questions.map(q => q.item);
      const merged: KanaItem[] = [];
      let hi = 0, ki = 0;
      while (merged.length < 12 && (hi < hItems.length || ki < kItems.length)) {
        if (hi < hItems.length) merged.push(hItems[hi++]);
        if (ki < kItems.length && merged.length < 12) merged.push(kItems[ki++]);
      }
      if (merged.length === 0) return null;
      return makeSession(merged);
    }
    const s = learnScript === "katakana"
      ? buildLearnSessionForItems(katakanaBasic, KATAKANA_BASIC_GROUPS, progress)
      : buildLearnSessionForItems(hiraganaBasic, HIRAGANA_BASIC_GROUPS, progress);
    const items = s.questions.map(q => q.item);
    if (items.length === 0) return null;
    return makeSession(items);
  }

  if (action === "pendientes") {
    const items = scopeItems.filter((item) => { const e = progress[item.id]; return e && e.timesSeen > 0 && isDueReview(e.nextReview); });
    if (items.length === 0) return null;
    const selected = buildKanaSessionItems(items, progress, Math.min(12, items.length));
    return makeSession(selected);
  }

  if (action === "debiles") {
    const items = scopeItems.filter((item) => progress[item.id]?.difficult);
    if (items.length === 0) return null;
    return makeSession(shuffle(items).slice(0, 12));
  }

  if (action === "nuevos") {
    const items = scopeItems.filter((item) => !progress[item.id] || progress[item.id].timesSeen === 0);
    if (items.length === 0) return null;
    return makeSession(shuffle(items).slice(0, 12));
  }

  return null;
}

function getLearnStats(
  learnScript: LearnScript,
  hiraganaBasic: KanaItem[],
  katakanaBasic: KanaItem[],
  progress: KanaProgressMap,
) {
  const items = learnScript === "hiragana" ? hiraganaBasic
    : learnScript === "katakana" ? katakanaBasic
    : uniqueKanaItems([...hiraganaBasic, ...katakanaBasic]);
  return {
    total: items.length,
    aprendidos: items.filter((item) => { const e = progress[item.id]; return e && e.level >= 4; }).length,
    pendientes: items.filter((item) => { const e = progress[item.id]; return e && e.timesSeen > 0 && isDueReview(e.nextReview); }).length,
    debiles: items.filter((item) => !!progress[item.id]?.difficult).length,
    nuevos: items.filter((item) => !progress[item.id] || progress[item.id].timesSeen === 0).length,
  };
}

function getScriptLearnContext(
  basicItems: KanaItem[],
  groups: readonly (readonly string[])[],
  progress: KanaProgressMap,
) {
  const kanaToItem = new Map(basicItems.map((item) => [item.kana, item]));
  const batchIdx = getCurrentLearnBatchForScript(basicItems, groups, progress);
  const currentBatch = groups[batchIdx] ?? [];
  const unstable = currentBatch.map((k) => kanaToItem.get(k)).filter((item): item is KanaItem => Boolean(item)).filter((item) => { const e = progress[item.id]; return !e || e.level < 1 || e.difficult; });
  const nextBatch = groups[batchIdx + 1] ?? null;
  const learnedCount = basicItems.filter((item) => { const e = progress[item.id]; return e && e.level >= 1 && !e.difficult; }).length;
  return {
    batchIdx,
    totalCount: basicItems.length,
    learnedCount,
    currentBatchKana: currentBatch.slice(0, 5),
    freshCount: unstable.length,
    nextBatchKana: nextBatch ? nextBatch.slice(0, 5) : null,
  };
}

// ─── Kana System design tokens (light theme) ─────────────────────────────────
const DS = {
  bg: "#fbf8f1",
  surface: "#fdfaf3",
  surfaceAlt: "#f4efe3",
  card: "#ffffff",
  ink: "#1c1b17",
  inkSoft: "#66645c",
  inkFaint: "#bcb9af",
  line: "rgba(28,27,23,0.06)",
  lineStrong: "rgba(28,27,23,0.12)",
  accent: "#ac3e53",
  accentSoft: "rgba(172,62,83,0.10)",
  accentInk: "#ffffff",
  fontHead: "var(--font-study), 'Plus Jakarta Sans', 'Manrope', system-ui, sans-serif",
  fontBody: "'Inter', system-ui, sans-serif",
  fontKana: "var(--font-noto-serif-jp), 'Noto Serif JP', var(--font-noto-sans-jp), 'Noto Sans JP', serif",
} as const;

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

const KATAKANA_CHART_ROWS: Array<{ label: string; chars: Array<string | null> }> = [
  { label: "a", chars: ["ア", "イ", "ウ", "エ", "オ"] },
  { label: "k", chars: ["カ", "キ", "ク", "ケ", "コ"] },
  { label: "s", chars: ["サ", "シ", "ス", "セ", "ソ"] },
  { label: "t", chars: ["タ", "チ", "ツ", "テ", "ト"] },
  { label: "n", chars: ["ナ", "ニ", "ヌ", "ネ", "ノ"] },
  { label: "h", chars: ["ハ", "ヒ", "フ", "ヘ", "ホ"] },
  { label: "m", chars: ["マ", "ミ", "ム", "メ", "モ"] },
  { label: "y", chars: ["ヤ", null, "ユ", null, "ヨ"] },
  { label: "r", chars: ["ラ", "リ", "ル", "レ", "ロ"] },
  { label: "w", chars: ["ワ", null, null, null, "ヲ"] },
  { label: "n", chars: ["ン", null, null, null, null] },
];

export default function AprenderKanaModule({ userKey, onRecordActivity, initialMode = null, onTabChange }: AprenderKanaModuleProps) {
  const [screen, setScreen] = useState<"home" | "table">("home");
  const [tableScript, setTableScript] = useState<KanaScript>("hiragana");
  const [tableFilter, setTableFilter] = useState<"basic" | "dakuten" | "handakuten" | "yoon" | "mixed">("basic");
  const [learnScript, setLearnScript] = useState<LearnScript>("hiragana");
  const [homeMode, setHomeMode] = useState<HomeMode>("inteligente");
  const [selectedSets, setSelectedSets] = useState<KanaSelectableSet[]>(["basic"]);
  const [selectedScopeKeys, setSelectedScopeKeys] = useState<KanaScopeKey[]>(["hiragana:basic"]);
  const [practiceModes, setPracticeModes] = useState<KanaPracticeMode[]>(["multiple_choice"]);
  const [questionCount, setQuestionCount] = useState<KanaQuestionCount>(20);
  const [setupError, setSetupError] = useState<string | null>(null);
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
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const romajiInputRef = useRef<HTMLInputElement | null>(null);
  const advanceTimerRef = useRef<number | null>(null);
  const autoStartedLearnRef = useRef(false);

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
  const basicHiragana = useMemo(() => filterKanaItemsForSelection("hiragana", "basic"), []);
  const basicKatakana = useMemo(() => filterKanaItemsForSelection("katakana", "basic"), []);

  // Derive selectedScopeKeys from learnScript + selectedSets for Personalizado
  const personalizedScopeKeys = useMemo<KanaScopeKey[]>(() => {
    const scripts: KanaScript[] = learnScript === "ambos" ? ["hiragana", "katakana"]
      : learnScript === "hiragana" ? ["hiragana"] : ["katakana"];
    return scripts.flatMap((s) => selectedSets.map((set) => `${s}:${set}` as KanaScopeKey));
  }, [learnScript, selectedSets]);

  const practicePool = useMemo(() => collectPracticeItems(personalizedScopeKeys), [personalizedScopeKeys]);

  const selectedKanaCount = useMemo(() =>
    personalizedScopeKeys.reduce((sum, k) => {
      const [script, set] = k.split(":") as [KanaScript, KanaSelectableSet];
      return sum + filterKanaItemsForSelection(script, set).length;
    }, 0),
  [personalizedScopeKeys]);

  const selectedScriptSummary = learnScript === "ambos" ? "Hiragana · Katakana"
    : learnScript === "hiragana" ? "Hiragana" : "Katakana";

  const selectedSetSummary = selectedSets.map((s) => KANA_SCOPE_LABELS[s]).join(", ");

  const learnStats = useMemo(
    () => getLearnStats(learnScript, basicHiragana, basicKatakana, progress),
    [learnScript, basicHiragana, basicKatakana, progress],
  );

  const hiraganaLearnCtx = useMemo(
    () => getScriptLearnContext(basicHiragana, HIRAGANA_BASIC_GROUPS, progress),
    [basicHiragana, progress],
  );

  const katakanaLearnCtx = useMemo(
    () => getScriptLearnContext(basicKatakana, KATAKANA_BASIC_GROUPS, progress),
    [basicKatakana, progress],
  );

  // Primary context for the selected script (for charts + next-batch display)
  const primaryLearnCtx = learnScript === "katakana" ? katakanaLearnCtx : hiraganaLearnCtx;

  const kanaGridData = useMemo(() => {
    const chartRows = learnScript === "katakana" ? KATAKANA_CHART_ROWS : KANA_CHART_ROWS;
    const allBasic = learnScript === "katakana" ? basicKatakana : basicHiragana;
    const kanaToItem = new Map(allBasic.map((item) => [item.kana, item]));
    return chartRows.map((row) => ({
      label: row.label,
      cells: row.chars.map((kanaChar) => {
        if (!kanaChar) return null;
        const item = kanaToItem.get(kanaChar);
        if (!item) return null;
        const entry = progress[item.id];
        const level = entry?.level ?? 0;
        const seen = Boolean(entry);
        const masteryLevel = !seen ? 0 : level === 0 ? 1 : level === 1 ? 2 : level <= 3 ? 3 : 4;
        return { kana: kanaChar, id: item.id, masteryLevel };
      }),
    }));
  }, [learnScript, basicHiragana, basicKatakana, progress]);

  const learnEndSummary = useMemo(() => {
    const masteredMap = new Map<string, KanaItem>();
    sessionResults.forEach((r) => {
      if (sessionNewItemIds.has(r.item.id) && r.rating === "correct") masteredMap.set(r.item.id, r.item);
    });
    const masteredInSession = Array.from(masteredMap.values());
    const reviewedCount = new Set(sessionResults.filter((r) => !sessionNewItemIds.has(r.item.id)).map((r) => r.item.id)).size;
    const newPracticed = new Set(sessionResults.filter((r) => sessionNewItemIds.has(r.item.id)).map((r) => r.item.id)).size;
    return { masteredInSession, reviewedCount, newPracticed };
  }, [sessionResults, sessionNewItemIds]);

  const learnSessionSummaryData = useMemo((): KanaSessionSummaryData => {
    const correct = sessionResults.filter((r) => r.rating === "correct").length;
    const wrong = sessionResults.filter((r) => r.rating !== "correct").length;
    const total = session?.questions.length ?? 0;
    const durationMs = sessionStartTime ? Date.now() - sessionStartTime : 0;
    const newlySet = learnEndSummary.masteredInSession.map((item) => ({ kana: item.kana, romaji: item.romaji }));
    const nextBatch = primaryLearnCtx.nextBatchKana;
    return {
      correct, wrong, total, durationMs, streak,
      newlySet,
      upNextLabel: nextBatch ? "Siguiente fila" : undefined,
      upNextKana: nextBatch?.[0] ?? undefined,
    };
  }, [sessionResults, session, sessionStartTime, streak, learnEndSummary, primaryLearnCtx]);

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
      setSessionStartTime(null);
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
    setSessionStartTime(Date.now());
    setSetupError(null);
    onRecordActivity?.(activityLabel);
  };

  const startSession = (overrideItems?: KanaItem[]) => {
    if (personalizedScopeKeys.length === 0) {
      setSetupError("Selecciona al menos un grupo de kana.");
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
          setKey: personalizedScopeKeys.join("+"),
          modes: practiceModes,
          count: overrideItems.length,
          questions: buildQuestionsForItems(uniqueKanaItems(overrideItems), practicePool, practiceModes),
        }
      : buildSession(personalizedScopeKeys, practiceModes, questionCount, progress);

    openSession(nextSession, `${selectedScriptSummary} · ${selectedSetSummary || "Básico"}`);
  };

  const startLearnSession = () => {
    const s = buildLearnSession(basicHiragana, progress);
    const newIds = new Set(s.questions.map((q) => q.item.id).filter((id) => !progress[id]));
    setSessionNewItemIds(newIds);
    openSession(s, "Aprender · Hiragana");
  };

  const startInteligenteSession = (action: InteligenteAction) => {
    const s = buildInteligenteSession(action, learnScript, basicHiragana, basicKatakana, progress);
    if (!s) return;
    const newIds = new Set(s.questions.map((q) => q.item.id).filter((id) => !progress[id]));
    setSessionNewItemIds(newIds);
    const label = action === "seguir" ? "Seguir aprendiendo" : action === "pendientes" ? "Repasar pendientes" : action === "debiles" ? "Repasar débiles" : "Kana nuevos";
    openSession(s, label);
  };

  useEffect(() => {
    if (!progressReady || initialMode !== "learn" || autoStartedLearnRef.current || session) return;
    autoStartedLearnRef.current = true;
    startLearnSession();
  }, [initialMode, progressReady, session]);

  const TAB_BAR_ITEMS = [
    { k: "home" as const, label: "Inicio", icon: (c: string) => (<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 10l8-7 8 7v8a1.5 1.5 0 01-1.5 1.5H13v-6h-4v6H4.5A1.5 1.5 0 013 18v-8z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/></svg>) },
    { k: "learn" as const, label: "Aprender", icon: (c: string) => (<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 5.5a2 2 0 012-2h5v15H5a2 2 0 01-2-2v-11zM12 3.5h5a2 2 0 012 2v11a2 2 0 01-2 2h-5v-15z" stroke={c} strokeWidth="1.5"/></svg>) },
    { k: "review" as const, label: "Repasar", icon: (c: string) => (<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M18 11a7 7 0 11-2.05-4.95M18 3v4h-4" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>) },
    { k: "practice" as const, label: "Practicar", icon: (c: string) => (<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M6 3v16M10 5v12M14 7v8M18 9v4" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>) },
    { k: "vault" as const, label: "Biblioteca", icon: (c: string) => (<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="5" width="16" height="13" rx="2" stroke={c} strokeWidth="1.5"/><path d="M3 8h16M8 5V3.5h6V5" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>) },
  ] as const;

  const renderTabBar = () => (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 84, background: `linear-gradient(to top, ${DS.bg} 60%, transparent)`, display: "flex", alignItems: "center", justifyContent: "space-around", zIndex: 10, padding: "0 8px 24px" }}>
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
  const isInteligenteSession = session?.setKey === "inteligente";
  const useNewDesign = isLearnSession || isInteligenteSession;

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

  const handleNewDesignAnswer = (value: string) => {
    if (romajiFeedback || !currentQuestion) return;
    const isCorrect = isKanaAnswerCorrect(currentQuestion.item, value);

    if (currentQuestion.mode === "multiple_choice") {
      setMultipleChoiceAnswer(value);
    } else {
      setRomajiValue(value);
    }

    setRomajiFeedback({ correct: isCorrect, answer: currentQuestion.item.romaji });
    setAnswerFeedback({ status: isCorrect ? "correct" : "wrong", answer: currentQuestion.item.romaji });
    recordResult(currentQuestion.item, isCorrect ? "correct" : "wrong");

    if (isCorrect) {
      setStreak((v) => {
        const n = v + 1;
        setStreakPulse(n);
        return n;
      });
      if (currentQuestion.mode === "multiple_choice") {
        advanceTimerRef.current = window.setTimeout(moveToNext, 700);
      }
    } else {
      setStreak(0);
    }
  };

  const handleNewDesignDontKnow = () => {
    if (romajiFeedback || !currentQuestion) return;
    setRomajiValue("");
    setRomajiFeedback({ correct: false, answer: currentQuestion.item.romaji });
    setAnswerFeedback({ status: "wrong", answer: currentQuestion.item.romaji });
    recordResult(currentQuestion.item, "wrong");
    setStreak(0);
  };

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      {/* ── HOME — Kana System design ── */}
      {screen === "home" && (
        <div style={{ minHeight: "100vh", background: DS.bg, display: "flex", flexDirection: "column" }}>
          <div style={{ height: 54 }} />

          {/* TopBar */}
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 20, height: 54, background: DS.bg, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", borderBottom: `1px solid ${DS.line}` }}>
            <div style={{ fontFamily: DS.fontKana, fontSize: 20, fontWeight: 500, color: DS.ink, letterSpacing: 1 }}>禅</div>
            <button type="button" onClick={() => setScreen("table")} style={{ fontFamily: DS.fontHead, fontSize: 11, fontWeight: 600, color: DS.inkSoft, background: DS.surfaceAlt, border: `1px solid ${DS.line}`, borderRadius: 10, padding: "5px 12px", cursor: "pointer" }}>
              Tabla de kana
            </button>
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflow: "auto", paddingBottom: 100 }}>

            {/* Title + progress counter */}
            <div style={{ padding: "20px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontFamily: DS.fontHead, fontSize: 28, fontWeight: 700, color: DS.ink, letterSpacing: -0.6, lineHeight: 1.1 }}>Aprender Kana</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: DS.fontHead, fontSize: 10, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: DS.inkSoft }}>Progreso</div>
                <div style={{ fontFamily: DS.fontHead, fontSize: 18, fontWeight: 700, color: DS.ink, marginTop: 2, letterSpacing: -0.3 }}>
                  <span style={{ color: DS.accent }}>{learnStats.aprendidos}</span>
                  <span style={{ color: DS.inkFaint, fontWeight: 400 }}> / {learnStats.total}</span>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ padding: "10px 24px 0" }}>
              <div style={{ height: 3, borderRadius: 3, background: DS.surfaceAlt, overflow: "hidden" }}>
                <div style={{ width: `${learnStats.total > 0 ? (learnStats.aprendidos / learnStats.total) * 100 : 0}%`, height: "100%", background: DS.accent, transition: "width 0.4s ease" }} />
              </div>
            </div>

            {/* Script selector */}
            <div style={{ padding: "20px 24px 0", display: "flex", gap: 8 }}>
              {(["hiragana", "katakana", "ambos"] as LearnScript[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setLearnScript(s)}
                  style={{
                    fontFamily: DS.fontHead, fontSize: 13, fontWeight: 600, letterSpacing: 0.1,
                    padding: "8px 16px", borderRadius: 999, cursor: "pointer",
                    background: learnScript === s ? DS.ink : DS.surfaceAlt,
                    color: learnScript === s ? DS.card : DS.inkSoft,
                    border: "none",
                    transition: "background 150ms, color 150ms",
                  }}
                >
                  {s === "hiragana" ? "Hiragana" : s === "katakana" ? "Katakana" : "Ambos"}
                </button>
              ))}
            </div>

            {/* Stats row */}
            <div style={{ padding: "16px 24px 0", display: "flex", gap: 20 }}>
              {[
                { label: "aprendidos", value: learnStats.aprendidos, highlight: true },
                { label: "pendientes", value: learnStats.pendientes, highlight: false },
                { label: "nuevos", value: learnStats.nuevos, highlight: false },
              ].map(({ label, value, highlight }) => (
                <div key={label}>
                  <div style={{ fontFamily: DS.fontHead, fontSize: 18, fontWeight: 700, color: highlight ? DS.accent : DS.ink, letterSpacing: -0.3 }}>{value}</div>
                  <div style={{ fontFamily: DS.fontBody, fontSize: 11, color: DS.inkSoft, marginTop: 2 }}>{label}</div>
                </div>
              ))}
              {learnStats.debiles > 0 && (
                <div>
                  <div style={{ fontFamily: DS.fontHead, fontSize: 18, fontWeight: 700, color: DS.ink, letterSpacing: -0.3 }}>{learnStats.debiles}</div>
                  <div style={{ fontFamily: DS.fontBody, fontSize: 11, color: DS.inkSoft, marginTop: 2 }}>débiles</div>
                </div>
              )}
            </div>

            {/* Mode tabs: Inteligente / Personalizado */}
            <div style={{ padding: "24px 24px 0", display: "flex", gap: 24, borderBottom: `1px solid ${DS.line}`, marginBottom: 0 }}>
              {(["inteligente", "personalizado"] as HomeMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setHomeMode(m)}
                  style={{
                    fontFamily: DS.fontHead, fontSize: 13, fontWeight: 600, letterSpacing: 0.1,
                    padding: "0 0 14px", background: "none", border: "none", cursor: "pointer",
                    borderBottom: homeMode === m ? `2px solid ${DS.ink}` : "2px solid transparent",
                    color: homeMode === m ? DS.ink : DS.inkSoft,
                    marginBottom: -1,
                  }}
                >
                  {m === "inteligente" ? "Inteligente" : "Personalizado"}
                </button>
              ))}
            </div>

            {/* ── INTELIGENTE ── */}
            {homeMode === "inteligente" && (() => {
              const ctx = learnScript === "katakana" ? katakanaLearnCtx : hiraganaLearnCtx;
              const actions: Array<{ key: InteligenteAction; title: string; desc: string; count: number | null; alwaysEnabled: boolean }> = [
                {
                  key: "seguir",
                  title: "Seguir aprendiendo",
                  desc: ctx.freshCount > 0 ? `${ctx.freshCount} kana por introducir` : "Continúa tu progresión guiada",
                  count: null,
                  alwaysEnabled: true,
                },
                {
                  key: "pendientes",
                  title: "Repasar pendientes",
                  desc: learnStats.pendientes > 0 ? "Kana listos para repasar" : "Nada por repasar",
                  count: learnStats.pendientes,
                  alwaysEnabled: false,
                },
                {
                  key: "debiles",
                  title: "Repasar débiles",
                  desc: learnStats.debiles > 0 ? "Kana que todavía te cuestan" : "Sin kana difíciles",
                  count: learnStats.debiles,
                  alwaysEnabled: false,
                },
                {
                  key: "nuevos",
                  title: "Kana nuevos",
                  desc: learnStats.nuevos > 0 ? "Kana que no has visto aún" : "Ya viste todos",
                  count: learnStats.nuevos,
                  alwaysEnabled: false,
                },
              ];

              return (
                <div style={{ padding: "0 24px" }}>
                  {/* Action cards */}
                  {actions.map((action, i) => {
                    const isAvailable = action.alwaysEnabled || (action.count ?? 0) > 0;
                    return (
                      <button
                        key={action.key}
                        type="button"
                        onClick={() => isAvailable ? startInteligenteSession(action.key) : undefined}
                        style={{
                          display: "flex", alignItems: "center", gap: 16,
                          padding: "18px 0", width: "100%", textAlign: "left",
                          background: "none", border: "none",
                          borderTop: `1px solid ${DS.line}`,
                          borderBottom: i === actions.length - 1 ? `1px solid ${DS.line}` : "none",
                          cursor: isAvailable ? "pointer" : "default",
                          opacity: isAvailable ? 1 : 0.4,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: DS.fontHead, fontSize: 15, fontWeight: 600, color: DS.ink, letterSpacing: -0.2 }}>
                            {action.title}
                          </div>
                          <div style={{ fontFamily: DS.fontBody, fontSize: 12, color: DS.inkSoft, marginTop: 3, lineHeight: 1.4 }}>
                            {action.desc}
                          </div>
                        </div>
                        {action.count !== null && action.count > 0 && (
                          <div style={{
                            fontFamily: DS.fontHead, fontSize: 13, fontWeight: 700,
                            color: DS.accentInk, background: DS.accent,
                            borderRadius: 999, padding: "3px 10px", flexShrink: 0,
                          }}>
                            {action.count}
                          </div>
                        )}
                        {isAvailable && (
                          <svg width="10" height="12" viewBox="0 0 10 12" fill="none" style={{ flexShrink: 0 }}>
                            <path d="M1 1l5 5-5 5" stroke={DS.inkFaint} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    );
                  })}

                  {/* Mastery dots */}
                  <div style={{ paddingTop: 24 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {kanaGridData.map((row, rowIdx) => (
                        <div key={rowIdx} style={{ display: "flex", gap: 4 }}>
                          {row.cells.map((cell, ci) => {
                            if (!cell) return <div key={ci} style={{ width: 18, height: 18 }} />;
                            const lvl = cell.masteryLevel;
                            const bg = lvl >= 4 ? DS.accent : lvl >= 2 ? DS.accentSoft : lvl >= 1 ? DS.surfaceAlt : DS.line;
                            return <div key={ci} style={{ width: 18, height: 18, borderRadius: 5, background: bg }} />;
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              );
            })()}

            {/* ── PERSONALIZADO ── */}
            {homeMode === "personalizado" && (
              <div style={{ padding: "24px 24px 0" }}>

                {/* Sets */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontFamily: DS.fontHead, fontSize: 10, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: DS.inkSoft, marginBottom: 12 }}>Grupos</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {KANA_SCOPE_ROWS.map((row) => {
                      const active = selectedSets.includes(row.set);
                      return (
                        <button
                          key={row.set}
                          type="button"
                          onClick={() => {
                            setSelectedSets((prev) =>
                              prev.includes(row.set) ? prev.filter((s) => s !== row.set) : [...prev, row.set],
                            );
                            setSetupError(null);
                          }}
                          style={{
                            fontFamily: DS.fontHead, fontSize: 13, fontWeight: 600, padding: "8px 16px",
                            borderRadius: 999, cursor: "pointer",
                            background: active ? DS.ink : DS.surfaceAlt,
                            color: active ? DS.card : DS.inkSoft,
                            border: "none",
                          }}
                        >
                          {row.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Answer mode */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontFamily: DS.fontHead, fontSize: 10, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: DS.inkSoft, marginBottom: 12 }}>Modo de respuesta</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {([
                      { key: "multiple_choice" as KanaPracticeMode, label: "Opciones" },
                      { key: "romaji_input" as KanaPracticeMode, label: "Romaji" },
                      { key: "handwriting" as KanaPracticeMode, label: "Escritura" },
                    ]).map(({ key, label }) => {
                      const active = practiceModes.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setPracticeModes((prev) =>
                              prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key],
                            );
                            setSetupError(null);
                          }}
                          style={{
                            fontFamily: DS.fontHead, fontSize: 13, fontWeight: 600, padding: "8px 16px",
                            borderRadius: 999, cursor: "pointer",
                            background: active ? DS.ink : DS.surfaceAlt,
                            color: active ? DS.card : DS.inkSoft,
                            border: "none",
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Question count */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontFamily: DS.fontHead, fontSize: 10, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: DS.inkSoft, marginBottom: 12 }}>Preguntas</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {KANA_QUESTION_COUNT_OPTIONS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setQuestionCount(n)}
                        style={{
                          fontFamily: DS.fontHead, fontSize: 15, fontWeight: 700, padding: "8px 20px",
                          borderRadius: 999, cursor: "pointer",
                          background: questionCount === n ? DS.ink : DS.surfaceAlt,
                          color: questionCount === n ? DS.card : DS.inkSoft,
                          border: "none",
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary + error */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: DS.fontBody, fontSize: 12, color: DS.inkSoft }}>
                    {selectedKanaCount} kana · {selectedScriptSummary} · {selectedSetSummary || "ningún grupo"}
                  </div>
                  {setupError && (
                    <div style={{ fontFamily: DS.fontBody, fontSize: 12, color: DS.accent, marginTop: 6 }}>{setupError}</div>
                  )}
                </div>

                {/* Start button */}
                <button
                  type="button"
                  onClick={() => startSession()}
                  disabled={selectedSets.length === 0 || practiceModes.length === 0}
                  style={{
                    width: "100%", padding: "16px 0", borderRadius: 16,
                    background: DS.ink, color: DS.card, border: "none",
                    fontFamily: DS.fontHead, fontSize: 15, fontWeight: 700, cursor: "pointer",
                    opacity: selectedSets.length === 0 || practiceModes.length === 0 ? 0.4 : 1,
                    marginBottom: 16,
                  }}
                >
                  Empezar sesión
                </button>

              </div>
            )}

          </div>

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
              { key: "basic", label: "Básico" },
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

      {/* ── NEW DESIGN SESSION (KanaReadingSession) ── */}
      {useNewDesign && (
        <KanaReadingSession
          open={Boolean(session)}
          visible={sheetVisible}
          kana={currentQuestion?.item.kana ?? ""}
          romaji={currentQuestion?.item.romaji ?? ""}
          mode={currentQuestion?.mode === "multiple_choice" ? "multiple_choice" : "romaji_input"}
          options={currentQuestion?.options}
          questionIndex={Math.min(sessionIndex + 1, session?.questions.length ?? 0)}
          totalQuestions={session?.questions.length ?? 0}
          feedback={romajiFeedback ? {
            status: romajiFeedback.correct ? "correct" : "wrong",
            userAnswer: currentQuestion?.mode === "multiple_choice" ? multipleChoiceAnswer || "" : romajiValue,
            correctAnswer: romajiFeedback.answer,
          } as KanaSessionFeedback : null}
          isFinished={sessionFinished}
          summary={sessionFinished ? learnSessionSummaryData : null}
          onAnswer={handleNewDesignAnswer}
          onDontKnow={handleNewDesignDontKnow}
          onNext={moveToNext}
          onRestart={() => {
            closeSession();
            if (isLearnSession) {
              window.setTimeout(startLearnSession, 260);
            }
          }}
          onClose={closeSession}
        />
      )}

      {/* ── PRACTICE SHELL ── */}
      <PracticeShell
        open={Boolean(session) && !useNewDesign}
        visible={sheetVisible && !useNewDesign}
        title="Práctica"
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
            style={{ display: "grid", gap: "var(--space-4)", animation: "kanaPracticeStepIn 200ms cubic-bezier(.22,1,.36,1)" }}
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
                          minHeight: 120,
                          borderRadius: 28,
                          border: showAnswer && isCorrect
                            ? "1px solid color-mix(in srgb, #4ECDC4 44%, transparent)"
                            : showAnswer && isChosen && !isCorrect
                              ? "1px solid color-mix(in srgb, #E63946 32%, transparent)"
                              : "1px solid color-mix(in srgb, var(--color-border) 88%, white)",
                          background:
                            showAnswer && isCorrect
                              ? "color-mix(in srgb, #4ECDC4 18%, white)"
                              : showAnswer && isChosen && !isCorrect
                                ? "color-mix(in srgb, #E63946 10%, white)"
                                : "color-mix(in srgb, var(--color-surface) 82%, white)",
                          color:
                            showAnswer && isCorrect
                              ? "#117964"
                              : showAnswer && isChosen && !isCorrect
                                ? "#E63946"
                                : "var(--color-text)",
                          fontSize: 28,
                          fontWeight: 800,
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
                          fontSize: "var(--text-body)",
                          color: "#117964",
                          fontWeight: 800,
                        }}
                      >
                        Correcto
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: "12px 16px",
                          borderRadius: 20,
                          background: "color-mix(in srgb, #E63946 8%, white)",
                          border: "1px solid color-mix(in srgb, #E63946 18%, transparent)",
                          display: "grid",
                          gap: 4,
                          justifyItems: "start",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: "#E63946",
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: ".08em",
                          }}
                        >
                          Respuesta correcta
                        </div>
                        <div style={{ fontSize: 26, fontWeight: 800, color: "var(--color-text)" }}>
                          {currentQuestion.item.romaji}
                        </div>
                      </div>
                    )}
                    {answerFeedback.status === "wrong" && (
                      <button type="button" onClick={moveToNext} className="ds-btn" style={{ width: "100%" }}>
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
                    fontSize: 30,
                    fontWeight: 800,
                    minHeight: 64,
                    borderRadius: 20,
                    border: "1px solid var(--color-border)",
                    background: "color-mix(in srgb, var(--color-surface) 90%, white)",
                    color: "var(--color-text)",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={handleRomajiSubmit}
                    disabled={Boolean(romajiFeedback) || normalizeRomaji(romajiValue).length === 0}
                    className="ds-btn"
                  >
                    Comprobar
                  </button>
                  {romajiFeedback && (
                    <button type="button" onClick={moveToNext} className="ds-btn-secondary">
                      {sessionIndex >= sessionQuestionCount - 1 ? "Ver resumen" : "Siguiente"}
                    </button>
                  )}
                </div>
                {romajiFeedback && (
                  <div
                    style={{
                      fontSize: "var(--text-body)",
                      color: romajiFeedback.correct ? "#117964" : "var(--color-text-muted)",
                      fontWeight: 800,
                      textAlign: "center",
                    }}
                  >
                    {romajiFeedback.correct ? "Correcto" : `Respuesta: ${romajiFeedback.answer}`}
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
                  <button type="button" onClick={moveToNext} className="ds-btn" style={{ width: "100%" }}>
                    {sessionIndex >= sessionQuestionCount - 1 ? "Ver resumen" : "Siguiente"}
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {/* Summary — Learn (handled by KanaReadingSession overlay, not PracticeShell) */}
        {sessionFinished && useNewDesign ? (
          <div style={{ display: "grid", gap: 8 }}>
            <button type="button" onClick={() => { if (isLearnSession) startLearnSession(); else closeSession(); }} className="ds-btn" style={{ width: "100%", minHeight: 54 }}>
              Continuar
            </button>
            <button
                type="button"
                onClick={() => { closeSession(); setScreen("home"); }}
                className="ds-btn-ghost"
              >
                Salir
              </button>
            </div>
        ) : null}

        {/* Summary — Custom Practice */}
        {sessionFinished && !useNewDesign ? (
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            <div
              style={{
                display: "grid",
                gap: 16,
                padding: "20px 20px 18px",
                borderRadius: 30,
                background: "color-mix(in srgb, var(--color-surface) 86%, white)",
                boxShadow: "0 18px 34px rgba(26,26,46,.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
                <div
                  style={{
                    fontSize: "clamp(42px, 12vw, 62px)",
                    lineHeight: 0.9,
                    letterSpacing: "-.05em",
                    fontWeight: 800,
                    color: "var(--color-text)",
                  }}
                >
                  {summary.correct} / {session?.questions.length || 0}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text-muted)", paddingBottom: 6 }}>
                  {Math.round((summary.correct / Math.max(1, session?.questions.length || 1)) * 100)}%
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                <div style={{ ...subtlePillStyle, textAlign: "center", color: summary.correct > 0 ? "#117964" : "var(--color-text-muted)" }}>
                  ✓ {summary.correct}
                </div>
                <div style={{ ...subtlePillStyle, textAlign: "center" }}>～ {summary.almost}</div>
                <div style={{ ...subtlePillStyle, textAlign: "center", color: summary.wrong > 0 ? "#E63946" : "var(--color-text-muted)" }}>
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
                    borderTop: "1px solid var(--color-border)",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--color-text-muted)",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
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
                  className="ds-btn"
                >
                  Practicar falladas ({repeatCandidates.length})
                </button>
              ) : (
                <button type="button" onClick={() => startSession()} className="ds-btn">
                  Otra sesión
                </button>
              )}
              <button
                type="button"
                onClick={() => { closeSession(); setScreen("home"); }}
                className="ds-btn-ghost"
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
