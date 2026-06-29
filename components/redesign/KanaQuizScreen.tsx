"use client";

import { useEffect, useMemo, useState } from "react";
import { KANA_ITEMS, type KanaItem, type KanaScript } from "@/lib/kana-data";
import styles from "./KanaQuizScreen.module.css";

type KanaQuizMode = "reading" | "writing";
type AnswerState = "idle" | "correct" | "wrong";

type QuizQuestion = {
  item: KanaItem;
  options: string[];
};

const QUESTION_COUNT = 20;

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function getScriptLabel(script: KanaScript) {
  return script === "hiragana" ? "Hiragana" : "Katakana";
}

function getBackHref(script: KanaScript) {
  return `/dashboard/${script}`;
}

function getPool(script: KanaScript) {
  return KANA_ITEMS.filter((item) => item.script === script);
}

function buildOptions(item: KanaItem, pool: KanaItem[], mode: KanaQuizMode) {
  const correct = mode === "reading" ? item.romaji : item.kana;
  const sameSet = pool.filter((candidate) => candidate.set === item.set);
  const optionPool = sameSet.length >= 4 ? sameSet : pool;
  const wrong = [
    ...new Set(
      optionPool
        .map((candidate) => (mode === "reading" ? candidate.romaji : candidate.kana))
        .filter((value) => value !== correct),
    ),
  ];

  return shuffle([correct, ...shuffle(wrong).slice(0, 3)]);
}

function buildQuestions(script: KanaScript, mode: KanaQuizMode): QuizQuestion[] {
  const pool = getPool(script);
  const selected = shuffle(pool).slice(0, Math.min(QUESTION_COUNT, pool.length));
  return selected.map((item) => ({
    item,
    options: buildOptions(item, pool, mode),
  }));
}

function isCorrectAnswer(item: KanaItem, answer: string, mode: KanaQuizMode) {
  if (mode === "writing") return answer === item.kana;
  return answer === item.romaji || (item.alternatives?.includes(answer) ?? false);
}

