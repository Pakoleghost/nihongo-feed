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

export const grammarLessons: GrammarLessonCard[] = [
  {
    lesson: 1,
    title: "Nuevos amigos",
    progress: "Base",
    patterns: [
      {
        id: "copula-affirmative",
        pattern: "X は Y です",
        meaning: "Presentar o identificar algo de forma básica.",
        example: "私は学生です。",
        translation: "Soy estudiante.",
        cue: "Di quién eres o qué es algo.",
        explanation: [
          "Este patrón sirve para decir qué es alguien o algo. La partícula は marca el tema: aquello de lo que vas a hablar.",
          "です cierra la oración con tono cortés. En español muchas veces usamos 'soy', 'es' o 'son', pero en japonés no cambia según la persona.",
        ],
        formation: [
          "Tema + は + identidad/descripción + です",
          "私は + 学生 + です",
        ],
        examples: [
          {
            jp: "私は学生です。",
            jpFurigana: "{私|わたし}は{学生|がくせい}です。",
            reading: "わたしはがくせいです。",
            es: "Soy estudiante.",
            note: "私 es el tema, 学生 es lo que dices sobre ti.",
            audioKey: "genki1-l1-copula-example-1",
          },
          {
            jp: "田中さんは先生です。",
            jpFurigana: "{田中|たなか}さんは{先生|せんせい}です。",
            reading: "たなかさんはせんせいです。",
            es: "Tanaka es profesor.",
            note: "さん se usa con nombres de otras personas.",
            audioKey: "genki1-l1-copula-example-2",
          },
        ],
        dialogue: [
          {
            speaker: "A",
            jp: "はじめまして。私はパコです。",
            jpFurigana: "はじめまして。{私|わたし}はパコです。",
            es: "Mucho gusto. Soy Pako.",
            audioKey: "genki1-l1-copula-dialogue-a1",
          },
          {
            speaker: "B",
            jp: "はじめまして。私は学生です。",
            jpFurigana: "はじめまして。{私|わたし}は{学生|がくせい}です。",
            es: "Mucho gusto. Soy estudiante.",
            audioKey: "genki1-l1-copula-dialogue-b1",
          },
          {
            speaker: "A",
            jp: "田中さんは先生ですか。",
            jpFurigana: "{田中|たなか}さんは{先生|せんせい}ですか。",
            es: "¿Tanaka es profesor?",
            audioKey: "genki1-l1-copula-dialogue-a2",
          },
          {
            speaker: "B",
            jp: "はい、田中さんは先生です。",
            jpFurigana: "はい、{田中|たなか}さんは{先生|せんせい}です。",
            es: "Sí, Tanaka es profesor.",
            audioKey: "genki1-l1-copula-dialogue-b2",
          },
        ],
        commonMistakes: [
          "No traduzcas は como 'es'. は solo marca el tema; la parte que equivale a 'es/soy' aquí es です.",
          "No necesitas cambiar です por persona: 私です, 田中さんです y 学生です usan la misma forma.",
        ],
        practicePrompts: [
          "Di tu nombre y tu ocupación usando 私は〜です。",
          "Presenta a un compañero usando 〜さんは〜です。",
        ],
        interactions: [
          {
            type: "word-order",
            prompt: "Ordena las piezas para decir: 'Soy estudiante'.",
            tokens: ["学生", "です", "私", "は"],
            answer: ["私", "は", "学生", "です"],
            successMessage: "Bien. Primero tema + は, luego lo que dices del tema.",
          },
          {
            type: "multiple-choice",
            prompt: "En 私は学生です, ¿qué marca は?",
            options: ["El tema de la oración", "El pasado", "La pregunta"],
            answer: "El tema de la oración",
            successMessage: "Exacto. は marca de qué estamos hablando.",
          },
        ],
        relatedGrammarIds: ["questions-ka", "particle-no-modifier"],
        sourceNotes: ["Genki I L1", "Índice grammar_crossref.json"],
      },
      {
        id: "copula-negative",
        pattern: "X は Y じゃないです",
        meaning: "Negar una identificación.",
        example: "田中さんは先生じゃないです。",
        translation: "Tanaka no es profesor.",
        cue: "Corrige una idea equivocada.",
        explanation: [
          "じゃないです niega una oración con sustantivo o な-adjetivo. En esta etapa úsalo para decir que alguien no es algo.",
          "La estructura antes de la negación se mantiene igual: tema con は, luego la identidad que vas a negar.",
        ],
        formation: [
          "Tema + は + sustantivo + じゃないです",
          "田中さんは + 先生 + じゃないです",
        ],
        examples: [
          {
            jp: "私は先生じゃないです。",
            jpFurigana: "{私|わたし}は{先生|せんせい}じゃないです。",
            reading: "わたしはせんせいじゃないです。",
            es: "No soy profesor.",
          },
          {
            jp: "メアリーさんは日本人じゃないです。",
            jpFurigana: "メアリーさんは{日本人|にほんじん}じゃないです。",
            reading: "メアリーさんはにほんじんじゃないです。",
            es: "Mary no es japonesa.",
          },
        ],
        commonMistakes: [
          "No pongas です dos veces: 学生ですじゃないです no funciona.",
          "じゃないです es natural en clase y conversación cortés. ではありません es más formal.",
        ],
        practicePrompts: [
          "Corrige una suposición: 'No soy profesor/a'.",
          "Di que una persona no es estudiante.",
        ],
        interactions: [
          {
            type: "fill-blank",
            prompt: "Completa la negación.",
            before: "私は先生",
            after: "。",
            answer: "じゃないです",
            placeholder: "negación",
            successMessage: "Eso. Sustantivo + じゃないです.",
          },
        ],
        relatedGrammarIds: ["copula-affirmative"],
        sourceNotes: ["Genki I L1"],
      },
      {
        id: "particle-no-modifier",
        pattern: "X の Y",
        meaning: "Indicar relación, posesión o categoría.",
        example: "日本語の本です。",
        translation: "Es un libro de japonés.",
        cue: "Une dos sustantivos.",
        explanation: [
          "の conecta dos sustantivos. El primero modifica al segundo: dice de quién es, de qué tipo es o con qué está relacionado.",
          "Piensa en X の Y como 'Y de X' o 'Y relacionado con X', pero el orden japonés va al revés del español.",
        ],
        formation: [
          "Sustantivo 1 + の + Sustantivo 2",
          "日本語 + の + 本",
        ],
        examples: [
          {
            jp: "日本語の本です。",
            jpFurigana: "{日本語|にほんご}の{本|ほん}です。",
            reading: "にほんごのほんです。",
            es: "Es un libro de japonés.",
          },
          {
            jp: "私の先生です。",
            jpFurigana: "{私|わたし}の{先生|せんせい}です。",
            reading: "わたしのせんせいです。",
            es: "Es mi profesor/a.",
            note: "私の marca posesión o relación.",
          },
        ],
        commonMistakes: [
          "No inviertas el orden desde español. 'Libro de japonés' es 日本語の本, no 本の日本語.",
          "の no significa solamente posesión; también puede marcar categoría o relación.",
        ],
        practicePrompts: [
          "Di 'mi libro' y 'profesor de japonés'.",
          "Une dos sustantivos de la lección con の.",
        ],
        interactions: [
          {
            type: "word-order",
            prompt: "Ordena: 'libro de japonés'.",
            tokens: ["本", "日本語", "の"],
            answer: ["日本語", "の", "本"],
            successMessage: "Sí. En japonés, el modificador va antes.",
          },
        ],
        relatedGrammarIds: ["copula-affirmative"],
        sourceNotes: ["Genki I L1"],
      },
    ],
  },
  {
    lesson: 2,
    title: "De compras",
    progress: "Base",
    patterns: [
      {
        pattern: "これ / それ / あれ",
        meaning: "Señalar cosas según distancia.",
        example: "これはいくらですか。",
        translation: "¿Cuánto cuesta esto?",
        cue: "Pregunta por un objeto.",
      },
      {
        pattern: "この / その / あの + N",
        meaning: "Modificar un sustantivo con demostrativos.",
        example: "その時計は高いです。",
        translation: "Ese reloj es caro.",
        cue: "Describe cuál objeto.",
      },
      {
        pattern: "N も",
        meaning: "Agregar algo con el sentido de 'también'.",
        example: "これもください。",
        translation: "Esto también, por favor.",
        cue: "Agrega una segunda opción.",
      },
    ],
  },
  {
    lesson: 3,
    title: "Una cita",
    progress: "Base",
    patterns: [
      {
        pattern: "Vます / Vません",
        meaning: "Hablar de acciones presentes o futuras.",
        example: "明日、映画を見ます。",
        translation: "Mañana veré una película.",
        cue: "Cuenta qué harás.",
      },
      {
        pattern: "N を V",
        meaning: "Marcar el objeto directo de una acción.",
        example: "コーヒーを飲みます。",
        translation: "Tomo café.",
        cue: "Di qué haces con algo.",
      },
      {
        pattern: "Vませんか",
        meaning: "Invitar a alguien de forma natural.",
        example: "一緒に昼ご飯を食べませんか。",
        translation: "¿Comemos juntos?",
        cue: "Haz una invitación.",
      },
    ],
  },
  {
    lesson: 4,
    title: "La primera cita",
    progress: "Base",
    patterns: [
      {
        pattern: "Vました / Vませんでした",
        meaning: "Hablar de acciones en pasado.",
        example: "昨日、勉強しました。",
        translation: "Ayer estudié.",
        cue: "Cuenta qué hiciste ayer.",
      },
      {
        pattern: "N が あります / います",
        meaning: "Decir que algo o alguien existe.",
        example: "駅の前にカフェがあります。",
        translation: "Hay un café frente a la estación.",
        cue: "Describe qué hay en un lugar.",
      },
      {
        pattern: "Location に N が...",
        meaning: "Marcar dónde está algo o alguien.",
        example: "図書館に学生がいます。",
        translation: "Hay estudiantes en la biblioteca.",
        cue: "Ubica personas o cosas.",
      },
    ],
  },
  {
    lesson: 5,
    title: "Viaje a Okinawa",
    progress: "Base",
    patterns: [
      {
        pattern: "い-adj / な-adj",
        meaning: "Describir personas, lugares y cosas.",
        example: "沖縄はきれいです。",
        translation: "Okinawa es bonito.",
        cue: "Describe un lugar.",
      },
      {
        pattern: "好きです / 嫌いです",
        meaning: "Expresar gustos y disgustos.",
        example: "私は海が好きです。",
        translation: "Me gusta el mar.",
        cue: "Di qué te gusta.",
      },
      {
        pattern: "Vましょう",
        meaning: "Proponer hacer algo juntos.",
        example: "写真を撮りましょう。",
        translation: "Tomemos una foto.",
        cue: "Propón una actividad.",
      },
    ],
  },
  {
    lesson: 6,
    title: "La vida de Robert",
    progress: "Base",
    patterns: [
      {
        pattern: "て-form request",
        meaning: "Pedir una acción de forma sencilla.",
        example: "ちょっと待ってください。",
        translation: "Espera un momento, por favor.",
        cue: "Pide ayuda o una acción.",
      },
      {
        pattern: "〜てもいいです",
        meaning: "Pedir o dar permiso.",
        example: "写真を撮ってもいいですか。",
        translation: "¿Puedo tomar una foto?",
        cue: "Pide permiso.",
      },
      {
        pattern: "〜てはいけません",
        meaning: "Expresar prohibición.",
        example: "ここで食べてはいけません。",
        translation: "No se puede comer aquí.",
        cue: "Explica una regla.",
      },
    ],
  },
  {
    lesson: 7,
    title: "Foto familiar",
    progress: "Repaso",
    patterns: [
      {
        pattern: "〜ている",
        meaning: "Describir acciones en progreso o estados resultantes.",
        example: "父はテレビを見ています。",
        translation: "Mi papá está viendo televisión.",
        cue: "Describe qué está haciendo alguien.",
      },
      {
        pattern: "人 に 会う",
        meaning: "Decir que te encuentras con alguien.",
        example: "週末に友だちに会います。",
        translation: "El fin de semana veré a un amigo.",
        cue: "Di con quién te vas a ver.",
      },
      {
        pattern: "〜が上手です / 下手です",
        meaning: "Decir si alguien es bueno o malo en algo.",
        example: "妹は料理が上手です。",
        translation: "Mi hermana menor cocina bien.",
        cue: "Describe una habilidad.",
      },
    ],
  },
  {
    lesson: 8,
    title: "Barbacoa",
    progress: "Actual",
    patterns: [
      {
        pattern: "Short forms",
        meaning: "Usar formas cortas para hablar de manera más natural.",
        example: "明日、行く。",
        translation: "Mañana voy.",
        cue: "Pasa una frase a forma corta.",
      },
      {
        pattern: "〜と思います",
        meaning: "Expresar lo que piensas u opinas.",
        example: "この映画はおもしろいと思います。",
        translation: "Creo que esta película es interesante.",
        cue: "Da una opinión.",
      },
      {
        pattern: "〜と言っていました",
        meaning: "Reportar lo que alguien dijo.",
        example: "先生はテストがあると言っていました。",
        translation: "El profesor dijo que habrá examen.",
        cue: "Reporta lo que alguien dijo.",
      },
      {
        pattern: "〜ないでください",
        meaning: "Pedir que alguien no haga algo.",
        example: "ここで写真を撮らないでください。",
        translation: "Por favor no tomes fotos aquí.",
        cue: "Pide que no hagan algo.",
      },
    ],
  },
  {
    lesson: 9,
    title: "Mi canción favorita",
    progress: "Próximo",
    patterns: [
      {
        pattern: "Past short forms",
        meaning: "Hablar informalmente de acciones pasadas.",
        example: "昨日、友だちと出かけた。",
        translation: "Ayer salí con un amigo.",
        cue: "Cuenta algo que hiciste.",
      },
      {
        pattern: "Noun modifiers",
        meaning: "Describir un sustantivo con una oración.",
        example: "私が好きな歌です。",
        translation: "Es una canción que me gusta.",
        cue: "Describe qué tipo de cosa es.",
      },
      {
        pattern: "まだ〜ていません",
        meaning: "Decir que todavía no has hecho algo.",
        example: "まだ宿題をしていません。",
        translation: "Todavía no he hecho la tarea.",
        cue: "Di algo que aún no has hecho.",
      },
    ],
  },
  {
    lesson: 10,
    title: "Invierno en Kioto",
    progress: "Próximo",
    patterns: [
      {
        pattern: "Comparison",
        meaning: "Comparar dos cosas.",
        example: "京都は大阪より静かです。",
        translation: "Kioto es más tranquilo que Osaka.",
        cue: "Compara dos lugares.",
      },
      {
        pattern: "〜つもりです",
        meaning: "Hablar de planes o intención.",
        example: "冬休みに旅行するつもりです。",
        translation: "Planeo viajar en vacaciones de invierno.",
        cue: "Di qué planeas hacer.",
      },
      {
        pattern: "Adjective + なる",
        meaning: "Expresar cambio de estado.",
        example: "寒くなりました。",
        translation: "Se puso frío.",
        cue: "Describe un cambio.",
      },
    ],
  },
  {
    lesson: 11,
    title: "Después de clase",
    progress: "Próximo",
    patterns: [
      {
        pattern: "〜たいです",
        meaning: "Expresar lo que quieres hacer.",
        example: "日本に行きたいです。",
        translation: "Quiero ir a Japón.",
        cue: "Di algo que quieres hacer.",
      },
      {
        pattern: "〜たり〜たりする",
        meaning: "Enumerar actividades como ejemplos.",
        example: "週末は映画を見たり、買い物したりします。",
        translation: "Los fines de semana veo películas, hago compras, etc.",
        cue: "Cuenta varias actividades.",
      },
      {
        pattern: "〜ことがある",
        meaning: "Hablar de experiencias.",
        example: "京都に行ったことがあります。",
        translation: "He ido a Kioto.",
        cue: "Di algo que has vivido.",
      },
    ],
  },
  {
    lesson: 12,
    title: "Viaje a Nara",
    progress: "Próximo",
    patterns: [
      {
        pattern: "〜んです",
        meaning: "Dar contexto, explicar o suavizar una frase.",
        example: "頭が痛いんです。",
        translation: "Es que me duele la cabeza.",
        cue: "Da una explicación.",
      },
      {
        pattern: "〜すぎる",
        meaning: "Decir que algo es excesivo.",
        example: "この宿題は難しすぎます。",
        translation: "Esta tarea es demasiado difícil.",
        cue: "Describe algo excesivo.",
      },
      {
        pattern: "〜ほうがいいです",
        meaning: "Dar consejo.",
        example: "早く寝たほうがいいです。",
        translation: "Sería mejor dormir temprano.",
        cue: "Da un consejo.",
      },
    ],
  },
];

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
