"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type KanaPair = readonly [string, string];
type QuizCount = 10 | 20 | 30;
type QuizMode = "particles" | "conjugation" | "vocab" | "kanji";
type ConjType = "te" | "past" | "masu" | "dictionary" | "adj-negative" | "adj-past";
type VerbKind = "ru" | "u" | "irregular";
type AdjKind = "i" | "na";

type VocabCard = {
  id: string;
  lesson: number;
  jp: string;
  kana: string;
  es: string;
  kanji?: string;
};

type VerbEntry = {
  lesson: number;
  jp: string;
  kana: string;
  es: string;
  kind: VerbKind;
};

type AdjEntry = {
  lesson: number;
  jp: string;
  kana: string;
  es: string;
  kind: AdjKind;
};

type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correct: string;
  hint?: string;
};

const LESSONS = Array.from({ length: 12 }, (_, i) => i + 1);

const HIRAGANA: KanaPair[] = [
  ["あ", "a"], ["い", "i"], ["う", "u"], ["え", "e"], ["お", "o"],
  ["か", "ka"], ["き", "ki"], ["く", "ku"], ["け", "ke"], ["こ", "ko"],
  ["さ", "sa"], ["し", "shi"], ["す", "su"], ["せ", "se"], ["そ", "so"],
  ["た", "ta"], ["ち", "chi"], ["つ", "tsu"], ["て", "te"], ["と", "to"],
  ["な", "na"], ["に", "ni"], ["ぬ", "nu"], ["ね", "ne"], ["の", "no"],
  ["は", "ha"], ["ひ", "hi"], ["ふ", "fu"], ["へ", "he"], ["ほ", "ho"],
  ["ま", "ma"], ["み", "mi"], ["む", "mu"], ["め", "me"], ["も", "mo"],
  ["や", "ya"], ["ゆ", "yu"], ["よ", "yo"], ["ら", "ra"], ["り", "ri"],
  ["る", "ru"], ["れ", "re"], ["ろ", "ro"], ["わ", "wa"], ["を", "wo"], ["ん", "n"],
];

const KATAKANA: KanaPair[] = [
  ["ア", "a"], ["イ", "i"], ["ウ", "u"], ["エ", "e"], ["オ", "o"],
  ["カ", "ka"], ["キ", "ki"], ["ク", "ku"], ["ケ", "ke"], ["コ", "ko"],
  ["サ", "sa"], ["シ", "shi"], ["ス", "su"], ["セ", "se"], ["ソ", "so"],
  ["タ", "ta"], ["チ", "chi"], ["ツ", "tsu"], ["テ", "te"], ["ト", "to"],
  ["ナ", "na"], ["ニ", "ni"], ["ヌ", "nu"], ["ネ", "ne"], ["ノ", "no"],
  ["ハ", "ha"], ["ヒ", "hi"], ["フ", "fu"], ["ヘ", "he"], ["ホ", "ho"],
  ["マ", "ma"], ["ミ", "mi"], ["ム", "mu"], ["メ", "me"], ["モ", "mo"],
  ["ヤ", "ya"], ["ユ", "yu"], ["ヨ", "yo"], ["ラ", "ra"], ["リ", "ri"],
  ["ル", "ru"], ["レ", "re"], ["ロ", "ro"], ["ワ", "wa"], ["ヲ", "wo"], ["ン", "n"],
];

