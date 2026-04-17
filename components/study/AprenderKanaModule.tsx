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
      {/* ── HOME ── */}
      {screen === "home" && (
        <div style={{ display: "grid", gap: 0 }}>

          {/* Header — editorial typographic block */}
          <div style={{ paddingBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: "clamp(34px, 10vw, 44px)", fontWeight: 800, color: "var(--color-text)", letterSpacing: "-0.04em", lineHeight: 0.92 }}>
                  Learn
                </div>
                <div style={{ fontSize: "clamp(22px, 6vw, 30px)", fontWeight: 300, fontStyle: "italic", color: "var(--color-text-muted)", letterSpacing: "-0.025em", lineHeight: 1.1, marginTop: 4 }}>
                  hiragana.
                </div>
              </div>
              {/* Progress numerics — aligned to baseline, editorial weight */}
              <div style={{ textAlign: "right", paddingBottom: 3 }}>
                <div style={{ fontSize: "clamp(26px, 7vw, 32px)", fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.04em", lineHeight: 1 }}>
                  {learnProgressContext.learnedCount}
                  <span style={{ color: "var(--color-text-muted)", fontWeight: 300, fontSize: "0.55em", letterSpacing: 0 }}>/{learnProgressContext.totalCount}</span>
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "var(--color-text-muted)", opacity: 0.6, marginTop: 3 }}>
                  kana
                </div>
              </div>
            </div>
            {/* Progress bar — structural hairline, not a widget */}
            <div style={{ height: 2, borderRadius: 999, background: "var(--color-border)", overflow: "hidden" }}>
              <div style={{ height: "100%", background: "#2cb696", width: `${Math.round((learnProgressContext.learnedCount / learnProgressContext.totalCount) * 100)}%`, transition: "width 500ms ease" }} />
            </div>
          </div>

          {/* Kana preview — study tiles, no borders */}
          {learnPreviewKana.length > 0 && (
            <div style={{ paddingTop: 22, paddingBottom: 28 }}>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".18em", color: "#2cb696", marginBottom: 14 }}>
                {learnProgressContext.freshCount > 0 ? "Practicando ahora" : "Próximo grupo"}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {learnPreviewKana.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      flex: 1,
                      display: "grid",
                      gap: 7,
                      justifyItems: "center",
                      padding: "20px 8px 18px",
                      borderRadius: 18,
                      background: "color-mix(in srgb, var(--color-surface) 62%, var(--color-bg))",
                      boxShadow: "0 2px 10px rgba(26,26,46,.055)",
                    }}
                  >
                    <div style={{ fontSize: "clamp(32px, 10vw, 42px)", fontWeight: 800, lineHeight: 1, color: "var(--color-text)" }}>{item.kana}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", letterSpacing: ".05em" }}>{item.romaji}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Session context — floats freely in the flow */}
          <div style={{ paddingTop: learnPreviewKana.length > 0 ? 0 : 24 }}>
            {(learnProgressContext.reviewCount > 0 || learnProgressContext.freshCount > 0) ? (
              <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 24 }}>
                {learnProgressContext.reviewCount > 0 && (
                  <div>
                    <span style={{ fontSize: "clamp(30px, 9vw, 38px)", fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.04em", lineHeight: 1 }}>{learnProgressContext.reviewCount}</span>
                    <span style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600, marginLeft: 6 }}>para repasar</span>
                  </div>
                )}
                {learnProgressContext.reviewCount > 0 && learnProgressContext.freshCount > 0 && (
                  <div style={{ width: 1, height: 22, background: "var(--color-border)", alignSelf: "center" }} />
                )}
                {learnProgressContext.freshCount > 0 && (
                  <div>
                    <span style={{ fontSize: "clamp(30px, 9vw, 38px)", fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.04em", lineHeight: 1 }}>{learnProgressContext.freshCount}</span>
                    <span style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600, marginLeft: 6 }}>nuevo{learnProgressContext.freshCount > 1 ? "s" : ""}</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 600, marginBottom: 24, letterSpacing: ".01em" }}>
                Repaso guiado · sin nuevos kana hoy
              </div>
            )}

            {/* Primary CTA */}
            <button type="button" onClick={startLearnSession} className="ds-btn" style={{ width: "100%", minHeight: 52, fontSize: "var(--text-body)", fontWeight: 800, letterSpacing: "-.01em" }}>
              Empezar sesión
            </button>

            {/* Secondary actions — inline, muted, clearly subordinate */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, marginTop: 14 }}>
              <button type="button" onClick={() => setScreen("table")} className="ds-btn-ghost" style={{ fontSize: 13, color: "var(--color-text-muted)", padding: "8px 14px" }}>
                Tabla kana
              </button>
              <span style={{ color: "var(--color-border)", fontSize: 16, userSelect: "none", lineHeight: 1 }}>·</span>
              <button type="button" onClick={() => setScreen("setup")} className="ds-btn-ghost" style={{ fontSize: 13, color: "var(--color-text-muted)", padding: "8px 14px" }}>
                Práctica libre
              </button>
            </div>
          </div>

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
        title={isLearnSession ? "Learn" : "Práctica"}
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

        {/* Summary — Learn */}
        {sessionFinished && isLearnSession ? (
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            <div
              style={{
                display: "grid",
                gap: 20,
                padding: "22px 20px 20px",
                borderRadius: 30,
                background: "color-mix(in srgb, var(--color-surface) 86%, white)",
                boxShadow: "0 18px 34px rgba(26,26,46,.05)",
              }}
            >
              {/* Header */}
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--color-text-muted)" }}>
                  Hiragana básico · en progreso
                </div>
                <div style={{ fontSize: "clamp(24px, 6vw, 30px)", fontWeight: 800, color: "var(--color-text)", lineHeight: 1.1 }}>
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
                    <div style={{ ...subtlePillStyle, color: "#117964", background: "color-mix(in srgb, #4ECDC4 12%, white)", border: "1px solid color-mix(in srgb, #4ECDC4 28%, transparent)" }}>
                      +{learnEndSummary.newPracticed} nuevo{learnEndSummary.newPracticed > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              )}

              {/* Practiced kana — visual cards */}
              {learnEndSummary.masteredInSession.length > 0 && (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--color-text-muted)" }}>
                    Practicados
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {learnEndSummary.masteredInSession.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: "grid",
                          justifyItems: "center",
                          gap: 2,
                          padding: "8px 12px",
                          borderRadius: 14,
                          border: "1px solid var(--color-border)",
                          background: "color-mix(in srgb, var(--color-surface) 82%, white)",
                        }}
                      >
                        <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1, color: "var(--color-text)" }}>{item.kana}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)" }}>{item.romaji}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Batch unlocked */}
              {learnProgressContext.batchIdx > sessionStartBatchIdx && (
                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    padding: "14px 16px",
                    borderRadius: 20,
                    background: "color-mix(in srgb, #4ECDC4 10%, white)",
                    border: "1px solid color-mix(in srgb, #4ECDC4 30%, transparent)",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: "#117964" }}>
                    Grupo desbloqueado
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {HIRAGANA_BASIC_GROUPS[learnProgressContext.batchIdx].map((k) => (
                      <div
                        key={k}
                        style={{
                          fontSize: 26,
                          fontWeight: 800,
                          color: "#117964",
                          padding: "4px 10px",
                          borderRadius: 12,
                          background: "color-mix(in srgb, #4ECDC4 18%, white)",
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
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--color-text-muted)" }}>
                    Próximo grupo
                  </div>
                  <div style={{ fontSize: "var(--text-body-sm)", fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: ".04em" }}>
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
                  borderTop: "1px solid var(--color-border)",
                }}
              >
                <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 700 }}>
                  Progreso total
                </div>
                <div style={{ fontWeight: 800, color: "var(--color-text)", fontSize: "var(--text-body-sm)" }}>
                  {learnProgressContext.learnedCount} / {learnProgressContext.totalCount} kana
                </div>
              </div>
            </div>

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
