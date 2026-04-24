import { KANA_ITEMS, type KanaItem } from "@/lib/kana-data";
import { isKanaDue, type KanaProgressEntry, type KanaProgressMap } from "@/lib/kana-progress";

type KanaGroup = {
  primary: string;
  secondary?: string;
  items: KanaItem[];
};

export type KanaSmartRecommendation = {
  itemIds: string[];
  focusItemIds: string[];
  kind: "review" | "learn" | "review_all";
  title: string;
  detail: string;
  chips: string[];
  contextPrimary: string;
  contextSecondary: string;
};

const HIRAGANA_ROWS = [
  { secondary: "Vocales", kana: ["あ", "い", "う", "え", "お"] },
  { secondary: "Fila K", kana: ["か", "き", "く", "け", "こ"] },
  { secondary: "Fila S", kana: ["さ", "し", "す", "せ", "そ"] },
  { secondary: "Fila T", kana: ["た", "ち", "つ", "て", "と"] },
  { secondary: "Fila N", kana: ["な", "に", "ぬ", "ね", "の"] },
  { secondary: "Fila H", kana: ["は", "ひ", "ふ", "へ", "ほ"] },
  { secondary: "Fila M", kana: ["ま", "み", "む", "め", "も"] },
  { secondary: "Fila Y", kana: ["や", "ゆ", "よ"] },
  { secondary: "Fila R", kana: ["ら", "り", "る", "れ", "ろ"] },
  { secondary: "Fila W", kana: ["わ", "を", "ん"] },
] as const;

const KATAKANA_ROWS = [
  { secondary: "Vocales", kana: ["ア", "イ", "ウ", "エ", "オ"] },
  { secondary: "Fila K", kana: ["カ", "キ", "ク", "ケ", "コ"] },
  { secondary: "Fila S", kana: ["サ", "シ", "ス", "セ", "ソ"] },
  { secondary: "Fila T", kana: ["タ", "チ", "ツ", "テ", "ト"] },
  { secondary: "Fila N", kana: ["ナ", "ニ", "ヌ", "ネ", "ノ"] },
  { secondary: "Fila H", kana: ["ハ", "ヒ", "フ", "ヘ", "ホ"] },
  { secondary: "Fila M", kana: ["マ", "ミ", "ム", "メ", "モ"] },
  { secondary: "Fila Y", kana: ["ヤ", "ユ", "ヨ"] },
  { secondary: "Fila R", kana: ["ラ", "リ", "ル", "レ", "ロ"] },
  { secondary: "Fila W", kana: ["ワ", "ヲ", "ン"] },
] as const;

function getItemsByKana(kana: readonly string[]) {
  const set = new Set(kana);
  return KANA_ITEMS.filter((item) => set.has(item.kana));
}

function buildKanaGroups(): KanaGroup[] {
  return [
    ...HIRAGANA_ROWS.map((row) => ({
      primary: "Hiragana",
      secondary: row.secondary,
      items: getItemsByKana(row.kana),
    })),
    ...KATAKANA_ROWS.map((row) => ({
      primary: "Katakana",
      secondary: row.secondary,
      items: getItemsByKana(row.kana),
    })),
    {
      primary: "Diacríticos",
      secondary: "Dakuten",
      items: KANA_ITEMS.filter((item) => item.set === "dakuten"),
    },
    {
      primary: "Diacríticos",
      secondary: "Maru",
      items: KANA_ITEMS.filter((item) => item.set === "handakuten"),
    },
    {
      primary: "Combinaciones",
      secondary: "",
      items: KANA_ITEMS.filter((item) => item.set === "yoon"),
    },
  ];
}

const KANA_GROUPS = buildKanaGroups();

function isDominated(item: KanaItem, progress: KanaProgressMap) {
  return (progress[item.id]?.level ?? 0) >= 4;
}

function isSeen(entry: KanaProgressEntry | undefined) {
  return Boolean(entry && entry.timesSeen > 0);
}

