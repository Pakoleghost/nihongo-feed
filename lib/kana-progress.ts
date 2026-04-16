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
  nextReview: string | null;
  level: number;
  ease: number;
  difficult: boolean;
};

export type KanaProgressMap = Record<string, KanaProgressEntry>;

const LEVEL_INTERVALS_HOURS = [0, 8, 24, 72, 168, 336, 720];

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
    level: 0,
    ease: 1,
    difficult: false,
  };
}

export function applyKanaRating(progress: KanaProgressMap, item: KanaItem, rating: KanaRating) {
  const current = progress[item.id] || createInitialEntry(item);
  const timesSeen = current.timesSeen + 1;
  const timesCorrect = current.timesCorrect + (rating === "correct" ? 1 : 0);
  const timesWrong = current.timesWrong + (rating === "wrong" ? 1 : 0);
  const timesAlmost = current.timesAlmost + (rating === "almost" ? 1 : 0);

  let level = current.level;
  let ease = current.ease;

  if (rating === "correct") {
    level = Math.min(current.level + 1, LEVEL_INTERVALS_HOURS.length - 1);
    ease = Math.min(current.ease + 0.08, 2.4);
  } else if (rating === "almost") {
    level = Math.max(current.level, 1);
    ease = Math.max(current.ease - 0.04, 1);
  } else {
    level = Math.max(current.level - 1, 0);
    ease = Math.max(current.ease - 0.12, 1);
  }

  const nextReview =
    rating === "wrong"
      ? hoursFromNow(4)
      : rating === "almost"
        ? hoursFromNow(18)
        : hoursFromNow(Math.max(LEVEL_INTERVALS_HOURS[level], 12) * ease);

  const difficult = timesWrong >= 2 && timesWrong >= timesCorrect;

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
      level,
      ease,
      difficult,
    },
  };
}

function isDue(entry?: KanaProgressEntry | null) {
  if (!entry?.nextReview) return true;
  return new Date(entry.nextReview).getTime() <= Date.now();
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
