import { GENKI_KANJI_BY_LESSON } from "@/lib/genki-kanji-by-lesson";
import { GENKI_VOCAB_BY_LESSON } from "@/lib/genki-vocab-by-lesson";
import {
  GENKI_GRAMMAR_SAMPLE_ITEMS,
  GENKI_GRAMMAR_TOPICS_BY_LESSON,
  getGrammarItemsForLessons,
  getGrammarTopicsForLessons,
} from "@/lib/genki-grammar-content";

export function getVocabForLessons(lessons: number[]) {
  return lessons.flatMap((lesson) => GENKI_VOCAB_BY_LESSON[lesson] || []);
}

export function getKanjiForLessons(lessons: number[]) {
  return lessons.flatMap((lesson) => GENKI_KANJI_BY_LESSON[lesson] || []);
}

export function getStudyContentForLessons(lessons: number[]) {
  return {
    lessons,
    vocab: getVocabForLessons(lessons),
    kanji: getKanjiForLessons(lessons),
    grammarTopics: getGrammarTopicsForLessons(lessons),
    grammarItems: getGrammarItemsForLessons(lessons),
  };
}

export {
  GENKI_GRAMMAR_SAMPLE_ITEMS,
  GENKI_GRAMMAR_TOPICS_BY_LESSON,
  getGrammarItemsForLessons,
  getGrammarTopicsForLessons,
};
