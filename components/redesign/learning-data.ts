import { GENKI_KANJI_BY_LESSON } from "@/lib/genki-kanji-by-lesson";
import { GENKI_LESSON_NAMES } from "@/lib/genki-lesson-names";
import { GENKI_VOCAB_BY_LESSON } from "@/lib/genki-vocab-by-lesson";
import { CURRICULUM_MODULES } from "@/lib/curriculum-modules";
import { GENKI_I_GRAMMAR_CONTENT } from "@/lib/grammar-content-genki-i";
import {
  getKanaTableSections,
  type KanaScript,
  type KanaTableFilter,
} from "@/lib/kana-data";

export type KanaTabKey = "basic" | "contracted" | "voiced";

export const kanaTabs: Array<{
  key: KanaTabKey;
  label: string;
  filter: KanaTableFilter;
}> = [
  { key: "basic", label: "Básico", filter: "basic" },
  { key: "contracted", label: "Combinaciones", filter: "yoon" },
  { key: "voiced", label: "Sonoros", filter: "dakuten" },
];

const sectionLabels: Record<string, string> = {
  basic: "Gojuuon",
  dakuten: "Dakuten",
  handakuten: "Handakuten",
  yoon: "Combinaciones",
};

const rowNamesByColumns: Record<number, string[]> = {
  5: [
    "Fila A",
    "Fila KA",
    "Fila SA",
    "Fila TA",
    "Fila NA",
    "Fila HA",
    "Fila MA",
    "Fila YA",
    "Fila RA",
    "Fila WA",
    "N",
  ],
  3: ["K", "S", "T", "N", "H", "M", "R", "G", "J", "B", "P"],
};

export function getKanaDashboardSections(script: KanaScript, tab: KanaTabKey) {
  const active = kanaTabs.find((item) => item.key === tab) ?? kanaTabs[0];
  const rawSections =
    tab === "voiced"
      ? [
          ...getKanaTableSections(script, "dakuten"),
          ...getKanaTableSections(script, "handakuten"),
        ]
      : getKanaTableSections(script, active.filter);

  return rawSections.map((section) => {
    const names = rowNamesByColumns[section.columns] ?? [];
    return {
      ...section,
      label: sectionLabels[section.key] ?? section.label,
      rows: section.rows.map((row, index) => ({
        key: `${section.key}-${index}`,
        label: names[index] ?? `Fila ${index + 1}`,
        cells: row,
      })),
    };
  });
}

export type GrammarPattern = {
  id?: string;
  pattern: string;
  meaning: string;
  example: string;
  translation: string;
  cue: string;
  explanation?: string[];
  formation?: string[];
  examples?: GrammarExample[];
  dialogue?: GrammarDialogueLine[];
  commonMistakes?: string[];
  practicePrompts?: string[];
  interactions?: GrammarInteraction[];
  relatedGrammarIds?: string[];
  sourceNotes?: string[];
};

export type GrammarExample = {
  jp: string;
  jpFurigana?: string;
  reading?: string;
  es: string;
  note?: string;
  audioKey?: string;
  audioUrl?: string;
};

export type GrammarDialogueLine = {
  speaker: string;
  jp: string;
  jpFurigana?: string;
  es: string;
  audioKey?: string;
  audioUrl?: string;
};

export type GrammarInteraction =
  | {
      type: "word-order";
      prompt: string;
      tokens: string[];
      answer: string[];
      successMessage?: string;
    }
  | {
      type: "multiple-choice";
      prompt: string;
      options: string[];
      answer: string;
      successMessage?: string;
    }
  | {
      type: "fill-blank";
      prompt: string;
      before: string;
      after: string;
      answer: string;
      placeholder?: string;
      successMessage?: string;
    };

export type GrammarLessonCard = {
  lesson: number;
  title: string;
  progress: string;
  patterns: GrammarPattern[];
  count?: number;
  isCurrent?: boolean;
};

function stripFuriganaNotation(text: string) {
  return text.replace(/\{([^|{}]+)\|[^{}]+\}/g, "$1");
}

function getGrammarProgressLabel(lesson: number) {
  if (lesson < 8) return "Visto";
  if (lesson === 8) return "Actual";
  return "Próximo";
}

