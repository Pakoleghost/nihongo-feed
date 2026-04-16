"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import KanaHandwritingPad, { type KanaHandwritingRating } from "@/components/study/KanaHandwritingPad";
import {
  KANA_ITEMS,
  KANA_PRACTICE_MODE_OPTIONS,
  KANA_PRACTICE_SET_OPTIONS,
  KANA_QUESTION_COUNT_OPTIONS,
  KANA_TABLE_FILTERS,
  filterKanaItemsForPractice,
  filterKanaItemsForTable,
  getKanaPracticeDetail,
  getKanaSetLabel,
  type KanaItem,
  type KanaPracticeMode,
  type KanaPracticeSetKey,
  type KanaQuestionCount,
  type KanaScript,
  type KanaTableFilter,
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
  options?: string[];
};

type KanaSessionResult = {
  item: KanaItem;
  rating: KanaRating;
  mode: KanaPracticeMode;
  recognitionScore?: number;
};

type KanaSession = {
  setKey: KanaPracticeSetKey;
  mode: KanaPracticeMode;
  count: KanaQuestionCount;
  questions: KanaSessionQuestion[];
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

function buildSession(setKey: KanaPracticeSetKey, mode: KanaPracticeMode, count: KanaQuestionCount, progress: KanaProgressMap) {
  const baseItems = filterKanaItemsForPractice(setKey);
  const items = buildKanaSessionItems(baseItems, progress, count);
  const questions =
    mode === "multiple_choice"
      ? buildMultipleChoiceQuestions(items, baseItems)
      : items.map((item) => ({ item }));
  return { setKey, mode, count, questions };
}

export default function AprenderKanaModule({ userKey, onRecordActivity }: AprenderKanaModuleProps) {
  const [screen, setScreen] = useState<"home" | "table" | "setup">("home");
  const [tableScript, setTableScript] = useState<KanaScript>("hiragana");
  const [tableFilter, setTableFilter] = useState<KanaTableFilter>("basic");
  const [practiceSetKey, setPracticeSetKey] = useState<KanaPracticeSetKey>("hiragana_basic");
  const [practiceMode, setPracticeMode] = useState<KanaPracticeMode>("multiple_choice");
  const [questionCount, setQuestionCount] = useState<KanaQuestionCount>(20);
  const [progress, setProgress] = useState<KanaProgressMap>({});
  const [session, setSession] = useState<KanaSession | null>(null);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [sessionResults, setSessionResults] = useState<KanaSessionResult[]>([]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [romajiValue, setRomajiValue] = useState("");
  const [romajiFeedback, setRomajiFeedback] = useState<null | { correct: boolean; answer: string }>(null);
  const [multipleChoiceAnswer, setMultipleChoiceAnswer] = useState<string | null>(null);
  const romajiInputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    if (session?.mode !== "romaji_input" || sessionFinished) return;
    const timer = window.setTimeout(() => romajiInputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [session?.mode, sessionFinished, sessionIndex]);

  const allKanaSummary = useMemo(() => getKanaProgressSummary(KANA_ITEMS, progress), [progress]);
  const tableItems = useMemo(() => filterKanaItemsForTable(tableScript, tableFilter), [tableFilter, tableScript]);
  const currentQuestion = session?.questions[sessionIndex] || null;

  const subtlePillStyle: CSSProperties = {
    borderRadius: 999,
    padding: "7px 10px",
    border: "1px solid var(--color-border)",
    background: "color-mix(in srgb, var(--color-surface) 82%, white)",
    color: "var(--color-text)",
    fontSize: "var(--text-body-sm)",
    fontWeight: 700,
  };

  const recordResult = (item: KanaItem, rating: KanaRating, extra?: { recognitionScore?: number }) => {
    setProgress((previous) => applyKanaRating(previous, item, rating));
    setSessionResults((previous) => [
      ...previous,
      { item, rating, mode: session?.mode || "multiple_choice", recognitionScore: extra?.recognitionScore },
    ]);
  };

  const moveToNext = () => {
    setMultipleChoiceAnswer(null);
    setRomajiValue("");
    setRomajiFeedback(null);
    setSessionIndex((value) => value + 1);
  };

  const finishOrAdvance = () => {
    if (!session) return;
    if (sessionIndex >= session.questions.length - 1) return;
    moveToNext();
  };

  const closeSession = () => {
    setSheetVisible(false);
    window.setTimeout(() => {
      setSession(null);
      setSessionIndex(0);
      setSessionResults([]);
      setMultipleChoiceAnswer(null);
      setRomajiValue("");
      setRomajiFeedback(null);
    }, 220);
  };

  const startSession = (overrideItems?: KanaItem[]) => {
    const nextSession = overrideItems
      ? {
          setKey: practiceSetKey,
          mode: practiceMode,
          count: overrideItems.length as KanaQuestionCount,
          questions:
            practiceMode === "multiple_choice"
              ? buildMultipleChoiceQuestions(overrideItems, filterKanaItemsForPractice(practiceSetKey))
              : overrideItems.map((item) => ({ item })),
        }
      : buildSession(practiceSetKey, practiceMode, questionCount, progress);

    setSession(nextSession);
    setSessionIndex(0);
    setSessionResults([]);
    setMultipleChoiceAnswer(null);
    setRomajiValue("");
    setRomajiFeedback(null);
    onRecordActivity?.(getKanaPracticeDetail(practiceSetKey));
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
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["hiragana", "katakana"] as KanaScript[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTableScript(value)}
                  className={value === tableScript ? "ds-btn" : "ds-btn-secondary"}
                >
                  {value === "hiragana" ? "Hiragana" : "Katakana"}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setScreen("home")} className="ds-btn-ghost">
              Volver
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {KANA_TABLE_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setTableFilter(filter.key)}
                className={tableFilter === filter.key ? "ds-btn" : "ds-btn-secondary"}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(84px, 1fr))",
              gap: 10,
            }}
          >
            {tableItems.map((item) => (
              <div
                key={item.id}
                style={{
                  borderRadius: 20,
                  border: "1px solid var(--color-border)",
                  background: "color-mix(in srgb, var(--color-surface) 84%, white)",
                  padding: "14px 10px 12px",
                  display: "grid",
                  gap: 4,
                  justifyItems: "center",
                }}
              >
                <div style={{ fontSize: 32, lineHeight: 1, fontWeight: 800, color: "var(--color-text)" }}>{item.kana}</div>
                <div style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 700 }}>{item.romaji}</div>
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

          <div style={{ display: "grid", gap: "var(--space-2)" }}>
            <div style={{ fontSize: "var(--text-label)", color: "var(--color-text-muted)", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>
              Kana set
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {KANA_PRACTICE_SET_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setPracticeSetKey(option.key)}
                  className={practiceSetKey === option.key ? "ds-btn" : "ds-btn-secondary"}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: "var(--space-2)" }}>
            <div style={{ fontSize: "var(--text-label)", color: "var(--color-text-muted)", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>
              Practice mode
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {KANA_PRACTICE_MODE_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setPracticeMode(option.key)}
                  className={practiceMode === option.key ? "ds-btn" : "ds-btn-secondary"}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: "var(--space-2)" }}>
            <div style={{ fontSize: "var(--text-label)", color: "var(--color-text-muted)", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>
              Questions
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {KANA_QUESTION_COUNT_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setQuestionCount(value)}
                  className={questionCount === value ? "ds-btn" : "ds-btn-secondary"}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

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

              {!sessionFinished && currentQuestion && (
                <div key={`${currentQuestion.item.id}-${sessionIndex}`} style={{ display: "grid", gap: "var(--space-4)", animation: "kanaPracticeStepIn 180ms ease" }}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ fontSize: "var(--text-label)", color: "var(--color-text-muted)", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>
                      {activeQuestionLabel}
                    </div>
                    <div
                      style={{
                        fontSize: session.mode === "handwriting" ? "clamp(22px, 7vw, 34px)" : "clamp(56px, 20vw, 92px)",
                        lineHeight: 1,
                        letterSpacing: "-.05em",
                        fontWeight: 800,
                        color: "var(--color-text)",
                      }}
                    >
                      {session.mode === "handwriting" ? currentQuestion.item.romaji : currentQuestion.item.kana}
                    </div>
                  </div>

                  {session.mode === "multiple_choice" && currentQuestion.options && (
                    <div style={{ display: "grid", gap: 12 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                        {currentQuestion.options.map((option) => {
                          const isChosen = multipleChoiceAnswer === option;
                          const isCorrect = option === currentQuestion.item.romaji;
                          const showAnswer = Boolean(multipleChoiceAnswer);
                          return (
                            <button
                              key={option}
                              type="button"
                              disabled={showAnswer}
                              onClick={() => {
                                setMultipleChoiceAnswer(option);
                                recordResult(currentQuestion.item, option === currentQuestion.item.romaji ? "correct" : "wrong");
                              }}
                              style={{
                                minHeight: 82,
                                borderRadius: 22,
                                border: "1px solid var(--color-border)",
                                background:
                                  showAnswer && isCorrect
                                    ? "var(--color-accent-soft)"
                                    : showAnswer && isChosen && !isCorrect
                                      ? "var(--color-highlight-soft)"
                                      : "color-mix(in srgb, var(--color-surface) 82%, white)",
                                color: "var(--color-text)",
                                fontSize: 22,
                                fontWeight: 700,
                                cursor: showAnswer ? "default" : "pointer",
                              }}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                      {multipleChoiceAnswer && (
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 700 }}>
                            {multipleChoiceAnswer === currentQuestion.item.romaji ? "Correcto" : `Respuesta: ${currentQuestion.item.romaji}`}
                          </div>
                          <button type="button" onClick={() => setSessionIndex((value) => value + 1)} className="ds-btn">
                            {sessionIndex >= session.questions.length - 1 ? "Ver resumen" : "Siguiente"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {session.mode === "romaji_input" && (
                    <div style={{ display: "grid", gap: 12 }}>
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
                            recordResult(currentQuestion.item, correct ? "correct" : "wrong");
                          }
                        }}
                      />
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => {
                            const correct = isKanaAnswerCorrect(currentQuestion.item, romajiValue);
                            setRomajiFeedback({ correct, answer: currentQuestion.item.romaji });
                            recordResult(currentQuestion.item, correct ? "correct" : "wrong");
                          }}
                          disabled={Boolean(romajiFeedback) || normalizeRomaji(romajiValue).length === 0}
                          className="ds-btn"
                        >
                          Submit
                        </button>
                        {romajiFeedback && (
                          <button type="button" onClick={() => setSessionIndex((value) => value + 1)} className="ds-btn-secondary">
                            {sessionIndex >= session.questions.length - 1 ? "Ver resumen" : "Siguiente"}
                          </button>
                        )}
                      </div>
                      {romajiFeedback && (
                        <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 700 }}>
                          {romajiFeedback.correct ? "Correcto" : `Respuesta correcta: ${romajiFeedback.answer}`}
                        </div>
                      )}
                    </div>
                  )}

                  {session.mode === "handwriting" && (
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 700 }}>
                        Traza el kana correspondiente y luego evalúate
                      </div>
                      <KanaHandwritingPad
                        targetKana={currentQuestion.item.kana}
                        onRated={(rating: KanaHandwritingRating, score) => {
                          recordResult(currentQuestion.item, rating, { recognitionScore: score });
                          setSessionIndex((value) => value + 1);
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
      `}</style>
    </div>
  );
}
