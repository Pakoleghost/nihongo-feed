export type KanaScript = "hiragana" | "katakana";
export type KanaSet = "basic" | "dakuten" | "handakuten" | "yoon";
export type KanaPracticeSetKey =
  | "hiragana_basic"
  | "katakana_basic"
  | "diacritics"
  | "combinations"
  | "mixed";
export type KanaTableFilter = KanaSet | "mixed";
export type KanaPracticeMode = "multiple_choice" | "romaji_input" | "handwriting";
export type KanaSessionMode = "mixed" | "trace";
export type KanaQuestionType =
  | "kana_to_romaji_choice"
  | "romaji_to_kana_choice"
  | "kana_to_romaji_input"
  | "romaji_to_kana_trace";
export type KanaQuestionCount = 10 | 20 | 30;

export type KanaItem = {
  id: string;
  kana: string;
  romaji: string;
  script: KanaScript;
  set: KanaSet;
  alternatives?: string[];
};

export type KanaTableCell = KanaItem | null;
export type KanaTableSection = {
  key: string;
  label: string;
  columns: number;
  rows: KanaTableCell[][];
};

type KanaSeed = readonly [kana: string, romaji: string];

const HIRAGANA_BASIC: KanaSeed[] = [
  ["あ", "a"], ["い", "i"], ["う", "u"], ["え", "e"], ["お", "o"],
  ["か", "ka"], ["き", "ki"], ["く", "ku"], ["け", "ke"], ["こ", "ko"],
  ["さ", "sa"], ["し", "shi"], ["す", "su"], ["せ", "se"], ["そ", "so"],
  ["た", "ta"], ["ち", "chi"], ["つ", "tsu"], ["て", "te"], ["と", "to"],
  ["な", "na"], ["に", "ni"], ["ぬ", "nu"], ["ね", "ne"], ["の", "no"],
  ["は", "ha"], ["ひ", "hi"], ["ふ", "fu"], ["へ", "he"], ["ほ", "ho"],
  ["ま", "ma"], ["み", "mi"], ["む", "mu"], ["め", "me"], ["も", "mo"],
  ["や", "ya"], ["ゆ", "yu"], ["よ", "yo"],
  ["ら", "ra"], ["り", "ri"], ["る", "ru"], ["れ", "re"], ["ろ", "ro"],
  ["わ", "wa"], ["を", "wo"], ["ん", "n"],
];

const KATAKANA_BASIC: KanaSeed[] = [
  ["ア", "a"], ["イ", "i"], ["ウ", "u"], ["エ", "e"], ["オ", "o"],
  ["カ", "ka"], ["キ", "ki"], ["ク", "ku"], ["ケ", "ke"], ["コ", "ko"],
  ["サ", "sa"], ["シ", "shi"], ["ス", "su"], ["セ", "se"], ["ソ", "so"],
  ["タ", "ta"], ["チ", "chi"], ["ツ", "tsu"], ["テ", "te"], ["ト", "to"],
  ["ナ", "na"], ["ニ", "ni"], ["ヌ", "nu"], ["ネ", "ne"], ["ノ", "no"],
  ["ハ", "ha"], ["ヒ", "hi"], ["フ", "fu"], ["ヘ", "he"], ["ホ", "ho"],
  ["マ", "ma"], ["ミ", "mi"], ["ム", "mu"], ["メ", "me"], ["モ", "mo"],
  ["ヤ", "ya"], ["ユ", "yu"], ["ヨ", "yo"],
  ["ラ", "ra"], ["リ", "ri"], ["ル", "ru"], ["レ", "re"], ["ロ", "ro"],
  ["ワ", "wa"], ["ヲ", "wo"], ["ン", "n"],
];

