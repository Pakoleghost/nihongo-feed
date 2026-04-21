export type PracticeModule = "vocab" | "kanji";
export type PracticeRating = "wrong" | "almost" | "correct";
export type PracticeVisibleState = "nuevo" | "aprendiendo" | "en_repaso" | "dominado";

export type PracticeProgressEntry<M extends PracticeModule = PracticeModule> = {
  id: string;
  module: M;
  lesson: number;
  display: string;
  reading: string;
  meaning_es: string;
  exposure_count: number;
  times_seen: number;
  times_correct: number;
  times_wrong: number;
  times_almost: number;
  last_exposed_at: string | null;
  last_reviewed_at: string | null;
  next_due_at: number | null;
  level: number;
  difficult: boolean;
  last_rating: PracticeRating | null;
  first_seen_at: string | null;
};

export type PracticeProgressMap<T extends PracticeProgressEntry = PracticeProgressEntry> = Record<string, T>;

export type PracticeRecordMeta<M extends PracticeModule = PracticeModule> = {
  id: string;
  module: M;
  lesson: number;
  display: string;
  reading: string;
  meaning_es: string;
};

export type PracticeProgressSummary = {
  total: number;
  vistos: number;
  expuestos: number;
  practicados: number;
  solo_expuestos: number;
  nuevos: number;
  aprendiendo: number;
  en_repaso: number;
  dominados: number;
  pendientes: number;
  debiles: number;
};

export type PracticeNextAction = {
  key: "practice_due" | "practice_weak" | "practice_now" | "learn_now" | "review_lesson";
  label: string;
  helper: string;
  targetMode: "aprender" | "practicar";
};

const MS = {
  m10: 10 * 60 * 1000,
  h4: 4 * 60 * 60 * 1000,
  h12: 12 * 60 * 60 * 1000,
  d1: 24 * 60 * 60 * 1000,
  d3: 3 * 24 * 60 * 60 * 1000,
  d7: 7 * 24 * 60 * 60 * 1000,
  d14: 14 * 24 * 60 * 60 * 1000,
} as const;

const LEVEL_INTERVALS: Record<number, number> = {
  1: MS.m10,
  2: MS.h12,
  3: MS.d1,
  4: MS.d3,
  5: MS.d7,
  6: MS.d14,
};

export function getPracticeNextDueAt(level: number, now = Date.now()) {
  if (level <= 0) return now;
  return now + (LEVEL_INTERVALS[Math.min(level, 6)] ?? MS.d14);
}

export function isPracticeDue(entry: PracticeProgressEntry | undefined | null, now = Date.now()) {
  if (!entry || entry.times_seen === 0) return false;
  if (entry.next_due_at === null) return true;
  return entry.next_due_at <= now;
}

export function isPracticeDifficult(entry: PracticeProgressEntry | undefined | null) {
  if (!entry || entry.times_seen === 0) return false;
  return entry.times_wrong >= 2 && entry.times_wrong >= entry.times_correct;
}

export function isPracticeDominated(entry: PracticeProgressEntry | undefined | null, now = Date.now()) {
  if (!entry || entry.times_seen === 0) return false;
  return (
    entry.level >= 5 &&
    !isPracticeDifficult(entry) &&
    entry.times_correct >= entry.times_wrong + 3 &&
    entry.next_due_at !== null &&
    entry.next_due_at > now
  );
}

export function getPracticeItemState(
  entry: PracticeProgressEntry | undefined | null,
  now = Date.now(),
): PracticeVisibleState {
  if (!entry || (entry.times_seen === 0 && entry.exposure_count === 0)) return "nuevo";
  if (isPracticeDominated(entry, now)) return "dominado";
  if (entry.times_seen === 0 && entry.exposure_count > 0) return "aprendiendo";
  if (entry.level <= 2) return "aprendiendo";
  return "en_repaso";
}

function createInitialEntry<M extends PracticeModule>(meta: PracticeRecordMeta<M>): PracticeProgressEntry<M> {
  return {
    ...meta,
    exposure_count: 0,
    times_seen: 0,
    times_correct: 0,
    times_wrong: 0,
    times_almost: 0,
    last_exposed_at: null,
    last_reviewed_at: null,
    next_due_at: null,
    level: 0,
    difficult: false,
    last_rating: null,
    first_seen_at: null,
  };
}

