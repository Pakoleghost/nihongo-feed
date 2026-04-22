import normalizedVocab from "@/data/normalized/genki-vocab.json";

export type GenkiVocabItem = { hira: string; kanji: string; es: string };

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

const vocabDataset = normalizedVocab as NormalizedVocabDataset;

export const GENKI_VOCAB_BY_LESSON: Record<number, GenkiVocabItem[]> = Object.fromEntries(
  Object.entries(vocabDataset.lessons).map(([lesson, items]) => [
    Number(lesson),
    items.map((item) => ({
      hira: item.kana_reading,
      kanji: item.kanji_form ?? "",
      es: item.meaning_es,
    })),
  ]),
);
