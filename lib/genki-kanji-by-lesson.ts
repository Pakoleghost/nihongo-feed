export type KanjiEntryType =
  | "word"
  | "single_kanji_word"
  | "time_expression"
  | "weekday"
  | "na_adjective"
  | "suru_verb"
  | "verb"
  | "adjective_i"
  | "phrase"
  | "proper_name";

export type GenkiKanjiItem = {
  kanji: string;
  hira: string;
  es: string;
  entry_type: KanjiEntryType;
  source_row: number;
};

type KanjiSeed = [kanji: string, hira: string, es: string];

const GENKI_KANJI_SEEDS: Record<number, KanjiSeed[]> = {
  3: [
    ["一", "いち / ひと", "uno"],
    ["二", "に / ふた", "dos"],
    ["三", "さん / み", "tres"],
    ["四", "し / よん / よ", "cuatro"],
    ["五", "ご / いつ", "cinco"],
    ["六", "ろく / む", "seis"],
    ["七", "しち / なな", "siete"],
    ["八", "はち / や", "ocho"],
    ["九", "きゅう / く", "nueve"],
    ["十", "じゅう / とお", "diez"],
    ["百", "ひゃく", "cien"],
    ["千", "せん / ち", "mil"],
    ["万", "まん / ばん", "diez mil"],
    ["円", "えん / まる", "yen; circulo"],
    ["時", "じ / とき", "tiempo; hora"],
  ],
  4: [
    ["日", "にち / じつ / ひ", "dia; sol"],
    ["本", "ほん / もと", "libro; origen"],
    ["人", "じん / にん / ひと", "persona"],
    ["月", "げつ / がつ / つき", "luna; mes"],
    ["火", "か / ひ", "fuego"],
    ["水", "すい / みず", "agua"],
    ["木", "もく / き", "arbol; madera"],
    ["金", "きん / かね", "oro; dinero"],
    ["土", "ど / つち", "tierra"],
    ["曜", "よう", "dia de la semana"],
    ["上", "じょう / うえ / あ", "arriba"],
    ["下", "か / した / さ", "abajo"],
    ["中", "ちゅう / なか", "dentro; centro"],
    ["半", "はん / なか", "mitad"],
  ],
  5: [
    ["山", "さん / やま", "montana"],
    ["川", "せん / かわ", "rio"],
    ["元", "げん / もと", "origen"],
    ["気", "き / け", "energia; espiritu"],
    ["天", "てん / あめ", "cielo"],
    ["私", "し / わたし", "yo; privado"],
    ["今", "こん / いま", "ahora"],
    ["田", "でん / た", "campo de arroz"],
    ["女", "じょ / おんな", "mujer"],
    ["男", "だん / おとこ", "hombre"],
    ["見", "けん / み", "ver"],
    ["行", "こう / ぎょう / い", "ir"],
    ["食", "しょく / た", "comer"],
    ["飲", "いん / の", "beber"],
  ],
  6: [
    ["西", "せい / にし", "oeste"],
    ["南", "なん / みなみ", "sur"],
    ["北", "ほく / きた", "norte"],
    ["口", "こう / くち", "boca; entrada"],
    ["出", "しゅつ / で", "salir"],
    ["右", "う / ゆう / みぎ", "derecha"],
    ["左", "さ / ひだり", "izquierda"],
    ["分", "ぶん / ふん / わ", "parte; minuto"],
    ["先", "せん / さき", "antes; adelante"],
    ["生", "せい / しょう / い", "vida; nacer"],
    ["大", "だい / おお", "grande"],
    ["学", "がく / まな", "estudio; aprender"],
    ["外", "がい / そと", "fuera"],
    ["国", "こく / くに", "pais"],
  ],
  7: [
    ["京", "きょう / けい", "capital"],
    ["子", "し / こ", "nino"],
    ["小", "しょう / ちい", "pequeno"],
    ["会", "かい / あ", "reunirse"],
    ["社", "しゃ / やしろ", "empresa; santuario"],
    ["父", "ふ / ちち", "padre"],
    ["母", "ぼ / はは", "madre"],
    ["高", "こう / たか", "alto; caro"],
    ["校", "こう", "escuela"],
    ["毎", "まい", "cada"],
    ["語", "ご / かた", "idioma; palabra"],
    ["文", "ぶん / ふみ", "texto; escritura"],
    ["帰", "き / かえ", "regresar"],
    ["入", "にゅう / はい / い", "entrar"],
  ],
  8: [
    ["員", "いん", "miembro; empleado"],
    ["新", "しん / あたら", "nuevo"],
    ["聞", "ぶん / き", "escuchar; preguntar"],
    ["作", "さく / つく", "hacer; producir"],
    ["仕", "し / つか", "servir; trabajar"],
    ["事", "じ / こと", "cosa; asunto"],
    ["電", "でん", "electricidad"],
    ["車", "しゃ / くるま", "vehiculo; coche"],
    ["休", "きゅう / やす", "descansar"],
    ["言", "げん / い / こと", "decir; palabra"],
    ["読", "どく / よ", "leer"],
    ["思", "し / おも", "pensar"],
    ["次", "じ / つぎ", "siguiente"],
    ["何", "か / なに / なん", "que"],
  ],
  9: [
    ["午", "ご", "mediodia"],
    ["後", "ご / あと / うし", "despues; atras"],
    ["前", "ぜん / まえ", "antes; enfrente"],
    ["名", "めい / な", "nombre"],
    ["白", "はく / しろ", "blanco"],
    ["雨", "う / あめ", "lluvia"],
    ["書", "しょ / か", "escribir"],
    ["友", "ゆう / とも", "amigo"],
    ["間", "かん / あいだ / ま", "intervalo; entre"],
    ["家", "か / け / いえ", "casa; familia"],
    ["話", "わ / はなし / はな", "hablar; historia"],
    ["少", "しょう / すこ", "poco"],
    ["古", "こ / ふる", "viejo"],
    ["知", "ち / し", "saber"],
    ["来", "らい / く", "venir"],
  ],
  10: [
    ["住", "じゅう / す", "vivir"],
    ["正", "せい / しょう / ただ", "correcto"],
    ["年", "ねん / とし", "ano"],
    ["売", "ばい / う", "vender"],
    ["買", "ばい / か", "comprar"],
    ["町", "ちょう / まち", "pueblo; ciudad"],
    ["長", "ちょう / なが", "largo; jefe"],
    ["道", "どう / みち", "camino"],
    ["雪", "せつ / ゆき", "nieve"],
    ["立", "りつ / た", "estar de pie"],
    ["自", "じ / みずか", "uno mismo"],
    ["夜", "や / よる", "noche"],
    ["朝", "ちょう / あさ", "manana"],
    ["持", "じ / も", "tener; llevar"],
  ],
  11: [
    ["手", "しゅ / て", "mano"],
    ["紙", "し / かみ", "papel"],
    ["好", "こう / す", "gustar"],
    ["近", "きん / ちか", "cerca"],
    ["明", "めい / あか", "claro; brillante"],
    ["病", "びょう / や", "enfermedad"],
    ["院", "いん", "institucion"],
    ["映", "えい / うつ", "reflejar; proyectar"],
    ["画", "が / かく", "imagen; trazo"],
    ["歌", "か / うた", "cancion; cantar"],
    ["市", "し / いち", "ciudad; mercado"],
    ["強", "きょう / つよ", "fuerte; estudiar"],
    ["有", "ゆう / あ", "existir; tener"],
    ["所", "しょ / ところ", "lugar"],
    ["勉", "べん", "esfuerzo"],
    ["旅", "りょ / たび", "viaje"],
  ],
  12: [
    ["昔", "せき / むかし", "antiguo; hace tiempo"],
    ["々", "くりかえし", "marca de repeticion"],
    ["神", "しん / かみ", "dios; espiritu"],
    ["早", "そう / はや", "temprano; rapido"],
    ["起", "き / お", "levantarse; ocurrir"],
    ["牛", "ぎゅう / うし", "vaca"],
    ["使", "し / つか", "usar"],
    ["働", "どう / はたら", "trabajar"],
    ["連", "れん / つ", "llevar; conectar"],
    ["別", "べつ / わか", "separar"],
    ["度", "ど / たび", "grado; vez"],
    ["赤", "せき / あか", "rojo"],
    ["青", "せい / あお", "azul"],
    ["色", "しょく / いろ", "color"],
  ],
};

export const GENKI_KANJI_BY_LESSON: Record<number, GenkiKanjiItem[]> =
  Object.fromEntries(
    Object.entries(GENKI_KANJI_SEEDS).map(([lesson, items]) => [
      Number(lesson),
      items.map(([kanji, hira, es], index) => ({
        kanji,
        hira,
        es,
        entry_type: "single_kanji_word" as const,
        source_row: index + 1,
      })),
    ]),
  );