export function recordPracticeResult<M extends PracticeModule>(
  current: PracticeProgressEntry<M> | undefined,
  meta: PracticeRecordMeta<M>,
  rating: PracticeRating,
): PracticeProgressEntry<M> {
  const base = current ?? createInitialEntry(meta);
  const now = Date.now();
  const currentLevel = base.level;

  const times_seen = base.times_seen + 1;
  const times_correct = base.times_correct + (rating === "correct" ? 1 : 0);
  const times_wrong = base.times_wrong + (rating === "wrong" ? 1 : 0);
  const times_almost = base.times_almost + (rating === "almost" ? 1 : 0);

  let level = currentLevel;
  let next_due_at = base.next_due_at;

  if (rating === "correct") {
    level = Math.min(currentLevel + 1, 6);
    next_due_at = getPracticeNextDueAt(level, now);
  } else if (rating === "almost") {
    level = Math.max(currentLevel, 1);
    next_due_at = now + MS.h4;
  } else {
    level = currentLevel <= 2 ? 1 : Math.max(currentLevel - 2, 1);
    next_due_at = now + MS.m10;
  }

  const nextEntry: PracticeProgressEntry<M> = {
    ...meta,
    exposure_count: base.exposure_count,
    times_seen,
    times_correct,
    times_wrong,
    times_almost,
    last_exposed_at: base.last_exposed_at,
    last_reviewed_at: new Date(now).toISOString(),
    next_due_at,
    level,
    difficult: false,
    last_rating: rating,
    first_seen_at: base.first_seen_at ?? new Date(now).toISOString(),
  };

  nextEntry.difficult = isPracticeDifficult(nextEntry);
  return nextEntry;
}

export function recordPracticeExposure<M extends PracticeModule>(
  current: PracticeProgressEntry<M> | undefined,
  meta: PracticeRecordMeta<M>,
): PracticeProgressEntry<M> {
  const base = current ?? createInitialEntry(meta);
  const nowIso = new Date().toISOString();

  return {
    ...base,
    ...meta,
    exposure_count: base.exposure_count + 1,
    last_exposed_at: nowIso,
    first_seen_at: base.first_seen_at ?? nowIso,
  };
}

export function buildPracticeSummary<T extends PracticeProgressEntry>(
  entries: Array<T | undefined>,
  now = Date.now(),
): PracticeProgressSummary {
  const summary: PracticeProgressSummary = {
    total: entries.length,
    vistos: 0,
    expuestos: 0,
    practicados: 0,
    solo_expuestos: 0,
    nuevos: 0,
    aprendiendo: 0,
    en_repaso: 0,
    dominados: 0,
    pendientes: 0,
    debiles: 0,
  };

  for (const entry of entries) {
    const state = getPracticeItemState(entry, now);
    const hasExposure = Boolean(entry && entry.exposure_count > 0);
    const hasPractice = Boolean(entry && entry.times_seen > 0);

    if (!entry || (!hasExposure && !hasPractice)) {
      summary.nuevos += 1;
    } else {
      summary.vistos += 1;
      if (hasExposure) summary.expuestos += 1;
      if (hasPractice) summary.practicados += 1;
      if (hasExposure && !hasPractice) summary.solo_expuestos += 1;
      if (isPracticeDue(entry, now)) summary.pendientes += 1;
      if (isPracticeDifficult(entry)) summary.debiles += 1;
    }

    if (state === "aprendiendo") summary.aprendiendo += 1;
    if (state === "en_repaso") summary.en_repaso += 1;
    if (state === "dominado") summary.dominados += 1;
  }

  return summary;
}

export function getPracticeNextAction(summary: PracticeProgressSummary): PracticeNextAction {
  if (summary.pendientes > 0) {
    return {
      key: "practice_due",
      label: "Practicar pendientes",
      helper: `${summary.pendientes} por repasar ahora.`,
      targetMode: "practicar",
    };
  }

  if (summary.debiles > 0) {
    return {
      key: "practice_weak",
      label: "Reforzar débiles",
      helper: `${summary.debiles} necesitan más práctica.`,
      targetMode: "practicar",
    };
  }

  if (summary.solo_expuestos > 0) {
    return {
      key: "practice_now",
      label: "Practicar ahora",
      helper: `${summary.solo_expuestos} ya se vieron en Aprender.`,
      targetMode: "practicar",
    };
  }

  if (summary.total > 0 && summary.nuevos >= Math.ceil(summary.total / 2)) {
    return {
      key: "learn_now",
      label: "Empezar a aprender",
      helper: `${summary.nuevos} siguen nuevas en esta lección.`,
      targetMode: "aprender",
    };
  }

  if (summary.dominados === summary.total && summary.total > 0) {
    return {
      key: "review_lesson",
      label: "Repasar lección",
      helper: "La lección va muy bien. Haz un repaso corto.",
      targetMode: "practicar",
    };
  }

  return {
    key: "review_lesson",
    label: "Seguir practicando",
    helper: `${summary.aprendiendo + summary.en_repaso} siguen en progreso.`,
    targetMode: "practicar",
  };
}
