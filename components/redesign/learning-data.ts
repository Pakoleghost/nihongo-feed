import { GENKI_KANJI_BY_LESSON } from "@/lib/genki-kanji-by-lesson";
import { GENKI_LESSON_NAMES } from "@/lib/genki-lesson-names";
import { GENKI_VOCAB_BY_LESSON } from "@/lib/genki-vocab-by-lesson";
import { CURRICULUM_MODULES } from "@/lib/curriculum-modules";
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
  pattern: string;
  meaning: string;
  example: string;
  translation: string;
  cue: string;
};

export type GrammarLessonCard = {
  lesson: number;
  title: string;
  progress: string;
  patterns: GrammarPattern[];
  count?: number;
  isCurrent?: boolean;
};

export const grammarLessons: GrammarLessonCard[] = [
  {
    lesson: 1,
    title: "Nuevos amigos",
    progress: "Base",
    patterns: [
      {
        pattern: "X は Y です",
        meaning: "Presentar o identificar algo de forma básica.",
        example: "私は学生です。",
        translation: "Soy estudiante.",
        cue: "Di quién eres o qué es algo.",
      },
      {
        pattern: "X は Y じゃないです",
        meaning: "Negar una identificación.",
        example: "田中さんは先生じゃないです。",
        translation: "Tanaka no es profesor.",
        cue: "Corrige una idea equivocada.",
      },
      {
        pattern: "X の Y",
        meaning: "Indicar relación, posesión o categoría.",
        example: "日本語の本です。",
        translation: "Es un libro de japonés.",
        cue: "Une dos sustantivos.",
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
  return grammarLessons.map((lesson) => ({
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
