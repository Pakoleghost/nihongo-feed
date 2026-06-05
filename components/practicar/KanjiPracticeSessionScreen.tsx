"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GENKI_KANJI_BY_LESSON } from "@/lib/genki-kanji-by-lesson";
import type { GenkiKanjiItem } from "@/lib/genki-kanji-by-lesson";
import { setLastActivity } from "@/lib/streak";
import {
  getKanjiProgressId,
  loadKanjiProgress,
  recordKanjiResult,
  saveKanjiProgress,
  type KanjiProgressMap,
} from "@/lib/kanji-progress";
import { getKanjiLessonSummary } from "@/lib/kanji-progress";
import {
  getPracticeNextAction,
  getPracticeSessionContext,
  getPracticeSessionContextForSortKey,
  isPracticeDifficult,
  isPracticeDominated,
  isPracticeDue,
  type PracticeNextAction,
  type PracticeSessionContext,
  type PracticeSessionSortKey,
} from "@/lib/practice-srs";
import PracticeSessionHeader from "@/components/practicar/PracticeSessionHeader";
import PracticeSessionLayout from "@/components/practicar/PracticeSessionLayout";
import { GENKI_LESSON_NAMES } from "@/lib/genki-lesson-names";

const USER_KEY = "anon";

type QuizPhase = "question" | "feedback";
type ReadingQuestion = { item: GenkiKanjiItem; options: string[] };
type SessionResult = { practiced: number; correct: number; incorrect: number };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getReadingOptions(correct: GenkiKanjiItem, pool: GenkiKanjiItem[]) {
  const correctReading = correct.hira;
  const others = [...new Set(pool.map((x) => x.hira).filter((h) => h !== correctReading))];
  const supplemented =
    others.length < 3
      ? [
          ...new Set(
            Object.values(GENKI_KANJI_BY_LESSON)
              .flat()
              .map((x) => x.hira)
              .filter((h) => h !== correctReading),
          ),
        ]
      : others;
  return shuffle([correctReading, ...shuffle(supplemented).slice(0, 3)]);
}

function sortItems(
  items: GenkiKanjiItem[],
  progress: KanjiProgressMap,
  lesson: number,
  actionKey: PracticeNextAction["key"],
) {
  function rank(item: GenkiKanjiItem) {
    const id = getKanjiProgressId(lesson, item);
    const e = progress[id];
    const exposedOnly = Boolean(e && e.exposure_count > 0 && e.times_seen === 0);
    const due = isPracticeDue(e);
    const weak = isPracticeDifficult(e);
    const dominated = isPracticeDominated(e);
    const practiced = Boolean(e && e.times_seen > 0);
    if (actionKey === "practice_due") {
      if (due) return 0; if (weak) return 1; if (exposedOnly) return 2;
      if (practiced && !dominated) return 3; return 4;
    }
    if (actionKey === "practice_weak") {
      if (weak) return 0; if (due) return 1; if (exposedOnly) return 2;
      if (practiced && !dominated) return 3; return 4;
    }
    if (actionKey === "practice_now") {
      if (exposedOnly) return 0; if (!practiced) return 1; if (due) return 2;
      if (weak) return 3; return 4;
    }
    if (due) return 0; if (weak) return 1; if (practiced && !dominated) return 2;
    if (exposedOnly) return 3; return 4;
  }
  return [...items].sort((a, b) => {
    const d = rank(a) - rank(b);
    return d !== 0 ? d : a.kanji.localeCompare(b.kanji, "ja");
  });
}

type Props = { initialLesson: number; initialFocusKey?: PracticeSessionSortKey | null };

