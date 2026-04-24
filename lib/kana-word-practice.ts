import normalizedVocab from "@/data/normalized/genki-vocab.json";
import { KANA_ITEMS, type KanaItem } from "@/lib/kana-data";

type NormalizedVocabItem = {
  id: string;
  lesson: number;
  japanese_display: string;
  kana_reading: string;
  kanji_form: string | null;
  meaning_es: string;
  alt_meanings: string[];
  source_sheet: string;
  source_row: number;
};

type NormalizedVocabDataset = {
  schema_version: number;
  source_file: string;
  module: "vocabulario";
  lessons: Record<string, NormalizedVocabItem[]>;
  items: NormalizedVocabItem[];
};

export type KanaWordPracticeItem = {
  id: string;
  lesson: number;
  kana: string;
  romaji: string;
  acceptedRomaji: string[];
  meaningEs: string;
};

const vocabDataset = normalizedVocab as NormalizedVocabDataset;
const KANA_ONLY_RE = /^[\u3040-\u309f\u30a0-\u30ff]+$/;
const TEMPLATE_RE = /[~〜…＿_○（）()[\]{}／/]/;

const kanaByLength = [...KANA_ITEMS].sort((left, right) => right.kana.length - left.kana.length);

function normalizeRomaji(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[āáàâä]/g, "a")
    .replace(/[īíìîï]/g, "i")
    .replace(/[ūúùûü]/g, "u")
    .replace(/[ēéèêë]/g, "e")
    .replace(/[ōóòôö]/g, "o")
    .replace(/[^a-z]/g, "");
}

function getKanaForms(item: KanaItem) {
  const alternatives = item.kana === "を" || item.kana === "ヲ"
    ? [...(item.alternatives ?? []), "o"]
    : item.alternatives ?? [];
  return [item.romaji, ...alternatives].map(normalizeRomaji);
}

function firstConsonant(value: string) {
  const first = value[0] ?? "";
  return first && !"aeiou".includes(first) ? first : "";
}

function appendForms(current: string[], forms: string[]) {
  const next = new Set<string>();
  for (const prefix of current) {
    for (const form of forms) {
      next.add(`${prefix}${form}`);
      if (next.size >= 32) return [...next];
    }
  }
  return [...next];
}

export function romanizeKanaWord(kana: string) {
  let cursor = 0;
  let pendingDouble = false;
  let accepted = [""];

  while (cursor < kana.length) {
    const char = kana[cursor];

    if (char === "っ" || char === "ッ") {
      pendingDouble = true;
      cursor += 1;
      continue;
    }

    if (char === "ー") {
      accepted = accepted.map((value) => {
        const vowel = [...value].reverse().find((entry) => "aeiou".includes(entry));
        return vowel ? `${value}${vowel}` : value;
      });
      cursor += 1;
      continue;
    }

    const item = kanaByLength.find((candidate) => kana.startsWith(candidate.kana, cursor));
    if (!item) return null;

    let forms = getKanaForms(item);
    if (pendingDouble) {
      forms = forms.map((form) => `${firstConsonant(form)}${form}`);
      pendingDouble = false;
    }

    accepted = appendForms(accepted, forms);
    cursor += item.kana.length;
  }

  const normalized = [...new Set(accepted.map(normalizeRomaji).filter(Boolean))];
  if (normalized.length === 0) return null;

  return {
    romaji: normalized[0],
    acceptedRomaji: normalized,
  };
}

function hasUsefulKanaReading(item: NormalizedVocabItem) {
  const kana = item.kana_reading.trim();
  if (kana.length < 2 || kana.length > 12) return false;
  if (!KANA_ONLY_RE.test(kana)) return false;
  if (TEMPLATE_RE.test(kana) || TEMPLATE_RE.test(item.japanese_display) || TEMPLATE_RE.test(item.meaning_es)) {
    return false;
  }
  return Boolean(romanizeKanaWord(kana));
}

export const KANA_WORD_PRACTICE_ITEMS: KanaWordPracticeItem[] = vocabDataset.items
  .filter(hasUsefulKanaReading)
  .map((item) => {
    const reading = romanizeKanaWord(item.kana_reading.trim());
    if (!reading) return null;
    return {
      id: item.id,
      lesson: item.lesson,
      kana: item.kana_reading.trim(),
      romaji: reading.romaji,
      acceptedRomaji: reading.acceptedRomaji,
      meaningEs: item.meaning_es,
    } satisfies KanaWordPracticeItem;
  })
  .filter((item): item is KanaWordPracticeItem => Boolean(item));

export function isKanaWordAnswerCorrect(item: KanaWordPracticeItem, answer: string) {
  const normalized = normalizeRomaji(answer);
  return item.acceptedRomaji.includes(normalized);
}

export function getKanaWordPracticeSession(count = 12) {
  const shuffled = [...KANA_WORD_PRACTICE_ITEMS];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
