/**
 * Banco de Temas de la Semana — Nihongo Feed
 *
 * 25 temas intencionados para practicar japonés A1-A2 (Genki I–II).
 * Diseñados para que tanto el principiante absoluto como el más avanzado
 * puedan participar con la misma pregunta.
 *
 * Furigana notation: {漢字|ふりがな}
 * El componente <FuriganaText /> parsea y renderiza como <ruby>.
 *
 * Niveles de ejemplo:
 *   "básico"  — 1 oración simple, copia la estructura y listo
 *   "medio"   — 1-2 oraciones con alguna ampliación
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type EjemploNivel = "básico" | "medio";

export type Ejemplo = {
  texto: string;        // Japonés con notación {漢字|ふりがな} donde aplique
  espanol: string;      // Traducción al español
  nivel: EjemploNivel;
};

export type DetalleTema = {
  patron: string;           // Patrón gramatical clave — ej. "〜が すきです"
  explicacion: string;      // Explicación breve del patrón en español
  comoResponder: string;    // Instrucción amigable de cómo participar
  consejo?: string;         // Tip extra o frase bonus
  vocabulario: string[];    // "japonés = español" — mínimo 6 palabras clave
  ejemplos: Ejemplo[];      // Entre 3 y 4 ejemplos por nivel
};

export type OpcionSlot = {
  jp: string;   // "ラーメン"
  es: string;   // "el ramen" — encaja en estructuraEs
};

export type SlotPlantilla = {
  id: string;            // e.g. "FOOD" — matches {{FOOD}} in estructura
  etiqueta: string;      // Pista en español del hueco: "comida", "sentimiento"
  opciones: OpcionSlot[];
};

/**
 * Interactive fill-in template for each weekly topic.
 * estructura (JP) y estructuraEs (ES) usan los mismos marcadores {{SLOT_ID}}
 * para mostrar la oración y su traducción en vivo.
 */
export type PlantillaTema = {
  estructura: string;     // "{{FOOD}} が すきです！"
  estructuraEs: string;   // "¡Me gusta {{FOOD}}!"
  slots: SlotPlantilla[];
};

export type TemaSemana = {
  id: number;
  kana: string;       // Texto grande en la card (2–5 palabras, mayormente kana)
  prompt: string;     // Subtítulo en español (la invitación)
  detalle: DetalleTema;
  plantilla: PlantillaTema;  // Interactive sentence builder
};

// ── Banco de temas ─────────────────────────────────────────────────────────────