export function KanaQuizScreen({
  script,
  mode,
  onClose,
  presentation = "page",
}: {
  script: KanaScript;
  mode: KanaQuizMode;
  onClose?: () => void;
  presentation?: "page" | "modal";
}) {
  const scriptLabel = getScriptLabel(script);
  const backHref = getBackHref(script);
  const [questions] = useState<QuizQuestion[]>(() => buildQuestions(script, mode));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [isFinished, setIsFinished] = useState(false);

  const currentQuestion = questions[currentIndex];
  const progressPct = questions.length ? Math.round((currentIndex / questions.length) * 100) : 0;
  const finalPct = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
  const title = mode === "reading" ? "Reading Quiz" : "Writing Quiz";
  const icon = mode === "reading" ? "読" : "書";
  const instruction =
    mode === "reading"
      ? "Elige la lectura correcta del kana."
      : "Mira el romaji y elige el kana correcto.";

  const resultCopy = useMemo(() => {
    if (finalPct >= 90) return "Excelente. Este quiz ya se siente listo para clase.";
    if (finalPct >= 70) return "Buen avance. Repite una ronda corta para afianzar los kana dudosos.";
    return "Vamos paso a paso. Regresa a la tabla, mira los trazos y vuelve a intentarlo.";
  }, [finalPct]);

  useEffect(() => {
    if (presentation !== "modal" || !onClose) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose?.();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, presentation]);

  function goNext(wasCorrect: boolean) {
    window.setTimeout(() => {
      if (currentIndex + 1 >= questions.length) {
        setIsFinished(true);
        return;
      }

      setCurrentIndex((index) => index + 1);
      setSelectedAnswer(null);
      setAnswerState("idle");
    }, wasCorrect ? 650 : 950);
  }

  function handleReadingAnswer(answer: string) {
    if (!currentQuestion || answerState !== "idle") return;
    const wasCorrect = isCorrectAnswer(currentQuestion.item, answer, mode);
    setSelectedAnswer(answer);
    setAnswerState(wasCorrect ? "correct" : "wrong");
    if (wasCorrect) setCorrectCount((count) => count + 1);
    goNext(wasCorrect);
  }

  function handleWritingAnswer(answer: string) {
    if (!currentQuestion || answerState !== "idle") return;
    const wasCorrect = isCorrectAnswer(currentQuestion.item, answer, mode);
    setSelectedAnswer(answer);
    setAnswerState(wasCorrect ? "correct" : "wrong");
    if (wasCorrect) setCorrectCount((count) => count + 1);
    goNext(wasCorrect);
  }

  if (!currentQuestion || isFinished) {
    return (
      <div className={`${styles.quizPage} ${presentation === "modal" ? styles.quizPageModal : ""}`}>
        <section className={styles.resultCard}>
          <div className={styles.resultScore}>{finalPct}%</div>
          <h1>{title} completado</h1>
          <p>{resultCopy}</p>
          <div className={styles.resultActions}>
            {onClose ? (
              <button type="button" onClick={onClose} className={styles.secondaryButton}>
                Volver a {scriptLabel}
              </button>
            ) : (
              <a href={backHref} className={styles.secondaryButton}>
                Volver a {scriptLabel}
              </a>
            )}
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => {
                setCurrentIndex(0);
                setCorrectCount(0);
                setSelectedAnswer(null);
                setAnswerState("idle");
                setIsFinished(false);
              }}
            >
              Repetir quiz
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={`${styles.quizPage} ${presentation === "modal" ? styles.quizPageModal : ""}`}>
      <div className={styles.quizShell}>
        <section className={styles.topCard}>
          <div className={styles.topRow}>
            <div className={styles.titleBlock}>
              <span className={styles.quizIcon}>{icon}</span>
              <div>
                <h1>{scriptLabel} · {title}</h1>
                <p>{instruction}</p>
              </div>
            </div>
            <div className={styles.counter}>
              <strong>{currentIndex + 1}/{questions.length}</strong>
              <span>Quiz</span>
            </div>
            {onClose && (
              <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar quiz">
                ×
              </button>
            )}
          </div>
          <div className={styles.progressTrack} aria-label={`${progressPct}% completado`}>
            <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
          </div>
        </section>

        <section className={styles.questionCard}>
          <div className={styles.promptPanel}>
            <span className={styles.promptMeta}>{currentQuestion.item.set}</span>
            {mode === "reading" ? (
              <div className={styles.promptKana}>{currentQuestion.item.kana}</div>
            ) : (
              <div className={styles.promptRomaji}>{currentQuestion.item.romaji.toUpperCase()}</div>
            )}
          </div>

          <div className={styles.answerPanel}>
            <div className={styles.questionText}>
              <h2>{mode === "reading" ? "¿Cómo se lee?" : "¿Cuál kana es?"}</h2>
              <p>
                {mode === "reading"
                  ? "Selecciona el romaji correcto."
                  : "Selecciona el carácter que corresponde al romaji."}
              </p>
            </div>

            <div className={styles.optionsGrid}>
              {currentQuestion.options.map((option) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = isCorrectAnswer(currentQuestion.item, option, mode);
                const showCorrect = answerState !== "idle" && isCorrect;
                const showWrong = answerState === "wrong" && isSelected;

                return (
                  <button
                    key={option}
                    type="button"
                    className={`${styles.optionButton} ${mode === "writing" ? styles.optionKana : ""} ${
                      showCorrect ? styles.optionCorrect : ""
                    } ${
                      showWrong ? styles.optionWrong : ""
                    }`}
                    disabled={answerState !== "idle"}
                    onClick={() => (mode === "reading" ? handleReadingAnswer(option) : handleWritingAnswer(option))}
                  >
                    {mode === "reading" ? option.toUpperCase() : option}
                  </button>
                );
              })}
            </div>

            <div
              className={`${styles.feedbackPill} ${answerState === "correct" ? styles.feedbackCorrect : ""} ${
                answerState === "wrong" ? styles.feedbackWrong : ""
              }`}
            >
              {answerState === "correct"
                ? "Correcto"
                : answerState === "wrong"
                  ? `Respuesta correcta: ${
                    mode === "reading" ? currentQuestion.item.romaji.toUpperCase() : currentQuestion.item.kana
                  }`
                  : "Elige una respuesta"}
            </div>

            {onClose ? (
              <button type="button" onClick={onClose} className={styles.exitButton}>
                Salir y volver a {scriptLabel}
              </button>
            ) : (
              <a href={backHref} className={styles.exitButton}>
                Salir y volver a {scriptLabel}
              </a>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
