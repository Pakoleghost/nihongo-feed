"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { GENKI_VOCAB_BY_LESSON } from "@/lib/genki-vocab-by-lesson";
import { GENKI_KANJI_BY_LESSON } from "@/lib/genki-kanji-by-lesson";

type KanaPair = readonly [string, string];
type QuizCount = 10 | 20 | 30;
type QuizMode = "particles" | "conjugation" | "vocab" | "kanji";
type ConjType = "te" | "past" | "masu" | "dictionary" | "adj-negative" | "adj-past";
type VerbKind = "ru" | "u" | "irregular";
type AdjKind = "i" | "na";
type KanaMode = "hiragana" | "katakana" | "mixed";
type VkBucketKey = "l1_2" | "l3_4" | "l5_6" | "l7_8" | "l9_10" | "l11_12";

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

type QuizQuestionType = "mcq" | "text" | "match" | "reorder";
type QuizCategory = "vocab" | "kanji" | "particles" | "conjugation" | "grammar" | "reading";
type ReorderToken = { id: string; label: string };

type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correct: string;
  hint?: string;
  type?: QuizQuestionType;
  acceptedAnswers?: string[];
  matchLeft?: string[];
  matchRight?: string[];
  reorderTokens?: ReorderToken[];
  lesson?: number;
  category?: QuizCategory;
  explanation?: string;
  stableKey?: string;
};

type KanaScoreRow = {
  user_id: string;
  mode: string;
  best_score: number;
  updated_at?: string | null;
  profiles?: {
    username?: string | null;
    full_name?: string | null;
  } | null;
};
type KanaRoundPayload = { mode: KanaMode; score: number; answers: number; durationMs: number };
type VkRoundPayload = { bucket: VkBucketKey; score: number; answers: number; durationMs: number };
type ExamAttempt = {
  lesson: number;
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  createdAt: string;
  categoryBreakdown: Array<{ category: string; correct: number; total: number }>;
};

function getLocalWeekStart(date = new Date()) {
  const value = new Date(date);
  const day = value.getDay();
  const diff = day === 0 ? 6 : day - 1;
  value.setHours(0, 0, 0, 0);
  value.setDate(value.getDate() - diff);
  return value;
}

function getNextLocalWeekStart(date = new Date()) {
  const start = getLocalWeekStart(date);
  start.setDate(start.getDate() + 7);
  return start;
}

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}

function isSameLocalWeek(isoA?: string | null, isoB?: string | null) {
  if (!isoA || !isoB) return false;
  const a = new Date(isoA);
  const b = new Date(isoB);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
  return getLocalWeekStart(a).getTime() === getLocalWeekStart(b).getTime();
}

function getKanaRunValidation(score: number, answers: number, durationMs: number) {
  const durationSec = Math.max(1, durationMs / 1000);
  const answersPerSecond = answers / durationSec;
  const reasons: string[] = [];
  if (score < 0 || answers < 0 || score > answers) reasons.push("conteo inválido");
  // Use a wider window to avoid false negatives from tab throttling/mobile sleep.
  if (durationMs < 5_000 || durationMs > 300_000) reasons.push("duración inválida");
  if (score > 90) reasons.push("score fuera de rango humano");
  if (answersPerSecond > 4.5) reasons.push("velocidad no plausible");
  return { ok: reasons.length === 0, reasons };
}

function getRunValidation(score: number, answers: number, durationMs: number, maxScore: number, maxAnswersPerSecond: number) {
  const durationSec = Math.max(1, durationMs / 1000);
  const answersPerSecond = answers / durationSec;
  const reasons: string[] = [];
  if (score < 0 || answers < 0 || score > answers) reasons.push("conteo inválido");
  // Use a wider window to avoid false negatives from tab throttling/mobile sleep.
  if (durationMs < 5_000 || durationMs > 300_000) reasons.push("duración inválida");
  if (score > maxScore) reasons.push("score fuera de rango humano");
  if (answersPerSecond > maxAnswersPerSecond) reasons.push("velocidad no plausible");
  return { ok: reasons.length === 0, reasons };
}

const VK_BUCKETS: Array<{ key: VkBucketKey; label: string; lessons: number[] }> = [
  { key: "l1_2", label: "L1-2", lessons: [1, 2] },
  { key: "l3_4", label: "L3-4", lessons: [3, 4] },
  { key: "l5_6", label: "L5-6", lessons: [5, 6] },
  { key: "l7_8", label: "L7-8", lessons: [7, 8] },
  { key: "l9_10", label: "L9-10", lessons: [9, 10] },
  { key: "l11_12", label: "L11-12", lessons: [11, 12] },
];
const VK_MODE_KEYS = VK_BUCKETS.map((bucket) => `vk:${bucket.key}`);
const FLASHCARD_ROUTE_GROUPS = [
  { id: "route-foundations", title: "Fundamentos", subtitle: "Kana, vocab base y primeras estructuras.", lessons: [1, 2], accent: "#4f46e5", surface: "linear-gradient(145deg,#eef2ff,#ffffff)" },
  { id: "route-core-a", title: "Núcleo I", subtitle: "Verbos, kanji inicial y práctica cotidiana.", lessons: [3, 4, 5], accent: "#0f766e", surface: "linear-gradient(145deg,#ecfeff,#ffffff)" },
  { id: "route-core-b", title: "Núcleo II", subtitle: "Forma て, más kanji y vocab de uso real.", lessons: [6, 7, 8], accent: "#b45309", surface: "linear-gradient(145deg,#fff7ed,#ffffff)" },
  { id: "route-bridge", title: "Consolidación", subtitle: "Lecciones altas para repasar antes de examen.", lessons: [9, 10, 11, 12], accent: "#be185d", surface: "linear-gradient(145deg,#fdf2f8,#ffffff)" },
] as const;

type StudyView = "kana" | "flashcards" | "quiz" | "sprint" | "exam";
const EXAM_PASSING_PERCENT = 70;
const EXAM_QUESTION_COUNT = 20;

type FlashcardItem = {
  id: string;
  front: string;
  back: string;
};

type FlashcardSet = {
  id: string;
  lesson: number;
  title: string;
  description: string;
  sourceUrl?: string;
  items: FlashcardItem[];
  isCustom?: boolean;
  sourceSetIds?: string[];
};

type CustomFlashDeckRecord = {
  id: string;
  name: string;
  setIds: string[];
  updatedAt: string;
};

type FlashLearnQuestion = {
  id: string;
  prompt: string;
  correct: string;
  options: string[];
};

const EXAM_CATEGORY_LABELS: Record<QuizCategory, string> = {
  vocab: "Vocabulario",
  kanji: "Kanji",
  particles: "Partículas",
  conjugation: "Conjugación",
  grammar: "Gramática",
  reading: "Lectura",
};

const KANJI_FROM_URL: Record<number, Array<{ kanji: string; hira: string }>> = {
  3: [
    { kanji: "一", hira: "いち" },
    { kanji: "二", hira: "に" },
    { kanji: "三", hira: "さん" },
    { kanji: "四", hira: "し" },
    { kanji: "五", hira: "ご" },
    { kanji: "六", hira: "ろく" },
    { kanji: "七", hira: "しち" },
    { kanji: "八", hira: "はち" },
    { kanji: "九", hira: "きゅう" },
    { kanji: "十", hira: "じゅう" },
    { kanji: "百", hira: "ひゃく" },
    { kanji: "千", hira: "せん" },
    { kanji: "万", hira: "まん" },
    { kanji: "円", hira: "えん" },
    { kanji: "時", hira: "じ" },
  ],
  4: [
    { kanji: "日", hira: "にち" },
    { kanji: "本", hira: "ほん" },
    { kanji: "人", hira: "ひと" },
    { kanji: "月", hira: "げつ" },
    { kanji: "火", hira: "か" },
    { kanji: "水", hira: "すい" },
    { kanji: "木", hira: "もく" },
    { kanji: "金", hira: "きん" },
    { kanji: "土", hira: "ど" },
    { kanji: "曜", hira: "よう" },
    { kanji: "上", hira: "うえ" },
    { kanji: "下", hira: "した" },
    { kanji: "中", hira: "なか" },
    { kanji: "半", hira: "はん" },
    { kanji: "山", hira: "やま" },
    { kanji: "川", hira: "かわ" },
    { kanji: "元", hira: "げん" },
    { kanji: "気", hira: "き" },
  ],
  5: [
    { kanji: "天", hira: "てん" },
    { kanji: "私", hira: "わたし" },
    { kanji: "今", hira: "いま" },
    { kanji: "田", hira: "た" },
    { kanji: "女", hira: "おんな" },
    { kanji: "男", hira: "おとこ" },
    { kanji: "見", hira: "み" },
    { kanji: "行", hira: "い" },
    { kanji: "食", hira: "た" },
    { kanji: "飲", hira: "の" },
    { kanji: "東", hira: "ひがし" },
    { kanji: "西", hira: "にし" },
    { kanji: "南", hira: "みなみ" },
    { kanji: "北", hira: "きた" },
    { kanji: "口", hira: "くち" },
    { kanji: "出", hira: "で" },
    { kanji: "右", hira: "みぎ" },
    { kanji: "左", hira: "ひだり" },
  ],
  6: [
    { kanji: "分", hira: "ふん" },
    { kanji: "先", hira: "せん" },
    { kanji: "生", hira: "せい" },
    { kanji: "大", hira: "だい" },
    { kanji: "学", hira: "がく" },
    { kanji: "外", hira: "そと" },
    { kanji: "国", hira: "くに" },
    { kanji: "京", hira: "きょう" },
    { kanji: "子", hira: "こ" },
    { kanji: "小", hira: "ちい" },
    { kanji: "高", hira: "たか" },
    { kanji: "校", hira: "こう" },
    { kanji: "前", hira: "まえ" },
    { kanji: "後", hira: "あと" },
    { kanji: "名", hira: "な" },
    { kanji: "白", hira: "しろ" },
    { kanji: "雨", hira: "あめ" },
    { kanji: "書", hira: "か" },
  ],
  7: [
    { kanji: "友", hira: "とも" },
    { kanji: "間", hira: "あいだ" },
    { kanji: "家", hira: "いえ" },
    { kanji: "話", hira: "はな" },
    { kanji: "少", hira: "すこ" },
    { kanji: "古", hira: "ふる" },
    { kanji: "知", hira: "し" },
    { kanji: "来", hira: "らい" },
    { kanji: "住", hira: "す" },
    { kanji: "正", hira: "ただ" },
    { kanji: "年", hira: "とし" },
    { kanji: "売", hira: "う" },
    { kanji: "買", hira: "か" },
    { kanji: "町", hira: "まち" },
    { kanji: "長", hira: "なが" },
    { kanji: "道", hira: "みち" },
    { kanji: "車", hira: "くるま" },
    { kanji: "駅", hira: "えき" },
  ],
};

const L3_MASU_FROM_URL: Array<{ dict: string; es: string; masu: string }> = [
  { dict: "あう", es: "encontrarse", masu: "あいます" },
  { dict: "ある", es: "haber (inanimado)", masu: "あります" },
  { dict: "かく", es: "escribir", masu: "かきます" },
  { dict: "きく", es: "escuchar / preguntar", masu: "ききます" },
  { dict: "のむ", es: "beber", masu: "のみます" },
  { dict: "はなす", es: "hablar", masu: "はなします" },
  { dict: "よむ", es: "leer", masu: "よみます" },
  { dict: "おきる", es: "levantarse", masu: "おきます" },
  { dict: "たべる", es: "comer", masu: "たべます" },
  { dict: "ねる", es: "dormir", masu: "ねます" },
  { dict: "みる", es: "ver", masu: "みます" },
  { dict: "くる", es: "venir", masu: "きます" },
  { dict: "する", es: "hacer", masu: "します" },
];

const L6_TE_FROM_URL: Array<{ dict: string; es: string; te: string }> = [
  { dict: "あう", es: "encontrarse", te: "あって" },
  { dict: "ある", es: "haber (inanimado)", te: "あって" },
  { dict: "かく", es: "escribir", te: "かいて" },
  { dict: "きく", es: "escuchar / preguntar", te: "きいて" },
  { dict: "のむ", es: "beber", te: "のんで" },
  { dict: "はなす", es: "hablar", te: "はなして" },
  { dict: "よむ", es: "leer", te: "よんで" },
  { dict: "おきる", es: "levantarse", te: "おきて" },
  { dict: "たべる", es: "comer", te: "たべて" },
  { dict: "ねる", es: "dormir", te: "ねて" },
  { dict: "かえる", es: "volver", te: "かえって" },
  { dict: "くる", es: "venir", te: "きて" },
  { dict: "する", es: "hacer", te: "して" },
];

const L5_ADJECTIVES_FROM_URL: Array<{ kana: string; es: string; kind: AdjKind; display?: string }> = [
  { kana: "おもしろい", es: "interesante; divertido", kind: "i" },
  { kana: "たのしい", es: "divertido", kind: "i" },
  { kana: "げんき", display: "げんきな", es: "saludable; enérgico", kind: "na" },
  { kana: "あたらしい", es: "nuevo", kind: "i" },
  { kana: "たかい", es: "caro; alto", kind: "i" },
  { kana: "おいしい", es: "delicioso", kind: "i" },
  { kana: "かっこいい", es: "guapo", kind: "i" },
  { kana: "ちいさい", es: "pequeño", kind: "i" },
  { kana: "はやい", es: "temprano", kind: "i" },
  { kana: "こわい", es: "espeluznante; que da miedo", kind: "i" },
  { kana: "すき", display: "すきな", es: "gustar", kind: "na" },
  { kana: "いそがしい", es: "ocupado (personas/días)", kind: "i" },
  { kana: "つまらない", es: "aburrido", kind: "i" },
  { kana: "きらい", display: "きらいな", es: "no gustar; disgustar", kind: "na" },
  { kana: "おおきい", es: "grande", kind: "i" },
  { kana: "いい", es: "bueno", kind: "i" },
  { kana: "ふるい", es: "viejo (cosa, no se usa para personas)", kind: "i" },
  { kana: "しずか", display: "しずかな", es: "tranquilo", kind: "na" },
  { kana: "さむい", es: "frío (tiempo, no cosas)", kind: "i" },
  { kana: "ひま", display: "ひまな", es: "desocupado; libre (tiempo)", kind: "na" },
  { kana: "むずかしい", es: "difícil", kind: "i" },
  { kana: "あつい", es: "caliente (cosa); caluroso (tiempo)", kind: "i" },
  { kana: "にぎやか", display: "にぎやかな", es: "animado", kind: "na" },
  { kana: "やさしい", es: "fácil (problema); amable (persona)", kind: "i" },
  { kana: "きれい", display: "きれいな", es: "bonito; limpio", kind: "na" },
  { kana: "やすい", es: "económico; barato (cosa)", kind: "i" },
];

function toAdjNegativePoliteFromUrl(adj: { kana: string; kind: AdjKind }) {
  if (adj.kana === "いい") return "よくないです";
  if (adj.kind === "i") return `${adj.kana.slice(0, -1)}くないです`;
  return `${adj.kana}じゃないです`;
}

function toAdjPastPoliteFromUrl(adj: { kana: string; kind: AdjKind }) {
  if (adj.kana === "いい") return "よかったです";
  if (adj.kind === "i") return `${adj.kana.slice(0, -1)}かったです`;
  return `${adj.kana}でした`;
}

function toAdjPastNegativePoliteFromUrl(adj: { kana: string; kind: AdjKind }) {
  if (adj.kana === "いい") return "よくなかったです";
  if (adj.kind === "i") return `${adj.kana.slice(0, -1)}くなかったです`;
  return `${adj.kana}じゃなかったです`;
}

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

const EXTRA_GENKI_VOCAB: VocabCard[] = [
  { id: "l1-e1", lesson: 1, jp: "大学", kana: "だいがく", es: "universidad", kanji: "大学" },
  { id: "l1-e2", lesson: 1, jp: "留学生", kana: "りゅうがくせい", es: "estudiante internacional", kanji: "留学生" },
  { id: "l1-e3", lesson: 1, jp: "年生", kana: "ねんせい", es: "año escolar", kanji: "年生" },
  { id: "l1-e4", lesson: 1, jp: "あの人", kana: "あのひと", es: "esa persona", kanji: "あの人" },
  { id: "l1-e5", lesson: 1, jp: "歳", kana: "さい", es: "años de edad", kanji: "歳" },
  { id: "l2-e1", lesson: 2, jp: "だれ", kana: "だれ", es: "quién" },
  { id: "l2-e2", lesson: 2, jp: "どれ", kana: "どれ", es: "cuál" },
  { id: "l2-e3", lesson: 2, jp: "ここ", kana: "ここ", es: "aquí" },
  { id: "l2-e4", lesson: 2, jp: "そこ", kana: "そこ", es: "ahí" },
  { id: "l2-e5", lesson: 2, jp: "あそこ", kana: "あそこ", es: "allá" },
  { id: "l2-e6", lesson: 2, jp: "いくら", kana: "いくら", es: "cuánto" },
  { id: "l3-e1", lesson: 3, jp: "月曜日", kana: "げつようび", es: "lunes", kanji: "月曜日" },
  { id: "l3-e2", lesson: 3, jp: "火曜日", kana: "かようび", es: "martes", kanji: "火曜日" },
  { id: "l3-e3", lesson: 3, jp: "午前", kana: "ごぜん", es: "a.m.", kanji: "午前" },
  { id: "l3-e4", lesson: 3, jp: "午後", kana: "ごご", es: "p.m.", kanji: "午後" },
  { id: "l3-e5", lesson: 3, jp: "週", kana: "しゅう", es: "semana", kanji: "週" },
  { id: "l4-e1", lesson: 4, jp: "先週", kana: "せんしゅう", es: "la semana pasada", kanji: "先週" },
  { id: "l4-e2", lesson: 4, jp: "今週", kana: "こんしゅう", es: "esta semana", kanji: "今週" },
  { id: "l4-e3", lesson: 4, jp: "来週", kana: "らいしゅう", es: "la próxima semana", kanji: "来週" },
  { id: "l4-e4", lesson: 4, jp: "いつ", kana: "いつ", es: "cuándo" },
  { id: "l4-e5", lesson: 4, jp: "昨日", kana: "きのう", es: "ayer", kanji: "昨日" },
  { id: "l4-e6", lesson: 4, jp: "明日", kana: "あした", es: "mañana", kanji: "明日" },
  { id: "l5-e1", lesson: 5, jp: "町", kana: "まち", es: "ciudad", kanji: "町" },
  { id: "l5-e2", lesson: 5, jp: "新しい", kana: "あたらしい", es: "nuevo", kanji: "新しい" },
  { id: "l5-e3", lesson: 5, jp: "古い", kana: "ふるい", es: "viejo", kanji: "古い" },
  { id: "l5-e4", lesson: 5, jp: "小さい", kana: "ちいさい", es: "pequeño", kanji: "小さい" },
  { id: "l5-e5", lesson: 5, jp: "レストラン", kana: "レストラン", es: "restaurante" },
  { id: "l6-e1", lesson: 6, jp: "魚", kana: "さかな", es: "pescado", kanji: "魚" },
  { id: "l6-e2", lesson: 6, jp: "肉", kana: "にく", es: "carne", kanji: "肉" },
  { id: "l6-e3", lesson: 6, jp: "野菜", kana: "やさい", es: "verduras", kanji: "野菜" },
  { id: "l6-e4", lesson: 6, jp: "果物", kana: "くだもの", es: "fruta", kanji: "果物" },
  { id: "l6-e5", lesson: 6, jp: "牛乳", kana: "ぎゅうにゅう", es: "leche", kanji: "牛乳" },
  { id: "l7-e1", lesson: 7, jp: "兄弟", kana: "きょうだい", es: "hermanos", kanji: "兄弟" },
  { id: "l7-e2", lesson: 7, jp: "両親", kana: "りょうしん", es: "padres", kanji: "両親" },
  { id: "l7-e3", lesson: 7, jp: "会社員", kana: "かいしゃいん", es: "empleado de empresa", kanji: "会社員" },
  { id: "l7-e4", lesson: 7, jp: "仕事", kana: "しごと", es: "trabajo", kanji: "仕事" },
  { id: "l7-e5", lesson: 7, jp: "家", kana: "いえ", es: "casa", kanji: "家" },
  { id: "l8-e1", lesson: 8, jp: "春", kana: "はる", es: "primavera", kanji: "春" },
  { id: "l8-e2", lesson: 8, jp: "秋", kana: "あき", es: "otoño", kanji: "秋" },
  { id: "l8-e3", lesson: 8, jp: "冬", kana: "ふゆ", es: "invierno", kanji: "冬" },
  { id: "l8-e4", lesson: 8, jp: "暖かい", kana: "あたたかい", es: "templado", kanji: "暖かい" },
  { id: "l8-e5", lesson: 8, jp: "涼しい", kana: "すずしい", es: "fresco", kanji: "涼しい" },
  { id: "l9-e1", lesson: 9, jp: "風邪", kana: "かぜ", es: "resfriado", kanji: "風邪" },
  { id: "l9-e2", lesson: 9, jp: "頭", kana: "あたま", es: "cabeza", kanji: "頭" },
  { id: "l9-e3", lesson: 9, jp: "お腹", kana: "おなか", es: "estómago", kanji: "お腹" },
  { id: "l9-e4", lesson: 9, jp: "痛い", kana: "いたい", es: "doloroso", kanji: "痛い" },
  { id: "l9-e5", lesson: 9, jp: "薬局", kana: "やっきょく", es: "farmacia", kanji: "薬局" },
  { id: "l10-e1", lesson: 10, jp: "角", kana: "かど", es: "esquina", kanji: "角" },
  { id: "l10-e2", lesson: 10, jp: "信号", kana: "しんごう", es: "semáforo", kanji: "信号" },
  { id: "l10-e3", lesson: 10, jp: "郵便局", kana: "ゆうびんきょく", es: "oficina postal", kanji: "郵便局" },
  { id: "l10-e4", lesson: 10, jp: "銀行", kana: "ぎんこう", es: "banco", kanji: "銀行" },
  { id: "l10-e5", lesson: 10, jp: "道", kana: "みち", es: "camino", kanji: "道" },
  { id: "l11-e1", lesson: 11, jp: "予約", kana: "よやく", es: "reserva", kanji: "予約" },
  { id: "l11-e2", lesson: 11, jp: "案内所", kana: "あんないじょ", es: "información", kanji: "案内所" },
  { id: "l11-e3", lesson: 11, jp: "荷物", kana: "にもつ", es: "equipaje", kanji: "荷物" },
  { id: "l11-e4", lesson: 11, jp: "観光", kana: "かんこう", es: "turismo", kanji: "観光" },
  { id: "l11-e5", lesson: 11, jp: "神社", kana: "じんじゃ", es: "santuario", kanji: "神社" },
  { id: "l12-e1", lesson: 12, jp: "練習", kana: "れんしゅう", es: "práctica", kanji: "練習" },
  { id: "l12-e2", lesson: 12, jp: "発表", kana: "はっぴょう", es: "presentación", kanji: "発表" },
  { id: "l12-e3", lesson: 12, jp: "意見", kana: "いけん", es: "opinión", kanji: "意見" },
  { id: "l12-e4", lesson: 12, jp: "目標", kana: "もくひょう", es: "meta", kanji: "目標" },
  { id: "l12-e5", lesson: 12, jp: "計画", kana: "けいかく", es: "plan", kanji: "計画" },
];

const EXTRA_VERBS: VerbEntry[] = [
  { lesson: 3, jp: "話す", kana: "はなす", es: "hablar", kind: "u" },
  { lesson: 4, jp: "浴びる", kana: "あびる", es: "ducharse", kind: "ru" },
  { lesson: 5, jp: "遊ぶ", kana: "あそぶ", es: "jugar", kind: "u" },
  { lesson: 6, jp: "作る", kana: "つくる", es: "hacer/crear", kind: "u" },
  { lesson: 7, jp: "あげる", kana: "あげる", es: "dar", kind: "ru" },
  { lesson: 7, jp: "もらう", kana: "もらう", es: "recibir", kind: "u" },
  { lesson: 8, jp: "なる", kana: "なる", es: "volverse", kind: "u" },
  { lesson: 9, jp: "使う", kana: "つかう", es: "usar", kind: "u" },
  { lesson: 9, jp: "休む", kana: "やすむ", es: "descansar", kind: "u" },
  { lesson: 10, jp: "教える", kana: "おしえる", es: "enseñar", kind: "ru" },
  { lesson: 10, jp: "取る", kana: "とる", es: "tomar", kind: "u" },
  { lesson: 11, jp: "連れて行く", kana: "つれていく", es: "llevar a alguien", kind: "u" },
  { lesson: 12, jp: "始める", kana: "はじめる", es: "empezar", kind: "ru" },
  { lesson: 12, jp: "見せる", kana: "みせる", es: "mostrar", kind: "ru" },
  { lesson: 12, jp: "続ける", kana: "つづける", es: "continuar", kind: "ru" },
];

const EXTRA_ADJECTIVES: AdjEntry[] = [
  { lesson: 5, jp: "大きい", kana: "おおきい", es: "grande", kind: "i" },
  { lesson: 5, jp: "きれい", kana: "きれい", es: "bonito/limpio", kind: "na" },
  { lesson: 5, jp: "好き", kana: "すき", es: "gustar", kind: "na" },
  { lesson: 5, jp: "きらい", kana: "きらい", es: "no gustar", kind: "na" },
  { lesson: 5, jp: "にぎやか", kana: "にぎやか", es: "animado", kind: "na" },
  { lesson: 6, jp: "まずい", kana: "まずい", es: "malo (sabor)", kind: "i" },
  { lesson: 6, jp: "いそがしい", kana: "いそがしい", es: "ocupado", kind: "i" },
  { lesson: 9, jp: "たいへん", kana: "たいへん", es: "difícil/duro", kind: "na" },
  { lesson: 9, jp: "だいじょうぶ", kana: "だいじょうぶ", es: "estar bien", kind: "na" },
  { lesson: 10, jp: "広い", kana: "ひろい", es: "amplio", kind: "i" },
  { lesson: 10, jp: "狭い", kana: "せまい", es: "estrecho", kind: "i" },
  { lesson: 11, jp: "おもしろい", kana: "おもしろい", es: "interesante", kind: "i" },
  { lesson: 11, jp: "親切", kana: "しんせつ", es: "amable", kind: "na" },
  { lesson: 12, jp: "うれしい", kana: "うれしい", es: "feliz", kind: "i" },
  { lesson: 12, jp: "重要", kana: "じゅうよう", es: "importante", kind: "na" },
];