export const TEMAS_SEMANA: TemaSemana[] = [

  // ── 1 ────────────────────────────────────────────────────────────────────
  {
    id: 1,
    kana: "きょうの きもち",
    prompt: "¿Cómo te sientes hoy? Comparte tu estado de ánimo",
    detalle: {
      patron: "〜い/な + です  /  〜ています",
      explicacion:
        "Los adjetivos en -い van directo: 「たのしいです」. Los adjetivos en -な necesitan な antes de un sustantivo, pero solo +です cuando describes cómo estás. Para estados continuos (cansancio, emoción): 「〜ています」.",
      comoResponder:
        "Escribe 「きょうは [きもち] です」y agrega ¿por qué? si quieres con 「〜から」. ¡Una oración es suficiente!",
      consejo:
        "Cierra con 「でも、がんばります！」si el día está difícil — es como decir «pero voy a echarle ganas». 💪",
      vocabulario: [
        "たのしい = alegre, divertido/a",
        "かなしい = triste",
        "ねむい = soñoliento/a",
        "つかれています = estoy cansado/a",
        "わくわくしています = estoy emocionado/a",
        "きぶんが いい = estoy de buen humor",
        "すこし = un poco",
        "でも = pero",
      ],
      ejemplos: [
        {
          texto: "きょうは たのしいです！",
          espanol: "¡Hoy estoy contento/a!",
          nivel: "básico",
        },
        {
          texto: "すこし つかれていますが、げんきです。",
          espanol: "Estoy un poco cansado/a, pero bien.",
          nivel: "básico",
        },
        {
          texto: "きょうは テストが あったから、ねむいです。でも がんばります！",
          espanol: "Hoy tuve examen así que tengo sueño. ¡Pero voy a echarle ganas!",
          nivel: "medio",
        },
        {
          texto: "あしたから やすみだから、わくわく しています！はやく こないかな〜",
          espanol: "Como a partir de mañana hay vacaciones, ¡estoy súper emocionado/a! Que llegue rápido...",
          nivel: "medio",
        },
      ],
    },
    plantilla: {
      estructura: "きょうは {{FEELING}} です。",
      estructuraEs: "Hoy estoy {{FEELING}}.",
      slots: [{ id: "FEELING", etiqueta: "sentimiento", opciones: [
        { jp: "たのしい", es: "feliz" },
        { jp: "げんき", es: "con energía" },
        { jp: "ねむい", es: "con sueño" },
        { jp: "つかれた", es: "cansado/a" },
        { jp: "わくわく", es: "emocionado/a" },
        { jp: "いそがしい", es: "ocupado/a" },
      ] }],
    },
  },

  // ── 2 ────────────────────────────────────────────────────────────────────
  {
    id: 2,
    kana: "すきな たべもの",
    prompt: "¿Qué comida te encanta? ¡Cuéntanos!",
    detalle: {
      patron: "[もの] が すきです",
      explicacion:
        "Para decir que te gusta algo: 「〜が すきです」. El が marca lo que te gusta. Para énfasis: 「だいすき」= me encanta. Para ampliar: agrega la razón con 「〜から」(porque) o conecta adjetivos con 「〜くて」(es... y).",
      comoResponder:
        "Escribe tu comida favorita + 「が すきです」. Si puedes, agrega ¿por qué? — pero no es obligatorio. ¡Pizza, tacos, ramen: todo vale!",
      consejo:
        "「にほんりょうりの なかで〜」= de la comida japonesa... ¡una forma de ser más específico si quieres!",
      vocabulario: [
        "だいすき = me encanta",
        "きらい = no me gusta",
        "おいしい = rico/a, delicioso/a",
        "あまい = dulce",
        "からい = picante",
        "とくに = especialmente",
        "〜のなかで = de entre〜",
        "いちばん = el/la más",
      ],
      ejemplos: [
        {
          texto: "ラーメンが すきです！",
          espanol: "¡Me gusta el ramen!",
          nivel: "básico",
        },
        {
          texto: "わたしは チョコレートが だいすきです。",
          espanol: "Me encanta el chocolate.",
          nivel: "básico",
        },
        {
          texto: "チーズケーキが すきです。あまくて、おいしいから。",
          espanol: "Me gusta el cheesecake porque es dulce y delicioso.",
          nivel: "medio",
        },
        {
          texto: "にほんりょうりの なかで、たこやきが いちばん すきです！いつか たべてみたいです。",
          espanol: "De la comida japonesa, ¡el takoyaki es lo que más me gusta! Algún día quiero probarlo.",
          nivel: "medio",
        },
      ],
    },
    plantilla: {
      estructura: "{{FOOD}} が すきです！",
      estructuraEs: "¡Me gusta {{FOOD}}!",
      slots: [{ id: "FOOD", etiqueta: "comida", opciones: [
        { jp: "ラーメン", es: "el ramen" },
        { jp: "すし", es: "el sushi" },
        { jp: "ピザ", es: "la pizza" },
        { jp: "たこやき", es: "el takoyaki" },
        { jp: "アイス", es: "el helado" },
        { jp: "チョコ", es: "el chocolate" },
        { jp: "カレー", es: "el curry" },
        { jp: "うどん", es: "el udon" },
      ] }],
    },
  },

  // ── 3 ────────────────────────────────────────────────────────────────────
  {
    id: 3,
    kana: "わたしの かぞく",
    prompt: "Preséntanos a un miembro de tu familia",
    detalle: {
      patron: "[ひと] が います  /  [ひと] は [adj] です",
      explicacion:
        "「〜が います」= hay alguien / tengo (personas/animales). Para describir: adjetivos + です. Combina dos características con 「〜くて、〜です」(i-adj) o 「〜で、〜です」(na-adj). ¡No pongas の entre adjective y です!",
      comoResponder:
        "Elige a alguien de tu familia: di qué parentesco es y una característica. Si eres hijo/a único/a, ¡también puedes decirlo!",
      consejo:
        "「ひとりっこです。」= soy hijo/a único/a. ¡Una oración perfecta y válida!",
      vocabulario: [
        "おとうさん = papá (de alguien más) / ちち = mi papá",
        "おかあさん = mamá (de alguien más) / はは = mi mamá",
        "あに = mi hermano mayor",
        "あね = mi hermana mayor",
        "おとうと = mi hermano menor",
        "いもうと = mi hermana menor",
        "やさしい = amable, gentil",
        "ひとりっこ = hijo/a único/a",
      ],
      ejemplos: [
        {
          texto: "おかあさんが います。やさしいです。",
          espanol: "Tengo mamá. Es amable.",
          nivel: "básico",
        },
        {
          texto: "わたしには いもうとが ひとり います。かわいいです！",
          espanol: "Tengo una hermana menor. ¡Es adorable!",
          nivel: "básico",
        },
        {
          texto: "おとうとは 16さいです。うるさいですが、おもしろいです。",
          espanol: "Mi hermano menor tiene 16 años. Es ruidoso pero gracioso.",
          nivel: "medio",
        },
        {
          texto: "うちの おかあさんは まいにち はやく おきて、りょうりを します。いつも ありがとう！",
          espanol: "Mi mamá se levanta temprano todos los días y cocina. ¡Siempre gracias!",
          nivel: "medio",
        },
      ],
    },
    plantilla: {
      estructura: "{{FAMILY}} は {{ADJ}} です。",
      estructuraEs: "Mi {{FAMILY}} es {{ADJ}}.",
      slots: [
        { id: "FAMILY", etiqueta: "familiar", opciones: [
          { jp: "ちち", es: "papá" },
          { jp: "はは", es: "mamá" },
          { jp: "あに", es: "hermano mayor" },
          { jp: "あね", es: "hermana mayor" },
          { jp: "おとうと", es: "hermano menor" },
          { jp: "いもうと", es: "hermana menor" },
        ] },
        { id: "ADJ", etiqueta: "cómo es", opciones: [
          { jp: "やさしい", es: "amable" },
          { jp: "おもしろい", es: "gracioso/a" },
          { jp: "げんき", es: "enérgico/a" },
          { jp: "かわいい", es: "lindo/a" },
          { jp: "きびしい", es: "estricto/a" },
        ] },
      ],
    },
  },

  // ── 4 ────────────────────────────────────────────────────────────────────
  {
    id: 4,
    kana: "まいにちのルーティン",
    prompt: "¿Qué haces todos los días? Comparte un hábito",
    detalle: {
      patron: "まいにち/まいあさ 〜ます",
      explicacion:
        "「まいにち」(todos los días), 「まいあさ」(mañanas), 「まいばん」(noches). El verbo 〜ます describe hábitos. Para añadir cuándo: 「〜まえに」= antes de〜, 「〜あとで」= después de〜. Para aproximar tiempo: 「〜ぐらい」.",
      comoResponder:
        "Escribe una cosa que haces siempre. Puedes agregar cuándo o cuánto tiempo. ¡Un hábito pequeño también cuenta!",
      vocabulario: [
        "まいにち = todos los días",
        "まいあさ = todas las mañanas",
        "まいばん = todas las noches",
        "〜まえに = antes de〜",
        "〜あとで = después de〜",
        "〜ぐらい = aproximadamente",
        "おきる = levantarse",
        "ねる = acostarse / dormir",
      ],
      ejemplos: [
        {
          texto: "まいにち コーヒーを のみます。",
          espanol: "Todos los días tomo café.",
          nivel: "básico",
        },
        {
          texto: "まいあさ 7じに おきます。",
          espanol: "Todas las mañanas me levanto a las 7.",
          nivel: "básico",
        },
        {
          texto: "ねる まえに、30ぷんぐらい にほんごを べんきょうします。",
          espanol: "Antes de dormir, estudio japonés como 30 minutos.",
          nivel: "medio",
        },
        {
          texto: "まいあさ ジョギングを しています。はじめは たいへんでしたが、いまは たのしいです！",
          espanol: "Todas las mañanas corro. Al principio era difícil pero ahora ¡es divertido!",
          nivel: "medio",
        },
      ],
    },
    plantilla: {
      estructura: "まいにち {{ACTIVITY}}。",
      estructuraEs: "Todos los días {{ACTIVITY}}.",
      slots: [{ id: "ACTIVITY", etiqueta: "actividad", opciones: [
        { jp: "コーヒーを のみます", es: "tomo café" },
        { jp: "べんきょうします", es: "estudio" },
        { jp: "うんどうします", es: "hago ejercicio" },
        { jp: "アニメを みます", es: "veo anime" },
        { jp: "おんがくを ききます", es: "escucho música" },
        { jp: "さんぽします", es: "salgo a caminar" },
      ] }],
    },
  },

  // ── 5 ────────────────────────────────────────────────────────────────────
  {
    id: 5,
    kana: "しゅうまつに したこと",
    prompt: "¿Qué hiciste este fin de semana?",
    detalle: {
      patron: "〜ました  /  〜に いきました",
      explicacion:
        "Pasado de verbos: 〜ます → 〜ました (hice〜). Negativo: 〜ませんでした (no hice〜). Para contar dónde fuiste: 「〜に いきました」= fui a〜. Con quién: 「[ひと] と いっしょに」= junto con〜.",
      comoResponder:
        "Cuenta una cosa que hiciste. Verbo en 〜ました. Puedes agregar con quién, dónde, o cómo estuvo.",
      consejo:
        "「〜が たのしかったです」= fue divertido. ¡Úsalo para cerrar con sentimiento!",
      vocabulario: [
        "〜に いきました = fui a〜",
        "〜を みました = vi〜",
        "〜を たべました = comí〜",
        "〜と いっしょに = junto con〜",
        "たのしかった = fue divertido",
        "うちに いました = estuve en casa",
        "ゆっくりしました = descansé / me relajé",
      ],
      ejemplos: [
        {
          texto: "えいがを みました。",
          espanol: "Vi una película.",
          nivel: "básico",
        },
        {
          texto: "ともだちと カフェに いきました。",
          espanol: "Fui a un café con mi amigo/a.",
          nivel: "básico",
        },
        {
          texto: "しゅうまつは うちに いました。ゲームを して、アニメを みました。",
          espanol: "Me quedé en casa el fin de semana. Jugué videojuegos y vi anime.",
          nivel: "medio",
        },
        {
          texto: "{家族|かぞく}と レストランに いって、おいしいものを たべました。とても たのしかったです！",
          espanol: "Fui a un restaurante con mi familia y comimos cosas ricas. ¡Fue muy divertido!",
          nivel: "medio",
        },
      ],
    },
    plantilla: {
      estructura: "しゅうまつ、{{ACTION}}ました。",
      estructuraEs: "El fin de semana {{ACTION}}.",
      slots: [{ id: "ACTION", etiqueta: "qué hiciste", opciones: [
        { jp: "えいがを み", es: "vi una película" },
        { jp: "ともだちと あい", es: "vi a un amigo/a" },
        { jp: "うちで やすみ", es: "descansé en casa" },
        { jp: "かいものを し", es: "fui de compras" },
        { jp: "ゲームを し", es: "jugué videojuegos" },
      ] }],
    },
  },

  // ── 6 ────────────────────────────────────────────────────────────────────
  {
    id: 6,
    kana: "いまいる ばしょ",
    prompt: "¿Dónde estás ahora? Describe tu entorno",
    detalle: {
      patron: "[ばしょ] に います  /  [もの] が あります",
      explicacion:
        "「います」= hay (personas/animales). 「あります」= hay (cosas). Ubica exactamente: 「[もの] の うえ/した/そば/となり に あります」. Para describir el lugar: 「〜で」+ adjetivo.",
      comoResponder:
        "Di dónde estás y agrega algo que hay en ese lugar. ¡Un detalle small es suficiente!",
      vocabulario: [
        "うえ = encima",
        "した = debajo",
        "となり = al lado",
        "ちかく/そば = cerca",
        "としょかん = biblioteca",
        "しずか（な） = tranquilo/a",
        "にぎやか（な） = animado/a",
        "〜やすい = fácil de〜",
      ],
      ejemplos: [
        {
          texto: "いま うちに います。",
          espanol: "Ahora estoy en casa.",
          nivel: "básico",
        },
        {
          texto: "つくえの うえに ほんが あります。",
          espanol: "Encima del escritorio hay un libro.",
          nivel: "básico",
        },
        {
          texto: "いま カフェに います。しずかで、べんきょうしやすいです。",
          espanol: "Ahora estoy en un café. Es tranquilo y fácil para estudiar.",
          nivel: "medio",
        },
        {
          texto: "へやに ねこが います。いま わたしの よこで ねています。かわいい！",
          espanol: "Hay un gato en mi cuarto. Ahora está durmiendo a mi lado. ¡Qué bonito!",
          nivel: "medio",
        },
      ],
    },
    plantilla: {
      estructura: "いま {{PLACE}} に います。",
      estructuraEs: "Ahora estoy en {{PLACE}}.",
      slots: [{ id: "PLACE", etiqueta: "lugar", opciones: [
        { jp: "うち", es: "casa" },
        { jp: "カフェ", es: "un café" },
        { jp: "がっこう", es: "la escuela" },
        { jp: "としょかん", es: "la biblioteca" },
        { jp: "そと", es: "afuera" },
        { jp: "でんしゃ", es: "el tren" },
      ] }],
    },
  },

  // ── 7 ────────────────────────────────────────────────────────────────────
  {
    id: 7,
    kana: "きょうのてんき",
    prompt: "¿Qué tiempo hace hoy donde estás?",
    detalle: {
      patron: "きょうは [てんき/adj] です",
      explicacion:
        "Los adjetivos del clima van con です: 「あついです」(hace calor), 「さむいです」(hace frío). Para combinar dos características: 「〜くて、〜です」. Puedes agregar tu ciudad: 「[まち] は きょう〜」.",
      comoResponder:
        "Describe el tiempo de hoy. ¡Puedes agregar cómo te hace sentir ese clima o qué quieres hacer por ese motivo!",
      vocabulario: [
        "はれ = soleado",
        "くもり = nublado",
        "あめ = lluvia",
        "あつい = caluroso/a",
        "さむい = frío/a",
        "すずしい = fresco/a",
        "あたたかい = cálido/a, templado",
        "むしあつい = bochornoso/a",
      ],
      ejemplos: [
        {
          texto: "きょうは はれです！",
          espanol: "¡Hoy está soleado!",
          nivel: "básico",
        },
        {
          texto: "そとは さむいです。",
          espanol: "Afuera hace frío.",
          nivel: "básico",
        },
        {
          texto: "きょうは くもっていて、すこし さむいです。コーヒーが のみたいです。",
          espanol: "Hoy está nublado y hace un poco de frío. Tengo ganas de tomar café.",
          nivel: "medio",
        },
        {
          texto: "メキシコシティは きょう とても あついです。そとに でたく ないです！",
          espanol: "Ciudad de México hoy está muy caluroso. ¡No quiero salir!",
          nivel: "medio",
        },
      ],
    },
    plantilla: {
      estructura: "きょうは {{WEATHER}} です。",
      estructuraEs: "Hoy está {{WEATHER}}.",
      slots: [{ id: "WEATHER", etiqueta: "clima", opciones: [
        { jp: "はれ", es: "soleado" },
        { jp: "あめ", es: "lluvioso" },
        { jp: "くもり", es: "nublado" },
        { jp: "あつい", es: "caluroso" },
        { jp: "さむい", es: "frío" },
        { jp: "すずしい", es: "fresco" },
      ] }],
    },
  },

  // ── 8 ────────────────────────────────────────────────────────────────────
  {
    id: 8,
    kana: "たべたいもの",
    prompt: "¿Qué quieres comer hoy? ¡Antójate en japonés!",
    detalle: {
      patron: "[food] が たべたいです",
      explicacion:
        "「〜たいです」= quiero hacer〜. Para comer: 「たべたい」, para tomar: 「のみたい」. El objeto de deseo va con が. Énfasis: 「むちゃくちゃ たべたい！」= ¡tengo un antojo horrible! Si ya comiste y estuvo rico: 「〜が おいしかったです」.",
      comoResponder:
        "¡Escribe qué quieres comer o tomar hoy! Puedes agregar por qué o dónde te gustaría comerlo.",
      consejo:
        "「おなかが すいた！」= ¡tengo hambre! — úsalo para darle energía a tu publicación 🍜",
      vocabulario: [
        "〜が たべたい = quiero comer〜",
        "〜が のみたい = quiero tomar〜",
        "むちゃくちゃ = muchísimo",
        "おなかが すいた = tengo hambre",
        "のどが かわいた = tengo sed",
        "たっぷり = abundante, mucho",
      ],
      ejemplos: [
        {
          texto: "ラーメンが たべたいです！",
          espanol: "¡Quiero comer ramen!",
          nivel: "básico",
        },
        {
          texto: "いま むちゃくちゃ アイスが たべたいです。",
          espanol: "Ahora mismo tengo un antojo horrible de helado.",
          nivel: "básico",
        },
        {
          texto: "おなかが すいたから、ピザが たべたいです。チーズが たっぷりの やつ！",
          espanol: "Tengo hambre así que quiero comer pizza. ¡De la que tiene mucho queso!",
          nivel: "medio",
        },
        {
          texto: "さいきん にほんりょうりに はまっていて、たこやきを たべてみたいです。どこかに うってないかな？",
          espanol: "Últimamente me obsesioné con la comida japonesa y quiero probar takoyaki. ¿Dónde venden?",
          nivel: "medio",
        },
      ],
    },
    plantilla: {
      estructura: "いま {{FOOD}} が たべたいです！",
      estructuraEs: "¡Ahora quiero comer {{FOOD}}!",
      slots: [{ id: "FOOD", etiqueta: "comida", opciones: [
        { jp: "ラーメン", es: "ramen" },
        { jp: "アイス", es: "helado" },
        { jp: "ピザ", es: "pizza" },
        { jp: "すし", es: "sushi" },
        { jp: "ケーキ", es: "pastel" },
        { jp: "たこやき", es: "takoyaki" },
      ] }],
    },
  },

  // ── 9 ────────────────────────────────────────────────────────────────────
  {
    id: 9,
    kana: "にほんごの べんきょう",
    prompt: "¿Cómo estudias japonés? ¡Comparte tu método!",
    detalle: {
      patron: "〜ています (habitual/progresivo)",
      explicacion:
        "「〜ています」puede ser progresivo (estoy haciendo〜 ahora) o habitual (hago〜 regularmente). Para decir cómo estudias: 「〜を つかって べんきょうしています」= estudio usando〜. Muy natural en japonés cotidiano.",
      comoResponder:
        "¿Con qué app, método o herramienta estudias? ¿Cuánto tiempo? ¿Qué parte te gusta más? ¡Cualquier detalle está bien!",
      vocabulario: [
        "アプリ = app",
        "〜を つかって = usando〜",
        "まいにち = todos los días",
        "むずかしい = difícil",
        "すこしずつ = poco a poco",
        "〜ながら = mientras〜 (al mismo tiempo)",
        "おぼえる = memorizar",
        "がんばっています = me estoy esforzando",
      ],
      ejemplos: [
        {
          texto: "まいにち アプリで べんきょうしています。",
          espanol: "Todos los días estudio con una app.",
          nivel: "básico",
        },
        {
          texto: "クラスで にほんごを ならっています。",
          espanol: "Estoy aprendiendo japonés en clase.",
          nivel: "básico",
        },
        {
          texto: "まいにち 30ぷん ひらがなを れんしゅうしています。むずかしいですが、たのしいです！",
          espanol: "Todos los días practico hiragana 30 minutos. ¡Es difícil pero divertido!",
          nivel: "medio",
        },
        {
          texto: "アニメを みながら にほんごを べんきょうしています。すこしずつ わかるように なってきました！",
          espanol: "Estudio japonés viendo anime. ¡Poco a poco estoy empezando a entender!",
          nivel: "medio",
        },
      ],
    },
    plantilla: {
      estructura: "{{METHOD}} で べんきょうしています。",
      estructuraEs: "Estudio con {{METHOD}}.",
      slots: [{ id: "METHOD", etiqueta: "método", opciones: [
        { jp: "アプリ", es: "una app" },
        { jp: "アニメ", es: "anime" },
        { jp: "まんが", es: "manga" },
        { jp: "ユーチューブ", es: "YouTube" },
        { jp: "ゲーム", es: "videojuegos" },
        { jp: "クラス", es: "la clase" },
      ] }],
    },
  },

  // ── 10 ───────────────────────────────────────────────────────────────────
  {
    id: 10,
    kana: "すきな どうぶつ",
    prompt: "¿Cuál es tu animal favorito? ¿Por qué?",
    detalle: {
      patron: "[どうぶつ] が すきです  /  〜を かっています",
      explicacion:
        "「〜が すきです」= me gusta〜. Para dar la razón: agrega 「〜から」al final. Si tienes mascota: 「〜を かっています」= tengo〜 de mascota (literalmente «crío»). El nombre de la mascota: 「なまえは〜です」.",
      comoResponder:
        "Di tu animal favorito y por qué. Si tienes mascota, ¡cuéntanos sobre ella! Hasta el nombre vale.",
      vocabulario: [
        "いぬ = perro",
        "ねこ = gato",
        "うさぎ = conejo",
        "とり = pájaro",
        "かわいい = adorable",
        "かしこい = inteligente",
        "〜を かっています = tengo〜 de mascota",
        "もふもふ = esponjoso/a (expresión lindo en japonés)",
      ],
      ejemplos: [
        {
          texto: "いぬが すきです！かわいいから。",
          espanol: "¡Me gustan los perros! Porque son adorables.",
          nivel: "básico",
        },
        {
          texto: "うちで ねこを かっています。なまえは ポテトです。",
          espanol: "Tengo un gato de mascota. Se llama Potato.",
          nivel: "básico",
        },
        {
          texto: "わたしは うさぎが いちばん すきです。もふもふで、かわいいから！",
          espanol: "Los conejos me gustan más que nada. ¡Son esponjosos y adorables!",
          nivel: "medio",
        },
        {
          texto: "いぬを かっています。なまえは チョコで、まいにち いっしょに さんぽします。とても かしこいです。",
          espanol: "Tengo un perro. Se llama Choco y todos los días salimos a caminar juntos. Es muy inteligente.",
          nivel: "medio",
        },
      ],
    },
    plantilla: {
      estructura: "{{ANIMAL}} が すきです！",
      estructuraEs: "¡Me gustan {{ANIMAL}}!",
      slots: [{ id: "ANIMAL", etiqueta: "animal", opciones: [
        { jp: "いぬ", es: "los perros" },
        { jp: "ねこ", es: "los gatos" },
        { jp: "うさぎ", es: "los conejos" },
        { jp: "とり", es: "los pájaros" },
        { jp: "パンダ", es: "los pandas" },
        { jp: "ペンギン", es: "los pingüinos" },
      ] }],
    },
  },

  // ── 11 ───────────────────────────────────────────────────────────────────
  {
    id: 11,
    kana: "すきな きせつ",
    prompt: "¿Cuál es tu estación del año favorita y por qué?",
    detalle: {
      patron: "[きせつ] が いちばん すきです  /  〜から",
      explicacion:
        "「いちばん」= el/la más (superlativo). Fórmula completa: 「〜が いちばん すきです。〜から。」La razón al final con 「から」es muy natural en japonés hablado. También puedes describir qué haces en esa estación.",
      comoResponder:
        "Di tu estación favorita y da una razón. Si quieres, menciona algo que haces o que te pasa en esa época.",
      vocabulario: [
        "はる = primavera",
        "なつ = verano",
        "あき = otoño",
        "ふゆ = invierno",
        "いちばん = el/la más",
        "すずしい = fresco/a",
        "あたたかい = cálido/a, templado",
        "〜ことが できる = poder hacer〜",
      ],
      ejemplos: [
        {
          texto: "なつが すきです！",
          espanol: "¡Me gusta el verano!",
          nivel: "básico",
        },
        {
          texto: "あきが いちばん すきです。すずしいから。",
          espanol: "El otoño me gusta más. Porque es fresco.",
          nivel: "básico",
        },
        {
          texto: "はるが すきです。{花|はな}が きれいで、あたたかいから。",
          espanol: "Me gusta la primavera. Porque las flores son bonitas y hace calor.",
          nivel: "medio",
        },
        {
          texto: "なつが いちばん すきです。うみに いったり、アイスを たべたりできるから！",
          espanol: "El verano me gusta más de todo. ¡Porque puedo ir al mar y comer helado!",
          nivel: "medio",
        },
      ],
    },
    plantilla: {
      estructura: "{{SEASON}} が いちばん すきです。",
      estructuraEs: "{{SEASON}} es lo que más me gusta.",
      slots: [{ id: "SEASON", etiqueta: "estación", opciones: [
        { jp: "はる", es: "la primavera" },
        { jp: "なつ", es: "el verano" },
        { jp: "あき", es: "el otoño" },
        { jp: "ふゆ", es: "el invierno" },
      ] }],
    },
  },

  // ── 12 ───────────────────────────────────────────────────────────────────
  {
    id: 12,
    kana: "こどもの ころ",
    prompt: "¿Qué recuerdas de cuando eras niño/a?",
    detalle: {
      patron: "こどもの ころ 〜が すきでした  /  よく 〜ていました",
      explicacion:
        "Pasado de adjetivos: 「すきです → すきでした」, 「たのしいです → たのしかったです」. Acciones habituales en el pasado: 「よく 〜ていました」= solía hacer〜 con frecuencia. 「むかし」= antes, en el pasado.",
      comoResponder:
        "Comparte algo que te gustaba o hacías de niño/a. ¡Cuanto más personal, más interesante para la comunidad!",
      vocabulario: [
        "こどもの ころ = cuando era niño/a",
        "むかし = antes, en el pasado",
        "よく = con frecuencia, mucho",
        "〜が すきでした = me gustaba〜",
        "よく 〜ていました = solía〜",
        "あそぶ = jugar",
        "いまは = ahora (contraste con antes)",
      ],
      ejemplos: [
        {
          texto: "こどもの ころ、アイスが だいすきでした！",
          espanol: "¡Cuando era niño/a, me encantaba el helado!",
          nivel: "básico",
        },
        {
          texto: "むかし、よく そとで あそんでいました。",
          espanol: "Antes solía jugar mucho afuera.",
          nivel: "básico",
        },
        {
          texto: "こどもの ころ、まいにち ともだちと こうえんで あそんでいました。たのしかったです。",
          espanol: "Cuando era niño/a, todos los días jugaba con amigos en el parque. Era divertido.",
          nivel: "medio",
        },
        {
          texto: "むかしは にんじんが きらいでしたが、いまは すきです。おとなに なりましたね。",
          espanol: "Antes no me gustaban las zanahorias, pero ahora me gustan. Ya crecí, ¿verdad?",
          nivel: "medio",
        },
      ],
    },
    plantilla: {
      estructura: "こどものころ、{{THING}} が すきでした。",
      estructuraEs: "De niño/a, me gustaba {{THING}}.",
      slots: [{ id: "THING", etiqueta: "cosa", opciones: [
        { jp: "アニメ", es: "el anime" },
        { jp: "ゲーム", es: "los videojuegos" },
        { jp: "サッカー", es: "el fútbol" },
        { jp: "アイス", es: "el helado" },
        { jp: "まんが", es: "el manga" },
      ] }],
    },
  },

  // ── 13 ───────────────────────────────────────────────────────────────────
  {
    id: 13,
    kana: "いま きいている おんがく",
    prompt: "¿Qué música estás escuchando últimamente?",
    detalle: {
      patron: "〜を きいています  /  さいきん 〜ています",
      explicacion:
        "「〜を きいています」= estoy escuchando〜 (ahora o como hábito reciente). 「さいきん」= recientemente. Para recomendar: 「ぜひ きいてみてください！」= ¡por favor escúchalo!",
      comoResponder:
        "Di qué artista o canción escuchas. Si quieres, explica por qué te gusta o cómo te hace sentir.",
      vocabulario: [
        "さいきん = últimamente, recientemente",
        "かっこいい = cool, impresionante",
        "きもちがいい = se siente bien",
        "ぜひ = definitivamente, por favor",
        "〜してみてください = intenta hacer〜",
        "〜ながら = mientras〜",
        "リピートしています = lo tengo en repeat",
      ],
      ejemplos: [
        {
          texto: "さいきん J-POPを きいています。",
          espanol: "Últimamente estoy escuchando J-Pop.",
          nivel: "básico",
        },
        {
          texto: "BTS が すきです！",
          espanol: "¡Me gusta BTS!",
          nivel: "básico",
        },
        {
          texto: "Official髭男dismの きょくを リピートしています。とても かっこいいです！",
          espanol: "Tengo en repeat canciones de Official Hige Dandism. ¡Son muy cool!",
          nivel: "medio",
        },
        {
          texto: "アニメの OSTを べんきょうしながら きいています。きもちがいいし、にほんごの れんしゅうにも なります。ぜひ ためしてみてください！",
          espanol: "Escucho OST de anime mientras estudio. Se siente bien y además sirve de práctica de japonés. ¡Por favor pruébalo!",
          nivel: "medio",
        },
      ],
    },
    plantilla: {
      estructura: "さいきん {{GENRE}} を きいています。",
      estructuraEs: "Últimamente escucho {{GENRE}}.",
      slots: [{ id: "GENRE", etiqueta: "género", opciones: [
        { jp: "J-POP", es: "J-Pop" },
        { jp: "ロック", es: "rock" },
        { jp: "K-POP", es: "K-Pop" },
        { jp: "アニメのうた", es: "canciones de anime" },
        { jp: "クラシック", es: "música clásica" },
      ] }],
    },
  },

  // ── 14 ───────────────────────────────────────────────────────────────────
  {
    id: 14,
    kana: "ゆめのしごと",
    prompt: "¿Cuál es el trabajo de tus sueños?",
    detalle: {
      patron: "[しごと] に なりたいです  /  〜たいと おもっています",
      explicacion:
        "Para decir qué quieres ser: 「〜に なりたいです」= quiero ser〜. Para algo más suave o en progreso de decisión: 「〜に なりたいと おもっています」= estoy pensando en ser〜. Con razón: 「〜から」al final.",
      comoResponder:
        "Comparte tu trabajo soñado. Puedes agregar por qué o qué harías en ese trabajo. ¡No hay respuesta incorrecta!",
      vocabulario: [
        "〜に なりたい = quiero ser〜",
        "せんせい = maestro/a",
        "いしゃ = médico/a",
        "エンジニア = ingeniero/a",
        "デザイナー = diseñador/a",
        "しょうらい = en el futuro",
        "〜と おもっています = estoy pensando en〜",
        "ひとを たすける = ayudar a las personas",
      ],
      ejemplos: [
        {
          texto: "せんせいに なりたいです。",
          espanol: "Quiero ser maestro/a.",
          nivel: "básico",
        },
        {
          texto: "デザイナーに なりたいです。えを かくのが すきだから。",
          espanol: "Quiero ser diseñador/a. Porque me gusta dibujar.",
          nivel: "básico",
        },
        {
          texto: "しょうらい エンジニアに なりたいと おもっています。プログラミングが おもしろいから。",
          espanol: "En el futuro estoy pensando en ser ingeniero/a. Porque la programación es interesante.",
          nivel: "medio",
        },
        {
          texto: "まだ よく わかりませんが、ひとを たすける しごとが したいです。いつか かんごしに なれたら いいな。",
          espanol: "Todavía no sé bien, pero quiero un trabajo que ayude a las personas. Algún día espero poder ser enfermero/a.",
          nivel: "medio",
        },
      ],
    },
    plantilla: {
      estructura: "{{JOB}} に なりたいです。",
      estructuraEs: "Quiero ser {{JOB}}.",
      slots: [{ id: "JOB", etiqueta: "trabajo", opciones: [
        { jp: "せんせい", es: "maestro/a" },
        { jp: "いしゃ", es: "doctor/a" },
        { jp: "エンジニア", es: "ingeniero/a" },
        { jp: "デザイナー", es: "diseñador/a" },
        { jp: "つうやく", es: "intérprete" },
      ] }],
    },
  },

  // ── 15 ───────────────────────────────────────────────────────────────────
  {
    id: 15,
    kana: "にほんに いったら",
    prompt: "Si pudieras ir a Japón, ¿qué harías o comerías?",
    detalle: {
      patron: "にほんで 〜たいです  /  [place] に いって、〜たいです",
      explicacion:
        "Forma simple: 「にほんで〜したいです」= quiero hacer〜 en Japón. Más estructura: 「[ばしょ] に いって、〜したいです」= quiero ir a [lugar] y〜. Si conoces la forma condicional: 「もし にほんに いったら、〜」.",
      comoResponder:
        "¿A dónde irías? ¿Qué comerías? ¿A quién querrías conocer? ¡Sueña en japonés!",
      vocabulario: [
        "きょうと = Kioto",
        "おおさか = Osaka",
        "とうきょう = Tokio",
        "おてら = templo budista",
        "コンビニ = convenience store",
        "〜に いってみたい = quiero intentar ir a〜",
        "〜を たべてみたい = quiero probar〜",
        "じっさいに = en persona, de verdad",
      ],
      ejemplos: [
        {
          texto: "にほんで ラーメンが たべたいです！",
          espanol: "¡Quiero comer ramen en Japón!",
          nivel: "básico",
        },
        {
          texto: "きょうとに いって、おてらを みたいです。",
          espanol: "Quiero ir a Kioto y ver templos.",
          nivel: "básico",
        },
        {
          texto: "もし にほんに いったら、まず コンビニに いきます。なんでも たべてみたいです！",
          espanol: "Si voy a Japón, primero voy al convenience store. ¡Quiero probar de todo!",
          nivel: "medio",
        },
        {
          texto: "おおさかに いって、たこやきを たべながら どとんぼりを あるいてみたいです。にほんの まちを じっさいに みたいです！",
          espanol: "Quiero ir a Osaka, comer takoyaki mientras camino por Dotonbori. ¡Quiero ver las calles de Japón en persona!",
          nivel: "medio",
        },
      ],
    },
    plantilla: {
      estructura: "にほんで {{FOOD}} が たべたいです！",
      estructuraEs: "¡En Japón quiero comer {{FOOD}}!",
      slots: [{ id: "FOOD", etiqueta: "comida", opciones: [
        { jp: "ラーメン", es: "ramen" },
        { jp: "すし", es: "sushi" },
        { jp: "たこやき", es: "takoyaki" },
        { jp: "やきとり", es: "yakitori" },
        { jp: "おにぎり", es: "onigiri" },
      ] }],
    },
  },

  // ── 16 ───────────────────────────────────────────────────────────────────
  {
    id: 16,
    kana: "けさ なにをした？",
    prompt: "¿Qué hiciste esta mañana? Cuéntanos tu mañana",
    detalle: {
      patron: "けさ 〜ました  /  まず〜、それから〜",
      explicacion:
        "「けさ」= esta mañana. Para contar en orden: 「まず」(primero) → 「それから」(después) → 「さいごに」(por último). Si no hiciste algo: 「〜ませんでした」o simplemente 「なにも たべませんでした」.",
      comoResponder:
        "Cuenta 1 a 3 cosas que hiciste esta mañana. ¡Puede ser algo muy cotidiano como levantarte o desayunar!",
      vocabulario: [
        "けさ = esta mañana",
        "まず = primero",
        "それから = después, luego",
        "さいごに = por último",
        "おきました = me levanté",
        "シャワーを あびました = me bañé",
        "なにも〜ませんでした = no〜 nada",
        "いそがしくて = estaba ocupado/a y...",
      ],
      ejemplos: [
        {
          texto: "けさ パンを たべました。",
          espanol: "Esta mañana comí pan.",
          nivel: "básico",
        },
        {
          texto: "けさは いそがしくて、なにも たべませんでした。",
          espanol: "Esta mañana estaba ocupado/a y no comí nada.",
          nivel: "básico",
        },
        {
          texto: "まず コーヒーを のんで、それから シャワーを あびました。",
          espanol: "Primero tomé café, después me bañé.",
          nivel: "medio",
        },
        {
          texto: "けさは はやく おきて、ストレッチを して、たまごと トーストを たべました。げんきな あさです！",
          espanol: "Esta mañana me levanté temprano, hice stretching y comí huevo con tostadas. ¡Una mañana saludable!",
          nivel: "medio",
        },
      ],
    },
    plantilla: {
      estructura: "けさ {{BREAKFAST}}ました。",
      estructuraEs: "Esta mañana {{BREAKFAST}}.",
      slots: [{ id: "BREAKFAST", etiqueta: "desayuno", opciones: [
        { jp: "パンを たべ", es: "comí pan" },
        { jp: "コーヒーを のみ", es: "tomé café" },
        { jp: "たまごを たべ", es: "comí huevo" },
        { jp: "フルーツを たべ", es: "comí fruta" },
        { jp: "ごはんを たべ", es: "comí arroz" },
      ] }],
    },
  },

  // ── 17 ───────────────────────────────────────────────────────────────────
  {
    id: 17,
    kana: "おすすめの もの",
    prompt: "¿Qué recomiendas? App, série, comida, lugar...",
    detalle: {
      patron: "〜は いいですよ！  /  ぜひ 〜てみてください",
      explicacion:
        "「〜は いいですよ」= es bueno, te lo recomiendo. El 「よ」al final da énfasis y calidez. Para invitar directamente: 「ぜひ 〜てみてください！」= ¡definitivamente intenta〜! Natural en conversación.",
      comoResponder:
        "Recomienda algo específico (app, serie, canción, restaurante, lugar...) y di brevemente por qué. ¡Sé tu propio reseñador!",
      vocabulario: [
        "ぜひ = definitivamente, ¡por favor!",
        "〜てみてください = intenta〜",
        "〜は いいですよ = te lo recomiendo",
        "おもしろい = interesante, entretenido",
        "きっと すきに なります = seguro te va a gustar",
        "〜に はまっています = estoy enganchado/a con〜",
        "ためしてみてください = pruébalo",
      ],
      ejemplos: [
        {
          texto: "このアプリは いいですよ！",
          espanol: "¡Esta app es buena!",
          nivel: "básico",
        },
        {
          texto: "「スパイファミリー」は おもしろいです。ぜひ みてみてください！",
          espanol: "\"Spy x Family\" es interesante. ¡Por favor míralo!",
          nivel: "básico",
        },
        {
          texto: "にほんごの べんきょうに、アニメを みるのは いいですよ。きっと たのしくなります！",
          espanol: "Para estudiar japonés, ver anime es bueno. ¡Seguro se vuelve divertido!",
          nivel: "medio",
        },
        {
          texto: "さいきん「よるのないくに」という まんがに はまっています。かなしいですが、きれいな はなしです。ぜひ よんでみてください。",
          espanol: "Últimamente estoy enganchado/a con el manga \"A Silent Voice\". Es triste pero es una historia hermosa. Por favor léanlo.",
          nivel: "medio",
        },
      ],
    },
    plantilla: {
      estructura: "{{THING}} は おすすめです！",
      estructuraEs: "¡Recomiendo {{THING}}!",
      slots: [{ id: "THING", etiqueta: "recomendación", opciones: [
        { jp: "このアニメ", es: "este anime" },
        { jp: "このアプリ", es: "esta app" },
        { jp: "このまんが", es: "este manga" },
        { jp: "このゲーム", es: "este juego" },
        { jp: "このえいが", es: "esta película" },
      ] }],
    },
  },

  // ── 18 ───────────────────────────────────────────────────────────────────
  {
    id: 18,
    kana: "にがてな こと",
    prompt: "¿Hay algo en lo que no eres muy bueno/a? ¡Todos tenemos!",
    detalle: {
      patron: "[こと/もの] が にがてです",
      explicacion:
        "「〜が にがてです」= no soy bueno/a en〜 / me cuesta〜. Es más suave y común que 「きらい」. Para decir que está mejorando: 「すこしずつ よくなっています」. Cierra con 「でも、れんしゅうしています！」para mostrar que sigues adelante.",
      comoResponder:
        "¡Comparte algo que te cuesta! Puede ser gracioso o cotidiano. Nadie es perfecto y eso nos une 🙂",
      consejo:
        "「でも、がんばります！」o 「れんしゅうちゅうです！」= estoy en entrenamiento. ¡Úsalos para terminar positivo!",
      vocabulario: [
        "〜が にがてです = no soy bueno/a en〜",
        "はやおき = madrugar",
        "かたづけ = ordenar, limpiar",
        "りょうり = cocinar",
        "じかんを まもる = ser puntual",
        "すこしずつ よくなっています = poco a poco estoy mejorando",
        "れんしゅうちゅう = en entrenamiento",
      ],
      ejemplos: [
        {
          texto: "はやおきが にがてです。",
          espanol: "Se me dificulta madrugar.",
          nivel: "básico",
        },
        {
          texto: "カタカナが にがてです。むずかしい！",
          espanol: "El katakana se me dificulta. ¡Es difícil!",
          nivel: "básico",
        },
        {
          texto: "りょうりが にがてです。まいにち そとで たべています。。。",
          espanol: "Cocinar se me da mal. Todos los días como afuera...",
          nivel: "medio",
        },
        {
          texto: "じかんを まもるのが にがてで、いつも ちこくして しまいます。でも、すこしずつ よくなっています！",
          espanol: "Se me dificulta ser puntual y siempre llego tarde. ¡Pero poco a poco estoy mejorando!",
          nivel: "medio",
        },
      ],
    },
    plantilla: {
      estructura: "{{THING}} が にがてです。",
      estructuraEs: "Se me dificulta {{THING}}.",
      slots: [{ id: "THING", etiqueta: "cosa difícil", opciones: [
        { jp: "はやおき", es: "madrugar" },
        { jp: "りょうり", es: "cocinar" },
        { jp: "うんどう", es: "el ejercicio" },
        { jp: "すうがく", es: "las matemáticas" },
        { jp: "かたづけ", es: "ordenar" },
      ] }],
    },
  },

  // ── 19 ───────────────────────────────────────────────────────────────────
  {
    id: 19,
    kana: "じぶんの まち",
    prompt: "Describe tu ciudad o pueblo en una oración",
    detalle: {
      patron: "[まち] は [adj] です  /  [まち] には 〜が あります",
      explicacion:
        "Para describir tu ciudad usa adjetivos (「にぎやか」animado, 「しずか」tranquilo). Para mencionar qué hay: 「〜には 〜が あります」. Para decir por qué es famosa: 「〜が ゆうめいです」.",
      comoResponder:
        "Di dónde vives y cómo es. Puedes mencionar algo especial, famoso o curioso de tu ciudad.",
      vocabulario: [
        "にぎやか（な） = animado/a",
        "しずか（な） = tranquilo/a",
        "〜が ゆうめいです = es famoso por〜",
        "〜に すんでいます = vivo en〜",
        "すみやすい = fácil para vivir, acogedor",
        "おおきい = grande",
        "ちいさい = pequeño/a",
      ],
      ejemplos: [
        {
          texto: "メキシコシティに すんでいます。にぎやかな まちです。",
          espanol: "Vivo en Ciudad de México. Es una ciudad muy animada.",
          nivel: "básico",
        },
        {
          texto: "わたしの まちは ちいさいですが、しずかで すきです。",
          espanol: "Mi ciudad es pequeña pero es tranquila y me gusta.",
          nivel: "básico",
        },
        {
          texto: "グアダラハラに すんでいます。たこすが ゆうめいで、ひとが あたたかいです！",
          espanol: "Vivo en Guadalajara. Es famoso por los tacos y la gente es cálida.",
          nivel: "medio",
        },
        {
          texto: "わたしの まちは ちいさいですが、しぜんが おおくて、すみやすいです。とくに そらが きれいです。",
          espanol: "Mi ciudad es pequeña pero hay mucha naturaleza y es fácil para vivir. En especial el cielo es hermoso.",
          nivel: "medio",
        },
      ],
    },
    plantilla: {
      estructura: "わたしの まちは {{ADJ}} です。",
      estructuraEs: "Mi ciudad es {{ADJ}}.",
      slots: [{ id: "ADJ", etiqueta: "cómo es", opciones: [
        { jp: "にぎやか", es: "animada" },
        { jp: "しずか", es: "tranquila" },
        { jp: "おおきい", es: "grande" },
        { jp: "ちいさい", es: "pequeña" },
        { jp: "きれい", es: "bonita" },
      ] }],
    },
  },

  // ── 20 ───────────────────────────────────────────────────────────────────
  {
    id: 20,
    kana: "さいきん たのしかったこと",
    prompt: "¿Qué fue algo divertido o lindo que te pasó recientemente?",
    detalle: {
      patron: "さいきん 〜ました  /  〜て、たのしかったです",
      explicacion:
        "「さいきん」= recientemente. Para contar algo que pasó: 〜ました. Para decir cómo fue: 「〜て、たのしかったです」= hice〜 y fue divertido. Si fue lindo/alegre: 「うれしかったです」.",
      comoResponder:
        "Cuenta algo pequeño o grande que fue lindo recientemente. ¡Un café rico también cuenta!",
      consejo:
        "「〜て、よかったです！」= ¡qué bueno que〜! — muy natural para cerrar con gratitud.",
      vocabulario: [
        "さいきん = recientemente",
        "たのしかった = fue divertido",
        "うれしかった = fue alegre, me alegré",
        "わらいました = me reí",
        "びっくりしました = me sorprendí",
        "ひさしぶりに = después de mucho tiempo",
        "〜て、よかったです = qué bueno que〜",
      ],
      ejemplos: [
        {
          texto: "さいきん おいしい ケーキを たべました！",
          espanol: "¡Últimamente comí un pastel delicioso!",
          nivel: "básico",
        },
        {
          texto: "ともだちと えいがを みて、たのしかったです。",
          espanol: "Vi una película con mi amigo/a y fue divertido.",
          nivel: "básico",
        },
        {
          texto: "きのう ねこが あそびに きて、とても うれしかったです。かわいすぎる！",
          espanol: "Ayer vino un gato a jugar y me alegré muchísimo. ¡Es demasiado adorable!",
          nivel: "medio",
        },
        {
          texto: "ひさしぶりに こうこうの ともだちに れんらくして、いっしょに ごはんを たべました。なつかしくて、たのしかったです！",
          espanol: "Después de mucho tiempo me contacté con un amigo de prepa y comimos juntos. ¡Fue nostálgico y divertido!",
          nivel: "medio",
        },
      ],
    },
    plantilla: {
      estructura: "さいきん {{THING}} が たのしかったです。",
      estructuraEs: "Últimamente {{THING}} estuvo divertido.",
      slots: [{ id: "THING", etiqueta: "qué cosa", opciones: [
        { jp: "えいが", es: "la película" },
        { jp: "りょこう", es: "el viaje" },
        { jp: "ゲーム", es: "el videojuego" },
        { jp: "パーティー", es: "la fiesta" },
        { jp: "ともだちとのじかん", es: "el rato con amigos" },
      ] }],
    },
  },

  // ── 21 ───────────────────────────────────────────────────────────────────
  {
    id: 21,
    kana: "わたしの へや",
    prompt: "Describe algo de tu cuarto o tu espacio favorito",
    detalle: {
      patron: "[もの] が あります  /  〜の うえ/した に あります",
      explicacion:
        "「あります」= hay (cosas). Para posición: 「[もの] の うえ/した/そば に あります」. Describe cómo se siente el lugar: 「ちらかっています」(está desordenado), 「くつろげます」(puedo relajarme).",
      comoResponder:
        "Describe algo de tu cuarto o tu rincón favorito. ¿Qué hay? ¿Cómo es? ¿Qué cosa tuya te gusta más?",
      vocabulario: [
        "つくえ = escritorio",
        "ベッド = cama",
        "まど = ventana",
        "ポスター = póster",
        "ちらかっています = está desordenado",
        "きれい（な） = bonito/limpio",
        "くつろげます = puedo relajarme",
        "〜の うえに = encima de〜",
      ],
      ejemplos: [
        {
          texto: "わたしの へやに ねこが います。",
          espanol: "Hay un gato en mi cuarto.",
          nivel: "básico",
        },
        {
          texto: "つくえの うえに ほんが たくさん あります。",
          espanol: "Encima del escritorio hay muchos libros.",
          nivel: "básico",
        },
        {
          texto: "わたしの へやは せまいですが、すきな ポスターが たくさん あって、きもちいいです。",
          espanol: "Mi cuarto es pequeño pero hay muchos pósters que me gustan y se siente bien.",
          nivel: "medio",
        },
        {
          texto: "まどから ゆうひが みえます。まいにち みています。すきな じかんです。",
          espanol: "Desde la ventana se puede ver el atardecer. Lo veo todos los días. Es mi momento favorito.",
          nivel: "medio",
        },
      ],
    },
    plantilla: {
      estructura: "わたしの へやに {{THING}} が あります。",
      estructuraEs: "En mi cuarto hay {{THING}}.",
      slots: [{ id: "THING", etiqueta: "qué cosa", opciones: [
        { jp: "ほん", es: "libros" },
        { jp: "ポスター", es: "pósters" },
        { jp: "まんが", es: "manga" },
        { jp: "ぬいぐるみ", es: "peluches" },
        { jp: "ギター", es: "una guitarra" },
      ] }],
    },
  },

  // ── 22 ───────────────────────────────────────────────────────────────────
  {
    id: 22,
    kana: "ともだちの こと",
    prompt: "Cuéntanos sobre un amigo o amiga especial",
    detalle: {
      patron: "[なまえ] は [adj] です  /  いつも 〜てくれます",
      explicacion:
        "Para describir a alguien combina adjetivos: 「やさしくて、おもしろいです」. Para decir algo que hace por ti habitualmente: 「いつも [verb] てくれます」= siempre (me) hace〜. Muy expresivo en japonés.",
      comoResponder:
        "¿Cómo se llama? ¿Cómo es? ¿Qué hacen juntos? ¡Puede ser un amigo, familiar o mascota!",
      vocabulario: [
        "しんゆう = mejor amigo/a",
        "〜ねん まえから の ともだち = amigo/a desde hace〜 años",
        "いつも = siempre",
        "〜てくれます = (él/ella) hace〜 por mí",
        "たすけてくれます = me ayuda",
        "わらわせてくれます = me hace reír",
        "くだらない はなし = pláticas sin sentido (con cariño)",
      ],
      ejemplos: [
        {
          texto: "わたしには しんゆうが います。やさしいです。",
          espanol: "Tengo un/a mejor amigo/a. Es amable.",
          nivel: "básico",
        },
        {
          texto: "ともだちの なまえは アナです。おもしろくて、すきです！",
          espanol: "Mi amigo/a se llama Ana. Es gracioso/a y me cae bien.",
          nivel: "básico",
        },
        {
          texto: "こうこうの ときから の ともだちが います。いつも たすけてくれます。",
          espanol: "Tengo un amigo/a desde la prepa. Siempre me ayuda.",
          nivel: "medio",
        },
        {
          texto: "しんゆうと は くだらない はなしで いつも わらっています。いると たのしいし、いないと さみしいです。",
          espanol: "Con mi mejor amigo/a siempre nos reímos de pláticas sin sentido. Cuando está es divertido y cuando no está, me falta.",
          nivel: "medio",
        },
      ],
    },
    plantilla: {
      estructura: "わたしの ともだちは {{ADJ}} です。",
      estructuraEs: "Mi amigo/a es {{ADJ}}.",
      slots: [{ id: "ADJ", etiqueta: "cómo es", opciones: [
        { jp: "やさしい", es: "amable" },
        { jp: "おもしろい", es: "gracioso/a" },
        { jp: "げんき", es: "enérgico/a" },
        { jp: "しんせつ", es: "bondadoso/a" },
        { jp: "かわいい", es: "lindo/a" },
      ] }],
    },
  },

  // ── 23 ───────────────────────────────────────────────────────────────────
  {
    id: 23,
    kana: "にほんごを まなぶ わけ",
    prompt: "¿Por qué estás aprendiendo japonés?",
    detalle: {
      patron: "〜から べんきょうしています  /  〜ために べんきょうしています",
      explicacion:
        "「〜から」= porque〜 (razón directa). Para una meta: 「〜ために べんきょうしています」= estudio para〜. Para suavizar tu opinión: 「〜と おもっています」= pienso que〜. Ambas formas son muy naturales.",
      comoResponder:
        "Tu razón para aprender japonés, ¡por más simple que sea! Todas son válidas y la comunidad quiere saber.",
      consejo:
        "「むずかしいですが、たのしいです！」= es difícil pero ¡es divertido! — ¡el mantra del estudiante de japonés!",
      vocabulario: [
        "〜ために = para〜 (meta)",
        "アニメ/まんが = anime/manga",
        "ゆめ = sueño, meta de vida",
        "〜に はまった = me enganché con〜",
        "もっと しりたい = quiero saber más",
        "むずかしいですが = aunque es difícil",
        "たのしい = divertido/a",
      ],
      ejemplos: [
        {
          texto: "アニメが すきだから、べんきょうしています。",
          espanol: "Porque me gusta el anime, estudio.",
          nivel: "básico",
        },
        {
          texto: "にほんに いきたいから、べんきょうしています。",
          espanol: "Estudio porque quiero ir a Japón.",
          nivel: "básico",
        },
        {
          texto: "こどもの ころ アニメを みて、にほんごに はまりました。ゆめは にほんで はたらくことです！",
          espanol: "De niño/a vi anime y me enganché con el japonés. ¡Mi sueño es trabajar en Japón!",
          nivel: "medio",
        },
        {
          texto: "むずかしいですが、にほんごを まなぶのは たのしいです。ことばを ひとつ おぼえるたびに、うれしくなります。",
          espanol: "Aunque es difícil, aprender japonés es divertido. Cada vez que aprendo una palabra, me alegro.",
          nivel: "medio",
        },
      ],
    },
    plantilla: {
      estructura: "{{REASON}}から、にほんごを べんきょうしています。",
      estructuraEs: "Estudio japonés porque {{REASON}}.",
      slots: [{ id: "REASON", etiqueta: "razón", opciones: [
        { jp: "アニメが すきだ", es: "me gusta el anime" },
        { jp: "にほんに いきたい", es: "quiero ir a Japón" },
        { jp: "ゲームが すきだ", es: "me gustan los videojuegos" },
        { jp: "ぶんかが すきだ", es: "me gusta la cultura" },
      ] }],
    },
  },

  // ── 24 ───────────────────────────────────────────────────────────────────
  {
    id: 24,
    kana: "いちにちで すきな じかん",
    prompt: "¿Cuál es tu momento favorito del día y qué haces?",
    detalle: {
      patron: "〜とき、〜です  /  〜じかんが いちばん すきです",
      explicacion:
        "「〜とき」= cuando〜. Ejemplo: 「コーヒーを のむとき、しずかです」= cuando tomo café, está tranquilo. Para decir cuándo es el momento: 「あさ/ひる/よる」. Para relajarse: 「ゆっくりできます」o 「ほっとします」.",
      comoResponder:
        "Di cuándo es tu momento favorito del día (mañana, tarde, noche) y qué haces en ese momento.",
      vocabulario: [
        "あさ = mañana",
        "ひる = mediodía",
        "よる = noche",
        "〜とき = cuando〜",
        "ほっとします = me relajo, me siento aliviado",
        "ゆっくり できます = puedo ir despacio, relajarme",
        "ひとりで = solo/a",
        "しずか（な） = tranquilo/a",
      ],
      ejemplos: [
        {
          texto: "よるが すきです。しずかだから。",
          espanol: "Me gusta la noche. Porque está tranquilo.",
          nivel: "básico",
        },
        {
          texto: "ねる まえの じかんが いちばん すきです。",
          espanol: "El momento antes de dormir es el que más me gusta.",
          nivel: "básico",
        },
        {
          texto: "あさ コーヒーを のみながら そとを みるとき、しずかで ほっとします。",
          espanol: "Cuando tomo café por las mañanas viendo afuera, está tranquilo y me siento aliviado/a.",
          nivel: "medio",
        },
        {
          texto: "よる ひとりで ゆっくり できる じかんが いちばん すきです。すきな おんがくを かけながら、くつろいでいます。",
          espanol: "El tiempo para relajarme solo/a por la noche es el que más me gusta. Me relajo poniendo la música que me gusta.",
          nivel: "medio",
        },
      ],
    },
    plantilla: {
      estructura: "{{TIME}} が いちばん すきです。",
      estructuraEs: "{{TIME}} es mi momento favorito.",
      slots: [{ id: "TIME", etiqueta: "momento", opciones: [
        { jp: "あさ", es: "la mañana" },
        { jp: "よる", es: "la noche" },
        { jp: "ひるごはん", es: "la hora de comer" },
        { jp: "ねるまえ", es: "antes de dormir" },
      ] }],
    },
  },

  // ── 25 ───────────────────────────────────────────────────────────────────
  {
    id: 25,
    kana: "いまの じぶんへ",
    prompt: "¿Qué mensaje de ánimo te darías a ti mismo/a?",
    detalle: {
      patron: "がんばれ！  /  〜できる！  /  だいじょうぶ。",
      explicacion:
        "「がんばれ！」= ¡ánimo! / ¡échale ganas! (forma de comando). Más suave: 「がんばって！」. Para decir «puedes lograrlo»: 「〜できる！」o 「〜できるよ！」. Consuelo: 「だいじょうぶ」= está bien, no te preocupes.",
      comoResponder:
        "Escríbete una frase de ánimo en japonés. Puede ser cortita: ¡¡「がんばれ！できる！」ya es perfecta!!",
      consejo:
        "「すこしずつ でいい。」= Está bien ir poco a poco. 🌱 — Una frase pequeña muy poderosa.",
      vocabulario: [
        "がんばれ！/ がんばって！= ¡ánimo!",
        "だいじょうぶ = está bien, no te preocupes",
        "できる！= ¡puedes!, ¡sí se puede!",
        "すこしずつ = poco a poco",
        "しんじて = confía (en ti)",
        "あきらめないで = no te rindas",
        "ゆっくり でいい = está bien ir despacio",
      ],
      ejemplos: [
        {
          texto: "がんばれ！できるよ！",
          espanol: "¡Ánimo! ¡Puedes lograrlo!",
          nivel: "básico",
        },
        {
          texto: "だいじょうぶ。すこしずつ でいい。",
          espanol: "Está bien. Poco a poco está bien.",
          nivel: "básico",
        },
        {
          texto: "まいにち がんばっているね。じぶんを しんじて！きっと できる。",
          espanol: "Todos los días te estás esforzando. ¡Confía en ti mismo/a! Seguro puedes lograrlo.",
          nivel: "medio",
        },
        {
          texto: "にほんごは むずかしいけど、まいにち すこしずつ すすんでいる。ゆっくり でいいから、あきらめないで。",
          espanol: "El japonés es difícil, pero todos los días estás avanzando poco a poco. Está bien ir despacio, así que no te rindas.",
          nivel: "medio",
        },
      ],
    },
    plantilla: {
      estructura: "{{MSG}}！",
      estructuraEs: "¡{{MSG}}!",
      slots: [{ id: "MSG", etiqueta: "mensaje", opciones: [
        { jp: "がんばれ", es: "tú puedes" },
        { jp: "だいじょうぶ", es: "todo está bien" },
        { jp: "できるよ", es: "sí se puede" },
        { jp: "あきらめないで", es: "no te rindas" },
      ] }],
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Busca un tema por id */
export function getTemaPorId(id: number): TemaSemana | undefined {
  return TEMAS_SEMANA.find((t) => t.id === id);
}

/** Devuelve el tema que corresponde a la semana ISO actual */
export function getTemaDeLaSemana(): TemaSemana {
  const d = new Date();
  const startOfYear = new Date(Date.UTC(d.getFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7);
  return TEMAS_SEMANA[week % TEMAS_SEMANA.length];
}
