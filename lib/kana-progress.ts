import type { KanaItem } from "@/lib/kana-data";

export type KanaRating = "wrong" | "almost" | "correct";

export type KanaProgressEntry = {
  kana: string;
  romaji: string;
  script: "hiragana" | "katakana";
  set: "basic" | "dakuten" | "handakuten" | "yoon";
  timesSeen: number;
  timesCorrect: number;
  timesWrong: number;
  timesAlmost: number;
  lastReviewed: string | null;
  /** @deprecated legacy field — use next_due_at instead */
  nextReview: string | null;
  /** Timestamp (ms) when this item is next due. null = immediately due. */
  next_due_at: number | null;
  level: number;
  ease: number;
  difficult: boolean;
};

export type KanaProgressMap = Record<string, KanaProgressEntry>;

// Leitner intervals in milliseconds
const MS = {
  h4:  4  * 60 * 60 * 1000,
  h24: 24 * 60 * 60 * 1000,
  d3:  3  * 24 * 60 * 60 * 1000,
  d7:  7  * 24 * 60 * 60 * 1000,
} as const;

function leitnerNextDueAt(level: number): number {
  if (level <= 0) return Date.now();
  if (level === 1) return Date.now() + MS.h4;
  if (level === 2) return Date.now() + MS.h24;
  if (level === 3) return Date.now() + MS.d3;
  return Date.now() + MS.d7; // level 4+
}

/** True when the item should appear in a review session. */
export function isKanaDue(entry: KanaProgressEntry | undefined | null): boolean {
  if (!entry || entry.timesSeen === 0) return false; // nuevos no están "pendientes"
  if (entry.next_due_at !== null && entry.next_due_at !== undefined) {
    return entry.next_due_at <= Date.now();
  }
  // backward-compat: fall back to legacy nextReview ISO string
  if (!entry.nextReview) return true;
  return new Date(entry.nextReview).getTime() <= Date.now();
}

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export function getKanaProgressStorageKey(userKey: string) {
  return `study-kana-progress-${userKey || "anon"}`;
}

export function loadKanaProgress(userKey: string): KanaProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(getKanaProgressStorageKey(userKey));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as KanaProgressMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveKanaProgress(userKey: string, progress: KanaProgressMap) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getKanaProgressStorageKey(userKey), JSON.stringify(progress));
  } catch {}
}

function createInitialEntry(item: KanaItem): KanaProgressEntry {
  return {
    kana: item.kana,
    romaji: item.romaji,
    script: item.script,
    set: item.set,
    timesSeen: 0,
    timesCorrect: 0,
    timesWrong: 0,
    timesAlmost: 0,
    lastReviewed: null,
    nextReview: null,
    next_due_at: null,
    level: 0,
    ease: 1,
    difficult: false,
  };
}

export function applyKanaRating(progress: KanaProgressMap, item: KanaItem, rating: KanaRating) {
  const current = progress[item.id] || createInitialEntry(item);
  const timesSeen = current.timesSeen + 1;
  const timesCorrect = current.timesCorrect + (rating === "correct" ? 1 : 0);
  const timesWrong  = current.timesWrong  + (rating === "wrong"   ? 1 : 0);
  const timesAlmost = current.timesAlmost + (rating === "almost"  ? 1 : 0);

  let level: number;
  let next_due_at: number;

  if (rating === "correct") {
    // Advance one level, schedule according to Leitner intervals
    level = Math.min(current.level + 1, 6);
    next_due_at = leitnerNextDueAt(level);
  } else if (rating === "almost") {
    // Keep level, review again in 4 hours
    level = Math.max(current.level, 1);
    next_due_at = Date.now() + MS.h4;
  } else {
    // Wrong at ANY level → drop to level 1, review immediately
    level = 1;
    next_due_at = Date.now();
  }

  const difficult = timesWrong >= 2 && timesWrong >= timesCorrect;

  // Keep legacy nextReview in sync for any code still reading it
  const nextReview = new Date(next_due_at).toISOString();

  return {
    ...progress,
    [item.id]: {
      kana: item.kana,
      romaji: item.romaji,
      script: item.script,
      set: item.set,
      timesSeen,
      timesCorrect,
      timesWrong,
      timesAlmost,
      lastReviewed: new Date().toISOString(),
      nextReview,
      next_due_at,
      level,
      ease: current.ease, // ease factor kept for future use; not driving scheduling now
      difficult,
    },
  };
}

function isDue(entry?: KanaProgressEntry | null) {
  return isKanaDue(entry);
}

export type KanaItemState = "nuevo" | "aprendiendo" | "en_repaso" | "fijado";