const GENKI_SUPPLEMENTAL_VOCAB: Array<Omit<VocabCard, "id">> = [
  { lesson: 1, jp: "高校", kana: "こうこう", es: "preparatoria", kanji: "高校" },
  { lesson: 1, jp: "大学院生", kana: "だいがくいんせい", es: "estudiante de posgrado", kanji: "大学院生" },
  { lesson: 1, jp: "一年生", kana: "いちねんせい", es: "estudiante de primer año", kanji: "一年生" },
  { lesson: 1, jp: "二年生", kana: "にねんせい", es: "estudiante de segundo año", kanji: "二年生" },
  { lesson: 1, jp: "三年生", kana: "さんねんせい", es: "estudiante de tercer año", kanji: "三年生" },
  { lesson: 1, jp: "四年生", kana: "よねんせい", es: "estudiante de cuarto año", kanji: "四年生" },
  { lesson: 1, jp: "国際関係", kana: "こくさいかんけい", es: "relaciones internacionales", kanji: "国際関係" },
  { lesson: 1, jp: "文学", kana: "ぶんがく", es: "literatura", kanji: "文学" },
  { lesson: 1, jp: "歴史", kana: "れきし", es: "historia", kanji: "歴史" },
  { lesson: 1, jp: "科学", kana: "かがく", es: "ciencia", kanji: "科学" },
  { lesson: 2, jp: "えんぴつ", kana: "えんぴつ", es: "lápiz" },
  { lesson: 2, jp: "かさ", kana: "かさ", es: "paraguas" },
  { lesson: 2, jp: "財布", kana: "さいふ", es: "cartera", kanji: "財布" },
  { lesson: 2, jp: "鍵", kana: "かぎ", es: "llave", kanji: "鍵" },
  { lesson: 2, jp: "辞書", kana: "じしょ", es: "diccionario", kanji: "辞書" },
  { lesson: 2, jp: "新聞", kana: "しんぶん", es: "periódico", kanji: "新聞" },
  { lesson: 2, jp: "ノート", kana: "ノート", es: "cuaderno" },
  { lesson: 2, jp: "ボールペン", kana: "ボールペン", es: "bolígrafo" },
  { lesson: 2, jp: "シャツ", kana: "シャツ", es: "camisa" },
  { lesson: 2, jp: "靴", kana: "くつ", es: "zapatos", kanji: "靴" },
  { lesson: 2, jp: "テレビ", kana: "テレビ", es: "televisión" },
  { lesson: 2, jp: "いくら", kana: "いくら", es: "cuánto" },
  { lesson: 3, jp: "朝ごはん", kana: "あさごはん", es: "desayuno", kanji: "朝ご飯" },
  { lesson: 3, jp: "昼ごはん", kana: "ひるごはん", es: "comida", kanji: "昼ご飯" },
  { lesson: 3, jp: "晩ごはん", kana: "ばんごはん", es: "cena", kanji: "晩ご飯" },
  { lesson: 3, jp: "今", kana: "いま", es: "ahora", kanji: "今" },
  { lesson: 3, jp: "半", kana: "はん", es: "media (hora)" },
  { lesson: 3, jp: "毎朝", kana: "まいあさ", es: "cada mañana", kanji: "毎朝" },
  { lesson: 3, jp: "毎晩", kana: "まいばん", es: "cada noche", kanji: "毎晩" },
  { lesson: 3, jp: "毎週", kana: "まいしゅう", es: "cada semana", kanji: "毎週" },
  { lesson: 3, jp: "土曜日", kana: "どようび", es: "sábado", kanji: "土曜日" },
  { lesson: 3, jp: "日曜日", kana: "にちようび", es: "domingo", kanji: "日曜日" },
  { lesson: 3, jp: "友だち", kana: "ともだち", es: "amigo", kanji: "友達" },
  { lesson: 3, jp: "家に帰る", kana: "うちにかえる", es: "regresar a casa", kanji: "家に帰る" },
  { lesson: 4, jp: "朝", kana: "あさ", es: "mañana", kanji: "朝" },
  { lesson: 4, jp: "昼", kana: "ひる", es: "mediodía", kanji: "昼" },
  { lesson: 4, jp: "夜", kana: "よる", es: "noche", kanji: "夜" },
  { lesson: 4, jp: "昨日", kana: "きのう", es: "ayer", kanji: "昨日" },
  { lesson: 4, jp: "今日", kana: "きょう", es: "hoy", kanji: "今日" },
  { lesson: 4, jp: "明日", kana: "あした", es: "mañana", kanji: "明日" },
  { lesson: 4, jp: "先月", kana: "せんげつ", es: "mes pasado", kanji: "先月" },
  { lesson: 4, jp: "今月", kana: "こんげつ", es: "este mes", kanji: "今月" },
  { lesson: 4, jp: "来月", kana: "らいげつ", es: "mes siguiente", kanji: "来月" },
  { lesson: 4, jp: "電車", kana: "でんしゃ", es: "tren", kanji: "電車" },
  { lesson: 4, jp: "バイト", kana: "バイト", es: "trabajo de medio tiempo" },
  { lesson: 4, jp: "図書館", kana: "としょかん", es: "biblioteca", kanji: "図書館" },
  { lesson: 5, jp: "町", kana: "まち", es: "pueblo/ciudad", kanji: "町" },
  { lesson: 5, jp: "神社", kana: "じんじゃ", es: "santuario", kanji: "神社" },
  { lesson: 5, jp: "喫茶店", kana: "きっさてん", es: "cafetería", kanji: "喫茶店" },
  { lesson: 5, jp: "病院", kana: "びょういん", es: "hospital", kanji: "病院" },
  { lesson: 5, jp: "ホテル", kana: "ホテル", es: "hotel" },
  { lesson: 5, jp: "デパート", kana: "デパート", es: "tienda departamental" },
  { lesson: 5, jp: "新しい", kana: "あたらしい", es: "nuevo", kanji: "新しい" },
  { lesson: 5, jp: "古い", kana: "ふるい", es: "viejo", kanji: "古い" },
  { lesson: 5, jp: "おもしろい", kana: "おもしろい", es: "interesante" },
  { lesson: 5, jp: "にぎやか", kana: "にぎやか", es: "animado" },
  { lesson: 5, jp: "親切", kana: "しんせつ", es: "amable", kanji: "親切" },
  { lesson: 5, jp: "便利", kana: "べんり", es: "conveniente", kanji: "便利" },
  { lesson: 6, jp: "ハンバーガー", kana: "ハンバーガー", es: "hamburguesa" },
  { lesson: 6, jp: "パスタ", kana: "パスタ", es: "pasta" },
  { lesson: 6, jp: "りんご", kana: "りんご", es: "manzana" },
  { lesson: 6, jp: "卵", kana: "たまご", es: "huevo", kanji: "卵" },
  { lesson: 6, jp: "牛肉", kana: "ぎゅうにく", es: "carne de res", kanji: "牛肉" },
  { lesson: 6, jp: "豚肉", kana: "ぶたにく", es: "carne de cerdo", kanji: "豚肉" },
  { lesson: 6, jp: "果物", kana: "くだもの", es: "fruta", kanji: "果物" },
  { lesson: 6, jp: "野菜", kana: "やさい", es: "verduras", kanji: "野菜" },
  { lesson: 6, jp: "お茶", kana: "おちゃ", es: "té", kanji: "お茶" },
  { lesson: 6, jp: "紅茶", kana: "こうちゃ", es: "té negro", kanji: "紅茶" },
  { lesson: 6, jp: "毎日", kana: "まいにち", es: "todos los días", kanji: "毎日" },
  { lesson: 6, jp: "時々", kana: "ときどき", es: "a veces", kanji: "時々" },
  { lesson: 7, jp: "家族", kana: "かぞく", es: "familia", kanji: "家族" },
  { lesson: 7, jp: "兄弟", kana: "きょうだい", es: "hermanos", kanji: "兄弟" },
  { lesson: 7, jp: "両親", kana: "りょうしん", es: "padres", kanji: "両親" },
  { lesson: 7, jp: "母", kana: "はは", es: "madre", kanji: "母" },
  { lesson: 7, jp: "父", kana: "ちち", es: "padre", kanji: "父" },
  { lesson: 7, jp: "お兄さん", kana: "おにいさん", es: "hermano mayor (de otro)" },
  { lesson: 7, jp: "お姉さん", kana: "おねえさん", es: "hermana mayor (de otro)" },
  { lesson: 7, jp: "結婚", kana: "けっこん", es: "matrimonio", kanji: "結婚" },
  { lesson: 7, jp: "会社員", kana: "かいしゃいん", es: "empleado de empresa", kanji: "会社員" },
  { lesson: 7, jp: "高校生", kana: "こうこうせい", es: "estudiante de prepa", kanji: "高校生" },
  { lesson: 7, jp: "お金", kana: "おかね", es: "dinero", kanji: "お金" },
  { lesson: 7, jp: "プレゼント", kana: "プレゼント", es: "regalo" },
  { lesson: 8, jp: "春", kana: "はる", es: "primavera", kanji: "春" },
  { lesson: 8, jp: "夏", kana: "なつ", es: "verano", kanji: "夏" },
  { lesson: 8, jp: "秋", kana: "あき", es: "otoño", kanji: "秋" },
  { lesson: 8, jp: "冬", kana: "ふゆ", es: "invierno", kanji: "冬" },
  { lesson: 8, jp: "天気", kana: "てんき", es: "clima", kanji: "天気" },
  { lesson: 8, jp: "暑い", kana: "あつい", es: "caluroso", kanji: "暑い" },
  { lesson: 8, jp: "寒い", kana: "さむい", es: "frío", kanji: "寒い" },
  { lesson: 8, jp: "暖かい", kana: "あたたかい", es: "templado", kanji: "暖かい" },
  { lesson: 8, jp: "涼しい", kana: "すずしい", es: "fresco", kanji: "涼しい" },
  { lesson: 8, jp: "晴れ", kana: "はれ", es: "soleado", kanji: "晴れ" },
  { lesson: 8, jp: "曇り", kana: "くもり", es: "nublado", kanji: "曇り" },
  { lesson: 8, jp: "雪", kana: "ゆき", es: "nieve", kanji: "雪" },
  { lesson: 9, jp: "病気", kana: "びょうき", es: "enfermedad", kanji: "病気" },
  { lesson: 9, jp: "風邪", kana: "かぜ", es: "resfriado", kanji: "風邪" },
  { lesson: 9, jp: "薬", kana: "くすり", es: "medicina", kanji: "薬" },
  { lesson: 9, jp: "熱", kana: "ねつ", es: "fiebre", kanji: "熱" },
  { lesson: 9, jp: "頭", kana: "あたま", es: "cabeza", kanji: "頭" },
  { lesson: 9, jp: "喉", kana: "のど", es: "garganta", kanji: "喉" },
  { lesson: 9, jp: "お腹", kana: "おなか", es: "estómago", kanji: "お腹" },
  { lesson: 9, jp: "痛い", kana: "いたい", es: "doler", kanji: "痛い" },
  { lesson: 9, jp: "大丈夫", kana: "だいじょうぶ", es: "estar bien", kanji: "大丈夫" },
  { lesson: 9, jp: "心配", kana: "しんぱい", es: "preocupación", kanji: "心配" },
  { lesson: 9, jp: "忙しい", kana: "いそがしい", es: "ocupado", kanji: "忙しい" },
  { lesson: 9, jp: "休み", kana: "やすみ", es: "descanso", kanji: "休み" },
  { lesson: 10, jp: "駅", kana: "えき", es: "estación", kanji: "駅" },
  { lesson: 10, jp: "道", kana: "みち", es: "camino", kanji: "道" },
  { lesson: 10, jp: "地図", kana: "ちず", es: "mapa", kanji: "地図" },
  { lesson: 10, jp: "右", kana: "みぎ", es: "derecha", kanji: "右" },
  { lesson: 10, jp: "左", kana: "ひだり", es: "izquierda", kanji: "左" },
  { lesson: 10, jp: "まっすぐ", kana: "まっすぐ", es: "derecho" },
  { lesson: 10, jp: "角", kana: "かど", es: "esquina", kanji: "角" },
  { lesson: 10, jp: "信号", kana: "しんごう", es: "semáforo", kanji: "信号" },
  { lesson: 10, jp: "近い", kana: "ちかい", es: "cerca", kanji: "近い" },
  { lesson: 10, jp: "遠い", kana: "とおい", es: "lejos", kanji: "遠い" },
  { lesson: 10, jp: "郵便局", kana: "ゆうびんきょく", es: "oficina postal", kanji: "郵便局" },
  { lesson: 10, jp: "銀行", kana: "ぎんこう", es: "banco", kanji: "銀行" },
  { lesson: 11, jp: "旅行", kana: "りょこう", es: "viaje", kanji: "旅行" },
  { lesson: 11, jp: "観光", kana: "かんこう", es: "turismo", kanji: "観光" },
  { lesson: 11, jp: "神社", kana: "じんじゃ", es: "santuario", kanji: "神社" },
  { lesson: 11, jp: "寺", kana: "てら", es: "templo", kanji: "寺" },
  { lesson: 11, jp: "公園", kana: "こうえん", es: "parque", kanji: "公園" },
  { lesson: 11, jp: "予約", kana: "よやく", es: "reserva", kanji: "予約" },
  { lesson: 11, jp: "案内所", kana: "あんないじょ", es: "centro de información", kanji: "案内所" },
  { lesson: 11, jp: "荷物", kana: "にもつ", es: "equipaje", kanji: "荷物" },
  { lesson: 11, jp: "景色", kana: "けしき", es: "paisaje", kanji: "景色" },
  { lesson: 11, jp: "有名", kana: "ゆうめい", es: "famoso", kanji: "有名" },
  { lesson: 11, jp: "写真", kana: "しゃしん", es: "foto", kanji: "写真" },
  { lesson: 11, jp: "思い出", kana: "おもいで", es: "recuerdo", kanji: "思い出" },
  { lesson: 12, jp: "文化", kana: "ぶんか", es: "cultura", kanji: "文化" },
  { lesson: 12, jp: "経験", kana: "けいけん", es: "experiencia", kanji: "経験" },
  { lesson: 12, jp: "将来", kana: "しょうらい", es: "futuro", kanji: "将来" },
  { lesson: 12, jp: "希望", kana: "きぼう", es: "esperanza", kanji: "希望" },
  { lesson: 12, jp: "準備", kana: "じゅんび", es: "preparación", kanji: "準備" },
  { lesson: 12, jp: "計画", kana: "けいかく", es: "plan", kanji: "計画" },
  { lesson: 12, jp: "目標", kana: "もくひょう", es: "meta", kanji: "目標" },
  { lesson: 12, jp: "意見", kana: "いけん", es: "opinión", kanji: "意見" },
  { lesson: 12, jp: "発表", kana: "はっぴょう", es: "presentación", kanji: "発表" },
  { lesson: 12, jp: "練習", kana: "れんしゅう", es: "práctica", kanji: "練習" },
  { lesson: 12, jp: "約束", kana: "やくそく", es: "promesa", kanji: "約束" },
  { lesson: 12, jp: "必要", kana: "ひつよう", es: "necesario", kanji: "必要" },
];

function dedupeVocab(cards: VocabCard[]) {
  const byKey = new Map<string, VocabCard>();
  cards.forEach((card) => {
    const key = `${card.lesson}:${card.jp}:${card.kana}`;
    if (!byKey.has(key)) byKey.set(key, card);
  });
  return Array.from(byKey.values());
}

const SUPPLEMENTAL_GENKI_VOCAB: VocabCard[] = GENKI_SUPPLEMENTAL_VOCAB.map((card, index) => ({
  id: `supp-${card.lesson}-${index + 1}`,
  ...card,
}));

const ALL_VERBS: VerbEntry[] = [...VERBS, ...EXTRA_VERBS];
const ALL_ADJECTIVES: AdjEntry[] = [...ADJECTIVES, ...EXTRA_ADJECTIVES];
const VERB_VOCAB: VocabCard[] = ALL_VERBS.map((card, index) => ({
  id: `verb-${card.lesson}-${index + 1}`,
  lesson: card.lesson,
  jp: card.jp,
  kana: card.kana,
  es: card.es,
}));
const ADJ_VOCAB: VocabCard[] = ALL_ADJECTIVES.map((card, index) => ({
  id: `adj-${card.lesson}-${index + 1}`,
  lesson: card.lesson,
  jp: card.jp,
  kana: card.kana,
  es: card.es,
}));
const ALL_GENKI_VOCAB: VocabCard[] = dedupeVocab([
  ...GENKI_VOCAB,
  ...EXTRA_GENKI_VOCAB,
  ...SUPPLEMENTAL_GENKI_VOCAB,
  ...VERB_VOCAB,
  ...ADJ_VOCAB,
]);
const ALL_GENKI_VOCAB_BY_LESSON: Record<number, VocabCard[]> = LESSONS.reduce((acc, lesson) => {
  acc[lesson] = dedupeVocab(
    ALL_GENKI_VOCAB.filter((card) => card.lesson === lesson).concat(
      (GENKI_VOCAB_BY_LESSON[lesson] || []).map((item, index) => ({
        id: `xlsx-${lesson}-${index + 1}`,
        lesson,
        jp: item.kanji || item.hira,
        kana: item.hira,
        es: item.es,
        kanji: item.kanji,
      })),
    ),
  );
  return acc;
}, {} as Record<number, VocabCard[]>);

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

function buildOptionSet(correct: string, wrongCandidates: string[], fallbackPool: string[]) {
  const wrong = Array.from(new Set(wrongCandidates.filter((item) => item && item !== correct)));
  if (wrong.length < 3) {
    for (const item of fallbackPool) {
      if (!item || item === correct || wrong.includes(item)) continue;
      wrong.push(item);
      if (wrong.length >= 3) break;
    }
  }
  return shuffle([correct, ...wrong.slice(0, 3)]).slice(0, 4);
}

function rankBadgeStyles(index: number) {
  if (index === 0) return { bg: "linear-gradient(135deg,#fbbf24,#f59e0b)", border: "#f59e0b", color: "#111114" };
  if (index === 1) return { bg: "linear-gradient(135deg,#d1d5db,#9ca3af)", border: "#9ca3af", color: "#111114" };
  if (index === 2) return { bg: "linear-gradient(135deg,#f59e0b,#b45309)", border: "#b45309", color: "#fff" };
  return { bg: "#fff", border: "#d1d5db", color: "#6b7280" };
}

function romajiOptions(pool: KanaPair[], correct: string) {
  const distractorPool = Array.from(new Set(pool.map((p) => p[1]).filter((r) => r && r !== correct)));
  const distractors = pickN(distractorPool, 3);
  return shuffle([correct, ...distractors]).slice(0, 4);
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
  const pool = ALL_GENKI_VOCAB.filter((v) => lessons.includes(v.lesson));
  const source = pool.length >= 4 ? pool : ALL_GENKI_VOCAB;
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
  const pool = ALL_GENKI_VOCAB.filter((v) => lessons.includes(v.lesson) && v.kanji);
  const source = pool.length >= 4 ? pool : ALL_GENKI_VOCAB.filter((v) => v.kanji);
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
  const verbs = ALL_VERBS.filter((v) => lessons.includes(v.lesson));
  const adjs = ALL_ADJECTIVES.filter((a) => lessons.includes(a.lesson));
  const allTe = ALL_VERBS.map((v) => toTeForm(v));
  const allPast = ALL_VERBS.map((v) => toPastShort(v));
  const allMasu = ALL_VERBS.map((v) => toMasu(v));
  const allDict = ALL_VERBS.map((v) => v.kana);
  const allAdjNeg = ALL_ADJECTIVES.map((a) => toAdjNegative(a));
  const allAdjPast = ALL_ADJECTIVES.map((a) => toAdjPast(a));

  if (types.includes("te")) {
    verbs.forEach((v) => {
      const correct = toTeForm(v);
      const stem = v.kana.slice(0, -1);
      const distractors = [
        toPastShort(v),
        toMasu(v),
        v.kana,
        `${stem}た`,
      ];
      qs.push({
        id: `c-te-${v.kana}`,
        prompt: `${v.kana} (${v.es}) → て形`,
        options: buildOptionSet(correct, distractors, allTe),
        correct,
      });
    });
  }

  if (types.includes("past")) {
    verbs.forEach((v) => {
      const correct = toPastShort(v);
      const stem = v.kana.slice(0, -1);
      const distractors = [
        toTeForm(v),
        toMasu(v),
        v.kana,
        `${stem}て`,
      ];
      qs.push({
        id: `c-past-${v.kana}`,
        prompt: `${v.kana} (${v.es}) → pasado corto`,
        options: buildOptionSet(correct, distractors, allPast),
        correct,
      });
    });
  }

  if (types.includes("masu")) {
    verbs.forEach((v) => {
      const correct = toMasu(v);
      const distractors = [
        toTeForm(v),
        toPastShort(v),
        v.kana,
        `${v.kana}ます`,
      ];
      qs.push({
        id: `c-masu-${v.kana}`,
        prompt: `${v.kana} (${v.es}) → ます形`,
        options: buildOptionSet(correct, distractors, allMasu),
        correct,
      });
    });
  }

  if (types.includes("dictionary")) {
    verbs.forEach((v) => {
      const correct = v.kana;
      const distractors = [
        toMasu(v),
        toTeForm(v),
        toPastShort(v),
        toMasu(v).replace(/ます$/, "る"),
      ];
      qs.push({
        id: `c-dict-${v.kana}`,
        prompt: `${toMasu(v)} → forma diccionario`,
        options: buildOptionSet(correct, distractors, allDict),
        correct,
      });
    });
  }

  if (types.includes("adj-negative")) {
    adjs.forEach((a) => {
      const correct = toAdjNegative(a);
      const distractors = [
        toAdjPast(a),
        a.kana,
        a.kind === "i" ? `${a.kana}じゃない` : `${a.kana}くない`,
        `${a.kana}ではない`,
      ];
      qs.push({
        id: `c-adjn-${a.kana}`,
        prompt: `${a.kana} (${a.es}) → negativo`,
        options: buildOptionSet(correct, distractors, allAdjNeg),
        correct,
      });
    });
  }

  if (types.includes("adj-past")) {
    adjs.forEach((a) => {
      const correct = toAdjPast(a);
      const distractors = [
        toAdjNegative(a),
        a.kana,
        a.kind === "i" ? `${a.kana}だった` : `${a.kana}かった`,
        `${a.kana}でした`,
      ];
      qs.push({
        id: `c-adjp-${a.kana}`,
        prompt: `${a.kana} (${a.es}) → pasado`,
        options: buildOptionSet(correct, distractors, allAdjPast),
        correct,
      });
    });
  }

  if (qs.length === 0) return [];
  return pickN(qs, count);
}

function buildReorderTokens(parts: string[]): ReorderToken[] {
  return shuffle(parts.map((label, index) => ({ id: `t${index + 1}`, label })));
}

function encodeReorderAnswer(tokenIds: string[]) {
  return tokenIds.join("\u001f");
}

function decodeReorderAnswer(value?: string) {
  if (!value) return [];
  return value.split("\u001f").filter(Boolean);
}

function buildReorderSentence(question: QuizQuestion, value?: string) {
  if (!question.reorderTokens?.length) return value || "";
  const labelMap = new Map(question.reorderTokens.map((token) => [token.id, token.label]));
  return decodeReorderAnswer(value).map((id) => labelMap.get(id) || "").join(" ").trim();
}

function buildLessonHint(lesson: number, label: string) {
  return `Lección ${lesson} · ${label}`;
}

function formatExamCategoryLabel(category?: string) {
  if (!category) return "General";
  return EXAM_CATEGORY_LABELS[category as QuizCategory] || category;
}

function createLessonQuestion(
  lesson: number,
  stableKey: string,
  config: Omit<QuizQuestion, "id" | "stableKey" | "lesson">,
): QuizQuestion {
  return {
    ...config,
    id: `exam-${stableKey}`,
    stableKey: `l${lesson}:${stableKey}`,
    lesson,
  };
}

const EXAM_VOCAB_EXCLUSIONS: Record<number, string[]> = {
  1: ["アジアけんきゅう", "せいぶつがく", "こくさいかんけい"],
};