function getNextDueAt(entry: KanaProgressEntry | undefined) {
  if (!entry) return Number.POSITIVE_INFINITY;
  if (entry.next_due_at !== null && entry.next_due_at !== undefined) return entry.next_due_at;
  if (!entry.nextReview) return Number.POSITIVE_INFINITY;
  const parsed = new Date(entry.nextReview).getTime();
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

function compareNumber(left: number, right: number) {
  if (left === right) return 0;
  if (Number.isNaN(left) && Number.isNaN(right)) return 0;
  if (Number.isNaN(left)) return 1;
  if (Number.isNaN(right)) return -1;
  return left - right;
}

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function formatContext(group: KanaGroup) {
  return group.secondary ? `${group.primary} · ${group.secondary}` : group.primary;
}

function uniqueItems(items: KanaItem[]) {
  const seen = new Set<string>();
  const unique: KanaItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
  }
  return unique;
}

function getGroupsBefore(group: KanaGroup) {
  const index = KANA_GROUPS.indexOf(group);
  return index <= 0 ? [] : KANA_GROUPS.slice(0, index);
}

function getPreviousReviewItems(group: KanaGroup, progress: KanaProgressMap) {
  return getGroupsBefore(group).flatMap((previousGroup) =>
    previousGroup.items.filter((item) => {
      const entry = progress[item.id];
      if (!isSeen(entry)) return false;
      return isKanaDue(entry) || entry?.difficult || !isDominated(item, progress);
    }),
  );
}

function buildRecommendationItemIds(group: KanaGroup, progress: KanaProgressMap) {
  const focusItems = group.items;
  const reviewItems = getPreviousReviewItems(group, progress);
  return uniqueItems([...focusItems, ...reviewItems]).map((item) => item.id);
}

function getDueItems(group: KanaGroup, progress: KanaProgressMap) {
  return group.items.filter((item) => isKanaDue(progress[item.id]));
}

function getUndominatedItems(group: KanaGroup, progress: KanaProgressMap) {
  return group.items.filter((item) => !isDominated(item, progress));
}

function getUnseenItems(group: KanaGroup, progress: KanaProgressMap) {
  return group.items.filter((item) => !isSeen(progress[item.id]));
}

type SmartBucket = "due" | "weak" | "learning" | "fresh" | "stable";

function getSmartBucket(item: KanaItem, progress: KanaProgressMap): SmartBucket {
  const entry = progress[item.id];
  if (!isSeen(entry)) return "fresh";
  if (isKanaDue(entry)) return "due";
  if (entry?.difficult) return "weak";
  if (!isDominated(item, progress)) return "learning";
  return "stable";
}

function compareWithinBucket(
  bucket: SmartBucket,
  left: { item: KanaItem; entry: KanaProgressEntry | undefined; naturalIndex: number },
  right: { item: KanaItem; entry: KanaProgressEntry | undefined; naturalIndex: number },
) {
  if (bucket === "due") {
    const dueDiff = compareNumber(getNextDueAt(left.entry), getNextDueAt(right.entry));
    if (dueDiff !== 0) return dueDiff;
    const wrongDiff = (right.entry?.timesWrong ?? 0) - (left.entry?.timesWrong ?? 0);
    if (wrongDiff !== 0) return wrongDiff;
    const levelDiff = (left.entry?.level ?? 0) - (right.entry?.level ?? 0);
    if (levelDiff !== 0) return levelDiff;
    return 0;
  }

  if (bucket === "weak") {
    const wrongDiff = (right.entry?.timesWrong ?? 0) - (left.entry?.timesWrong ?? 0);
    if (wrongDiff !== 0) return wrongDiff;
    const levelDiff = (left.entry?.level ?? 0) - (right.entry?.level ?? 0);
    if (levelDiff !== 0) return levelDiff;
    return 0;
  }

  if (bucket === "learning") {
    const levelDiff = (left.entry?.level ?? 0) - (right.entry?.level ?? 0);
    if (levelDiff !== 0) return levelDiff;
    const seenDiff = (left.entry?.timesSeen ?? 0) - (right.entry?.timesSeen ?? 0);
    if (seenDiff !== 0) return seenDiff;
    const wrongDiff = (right.entry?.timesWrong ?? 0) - (left.entry?.timesWrong ?? 0);
    if (wrongDiff !== 0) return wrongDiff;
    return 0;
  }

  if (bucket === "fresh") {
    return left.naturalIndex - right.naturalIndex;
  }

  const dueDiff = compareNumber(getNextDueAt(left.entry), getNextDueAt(right.entry));
  if (dueDiff !== 0) return dueDiff;
  const levelDiff = (left.entry?.level ?? 0) - (right.entry?.level ?? 0);
  if (levelDiff !== 0) return levelDiff;
  const wrongDiff = (right.entry?.timesWrong ?? 0) - (left.entry?.timesWrong ?? 0);
  if (wrongDiff !== 0) return wrongDiff;
  return 0;
}