export default function KanjiPracticeSessionScreen({ initialLesson, initialFocusKey = null }: Props) {
  const router = useRouter();
  const [progress, setProgress] = useState<KanjiProgressMap>(() =>
    typeof window === "undefined" ? {} : loadKanjiProgress(USER_KEY),
  );
  const [questions, setQuestions] = useState<ReadingQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<QuizPhase>("question");
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongItems, setWrongItems] = useState<ReadingQuestion[]>([]);
  const [result, setResult] = useState<SessionResult | null>(null);

  const lesson = initialLesson;
  const lessonTitle = GENKI_LESSON_NAMES[lesson] ?? `L${lesson}`;
  const lessonItems = useMemo(() => GENKI_KANJI_BY_LESSON[lesson] ?? [], [lesson]);
  const lessonSummary = useMemo(
    () => getKanjiLessonSummary(lesson, lessonItems, progress),
    [lesson, lessonItems, progress],
  );
  const nextAction = useMemo(() => getPracticeNextAction(lessonSummary), [lessonSummary]);
  const sessionContext = useMemo<PracticeSessionContext>(
    () =>
      initialFocusKey
        ? getPracticeSessionContextForSortKey(initialFocusKey)
        : getPracticeSessionContext(lessonSummary),
    [initialFocusKey, lessonSummary],
  );

  useEffect(() => {
    setLastActivity(`Kanji · Practicar · L${lesson}`, "/practicar/kanji");
  }, [lesson]);

  function startSession(ctx: PracticeSessionContext) {
    const sorted = sortItems(lessonItems, progress, lesson, ctx.sortKey);
    setQuestions(sorted.map((item) => ({ item, options: getReadingOptions(item, lessonItems) })));
    setIdx(0);
    setPhase("question");
    setSelected(null);
    setCorrectCount(0);
    setWrongItems([]);
    setResult(null);
  }

  useEffect(() => {
    startSession(sessionContext);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson, initialFocusKey]);

  const q = questions[idx];
  const total = questions.length;
  const pct = total > 0 ? (idx / total) * 100 : 0;
  const isCorrect = selected !== null && selected === q?.item.hira;

  function choose(opt: string) {
    if (phase !== "question" || !q) return;
    setSelected(opt);
    setPhase("feedback");
    const correct = opt === q.item.hira;
    if (correct) setCorrectCount((n) => n + 1);
    else setWrongItems((arr) => [...arr, q]);
    setProgress((prev) => {
      const next = recordKanjiResult(prev, lesson, q.item, correct ? "correct" : "wrong");
      saveKanjiProgress(USER_KEY, next);
      return next;
    });
  }

  function advance() {
    if (!q) return;
    if (idx + 1 >= total) {
      setResult({ practiced: total, correct: correctCount + (isCorrect ? 0 : 0), incorrect: wrongItems.length + (isCorrect ? 0 : 1) });
      setPhase("question");
      setSelected(null);
    } else {
      setIdx((i) => i + 1);
      setPhase("question");
      setSelected(null);
    }
  }

  function repeatWrong() {
    const wrong = wrongItems;
    setQuestions(shuffle(wrong));
    setIdx(0);
    setPhase("question");
    setSelected(null);
    setCorrectCount(0);
    setWrongItems([]);
    setResult(null);
  }

  const exit = () => router.push(`/practicar/kanji?lesson=${lesson}`);

  // Results screen
  if (result) {
    const pctCorrect = total > 0 ? Math.round((result.correct / total) * 100) : 0;
    const ringColor = pctCorrect >= 70 ? "#34D399" : pctCorrect >= 40 ? "#4ECDC4" : "#E63946";
    const headline = pctCorrect >= 80 ? "¡Excelente!" : pctCorrect >= 50 ? "¡Buen trabajo!" : "A seguir practicando";
    const r = 72;
    const circ = 2 * Math.PI * r;

    return (
      <PracticeSessionLayout accent="teal">
        <div className="sesh-res">
          <div className="sesh-res-top">
            {/* SVG ring */}
            <div style={{ position: "relative", width: 184, height: 184 }}>
              <svg width="184" height="184" viewBox="0 0 184 184">
                <circle cx="92" cy="92" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
                <circle
                  cx="92" cy="92" r={r} fill="none"
                  stroke={ringColor} strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={circ - (circ * pctCorrect) / 100}
                  transform="rotate(-90 92 92)"
                  style={{ filter: `drop-shadow(0 0 8px ${ringColor})` }}
                />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 46, fontWeight: 800, letterSpacing: -1, color: "#F4F4F8" }}>{pctCorrect}%</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(244,244,248,0.56)", letterSpacing: 0.5 }}>{result.correct} DE {total}</span>
              </div>
            </div>

            <div className="sesh-res-title">{headline}</div>

            <div className="sesh-res-stats">
              <div className="sesh-stat good">
                <span className="v">{result.correct}</span>
                <span className="k">Correctas</span>
              </div>
              <div className="sesh-stat bad">
                <span className="v">{result.incorrect}</span>
                <span className="k">Para repasar</span>
              </div>
            </div>
          </div>

          <div className="sesh-res-foot">
            {wrongItems.length > 0 && (
              <button className="sesh-btn sesh-btn-red" onClick={repeatWrong}>
                Repetir las {wrongItems.length} que fallé
              </button>
            )}
            <button className="sesh-btn sesh-btn-ghost" onClick={exit}>Terminar</button>
          </div>
        </div>
      </PracticeSessionLayout>
    );
  }

  return (
    <PracticeSessionLayout accent="teal">
      <PracticeSessionHeader
        typeLabel="Kanji"
        lesson={`L${lesson} · ${lessonTitle}`}
        progressCurrent={idx}
        progressTotal={total}
        onExit={exit}
      />

      <div style={{ marginTop: 14, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {q && (
          <>
            {/* Item card */}
            <div className="sesh-itemcard">
              <div className="sesh-jp-word">{q.item.kanji}</div>
              <div className="sesh-hint">{q.item.es}</div>
              <div className="sesh-prompt">Elige la lectura correcta</div>
            </div>

            {/* Answer grid */}
            <div className="sesh-answers">
              {q.options.map((opt) => {
                let cls = "sesh-ans sesh-ans-jp";
                if (phase === "feedback") {
                  cls += " locked";
                  if (opt === q.item.hira) cls += " correct";
                  else if (opt === selected) cls += " wrong";
                  else cls += " muted";
                }
                return (
                  <button key={opt} className={cls} onClick={() => choose(opt)}>
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* Feedback + Continuar */}
            {phase === "feedback" && (
              <div className="sesh-feedback">
                {isCorrect ? (
                  <div className="sesh-fbline ok">
                    <span className="sesh-fbbadge ok">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M4 12.5l5 5L20 6.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    ¡Correcto!
                  </div>
                ) : (
                  <div className="sesh-fbline no">
                    <span className="sesh-fbbadge no">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    </span>
                    Casi —&nbsp;<span className="sub">la respuesta es «{q.item.hira}»</span>
                  </div>
                )}
                <button
                  className={`sesh-btn ${isCorrect ? "sesh-btn-green" : "sesh-btn-red"}`}
                  onClick={advance}
                >
                  {idx + 1 < total ? "Continuar" : "Ver resultados"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </PracticeSessionLayout>
  );
}
