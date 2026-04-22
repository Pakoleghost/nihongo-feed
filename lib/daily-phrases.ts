export type DailyPhrase = {
  id: string;
  japanese: string;
  reading: string;
  meaning_es: string;
  note?: string;
};

export const DAILY_PHRASES: DailyPhrase[] = [
  {
    id: "nanakorobi-yaoki",
    japanese: "七転び八起き",
    reading: "ななころびやおき",
    meaning_es: "Caerse muchas veces y volver a levantarse.",
  },
  {
    id: "saru-mo-ki-kara-ochiru",
    japanese: "猿も木から落ちる",
    reading: "さるもきからおちる",
    meaning_es: "Hasta quien tiene experiencia puede equivocarse.",
  },
  {
    id: "ishi-no-ue-ni-mo-sannen",
    japanese: "石の上にも三年",
    reading: "いしのうえにもさんねん",
    meaning_es: "La constancia también termina dando fruto.",
  },
  {
    id: "asa-meshi-mae",
    japanese: "朝飯前",
    reading: "あさめしまえ",
    meaning_es: "Algo muy fácil de hacer.",
  },
  {
    id: "hana-yori-dango",
    japanese: "花より団子",
    reading: "はなよりだんご",
    meaning_es: "Preferir lo útil antes que lo vistoso.",
  },
  {
    id: "isogaba-maware",
    japanese: "急がば回れ",
    reading: "いそがばまわれ",
    meaning_es: "A veces ir con calma es el camino más seguro.",
  },
  {
    id: "deru-kui-wa-utareru",
    japanese: "出る杭は打たれる",
    reading: "でるくいはうたれる",
    meaning_es: "Quien destaca demasiado suele recibir presión.",
  },
  {
    id: "ame-futte-ji-katamaru",
    japanese: "雨降って地固まる",
    reading: "あめふってじかたまる",
    meaning_es: "Después del conflicto, las cosas pueden quedar mejor.",
  },
  {
    id: "nido-aru-koto-wa-sando-aru",
    japanese: "二度あることは三度ある",
    reading: "にどあることはさんどある",
    meaning_es: "Lo que pasa dos veces puede repetirse una tercera.",
  },
  {
    id: "waza-waza",
    japanese: "わざわざ",
    reading: "わざわざ",
    meaning_es: "Hacer algo expresamente o con intención.",
    note: "Una palabra muy común en la vida diaria.",
  },
  {
    id: "gambatte",
    japanese: "頑張って",
    reading: "がんばって",
    meaning_es: "Ánimo, haz tu mejor esfuerzo.",
  },
  {
    id: "yoroshiku-onegaishimasu",
    japanese: "よろしくお願いします",
    reading: "よろしくおねがいします",
    meaning_es: "Una forma amable de pedir buena disposición o apoyo.",
  },
];

export function getDailyPhrase(date = new Date()): DailyPhrase {
  const utcDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const dayIndex = Math.floor(utcDay / 86_400_000);
  return DAILY_PHRASES[((dayIndex % DAILY_PHRASES.length) + DAILY_PHRASES.length) % DAILY_PHRASES.length];
}
