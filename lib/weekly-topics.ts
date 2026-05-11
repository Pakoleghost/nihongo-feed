export type WeeklyTopic = {
  kana: string;       // Japanese title (N5 kana)
  prompt: string;     // Spanish prompt for students
};

const TOPICS: WeeklyTopic[] = [
  { kana: "きょうのたべもの",    prompt: "¿Qué comiste hoy? Escríbelo en hiragana." },
  { kana: "すきなもの",          prompt: "¿Qué te gusta? Usa「〜がすきです」" },
  { kana: "いまなんじ",          prompt: "Di qué hora es ahora y qué estás haciendo." },
  { kana: "わたしのかぞく",      prompt: "Describe a un miembro de tu familia en una oración." },
  { kana: "きょうのてんき",      prompt: "¿Cómo está el clima donde estás hoy?" },
  { kana: "まいにちのルーティン", prompt: "¿Qué haces cada mañana? Usa「〜ます」" },
  { kana: "どこにいますか",      prompt: "¿Dónde estás ahora? Describe el lugar." },
  { kana: "なにがほしい",        prompt: "¿Qué quieres aprender o hacer esta semana?" },
  { kana: "すきなたべもの",      prompt: "¿Cuál es tu comida favorita y por qué?" },
  { kana: "きのうのこと",        prompt: "¿Qué hiciste ayer? Una oración sencilla." },
  { kana: "いろのはなし",        prompt: "Describe algo que ves ahora usando colores en japonés." },
  { kana: "どうぶつ",            prompt: "¿Tienes mascota o cuál es tu animal favorito?" },
  { kana: "にほんごのれんしゅう", prompt: "¿Qué palabra nueva aprendiste esta semana?" },
  { kana: "すきなおんがく",      prompt: "¿Qué música escuchas? Escribe el título en japonés si puedes." },
  { kana: "わたしのまち",        prompt: "Describe tu ciudad o colonia con dos adjetivos." },
  { kana: "しゅうまつのよてい",  prompt: "¿Qué vas a hacer este fin de semana?" },
  { kana: "かんじのはなし",      prompt: "Escribe un kanji que hayas aprendido y su significado." },
  { kana: "にほんについて",      prompt: "¿Qué es lo que más te llama la atención de Japón?" },
  { kana: "がんばってること",    prompt: "¿En qué estás trabajando esta semana en japonés?" },
];

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function getWeeklyTopic(): WeeklyTopic {
  const week = getISOWeekNumber(new Date());
  return TOPICS[week % TOPICS.length];
}
