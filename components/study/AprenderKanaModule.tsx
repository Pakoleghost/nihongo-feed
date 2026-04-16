"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import KanaHandwritingPad, { type KanaHandwritingRating } from "@/components/study/KanaHandwritingPad";
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

type AprenderKanaModuleProps = {
  userKey: string;
  onRecordActivity?: (detail?: string) => void;
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

function collectPracticeItems(
  scripts: KanaScript[],
  sets: Array<"basic" | "dakuten" | "handakuten" | "yoon">,
) {
  return uniqueKanaItems(
    scripts.flatMap((script) => sets.flatMap((set) => filterKanaItemsForSelection(script, set))),
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
  scripts: KanaScript[],
  sets: Array<"basic" | "dakuten" | "handakuten" | "yoon">,
  modes: KanaPracticeMode[],
  count: KanaQuestionCount,
  progress: KanaProgressMap,
) {
  const baseItems = collectPracticeItems(scripts, sets);
  const items = buildKanaSessionItems(baseItems, progress, count);
  const questions = buildQuestionsForItems(items, baseItems, modes);
  return { setKey: `${scripts.join("+")}:${sets.join("+")}`, modes, count, questions };
}

export default function AprenderKanaModule({ userKey, onRecordActivity }: AprenderKanaModuleProps) {
  const [screen, setScreen] = useState<"home" | "table" | "setup">("home");
  const [tableScript, setTableScript] = useState<KanaScript>("hiragana");
  const [tableFilter, setTableFilter] = useState<"basic" | "dakuten" | "handakuten" | "yoon" | "mixed">("basic");
  const [practiceScripts, setPracticeScripts] = useState<KanaScript[]>(["hiragana"]);
  const [practiceSets, setPracticeSets] = useState<Array<"basic" | "dakuten" | "handakuten" | "yoon">>(["basic"]);
  const [practiceModes, setPracticeModes] = useState<KanaPracticeMode[]>(["multiple_choice"]);
  const [questionCount, setQuestionCount] = useState<KanaQuestionCount>(20);
  const [setupError, setSetupError] = useState<string | null>(null);
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
  const progressPercent = session?.questions.length ? Math.round((Math.min(sessionIndex + 1, session.questions.length) / session.questions.length) * 100) : 0;

  useEffect(() => {
    if (currentQuestion?.mode !== "romaji_input" || sessionFinished) return;
    const timer = window.setTimeout(() => romajiInputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [currentQuestion?.mode, sessionFinished, sessionIndex]);

  const allKanaSummary = useMemo(() => getKanaProgressSummary(KANA_ITEMS, progress), [progress]);
  const tableSections = useMemo(() => getKanaTableSections(tableScript, tableFilter), [tableFilter, tableScript]);
  const practicePool = useMemo(() => collectPracticeItems(practiceScripts, practiceSets), [practiceScripts, practiceSets]);

  const subtlePillStyle: CSSProperties = {
    borderRadius: 999,
    padding: "7px 10px",
    border: "1px solid var(--color-border)",
    background: "color-mix(in srgb, var(--color-surface) 82%, white)",
    color: "var(--color-text)",
    fontSize: "var(--text-body-sm)",
    fontWeight: 700,
  };

  const togglePracticeScript = (value: KanaScript) => {
    setPracticeScripts((previous) =>
      previous.includes(value) ? previous.filter((entry) => entry !== value) : [...previous, value],
    );
    setSetupError(null);
  };

  const togglePracticeSet = (value: "basic" | "dakuten" | "handakuten" | "yoon") => {
    setPracticeSets((previous) =>
      previous.includes(value) ? previous.filter((entry) => entry !== value) : [...previous, value],
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

  const startSession = (overrideItems?: KanaItem[]) => {
    if (practiceScripts.length === 0 || practiceSets.length === 0) {
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
          setKey: `${practiceScripts.join("+")}:${practiceSets.join("+")}`,
          modes: practiceModes,
          count: overrideItems.length as KanaQuestionCount,
          questions: buildQuestionsForItems(uniqueKanaItems(overrideItems), practicePool, practiceModes),
        }
      : buildSession(practiceScripts, practiceSets, practiceModes, questionCount, progress);

    setSession(nextSession);
    setSessionIndex(0);
    setSessionResults([]);
    setMultipleChoiceAnswer(null);
    setRomajiValue("");
    setRomajiFeedback(null);
    setAnswerFeedback(null);
    setStreak(0);
    setSetupError(null);
    onRecordActivity?.(
      `${practiceScripts.map((value) => (value === "hiragana" ? "Hiragana" : "Katakana")).join(" + ")} · ${practiceSets
        .map((value) => (value === "basic" ? "Basic" : value === "dakuten" ? "Dakuten" : value === "handakuten" ? "Handakuten" : "Yōon"))
        .join(" + ")}`,
    );
  };

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
  const stageFeedbackTone =
    answerFeedback?.status === "correct"
      ? "0 0 0 1px rgba(78,205,196,.35), 0 18px 34px rgba(78,205,196,.16)"
      : answerFeedback?.status === "wrong"
        ? "0 0 0 1px rgba(230,57,70,.22), 0 18px 34px rgba(230,57,70,.1)"
        : "0 18px 34px rgba(26,26,46,.04)";
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

          <div style={{ display: "grid", gap: "var(--space-2)", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
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
              onClick={() => setScreen("setup")}
              style={{
                border: "1px solid transparent",
                background: "color-mix(in srgb, var(--color-highlight-soft) 62%, white)",
                borderRadius: 28,
                padding: "18px 18px 16px",
                textAlign: "left",
                display: "grid",
                gap: 10,
                color: "var(--color-text)",
              }}
            >
              <div style={{ fontSize: "clamp(24px, 5vw, 30px)", lineHeight: 1, fontWeight: 800 }}>Practice</div>
              <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 700 }}>
                Opción múltiple · Romaji · Escritura manual
              </div>
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
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: "var(--text-h3)", fontWeight: 800, color: "var(--color-text)" }}>Practice</div>
            <button type="button" onClick={() => setScreen("home")} className="ds-btn-ghost">
              Volver
            </button>
          </div>

          <StudySelectorGroup
            label="Script"
            options={[
              { key: "hiragana", label: "Hiragana", tone: "color-mix(in srgb, var(--color-accent-soft) 72%, white)" },
              { key: "katakana", label: "Katakana", tone: "color-mix(in srgb, rgba(69, 123, 157, 0.14) 70%, white)" },
            ]}
            values={practiceScripts}
            multiple
            onToggle={togglePracticeScript}
            minItemWidth={118}
          />

          <StudySelectorGroup
            label="Sets"
            options={[
              { key: "basic", label: "Basic" },
              { key: "dakuten", label: "Dakuten" },
              { key: "handakuten", label: "Handakuten" },
              { key: "yoon", label: "Yōon" },
            ]}
            values={practiceSets}
            multiple
            onToggle={togglePracticeSet}
            minItemWidth={112}
          />

          <StudySelectorGroup
            label="Modo"
            options={KANA_PRACTICE_MODE_OPTIONS.map((option) => ({ key: option.key, label: option.label }))}
            values={practiceModes}
            multiple
            onToggle={togglePracticeMode}
            minItemWidth={150}
          />

          <StudySelectorGroup
            label="Preguntas"
            options={KANA_QUESTION_COUNT_OPTIONS.map((value) => ({ key: String(value) as "10" | "20" | "30", label: String(value) }))}
            value={String(questionCount) as "10" | "20" | "30"}
            onSelect={(value) => setQuestionCount(Number(value) as KanaQuestionCount)}
            minItemWidth={96}
            compact
          />

          {setupError ? (
            <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-accent-strong)", fontWeight: 700 }}>
              {setupError}
            </div>
          ) : null}

          <button type="button" onClick={() => startSession()} className="ds-btn" style={{ justifySelf: "start" }}>
            Start
          </button>
        </div>
      )}

      {session && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            background: "rgba(255, 248, 231, 0.94)",
            backdropFilter: "blur(10px)",
            transform: sheetVisible ? "translateY(0)" : "translateY(100%)",
            opacity: sheetVisible ? 1 : 0,
            transition: "transform 240ms ease, opacity 220ms ease",
            display: "grid",
            overscrollBehavior: "contain",
          }}
        >
          <div style={{ minHeight: "100vh", overflowY: "auto", padding: "16px", display: "grid", alignContent: "start" }}>
            <div className="ds-container" style={{ display: "grid", gap: "var(--space-4)", paddingBottom: "calc(var(--space-8) + env(safe-area-inset-bottom))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap", paddingTop: "max(var(--space-2), env(safe-area-inset-top))" }}>
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontSize: "var(--text-label)", color: "var(--color-text-muted)", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>
                    Aprender Kana
                  </div>
                  <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 700 }}>
                    {sessionFinished ? "Resumen" : `Pregunta ${Math.min(sessionIndex + 1, session.questions.length)} / ${session.questions.length}`}
                  </div>
                </div>
                <button type="button" onClick={closeSession} className="ds-btn-ghost">
                  Cerrar
                </button>
              </div>

              {!sessionFinished && (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 800 }}>
                      {Math.min(sessionIndex + 1, session?.questions.length || 0)} / {session?.questions.length || 0}
                    </div>
                    {streak > 0 ? (
                      <div
                        key={streakPulse}
                        style={{
                          borderRadius: 999,
                          padding: "7px 11px",
                          background: "color-mix(in srgb, var(--color-accent-soft) 74%, white)",
                          color: "var(--color-text)",
                          fontSize: "var(--text-body-sm)",
                          fontWeight: 800,
                          animation: "kanaStreakPop 320ms ease",
                        }}
                      >
                        {streak} en racha
                      </div>
                    ) : null}
                  </div>
                  <div style={{ height: 10, borderRadius: 999, background: "color-mix(in srgb, var(--color-accent-soft) 72%, white)", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${progressPercent}%`,
                        background: "linear-gradient(90deg, #4ECDC4 0%, #E63946 100%)",
                        transition: "width 220ms ease",
                      }}
                    />
                  </div>
                </div>
              )}

              {!sessionFinished && currentQuestion && (
                <div key={`${currentQuestion.item.id}-${sessionIndex}`} style={{ display: "grid", gap: "var(--space-4)", animation: "kanaPracticeStepIn 180ms ease" }}>
                  <div
                    style={{
                      display: "grid",
                      gap: 10,
                      justifyItems: "center",
                      textAlign: "center",
                      minHeight: currentQuestion.mode === "handwriting" ? 188 : 220,
                      alignContent: "center",
                      padding: "14px 12px",
                      borderRadius: 32,
                      background: "color-mix(in srgb, var(--color-surface) 82%, white)",
                      boxShadow: stageFeedbackTone,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ fontSize: "var(--text-label)", color: "var(--color-text-muted)", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>
                      {activeQuestionLabel}
                    </div>
                    <div
                      style={{
                        fontSize: currentQuestion.mode === "handwriting" ? "clamp(28px, 8vw, 42px)" : "clamp(88px, 30vw, 144px)",
                        lineHeight: 0.95,
                        letterSpacing: "-.05em",
                        fontWeight: 800,
                        color: "var(--color-text)",
                      }}
                    >
                      {currentQuestion.mode === "handwriting" ? currentQuestion.item.romaji : currentQuestion.item.kana}
                    </div>
                    {answerFeedback?.status === "correct" && (
                      <>
                        <div
                          style={{
                            position: "absolute",
                            inset: "18% 22%",
                            borderRadius: 999,
                            border: "2px solid rgba(78,205,196,.22)",
                            animation: "kanaSuccessPulse 520ms ease-out",
                            pointerEvents: "none",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: 18,
                            right: 18,
                            width: 34,
                            height: 34,
                            borderRadius: 999,
                            display: "grid",
                            placeItems: "center",
                            background: "rgba(78,205,196,.18)",
                            color: "#1A1A2E",
                            fontWeight: 900,
                            fontSize: 18,
                            animation: "kanaCheckBurst 420ms ease-out",
                          }}
                        >
                          ✓
                        </div>
                        <div className="kanaSuccessDots" aria-hidden="true">
                          <span />
                          <span />
                          <span />
                          <span />
                        </div>
                      </>
                    )}
                  </div>

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
                              {sessionIndex >= session.questions.length - 1 ? "Ver resumen" : "Siguiente"}
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
                            {sessionIndex >= session.questions.length - 1 ? "Ver resumen" : "Siguiente"}
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
                      <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 700 }}>
                        Traza el kana correspondiente y luego evalúate
                      </div>
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
                            }, 520);
                          } else {
                            setAnswerFeedback({ status: "wrong", answer: currentQuestion.item.kana });
                            setStreak(0);
                            moveToNext();
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {sessionFinished && (
                <div style={{ display: "grid", gap: "var(--space-4)" }}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ fontSize: "clamp(34px, 10vw, 52px)", lineHeight: 0.95, letterSpacing: "-.05em", fontWeight: 800, color: "var(--color-text)" }}>
                      {summary.correct}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <div style={subtlePillStyle}>✓ {summary.correct}</div>
                      <div style={subtlePillStyle}>～ {summary.almost}</div>
                      <div style={subtlePillStyle}>✕ {summary.wrong}</div>
                    </div>
                  </div>

                  {hardestSessionKana.length > 0 && (
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ fontSize: "var(--text-label)", color: "var(--color-text-muted)", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>
                        Hardest kana
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {hardestSessionKana.map((item) => (
                          <div key={item.id} style={subtlePillStyle}>
                            {item.kana} · {item.romaji}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {repeatCandidates.length > 0 && (
                      <button
                        type="button"
                        onClick={() => startSession(repeatCandidates.slice(0, Math.min(repeatCandidates.length, 20)))}
                        className="ds-btn"
                      >
                        Practicar falladas
                      </button>
                    )}
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
              )}
            </div>
          </div>
        </div>
      )}

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
        @keyframes kanaSuccessPulse {
          from {
            opacity: 0.85;
            transform: scale(0.82);
          }
          to {
            opacity: 0;
            transform: scale(1.2);
          }
        }
        @keyframes kanaCheckBurst {
          0% {
            opacity: 0;
            transform: scale(0.6);
          }
          55% {
            opacity: 1;
            transform: scale(1.12);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes kanaStreakPop {
          0% {
            transform: translateY(3px) scale(0.96);
            opacity: 0.5;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        .kanaSuccessDots {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .kanaSuccessDots span {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(78, 205, 196, 0.85);
          animation: kanaDotBurst 420ms ease-out forwards;
        }
        .kanaSuccessDots span:nth-child(1) {
          top: 22%;
          left: 24%;
        }
        .kanaSuccessDots span:nth-child(2) {
          top: 18%;
          right: 24%;
          background: rgba(244, 162, 97, 0.88);
        }
        .kanaSuccessDots span:nth-child(3) {
          bottom: 24%;
          left: 28%;
          background: rgba(69, 123, 157, 0.82);
        }
        .kanaSuccessDots span:nth-child(4) {
          bottom: 20%;
          right: 28%;
        }
        @keyframes kanaDotBurst {
          from {
            opacity: 0;
            transform: scale(0.4);
          }
          30% {
            opacity: 1;
            transform: scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(-10px) scale(0.9);
          }
        }
      `}</style>
    </div>
  );
}
