// Grammar content for Genki I — original explanations in Spanish
// Furigana format: {漢字|かな}
// Batch: L1-L12 complete

export type GrammarExample = {
  jp: string;       // Japanese sentence (may include {漢字|かな})
  reading?: string; // Full kana reading when needed
  es: string;       // Spanish translation
  note?: string;    // Usage note
};

export type GrammarDialogueLine = {
  speaker: string;
  jp: string;
  es: string;
};

// Lightweight, gradeless mini-exercise — solvable in 10-20 seconds.
export type GrammarMiniExercise =
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

export type GrammarContentItem = {
  id: string;
  lesson: number;
  title: string;
  pattern: string;
  shortMeaning: string;
  explanation: string[];
  formation: string[];
  examples: GrammarExample[];
  dialogue?: GrammarDialogueLine[];
  exercise?: GrammarMiniExercise;
  commonMistakes: string[];
  interactions?: string[];   // classroom interaction ideas
  practicePrompts: string[];
  relatedGrammarIds: string[];
  sourceNotes: string[];
};

export const GENKI_I_GRAMMAR_CONTENT: GrammarContentItem[] = [

  // ═══════════════════════════════════════════════
  //  LECCIÓN 1 — {新|あたら}しい{友達|ともだち}
  // ═══════════════════════════════════════════════

  {
    id: "copula-affirmative",
    lesson: 1,
    title: "N は N です",
    pattern: "X は Y です",
    shortMeaning: "\"X es Y\" — identifica o describe el tema de la oración.",
    explanation: [
      "です va siempre al final — equivale a «es/soy/eres».",
      "は marca el tema («en cuanto a X…») y se pronuncia «wa».",
      "Para negar usa じゃないです; para preguntar, agrega か.",
    ],
    formation: [
      "N₁ は N₂ です",
      "N₁ は N₂ じゃないです",
      "N₁ は N₂ ですか",
    ],
    examples: [
      {
        jp: "{私|わたし}は{学生|がくせい}です。",
        es: "Soy estudiante.",
      },
      {
        jp: "{山田|やまだ}さんは{先生|せんせい}じゃないです。",
        es: "La señora Yamada no es profesora.",
      },
      {
        jp: "{田中|たなか}さんは{日本人|にほんじん}ですか。",
        es: "¿El señor Tanaka es japonés?",
      },
      {
        jp: "いいえ、{韓国人|かんこくじん}です。",
        es: "No, es coreano.",
        note: "Respuesta corta a la pregunta anterior.",
      },
    ],
    dialogue: [
      { speaker: "メアリー", jp: "はじめまして。{私|わたし}はメアリーです。{学生|がくせい}です。", es: "Mucho gusto. Soy Mary. Soy estudiante." },
      { speaker: "たけし",   jp: "はじめまして。{僕|ぼく}はたけしです。{日本人|にほんじん}です。", es: "Mucho gusto. Soy Takeshi. Soy japonés." },
      { speaker: "メアリー", jp: "{田中|たなか}さんも{学生|がくせい}ですか。", es: "¿El señor Tanaka también es estudiante?" },
      { speaker: "たけし",   jp: "いいえ、{先生|せんせい}です。", es: "No, es profesor." },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "私___学生です。",
      options: ["は", "を", "に"],
      answer: "は",
      successMessage: "Exacto — は marca el tema.",
    },
    commonMistakes: [
      "Poner です en el medio: ×{私|わたし}です{学生|がくせい} → ○{私|わたし}は{学生|がくせい}です",
      "Leer は como «ha» — siempre se pronuncia «wa».",
      "Olvidar か al final de las preguntas.",
    ],
    interactions: [
      "Ronda de presentaciones: cada alumno dice nombre, rol y origen con X は Y です.",
      "Verdad o mentira: el profesor hace una afirmación falsa sobre un alumno y la clase niega con じゃないです.",
    ],
    practicePrompts: [
      "Preséntate mencionando tu nombre, tu rol en clase y tu nacionalidad.",
      "Di tres cosas que NO eres usando じゃないです.",
      "Pregunta a un compañero su nombre con ～さんは～ですか y confirma la respuesta.",
    ],
    relatedGrammarIds: ["questions-ka", "particle-no-modifier", "particle-to-listing"],
    sourceNotes: ["Basado en Genki I L1, Grammar 1 (cópula)"],
  },

  {
    id: "questions-ka",
    lesson: 1,
    title: "Preguntas con か",
    pattern: "〜ですか",
    shortMeaning: "Agrega か al final de cualquier oración para convertirla en pregunta.",
    explanation: [
      "Solo añades か al final — no cambia el orden de las palabras.",
      "La voz no sube como en español; queda plana o baja.",
      "Responde con はい (sí) o いいえ (no) + la información.",
    ],
    formation: [
      "[oración] + か  →  ¿[oración]?",
      "はい、N は N です →  Sí, X es Y.",
      "いいえ、N は N じゃないです → No, X no es Y.",
    ],
    examples: [
      {
        jp: "これは{教科書|きょうかしょ}ですか。",
        es: "¿Esto es el libro de texto?",
      },
      {
        jp: "はい、{教科書|きょうかしょ}です。",
        es: "Sí, es el libro de texto.",
      },
      {
        jp: "{山田|やまだ}さんは{先生|せんせい}ですか。",
        es: "¿El señor Yamada es profesor?",
      },
      {
        jp: "いいえ、{医者|いしゃ}です。",
        es: "No, es médico.",
      },
    ],
    exercise: {
      type: "fill-blank",
      prompt: "Convierte la afirmación en pregunta.",
      before: "これは本です",
      after: "。",
      answer: "か",
      placeholder: "partícula",
      successMessage: "Bien — か convierte la oración en pregunta.",
    },
    commonMistakes: [
      "Subir la voz al final como en español.",
      "Invertir el orden de palabras: × ですか{先生|せんせい}は{田中|たなか}さん → ○ {田中|たなか}さんは{先生|せんせい}ですか",
    ],
    interactions: [
      "Juego de adivinanzas: un alumno piensa en una profesión y el grupo pregunta con ですか hasta adivinar.",
    ],
    practicePrompts: [
      "Haz tres preguntas a un compañero sobre su identidad (nombre, profesión, origen) usando ですか.",
      "Responde con oración completa: はい／いいえ + [información corregida].",
    ],
    relatedGrammarIds: ["copula-affirmative", "particle-no-modifier"],
    sourceNotes: ["Basado en Genki I L1, Grammar 2 (preguntas con か)"],
  },

  {
    id: "particle-no-modifier",
    lesson: 1,
    title: "N の N",
    pattern: "N₁ の N₂",
    shortMeaning: "の conecta dos sustantivos: posesión, categoría o descripción (N₁ modifica a N₂).",
    explanation: [
      "の conecta dos sustantivos: «N2 de N1» (el orden se invierte).",
      "Sirve para posesión, categoría y afiliación.",
      "Si el segundo sustantivo es obvio, se puede omitir: これは私のです。",
    ],
    formation: [
      "N₁ の N₂   →  «N₂ de N₁»",
      "{私|わたし} の N     →  mi N",
    ],
    examples: [
      {
        jp: "{日本語|にほんご}の{本|ほん}です。",
        es: "Es un libro de japonés.",
      },
      {
        jp: "{私|わたし}の{名前|なまえ}はパコです。",
        es: "Mi nombre es Pako.",
      },
      {
        jp: "{田中|たなか}さんは{大学|だいがく}の{学生|がくせい}です。",
        es: "El señor Tanaka es estudiante de la universidad.",
      },
      {
        jp: "これは{山田|やまだ}さんの{傘|かさ}ですか。",
        es: "¿Este es el paraguas del señor Yamada?",
      },
    ],
    exercise: {
      type: "word-order",
      prompt: "Ordena la frase: «Es un libro de japonés».",
      tokens: ["です", "本", "の", "日本語"],
      answer: ["日本語", "の", "本", "です"],
      successMessage: "¡Bien! N₁の N₂ — el modificador va primero.",
    },
    commonMistakes: [
      "Invertir el orden: × {本|ほん}の{日本語|にほんご} → ○ {日本語|にほんご}の{本|ほん}",
      "Omitir の entre dos sustantivos: × {私|わたし}{本|ほん} → ○ {私|わたし}の{本|ほん}.",
    ],
    interactions: [
      "¿De quién es esto? El profesor levanta objetos y pregunta ～さんの～ですか; los alumnos responden.",
    ],
    practicePrompts: [
      "Describe tres objetos del salón de clase usando N の N (ej. 日本語の本、私のペン).",
      "Preséntate mencionando tu universidad o trabajo usando ～の学生/先生/社員です.",
    ],
    relatedGrammarIds: ["copula-affirmative", "particle-to-listing"],
    sourceNotes: ["Basado en Genki I L1, Grammar 3 (partícula の)"],
  },

  {
    id: "particle-to-listing",
    lesson: 1,
    title: "N と N",
    pattern: "N₁ と N₂",
    shortMeaning: "\"N₁ y N₂\" — enumeración exhaustiva de sustantivos.",
    explanation: [
      "と significa «y» y enlaza una lista completa de sustantivos.",
      "Se puede encadenar: A と B と C.",
      "No confundir con も (también) — と solo enumera.",
    ],
    formation: [
      "N₁ と N₂       →  N₁ y N₂  (lista completa)",
      "N₁ と N₂ と N₃ →  N₁, N₂ y N₃",
    ],
    examples: [
      {
        jp: "{私|わたし}は{日本語|にほんご}と{英語|えいご}を{話|はな}します。",
        es: "Hablo japonés e inglés.",
      },
      {
        jp: "{本|ほん}とペンがあります。",
        es: "Hay un libro y un bolígrafo.",
      },
      {
        jp: "{山田|やまだ}さんと{田中|たなか}さんは{学生|がくせい}です。",
        es: "Los señores Yamada y Tanaka son estudiantes.",
      },
      {
        jp: "{水|みず}とコーヒーを{飲|の}みます。",
        es: "Tomo agua y café.",
      },
    ],
    exercise: {
      type: "word-order",
      prompt: "Ordena: «Hablo japonés e inglés».",
      tokens: ["話します", "を", "私は", "英語", "と", "日本語"],
      answer: ["私は", "日本語", "と", "英語", "を", "話します"],
      successMessage: "¡Perfecto!",
    },
    commonMistakes: [
      "Usar と entre verbos — solo conecta sustantivos. Para acciones se usa la forma て (L6).",
      "Creer que と siempre significa «con (compañía)» — ese uso se ve en L4.",
    ],
    practicePrompts: [
      "Nombra dos cosas que tienes en tu mochila usando N と N があります。",
      "Presenta a dos personas de tu familia usando Aと B は ～ です。",
    ],
    relatedGrammarIds: ["particle-no-modifier", "particle-ya-listing", "particle-mo-similarity"],
    sourceNotes: ["Basado en Genki I L1, Grammar 4 (partícula と — enumeración)"],
  },

  // ═══════════════════════════════════════════════
  //  LECCIÓN 2 — {買|か}い{物|もの}
  // ═══════════════════════════════════════════════

  {
    id: "particle-mo-similarity",
    lesson: 2,
    title: "N も",
    pattern: "N も",
    shortMeaning: "\"N también\" — agrega un elemento que comparte la misma descripción.",
    explanation: [
      "も sustituye a は cuando algo comparte la misma descripción.",
      "Nunca aparece junto a は en la misma posición.",
      "En negación, も significa «tampoco».",
    ],
    formation: [
      "A は Y です。B も Y です。  →  A es Y. B también es Y.",
      "A は Y じゃないです。B も Y じゃないです。  →  A no es Y. B tampoco es Y.",
    ],
    examples: [
      {
        jp: "{私|わたし}は{学生|がくせい}です。{山田|やまだ}さんも{学生|がくせい}です。",
        es: "Soy estudiante. El señor Yamada también es estudiante.",
      },
      {
        jp: "{田中|たなか}さんは{日本人|にほんじん}じゃないです。{鈴木|すずき}さんも{日本人|にほんじん}じゃないです。",
        es: "El señor Tanaka no es japonés. El señor Suzuki tampoco es japonés.",
      },
      {
        jp: "{私|わたし}は{日本語|にほんご}を{勉強|べんきょう}します。{山田|やまだ}さんも{勉強|べんきょう}します。",
        es: "Estudio japonés. El señor Yamada también estudia.",
      },
      {
        jp: "それも{同|おな}じ{値段|ねだん}ですか。",
        es: "¿Aquello también tiene el mismo precio?",
      },
    ],
    dialogue: [
      { speaker: "メアリー", jp: "{私|わたし}はアメリカ{人|じん}です。", es: "Soy estadounidense." },
      { speaker: "アナ",     jp: "そうですか。{私|わたし}もアメリカ{人|じん}です。", es: "¿De verdad? Yo también soy estadounidense." },
      { speaker: "メアリー", jp: "{山田|やまだ}さんもアメリカ{人|じん}ですか。", es: "¿El señor Yamada también es estadounidense?" },
      { speaker: "アナ",     jp: "いいえ、{山田|やまだ}さんはアメリカ{人|じん}じゃないです。", es: "No, el señor Yamada no es estadounidense." },
    ],
    exercise: {
      type: "fill-blank",
      prompt: "Yamada también es estudiante. Completa la partícula.",
      before: "山田さん",
      after: "学生です。",
      answer: "も",
      placeholder: "partícula",
      successMessage: "も — comparte la misma descripción.",
    },
    commonMistakes: [
      "Usar は y も juntos: × {私|わたし}はも{学生|がくせい}です → ○ {私|わたし}も{学生|がくせい}です",
      "Confundir も (también/tampoco) con と (y).",
    ],
    interactions: [
      "Cadena de presentaciones: el primero se presenta, el siguiente dice 「～さんは～です。私も～です」 si comparte algo, o lo contradice.",
    ],
    practicePrompts: [
      "Di dos cosas que tienes en común con un compañero usando も.",
      "Encuentra algo que tú SÍ eres pero tu compañero NO: usa は para ti y も o じゃないです para el otro.",
    ],
    relatedGrammarIds: ["copula-affirmative", "particle-to-listing", "particle-ya-listing"],
    sourceNotes: ["Basado en Genki I L2, Grammar 1 (partícula も)"],
  },

  {
    id: "demonstratives",
    lesson: 2,
    title: "これ・それ・あれ / この・その・あの + N",
    pattern: "これ／それ／あれ　/　この／その／あの + N",
    shortMeaning: "Señalar cosas según la distancia: esto/eso/aquello y sus formas adjetivales.",
    explanation: [
      "これ/それ/あれ van solos; この/その/あの necesitan un sustantivo después.",
      "これ/この = cerca de mí · それ/その = cerca de ti · あれ/あの = lejos de ambos.",
      "Para preguntar: どれ (solo) o どの + N.",
    ],
    formation: [
      "これ／それ／あれ は N です",
      "この／その／あの + N は〜",
      "どれ／どの + N は〜",
    ],
    examples: [
      {
        jp: "これは{何|なん}ですか。",
        es: "¿Qué es esto?",
      },
      {
        jp: "あれは{私|わたし}の{傘|かさ}です。",
        es: "Aquello es mi paraguas.",
      },
      {
        jp: "この{時計|とけい}はいくらですか。",
        es: "¿Cuánto cuesta este reloj?",
      },
      {
        jp: "あの{人|ひと}は{先生|せんせい}ですか。",
        es: "¿Aquella persona es profesora?",
      },
    ],
    dialogue: [
      { speaker: "メアリー", jp: "すみません、これはいくらですか。", es: "Disculpa, ¿cuánto cuesta esto?" },
      { speaker: "てんいん",  jp: "それは{千|せん}{円|えん}です。", es: "Eso cuesta mil yenes." },
      { speaker: "メアリー", jp: "じゃあ、あれは？", es: "Y entonces, ¿aquello?" },
      { speaker: "てんいん",  jp: "あれは{二千|にせん}{円|えん}です。", es: "Aquello cuesta dos mil yenes." },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "«Este reloj, ¿cuánto cuesta?» — ___時計はいくらですか。",
      options: ["これ", "この", "それ"],
      answer: "この",
      successMessage: "この + sustantivo — correcto.",
    },
    commonMistakes: [
      "Usar これ donde debería ir この: × これ{本|ほん}は → ○ この{本|ほん}は",
      "Confundir どれ (solo) y どの (necesita sustantivo).",
    ],
    interactions: [
      "El profesor señala objetos del salón o imágenes y los alumnos practican las dos series: primero pronombre (これは何ですか) luego adjetival (この〇〇は何ですか).",
      "Juego de tienda: un alumno es vendedor, otro cliente. Preguntan precios con これ／この usando vocabulario de objetos cotidianos.",
    ],
    practicePrompts: [
      "Señala cinco objetos a tu alrededor usando la serie correcta (これ/それ/あれ) y descríbelos con です.",
      "Practica la versión adjetival: escoge tres objetos y dí この/その/あの + sustantivo + は + descripción.",
    ],
    relatedGrammarIds: ["copula-affirmative", "questions-ka", "location-words-koko"],
    sourceNotes: ["Basado en Genki I L2, Grammar 2-3 (demostrativos)"],
  },

  {
    id: "location-words-koko",
    lesson: 2,
    title: "ここ・そこ・あそこ・どこ",
    pattern: "ここ／そこ／あそこ／どこ",
    shortMeaning: "Palabras para señalar o preguntar por la ubicación de un lugar.",
    explanation: [
      "Igual que これ/それ/あれ pero para lugares, no cosas.",
      "どこ pregunta «¿dónde?»; nunca se usa para personas.",
      "〜は どこですか es la pregunta de ubicación más útil.",
    ],
    formation: [
      "ここ／そこ／あそこ は N です",
      "N は どこ ですか",
    ],
    examples: [
      {
        jp: "トイレは どこですか。",
        es: "¿Dónde está el baño?",
      },
      {
        jp: "トイレは あそこです。",
        es: "El baño está allá.",
      },
      {
        jp: "ここは{図書館|としょかん}ですか。",
        es: "¿Aquí es la biblioteca?",
      },
      {
        jp: "{駅|えき}は どこですか。",
        es: "¿Dónde está la estación?",
      },
    ],
    dialogue: [
      { speaker: "メアリー", jp: "すみません、{郵便局|ゆうびんきょく}は どこですか。", es: "Disculpe, ¿dónde está la oficina de correos?" },
      { speaker: "つうこうにん", jp: "あそこです。", es: "Está allá." },
    ],
    exercise: {
      type: "fill-blank",
      prompt: "Pregunta dónde está la biblioteca.",
      before: "図書館は",
      after: "ですか。",
      answer: "どこ",
      placeholder: "lugar",
      successMessage: "どこ — pregunta de ubicación.",
    },
    commonMistakes: [
      "Confundir ここ (lugar, «aquí») con この (adjetivo, «este»).",
      "Usar どこ para personas — para eso se usa だれ (¿quién?).",
    ],
    interactions: [
      "Mapa del aula: el profesor pregunta 〇〇はどこですか y los alumnos señalan y responden con ここ/そこ/あそこ.",
    ],
    practicePrompts: [
      "Pregunta dónde están tres lugares de tu ciudad o campus usando ～は どこですか.",
      "Responde con ここ/そこ/あそこ según la distancia real en el salón.",
    ],
    relatedGrammarIds: ["demonstratives", "particle-ni-destination-time", "location-ni-arimasu"],
    sourceNotes: ["Basado en Genki I L2, Grammar 4 (ここ・そこ・あそこ・どこ)"],
  },

  // ═══════════════════════════════════════════════
  //  LECCIÓN 3 — {デート|でーと}
  // ═══════════════════════════════════════════════

  {
    id: "verb-masu-present",
    lesson: 3,
    title: "Verbos en forma ます",
    pattern: "Vます / Vません / Vますか",
    shortMeaning: "Forma cortés de los verbos para hablar de acciones presentes o futuras.",
    explanation: [
      "ます es la forma cortés de los verbos; siempre va al final.",
      "ません niega; ますか pregunta.",
      "El objeto (si existe) va antes del verbo, marcado con を.",
    ],
    formation: [
      "V-ます       →  [acción]",
      "V-ません     →  no [acción]",
      "V-ますか     →  ¿[acción]?",
    ],
    examples: [
      {
        jp: "{毎日|まいにち}{日本語|にほんご}を{勉強|べんきょう}します。",
        es: "Estudio japonés todos los días.",
      },
      {
        jp: "{朝|あさ}、コーヒーを{飲|の}みます。",
        es: "Por la mañana tomo café.",
      },
      {
        jp: "{週末|しゅうまつ}、{映画|えいが}を{見|み}ますか。",
        es: "¿Ves películas el fin de semana?",
      },
      {
        jp: "{テレビ|てれび}は{見|み}ません。",
        es: "No veo televisión.",
      },
    ],
    exercise: {
      type: "word-order",
      prompt: "Ordena: «Estudio japonés todos los días».",
      tokens: ["します", "を", "毎日", "勉強", "日本語"],
      answer: ["毎日", "日本語", "を", "勉強", "します"],
      successMessage: "¡Bien! El verbo siempre cierra la oración.",
    },
    commonMistakes: [
      "Colocar el verbo en el medio: × {食|た}べます{ごはん|ごはん}を → ○ ごはんを{食|た}べます",
      "Confundir ます (presente/futuro) con ました (pasado).",
    ],
    interactions: [
      "Ronda «¿Qué haces cada día?»: cada alumno dice una rutina con ます y el siguiente hace una pregunta con ますか.",
    ],
    practicePrompts: [
      "Di tres cosas que haces todos los días usando ます y tres que no haces usando ません.",
      "Pregunta a un compañero sobre sus hábitos de fin de semana con ますか.",
    ],
    relatedGrammarIds: ["particle-wo", "frequency-adverbs", "verb-masu-past"],
    sourceNotes: ["Basado en Genki I L3, Grammar 1 (verbos en ます)"],
  },

  {
    id: "particle-wo",
    lesson: 3,
    title: "を (objeto directo)",
    pattern: "N を V",
    shortMeaning: "を marca el objeto directo: lo que recibe la acción del verbo.",
    explanation: [
      "を marca el objeto directo: lo que recibe la acción.",
      "Solo se usa con verbos de acción, nunca con です.",
      "En clase y producción escrita, siempre se escribe.",
    ],
    formation: [
      "N を V-ます  →  [hacer la acción] sobre N",
    ],
    examples: [
      {
        jp: "{音楽|おんがく}を{聞|き}きます。",
        es: "Escucho música.",
      },
      {
        jp: "{本|ほん}を{読|よ}みます。",
        es: "Leo un libro.",
      },
      {
        jp: "{水|みず}を{飲|の}みますか。",
        es: "¿Tomas agua?",
      },
      {
        jp: "{毎日|まいにち}{日本語|にほんご}を{勉強|べんきょう}します。",
        es: "Estudio japonés todos los días.",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "音楽___聞きます。",
      options: ["を", "が", "に"],
      answer: "を",
      successMessage: "を — marca el objeto directo.",
    },
    commonMistakes: [
      "Usar が en lugar de を para el objeto: × {映画|えいが}が{見|み}ます → ○ {映画|えいが}を{見|み}ます",
      "Usar を con です — を solo va con verbos de acción.",
    ],
    practicePrompts: [
      "Escribe tres oraciones sobre lo que haces en clase: 〜を〜ます.",
      "Pregunta a un compañero qué come en el desayuno: 〜を{食|た}べますか.",
    ],
    relatedGrammarIds: ["verb-masu-present", "particle-ga-subject", "particle-ni-destination-time"],
    sourceNotes: ["Basado en Genki I L3, Grammar 2 (partícula を)"],
  },

  {
    id: "particle-ni-destination-time",
    lesson: 3,
    title: "に (destino / tiempo específico)",
    pattern: "N に V / 時間 に V",
    shortMeaning: "に marca destino de movimiento y momentos de tiempo específicos.",
    explanation: [
      "に marca el destino con verbos de movimiento: 行く/来る/帰る.",
      "También marca un momento exacto: hora, día, fecha.",
      "No se usa に con 今日/明日/毎日 — esas van solas.",
    ],
    formation: [
      "場所 に 行く／来る／帰る",
      "時間 に V-ます",
    ],
    examples: [
      {
        jp: "{明日|あした}{図書館|としょかん}に{行|い}きます。",
        es: "Mañana voy a la biblioteca.",
      },
      {
        jp: "{日曜日|にちようび}に{映画|えいが}を{見|み}ます。",
        es: "El domingo veo una película.",
      },
      {
        jp: "{七時|しちじ}に{起|お}きます。",
        es: "Me levanto a las siete.",
      },
      {
        jp: "{毎日|まいにち}{学校|がっこう}に{来|き}ます。",
        es: "Vengo a la escuela todos los días.",
      },
    ],
    exercise: {
      type: "fill-blank",
      prompt: "Mañana voy a la biblioteca.",
      before: "明日図書館",
      after: "行きます。",
      answer: "に",
      placeholder: "partícula",
      successMessage: "に — marca el destino.",
    },
    commonMistakes: [
      "Usar に con 今日/明日/毎日: × 今日に{行|い}きます → ○ 今日{行|い}きます",
      "Confundir に (destino) con で (lugar donde haces la acción).",
    ],
    practicePrompts: [
      "Di a qué lugar vas esta semana y cuándo exactamente: [lugar]に[時間]に行きます。",
      "Comparte tu rutina mañanera con horas específicas usando に.",
    ],
    relatedGrammarIds: ["particle-de-location-means", "particle-wo", "verb-masu-present"],
    sourceNotes: ["Basado en Genki I L3, Grammar 3 (partícula に — destino y tiempo)"],
  },

  {
    id: "particle-de-location-means",
    lesson: 3,
    title: "で (lugar de acción / medio)",
    pattern: "場所 で V / 手段 で V",
    shortMeaning: "で marca dónde ocurre una acción o con qué medio se realiza.",
    explanation: [
      "で marca dónde ocurre la acción (no el destino — eso es に).",
      "También marca el medio: バスで, 日本語で.",
      "Compara: 図書館に行く (destino) vs 図書館で勉強する (acción).",
    ],
    formation: [
      "場所 で V-ます",
      "手段 で V",
    ],
    examples: [
      {
        jp: "{図書館|としょかん}で{勉強|べんきょう}します。",
        es: "Estudio en la biblioteca.",
      },
      {
        jp: "{カフェ|かふぇ}でコーヒーを{飲|の}みます。",
        es: "Tomo café en el café.",
      },
      {
        jp: "{電車|でんしゃ}で{大学|だいがく}に{行|い}きます。",
        es: "Voy a la universidad en tren.",
      },
      {
        jp: "{日本語|にほんご}で{話|はな}しましょう。",
        es: "Hablemos en japonés.",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "図書館___勉強します。",
      options: ["で", "に", "を"],
      answer: "で",
      successMessage: "で — dónde ocurre la acción.",
    },
    commonMistakes: [
      "Usar に en lugar de で para el lugar de acción: × {図書館|としょかん}に{勉強|べんきょう}します → ○ {図書館|としょかん}で{勉強|べんきょう}します",
      "Olvidar で con el medio de transporte.",
    ],
    practicePrompts: [
      "Di dónde haces tres actividades distintas: [場所]で[V]ます。",
      "Describe cómo llegas a la universidad: 何で来ますか → [手段]で来ます。",
    ],
    relatedGrammarIds: ["particle-ni-destination-time", "particle-wo", "verb-masu-present"],
    sourceNotes: ["Basado en Genki I L3, Grammar 4 (partícula で)"],
  },

  {
    id: "particle-wa-contrast",
    lesson: 3,
    title: "は (contraste)",
    pattern: "A は〜。B は〜。",
    shortMeaning: "は también marca contraste: «en cuanto a A… en cuanto a B…».",
    explanation: [
      "Repetir は en dos partes contrasta: «en cuanto a A… en cuanto a B…».",
      "Muy común al negar algo y afirmar otra cosa.",
      "No siempre es negativo, solo resalta una diferencia.",
    ],
    formation: [
      "N₁ は V-ません。N₂ は V-ます。",
    ],
    examples: [
      {
        jp: "コーヒーは{飲|の}みません。{水|みず}は{飲|の}みます。",
        es: "Café no tomo. Agua sí tomo.",
      },
      {
        jp: "{週末|しゅうまつ}は{勉強|べんきょう}しません。{映画|えいが}は{見|み}ます。",
        es: "El fin de semana no estudio. Películas sí veo.",
      },
      {
        jp: "{日本語|にほんご}は{話|はな}します。{英語|えいご}は{話|はな}しません。",
        es: "Japonés sí hablo. Inglés no hablo.",
      },
      {
        jp: "{本|ほん}は{読|よ}みます。{テレビ|てれび}は{見|み}ません。",
        es: "Libros sí leo. Televisión no veo.",
      },
    ],
    exercise: {
      type: "fill-blank",
      prompt: "Café no tomo. Agua sí tomo.",
      before: "コーヒー",
      after: "飲みません。水は飲みます。",
      answer: "は",
      placeholder: "partícula",
      successMessage: "は repetido marca el contraste.",
    },
    commonMistakes: [
      "Pensar que は siempre es «sujeto» — は marca tema/contraste; el sujeto agente suele ir con が.",
      "Usar が cuando la intención es contraste.",
    ],
    practicePrompts: [
      "Di qué no haces entre semana pero sí haces el fin de semana: [tiempo]は～ません。[tiempo]は～ます。",
      "Compara dos amigos o miembros de la familia con は en contraste.",
    ],
    relatedGrammarIds: ["particle-ga-subject", "verb-masu-present", "copula-affirmative"],
    sourceNotes: ["Basado en Genki I L3, Grammar 5 (は contraste)"],
  },

  {
    id: "particle-ga-subject",
    lesson: 3,
    title: "が (sujeto / foco nuevo)",
    pattern: "N が V / N が あります",
    shortMeaning: "が marca el sujeto cuando se introduce información nueva o se responde a ¿quién/qué?",
    explanation: [
      "が introduce sujetos nuevos o responde a «¿quién?/¿qué?».",
      "は dice «en cuanto a X (conocido)»; が dice «X (nuevo) hace esto».",
      "Aparece mucho en respuestas a だれが／何が.",
    ],
    formation: [
      "N が V-ます",
      "だれが V-ますか → N が V-ます",
    ],
    examples: [
      {
        jp: "だれが{日本語|にほんご}を{勉強|べんきょう}しますか。",
        es: "¿Quién estudia japonés?",
      },
      {
        jp: "{田中|たなか}さんが{勉強|べんきょう}します。",
        es: "El señor Tanaka lo estudia.",
      },
      {
        jp: "{電話|でんわ}が{鳴|な}っています。",
        es: "El teléfono está sonando.",
      },
      {
        jp: "{誰|だれ}が{来|き}ましたか。メアリーさんが{来|き}ました。",
        es: "¿Quién vino? Vino Mary.",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "だれ___来ましたか。",
      options: ["が", "は", "を"],
      answer: "が",
      successMessage: "が — pregunta por sujeto nuevo.",
    },
    commonMistakes: [
      "Sustituir は por が en presentaciones: × {私|わたし}が{学生|がくせい}です → ○ {私|わたし}は{学生|がくせい}です",
      "Usar を para el sujeto.",
    ],
    practicePrompts: [
      "Responde: だれが先生ですか con が en la respuesta.",
      "Crea tres oraciones donde se introduce algo nuevo con が.",
    ],
    relatedGrammarIds: ["particle-wa-contrast", "particle-wo", "arimasu-imasu"],
    sourceNotes: ["Basado en Genki I L3, Grammar 6 (partícula が)"],
  },

  {
    id: "frequency-adverbs",
    lesson: 3,
    title: "Adverbios de frecuencia",
    pattern: "いつも／よく／時々／あまり～ない／全然～ない",
    shortMeaning: "Palabras que indican con qué frecuencia haces algo.",
    explanation: [
      "Van antes del verbo, sin partícula, de mayor a menor frecuencia.",
      "あまり y 全然 siempre necesitan ません al final.",
      "Orden: いつも → よく → 時々 → あまり → 全然.",
    ],
    formation: [
      "いつも／よく／時々 + V-ます",
      "あまり／全然 + V-ません",
    ],
    examples: [
      {
        jp: "{私|わたし}はいつも{朝|あさ}{ごはん|ごはん}を{食|た}べます。",
        es: "Siempre desayuno.",
      },
      {
        jp: "{週末|しゅうまつ}はよく{映画|えいが}を{見|み}ます。",
        es: "El fin de semana frecuentemente veo películas.",
      },
      {
        jp: "{野菜|やさい}はあまり{食|た}べません。",
        es: "No como mucha verdura.",
      },
      {
        jp: "{お酒|おさけ}は{全然|ぜんぜん}{飲|の}みません。",
        es: "No tomo nada de alcohol.",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "野菜はあまり___。",
      options: ["食べます", "食べません"],
      answer: "食べません",
      successMessage: "あまり siempre va con ません.",
    },
    commonMistakes: [
      "あまり con verbo afirmativo: × あまり{飲|の}みます → ○ あまり{飲|の}みません",
      "Colocar el adverbio después del verbo: × {食|た}べますいつも → ○ いつも{食|た}べます",
    ],
    practicePrompts: [
      "Describe tu semana usando los cinco adverbios de frecuencia con actividades distintas.",
      "Pregunta a un compañero: よく〜ますか y responde con el adverbio adecuado.",
    ],
    relatedGrammarIds: ["verb-masu-present", "particle-wo"],
    sourceNotes: ["Basado en Genki I L3, Grammar 7 (adverbios de frecuencia)"],
  },

  {
    id: "particle-ya-listing",
    lesson: 3,
    title: "や (enumeración no exhaustiva)",
    pattern: "N₁ や N₂",
    shortMeaning: "\"N₁ y N₂ (entre otras cosas)\" — lista abierta, no incluye todo.",
    explanation: [
      "や une sustantivos como と, pero la lista NO es completa.",
      "Implica «N₁, N₂ y cosas similares».",
      "Si la lista es exhaustiva, usa と; si son solo ejemplos, usa や.",
    ],
    formation: [
      "N₁ や N₂",
    ],
    examples: [
      {
        jp: "{図書館|としょかん}で{本|ほん}や{雑誌|ざっし}を{読|よ}みます。",
        es: "En la biblioteca leo libros, revistas y cosas así.",
      },
      {
        jp: "{週末|しゅうまつ}は{映画|えいが}や{音楽|おんがく}を{楽|たの}しみます。",
        es: "El fin de semana disfruto películas, música y más.",
      },
      {
        jp: "{机|つくえ}の{上|うえ}に{本|ほん}やペンがあります。",
        es: "Sobre el escritorio hay libros, plumas y otras cosas.",
      },
      {
        jp: "{友達|ともだち}や{家族|かぞく}と{話|はな}します。",
        es: "Hablo con amigos, familia y otros.",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "図書館で本___雑誌を読みます。 (solo ejemplos, no todo)",
      options: ["と", "や"],
      answer: "や",
      successMessage: "や — lista abierta, no exhaustiva.",
    },
    commonMistakes: [
      "Usar や cuando la lista es completa — en ese caso usa と.",
      "Poner や entre verbos — や solo conecta sustantivos.",
    ],
    practicePrompts: [
      "Di qué cosas sueles llevar en tu mochila usando や (son ejemplos, no todo).",
      "¿Qué haces el fin de semana? Usa や para dar algunos ejemplos.",
    ],
    relatedGrammarIds: ["particle-to-listing", "particle-wo"],
    sourceNotes: ["Basado en Genki I L3, Grammar 8 (partícula や)"],
  },

  {
    id: "masen-ka",
    lesson: 3,
    title: "～ませんか (invitación)",
    pattern: "V-ませんか",
    shortMeaning: "Invitar a alguien a hacer algo juntos: \"¿No quieres/queremos…?\"",
    explanation: [
      "ませんか invita con suavidad: «¿no quieres…?».",
      "Más delicado que ましょう (propuesta entusiasta, L5).",
      "Para aceptar: いいですね / はい、ぜひ.",
    ],
    formation: [
      "V-ませんか",
    ],
    examples: [
      {
        jp: "{一緒|いっしょ}に{映画|えいが}を{見|み}ませんか。",
        es: "¿No quieres ver una película juntos?",
      },
      {
        jp: "{昼|ひる}ごはんを{食|た}べませんか。",
        es: "¿Comemos juntos?",
      },
      {
        jp: "{今週末|こんしゅうまつ}、カフェに{行|い}きませんか。",
        es: "¿No vamos a un café este fin de semana?",
      },
      {
        jp: "{一緒|いっしょ}に{勉強|べんきょう}しませんか。",
        es: "¿No estudiamos juntos?",
      },
    ],
    dialogue: [
      { speaker: "たけし", jp: "{一緒|いっしょ}に{昼|ひる}ごはんを{食|た}べませんか。", es: "¿Comemos juntos?" },
      { speaker: "メアリー", jp: "いいですね！", es: "¡Me parece bien!" },
    ],
    exercise: {
      type: "fill-blank",
      prompt: "¿No quieres ver una película juntos?",
      before: "一緒に映画を見",
      after: "。",
      answer: "ませんか",
      placeholder: "invitación",
      successMessage: "ませんか — invitación suave.",
    },
    commonMistakes: [
      "Confundir ませんか (invitación suave) con ましょう (propuesta entusiasta).",
    ],
    practicePrompts: [
      "Invita a un compañero a hacer tres actividades distintas esta semana con ませんか.",
      "Practica aceptar y declinar invitaciones con el vocabulario aprendido.",
    ],
    relatedGrammarIds: ["verb-masu-present", "mashou-mashouka"],
    sourceNotes: ["Basado en Genki I L3, Grammar 9 (～ませんか)"],
  },

  // ═══════════════════════════════════════════════
  //  LECCIÓN 4 — {初|はじ}めてのデート
  // ═══════════════════════════════════════════════

  {
    id: "verb-masu-past",
    lesson: 4,
    title: "Verbos en pasado: ました / ませんでした",
    pattern: "V-ました / V-ませんでした",
    shortMeaning: "Forma cortés pasada: «hice» y «no hice».",
    explanation: [
      "ます → ました (pasado) y ません → ませんでした (pasado negativo).",
      "Solo cambia la terminación; el resto del verbo no cambia.",
      "昨日 (ayer) y 先週 (la semana pasada) van sin partícula.",
    ],
    formation: [
      "V-ます    →  V-ました",
      "V-ません  →  V-ませんでした",
    ],
    examples: [
      {
        jp: "{昨日|きのう}{図書館|としょかん}で{勉強|べんきょう}しました。",
        es: "Ayer estudié en la biblioteca.",
      },
      {
        jp: "{先週|せんしゅう}{映画|えいが}を{見|み}ませんでした。",
        es: "La semana pasada no vi ninguna película.",
      },
      {
        jp: "{朝|あさ}ごはんを{食|た}べましたか。",
        es: "¿Desayunaste?",
      },
      {
        jp: "はい、{食|た}べました。",
        es: "Sí, desayuné.",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "昨日図書館で勉強___。",
      options: ["します", "しました", "しません"],
      answer: "しました",
      successMessage: "昨日 (ayer) pide pasado: しました.",
    },
    commonMistakes: [
      "Usar ました para el futuro — ました es SOLO pasado.",
      "Escribir ×ましでした → ○ ませんでした",
    ],
    practicePrompts: [
      "Cuenta qué hiciste ayer: tres cosas que sí hiciste (ました) y una que no (ませんでした).",
      "Pregunta a un compañero qué hizo el fin de semana pasado: 先週の週末、何をしましたか.",
    ],
    relatedGrammarIds: ["verb-masu-present", "particle-wo", "particle-ni-destination-time"],
    sourceNotes: ["Basado en Genki I L4, Grammar 1 (pasado de ます)"],
  },

  {
    id: "particle-kara-starting",
    lesson: 4,
    title: "から (punto de inicio)",
    pattern: "N から",
    shortMeaning: "から indica el punto de partida: lugar o momento desde el que algo comienza.",
    explanation: [
      "から significa «desde/de» — con lugares o con tiempo.",
      "Suele combinarse con まで (hasta): A から B まで.",
      "No confundir con から de razón/causa (L6) — el contexto lo aclara.",
    ],
    formation: [
      "場所／時間 から V",
      "A から B まで",
    ],
    examples: [
      {
        jp: "{大学|だいがく}から{駅|えき}まで{歩|ある}いて{行|い}きます。",
        es: "Voy de la universidad a la estación caminando.",
      },
      {
        jp: "{授業|じゅぎょう}は{九時|くじ}から{十時|じゅうじ}までです。",
        es: "La clase es de las nueve a las diez.",
      },
      {
        jp: "{駅|えき}から{歩|ある}いて{来|き}ました。",
        es: "Vine caminando desde la estación.",
      },
      {
        jp: "{図書館|としょかん}は{何時|なんじ}から{何時|なんじ}までですか。",
        es: "¿De qué hora a qué hora abre la biblioteca?",
      },
    ],
    exercise: {
      type: "fill-blank",
      prompt: "La clase es de las nueve a las diez.",
      before: "授業は九時",
      after: "十時までです。",
      answer: "から",
      placeholder: "partícula",
      successMessage: "から marca el inicio del rango.",
    },
    commonMistakes: [
      "Confundir から (origen) con に (destino): 東京に行く (voy A Tokio) vs. 東京から来た (vengo DE Tokio).",
      "Usar から sin まで cuando el punto final es relevante.",
    ],
    practicePrompts: [
      "Di de dónde a dónde vas normalmente para ir a la universidad: [lugar]から[lugar]まで[medio]で行きます。",
      "Describe el horario de tu clase favorita: ～から～までです。",
    ],
    relatedGrammarIds: ["particle-ni-destination-time", "particle-de-location-means", "kara-reason"],
    sourceNotes: ["Basado en Genki I L4, Grammar 2 (から — punto de inicio)"],
  },

  {
    id: "particle-to-accompaniment",
    lesson: 4,
    title: "と (acompañamiento)",
    pattern: "N と [一緒に] V",
    shortMeaning: "と marca con quién realizas una acción: \"con [persona]\".",
    explanation: [
      "と (segundo uso) indica compañía: «con [persona]».",
      "一緒に (juntos) se puede agregar, pero no es obligatorio.",
      "No confundir con と de lista (L1) — aquí va después de la persona acompañante.",
    ],
    formation: [
      "人 と V-ます",
      "人 と {一緒|いっしょ}に V-ます",
    ],
    examples: [
      {
        jp: "{友達|ともだち}と{映画|えいが}を{見|み}ました。",
        es: "Vi una película con un amigo.",
      },
      {
        jp: "{誰|だれ}と{行|い}きましたか。",
        es: "¿Con quién fuiste?",
      },
      {
        jp: "{家族|かぞく}と{一緒|いっしょ}に{夕飯|ゆうはん}を{食|た}べます。",
        es: "Ceno junto con mi familia.",
      },
      {
        jp: "{山田|やまだ}さんと{勉強|べんきょう}しました。",
        es: "Estudié con el señor Yamada.",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "友達___映画を見ました。",
      options: ["と", "の", "は"],
      answer: "と",
      successMessage: "と — compañía: «con un amigo».",
    },
    commonMistakes: [
      "Confundir と (compañía) con に (destino): × 友達に行きました → ○ 友達と行きました",
      "Usar の entre persona y acción.",
    ],
    practicePrompts: [
      "Cuenta qué hiciste el fin de semana pasado y con quién: [人]と[活動]をしました。",
      "Pregunta a tres compañeros: 先週末、誰と何をしましたか。",
    ],
    relatedGrammarIds: ["particle-to-listing", "verb-masu-past", "masen-ka"],
    sourceNotes: ["Basado en Genki I L4, Grammar 3 (と — acompañamiento)"],
  },

  {
    id: "arimasu-imasu",
    lesson: 4,
    title: "あります / います (existencia)",
    pattern: "N が あります / います",
    shortMeaning: "Indicar que algo o alguien existe o está presente.",
    explanation: [
      "あります = cosas inanimadas; います = seres animados (personas, animales).",
      "Responden a 「何がありますか／誰がいますか」.",
      "Lo que existe se marca con が, no con は.",
    ],
    formation: [
      "[cosa] が あります",
      "[persona／animal] が います",
    ],
    examples: [
      {
        jp: "{机|つくえ}の{上|うえ}に{本|ほん}があります。",
        es: "Sobre el escritorio hay un libro.",
      },
      {
        jp: "{公園|こうえん}に{子供|こども}がいます。",
        es: "En el parque hay niños.",
      },
      {
        jp: "{冷蔵庫|れいぞうこ}に{水|みず}がありますか。",
        es: "¿Hay agua en el refrigerador?",
      },
      {
        jp: "{近所|きんじょ}に{猫|ねこ}がいます。",
        es: "En el vecindario hay un gato.",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "公園に子供が___。",
      options: ["あります", "います"],
      answer: "います",
      successMessage: "います — 子供 (niños) es animado.",
    },
    commonMistakes: [
      "Usar あります para personas: × 先生があります → ○ 先生がいます",
      "Usar います para objetos: × 本がいます → ○ 本があります",
    ],
    interactions: [
      "¿Qué hay en el salón? El profesor pregunta 何がありますか e います para describir el entorno.",
    ],
    practicePrompts: [
      "Describe qué hay en tu cuarto usando あります e います con ubicaciones (en la mesa, en el piso…).",
      "Pregunta a un compañero si tiene mascotas: ペットがいますか。",
    ],
    relatedGrammarIds: ["location-ni-arimasu", "possession-ga-arimasu", "particle-ga-subject", "location-nouns"],
    sourceNotes: ["Basado en Genki I L4, Grammar 4 (あります／います)"],
  },

  {
    id: "location-nouns",
    lesson: 4,
    title: "Sustantivos de ubicación",
    pattern: "N の 上／下／前／後ろ／中／近く",
    shortMeaning: "Palabras para describir dónde está algo en relación a otro objeto.",
    explanation: [
      "Se conectan con の al objeto de referencia: 机の上 = «encima del escritorio».",
      "Básicos: 上 (sobre) · 下 (debajo) · 前 (delante) · 後ろ (detrás) · 中 (dentro) · 近く (cerca).",
      "Se combinan con あります／います para decir dónde existe algo.",
    ],
    formation: [
      "N₁ の [posición] に N₂ が あります／います",
    ],
    examples: [
      {
        jp: "{椅子|いす}の{下|した}に{猫|ねこ}がいます。",
        es: "Debajo de la silla hay un gato.",
      },
      {
        jp: "{銀行|ぎんこう}は{駅|えき}の{前|まえ}にあります。",
        es: "El banco está frente a la estación.",
      },
      {
        jp: "{かばん|かばん}の{中|なか}に{財布|さいふ}があります。",
        es: "Dentro de la bolsa hay una cartera.",
      },
      {
        jp: "{学校|がっこう}の{近く|ちかく}に{図書館|としょかん}があります。",
        es: "Cerca de la escuela hay una biblioteca.",
      },
    ],
    exercise: {
      type: "fill-blank",
      prompt: "Debajo de la silla hay un gato.",
      before: "椅子",
      after: "下に猫がいます。",
      answer: "の",
      placeholder: "partícula",
      successMessage: "の conecta el objeto con la posición.",
    },
    commonMistakes: [
      "Olvidar の entre el objeto y la palabra de posición: × 机上に → ○ 机の上に",
      "Confundir 前 (delante) y 後ろ (detrás).",
    ],
    practicePrompts: [
      "Describe la ubicación de cinco objetos de tu cuarto o el salón de clase.",
      "Dibuja un mapa simple y describe dónde están tres lugares usando の+posición.",
    ],
    relatedGrammarIds: ["arimasu-imasu", "location-ni-arimasu", "location-words-koko"],
    sourceNotes: ["Basado en Genki I L4, Grammar 5 (sustantivos de ubicación)"],
  },

  {
    id: "possession-ga-arimasu",
    lesson: 4,
    title: "X は Y が あります／います (posesión)",
    pattern: "X は Y が あります／います",
    shortMeaning: "\"X tiene Y\" — expresar posesión usando が あります／います.",
    explanation: [
      "El japonés no tiene un verbo «tener»; usa «X は Y が あります/います».",
      "は marca al poseedor; が marca lo poseído.",
      "Con objetos: あります. Con personas/animales: います.",
    ],
    formation: [
      "X は N が あります  →  X tiene N (inanimado)",
      "X は N が います   →  X tiene N (persona/animal)",
    ],
    examples: [
      {
        jp: "{私|わたし}は{車|くるま}があります。",
        es: "Tengo coche.",
      },
      {
        jp: "{田中|たなか}さんは{兄弟|きょうだい}がいますか。",
        es: "¿Tiene hermanos el señor Tanaka?",
      },
      {
        jp: "{私|わたし}は{時間|じかん}がありません。",
        es: "No tengo tiempo.",
      },
      {
        jp: "{私|わたし}は{猫|ねこ}がいます。",
        es: "Tengo un gato.",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "私は車___あります。",
      options: ["が", "を", "は"],
      answer: "が",
      successMessage: "が marca lo poseído.",
    },
    commonMistakes: [
      "Usar を en lugar de が: × 車をあります → ○ 車があります",
      "Usar います para objetos inanimados.",
    ],
    practicePrompts: [
      "Di tres cosas que tienes y una que no tienes usando あります／ありません.",
      "Pregunta a un compañero si tiene hermanos, mascotas y coche.",
    ],
    relatedGrammarIds: ["arimasu-imasu", "location-ni-arimasu", "particle-ga-subject"],
    sourceNotes: ["Basado en Genki I L4, Grammar 6 (posesión con があります)"],
  },

  {
    id: "location-ni-arimasu",
    lesson: 4,
    title: "X は Y にあります／います (ubicación)",
    pattern: "X は Y に あります／います",
    shortMeaning: "\"X está en Y\" — indicar dónde se encuentra algo o alguien.",
    explanation: [
      "Para decir dónde está algo ya conocido (tema は): X は [lugar] に あります/います.",
      "Diferencia de foco: 図書館に本があります (qué hay) vs. 本は図書館にあります (dónde está).",
      "に marca el lugar; あります/います según sea animado o no.",
    ],
    formation: [
      "X は [lugar] に あります",
      "X は [lugar] に います",
    ],
    examples: [
      {
        jp: "{財布|さいふ}は{かばん|かばん}の{中|なか}にあります。",
        es: "La cartera está dentro de la bolsa.",
      },
      {
        jp: "{先生|せんせい}は{教室|きょうしつ}にいます。",
        es: "El profesor está en el salón.",
      },
      {
        jp: "{図書館|としょかん}は{駅|えき}の{近く|ちかく}にありますか。",
        es: "¿La biblioteca está cerca de la estación?",
      },
      {
        jp: "{猫|ねこ}は{椅子|いす}の{下|した}にいます。",
        es: "El gato está debajo de la silla.",
      },
    ],
    exercise: {
      type: "fill-blank",
      prompt: "El profesor está en el salón.",
      before: "先生は教室",
      after: "います。",
      answer: "に",
      placeholder: "partícula",
      successMessage: "に marca el lugar donde está.",
    },
    commonMistakes: [
      "Usar で en lugar de に para ubicación de existencia.",
      "Invertir el orden — recuerda: X は [lugar] に あります.",
    ],
    practicePrompts: [
      "Describe dónde están cuatro cosas de tu cuarto: [もの]は[場所]にあります。",
      "Pregunta a un compañero dónde está algo que perdió: ～はどこにありますか／いますか。",
    ],
    relatedGrammarIds: ["arimasu-imasu", "location-nouns", "possession-ga-arimasu"],
    sourceNotes: ["Basado en Genki I L4, Grammar 7 (ubicación con にあります／います)"],
  },

  // ═══════════════════════════════════════════════
  //  LECCIÓN 5 — {沖縄|おきなわ}への{旅|たび}
  // ═══════════════════════════════════════════════

  {
    id: "adjective-present",
    lesson: 5,
    title: "Adjetivos い / な — presente",
    pattern: "い-adj です / な-adj です",
    shortMeaning: "Dos clases de adjetivos para describir cosas en presente afirmativo y negativo.",
    explanation: [
      "い-adjetivos terminan en い; para negar cambian い → くないです.",
      "な-adjetivos se niegan con じゃないです, igual que los sustantivos.",
      "Excepción: いい (bueno) → よくないです, no いくないです.",
    ],
    formation: [
      "い-adj: [raíz]い です → [raíz]くないです",
      "な-adj: [adj] です → [adj] じゃないです",
    ],
    examples: [
      {
        jp: "{沖縄|おきなわ}の{海|うみ}はきれいです。",
        es: "El mar de Okinawa es bonito.",
      },
      {
        jp: "この{部屋|へや}は{広|ひろ}くないです。",
        es: "Esta habitación no es amplia.",
      },
      {
        jp: "あのレストランは{有名|ゆうめい}じゃないです。",
        es: "Ese restaurante no es famoso.",
      },
      {
        jp: "この{映画|えいが}はよくないです。",
        es: "Esta película no es buena.",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "この映画は___。 (negar «buena»)",
      options: ["いくないです", "よくないです", "いいじゃないです"],
      answer: "よくないです",
      successMessage: "いい es la única excepción: よくないです.",
    },
    commonMistakes: [
      "Negar いい como ×いくないです → ○ よくないです",
      "Tratar きれい como い-adjetivo: × きれくないです → ○ きれいじゃないです",
    ],
    interactions: [
      "Describe cinco cosas del salón o la ciudad con adjetivos い y な. El compañero contesta con contraste.",
    ],
    practicePrompts: [
      "Describe tu cuarto con tres adjetivos: [もの]は[adj]です／[adj]くないです.",
      "Compara tu ciudad natal con otra: [ciudad]は[adj]ですが、[ciudad]は[adj]じゃないです.",
    ],
    relatedGrammarIds: ["adjective-past", "adjective-noun-modifier", "suki-kirai"],
    sourceNotes: ["Basado en Genki I L5, Grammar 1-2 (adjetivos い/な presente)"],
  },

  {
    id: "adjective-past",
    lesson: 5,
    title: "Adjetivos い / な — pasado",
    pattern: "い-adj かったです / な-adj でした",
    shortMeaning: "Forma pasada de los adjetivos: «era / estaba».",
    explanation: [
      "い-adjetivos: い → かったです (afirmativo) / くなかったです (negativo).",
      "な-adjetivos: でした (afirmativo) / じゃなかったです (negativo).",
      "Excepción: いい → よかったです / よくなかったです.",
    ],
    formation: [
      "い-adj: [raíz]い → [raíz]かったです",
      "な-adj: [adj] でした",
    ],
    examples: [
      {
        jp: "{昨日|きのう}の{天気|てんき}はよかったです。",
        es: "El clima de ayer era bueno.",
      },
      {
        jp: "そのホテルはあまり{便利|べんり}じゃなかったです。",
        es: "Ese hotel no era muy conveniente.",
      },
      {
        jp: "パーティーは{楽|たの}しかったですか。",
        es: "¿La fiesta fue divertida?",
      },
      {
        jp: "あの{部屋|へや}は{静|しず}かでした。",
        es: "Esa habitación estaba tranquila.",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "昨日の天気は___。 (era bueno)",
      options: ["いかったです", "よかったです", "いいでした"],
      answer: "よかったです",
      successMessage: "いい → よかったです en pasado también.",
    },
    commonMistakes: [
      "Negar いい en pasado como ×いかったです → ○ よかったです",
      "Usar ×静かかったです para na-adjetivo → ○ 静かでした",
    ],
    practicePrompts: [
      "Describe cómo fue tu fin de semana con tres adjetivos en pasado.",
      "¿Cómo era tu escuela secundaria? Usa adjetivos en pasado positivo y negativo.",
    ],
    relatedGrammarIds: ["adjective-present", "verb-masu-past"],
    sourceNotes: ["Basado en Genki I L5, Grammar 3 (adjetivos pasado)"],
  },

  {
    id: "adjective-noun-modifier",
    lesson: 5,
    title: "Adjetivo + sustantivo",
    pattern: "い-adj + N / な-adj な + N",
    shortMeaning: "Usar un adjetivo directamente antes de un sustantivo para describirlo.",
    explanation: [
      "い-adjetivos van directo antes del sustantivo, sin cambio.",
      "な-adjetivos agregan な entre el adjetivo y el sustantivo.",
      "い-adj: 高い山. な-adj: 有名な人.",
    ],
    formation: [
      "い-adj + N",
      "な-adj + な + N",
    ],
    examples: [
      {
        jp: "{新|あたら}しい{本|ほん}を{買|か}いました。",
        es: "Compré un libro nuevo.",
      },
      {
        jp: "{有名|ゆうめい}なレストランに{行|い}きたいです。",
        es: "Quiero ir a un restaurante famoso.",
      },
      {
        jp: "きれいな{海|うみ}ですね。",
        es: "Es un mar hermoso, ¿verdad?",
      },
      {
        jp: "{広|ひろ}い{部屋|へや}が{好|す}きです。",
        es: "Me gustan las habitaciones amplias.",
      },
    ],
    exercise: {
      type: "fill-blank",
      prompt: "Quiero ir a un restaurante famoso.",
      before: "有名",
      after: "レストランに行きたいです。",
      answer: "な",
      placeholder: "partícula",
      successMessage: "な conecta el na-adjetivo con el sustantivo.",
    },
    commonMistakes: [
      "Olvidar な con na-adjetivos: × 有名レストラン → ○ 有名なレストラン",
      "Añadir な a い-adjetivos: × 高いな山 → ○ 高い山",
    ],
    practicePrompts: [
      "Describe tres cosas de tu ciudad usando adj + sustantivo (ej. 有名な公園).",
      "Crea un mini-tour de tu ciudad: [adj]な[lugar]があります。",
    ],
    relatedGrammarIds: ["adjective-present", "suki-kirai", "noun-modification-relative"],
    sourceNotes: ["Basado en Genki I L5, Grammar 4 (adjetivo + sustantivo)"],
  },

  {
    id: "suki-kirai",
    lesson: 5,
    title: "好き(な) / きらい(な)",
    pattern: "X は Y が 好きです / きらいです",
    shortMeaning: "Expresar gustos y disgustos: «X le gusta Y» / «X no le gusta Y».",
    explanation: [
      "好き y きらい son na-adjetivos, no verbos.",
      "Lo que te gusta lleva が, no を.",
      "Para intensificar: 大好き (me encanta) / 大きらい (odio).",
    ],
    formation: [
      "X は Y が {好|す}きです",
      "X は Y が きらいです",
    ],
    examples: [
      {
        jp: "{私|わたし}は{寿司|すし}が{大好|だいす}きです。",
        es: "Me encanta el sushi.",
      },
      {
        jp: "{妹|いもうと}は{野菜|やさい}がきらいです。",
        es: "A mi hermana menor no le gustan las verduras.",
      },
      {
        jp: "{日本語|にほんご}の{勉強|べんきょう}が{好|す}きですか。",
        es: "¿Te gusta estudiar japonés?",
      },
      {
        jp: "{音楽|おんがく}が{好|す}きです。",
        es: "Me gusta la música.",
      },
    ],
    dialogue: [
      { speaker: "メアリー", jp: "{音楽|おんがく}が{好|す}きですか。", es: "¿Te gusta la música?" },
      { speaker: "たけし", jp: "はい、{大好|だいす}きです。", es: "Sí, me encanta." },
      { speaker: "メアリー", jp: "クラシックはどうですか。", es: "¿Y la música clásica?" },
      { speaker: "たけし", jp: "あまり{好|す}きじゃないです。", es: "No me gusta mucho." },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "私は寿司___大好きです。",
      options: ["が", "を", "は"],
      answer: "が",
      successMessage: "が marca lo que te gusta.",
    },
    commonMistakes: [
      "Usar を en lugar de が: × 音楽を好きです → ○ 音楽が好きです",
      "Tratar 好き como verbo — es adjetivo, no se conjuga como verbo.",
    ],
    practicePrompts: [
      "Di tres cosas que te gustan y una que no con 好きです y きらいです.",
      "Encuesta de clase: pregunta a tres compañeros qué tipo de música／comida／deporte les gusta.",
    ],
    relatedGrammarIds: ["adjective-present", "particle-ga-subject", "x-wa-y-ga-z"],
    sourceNotes: ["Basado en Genki I L5, Grammar 5 (好き／きらい)"],
  },

  {
    id: "mashou-mashouka",
    lesson: 5,
    title: "～ましょう / ～ましょうか",
    pattern: "V-ましょう / V-ましょうか",
    shortMeaning: "Proponer hacer algo juntos («¡Hagamos X!») o ofrecer ayuda («¿Lo hago yo?»).",
    explanation: [
      "ましょう propone con energía: «¡Hagamos X!».",
      "ましょうか suaviza u ofrece ayuda: «¿Lo hacemos?/¿Te ayudo?».",
      "Más suave que ましょう, más directo que ませんか (L3).",
    ],
    formation: [
      "V-ます → V-ましょう",
      "V-ます → V-ましょうか",
    ],
    examples: [
      {
        jp: "{早|はや}く{行|い}きましょう！",
        es: "¡Vayamos pronto!",
      },
      {
        jp: "ちょっと{休|やす}みましょうか。",
        es: "¿Descansamos un poco?",
      },
      {
        jp: "{荷物|にもつ}を{持|も}ちましょうか。",
        es: "¿Le llevo el equipaje?",
      },
      {
        jp: "{一緒|いっしょ}に{勉強|べんきょう}しましょう。",
        es: "Estudiemos juntos.",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "Ofrecer ayuda: «¿Le llevo el equipaje?»",
      options: ["持ちましょう", "持ちましょうか", "持ちませんか"],
      answer: "持ちましょうか",
      successMessage: "ましょうか — oferta amable.",
    },
    commonMistakes: [
      "Confundir ましょう (propuesta enérgica) con ませんか (invitación suave).",
      "Usar ましょう como orden — siempre incluye al hablante.",
    ],
    practicePrompts: [
      "Propón a tu compañero tres actividades para el fin de semana usando ましょう y ましょうか.",
      "Ofrece ayuda en tres situaciones distintas: [Vましょうか]。",
    ],
    relatedGrammarIds: ["masen-ka", "verb-masu-present"],
    sourceNotes: ["Basado en Genki I L5, Grammar 6 (ましょう／ましょうか)"],
  },

  // ═══════════════════════════════════════════════
  //  LECCIÓN 6 — {ロバート|ろばーと}の{生活|せいかつ}
  // ═══════════════════════════════════════════════

  {
    id: "te-form-verbs",
    lesson: 6,
    title: "Forma て de los verbos",
    pattern: "V-て",
    shortMeaning: "Forma conectora de los verbos — base para peticiones, secuencias y más.",
    explanation: [
      "て conecta verbos: secuencias, peticiones, permiso, estado continuo.",
      "Grupo 1: く→いて, む/ぶ→んで, る/つ/う→って (行く es excepción: 行って).",
      "Grupo 2: quita る y agrega て (食べる→食べて). Irregulares: する→して, くる→きて.",
    ],
    formation: [
      "G1:  書く→書いて / 飲む→飲んで / 待つ→待って",
      "G2:  食べる→食べて / 見る→見て",
    ],
    examples: [
      {
        jp: "{食|た}べて{寝|ね}ます。",
        es: "Como y luego duermo.",
      },
      {
        jp: "{本|ほん}を{読|よ}んでいます。",
        es: "Estoy leyendo un libro.",
      },
      {
        jp: "{駅|えき}まで{歩|ある}いて{来|き}ました。",
        es: "Vine caminando hasta la estación.",
      },
      {
        jp: "{友達|ともだち}に{会|あ}って{話|はな}しました。",
        es: "Me encontré con un amigo y hablamos.",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "Forma て de 飲む:",
      options: ["飲いて", "飲んで", "飲して"],
      answer: "飲んで",
      successMessage: "む → んで.",
    },
    commonMistakes: [
      "行く → ×行きて → ○ 行って (excepción).",
      "Confundir grupo 1 y 2: 起きる es grupo 2 (起きて), no ×起いて.",
    ],
    interactions: [
      "Drill en cadena: el profesor da un verbo, los alumnos producen la forma て en ronda rápida.",
    ],
    practicePrompts: [
      "Convierte diez verbos a forma て: 書く, 見る, 飲む, 来る, する, 待つ, 話す, 食べる, 聞く, 帰る.",
      "Conecta dos acciones de tu rutina con て: [V₁]て、[V₂]ます。",
    ],
    relatedGrammarIds: ["v1-te-v2-sequence", "te-kudasai", "te-iru", "te-mo-ii"],
    sourceNotes: ["Basado en Genki I L6, Grammar 1 (forma て)"],
  },

  {
    id: "v1-te-v2-sequence",
    lesson: 6,
    title: "V₁ て V₂ (secuencia de acciones)",
    pattern: "V₁-て、V₂-ます",
    shortMeaning: "Encadenar dos o más acciones en orden cronológico.",
    explanation: [
      "«Hago A y luego B»: forma て del primer verbo + segundo verbo normal.",
      "El tiempo lo determina solo el verbo final — V₁て nunca marca tiempo.",
      "Se pueden encadenar más acciones: V₁て、V₂て、V₃ます.",
    ],
    formation: [
      "V₁-て、V₂-ます",
      "V₁-て、V₂-ました",
    ],
    examples: [
      {
        jp: "{朝|あさ}{起|お}きて、{学校|がっこう}に{行|い}きます。",
        es: "Me levanto y voy a la escuela.",
      },
      {
        jp: "{図書館|としょかん}で{本|ほん}を{借|か}りて、{家|いえ}で{読|よ}みました。",
        es: "Pedí prestado un libro en la biblioteca y lo leí en casa.",
      },
      {
        jp: "{友達|ともだち}に{会|あ}って、コーヒーを{飲|の}みました。",
        es: "Me encontré con un amigo y tomamos café.",
      },
      {
        jp: "{宿題|しゅくだい}をして、{寝|ね}ます。",
        es: "Hago la tarea y me duermo.",
      },
    ],
    exercise: {
      type: "word-order",
      prompt: "Ordena: «Me levanto y voy a la escuela».",
      tokens: ["行きます", "に", "起きて", "学校", "朝"],
      answer: ["朝", "起きて", "学校", "に", "行きます"],
      successMessage: "¡Bien! て conecta las dos acciones.",
    },
    commonMistakes: [
      "Marcar tiempo en V₁て: × 食べましたて → ○ 食べて",
      "Cambiar el orden de las acciones — て respeta la secuencia real.",
    ],
    practicePrompts: [
      "Describe tu mañana entera en una oración encadenando 4-5 acciones con て.",
      "Cuenta qué hiciste ayer en secuencia: [V]て、[V]て、[V]ました。",
    ],
    relatedGrammarIds: ["te-form-verbs", "te-kudasai", "te-iru"],
    sourceNotes: ["Basado en Genki I L6, Grammar 2 (V₁てV₂)"],
  },

  {
    id: "te-kudasai",
    lesson: 6,
    title: "～てください",
    pattern: "V-てください",
    shortMeaning: "Petición educada: «por favor haz X».",
    explanation: [
      "てください es la forma más natural de pedir algo en japonés.",
      "Funciona en clase, tiendas y con cualquier persona que respetas.",
      "てください pide que OTRO haga algo (distinto de てもいいですか, que pide permiso para que YO lo haga).",
    ],
    formation: [
      "V-て + ください",
    ],
    examples: [
      {
        jp: "ちょっと{待|ま}ってください。",
        es: "Espere un momento, por favor.",
      },
      {
        jp: "{名前|なまえ}を{書|か}いてください。",
        es: "Por favor, escribe tu nombre.",
      },
      {
        jp: "もう{一度|いちど}{言|い}ってください。",
        es: "Por favor, dígalo otra vez.",
      },
      {
        jp: "ここで{待|ま}ってください。",
        es: "Espere aquí, por favor.",
      },
    ],
    exercise: {
      type: "fill-blank",
      prompt: "Por favor, escribe tu nombre.",
      before: "名前を書い",
      after: "。",
      answer: "てください",
      placeholder: "petición",
      successMessage: "てください — petición educada.",
    },
    commonMistakes: [
      "Usar la forma de diccionario: × 食べるください → ○ 食べてください",
      "Confundir てください (pides que otro haga algo) con てもいいですか (pides permiso para ti).",
    ],
    practicePrompts: [
      "Escribe cinco instrucciones de clase que el profesor podría dar usando てください.",
      "Practica pedir ayuda en tres situaciones distintas de la vida cotidiana.",
    ],
    relatedGrammarIds: ["te-form-verbs", "te-mo-ii", "naide-kudasai"],
    sourceNotes: ["Basado en Genki I L6, Grammar 3 (てください)"],
  },

  {
    id: "te-mo-ii",
    lesson: 6,
    title: "～てもいいです / ～てもいいですか",
    pattern: "V-てもいいです",
    shortMeaning: "Dar o pedir permiso para hacer algo: «está bien que hagas X» / «¿puedo hacer X?»",
    explanation: [
      "てもいいですか pide permiso; てもいいです lo da.",
      "Para negar el permiso (prohibición) se usa てはいけません, no てもいけません.",
      "も es obligatorio — sin él cambia el significado.",
    ],
    formation: [
      "V-て + もいいですか  →  ¿Puedo [V]?",
      "V-て + もいいです   →  Puedes [V].",
    ],
    examples: [
      {
        jp: "{写真|しゃしん}を{撮|と}ってもいいですか。",
        es: "¿Puedo tomar una foto?",
      },
      {
        jp: "はい、{撮|と}ってもいいですよ。",
        es: "Sí, puedes tomarla.",
      },
      {
        jp: "{辞書|じしょ}を{使|つか}ってもいいですか。",
        es: "¿Puedo usar el diccionario?",
      },
      {
        jp: "ここで{食|た}べてもいいですか。",
        es: "¿Puedo comer aquí?",
      },
    ],
    exercise: {
      type: "fill-blank",
      prompt: "¿Puedo usar el diccionario?",
      before: "辞書を使っ",
      after: "か。",
      answer: "てもいいです",
      placeholder: "pedir permiso",
      successMessage: "てもいいですか — pedir permiso.",
    },
    commonMistakes: [
      "Usar てもいい para prohibición — eso es てはいけません.",
      "Omitir も: × ていいですか → ○ てもいいですか",
    ],
    practicePrompts: [
      "Practica pedir permiso en cinco situaciones de clase o en una tienda.",
      "Roleplay: un alumno pide permiso; el otro da o niega el permiso y explica por qué.",
    ],
    relatedGrammarIds: ["te-form-verbs", "te-wa-ikemasen", "te-kudasai"],
    sourceNotes: ["Basado en Genki I L6, Grammar 4 (てもいいです)"],
  },

  {
    id: "te-wa-ikemasen",
    lesson: 6,
    title: "～てはいけません",
    pattern: "V-てはいけません",
    shortMeaning: "Prohibición: «no debes / no se puede hacer X».",
    explanation: [
      "Es el opuesto de てもいいです: expresa prohibición.",
      "Más fuerte que ないでください — es una norma, no una petición.",
      "Equivale a «no puedes / no se permite hacer X».",
    ],
    formation: [
      "V-て + はいけません",
    ],
    examples: [
      {
        jp: "ここで{食|た}べてはいけません。",
        es: "No se puede comer aquí.",
      },
      {
        jp: "{授業中|じゅぎょうちゅう}に{スマホ|すまほ}を{使|つか}ってはいけません。",
        es: "No puedes usar el teléfono durante la clase.",
      },
      {
        jp: "{図書館|としょかん}で{話|はな}してはいけません。",
        es: "No se puede hablar en la biblioteca.",
      },
      {
        jp: "ここで{写真|しゃしん}を{撮|と}ってはいけません。",
        es: "No se puede tomar fotos aquí.",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "ここで食べ___。 (prohibición)",
      options: ["てもいいです", "てはいけません", "てください"],
      answer: "てはいけません",
      successMessage: "てはいけません — prohibido.",
    },
    commonMistakes: [
      "Confundir てはいけません (norma general) con ないでください (petición directa a alguien).",
    ],
    practicePrompts: [
      "Escribe tres reglas de tu escuela o trabajo usando てはいけません.",
      "Compara con てもいいです: crea pares de «está permitido» y «está prohibido» para el mismo lugar.",
    ],
    relatedGrammarIds: ["te-mo-ii", "naide-kudasai", "te-form-verbs"],
    sourceNotes: ["Basado en Genki I L6, Grammar 5 (てはいけません)"],
  },

  {
    id: "kara-reason",
    lesson: 6,
    title: "～から (razón / causa)",
    pattern: "〔理由〕から、〔結果〕",
    shortMeaning: "Dar la razón de algo: «porque…».",
    explanation: [
      "から va después de la razón; el resultado va después de から.",
      "Orden inverso al español: en japonés la causa viene primero.",
      "No confundir con から de punto de inicio (L4) — el contexto lo aclara.",
    ],
    formation: [
      "[razón] から、[resultado]",
    ],
    examples: [
      {
        jp: "{眠|ねむ}いから、{早|はや}く{寝|ね}ます。",
        es: "Porque tengo sueño, me acuesto temprano.",
      },
      {
        jp: "{明日|あした}テストがあるから、{今日|きょう}{勉強|べんきょう}します。",
        es: "Porque mañana hay examen, hoy estudio.",
      },
      {
        jp: "{電車|でんしゃ}が{遅|おく}れたから、{遅|おそ}くなりました。",
        es: "Porque el tren se retrasó, llegué tarde.",
      },
      {
        jp: "{頭|あたま}が{痛|いた}いから、{薬|くすり}を{飲|の}みます。",
        es: "Porque me duele la cabeza, tomo medicina.",
      },
    ],
    exercise: {
      type: "word-order",
      prompt: "Ordena: «Porque tengo sueño, me acuesto temprano».",
      tokens: ["寝ます", "から", "早く", "眠い"],
      answer: ["眠い", "から", "早く", "寝ます"],
      successMessage: "¡Bien! La razón siempre va primero.",
    },
    commonMistakes: [
      "Poner から antes de la razón: × から眠い → ○ 眠いから",
      "Usar から donde el contexto pide el otro から (punto de inicio).",
    ],
    practicePrompts: [
      "Explica tres de tus hábitos con から: 私は[hábito]。[razón]からです。",
      "Responde: どうして日本語を勉強しますか con una razón usando から.",
    ],
    relatedGrammarIds: ["particle-kara-starting", "verb-masu-present", "n-desu"],
    sourceNotes: ["Basado en Genki I L6, Grammar 6 (から — razón)"],
  },

  // ═══════════════════════════════════════════════
  //  LECCIÓN 7 — {家族|かぞく}の{写真|しゃしん}
  // ═══════════════════════════════════════════════

  {
    id: "te-iru",
    lesson: 7,
    title: "～ている",
    pattern: "V-ている",
    shortMeaning: "Acción en progreso, estado resultante de una acción, o hábito continuo.",
    explanation: [
      "Acción en progreso: 食べている = está comiendo.",
      "Estado resultante de un cambio: 結婚している = está casado.",
      "También expresa hábito u ocupación continua.",
    ],
    formation: [
      "V-て + います",
      "V-て + いません",
    ],
    examples: [
      {
        jp: "{父|ちち}は{テレビ|てれび}を{見|み}ています。",
        es: "Mi papá está viendo televisión.",
      },
      {
        jp: "{山田|やまだ}さんは{結婚|けっこん}しています。",
        es: "El señor Yamada está casado.",
      },
      {
        jp: "{姉|あね}は{東京|とうきょう}に{住|す}んでいます。",
        es: "Mi hermana mayor vive en Tokio.",
      },
      {
        jp: "{何|なに}をしていますか。",
        es: "¿Qué estás haciendo?",
      },
    ],
    exercise: {
      type: "fill-blank",
      prompt: "Mi papá está viendo televisión.",
      before: "父はテレビを見",
      after: "。",
      answer: "ています",
      placeholder: "estado/acción en curso",
      successMessage: "ています — acción en progreso.",
    },
    commonMistakes: [
      "Usar ている con verbos de estado como ある, いる, 分かる.",
      "Confundir 来ています (ya llegó y está aquí) con «está viniendo».",
    ],
    interactions: [
      "Mímicas: un alumno actúa una acción y el resto adivina: 「何をしていますか」→「〜をしています」.",
    ],
    practicePrompts: [
      "Describe qué están haciendo ahora mismo tres personas de tu familia.",
      "Di tres hábitos o estados permanentes tuyos usando ている: 住んでいます, 勉強しています…",
    ],
    relatedGrammarIds: ["te-form-verbs", "v1-te-v2-sequence", "x-wa-y-ga-z"],
    sourceNotes: ["Basado en Genki I L7, Grammar 1 (～ている)"],
  },

  {
    id: "te-form-adjectives",
    lesson: 7,
    title: "Forma て de adjetivos",
    pattern: "い-adj くて / な-adj で",
    shortMeaning: "Conectar dos descripciones con adjetivos en una sola oración.",
    explanation: [
      "い-adjetivos: い → くて (大きい → 大きくて).",
      "な-adjetivos y sustantivos con です: → で (きれい → きれいで).",
      "Excepción: いい → よくて.",
    ],
    formation: [
      "い-adj: [raíz]い → [raíz]くて",
      "な-adj: [adj] → [adj] で",
    ],
    examples: [
      {
        jp: "この{部屋|へや}は{広|ひろ}くてきれいです。",
        es: "Esta habitación es amplia y bonita.",
      },
      {
        jp: "{田中|たなか}さんは{親切|しんせつ}で{面白|おもしろ}いです。",
        es: "El señor Tanaka es amable e interesante.",
      },
      {
        jp: "{今日|きょう}は{寒|さむ}くて、{雨|あめ}が{降|ふ}っています。",
        es: "Hoy hace frío y está lloviendo.",
      },
      {
        jp: "{先生|せんせい}は{優|やさ}しくて{有名|ゆうめい}です。",
        es: "El profesor es amable y famoso.",
      },
    ],
    exercise: {
      type: "fill-blank",
      prompt: "Esta habitación es amplia y bonita.",
      before: "この部屋は広",
      after: "きれいです。",
      answer: "くて",
      placeholder: "conector",
      successMessage: "くて conecta dos descripciones い-adj.",
    },
    commonMistakes: [
      "いい como くて: × いくて → ○ よくて",
      "Poner な antes de で con na-adjetivos: × 親切なで → ○ 親切で",
    ],
    practicePrompts: [
      "Describe a un miembro de tu familia con dos adjetivos conectados con て.",
      "Habla del clima de hoy combinando dos condiciones con くて/で.",
    ],
    relatedGrammarIds: ["adjective-present", "te-form-verbs", "adjective-noun-modifier"],
    sourceNotes: ["Basado en Genki I L7, Grammar 2 (forma て de adjetivos)"],
  },

  {
    id: "x-wa-y-ga-z",
    lesson: 7,
    title: "X は Y が Z",
    pattern: "X は Y が Z (adj/V)",
    shortMeaning: "Describir una característica de X donde Y es el punto específico de referencia.",
    explanation: [
      "X (tema general) tiene una propiedad Y descrita por Z.",
      "Uso típico: habilidades (上手／下手), características físicas.",
      "Evita 上手 para tus propias habilidades — suena presumido.",
    ],
    formation: [
      "X は Y が {上手|じょうず}です",
      "X は Y が [adj] です",
    ],
    examples: [
      {
        jp: "{妹|いもうと}は{料理|りょうり}が{上手|じょうず}です。",
        es: "Mi hermana menor es buena cocinando.",
      },
      {
        jp: "{私|わたし}はスポーツが{苦手|にがて}です。",
        es: "No se me da bien el deporte.",
      },
      {
        jp: "{象|ぞう}は{鼻|はな}が{長|なが}いです。",
        es: "El elefante tiene la nariz larga.",
      },
      {
        jp: "{田中|たなか}さんは{歌|うた}が{上手|じょうず}です。",
        es: "El señor Tanaka canta bien.",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "妹は料理___上手です。",
      options: ["が", "を", "は"],
      answer: "が",
      successMessage: "が marca el punto de referencia (Y).",
    },
    commonMistakes: [
      "Usar を en lugar de が: × 料理を上手です → ○ 料理が上手です",
    ],
    practicePrompts: [
      "Describe las habilidades de tres personas de tu familia con Y が 上手/下手/苦手.",
      "Habla de una característica física curiosa de un animal con X は Y が [adj].",
    ],
    relatedGrammarIds: ["suki-kirai", "adjective-present", "particle-ga-subject"],
    sourceNotes: ["Basado en Genki I L7, Grammar 3 (X は Y が Z)"],
  },

  {
    id: "place-ni-vmasu-ni-iku",
    lesson: 7,
    title: "〜に V-masu に行く／来る／帰る",
    pattern: "場所 に V-masu に 行く／来る／帰る",
    shortMeaning: "Expresar el propósito de un movimiento: «ir/venir/regresar A hacer X».",
    explanation: [
      "Usa el stem del verbo (sin ます) + に + verbo de movimiento.",
      "Stem: 食べます→食べ, 買います→買い.",
      "Responde a «¿para qué vas?».",
    ],
    formation: [
      "場所 に [V-stem] に {行|い}く／{来|く}る／{帰|かえ}る",
    ],
    examples: [
      {
        jp: "{図書館|としょかん}に{本|ほん}を{借|か}りに{行|い}きます。",
        es: "Voy a la biblioteca a pedir prestado un libro.",
      },
      {
        jp: "{友達|ともだち}の{家|いえ}に{遊|あそ}びに{来|き}ました。",
        es: "Vine a la casa de mi amigo a pasar el rato.",
      },
      {
        jp: "{スーパー|すーぱー}に{野菜|やさい}を{買|か}いに{行|い}きましょう。",
        es: "¡Vayamos al supermercado a comprar verduras!",
      },
      {
        jp: "{図書館|としょかん}に{勉強|べんきょう}しに{行|い}きます。",
        es: "Voy a la biblioteca a estudiar.",
      },
    ],
    exercise: {
      type: "fill-blank",
      prompt: "Voy a la biblioteca a pedir prestado un libro.",
      before: "図書館に本を借り",
      after: "行きます。",
      answer: "に",
      placeholder: "partícula",
      successMessage: "に + verbo de movimiento marca el propósito.",
    },
    commonMistakes: [
      "Usar la forma て en lugar del stem: × 食べてに行く → ○ 食べに行く",
      "Omitir el に de propósito.",
    ],
    practicePrompts: [
      "Di a dónde fuiste esta semana y para qué: [lugar]に[V-stem]に行きました。",
      "Invita a un compañero a ir a algún lado con ましょう y agrega el propósito.",
    ],
    relatedGrammarIds: ["particle-ni-destination-time", "verb-masu-present", "mashou-mashouka"],
    sourceNotes: ["Basado en Genki I L7, Grammar 4 (に V-stem に行く)"],
  },

  // ═══════════════════════════════════════════════
  //  LECCIÓN 8 — バーベキュー
  // ═══════════════════════════════════════════════

  {
    id: "short-form-present",
    lesson: 8,
    title: "Formas cortas (plain form) — presente",
    pattern: "Forma corta / plain form",
    shortMeaning: "Forma informal de los verbos, adjetivos y cópula usada en conversación casual y en cláusulas subordinadas.",
    explanation: [
      "Verbos: afirmativo = forma de diccionario; negativo = ない-form.",
      "い-adj no cambia; な-adj/cópula: だ (afirmativo) / じゃない (negativo).",
      "Obligatoria antes de と思います, から, etc., sea formal o no.",
    ],
    formation: [
      "V-stem + ない  (飲む→飲まない, 食べる→食べない)",
      "い-adj: [raíz]くない",
      "な-adj: だ / じゃない",
    ],
    examples: [
      {
        jp: "A: {明日|あした}{来|く}る？　B: うん、{行|い}く。",
        es: "A: ¿Vienes mañana? B: Sí, voy.",
      },
      {
        jp: "この{映画|えいが}は{面白|おもしろ}くない。",
        es: "Esta película no es interesante.",
      },
      {
        jp: "あの{人|ひと}は{先生|せんせい}じゃない。",
        es: "Esa persona no es profesora.",
      },
      {
        jp: "{私|わたし}は{学生|がくせい}だ。",
        es: "Soy estudiante.",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "Forma corta negativa de 飲む:",
      options: ["飲みない", "飲まない", "飲んない"],
      answer: "飲まない",
      successMessage: "む → まない en grupo 1.",
    },
    commonMistakes: [
      "Usar ない-form de grupo 1 como grupo 2: × 飲みない → ○ 飲まない",
      "Usar la forma corta con alguien que acabas de conocer — puede sonar brusco.",
    ],
    interactions: [
      "Conversación informal: el profesor establece pares y los alumnos hacen preguntas cotidianas en plain form.",
    ],
    practicePrompts: [
      "Convierte cinco oraciones de forma ます a plain form afirmativa y negativa.",
      "Ten una mini-conversación informal con un compañero sobre planes del fin de semana.",
    ],
    relatedGrammarIds: ["short-form-past", "to-omoimasu", "to-itte-imashita", "nominalization-no"],
    sourceNotes: ["Basado en Genki I L8, Grammar 1 (formas cortas presente)"],
  },

  {
    id: "to-omoimasu",
    lesson: 8,
    title: "～と思います",
    pattern: "[plain form] と思います",
    shortMeaning: "Expresar una opinión o suposición: «creo que…» / «pienso que…».",
    explanation: [
      "と思います reporta tu pensamiento; lo antes de と va en plain form.",
      "Para preguntar la opinión: どう思いますか.",
      "と思います = lo que YO pienso (distinto de と言っていました, L8).",
    ],
    formation: [
      "[plain form] と{思|おも}います",
    ],
    examples: [
      {
        jp: "この{映画|えいが}はおもしろいと{思|おも}います。",
        es: "Creo que esta película es interesante.",
      },
      {
        jp: "{明日|あした}は{雨|あめ}だと{思|おも}います。",
        es: "Creo que mañana lloverá.",
      },
      {
        jp: "{田中|たなか}さんは{来|こ}ないと{思|おも}います。",
        es: "Creo que el señor Tanaka no vendrá.",
      },
      {
        jp: "この{本|ほん}はいいと{思|おも}います。",
        es: "Creo que este libro es bueno.",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "この映画はおもしろい___思います。",
      options: ["と", "を", "に"],
      answer: "と",
      successMessage: "と introduce el contenido de la opinión.",
    },
    commonMistakes: [
      "Usar forma ます antes de と: × 行きますと思います → ○ 行くと思います",
      "Confundir と思います (mi opinión) con と言っていました (lo que otro dijo).",
    ],
    practicePrompts: [
      "Da tu opinión sobre tres temas: la clase, el tiempo, la comida de la cafetería.",
      "Responde a どう思いますか sobre un tema de la clase.",
    ],
    relatedGrammarIds: ["short-form-present", "to-itte-imashita", "deshou-darou"],
    sourceNotes: ["Basado en Genki I L8, Grammar 2 (と思います)"],
  },

  {
    id: "to-itte-imashita",
    lesson: 8,
    title: "～と言っていました",
    pattern: "[plain form] と言っていました",
    shortMeaning: "Reportar lo que alguien dijo (cita indirecta).",
    explanation: [
      "言っていました = «estaba diciendo» — reporta lo que otro dijo.",
      "El contenido va en plain form antes de と, igual que と思います.",
      "Es cita indirecta (paráfrasis), no cita textual.",
    ],
    formation: [
      "[plain form] と{言|い}っていました",
    ],
    examples: [
      {
        jp: "{先生|せんせい}は{明日|あした}テストがあると{言|い}っていました。",
        es: "El profesor dijo que mañana hay examen.",
      },
      {
        jp: "{山田|やまだ}さんは{来|こ}ないと{言|い}っていました。",
        es: "El señor Yamada dijo que no vendría.",
      },
      {
        jp: "メアリーさんはこの{映画|えいが}はおもしろいと{言|い}っていました。",
        es: "Mary dijo que esta película era interesante.",
      },
      {
        jp: "{田中|たなか}さんは{忙|いそが}しいと{言|い}っていました。",
        es: "El señor Tanaka dijo que estaba ocupado.",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "先生は明日テストがある___言っていました。",
      options: ["と", "を", "が"],
      answer: "と",
      successMessage: "と introduce lo que dijo.",
    },
    commonMistakes: [
      "Usar forma ます antes de と: × 来ますと言っていました → ○ 来ると言っていました",
      "Confundir と言っていました (lo que alguien dijo) con と思います (lo que YO pienso).",
    ],
    practicePrompts: [
      "Reporta lo que dijo el profesor en la clase anterior usando と言っていました.",
      "Cuéntale a tu compañero lo que escuchaste sobre el examen próximo.",
    ],
    relatedGrammarIds: ["to-omoimasu", "short-form-present"],
    sourceNotes: ["Basado en Genki I L8, Grammar 3 (と言っていました)"],
  },

  {
    id: "naide-kudasai",
    lesson: 8,
    title: "～ないでください",
    pattern: "V-ないでください",
    shortMeaning: "Petición educada de que NO hagas algo: «por favor no hagas X».",
    explanation: [
      "ないでください es el opuesto negativo de てください.",
      "Es una petición personal, no una regla general (eso es てはいけません).",
      "Informal: ないで, sin ください.",
    ],
    formation: [
      "V-ない + でください",
    ],
    examples: [
      {
        jp: "ここで{写真|しゃしん}を{撮|と}らないでください。",
        es: "Por favor no tome fotos aquí.",
      },
      {
        jp: "そのことは{田中|たなか}さんに{言|い}わないでください。",
        es: "Por favor no le diga eso al señor Tanaka.",
      },
      {
        jp: "{授業中|じゅぎょうちゅう}にスマホを{使|つか}わないでください。",
        es: "Por favor no uses el teléfono durante la clase.",
      },
      {
        jp: "ここで{食|た}べないでください。",
        es: "Por favor no comas aquí.",
      },
    ],
    exercise: {
      type: "fill-blank",
      prompt: "Por favor no tome fotos aquí.",
      before: "ここで写真を撮ら",
      after: "。",
      answer: "ないでください",
      placeholder: "petición negativa",
      successMessage: "ないでください — petición de que no hagas algo.",
    },
    commonMistakes: [
      "Usar ないでください para reglas generales — eso es てはいけません.",
      "Confundir el stem negativo: × 飲みないで → ○ 飲まないで",
    ],
    practicePrompts: [
      "Escribe tres peticiones que harías a un compañero de cuarto ruidoso usando ないでください.",
      "Compara: cuando usarías ないでください vs てはいけません en la misma situación.",
    ],
    relatedGrammarIds: ["te-kudasai", "te-wa-ikemasen", "short-form-present"],
    sourceNotes: ["Basado en Genki I L8, Grammar 4 (ないでください)"],
  },

  {
    id: "nominalization-no",
    lesson: 8,
    title: "V の (nominalización)",
    pattern: "V-plain の は / の が / の を",
    shortMeaning: "Convertir una acción verbal en «cosa» o «concepto» para usarlo como sustantivo.",
    explanation: [
      "の después de un verbo en plain form lo convierte en sustantivo.",
      "Se usa con は (tema) o が (sujeto de 好き, 上手, etc.).",
      "El verbo antes de の siempre va en plain form, nunca en ます.",
    ],
    formation: [
      "[V-plain] の + は／が",
    ],
    examples: [
      {
        jp: "{音楽|おんがく}を{聞|き}くのが{好|す}きです。",
        es: "Me gusta escuchar música.",
      },
      {
        jp: "{日本語|にほんご}を{話|はな}すのは{難|むずか}しいです。",
        es: "Hablar japonés es difícil.",
      },
      {
        jp: "{泳|およ}ぐのが{得意|とくい}です。",
        es: "Soy bueno nadando.",
      },
      {
        jp: "{本|ほん}を{読|よ}むのが{好|す}きです。",
        es: "Me gusta leer libros.",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "音楽を聞く___が好きです。",
      options: ["の", "こと", "もの"],
      answer: "の",
      successMessage: "の convierte el verbo en sustantivo.",
    },
    commonMistakes: [
      "Usar の después de forma ます: × 食べますの → ○ 食べるの",
    ],
    practicePrompts: [
      "Di tres actividades que te gustan usando のが好きです.",
      "Di qué es difícil y qué es fácil para ti: [Vるの]は[adj]です.",
    ],
    relatedGrammarIds: ["suki-kirai", "short-form-present", "x-wa-y-ga-z"],
    sourceNotes: ["Basado en Genki I L8, Grammar 5 (V の nominalización)"],
  },

  // ═══════════════════════════════════════════════
  //  LECCIÓN 9 — {私|わたし}の{好きな|すきな}{歌|うた}
  // ═══════════════════════════════════════════════

  {
    id: "short-form-past",
    lesson: 9,
    title: "Formas cortas — pasado",
    pattern: "V-た / V-なかった / adj-かった / adj-じゃなかった",
    shortMeaning: "Plain form pasada de verbos y adjetivos para habla informal y cláusulas subordinadas.",
    explanation: [
      "た-form: igual que て pero con た (飲んで→飲んだ, 行って→行った).",
      "Negativo pasado: ない → なかった para todos los verbos.",
      "い-adj: かった／くなかった. な-adj: だった／じゃなかった.",
    ],
    formation: [
      "V-て → V-た (afirmativo)",
      "V-ない → V-なかった (negativo)",
    ],
    examples: [
      {
        jp: "{昨日|きのう}{友達|ともだち}と{映画|えいが}を{見|み}た。",
        es: "Ayer vi una película con un amigo.",
      },
      {
        jp: "{宿題|しゅくだい}をしなかった。",
        es: "No hice la tarea.",
      },
      {
        jp: "パーティーは{楽|たの}しかった。",
        es: "La fiesta fue divertida.",
      },
      {
        jp: "あの{部屋|へや}は{静|しず}かじゃなかった。",
        es: "Esa habitación no estaba tranquila.",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "Forma corta pasada negativa de する:",
      options: ["しなかった", "しませんでした", "しないだった"],
      answer: "しなかった",
      successMessage: "する → しない → しなかった.",
    },
    commonMistakes: [
      "Confundir た-form con て-form: 飲んだ (pasado) vs. 飲んで (conector).",
      "Usar なかったです como plain form pura — la forma corta es solo なかった.",
    ],
    practicePrompts: [
      "Cuenta en registro informal qué hiciste el fin de semana: verbos en た-form.",
      "Di tres cosas que querías hacer pero no hiciste: [Vたかった]けど、[Vなかった]。",
    ],
    relatedGrammarIds: ["short-form-present", "noun-modification-relative", "to-omoimasu"],
    sourceNotes: ["Basado en Genki I L9, Grammar 1 (formas cortas pasado)"],
  },

  {
    id: "noun-modification-relative",
    lesson: 9,
    title: "Modificar sustantivos con verbos／adjetivos (cláusula relativa)",
    pattern: "[V/adj en plain form] + N",
    shortMeaning: "Colocar una oración en plain form directamente antes de un sustantivo para describirlo.",
    explanation: [
      "No hay «que» relativo: la cláusula en plain form va directo antes del sustantivo.",
      "Sin partícula extra entre la cláusula y el sustantivo.",
      "El sujeto dentro de la cláusula lleva が, no は.",
    ],
    formation: [
      "[V-plain] N",
      "[い-adj] N",
    ],
    examples: [
      {
        jp: "これは{私|わたし}が{好|す}きな{歌|うた}です。",
        es: "Esta es una canción que me gusta.",
      },
      {
        jp: "{昨日|きのう}{食|た}べた{ケーキ|けーき}はおいしかったです。",
        es: "El pastel que comí ayer estaba delicioso.",
      },
      {
        jp: "{日本語|にほんご}を{話|はな}す{人|ひと}はどこですか。",
        es: "¿Dónde está la persona que habla japonés?",
      },
      {
        jp: "{私|わたし}が{書|か}いた{本|ほん}です。",
        es: "Es el libro que escribí.",
      },
    ],
    exercise: {
      type: "word-order",
      prompt: "Ordena: «El pastel que comí ayer estaba delicioso».",
      tokens: ["おいしかったです", "ケーキは", "食べた", "昨日"],
      answer: ["昨日", "食べた", "ケーキは", "おいしかったです"],
      successMessage: "¡Bien! La cláusula va antes del sustantivo.",
    },
    commonMistakes: [
      "Colocar の entre cláusula y sustantivo: × 食べたのケーキ → ○ 食べたケーキ",
      "Usar は para el sujeto dentro de la cláusula: × 私は書いた本 → ○ 私が書いた本",
    ],
    practicePrompts: [
      "Describe tres cosas que buscas en una pareja o amigo usando [adj/V]人.",
      "Habla de un lugar que visitaste: [adj]場所でした。/ [V]場所に行きました。",
    ],
    relatedGrammarIds: ["short-form-present", "short-form-past", "adjective-noun-modifier"],
    sourceNotes: ["Basado en Genki I L9, Grammar 2 (modificación de sustantivos)"],
  },

  // ═══════════════════════════════════════════════
  //  LECCIÓN 10 — {冬|ふゆ}の{京都|きょうと}
  // ═══════════════════════════════════════════════

  {
    id: "comparison-two",
    lesson: 10,
    title: "Comparación entre dos cosas",
    pattern: "A は B より [adj] / A のほうが [adj]",
    shortMeaning: "Comparar dos elementos: «A es más [adj] que B».",
    explanation: [
      "より marca el punto de comparación: A は B より [adj]です.",
      "Para preguntar cuál es más: A と B では、どちらのほうが [adj]ですか.",
      "El adjetivo no cambia de forma — solo cambia la estructura.",
    ],
    formation: [
      "A は B より [adj] です",
      "A のほうが [adj] です",
    ],
    examples: [
      {
        jp: "{京都|きょうと}は{東京|とうきょう}より{静|しず}かです。",
        es: "Kioto es más tranquila que Tokio.",
      },
      {
        jp: "バスと{電車|でんしゃ}では、どちらのほうが{速|はや}いですか。",
        es: "¿Cuál es más rápido, el autobús o el tren?",
      },
      {
        jp: "{電車|でんしゃ}のほうが{速|はや}いです。",
        es: "El tren es más rápido.",
      },
      {
        jp: "{犬|いぬ}は{猫|ねこ}より{大|おお}きいです。",
        es: "El perro es más grande que el gato.",
      },
    ],
    exercise: {
      type: "fill-blank",
      prompt: "Kioto es más tranquila que Tokio.",
      before: "京都は東京",
      after: "静かです。",
      answer: "より",
      placeholder: "partícula",
      successMessage: "より marca el punto de comparación.",
    },
    commonMistakes: [
      "Añadir もっと antes del adjetivo en lugar de usar より.",
      "Invertir A y B con より — A は B より adj significa que A gana.",
    ],
    practicePrompts: [
      "Compara tu ciudad con otra usando より con tres adjetivos distintos.",
      "Pregunta a un compañero sus preferencias: [A]と[B]ではどちらのほうが好きですか。",
    ],
    relatedGrammarIds: ["adjective-present", "suki-kirai", "naru-suru"],
    sourceNotes: ["Basado en Genki I L10, Grammar 1 (comparación)"],
  },

  {
    id: "naru-suru",
    lesson: 10,
    title: "Adj/N + になる・にする",
    pattern: "[adj/N] に なる / に する",
    shortMeaning: "なる = llegar a ser / cambiar a; する = hacer que algo sea / decidir que sea.",
    explanation: [
      "なる = cambio natural; する = cambio provocado por alguien.",
      "い-adj: [raíz]く + なる/する. な-adj/N: [adj/N] に + なる/する.",
      "Los い-adjetivos pierden い y agregan く; los demás usan に.",
    ],
    formation: [
      "い-adj: [raíz]く + なる",
      "な-adj／N: [adj] に + なる",
    ],
    examples: [
      {
        jp: "{寒|さむ}くなりました。",
        es: "Se puso frío.",
      },
      {
        jp: "{日本語|にほんご}が{上手|じょうず}になりたいです。",
        es: "Quiero mejorar en japonés.",
      },
      {
        jp: "テレビの{音|おと}を{小|ちい}さくしてください。",
        es: "Por favor baja el volumen del televisor.",
      },
      {
        jp: "{医者|いしゃ}になりたいです。",
        es: "Quiero ser médico.",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "寒く___ました。 (se puso frío)",
      options: ["なり", "に", "して"],
      answer: "なり",
      successMessage: "い-adj + くなる — cambio natural.",
    },
    commonMistakes: [
      "Usar に con い-adjetivos: × 寒いになる → ○ 寒くなる",
      "Confundir なる (cambio natural) con する (cambio causado).",
    ],
    practicePrompts: [
      "Di cómo han cambiado las cosas este año usando になりました: [もの/こと]が[adj]になりました。",
      "Di qué quieres llegar a ser usando になりたいです.",
    ],
    relatedGrammarIds: ["adjective-present", "comparison-two", "tsumori"],
    sourceNotes: ["Basado en Genki I L10, Grammar 2 (になる/にする)"],
  },

  {
    id: "tsumori",
    lesson: 10,
    title: "～つもりだ",
    pattern: "V-plain つもりです / V-ないつもりです",
    shortMeaning: "Expresar intención o plan firme: «tengo pensado hacer X» / «no pienso hacer X».",
    explanation: [
      "つもり expresa una intención ya decidida, más fuerte que たい.",
      "Negativo: [V-ない] つもりです (con ない, no ません).",
      "たい = deseo; つもり = intención concreta de hacerlo.",
    ],
    formation: [
      "[V-plain] つもりです",
      "[V-ない] つもりです",
    ],
    examples: [
      {
        jp: "{夏|なつ}に{日本|にほん}へ{行|い}くつもりです。",
        es: "Tengo planeado ir a Japón en verano.",
      },
      {
        jp: "{今年|ことし}は{勉強|べんきょう}するつもりです。",
        es: "Este año pienso estudiar.",
      },
      {
        jp: "{卒業|そつぎょう}したら、{大学院|だいがくいん}に{行|い}くつもりです。",
        es: "Cuando me gradue, planeo ir al posgrado.",
      },
      {
        jp: "{今日|きょう}は{出|で}かけないつもりです。",
        es: "Hoy no pienso salir.",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "夏に日本へ行く___です。",
      options: ["つもり", "たい", "つもりが"],
      answer: "つもり",
      successMessage: "つもり — intención decidida.",
    },
    commonMistakes: [
      "Usar ますつもりです: × 行きますつもりです → ○ 行くつもりです",
    ],
    practicePrompts: [
      "Di tres cosas que planeas hacer este mes y una que no piensas hacer.",
      "Compara: ¿en qué difieren たいです y つもりです? Crea un par de oraciones que lo ilustren.",
    ],
    relatedGrammarIds: ["naru-suru", "tai-tagaru", "comparison-two"],
    sourceNotes: ["Basado en Genki I L10, Grammar 3 (つもり)"],
  },

  // ═══════════════════════════════════════════════
  //  LECCIÓN 11 — {放課後|ほうかご}
  // ═══════════════════════════════════════════════

  {
    id: "tai-tagaru",
    lesson: 11,
    title: "～たい / ～たがる",
    pattern: "V-stem + たいです / V-stem + たがっています",
    shortMeaning: "Expresar el deseo de hacer algo (para uno mismo) o el deseo aparente de otro.",
    explanation: [
      "たい = deseo propio; se añade al stem del verbo (食べたい, 行きたい).",
      "Se conjuga como い-adjetivo: たくない, たかった.",
      "Para deseo de otra persona: たがっています.",
    ],
    formation: [
      "V-stem + たいです",
      "V-stem + たがっています",
    ],
    examples: [
      {
        jp: "{日本|にほん}に{行|い}きたいです。",
        es: "Quiero ir a Japón.",
      },
      {
        jp: "もう{帰|かえ}りたくないです。",
        es: "Ya no quiero irme a casa.",
      },
      {
        jp: "{医者|いしゃ}になりたかったです。",
        es: "Quería ser médico.",
      },
      {
        jp: "{田中|たなか}さんは{日本|にほん}に{行|い}きたがっています。",
        es: "Parece que el señor Tanaka quiere ir a Japón.",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "日本に行き___です。 (yo quiero)",
      options: ["たい", "たがっている", "つもり"],
      answer: "たい",
      successMessage: "たい — deseo en primera persona.",
    },
    commonMistakes: [
      "Usar たがっている para uno mismo: × 私は行きたがっています → ○ 私は行きたいです",
      "Conjugar el verbo antes de たい: × 食べますたい → ○ 食べたい",
    ],
    interactions: [
      "Encuesta de sueños: cada alumno comparte una cosa que siempre quiso hacer con たいです.",
    ],
    practicePrompts: [
      "Di tres cosas que quieres hacer este año y una que NO quieres hacer.",
      "Describe el deseo de un compañero (que él te dijo): ～さんは～たがっています。",
    ],
    relatedGrammarIds: ["tsumori", "nominalization-no", "koto-ga-aru"],
    sourceNotes: ["Basado en Genki I L11, Grammar 1 (たい/たがる)"],
  },

  {
    id: "tari-tari",
    lesson: 11,
    title: "～たり～たりする",
    pattern: "V₁-たり V₂-たり します",
    shortMeaning: "Enumerar actividades de forma no exhaustiva: «hago cosas como V₁ y V₂».",
    explanation: [
      "たり～たりする da ejemplos de actividades sin listar todo — como や pero con verbos.",
      "たり se forma igual que た + り: 食べた→食べたり, した→したり.",
      "Siempre termina en する: します, しました, している.",
    ],
    formation: [
      "V₁-たり、V₂-たり します",
    ],
    examples: [
      {
        jp: "{週末|しゅうまつ}は{映画|えいが}を{見|み}たり、{友達|ともだち}と{話|はな}したりします。",
        es: "Los fines de semana hago cosas como ver películas y hablar con amigos.",
      },
      {
        jp: "{昨日|きのう}は{買|か}い{物|もの}したり、{本|ほん}を{読|よ}んだりしました。",
        es: "Ayer hice cosas como ir de compras y leer.",
      },
      {
        jp: "{日本語|にほんご}の{勉強|べんきょう}では、{聞|き}いたり、{話|はな}したりします。",
        es: "En el estudio del japonés hago cosas como escuchar y hablar.",
      },
      {
        jp: "{週末|しゅうまつ}は{寝|ね}たり、テレビを{見|み}たりしました。",
        es: "El fin de semana hice cosas como dormir y ver televisión.",
      },
    ],
    exercise: {
      type: "word-order",
      prompt: "Ordena: «Hago cosas como ver películas y hablar».",
      tokens: ["します", "話したり", "見たり", "映画を"],
      answer: ["映画を", "見たり", "話したり", "します"],
      successMessage: "¡Bien! たり…たり…します.",
    },
    commonMistakes: [
      "Olvidar する/します al final: × 食べたり飲んだり → ○ 食べたり飲んだりします",
    ],
    practicePrompts: [
      "Describe tu fin de semana típico con tres actividades usando たり～たりします.",
      "Cuenta qué hiciste en tus últimas vacaciones con たり～たりしました.",
    ],
    relatedGrammarIds: ["particle-ya-listing", "short-form-past", "v1-te-v2-sequence"],
    sourceNotes: ["Basado en Genki I L11, Grammar 2 (たり～たりする)"],
  },

  {
    id: "koto-ga-aru",
    lesson: 11,
    title: "～たことがある",
    pattern: "V-た こと が あります",
    shortMeaning: "Hablar de experiencias pasadas: «alguna vez he hecho X».",
    explanation: [
      "た (pasado) + こと (hecho) + があります = «he tenido la experiencia de…».",
      "Negación: V-たことがありません / ことはありません.",
      "Distinto de ている: experiencia pasada, no estado actual.",
    ],
    formation: [
      "V-た + ことがあります",
      "V-た + ことがありません",
    ],
    examples: [
      {
        jp: "{京都|きょうと}に{行|い}ったことがあります。",
        es: "He ido a Kioto alguna vez.",
      },
      {
        jp: "{刺身|さしみ}を{食|た}べたことがありますか。",
        es: "¿Alguna vez has comido sashimi?",
      },
      {
        jp: "{富士山|ふじさん}に{登|のぼ}ったことはありません。",
        es: "Nunca he escalado el Monte Fuji.",
      },
      {
        jp: "{日本語|にほんご}で{話|はな}したことがあります。",
        es: "He hablado en japonés alguna vez.",
      },
    ],
    dialogue: [
      { speaker: "メアリー", jp: "{日本|にほん}に{来|き}たことがありますか。", es: "¿Habías venido a Japón antes?" },
      { speaker: "アナ", jp: "いいえ、{初|はじ}めてです。", es: "No, es mi primera vez." },
    ],
    exercise: {
      type: "fill-blank",
      prompt: "He ido a Kioto alguna vez.",
      before: "京都に行った",
      after: "あります。",
      answer: "ことが",
      placeholder: "experiencia",
      successMessage: "ことがあります — experiencia pasada.",
    },
    commonMistakes: [
      "Usar presente en lugar de た antes de こと: × 行くことがあります → ○ 行ったことがあります",
    ],
    practicePrompts: [
      "Comparte tres experiencias que has tenido y una que no has tenido usando たことがあります／ありません.",
      "Pregunta a tres compañeros si han probado algún alimento japonés.",
    ],
    relatedGrammarIds: ["short-form-past", "tai-tagaru", "tari-tari"],
    sourceNotes: ["Basado en Genki I L11, Grammar 3 (たことがある)"],
  },

  // ═══════════════════════════════════════════════
  //  LECCIÓN 12 — {奈良|なら}への{旅行|りょこう}
  // ═══════════════════════════════════════════════

  {
    id: "nakereba-ikemasen",
    lesson: 12,
    title: "～なければいけません",
    pattern: "V-なければいけません / V-なければなりません",
    shortMeaning: "Obligación: «tengo que / debo hacer X».",
    explanation: [
      "Negativo del verbo + ければ + いけません expresa obligación.",
      "なければいけません y なければなりません son intercambiables.",
      "Lógica: «si no hago V, no está bien» = es obligatorio.",
    ],
    formation: [
      "V-ない → V-なければ + いけません",
    ],
    examples: [
      {
        jp: "{明日|あした}{早|はや}く{起|お}きなければいけません。",
        es: "Mañana tengo que levantarme temprano.",
      },
      {
        jp: "{宿題|しゅくだい}をしなければなりません。",
        es: "Tengo que hacer la tarea.",
      },
      {
        jp: "{薬|くすり}を{飲|の}まなければいけませんか。",
        es: "¿Tengo que tomar la medicina?",
      },
      {
        jp: "{毎日|まいにち}{勉強|べんきょう}しなければいけません。",
        es: "Tengo que estudiar todos los días.",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "宿題をし___。 (tengo que hacerla)",
      options: ["ます", "なければいけません", "たいです"],
      answer: "なければいけません",
      successMessage: "なければいけません — obligación.",
    },
    commonMistakes: [
      "Usar el stem incorrecto: 行く → 行かなければ (no ×行きなければ).",
    ],
    practicePrompts: [
      "Di tres cosas que tienes que hacer esta semana usando なければいけません.",
      "Contrasta obligación y permiso: [V]なければいけません vs. [V]なくてもいいです en la misma situación.",
    ],
    relatedGrammarIds: ["short-form-present", "hou-ga-ii", "n-desu"],
    sourceNotes: ["Basado en Genki I L12, Grammar 1 (なければいけません)"],
  },

  {
    id: "n-desu",
    lesson: 12,
    title: "～んです / ～んですが",
    pattern: "[V/adj/N-plain] んです",
    shortMeaning: "Dar contexto, explicar o pedir una explicación de manera más personal y conectada.",
    explanation: [
      "んです añade matiz explicativo: «y hay una razón / te explico el contexto».",
      "Usos: explicar, pedir explicación (どうしたんですか), o suavizar con んですが.",
      "Plain form antes de んです; な-adj/N usan なんです.",
    ],
    formation: [
      "[V-plain] んです",
      "[な-adj／N] なんです",
    ],
    examples: [
      {
        jp: "{頭|あたま}が{痛|いた}いんです。",
        es: "Es que me duele la cabeza.",
      },
      {
        jp: "どうしたんですか。",
        es: "¿Qué te pasa?",
      },
      {
        jp: "ちょっと{聞|き}きたいんですが…",
        es: "Es que quería preguntarte algo…",
      },
      {
        jp: "{実|じつ}は{学生|がくせい}なんです。",
        es: "En realidad soy estudiante.",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "実は学生___。 (sustantivo + んです)",
      options: ["んです", "なんです", "のです"],
      answer: "なんです",
      successMessage: "な-adj/N necesitan な antes de んです.",
    },
    commonMistakes: [
      "Olvidar な con な-adj/N: × 学生んです → ○ 学生なんです",
    ],
    interactions: [
      "Roleplay: un alumno actúa estar cansado o enfermo; el otro pregunta どうしたんですか y el primero explica con [V]んです.",
    ],
    practicePrompts: [
      "Explica con んです por qué llegaste tarde a clase o por qué no hiciste la tarea.",
      "Practica んですが para pedir algo con suavidad: tres situaciones distintas.",
    ],
    relatedGrammarIds: ["kara-reason", "nakereba-ikemasen", "short-form-present"],
    sourceNotes: ["Basado en Genki I L12, Grammar 2 (んです)"],
  },

  {
    id: "sugiru",
    lesson: 12,
    title: "～すぎる",
    pattern: "V-stem すぎる / い-adj-stem すぎる / な-adj すぎる",
    shortMeaning: "Indicar exceso: «demasiado [adj/V]».",
    explanation: [
      "すぎる se añade al stem del verbo, al い-adj (sin い) o al な-adj (sin な).",
      "高い → 高すぎる. 静か → 静かすぎる. 食べる → 食べすぎる.",
      "Se conjuga como verbo: すぎます, すぎた, すぎて.",
    ],
    formation: [
      "い-adj: [raíz] + すぎる",
      "V: [V-stem] + すぎる",
    ],
    examples: [
      {
        jp: "この{宿題|しゅくだい}は{多|おお}すぎます。",
        es: "Esta tarea es demasiada.",
      },
      {
        jp: "{食|た}べすぎて、{気持|きも}ち{悪|わる}いです。",
        es: "Comí demasiado y me siento mal.",
      },
      {
        jp: "この{部屋|へや}は{静|しず}かすぎます。",
        es: "Esta habitación es demasiado silenciosa.",
      },
      {
        jp: "この{本|ほん}は{難|むずか}しすぎます。",
        es: "Este libro es demasiado difícil.",
      },
    ],
    exercise: {
      type: "fill-blank",
      prompt: "Esta tarea es demasiada.",
      before: "この宿題は多",
      after: "ます。",
      answer: "すぎ",
      placeholder: "exceso",
      successMessage: "多い → 多すぎる (sin い).",
    },
    commonMistakes: [
      "Dejar el い en い-adjetivos: × 高いすぎる → ○ 高すぎる",
      "Añadir な a na-adjetivos: × 静かなすぎる → ○ 静かすぎる",
    ],
    practicePrompts: [
      "Describe tres cosas excesivas de tu vida o del mundo usando すぎます.",
      "Usa すぎて para dar razón de un problema: [Vすぎて／adjすぎて]、[resultado]。",
    ],
    relatedGrammarIds: ["adjective-present", "hou-ga-ii", "n-desu"],
    sourceNotes: ["Basado en Genki I L12, Grammar 3 (すぎる)"],
  },

  {
    id: "hou-ga-ii",
    lesson: 12,
    title: "～ほうがいい",
    pattern: "V-た／V-ない + ほうがいいです",
    shortMeaning: "Dar un consejo: «sería mejor que [hicieras / no hicieras] X».",
    explanation: [
      "El afirmativo usa la forma た, no el presente: 寝たほうがいい.",
      "Negativo: V-ない + ほうがいいです.",
      "Más fuerte que たい — implica justificación o urgencia.",
    ],
    formation: [
      "V-た + ほうがいいです",
      "V-ない + ほうがいいです",
    ],
    examples: [
      {
        jp: "{早|はや}く{病院|びょういん}に{行|い}ったほうがいいです。",
        es: "Sería mejor que fueras al médico pronto.",
      },
      {
        jp: "{無理|むり}しないほうがいいですよ。",
        es: "Sería mejor que no te esforzaras demasiado.",
      },
      {
        jp: "よく{寝|ね}たほうがいいです。",
        es: "Sería mejor que durmieras bien.",
      },
      {
        jp: "{薬|くすり}を{飲|の}んだほうがいいですよ。",
        es: "Sería mejor que tomaras medicina.",
      },
    ],
    dialogue: [
      { speaker: "メアリー", jp: "かぜを{引|ひ}いたみたいです。", es: "Parece que agarré un resfriado." },
      { speaker: "たけし", jp: "{早|はや}く{薬|くすり}を{飲|の}んだほうがいいですよ。", es: "Sería mejor que tomaras medicina pronto." },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "早く病院に___ほうがいいです。",
      options: ["行く", "行った", "行き"],
      answer: "行った",
      successMessage: "El consejo afirmativo usa la forma た.",
    },
    commonMistakes: [
      "Usar presente en lugar de た: × 行くほうがいい → ○ 行ったほうがいい",
    ],
    practicePrompts: [
      "Da consejos a un compañero que está cansado, estresado y come mal: tres recomendaciones con ほうがいいです.",
      "Roleplay médico-paciente: el médico da tres consejos con たほうがいい y ないほうがいい.",
    ],
    relatedGrammarIds: ["nakereba-ikemasen", "n-desu", "sugiru"],
    sourceNotes: ["Basado en Genki I L12, Grammar 4 (ほうがいい)"],
  },

  {
    id: "deshou-darou",
    lesson: 12,
    title: "～でしょう / だろう",
    pattern: "[plain form] でしょう / だろう",
    shortMeaning: "Conjetura o probabilidad: «probablemente» / «supongo que».",
    explanation: [
      "でしょう (cortés) / だろう (plain) expresan conjetura, no certeza.",
      "Van después de la plain form (o N/な-adj + だ).",
      "でしょう↓ es afirmación; でしょう↑ pide confirmación.",
    ],
    formation: [
      "[plain form] でしょう",
    ],
    examples: [
      {
        jp: "{明日|あした}は{雨|あめ}でしょう。",
        es: "Mañana probablemente llueva.",
      },
      {
        jp: "{田中|たなか}さんは{知|し}っているだろう。",
        es: "El señor Tanaka probablemente lo sabe.",
      },
      {
        jp: "{難|むずか}しかったでしょう。",
        es: "Habrá sido difícil, ¿verdad?",
      },
      {
        jp: "{今日|きょう}は{忙|いそが}しいでしょう。",
        es: "Hoy probablemente estés ocupado.",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "明日は雨___。 (conjetura cortés)",
      options: ["でしょう", "です", "だ"],
      answer: "でしょう",
      successMessage: "でしょう — conjetura cortés.",
    },
    commonMistakes: [
      "Usar でしょう con la forma ます: × 行きますでしょう → ○ 行くでしょう",
    ],
    practicePrompts: [
      "Haz tres conjeturas sobre el tiempo, los planes de un compañero o el resultado de un examen.",
      "Practica la entonación ascendente: usa でしょう↑ para buscar confirmación de algo que crees saber.",
    ],
    relatedGrammarIds: ["to-omoimasu", "n-desu", "deshou-ka"],
    sourceNotes: ["Basado en Genki I L12, Grammar 5 (でしょう／だろう)"],
  },

  {
    id: "deshou-ka",
    lesson: 12,
    title: "～でしょうか",
    pattern: "[plain form] でしょうか",
    shortMeaning: "Pregunta muy cortés o pregunta reflexiva con matiz de duda.",
    explanation: [
      "でしょうか = conjetura (でしょう) + pregunta (か).",
      "Más educado que ですか en contextos formales.",
      "También se usa para preguntas reflexivas, sin esperar respuesta inmediata.",
    ],
    formation: [
      "[plain form] + でしょうか",
    ],
    examples: [
      {
        jp: "お{名前|なまえ}は{何|なん}でしょうか。",
        es: "¿Podría decirme su nombre?",
      },
      {
        jp: "{田中|たなか}さんはいらっしゃるでしょうか。",
        es: "¿Estará el señor Tanaka?",
      },
      {
        jp: "これでいいでしょうか。",
        es: "¿Estará bien así?",
      },
      {
        jp: "{明日|あした}は{晴|は}れるでしょうか。",
        es: "¿Estará soleado mañana?",
      },
    ],
    exercise: {
      type: "multiple-choice",
      prompt: "Forma más educada de preguntar «¿Está bien así?»:",
      options: ["いいですか", "いいでしょうか", "いいだろう"],
      answer: "いいでしょうか",
      successMessage: "でしょうか — pregunta muy cortés.",
    },
    commonMistakes: [
      "Usar でしょうか en conversación casual con amigos — suena demasiado formal.",
    ],
    practicePrompts: [
      "Escribe tres preguntas que harías en un contexto formal (oficina, aeropuerto, recepción) usando でしょうか.",
      "Compara: escribe la misma pregunta en ですか y でしょうか. ¿Qué cambia en la situación?",
    ],
    relatedGrammarIds: ["deshou-darou", "questions-ka", "n-desu"],
    sourceNotes: ["Basado en Genki I L12, Grammar 6 (でしょうか)"],
  },

];