const HIRAGANA_DAKUTEN: KanaSeed[] = [
  ["が", "ga"], ["ぎ", "gi"], ["ぐ", "gu"], ["げ", "ge"], ["ご", "go"],
  ["ざ", "za"], ["じ", "ji"], ["ず", "zu"], ["ぜ", "ze"], ["ぞ", "zo"],
  ["だ", "da"], ["ぢ", "ji"], ["づ", "zu"], ["で", "de"], ["ど", "do"],
  ["ば", "ba"], ["び", "bi"], ["ぶ", "bu"], ["べ", "be"], ["ぼ", "bo"],
];

const KATAKANA_DAKUTEN: KanaSeed[] = [
  ["ガ", "ga"], ["ギ", "gi"], ["グ", "gu"], ["ゲ", "ge"], ["ゴ", "go"],
  ["ザ", "za"], ["ジ", "ji"], ["ズ", "zu"], ["ゼ", "ze"], ["ゾ", "zo"],
  ["ダ", "da"], ["ヂ", "ji"], ["ヅ", "zu"], ["デ", "de"], ["ド", "do"],
  ["バ", "ba"], ["ビ", "bi"], ["ブ", "bu"], ["ベ", "be"], ["ボ", "bo"],
];

const HIRAGANA_HANDAKUTEN: KanaSeed[] = [
  ["ぱ", "pa"], ["ぴ", "pi"], ["ぷ", "pu"], ["ぺ", "pe"], ["ぽ", "po"],
];

const KATAKANA_HANDAKUTEN: KanaSeed[] = [
  ["パ", "pa"], ["ピ", "pi"], ["プ", "pu"], ["ペ", "pe"], ["ポ", "po"],
];

const HIRAGANA_YOON: KanaSeed[] = [
  ["きゃ", "kya"], ["きゅ", "kyu"], ["きょ", "kyo"],
  ["しゃ", "sha"], ["しゅ", "shu"], ["しょ", "sho"],
  ["ちゃ", "cha"], ["ちゅ", "chu"], ["ちょ", "cho"],
  ["にゃ", "nya"], ["にゅ", "nyu"], ["にょ", "nyo"],
  ["ひゃ", "hya"], ["ひゅ", "hyu"], ["ひょ", "hyo"],
  ["みゃ", "mya"], ["みゅ", "myu"], ["みょ", "myo"],
  ["りゃ", "rya"], ["りゅ", "ryu"], ["りょ", "ryo"],
  ["ぎゃ", "gya"], ["ぎゅ", "gyu"], ["ぎょ", "gyo"],
  ["じゃ", "ja"], ["じゅ", "ju"], ["じょ", "jo"],
  ["びゃ", "bya"], ["びゅ", "byu"], ["びょ", "byo"],
  ["ぴゃ", "pya"], ["ぴゅ", "pyu"], ["ぴょ", "pyo"],
];

const KATAKANA_YOON: KanaSeed[] = [
  ["キャ", "kya"], ["キュ", "kyu"], ["キョ", "kyo"],
  ["シャ", "sha"], ["シュ", "shu"], ["ショ", "sho"],
  ["チャ", "cha"], ["チュ", "chu"], ["チョ", "cho"],
  ["ニャ", "nya"], ["ニュ", "nyu"], ["ニョ", "nyo"],
  ["ヒャ", "hya"], ["ヒュ", "hyu"], ["ヒョ", "hyo"],
  ["ミャ", "mya"], ["ミュ", "myu"], ["ミョ", "myo"],
  ["リャ", "rya"], ["リュ", "ryu"], ["リョ", "ryo"],
  ["ギャ", "gya"], ["ギュ", "gyu"], ["ギョ", "gyo"],
  ["ジャ", "ja"], ["ジュ", "ju"], ["ジョ", "jo"],
  ["ビャ", "bya"], ["ビュ", "byu"], ["ビョ", "byo"],
  ["ピャ", "pya"], ["ピュ", "pyu"], ["ピョ", "pyo"],
];

const ROMAJI_ALTERNATIVES: Record<string, string[]> = {
  shi: ["si"],
  chi: ["ti"],
  tsu: ["tu"],
  fu: ["hu"],
  ji: ["zi"],
  sha: ["sya"],
  shu: ["syu"],
  sho: ["syo"],
  cha: ["tya", "cya"],
  chu: ["tyu", "cyu"],
  cho: ["tyo", "cyo"],
  ja: ["zya", "jya"],
  ju: ["zyu", "jyu"],
  jo: ["zyo", "jyo"],
};

