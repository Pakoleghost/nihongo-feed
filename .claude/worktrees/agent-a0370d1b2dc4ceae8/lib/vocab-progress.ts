import type { GenkiVocabItem } from "@/lib/genki-vocab-by-lesson";
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

export type VocabProgressEntry = PracticeProgressEntry<"vocab">;
export type VocabProgressMap = PracticeProgressMap<VocabProgressEntry>;

function encodePart(value: string) {
  return encodeURIComponent(value.trim());
}

export function getVocabProgressStorageKey(userKey: string) {
  return `study-vocab-progress-${userKey || "anon"}`;
}

export function getVocabProgressId(lesson: number, item: GenkiVocabItem) {
  const display = item.kanji || item.hira;
  return `vocab:l${lesson}:${encodePart(display)}:${encodePart(item.hira)}:${encodePart(item.es)}`;
}

export function loadVocabProgress(userKey: string): VocabProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(getVocabProgressStorageKey(userKey));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as VocabProgressMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveVocabProgress(userKey: string, progress: VocabProgressMap) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getVocabProgressStorageKey(userKey), JSON.stringify(progress));
  } catch {}
}

export function recordVocabResult(
  progress: VocabProgressMap,
  lesson: number,
  item: GenkiVocabItem,
  rating: PracticeRating,
) {
  const id = getVocabProgressId(lesson, item);
  const nextEntry = recordPracticeResult(progress[id], {
    id,
    module: "vocab",
    lesson,
    display: item.kanji || item.hira,
    reading: item.hira,
    meaning_es: item.es,
  }, rating);

  return {
    ...progress,
    [id]: nextEntry,
  };
}

export function recordVocabExposure(
  progress: VocabProgressMap,
  lesson: number,
  item: GenkiVocabItem,
) {
  const id = getVocabProgressId(lesson, item);
  const nextEntry = recordPracticeExposure(progress[id], {
    id,
    module: "vocab",
    lesson,
    display: item.kanji || item.hira,
    reading: item.hira,
    meaning_es: item.es,
  });

  return {
    ...progress,
    [id]: nextEntry,
  };
}

export function getVocabItemState(entry: VocabProgressEntry | undefined, now = Date.now()): PracticeVisibleState {
  return getPracticeItemState(entry, now);
}

export function getVocabLessonEntries(lesson: number, items: GenkiVocabItem[], progress: VocabProgressMap) {
  return items.map((item) => progress[getVocabProgressId(lesson, item)]);
}

export function getVocabLessonSummary(
  lesson: number,
  items: GenkiVocabItem[],
  progress: VocabProgressMap,
  now = Date.now(),
): PracticeProgressSummary {
  return buildPracticeSummary(getVocabLessonEntries(lesson, items, progress), now);
}

export function isVocabDue(entry: VocabProgressEntry | undefined, now = Date.now()) {
  return isPracticeDue(entry, now);
}

export function isVocabDifficult(entry: VocabProgressEntry | undefined) {
  return isPracticeDifficult(entry);
}

export function isVocabDominated(entry: VocabProgressEntry | undefined, now = Date.now()) {
  return isPracticeDominated(entry, now);
}