function mapGenkiGrammarContentToLessons(): GrammarLessonCard[] {
  const grouped = new Map<number, GrammarPattern[]>();

  GENKI_I_GRAMMAR_CONTENT.forEach((item) => {
    const firstExample = item.examples[0];
    const practicePrompts = [
      ...item.practicePrompts.slice(1),
      ...(item.interactions?.map((interaction) => `En clase: ${interaction}`) ??
        []),
    ].map(stripFuriganaNotation);

    const pattern: GrammarPattern = {
      id: item.id,
      pattern: item.pattern,
      meaning: item.shortMeaning,
      example: firstExample ? stripFuriganaNotation(firstExample.jp) : item.pattern,
      translation: firstExample?.es ?? item.shortMeaning,
      cue: item.practicePrompts[0] ?? "Crea una frase nueva con este patrón.",
      explanation: item.explanation,
      formation: item.formation,
      examples: item.examples.map((example) => ({
        jp: stripFuriganaNotation(example.jp),
        jpFurigana: example.jp,
        reading: example.reading,
        es: example.es,
        note: example.note,
      })),
      dialogue: item.dialogue?.map((line) => ({
        speaker: line.speaker,
        jp: stripFuriganaNotation(line.jp),
        jpFurigana: line.jp,
        es: line.es,
      })),
      commonMistakes: item.commonMistakes.map(stripFuriganaNotation),
      practicePrompts,
      relatedGrammarIds: item.relatedGrammarIds,
      sourceNotes: item.sourceNotes,
    };

    grouped.set(item.lesson, [...(grouped.get(item.lesson) ?? []), pattern]);
  });

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a - b)
    .map(([lesson, patterns]) => ({
      lesson,
      title: GENKI_LESSON_NAMES[lesson] ?? `Lección ${lesson}`,
      progress: getGrammarProgressLabel(lesson),
      patterns,
    }));
}


export function getGrammarLessonCards() {
  return mapGenkiGrammarContentToLessons().map((lesson) => ({
    ...lesson,
    count: lesson.patterns.length,
    isCurrent: lesson.lesson === 8,
  }));
}

export function getGrammarModuleCards() {
  const lessons = getGrammarLessonCards();
  const lessonsByNumber = new Map(
    lessons.map((lesson) => [lesson.lesson, lesson]),
  );

  return CURRICULUM_MODULES.filter((module) => module.numero <= 8).map(
    (module) => {
      const moduleLessons = module.lecciones
        .map((lessonNumber) => lessonsByNumber.get(lessonNumber))
        .filter((lesson): lesson is NonNullable<typeof lesson> =>
          Boolean(lesson),
        );
      const patternCount = moduleLessons.reduce(
        (total, lesson) => total + (lesson.count ?? lesson.patterns.length),
        0,
      );

      return {
        moduleNumber: module.numero,
        title: module.nombre,
        titleJa: module.nombreJa,
        jlpt: module.jlpt,
        lessons: moduleLessons,
        lessonCount: moduleLessons.length,
        patternCount,
        hasGrammar: patternCount > 0,
        isCurrent: module.numero === 3,
      };
    },
  );
}

export function getKanjiLessonCards() {
  return Object.keys(GENKI_KANJI_BY_LESSON)
    .map(Number)
    .filter((lesson) => lesson >= 3)
    .sort((a, b) => a - b)
    .map((lesson) => {
      const items = GENKI_KANJI_BY_LESSON[lesson] ?? [];
      const completed = lesson < 8 ? items.length : 0;
      return {
        lesson,
        title: GENKI_LESSON_NAMES[lesson] ?? `Lección ${lesson}`,
        items,
        count: items.length,
        completed,
        isCurrent: lesson === 8,
        isDone: lesson < 8,
      };
    });
}

export function getKanjiModuleCards() {
  const lessons = getKanjiLessonCards();
  const lessonsByNumber = new Map(
    lessons.map((lesson) => [lesson.lesson, lesson]),
  );

  return CURRICULUM_MODULES.filter((module) => module.numero <= 8).map(
    (module) => {
      const moduleLessons = module.lecciones
        .map((lessonNumber) => lessonsByNumber.get(lessonNumber))
        .filter((lesson): lesson is NonNullable<typeof lesson> =>
          Boolean(lesson),
        );
      const kanjiCount = moduleLessons.reduce(
        (total, lesson) => total + lesson.count,
        0,
      );

      return {
        moduleNumber: module.numero,
        title: module.nombre,
        titleJa: module.nombreJa,
        jlpt: module.jlpt,
        lessons: moduleLessons,
        lessonCount: moduleLessons.length,
        kanjiCount,
        hasKanji: kanjiCount > 0,
        isCurrent: module.numero === 3,
      };
    },
  );
}

export function getVocabLessonCards() {
  return [8, 7, 6, 5].map((lesson) => {
    const items = GENKI_VOCAB_BY_LESSON[lesson] ?? [];
    const preview = items.slice(0, lesson === 8 ? 8 : 6);
    const completed =
      lesson < 8 ? Math.min(items.length, lesson === 7 ? 18 : 24) : 0;
    return {
      lesson,
      title: GENKI_LESSON_NAMES[lesson] ?? `Lección ${lesson}`,
      items: preview,
      count: items.length,
      completed,
      isCurrent: lesson === 8,
    };
  });
}

export const homeTasks = [
  {
    title: "Practica kana",
    meta: "Hiragana básico · 20 min",
    state: "Hecho",
    done: true,
  },
  {
    title: "Vocabulario L7",
    meta: "Foto familiar",
    state: "Hecho",
    done: true,
  },
  {
    title: "て-form · tarea escrita",
    meta: "Vence: viernes",
    state: "Pendiente",
    done: false,
  },
  {
    title: "Lectura: 東京の電車",
    meta: "Opcional para el domingo",
    state: "Opcional",
    done: false,
  },
];
