/**
 * Banco de Temas de la Semana — Nihongo Feed
 *
 * 25 temas para PRINCIPIANTES (A1, Genki I).
 * Cada tema es un mini-tutorial guiado que termina en una publicación.
 *
 * Convenciones:
 *  - El japonés se escribe con ESPACIOS entre palabras para que un
 *    principiante pueda leerlo sin "bola de hiragana".
 *  - Notación de furigana: {漢字|ふりがな} (la renderiza <FuriganaText/>).
 *  - "___" en patron.jp marca el hueco que el alumno va a llenar.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type FraseBilingue = {
  jp: string;   // japonés con espacios entre palabras
  es: string;   // traducción al español
};

/** Una opción de vocabulario en el constructor de oraciones. */
export type OpcionSlot = {
  jp: string;   // "ラーメン"
  es: string;   // "el ramen" — encaja en estructuraEs
};

export type SlotPlantilla = {
  id: string;            // "FOOD" — corresponde a {{FOOD}} en estructura
  etiqueta: string;      // pista del hueco en español: "comida"
  opciones: OpcionSlot[];
};

/** Plantilla interactiva: el alumno toca chips y arma la oración. */
export type PlantillaTema = {
  estructura: string;     // "{{FOOD}} が すき です！"
  estructuraEs: string;   // "¡Me gusta {{FOOD}}!"
  slots: SlotPlantilla[];
};