function prioritizeSmartGroup(items: KanaItem[], progress: KanaProgressMap) {
  const natural = items.map((item, naturalIndex) => ({
    item,
    naturalIndex,
    entry: progress[item.id],
  }));
  const hasSeenItems = natural.some(({ entry }) => isSeen(entry));

  if (!hasSeenItems) {
    return natural.map(({ item }) => item);
  }

  const bucketOrder: SmartBucket[] = ["due", "weak", "learning", "fresh", "stable"];
  const randomized = shuffle(natural);

  randomized.sort((left, right) => {
    const leftBucket = getSmartBucket(left.item, progress);
    const rightBucket = getSmartBucket(right.item, progress);
    const bucketDiff = bucketOrder.indexOf(leftBucket) - bucketOrder.indexOf(rightBucket);
    if (bucketDiff !== 0) return bucketDiff;
    return compareWithinBucket(leftBucket, left, right);
  });

  return randomized.map(({ item }) => item);
}

function buildRepeatPass(items: KanaItem[], progress: KanaProgressMap, previousId?: string) {
  if (items.length <= 1) return items;
  const ordered = prioritizeSmartGroup(items, progress);
  if (previousId && ordered[0]?.id === previousId) {
    return [...ordered.slice(1), ordered[0]];
  }
  return ordered;
}

export function buildKanaSmartSessionItems(items: KanaItem[], progress: KanaProgressMap, count: number) {
  return buildKanaSmartSessionItemsWithFocus(items, progress, count);
}

export function buildKanaSmartSessionItemsWithFocus(
  items: KanaItem[],
  progress: KanaProgressMap,
  count: number,
  focusItemIds: string[] = [],
) {
  const focusIdSet = new Set(focusItemIds);
  const focusItems = focusItemIds.length > 0 ? items.filter((item) => focusIdSet.has(item.id)) : [];
  const reviewItems = focusItemIds.length > 0 ? items.filter((item) => !focusIdSet.has(item.id)) : [];

  if (focusItems.length > 0 && reviewItems.length > 0) {
    const focusOrdered = prioritizeSmartGroup(focusItems, progress);
    const reviewOrdered = prioritizeSmartGroup(reviewItems, progress);
    const focusQuota = Math.min(count, Math.max(Math.ceil(count * 0.65), Math.min(focusOrdered.length, count)));
    const reviewQuota = Math.max(0, count - focusQuota);
    const sessionItems: KanaItem[] = [];
    const pushUnique = (item: KanaItem | undefined) => {
      if (!item || sessionItems.some((entry) => entry.id === item.id)) return;
      sessionItems.push(item);
    };

    let focusIndex = 0;
    let reviewIndex = 0;

    while (sessionItems.length < count && (focusIndex < focusQuota || reviewIndex < reviewQuota)) {
      pushUnique(focusOrdered[focusIndex]);
      focusIndex += 1;
      if (reviewIndex < reviewQuota) {
        pushUnique(reviewOrdered[reviewIndex]);
        reviewIndex += 1;
      }
      if (focusIndex < focusQuota) {
        pushUnique(focusOrdered[focusIndex]);
        focusIndex += 1;
      }
    }

    const fillPool = [...focusOrdered, ...reviewOrdered];
    let fillIndex = 0;
    while (sessionItems.length < count && fillPool.length > 0) {
      sessionItems.push(fillPool[fillIndex % fillPool.length]);
      fillIndex += 1;
      if (fillIndex > count * 4) break;
    }

    return sessionItems.slice(0, count);
  }

  const ordered = prioritizeSmartGroup(items, progress);
  if (ordered.length >= count) {
    return ordered.slice(0, count);
  }

  const activeItems = ordered.filter((item) => {
    const bucket = getSmartBucket(item, progress);
    return bucket !== "stable";
  });
  const repeatPool = activeItems.length > 0 ? activeItems : ordered;
  const sessionItems = [...ordered];

  while (sessionItems.length < count && repeatPool.length > 0) {
    const nextPass = buildRepeatPass(repeatPool, progress, sessionItems[sessionItems.length - 1]?.id);
    for (const item of nextPass) {
      if (sessionItems.length >= count) break;
      sessionItems.push(item);
    }
  }

  return sessionItems.slice(0, count);
}

