import normalizedKanji from "@/data/normalized/genki-kanji.json";

export type KanjiEntryType =
  | "word"
  | "single_kanji_word"
  | "time_expression"
  | "weekday"
  | "na_adjective"
  | "suru_verb"
  | "verb"
  | "adjective_i"
  | "phrase"
  | "proper_name";

export type GenkiKanjiItem = {
  kanji: string;
  hira: string;
  es: string;
  entry_type: KanjiEntryType;
  source_row: number;
};

type NormalizedKanjiItem = {
  id: string;
  lesson: number;
  written_form: string;
  kana_reading: string;
  meaning_es: string;
  entry_type: KanjiEntryType;
  is_single_kanji: boolean;
  contains_okurigana: boolean;
  source_sheet: string;
  source_row: number;
};

type NormalizedKanjiDataset = {
  schema_version: number;
  source_file: string;
  module: "kanji";
  lessons: Record<string, NormalizedKanjiItem[]>;
  items: NormalizedKanjiItem[];
};

const kanjiDataset = normalizedKanji as NormalizedKanjiDataset;

export const GENKI_KANJI_BY_LESSON: Record<number, GenkiKanjiItem[]> = Object.fromEntries(
  Object.entries(kanjiDataset.lessons).map(([lesson, items]) => [
    Number(lesson),
    items.map((item) => ({
      kanji: item.written_form,
      hira: item.kana_reading,
      es: item.meaning_es,
      entry_type: item.entry_type,
      source_row: item.source_row,
    })),
  ]),
);