const GENKI_VOCAB: VocabCard[] = [
  { id: "l1-1", lesson: 1, jp: "学生", kana: "がくせい", es: "estudiante", kanji: "学生" },
  { id: "l1-2", lesson: 1, jp: "先生", kana: "せんせい", es: "profesor", kanji: "先生" },
  { id: "l1-3", lesson: 1, jp: "日本", kana: "にほん", es: "Japón", kanji: "日本" },
  { id: "l1-4", lesson: 1, jp: "専攻", kana: "せんこう", es: "carrera/especialidad", kanji: "専攻" },
  { id: "l1-5", lesson: 1, jp: "私", kana: "わたし", es: "yo", kanji: "私" },
  { id: "l2-1", lesson: 2, jp: "これ", kana: "これ", es: "esto" },
  { id: "l2-2", lesson: 2, jp: "それ", kana: "それ", es: "eso" },
  { id: "l2-3", lesson: 2, jp: "本", kana: "ほん", es: "libro", kanji: "本" },
  { id: "l2-4", lesson: 2, jp: "時計", kana: "とけい", es: "reloj", kanji: "時計" },
  { id: "l2-5", lesson: 2, jp: "鞄", kana: "かばん", es: "bolsa/mochila", kanji: "鞄" },
  { id: "l3-1", lesson: 3, jp: "映画", kana: "えいが", es: "película", kanji: "映画" },
  { id: "l3-2", lesson: 3, jp: "音楽", kana: "おんがく", es: "música", kanji: "音楽" },
  { id: "l3-3", lesson: 3, jp: "毎日", kana: "まいにち", es: "todos los días", kanji: "毎日" },
  { id: "l3-4", lesson: 3, jp: "図書館", kana: "としょかん", es: "biblioteca", kanji: "図書館" },
  { id: "l3-5", lesson: 3, jp: "何時", kana: "なんじ", es: "qué hora", kanji: "何時" },
  { id: "l4-1", lesson: 4, jp: "朝", kana: "あさ", es: "mañana", kanji: "朝" },
  { id: "l4-2", lesson: 4, jp: "晩", kana: "ばん", es: "noche", kanji: "晩" },
  { id: "l4-3", lesson: 4, jp: "週末", kana: "しゅうまつ", es: "fin de semana", kanji: "週末" },
  { id: "l4-4", lesson: 4, jp: "バス", kana: "バス", es: "autobús" },
  { id: "l4-5", lesson: 4, jp: "電車", kana: "でんしゃ", es: "tren", kanji: "電車" },
  { id: "l5-1", lesson: 5, jp: "海", kana: "うみ", es: "mar", kanji: "海" },
  { id: "l5-2", lesson: 5, jp: "山", kana: "やま", es: "montaña", kanji: "山" },
  { id: "l5-3", lesson: 5, jp: "一緒に", kana: "いっしょに", es: "juntos", kanji: "一緒に" },
  { id: "l5-4", lesson: 5, jp: "手紙", kana: "てがみ", es: "carta", kanji: "手紙" },
  { id: "l5-5", lesson: 5, jp: "お金", kana: "おかね", es: "dinero", kanji: "お金" },
  { id: "l6-1", lesson: 6, jp: "食べ物", kana: "たべもの", es: "comida", kanji: "食べ物" },
  { id: "l6-2", lesson: 6, jp: "飲み物", kana: "のみもの", es: "bebida", kanji: "飲み物" },
  { id: "l6-3", lesson: 6, jp: "朝ご飯", kana: "あさごはん", es: "desayuno", kanji: "朝ご飯" },
  { id: "l6-4", lesson: 6, jp: "晩ご飯", kana: "ばんごはん", es: "cena", kanji: "晩ご飯" },
  { id: "l6-5", lesson: 6, jp: "水", kana: "みず", es: "agua", kanji: "水" },
  { id: "l7-1", lesson: 7, jp: "家族", kana: "かぞく", es: "familia", kanji: "家族" },
  { id: "l7-2", lesson: 7, jp: "兄", kana: "あに", es: "hermano mayor", kanji: "兄" },
  { id: "l7-3", lesson: 7, jp: "姉", kana: "あね", es: "hermana mayor", kanji: "姉" },
  { id: "l7-4", lesson: 7, jp: "弟", kana: "おとうと", es: "hermano menor", kanji: "弟" },
  { id: "l7-5", lesson: 7, jp: "妹", kana: "いもうと", es: "hermana menor", kanji: "妹" },
  { id: "l8-1", lesson: 8, jp: "晴れ", kana: "はれ", es: "soleado", kanji: "晴れ" },
  { id: "l8-2", lesson: 8, jp: "雨", kana: "あめ", es: "lluvia", kanji: "雨" },
  { id: "l8-3", lesson: 8, jp: "雪", kana: "ゆき", es: "nieve", kanji: "雪" },
  { id: "l8-4", lesson: 8, jp: "天気", kana: "てんき", es: "clima", kanji: "天気" },
  { id: "l8-5", lesson: 8, jp: "夏", kana: "なつ", es: "verano", kanji: "夏" },
  { id: "l9-1", lesson: 9, jp: "病院", kana: "びょういん", es: "hospital", kanji: "病院" },
  { id: "l9-2", lesson: 9, jp: "薬", kana: "くすり", es: "medicina", kanji: "薬" },
  { id: "l9-3", lesson: 9, jp: "熱", kana: "ねつ", es: "fiebre", kanji: "熱" },
  { id: "l9-4", lesson: 9, jp: "仕事", kana: "しごと", es: "trabajo", kanji: "仕事" },
  { id: "l9-5", lesson: 9, jp: "心配", kana: "しんぱい", es: "preocupación", kanji: "心配" },
  { id: "l10-1", lesson: 10, jp: "駅", kana: "えき", es: "estación", kanji: "駅" },
  { id: "l10-2", lesson: 10, jp: "地図", kana: "ちず", es: "mapa", kanji: "地図" },
  { id: "l10-3", lesson: 10, jp: "右", kana: "みぎ", es: "derecha", kanji: "右" },
  { id: "l10-4", lesson: 10, jp: "左", kana: "ひだり", es: "izquierda", kanji: "左" },
  { id: "l10-5", lesson: 10, jp: "近い", kana: "ちかい", es: "cerca", kanji: "近い" },
  { id: "l11-1", lesson: 11, jp: "旅行", kana: "りょこう", es: "viaje", kanji: "旅行" },
  { id: "l11-2", lesson: 11, jp: "写真", kana: "しゃしん", es: "foto", kanji: "写真" },
  { id: "l11-3", lesson: 11, jp: "思い出", kana: "おもいで", es: "recuerdo", kanji: "思い出" },
  { id: "l11-4", lesson: 11, jp: "公園", kana: "こうえん", es: "parque", kanji: "公園" },
  { id: "l11-5", lesson: 11, jp: "案内", kana: "あんない", es: "guía", kanji: "案内" },
  { id: "l12-1", lesson: 12, jp: "文化", kana: "ぶんか", es: "cultura", kanji: "文化" },
  { id: "l12-2", lesson: 12, jp: "経験", kana: "けいけん", es: "experiencia", kanji: "経験" },
  { id: "l12-3", lesson: 12, jp: "将来", kana: "しょうらい", es: "futuro", kanji: "将来" },
  { id: "l12-4", lesson: 12, jp: "希望", kana: "きぼう", es: "esperanza", kanji: "希望" },
  { id: "l12-5", lesson: 12, jp: "準備", kana: "じゅんび", es: "preparación", kanji: "準備" },
];