export function getKanaItemState(entry: KanaProgressEntry | undefined): KanaItemState {
  if (!entry || entry.timesSeen === 0) return "nuevo";
  if (entry.level <= 2) return "aprendiendo";
  if (entry.level === 3) return "en_repaso";
  return "fijado"; // level >= 4
}

export function getKanaStateCounts(items: KanaItem[], progress: KanaProgressMap) {
  const counts = { nuevo: 0, aprendiendo: 0, en_repaso: 0, fijado: 0 };
  for (const item of items) {
    const state = getKanaItemState(progress[item.id]);
    counts[state]++;
  }
  return counts;
}

export function getKanaProgressSummary(items: KanaItem[], progress: KanaProgressMap) {
  const relevant = items
    .map((item) => progress[item.id])
    .filter((entry): entry is KanaProgressEntry => Boolean(entry));
  return {
    practiced: relevant.filter((entry) => entry.timesSeen > 0).length,
    difficult: relevant.filter((entry) => entry.difficult).length,
    due: relevant.filter((entry) => isDue(entry)).length,
  };
}

export function buildKanaSessionItems(items: KanaItem[], progress: KanaProgressMap, count: number) {
  // --- Fallback 1: no progress data at all → return basic hiragana in natural order ---
  const hasAnyProgress = Object.keys(progress).length > 0;
  if (!hasAnyProgress) {
    const basicHiragana = items.filter((i) => i.script === "hiragana" && i.set === "basic");
    // Use natural KANA_ITEMS order (vowel-first: a-i-u-e-o, ka-ki-ku…)
    const result: KanaItem[] = [];
    const used = new Set<string>();
    for (const item of basicHiragana) {
      if (result.length >= count) break;
      if (!used.has(item.id)) { used.add(item.id); result.push(item); }
    }
    // If count exceeds basic hiragana length, cycle through again
    let i = 0;
    while (result.length < count && basicHiragana.length > 0) {
      const item = basicHiragana[i % basicHiragana.length];
      result.push(item);
      i++;
      if (i > count * 3) break;
    }
    return result.slice(0, count);
  }

  const due: KanaItem[] = [];
  const difficult: KanaItem[] = [];
  const fresh: KanaItem[] = [];
  const stable: KanaItem[] = [];

  items.forEach((item) => {
    const entry = progress[item.id];
    if (!entry) {
      fresh.push(item);
      return;
    }
    if (entry.difficult) {
      difficult.push(item);
      return;
    }
    if (isDue(entry)) {
      due.push(item);
      return;
    }
    stable.push(item);
  });

  due.sort((a, b) => {
    const aTime = new Date(progress[a.id]?.nextReview || 0).getTime();
    const bTime = new Date(progress[b.id]?.nextReview || 0).getTime();
    return aTime - bTime;
  });

  difficult.sort((a, b) => (progress[b.id]?.timesWrong || 0) - (progress[a.id]?.timesWrong || 0));
  fresh.sort(() => Math.random() - 0.5);
  stable.sort((a, b) => (progress[a.id]?.level || 0) - (progress[b.id]?.level || 0));

  // --- Fallback 2: some progress but nothing due → pick least-practiced items ---
  if (due.length === 0 && difficult.length === 0 && fresh.length === 0) {
    // Sort all items by timesCorrect ascending (least practiced first)
    const leastPracticed = [...stable].sort(
      (a, b) => (progress[a.id]?.timesCorrect ?? 0) - (progress[b.id]?.timesCorrect ?? 0)
    );
    const result: KanaItem[] = [];
    const used = new Set<string>();
    for (const item of leastPracticed) {
      if (result.length >= count) break;
      if (!used.has(item.id)) { used.add(item.id); result.push(item); }
    }
    // Cycle if needed
    let i = 0;
    while (result.length < count && leastPracticed.length > 0) {
      result.push(leastPracticed[i % leastPracticed.length]);
      i++;
      if (i > count * 3) break;
    }
    return result.slice(0, count);
  }

  const unique: KanaItem[] = [];
  const used = new Set<string>();

  const pushItems = (source: KanaItem[]) => {
    for (const item of source) {
      if (unique.length >= count) break;
      if (used.has(item.id)) continue;
      used.add(item.id);
      unique.push(item);
    }
  };

  pushItems(due);
  pushItems(difficult);
  pushItems(fresh);
  pushItems(stable);

  if (unique.length >= count) return unique.slice(0, count);

  const pool = [...due, ...difficult, ...fresh, ...stable];
  let poolIndex = 0;
  while (unique.length < count && pool.length > 0) {
    const item = pool[poolIndex % pool.length];
    const last = unique[unique.length - 1];
    if (!last || last.id !== item.id) {
      unique.push(item);
    }
    poolIndex += 1;
    if (poolIndex > pool.length * count * 2) break;
  }

  return unique.slice(0, count);
}
