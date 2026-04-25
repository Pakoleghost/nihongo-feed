"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { KANA_ITEMS } from "@/lib/kana-data";
import type { KanaItem } from "@/lib/kana-data";
import type { KanaQuestionType, KanaSessionMode } from "@/lib/kana-data";
import KanaTraceCanvas from "@/components/KanaTraceCanvas";
import {
  loadKanaProgress,
  saveKanaProgress,
  applyKanaRating,
} from "@/lib/kana-progress";
import type { KanaProgressMap } from "@/lib/kana-progress";
import { buildKanaSmartSessionItemsWithFocus } from "@/lib/kana-smart";
import { hasKanaTraceData } from "@/lib/kana-trace";

type QuizQuestion = {
  item: KanaItem;
  taskType: KanaQuestionType;
  options: string[];
  matchPairs?: MatchPair[];
  matchRightItems?: KanaItem[];
};

type MissedKana = {
  kana: string;
  romaji: string;
  id: string;
};

type QuestionResult = {
  item: KanaItem;
  correct: boolean;
  userAnswer: string;
  missedItems?: MissedKana[];
};

type MatchPair = {
  key: string;
  hiragana: KanaItem;
  katakana: KanaItem;
};

type MatchSelection = {
  side: "hiragana" | "katakana";
  pairKey: string;
  id: string;
};

type Phase = "question" | "traceReview" | "feedback";
type KanaAnim = "idle" | "bounce" | "shake";
type TraceCompletion = { retries: number; strokes: number };
const MIXED_TASK_WEIGHTS: Array<{ type: KanaQuestionType; weight: number }> = [
  { type: "kana_to_romaji_choice", weight: 0.3 },
  { type: "romaji_to_kana_choice", weight: 0.25 },
  { type: "kana_to_romaji_input", weight: 0.25 },
  { type: "hiragana_katakana_match", weight: 0.1 },
  { type: "romaji_to_kana_trace", weight: 0.1 },
];

function formatQuizContext(primary: string, secondary: string, sets: string[]) {
  if (primary || secondary) {
    return `${primary}${secondary ? ` · ${secondary}` : ""}`.trim();
  }

  const uniqueSets = [...new Set(sets.filter(Boolean))];
  if (uniqueSets.length === 1) {
    if (uniqueSets[0] === "hiragana") return "Hiragana";
    if (uniqueSets[0] === "katakana") return "Katakana";
    if (uniqueSets[0] === "dakuon") return "Dakuten";
    if (uniqueSets[0] === "handakuon") return "Handakuten";
    if (uniqueSets[0] === "yoon") return "Combinaciones";
  }

  if (uniqueSets.length === 2 && uniqueSets.includes("hiragana") && uniqueSets.includes("katakana")) {
    return "Hiragana y Katakana";
  }

  return "Kana";
}

