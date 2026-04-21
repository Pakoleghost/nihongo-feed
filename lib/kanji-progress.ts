import type { GenkiKanjiItem } from "@/lib/genki-kanji-by-lesson";
import {
  buildPracticeSummary,
  getPracticeItemState,
  isPracticeDifficult,
  isPracticeDominated,
  isPracticeDue,
  recordPracticeExposure,
  recordPracticeResult,
  type PracticeProgressEntry,
  type PracticeProgressMap,
  type PracticeProgressSummary,
  type PracticeRating,
  type PracticeVisibleState,
} from "@/lib/practice-srs";

export type KanjiProgressEntry = PracticeProgressEntry<"kanji">;
export type KanjiProgressMap = PracticeProgressMap<KanjiProgressEntry>;

function encodePart(value: string) {
  return encodeURIComponent(value.trim());
}

export function getKanjiProgressStorageKey(userKey: string) {
  return `study-kanji-progress-${userKey || "anon"}`;
}

export function getKanjiProgressId(lesson: number, item: GenkiKanjiItem) {
  return `kanji:l${lesson}:${encodePart(item.kanji)}:${encodePart(item.hira)}:${encodePart(item.es)}`;
}

export function loadKanjiProgress(userKey: string): KanjiProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(getKanjiProgressStorageKey(userKey));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as KanjiProgressMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveKanjiProgress(userKey: string, progress: KanjiProgressMap) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getKanjiProgressStorageKey(userKey), JSON.stringify(progress));
  } catch {}
}

export function recordKanjiResult(
  progress: KanjiProgressMap,
  lesson: number,
  item: GenkiKanjiItem,
  rating: PracticeRating,
) {
  const id = getKanjiProgressId(lesson, item);
  const nextEntry = recordPracticeResult(progress[id], {
    id,
    module: "kanji",
    lesson,
    display: item.kanji,
    reading: item.hira,
    meaning_es: item.es,
  }, rating);

  return {
    ...progress,
    [id]: nextEntry,
  };
}

export function recordKanjiExposure(
  progress: KanjiProgressMap,
  lesson: number,
  item: GenkiKanjiItem,
) {
  const id = getKanjiProgressId(lesson, item);
  const nextEntry = recordPracticeExposure(progress[id], {
    id,
    module: "kanji",
    lesson,
    display: item.kanji,
    reading: item.hira,
    meaning_es: item.es,
  });

  return {
    ...progress,
    [id]: nextEntry,
  };
}

export function getKanjiItemState(entry: KanjiProgressEntry | undefined, now = Date.now()): PracticeVisibleState {
  return getPracticeItemState(entry, now);
}

export function getKanjiLessonEntries(lesson: number, items: GenkiKanjiItem[], progress: KanjiProgressMap) {
  return items.map((item) => progress[getKanjiProgressId(lesson, item)]);
}

export function getKanjiLessonSummary(
  lesson: number,
  items: GenkiKanjiItem[],
  progress: KanjiProgressMap,
  now = Date.now(),
): PracticeProgressSummary {
  return buildPracticeSummary(getKanjiLessonEntries(lesson, items, progress), now);
}

export function isKanjiDue(entry: KanjiProgressEntry | undefined, now = Date.now()) {
  return isPracticeDue(entry, now);
}

export function isKanjiDifficult(entry: KanjiProgressEntry | undefined) {
  return isPracticeDifficult(entry);
}

export function isKanjiDominated(entry: KanjiProgressEntry | undefined, now = Date.now()) {
  return isPracticeDominated(entry, now);
}