function buildKanaItems(script: KanaScript, set: KanaSet, seeds: KanaSeed[]) {
  return seeds.map(([kana, romaji]) => ({
    id: `${script}-${set}-${kana}`,
    kana,
    romaji,
    script,
    set,
    alternatives: ROMAJI_ALTERNATIVES[romaji] || [],
  })) satisfies KanaItem[];
}

export const KANA_ITEMS: KanaItem[] = [
  ...buildKanaItems("hiragana", "basic", HIRAGANA_BASIC),
  ...buildKanaItems("katakana", "basic", KATAKANA_BASIC),
  ...buildKanaItems("hiragana", "dakuten", HIRAGANA_DAKUTEN),
  ...buildKanaItems("katakana", "dakuten", KATAKANA_DAKUTEN),
  ...buildKanaItems("hiragana", "handakuten", HIRAGANA_HANDAKUTEN),
  ...buildKanaItems("katakana", "handakuten", KATAKANA_HANDAKUTEN),
  ...buildKanaItems("hiragana", "yoon", HIRAGANA_YOON),
  ...buildKanaItems("katakana", "yoon", KATAKANA_YOON),
];

export const KANA_TABLE_FILTERS: Array<{ key: KanaTableFilter; label: string }> = [
  { key: "basic", label: "Basic" },
  { key: "dakuten", label: "Dakuten" },
  { key: "handakuten", label: "Handakuten" },
  { key: "yoon", label: "Yōon" },
  { key: "mixed", label: "Mixed" },
];

export const KANA_PRACTICE_SET_OPTIONS: Array<{ key: KanaPracticeSetKey; label: string }> = [
  { key: "hiragana_basic", label: "Hiragana básico" },
  { key: "katakana_basic", label: "Katakana básico" },
  { key: "diacritics", label: "Diacríticos" },
  { key: "combinations", label: "Combinaciones" },
  { key: "mixed", label: "Mixto" },
];

export const KANA_PRACTICE_MODE_OPTIONS: Array<{ key: KanaPracticeMode; label: string }> = [
  { key: "multiple_choice", label: "Opción múltiple" },
  { key: "romaji_input", label: "Escribir romaji" },
  { key: "handwriting", label: "Escritura manual" },
];

export const KANA_SESSION_MODE_OPTIONS: Array<{
  key: KanaSessionMode;
  label: string;
  description: string;
}> = [
  {
    key: "mixed",
    label: "Mixto",
    description: "Mezcla elegir romaji, elegir kana y escribir romaji.",
  },
  {
    key: "trace",
    label: "Trazar",
    description: "Muestra romaji y te pide trazar el kana a mano.",
  },
];

export const KANA_QUESTION_COUNT_OPTIONS: KanaQuestionCount[] = [10, 20, 30];

export function filterKanaItemsForTable(script: KanaScript, filter: KanaTableFilter) {
  return KANA_ITEMS.filter((item) => {
    if (item.script !== script) return false;
    if (filter === "mixed") return true;
    return item.set === filter;
  });
}

export function filterKanaItemsForPractice(setKey: KanaPracticeSetKey) {
  return KANA_ITEMS.filter((item) => {
    if (setKey === "hiragana_basic") return item.script === "hiragana" && item.set === "basic";
    if (setKey === "katakana_basic") return item.script === "katakana" && item.set === "basic";
    if (setKey === "diacritics") return item.set === "dakuten" || item.set === "handakuten";
    if (setKey === "combinations") return item.set === "yoon";
    return true;
  });
}

export function filterKanaItemsForSelection(
  script: KanaScript,
  set: "basic" | "dakuten" | "handakuten" | "yoon" | "mixed",
) {
  return KANA_ITEMS.filter((item) => {
    if (item.script !== script) return false;
    if (set === "mixed") return true;
    return item.set === set;
  });
}