const PARTICLE_EXAM_BANK: Array<{
  id: string;
  minLesson: number;
  prompt: string;
  options: string[];
  correct: string;
  explanation: string;
}> = [
  { id: "p-l1-1", minLesson: 1, prompt: "わたし___パコです。", options: ["は", "を", "に", "で"], correct: "は", explanation: "「は」marca tema." },
  { id: "p-l1-2", minLesson: 1, prompt: "マリアさん___せんせいです。", options: ["が", "は", "を", "で"], correct: "は", explanation: "Oración copulativa con tema 「は」." },
  { id: "p-l2-1", minLesson: 2, prompt: "これはだれ___ほんですか。", options: ["の", "に", "で", "を"], correct: "の", explanation: "Posesión con 「の」." },
  { id: "p-l2-2", minLesson: 2, prompt: "わたし___ともだちもにほんじんです。", options: ["の", "は", "も", "が"], correct: "の", explanation: "「わたしのともだち」." },
  { id: "p-l3-1", minLesson: 3, prompt: "がっこう___いきます。", options: ["に", "で", "を", "は"], correct: "に", explanation: "Destino con 「に」." },
  { id: "p-l3-2", minLesson: 3, prompt: "としょかん___べんきょうします。", options: ["に", "で", "を", "が"], correct: "で", explanation: "Lugar de acción con 「で」." },
  { id: "p-l3-3", minLesson: 3, prompt: "ほん___よみます。", options: ["を", "は", "に", "で"], correct: "を", explanation: "Objeto directo con 「を」." },
  { id: "p-l4-1", minLesson: 4, prompt: "7じ___おきます。", options: ["に", "で", "を", "が"], correct: "に", explanation: "Hora específica con 「に」." },
  { id: "p-l4-2", minLesson: 4, prompt: "うち___かえりました。", options: ["に", "を", "で", "が"], correct: "に", explanation: "Destino final con 「に」." },
  { id: "p-l5-1", minLesson: 5, prompt: "ともだち___えいがをみました。", options: ["と", "に", "が", "を"], correct: "と", explanation: "Compañía con 「と」." },
  { id: "p-l5-2", minLesson: 5, prompt: "ケーキ___すきです。", options: ["が", "を", "に", "で"], correct: "が", explanation: "Con 「すき」 se usa 「が」." },
  { id: "p-l6-1", minLesson: 6, prompt: "こうえん___しんぶんをよみます。", options: ["で", "に", "を", "が"], correct: "で", explanation: "Lugar de acción con 「で」." },
  { id: "p-l7-1", minLesson: 7, prompt: "にほん___りょうりはおいしいです。", options: ["の", "に", "を", "が"], correct: "の", explanation: "Modificador nominal con 「の」." },
  { id: "p-l8-1", minLesson: 8, prompt: "8じ___10じ___べんきょうしました。", options: ["に / に", "から / まで", "を / に", "で / から"], correct: "から / まで", explanation: "Rango temporal." },
  { id: "p-l9-1", minLesson: 9, prompt: "くすり___のみました。", options: ["を", "に", "で", "が"], correct: "を", explanation: "Objeto directo." },
  { id: "p-l10-1", minLesson: 10, prompt: "ひだり___まがってください。", options: ["に", "で", "を", "が"], correct: "に", explanation: "Dirección con 「に」." },
  { id: "p-l11-1", minLesson: 11, prompt: "せんせい___そうだんしました。", options: ["に", "を", "で", "が"], correct: "に", explanation: "Objetivo de consulta con 「に」." },
  { id: "p-l12-1", minLesson: 12, prompt: "にほんご___じょうずになりました。", options: ["が", "を", "に", "で"], correct: "が", explanation: "Con habilidad, normalmente 「が」." },
];

