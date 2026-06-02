/**
 * Banco de Temas de la Semana — Nihongo Feed
 *
 * 25 temas para PRINCIPIANTES (A1, Genki I).
 * Cada tema es un mini-tutorial guiado de 5 pasos que termina en un post.
 *
 * Convenciones:
 *  - El japonés va con ESPACIOS entre palabras para que un principiante
 *    pueda leerlo sin "bola de hiragana".
 *  - Notación de furigana: {漢字|ふりがな}
 *  - extensiones: 3 frases cortas opcionales para "bolt-on" al post
 *  - fotoSugerencia: invitación de foto temática
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type FraseBilingue = {
  jp: string;   // japonés con espacios entre palabras
  es: string;   // traducción al español
};

export type OpcionSlot = {
  jp: string;
  es: string;
};

export type SlotPlantilla = {
  id: string;
  etiqueta: string;
  opciones: OpcionSlot[];
};

export type PlantillaTema = {
  estructura: string;
  estructuraEs: string;
  slots: SlotPlantilla[];
};

export type TemaSemana = {
  id: number;
  kana: string;
  prompt: string;
  meta: string;                   // 1 línea: qué vas a aprender
  patron: FraseBilingue;          // patrón con "___"
  nota: string;                   // explicación de 1 línea
  ejemplo: FraseBilingue;         // un ejemplo modelo
  extensiones: FraseBilingue[];   // 3 frases cortas para bolt-on
  fotoSugerencia: string;         // invitación temática de foto
  plantilla: PlantillaTema;
};

// ── Banco de temas ──────────────────────────────────────────────────────────────

export const TEMAS_SEMANA: TemaSemana[] = [

  {
    id: 1,
    kana: "きょうの きもち",
    prompt: "¿Cómo te sientes hoy?",
    meta: "Aprende a decir cómo te sientes hoy.",
    patron: { jp: "きょうは ___ です。", es: "Hoy estoy ___." },
    nota: "Solo cambia la palabra del centro. 「です」hace la frase educada.",
    ejemplo: { jp: "きょうは たのしい です！", es: "¡Hoy estoy feliz!" },
    extensiones: [
      { jp: "でも、がんばります！", es: "¡Pero voy a echarle ganas!" },
      { jp: "あなた は どう です か？", es: "¿Y tú cómo estás?" },
      { jp: "はやく よる に なって ほしい です。", es: "Quiero que sea de noche ya." },
    ],
    fotoSugerencia: "¿Foto de cómo está tu día hoy?",
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
        { jp: "きんちょう", es: "nervioso/a" },
        { jp: "しあわせ", es: "feliz/contento/a" },
      ] }],
    },
  },

  {
    id: 2,
    kana: "すきな たべもの",
    prompt: "¿Qué comida te encanta?",
    meta: "Aprende a decir qué comida te gusta.",
    patron: { jp: "___ が すき です。", es: "Me gusta ___." },
    nota: "「が すき です」significa «me gusta». La comida va al principio.",
    ejemplo: { jp: "ラーメン が すき です！", es: "¡Me gusta el ramen!" },
    extensiones: [
      { jp: "とても おいしい です！", es: "¡Está riquísimo!" },
      { jp: "いつか たべたい です。", es: "Algún día quiero probarlo." },
      { jp: "あなた は なに が すき です か？", es: "¿Y tú, qué te gusta?" },
    ],
    fotoSugerencia: "¡Agrega foto de tu comida favorita!",
    plantilla: {
      estructura: "{{FOOD}} が すき です！",
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
        { jp: "やきとり", es: "el yakitori" },
        { jp: "てんぷら", es: "la tempura" },
      ] }],
    },
  },

  {
    id: 3,
    kana: "わたしの かぞく",
    prompt: "Preséntanos a tu familia",
    meta: "Aprende a describir a un familiar.",
    patron: { jp: "___ は ___ です。", es: "Mi ___ es ___." },
    nota: "「は」marca de quién hablas. Al final dices cómo es.",
    ejemplo: { jp: "ちち は やさしい です。", es: "Mi papá es amable." },
    extensiones: [
      { jp: "だいすき です！", es: "¡Lo/la quiero mucho!" },
      { jp: "いつも ありがとう。", es: "Siempre gracias." },
      { jp: "あなた の かぞく は どう です か？", es: "¿Y tu familia?" },
    ],
    fotoSugerencia: "¿Tienes foto con esa persona?",
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
          { jp: "そふ", es: "abuelo" },
          { jp: "そぼ", es: "abuela" },
        ] },
        { id: "ADJ", etiqueta: "cómo es", opciones: [
          { jp: "やさしい", es: "amable" },
          { jp: "おもしろい", es: "gracioso/a" },
          { jp: "げんき", es: "enérgico/a" },
          { jp: "かわいい", es: "lindo/a" },
          { jp: "きびしい", es: "estricto/a" },
          { jp: "しずか", es: "tranquilo/a" },
          { jp: "いそがしい", es: "ocupado/a" },
        ] },
      ],
    },
  },

  {
    id: 4,
    kana: "まいにちの こと",
    prompt: "¿Qué haces todos los días?",
    meta: "Aprende a decir un hábito diario.",
    patron: { jp: "まいにち ___。", es: "Todos los días ___." },
    nota: "「まいにち」significa «todos los días». Luego va la acción.",
    ejemplo: { jp: "まいにち コーヒー を のみます。", es: "Todos los días tomo café." },
    extensiones: [
      { jp: "たのしい です！", es: "¡Es divertido!" },
      { jp: "たいへん です が、がんばります。", es: "Es difícil, pero me esfuerzo." },
      { jp: "あなた は まいにち なに を します か？", es: "¿Y tú qué haces cada día?" },
    ],
    fotoSugerencia: "¿Foto de tu hábito favorito del día?",
    plantilla: {
      estructura: "まいにち {{ACTIVITY}}。",
      estructuraEs: "Todos los días {{ACTIVITY}}.",
      slots: [{ id: "ACTIVITY", etiqueta: "actividad", opciones: [
        { jp: "コーヒー を のみます", es: "tomo café" },
        { jp: "べんきょう します", es: "estudio" },
        { jp: "うんどう します", es: "hago ejercicio" },
        { jp: "アニメ を みます", es: "veo anime" },
        { jp: "おんがく を ききます", es: "escucho música" },
        { jp: "さんぽ します", es: "salgo a caminar" },
        { jp: "ほん を よみます", es: "leo un libro" },
        { jp: "シャワー を あびます", es: "me baño" },
      ] }],
    },
  },

  {
    id: 5,
    kana: "しゅうまつの こと",
    prompt: "¿Qué hiciste el fin de semana?",
    meta: "Aprende a contar qué hiciste.",
    patron: { jp: "しゅうまつ、___ ました。", es: "El fin de semana ___." },
    nota: "「〜ました」es pasado: significa «hice...».",
    ejemplo: { jp: "しゅうまつ、えいが を み ました。", es: "El fin de semana vi una película." },
    extensiones: [
      { jp: "たのしかった です！", es: "¡Estuvo divertido!" },
      { jp: "また いきたい です。", es: "Quiero volver." },
      { jp: "つかれました が、よかった です。", es: "Me cansé, pero estuvo bien." },
    ],
    fotoSugerencia: "¿Tienes foto del fin de semana?",
    plantilla: {
      estructura: "しゅうまつ、{{ACTION}}ました。",
      estructuraEs: "El fin de semana {{ACTION}}.",
      slots: [{ id: "ACTION", etiqueta: "qué hiciste", opciones: [
        { jp: "えいが を み", es: "vi una película" },
        { jp: "ともだち と あい", es: "vi a un amigo/a" },
        { jp: "うち で やすみ", es: "descansé en casa" },
        { jp: "かいもの を し", es: "fui de compras" },
        { jp: "ゲーム を し", es: "jugué videojuegos" },
        { jp: "りょうり を し", es: "cociné" },
        { jp: "こうえん を さんぽ し", es: "paseé por el parque" },
        { jp: "ともだち の うち に い", es: "fui a casa de un amigo/a" },
      ] }],
    },
  },

  {
    id: 6,
    kana: "いま どこ？",
    prompt: "¿Dónde estás ahora?",
    meta: "Aprende a decir dónde estás.",
    patron: { jp: "いま ___ に います。", es: "Ahora estoy en ___." },
    nota: "「に います」significa «estoy en (un lugar)».",
    ejemplo: { jp: "いま カフェ に います。", es: "Ahora estoy en un café." },
    extensiones: [
      { jp: "きもち が いい です。", es: "Se siente bien." },
      { jp: "しずか で すき です。", es: "Es tranquilo, me gusta." },
      { jp: "あなた は いま どこ です か？", es: "¿Y tú dónde estás?" },
    ],
    fotoSugerencia: "¿Foto del lugar donde estás?",
    plantilla: {
      estructura: "いま {{PLACE}} に います。",
      estructuraEs: "Ahora estoy en {{PLACE}}.",
      slots: [{ id: "PLACE", etiqueta: "lugar", opciones: [
        { jp: "うち", es: "casa" },
        { jp: "カフェ", es: "un café" },
        { jp: "がっこう", es: "la escuela" },
        { jp: "としょかん", es: "la biblioteca" },
        { jp: "そと", es: "afuera" },
        { jp: "でんしゃ の なか", es: "el metro" },
        { jp: "こうえん", es: "el parque" },
        { jp: "レストラン", es: "un restaurante" },
      ] }],
    },
  },

  {
    id: 7,
    kana: "きょうの てんき",
    prompt: "¿Qué clima hace hoy?",
    meta: "Aprende a describir el clima.",
    patron: { jp: "きょうは ___ です。", es: "Hoy está ___." },
    nota: "Cambia la palabra del clima. 「です」cierra la frase.",
    ejemplo: { jp: "きょうは はれ です！", es: "¡Hoy está soleado!" },
    extensiones: [
      { jp: "そと に でたく ない です。", es: "No quiero salir." },
      { jp: "さんぽ したい です！", es: "¡Quiero salir a caminar!" },
      { jp: "あなた の まち は どう です か？", es: "¿Y en tu ciudad?" },
    ],
    fotoSugerencia: "¿Foto del cielo de hoy?",
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
        { jp: "あたたかい", es: "templado" },
        { jp: "かぜ が つよい", es: "con mucho viento" },
      ] }],
    },
  },

  {
    id: 8,
    kana: "たべたい もの",
    prompt: "¿Qué se te antoja comer?",
    meta: "Aprende a decir qué quieres comer.",
    patron: { jp: "___ が たべたい です。", es: "Quiero comer ___." },
    nota: "「たべたい です」significa «quiero comer».",
    ejemplo: { jp: "ラーメン が たべたい です！", es: "¡Quiero comer ramen!" },
    extensiones: [
      { jp: "おなか が ぺこぺこ です！", es: "¡Tengo mucha hambre!" },
      { jp: "はやく たべたい！", es: "¡Quiero comer ya!" },
      { jp: "あなた は なに が たべたい です か？", es: "¿Y tú qué quieres comer?" },
    ],
    fotoSugerencia: "¿Foto de lo que se te está antojando?",
    plantilla: {
      estructura: "いま {{FOOD}} が たべたい です！",
      estructuraEs: "¡Ahora quiero comer {{FOOD}}!",
      slots: [{ id: "FOOD", etiqueta: "comida", opciones: [
        { jp: "ラーメン", es: "ramen" },
        { jp: "アイス", es: "helado" },
        { jp: "ピザ", es: "pizza" },
        { jp: "すし", es: "sushi" },
        { jp: "ケーキ", es: "pastel" },
        { jp: "たこやき", es: "takoyaki" },
        { jp: "カレー", es: "curry" },
        { jp: "チョコ", es: "chocolate" },
      ] }],
    },
  },

  {
    id: 9,
    kana: "にほんごの べんきょう",
    prompt: "¿Cómo estudias japonés?",
    meta: "Aprende a decir cómo estudias.",
    patron: { jp: "___ で べんきょう しています。", es: "Estudio con ___." },
    nota: "「で」significa «con» (una herramienta o método).",
    ejemplo: { jp: "アニメ で べんきょう しています。", es: "Estudio con anime." },
    extensiones: [
      { jp: "むずかしい です が、たのしい です！", es: "Es difícil, ¡pero divertido!" },
      { jp: "いっしょ に がんばりましょう！", es: "¡Vamos juntos!" },
      { jp: "まいにち すこし ずつ です。", es: "Poco a poco cada día." },
    ],
    fotoSugerencia: "¿Foto de cómo estudias?",
    plantilla: {
      estructura: "{{METHOD}} で べんきょう しています。",
      estructuraEs: "Estudio con {{METHOD}}.",
      slots: [{ id: "METHOD", etiqueta: "método", opciones: [
        { jp: "アプリ", es: "una app" },
        { jp: "アニメ", es: "anime" },
        { jp: "まんが", es: "manga" },
        { jp: "ユーチューブ", es: "YouTube" },
        { jp: "ゲーム", es: "videojuegos" },
        { jp: "クラス", es: "la clase" },
        { jp: "ドラマ", es: "dramas" },
        { jp: "うた", es: "canciones" },
      ] }],
    },
  },

  {
    id: 10,
    kana: "すきな どうぶつ",
    prompt: "¿Qué animal te gusta?",
    meta: "Aprende a decir qué animal te gusta.",
    patron: { jp: "___ が すき です。", es: "Me gustan ___." },
    nota: "「が すき です」también sirve para animales.",
    ejemplo: { jp: "ねこ が すき です！", es: "¡Me gustan los gatos!" },
    extensiones: [
      { jp: "かわいい です！", es: "¡Son adorables!" },
      { jp: "うち で かいたい です。", es: "Quiero tener uno de mascota." },
      { jp: "あなた は どの どうぶつ が すき です か？", es: "¿Y tú qué animal te gusta?" },
    ],
    fotoSugerencia: "¿Tienes foto de tu animal favorito o mascota?",
    plantilla: {
      estructura: "{{ANIMAL}} が すき です！",
      estructuraEs: "¡Me gustan {{ANIMAL}}!",
      slots: [{ id: "ANIMAL", etiqueta: "animal", opciones: [
        { jp: "いぬ", es: "los perros" },
        { jp: "ねこ", es: "los gatos" },
        { jp: "うさぎ", es: "los conejos" },
        { jp: "とり", es: "los pájaros" },
        { jp: "パンダ", es: "los pandas" },
        { jp: "ペンギン", es: "los pingüinos" },
        { jp: "きつね", es: "los zorros" },
        { jp: "かわうそ", es: "las nutrias" },
      ] }],
    },
  },

  {
    id: 11,
    kana: "すきな きせつ",
    prompt: "¿Tu estación favorita?",
    meta: "Aprende a decir tu estación favorita.",
    patron: { jp: "___ が いちばん すき です。", es: "___ es lo que más me gusta." },
    nota: "「いちばん すき」significa «lo que MÁS me gusta».",
    ejemplo: { jp: "なつ が いちばん すき です！", es: "¡El verano es lo que más me gusta!" },
    extensiones: [
      { jp: "きれい です！", es: "¡Es hermoso!" },
      { jp: "はやく こない か な。", es: "Que llegue pronto." },
      { jp: "あなた は どの きせつ が すき です か？", es: "¿Y tú qué estación prefieres?" },
    ],
    fotoSugerencia: "¿Foto de esa estación donde vives?",
    plantilla: {
      estructura: "{{SEASON}} が いちばん すき です。",
      estructuraEs: "{{SEASON}} es lo que más me gusta.",
      slots: [{ id: "SEASON", etiqueta: "estación", opciones: [
        { jp: "はる", es: "la primavera" },
        { jp: "なつ", es: "el verano" },
        { jp: "あき", es: "el otoño" },
        { jp: "ふゆ", es: "el invierno" },
      ] }],
    },
  },

  {
    id: 12,
    kana: "こどもの ころ",
    prompt: "¿Qué te gustaba de niño/a?",
    meta: "Aprende a hablar de tu niñez.",
    patron: { jp: "こどもの ころ、___ が すきでした。", es: "De niño/a me gustaba ___." },
    nota: "「すきでした」es pasado de «me gusta»: «me gustaba».",
    ejemplo: { jp: "こどもの ころ、アニメ が すきでした。", es: "De niño/a me gustaba el anime." },
    extensiones: [
      { jp: "なつかしい です！", es: "¡Qué nostalgia!" },
      { jp: "いま も すき です。", es: "Todavía me gusta." },
      { jp: "あなた は こどもの ころ なに が すきでしたか？", es: "¿Y tú qué te gustaba?" },
    ],
    fotoSugerencia: "¿Tienes una foto de cuando eras niño/a?",
    plantilla: {
      estructura: "こどもの ころ、{{THING}} が すきでした。",
      estructuraEs: "De niño/a me gustaba {{THING}}.",
      slots: [{ id: "THING", etiqueta: "cosa", opciones: [
        { jp: "アニメ", es: "el anime" },
        { jp: "ゲーム", es: "los videojuegos" },
        { jp: "サッカー", es: "el fútbol" },
        { jp: "アイス", es: "el helado" },
        { jp: "まんが", es: "el manga" },
        { jp: "おかし", es: "los dulces" },
        { jp: "ロボット", es: "los robots" },
        { jp: "うた", es: "las canciones" },
      ] }],
    },
  },

  {
    id: 13,
    kana: "すきな おんがく",
    prompt: "¿Qué música escuchas?",
    meta: "Aprende a decir qué música oyes.",
    patron: { jp: "さいきん ___ を きいて います。", es: "Últimamente escucho ___." },
    nota: "「を きいて います」significa «estoy escuchando».",
    ejemplo: { jp: "さいきん J-POP を きいて います。", es: "Últimamente escucho J-Pop." },
    extensiones: [
      { jp: "とても かっこいい です！", es: "¡Es muy cool!" },
      { jp: "ぜひ きいて ください！", es: "¡Por favor escúchalo!" },
      { jp: "あなた は どんな おんがく が すき です か？", es: "¿Y tú qué música te gusta?" },
    ],
    fotoSugerencia: "¿Foto del artista o canción que escuchas?",
    plantilla: {
      estructura: "さいきん {{GENRE}} を きいて います。",
      estructuraEs: "Últimamente escucho {{GENRE}}.",
      slots: [{ id: "GENRE", etiqueta: "género", opciones: [
        { jp: "J-POP", es: "J-Pop" },
        { jp: "ロック", es: "rock" },
        { jp: "K-POP", es: "K-Pop" },
        { jp: "アニメソング", es: "canciones de anime" },
        { jp: "クラシック", es: "música clásica" },
        { jp: "ヒップホップ", es: "hip-hop" },
        { jp: "ジャズ", es: "jazz" },
        { jp: "ラテン", es: "música latina" },
      ] }],
    },
  },

  {
    id: 14,
    kana: "ゆめの しごと",
    prompt: "¿Qué quieres ser?",
    meta: "Aprende a decir tu trabajo soñado.",
    patron: { jp: "___ に なりたい です。", es: "Quiero ser ___." },
    nota: "「に なりたい です」significa «quiero ser/convertirme en».",
    ejemplo: { jp: "せんせい に なりたい です。", es: "Quiero ser maestro/a." },
    extensiones: [
      { jp: "ぜったい に なります！", es: "¡Sí lo voy a lograr!" },
      { jp: "むずかしい です が、あきらめません。", es: "Es difícil, pero no me rindo." },
      { jp: "あなた の ゆめ は なん です か？", es: "¿Y cuál es tu sueño?" },
    ],
    fotoSugerencia: "¿Foto de algo relacionado con tu sueño?",
    plantilla: {
      estructura: "{{JOB}} に なりたい です。",
      estructuraEs: "Quiero ser {{JOB}}.",
      slots: [{ id: "JOB", etiqueta: "trabajo", opciones: [
        { jp: "せんせい", es: "maestro/a" },
        { jp: "いしゃ", es: "doctor/a" },
        { jp: "エンジニア", es: "ingeniero/a" },
        { jp: "デザイナー", es: "diseñador/a" },
        { jp: "つうやく", es: "intérprete" },
        { jp: "かんごし", es: "enfermero/a" },
        { jp: "りょうりにん", es: "cocinero/a" },
        { jp: "うちゅうひこうし", es: "astronauta" },
      ] }],
    },
  },

  {
    id: 15,
    kana: "にほんで たべたい",
    prompt: "¿Qué comerías en Japón?",
    meta: "Aprende a decir qué quieres comer allá.",
    patron: { jp: "にほんで ___ が たべたい です。", es: "En Japón quiero comer ___." },
    nota: "「で」aquí significa «en» (un lugar donde pasa algo).",
    ejemplo: { jp: "にほんで すし が たべたい です。", es: "En Japón quiero comer sushi." },
    extensiones: [
      { jp: "はやく にほん に いきたい です！", es: "¡Quiero ir a Japón ya!" },
      { jp: "ゆめ です。", es: "Es mi sueño." },
      { jp: "いっしょ に いき ましょう！", es: "¡Vamos juntos!" },
    ],
    fotoSugerencia: "¿Foto del plato japonés que más quieres probar?",
    plantilla: {
      estructura: "にほんで {{FOOD}} が たべたい です！",
      estructuraEs: "¡En Japón quiero comer {{FOOD}}!",
      slots: [{ id: "FOOD", etiqueta: "comida", opciones: [
        { jp: "ラーメン", es: "ramen" },
        { jp: "すし", es: "sushi" },
        { jp: "たこやき", es: "takoyaki" },
        { jp: "やきとり", es: "yakitori" },
        { jp: "おにぎり", es: "onigiri" },
        { jp: "もちアイス", es: "mochi ice cream" },
        { jp: "ラーメン", es: "ramen de verdad" },
        { jp: "てんぷら", es: "tempura" },
      ] }],
    },
  },

  {
    id: 16,
    kana: "けさの ごはん",
    prompt: "¿Qué desayunaste?",
    meta: "Aprende a contar qué desayunaste.",
    patron: { jp: "けさ ___。", es: "Esta mañana ___." },
    nota: "「けさ」significa «esta mañana». 「〜ました」es pasado.",
    ejemplo: { jp: "けさ パン を たべました。", es: "Esta mañana comí pan." },
    extensiones: [
      { jp: "おいしかった です！", es: "¡Estuvo rico!" },
      { jp: "じかん が なくて、いそがしかった です。", es: "No tuve tiempo, estaba ocupado/a." },
      { jp: "あなた は けさ なに を たべましたか？", es: "¿Y tú qué desayunaste?" },
    ],
    fotoSugerencia: "¿Foto de tu desayuno de hoy?",
    plantilla: {
      estructura: "けさ {{BREAKFAST}}。",
      estructuraEs: "Esta mañana {{BREAKFAST}}.",
      slots: [{ id: "BREAKFAST", etiqueta: "desayuno", opciones: [
        { jp: "パン を たべました", es: "comí pan" },
        { jp: "コーヒー を のみました", es: "tomé café" },
        { jp: "たまご を たべました", es: "comí huevo" },
        { jp: "フルーツ を たべました", es: "comí fruta" },
        { jp: "ごはん を たべました", es: "comí arroz" },
        { jp: "ヨーグルト を たべました", es: "comí yogurt" },
        { jp: "なにも たべませんでした", es: "no comí nada" },
        { jp: "シリアル を たべました", es: "comí cereal" },
      ] }],
    },
  },

  {
    id: 17,
    kana: "おすすめ",
    prompt: "¿Qué recomiendas?",
    meta: "Aprende a recomendar algo.",
    patron: { jp: "___ は おすすめ です。", es: "Recomiendo ___." },
    nota: "「おすすめ です」significa «lo recomiendo».",
    ejemplo: { jp: "この アニメ は おすすめ です！", es: "¡Recomiendo este anime!" },
    extensiones: [
      { jp: "ぜったい に みて ください！", es: "¡Definitivamente míralo/pruébalo!" },
      { jp: "さいこう です！", es: "¡Es lo mejor!" },
      { jp: "きっと すき に なります。", es: "Seguro te va a gustar." },
    ],
    fotoSugerencia: "¿Foto de lo que recomiendas?",
    plantilla: {
      estructura: "{{THING}} は おすすめ です！",
      estructuraEs: "¡Recomiendo {{THING}}!",
      slots: [{ id: "THING", etiqueta: "recomendación", opciones: [
        { jp: "この アニメ", es: "este anime" },
        { jp: "この アプリ", es: "esta app" },
        { jp: "この まんが", es: "este manga" },
        { jp: "この ゲーム", es: "este juego" },
        { jp: "この えいが", es: "esta película" },
        { jp: "この おんがく", es: "esta música" },
        { jp: "この ほん", es: "este libro" },
        { jp: "この たべもの", es: "esta comida" },
      ] }],
    },
  },

  {
    id: 18,
    kana: "にがてな こと",
    prompt: "¿Qué se te dificulta?",
    meta: "Aprende a decir algo que se te dificulta.",
    patron: { jp: "___ が にがて です。", es: "Se me dificulta ___." },
    nota: "「にがて です」significa «no soy bueno/a en...». ¡Todos tenemos algo!",
    ejemplo: { jp: "はやおき が にがて です。", es: "Se me dificulta madrugar." },
    extensiones: [
      { jp: "でも、がんばります！", es: "¡Pero voy a intentarlo!" },
      { jp: "すこし ずつ れんしゅう します。", es: "Voy a practicar poco a poco." },
      { jp: "あなた は どう です か？", es: "¿Y a ti, qué se te dificulta?" },
    ],
    fotoSugerencia: "¿Foto que represente ese reto?",
    plantilla: {
      estructura: "{{THING}} が にがて です。",
      estructuraEs: "Se me dificulta {{THING}}.",
      slots: [{ id: "THING", etiqueta: "cosa difícil", opciones: [
        { jp: "はやおき", es: "madrugar" },
        { jp: "りょうり", es: "cocinar" },
        { jp: "うんどう", es: "el ejercicio" },
        { jp: "すうがく", es: "las matemáticas" },
        { jp: "かたづけ", es: "ordenar" },
        { jp: "じかん を まもる こと", es: "ser puntual" },
        { jp: "みず を のむ こと", es: "tomar agua" },
        { jp: "はやく ねる こと", es: "dormir temprano" },
      ] }],
    },
  },

  {
    id: 19,
    kana: "わたしの まち",
    prompt: "¿Cómo es tu ciudad?",
    meta: "Aprende a describir tu ciudad.",
    patron: { jp: "わたしの まちは ___ です。", es: "Mi ciudad es ___." },
    nota: "Una sola palabra dice cómo es. 「です」la hace educada.",
    ejemplo: { jp: "わたしの まちは にぎやか です。", es: "Mi ciudad es animada." },
    extensiones: [
      { jp: "とても すき です。", es: "Me gusta mucho." },
      { jp: "ぜひ きて ください！", es: "¡Ven a visitarla!" },
      { jp: "あなた の まち は どう です か？", es: "¿Y tu ciudad cómo es?" },
    ],
    fotoSugerencia: "¿Foto de tu ciudad o calle favorita?",
    plantilla: {
      estructura: "わたしの まちは {{ADJ}} です。",
      estructuraEs: "Mi ciudad es {{ADJ}}.",
      slots: [{ id: "ADJ", etiqueta: "cómo es", opciones: [
        { jp: "にぎやか", es: "animada" },
        { jp: "しずか", es: "tranquila" },
        { jp: "おおきい", es: "grande" },
        { jp: "ちいさい", es: "pequeña" },
        { jp: "きれい", es: "bonita" },
        { jp: "あたたかい", es: "cálida" },
        { jp: "さむい", es: "fría" },
        { jp: "たのしい", es: "divertida" },
      ] }],
    },
  },

  {
    id: 20,
    kana: "たのしかった こと",
    prompt: "¿Algo divertido reciente?",
    meta: "Aprende a contar algo divertido.",
    patron: { jp: "さいきん ___ が たのしかった です。", es: "Últimamente ___ estuvo divertido." },
    nota: "「たのしかった です」es pasado: «estuvo divertido».",
    ejemplo: { jp: "さいきん えいが が たのしかった です。", es: "Últimamente la película estuvo divertida." },
    extensiones: [
      { jp: "また したい です！", es: "¡Quiero repetirlo!" },
      { jp: "すごく よかった です！", es: "¡Estuvo genial!" },
      { jp: "あなた は さいきん なに が たのしかった です か？", es: "¿Y tú qué estuvo divertido?" },
    ],
    fotoSugerencia: "¿Tienes foto de ese momento?",
    plantilla: {
      estructura: "さいきん {{THING}} が たのしかった です。",
      estructuraEs: "Últimamente {{THING}} estuvo divertido.",
      slots: [{ id: "THING", etiqueta: "qué cosa", opciones: [
        { jp: "えいが", es: "la película" },
        { jp: "りょこう", es: "el viaje" },
        { jp: "ゲーム", es: "el videojuego" },
        { jp: "パーティー", es: "la fiesta" },
        { jp: "デート", es: "la cita" },
        { jp: "りょうり", es: "cocinar" },
        { jp: "クラス", es: "la clase" },
        { jp: "かいもの", es: "ir de compras" },
      ] }],
    },
  },

  {
    id: 21,
    kana: "わたしの へや",
    prompt: "¿Qué hay en tu cuarto?",
    meta: "Aprende a decir qué hay en tu cuarto.",
    patron: { jp: "わたしの へやに ___ が あります。", es: "En mi cuarto hay ___." },
    nota: "「が あります」significa «hay» (para cosas).",
    ejemplo: { jp: "わたしの へやに ほん が あります。", es: "En mi cuarto hay libros." },
    extensiones: [
      { jp: "とても すき な ばしょ です。", es: "Es mi lugar favorito." },
      { jp: "すこし ちらかって います。", es: "Está un poco desordenado." },
      { jp: "あなた の へや は どう です か？", es: "¿Y tu cuarto?" },
    ],
    fotoSugerencia: "¿Foto de tu cuarto o rincón favorito?",
    plantilla: {
      estructura: "わたしの へやに {{THING}} が あります。",
      estructuraEs: "En mi cuarto hay {{THING}}.",
      slots: [{ id: "THING", etiqueta: "qué cosa", opciones: [
        { jp: "ほん", es: "libros" },
        { jp: "ポスター", es: "pósters" },
        { jp: "まんが", es: "manga" },
        { jp: "ぬいぐるみ", es: "peluches" },
        { jp: "ギター", es: "una guitarra" },
        { jp: "ねこ", es: "un gato" },
        { jp: "しょくぶつ", es: "plantas" },
        { jp: "たくさんの ほん", es: "muchos libros" },
      ] }],
    },
  },

  {
    id: 22,
    kana: "わたしの ともだち",
    prompt: "¿Cómo es tu amigo/a?",
    meta: "Aprende a describir a un amigo/a.",
    patron: { jp: "わたしの ともだちは ___ です。", es: "Mi amigo/a es ___." },
    nota: "Una palabra dice cómo es. 「は」marca de quién hablas.",
    ejemplo: { jp: "わたしの ともだちは やさしい です。", es: "Mi amigo/a es amable." },
    extensiones: [
      { jp: "だいすき です！", es: "¡Le quiero mucho!" },
      { jp: "いつも ありがとう。", es: "Siempre gracias." },
      { jp: "あなた の ともだち は どう です か？", es: "¿Y tu amigo/a?" },
    ],
    fotoSugerencia: "¿Foto con tu amigo/a?",
    plantilla: {
      estructura: "わたしの ともだちは {{ADJ}} です。",
      estructuraEs: "Mi amigo/a es {{ADJ}}.",
      slots: [{ id: "ADJ", etiqueta: "cómo es", opciones: [
        { jp: "やさしい", es: "amable" },
        { jp: "おもしろい", es: "gracioso/a" },
        { jp: "げんき", es: "enérgico/a" },
        { jp: "しんせつ", es: "bondadoso/a" },
        { jp: "かわいい", es: "lindo/a" },
        { jp: "かっこいい", es: "cool" },
        { jp: "まじめ", es: "serio/a" },
        { jp: "たのしい", es: "divertido/a" },
      ] }],
    },
  },

  {
    id: 23,
    kana: "なぜ にほんご？",
    prompt: "¿Por qué estudias japonés?",
    meta: "Aprende a decir por qué estudias.",
    patron: { jp: "___ から、べんきょう しています。", es: "Estudio porque ___." },
    nota: "「から」significa «porque». La razón va antes.",
    ejemplo: { jp: "アニメ が すき だから、べんきょう しています。", es: "Estudio porque me gusta el anime." },
    extensiones: [
      { jp: "むずかしい です が、たのしい です！", es: "Es difícil, ¡pero divertido!" },
      { jp: "ゆめ が あります！", es: "¡Tengo un sueño!" },
      { jp: "いっしょ に がんばりましょう！", es: "¡Vamos juntos!" },
    ],
    fotoSugerencia: "¿Foto de lo que te motivó a estudiar japonés?",
    plantilla: {
      estructura: "{{REASON}} から、べんきょう しています。",
      estructuraEs: "Estudio porque {{REASON}}.",
      slots: [{ id: "REASON", etiqueta: "razón", opciones: [
        { jp: "アニメ が すき だ", es: "me gusta el anime" },
        { jp: "にほんに いきたい", es: "quiero ir a Japón" },
        { jp: "ゲーム が すき だ", es: "me gustan los videojuegos" },
        { jp: "ぶんか が すき だ", es: "me gusta la cultura" },
        { jp: "にほんご が おもしろい", es: "el japonés es interesante" },
        { jp: "しごと の ため", es: "para el trabajo" },
      ] }],
    },
  },

  {
    id: 24,
    kana: "すきな じかん",
    prompt: "¿Tu momento favorito del día?",
    meta: "Aprende a decir tu momento favorito.",
    patron: { jp: "___ が いちばん すき です。", es: "___ es mi momento favorito." },
    nota: "「いちばん すき」significa «lo que más me gusta».",
    ejemplo: { jp: "よる が いちばん すき です。", es: "La noche es mi momento favorito." },
    extensiones: [
      { jp: "ほっと します。", es: "Me relajo." },
      { jp: "コーヒー を のみ ながら のんびり します。", es: "Me relajo tomando café." },
      { jp: "あなた は いつ が いちばん すき です か？", es: "¿Y tú cuándo es tu favorito?" },
    ],
    fotoSugerencia: "¿Foto de ese momento del día?",
    plantilla: {
      estructura: "{{TIME}} が いちばん すき です。",
      estructuraEs: "{{TIME}} es mi momento favorito.",
      slots: [{ id: "TIME", etiqueta: "momento", opciones: [
        { jp: "あさ", es: "la mañana" },
        { jp: "よる", es: "la noche" },
        { jp: "ひるごはん の じかん", es: "la hora de comer" },
        { jp: "ねるまえ", es: "antes de dormir" },
        { jp: "ともだち と の じかん", es: "el tiempo con amigos" },
        { jp: "こうえん の さんぽ", es: "el paseo por el parque" },
      ] }],
    },
  },

  {
    id: 25,
    kana: "じぶんへ ひとこと",
    prompt: "Un mensaje de ánimo para ti",
    meta: "Aprende frases cortas para animarte.",
    patron: { jp: "___！", es: "¡___!" },
    nota: "Frases cortas de ánimo. ¡Una palabra es suficiente!",
    ejemplo: { jp: "がんばれ！", es: "¡Tú puedes!" },
    extensiones: [
      { jp: "まいにち すこし ずつ。", es: "Poco a poco cada día." },
      { jp: "いっしょ に がんばりましょう！", es: "¡Vamos juntos!" },
      { jp: "にほんご が たのしい です！", es: "¡El japonés es divertido!" },
    ],
    fotoSugerencia: "¿Una foto que te inspire o anime?",
    plantilla: {
      estructura: "{{MSG}}！",
      estructuraEs: "¡{{MSG}}!",
      slots: [{ id: "MSG", etiqueta: "mensaje", opciones: [
        { jp: "がんばれ", es: "tú puedes" },
        { jp: "だいじょうぶ", es: "todo está bien" },
        { jp: "できるよ", es: "sí se puede" },
        { jp: "あきらめないで", es: "no te rindas" },
        { jp: "すこし ずつ で いい", es: "poco a poco está bien" },
        { jp: "ゆっくり で いい", es: "sin prisa está bien" },
      ] }],
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getTemaPorId(id: number): TemaSemana | undefined {
  return TEMAS_SEMANA.find((t) => t.id === id);
}

export function getTemaDeLaSemana(): TemaSemana {
  const d = new Date();
  const startOfYear = new Date(Date.UTC(d.getFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7);
  return TEMAS_SEMANA[week % TEMAS_SEMANA.length];
}