export function getKanaSetLabel(item: KanaItem) {
  if (item.set === "basic") return item.script === "hiragana" ? "Hiragana" : "Katakana";
  if (item.set === "yoon") return "Combinación";
  return "Diacrítico";
}

export function getKanaPracticeDetail(setKey: KanaPracticeSetKey) {
  const option = KANA_PRACTICE_SET_OPTIONS.find((entry) => entry.key === setKey);
  return option?.label || "Kana";
}

const BASIC_ROW_TEMPLATES = [
  ["a", "i", "u", "e", "o"],
  ["ka", "ki", "ku", "ke", "ko"],
  ["sa", "shi", "su", "se", "so"],
  ["ta", "chi", "tsu", "te", "to"],
  ["na", "ni", "nu", "ne", "no"],
  ["ha", "hi", "fu", "he", "ho"],
  ["ma", "mi", "mu", "me", "mo"],
  ["ya", null, "yu", null, "yo"],
  ["ra", "ri", "ru", "re", "ro"],
  ["wa", null, null, null, "wo"],
  [null, null, "n", null, null],
] as const;

const DAKUTEN_ROW_TEMPLATES = [
  ["ga", "gi", "gu", "ge", "go"],
  ["za", "ji", "zu", "ze", "zo"],
  ["da", "ji", "zu", "de", "do"],
  ["ba", "bi", "bu", "be", "bo"],
] as const;

const HANDAKUTEN_ROW_TEMPLATES = [
  ["pa", "pi", "pu", "pe", "po"],
] as const;

const YOON_ROW_TEMPLATES = [
  ["kya", "kyu", "kyo"],
  ["sha", "shu", "sho"],
  ["cha", "chu", "cho"],
  ["nya", "nyu", "nyo"],
  ["hya", "hyu", "hyo"],
  ["mya", "myu", "myo"],
  ["rya", "ryu", "ryo"],
  ["gya", "gyu", "gyo"],
  ["ja", "ju", "jo"],
  ["bya", "byu", "byo"],
  ["pya", "pyu", "pyo"],
] as const;

function buildKanaLookup(script: KanaScript) {
  return KANA_ITEMS.filter((item) => item.script === script).reduce<Record<string, KanaItem>>((map, item) => {
    map[`${item.set}:${item.romaji}`] = item;
    return map;
  }, {});
}

function resolveTemplateRows(
  script: KanaScript,
  set: KanaSet,
  templates: ReadonlyArray<ReadonlyArray<string | null>>,
) {
  const lookup = buildKanaLookup(script);
  return templates.map((row) =>
    row.map((romaji) => (romaji ? lookup[`${set}:${romaji}`] || null : null)),
  );
}

export function getKanaTableSections(script: KanaScript, filter: KanaTableFilter): KanaTableSection[] {
  const sections: KanaTableSection[] = [];

  if (filter === "basic" || filter === "mixed") {
    sections.push({
      key: "basic",
      label: "Basic",
      columns: 5,
      rows: resolveTemplateRows(script, "basic", BASIC_ROW_TEMPLATES),
    });
  }

  if (filter === "dakuten" || filter === "mixed") {
    sections.push({
      key: "dakuten",
      label: "Dakuten",
      columns: 5,
      rows: resolveTemplateRows(script, "dakuten", DAKUTEN_ROW_TEMPLATES),
    });
  }

  if (filter === "handakuten" || filter === "mixed") {
    sections.push({
      key: "handakuten",
      label: "Handakuten",
      columns: 5,
      rows: resolveTemplateRows(script, "handakuten", HANDAKUTEN_ROW_TEMPLATES),
    });
  }

  if (filter === "yoon" || filter === "mixed") {
    sections.push({
      key: "yoon",
      label: "Yōon",
      columns: 3,
      rows: resolveTemplateRows(script, "yoon", YOON_ROW_TEMPLATES),
    });
  }

  return sections;
}