export type TemaSemana = {
  id: number;
  kana: string;            // título de la card (hiragana espaciado)
  prompt: string;          // invitación corta en español
  meta: string;            // 1 línea: qué vas a aprender
  patron: FraseBilingue;   // patrón con ___ (jp) y su traducción (es)
  nota: string;            // 1 línea pedagógica simple
  ejemplo: FraseBilingue;  // un ejemplo modelo (principiante, espaciado)
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
    ejemplo: { jp: "きょうは たのしい です。", es: "Hoy estoy feliz." },
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

  {
    id: 2,
    kana: "すきな たべもの",
    prompt: "¿Qué comida te encanta?",
    meta: "Aprende a decir qué comida te gusta.",
    patron: { jp: "___ が すき です。", es: "Me gusta ___." },
    nota: "「が すき です」significa «me gusta». La comida va al principio.",
    ejemplo: { jp: "ラーメン が すき です。", es: "Me gusta el ramen." },
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

  {
    id: 4,
    kana: "まいにちの こと",
    prompt: "¿Qué haces todos los días?",
    meta: "Aprende a decir un hábito diario.",
    patron: { jp: "まいにち ___。", es: "Todos los días ___." },
    nota: "「まいにち」significa «todos los días». Luego va la acción.",
    ejemplo: { jp: "まいにち コーヒー を のみます。", es: "Todos los días tomo café." },
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
      ] }],
    },
  },

  {
    id: 5,
    kana: "しゅうまつの こと",
    prompt: "¿Qué hiciste el fin de semana?",
    meta: "Aprende a contar qué hiciste.",
    patron: { jp: "しゅうまつ、___。", es: "El fin de semana ___." },
    nota: "「〜ました」es pasado: significa «hice...».",
    ejemplo: { jp: "しゅうまつ、えいが を みました。", es: "El fin de semana vi una película." },
    plantilla: {
      estructura: "しゅうまつ、{{ACTION}}。",
      estructuraEs: "El fin de semana {{ACTION}}.",
      slots: [{ id: "ACTION", etiqueta: "qué hiciste", opciones: [
        { jp: "えいが を みました", es: "vi una película" },
        { jp: "ともだち と あいました", es: "vi a un amigo/a" },
        { jp: "うち で やすみました", es: "descansé en casa" },
        { jp: "かいもの を しました", es: "fui de compras" },
        { jp: "ゲーム を しました", es: "jugué videojuegos" },
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

  {
    id: 7,
    kana: "きょうの てんき",
    prompt: "¿Qué clima hace hoy?",
    meta: "Aprende a describir el clima.",
    patron: { jp: "きょうは ___ です。", es: "Hoy está ___." },
    nota: "Cambia la palabra del clima. 「です」cierra la frase.",
    ejemplo: { jp: "きょうは はれ です。", es: "Hoy está soleado." },
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

  {
    id: 8,
    kana: "たべたい もの",
    prompt: "¿Qué se te antoja comer?",
    meta: "Aprende a decir qué quieres comer.",
    patron: { jp: "いま ___ が たべたい です。", es: "Ahora quiero comer ___." },
    nota: "「たべたい です」significa «quiero comer».",
    ejemplo: { jp: "いま ラーメン が たべたい です。", es: "Ahora quiero comer ramen." },
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
      ] }],
    },
  },

  {
    id: 10,
    kana: "すきな どうぶつ",
    prompt: "¿Qué animal te gusta?",
    meta: "Aprende a decir qué animal te gusta.",
    patron: { jp: "___ が すき です。", es: "Me gustan ___." },
    nota: "「が すき です」también sirve para animales: «me gustan».",
    ejemplo: { jp: "ねこ が すき です。", es: "Me gustan los gatos." },
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
    ejemplo: { jp: "なつ が いちばん すき です。", es: "El verano es lo que más me gusta." },
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
    plantilla: {
      estructura: "こどもの ころ、{{THING}} が すきでした。",
      estructuraEs: "De niño/a me gustaba {{THING}}.",
      slots: [{ id: "THING", etiqueta: "cosa", opciones: [
        { jp: "アニメ", es: "el anime" },
        { jp: "ゲーム", es: "los videojuegos" },
        { jp: "サッカー", es: "el fútbol" },
        { jp: "アイス", es: "el helado" },
        { jp: "まんが", es: "el manga" },
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
    plantilla: {
      estructura: "さいきん {{GENRE}} を きいて います。",
      estructuraEs: "Últimamente escucho {{GENRE}}.",
      slots: [{ id: "GENRE", etiqueta: "género", opciones: [
        { jp: "J-POP", es: "J-Pop" },
        { jp: "ロック", es: "rock" },
        { jp: "K-POP", es: "K-Pop" },
        { jp: "アニメソング", es: "canciones de anime" },
        { jp: "クラシック", es: "música clásica" },
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
    plantilla: {
      estructura: "{{JOB}} に なりたい です。",
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

  {
    id: 15,
    kana: "にほんで たべたい",
    prompt: "¿Qué comerías en Japón?",
    meta: "Aprende a decir qué quieres comer allá.",
    patron: { jp: "にほんで ___ が たべたい です。", es: "En Japón quiero comer ___." },
    nota: "「で」aquí significa «en» (un lugar donde pasa algo).",
    ejemplo: { jp: "にほんで すし が たべたい です。", es: "En Japón quiero comer sushi." },
    plantilla: {
      estructura: "にほんで {{FOOD}} が たべたい です！",
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

  {
    id: 16,
    kana: "けさの ごはん",
    prompt: "¿Qué desayunaste?",
    meta: "Aprende a contar qué desayunaste.",
    patron: { jp: "けさ ___。", es: "Esta mañana ___." },
    nota: "「けさ」significa «esta mañana». 「〜ました」es pasado.",
    ejemplo: { jp: "けさ パン を たべました。", es: "Esta mañana comí pan." },
    plantilla: {
      estructura: "けさ {{BREAKFAST}}。",
      estructuraEs: "Esta mañana {{BREAKFAST}}.",
      slots: [{ id: "BREAKFAST", etiqueta: "desayuno", opciones: [
        { jp: "パン を たべました", es: "comí pan" },
        { jp: "コーヒー を のみました", es: "tomé café" },
        { jp: "たまご を たべました", es: "comí huevo" },
        { jp: "フルーツ を たべました", es: "comí fruta" },
        { jp: "ごはん を たべました", es: "comí arroz" },
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
    ejemplo: { jp: "この アニメ は おすすめ です。", es: "Recomiendo este anime." },
    plantilla: {
      estructura: "{{THING}} は おすすめ です！",
      estructuraEs: "¡Recomiendo {{THING}}!",
      slots: [{ id: "THING", etiqueta: "recomendación", opciones: [
        { jp: "この アニメ", es: "este anime" },
        { jp: "この アプリ", es: "esta app" },
        { jp: "この まんが", es: "este manga" },
        { jp: "この ゲーム", es: "este juego" },
        { jp: "この えいが", es: "esta película" },
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
    plantilla: {
      estructura: "{{THING}} が にがて です。",
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

  {
    id: 19,
    kana: "わたしの まち",
    prompt: "¿Cómo es tu ciudad?",
    meta: "Aprende a describir tu ciudad.",
    patron: { jp: "わたしの まちは ___ です。", es: "Mi ciudad es ___." },
    nota: "Una sola palabra dice cómo es. 「です」la hace educada.",
    ejemplo: { jp: "わたしの まちは にぎやか です。", es: "Mi ciudad es animada." },
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

  {
    id: 20,
    kana: "たのしかった こと",
    prompt: "¿Algo divertido reciente?",
    meta: "Aprende a contar algo divertido.",
    patron: { jp: "さいきん ___ が たのしかった です。", es: "Últimamente ___ estuvo divertido." },
    nota: "「たのしかった です」es pasado: «estuvo divertido».",
    ejemplo: { jp: "さいきん えいが が たのしかった です。", es: "Últimamente la película estuvo divertida." },
    plantilla: {
      estructura: "さいきん {{THING}} が たのしかった です。",
      estructuraEs: "Últimamente {{THING}} estuvo divertido.",
      slots: [{ id: "THING", etiqueta: "qué cosa", opciones: [
        { jp: "えいが", es: "la película" },
        { jp: "りょこう", es: "el viaje" },
        { jp: "ゲーム", es: "el videojuego" },
        { jp: "パーティー", es: "la fiesta" },
        { jp: "デート", es: "la cita" },
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

  {
    id: 22,
    kana: "わたしの ともだち",
    prompt: "¿Cómo es tu amigo/a?",
    meta: "Aprende a describir a un amigo/a.",
    patron: { jp: "わたしの ともだちは ___ です。", es: "Mi amigo/a es ___." },
    nota: "Una palabra dice cómo es. 「は」marca de quién hablas.",
    ejemplo: { jp: "わたしの ともだちは やさしい です。", es: "Mi amigo/a es amable." },
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

  {
    id: 23,
    kana: "なぜ にほんご？",
    prompt: "¿Por qué estudias japonés?",
    meta: "Aprende a decir por qué estudias.",
    patron: { jp: "___ から、べんきょう しています。", es: "Estudio porque ___." },
    nota: "「から」significa «porque». La razón va antes.",
    ejemplo: { jp: "アニメ が すき だから、べんきょう しています。", es: "Estudio porque me gusta el anime." },
    plantilla: {
      estructura: "{{REASON}} から、べんきょう しています。",
      estructuraEs: "Estudio porque {{REASON}}.",
      slots: [{ id: "REASON", etiqueta: "razón", opciones: [
        { jp: "アニメ が すき だ", es: "me gusta el anime" },
        { jp: "にほんに いきたい", es: "quiero ir a Japón" },
        { jp: "ゲーム が すき だ", es: "me gustan los videojuegos" },
        { jp: "ぶんか が すき だ", es: "me gusta la cultura" },
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
    plantilla: {
      estructura: "{{TIME}} が いちばん すき です。",
      estructuraEs: "{{TIME}} es mi momento favorito.",
      slots: [{ id: "TIME", etiqueta: "momento", opciones: [
        { jp: "あさ", es: "la mañana" },
        { jp: "よる", es: "la noche" },
        { jp: "ひるごはん", es: "la hora de comer" },
        { jp: "ねるまえ", es: "antes de dormir" },
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

export function getTemaPorId(id: number): TemaSemana | undefined {
  return TEMAS_SEMANA.find((t) => t.id === id);
}

export function getTemaDeLaSemana(): TemaSemana {
  const d = new Date();
  const startOfYear = new Date(Date.UTC(d.getFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7);
  return TEMAS_SEMANA[week % TEMAS_SEMANA.length];
}
