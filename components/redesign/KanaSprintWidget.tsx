"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KANA_ITEMS, type KanaItem } from "@/lib/kana-data";
import { supabase } from "@/lib/supabase";
import styles from "./KanaSprintWidget.module.css";

type LeaderboardRow = {
  user_id: string;
  best_score: number;
  updated_at: string;
  username: string | null;
  avatar_url: string | null;
};

type Question = {
  item: KanaItem;
  options: string[];
};

type SprintPhase = "ready" | "playing" | "result";

const SPRINT_POOL = KANA_ITEMS.filter((item) => item.set === "basic");
const SPRINT_DURATION = 60;

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function buildQuestion(): Question {
  const item = SPRINT_POOL[Math.floor(Math.random() * SPRINT_POOL.length)];
  const wrong = [
    ...new Set(SPRINT_POOL.map((candidate) => candidate.romaji).filter((romaji) => romaji !== item.romaji)),
  ];

  return {
    item,
    options: shuffle([item.romaji, ...shuffle(wrong).slice(0, 3)]),
  };
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-MX", { month: "short", day: "numeric" }).format(new Date(date));
}

function Avatar({ url, name }: { url: string | null; name: string | null }) {
  const initial = (name ?? "?").trim()[0]?.toUpperCase() ?? "?";

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className={styles.avatarImage} src={url} alt="" />
    );
  }

  return <span className={styles.avatar}>{initial}</span>;
}

