export type StudySrsItemType = "kana" | "vocab" | "kanji" | "grammar" | "flashcard";
export type StudySrsSourceTool = "learnkana" | "kana" | "sprint" | "flashcards" | "exam";

export type StudySrsRecord = {
  itemId: string;
  itemType: StudySrsItemType;
  sourceTool: StudySrsSourceTool;
  sourceLesson?: number | null;
  sourceDeck?: string | null;
  label?: string | null;
  timesSeen: number;
  timesCorrect: number;
  timesWrong: number;
  timesAlmost: number;
  lastReviewed: string | null;
  nextReview: string | null;
  level: number;
  ease: number;
  difficult: boolean;
  mastered: boolean;
};

export type StudySrsMap = Record<string, StudySrsRecord>;
export type StudySrsRating = "wrong" | "almost" | "correct";

type RecordStudyResultInput = {
  itemId: string;
  itemType: StudySrsItemType;
  sourceTool: StudySrsSourceTool;
  sourceLesson?: number | null;
  sourceDeck?: string | null;
  label?: string | null;
  rating: StudySrsRating;
};

type RankedSrsMeta = {
  itemId: string;
  itemType: StudySrsItemType;
  sourceTool: StudySrsSourceTool;
};

const REVIEW_DAYS = [2, 4, 7, 14, 30];

function getRecordKey(input: Pick<RecordStudyResultInput, "sourceTool" | "itemType" | "itemId">) {
  return `${input.sourceTool}:${input.itemType}:${input.itemId}`;
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function isDue(record?: StudySrsRecord | null) {
  if (!record?.nextReview) return true;
  return new Date(record.nextReview).getTime() <= Date.now();
}

export function getStudySrsStorageKey(userKey: string) {
  return `study-srs-${userKey || "anon"}`;
}

export function loadStudySrs(userKey: string): StudySrsMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(getStudySrsStorageKey(userKey));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StudySrsMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveStudySrs(userKey: string, records: StudySrsMap) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getStudySrsStorageKey(userKey), JSON.stringify(records));
  } catch {}
}

export function recordStudyResult(records: StudySrsMap, input: RecordStudyResultInput): StudySrsMap {
  const key = getRecordKey(input);
  const current = records[key];
  const timesSeen = (current?.timesSeen || 0) + 1;
  const timesCorrect = (current?.timesCorrect || 0) + (input.rating === "correct" ? 1 : 0);
  const timesWrong = (current?.timesWrong || 0) + (input.rating === "wrong" ? 1 : 0);
  const timesAlmost = (current?.timesAlmost || 0) + (input.rating === "almost" ? 1 : 0);

  let level = current?.level || 0;
  let ease = current?.ease || 1;

  if (input.rating === "correct") {
    level = Math.min(level + 1, REVIEW_DAYS.length - 1);
    ease = Math.min(ease + 0.08, 2.2);
  } else if (input.rating === "almost") {
    level = Math.max(level, 1);
    ease = Math.max(ease - 0.02, 1);
  } else {
    level = Math.max(level - 1, 0);
    ease = Math.max(ease - 0.12, 1);
  }

  const nextReview =
    input.rating === "wrong"
      ? hoursFromNow(2)
      : input.rating === "almost"
        ? daysFromNow(1)
        : daysFromNow(Math.max(1, Math.round(REVIEW_DAYS[level] * ease)));

  const difficult = timesWrong >= 2 && timesWrong >= timesCorrect;
  const mastered = level >= 4 && timesCorrect >= timesWrong + 4;

  return {
    ...records,
    [key]: {
      itemId: input.itemId,
      itemType: input.itemType,
      sourceTool: input.sourceTool,
      sourceLesson: input.sourceLesson ?? current?.sourceLesson ?? null,
      sourceDeck: input.sourceDeck ?? current?.sourceDeck ?? null,
      label: input.label ?? current?.label ?? null,
      timesSeen,
      timesCorrect,
      timesWrong,
      timesAlmost,
      lastReviewed: new Date().toISOString(),
      nextReview,
      level,
      ease,
      difficult,
      mastered,
    },
  };
}

export function recordStudyResultToStorage(userKey: string, input: RecordStudyResultInput) {
  const current = loadStudySrs(userKey);
  const next = recordStudyResult(current, input);
  saveStudySrs(userKey, next);
  return next;
}

export function getStudyDueSummary(records: StudySrsMap) {
  const values = Object.values(records);
  const due = values.filter((record) => isDue(record));
  const difficult = values.filter((record) => record.difficult);
  const byTool = due.reduce<Record<StudySrsSourceTool, number>>((acc, record) => {
    acc[record.sourceTool] = (acc[record.sourceTool] || 0) + 1;
    return acc;
  }, {
    learnkana: 0,
    kana: 0,
    sprint: 0,
    flashcards: 0,
    exam: 0,
  });

  return {
    totalDue: due.length,
    difficult: difficult.length,
    byTool,
  };
}

export function rankItemsForReview<T>(items: T[], records: StudySrsMap, getMeta: (item: T) => RankedSrsMeta) {
  return [...items].sort((a, b) => getReviewWeight(records, getMeta(b)) - getReviewWeight(records, getMeta(a)));
}

function getReviewWeight(records: StudySrsMap, meta: RankedSrsMeta) {
  const record = records[getRecordKey(meta)];
  if (!record) return 300;
  if (isDue(record)) {
    const dueAge = record.nextReview ? Math.max(0, Date.now() - new Date(record.nextReview).getTime()) : 0;
    return 1000 + Math.min(200, dueAge / (1000 * 60 * 60));
  }
  if (record.difficult) return 700 - record.level * 12;
  if (!record.mastered) return 200 - record.level * 14;
  return 50 - record.level * 4;
}
