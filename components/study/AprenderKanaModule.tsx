"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import KanaAudioButton from "@/components/study/KanaAudioButton";
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
import { getKanaSpeechAvailability, hasJapaneseVoice, observeKanaVoices, stopKanaSpeech, type KanaSpeechAvailability } from "@/lib/kana-speech";
import { recordStudyResultToStorage } from "@/lib/study-srs";

type AprenderKanaModuleProps = {
  userKey: string;
  onRecordActivity?: (detail?: string) => void;
  initialMode?: "learn" | null;
  onTabChange?: (tab: "home" | "learn" | "practice" | "recursos") => void;
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
type SmartAction = "seguir" | "pendientes" | "debiles" | "nuevos";

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

const HIRAGANA_GROUP_LABELS = ["Vocales", "Fila K", "Fila S", "Fila T", "Fila N", "Fila H", "Fila M", "Fila Y", "Fila R", "Fila W"] as const;

function getGroupState(
  groupKana: readonly string[],
  prevGroupKana: readonly string[] | null,
  basicItems: KanaItem[],
  progress: KanaProgressMap,
): "locked" | "active" | "completed" {
  const kanaToItem = new Map(basicItems.map((item) => [item.kana, item]));
  const groupItems = groupKana.map((k) => kanaToItem.get(k)).filter((i): i is KanaItem => Boolean(i));
  const allCleared = groupItems.every((item) => {
    const e = progress[item.id];
    return e && e.level >= 3;
  });
  if (allCleared) {
    // A "dominado" group that has due items must become active so the user can review
    const hasDue = groupItems.some((item) => {
      const e = progress[item.id];
      return e && isDueReview(e.nextReview, e.next_due_at);
    });
    return hasDue ? "active" : "completed";
  }
  if (prevGroupKana !== null) {
    const prevItems = prevGroupKana.map((k) => kanaToItem.get(k)).filter((i): i is KanaItem => Boolean(i));
    const prevCleared = prevItems.every((item) => {
      const e = progress[item.id];
      return e && e.level >= 3;
    });
    if (!prevCleared) return "locked";
  }
  return "active";
}

function buildGroupSession(
  groupKana: readonly string[],
  basicItems: KanaItem[],
  progress: KanaProgressMap,
): KanaSession {
  const kanaToItem = new Map(basicItems.map((item) => [item.kana, item]));
  const groupItems = groupKana.map((k) => kanaToItem.get(k)).filter((item): item is KanaItem => Boolean(item));
  const dueItems = groupItems.filter((item) => {
    const e = progress[item.id];
    return e && e.timesSeen > 0 && isDueReview(e.nextReview, e.next_due_at);
  });
  const newItems = groupItems.filter((item) => !progress[item.id] || progress[item.id].timesSeen === 0);
  const pool = uniqueKanaItems([...dueItems, ...newItems]);
  const finalPool = pool.length > 0 ? pool : groupItems;
  const sessionCount = Math.min(15, Math.max(finalPool.length, 5));
  const ranked = buildKanaSessionItems(finalPool, progress, sessionCount);
  const items = shuffle(ranked);
  const questions = buildQuestionsForItems(items, basicItems, ["romaji_input"]);
  return { setKey: "learn", modes: ["romaji_input"] as KanaPracticeMode[], count: items.length, questions };
}

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

function isDueReview(nextReview?: string | null, next_due_at?: number | null) {
  // Prioriza next_due_at (nuevo modelo); hace fallback a nextReview por compatibilidad
  if (next_due_at !== null && next_due_at !== undefined) {
    return next_due_at <= Date.now();
  }
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
    return isDueReview(entry.nextReview, entry.next_due_at) || entry.difficult;
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
    return e && (isDueReview(e.nextReview, e.next_due_at) || e.difficult);
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

function buildSmartSession(
  action: SmartAction,
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
    setKey: "smart",
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
    const items = scopeItems.filter((item) => { const e = progress[item.id]; return e && e.timesSeen > 0 && isDueReview(e.nextReview, e.next_due_at); });
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
    // dominados: level >= 4 — sustained correct recall across multiple sessions
    dominados: items.filter((item) => { const e = progress[item.id]; return e && e.level >= 4; }).length,
    // en_repaso: level 3 — repeated correct, entering long-term review
    en_repaso: items.filter((item) => { const e = progress[item.id]; return e && e.level === 3; }).length,
    // aprendiendo: level 1-2 — seen and practicing but not stable
    aprendiendo: items.filter((item) => { const e = progress[item.id]; return e && e.level >= 1 && e.level <= 2; }).length,
    // pendientes: seen before, currently due for review
    pendientes: items.filter((item) => { const e = progress[item.id]; return e && e.timesSeen > 0 && isDueReview(e.nextReview, e.next_due_at); }).length,
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
  bg: "#FFF8E7",
  surface: "#FDFCF5",
  surfaceAlt: "#FAF3E2",
  card: "#FFFFFF",
  dark: "#1A1A2E",
  ink: "#1E1C12",
  inkSoft: "#5B403F",
  inkFaint: "#C4BAB0",
  line: "rgba(30,28,18,0.06)",
  lineStrong: "rgba(30,28,18,0.12)",
  accent: "#E63946",
  accentSoft: "rgba(230,57,70,0.10)",
  accentInk: "#ffffff",
  teal: "#4ECDC4",
  tealDark: "#2BA99F",
  correct: "oklch(0.48 0.12 150)",
  correctSoft: "oklch(0.48 0.12 150 / 0.10)",
  wrong: "oklch(0.55 0.16 25)",
  wrongSoft: "oklch(0.55 0.16 25 / 0.10)",
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
  const [kanaAudioAvailability, setKanaAudioAvailability] = useState<KanaSpeechAvailability | "checking">("checking");
  const [tableScript, setTableScript] = useState<KanaScript>("hiragana");
  const [tableFilter, setTableFilter] = useState<"basic" | "dakuten" | "handakuten" | "yoon" | "mixed">("basic");
  const [learnScript, setLearnScript] = useState<LearnScript>("hiragana");
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

  useEffect(() => {
    let alive = true;

    const refreshKanaAudio = async () => {
      const availability = await getKanaSpeechAvailability();
      if (!alive) return;
      setKanaAudioAvailability(availability);
      void hasJapaneseVoice();
    };

    void refreshKanaAudio();
    const unsubscribe = observeKanaVoices(() => {
      void refreshKanaAudio();
    });

    return () => {
      alive = false;
      unsubscribe();
      stopKanaSpeech();
    };
  }, []);

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

  // Derive selectedScopeKeys from learnScript + selectedSets for Libre
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
  const visibleProgress = useMemo(
    () => ({
      vistos: Math.max(0, learnStats.total - learnStats.nuevos),
      enAprendizaje: learnStats.aprendiendo + learnStats.en_repaso,
      dominados: learnStats.dominados,
    }),
    [learnStats],
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

    openSession(nextSession, `Libre · ${selectedScriptSummary} · ${selectedSetSummary || "Básico"}`);
  };

  const startLearnSession = () => {
    const s = buildLearnSession(basicHiragana, progress);
    const newIds = new Set(s.questions.map((q) => q.item.id).filter((id) => !progress[id]));
    setSessionNewItemIds(newIds);
    openSession(s, "Smart · Hiragana");
  };

  const startSmartSession = (action: SmartAction) => {
    const s = buildSmartSession(action, learnScript, basicHiragana, basicKatakana, progress);
    if (!s) return;
    const newIds = new Set(s.questions.map((q) => q.item.id).filter((id) => !progress[id]));
    setSessionNewItemIds(newIds);
    const label = action === "seguir" ? "Smart · seguir" : action === "pendientes" ? "Smart · pendientes" : action === "debiles" ? "Smart · débiles" : "Smart · nuevos";
    openSession(s, label);
  };

  const startGroupSession = (groupKana: readonly string[], script: "hiragana" | "katakana") => {
    const pathItems = script === "katakana" ? basicKatakana : basicHiragana;
    const s = buildGroupSession(groupKana, pathItems, progress);
    const newIds = new Set(s.questions.map((q) => q.item.id).filter((id) => !progress[id]));
    setSessionNewItemIds(newIds);
    openSession(s, `Smart · ${script === "katakana" ? "Katakana" : "Hiragana"}`);
  };

  useEffect(() => {
    if (!progressReady || initialMode !== "learn" || autoStartedLearnRef.current || session) return;
    autoStartedLearnRef.current = true;
    startLearnSession();
  }, [initialMode, progressReady, session]);

  const TAB_BAR_ITEMS = [
    { k: "home" as const, label: "Inicio", icon: (c: string) => (<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 10l8-7 8 7v8a1.5 1.5 0 01-1.5 1.5H13v-6h-4v6H4.5A1.5 1.5 0 013 18v-8z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/></svg>) },
    { k: "learn" as const, label: "Aprender", icon: (c: string) => (<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 5.5a2 2 0 012-2h5v15H5a2 2 0 01-2-2v-11zM12 3.5h5a2 2 0 012 2v11a2 2 0 01-2 2h-5v-15z" stroke={c} strokeWidth="1.5"/></svg>) },
    { k: "practice" as const, label: "Practicar", icon: (c: string) => (<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M6 3v16M10 5v12M14 7v8M18 9v4" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>) },
    { k: "recursos" as const, label: "Recursos", icon: (c: string) => (<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 4h6v14H4zM12 4h6v14h-6z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/></svg>) },
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

  const handleLearnAnswer = (value: string) => {
    if (romajiFeedback || !currentQuestion) return;
    const correct = isKanaAnswerCorrect(currentQuestion.item, value);
    setRomajiValue(value);
    setRomajiFeedback({ correct, answer: currentQuestion.item.romaji });
    recordResult(currentQuestion.item, correct ? "correct" : "wrong");
    if (correct) {
      setStreak((v) => { const n = v + 1; setStreakPulse(n); return n; });
    } else {
      setStreak(0);
    }
  };

  const handleLearnDontKnow = () => {
    if (romajiFeedback || !currentQuestion) return;
    setRomajiValue("");
    setRomajiFeedback({ correct: false, answer: currentQuestion.item.romaji });
    recordResult(currentQuestion.item, "wrong");
    setStreak(0);
  };

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      {/* ── HOME — Smart ── */}
      {screen === "home" && (
        <div style={{ minHeight: "100vh", background: DS.bg, display: "flex", flexDirection: "column" }}>
          <div style={{ height: 44 }} />

          {/* Header bar — script selector + Tabla */}
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 20, background: DS.bg, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px 10px" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {(["hiragana", "katakana"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setLearnScript(s)}
                  style={{
                    fontFamily: DS.fontHead, fontSize: 13, fontWeight: 700,
                    padding: "7px 16px", borderRadius: 999, border: "none", cursor: "pointer",
                    background: learnScript === s ? DS.accent : DS.dark,
                    color: "#ffffff",
                    transition: "background 140ms",
                  }}
                >
                  {s === "hiragana" ? "Hiragana" : "Katakana"}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setScreen("table")} style={{ fontFamily: DS.fontHead, fontSize: 11, fontWeight: 600, color: DS.inkSoft, background: DS.surfaceAlt, border: "none", borderRadius: 999, padding: "6px 14px", cursor: "pointer" }}>
              Ver tabla
            </button>
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflow: "auto", paddingBottom: 100 }}>

            {/* Title */}
            <div style={{ padding: "16px 24px 10px" }}>
              <div style={{ fontFamily: DS.fontHead, fontSize: 28, fontWeight: 800, color: DS.ink, letterSpacing: -0.8, lineHeight: 1.05 }}>Smart</div>
              <div style={{ fontFamily: DS.fontBody, fontSize: 14, color: DS.inkSoft, marginTop: 6, lineHeight: 1.35 }}>
                {visibleProgress.vistos} vistos · {visibleProgress.enAprendizaje} en aprendizaje · {visibleProgress.dominados} dominados
              </div>
              <div style={{ fontFamily: DS.fontBody, fontSize: 13, color: DS.inkFaint, marginTop: 4, lineHeight: 1.35 }}>
                {learnStats.pendientes} pendientes · {learnStats.debiles} débiles · {learnStats.nuevos} nuevos
              </div>
            </div>

            {/* Sequential group cards */}
            {(() => {
              const pathScript = learnScript === "katakana" ? "katakana" : "hiragana";
              const pathGroups = pathScript === "katakana" ? KATAKANA_BASIC_GROUPS : HIRAGANA_BASIC_GROUPS;
              const pathItems = pathScript === "katakana" ? basicKatakana : basicHiragana;
              const kanaToItem = new Map(pathItems.map((item) => [item.kana, item]));

              return (
                <div style={{ padding: "8px 24px 0", display: "flex", flexDirection: "column", gap: 12 }}>
                  {pathGroups.map((group, idx) => {
                    const state = getGroupState(
                      group,
                      idx > 0 ? pathGroups[idx - 1] : null,
                      pathItems,
                      progress,
                    );
                    const label = HIRAGANA_GROUP_LABELS[idx] ?? `Fila ${idx + 1}`;
                    const groupItems = group.map((k) => kanaToItem.get(k)).filter((i): i is KanaItem => Boolean(i));
                    const clearedCount = groupItems.filter((item) => { const e = progress[item.id]; return e && e.level >= 3; }).length;

                    if (state === "locked") {
                      return (
                        <div key={idx} style={{ borderRadius: 48, background: DS.surfaceAlt, padding: "22px 24px", opacity: 0.45, display: "flex", alignItems: "center", gap: 16 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 14, background: DS.card, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                              <rect x="1" y="8" width="14" height="11" rx="2.5" stroke={DS.inkFaint} strokeWidth="1.5"/>
                              <path d="M4 8V5.5a4 4 0 018 0V8" stroke={DS.inkFaint} strokeWidth="1.5"/>
                            </svg>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: DS.fontHead, fontSize: 15, fontWeight: 700, color: DS.inkSoft }}>{label}</div>
                            <div style={{ fontFamily: DS.fontKana, fontSize: 17, color: DS.inkFaint, marginTop: 3, letterSpacing: 3 }}>{group.slice(0, 5).join(" ")}</div>
                          </div>
                        </div>
                      );
                    }

                    if (state === "completed") {
                      return (
                        <div key={idx} style={{ borderRadius: 48, background: "rgba(78,205,196,0.09)", padding: "22px 24px", display: "flex", alignItems: "center", gap: 16 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(78,205,196,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                              <path d="M1 7l5 5L17 1" stroke={DS.teal} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: DS.fontHead, fontSize: 15, fontWeight: 700, color: DS.tealDark }}>{label}</div>
                            <div style={{ fontFamily: DS.fontBody, fontSize: 12, color: DS.inkSoft, marginTop: 2 }}>Dominados · {clearedCount}/{group.length}</div>
                          </div>
                          <div style={{ fontFamily: DS.fontKana, fontSize: 22, color: DS.teal, opacity: 0.65, flexShrink: 0 }}>{group[0]}</div>
                        </div>
                      );
                    }

                    // active — only state with a CTA button
                    const hasDue = groupItems.some((item) => { const e = progress[item.id]; return e && e.timesSeen > 0 && isDueReview(e.nextReview, e.next_due_at); });
                    const isNew = clearedCount === 0 && groupItems.every((item) => !progress[item.id] || progress[item.id].timesSeen === 0);
                    const ctaBg = hasDue
                      ? `linear-gradient(135deg, ${DS.accent} 0%, #c42b38 100%)`
                      : `linear-gradient(135deg, ${DS.teal} 0%, ${DS.tealDark} 100%)`;
                    const ctaColor = hasDue ? "#ffffff" : DS.dark;
                    const ctaShadow = hasDue ? "0 8px 20px rgba(230,57,70,0.35)" : "0 8px 20px rgba(78,205,196,0.35)";
                    const ctaLabel = hasDue ? "Repasar" : isNew ? "Empezar" : "Continuar";
                    const eyebrow = hasDue ? "Pendientes" : isNew ? "Nuevos" : "En aprendizaje";
                    const eyebrowColor = hasDue ? DS.accent : DS.teal;

                    return (
                      <div key={idx} style={{ borderRadius: 48, background: DS.dark, padding: "28px 24px", position: "relative", overflow: "hidden", boxShadow: "0 12px 40px rgba(26,26,46,0.18)" }}>
                        <div aria-hidden="true" style={{ position: "absolute", right: -10, top: -14, fontFamily: DS.fontKana, fontSize: 130, color: "#fff", opacity: 0.04, lineHeight: 1, userSelect: "none", pointerEvents: "none" }}>{group[0]}</div>
                        <div style={{ position: "relative" }}>
                          <div style={{ fontFamily: DS.fontHead, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: eyebrowColor, marginBottom: 6 }}>{eyebrow}</div>
                          <div style={{ fontFamily: DS.fontHead, fontSize: 22, fontWeight: 700, color: "#ffffff", letterSpacing: -0.5, marginBottom: 4 }}>{label}</div>
                          <div style={{ fontFamily: DS.fontKana, fontSize: 20, color: "rgba(255,255,255,0.65)", marginBottom: 6, letterSpacing: 4 }}>{group.slice(0, 5).join(" ")}</div>
                          <div style={{ fontFamily: DS.fontBody, fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 20 }}>
                            {clearedCount}/{group.length} dominados
                          </div>
                          <div style={{ height: 4, borderRadius: 4, background: "rgba(255,255,255,0.10)", overflow: "hidden", marginBottom: 22 }}>
                            <div style={{ width: `${group.length > 0 ? (clearedCount / group.length) * 100 : 0}%`, height: "100%", background: `linear-gradient(to right, ${DS.teal}, ${DS.tealDark})`, borderRadius: 4 }} />
                          </div>
                          <button
                            type="button"
                            onClick={() => startGroupSession(group, pathScript)}
                            style={{ width: "100%", padding: "16px", background: ctaBg, color: ctaColor, border: "none", borderRadius: 999, fontFamily: DS.fontHead, fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: -0.2, boxShadow: ctaShadow, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                          >
                            {ctaLabel}
                            <svg width="16" height="10" viewBox="0 0 18 12" fill="none">
                              <path d="M1 6h15m0 0l-5-5m5 5l-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

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

          {kanaAudioAvailability === "unsupported" && (
            <div
              style={{
                borderRadius: 18,
                background: "color-mix(in srgb, var(--color-surface) 84%, white)",
                padding: "12px 14px",
                fontSize: 13,
                color: "var(--color-text-muted)",
                fontWeight: 600,
              }}
            >
              Audio no disponible en este navegador.
            </div>
          )}

          {kanaAudioAvailability === "no-voice" && (
            <div
              style={{
                borderRadius: 18,
                background: "color-mix(in srgb, var(--color-surface) 84%, white)",
                padding: "12px 14px",
                fontSize: 13,
                color: "var(--color-text-muted)",
                fontWeight: 600,
              }}
            >
              Voz japonesa no disponible en este dispositivo.
            </div>
          )}

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
                              gap: 6,
                              justifyItems: "center",
                              minHeight: 108,
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
                            <KanaAudioButton kana={item.kana} availability={kanaAudioAvailability} />
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

      {/* ── LEARN SESSION (KanaReadingSession) ── */}
      {isLearnSession && (
        <KanaReadingSession
          open={Boolean(session)}
          visible={sheetVisible}
          kana={currentQuestion?.item.kana ?? ""}
          romaji={currentQuestion?.item.romaji ?? ""}
          questionIndex={Math.min(sessionIndex + 1, session?.questions.length ?? 0)}
          totalQuestions={session?.questions.length ?? 0}
          feedback={romajiFeedback ? {
            status: romajiFeedback.correct ? "correct" : "wrong",
            userAnswer: romajiValue,
            correctAnswer: romajiFeedback.answer,
          } as KanaSessionFeedback : null}
          isFinished={sessionFinished}
          summary={sessionFinished ? learnSessionSummaryData : null}
          onAnswer={handleLearnAnswer}
          onDontKnow={handleLearnDontKnow}
          onNext={moveToNext}
          onRestart={() => { closeSession(); window.setTimeout(startLearnSession, 260); }}
          onClose={closeSession}
        />
      )}

      {/* ── PRACTICE SHELL ── */}
      <PracticeShell
        open={Boolean(session) && !isLearnSession}
        visible={sheetVisible && !isLearnSession}
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
        {sessionFinished && isLearnSession ? (
          <div style={{ display: "grid", gap: 8 }}>
            <button type="button" onClick={startLearnSession} className="ds-btn" style={{ width: "100%", minHeight: 54 }}>
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
        {sessionFinished && !isLearnSession ? (
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
                    Débiles
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
