export type GrammarExerciseType = "particle_choice" | "verb_form" | "fill_blank" | "sentence_order";

export type GenkiGrammarTopic = {
  lesson: number;
  topicId: string;
  topic: string;
  source: "steven-kraft" | "st-olaf";
  sourceUrl: string;
};

export type GenkiGrammarItem = {
  id: string;
  lesson: number;
  topicId: string;
  exerciseType: GrammarExerciseType;
  prompt: string;
  choices: string[];
  answer: string | string[];
  explanation?: string;
};

const STEVEN_KRAFT_SOURCE = "https://steven-kraft.com/projects/japanese/genki/";
const ST_OLAF_SOURCE = "https://wp.stolaf.edu/japanese/grammar-index/genki-i-ii-grammar-index/";

export const SAFE_GRAMMAR_EXERCISE_TYPES: GrammarExerciseType[] = [
  "particle_choice",
  "verb_form",
  "fill_blank",
  "sentence_order",
];

export const GENKI_GRAMMAR_TOPICS_BY_LESSON: Record<number, GenkiGrammarTopic[]> = {
  1: [
    { lesson: 1, topicId: "l1-desu", topic: "X は Y です", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 1, topicId: "l1-question", topic: "Question sentences", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 1, topicId: "l1-no", topic: "Noun 1 の Noun 2", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
  ],
  2: [
    { lesson: 2, topicId: "l2-kore-sore-are-dore", topic: "これ・それ・あれ・どれ", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 2, topicId: "l2-kono-sono-ano-dono", topic: "この・その・あの・どの + noun", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 2, topicId: "l2-koko-soko-asoko-doko", topic: "ここ・そこ・あそこ・どこ", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 2, topicId: "l2-dare-no", topic: "だれの + noun", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 2, topicId: "l2-mo", topic: "Noun + も", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 2, topicId: "l2-ja-arimasen", topic: "Noun + じゃないです", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 2, topicId: "l2-ne-yo", topic: "ね / よ", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
  ],
  3: [
    { lesson: 3, topicId: "l3-verb-conjugation", topic: "Basic verb conjugation", source: "st-olaf", sourceUrl: ST_OLAF_SOURCE },
    { lesson: 3, topicId: "l3-present-tense", topic: "Verb types and present tense", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 3, topicId: "l3-particles", topic: "Particles", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 3, topicId: "l3-time-reference", topic: "Time reference", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 3, topicId: "l3-masenka", topic: "〜ませんか", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 3, topicId: "l3-frequency-adverbs", topic: "Frequency adverbs", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
  ],
  4: [
    { lesson: 4, topicId: "l4-aru-iru", topic: "あります / います", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 4, topicId: "l4-location", topic: "Describing where things are", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 4, topicId: "l4-past-desu", topic: "Past tense of です", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 4, topicId: "l4-past-verbs", topic: "Past tense of verbs", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 4, topicId: "l4-mo", topic: "Particle も", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 4, topicId: "l4-duration", topic: "Duration of time", source: "st-olaf", sourceUrl: ST_OLAF_SOURCE },
    { lesson: 4, topicId: "l4-takusan", topic: "たくさん", source: "st-olaf", sourceUrl: ST_OLAF_SOURCE },
    { lesson: 4, topicId: "l4-to", topic: "Particle と", source: "st-olaf", sourceUrl: ST_OLAF_SOURCE },
  ],
  5: [
    { lesson: 5, topicId: "l5-adjectives", topic: "Adjectives", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 5, topicId: "l5-suki-kirai", topic: "すき / きらい", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 5, topicId: "l5-masho-mashoka", topic: "〜ましょう / 〜ましょうか", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 5, topicId: "l5-counting", topic: "Counting", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
  ],
  6: [
    { lesson: 6, topicId: "l6-te-form", topic: "て-form", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 6, topicId: "l6-te-kudasai", topic: "〜てください", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 6, topicId: "l6-temo-ii", topic: "〜てもいいです", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 6, topicId: "l6-tewa-ikemasen", topic: "〜てはいけません", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 6, topicId: "l6-two-activities", topic: "Describing two activities", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 6, topicId: "l6-kara", topic: "〜から", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 6, topicId: "l6-mashoka", topic: "〜ましょうか", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
  ],
  7: [
    { lesson: 7, topicId: "l7-teiru", topic: "〜ている", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 7, topicId: "l7-description", topic: "Descriptions with verbs and adjectives", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 7, topicId: "l7-te-joining", topic: "て-forms for joining sentences", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 7, topicId: "l7-stem-ni-iku", topic: "Verb stem + に行く", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 7, topicId: "l7-counting-people", topic: "Counting people", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
  ],
  8: [
    { lesson: 8, topicId: "l8-short-forms", topic: "Short forms", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 8, topicId: "l8-to-omou", topic: "〜と思います / 〜と言っていました", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 8, topicId: "l8-naide-kudasai", topic: "〜ないでください", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 8, topicId: "l8-verb-no-ga-suki", topic: "Verb のが好きです", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 8, topicId: "l8-particle-ga", topic: "Particle が", source: "st-olaf", sourceUrl: ST_OLAF_SOURCE },
    { lesson: 8, topicId: "l8-nanika-nanimo", topic: "何か / 何も", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
  ],
  9: [
    { lesson: 9, topicId: "l9-short-past-verbs", topic: "Past tense short forms (verbs)", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 9, topicId: "l9-short-past-adj", topic: "Past tense short forms (adjectives)", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 9, topicId: "l9-qualifying-nouns", topic: "Qualifying nouns with verbs and adjectives", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 9, topicId: "l9-mada-teimasen", topic: "まだ〜ていません", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 9, topicId: "l9-kara-explanation", topic: "〜から (reason)", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
  ],
  10: [
    { lesson: 10, topicId: "l10-comparison-two", topic: "Comparison between two items", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 10, topicId: "l10-comparison-many", topic: "Comparison among three or more items", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 10, topicId: "l10-noun-no", topic: "Adjective / noun + の", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 10, topicId: "l10-tsumori", topic: "〜つもりだ", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 10, topicId: "l10-naru", topic: "Adjective + なる", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 10, topicId: "l10-doko-kani", topic: "どこかに / どこにも", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 10, topicId: "l10-particle-de", topic: "Particle で", source: "st-olaf", sourceUrl: ST_OLAF_SOURCE },
  ],
  11: [
    { lesson: 11, topicId: "l11-tai", topic: "〜たい", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 11, topicId: "l11-tari-tari", topic: "〜たり〜たりする", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 11, topicId: "l11-kotoga-aru", topic: "〜ことがある", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 11, topicId: "l11-ya", topic: "Noun A や Noun B", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
  ],
  12: [
    { lesson: 12, topicId: "l12-n-desu", topic: "〜んです", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 12, topicId: "l12-sugiru", topic: "〜すぎる", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 12, topicId: "l12-ho-ga-ii", topic: "〜ほうがいいです", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 12, topicId: "l12-node", topic: "〜ので", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 12, topicId: "l12-nakereba-ikemasen", topic: "〜なければいけません / 〜なきゃいけません", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
    { lesson: 12, topicId: "l12-desho", topic: "〜でしょう", source: "steven-kraft", sourceUrl: STEVEN_KRAFT_SOURCE },
  ],
};

// Tiny seed set for testing and plumbing only. This is intentionally small.
export const GENKI_GRAMMAR_SAMPLE_ITEMS: GenkiGrammarItem[] = [
  {
    id: "grammar-l1-desu-1",
    lesson: 1,
    topicId: "l1-desu",
    exerciseType: "fill_blank",
    prompt: "わたし___がくせいです。",
    choices: ["は", "を", "に", "で"],
    answer: "は",
    explanation: "En la estructura X は Y です, 「は」 marca el tema.",
  },
  {
    id: "grammar-l2-dare-no-1",
    lesson: 2,
    topicId: "l2-dare-no",
    exerciseType: "particle_choice",
    prompt: "これは だれ___ほんですか。",
    choices: ["の", "に", "は", "で"],
    answer: "の",
    explanation: "「の」 marca posesión: “el libro de quién”.",
  },
  {
    id: "grammar-l3-masenka-1",
    lesson: 3,
    topicId: "l3-masenka",
    exerciseType: "fill_blank",
    prompt: "いっしょに えいがを み___か。",
    choices: ["ません", "ます", "たい", "て"],
    answer: "ません",
    explanation: "〜ませんか se usa para invitar de forma suave.",
  },
  {
    id: "grammar-l4-past-verbs-1",
    lesson: 4,
    topicId: "l4-past-verbs",
    exerciseType: "verb_form",
    prompt: "きのう ともだちと コーヒーを のみました。Forma diccionario de のみました:",
    choices: ["のむ", "のんで", "のみたい", "のまない"],
    answer: "のむ",
    explanation: "La forma diccionario de のみました es のむ.",
  },
  {
    id: "grammar-l6-te-form-1",
    lesson: 6,
    topicId: "l6-te-form",
    exerciseType: "verb_form",
    prompt: "たべる → て-form",
    choices: ["たべて", "たべた", "たべます", "たべない"],
    answer: "たべて",
    explanation: "Los verbos ru como たべる forman て-form con 〜て.",
  },
  {
    id: "grammar-l7-stem-ni-iku-1",
    lesson: 7,
    topicId: "l7-stem-ni-iku",
    exerciseType: "sentence_order",
    prompt: "Ordena la oración.",
    choices: ["に", "いきます", "たべ", "すしを"],
    answer: ["すしを", "たべ", "に", "いきます"],
    explanation: "Con Verb stem + に行く: すしを たべに いきます.",
  },
  {
    id: "grammar-l8-short-forms-1",
    lesson: 8,
    topicId: "l8-short-forms",
    exerciseType: "verb_form",
    prompt: "たべます → short form",
    choices: ["たべる", "たべて", "たべた", "たべたい"],
    answer: "たべる",
    explanation: "La forma corta presente afirmativa de たべます es たべる.",
  },
  {
    id: "grammar-l10-comparison-two-1",
    lesson: 10,
    topicId: "l10-comparison-two",
    exerciseType: "fill_blank",
    prompt: "東京のほう___ にぎやかです。",
    choices: ["が", "は", "を", "で"],
    answer: "が",
    explanation: "En X のほうが Y, 「が」 marca el elemento comparado como más Y.",
  },
  {
    id: "grammar-l12-ho-ga-ii-1",
    lesson: 12,
    topicId: "l12-ho-ga-ii",
    exerciseType: "fill_blank",
    prompt: "つかれています。はやく ねた___いいです。",
    choices: ["ほうが", "ので", "から", "んです"],
    answer: "ほうが",
    explanation: "〜ほうがいいです expresa consejo.",
  },
];

export function getGrammarTopicsForLessons(lessons: number[]) {
  return lessons.flatMap((lesson) => GENKI_GRAMMAR_TOPICS_BY_LESSON[lesson] || []);
}

export function getGrammarItemsForLessons(lessons: number[]) {
  return GENKI_GRAMMAR_SAMPLE_ITEMS.filter((item) => lessons.includes(item.lesson));
}