export function getKanaSmartRecommendation(
  progress: KanaProgressMap,
  counts: { vistos: number; aprendiendo: number; dominados: number },
): KanaSmartRecommendation {
  const reviewGroup = KANA_GROUPS.find((group) => getDueItems(group, progress).length > 0) ?? null;

  if (reviewGroup) {
    const dueItems = getDueItems(reviewGroup, progress);
    return {
      kind: "review",
      title: `Repasa ${dueItems.length} pendientes`,
      detail: formatContext(reviewGroup),
      chips: [
        `${dueItems.length} en esta sesión`,
        `${counts.aprendiendo} en aprendizaje`,
      ],
      contextPrimary: reviewGroup.primary,
      contextSecondary: reviewGroup.secondary ?? "",
      focusItemIds: reviewGroup.items.map((item) => item.id),
      itemIds: buildRecommendationItemIds(reviewGroup, progress),
    };
  }

  const nextFreshGroup = KANA_GROUPS.find((group) => getUnseenItems(group, progress).length > 0) ?? null;

  if (nextFreshGroup) {
    const remainingItems = getUnseenItems(nextFreshGroup, progress);
    return {
      kind: "learn",
      title: `Sigue con ${nextFreshGroup.secondary?.toLowerCase() || nextFreshGroup.primary.toLowerCase()}`,
      detail: formatContext(nextFreshGroup),
      chips: [
        `${remainingItems.length} nuevas en esta sesión`,
        `${counts.dominados} dominados`,
      ],
      contextPrimary: nextFreshGroup.primary,
      contextSecondary: nextFreshGroup.secondary ?? "",
      focusItemIds: nextFreshGroup.items.map((item) => item.id),
      itemIds: buildRecommendationItemIds(nextFreshGroup, progress),
    };
  }

  const nextGroup = KANA_GROUPS.find((group) => getUndominatedItems(group, progress).length > 0) ?? null;

  if (nextGroup) {
    const remainingItems = getUndominatedItems(nextGroup, progress);
    return {
      kind: "learn",
      title: `Sigue con ${nextGroup.secondary?.toLowerCase() || nextGroup.primary.toLowerCase()}`,
      detail: formatContext(nextGroup),
      chips: [
        `${remainingItems.length} en esta sesión`,
        `${counts.dominados} dominados`,
      ],
      contextPrimary: nextGroup.primary,
      contextSecondary: nextGroup.secondary ?? "",
      focusItemIds: nextGroup.items.map((item) => item.id),
      itemIds: buildRecommendationItemIds(nextGroup, progress),
    };
  }

  const fallbackGroup = KANA_GROUPS[0];
  return {
    kind: "review_all",
    title: "Repasa vocales",
    detail: formatContext(fallbackGroup),
    chips: [
      `${counts.vistos} vistos`,
      `${counts.dominados} dominados`,
    ],
    contextPrimary: fallbackGroup.primary,
    contextSecondary: fallbackGroup.secondary ?? "",
    focusItemIds: fallbackGroup.items.map((item) => item.id),
    itemIds: buildRecommendationItemIds(fallbackGroup, progress),
  };
}
