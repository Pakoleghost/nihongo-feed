import { KANA_ITEMS, type KanaItem } from "@/lib/kana-data";
import { isKanaDue, type KanaProgressMap } from "@/lib/kana-progress";

type KanaGroup = {
  primary: string;
  secondary?: string;
  items: KanaItem[];
};

export type KanaSmartRecommendation = {
  itemIds: string[];
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

function formatContext(group: KanaGroup) {
  return group.secondary ? `${group.primary} · ${group.secondary}` : group.primary;
}

function getDueItems(group: KanaGroup, progress: KanaProgressMap) {
  return group.items.filter((item) => isKanaDue(progress[item.id]));
}

function getUndominatedItems(group: KanaGroup, progress: KanaProgressMap) {
  return group.items.filter((item) => !isDominated(item, progress));
}

export function getKanaSmartRecommendation(
  progress: KanaProgressMap,
  counts: { vistos: number; aprendiendo: number; dominados: number },
): KanaSmartRecommendation {
  const reviewGroup = KANA_GROUPS.find((group) => getDueItems(group, progress).length > 0) ?? null;

  if (reviewGroup) {
    const dueItems = getDueItems(reviewGroup, progress);
    return {
      itemIds: dueItems.map((item) => item.id),
      kind: "review",
      title: `Repasa ${dueItems.length} pendientes`,
      detail: formatContext(reviewGroup),
      chips: [
        `${dueItems.length} en esta sesión`,
        `${counts.aprendiendo} en aprendizaje`,
      ],
      contextPrimary: reviewGroup.primary,
      contextSecondary: reviewGroup.secondary ?? "",
    };
  }

  const nextGroup = KANA_GROUPS.find((group) => getUndominatedItems(group, progress).length > 0) ?? null;

  if (nextGroup) {
    const remainingItems = getUndominatedItems(nextGroup, progress);
    return {
      itemIds: remainingItems.map((item) => item.id),
      kind: "learn",
      title: `Sigue con ${nextGroup.secondary?.toLowerCase() || nextGroup.primary.toLowerCase()}`,
      detail: formatContext(nextGroup),
      chips: [
        `${remainingItems.length} en esta sesión`,
        `${counts.dominados} dominados`,
      ],
      contextPrimary: nextGroup.primary,
      contextSecondary: nextGroup.secondary ?? "",
    };
  }

  const fallbackGroup = KANA_GROUPS[0];
  return {
    itemIds: fallbackGroup.items.map((item) => item.id),
    kind: "review_all",
    title: "Repasa vocales",
    detail: formatContext(fallbackGroup),
    chips: [
      `${counts.vistos} vistos`,
      `${counts.dominados} dominados`,
    ],
    contextPrimary: fallbackGroup.primary,
    contextSecondary: fallbackGroup.secondary ?? "",
  };
}