function buildPool(mode: string, sets: string[]): KanaItem[] {
  if (mode === "smart" || mode === "repeat") return KANA_ITEMS;
  const pool: KanaItem[] = [];
  const includesHiragana = sets.includes("hiragana");
  const includesKatakana = sets.includes("katakana");
  const hasScriptFilter = includesHiragana || includesKatakana;
  const matchesSelectedScript = (item: KanaItem) => {
    if (!hasScriptFilter) return true;
    if (item.script === "hiragana") return includesHiragana;
    if (item.script === "katakana") return includesKatakana;
    return true;
  };
  for (const key of sets) {
    if (key === "hiragana") pool.push(...KANA_ITEMS.filter((i) => i.script === "hiragana" && i.set === "basic"));
    else if (key === "katakana") pool.push(...KANA_ITEMS.filter((i) => i.script === "katakana" && i.set === "basic"));
    else if (key === "dakuon") pool.push(...KANA_ITEMS.filter((i) => i.set === "dakuten" && matchesSelectedScript(i)));
    else if (key === "handakuon") pool.push(...KANA_ITEMS.filter((i) => i.set === "handakuten" && matchesSelectedScript(i)));
    else if (key === "yoon") pool.push(...KANA_ITEMS.filter((i) => i.set === "yoon" && matchesSelectedScript(i)));
  }
  const seen = new Set<string>();
  return pool.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getOptions(correctItem: KanaItem, pool: KanaItem[]): string[] {
  const correct = correctItem.romaji;
  const uniqueWrong = [...new Set(pool.map((i) => i.romaji).filter((r) => r !== correct))];
  const sameScriptWrong = [
    ...new Set(
      KANA_ITEMS.filter((i) => i.script === correctItem.script)
        .map((i) => i.romaji)
        .filter((r) => r !== correct),
    ),
  ];
  const finalPool =
    uniqueWrong.length < 3
      ? sameScriptWrong.length >= 3
        ? sameScriptWrong
        : [...new Set(KANA_ITEMS.map((i) => i.romaji).filter((r) => r !== correct))]
      : uniqueWrong;
  const wrong3 = shuffle(finalPool).slice(0, 3);
  return shuffle([correct, ...wrong3]);
}

function getKanaOptions(correctItem: KanaItem, pool: KanaItem[]): string[] {
  const correct = correctItem.kana;
  const uniqueWrong = [...new Set(pool.map((i) => i.kana).filter((kana) => kana !== correct))];
  const sameScriptWrong = [
    ...new Set(
      KANA_ITEMS.filter((i) => i.script === correctItem.script)
        .map((i) => i.kana)
        .filter((kana) => kana !== correct),
    ),
  ];
  const finalPool =
    uniqueWrong.length < 3
      ? sameScriptWrong.length >= 3
        ? sameScriptWrong
        : [...new Set(KANA_ITEMS.map((i) => i.kana).filter((kana) => kana !== correct))]
      : uniqueWrong;
  const wrong3 = shuffle(finalPool).slice(0, 3);
  return shuffle([correct, ...wrong3]);
}

function getTraceReadingOptions(correctItem: KanaItem, pool: KanaItem[]): string[] {
  const sameScriptPool = pool.filter((item) => item.script === correctItem.script);
  const sameSetPool = sameScriptPool.filter((item) => item.set === correctItem.set);
  const preferredPool = sameSetPool.length >= 4 ? sameSetPool : sameScriptPool;
  return getOptions(correctItem, preferredPool.length > 0 ? preferredPool : KANA_ITEMS);
}

function isProgressSeen(progress: KanaProgressMap, item: KanaItem) {
  return (progress[item.id]?.timesSeen ?? 0) > 0;
}

function getBasicItem(script: "hiragana" | "katakana", romaji: string) {
  return KANA_ITEMS.find((item) => item.script === script && item.set === "basic" && item.romaji === romaji) ?? null;
}

function getIntroducedBasicPairs(progress: KanaProgressMap, pool: KanaItem[], mode: string): MatchPair[] {
  const poolIds = new Set(pool.map((item) => item.id));
  const hiraganaBasic = KANA_ITEMS.filter((item) => item.script === "hiragana" && item.set === "basic");
  const hiraganaBasicComplete = hiraganaBasic.every((item) => isProgressSeen(progress, item));
  const katakanaBasicStarted = KANA_ITEMS.some(
    (item) => item.script === "katakana" && item.set === "basic" && isProgressSeen(progress, item),
  );

  if (!hiraganaBasicComplete || !katakanaBasicStarted) return [];

  return hiraganaBasic
    .map((hiragana) => {
      const katakana = getBasicItem("katakana", hiragana.romaji);
      if (!katakana) return null;
      if (!isProgressSeen(progress, hiragana) || !isProgressSeen(progress, katakana)) return null;
      if (mode !== "smart" && (!poolIds.has(hiragana.id) || !poolIds.has(katakana.id))) return null;
      return {
        key: hiragana.romaji,
        hiragana,
        katakana,
      } satisfies MatchPair;
    })
    .filter((pair): pair is MatchPair => Boolean(pair));
}

function buildWeightedTaskSequence(length: number, availableTypes: KanaQuestionType[]): KanaQuestionType[] {
  if (length <= 0) return [];
  const available = MIXED_TASK_WEIGHTS.filter((entry) => availableTypes.includes(entry.type));
  if (available.length === 0) return Array.from({ length }, () => "kana_to_romaji_choice");

  const totalWeight = available.reduce((sum, entry) => sum + entry.weight, 0);
  const counts = new Map<KanaQuestionType, number>();
  const fractions = available.map((entry) => {
    const exact = (length * entry.weight) / totalWeight;
    const base = Math.floor(exact);
    counts.set(entry.type, base);
    return { type: entry.type, fraction: exact - base };
  });

  let remaining = length - [...counts.values()].reduce((sum, count) => sum + count, 0);
  for (const entry of fractions.sort((a, b) => b.fraction - a.fraction)) {
    if (remaining <= 0) break;
    counts.set(entry.type, (counts.get(entry.type) ?? 0) + 1);
    remaining -= 1;
  }

  const tasks: KanaQuestionType[] = [];
  let previous: KanaQuestionType | null = null;

  while (tasks.length < length && [...counts.values()].some((count) => count > 0)) {
    const candidates = [...counts.entries()]
      .filter(([, count]) => count > 0)
      .sort((left, right) => right[1] - left[1])
      .map(([type]) => type);
    const nonRepeating = candidates.find((type) => type !== previous);
    const nextType = nonRepeating ?? candidates[0];
    tasks.push(nextType);
    counts.set(nextType, (counts.get(nextType) ?? 0) - 1);
    previous = nextType;
  }

  return tasks;
}

function takeMatchPairs(deck: MatchPair[], cursor: number) {
  const pairs: MatchPair[] = [];
  if (deck.length < 4) return { pairs, cursor };
  let nextCursor = cursor;
  while (pairs.length < 4) {
    pairs.push(deck[nextCursor % deck.length]);
    nextCursor += 1;
  }
  return { pairs, cursor: nextCursor };
}

function getLegacyTaskMode(rawDifficulty: string | null): KanaSessionMode {
  if (!rawDifficulty) return "mixed";
  return "mixed";
}

function getQuestionTaskLabel(taskType: KanaQuestionType) {
  if (taskType === "kana_to_romaji_choice") return "Kana → romaji";
  if (taskType === "romaji_to_kana_choice") return "Romaji → kana";
  if (taskType === "kana_to_romaji_input") return "Escribir romaji";
  if (taskType === "hiragana_katakana_match") return "Pares de kana";
  return "Trazar";
}

function getQuestionInstruction(taskType: KanaQuestionType) {
  if (taskType === "kana_to_romaji_choice") return "Toca el romaji correcto.";
  if (taskType === "romaji_to_kana_choice") return "Toca el kana correcto.";
  if (taskType === "kana_to_romaji_input") return "Escribe su lectura en romaji.";
  if (taskType === "hiragana_katakana_match") return "Conecta cada hiragana con su katakana.";
  return "Traza el kana siguiendo la guía.";
}

function getQuestionPromptValue(question: QuizQuestion) {
  if (question.taskType === "romaji_to_kana_choice" || question.taskType === "romaji_to_kana_trace") {
    return question.item.romaji;
  }
  if (question.taskType === "hiragana_katakana_match") return "かな ⇄ カナ";
  return question.item.kana;
}

function getQuestionPromptKind(taskType: KanaQuestionType) {
  if (taskType === "hiragana_katakana_match") return "text";
  if (taskType === "romaji_to_kana_choice" || taskType === "romaji_to_kana_trace") return "romaji";
  return "kana";
}

function isInputTask(taskType: KanaQuestionType) {
  return taskType === "kana_to_romaji_input";
}

function getCorrectChoiceValue(question: QuizQuestion) {
  return question.taskType === "romaji_to_kana_choice" ? question.item.kana : question.item.romaji;
}

function isCorrectChoiceAnswer(question: QuizQuestion, answer: string) {
  if (question.taskType === "romaji_to_kana_choice") {
    return answer === question.item.kana;
  }
  return isCorrectAnswer(question.item, answer);
}

function isCorrectAnswer(item: KanaItem, answer: string): boolean {
  const a = answer.trim().toLowerCase();
  return a === item.romaji || (item.alternatives?.includes(a) ?? false);
}

function buildQuiz(
  mode: string,
  sets: string[],
  taskMode: KanaSessionMode,
  count: number,
  itemIds: string[],
  focusItemIds: string[],
  progress: KanaProgressMap
): QuizQuestion[] {
  let items: KanaItem[];
  const smartPool = mode === "smart" && itemIds.length > 0
    ? KANA_ITEMS.filter((item) => itemIds.includes(item.id))
    : null;
  const pool = smartPool && smartPool.length > 0 ? smartPool : buildPool(mode, sets);

  if (mode === "repeat") {
    const idSet = new Set(itemIds);
    items = KANA_ITEMS.filter((i) => idSet.has(i.id));
  } else if (mode === "smart") {
    items = buildKanaSmartSessionItemsWithFocus(pool, progress, count, focusItemIds);
  } else {
    items = shuffle(pool).slice(0, Math.min(count, pool.length));
  }

  const effectivePool = pool.length > 0 ? pool : KANA_ITEMS;
  const traceItems = items.filter((item) => hasKanaTraceData(item.kana));
  const matchDeck = shuffle(getIntroducedBasicPairs(progress, effectivePool, mode));
  const availableTaskTypes: KanaQuestionType[] = [
    "kana_to_romaji_choice",
    "romaji_to_kana_choice",
    "kana_to_romaji_input",
  ];

  if (traceItems.length > 0) {
    availableTaskTypes.push("romaji_to_kana_trace");
  }

  if (matchDeck.length >= 4) {
    availableTaskTypes.push("hiragana_katakana_match");
  }

  const taskSequence = buildWeightedTaskSequence(items.length, availableTaskTypes);
  let itemCursor = 0;
  let traceCursor = 0;
  let matchCursor = 0;

  return taskSequence.map((taskType) => {
    if (taskType === "hiragana_katakana_match") {
      const matchResult = takeMatchPairs(matchDeck, matchCursor);
      matchCursor = matchResult.cursor;
      const matchPairs = matchResult.pairs;
      const item = matchPairs[0]?.hiragana ?? items[itemCursor % items.length];
      return {
        item,
        taskType,
        options: [],
        matchPairs,
        matchRightItems: shuffle(matchPairs.map((pair) => pair.katakana)),
      };
    }

    const item =
      taskType === "romaji_to_kana_trace"
        ? traceItems[traceCursor++ % traceItems.length]
        : items[itemCursor++ % items.length];
    const options =
      taskType === "romaji_to_kana_choice"
        ? getKanaOptions(item, effectivePool)
        : taskType === "kana_to_romaji_choice"
          ? getOptions(item, effectivePool)
          : taskType === "romaji_to_kana_trace"
            ? getTraceReadingOptions(item, effectivePool)
          : [];

    return {
      item,
      taskType,
      options,
    };
  });
}

// Framer Motion variants — use `Variants` type so TypeScript accepts easing strings
const kanaEnter: Variants = {
  initial: { x: 60, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.25, ease: "easeOut" } },
  exit: { x: -40, opacity: 0, transition: { duration: 0.15, ease: "easeIn" } },
};