export function KanaSprintWidget() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);

    const { data: scoreData } = await supabase
      .from("study_kana_scores")
      .select("user_id, best_score, updated_at")
      .eq("mode", "mixed")
      .order("best_score", { ascending: false })
      .limit(5);

    const scores = (scoreData as { user_id: string; best_score: number; updated_at: string }[] | null) ?? [];
    if (scores.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const userIds = scores.map((score) => score.user_id);
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", userIds);

    const profileMap: Record<string, { username: string | null; avatar_url: string | null }> = {};
    (profileData as { id: string; username: string | null; avatar_url: string | null }[] | null)?.forEach(
      (profile) => {
        profileMap[profile.id] = { username: profile.username, avatar_url: profile.avatar_url };
      },
    );

    setRows(
      scores.map((score) => ({
        ...score,
        username: profileMap[score.user_id]?.username ?? null,
        avatar_url: profileMap[score.user_id]?.avatar_url ?? null,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
      await loadLeaderboard();
    }

    void load();
  }, [loadLeaderboard]);

  return (
    <>
      <section className={`${styles.card} ${styles.sprintCard}`}>
        <div className={styles.cardHeader}>
          <span className={styles.iconTile}>速</span>
          <div>
            <h2>Kana Sprint</h2>
            <p>60 segundos para reconocer hiragana y katakana.</p>
          </div>
        </div>

        <div className={styles.leaderboard} aria-label="Leaderboard de Kana Sprint">
          {loading ? (
            <div className={styles.emptyState}>Cargando ranking...</div>
          ) : rows.length === 0 ? (
            <div className={styles.emptyState}>Aún no hay puntajes. Sé el primero.</div>
          ) : (
            rows.map((row, index) => (
              <div key={row.user_id} className={styles.rankRow}>
                <span className={styles.rankNumber}>{index + 1}</span>
                <Avatar url={row.avatar_url} name={row.username} />
                <span className={styles.rankName}>
                  <strong>{row.username ?? "Alumno"}</strong>
                  <em>{formatDate(row.updated_at)}</em>
                </span>
                <span className={styles.rankScore}>{row.best_score}</span>
              </div>
            ))
          )}
        </div>

        <button type="button" className={styles.primaryButton} onClick={() => setOpen(true)}>
          Participar
        </button>
      </section>

      {open && (
        <SprintModal
          userId={userId}
          onClose={() => setOpen(false)}
          onSaved={loadLeaderboard}
        />
      )}
    </>
  );
}

function SprintModal({
  userId,
  onClose,
  onSaved,
}: {
  userId: string | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const savedRef = useRef(false);
  const [phase, setPhase] = useState<SprintPhase>("ready");
  const [timeLeft, setTimeLeft] = useState(SPRINT_DURATION);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [question, setQuestion] = useState<Question>(() => buildQuestion());
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const progressPct = useMemo(() => Math.max(0, Math.round((timeLeft / SPRINT_DURATION) * 100)), [timeLeft]);
  const timerLabel = `0:${timeLeft.toString().padStart(2, "0")}`;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function resetGame() {
    savedRef.current = false;
    setPhase("ready");
    setTimeLeft(SPRINT_DURATION);
    setScore(0);
    setBestScore(null);
    setQuestion(buildQuestion());
    setSelectedAnswer(null);
    setSaving(false);
  }

  function startGame() {
    savedRef.current = false;
    setPhase("playing");
    setTimeLeft(SPRINT_DURATION);
    setScore(0);
    setBestScore(null);
    setQuestion(buildQuestion());
    setSelectedAnswer(null);
  }

  useEffect(() => {
    if (phase !== "playing") return;

    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          window.setTimeout(() => setPhase("result"), 0);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "result" || savedRef.current) return;
    savedRef.current = true;

    async function saveScore() {
      if (!userId) return;
      setSaving(true);

      const { data: existing } = await supabase
        .from("study_kana_scores")
        .select("best_score")
        .eq("user_id", userId)
        .eq("mode", "mixed")
        .maybeSingle();

      const currentBest = (existing as { best_score: number } | null)?.best_score ?? 0;
      const nextBest = Math.max(currentBest, score);
      setBestScore(nextBest);

      if (score > currentBest) {
        await supabase.from("study_kana_scores").upsert({
          user_id: userId,
          mode: "mixed",
          best_score: score,
          updated_at: new Date().toISOString(),
        });
        await onSaved();
      }

      setSaving(false);
    }

    void saveScore();
  }, [onSaved, phase, score, userId]);

  function handleAnswer(answer: string) {
    if (phase !== "playing" || selectedAnswer) return;

    const isCorrect = answer === question.item.romaji;
    setSelectedAnswer(answer);
    if (isCorrect) setScore((current) => current + 1);

    window.setTimeout(
      () => {
        setQuestion(buildQuestion());
        setSelectedAnswer(null);
      },
      isCorrect ? 130 : 520,
    );
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-label="Kana Sprint" onClick={(event) => event.stopPropagation()}>
        <header className={styles.modalHeader}>
          <div>
            <h2>Kana Sprint</h2>
            <p>{phase === "playing" ? "Elige la lectura correcta antes de que termine el tiempo." : "Hiragana y katakana básicos en una ronda rápida."}</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        {phase === "ready" && (
          <div className={styles.readyState}>
            <span className={styles.bigKana}>あア</span>
            <h3>¿Listo para el sprint?</h3>
            <p>Tienes 60 segundos. Cada respuesta correcta suma un punto.</p>
            <button type="button" className={styles.primaryButton} onClick={startGame}>
              Empezar
            </button>
          </div>
        )}

        {phase === "playing" && (
          <div className={styles.gameState}>
            <div className={styles.gameStats}>
              <span>
                <strong>{timerLabel}</strong>
                Tiempo
              </span>
              <span>
                <strong>{score}</strong>
                Correctas
              </span>
            </div>
            <div className={styles.progressTrack} aria-label={`${progressPct}% de tiempo restante`}>
              <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
            </div>
            <p className={styles.questionLabel}>¿Cómo se lee este kana?</p>
            <div className={styles.promptKana}>{question.item.kana}</div>
            <div className={styles.optionsGrid}>
              {question.options.map((option) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = option === question.item.romaji;
                const showCorrect = selectedAnswer !== null && isCorrect;
                const showWrong = isSelected && !isCorrect;

                return (
                  <button
                    key={option}
                    type="button"
                    className={`${styles.optionButton} ${showCorrect ? styles.optionCorrect : ""} ${
                      showWrong ? styles.optionWrong : ""
                    }`}
                    onClick={() => handleAnswer(option)}
                    disabled={selectedAnswer !== null}
                  >
                    {option.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {phase === "result" && (
          <div className={styles.resultState}>
            <span className={styles.resultScore}>{score}</span>
            <h3>correctas</h3>
            <p>
              {saving
                ? "Guardando tu puntaje..."
                : bestScore !== null
                  ? `Tu mejor puntaje: ${bestScore}`
                  : userId
                    ? "Puntaje registrado."
                    : "Inicia sesión para guardar tu puntaje."}
            </p>
            <div className={styles.resultActions}>
              <button type="button" className={styles.primaryButton} onClick={resetGame}>
                Jugar de nuevo
              </button>
              <button type="button" className={styles.ghostButton} onClick={onClose}>
                Cerrar
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