function normalizeExamText(value: string) {
  return value.trim().normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

function isExamQuestionCorrect(question: QuizQuestion, answerValue: string | undefined) {
  if (!answerValue) return false;
  if (question.type === "text" || question.type === "reorder") {
    const normalizedValue = question.type === "reorder"
      ? buildReorderSentence(question, answerValue)
      : answerValue;
    const candidates = [question.correct, ...(question.acceptedAnswers || [])].map(normalizeExamText);
    return candidates.includes(normalizeExamText(normalizedValue));
  }
  return answerValue === question.correct;
}

function formatExamAnswer(question: QuizQuestion, answerValue: string | undefined) {
  if (!answerValue) return "Sin respuesta";
  if (question.type === "reorder") {
    return buildReorderSentence(question, answerValue) || "Sin respuesta";
  }
  return answerValue;
}

function getExamKana(item: { hira?: string; kana?: string }) {
  return item.hira || item.kana || "";
}

function isExamVocabEligible(lesson: number, item: { hira?: string; kana?: string; es: string }) {
  const kana = getExamKana(item);
  if (!kana || !item.es) return false;
  if (kana.includes("…") || item.es.includes("…")) return false;
  if (EXAM_VOCAB_EXCLUSIONS[lesson]?.includes(kana)) return false;
  return true;
}

function buildVocabMatchingQuestion(lesson: number, vocab: Array<{ hira?: string; kana?: string; kanji?: string; es: string }>, keySeed: string): QuizQuestion | null {
  if (vocab.length < 3) return null;
  const picked = pickN(vocab, 3);
  if (picked.length < 3) return null;
  const left = picked.map((item, i) => {
    const kana = getExamKana(item);
    return `${String.fromCharCode(65 + i)}. ${item.kanji?.trim() ? `${item.kanji.trim()} (${kana})` : kana}`;
  });
  const rightRaw = shuffle(picked.map((item) => item.es));
  const right = rightRaw.map((item, i) => `${i + 1}. ${item}`);
  const correctIndexes = picked.map((item) => rightRaw.indexOf(item.es) + 1);
  const correctPattern = `A-${correctIndexes[0]}, B-${correctIndexes[1]}, C-${correctIndexes[2]}`;
  const patterns = new Set<string>([correctPattern]);
  while (patterns.size < 4) {
    const candidate = shuffle([1, 2, 3]);
    patterns.add(`A-${candidate[0]}, B-${candidate[1]}, C-${candidate[2]}`);
  }
  return {
    id: `exam-vocab-match-${lesson}-${keySeed}`,
    stableKey: `l${lesson}:vocab:match:${keySeed}`,
    lesson,
    category: "vocab",
    type: "match",
    prompt: "Relaciona cada término japonés con su significado.",
    matchLeft: left,
    matchRight: right,
    options: shuffle(Array.from(patterns)),
    correct: correctPattern,
    hint: `Lección ${lesson} · Relacionar`,
    explanation: `Relaciones correctas: ${correctPattern}.`,
  };
}

function buildLessonScenarioQuestions(lesson: number): QuizQuestion[] {
  switch (lesson) {
    case 1:
      return [
        createLessonQuestion(1, "grammar:reorder:intro", {
          category: "grammar",
          type: "reorder",
          prompt: "Ordena la oración de presentación.",
          reorderTokens: buildReorderTokens(["わたし", "は", "マリア", "です"]),
          options: [],
          correct: "わたし は マリア です",
          acceptedAnswers: ["わたしはマリアです"],
          hint: buildLessonHint(1, "Presentación"),
          explanation: "En L1 la forma básica es 「X は Y です」.",
        }),
        createLessonQuestion(1, "grammar:reorder:major", {
          category: "grammar",
          type: "reorder",
          prompt: "Ordena la oración sobre la especialidad.",
          reorderTokens: buildReorderTokens(["せんこう", "は", "れきし", "です"]),
          options: [],
          correct: "せんこう は れきし です",
          acceptedAnswers: ["せんこうはれきしです"],
          hint: buildLessonHint(1, "Especialidad"),
          explanation: "La estructura sigue siendo tema + predicado nominal.",
        }),
        createLessonQuestion(1, "grammar:mcq:negative-copula", {
          category: "grammar",
          type: "mcq",
          prompt: "¿Cuál oración significa “No soy profesor/a”?",
          options: [
            "わたしはせんせいです。",
            "わたしはせんせいじゃないです。",
            "わたしがせんせいじゃないです。",
            "わたしはせんせいでした。",
          ],
          correct: "わたしはせんせいじゃないです。",
          hint: buildLessonHint(1, "Copulativa negativa"),
          explanation: "La negativa formal en L1 es 「じゃないです」.",
        }),
        createLessonQuestion(1, "particles:text:theme", {
          category: "particles",
          type: "text",
          prompt: "Completa con la partícula correcta: わたし___がくせいです。",
          options: [],
          correct: "は",
          hint: buildLessonHint(1, "Tema"),
          explanation: "「は」 marca el tema de la oración.",
        }),
        createLessonQuestion(1, "reading:self-intro-1", {
          category: "reading",
          type: "mcq",
          prompt: "Lee el diálogo.\nA: せんこうはなんですか。\nB: にほんごです。\n\n¿Cuál es la especialidad de B?",
          options: ["にほんご", "れきし", "えいご", "コンピューター"],
          correct: "にほんご",
          hint: buildLessonHint(1, "Lectura corta"),
          explanation: "B responde 「にほんごです」.",
        }),
        createLessonQuestion(1, "reading:self-intro-2", {
          category: "reading",
          type: "mcq",
          prompt: "Lee la presentación.\nわたしは ルイスです。メキシコじんです。がくせいです。\n\n¿Cuál opción es correcta?",
          options: [
            "Luis es profesor.",
            "Luis es japonés.",
            "Luis es estudiante.",
            "Luis estudia historia.",
          ],
          correct: "Luis es estudiante.",
          hint: buildLessonHint(1, "Lectura corta"),
          explanation: "El texto dice 「がくせいです」.",
        }),
      ];
    case 2:
      return [
        createLessonQuestion(2, "grammar:reorder:ownership", {
          category: "grammar",
          type: "reorder",
          prompt: "Ordena la pregunta de posesión.",
          reorderTokens: buildReorderTokens(["それ", "は", "だれ", "の", "ほん", "です", "か"]),
          options: [],
          correct: "それ は だれ の ほん です か",
          acceptedAnswers: ["それはだれのほんですか"],
          hint: buildLessonHint(2, "Posesión"),
          explanation: "En L2, la posesión se expresa con 「の」.",
        }),
        createLessonQuestion(2, "grammar:mcq:demonstrative", {
          category: "grammar",
          type: "mcq",
          prompt: "Tu amigo tiene el paraguas en la mano. ¿Cuál opción encaja mejor?\n___かさは あなたのですか。",
          options: ["この", "その", "あの", "どの"],
          correct: "その",
          hint: buildLessonHint(2, "Demostrativos"),
          explanation: "「その」 se usa para algo cercano a la persona con quien hablas.",
        }),
        createLessonQuestion(2, "grammar:mcq:error", {
          category: "grammar",
          type: "mcq",
          prompt: "¿Cuál oración está mal formada?",
          options: [
            "これはにほんごのほんです。",
            "あのかばんはたけしさんのです。",
            "それはだれのですか。",
            "このはとけいです。",
          ],
          correct: "このはとけいです。",
          hint: buildLessonHint(2, "Ko-so-a-do"),
          explanation: "「この」 debe ir antes de un sustantivo: 「このとけい」.",
        }),
        createLessonQuestion(2, "particles:text:no", {
          category: "particles",
          type: "text",
          prompt: "Completa con la partícula correcta: これは マリアさん___ かばんです。",
          options: [],
          correct: "の",
          hint: buildLessonHint(2, "Posesión"),
          explanation: "La frase correcta es 「マリアさんのかばん」.",
        }),
        createLessonQuestion(2, "reading:store-1", {
          category: "reading",
          type: "mcq",
          prompt: "Lee el diálogo.\nA: このほんはいくらですか。\nB: せんえんです。\n\n¿Cuánto cuesta el libro?",
          options: ["100円", "500円", "1000円", "10000円"],
          correct: "1000円",
          hint: buildLessonHint(2, "Lectura corta"),
          explanation: "「せんえん」 son mil yenes.",
        }),
        createLessonQuestion(2, "reading:ownership-2", {
          category: "reading",
          type: "mcq",
          prompt: "Lee el diálogo.\nA: あれはだれのかさですか。\nB: わたしのです。\n\n¿Qué es de B?",
          options: ["Un reloj", "Un libro", "Un paraguas", "Una bicicleta"],
          correct: "Un paraguas",
          hint: buildLessonHint(2, "Lectura corta"),
          explanation: "「かさ」 significa paraguas.",
        }),
      ];
    case 3:
      return [
        createLessonQuestion(3, "grammar:reorder:study-plan", {
          category: "grammar",
          type: "reorder",
          prompt: "Ordena la oración sobre el plan de hoy.",
          reorderTokens: buildReorderTokens(["きょう", "としょかんで", "にほんごを", "べんきょうします"]),
          options: [],
          correct: "きょう としょかんで にほんごを べんきょうします",
          acceptedAnswers: ["きょうとしょかんでにほんごをべんきょうします"],
          hint: buildLessonHint(3, "Rutina"),
          explanation: "「で」 marca el lugar donde se realiza la acción.",
        }),
        createLessonQuestion(3, "grammar:mcq:place-particle", {
          category: "particles",
          type: "mcq",
          prompt: "Elige la mejor partícula: カフェ___コーヒーをのみます。",
          options: ["に", "で", "を", "が"],
          correct: "で",
          hint: buildLessonHint(3, "Lugar de acción"),
          explanation: "Con acciones se usa 「で」 para el lugar.",
        }),
        createLessonQuestion(3, "grammar:mcq:error", {
          category: "grammar",
          type: "mcq",
          prompt: "¿Cuál oración tiene un error de partícula?",
          options: [
            "がっこうにいきます。",
            "ほんをよみます。",
            "うちにかえります。",
            "としょかんにべんきょうします。",
          ],
          correct: "としょかんにべんきょうします。",
          hint: buildLessonHint(3, "Partículas básicas"),
          explanation: "Debe ser 「としょかんでべんきょうします」.",
        }),
        createLessonQuestion(3, "particles:text:time", {
          category: "particles",
          type: "text",
          prompt: "Completa con la partícula correcta: 7じ___おきます。",
          options: [],
          correct: "に",
          hint: buildLessonHint(3, "Hora"),
          explanation: "Con una hora específica, Genki usa 「に」.",
        }),
        createLessonQuestion(3, "reading:schedule-1", {
          category: "reading",
          type: "mcq",
          prompt: "Lee la rutina.\nまいあさ 6じに おきます。7じに あさごはんを たべます。8じに がっこうへ いきます。\n\n¿Qué hace esta persona a las 8?",
          options: ["Se despierta", "Desayuna", "Va a la escuela", "Lee"],
          correct: "Va a la escuela",
          hint: buildLessonHint(3, "Lectura corta"),
          explanation: "La última oración dice 「がっこうへいきます」.",
        }),
        createLessonQuestion(3, "reading:schedule-2", {
          category: "reading",
          type: "mcq",
          prompt: "Lee el diálogo.\nA: なんじにねますか。\nB: 12じごろねます。\n\n¿A qué hora duerme B?",
          options: ["A las diez", "Como a las once", "Como a las doce", "A las dos"],
          correct: "Como a las doce",
          hint: buildLessonHint(3, "Lectura corta"),
          explanation: "「12じごろ」 significa alrededor de las doce.",
        }),
      ];
    case 4:
      return [
        createLessonQuestion(4, "grammar:reorder:yesterday", {
          category: "grammar",
          type: "reorder",
          prompt: "Ordena la oración en pasado.",
          reorderTokens: buildReorderTokens(["きのう", "ともだちと", "えいがを", "みました"]),
          options: [],
          correct: "きのう ともだちと えいがを みました",
          acceptedAnswers: ["きのうともだちとえいがをみました"],
          hint: buildLessonHint(4, "Pasado"),
          explanation: "L4 trabaja el pasado formal de los verbos.",
        }),
        createLessonQuestion(4, "grammar:mcq:duration", {
          category: "grammar",
          type: "mcq",
          prompt: "Completa de manera natural: にほんごを ___ べんきょうしました。",
          options: ["いちじかん", "いちじかんに", "いちじかんで", "いちじかんを"],
          correct: "いちじかん",
          hint: buildLessonHint(4, "Duración"),
          explanation: "La duración normalmente va sin partícula.",
        }),
        createLessonQuestion(4, "grammar:mcq:negative-past", {
          category: "grammar",
          type: "mcq",
          prompt: "¿Cuál significa “No fui a la biblioteca”?",
          options: [
            "としょかんにいきました。",
            "としょかんにいきません。",
            "としょかんにいきませんでした。",
            "としょかんでいきませんでした。",
          ],
          correct: "としょかんにいきませんでした。",
          hint: buildLessonHint(4, "Pasado negativo"),
          explanation: "La forma es 「〜ませんでした」.",
        }),
        createLessonQuestion(4, "particles:text:companion", {
          category: "particles",
          type: "text",
          prompt: "Completa con la partícula correcta: ともだち___レストランへいきました。",
          options: [],
          correct: "と",
          hint: buildLessonHint(4, "Compañía"),
          explanation: "Para “con alguien” se usa 「と」.",
        }),
        createLessonQuestion(4, "reading:weekend-1", {
          category: "reading",
          type: "mcq",
          prompt: "Lee el texto.\nせんしゅうの どようび、としょかんで レポートを かきました。それから うちで テレビを みました。\n\n¿Qué hizo primero?",
          options: ["Vio TV", "Escribió un reporte", "Fue al parque", "Tomó fotos"],
          correct: "Escribió un reporte",
          hint: buildLessonHint(4, "Lectura corta"),
          explanation: "La primera acción es 「レポートをかきました」.",
        }),
        createLessonQuestion(4, "reading:weekend-2", {
          category: "reading",
          type: "mcq",
          prompt: "Lee el texto.\nきのう バスで えきへ いきました。でも ともだちに あいませんでした。\n\n¿Qué NO pasó?",
          options: ["Fue a la estación", "Fue en autobús", "Vio a su amigo", "Fue ayer"],
          correct: "Vio a su amigo",
          hint: buildLessonHint(4, "Lectura corta"),
          explanation: "El texto dice 「あいませんでした」.",
        }),
      ];
    case 5:
      return [
        createLessonQuestion(5, "grammar:reorder:adjective", {
          category: "grammar",
          type: "reorder",
          prompt: "Ordena la oración con adjetivo.",
          reorderTokens: buildReorderTokens(["この", "まち", "は", "にぎやか", "です"]),
          options: [],
          correct: "この まち は にぎやか です",
          acceptedAnswers: ["このまちはにぎやかです"],
          hint: buildLessonHint(5, "Adjetivos"),
          explanation: "Los adjetivos na van antes de 「です」 sin 「な」 en predicado.",
        }),
        createLessonQuestion(5, "grammar:mcq:adj-past", {
          category: "conjugation",
          type: "mcq",
          prompt: "¿Cuál es el pasado correcto de 「おもしろい」?",
          options: ["おもしろいでした", "おもしろかったです", "おもしろくないです", "おもしろじゃないです"],
          correct: "おもしろかったです",
          hint: buildLessonHint(5, "Adjetivos en pasado"),
          explanation: "Los adjetivos i cambian a 「〜かったです」.",
        }),
        createLessonQuestion(5, "grammar:mcq:suki", {
          category: "particles",
          type: "mcq",
          prompt: "Elige la opción natural: えいが___すきです。",
          options: ["は", "を", "が", "に"],
          correct: "が",
          hint: buildLessonHint(5, "好き / きらい"),
          explanation: "Con 「すき」 y 「きらい」, Genki usa 「が」.",
        }),
        createLessonQuestion(5, "conjugation:text:adj-negative", {
          category: "conjugation",
          type: "text",
          prompt: "Escribe la forma negativa formal de 「たかい」.",
          options: [],
          correct: "たかくないです",
          hint: buildLessonHint(5, "Adjetivo negativo"),
          explanation: "「たかい」 cambia a 「たかくないです」.",
        }),
        createLessonQuestion(5, "reading:okinawa-1", {
          category: "reading",
          type: "mcq",
          prompt: "Lee el texto.\nおきなわの うみは とても きれいです。でも ひこうきの チケットは あまり やすくないです。\n\n¿Qué dice el texto?",
          options: [
            "El mar no es bonito.",
            "Los boletos son muy baratos.",
            "El mar es muy bonito.",
            "No habla del mar.",
          ],
          correct: "El mar es muy bonito.",
          hint: buildLessonHint(5, "Lectura corta"),
          explanation: "La primera oración dice 「うみは とても きれいです」.",
        }),
        createLessonQuestion(5, "reading:okinawa-2", {
          category: "reading",
          type: "mcq",
          prompt: "Lee el diálogo.\nA: この まちは にぎやかですね。\nB: はい。レストランも たくさんあります。\n\n¿Cómo es la ciudad?",
          options: ["Tranquila", "Animada", "Cara", "Pequeña"],
          correct: "Animada",
          hint: buildLessonHint(5, "Lectura corta"),
          explanation: "「にぎやか」 describe una ciudad animada o concurrida.",
        }),
      ];
    case 6:
      return [
        createLessonQuestion(6, "grammar:reorder:sequence", {
          category: "grammar",
          type: "reorder",
          prompt: "Ordena la secuencia de acciones.",
          reorderTokens: buildReorderTokens(["あさごはんを", "たべて", "がっこうへ", "いきます"]),
          options: [],
          correct: "あさごはんを たべて がっこうへ いきます",
          acceptedAnswers: ["あさごはんをたべてがっこうへいきます"],
          hint: buildLessonHint(6, "Forma て"),
          explanation: "La forma て enlaza acciones en secuencia.",
        }),
        createLessonQuestion(6, "grammar:mcq:request", {
          category: "grammar",
          type: "mcq",
          prompt: "¿Cuál es la manera natural de decir “Por favor, come”?",
          options: ["たべます", "たべて", "たべてください", "たべました"],
          correct: "たべてください",
          hint: buildLessonHint(6, "Peticiones"),
          explanation: "La petición amable de L6 es 「〜てください」.",
        }),
        createLessonQuestion(6, "grammar:mcq:error", {
          category: "conjugation",
          type: "mcq",
          prompt: "¿Cuál forma て está mal?",
          options: ["よんで", "かいて", "たべて", "みりて"],
          correct: "みりて",
          hint: buildLessonHint(6, "Forma て"),
          explanation: "「みる」 pasa a 「みて」, no a 「みりて」.",
        }),
        createLessonQuestion(6, "conjugation:text:te", {
          category: "conjugation",
          type: "text",
          prompt: "Escribe la forma て de 「よむ」.",
          options: [],
          correct: "よんで",
          hint: buildLessonHint(6, "Forma て"),
          explanation: "「よむ」 es verbo u y cambia a 「よんで」.",
        }),
        createLessonQuestion(6, "reading:life-1", {
          category: "reading",
          type: "mcq",
          prompt: "Lee el texto.\nロバートさんは まいあさ コーヒーを のんで、しんぶんを よみます。それから がっこうへ いきます。\n\n¿Qué hace antes de ir a la escuela?",
          options: [
            "Nada y cocina",
            "Toma café y lee el periódico",
            "Ve una película",
            "Regresa a casa",
          ],
          correct: "Toma café y lee el periódico",
          hint: buildLessonHint(6, "Lectura corta"),
          explanation: "El texto enumera esas acciones antes de ir a la escuela.",
        }),
        createLessonQuestion(6, "reading:life-2", {
          category: "reading",
          type: "mcq",
          prompt: "Lee el diálogo.\nA: ここで しゃしんを とっても いいですか。\nB: はい、いいです。\n\n¿Qué permiso recibe A?",
          options: [
            "Puede sacar fotos aquí",
            "Puede comer aquí",
            "Puede fumar aquí",
            "Puede entrar al hospital",
          ],
          correct: "Puede sacar fotos aquí",
          hint: buildLessonHint(6, "Lectura corta"),
          explanation: "「しゃしんを とっても いいですか」 pregunta por permiso para tomar fotos.",
        }),
      ];
    case 7:
      return [
        createLessonQuestion(7, "grammar:reorder:work", {
          category: "grammar",
          type: "reorder",
          prompt: "Ordena la oración sobre la familia.",
          reorderTokens: buildReorderTokens(["ちち", "は", "とうきょうで", "はたらいています"]),
          options: [],
          correct: "ちち は とうきょうで はたらいています",
          acceptedAnswers: ["ちちはとうきょうではたらいています"],
          hint: buildLessonHint(7, "Familia"),
          explanation: "La oración describe a un familiar usando presente progresivo.",
        }),
        createLessonQuestion(7, "grammar:mcq:family-term", {
          category: "grammar",
          type: "mcq",
          prompt: "Cuando hablas de tu propia madre, ¿qué palabra usa Genki?",
          options: ["おかあさん", "はは", "おははさん", "かあさんさま"],
          correct: "はは",
          hint: buildLessonHint(7, "Términos familiares"),
          explanation: "Para tu propia familia, Genki contrasta 「はは」 con 「おかあさん」.",
        }),
        createLessonQuestion(7, "grammar:mcq:description", {
          category: "grammar",
          type: "mcq",
          prompt: "¿Cuál oración describe a alguien de manera natural?",
          options: [
            "あねは せが たかいです。",
            "あねは せが たかいじゃないです。",
            "あねが せ は たかいです。",
            "あねは せいぶつがくです。",
          ],
          correct: "あねは せが たかいです。",
          hint: buildLessonHint(7, "Descripciones"),
          explanation: "En descripciones físicas es natural decir 「せが たかい」.",
        }),
        createLessonQuestion(7, "particles:text:place-of-work", {
          category: "particles",
          type: "text",
          prompt: "Completa con la partícula correcta: とうきょう___はたらいています。",
          options: [],
          correct: "で",
          hint: buildLessonHint(7, "Lugar de acción"),
          explanation: "Trabajar es una acción; el lugar va con 「で」.",
        }),
        createLessonQuestion(7, "reading:family-1", {
          category: "reading",
          type: "mcq",
          prompt: "Lee el texto.\nわたしの あには だいがくせいです。まいにち としょかんで べんきょうしています。\n\n¿Qué hace el hermano todos los días?",
          options: [
            "Trabaja en un banco",
            "Estudia en la biblioteca",
            "Cocina en casa",
            "Nada en el mar",
          ],
          correct: "Estudia en la biblioteca",
          hint: buildLessonHint(7, "Lectura corta"),
          explanation: "El texto dice 「としょかんで べんきょうしています」.",
        }),
        createLessonQuestion(7, "reading:family-2", {
          category: "reading",
          type: "mcq",
          prompt: "Lee el diálogo.\nA: ごかぞくは なんにんですか。\nB: よにんです。\n\n¿Cuántas personas hay en la familia de B?",
          options: ["2", "3", "4", "5"],
          correct: "4",
          hint: buildLessonHint(7, "Lectura corta"),
          explanation: "「よにん」 significa cuatro personas.",
        }),
      ];
    case 8:
      return [
        createLessonQuestion(8, "grammar:reorder:casual-question", {
          category: "grammar",
          type: "reorder",
          prompt: "Ordena la pregunta casual.",
          reorderTokens: buildReorderTokens(["あした", "なにを", "する", "の"]),
          options: [],
          correct: "あした なにを する の",
          acceptedAnswers: ["あしたなにをするの"],
          hint: buildLessonHint(8, "Forma corta"),
          explanation: "En contexto informal se usa la forma corta.",
        }),
        createLessonQuestion(8, "grammar:mcq:short-negative", {
          category: "grammar",
          type: "mcq",
          prompt: "¿Cuál es la forma corta negativa de 「いく」?",
          options: ["いきません", "いかない", "いかなかった", "いくない"],
          correct: "いかない",
          hint: buildLessonHint(8, "Forma corta"),
          explanation: "La forma corta negativa de 「いく」 es 「いかない」.",
        }),
        createLessonQuestion(8, "grammar:mcq:quote-thought", {
          category: "grammar",
          type: "mcq",
          prompt: "¿Cuál oración significa “Creo que mañana hará frío”?",
          options: [
            "あしたは さむいと おもいます。",
            "あしたは さむいです おもいます。",
            "あしたは さむいを おもいます。",
            "あしたは さむいで おもいます。",
          ],
          correct: "あしたは さむいと おもいます。",
          hint: buildLessonHint(8, "Citas y opinión"),
          explanation: "Con una oración en forma corta, la cita va antes de 「とおもいます」.",
        }),
        createLessonQuestion(8, "grammar:text:short-past", {
          category: "grammar",
          type: "text",
          prompt: "Escribe la forma corta en pasado de 「たべる」.",
          options: [],
          correct: "たべた",
          hint: buildLessonHint(8, "Pasado corto"),
          explanation: "El pasado corto de 「たべる」 es 「たべた」.",
        }),
        createLessonQuestion(8, "reading:bbq-1", {
          category: "reading",
          type: "mcq",
          prompt: "Lee el diálogo.\nA: バーベキューに なにを もっていく？\nB: トマトと おにくを もっていくよ。\n\n¿Qué lleva B a la barbacoa?",
          options: [
            "Tomates y carne",
            "Solo una cámara",
            "Palillos y té",
            "Nada",
          ],
          correct: "Tomates y carne",
          hint: buildLessonHint(8, "Lectura corta"),
          explanation: "B dice 「トマトと おにく」.",
        }),
        createLessonQuestion(8, "reading:bbq-2", {
          category: "reading",
          type: "mcq",
          prompt: "Lee el texto.\nきょうは さむいから、ホームステイの うちで ばんごはんを たべます。\n\n¿Por qué comen en casa?",
          options: [
            "Porque hace calor",
            "Porque hace frío",
            "Porque están enfermos",
            "Porque no tienen comida",
          ],
          correct: "Porque hace frío",
          hint: buildLessonHint(8, "Lectura corta"),
          explanation: "La causa aparece con 「さむいから」.",
        }),
      ];
    case 9:
      return [
        createLessonQuestion(9, "grammar:reorder:noun-modifier", {
          category: "grammar",
          type: "reorder",
          prompt: "Ordena la oración con un modificador.",
          reorderTokens: buildReorderTokens(["きのう", "みた", "えいが", "は", "おもしろかったです"]),
          options: [],
          correct: "きのう みた えいが は おもしろかったです",
          acceptedAnswers: ["きのうみたえいがはおもしろかったです"],
          hint: buildLessonHint(9, "Modificadores"),
          explanation: "La cláusula corta 「きのうみた」 modifica a 「えいが」.",
        }),
        createLessonQuestion(9, "grammar:mcq:not-yet", {
          category: "grammar",
          type: "mcq",
          prompt: "¿Cuál significa “Todavía no he hecho la tarea”?",
          options: [
            "まだしゅくだいをしました。",
            "まだしゅくだいをしていません。",
            "しゅくだいをまだします。",
            "しゅくだいはもうしました。",
          ],
          correct: "まだしゅくだいをしていません。",
          hint: buildLessonHint(9, "まだ〜ていません"),
          explanation: "Ese patrón expresa “todavía no”.",
        }),
        createLessonQuestion(9, "grammar:mcq:past-short", {
          category: "conjugation",
          type: "mcq",
          prompt: "¿Cuál es el pasado corto de 「のむ」?",
          options: ["のんだ", "のみた", "のんで", "のまない"],
          correct: "のんだ",
          hint: buildLessonHint(9, "Pasado corto"),
          explanation: "「のむ」 pasa a 「のんだ」.",
        }),
        createLessonQuestion(9, "conjugation:text:modifier", {
          category: "grammar",
          type: "text",
          prompt: "Completa para decir “el libro que leí ayer”: きのう ___ ほん\nEscribe solo el japonés faltante.",
          options: [],
          correct: "よんだ",
          hint: buildLessonHint(9, "Cláusula corta"),
          explanation: "Para modificar 「ほん」 se usa la forma corta pasada: 「よんだ」.",
        }),
        createLessonQuestion(9, "reading:kabuki-1", {
          category: "reading",
          type: "mcq",
          prompt: "Lee el texto.\nかぶきの チケットを ふたつ かいました。でも まだ ともだちに あっていません。\n\n¿Qué NO ha hecho todavía esta persona?",
          options: [
            "Comprar dos boletos",
            "Ver a su amigo",
            "Hablar de Kabuki",
            "Comprar boletos de Kabuki",
          ],
          correct: "Ver a su amigo",
          hint: buildLessonHint(9, "Lectura corta"),
          explanation: "El texto dice 「まだ ともだちに あっていません」.",
        }),
        createLessonQuestion(9, "reading:kabuki-2", {
          category: "reading",
          type: "mcq",
          prompt: "Lee el texto.\nせんげつ かった あかい かばんは ちょっと たかかったです。でも きれいでした。\n\n¿Cómo era la bolsa?",
          options: [
            "Azul y barata",
            "Roja, bonita y un poco cara",
            "Negra y fea",
            "Nueva y gratis",
          ],
          correct: "Roja, bonita y un poco cara",
          hint: buildLessonHint(9, "Lectura corta"),
          explanation: "Se menciona que es roja, bonita y algo cara.",
        }),
      ];
    case 10:
      return [
        createLessonQuestion(10, "grammar:reorder:comparison", {
          category: "grammar",
          type: "reorder",
          prompt: "Ordena la comparación.",
          reorderTokens: buildReorderTokens(["にほんご", "の", "ほうが", "えいご", "より", "むずかしいです"]),
          options: [],
          correct: "にほんご の ほうが えいご より むずかしいです",
          acceptedAnswers: ["にほんごのほうがえいごよりむずかしいです"],
          hint: buildLessonHint(10, "Comparaciones"),
          explanation: "El patrón es 「A のほうが B より ...」.",
        }),
        createLessonQuestion(10, "grammar:mcq:comparison", {
          category: "grammar",
          type: "mcq",
          prompt: "Elige la comparación natural.",
          options: [
            "きょうとのほうが とうきょうより しずかです。",
            "きょうとより のほうが とうきょう しずかです。",
            "きょうとは とうきょうのほうが しずかです。",
            "きょうとのほうが より とうきょう しずかです。",
          ],
          correct: "きょうとのほうが とうきょうより しずかです。",
          hint: buildLessonHint(10, "Comparaciones"),
          explanation: "La estructura correcta es A のほうが B より ...",
        }),
        createLessonQuestion(10, "grammar:mcq:superlative", {
          category: "grammar",
          type: "mcq",
          prompt: "¿Qué oración significa “El sushi es lo más delicioso”?",
          options: [
            "すしが いちばん おいしいです。",
            "すしより おいしいです。",
            "すしの ほうが おいしいです。",
            "すしは もっと おいしいです。",
          ],
          correct: "すしが いちばん おいしいです。",
          hint: buildLessonHint(10, "Superlativo"),
          explanation: "Para “el más” Genki usa 「いちばん」.",
        }),
        createLessonQuestion(10, "particles:text:comparison", {
          category: "grammar",
          type: "text",
          prompt: "Completa con la palabra correcta: えいご___にほんごのほうがむずかしいです。",
          options: [],
          correct: "より",
          hint: buildLessonHint(10, "Comparaciones"),
          explanation: "La comparación base se marca con 「より」.",
        }),
        createLessonQuestion(10, "reading:travel-plan-1", {
          category: "reading",
          type: "mcq",
          prompt: "Lee el texto.\nふゆやすみに おおさかへ いきます。おおさかは とうきょうより たべものが やすいと おもいます。\n\n¿Qué piensa la persona?",
          options: [
            "Que Tokio es más barato",
            "Que la comida en Osaka es más barata",
            "Que Osaka está más lejos",
            "Que no irá de vacaciones",
          ],
          correct: "Que la comida en Osaka es más barata",
          hint: buildLessonHint(10, "Lectura corta"),
          explanation: "Eso expresa la segunda oración.",
        }),
        createLessonQuestion(10, "reading:travel-plan-2", {
          category: "reading",
          type: "mcq",
          prompt: "Lee el diálogo.\nA: どのまちが いちばん にぎやかですか。\nB: とうきょうが いちばん にぎやかです。\n\n¿Qué ciudad es la más animada?",
          options: ["Kioto", "Osaka", "Tokio", "Nagasaki"],
          correct: "Tokio",
          hint: buildLessonHint(10, "Lectura corta"),
          explanation: "B responde directamente 「とうきょう」.",
        }),
      ];
    case 11:
      return [
        createLessonQuestion(11, "grammar:reorder:want-to", {
          category: "grammar",
          type: "reorder",
          prompt: "Ordena la oración de deseo.",
          reorderTokens: buildReorderTokens(["きょうとへ", "いきたいです"]),
          options: [],
          correct: "きょうとへ いきたいです",
          acceptedAnswers: ["きょうとへいきたいです"],
          hint: buildLessonHint(11, "〜たい"),
          explanation: "La forma de deseo se hace con la raíz de ます + 「たいです」.",
        }),
        createLessonQuestion(11, "grammar:reorder:tari", {
          category: "grammar",
          type: "reorder",
          prompt: "Ordena la oración con 「〜たり〜たりする」.",
          reorderTokens: buildReorderTokens(["しゅうまつは", "ほんを", "よんだり", "えいがを", "みたり", "します"]),
          options: [],
          correct: "しゅうまつは ほんを よんだり えいがを みたり します",
          acceptedAnswers: ["しゅうまつはほんをよんだりえいがをみたりします"],
          hint: buildLessonHint(11, "〜たり〜たりする"),
          explanation: "Ese patrón expresa una lista no exhaustiva de actividades.",
        }),
        createLessonQuestion(11, "grammar:mcq:want-to", {
          category: "grammar",
          type: "mcq",
          prompt: "¿Cuál oración significa “Quiero tomar fotos”?",
          options: [
            "しゃしんを とります。",
            "しゃしんを とりたいです。",
            "しゃしんを とったです。",
            "しゃしんを とるたりします。",
          ],
          correct: "しゃしんを とりたいです。",
          hint: buildLessonHint(11, "Deseo"),
          explanation: "「とる」 pasa a 「とりたいです」.",
        }),
        createLessonQuestion(11, "grammar:text:want-to", {
          category: "grammar",
          type: "text",
          prompt: "Escribe la forma 「quiero ir」 de 「いく」.",
          options: [],
          correct: "いきたいです",
          hint: buildLessonHint(11, "Deseo"),
          explanation: "La forma correcta es 「いきたいです」.",
        }),
        createLessonQuestion(11, "reading:vacation-1", {
          category: "reading",
          type: "mcq",
          prompt: "Lee el texto.\nりょこうで おてらを みたり、しゃしんを とったり したいです。\n\n¿Qué quiere hacer esta persona?",
          options: [
            "Solo dormir",
            "Ver templos y tomar fotos",
            "Estudiar en la biblioteca",
            "Regresar a casa",
          ],
          correct: "Ver templos y tomar fotos",
          hint: buildLessonHint(11, "Lectura corta"),
          explanation: "Las dos acciones aparecen con 「〜たり」.",
        }),
        createLessonQuestion(11, "reading:vacation-2", {
          category: "reading",
          type: "mcq",
          prompt: "Lee el diálogo.\nA: しゅうまつ なにを したいですか。\nB: こうえんへ いって、さんぽしたいです。\n\n¿Qué quiere hacer B el fin de semana?",
          options: [
            "Ir al parque y pasear",
            "Cantar en karaoke",
            "Tomar medicina",
            "Escribir una carta",
          ],
          correct: "Ir al parque y pasear",
          hint: buildLessonHint(11, "Lectura corta"),
          explanation: "B dice 「こうえんへ いって、さんぽしたいです」.",
        }),
      ];
    case 12:
      return [
        createLessonQuestion(12, "grammar:reorder:advice", {
          category: "grammar",
          type: "reorder",
          prompt: "Ordena el consejo.",
          reorderTokens: buildReorderTokens(["きょうは", "やすんだ", "ほうが", "いいです"]),
          options: [],
          correct: "きょうは やすんだ ほうが いいです",
          acceptedAnswers: ["きょうはやすんだほうがいいです"],
          hint: buildLessonHint(12, "Consejos"),
          explanation: "Para aconsejar, Genki usa 「〜たほうがいいです」.",
        }),
        createLessonQuestion(12, "grammar:mcq:too-much", {
          category: "grammar",
          type: "mcq",
          prompt: "¿Cuál significa “Bebí demasiado”?",
          options: [
            "のみすぎました。",
            "のみたいです。",
            "のんだほうがいいです。",
            "のまないんです。",
          ],
          correct: "のみすぎました。",
          hint: buildLessonHint(12, "〜すぎる"),
          explanation: "La forma 「〜すぎる」 expresa exceso.",
        }),
        createLessonQuestion(12, "grammar:mcq:explanatory", {
          category: "grammar",
          type: "mcq",
          prompt: "¿Cuál oración suena como una explicación de “Me duele la cabeza”?",
          options: [
            "あたまが いたいです。",
            "あたまが いたいんです。",
            "あたまを いたいです。",
            "あたま いたいほうがいいです。",
          ],
          correct: "あたまが いたいんです。",
          hint: buildLessonHint(12, "〜んです"),
          explanation: "「〜んです」 da tono explicativo.",
        }),
        createLessonQuestion(12, "grammar:text:advice", {
          category: "grammar",
          type: "text",
          prompt: "Escribe en japonés: “deberías tomar medicina”.",
          options: [],
          correct: "くすりをのんだほうがいいです",
          acceptedAnswers: ["薬をのんだほうがいいです", "くすりを飲んだほうがいいです", "薬を飲んだほうがいいです"],
          hint: buildLessonHint(12, "Consejos"),
          explanation: "La estructura correcta es 「くすりを のんだほうがいいです」.",
        }),
        createLessonQuestion(12, "reading:illness-1", {
          category: "reading",
          type: "mcq",
          prompt: "Lee el diálogo.\nA: どうしたんですか。\nB: ねつがあって、のどが いたいんです。\n\n¿Qué le pasa a B?",
          options: [
            "Tiene fiebre y le duele la garganta",
            "Le duele el pie",
            "Tiene hambre",
            "Está de vacaciones",
          ],
          correct: "Tiene fiebre y le duele la garganta",
          hint: buildLessonHint(12, "Lectura corta"),
          explanation: "Eso dice exactamente B.",
        }),
        createLessonQuestion(12, "reading:illness-2", {
          category: "reading",
          type: "mcq",
          prompt: "Lee el texto.\nきのう あまり ねませんでした。だから、きょうは はやく ねたほうがいいです。\n\n¿Qué consejo da el texto?",
          options: [
            "Comer más",
            "Dormir más temprano",
            "Tomar el tren",
            "Estudiar toda la noche",
          ],
          correct: "Dormir más temprano",
          hint: buildLessonHint(12, "Lectura corta"),
          explanation: "El consejo aparece en la segunda oración.",
        }),
      ];
    default:
      return [];
  }
}

function buildLessonExamQuestionPool(lesson: number): QuizQuestion[] {
  const normalizedLesson = Math.max(1, Math.min(12, lesson));
  const pool: QuizQuestion[] = [];

  const lessonVocab = (ALL_GENKI_VOCAB_BY_LESSON[normalizedLesson] || []).filter((item) => isExamVocabEligible(normalizedLesson, item));
  const neighborLessons = LESSONS.filter((l) => Math.abs(l - normalizedLesson) <= 1);
  const neighborVocab = neighborLessons.flatMap((l) => (ALL_GENKI_VOCAB_BY_LESSON[l] || []).filter((item) => isExamVocabEligible(l, item)));
  const allVocab = Object.values(ALL_GENKI_VOCAB_BY_LESSON).flat().filter((item) => isExamVocabEligible(normalizedLesson, item));
  const meaningPool = Array.from(new Set((neighborVocab.length > 8 ? neighborVocab : allVocab).map((item) => item.es).filter(Boolean)));
  const jpPool = Array.from(
    new Set(
      (neighborVocab.length > 8 ? neighborVocab : allVocab)
        .map((item) => (item.kanji?.trim() ? `${item.kanji.trim()} (${item.kana})` : item.kana))
        .filter(Boolean),
    ),
  );

  lessonVocab.forEach((item, index) => {
    const sameLessonMeanings = Array.from(new Set(lessonVocab.map((entry) => entry.es).filter((value) => value && value !== item.es)));
    const sameLessonJapanese = Array.from(
      new Set(
        lessonVocab
          .map((entry) => (entry.kanji?.trim() ? `${entry.kanji.trim()} (${entry.kana})` : entry.kana))
          .filter((value) => value && value !== (item.kanji?.trim() ? `${item.kanji.trim()} (${item.kana})` : item.kana)),
      ),
    );
    const jpForm = item.kanji?.trim() ? `${item.kanji.trim()} (${item.kana})` : item.kana;
    pool.push({
      id: `exam-vocab-es-l${normalizedLesson}-${index}`,
      stableKey: `l${normalizedLesson}:vocab:es:${item.kana}:${index}`,
      lesson: normalizedLesson,
      category: "vocab",
      type: "mcq",
      prompt: `¿Qué significa 「${item.kana}」?`,
      options: buildOptionSet(item.es, sameLessonMeanings, meaningPool),
      correct: item.es,
      hint: `Lección ${normalizedLesson} · Vocabulario`,
      explanation: `「${item.kana}」 significa “${item.es}”.`,
    });
    pool.push({
      id: `exam-vocab-jp-l${normalizedLesson}-${index}`,
      stableKey: `l${normalizedLesson}:vocab:jp:${item.kana}:${index}`,
      lesson: normalizedLesson,
      category: "vocab",
      type: "mcq",
      prompt: `Selecciona el japonés para: “${item.es}”`,
      options: buildOptionSet(jpForm, sameLessonJapanese, jpPool),
      correct: jpForm,
      hint: `Lección ${normalizedLesson} · Vocabulario`,
      explanation: `La opción correcta para “${item.es}” es 「${jpForm}」.`,
    });
  });

  for (let i = 0; i < 4; i += 1) {
    const matchQ = buildVocabMatchingQuestion(normalizedLesson, lessonVocab, `${i}`);
    if (matchQ) pool.push(matchQ);
  }

  const lessonKanji = GENKI_KANJI_BY_LESSON[normalizedLesson] || [];
  const allKanjiReadings = Array.from(new Set(Object.values(GENKI_KANJI_BY_LESSON).flat().map((item) => item.hira).filter(Boolean)));
  lessonKanji.forEach((item, index) => {
    pool.push({
      id: `exam-kanji-l${normalizedLesson}-${index}`,
      stableKey: `l${normalizedLesson}:kanji:mcq:${item.kanji}:${index}`,
      lesson: normalizedLesson,
      category: "kanji",
      type: "mcq",
      prompt: `¿Cómo se lee 「${item.kanji}」?`,
      options: buildOptionSet(item.hira, allKanjiReadings.filter((reading) => reading !== item.hira), allKanjiReadings),
      correct: item.hira,
      hint: `Lección ${normalizedLesson} · Kanji`,
      explanation: `「${item.kanji}」 se lee 「${item.hira}」.`,
    });
    pool.push({
      id: `exam-kanji-text-l${normalizedLesson}-${index}`,
      stableKey: `l${normalizedLesson}:kanji:text:${item.kanji}:${index}`,
      lesson: normalizedLesson,
      category: "kanji",
      type: "text",
      prompt: `Escribe en hiragana la lectura de 「${item.kanji}」`,
      options: [],
      correct: item.hira,
      acceptedAnswers: [item.hira.replace(/\s+/g, "")],
      hint: `Lección ${normalizedLesson} · Kanji`,
      explanation: `La lectura correcta es 「${item.hira}」.`,
    });
  });

  PARTICLE_EXAM_BANK.filter((entry) => entry.minLesson <= normalizedLesson).forEach((entry) => {
    pool.push({
      id: `exam-particle-${entry.id}`,
      stableKey: `l${normalizedLesson}:particle:mcq:${entry.id}`,
      lesson: normalizedLesson,
      category: "particles",
      type: "mcq",
      prompt: entry.prompt,
      options: shuffle(entry.options),
      correct: entry.correct,
      hint: `Lección ${normalizedLesson} · Partículas`,
      explanation: entry.explanation,
    });
    pool.push({
      id: `exam-particle-text-${entry.id}`,
      stableKey: `l${normalizedLesson}:particle:text:${entry.id}`,
      lesson: normalizedLesson,
      category: "particles",
      type: "text",
      prompt: `${entry.prompt}\nEscribe solo la partícula faltante.`,
      options: [],
      correct: entry.correct,
      acceptedAnswers: [entry.correct.replace(/\s+/g, ""), entry.correct.replace(/\s*\/\s*/g, "/")],
      hint: `Lección ${normalizedLesson} · Partículas`,
      explanation: entry.explanation,
    });
  });

  let verbs = ALL_VERBS.filter((verb) => verb.lesson === normalizedLesson);
  if (verbs.length < 4) {
    verbs = ALL_VERBS.filter((verb) => verb.lesson <= normalizedLesson && verb.lesson >= 3);
  }
  const allVerbTe = Array.from(new Set(ALL_VERBS.map((verb) => toTeForm(verb))));
  const allVerbPast = Array.from(new Set(ALL_VERBS.map((verb) => toPastShort(verb))));
  const allVerbMasu = Array.from(new Set(ALL_VERBS.map((verb) => toMasu(verb))));
  verbs.forEach((verb) => {
    const te = toTeForm(verb);
    const past = toPastShort(verb);
    const masu = toMasu(verb);
    pool.push({
      id: `exam-conj-te-${verb.kana}-${normalizedLesson}`,
      stableKey: `l${normalizedLesson}:conj:te:${verb.kana}`,
      lesson: normalizedLesson,
      category: "conjugation",
      type: "mcq",
      prompt: `Forma て de 「${verb.kana}」 (${verb.es})`,
      options: buildOptionSet(te, allVerbTe.filter((value) => value !== te), allVerbTe),
      correct: te,
      hint: `Lección ${normalizedLesson} · Conjugación`,
      explanation: `La forma て de 「${verb.kana}」 es 「${te}」.`,
    });
    pool.push({
      id: `exam-conj-past-${verb.kana}-${normalizedLesson}`,
      stableKey: `l${normalizedLesson}:conj:past:${verb.kana}`,
      lesson: normalizedLesson,
      category: "conjugation",
      type: "mcq",
      prompt: `Pasado corto de 「${verb.kana}」 (${verb.es})`,
      options: buildOptionSet(past, allVerbPast.filter((value) => value !== past), allVerbPast),
      correct: past,
      hint: `Lección ${normalizedLesson} · Conjugación`,
      explanation: `El pasado corto de 「${verb.kana}」 es 「${past}」.`,
    });
    pool.push({
      id: `exam-conj-masu-text-${verb.kana}-${normalizedLesson}`,
      stableKey: `l${normalizedLesson}:conj:masu:text:${verb.kana}`,
      lesson: normalizedLesson,
      category: "conjugation",
      type: "text",
      prompt: `Escribe la forma ます de 「${verb.kana}」 (${verb.es})`,
      options: [],
      correct: masu,
      hint: `Lección ${normalizedLesson} · Conjugación`,
      explanation: `La forma ます de 「${verb.kana}」 es 「${masu}」.`,
    });
  });

  let adjs = ALL_ADJECTIVES.filter((adj) => adj.lesson === normalizedLesson);
  if (adjs.length < 2) {
    adjs = ALL_ADJECTIVES.filter((adj) => adj.lesson <= normalizedLesson && adj.lesson >= 5);
  }
  const allAdjNeg = Array.from(new Set(ALL_ADJECTIVES.map((adj) => toAdjNegative(adj))));
  adjs.forEach((adj) => {
    const negative = toAdjNegative(adj);
    pool.push({
      id: `exam-conj-adj-neg-${adj.kana}-${normalizedLesson}`,
      stableKey: `l${normalizedLesson}:conj:adjneg:${adj.kana}`,
      lesson: normalizedLesson,
      category: "conjugation",
      type: "mcq",
      prompt: `Forma negativa de 「${adj.kana}」 (${adj.es})`,
      options: buildOptionSet(negative, allAdjNeg.filter((value) => value !== negative), allAdjNeg),
      correct: negative,
      hint: `Lección ${normalizedLesson} · Conjugación`,
      explanation: `La forma negativa de 「${adj.kana}」 es 「${negative}」.`,
    });
  });

  pool.push(...buildLessonScenarioQuestions(normalizedLesson));

  return pool.filter((q, idx, arr) => arr.findIndex((entry) => entry.stableKey === q.stableKey) === idx);
}

function pickPrioritizedQuestions(
  source: QuizQuestion[],
  seenMap: Record<string, number>,
  count: number,
  used: Set<string>,
) {
  const candidates = source.filter((question) => !used.has(question.stableKey || question.id));
  const unseen = shuffle(candidates.filter((question) => !seenMap[question.stableKey || question.id]));
  const seen = candidates
    .filter((question) => seenMap[question.stableKey || question.id])
    .sort((a, b) => (seenMap[a.stableKey || a.id] || 0) - (seenMap[b.stableKey || b.id] || 0));
  const picked = [...unseen, ...seen].slice(0, count);
  picked.forEach((question) => used.add(question.stableKey || question.id));
  return picked;
}

function pickLessonExamQuestions(pool: QuizQuestion[], seenMap: Record<string, number>, count: number, lesson: number) {
  const used = new Set<string>();
  const result: QuizQuestion[] = [];
  const hasKanji = lesson >= 3;
  const hasConj = lesson >= 3;

  const targets: Record<QuizCategory, number> = {
    vocab: hasConj ? 5 : 6,
    kanji: hasKanji ? 2 : 0,
    particles: hasConj ? 3 : 4,
    conjugation: hasConj ? 3 : 0,
    grammar: hasConj ? 5 : 7,
    reading: 2,
  };
  if (!hasConj) targets.grammar = 8;

  (["vocab", "kanji", "particles", "conjugation", "grammar", "reading"] as const).forEach((category) => {
    const categoryPool = pool.filter((question) => question.category === category);
    result.push(...pickPrioritizedQuestions(categoryPool, seenMap, targets[category], used));
  });

  if (result.length < count) {
    result.push(...pickPrioritizedQuestions(pool, seenMap, count - result.length, used));
  }
  return shuffle(result).slice(0, count);
}

function resolveStudyView(searchParams: Pick<URLSearchParams, "get">): StudyView | null {
  const view = searchParams.get("view");
  if (view === "kana" || view === "flashcards" || view === "sprint" || view === "exam") return view;
  if (searchParams.get("kana") === "1") return "kana";
  if (searchParams.get("flashcards") === "1") return "flashcards";
  if (searchParams.get("sprint") === "1") return "sprint";
  if (searchParams.get("exam") === "1") return "exam";
  return null;
}

const KANJI_SET_LINKS: Record<number, string> = {
  3: "https://quizlet.com/jp/901868377/genki-leccion-3-kanji-flash-cards/",
  4: "https://quizlet.com/jp/901873809/genki-leccion-4-kanji-flash-cards/",
  5: "https://quizlet.com/jp/901079452/genki-leccion-5-vocabulario-flash-cards/",
  6: "https://quizlet.com/jp/901874064/genki-leccion-6-kanji-flash-cards/",
  7: "https://quizlet.com/jp/901874242/genki-leccion-7-kanji-flash-cards/",
};

function dedupeFlashItems(items: FlashcardItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.front}__${item.back}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getCustomFlashDeckStorageKey(userKey: string) {
  return `study-custom-flash-decks-${userKey || "anon"}`;
}

function buildCustomFlashDeckDescription(setCount: number, itemCount: number) {
  const setLabel = `${setCount} ${setCount === 1 ? "set" : "sets"}`;
  const itemLabel = `${itemCount} ${itemCount === 1 ? "tarjeta" : "tarjetas"}`;
  return `${setLabel} combinados · ${itemLabel}`;
}

function toAdjNegativePolite(adj: AdjEntry) {
  if (adj.kind === "i") return `${adj.kana.slice(0, -1)}くないです`;
  return `${adj.kana}じゃないです`;
}

function toAdjPastPolite(adj: AdjEntry) {
  if (adj.kind === "i") return `${adj.kana.slice(0, -1)}かったです`;
  return `${adj.kana}でした`;
}

function toAdjPastNegativePolite(adj: AdjEntry) {
  if (adj.kind === "i") return `${adj.kana.slice(0, -1)}くなかったです`;
  return `${adj.kana}じゃなかったです`;
}

function buildFlashcardSets() {
  const sets: FlashcardSet[] = [];

  const addSet = (set: FlashcardSet) => {
    sets.push({ ...set, items: dedupeFlashItems(set.items) });
  };

  const mapVocab = (lesson: number) =>
    (GENKI_VOCAB_BY_LESSON[lesson] || []).map((item, index) => ({
      id: `l${lesson}-v-${index + 1}`,
      front: item.hira,
      back: item.es,
    }));

  const mapKanji = (lesson: number) =>
    (GENKI_KANJI_BY_LESSON[lesson] || []).map((item, index) => ({
      id: `l${lesson}-k-${index + 1}`,
      front: item.kanji,
      back: item.hira,
    }));

  addSet({
    id: "l1-hiragana",
    lesson: 1,
    title: "Hiragana",
    description: "Silabario básico hiragana",
    items: HIRAGANA.map(([char, romaji], index) => ({ id: `h-${index + 1}`, front: char, back: romaji })),
  });
  addSet({ id: "l1-vocab", lesson: 1, title: "Vocabulario", description: "Lección 1", items: mapVocab(1) });

  addSet({
    id: "l2-katakana",
    lesson: 2,
    title: "Katakana",
    description: "Silabario básico katakana",
    items: KATAKANA.map(([char, romaji], index) => ({ id: `k-${index + 1}`, front: char, back: romaji })),
  });
  addSet({ id: "l2-vocab", lesson: 2, title: "Vocabulario", description: "Lección 2", items: mapVocab(2) });

  addSet({ id: "l3-vocab", lesson: 3, title: "Vocabulario", description: "Lección 3", items: mapVocab(3) });
  addSet({
    id: "l3-masu",
    lesson: 3,
    title: "Verbos forma ます",
    description: "Forma diccionario → forma ます",
    items: L3_MASU_FROM_URL.map((verb, index) => ({
      id: `l3-m-${index + 1}`,
      front: `${verb.dict} (${verb.es})`,
      back: verb.masu,
    })),
  });
  addSet({
    id: "l3-kanji",
    lesson: 3,
    title: "Kanji",
    description: "Kanji → hiragana",
    sourceUrl: KANJI_SET_LINKS[3],
    items: mapKanji(3),
  });

  addSet({ id: "l4-vocab", lesson: 4, title: "Vocabulario", description: "Lección 4", items: mapVocab(4) });
  addSet({
    id: "l4-kanji",
    lesson: 4,
    title: "Kanji",
    description: "Kanji → hiragana",
    sourceUrl: KANJI_SET_LINKS[4],
    items: mapKanji(4),
  });

  addSet({ id: "l5-vocab", lesson: 5, title: "Vocabulario", description: "Lección 5", items: mapVocab(5) });
  addSet({
    id: "l5-adj-negative",
    lesson: 5,
    title: "Adjetivos · presente negativo",
    description: "Diccionario → presente negativo (formal)",
    items: L5_ADJECTIVES_FROM_URL.map((adj, index) => ({
      id: `l5-an-${index + 1}`,
      front: `${adj.display || adj.kana} (${adj.es})`,
      back: toAdjNegativePoliteFromUrl(adj),
    })),
  });
  addSet({
    id: "l5-adj-past",
    lesson: 5,
    title: "Adjetivos · pasado afirmativo",
    description: "Diccionario → pasado afirmativo (formal)",
    items: L5_ADJECTIVES_FROM_URL.map((adj, index) => ({
      id: `l5-ap-${index + 1}`,
      front: `${adj.display || adj.kana} (${adj.es})`,
      back: toAdjPastPoliteFromUrl(adj),
    })),
  });
  addSet({
    id: "l5-adj-past-negative",
    lesson: 5,
    title: "Adjetivos · pasado negativo",
    description: "Diccionario → pasado negativo (formal)",
    items: L5_ADJECTIVES_FROM_URL.map((adj, index) => ({
      id: `l5-apn-${index + 1}`,
      front: `${adj.display || adj.kana} (${adj.es})`,
      back: toAdjPastNegativePoliteFromUrl(adj),
    })),
  });
  addSet({
    id: "l5-kanji",
    lesson: 5,
    title: "Kanji",
    description: "Kanji → hiragana",
    sourceUrl: KANJI_SET_LINKS[5],
    items: mapKanji(5),
  });

  addSet({ id: "l6-vocab", lesson: 6, title: "Vocabulario", description: "Lección 6", items: mapVocab(6) });
  addSet({
    id: "l6-te",
    lesson: 6,
    title: "Verbos forma 〜て",
    description: "Forma diccionario → forma て",
    items: L6_TE_FROM_URL.map((verb, index) => ({
      id: `l6-te-${index + 1}`,
      front: `${verb.dict} (${verb.es})`,
      back: verb.te,
    })),
  });
  addSet({
    id: "l6-kanji",
    lesson: 6,
    title: "Kanji",
    description: "Kanji → hiragana",
    sourceUrl: KANJI_SET_LINKS[6],
    items: mapKanji(6),
  });

  addSet({ id: "l7-vocab", lesson: 7, title: "Vocabulario", description: "Lección 7", items: mapVocab(7) });
  addSet({
    id: "l7-kanji",
    lesson: 7,
    title: "Kanji",
    description: "Kanji → hiragana",
    sourceUrl: KANJI_SET_LINKS[7],
    items: mapKanji(7),
  });

  for (let lesson = 8; lesson <= 12; lesson += 1) {
    addSet({
      id: `l${lesson}-vocab`,
      lesson,
      title: "Vocabulario",
      description: `Lección ${lesson}`,
      items: mapVocab(lesson),
    });
    if ((GENKI_KANJI_BY_LESSON[lesson] || []).length > 0) {
      addSet({
        id: `l${lesson}-kanji`,
        lesson,
        title: "Kanji",
        description: "Kanji → hiragana",
        items: mapKanji(lesson),
      });
    }
  }

  return sets;
}

const FLASHCARD_SETS: FlashcardSet[] = buildFlashcardSets();

function StudyContent() {
  const searchParams = useSearchParams();
  const selectedView = useMemo(() => resolveStudyView(searchParams), [searchParams]);
  const [activeTab, setActiveTab] = useState<StudyView>("kana");
  const [userKey, setUserKey] = useState("anon");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [kanaSet, setKanaSet] = useState<KanaMode>("hiragana");
  const [kanaRunning, setKanaRunning] = useState(false);
  const [kanaTime, setKanaTime] = useState(60);
  const [kanaScore, setKanaScore] = useState(0);
  const [kanaBestByMode, setKanaBestByMode] = useState<Record<KanaMode, number>>({ hiragana: 0, katakana: 0, mixed: 0 });
  const [kanaCountdown, setKanaCountdown] = useState<number | null>(null);
  const [kanaPenalty, setKanaPenalty] = useState(0);
  const [weeklyResetLabel, setWeeklyResetLabel] = useState("");
  const [kanaLeaderboard, setKanaLeaderboard] = useState<Record<KanaMode, KanaScoreRow[]>>({ hiragana: [], katakana: [], mixed: [] });
  const [leaderboardUnavailable, setLeaderboardUnavailable] = useState(false);
  const [kanaQuestion, setKanaQuestion] = useState<{ char: string; correct: string; options: string[] }>({
    char: "あ",
    correct: "a",
    options: ["a", "i", "u", "e"],
  });
  const kanaRoundSubmittedRef = useRef(false);
  const pendingKanaSubmitRef = useRef<KanaRoundPayload | null>(null);
  const kanaRoundStartedAtRef = useRef<number | null>(null);
  const kanaAnswersCountRef = useRef(0);
  const weekKeyRef = useRef(getLocalWeekStart().toISOString().slice(0, 10));

  const [vkBucket, setVkBucket] = useState<VkBucketKey>("l1_2");
  const [vkRunning, setVkRunning] = useState(false);
  const [vkTime, setVkTime] = useState(60);
  const [vkScore, setVkScore] = useState(0);
  const [vkPenalty, setVkPenalty] = useState(0);
  const [vkCountdown, setVkCountdown] = useState<number | null>(null);
  const [vkBestByBucket, setVkBestByBucket] = useState<Record<VkBucketKey, number>>({
    l1_2: 0,
    l3_4: 0,
    l5_6: 0,
    l7_8: 0,
    l9_10: 0,
    l11_12: 0,
  });
  const [vkLeaderboard, setVkLeaderboard] = useState<Record<VkBucketKey, KanaScoreRow[]>>({
    l1_2: [],
    l3_4: [],
    l5_6: [],
    l7_8: [],
    l9_10: [],
    l11_12: [],
  });
  const [vkLeaderboardUnavailable, setVkLeaderboardUnavailable] = useState(false);
  const [vkQuestion, setVkQuestion] = useState<{ prompt: string; correct: string; options: string[]; hint: string }>({
    prompt: "だいがく",
    correct: "universidad; instituto",
    options: ["universidad; instituto", "escuela", "libro", "agua"],
    hint: "Significado",
  });
  const vkRoundSubmittedRef = useRef(false);
  const pendingVkSubmitRef = useRef<VkRoundPayload | null>(null);
  const vkRoundStartedAtRef = useRef<number | null>(null);
  const vkAnswersCountRef = useRef(0);

  const [flashLessonFolder, setFlashLessonFolder] = useState<number | null>(null);
  const [flashSetId, setFlashSetId] = useState<string | null>(null);
  const [flashMode, setFlashMode] = useState<"browse" | "cards" | "learn">("browse");
  const [flashCardsDeck, setFlashCardsDeck] = useState<FlashcardItem[]>([]);
  const [flashCardIndex, setFlashCardIndex] = useState(0);
  const [flashCardFlipped, setFlashCardFlipped] = useState(false);
  const [flashLearnQuestions, setFlashLearnQuestions] = useState<FlashLearnQuestion[]>([]);
  const [flashLearnIndex, setFlashLearnIndex] = useState(0);
  const [flashLearnChoice, setFlashLearnChoice] = useState<string | null>(null);
  const [flashLearnScore, setFlashLearnScore] = useState(0);
  const [flashLearnFinished, setFlashLearnFinished] = useState(false);
  const [customFlashDecks, setCustomFlashDecks] = useState<CustomFlashDeckRecord[]>([]);
  const [flashDeckBuilderOpen, setFlashDeckBuilderOpen] = useState(false);
  const [flashDeckEditingId, setFlashDeckEditingId] = useState<string | null>(null);
  const [flashDeckName, setFlashDeckName] = useState("");
  const [flashDeckSelectedSetIds, setFlashDeckSelectedSetIds] = useState<string[]>([]);
  const [flashRouteId, setFlashRouteId] = useState<string | null>(FLASHCARD_ROUTE_GROUPS[0]?.id ?? null);

  const [quizMode, setQuizMode] = useState<QuizMode>("particles");
  const [quizCount, setQuizCount] = useState<QuizCount>(10);
  const [quizLessons, setQuizLessons] = useState<number[]>([1]);
  const [conjTypes, setConjTypes] = useState<ConjType[]>(["te", "masu"]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizChoice, setQuizChoice] = useState<string | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const quizCardRef = useRef<HTMLDivElement | null>(null);

  const [examLesson, setExamLesson] = useState(1);
  const [examQuestions, setExamQuestions] = useState<QuizQuestion[]>([]);
  const [examIndex, setExamIndex] = useState(0);
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});
  const [examFinished, setExamFinished] = useState(false);
  const [examHistory, setExamHistory] = useState<ExamAttempt[]>([]);
  const examCardRef = useRef<HTMLDivElement | null>(null);
  const examPersistedRef = useRef(false);

  const flashFocusRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const boot = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const key = user?.id || "anon";
      setCurrentUserId(user?.id || null);
      setUserKey(key);
      try {
        const weekKey = getLocalWeekStart().toISOString().slice(0, 10);
        const rawBest = localStorage.getItem(`study-kana-best-map-${key}-${weekKey}`);
        if (rawBest) {
          const parsed = JSON.parse(rawBest);
          const hira = Number(parsed?.hiragana || 0);
          const kata = Number(parsed?.katakana || 0);
          const mixed = Number(parsed?.mixed || 0);
          setKanaBestByMode({
            hiragana: Number.isNaN(hira) ? 0 : hira,
            katakana: Number.isNaN(kata) ? 0 : kata,
            mixed: Number.isNaN(mixed) ? 0 : mixed,
          });
        }
        const rawVkBest = localStorage.getItem(`study-vk-best-map-${key}-${weekKey}`);
        if (rawVkBest) {
          const parsed = JSON.parse(rawVkBest);
          setVkBestByBucket({
            l1_2: Number(parsed?.l1_2 || 0) || 0,
            l3_4: Number(parsed?.l3_4 || 0) || 0,
            l5_6: Number(parsed?.l5_6 || 0) || 0,
            l7_8: Number(parsed?.l7_8 || 0) || 0,
            l9_10: Number(parsed?.l9_10 || 0) || 0,
            l11_12: Number(parsed?.l11_12 || 0) || 0,
          });
        }
        const rawExamHistory = localStorage.getItem(`study-exam-history-${key}`);
        if (rawExamHistory) {
          const parsedHistory = JSON.parse(rawExamHistory);
          if (Array.isArray(parsedHistory)) {
            setExamHistory(parsedHistory.slice(0, 20));
          }
        }
      } catch {}
    };
    void boot();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(getCustomFlashDeckStorageKey(userKey));
      if (!raw) {
        setCustomFlashDecks([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setCustomFlashDecks(
          parsed.filter((deck): deck is CustomFlashDeckRecord =>
            Boolean(deck && typeof deck.id === "string" && typeof deck.name === "string" && Array.isArray(deck.setIds)),
          ),
        );
      }
    } catch {
      setCustomFlashDecks([]);
    }
  }, [userKey]);

  useEffect(() => {
    try {
      localStorage.setItem(getCustomFlashDeckStorageKey(userKey), JSON.stringify(customFlashDecks));
    } catch {}
  }, [customFlashDecks, userKey]);

  useEffect(() => {
    if (selectedView) {
      setActiveTab(selectedView);
      return;
    }
    setActiveTab("kana");
  }, [selectedView]);

  useEffect(() => {
    if (!kanaRunning || kanaTime <= 0 || kanaCountdown !== null) return;
    const timer = window.setTimeout(() => setKanaTime((v) => v - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [kanaRunning, kanaTime, kanaCountdown]);

  useEffect(() => {
    if (kanaTime <= 0) setKanaRunning(false);
  }, [kanaTime]);

  useEffect(() => {
    if (kanaCountdown === null) return;
    if (kanaCountdown <= 0) {
      setKanaCountdown(null);
      setKanaRunning(true);
      kanaRoundStartedAtRef.current = Date.now();
      return;
    }
    const timer = window.setTimeout(() => setKanaCountdown((v) => (v == null ? null : v - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [kanaCountdown]);

  useEffect(() => {
    if (kanaPenalty <= 0) return;
    const timer = window.setTimeout(() => setKanaPenalty((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [kanaPenalty]);

  const kanaPool = kanaSet === "hiragana" ? HIRAGANA : kanaSet === "katakana" ? KATAKANA : [...HIRAGANA, ...KATAKANA];

  const createKanaQuestion = () => {
    const [char, romaji] = kanaPool[Math.floor(Math.random() * kanaPool.length)];
    setKanaQuestion({ char, correct: romaji, options: romajiOptions(kanaPool, romaji) });
  };

  const loadKanaLeaderboard = async () => {
    const weekStartIso = getLocalWeekStart().toISOString();
    const { data, error } = await supabase
      .from("study_kana_scores")
      .select("user_id, mode, best_score, updated_at, profiles:user_id (username, full_name)")
      .gte("updated_at", weekStartIso)
      .order("best_score", { ascending: false })
      .order("updated_at", { ascending: true })
      .limit(200);

    if (error) {
      console.error("loadKanaLeaderboard error:", error.message);
      setLeaderboardUnavailable(true);
      return;
    }
    const rows = (data || []) as KanaScoreRow[];
    const hira = rows.filter((r) => r.mode === "hiragana").slice(0, 10);
    const kata = rows.filter((r) => r.mode === "katakana").slice(0, 10);
    const mixed = rows.filter((r) => r.mode === "mixed").slice(0, 10);
    setKanaLeaderboard({ hiragana: hira, katakana: kata, mixed });
    setLeaderboardUnavailable(false);
  };

  const submitKanaScore = async ({ mode, score, answers, durationMs }: KanaRoundPayload) => {
    const validation = getRunValidation(score, answers, durationMs, 90, 4.5);
    if (!validation.ok) {
      alert(`Partida no válida (${validation.reasons.join(", ")}).`);
      return;
    }

    const weekKey = getLocalWeekStart().toISOString().slice(0, 10);
    setKanaBestByMode((prev) => {
      const next: Record<KanaMode, number> = { ...prev, [mode]: Math.max(prev[mode] || 0, score) };
      try {
        localStorage.setItem(`study-kana-best-map-${userKey}-${weekKey}`, JSON.stringify(next));
      } catch {}
      return next;
    });

    if (!currentUserId) {
      pendingKanaSubmitRef.current = { mode, score, answers, durationMs };
      return;
    }
    const { data: existing } = await supabase
      .from("study_kana_scores")
      .select("best_score, updated_at")
      .eq("user_id", currentUserId)
      .eq("mode", mode)
      .maybeSingle();
    const nowIso = new Date().toISOString();
    const safeBestScore = isSameLocalWeek(existing?.updated_at, nowIso)
      ? Math.max(Number(existing?.best_score || 0), score)
      : score;
    const { error } = await supabase.from("study_kana_scores").upsert(
      { user_id: currentUserId, mode, best_score: safeBestScore, updated_at: nowIso },
      { onConflict: "user_id,mode" },
    );
    if (error) {
      console.error("submitKanaScore error:", error.message);
      setLeaderboardUnavailable(true);
      alert(`No se pudo guardar score en leaderboard (${error.message}).`);
      return;
    }
    await loadKanaLeaderboard();
  };

  const vkBucketConfig = useMemo(() => VK_BUCKETS.find((bucket) => bucket.key === vkBucket) || VK_BUCKETS[0], [vkBucket]);
  const vkVocabPool = useMemo(() => {
    const pool: Array<{ id: string; jp: string; es: string }> = [];
    for (const lesson of vkBucketConfig.lessons) {
      const rows = GENKI_VOCAB_BY_LESSON[lesson] || [];
      rows.forEach((item, index) => {
        pool.push({
          id: `l${lesson}-v-${index}`,
          // Vocab sprint siempre pregunta significado desde hiragana.
          // La lectura/kanji se evalúa únicamente con el pool de kanji.
          jp: item.hira,
          es: item.es,
        });
      });
    }
    return pool;
  }, [vkBucketConfig]);

  const vkKanjiPool = useMemo(() => {
    const pool: Array<{ id: string; kanji: string; hira: string }> = [];
    for (const lesson of vkBucketConfig.lessons) {
      if (lesson < 3) continue;
      const rows = GENKI_KANJI_BY_LESSON[lesson] || [];
      rows.forEach((item, index) => {
        pool.push({
          id: `l${lesson}-k-${index}`,
          kanji: item.kanji,
          hira: item.hira,
        });
      });
    }
    return pool;
  }, [vkBucketConfig]);

  const createVkQuestion = () => {
    const canUseKanji = vkKanjiPool.length >= 4;
    const canUseVocab = vkVocabPool.length >= 4;
    if (!canUseKanji && !canUseVocab) return;

    const useKanji = canUseKanji && (!canUseVocab || Math.random() < 0.45);
    if (useKanji) {
      const picked = vkKanjiPool[Math.floor(Math.random() * vkKanjiPool.length)];
      const options = buildOptionSet(
        picked.hira,
        vkKanjiPool.filter((row) => row.id !== picked.id).map((row) => row.hira),
        vkKanjiPool.map((row) => row.hira),
      );
      setVkQuestion({ prompt: picked.kanji, correct: picked.hira, options, hint: "Lectura" });
      return;
    }

    const picked = vkVocabPool[Math.floor(Math.random() * vkVocabPool.length)];
    const options = buildOptionSet(
      picked.es,
      vkVocabPool.filter((row) => row.id !== picked.id).map((row) => row.es),
      vkVocabPool.map((row) => row.es),
    );
    setVkQuestion({ prompt: picked.jp, correct: picked.es, options, hint: "Significado" });
  };

  const loadVkLeaderboard = async () => {
    const weekStartIso = getLocalWeekStart().toISOString();
    const { data, error } = await supabase
      .from("study_kana_scores")
      .select("user_id, mode, best_score, updated_at, profiles:user_id (username, full_name)")
      .gte("updated_at", weekStartIso)
      .in("mode", VK_MODE_KEYS)
      .order("best_score", { ascending: false })
      .order("updated_at", { ascending: true })
      .limit(300);
    if (error) {
      console.error("loadVkLeaderboard error:", error.message);
      setVkLeaderboardUnavailable(true);
      return;
    }
    const rows = (data || []) as KanaScoreRow[];
    const next: Record<VkBucketKey, KanaScoreRow[]> = {
      l1_2: [],
      l3_4: [],
      l5_6: [],
      l7_8: [],
      l9_10: [],
      l11_12: [],
    };
    VK_BUCKETS.forEach((bucket) => {
      next[bucket.key] = rows.filter((row) => row.mode === `vk:${bucket.key}`).slice(0, 10);
    });
    setVkLeaderboard(next);
    setVkLeaderboardUnavailable(false);
  };

  const submitVkScore = async ({ bucket, score, answers, durationMs }: VkRoundPayload) => {
    const validation = getRunValidation(score, answers, durationMs, 85, 4);
    if (!validation.ok) {
      alert(`Partida no válida (${validation.reasons.join(", ")}).`);
      return;
    }
    const weekKey = getLocalWeekStart().toISOString().slice(0, 10);
    setVkBestByBucket((prev) => {
      const next = { ...prev, [bucket]: Math.max(prev[bucket] || 0, score) };
      try {
        localStorage.setItem(`study-vk-best-map-${userKey}-${weekKey}`, JSON.stringify(next));
      } catch {}
      return next;
    });
    if (!currentUserId) {
      pendingVkSubmitRef.current = { bucket, score, answers, durationMs };
      return;
    }
    const mode = `vk:${bucket}`;
    const { data: existing } = await supabase
      .from("study_kana_scores")
      .select("best_score, updated_at")
      .eq("user_id", currentUserId)
      .eq("mode", mode)
      .maybeSingle();
    const nowIso = new Date().toISOString();
    const safeBestScore = isSameLocalWeek(existing?.updated_at, nowIso)
      ? Math.max(Number(existing?.best_score || 0), score)
      : score;
    const { error } = await supabase
      .from("study_kana_scores")
      .upsert({ user_id: currentUserId, mode, best_score: safeBestScore, updated_at: nowIso }, { onConflict: "user_id,mode" });
    if (error) {
      console.error("submitVkScore error:", error.message);
      setVkLeaderboardUnavailable(true);
      alert(`No se pudo guardar score en leaderboard (${error.message}).`);
      return;
    }
    await loadVkLeaderboard();
  };

  const startKana = () => {
    // Starting a new run cancels any current run without submitting partial scores.
    setKanaRunning(false);
    setKanaTime(60);
    setKanaScore(0);
    setKanaPenalty(0);
    setKanaCountdown(3);
    kanaAnswersCountRef.current = 0;
    kanaRoundStartedAtRef.current = null;
    kanaRoundSubmittedRef.current = false;
    createKanaQuestion();
  };

  const answerKana = (choice: string) => {
    if (!kanaRunning || kanaPenalty > 0 || kanaCountdown !== null || kanaTime <= 0) return;
    kanaAnswersCountRef.current += 1;
    if (choice === kanaQuestion.correct) {
      setKanaScore((v) => v + 1);
    } else {
      setKanaPenalty(2);
    }
    createKanaQuestion();
  };

  useEffect(() => {
    if (!vkRunning || vkTime <= 0 || vkCountdown !== null) return;
    const timer = window.setTimeout(() => setVkTime((v) => v - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [vkRunning, vkTime, vkCountdown]);

  useEffect(() => {
    if (vkTime <= 0) setVkRunning(false);
  }, [vkTime]);

  useEffect(() => {
    if (vkCountdown === null) return;
    if (vkCountdown <= 0) {
      setVkCountdown(null);
      setVkRunning(true);
      vkRoundStartedAtRef.current = Date.now();
      createVkQuestion();
      return;
    }
    const timer = window.setTimeout(() => setVkCountdown((v) => (v == null ? null : v - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [vkCountdown]);

  useEffect(() => {
    if (vkPenalty <= 0) return;
    const timer = window.setTimeout(() => setVkPenalty((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [vkPenalty]);

  const startVkSprint = () => {
    // Starting a new run cancels any current run without submitting partial scores.
    setVkRunning(false);
    setVkTime(60);
    setVkScore(0);
    setVkPenalty(0);
    setVkCountdown(3);
    vkAnswersCountRef.current = 0;
    vkRoundStartedAtRef.current = null;
    vkRoundSubmittedRef.current = false;
    createVkQuestion();
  };

  const answerVk = (choice: string) => {
    if (!vkRunning || vkPenalty > 0 || vkCountdown !== null || vkTime <= 0) return;
    vkAnswersCountRef.current += 1;
    if (choice === vkQuestion.correct) {
      setVkScore((v) => v + 1);
    } else {
      setVkPenalty(2);
    }
    createVkQuestion();
  };

  const flashLessons = useMemo(
    () => Array.from(new Set(FLASHCARD_SETS.map((set) => set.lesson))).sort((a, b) => a - b),
    [],
  );
  const customFlashSets = useMemo(
    () =>
      customFlashDecks.reduce<FlashcardSet[]>((acc, deck) => {
        const sourceSets = deck.setIds
          .map((setId) => FLASHCARD_SETS.find((set) => set.id === setId))
          .filter((set): set is FlashcardSet => Boolean(set));
        const items = dedupeFlashItems(sourceSets.flatMap((set) => set.items));
        if (sourceSets.length === 0 || items.length === 0) return acc;
        acc.push({
          id: deck.id,
          lesson: 0,
          title: deck.name,
          description: buildCustomFlashDeckDescription(sourceSets.length, items.length),
          items,
          isCustom: true,
          sourceSetIds: [...deck.setIds],
        });
        return acc;
      }, []),
    [customFlashDecks],
  );
  const allFlashSets = useMemo(() => [...customFlashSets, ...FLASHCARD_SETS], [customFlashSets]);
  const flashSetsByLesson = useMemo(
    () =>
      flashLessons.map((lesson) => ({
        lesson,
        sets: FLASHCARD_SETS.filter((set) => set.lesson === lesson),
      })),
    [flashLessons],
  );
  const activeFlashLesson = flashLessonFolder ?? flashLessons[0] ?? 1;
  const flashSetsInLesson = useMemo(
    () => FLASHCARD_SETS.filter((set) => set.lesson === activeFlashLesson),
    [activeFlashLesson],
  );
  const activeFlashSet = useMemo(
    () => allFlashSets.find((set) => set.id === flashSetId) || null,
    [allFlashSets, flashSetId],
  );
  const activeFlashItems = activeFlashSet?.items || [];
  const activeFlashDeck = flashCardsDeck.length > 0 ? flashCardsDeck : activeFlashItems;
  const isFlashFocusMode = flashMode === "cards" || flashMode === "learn";
  const activeFlashCard = activeFlashDeck[flashCardIndex] || null;
  const flashCardProgressPct = activeFlashDeck.length > 0 ? Math.round(((flashCardIndex + 1) / activeFlashDeck.length) * 100) : 0;
  const flashDeckBuilderPreviewItems = useMemo(
    () =>
      dedupeFlashItems(
        flashDeckSelectedSetIds.flatMap((setId) => FLASHCARD_SETS.find((set) => set.id === setId)?.items || []),
      ),
    [flashDeckSelectedSetIds],
  );
  const flashRoutes = useMemo(
    () =>
      FLASHCARD_ROUTE_GROUPS.map((route) => ({
        ...route,
        entries: route.lessons.map((lesson) => ({
          lesson,
          sets: FLASHCARD_SETS.filter((set) => set.lesson === lesson),
        })).filter((entry) => entry.sets.length > 0),
      })),
    [],
  );
  const activeFlashRoute = useMemo(
    () => flashRoutes.find((route) => route.id === flashRouteId) || flashRoutes[0] || null,
    [flashRouteId, flashRoutes],
  );

  const openFlashLesson = (lesson: number) => {
    closeCustomFlashDeckBuilder();
    setFlashRouteId(FLASHCARD_ROUTE_GROUPS.find((route) => route.lessons.includes(lesson))?.id || flashRouteId);
    setFlashLessonFolder(lesson);
    setFlashSetId(null);
    setFlashMode("browse");
    setFlashCardsDeck([]);
  };

  const openFlashSet = (setId: string) => {
    closeCustomFlashDeckBuilder();
    setFlashSetId(setId);
    setFlashMode("browse");
    setFlashCardsDeck([]);
    setFlashCardIndex(0);
    setFlashCardFlipped(false);
    setFlashLearnQuestions([]);
    setFlashLearnIndex(0);
    setFlashLearnChoice(null);
    setFlashLearnScore(0);
    setFlashLearnFinished(false);
  };

  const openCustomFlashDeckBuilder = (deck?: CustomFlashDeckRecord) => {
    setFlashDeckBuilderOpen(true);
    setFlashDeckEditingId(deck?.id || null);
    setFlashDeckName(deck?.name || "");
    setFlashDeckSelectedSetIds(deck?.setIds || []);
  };

  const closeCustomFlashDeckBuilder = () => {
    setFlashDeckBuilderOpen(false);
    setFlashDeckEditingId(null);
    setFlashDeckName("");
    setFlashDeckSelectedSetIds([]);
  };

  const toggleCustomFlashSetSelection = (setId: string) => {
    setFlashDeckSelectedSetIds((prev) => (
      prev.includes(setId)
        ? prev.filter((id) => id !== setId)
        : [...prev, setId]
    ));
  };

  const saveCustomFlashDeck = () => {
    const trimmedName = flashDeckName.trim();
    if (!trimmedName) {
      alert("Ponle nombre a tu deck.");
      return;
    }
    if (flashDeckSelectedSetIds.length === 0) {
      alert("Selecciona al menos un set para armar el deck.");
      return;
    }
    const nowIso = new Date().toISOString();
    setCustomFlashDecks((prev) => {
      if (flashDeckEditingId) {
        return prev.map((deck) => (
          deck.id === flashDeckEditingId
            ? { ...deck, name: trimmedName, setIds: [...flashDeckSelectedSetIds], updatedAt: nowIso }
            : deck
        ));
      }
      return [
        {
          id: `custom-${Date.now()}`,
          name: trimmedName,
          setIds: [...flashDeckSelectedSetIds],
          updatedAt: nowIso,
        },
        ...prev,
      ];
    });
    closeCustomFlashDeckBuilder();
  };

  const deleteCustomFlashDeck = (deckId: string) => {
    if (!window.confirm("¿Borrar este deck personalizado?")) return;
    setCustomFlashDecks((prev) => prev.filter((deck) => deck.id !== deckId));
    if (flashSetId === deckId) {
      setFlashSetId(null);
      setFlashMode("browse");
      setFlashCardsDeck([]);
    }
  };

  const focusFlashArea = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => {
      flashFocusRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const startFlashCards = () => {
    if (!activeFlashSet || activeFlashItems.length === 0) return;
    const randomizedDeck = shuffle([...activeFlashItems]);
    setFlashCardsDeck(randomizedDeck);
    setFlashMode("cards");
    setFlashCardIndex(0);
    setFlashCardFlipped(false);
    focusFlashArea();
  };

  const buildFlashLearnQuestions = (set: FlashcardSet, shuffledItems: FlashcardItem[]) => {
    const fallbackPool = shuffledItems.map((item) => item.back);
    const picked = shuffledItems.slice(0, Math.min(20, shuffledItems.length));
    return picked.map((item, index) => ({
      id: `${set.id}-learn-${index + 1}`,
      prompt: item.front,
      correct: item.back,
      options: buildOptionSet(
        item.back,
        shuffledItems.filter((candidate) => candidate.id !== item.id).map((candidate) => candidate.back),
        fallbackPool,
      ),
    }));
  };

  const startFlashLearn = () => {
    if (!activeFlashSet || activeFlashItems.length < 4) {
      alert("Este set necesita al menos 4 tarjetas para el modo Aprender.");
      return;
    }
    const shuffledItems = shuffle([...activeFlashItems]);
    const questions = buildFlashLearnQuestions(activeFlashSet, shuffledItems);
    if (questions.length === 0) {
      alert("No se pudieron generar preguntas para este set.");
      return;
    }
    setFlashCardsDeck([]);
    setFlashLearnQuestions(questions);
    setFlashLearnIndex(0);
    setFlashLearnChoice(null);
    setFlashLearnScore(0);
    setFlashLearnFinished(false);
    setFlashMode("learn");
    focusFlashArea();
  };

  const currentFlashLearnQ = flashLearnQuestions[flashLearnIndex] || null;
  const flashLearnProgressPct = flashLearnQuestions.length
    ? Math.round(((flashLearnFinished ? flashLearnQuestions.length : flashLearnIndex + 1) / flashLearnQuestions.length) * 100)
    : 0;

  const answerFlashLearn = (option: string) => {
    if (!currentFlashLearnQ || flashLearnChoice) return;
    setFlashLearnChoice(option);
    if (option === currentFlashLearnQ.correct) setFlashLearnScore((value) => value + 1);
  };

  const nextFlashLearn = () => {
    if (!currentFlashLearnQ) return;
    if (flashLearnIndex >= flashLearnQuestions.length - 1) {
      setFlashLearnFinished(true);
      return;
    }
    setFlashLearnIndex((value) => value + 1);
    setFlashLearnChoice(null);
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
    const lessons =
      quizMode === "conjugation"
        ? (quizLessons.filter((l) => l >= 3).length > 0 ? quizLessons.filter((l) => l >= 3) : [3])
        : (quizLessons.length > 0 ? quizLessons : [1]);
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
  const vkTimePct = Math.max(0, Math.min(100, (vkTime / 60) * 100));
  const quizProgressPct = quizQuestions.length
    ? Math.round(((quizFinished ? quizQuestions.length : quizIndex + 1) / quizQuestions.length) * 100)
    : 0;
  const availableQuizLessons = quizMode === "conjugation" ? LESSONS.filter((l) => l >= 3) : LESSONS;
  const hasVerbInSelectedLessons = ALL_VERBS.some((v) => quizLessons.includes(v.lesson));
  const hasAdjInSelectedLessons = ALL_ADJECTIVES.some((a) => quizLessons.includes(a.lesson));
  const activeConjTypes: ConjType[] = conjTypes.length > 0 ? [...conjTypes] : ["te"];
  const vkLeaderboardForBucket = vkLeaderboard[vkBucket] || [];
  const showHub = !selectedView;
  const examCurrentQ = examQuestions[examIndex] || null;
  const examProgressPct = examQuestions.length
    ? Math.round((((examFinished ? examQuestions.length : examIndex + 1)) / examQuestions.length) * 100)
    : 0;
  const examCurrentKey = examCurrentQ ? (examCurrentQ.stableKey || examCurrentQ.id) : "";
  const examCurrentChoice = examCurrentQ ? (examAnswers[examCurrentKey] || null) : null;
  const examScore = examQuestions.reduce((acc, question) => {
    const key = question.stableKey || question.id;
    return acc + (isExamQuestionCorrect(question, examAnswers[key]) ? 1 : 0);
  }, 0);
  const examPercent = examQuestions.length ? Math.round((examScore / examQuestions.length) * 100) : 0;
  const examPassed = examPercent >= EXAM_PASSING_PERCENT;
  const examWrongQuestions = examQuestions.filter((question) => {
    const key = question.stableKey || question.id;
    return !isExamQuestionCorrect(question, examAnswers[key]);
  });
  const examCategoryBreakdown = Array.from(
    examQuestions.reduce((map, question) => {
      const key = question.stableKey || question.id;
      const category = question.category || "general";
      const bucket = map.get(category) || { category, correct: 0, total: 0 };
      bucket.total += 1;
      if (isExamQuestionCorrect(question, examAnswers[key])) bucket.correct += 1;
      map.set(category, bucket);
      return map;
    }, new Map<string, { category: string; correct: number; total: number }>()),
  ).map(([, value]) => value);

  const pageMeta = selectedView
    ? selectedView === "kana"
      ? { title: "Kana Sprint", subtitle: "Entrena velocidad y precisión de hiragana/katakana." }
      : selectedView === "sprint"
        ? { title: "Vocab + Kanji Sprint", subtitle: "Compite por rangos de lección para mantener nivel justo." }
        : selectedView === "exam"
          ? { title: "Exámenes por Lección", subtitle: "Autoevaluación de 20 reactivos con feedback final y passing score de 70%." }
          : { title: "Flashcards", subtitle: "Carpetas por lección y práctica por set." }
    : { title: "Study Lab", subtitle: "Selecciona una herramienta y practica por bloques." };
  const studyThemes: Record<string, { badge: string; bg: string; accent: string; soft: string }> = {
    kana: { badge: "Kana", bg: "linear-gradient(145deg,#ecfdf5,#f8fffb)", accent: "#16a34a", soft: "rgba(22,163,74,.12)" },
    sprint: { badge: "Sprint", bg: "linear-gradient(145deg,#fff7ed,#fffdf9)", accent: "#ea580c", soft: "rgba(234,88,12,.12)" },
    flashcards: { badge: "Flashcards", bg: "linear-gradient(145deg,#eef2ff,#fafbff)", accent: "#4f46e5", soft: "rgba(79,70,229,.12)" },
    exam: { badge: "Exámenes", bg: "linear-gradient(145deg,#e0f2fe,#f8fbff)", accent: "#0284c7", soft: "rgba(2,132,199,.12)" },
    hub: { badge: "Study Lab", bg: "linear-gradient(145deg,#ffffff,#f7fffc)", accent: "#0f766e", soft: "rgba(15,118,110,.12)" },
  };
  const currentTheme = selectedView ? studyThemes[selectedView] : studyThemes.hub;

  useEffect(() => {
    void loadKanaLeaderboard();
    void loadVkLeaderboard();
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const weekKey = getLocalWeekStart(now).toISOString().slice(0, 10);
      if (weekKeyRef.current !== weekKey) {
        weekKeyRef.current = weekKey;
        setKanaBestByMode({ hiragana: 0, katakana: 0, mixed: 0 });
        setVkBestByBucket({ l1_2: 0, l3_4: 0, l5_6: 0, l7_8: 0, l9_10: 0, l11_12: 0 });
        try {
          const rawBest = localStorage.getItem(`study-kana-best-map-${userKey}-${weekKey}`);
          if (rawBest) {
            const parsed = JSON.parse(rawBest);
            setKanaBestByMode({
              hiragana: Number(parsed?.hiragana || 0) || 0,
              katakana: Number(parsed?.katakana || 0) || 0,
              mixed: Number(parsed?.mixed || 0) || 0,
            });
          }
          const rawVkBest = localStorage.getItem(`study-vk-best-map-${userKey}-${weekKey}`);
          if (rawVkBest) {
            const parsedVk = JSON.parse(rawVkBest);
            setVkBestByBucket({
              l1_2: Number(parsedVk?.l1_2 || 0) || 0,
              l3_4: Number(parsedVk?.l3_4 || 0) || 0,
              l5_6: Number(parsedVk?.l5_6 || 0) || 0,
              l7_8: Number(parsedVk?.l7_8 || 0) || 0,
              l9_10: Number(parsedVk?.l9_10 || 0) || 0,
              l11_12: Number(parsedVk?.l11_12 || 0) || 0,
            });
          }
        } catch {}
        void loadKanaLeaderboard();
        void loadVkLeaderboard();
      }
      const next = getNextLocalWeekStart(now);
      setWeeklyResetLabel(formatCountdown(next.getTime() - now.getTime()));
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [userKey]);

  useEffect(() => {
    if (!currentUserId) return;
    const pending = pendingKanaSubmitRef.current;
    if (pending) {
      pendingKanaSubmitRef.current = null;
      void submitKanaScore(pending);
    }
    const pendingVk = pendingVkSubmitRef.current;
    if (pendingVk) {
      pendingVkSubmitRef.current = null;
      void submitVkScore(pendingVk);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (kanaTime > 0) return;
    if (kanaRoundSubmittedRef.current) return;
    kanaRoundSubmittedRef.current = true;
    const durationMs = kanaRoundStartedAtRef.current ? Date.now() - kanaRoundStartedAtRef.current : 60_000;
    void submitKanaScore({ mode: kanaSet, score: kanaScore, answers: kanaAnswersCountRef.current, durationMs });
  }, [kanaTime, kanaSet, kanaScore]);

  useEffect(() => {
    if (vkTime > 0) return;
    if (vkRoundSubmittedRef.current) return;
    vkRoundSubmittedRef.current = true;
    const durationMs = vkRoundStartedAtRef.current ? Date.now() - vkRoundStartedAtRef.current : 60_000;
    void submitVkScore({ bucket: vkBucket, score: vkScore, answers: vkAnswersCountRef.current, durationMs });
  }, [vkTime, vkBucket, vkScore]);

  useEffect(() => {
    createVkQuestion();
  }, [vkBucket]);

  useEffect(() => {
    if (quizMode !== "conjugation") return;
    setQuizLessons((prev) => {
      const filtered = prev.filter((l) => l >= 3);
      return filtered.length > 0 ? filtered : [3];
    });
  }, [quizMode]);

  useEffect(() => {
    if (quizMode !== "conjugation") return;
    setConjTypes((prev) => {
      let next = prev.filter((type) => {
        const isAdjType = type === "adj-negative" || type === "adj-past";
        if (isAdjType && !hasAdjInSelectedLessons) return false;
        const isVerbType = type === "te" || type === "past" || type === "masu" || type === "dictionary";
        if (isVerbType && !hasVerbInSelectedLessons) return false;
        return true;
      });
      if (next.length === 0) {
        if (hasVerbInSelectedLessons) next = ["te"];
        else if (hasAdjInSelectedLessons) next = ["adj-negative"];
      }
      return next;
    });
  }, [quizMode, hasAdjInSelectedLessons, hasVerbInSelectedLessons]);

  useEffect(() => {
    if (activeTab !== "quiz") return;
    if (!currentQ && !quizFinished) return;
    if (!quizCardRef.current) return;
    quizCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeTab, currentQ, quizFinished, quizIndex]);

  useEffect(() => {
    if (activeTab !== "flashcards") return;
    if (flashMode !== "cards" && flashMode !== "learn") return;
    focusFlashArea();
  }, [activeTab, flashMode]);

  useEffect(() => {
    if (activeTab !== "exam") return;
    if (!examCardRef.current) return;
    examCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeTab, examIndex, examFinished]);

  useEffect(() => {
    if (!examFinished) return;
    if (examPersistedRef.current) return;
    if (examQuestions.length === 0) return;

    examPersistedRef.current = true;
    const now = Date.now();
    const seenMap: Record<string, number> = {};
    examQuestions.forEach((question) => {
      seenMap[question.stableKey || question.id] = now;
    });

    try {
      const storageKey = `study-exam-seen-${userKey}-l${examLesson}`;
      const raw = localStorage.getItem(storageKey);
      const previous = raw ? JSON.parse(raw) : {};
      localStorage.setItem(storageKey, JSON.stringify({ ...previous, ...seenMap }));
    } catch {}

    const categoryMap = new Map<string, { category: string; total: number; correct: number }>();
    examQuestions.forEach((question) => {
      const key = question.stableKey || question.id;
      const category = question.category || "general";
      const bucket = categoryMap.get(category) || { category, total: 0, correct: 0 };
      bucket.total += 1;
      if (isExamQuestionCorrect(question, examAnswers[key])) bucket.correct += 1;
      categoryMap.set(category, bucket);
    });

    const attempt: ExamAttempt = {
      lesson: examLesson,
      score: examScore,
      total: examQuestions.length,
      percent: examPercent,
      passed: examPassed,
      createdAt: new Date().toISOString(),
      categoryBreakdown: Array.from(categoryMap.values()),
    };
    setExamHistory((prev) => {
      const next = [attempt, ...prev].slice(0, 20);
      try {
        localStorage.setItem(`study-exam-history-${userKey}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [examFinished, examQuestions, examAnswers, examLesson, examScore, examPercent, examPassed, userKey]);

  const answerQuiz = (option: string) => {
    if (!currentQ || quizChoice) return;
    setQuizChoice(option);
    if (option === currentQ.correct) setQuizScore((v) => v + 1);
  };

  useEffect(() => {
    if (!isFlashFocusMode) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFlashFocusMode]);

  const nextQuiz = () => {
    if (!currentQ) return;
    if (quizIndex >= quizQuestions.length - 1) {
      setQuizFinished(true);
      return;
    }
    setQuizIndex((v) => v + 1);
    setQuizChoice(null);
  };

  const startExam = () => {
    const pool = buildLessonExamQuestionPool(examLesson);
    if (pool.length < EXAM_QUESTION_COUNT) {
      alert("No hay suficientes preguntas para esta lección todavía.");
      return;
    }

    let seenMap: Record<string, number> = {};
    try {
      const raw = localStorage.getItem(`study-exam-seen-${userKey}-l${examLesson}`);
      if (raw) seenMap = JSON.parse(raw);
    } catch {}

    const selected = pickLessonExamQuestions(pool, seenMap, EXAM_QUESTION_COUNT, examLesson);
    if (selected.length < EXAM_QUESTION_COUNT) {
      alert("No se pudo generar un examen completo. Intenta otra vez.");
      return;
    }

    setExamQuestions(selected);
    setExamIndex(0);
    setExamAnswers({});
    setExamFinished(false);
    examPersistedRef.current = false;
  };

  const answerExam = (option: string) => {
    if (!examCurrentQ || examFinished) return;
    const key = examCurrentQ.stableKey || examCurrentQ.id;
    setExamAnswers((prev) => ({ ...prev, [key]: option }));
  };

  const appendExamReorderToken = (tokenId: string) => {
    if (!examCurrentQ || examCurrentQ.type !== "reorder") return;
    const chosenIds = decodeReorderAnswer(examCurrentChoice || "");
    if (chosenIds.includes(tokenId)) return;
    answerExam(encodeReorderAnswer([...chosenIds, tokenId]));
  };

  const popExamReorderToken = () => {
    if (!examCurrentQ || examCurrentQ.type !== "reorder") return;
    const chosenIds = decodeReorderAnswer(examCurrentChoice || "");
    answerExam(encodeReorderAnswer(chosenIds.slice(0, -1)));
  };

  const clearExamReorder = () => {
    if (!examCurrentQ || examCurrentQ.type !== "reorder") return;
    answerExam("");
  };

  const nextExamQuestion = () => {
    if (!examCurrentQ) return;
    const hasAnswer = examCurrentQ.type === "text" || examCurrentQ.type === "reorder"
      ? Boolean((examCurrentChoice || "").trim())
      : Boolean(examCurrentChoice);
    if (!hasAnswer) {
      alert("Responde la pregunta para continuar.");
      return;
    }
    if (examIndex >= examQuestions.length - 1) {
      setExamFinished(true);
      return;
    }
    setExamIndex((prev) => prev + 1);
  };

  const resetExam = () => {
    setExamQuestions([]);
    setExamAnswers({});
    setExamIndex(0);
    setExamFinished(false);
    examPersistedRef.current = false;
  };

  const renderQuizConfigurator = (compact = false) => (
    <div style={{ marginTop: compact ? 0 : 10, display: "grid", gap: 10 }}>
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
          <div style={{ fontSize: 12, color: "#7c7c85", marginBottom: 6, fontWeight: 700 }}>
            Lecciones (acumulable){quizMode === "conjugation" ? " · desde L3" : ""}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {availableQuizLessons.map((lesson) => (
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
              ["te", "Forma て", hasVerbInSelectedLessons],
              ["past", "Pasado corto", hasVerbInSelectedLessons],
              ["masu", "Forma ます", hasVerbInSelectedLessons],
              ["dictionary", "Diccionario", hasVerbInSelectedLessons],
              ["adj-negative", "Adjetivo negativo", hasAdjInSelectedLessons],
              ["adj-past", "Adjetivo pasado", hasAdjInSelectedLessons],
            ] as [ConjType, string, boolean][])
              .filter(([, , enabled]) => enabled)
              .map(([kind, label]) => (
              <button
                key={kind}
                type="button"
                onClick={() => toggleConjType(kind)}
                style={{
                  border: "1px solid rgba(17,17,20,.1)",
                  borderRadius: 999,
                  padding: "6px 9px",
                  fontSize: 12,
                  fontWeight: 700,
                  background: activeConjTypes.includes(kind) ? "#111114" : "#fff",
                  color: activeConjTypes.includes(kind) ? "#fff" : "#333",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <button type="button" onClick={startQuiz} style={{ border: 0, borderRadius: 999, background: "linear-gradient(135deg,#34c5a6,#25a98f)", color: "#fff", padding: "9px 14px", fontWeight: 700 }}>Iniciar quiz</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(900px 420px at 50% -10%, rgba(52,197,166,.08), transparent 65%), #f6f7f8", padding: 14 }}>
      <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 12 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <Link href="/" style={{ textDecoration: "none", border: "1px solid rgba(17,17,20,.1)", background: "#fff", color: "#222", borderRadius: 999, padding: "8px 12px", fontSize: 13 }}>← Volver</Link>
          <div style={{ fontSize: 12, color: "#7c7c85", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>Nihongo Study</div>
        </header>

        <section style={{ background: currentTheme.bg, border: "1px solid rgba(17,17,20,.07)", borderRadius: 18, padding: 14, boxShadow: `0 10px 24px ${currentTheme.soft}` }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, border: `1px solid ${currentTheme.soft}`, color: currentTheme.accent, fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", background: "#fff", padding: "4px 8px" }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: currentTheme.accent }} />
            {currentTheme.badge}
          </div>
          <h1 style={{ margin: "8px 0 0", fontSize: 28, lineHeight: 1.1, letterSpacing: "-.02em" }}>{pageMeta.title}</h1>
          <p style={{ margin: "8px 0 0", color: "#667085", fontSize: 14, lineHeight: 1.5 }}>
            {pageMeta.subtitle}
          </p>
        </section>

        {!showHub && (
          <section style={{ background: "#fff", border: "1px solid rgba(17,17,20,.07)", borderRadius: 14, padding: 10, display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))" }}>
            {[
              { key: "kana", href: "/study?view=kana", title: "Kana Sprint", subtitle: "Lectura rápida", accent: "#16a34a", bg: "#ecfdf3" },
              { key: "sprint", href: "/study?view=sprint", title: "Vocab+Kanji Sprint", subtitle: "Velocidad por buckets", accent: "#ea580c", bg: "#fff7ed" },
              { key: "flashcards", href: "/study?view=flashcards", title: "Flashcards", subtitle: "Repaso visual", accent: "#4f46e5", bg: "#eef2ff" },
              { key: "exam", href: "/study?view=exam", title: "Exámenes", subtitle: "Autoevaluación", accent: "#0284c7", bg: "#e0f2fe" },
            ].map((tool) => {
              const selected = activeTab === tool.key;
              return (
                <Link
                  key={tool.key}
                  href={tool.href}
                  style={{
                    textDecoration: "none",
                    border: `1px solid ${selected ? tool.accent : "rgba(17,17,20,.1)"}`,
                    borderRadius: 12,
                    padding: "8px 10px",
                    color: selected ? tool.accent : "#344054",
                    background: selected ? tool.bg : "#fff",
                    boxShadow: selected ? `0 8px 18px ${tool.accent}22` : "none",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800 }}>{tool.title}</div>
                  <div style={{ marginTop: 2, fontSize: 11, color: "#667085", fontWeight: 600 }}>{tool.subtitle}</div>
                </Link>
              );
            })}
          </section>
        )}

        {showHub && (
          <section style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
            <Link href="/study?view=kana" style={{ textDecoration: "none", color: "#111114", border: "1px solid rgba(34,197,94,.22)", borderRadius: 16, background: "linear-gradient(145deg,#ecfdf3,#f9fffb)", padding: 14 }}>
              <div style={{ fontSize: 12, color: "#15803d", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>Sprint</div>
              <div style={{ marginTop: 4, fontSize: 22, fontWeight: 800 }}>Kana Sprint</div>
              <p style={{ margin: "8px 0 0", color: "#667085", fontSize: 13 }}>Hiragana/Katakana con timer, penalty y leaderboard.</p>
            </Link>
            <Link href="/study?view=sprint" style={{ textDecoration: "none", color: "#111114", border: "1px solid rgba(249,115,22,.22)", borderRadius: 16, background: "linear-gradient(145deg,#fff7ed,#fffdf8)", padding: 14 }}>
              <div style={{ fontSize: 12, color: "#c2410c", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>Sprint</div>
              <div style={{ marginTop: 4, fontSize: 22, fontWeight: 800 }}>Vocab + Kanji</div>
              <p style={{ margin: "8px 0 0", color: "#667085", fontSize: 13 }}>Compite en buckets por lección para nivelar dificultad.</p>
            </Link>
            <Link href="/study?view=flashcards" style={{ textDecoration: "none", color: "#111114", border: "1px solid rgba(99,102,241,.22)", borderRadius: 16, background: "linear-gradient(145deg,#eef2ff,#fafbff)", padding: 14 }}>
              <div style={{ fontSize: 12, color: "#4338ca", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>Memoria</div>
              <div style={{ marginTop: 4, fontSize: 22, fontWeight: 800 }}>Flashcards</div>
              <p style={{ margin: "8px 0 0", color: "#667085", fontSize: 13 }}>Vocab y kanji por lección para repasar de forma visual.</p>
            </Link>
            <Link href="/study?view=exam" style={{ textDecoration: "none", color: "#111114", border: "1px solid rgba(14,165,233,.22)", borderRadius: 16, background: "linear-gradient(145deg,#e0f2fe,#f8fbff)", padding: 14 }}>
              <div style={{ fontSize: 12, color: "#0f766e", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>Evaluación</div>
              <div style={{ marginTop: 4, fontSize: 22, fontWeight: 800 }}>Examen por lección</div>
              <p style={{ margin: "8px 0 0", color: "#667085", fontSize: 13 }}>20 preguntas, passing de 70% y feedback completo al final.</p>
            </Link>
          </section>
        )}

        {!showHub && activeTab === "kana" && (
          <section style={{ background: "linear-gradient(145deg,#f7fff9,#ffffff)", border: "1px solid rgba(17,17,20,.07)", borderRadius: 20, padding: 16, boxShadow: "inset 0 0 0 2px rgba(34,197,94,.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 24 }}>Kana Sprint</h2>
              <div style={{ display: "inline-flex", gap: 4, border: "1px solid rgba(17,17,20,.08)", borderRadius: 999, padding: 3 }}>
                <button type="button" onClick={() => setKanaSet("hiragana")} style={{ border: 0, borderRadius: 999, padding: "6px 10px", background: kanaSet === "hiragana" ? "#111114" : "transparent", color: kanaSet === "hiragana" ? "#fff" : "#666" }}>Hiragana</button>
                <button type="button" onClick={() => setKanaSet("katakana")} style={{ border: 0, borderRadius: 999, padding: "6px 10px", background: kanaSet === "katakana" ? "#111114" : "transparent", color: kanaSet === "katakana" ? "#fff" : "#666" }}>Katakana</button>
                <button type="button" onClick={() => setKanaSet("mixed")} style={{ border: 0, borderRadius: 999, padding: "6px 10px", background: kanaSet === "mixed" ? "#111114" : "transparent", color: kanaSet === "mixed" ? "#fff" : "#666" }}>Mixto</button>
              </div>
            </div>
            <p style={{ color: "#6b7280", fontSize: 14 }}>60 segundos. Elige la romanización correcta. Error = penalización de 2 segundos.</p>
            <div style={{ marginTop: -4, marginBottom: 8, fontSize: 12, color: "#667085", fontWeight: 700 }}>
              Reinicio semanal en: <span style={{ color: "#111114" }}>{weeklyResetLabel || "..."}</span>
            </div>
            <div style={{ marginTop: 8, height: 7, borderRadius: 999, background: "#ecedf1", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${kanaTimePct}%`, background: "linear-gradient(90deg, #34c5a6, #25a98f)" }} />
            </div>
            <div style={{ marginTop: 12, display: "grid", gap: 12, gridTemplateColumns: "minmax(0,1fr)", alignItems: "start" }}>
              <div style={{ border: "1px solid rgba(17,17,20,.07)", borderRadius: 16, padding: 14, background: "linear-gradient(145deg,#ffffff,#f8fafc)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ color: "#374151", fontWeight: 700 }}>Tiempo: {kanaTime}s · Score: {kanaScore} · Mejor semanal: {kanaBestByMode[kanaSet] || 0}</div>
                  <button
                    type="button"
                    onClick={startKana}
                    style={{
                      border: 0,
                      borderRadius: 999,
                      background: "linear-gradient(135deg,#34c5a6,#25a98f)",
                      color: "#fff",
                      padding: "10px 18px",
                      fontWeight: 800,
                      fontSize: 14,
                      boxShadow: "0 10px 18px rgba(44,182,150,.22)",
                    }}
                  >
                    Iniciar Sprint
                  </button>
                </div>
                <div style={{ display: "grid", placeItems: "center", margin: "22px 0 18px", minHeight: 118 }}>
                  {kanaCountdown !== null ? (
                    <div style={{ fontSize: 70, fontWeight: 900, lineHeight: 1, color: "#111114" }}>{kanaCountdown > 0 ? kanaCountdown : "GO!"}</div>
                  ) : (
                    <div style={{ fontSize: 88, fontWeight: 900, lineHeight: 1, color: "#111114" }}>{kanaQuestion.char}</div>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
                  {kanaQuestion.options.map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => answerKana(op)}
                      disabled={!kanaRunning || kanaCountdown !== null || kanaPenalty > 0 || kanaTime <= 0}
                      style={{
                        border: "1px solid rgba(17,17,20,.1)",
                        borderRadius: 14,
                        background: "#fff",
                        padding: "14px 14px",
                        fontSize: 24,
                        fontWeight: 800,
                        cursor: kanaRunning && kanaCountdown === null && kanaPenalty === 0 && kanaTime > 0 ? "pointer" : "not-allowed",
                        opacity: kanaRunning && kanaCountdown === null && kanaPenalty === 0 && kanaTime > 0 ? 1 : .55,
                      }}
                    >
                      {op}
                    </button>
                  ))}
                </div>
                {kanaPenalty > 0 && (
                  <div style={{ marginTop: 12, color: "#b42318", fontWeight: 800, fontSize: 13 }}>
                    Penalización: espera {kanaPenalty}s antes de responder.
                  </div>
                )}
              </div>

              <div style={{ border: "1px solid rgba(17,17,20,.07)", borderRadius: 16, padding: 12, background: "#fff" }}>
                <div style={{ fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 800, color: "#7c7c85" }}>Leaderboard Kana</div>
                {leaderboardUnavailable && (
                  <p style={{ margin: "8px 0 0", fontSize: 12, color: "#b42318" }}>Leaderboard temporalmente no disponible.</p>
                )}
                <div style={{ marginTop: 10, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))" }}>
                  {(["hiragana", "katakana", "mixed"] as KanaMode[]).map((mode) => (
                    <div key={mode} style={{ border: "1px solid rgba(17,17,20,.08)", borderRadius: 12, padding: 10, background: "#fbfbfc" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#111114", marginBottom: 8, textTransform: "capitalize" }}>{mode}</div>
                      <div style={{ display: "grid", gap: 6 }}>
                        {(kanaLeaderboard[mode] || []).map((row, index) => (
                          <div key={`${mode}-${row.user_id}-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
                            <span style={{ color: "#344054", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6 }}>
                              {index < 3 ? (
                                <span
                                  style={{
                                    minWidth: 20,
                                    height: 20,
                                    borderRadius: 999,
                                    border: `1px solid ${rankBadgeStyles(index).border}`,
                                    background: rankBadgeStyles(index).bg,
                                    color: rankBadgeStyles(index).color,
                                    fontSize: 11,
                                    fontWeight: 800,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: "0 5px",
                                  }}
                                >
                                  {index + 1}
                                </span>
                              ) : (
                                <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>#{index + 1}</span>
                              )}
                              {row.profiles?.username || row.profiles?.full_name || "usuario"}
                            </span>
                            <strong style={{ color: "#111114" }}>{row.best_score}</strong>
                          </div>
                        ))}
                        {(kanaLeaderboard[mode] || []).length === 0 && (
                          <div style={{ color: "#98a2b3", fontSize: 12 }}>Sin puntajes todavía.</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {!showHub && activeTab === "sprint" && (
          <section style={{ background: "linear-gradient(145deg,#fffaf3,#ffffff)", border: "1px solid rgba(17,17,20,.07)", borderRadius: 20, padding: 16, boxShadow: "inset 0 0 0 2px rgba(249,115,22,.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 24 }}>Vocab + Kanji Sprint</h2>
              <div style={{ display: "inline-flex", gap: 4, border: "1px solid rgba(17,17,20,.08)", borderRadius: 999, padding: 3, flexWrap: "wrap" }}>
                {VK_BUCKETS.map((bucket) => (
                  <button
                    key={bucket.key}
                    type="button"
                    onClick={() => setVkBucket(bucket.key)}
                    style={{ border: 0, borderRadius: 999, padding: "6px 10px", background: vkBucket === bucket.key ? "#111114" : "transparent", color: vkBucket === bucket.key ? "#fff" : "#666", fontWeight: 700, fontSize: 12 }}
                  >
                    {bucket.label}
                  </button>
                ))}
              </div>
            </div>
            <p style={{ color: "#6b7280", fontSize: 14 }}>60 segundos. Preguntas mixtas de significado y lectura según tu rango.</p>
            <div style={{ marginTop: -4, marginBottom: 8, fontSize: 12, color: "#667085", fontWeight: 700 }}>
              Reinicio semanal en: <span style={{ color: "#111114" }}>{weeklyResetLabel || "..."}</span>
            </div>
            <div style={{ marginTop: 8, height: 7, borderRadius: 999, background: "#ecedf1", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${vkTimePct}%`, background: "linear-gradient(90deg, #34c5a6, #25a98f)" }} />
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
              <div style={{ border: "1px solid rgba(17,17,20,.07)", borderRadius: 16, padding: 14, background: "linear-gradient(145deg,#ffffff,#f8fafc)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ color: "#374151", fontWeight: 700 }}>Tiempo: {vkTime}s · Score: {vkScore} · Mejor semanal: {vkBestByBucket[vkBucket] || 0}</div>
                  <button
                    type="button"
                    onClick={startVkSprint}
                    style={{ border: 0, borderRadius: 999, background: "linear-gradient(135deg,#34c5a6,#25a98f)", color: "#fff", padding: "10px 18px", fontWeight: 800, fontSize: 14, boxShadow: "0 10px 18px rgba(44,182,150,.22)" }}
                  >
                    Iniciar Sprint
                  </button>
                </div>
                <div style={{ display: "grid", placeItems: "center", margin: "18px 0 14px", minHeight: 96 }}>
                  {vkCountdown !== null ? (
                    <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, color: "#111114" }}>{vkCountdown > 0 ? vkCountdown : "GO!"}</div>
                  ) : (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 12, color: "#667085", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>{vkQuestion.hint}</div>
                      <div style={{ marginTop: 8, fontSize: 44, fontWeight: 900, lineHeight: 1.2, color: "#111114", wordBreak: "break-word" }}>{vkQuestion.prompt}</div>
                    </div>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
                  {vkQuestion.options.map((option) => (
                    <button
                      key={`${vkQuestion.prompt}-${option}`}
                      type="button"
                      onClick={() => answerVk(option)}
                      disabled={!vkRunning || vkCountdown !== null || vkPenalty > 0 || vkTime <= 0}
                      style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 12, background: "#fff", padding: "12px 12px", fontSize: 16, fontWeight: 700, cursor: vkRunning && vkCountdown === null && vkPenalty === 0 && vkTime > 0 ? "pointer" : "not-allowed", opacity: vkRunning && vkCountdown === null && vkPenalty === 0 && vkTime > 0 ? 1 : .55 }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {vkPenalty > 0 && (
                  <div style={{ marginTop: 12, color: "#b42318", fontWeight: 800, fontSize: 13 }}>
                    Penalización: espera {vkPenalty}s antes de responder.
                  </div>
                )}
              </div>

              <div style={{ border: "1px solid rgba(17,17,20,.07)", borderRadius: 16, padding: 12, background: "#fff" }}>
                <div style={{ fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 800, color: "#7c7c85" }}>Leaderboard Vocab + Kanji · {vkBucketConfig.label}</div>
                {vkLeaderboardUnavailable && (
                  <p style={{ margin: "8px 0 0", fontSize: 12, color: "#b42318" }}>Leaderboard temporalmente no disponible.</p>
                )}
                <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                  {vkLeaderboardForBucket.map((row, index) => (
                    <div key={`${vkBucket}-${row.user_id}-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
                      <span style={{ color: "#344054", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {index < 3 ? (
                          <span
                            style={{
                              minWidth: 20,
                              height: 20,
                              borderRadius: 999,
                              border: `1px solid ${rankBadgeStyles(index).border}`,
                              background: rankBadgeStyles(index).bg,
                              color: rankBadgeStyles(index).color,
                              fontSize: 11,
                              fontWeight: 800,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "0 5px",
                            }}
                          >
                            {index + 1}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>#{index + 1}</span>
                        )}
                        {row.profiles?.username || row.profiles?.full_name || "usuario"}
                      </span>
                      <strong style={{ color: "#111114" }}>{row.best_score}</strong>
                    </div>
                  ))}
                  {vkLeaderboardForBucket.length === 0 && <div style={{ color: "#98a2b3", fontSize: 12 }}>Sin puntajes todavía.</div>}
                </div>
              </div>
            </div>
          </section>
        )}

        {!showHub && activeTab === "flashcards" && (
          <section style={{ background: "linear-gradient(145deg,#f6f7ff,#ffffff)", border: "1px solid rgba(17,17,20,.07)", borderRadius: 20, padding: 16, boxShadow: "inset 0 0 0 2px rgba(99,102,241,.08)" }}>
            {(flashLessonFolder !== null || Boolean(activeFlashSet?.isCustom)) && (
              <div style={{ marginBottom: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setFlashLessonFolder(null);
                    setFlashSetId(null);
                    setFlashMode("browse");
                  }}
                  style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 999, background: "#fff", padding: "7px 10px", fontWeight: 700, cursor: "pointer" }}
                >
                  Volver a decks
                </button>
              </div>
            )}

            {flashLessonFolder === null && flashSetId === null && (
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ border: "1px solid rgba(17,17,20,.08)", borderRadius: 22, background: "linear-gradient(145deg,#ffffff,#f8fafc)", padding: 16, boxShadow: "0 12px 30px rgba(15,23,42,.06)" }}>
                  <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 800 }}>Flashcards</div>
                      <div style={{ marginTop: 4, fontSize: 28, fontWeight: 900, color: "#111114", lineHeight: 1.05 }}>Repaso claro, por rutas y sin ruido</div>
                      <div style={{ marginTop: 8, fontSize: 14, color: "#667085", lineHeight: 1.6, maxWidth: 620 }}>
                        Aquí viven tus decks oficiales por lección y tus decks personalizados. La entrada es más ligera para que no se pierdan entre sí ni te aviente las 12 carpetas de golpe.
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(90px,1fr))", gap: 8 }}>
                        <div style={{ borderRadius: 16, background: "#f8fafc", border: "1px solid rgba(17,17,20,.06)", padding: 12 }}>
                          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 800 }}>Lecciones</div>
                          <div style={{ marginTop: 4, fontSize: 26, fontWeight: 900, color: "#111114" }}>{flashLessons.length}</div>
                        </div>
                        <div style={{ borderRadius: 16, background: "#f8fafc", border: "1px solid rgba(17,17,20,.06)", padding: 12 }}>
                          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 800 }}>Sets</div>
                          <div style={{ marginTop: 4, fontSize: 26, fontWeight: 900, color: "#111114" }}>{FLASHCARD_SETS.length}</div>
                        </div>
                        <div style={{ borderRadius: 16, background: "#f8fafc", border: "1px solid rgba(17,17,20,.06)", padding: 12 }}>
                          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 800 }}>Mis decks</div>
                          <div style={{ marginTop: 4, fontSize: 26, fontWeight: 900, color: "#111114" }}>{customFlashSets.length}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => openCustomFlashDeckBuilder()}
                          style={{ border: 0, borderRadius: 999, background: "linear-gradient(135deg,#4f46e5,#6366f1)", color: "#fff", padding: "10px 14px", fontWeight: 800, cursor: "pointer", boxShadow: "0 10px 18px rgba(99,102,241,.2)" }}
                        >
                          Crear mi deck
                        </button>
                        {activeFlashRoute && (
                          <button
                            type="button"
                            onClick={() => openFlashLesson(activeFlashRoute.entries[0]?.lesson || flashLessons[0] || 1)}
                            style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 999, background: "#fff", padding: "10px 14px", fontWeight: 800, cursor: "pointer" }}
                          >
                            Abrir ruta activa
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ border: "1px solid rgba(79,70,229,.14)", borderRadius: 18, background: "linear-gradient(145deg,#eef2ff,#ffffff)", padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#6366f1", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 800 }}>Mis decks</div>
                      <div style={{ marginTop: 4, fontSize: 22, fontWeight: 800, color: "#111114" }}>Combina sets oficiales</div>
                      <div style={{ marginTop: 4, fontSize: 13, color: "#667085", maxWidth: 560 }}>
                        Junta vocab, kanji o sets especiales en un solo deck para estudiar lo que tú quieras sin duplicar tarjetas.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openCustomFlashDeckBuilder()}
                      style={{ border: 0, borderRadius: 999, background: "linear-gradient(135deg,#4f46e5,#6366f1)", color: "#fff", padding: "10px 14px", fontWeight: 800, cursor: "pointer", boxShadow: "0 10px 18px rgba(99,102,241,.2)" }}
                    >
                      Crear deck
                    </button>
                  </div>

                  {customFlashSets.length > 0 ? (
                    <div style={{ marginTop: 12, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
                      {customFlashSets.map((set) => (
                        <div key={set.id} style={{ border: "1px solid rgba(17,17,20,.08)", borderRadius: 14, background: "#fff", padding: 12 }}>
                          <button
                            type="button"
                            onClick={() => openFlashSet(set.id)}
                            style={{ display: "block", width: "100%", textAlign: "left", border: 0, background: "transparent", padding: 0, cursor: "pointer" }}
                          >
                            <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>Deck personalizado</div>
                            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800, color: "#111114" }}>{set.title}</div>
                            <div style={{ marginTop: 4, fontSize: 13, color: "#667085", lineHeight: 1.45 }}>{set.description}</div>
                          </button>
                          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button type="button" onClick={() => openCustomFlashDeckBuilder(customFlashDecks.find((deck) => deck.id === set.id))} style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 999, background: "#fff", padding: "7px 10px", fontWeight: 700, cursor: "pointer" }}>
                              Editar
                            </button>
                            <button type="button" onClick={() => deleteCustomFlashDeck(set.id)} style={{ border: "1px solid rgba(185,28,28,.14)", borderRadius: 999, background: "#fff5f5", color: "#b42318", padding: "7px 10px", fontWeight: 700, cursor: "pointer" }}>
                              Borrar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ marginTop: 12, border: "1px dashed rgba(79,70,229,.22)", borderRadius: 14, background: "rgba(255,255,255,.7)", padding: 14, color: "#667085", fontSize: 14, lineHeight: 1.5 }}>
                      Aún no tienes decks personalizados. Crea uno combinando varios sets oficiales para repasar justo lo que necesites.
                    </div>
                  )}

                  {flashDeckBuilderOpen && (
                    <div style={{ marginTop: 14, border: "1px solid rgba(17,17,20,.08)", borderRadius: 16, background: "#fff", padding: 14, display: "grid", gap: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>
                            {flashDeckEditingId ? "Editar deck" : "Nuevo deck"}
                          </div>
                          <div style={{ marginTop: 4, fontSize: 20, fontWeight: 800, color: "#111114" }}>
                            {flashDeckEditingId ? "Ajusta tu combinación" : "Arma tu deck"}
                          </div>
                        </div>
                        <button type="button" onClick={closeCustomFlashDeckBuilder} style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 999, background: "#fff", padding: "7px 10px", fontWeight: 700, cursor: "pointer" }}>
                          Cerrar
                        </button>
                      </div>

                      <div style={{ display: "grid", gap: 8 }}>
                        <label style={{ fontSize: 12, color: "#667085", fontWeight: 700 }}>Nombre del deck</label>
                        <input
                          value={flashDeckName}
                          onChange={(event) => setFlashDeckName(event.target.value)}
                          placeholder="Ej. L3-L5 vocab + kanji"
                          style={{ border: "1px solid rgba(17,17,20,.12)", borderRadius: 12, background: "#fff", padding: "10px 12px", fontSize: 15, fontWeight: 600, color: "#111114" }}
                        />
                      </div>

                      <div style={{ border: "1px solid rgba(17,17,20,.06)", borderRadius: 14, background: "#fafbff", padding: 12 }}>
                        <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>Sets oficiales</div>
                        <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
                          {flashSetsByLesson.map((entry) => (
                            <div key={`builder-${entry.lesson}`} style={{ display: "grid", gap: 8 }}>
                              <div style={{ fontSize: 13, fontWeight: 800, color: "#111114" }}>Lección {entry.lesson}</div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                {entry.sets.map((set) => {
                                  const selected = flashDeckSelectedSetIds.includes(set.id);
                                  return (
                                    <button
                                      key={`pick-${set.id}`}
                                      type="button"
                                      onClick={() => toggleCustomFlashSetSelection(set.id)}
                                      style={{
                                        border: selected ? "1px solid #4f46e5" : "1px solid rgba(17,17,20,.1)",
                                        borderRadius: 999,
                                        background: selected ? "#eef2ff" : "#fff",
                                        color: selected ? "#3730a3" : "#344054",
                                        padding: "8px 11px",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                      }}
                                    >
                                      {set.title}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ border: "1px solid rgba(17,17,20,.08)", borderRadius: 14, background: "#fff", padding: 12 }}>
                        <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>Resumen</div>
                        <div style={{ marginTop: 6, fontSize: 16, fontWeight: 800, color: "#111114" }}>
                          {flashDeckSelectedSetIds.length} sets · {flashDeckBuilderPreviewItems.length} tarjetas únicas
                        </div>
                        <div style={{ marginTop: 4, fontSize: 13, color: "#667085" }}>
                          El sistema une las tarjetas y elimina duplicados automáticamente.
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
                        <button type="button" onClick={closeCustomFlashDeckBuilder} style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 999, background: "#fff", padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}>
                          Cancelar
                        </button>
                        <button type="button" onClick={saveCustomFlashDeck} style={{ border: 0, borderRadius: 999, background: "linear-gradient(135deg,#4f46e5,#6366f1)", color: "#fff", padding: "8px 14px", fontWeight: 800, cursor: "pointer" }}>
                          {flashDeckEditingId ? "Guardar cambios" : "Guardar deck"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>Decks oficiales</div>
                      <div style={{ marginTop: 4, fontSize: 20, fontWeight: 800, color: "#111114" }}>Rutas por bloque</div>
                      <div style={{ marginTop: 4, fontSize: 13, color: "#667085" }}>
                        Elegimos mostrar rutas primero para que la página se sienta ligera y más fácil de navegar.
                      </div>
                    </div>
                    {activeFlashRoute && (
                      <div style={{ borderRadius: 999, background: "#f8fafc", border: "1px solid rgba(17,17,20,.08)", padding: "8px 12px", fontSize: 12, color: "#475467", fontWeight: 700 }}>
                        {activeFlashRoute.entries.reduce((total, entry) => total + entry.sets.length, 0)} sets en esta ruta
                      </div>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
                    {flashRoutes.map((route) => {
                      const selected = activeFlashRoute?.id === route.id;
                      return (
                        <button
                          key={route.id}
                          type="button"
                          onClick={() => setFlashRouteId(route.id)}
                          style={{
                            textAlign: "left",
                            border: selected ? `1px solid ${route.accent}` : "1px solid rgba(17,17,20,.08)",
                            borderRadius: 18,
                            background: route.surface,
                            padding: 14,
                            cursor: "pointer",
                            boxShadow: selected ? `0 14px 26px ${route.accent}22` : "none",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                            <div>
                              <div style={{ fontSize: 12, color: route.accent, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 800 }}>Ruta</div>
                              <div style={{ marginTop: 4, fontSize: 20, fontWeight: 900, color: "#111114" }}>{route.title}</div>
                            </div>
                            <div style={{ minWidth: 38, height: 38, borderRadius: 14, background: `${route.accent}16`, color: route.accent, display: "grid", placeItems: "center", fontWeight: 900 }}>
                              {route.lessons.length}
                            </div>
                          </div>
                          <div style={{ marginTop: 8, fontSize: 13, color: "#667085", lineHeight: 1.5 }}>{route.subtitle}</div>
                          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {route.lessons.map((lesson) => (
                              <span key={`${route.id}-${lesson}`} style={{ borderRadius: 999, background: "#fff", border: "1px solid rgba(17,17,20,.08)", padding: "5px 8px", fontSize: 12, color: "#344054", fontWeight: 700 }}>
                                L{lesson}
                              </span>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {activeFlashRoute && (
                    <div style={{ border: "1px solid rgba(17,17,20,.08)", borderRadius: 18, background: "#ffffff", padding: 14, boxShadow: "0 12px 26px rgba(15,23,42,.05)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: 12, color: activeFlashRoute.accent, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 800 }}>Ruta activa</div>
                          <div style={{ marginTop: 4, fontSize: 22, fontWeight: 900, color: "#111114" }}>{activeFlashRoute.title}</div>
                          <div style={{ marginTop: 4, fontSize: 13, color: "#667085", lineHeight: 1.5 }}>{activeFlashRoute.subtitle}</div>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {activeFlashRoute.entries.map((entry) => (
                            <button
                              key={`route-jump-${entry.lesson}`}
                              type="button"
                              onClick={() => openFlashLesson(entry.lesson)}
                              style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 999, background: "#fff", padding: "8px 11px", fontWeight: 800, cursor: "pointer", color: "#111114" }}
                            >
                              Lección {entry.lesson}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
                        {activeFlashRoute.entries.map((entry) => (
                          <button
                            key={`folder-${entry.lesson}`}
                            type="button"
                            onClick={() => openFlashLesson(entry.lesson)}
                            style={{ textAlign: "left", border: "1px solid rgba(17,17,20,.08)", borderRadius: 16, background: "#fbfbfc", padding: 13, cursor: "pointer" }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                              <div>
                                <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>Carpeta</div>
                                <div style={{ marginTop: 4, fontSize: 20, fontWeight: 900, color: "#111114" }}>Lección {entry.lesson}</div>
                              </div>
                              <div style={{ borderRadius: 999, background: "#fff", border: "1px solid rgba(17,17,20,.08)", padding: "6px 9px", fontSize: 12, color: "#475467", fontWeight: 800 }}>
                                {entry.sets.length} sets
                              </div>
                            </div>
                            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {entry.sets.slice(0, 4).map((set) => (
                                <span key={`folder-preview-${set.id}`} style={{ borderRadius: 999, background: "#fff", border: "1px solid rgba(17,17,20,.08)", padding: "5px 8px", fontSize: 12, color: "#475467", fontWeight: 700 }}>
                                  {set.title}
                                </span>
                              ))}
                              {entry.sets.length > 4 && (
                                <span style={{ borderRadius: 999, background: "#fff", border: "1px solid rgba(17,17,20,.08)", padding: "5px 8px", fontSize: 12, color: "#98a2b3", fontWeight: 700 }}>
                                  +{entry.sets.length - 4}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {flashLessonFolder !== null && flashSetId === null && (
              <div style={{ marginTop: 10, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
                {flashSetsInLesson.map((set) => (
                  <button
                    key={set.id}
                    type="button"
                    onClick={() => openFlashSet(set.id)}
                    style={{ textAlign: "left", border: "1px solid rgba(17,17,20,.08)", borderRadius: 14, background: "#fff", padding: 12, cursor: "pointer" }}
                  >
                    <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>Set</div>
                    <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800 }}>{set.title}</div>
                    <div style={{ marginTop: 4, fontSize: 13, color: "#667085", lineHeight: 1.4 }}>{set.description}</div>
                    <div style={{ marginTop: 8, fontSize: 12, color: "#344054", fontWeight: 700 }}>{set.items.length} tarjetas</div>
                  </button>
                ))}
              </div>
            )}

            {activeFlashSet && (
              <div
                ref={flashFocusRef}
                onClick={() => {
                  if (isFlashFocusMode) setFlashMode("browse");
                }}
                style={
                  isFlashFocusMode
                    ? {
                        position: "fixed",
                        inset: 0,
                        zIndex: 70,
                        background: "rgba(17,17,20,.42)",
                        padding: "max(12px,env(safe-area-inset-top)) 12px 12px",
                        overflowY: "auto",
                      }
                    : { marginTop: 10, display: "grid", gap: 12 }
                }
              >
                <div
                  onClick={(event) => event.stopPropagation()}
                  style={
                    isFlashFocusMode
                      ? { maxWidth: 920, margin: "0 auto", display: "grid", gap: 12 }
                      : { display: "grid", gap: 12 }
                  }
                >
                  <div style={{ border: "1px solid rgba(17,17,20,.08)", borderRadius: 14, background: "#fff", padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>
                        {activeFlashSet.isCustom ? "Mi deck" : `Lección ${activeFlashSet.lesson}`}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 20, fontWeight: 800 }}>{activeFlashSet.title}</div>
                      <div style={{ marginTop: 4, color: "#667085", fontSize: 13 }}>{activeFlashSet.description}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {isFlashFocusMode && (
                        <button type="button" onClick={() => setFlashMode("browse")} style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 999, background: "#fff", padding: "7px 10px", fontWeight: 700, cursor: "pointer" }}>
                          Cerrar práctica
                        </button>
                      )}
                      <button type="button" onClick={() => setFlashSetId(null)} style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 999, background: "#fff", padding: "7px 10px", fontWeight: 700, cursor: "pointer" }}>
                        Cambiar set
                      </button>
                      <button type="button" onClick={startFlashCards} style={{ border: 0, borderRadius: 999, background: "linear-gradient(135deg,#34c5a6,#25a98f)", color: "#fff", padding: "7px 12px", fontWeight: 800, cursor: "pointer" }}>
                        Empezar flashcards
                      </button>
                      <button type="button" onClick={startFlashLearn} style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 999, background: "#fff", padding: "7px 10px", fontWeight: 700, cursor: "pointer" }}>
                        Aprender
                      </button>
                    </div>
                  </div>
                </div>

                {flashMode === "browse" && (
                  <div style={{ border: "1px solid rgba(17,17,20,.08)", borderRadius: 14, background: "#fff", padding: 12 }}>
                    <div style={{ fontSize: 12, color: "#7c7c85", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 800, marginBottom: 8 }}>Lista del set</div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {activeFlashItems.map((item) => (
                        <div key={item.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 1px minmax(0,1fr)", gap: 10, alignItems: "center", background: "#1f2a4a", color: "#fff", borderRadius: 12, padding: "10px 12px" }}>
                          <span style={{ fontSize: 22, fontWeight: 700, wordBreak: "break-word" }}>{item.front}</span>
                          <span style={{ width: 1, height: "70%", background: "rgba(255,255,255,.25)" }} />
                          <span style={{ fontSize: 20, fontWeight: 600, color: "#dbe7ff", wordBreak: "break-word" }}>{item.back}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {flashMode === "cards" && activeFlashCard && (
                  <div style={{ border: "1px solid rgba(17,17,20,.08)", borderRadius: 14, background: "#fff", padding: 12 }}>
                    <div style={{ marginBottom: 10, fontSize: 13, color: "#667085", fontWeight: 700 }}>
                      Tarjeta {flashCardIndex + 1} de {activeFlashDeck.length}
                    </div>
                    <div style={{ height: 7, borderRadius: 999, background: "#eceff3", overflow: "hidden", marginBottom: 12 }}>
                      <div style={{ width: `${flashCardProgressPct}%`, height: "100%", background: "linear-gradient(90deg,#34c5a6,#25a98f)" }} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setFlashCardFlipped((value) => !value)}
                      style={{
                        width: "100%",
                        minHeight: 240,
                        border: 0,
                        background: "transparent",
                        cursor: "pointer",
                        perspective: 1000,
                      }}
                    >
                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                          minHeight: 240,
                          transformStyle: "preserve-3d",
                          transition: "transform .32s ease",
                          transform: flashCardFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                        }}
                      >
                        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", border: "1px solid rgba(17,17,20,.08)", borderRadius: 14, background: "#1f2a4a", color: "#fff", display: "grid", placeItems: "center", padding: 16 }}>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.2, wordBreak: "break-word" }}>{activeFlashCard.front}</div>
                            <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,.72)", fontWeight: 700 }}>Toca para voltear</div>
                          </div>
                        </div>
                        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)", border: "1px solid rgba(17,17,20,.08)", borderRadius: 14, background: "#111827", color: "#dbe7ff", display: "grid", placeItems: "center", padding: 16 }}>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.2, wordBreak: "break-word" }}>{activeFlashCard.back}</div>
                            <div style={{ marginTop: 10, fontSize: 12, color: "rgba(219,231,255,.66)", fontWeight: 700 }}>Toca para regresar</div>
                          </div>
                        </div>
                      </div>
                    </button>
                    <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setFlashCardIndex((value) => Math.max(0, value - 1));
                          setFlashCardFlipped(false);
                        }}
                        disabled={flashCardIndex <= 0}
                        style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 999, background: "#fff", padding: "7px 10px", fontWeight: 700, cursor: flashCardIndex <= 0 ? "not-allowed" : "pointer", opacity: flashCardIndex <= 0 ? 0.5 : 1 }}
                      >
                        ← Anterior
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFlashCardIndex((value) => Math.min(activeFlashDeck.length - 1, value + 1));
                          setFlashCardFlipped(false);
                        }}
                        disabled={flashCardIndex >= activeFlashDeck.length - 1}
                        style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 999, background: "#fff", padding: "7px 10px", fontWeight: 700, cursor: flashCardIndex >= activeFlashDeck.length - 1 ? "not-allowed" : "pointer", opacity: flashCardIndex >= activeFlashDeck.length - 1 ? 0.5 : 1 }}
                      >
                        Siguiente →
                      </button>
                    </div>
                  </div>
                )}

                {flashMode === "learn" && (
                  <div style={{ border: "1px solid rgba(17,17,20,.08)", borderRadius: 14, background: "#fff", padding: 12 }}>
                    {!currentFlashLearnQ && !flashLearnFinished && (
                      <div style={{ fontSize: 13, color: "#667085" }}>Generando quiz...</div>
                    )}
                    {currentFlashLearnQ && !flashLearnFinished && (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>Pregunta {flashLearnIndex + 1} / {flashLearnQuestions.length}</div>
                          <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>Score: {flashLearnScore}</div>
                        </div>
                        <div style={{ marginTop: 8, height: 7, borderRadius: 999, background: "#eceff3", overflow: "hidden" }}>
                          <div style={{ width: `${flashLearnProgressPct}%`, height: "100%", background: "linear-gradient(90deg,#34c5a6,#25a98f)" }} />
                        </div>
                        <div style={{ marginTop: 10, fontSize: 13, color: "#7c7c85", fontWeight: 700 }}>Definición</div>
                        <div style={{ marginTop: 6, fontSize: 30, fontWeight: 800, color: "#111114", wordBreak: "break-word" }}>{currentFlashLearnQ.prompt}</div>
                        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>
                          {currentFlashLearnQ.options.map((option) => {
                            const isSelected = flashLearnChoice === option;
                            const isCorrect = option === currentFlashLearnQ.correct;
                            const showResult = Boolean(flashLearnChoice);
                            let bg = "#fff";
                            let color = "#111114";
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
                              <button
                                key={option}
                                type="button"
                                onClick={() => answerFlashLearn(option)}
                                disabled={Boolean(flashLearnChoice)}
                                style={{ textAlign: "left", border, borderRadius: 10, background: bg, color, padding: "10px 12px", fontSize: 20, fontWeight: 700, cursor: flashLearnChoice ? "default" : "pointer", wordBreak: "break-word" }}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                        {flashLearnChoice && (
                          <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <div style={{ fontWeight: 700, color: flashLearnChoice === currentFlashLearnQ.correct ? "#15803d" : "#b91c1c" }}>
                              {flashLearnChoice === currentFlashLearnQ.correct ? "Correcto" : `Incorrecto. Respuesta: ${currentFlashLearnQ.correct}`}
                            </div>
                            <button type="button" onClick={nextFlashLearn} style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 999, background: "#fff", padding: "7px 10px", fontWeight: 700, cursor: "pointer" }}>
                              {flashLearnIndex >= flashLearnQuestions.length - 1 ? "Ver score" : "Siguiente"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {flashLearnFinished && (
                      <div>
                        <div style={{ fontSize: 12, color: "#7c7c85", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 800 }}>Resultado</div>
                        <div style={{ marginTop: 8, fontSize: 34, fontWeight: 800 }}>{flashLearnScore} / {flashLearnQuestions.length}</div>
                        <div style={{ marginTop: 4, color: "#667085", fontSize: 14 }}>
                          {Math.round((flashLearnScore / Math.max(1, flashLearnQuestions.length)) * 100)}% de aciertos
                        </div>
                        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button type="button" onClick={startFlashLearn} style={{ border: 0, borderRadius: 999, background: "linear-gradient(135deg,#34c5a6,#25a98f)", color: "#fff", padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}>
                            Repetir
                          </button>
                          <button type="button" onClick={() => setFlashMode("browse")} style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 999, background: "#fff", padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}>
                            Volver a lista
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              </div>
            )}
          </section>
        )}

        {!showHub && activeTab === "exam" && (
          <section style={{ background: "linear-gradient(145deg,#f0f9ff,#ffffff)", border: "1px solid rgba(17,17,20,.07)", borderRadius: 20, padding: 16, boxShadow: "inset 0 0 0 2px rgba(14,165,233,.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 24 }}>Examen por lección</h2>
              <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                {LESSONS.map((lesson) => (
                  <button
                    key={lesson}
                    type="button"
                    onClick={() => {
                      setExamLesson(lesson);
                      resetExam();
                    }}
                    style={{
                      border: "1px solid rgba(17,17,20,.1)",
                      borderRadius: 999,
                      padding: "6px 10px",
                      fontSize: 12,
                      fontWeight: 700,
                      background: examLesson === lesson ? "#111114" : "#fff",
                      color: examLesson === lesson ? "#fff" : "#333",
                    }}
                  >
                    L{lesson}
                  </button>
                ))}
              </div>
            </div>
            <p style={{ color: "#6b7280", fontSize: 14 }}>
              20 reactivos aleatorios basados en Genki (opción múltiple, abierta, relacionar, ordenar y contexto). Passing score: {EXAM_PASSING_PERCENT}%. Feedback completo al final.
            </p>

            {examQuestions.length === 0 && (
              <div ref={examCardRef} style={{ marginTop: 14, border: "1px solid rgba(17,17,20,.08)", borderRadius: 14, padding: 14, background: "#fbfbfc" }}>
                <div style={{ fontSize: 12, color: "#667085", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 800 }}>Configuración</div>
                <div style={{ marginTop: 6, fontSize: 24, fontWeight: 800 }}>Examen L{examLesson}</div>
                <p style={{ marginTop: 8, color: "#667085", fontSize: 14, lineHeight: 1.5 }}>
                  El sistema prioriza reactivos no vistos. Si ya agotaste banco nuevo, rota por los menos recientes para evitar repetición inmediata.
                </p>
                <button
                  type="button"
                  onClick={startExam}
                  style={{ marginTop: 10, border: 0, borderRadius: 999, background: "linear-gradient(135deg,#34c5a6,#25a98f)", color: "#fff", padding: "10px 16px", fontWeight: 800, fontSize: 14, boxShadow: "0 10px 18px rgba(44,182,150,.22)" }}
                >
                  Iniciar examen
                </button>
              </div>
            )}

            {examCurrentQ && !examFinished && (
              <div ref={examCardRef} style={{ marginTop: 14, border: "1px solid rgba(17,17,20,.08)", borderRadius: 14, padding: 12, background: "#fbfbfc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>Pregunta {examIndex + 1} / {examQuestions.length}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>Lección {examLesson} · {formatExamCategoryLabel(examCurrentQ.category)}</div>
                </div>
                <div style={{ marginTop: 8, height: 7, borderRadius: 999, background: "#ecedf1", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${examProgressPct}%`, background: "linear-gradient(90deg, #34c5a6, #25a98f)" }} />
                </div>
                <div style={{ marginTop: 8, fontSize: 20, fontWeight: 800, color: "#111114", whiteSpace: "pre-line", lineHeight: 1.45 }}>{examCurrentQ.prompt}</div>
                {examCurrentQ.hint && <div style={{ marginTop: 4, color: "#6b7280", fontSize: 13 }}>{examCurrentQ.hint}</div>}
                {examCurrentQ.type === "match" && examCurrentQ.matchLeft && examCurrentQ.matchRight && (
                  <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                    <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
                      <div style={{ border: "1px solid rgba(17,17,20,.08)", borderRadius: 10, background: "#fff", padding: 10 }}>
                        <div style={{ fontSize: 11, color: "#667085", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>Columna A</div>
                        <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                          {examCurrentQ.matchLeft.map((item) => <div key={item} style={{ fontSize: 14, color: "#111114" }}>{item}</div>)}
                        </div>
                      </div>
                      <div style={{ border: "1px solid rgba(17,17,20,.08)", borderRadius: 10, background: "#fff", padding: 10 }}>
                        <div style={{ fontSize: 11, color: "#667085", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>Columna B</div>
                        <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                          {examCurrentQ.matchRight.map((item) => <div key={item} style={{ fontSize: 14, color: "#111114" }}>{item}</div>)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {examCurrentQ.type === "reorder" ? (
                  <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                    <div style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 14, background: "#fff", padding: 12 }}>
                      <div style={{ fontSize: 11, color: "#667085", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>Tu oración</div>
                      <div style={{ marginTop: 8, minHeight: 52, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        {decodeReorderAnswer(examCurrentChoice || "").length > 0 ? (
                          decodeReorderAnswer(examCurrentChoice || "").map((tokenId) => {
                            const token = examCurrentQ.reorderTokens?.find((item) => item.id === tokenId);
                            if (!token) return null;
                            return (
                              <span key={tokenId} style={{ borderRadius: 999, background: "#ecfdf5", color: "#166534", padding: "7px 10px", fontWeight: 700, fontSize: 14 }}>
                                {token.label}
                              </span>
                            );
                          })
                        ) : (
                          <span style={{ color: "#98a2b3", fontSize: 14 }}>Toca los bloques en el orden correcto.</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {(examCurrentQ.reorderTokens || []).map((token) => {
                        const used = decodeReorderAnswer(examCurrentChoice || "").includes(token.id);
                        return (
                          <button
                            key={token.id}
                            type="button"
                            disabled={used}
                            onClick={() => appendExamReorderToken(token.id)}
                            style={{
                              border: used ? "1px solid rgba(17,17,20,.06)" : "1px solid rgba(17,17,20,.12)",
                              borderRadius: 999,
                              background: used ? "#f3f4f6" : "#fff",
                              color: used ? "#98a2b3" : "#111114",
                              padding: "8px 12px",
                              fontWeight: 700,
                              cursor: used ? "not-allowed" : "pointer",
                            }}
                          >
                            {token.label}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" onClick={popExamReorderToken} style={{ border: "1px solid rgba(17,17,20,.12)", borderRadius: 999, background: "#fff", padding: "8px 12px", fontWeight: 700 }}>
                        Borrar último
                      </button>
                      <button type="button" onClick={clearExamReorder} style={{ border: "1px solid rgba(17,17,20,.12)", borderRadius: 999, background: "#fff", padding: "8px 12px", fontWeight: 700 }}>
                        Limpiar
                      </button>
                    </div>
                  </div>
                ) : examCurrentQ.type === "text" ? (
                  <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                    <input
                      value={examCurrentChoice || ""}
                      onChange={(event) => answerExam(event.target.value)}
                      placeholder="Escribe tu respuesta aquí"
                      style={{ border: "1px solid rgba(17,17,20,.12)", borderRadius: 12, background: "#fff", padding: "10px 12px", fontSize: 16, fontWeight: 600, color: "#111114" }}
                    />
                  </div>
                ) : (
                  <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                    {examCurrentQ.options.map((op) => {
                      const isSelected = examCurrentChoice === op;
                      return (
                        <button
                          key={op}
                          type="button"
                          onClick={() => answerExam(op)}
                          style={{
                            textAlign: "left",
                            border: isSelected ? "1px solid #2cb696" : "1px solid rgba(17,17,20,.1)",
                            borderRadius: 10,
                            background: isSelected ? "#ecfdf5" : "#fff",
                            color: isSelected ? "#166534" : "#222",
                            padding: "8px 10px",
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {op}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={nextExamQuestion}
                    style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 999, background: "#fff", padding: "7px 10px", fontWeight: 700 }}
                  >
                    {examIndex >= examQuestions.length - 1 ? "Terminar y ver feedback" : "Siguiente"}
                  </button>
                </div>
              </div>
            )}

            {examFinished && (
              <div ref={examCardRef} style={{ marginTop: 14, border: "1px solid rgba(17,17,20,.08)", borderRadius: 14, padding: 14, background: "#f8fafc" }}>
                <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>Resultado final</div>
                <div style={{ marginTop: 6, fontSize: 30, fontWeight: 800 }}>{examScore} / {examQuestions.length}</div>
                <div style={{ marginTop: 6, color: "#6b7280" }}>
                  {examPercent}% de aciertos · {examPassed ? "Aprobado" : "No aprobado"} (mínimo {EXAM_PASSING_PERCENT}%)
                </div>
                <div style={{ marginTop: 12, display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
                  {examCategoryBreakdown.map((row) => {
                    const pct = Math.round((row.correct / Math.max(1, row.total)) * 100);
                    return (
                      <div key={row.category} style={{ border: "1px solid rgba(17,17,20,.08)", borderRadius: 10, background: "#fff", padding: 10 }}>
                        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "#667085", fontWeight: 800 }}>{formatExamCategoryLabel(row.category)}</div>
                        <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800, color: "#111114" }}>{row.correct}/{row.total}</div>
                        <div style={{ marginTop: 2, fontSize: 12, color: "#667085" }}>{pct}%</div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" onClick={startExam} style={{ border: 0, borderRadius: 999, background: "linear-gradient(135deg,#34c5a6,#25a98f)", color: "#fff", padding: "8px 12px", fontWeight: 700 }}>
                    Repetir examen L{examLesson}
                  </button>
                  <button type="button" onClick={resetExam} style={{ border: "1px solid rgba(17,17,20,.12)", background: "#fff", color: "#111114", borderRadius: 999, padding: "8px 12px", fontWeight: 700 }}>
                    Cambiar lección
                  </button>
                </div>

                <div style={{ marginTop: 14, borderTop: "1px dashed rgba(17,17,20,.1)", paddingTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#7c7c85", textTransform: "uppercase", letterSpacing: ".08em" }}>
                    Feedback de errores
                  </div>
                  {examWrongQuestions.length === 0 ? (
                    <p style={{ marginTop: 8, color: "#15803d", fontWeight: 700 }}>Excelente. No hubo errores en este intento.</p>
                  ) : (
                    <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                      {examWrongQuestions.slice(0, 10).map((question, index) => {
                        const key = question.stableKey || question.id;
                        const chosen = formatExamAnswer(question, examAnswers[key]);
                        const correct = question.correct;
                        return (
                          <div key={`${key}-${index}`} style={{ border: "1px solid rgba(17,17,20,.08)", borderRadius: 10, background: "#fff", padding: 10 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#111114", whiteSpace: "pre-line" }}>{question.prompt}</div>
                            <div style={{ marginTop: 4, fontSize: 12, color: "#b42318" }}>Tu respuesta: {chosen}</div>
                            <div style={{ marginTop: 2, fontSize: 12, color: "#166534" }}>Correcta: {correct}</div>
                            {question.explanation && <div style={{ marginTop: 4, fontSize: 12, color: "#667085" }}>{question.explanation}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ marginTop: 14, borderTop: "1px dashed rgba(17,17,20,.1)", paddingTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#7c7c85", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
                Historial reciente
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {examHistory.slice(0, 6).map((attempt, index) => (
                  <div key={`${attempt.createdAt}-${index}`} style={{ border: "1px solid rgba(17,17,20,.08)", borderRadius: 10, background: "#fff", padding: "8px 10px", display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, color: "#111114", fontWeight: 700 }}>
                      L{attempt.lesson} · {attempt.score}/{attempt.total} ({attempt.percent}%)
                    </span>
                    <span style={{ fontSize: 12, color: attempt.passed ? "#15803d" : "#b42318", fontWeight: 700 }}>
                      {attempt.passed ? "Aprobado" : "No aprobado"}
                    </span>
                  </div>
                ))}
                {examHistory.length === 0 && <div style={{ color: "#98a2b3", fontSize: 12 }}>Aún no hay intentos.</div>}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default function StudyPage() {
  return (
    <Suspense fallback={<div style={{ padding: "110px 16px", textAlign: "center", color: "#9ca3af" }}>Cargando estudio…</div>}>
      <StudyContent />
    </Suspense>
  );
}