const bounceVariants: Variants = {
  idle: { y: 0 },
  bounce: {
    y: [0, -8, 0],
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

const shakeVariants: Variants = {
  idle: { x: 0 },
  shake: {
    x: [0, -10, 10, -6, 6, 0],
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

function QuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = searchParams.get("mode") ?? "smart";
  const sets = (searchParams.get("sets") ?? "hiragana").split(",");
  const taskMode: KanaSessionMode = getLegacyTaskMode(
    searchParams.get("taskMode") ?? searchParams.get("difficulty"),
  );
  const count = parseInt(searchParams.get("count") ?? "20", 10);
  const itemIds = (searchParams.get("items") ?? "").split(",").filter(Boolean);
  const focusItemIds = (searchParams.get("focusItems") ?? "").split(",").filter(Boolean);
  const contextPrimary = searchParams.get("contextPrimary") ?? "";
  const contextSecondary = searchParams.get("contextSecondary") ?? "";

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [kanaKey, setKanaKey] = useState(0); // trigger re-mount for entrance animation
  const [phase, setPhase] = useState<Phase>("question");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [scaledOption, setScaledOption] = useState<string | null>(null); // for correct-button scale
  const [kanaAnim, setKanaAnim] = useState<KanaAnim>("idle");
  const [textAnswer, setTextAnswer] = useState("");
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [progressMap, setProgressMap] = useState<KanaProgressMap>({});
  const [traceCompletion, setTraceCompletion] = useState<TraceCompletion | null>(null);
  const [matchSelection, setMatchSelection] = useState<MatchSelection | null>(null);
  const [matchedPairKeys, setMatchedPairKeys] = useState<string[]>([]);
  const [matchMistakes, setMatchMistakes] = useState(0);
  const [matchWrongPairKey, setMatchWrongPairKey] = useState<string | null>(null);
  const [matchMistakePairKeys, setMatchMistakePairKeys] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const prog = loadKanaProgress("anon");
    setProgressMap(prog);
    const quiz = buildQuiz(mode, sets, taskMode, count, itemIds, focusItemIds, prog);
    setQuestions(quiz);
    setIsReady(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentQ = questions[currentIndex];
  const isTraceQuestion = currentQ?.taskType === "romaji_to_kana_trace";
  const isMatchQuestion = currentQ?.taskType === "hiragana_katakana_match";
  const progressPct = questions.length > 0 ? (currentIndex / questions.length) * 100 : 0;

  useEffect(() => {
    if (!isTraceQuestion) return;

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousHtmlOverscroll = html.style.overscrollBehavior;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;

    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      html.style.overscrollBehavior = previousHtmlOverscroll;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [isTraceQuestion]);

  useEffect(() => {
    if (!currentQ || !isInputTask(currentQ.taskType) || phase !== "question") return;

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [currentQ?.item.id, currentQ?.taskType, phase]);

  const advance = useCallback(
    (result: QuestionResult, updatedProgress: KanaProgressMap) => {
      const newResults = [...results, result];
      setResults(newResults);

      if (currentIndex + 1 >= questions.length) {
        const missedMap = new Map<string, MissedKana>();
        newResults.forEach((result) => {
          const missedItems =
            result.missedItems ??
            (!result.correct ? [{ kana: result.item.kana, romaji: result.item.romaji, id: result.item.id }] : []);
          missedItems.forEach((item) => missedMap.set(item.id, item));
        });
        const missed = [...missedMap.values()];
        sessionStorage.setItem(
          "kana-quiz-results",
          JSON.stringify({
            total: newResults.length,
            correct: newResults.filter((r) => r.correct).length,
            missed,
            mode,
            taskMode,
          })
        );
        router.push("/kana/resultados");
      } else {
        setCurrentIndex((i) => i + 1);
        setKanaKey((k) => k + 1);
        setPhase("question");
        setSelectedOption(null);
        setScaledOption(null);
        setKanaAnim("idle");
        setTextAnswer("");
        setTraceCompletion(null);
        setMatchSelection(null);
        setMatchedPairKeys([]);
        setMatchMistakes(0);
        setMatchWrongPairKey(null);
        setMatchMistakePairKeys([]);
      }
    },
    [results, currentIndex, questions.length, mode, taskMode, router]
  );

  function handleOptionSelect(option: string) {
    if (phase !== "question" || !currentQ) return;
    setSelectedOption(option);
    setPhase("feedback");

    const correct = isCorrectChoiceAnswer(currentQ, option);
    const updated = applyKanaRating(progressMap, currentQ.item, correct ? "correct" : "wrong");
    setProgressMap(updated);
    saveKanaProgress("anon", updated);

    if (correct) {
      setScaledOption(option);
      setKanaAnim("bounce");
      setTimeout(() => advance({ item: currentQ.item, correct, userAnswer: option }, updated), 800);
    } else {
      setKanaAnim("shake");
      setTimeout(() => advance({ item: currentQ.item, correct, userAnswer: option }, updated), 1200);
    }
  }

  function handleConfirm() {
    if (phase !== "question" || !currentQ || !textAnswer.trim()) return;
    setPhase("feedback");

    const correct = isCorrectAnswer(currentQ.item, textAnswer);
    const updated = applyKanaRating(progressMap, currentQ.item, correct ? "correct" : "wrong");
    setProgressMap(updated);
    saveKanaProgress("anon", updated);

    if (correct) {
      setKanaAnim("bounce");
    } else {
      setKanaAnim("shake");
    }

    setTimeout(
      () => advance({ item: currentQ.item, correct, userAnswer: textAnswer.trim() }, updated),
      correct ? 800 : 1200
    );
  }

  function handleTraceComplete(result: TraceCompletion) {
    if (!currentQ || phase !== "question") return;
    setTraceCompletion(result);
    setSelectedOption(null);
    setScaledOption(null);
    setKanaAnim("bounce");
    setPhase("traceReview");
  }

  function handleTraceReviewSelect(option: string) {
    if (!currentQ || phase !== "traceReview" || !traceCompletion) return;
    setSelectedOption(option);
    setPhase("feedback");

    const correct = isCorrectAnswer(currentQ.item, option);
    const rating = correct && traceCompletion.retries === 0 ? "correct" : "almost";
    const updated = applyKanaRating(progressMap, currentQ.item, rating);
    setProgressMap(updated);
    saveKanaProgress("anon", updated);
    setKanaAnim(correct ? "bounce" : "shake");
    if (correct) setScaledOption(option);

    setTimeout(
      () => advance({ item: currentQ.item, correct, userAnswer: option }, updated),
      correct ? 720 : 1050,
    );
  }

  function completeMatchQuestion(nextMistakes: number) {
    if (!currentQ?.matchPairs?.length || phase !== "question") return;

    const mistakeKeySet = new Set(matchMistakePairKeys);
    const missedPairs =
      mistakeKeySet.size > 0
        ? currentQ.matchPairs.filter((pair) => mistakeKeySet.has(pair.key))
        : nextMistakes > 0
          ? currentQ.matchPairs
          : [];
    const updated = currentQ.matchPairs.reduce((nextProgress, pair) => {
      const pairHadMistake = mistakeKeySet.size > 0 ? mistakeKeySet.has(pair.key) : nextMistakes > 0;
      const rating = pairHadMistake ? "almost" : "correct";
      const afterHiragana = applyKanaRating(nextProgress, pair.hiragana, rating);
      return applyKanaRating(afterHiragana, pair.katakana, rating);
    }, progressMap);

    setProgressMap(updated);
    saveKanaProgress("anon", updated);
    setKanaAnim(nextMistakes === 0 ? "bounce" : "shake");
    setPhase("feedback");

    window.setTimeout(
      () =>
        advance(
          {
            item: currentQ.item,
            correct: nextMistakes === 0,
            userAnswer: nextMistakes === 0 ? "pares completos" : `${nextMistakes} errores`,
            missedItems: missedPairs.flatMap((pair) => [
              { kana: pair.hiragana.kana, romaji: pair.hiragana.romaji, id: pair.hiragana.id },
              { kana: pair.katakana.kana, romaji: pair.katakana.romaji, id: pair.katakana.id },
            ]),
          },
          updated,
        ),
      nextMistakes === 0 ? 850 : 1050,
    );
  }

  function handleMatchSelect(side: "hiragana" | "katakana", item: KanaItem) {
    if (!isMatchQuestion || !currentQ?.matchPairs || phase !== "question") return;

    const pair = currentQ.matchPairs.find((entry) =>
      side === "hiragana" ? entry.hiragana.id === item.id : entry.katakana.id === item.id,
    );
    if (!pair || matchedPairKeys.includes(pair.key)) return;

    const nextSelection: MatchSelection = { side, pairKey: pair.key, id: item.id };
    if (!matchSelection || matchSelection.side === side) {
      setMatchSelection(nextSelection);
      return;
    }

    if (matchSelection.pairKey !== pair.key) {
      const nextMistakes = matchMistakes + 1;
      const nextMistakePairKeys = [...new Set([...matchMistakePairKeys, matchSelection.pairKey, pair.key])];
      setMatchMistakes(nextMistakes);
      setMatchMistakePairKeys(nextMistakePairKeys);
      setMatchWrongPairKey(pair.key);
      setMatchSelection(null);
      window.setTimeout(() => setMatchWrongPairKey(null), 420);
      return;
    }

    const nextMatched = [...matchedPairKeys, pair.key];
    setMatchedPairKeys(nextMatched);
    setMatchSelection(null);

    if (nextMatched.length >= currentQ.matchPairs.length) {
      completeMatchQuestion(matchMistakes);
    }
  }

  function handleExit() {
    saveKanaProgress("anon", progressMap);
    if (confirm("Puedes salir ahora. Guardaremos lo que ya practicaste.")) {
      router.push("/kana");
    }
  }

  if (!isReady && questions.length === 0) {
    return (
      <div
        style={{
          background: "#FFF8E7",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "#53596B", fontSize: "16px" }}>Preparando sesión…</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div
        style={{
          background: "#FFF8E7",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "#53596B", fontSize: "16px" }}>Preparando quiz…</p>
      </div>
    );
  }

  if (!currentQ) return null;

  const feedbackIsInputCorrect = phase === "feedback" && isCorrectAnswer(currentQ.item, textAnswer);
  const quizContext = formatQuizContext(contextPrimary, contextSecondary, sets);
  const questionModeLabel = getQuestionTaskLabel(currentQ.taskType);
  const questionInstruction = getQuestionInstruction(currentQ.taskType);
  const promptKind = getQuestionPromptKind(currentQ.taskType);
  const promptValue = getQuestionPromptValue(currentQ);
  const correctChoiceValue = getCorrectChoiceValue(currentQ);
  const feedbackIsCorrect = isInputTask(currentQ.taskType)
    ? feedbackIsInputCorrect
    : isMatchQuestion
      ? phase === "feedback" && matchMistakes === 0
      : selectedOption === correctChoiceValue;
  const feedbackLabel = feedbackIsCorrect
    ? "Correcto"
    : isMatchQuestion && phase === "feedback"
      ? "Revisa los pares marcados"
    : isTraceQuestion && phase === "feedback"
      ? "Trazo guardado · revisa lectura"
      : "No era esa";
  const feedbackNeedsSoftReview = isTraceQuestion && phase === "feedback" && !feedbackIsCorrect;
  const feedbackBg = feedbackIsCorrect
    ? "rgba(78,205,196,0.14)"
    : feedbackNeedsSoftReview
      ? "rgba(245,158,11,0.14)"
      : "rgba(230,57,70,0.12)";
  const feedbackColor = feedbackIsCorrect ? "#178A83" : feedbackNeedsSoftReview ? "#9A5B00" : "#C53340";
  const matchReviewCount = new Set(matchMistakePairKeys).size;
  const sharedCardStyle = {
    background: "#FFFFFF",
    borderRadius: "28px",
    boxShadow: "0 10px 28px rgba(26,26,46,0.08)",
  } as const;

  if (isTraceQuestion) {
    return (
      <div
        style={{
          background: "#FFF8E7",
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "44px 20px 0",
            display: "grid",
            gap: "12px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <button
              onClick={handleExit}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                flexShrink: 0,
              }}
              aria-label="Salir"
              title="Salir y guardar progreso"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M19 12H5M12 5l-7 7 7 7"
                  stroke="#1A1A2E"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div style={{ flex: 1, display: "grid", gap: "8px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#53596B",
                  }}
                >
                  Trazando
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#7A7F8D",
                    whiteSpace: "nowrap",
                  }}
                >
                  {currentIndex + 1} / {questions.length}
                </div>
              </div>
              <div
                style={{
                  height: "6px",
                  background: "#E5E7EB",
                  borderRadius: "999px",
                  overflow: "hidden",
                }}
              >
                <motion.div
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  style={{
                    height: "100%",
                    background: "#4ECDC4",
                    borderRadius: "999px",
                  }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                borderRadius: "999px",
                background: "#FFFFFF",
                color: "#53596B",
                fontSize: "12px",
                fontWeight: 700,
                padding: "8px 12px",
                boxShadow: "0 2px 10px rgba(26,26,46,0.08)",
              }}
            >
              {quizContext}
            </div>
            <div
              style={{
                borderRadius: "999px",
                background: "rgba(78,205,196,0.12)",
                color: "#178A83",
                fontSize: "12px",
                fontWeight: 700,
                padding: "8px 12px",
              }}
            >
              Trazar
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flex: 1,
            minHeight: 0,
            padding: "12px 20px 20px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              ...sharedCardStyle,
              width: "100%",
              maxWidth: "420px",
              height: "100%",
              maxHeight: "100%",
              padding: "18px 18px 16px",
              display: "grid",
              gridTemplateRows: "auto auto 1fr auto",
              gap: "12px",
            }}
          >
            <div style={{ display: "grid", gap: "8px", textAlign: "center" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#8A8F9B",
                }}
              >
                {questionModeLabel}
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  color: "#1A1A2E",
                  lineHeight: 1.1,
                }}
              >
                Sigue la guía
              </div>
              <p
                style={{
                  fontSize: "14px",
                  color: "#6E737F",
                  margin: 0,
                  lineHeight: 1.35,
                }}
              >
                {questionInstruction}
              </p>
            </div>

            {phase === "question" ? (
              <KanaTraceCanvas
                key={`${currentQ.item.id}-${currentIndex}`}
                kana={currentQ.item.kana}
                disabled={false}
                onKanaComplete={handleTraceComplete}
              />
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "12px",
                  minHeight: 0,
                  alignSelf: "stretch",
                }}
              >
                <div
                  style={{
                    borderRadius: "24px",
                    background: "#FAF7F1",
                    padding: "16px",
                    display: "grid",
                    gap: "8px",
                    textAlign: "center",
                    boxShadow: "inset 0 0 0 1px rgba(26,26,46,0.05)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#8A8F9B",
                    }}
                  >
                    Reconocimiento
                  </div>
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: 800,
                      color: "#1A1A2E",
                      lineHeight: 1.1,
                    }}
                  >
                    ¿Cómo se lee?
                  </div>
                  <div
                    style={{
                      borderRadius: "999px",
                      background:
                        phase === "feedback"
                          ? feedbackIsCorrect
                            ? "rgba(78,205,196,0.16)"
                            : "rgba(230,57,70,0.12)"
                          : "rgba(78,205,196,0.12)",
                      color: phase === "feedback" ? feedbackColor : "#178A83",
                      padding: "8px 12px",
                      fontSize: "13px",
                      fontWeight: 800,
                      justifySelf: "center",
                    }}
                  >
                    {phase === "feedback" ? feedbackLabel : "Elige la lectura"}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: "10px",
                  }}
                >
                  {currentQ.options.map((option) => {
                    const isSelected = selectedOption === option;
                    const isCorrect = isCorrectAnswer(currentQ.item, option);
                    const showCorrect = phase === "feedback" && isCorrect;
                    const showWrong = phase === "feedback" && isSelected && !isCorrect;
                    return (
                      <motion.button
                        key={option}
                        type="button"
                        onClick={() => handleTraceReviewSelect(option)}
                        disabled={phase !== "traceReview"}
                        animate={{ scale: scaledOption === option ? [1, 1.04, 1] : 1 }}
                        transition={{ duration: 0.24 }}
                        style={{
                          border: "none",
                          borderRadius: "22px",
                          background: showCorrect
                            ? "#4ECDC4"
                            : showWrong
                              ? "#E63946"
                              : "#FFFFFF",
                          color: showCorrect || showWrong ? "#FFFFFF" : "#1A1A2E",
                          minHeight: "72px",
                          padding: "12px",
                          fontSize: "22px",
                          fontWeight: 800,
                          cursor: phase === "traceReview" ? "pointer" : "default",
                          boxShadow: "0 8px 20px rgba(26,26,46,0.07)",
                        }}
                      >
                        {option}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          padding: "52px 20px 0",
          display: "grid",
          gap: "14px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <button
            onClick={handleExit}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              flexShrink: 0,
            }}
            aria-label="Salir"
            title="Salir y guardar progreso"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="#E63946"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <div style={{ flex: 1, display: "grid", gap: "8px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#53596B",
                }}
              >
                Practicando
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#7A7F8D",
                  whiteSpace: "nowrap",
                }}
              >
                {currentIndex + 1} / {questions.length}
              </div>
            </div>
            <div
              style={{
                height: "6px",
                background: "#E5E7EB",
                borderRadius: "999px",
                overflow: "hidden",
              }}
            >
              <motion.div
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                style={{
                  height: "100%",
                  background: "#4ECDC4",
                  borderRadius: "999px",
                }}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              borderRadius: "999px",
              background: "#FFFFFF",
              color: "#53596B",
              fontSize: "12px",
              fontWeight: 700,
              padding: "8px 12px",
              boxShadow: "0 2px 10px rgba(26,26,46,0.08)",
            }}
          >
            {quizContext}
          </div>
          <div
            style={{
              borderRadius: "999px",
              background: "rgba(230,57,70,0.10)",
              color: "#C53340",
              fontSize: "12px",
              fontWeight: 700,
              padding: "8px 12px",
            }}
          >
            {questionModeLabel}
          </div>
        </div>
      </div>

      {/* Kana character */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          padding: "18px 20px 16px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            ...sharedCardStyle,
            width: "100%",
            maxWidth: "420px",
            padding: "26px 20px 24px",
            display: "grid",
            justifyItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#8A8F9B",
            }}
          >
            {questionModeLabel}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={kanaKey}
              variants={kanaEnter}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
            >
              <motion.div
                variants={kanaAnim === "bounce" ? bounceVariants : shakeVariants}
                animate={kanaAnim}
                style={{
                  fontSize: isMatchQuestion ? "42px" : promptKind === "kana" ? "112px" : "64px",
                  fontWeight: 700,
                  color: "#1A1A2E",
                  lineHeight: 1,
                  fontFamily:
                    promptKind === "kana" || isMatchQuestion ? "var(--font-noto-sans-jp), sans-serif" : "inherit",
                  userSelect: "none",
                  textAlign: "center",
                }}
              >
                {promptValue}
              </motion.div>
            </motion.div>
          </AnimatePresence>

          <p
            style={{
              fontSize: "15px",
              color: "#6E737F",
              margin: 0,
              textAlign: "center",
            }}
          >
            {questionInstruction}
          </p>
        </div>

        {phase === "feedback" && (
          <div
            style={{
              marginTop: "14px",
              borderRadius: "999px",
              background: feedbackBg,
              color: feedbackColor,
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: 800,
              letterSpacing: "0.02em",
            }}
          >
            {feedbackLabel}
          </div>
        )}
      </div>

      {/* Answer area */}
      {isMatchQuestion ? (
        <div style={{ padding: "0 20px 40px" }}>
          <div
            style={{
              ...sharedCardStyle,
              padding: "16px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            <div style={{ display: "grid", gap: "10px" }}>
              {(currentQ.matchPairs ?? []).map((pair) => {
                const matched = matchedPairKeys.includes(pair.key);
                const selected = matchSelection?.id === pair.hiragana.id;
                const needsReview = phase === "feedback" && matchMistakePairKeys.includes(pair.key);
                return (
                  <button
                    key={pair.hiragana.id}
                    type="button"
                    onClick={() => handleMatchSelect("hiragana", pair.hiragana)}
                    disabled={phase !== "question" || matched}
                    style={{
                      minHeight: "66px",
                      border: "none",
                      borderRadius: "20px",
                      background: needsReview
                        ? "rgba(230,57,70,0.12)"
                        : matched
                          ? "rgba(78,205,196,0.18)"
                          : selected
                            ? "#1A1A2E"
                            : "#F7F3ED",
                      color: needsReview ? "#C53340" : matched ? "#178A83" : selected ? "#FFFFFF" : "#1A1A2E",
                      fontSize: "30px",
                      fontWeight: 800,
                      fontFamily: "var(--font-noto-sans-jp), sans-serif",
                      cursor: phase === "question" && !matched ? "pointer" : "default",
                      transition: "background 0.16s, color 0.16s, transform 0.16s",
                      transform: matched ? "scale(0.98)" : "scale(1)",
                    }}
                  >
                    {pair.hiragana.kana}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "grid", gap: "10px" }}>
              {(currentQ.matchRightItems ?? []).map((item) => {
                const pair = currentQ.matchPairs?.find((entry) => entry.katakana.id === item.id);
                const pairKey = pair?.key ?? item.id;
                const matched = matchedPairKeys.includes(pairKey);
                const selected = matchSelection?.id === item.id;
                const wrong = matchWrongPairKey === pairKey;
                const needsReview = phase === "feedback" && matchMistakePairKeys.includes(pairKey);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleMatchSelect("katakana", item)}
                    disabled={phase !== "question" || matched}
                    style={{
                      minHeight: "66px",
                      border: "none",
                      borderRadius: "20px",
                      background: matched
                        ? needsReview
                          ? "rgba(230,57,70,0.12)"
                          : "rgba(78,205,196,0.18)"
                        : wrong
                          ? "rgba(230,57,70,0.16)"
                          : selected
                            ? "#1A1A2E"
                            : "#FFFFFF",
                      color: needsReview ? "#C53340" : matched ? "#178A83" : selected ? "#FFFFFF" : "#1A1A2E",
                      fontSize: "30px",
                      fontWeight: 800,
                      fontFamily: "var(--font-noto-sans-jp), sans-serif",
                      cursor: phase === "question" && !matched ? "pointer" : "default",
                      boxShadow: matched ? "none" : "0 4px 14px rgba(26,26,46,0.06)",
                      transition: "background 0.16s, color 0.16s, transform 0.16s",
                      transform: wrong ? "translateX(2px)" : matched ? "scale(0.98)" : "scale(1)",
                    }}
                  >
                    {item.kana}
                  </button>
                );
              })}
            </div>
          </div>
          <div
            style={{
              minHeight: "24px",
              textAlign: "center",
              fontSize: "14px",
              fontWeight: 700,
              color: phase === "feedback" ? feedbackColor : "#8A8F9B",
              marginTop: "12px",
            }}
          >
            {phase === "feedback"
              ? matchMistakes === 0
                ? "Pares completados sin errores"
                : `${matchReviewCount || matchMistakes} ${matchReviewCount === 1 ? "par necesita" : "pares necesitan"} otra vuelta`
              : matchSelection
                ? "Ahora toca su pareja"
                : "Toca un hiragana y su katakana"}
          </div>
        </div>
      ) : isInputTask(currentQ.taskType) ? (
        /* Kana -> romaji input */
        <div style={{ padding: "0 20px 40px" }}>
          <div
            style={{
              ...sharedCardStyle,
              padding: "20px 18px 18px",
              display: "grid",
              gap: "14px",
            }}
          >
            <div
              style={{
                borderRadius: "20px",
                background: "#F7F3ED",
                border: `2px solid ${
                  phase === "feedback" ? (feedbackIsInputCorrect ? "#4ECDC4" : "#E63946") : "transparent"
                }`,
                padding: "6px 16px",
                transition: "border-color 0.2s",
              }}
            >
            <input
              ref={inputRef}
              type="text"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); }}
              disabled={phase === "feedback"}
              placeholder="Escribe el romaji"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "22px",
                fontWeight: 600,
                color: "#1A1A2E",
                textAlign: "center",
                padding: "14px 0",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div
            style={{
              minHeight: "24px",
              textAlign: "center",
              fontSize: "14px",
              fontWeight: 700,
              color: phase === "feedback" ? feedbackColor : "#8A8F9B",
            }}
          >
            {phase === "feedback"
              ? feedbackIsInputCorrect
                ? "Respuesta correcta"
                : `Respuesta: ${currentQ.item.romaji}`
              : "Pulsa Enter o toca comprobar"}
          </div>
          <button
            onClick={handleConfirm}
            disabled={phase === "feedback" || !textAnswer.trim()}
            style={{
              width: "100%",
              padding: "18px",
              borderRadius: "999px",
              border: "none",
              cursor: phase === "feedback" || !textAnswer.trim() ? "not-allowed" : "pointer",
              background:
                phase === "feedback"
                  ? feedbackIsInputCorrect
                    ? "#4ECDC4"
                    : "#E63946"
                  : "#1A1A2E",
              color: "#FFFFFF",
              fontSize: "18px",
              fontWeight: 700,
              transition: "background 0.2s",
            }}
          >
            {phase === "feedback" ? feedbackLabel : "Comprobar"}
          </button>
          </div>
        </div>
      ) : (
        /* Choice tasks */
        <div
          style={{
            padding: "0 20px 40px",
          }}
        >
          <div
            style={{
              ...sharedCardStyle,
              padding: "16px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            {currentQ.options.map((option) => {
              const isSelected = selectedOption === option;
              const isCorrectOpt = option === correctChoiceValue;
              let bg = "#FFFFFF";
              let color = "#1A1A2E";
              let borderColor = "rgba(26,26,46,0.08)";

              if (phase === "feedback") {
                if (isCorrectOpt) {
                  bg = "#4ECDC4";
                  color = "#FFFFFF";
                  borderColor = "#4ECDC4";
                } else if (isSelected) {
                  bg = "#E63946";
                  color = "#FFFFFF";
                  borderColor = "#E63946";
                }
              }

              return (
                <motion.button
                  key={option}
                  onClick={() => handleOptionSelect(option)}
                  disabled={phase === "feedback"}
                  animate={
                    scaledOption === option
                      ? { scale: [1, 1.08, 1], transition: { duration: 0.2 } }
                      : { scale: 1 }
                  }
                  style={{
                    minHeight: "78px",
                    padding: "18px 12px",
                    borderRadius: "20px",
                    border: `1px solid ${borderColor}`,
                    cursor: phase === "feedback" ? "default" : "pointer",
                    background: bg,
                    color,
                    fontSize: currentQ.taskType === "romaji_to_kana_choice" ? "34px" : "22px",
                    fontWeight: 700,
                    boxShadow: phase === "feedback" ? "none" : "0 4px 14px rgba(26,26,46,0.06)",
                    transition: "background 0.2s, color 0.2s, border-color 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    textTransform: currentQ.taskType === "romaji_to_kana_choice" ? "none" : "lowercase",
                    fontFamily:
                      currentQ.taskType === "romaji_to_kana_choice"
                        ? "var(--font-noto-sans-jp), sans-serif"
                        : "inherit",
                  }}
                >
                  {option}
                  {phase === "feedback" && isCorrectOpt && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {phase === "feedback" && isSelected && !isCorrectOpt && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  )}
                </motion.button>
              );
            })}
          </div>
          <div
            style={{
              minHeight: "24px",
              textAlign: "center",
              fontSize: "14px",
              fontWeight: 700,
              color: phase === "feedback" ? feedbackColor : "#8A8F9B",
              marginTop: "12px",
            }}
          >
            {phase === "feedback"
              ? feedbackIsCorrect
                ? "Respuesta correcta"
                : `Correcta: ${correctChoiceValue}`
              : "Toca una opción para responder"}
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense>
      <QuizContent />
    </Suspense>
  );
}