const VERBS: VerbEntry[] = [
  { lesson: 3, jp: "食べる", kana: "たべる", es: "comer", kind: "ru" },
  { lesson: 3, jp: "見る", kana: "みる", es: "ver", kind: "ru" },
  { lesson: 3, jp: "行く", kana: "いく", es: "ir", kind: "u" },
  { lesson: 3, jp: "聞く", kana: "きく", es: "escuchar", kind: "u" },
  { lesson: 4, jp: "起きる", kana: "おきる", es: "levantarse", kind: "ru" },
  { lesson: 4, jp: "寝る", kana: "ねる", es: "dormir", kind: "ru" },
  { lesson: 4, jp: "帰る", kana: "かえる", es: "volver", kind: "u" },
  { lesson: 5, jp: "読む", kana: "よむ", es: "leer", kind: "u" },
  { lesson: 5, jp: "書く", kana: "かく", es: "escribir", kind: "u" },
  { lesson: 6, jp: "買う", kana: "かう", es: "comprar", kind: "u" },
  { lesson: 6, jp: "飲む", kana: "のむ", es: "beber", kind: "u" },
  { lesson: 7, jp: "する", kana: "する", es: "hacer", kind: "irregular" },
  { lesson: 7, jp: "来る", kana: "くる", es: "venir", kind: "irregular" },
  { lesson: 8, jp: "泳ぐ", kana: "およぐ", es: "nadar", kind: "u" },
  { lesson: 9, jp: "待つ", kana: "まつ", es: "esperar", kind: "u" },
  { lesson: 10, jp: "会う", kana: "あう", es: "encontrarse", kind: "u" },
  { lesson: 11, jp: "持っていく", kana: "もっていく", es: "llevar", kind: "u" },
  { lesson: 12, jp: "覚える", kana: "おぼえる", es: "memorizar", kind: "ru" },
];

const ADJECTIVES: AdjEntry[] = [
  { lesson: 5, jp: "高い", kana: "たかい", es: "caro/alto", kind: "i" },
  { lesson: 5, jp: "安い", kana: "やすい", es: "barato", kind: "i" },
  { lesson: 5, jp: "静か", kana: "しずか", es: "tranquilo", kind: "na" },
  { lesson: 6, jp: "おいしい", kana: "おいしい", es: "delicioso", kind: "i" },
  { lesson: 6, jp: "元気", kana: "げんき", es: "saludable/animado", kind: "na" },
  { lesson: 8, jp: "暑い", kana: "あつい", es: "caluroso", kind: "i" },
  { lesson: 8, jp: "寒い", kana: "さむい", es: "frío", kind: "i" },
  { lesson: 9, jp: "便利", kana: "べんり", es: "conveniente", kind: "na" },
  { lesson: 10, jp: "遠い", kana: "とおい", es: "lejano", kind: "i" },
  { lesson: 11, jp: "有名", kana: "ゆうめい", es: "famoso", kind: "na" },
];

const U_ENDINGS: Record<string, { masu: string; te: string; past: string }> = {
  "う": { masu: "います", te: "って", past: "った" },
  "く": { masu: "きます", te: "いて", past: "いた" },
  "ぐ": { masu: "ぎます", te: "いで", past: "いだ" },
  "す": { masu: "します", te: "して", past: "した" },
  "つ": { masu: "ちます", te: "って", past: "った" },
  "ぬ": { masu: "にます", te: "んで", past: "んだ" },
  "ぶ": { masu: "びます", te: "んで", past: "んだ" },
  "む": { masu: "みます", te: "んで", past: "んだ" },
  "る": { masu: "ります", te: "って", past: "った" },
};

function shuffle<T>(arr: T[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickN<T>(arr: T[], n: number) {
  if (arr.length <= n) return shuffle(arr);
  return shuffle(arr).slice(0, n);
}

function romajiOptions(pool: KanaPair[], correct: string) {
  const distractors = pickN(
    pool.map((p) => p[1]).filter((r) => r !== correct),
    3,
  );
  return shuffle([correct, ...distractors]);
}

function toTeForm(verb: VerbEntry) {
  if (verb.kind === "irregular") {
    if (verb.kana === "する") return "して";
    if (verb.kana === "くる") return "きて";
  }
  if (verb.kind === "ru") return `${verb.kana.slice(0, -1)}て`;
  if (verb.kana === "いく") return "いって";
  const end = verb.kana.slice(-1);
  const stem = verb.kana.slice(0, -1);
  return `${stem}${U_ENDINGS[end]?.te || "って"}`;
}

function toPastShort(verb: VerbEntry) {
  if (verb.kind === "irregular") {
    if (verb.kana === "する") return "した";
    if (verb.kana === "くる") return "きた";
  }
  if (verb.kind === "ru") return `${verb.kana.slice(0, -1)}た`;
  if (verb.kana === "いく") return "いった";
  const end = verb.kana.slice(-1);
  const stem = verb.kana.slice(0, -1);
  return `${stem}${U_ENDINGS[end]?.past || "った"}`;
}

function toMasu(verb: VerbEntry) {
  if (verb.kind === "irregular") {
    if (verb.kana === "する") return "します";
    if (verb.kana === "くる") return "きます";
  }
  if (verb.kind === "ru") return `${verb.kana.slice(0, -1)}ます`;
  const end = verb.kana.slice(-1);
  const stem = verb.kana.slice(0, -1);
  return `${stem}${U_ENDINGS[end]?.masu || "います"}`;
}

function toAdjNegative(adj: AdjEntry) {
  if (adj.kind === "i") return `${adj.kana.slice(0, -1)}くない`;
  return `${adj.kana}じゃない`;
}

function toAdjPast(adj: AdjEntry) {
  if (adj.kind === "i") return `${adj.kana.slice(0, -1)}かった`;
  return `${adj.kana}だった`;
}

function buildParticleQuestions(count: number): QuizQuestion[] {
  const subjects = ["わたし", "ともだち", "せんせい", "がくせい", "おとうと", "いもうと"];
  const places = ["としょかん", "がっこう", "うち", "きっさてん", "こうえん", "えき"];
  const objects = ["ほん", "しんぶん", "えいが", "パン", "みず", "じてんしゃ"];
  const movers = ["いきます", "かえります", "きます"];
  const actions = ["べんきょうします", "はたらきます", "はなします"];
  const transitive = ["たべます", "のみます", "よみます", "みます"];

  const all: QuizQuestion[] = [];
  subjects.forEach((s) => {
    all.push({
      id: `p-ha-${s}`,
      prompt: `${s}___がくせいです。`,
      options: ["は", "を", "に", "で"],
      correct: "は",
    });
  });
  objects.forEach((o) => {
    all.push({
      id: `p-wo-${o}`,
      prompt: `${o}___${transitive[Math.floor(Math.random() * transitive.length)]}。`,
      options: ["を", "が", "に", "で"],
      correct: "を",
    });
  });
  places.forEach((p) => {
    all.push({
      id: `p-ni-${p}`,
      prompt: `${p}___${movers[Math.floor(Math.random() * movers.length)]}。`,
      options: ["に", "で", "を", "は"],
      correct: "に",
    });
    all.push({
      id: `p-de-${p}`,
      prompt: `${p}___${actions[Math.floor(Math.random() * actions.length)]}。`,
      options: ["で", "に", "が", "を"],
      correct: "で",
    });
  });
  subjects.forEach((s) => {
    all.push({
      id: `p-ga-${s}`,
      prompt: `だれ___きましたか。(${s})`,
      options: ["が", "は", "を", "で"],
      correct: "が",
    });
  });

  return pickN(all, count);
}

function buildVocabQuestions(lessons: number[], count: number): QuizQuestion[] {
  const pool = GENKI_VOCAB.filter((v) => lessons.includes(v.lesson));
  const source = pool.length >= 4 ? pool : GENKI_VOCAB;
  const selected = pickN(source, count);

  return selected.map((card, idx) => {
    const distractors = pickN(
      source.filter((c) => c.id !== card.id).map((c) => c.es),
      3,
    );
    return {
      id: `v-${card.id}-${idx}`,
      prompt: `${card.jp} (${card.kana}) significa:`,
      options: shuffle([card.es, ...distractors]),
      correct: card.es,
      hint: `Lección ${card.lesson}`,
    };
  });
}

function buildKanjiQuestions(lessons: number[], count: number): QuizQuestion[] {
  const pool = GENKI_VOCAB.filter((v) => lessons.includes(v.lesson) && v.kanji);
  const source = pool.length >= 4 ? pool : GENKI_VOCAB.filter((v) => v.kanji);
  const selected = pickN(source, count);

  return selected.map((card, idx) => {
    const distractors = pickN(
      source.filter((c) => c.id !== card.id).map((c) => c.kana),
      3,
    );
    return {
      id: `k-${card.id}-${idx}`,
      prompt: `Lectura de ${card.kanji}:`,
      options: shuffle([card.kana, ...distractors]),
      correct: card.kana,
      hint: `${card.es} · Lección ${card.lesson}`,
    };
  });
}

function buildConjugationQuestions(lessons: number[], types: ConjType[], count: number): QuizQuestion[] {
  const qs: QuizQuestion[] = [];
  const verbs = VERBS.filter((v) => lessons.includes(v.lesson));
  const adjs = ADJECTIVES.filter((a) => lessons.includes(a.lesson));

  if (types.includes("te")) {
    verbs.forEach((v) => {
      const correct = toTeForm(v);
      const distractors = pickN(
        VERBS.filter((x) => x.kana !== v.kana).map((x) => toTeForm(x)),
        3,
      );
      qs.push({
        id: `c-te-${v.kana}`,
        prompt: `${v.kana} (${v.es}) → て形`,
        options: shuffle([correct, ...distractors]),
        correct,
      });
    });
  }

  if (types.includes("past")) {
    verbs.forEach((v) => {
      const correct = toPastShort(v);
      const distractors = pickN(
        VERBS.filter((x) => x.kana !== v.kana).map((x) => toPastShort(x)),
        3,
      );
      qs.push({
        id: `c-past-${v.kana}`,
        prompt: `${v.kana} (${v.es}) → pasado corto`,
        options: shuffle([correct, ...distractors]),
        correct,
      });
    });
  }

  if (types.includes("masu")) {
    verbs.forEach((v) => {
      const correct = toMasu(v);
      const distractors = pickN(
        VERBS.filter((x) => x.kana !== v.kana).map((x) => toMasu(x)),
        3,
      );
      qs.push({
        id: `c-masu-${v.kana}`,
        prompt: `${v.kana} (${v.es}) → ます形`,
        options: shuffle([correct, ...distractors]),
        correct,
      });
    });
  }

  if (types.includes("dictionary")) {
    verbs.forEach((v) => {
      const correct = v.kana;
      const distractors = pickN(
        VERBS.filter((x) => x.kana !== v.kana).map((x) => x.kana),
        3,
      );
      qs.push({
        id: `c-dict-${v.kana}`,
        prompt: `${toMasu(v)} → forma diccionario`,
        options: shuffle([correct, ...distractors]),
        correct,
      });
    });
  }

  if (types.includes("adj-negative")) {
    adjs.forEach((a) => {
      const correct = toAdjNegative(a);
      const distractors = pickN(
        ADJECTIVES.filter((x) => x.kana !== a.kana).map((x) => toAdjNegative(x)),
        3,
      );
      qs.push({
        id: `c-adjn-${a.kana}`,
        prompt: `${a.kana} (${a.es}) → negativo`,
        options: shuffle([correct, ...distractors]),
        correct,
      });
    });
  }

  if (types.includes("adj-past")) {
    adjs.forEach((a) => {
      const correct = toAdjPast(a);
      const distractors = pickN(
        ADJECTIVES.filter((x) => x.kana !== a.kana).map((x) => toAdjPast(x)),
        3,
      );
      qs.push({
        id: `c-adjp-${a.kana}`,
        prompt: `${a.kana} (${a.es}) → pasado`,
        options: shuffle([correct, ...distractors]),
        correct,
      });
    });
  }

  if (qs.length === 0) return [];
  return pickN(qs, count);
}

export default function StudyPage() {
  const [activeTab, setActiveTab] = useState<"kana" | "flashcards" | "quiz">("kana");
  const [userKey, setUserKey] = useState("anon");

  const [kanaSet, setKanaSet] = useState<"hiragana" | "katakana">("hiragana");
  const [kanaRunning, setKanaRunning] = useState(false);
  const [kanaTime, setKanaTime] = useState(60);
  const [kanaScore, setKanaScore] = useState(0);
  const [kanaBest, setKanaBest] = useState(0);
  const [kanaQuestion, setKanaQuestion] = useState<{ char: string; correct: string; options: string[] }>({
    char: "あ",
    correct: "a",
    options: ["a", "i", "u", "e"],
  });

  const [flashLesson, setFlashLesson] = useState<number>(1);
  const [flashIndex, setFlashIndex] = useState(0);
  const [flashBack, setFlashBack] = useState(false);
  const [srsMap, setSrsMap] = useState<Record<string, number>>({});

  const [quizMode, setQuizMode] = useState<QuizMode>("particles");
  const [quizCount, setQuizCount] = useState<QuizCount>(10);
  const [quizLessons, setQuizLessons] = useState<number[]>([1]);
  const [conjTypes, setConjTypes] = useState<ConjType[]>(["te", "masu"]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizChoice, setQuizChoice] = useState<string | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);

  useEffect(() => {
    const boot = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const key = user?.id || "anon";
      setUserKey(key);
      try {
        const raw = localStorage.getItem(`study-srs-${key}`);
        if (raw) setSrsMap(JSON.parse(raw));
      } catch {}
      try {
        const rawBest = localStorage.getItem(`study-kana-best-${key}`);
        if (rawBest) {
          const value = Number(rawBest);
          if (!Number.isNaN(value) && value > 0) setKanaBest(value);
        }
      } catch {}
    };
    void boot();
  }, []);

  useEffect(() => {
    if (!kanaRunning || kanaTime <= 0) return;
    const timer = window.setTimeout(() => setKanaTime((v) => v - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [kanaRunning, kanaTime]);

  useEffect(() => {
    if (kanaTime <= 0) setKanaRunning(false);
  }, [kanaTime]);

  useEffect(() => {
    if (kanaScore <= kanaBest) return;
    setKanaBest(kanaScore);
    try {
      localStorage.setItem(`study-kana-best-${userKey}`, String(kanaScore));
    } catch {}
  }, [kanaScore, kanaBest, userKey]);

  const kanaPool = kanaSet === "hiragana" ? HIRAGANA : KATAKANA;

  const createKanaQuestion = () => {
    const [char, romaji] = kanaPool[Math.floor(Math.random() * kanaPool.length)];
    setKanaQuestion({ char, correct: romaji, options: romajiOptions(kanaPool, romaji) });
  };

  const startKana = () => {
    setKanaRunning(true);
    setKanaTime(60);
    setKanaScore(0);
    createKanaQuestion();
  };

  const answerKana = (choice: string) => {
    if (!kanaRunning) return;
    if (choice === kanaQuestion.correct) setKanaScore((v) => v + 1);
    createKanaQuestion();
  };

  const flashDeck = useMemo(() => GENKI_VOCAB.filter((v) => v.lesson === flashLesson), [flashLesson]);
  const dueDeck = useMemo(() => {
    const now = Date.now();
    const due = flashDeck.filter((c) => !srsMap[c.id] || srsMap[c.id] <= now);
    return due.length > 0 ? due : flashDeck;
  }, [flashDeck, srsMap]);

  const flashCard = dueDeck[flashIndex % Math.max(1, dueDeck.length)];
  const flashDueCount = useMemo(() => {
    const now = Date.now();
    return flashDeck.filter((c) => !srsMap[c.id] || srsMap[c.id] <= now).length;
  }, [flashDeck, srsMap]);
  const flashCurrentNumber = dueDeck.length > 0 ? (flashIndex % dueDeck.length) + 1 : 0;

  const setSrs = (cardId: string, quality: "again" | "hard" | "good") => {
    const days = quality === "again" ? 1 : quality === "hard" ? 3 : 7;
    const next = Date.now() + days * 24 * 60 * 60 * 1000;
    const nextMap = { ...srsMap, [cardId]: next };
    setSrsMap(nextMap);
    try {
      localStorage.setItem(`study-srs-${userKey}`, JSON.stringify(nextMap));
    } catch {}
    setFlashBack(false);
    setFlashIndex((v) => v + 1);
  };

  const skipFlash = () => {
    setFlashBack(false);
    setFlashIndex((v) => v + 1);
  };

  const toggleLesson = (lesson: number) => {
    setQuizLessons((prev) => {
      const exists = prev.includes(lesson);
      if (exists) return prev.filter((x) => x !== lesson);
      return [...prev, lesson].sort((a, b) => a - b);
    });
  };

  const toggleConjType = (type: ConjType) => {
    setConjTypes((prev) => (prev.includes(type) ? prev.filter((x) => x !== type) : [...prev, type]));
  };

  const startQuiz = () => {
    const lessons = quizLessons.length > 0 ? quizLessons : [1];
    let generated: QuizQuestion[] = [];

    if (quizMode === "particles") generated = buildParticleQuestions(quizCount);
    if (quizMode === "vocab") generated = buildVocabQuestions(lessons, quizCount);
    if (quizMode === "kanji") generated = buildKanjiQuestions(lessons, quizCount);
    if (quizMode === "conjugation") {
      const types: ConjType[] = conjTypes.length > 0 ? [...conjTypes] : ["te"];
      generated = buildConjugationQuestions(lessons, types, quizCount);
    }

    if (generated.length === 0) {
      alert("No hay suficientes preguntas con la configuración actual.");
      return;
    }

    setQuizQuestions(generated);
    setQuizIndex(0);
    setQuizScore(0);
    setQuizChoice(null);
    setQuizFinished(false);
  };

  const currentQ = quizQuestions[quizIndex] || null;
  const kanaTimePct = Math.max(0, Math.min(100, (kanaTime / 60) * 100));
  const quizProgressPct = quizQuestions.length
    ? Math.round(((quizFinished ? quizQuestions.length : quizIndex + 1) / quizQuestions.length) * 100)
    : 0;

  const answerQuiz = (option: string) => {
    if (!currentQ || quizChoice) return;
    setQuizChoice(option);
    if (option === currentQ.correct) setQuizScore((v) => v + 1);
  };

  const nextQuiz = () => {
    if (!currentQ) return;
    if (quizIndex >= quizQuestions.length - 1) {
      setQuizFinished(true);
      return;
    }
    setQuizIndex((v) => v + 1);
    setQuizChoice(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(900px 420px at 50% -10%, rgba(52,197,166,.08), transparent 65%), #f6f7f8", padding: 14 }}>
      <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 12 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <Link href="/" style={{ textDecoration: "none", border: "1px solid rgba(17,17,20,.1)", background: "#fff", color: "#222", borderRadius: 999, padding: "8px 12px", fontSize: 13 }}>← Volver</Link>
          <div style={{ fontSize: 12, color: "#7c7c85", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>Nihongo Study</div>
        </header>

        <section style={{ background: "linear-gradient(145deg, #ffffff, #f7fffc)", border: "1px solid rgba(17,17,20,.07)", borderRadius: 18, padding: 14 }}>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.1, letterSpacing: "-.02em" }}>Study Lab</h1>
          <p style={{ margin: "8px 0 0", color: "#667085", fontSize: 14, lineHeight: 1.5 }}>
            Herramientas cortas y enfocadas para practicar Genki I: kana, flashcards SRS y quizzes configurables.
          </p>
        </section>

        <section style={{ background: "#fff", border: "1px solid rgba(17,17,20,.07)", borderRadius: 18, padding: 10, display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setActiveTab("kana")} style={{ border: 0, borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: activeTab === "kana" ? "#fff" : "#61616e", background: activeTab === "kana" ? "#111114" : "#f3f4f6" }}>Kana Sprint</button>
          <button type="button" onClick={() => setActiveTab("flashcards")} style={{ border: 0, borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: activeTab === "flashcards" ? "#fff" : "#61616e", background: activeTab === "flashcards" ? "#111114" : "#f3f4f6" }}>Flashcards</button>
          <button type="button" onClick={() => setActiveTab("quiz")} style={{ border: 0, borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: activeTab === "quiz" ? "#fff" : "#61616e", background: activeTab === "quiz" ? "#111114" : "#f3f4f6" }}>QUIZ</button>
        </section>

        {activeTab === "kana" && (
          <section style={{ background: "#fff", border: "1px solid rgba(17,17,20,.07)", borderRadius: 20, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 24 }}>Kana Sprint</h2>
              <div style={{ display: "inline-flex", gap: 4, border: "1px solid rgba(17,17,20,.08)", borderRadius: 999, padding: 3 }}>
                <button type="button" onClick={() => setKanaSet("hiragana")} style={{ border: 0, borderRadius: 999, padding: "6px 10px", background: kanaSet === "hiragana" ? "#111114" : "transparent", color: kanaSet === "hiragana" ? "#fff" : "#666" }}>Hiragana</button>
                <button type="button" onClick={() => setKanaSet("katakana")} style={{ border: 0, borderRadius: 999, padding: "6px 10px", background: kanaSet === "katakana" ? "#111114" : "transparent", color: kanaSet === "katakana" ? "#fff" : "#666" }}>Katakana</button>
              </div>
            </div>
            <p style={{ color: "#6b7280", fontSize: 14 }}>60 segundos. Elige la romanización correcta (4 opciones).</p>
            <div style={{ marginTop: 8, height: 7, borderRadius: 999, background: "#ecedf1", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${kanaTimePct}%`, background: "linear-gradient(90deg, #34c5a6, #25a98f)" }} />
            </div>
            <div style={{ display: "grid", placeItems: "center", margin: "20px 0" }}>
              <div style={{ fontSize: 80, fontWeight: 800, lineHeight: 1 }}>{kanaQuestion.char}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8 }}>
              {kanaQuestion.options.map((op) => (
                <button key={op} type="button" onClick={() => answerKana(op)} disabled={!kanaRunning} style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 12, background: "#fff", padding: "10px 12px", fontSize: 16, fontWeight: 700, cursor: kanaRunning ? "pointer" : "not-allowed", opacity: kanaRunning ? 1 : .6 }}>{op}</button>
              ))}
            </div>
            <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ color: "#374151", fontWeight: 700 }}>Tiempo: {kanaTime}s · Score: {kanaScore} · Mejor: {kanaBest}</div>
              <button type="button" onClick={startKana} style={{ border: 0, borderRadius: 999, background: "#111114", color: "#fff", padding: "8px 12px", fontWeight: 700 }}>{kanaRunning ? "Reiniciar" : "Iniciar"}</button>
            </div>
          </section>
        )}

        {activeTab === "flashcards" && (
          <section style={{ background: "#fff", border: "1px solid rgba(17,17,20,.07)", borderRadius: 20, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 24 }}>Flashcards Genki I</h2>
              <select value={flashLesson} onChange={(e) => { setFlashLesson(Number(e.target.value)); setFlashIndex(0); setFlashBack(false); }} style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 10, padding: "8px 10px", fontWeight: 700 }}>
                {LESSONS.map((l) => <option key={l} value={l}>Lección {l}</option>)}
              </select>
            </div>
            <p style={{ color: "#6b7280", fontSize: 14, margin: "8px 0 12px" }}>Deck por lección, tarjeta volteable y SRS.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#0f766e", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 999, padding: "4px 8px" }}>Pendientes hoy: {flashDueCount}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#475467", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 999, padding: "4px 8px" }}>Deck: {flashDeck.length} tarjetas</span>
            </div>

            {flashCard ? (
              <>
                <button type="button" onClick={() => setFlashBack((v) => !v)} style={{ width: "100%", textAlign: "left", border: "1px solid rgba(17,17,20,.08)", borderRadius: 16, background: "#fbfbfc", minHeight: 170, padding: 16, cursor: "pointer" }}>
                  {!flashBack ? (
                    <div>
                      <div style={{ fontSize: 34, fontWeight: 800, color: "#111114" }}>{flashCard.kanji || flashCard.jp}</div>
                      <div style={{ marginTop: 8, color: "#6b7280", fontSize: 20 }}>{flashCard.kana}</div>
                      <div style={{ marginTop: 12, color: "#64748b", fontSize: 12, fontWeight: 700 }}>Toca para voltear</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ color: "#7c7c85", fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>Traducción</div>
                      <div style={{ marginTop: 8, fontSize: 30, fontWeight: 800 }}>{flashCard.es}</div>
                      <div style={{ marginTop: 12, color: "#64748b", fontSize: 12, fontWeight: 700 }}>Lección {flashCard.lesson}</div>
                    </div>
                  )}
                </button>

                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ color: "#6b7280", fontSize: 13 }}>Tarjeta {flashCurrentNumber} de {Math.max(1, dueDeck.length)}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => setSrs(flashCard.id, "again")} style={{ border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 999, background: "#fff", padding: "7px 10px", fontWeight: 700 }}>No lo sé</button>
                    <button type="button" onClick={() => setSrs(flashCard.id, "hard")} style={{ border: "1px solid #fde68a", color: "#b45309", borderRadius: 999, background: "#fff", padding: "7px 10px", fontWeight: 700 }}>Difícil</button>
                    <button type="button" onClick={() => setSrs(flashCard.id, "good")} style={{ border: "1px solid #86efac", color: "#15803d", borderRadius: 999, background: "#fff", padding: "7px 10px", fontWeight: 700 }}>Bien</button>
                    <button type="button" onClick={skipFlash} style={{ border: "1px solid rgba(17,17,20,.1)", color: "#344054", borderRadius: 999, background: "#fff", padding: "7px 10px", fontWeight: 700 }}>Saltar</button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ border: "1px dashed rgba(17,17,20,.14)", borderRadius: 12, padding: 16, color: "#7c7c85" }}>No hay tarjetas en esta lección.</div>
            )}
          </section>
        )}

        {activeTab === "quiz" && (
          <section style={{ background: "#fff", border: "1px solid rgba(17,17,20,.07)", borderRadius: 20, padding: 16 }}>
            <h2 style={{ margin: 0, fontSize: 24 }}>QUIZ</h2>
            <p style={{ color: "#6b7280", fontSize: 14 }}>Customiza tipo, lecciones y cantidad de preguntas.</p>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {([
                  ["particles", "Partículas"],
                  ["conjugation", "Conjugación"],
                  ["vocab", "Vocab"],
                  ["kanji", "Kanji"],
                ] as [QuizMode, string][]).map(([mode, label]) => (
                  <button key={mode} type="button" onClick={() => setQuizMode(mode)} style={{ border: 0, borderRadius: 999, padding: "7px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: quizMode === mode ? "#fff" : "#61616e", background: quizMode === mode ? "#111114" : "#f3f4f6" }}>{label}</button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[10, 20, 30].map((n) => (
                  <button key={n} type="button" onClick={() => setQuizCount(n as QuizCount)} style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700, background: quizCount === n ? "#111114" : "#fff", color: quizCount === n ? "#fff" : "#333" }}>{n} preguntas</button>
                ))}
              </div>

              {quizMode !== "particles" && (
                <div>
                  <div style={{ fontSize: 12, color: "#7c7c85", marginBottom: 6, fontWeight: 700 }}>Lecciones (acumulable)</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {LESSONS.map((lesson) => (
                      <button key={lesson} type="button" onClick={() => toggleLesson(lesson)} style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 999, padding: "6px 9px", fontSize: 12, fontWeight: 700, background: quizLessons.includes(lesson) ? "#111114" : "#fff", color: quizLessons.includes(lesson) ? "#fff" : "#333" }}>L{lesson}</button>
                    ))}
                  </div>
                </div>
              )}

              {quizMode === "conjugation" && (
                <div>
                  <div style={{ fontSize: 12, color: "#7c7c85", marginBottom: 6, fontWeight: 700 }}>Tipos de conjugación</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {([
                      ["te", "Forma て"],
                      ["past", "Pasado corto"],
                      ["masu", "Forma ます"],
                      ["dictionary", "Diccionario"],
                      ["adj-negative", "Adjetivo negativo"],
                      ["adj-past", "Adjetivo pasado"],
                    ] as [ConjType, string][]).map(([kind, label]) => (
                      <button key={kind} type="button" onClick={() => toggleConjType(kind)} style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 999, padding: "6px 9px", fontSize: 12, fontWeight: 700, background: conjTypes.includes(kind) ? "#111114" : "#fff", color: conjTypes.includes(kind) ? "#fff" : "#333" }}>{label}</button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <button type="button" onClick={startQuiz} style={{ border: 0, borderRadius: 999, background: "linear-gradient(135deg,#34c5a6,#25a98f)", color: "#fff", padding: "9px 14px", fontWeight: 700 }}>Iniciar quiz</button>
              </div>
            </div>

            {currentQ && !quizFinished && (
              <div style={{ marginTop: 14, border: "1px solid rgba(17,17,20,.08)", borderRadius: 14, padding: 12, background: "#fbfbfc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>Pregunta {quizIndex + 1} / {quizQuestions.length}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>Score actual: {quizScore}</div>
                </div>
                <div style={{ marginTop: 8, height: 7, borderRadius: 999, background: "#ecedf1", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${quizProgressPct}%`, background: "linear-gradient(90deg, #34c5a6, #25a98f)" }} />
                </div>
                <div style={{ marginTop: 8, fontSize: 20, fontWeight: 800, color: "#111114" }}>{currentQ.prompt}</div>
                {currentQ.hint && <div style={{ marginTop: 4, color: "#6b7280", fontSize: 13 }}>{currentQ.hint}</div>}
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {currentQ.options.map((op) => {
                    const isSelected = quizChoice === op;
                    const isCorrect = op === currentQ.correct;
                    const showResult = Boolean(quizChoice);
                    let bg = "#fff";
                    let color = "#222";
                    let border = "1px solid rgba(17,17,20,.1)";
                    if (showResult && isCorrect) {
                      bg = "#ecfdf5";
                      color = "#166534";
                      border = "1px solid #86efac";
                    } else if (showResult && isSelected && !isCorrect) {
                      bg = "#fef2f2";
                      color = "#991b1b";
                      border = "1px solid #fca5a5";
                    }

                    return (
                      <button key={op} type="button" onClick={() => answerQuiz(op)} disabled={Boolean(quizChoice)} style={{ textAlign: "left", border, borderRadius: 10, background: bg, color, padding: "8px 10px", fontSize: 14, fontWeight: 600, cursor: quizChoice ? "default" : "pointer" }}>
                        {op}
                      </button>
                    );
                  })}
                </div>

                {quizChoice && (
                  <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700, color: quizChoice === currentQ.correct ? "#15803d" : "#b91c1c" }}>
                      {quizChoice === currentQ.correct ? "Correcto" : `Incorrecto. Respuesta: ${currentQ.correct}`}
                    </div>
                    <button type="button" onClick={nextQuiz} style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 999, background: "#fff", padding: "7px 10px", fontWeight: 700 }}>
                      {quizIndex >= quizQuestions.length - 1 ? "Ver score" : "Siguiente"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {quizFinished && (
              <div style={{ marginTop: 14, border: "1px solid rgba(17,17,20,.08)", borderRadius: 14, padding: 14, background: "#f8fafc" }}>
                <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>Resultado</div>
                <div style={{ marginTop: 6, fontSize: 30, fontWeight: 800 }}>{quizScore} / {quizQuestions.length}</div>
                <div style={{ marginTop: 6, color: "#6b7280" }}>
                  {Math.round((quizScore / Math.max(1, quizQuestions.length)) * 100)}% de aciertos
                </div>
                <button type="button" onClick={startQuiz} style={{ marginTop: 10, border: "1px solid rgba(17,17,20,.12)", background: "#fff", color: "#111114", borderRadius: 999, padding: "7px 10px", fontWeight: 700 }}>
                  Repetir quiz
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
