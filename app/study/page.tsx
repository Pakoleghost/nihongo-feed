"use client";

import Link from "next/link";
import { Suspense } from "react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AprenderKanaModule from "@/components/study/AprenderKanaModule";
import HomeScreen from "@/components/study/HomeScreen";
import ReviewScreen from "@/components/study/ReviewScreen";
import PracticeIndexScreen, { type PracticeSubView } from "@/components/study/PracticeIndexScreen";
import VaultScreen from "@/components/study/VaultScreen";
import { DS, TabBar } from "@/components/study/ds";
import PracticeShell, { PracticeStageCard } from "@/components/study/PracticeShell";
import StudySelectorGroup from "@/components/study/StudySelectorGroup";
import { KANA_ITEMS } from "@/lib/kana-data";
import { GENKI_VOCAB_BY_LESSON } from "@/lib/genki-vocab-by-lesson";
import { GENKI_KANJI_BY_LESSON } from "@/lib/genki-kanji-by-lesson";
import { applyKanaRating, loadKanaProgress, saveKanaProgress } from "@/lib/kana-progress";
import { getStudyDueSummary, loadStudySrs, rankItemsForReview, recordStudyResult, saveStudySrs, type StudySrsMap, type StudySrsItemType, type StudySrsSourceTool } from "@/lib/study-srs";

type KanaPair = readonly [string, string];
type QuizCount = 10 | 20 | 30;
type QuizMode = "particles" | "conjugation" | "vocab" | "kanji";
type ConjType = "te" | "past" | "masu" | "plain" | "adj-negative" | "adj-past";
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
type QuizCategory = "kana" | "vocab" | "kanji" | "particles" | "conjugation" | "grammar" | "reading";
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

type PracticeFeedbackState = {
  status: "correct" | "wrong";
  answer: string;
  explanation?: string;
};

type StudyHomeToolKey = "learnkana" | "flashcards" | "sprint" | "exam";

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

function getLocalMonthStart(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  value.setDate(1);
  return value;
}

function getNextLocalMonthStart(date = new Date()) {
  const start = getLocalMonthStart(date);
  start.setMonth(start.getMonth() + 1);
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

function isSameLocalMonth(isoA?: string | null, isoB?: string | null) {
  if (!isoA || !isoB) return false;
  const a = new Date(isoA);
  const b = new Date(isoB);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
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
type StudyView = "home" | "learn" | "review" | "practice" | "vault";
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
  itemId: string;
  lesson: number;
  deckTitle: string;
  prompt: string;
  correct: string;
  options: string[];
};

type FlashLearnResult = {
  itemId: string;
  lesson: number;
  deckTitle: string;
  correct: boolean;
};

type StudyActivityTool = "learnkana" | "kana" | "sprint" | "flashcards" | "exam";

type StudyActivityEntry = {
  id: string;
  tool: StudyActivityTool;
  label: string;
  href: string;
  detail?: string;
  occurredAt: string;
};

const EXAM_CATEGORY_LABELS: Record<QuizCategory, string> = {
  kana: "Kana",
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

function buildFlashLearnOptions(
  correct: string,
  candidateBacks: string[],
  recentDistractorHistory: string[],
  previousDistractors: string[],
  desiredCount = 4,
) {
  const maxDistractors = Math.max(1, desiredCount - 1);
  const uniqueCandidates = Array.from(new Set(candidateBacks.filter((value) => value && value !== correct)));
  if (uniqueCandidates.length === 0) return [correct];

  const recentCounts = new Map<string, number>();
  recentDistractorHistory.forEach((value) => {
    recentCounts.set(value, (recentCounts.get(value) || 0) + 1);
  });
  const previousSet = new Set(previousDistractors);
  const previousSignature = [...previousDistractors].sort().join("||");

  const rankedCandidates = shuffle(uniqueCandidates)
    .map((value) => ({
      value,
      recentHits: recentCounts.get(value) || 0,
      usedLastCard: previousSet.has(value) ? 1 : 0,
      lastSeenAt: recentDistractorHistory.lastIndexOf(value),
    }))
    .sort((a, b) => {
      if (a.usedLastCard !== b.usedLastCard) return a.usedLastCard - b.usedLastCard;
      if (a.recentHits !== b.recentHits) return a.recentHits - b.recentHits;
      if (a.lastSeenAt !== b.lastSeenAt) return a.lastSeenAt - b.lastSeenAt;
      return 0;
    });

  let distractors = rankedCandidates.slice(0, Math.min(maxDistractors, rankedCandidates.length)).map((entry) => entry.value);

  if (
    distractors.length === maxDistractors &&
    previousDistractors.length === maxDistractors &&
    [...distractors].sort().join("||") === previousSignature
  ) {
    const replacement = rankedCandidates.find((entry) => !distractors.includes(entry.value));
    if (replacement) {
      distractors = [...distractors.slice(1), replacement.value];
    }
  }

  return shuffle([correct, ...distractors]).slice(0, Math.min(desiredCount, uniqueCandidates.length + 1));
}

function rankBadgeStyles(index: number) {
  if (index === 0) return { bg: "#f4c95d", border: "#e2b648", color: "#111114" };
  if (index === 1) return { bg: "#d7dce3", border: "#bdc4ce", color: "#111114" };
  if (index === 2) return { bg: "#d59a62", border: "#c48141", color: "#fff" };
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

  if (types.includes("plain")) {
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
        prompt: `${toMasu(v)} → forma base`,
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

const LESSON_ONE_CURATED_VOCAB = [
  { kana: "がくせい", es: "estudiante", direction: "jp-es" },
  { kana: "せんせい", es: "profesor", direction: "es-jp" },
  { kana: "せんこう", es: "carrera/especialidad", direction: "jp-es" },
  { kana: "わたし", es: "yo", direction: "es-jp" },
  { kana: "だいがく", es: "universidad", direction: "jp-es" },
  { kana: "だいがくせい", es: "estudiante universitario", direction: "es-jp" },
  { kana: "にほんじん", es: "los japoneses", direction: "jp-es" },
  { kana: "にほんご", es: "idioma japonés", direction: "es-jp" },
  { kana: "なまえ", es: "nombre", direction: "jp-es" },
  { kana: "ばんごう", es: "número", direction: "es-jp" },
] as const;

const LESSON_TWO_CURATED_VOCAB = [
  { kana: "これ", es: "este", direction: "jp-es" },
  { kana: "それ", es: "ese", direction: "es-jp" },
  { kana: "どれ", es: "cuál", direction: "jp-es" },
  { kana: "ここ", es: "aquí", direction: "es-jp" },
  { kana: "そこ", es: "ahí", direction: "jp-es" },
  { kana: "どこ", es: "dónde", direction: "es-jp" },
  { kana: "かばん", es: "bolsa; bolso", direction: "jp-es" },
  { kana: "とけい", es: "reloj", direction: "es-jp" },
  { kana: "ほん", es: "libro", direction: "jp-es" },
  { kana: "だれ", es: "quién", direction: "es-jp" },
] as const;

const LESSON_THREE_CURATED_VOCAB = [
  { kana: "えいが", es: "película", direction: "jp-es" },
  { kana: "おんがく", es: "música", direction: "jp-es" },
  { kana: "としょかん", es: "biblioteca", direction: "jp-es" },
  { kana: "なんじ", es: "qué hora", direction: "jp-es" },
  { kana: "げつようび", es: "lunes", direction: "es-jp" },
  { kana: "ごぜん", es: "a.m.", direction: "es-jp" },
  { kana: "ごご", es: "p.m.", direction: "es-jp" },
  { kana: "しゅう", es: "semana", direction: "es-jp" },
] as const;

const LESSON_THREE_CURATED_KANJI = ["一時", "円"] as const;

const LESSON_FOUR_CURATED_VOCAB = [
  { kana: "せんしゅう", es: "la semana pasada", direction: "jp-es" },
  { kana: "きのう", es: "ayer", direction: "jp-es" },
  { kana: "でんしゃ", es: "tren", direction: "jp-es" },
  { kana: "しゃしん", es: "fotografía", direction: "jp-es" },
  { kana: "アルバイト", es: "trabajo a tiempo parcial", direction: "es-jp" },
  { kana: "ひとりで", es: "solo", direction: "es-jp" },
  { kana: "どうして", es: "por qué", direction: "es-jp" },
  { kana: "としょかん", es: "biblioteca", direction: "es-jp" },
] as const;

const LESSON_FOUR_CURATED_KANJI = ["月曜日", "三時半"] as const;

const LESSON_FIVE_CURATED_VOCAB = [
  { kana: "てんき", es: "tiempo (atmosférico)", direction: "jp-es" },
  { kana: "りょこう", es: "viaje", direction: "jp-es" },
  { kana: "うみ", es: "mar", direction: "jp-es" },
  { kana: "たべもの", es: "comida", direction: "jp-es" },
  { kana: "のみもの", es: "bebida", direction: "es-jp" },
  { kana: "あたらしい", es: "nuevo", direction: "es-jp" },
  { kana: "おもしろい", es: "interesante; divertido", direction: "es-jp" },
  { kana: "たのしい", es: "divertido", direction: "es-jp" },
] as const;

const LESSON_FIVE_CURATED_KANJI = ["天気", "山"] as const;

const LESSON_SIX_CURATED_VOCAB = [
  { kana: "パソコン", es: "computadora personal", direction: "jp-es" },
  { kana: "でんき", es: "electricidad; luz", direction: "jp-es" },
  { kana: "まど", es: "ventana", direction: "jp-es" },
  { kana: "でんしゃ", es: "tren", direction: "jp-es" },
  { kana: "くに", es: "país; lugar de origen", direction: "es-jp" },
  { kana: "こんしゅう", es: "esta semana", direction: "es-jp" },
  { kana: "よる", es: "noche", direction: "es-jp" },
  { kana: "にもつ", es: "equipaje", direction: "es-jp" },
] as const;

const LESSON_SIX_CURATED_KANJI = ["出口", "右"] as const;

const LESSON_SEVEN_CURATED_VOCAB = [
  { kana: "かぞく", es: "familia", direction: "jp-es" },
  { kana: "ちち", es: "(mi) padre", direction: "jp-es" },
  { kana: "はは", es: "(mi) madre", direction: "jp-es" },
  { kana: "あに", es: "(mi) hermano mayor", direction: "jp-es" },
  { kana: "かいしゃ", es: "empresa", direction: "es-jp" },
  { kana: "かみ", es: "pelo", direction: "es-jp" },
  { kana: "めがね", es: "lentes; gafas", direction: "es-jp" },
  { kana: "きょうだい", es: "hermanos y hermanas", direction: "es-jp" },
] as const;

const LESSON_SEVEN_CURATED_KANJI = ["父", "東京"] as const;

const LESSON_EIGHT_CURATED_VOCAB = [
  { kana: "はれ", es: "soleado", direction: "jp-es" },
  { kana: "あめ", es: "lluvia", direction: "jp-es" },
  { kana: "てんきよほう", es: "pronóstico del tiempo", direction: "jp-es" },
  { kana: "きおん", es: "temperatura", direction: "jp-es" },
  { kana: "カメラ", es: "cámara", direction: "es-jp" },
  { kana: "バーベキュー", es: "barbacoa", direction: "es-jp" },
  { kana: "ホームステイ", es: "estancia con familia anfitriona", direction: "es-jp" },
  { kana: "スペイン", es: "España", direction: "es-jp" },
] as const;

const LESSON_EIGHT_CURATED_KANJI = ["作る", "思う"] as const;

const LESSON_NINE_CURATED_VOCAB = [
  { kana: "たんご", es: "palabra; vocabulario", direction: "jp-es" },
  { kana: "さくぶん", es: "ensayo; composición", direction: "jp-es" },
  { kana: "しけん", es: "examen", direction: "jp-es" },
  { kana: "チケット", es: "boleto", direction: "jp-es" },
  { kana: "かぶき", es: "kabuki", direction: "es-jp" },
  { kana: "びょうき", es: "enfermedad", direction: "es-jp" },
  { kana: "せんげつ", es: "el mes pasado", direction: "es-jp" },
  { kana: "あかい", es: "rojo", direction: "es-jp" },
] as const;

const LESSON_NINE_CURATED_KANJI = ["来る", "白い"] as const;

const LESSON_TEN_CURATED_VOCAB = [
  { kana: "しんかんせん", es: "Shinkansen", direction: "jp-es" },
  { kana: "ひこうき", es: "avión", direction: "jp-es" },
  { kana: "よやく", es: "reserva", direction: "jp-es" },
  { kana: "りょこうする", es: "viajar", direction: "jp-es" },
  { kana: "すし", es: "sushi", direction: "es-jp" },
  { kana: "りょうり", es: "comida; cocina", direction: "es-jp" },
  { kana: "ちかてつ", es: "metro", direction: "es-jp" },
  { kana: "ことし", es: "este año", direction: "es-jp" },
] as const;

const LESSON_TEN_CURATED_KANJI = ["町", "道"] as const;

const LESSON_ELEVEN_CURATED_VOCAB = [
  { kana: "りょこう", es: "viaje", direction: "jp-es" },
  { kana: "おんせん", es: "aguas termales", direction: "jp-es" },
  { kana: "びじゅつかん", es: "museo de arte", direction: "jp-es" },
  { kana: "ゆめ", es: "sueño", direction: "jp-es" },
  { kana: "しょうらい", es: "futuro", direction: "es-jp" },
  { kana: "じゅぎょう", es: "clase", direction: "es-jp" },
  { kana: "りゅうがくする", es: "estudiar en el extranjero", direction: "es-jp" },
  { kana: "キャンプ", es: "campamento", direction: "es-jp" },
] as const;

const LESSON_ELEVEN_CURATED_KANJI = ["旅行", "手紙"] as const;

const LESSON_TWELVE_CURATED_VOCAB = [
  { kana: "のど", es: "garganta", direction: "jp-es" },
  { kana: "かぜ", es: "resfriado", direction: "jp-es" },
  { kana: "せき", es: "tos", direction: "jp-es" },
  { kana: "せいせき", es: "calificación", direction: "jp-es" },
  { kana: "ようじ", es: "asunto pendiente", direction: "es-jp" },
  { kana: "いみ", es: "significado", direction: "es-jp" },
  { kana: "プレゼント", es: "regalo", direction: "es-jp" },
  { kana: "ふく", es: "ropa", direction: "es-jp" },
] as const;

const LESSON_TWELVE_CURATED_KANJI = ["昔", "一度"] as const;

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

function buildLessonOneCuratedExamPool() {
  const lesson = 1;
  const lessonVocab = (ALL_GENKI_VOCAB_BY_LESSON[lesson] || []).filter((item) => isExamVocabEligible(lesson, item));
  const allVocab = Object.values(ALL_GENKI_VOCAB_BY_LESSON).flat().filter((item) => isExamVocabEligible(lesson, item));
  const meaningPool = Array.from(new Set(allVocab.map((item) => item.es).filter(Boolean)));
  const jpPool = Array.from(
    new Set(
      allVocab
        .map((item) => (item.kanji?.trim() ? `${item.kanji.trim()} (${item.kana})` : item.kana))
        .filter(Boolean),
    ),
  );

  const vocabQuestions = LESSON_ONE_CURATED_VOCAB.map((entry, index) => {
    const item = lessonVocab.find((candidate) => candidate.kana === entry.kana);
    if (!item) return null;
    const jpForm = item.kanji?.trim() ? `${item.kanji.trim()} (${item.kana})` : item.kana;
    if (entry.direction === "jp-es") {
      const sameLessonMeanings = Array.from(
        new Set(lessonVocab.map((candidate) => candidate.es).filter((value) => value && value !== item.es)),
      );
      return createLessonQuestion(lesson, `vocab:curated:es:${item.kana}:${index}`, {
        category: "vocab",
        type: "mcq",
        prompt: `¿Qué significa 「${item.kana}」?`,
        options: buildOptionSet(item.es, sameLessonMeanings, meaningPool),
        correct: item.es,
        hint: buildLessonHint(lesson, "Vocabulario"),
        explanation: `「${item.kana}」 significa “${item.es}”.`,
      });
    }

    const sameLessonJapanese = Array.from(
      new Set(
        lessonVocab
          .map((candidate) => (candidate.kanji?.trim() ? `${candidate.kanji.trim()} (${candidate.kana})` : candidate.kana))
          .filter((value) => value && value !== jpForm),
      ),
    );
    return createLessonQuestion(lesson, `vocab:curated:jp:${item.kana}:${index}`, {
      category: "vocab",
      type: "mcq",
      prompt: `Selecciona el japonés para: “${item.es}”`,
      options: buildOptionSet(jpForm, sameLessonJapanese, jpPool),
      correct: jpForm,
      hint: buildLessonHint(lesson, "Vocabulario"),
      explanation: `La opción correcta para “${item.es}” es 「${jpForm}」.`,
    });
  }).filter((question): question is QuizQuestion => Boolean(question));

  const grammarCluster: QuizQuestion[] = [
    createLessonQuestion(1, "grammar:curated:student-copula", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “I am a student”?",
      options: [
        "わたしはがくせいです。",
        "わたしががくせいです。",
        "わたしはがくせいじゃないです。",
        "わたしをがくせいです。",
      ],
      correct: "わたしはがくせいです。",
      hint: buildLessonHint(1, "Copulativa"),
      explanation: "La estructura base en L1 es 「X は Y です」.",
    }),
    createLessonQuestion(1, "grammar:curated:teacher-question", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “Are you a teacher?”?",
      options: [
        "あなたはせんせいです。",
        "あなたはせんせいですか。",
        "あなたがせんせいですか。",
        "あなたはせんせいじゃないですか。",
      ],
      correct: "あなたはせんせいですか。",
      hint: buildLessonHint(1, "Pregunta con か"),
      explanation: "En L1, la pregunta básica termina en 「か」.",
    }),
    createLessonQuestion(1, "grammar:curated:no-major", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “Japanese language major”?",
      options: [
        "にほんごはせんこうです。",
        "せんこうのにほんごです。",
        "にほんごのせんこうです。",
        "にほんごをせんこうです。",
      ],
      correct: "にほんごのせんこうです。",
      hint: buildLessonHint(1, "Noun 1 の Noun 2"),
      explanation: "「N1 の N2」 conecta dos sustantivos: “especialidad de japonés”.",
    }),
    createLessonQuestion(1, "grammar:curated:negative-copula", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “Maria is not a teacher”?",
      options: [
        "マリアさんはせんせいです。",
        "マリアさんはせんせいじゃないです。",
        "マリアさんがせんせいじゃないです。",
        "マリアさんのせんせいじゃないです。",
      ],
      correct: "マリアさんはせんせいじゃないです。",
      hint: buildLessonHint(1, "Copulativa negativa"),
      explanation: "La negativa nominal de L1 es 「じゃないです」.",
    }),
    createLessonQuestion(1, "grammar:curated:theme-particle", {
      category: "grammar",
      type: "mcq",
      prompt: "Completa la oración: わたし___がくせいです。",
      options: ["は", "が", "を", "の"],
      correct: "は",
      hint: buildLessonHint(1, "Tema"),
      explanation: "「は」 marca el tema en presentaciones básicas.",
    }),
    createLessonQuestion(1, "grammar:curated:name-question", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “What is your name?”?",
      options: [
        "なまえは なんですか。",
        "なまえが なんですか。",
        "あなたは なまえですか。",
        "なまえを なんですか。",
      ],
      correct: "なまえは なんですか。",
      hint: buildLessonHint(1, "Pregunta básica"),
      explanation: "La estructura natural es 「なまえは なんですか」.",
    }),
    createLessonQuestion(1, "grammar:curated:major-question", {
      category: "grammar",
      type: "mcq",
      prompt: "Completa la pregunta: せんこうは ___ ですか。",
      options: ["なん", "だれ", "どこ", "なんじ"],
      correct: "なん",
      hint: buildLessonHint(1, "Pregunta con なん"),
      explanation: "Para preguntar “qué” en este contexto se usa 「なん」.",
    }),
    createLessonQuestion(1, "grammar:curated:number-ownership", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál expresión significa “my phone number”?",
      options: [
        "わたしは でんわばんごうです。",
        "わたしの でんわばんごうです。",
        "わたしを でんわばんごうです。",
        "わたしが でんわばんごうです。",
      ],
      correct: "わたしの でんわばんごうです。",
      hint: buildLessonHint(1, "Noun 1 の Noun 2"),
      explanation: "La posesión se expresa con 「の」.",
    }),
  ];

  const readingQuestions: QuizQuestion[] = [
    createLessonQuestion(1, "reading:curated:self-intro", {
      category: "reading",
      type: "mcq",
      prompt: "Lee la presentación.\n\nわたしは アナです。メキシコじんです。がくせいです。\nせんこうは にほんごです。\n\n¿Cuál opción es correcta?",
      options: [
        "Ana es profesora.",
        "Ana es japonesa.",
        "Ana es estudiante de japonés.",
        "Ana estudia historia.",
      ],
      correct: "Ana es estudiante de japonés.",
      hint: buildLessonHint(1, "Lectura corta"),
      explanation: "El texto dice que Ana es estudiante y su especialidad es japonés.",
    }),
    createLessonQuestion(1, "reading:curated:mini-dialogue", {
      category: "reading",
      type: "mcq",
      prompt: "Lee el diálogo.\n\nA: なまえは なんですか。\nB: たけしです。\nA: せんこうは なんですか。\nB: れきしです。\n\n¿Qué estudia Takeshi?",
      options: ["japonés", "inglés", "historia", "literatura"],
      correct: "historia",
      hint: buildLessonHint(1, "Lectura corta"),
      explanation: "B responde 「れきしです」 cuando le preguntan por su especialidad.",
    }),
  ];

  return [...vocabQuestions, ...grammarCluster, ...readingQuestions];
}

function buildLessonTwoCuratedExamPool() {
  const lesson = 2;
  const lessonVocab = (ALL_GENKI_VOCAB_BY_LESSON[lesson] || []).filter((item) => isExamVocabEligible(lesson, item));
  const allVocab = Object.values(ALL_GENKI_VOCAB_BY_LESSON).flat().filter((item) => isExamVocabEligible(lesson, item));
  const meaningPool = Array.from(new Set(allVocab.map((item) => item.es).filter(Boolean)));
  const jpPool = Array.from(
    new Set(
      allVocab
        .map((item) => (item.kanji?.trim() ? `${item.kanji.trim()} (${item.kana})` : item.kana))
        .filter(Boolean),
    ),
  );

  const vocabQuestions = LESSON_TWO_CURATED_VOCAB.map((entry, index) => {
    const item = lessonVocab.find((candidate) => candidate.kana === entry.kana);
    if (!item) return null;
    const jpForm = item.kanji?.trim() ? `${item.kanji.trim()} (${item.kana})` : item.kana;
    if (entry.direction === "jp-es") {
      const sameLessonMeanings = Array.from(
        new Set(lessonVocab.map((candidate) => candidate.es).filter((value) => value && value !== item.es)),
      );
      return createLessonQuestion(lesson, `vocab:curated:es:${item.kana}:${index}`, {
        category: "vocab",
        type: "mcq",
        prompt: `¿Qué significa 「${item.kana}」?`,
        options: buildOptionSet(item.es, sameLessonMeanings, meaningPool),
        correct: item.es,
        hint: buildLessonHint(lesson, "Vocabulario"),
        explanation: `「${item.kana}」 significa “${item.es}”.`,
      });
    }

    const sameLessonJapanese = Array.from(
      new Set(
        lessonVocab
          .map((candidate) => (candidate.kanji?.trim() ? `${candidate.kanji.trim()} (${candidate.kana})` : candidate.kana))
          .filter((value) => value && value !== jpForm),
      ),
    );
    return createLessonQuestion(lesson, `vocab:curated:jp:${item.kana}:${index}`, {
      category: "vocab",
      type: "mcq",
      prompt: `Selecciona el japonés para: “${item.es}”`,
      options: buildOptionSet(jpForm, sameLessonJapanese, jpPool),
      correct: jpForm,
      hint: buildLessonHint(lesson, "Vocabulario"),
      explanation: `La opción correcta para “${item.es}” es 「${jpForm}」.`,
    });
  }).filter((question): question is QuizQuestion => Boolean(question));

  const grammarCluster: QuizQuestion[] = [
    createLessonQuestion(2, "grammar:curated:kore", {
      category: "grammar",
      type: "mcq",
      prompt: "Si tienes un libro en la mano, ¿cuál opción significa “this”?",
      options: ["これ", "それ", "あれ", "どれ"],
      correct: "これ",
      hint: buildLessonHint(2, "これ / それ / あれ / どれ"),
      explanation: "「これ」 se usa para algo cercano a quien habla.",
    }),
    createLessonQuestion(2, "grammar:curated:kono-book", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál expresión significa “this book”?",
      options: ["これ ほん", "この ほん", "それ ほん", "ほん この"],
      correct: "この ほん",
      hint: buildLessonHint(2, "この / その / あの / どの"),
      explanation: "「この」 va directamente antes del sustantivo.",
    }),
    createLessonQuestion(2, "grammar:curated:where", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “Where is the library?”?",
      options: [
        "としょかんは どこですか。",
        "としょかんは だれですか。",
        "としょかんは どれですか。",
        "としょかんは これですか。",
      ],
      correct: "としょかんは どこですか。",
      hint: buildLessonHint(2, "ここ / そこ / あそこ / どこ"),
      explanation: "Para preguntar ubicación se usa 「どこ」.",
    }),
    createLessonQuestion(2, "grammar:curated:ownership", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “That is Maria's bag”?",
      options: [
        "それは マリアさんの かばんです。",
        "それは マリアさん かばんです。",
        "それは マリアさんを かばんです。",
        "それは マリアさんが かばんです。",
      ],
      correct: "それは マリアさんの かばんです。",
      hint: buildLessonHint(2, "Noun 1 の Noun 2"),
      explanation: "La posesión se expresa con 「の」.",
    }),
    createLessonQuestion(2, "grammar:curated:dare-no", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál pregunta significa “Whose watch is that?”?",
      options: [
        "それは だれの とけいですか。",
        "それは だれ とけいですか。",
        "それは どこ の とけいですか。",
        "それは だれが とけいですか。",
      ],
      correct: "それは だれの とけいですか。",
      hint: buildLessonHint(2, "だれの"),
      explanation: "Para preguntar de quién es algo se usa 「だれの」.",
    }),
    createLessonQuestion(2, "grammar:curated:mo", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “That is also a Japanese book”?",
      options: [
        "それは にほんごの ほんです。",
        "それも にほんごの ほんです。",
        "それは にほんごも ほんです。",
        "それが にほんごの ほんです。",
      ],
      correct: "それも にほんごの ほんです。",
      hint: buildLessonHint(2, "Noun + も"),
      explanation: "「も」 agrega la idea de “también”.",
    }),
    createLessonQuestion(2, "grammar:curated:negative-copula", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “This is not a dictionary”?",
      options: [
        "これは じしょです。",
        "これは じしょじゃないです。",
        "これは じしょのです。",
        "これは じしょがないです。",
      ],
      correct: "これは じしょじゃないです。",
      hint: buildLessonHint(2, "Noun + じゃないです"),
      explanation: "La negativa nominal en estas oraciones es 「じゃないです」.",
    }),
    createLessonQuestion(2, "grammar:curated:yo-ne", {
      category: "grammar",
      type: "mcq",
      prompt: "Quieres confirmar algo que ambos ven y suena natural decir “Es bonito, ¿verdad?”. ¿Cuál opción encaja mejor?",
      options: [
        "きれいですね。",
        "きれいですよ。",
        "きれいですか。",
        "きれいじゃないです。",
      ],
      correct: "きれいですね。",
      hint: buildLessonHint(2, "ね / よ"),
      explanation: "「ね」 invita confirmación compartida; 「よ」 da información nueva.",
    }),
  ];

  const readingQuestions: QuizQuestion[] = [
    createLessonQuestion(2, "reading:curated:store", {
      category: "reading",
      type: "mcq",
      prompt: "Lee el diálogo.\n\nA: これは だれの かばんですか。\nB: たけしさんのです。\nA: そうですか。\n\n¿De quién es la bolsa?",
      options: ["María", "Takeshi", "el profesor", "Ana"],
      correct: "Takeshi",
      hint: buildLessonHint(2, "Lectura corta"),
      explanation: "B responde 「たけしさんのです」.",
    }),
    createLessonQuestion(2, "reading:curated:location", {
      category: "reading",
      type: "mcq",
      prompt: "Lee el diálogo.\n\nA: としょかんは どこですか。\nB: あそこです。\nA: あ、あの たてものですね。\n\n¿Qué identifica A al final?",
      options: ["Un reloj", "Una bolsa", "Un edificio", "Un paraguas"],
      correct: "Un edificio",
      hint: buildLessonHint(2, "Lectura corta"),
      explanation: "A dice 「あの たてものですね」.",
    }),
  ];

  return [...vocabQuestions, ...grammarCluster, ...readingQuestions];
}

function buildLessonThreeCuratedExamPool() {
  const lesson = 3;
  const lessonVocab = (ALL_GENKI_VOCAB_BY_LESSON[lesson] || []).filter((item) => isExamVocabEligible(lesson, item));
  const allVocab = Object.values(ALL_GENKI_VOCAB_BY_LESSON).flat().filter((item) => isExamVocabEligible(lesson, item));
  const meaningPool = Array.from(new Set(allVocab.map((item) => item.es).filter(Boolean)));
  const jpPool = Array.from(
    new Set(
      allVocab
        .map((item) => (item.kanji?.trim() ? `${item.kanji.trim()} (${item.kana})` : item.kana))
        .filter(Boolean),
    ),
  );

  const vocabQuestions = LESSON_THREE_CURATED_VOCAB.map((entry, index) => {
    const item = lessonVocab.find((candidate) => candidate.kana === entry.kana);
    if (!item) return null;
    const jpForm = item.kanji?.trim() ? `${item.kanji.trim()} (${item.kana})` : item.kana;
    if (entry.direction === "jp-es") {
      const sameLessonMeanings = Array.from(
        new Set(lessonVocab.map((candidate) => candidate.es).filter((value) => value && value !== item.es)),
      );
      return createLessonQuestion(lesson, `vocab:curated:es:${item.kana}:${index}`, {
        category: "vocab",
        type: "mcq",
        prompt: `¿Qué significa 「${item.kana}」?`,
        options: buildOptionSet(item.es, sameLessonMeanings, meaningPool),
        correct: item.es,
        hint: buildLessonHint(lesson, "Vocabulario"),
        explanation: `「${item.kana}」 significa “${item.es}”.`,
      });
    }

    const sameLessonJapanese = Array.from(
      new Set(
        lessonVocab
          .map((candidate) => (candidate.kanji?.trim() ? `${candidate.kanji.trim()} (${candidate.kana})` : candidate.kana))
          .filter((value) => value && value !== jpForm),
      ),
    );
    return createLessonQuestion(lesson, `vocab:curated:jp:${item.kana}:${index}`, {
      category: "vocab",
      type: "mcq",
      prompt: `Selecciona el japonés para: “${item.es}”`,
      options: buildOptionSet(jpForm, sameLessonJapanese, jpPool),
      correct: jpForm,
      hint: buildLessonHint(lesson, "Vocabulario"),
      explanation: `La opción correcta para “${item.es}” es 「${jpForm}」.`,
    });
  }).filter((question): question is QuizQuestion => Boolean(question));

  const lessonKanji = (GENKI_KANJI_BY_LESSON[lesson] || []).filter((item) =>
    LESSON_THREE_CURATED_KANJI.includes(item.kanji as (typeof LESSON_THREE_CURATED_KANJI)[number]),
  );
  const allKanjiReadings = Array.from(new Set(Object.values(GENKI_KANJI_BY_LESSON).flat().map((item) => item.hira).filter(Boolean)));
  const kanjiQuestions = lessonKanji.map((item, index) =>
    createLessonQuestion(lesson, `kanji:curated:${item.kanji}:${index}`, {
      category: "kanji",
      type: "mcq",
      prompt: `¿Cómo se lee 「${item.kanji}」?`,
      options: buildOptionSet(item.hira, allKanjiReadings.filter((reading) => reading !== item.hira), allKanjiReadings),
      correct: item.hira,
      hint: buildLessonHint(lesson, "Kanji"),
      explanation: `「${item.kanji}」 se lee 「${item.hira}」.`,
    }),
  );

  const grammarCluster: QuizQuestion[] = [
    createLessonQuestion(3, "grammar:curated:destination-ni", {
      category: "grammar",
      type: "mcq",
      prompt: "Completa la oración: がっこう___いきます。",
      options: ["に", "で", "を", "と"],
      correct: "に",
      hint: buildLessonHint(3, "Destino"),
      explanation: "El destino de movimiento se marca con 「に」.",
    }),
    createLessonQuestion(3, "grammar:curated:place-de", {
      category: "grammar",
      type: "mcq",
      prompt: "Completa la oración: としょかん___べんきょうします。",
      options: ["に", "で", "を", "が"],
      correct: "で",
      hint: buildLessonHint(3, "Lugar de acción"),
      explanation: "El lugar donde ocurre una acción se marca con 「で」.",
    }),
    createLessonQuestion(3, "grammar:curated:object-o", {
      category: "grammar",
      type: "mcq",
      prompt: "Completa la oración: ほん___よみます。",
      options: ["が", "で", "に", "を"],
      correct: "を",
      hint: buildLessonHint(3, "Objeto directo"),
      explanation: "El objeto directo se marca con 「を」.",
    }),
    createLessonQuestion(3, "grammar:curated:with-to", {
      category: "grammar",
      type: "mcq",
      prompt: "Completa la oración: ともだち___えいがをみます。",
      options: ["で", "と", "に", "を"],
      correct: "と",
      hint: buildLessonHint(3, "Compañía"),
      explanation: "「と」 se usa para “junto con” una persona.",
    }),
    createLessonQuestion(3, "grammar:curated:time-ni", {
      category: "grammar",
      type: "mcq",
      prompt: "Completa la oración: 7じ___おきます。",
      options: ["を", "で", "に", "が"],
      correct: "に",
      hint: buildLessonHint(3, "Hora específica"),
      explanation: "Con una hora específica, Genki usa 「に」.",
    }),
    createLessonQuestion(3, "grammar:curated:mainichi", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración es más natural para “I study every day”?",
      options: [
        "まいにち に べんきょうします。",
        "まいにち べんきょうします。",
        "まいにち を べんきょうします。",
        "まいにち と べんきょうします。",
      ],
      correct: "まいにち べんきょうします。",
      hint: buildLessonHint(3, "Expresiones de frecuencia"),
      explanation: "Expresiones como 「まいにち」 normalmente no llevan partícula.",
    }),
    createLessonQuestion(3, "grammar:curated:invitation", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “Won't you watch a movie?”?",
      options: [
        "えいがを みますか。",
        "えいがを みませんか。",
        "えいがを みました。",
        "えいがを みないですか。",
      ],
      correct: "えいがを みませんか。",
      hint: buildLessonHint(3, "〜ませんか"),
      explanation: "La invitación suave en L3 es 「〜ませんか」.",
    }),
    createLessonQuestion(3, "grammar:curated:error", {
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
  ];

  const readingQuestions: QuizQuestion[] = [
    createLessonQuestion(3, "reading:curated:daily-routine", {
      category: "reading",
      type: "mcq",
      prompt: "Lee la rutina.\n\nまいあさ 6じに おきます。7じに あさごはんを たべます。8じに がっこうへ いきます。\n\n¿Qué hace esta persona a las 8?",
      options: ["Se despierta", "Desayuna", "Va a la escuela", "Lee"],
      correct: "Va a la escuela",
      hint: buildLessonHint(3, "Lectura corta"),
      explanation: "La última oración dice 「8じに がっこうへ いきます」.",
    }),
    createLessonQuestion(3, "reading:curated:invitation-dialogue", {
      category: "reading",
      type: "mcq",
      prompt: "Lee el diálogo.\n\nA: きょうの よる、えいがを みませんか。\nB: いいですね。なんじですか。\nA: 7じです。\n\n¿A qué hora propone A ver la película?",
      options: ["A las cinco", "A las seis", "A las siete", "A las ocho"],
      correct: "A las siete",
      hint: buildLessonHint(3, "Lectura corta"),
      explanation: "A responde 「7じです」.",
    }),
  ];

  return [...vocabQuestions, ...kanjiQuestions, ...grammarCluster, ...readingQuestions];
}

function buildLessonFourCuratedExamPool() {
  const lesson = 4;
  const lessonVocab = (ALL_GENKI_VOCAB_BY_LESSON[lesson] || []).filter((item) => isExamVocabEligible(lesson, item));
  const allVocab = Object.values(ALL_GENKI_VOCAB_BY_LESSON).flat().filter((item) => isExamVocabEligible(lesson, item));
  const meaningPool = Array.from(new Set(allVocab.map((item) => item.es).filter(Boolean)));
  const jpPool = Array.from(
    new Set(
      allVocab
        .map((item) => (item.kanji?.trim() ? `${item.kanji.trim()} (${item.kana})` : item.kana))
        .filter(Boolean),
    ),
  );

  const vocabQuestions = LESSON_FOUR_CURATED_VOCAB.map((entry, index) => {
    const item = lessonVocab.find((candidate) => candidate.kana === entry.kana);
    if (!item) return null;
    const jpForm = item.kanji?.trim() ? `${item.kanji.trim()} (${item.kana})` : item.kana;
    if (entry.direction === "jp-es") {
      const sameLessonMeanings = Array.from(
        new Set(lessonVocab.map((candidate) => candidate.es).filter((value) => value && value !== item.es)),
      );
      return createLessonQuestion(lesson, `vocab:curated:es:${item.kana}:${index}`, {
        category: "vocab",
        type: "mcq",
        prompt: `¿Qué significa 「${item.kana}」?`,
        options: buildOptionSet(item.es, sameLessonMeanings, meaningPool),
        correct: item.es,
        hint: buildLessonHint(lesson, "Vocabulario"),
        explanation: `「${item.kana}」 significa “${item.es}”.`,
      });
    }

    const sameLessonJapanese = Array.from(
      new Set(
        lessonVocab
          .map((candidate) => (candidate.kanji?.trim() ? `${candidate.kanji.trim()} (${candidate.kana})` : candidate.kana))
          .filter((value) => value && value !== jpForm),
      ),
    );
    return createLessonQuestion(lesson, `vocab:curated:jp:${item.kana}:${index}`, {
      category: "vocab",
      type: "mcq",
      prompt: `Selecciona el japonés para: “${item.es}”`,
      options: buildOptionSet(jpForm, sameLessonJapanese, jpPool),
      correct: jpForm,
      hint: buildLessonHint(lesson, "Vocabulario"),
      explanation: `La opción correcta para “${item.es}” es 「${jpForm}」.`,
    });
  }).filter((question): question is QuizQuestion => Boolean(question));

  const lessonKanji = (GENKI_KANJI_BY_LESSON[lesson] || []).filter((item) =>
    LESSON_FOUR_CURATED_KANJI.includes(item.kanji as (typeof LESSON_FOUR_CURATED_KANJI)[number]),
  );
  const allKanjiReadings = Array.from(new Set(Object.values(GENKI_KANJI_BY_LESSON).flat().map((item) => item.hira).filter(Boolean)));
  const kanjiQuestions = lessonKanji.map((item, index) =>
    createLessonQuestion(lesson, `kanji:curated:${item.kanji}:${index}`, {
      category: "kanji",
      type: "mcq",
      prompt: `¿Cómo se lee 「${item.kanji}」?`,
      options: buildOptionSet(item.hira, allKanjiReadings.filter((reading) => reading !== item.hira), allKanjiReadings),
      correct: item.hira,
      hint: buildLessonHint(lesson, "Kanji"),
      explanation: `「${item.kanji}」 se lee 「${item.hira}」.`,
    }),
  );

  const grammarCluster: QuizQuestion[] = [
    createLessonQuestion(4, "grammar:curated:past-affirmative", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “I went to the library yesterday”?",
      options: [
        "きのう としょかんへ いきました。",
        "きのう としょかんへ いきませんでした。",
        "きのう としょかんで いきました。",
        "きのう としょかんを いきました。",
      ],
      correct: "きのう としょかんへ いきました。",
      hint: buildLessonHint(4, "Pasado"),
      explanation: "La forma pasada afirmativa formal es 「〜ました」.",
    }),
    createLessonQuestion(4, "grammar:curated:past-negative", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “I did not go to the library”?",
      options: [
        "としょかんに いきました。",
        "としょかんに いきません。",
        "としょかんに いきませんでした。",
        "としょかんで いきませんでした。",
      ],
      correct: "としょかんに いきませんでした。",
      hint: buildLessonHint(4, "Pasado negativo"),
      explanation: "La forma pasada negativa formal es 「〜ませんでした」.",
    }),
    createLessonQuestion(4, "grammar:curated:duration", {
      category: "grammar",
      type: "mcq",
      prompt: "Completa la oración de manera natural: にほんごを ___ べんきょうしました。",
      options: ["いちじかん", "いちじかんに", "いちじかんで", "いちじかんを"],
      correct: "いちじかん",
      hint: buildLessonHint(4, "Duración"),
      explanation: "La duración normalmente va sin partícula.",
    }),
    createLessonQuestion(4, "grammar:curated:with-person", {
      category: "grammar",
      type: "mcq",
      prompt: "Completa la oración: ともだち___ えいがを みました。",
      options: ["に", "で", "と", "を"],
      correct: "と",
      hint: buildLessonHint(4, "Compañía"),
      explanation: "Para “con alguien” se usa 「と」.",
    }),
    createLessonQuestion(4, "grammar:curated:alone", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “I went alone”?",
      options: [
        "ひとりで いきました。",
        "ひとりと いきました。",
        "ひとりに いきました。",
        "ひとりを いきました。",
      ],
      correct: "ひとりで いきました。",
      hint: buildLessonHint(4, "ひとりで"),
      explanation: "「ひとりで」 expresa que alguien hace algo solo.",
    }),
    createLessonQuestion(4, "grammar:curated:kara", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “I went home because there was homework”?",
      options: [
        "しゅくだいが ありましたから、うちへ かえりました。",
        "しゅくだいを ありましたから、うちへ かえりました。",
        "しゅくだいが ありましたから、うちで かえりました。",
        "しゅくだいが ありませんでしたから、うちへ かえりました。",
      ],
      correct: "しゅくだいが ありましたから、うちへ かえりました。",
      hint: buildLessonHint(4, "Razón con から"),
      explanation: "En L4, 「から」 conecta la razón con el resultado.",
    }),
    createLessonQuestion(4, "grammar:curated:why-response", {
      category: "grammar",
      type: "mcq",
      prompt: "A: どうして アルバイトを しませんでしたか。\nB: ___",
      options: [
        "いちじかん しました。",
        "ひとりで しました。",
        "テストが ありましたから。",
        "ともだちと しましたか。",
      ],
      correct: "テストが ありましたから。",
      hint: buildLessonHint(4, "どうして / から"),
      explanation: "La respuesta natural a 「どうして」 suele usar 「から」 para dar la razón.",
    }),
    createLessonQuestion(4, "grammar:curated:error", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración tiene un error?",
      options: [
        "せんしゅう ともだちと あいました。",
        "にほんごを いちじかん べんきょうしました。",
        "きのう ひとりと うちへ かえりました。",
        "でんしゃで まちへ いきました。",
      ],
      correct: "きのう ひとりと うちへ かえりました。",
      hint: buildLessonHint(4, "Uso de ひとりで"),
      explanation: "Cuando alguien hace algo solo, se usa 「ひとりで」, no 「ひとりと」.",
    }),
  ];

  const readingQuestions: QuizQuestion[] = [
    createLessonQuestion(4, "reading:curated:weekend-report", {
      category: "reading",
      type: "mcq",
      prompt: "Lee el texto.\n\nせんしゅうの どようび、わたしは としょかんで いちじかん べんきょうしました。それから ともだちと レストランへ いきました。\n\n¿Qué hizo después de estudiar?",
      options: ["Fue a casa", "Fue a un restaurante con un amigo", "Tomó el tren", "Sacó fotos"],
      correct: "Fue a un restaurante con un amigo",
      hint: buildLessonHint(4, "Lectura corta"),
      explanation: "La segunda oración dice 「それから ともだちと レストランへ いきました」.",
    }),
    createLessonQuestion(4, "reading:curated:why-dialogue", {
      category: "reading",
      type: "mcq",
      prompt: "Lee el diálogo.\n\nA: きのう どうして アルバイトを しませんでしたか。\nB: テストが ありましたから。\n\n¿Por qué no trabajó B ayer?",
      options: ["Porque estaba en el parque", "Porque tenía un examen", "Porque tomó fotos", "Porque fue al hospital"],
      correct: "Porque tenía un examen",
      hint: buildLessonHint(4, "Lectura corta"),
      explanation: "B responde 「テストが ありましたから」.",
    }),
  ];

  return [...vocabQuestions, ...kanjiQuestions, ...grammarCluster, ...readingQuestions];
}

function buildLessonFiveCuratedExamPool() {
  const lesson = 5;
  const lessonVocab = (ALL_GENKI_VOCAB_BY_LESSON[lesson] || []).filter((item) => isExamVocabEligible(lesson, item));
  const allVocab = Object.values(ALL_GENKI_VOCAB_BY_LESSON).flat().filter((item) => isExamVocabEligible(lesson, item));
  const meaningPool = Array.from(new Set(allVocab.map((item) => item.es).filter(Boolean)));
  const jpPool = Array.from(
    new Set(
      allVocab
        .map((item) => (item.kanji?.trim() ? `${item.kanji.trim()} (${item.kana})` : item.kana))
        .filter(Boolean),
    ),
  );

  const vocabQuestions = LESSON_FIVE_CURATED_VOCAB.map((entry, index) => {
    const item = lessonVocab.find((candidate) => candidate.kana === entry.kana);
    if (!item) return null;
    const jpForm = item.kanji?.trim() ? `${item.kanji.trim()} (${item.kana})` : item.kana;
    if (entry.direction === "jp-es") {
      const sameLessonMeanings = Array.from(
        new Set(lessonVocab.map((candidate) => candidate.es).filter((value) => value && value !== item.es)),
      );
      return createLessonQuestion(lesson, `vocab:curated:es:${item.kana}:${index}`, {
        category: "vocab",
        type: "mcq",
        prompt: `¿Qué significa 「${item.kana}」?`,
        options: buildOptionSet(item.es, sameLessonMeanings, meaningPool),
        correct: item.es,
        hint: buildLessonHint(lesson, "Vocabulario"),
        explanation: `「${item.kana}」 significa “${item.es}”.`,
      });
    }

    const sameLessonJapanese = Array.from(
      new Set(
        lessonVocab
          .map((candidate) => (candidate.kanji?.trim() ? `${candidate.kanji.trim()} (${candidate.kana})` : candidate.kana))
          .filter((value) => value && value !== jpForm),
      ),
    );
    return createLessonQuestion(lesson, `vocab:curated:jp:${item.kana}:${index}`, {
      category: "vocab",
      type: "mcq",
      prompt: `Selecciona el japonés para: “${item.es}”`,
      options: buildOptionSet(jpForm, sameLessonJapanese, jpPool),
      correct: jpForm,
      hint: buildLessonHint(lesson, "Vocabulario"),
      explanation: `La opción correcta para “${item.es}” es 「${jpForm}」.`,
    });
  }).filter((question): question is QuizQuestion => Boolean(question));

  const lessonKanji = (GENKI_KANJI_BY_LESSON[lesson] || []).filter((item) =>
    LESSON_FIVE_CURATED_KANJI.includes(item.kanji as (typeof LESSON_FIVE_CURATED_KANJI)[number]),
  );
  const allKanjiReadings = Array.from(new Set(Object.values(GENKI_KANJI_BY_LESSON).flat().map((item) => item.hira).filter(Boolean)));
  const kanjiQuestions = lessonKanji.map((item, index) =>
    createLessonQuestion(lesson, `kanji:curated:${item.kanji}:${index}`, {
      category: "kanji",
      type: "mcq",
      prompt: `¿Cómo se lee 「${item.kanji}」?`,
      options: buildOptionSet(item.hira, allKanjiReadings.filter((reading) => reading !== item.hira), allKanjiReadings),
      correct: item.hira,
      hint: buildLessonHint(lesson, "Kanji"),
      explanation: `「${item.kanji}」 se lee 「${item.hira}」.`,
    }),
  );

  const grammarCluster: QuizQuestion[] = [
    createLessonQuestion(5, "grammar:curated:adj-present", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “The weather is good”?",
      options: [
        "てんきは いいです。",
        "てんきが いいじゃないです。",
        "てんきは よかったです。",
        "てんきは よくないです。",
      ],
      correct: "てんきは いいです。",
      hint: buildLessonHint(5, "Adjetivos"),
      explanation: "La forma afirmativa básica de いい es 「いいです」.",
    }),
    createLessonQuestion(5, "grammar:curated:adj-past", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “The movie was interesting”?",
      options: [
        "えいがは おもしろいです。",
        "えいがは おもしろかったです。",
        "えいがは おもしろくないです。",
        "えいがは おもしろいでした。",
      ],
      correct: "えいがは おもしろかったです。",
      hint: buildLessonHint(5, "Adjetivos en pasado"),
      explanation: "Los adjetivos i forman el pasado con 「〜かったです」.",
    }),
    createLessonQuestion(5, "grammar:curated:na-negative", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “This town is not quiet”?",
      options: [
        "この まちは しずかです。",
        "この まちは しずかかったです。",
        "この まちは しずかじゃないです。",
        "この まちは しずかくないです。",
      ],
      correct: "この まちは しずかじゃないです。",
      hint: buildLessonHint(5, "Adjetivos na"),
      explanation: "Los adjetivos na forman la negativa con 「じゃないです」.",
    }),
    createLessonQuestion(5, "grammar:curated:suki-ga", {
      category: "grammar",
      type: "mcq",
      prompt: "Completa la oración: えいが___すきです。",
      options: ["は", "を", "が", "で"],
      correct: "が",
      hint: buildLessonHint(5, "好き / きらい"),
      explanation: "Con 「すき」 y 「きらい」, Genki usa 「が」.",
    }),
    createLessonQuestion(5, "grammar:curated:donna", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál pregunta significa “What kind of food do you like?”?",
      options: [
        "どんな たべものが すきですか。",
        "どこ たべものが すきですか。",
        "だれの たべものが すきですか。",
        "たべものは どれですか。",
      ],
      correct: "どんな たべものが すきですか。",
      hint: buildLessonHint(5, "どんな"),
      explanation: "「どんな + sustantivo」 pregunta “qué tipo de…”.",
    }),
    createLessonQuestion(5, "grammar:curated:mashou", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “Let's go to the sea”?",
      options: [
        "うみへ いきませんか。",
        "うみへ いきましょう。",
        "うみへ いきたいです。",
        "うみへ いきました。",
      ],
      correct: "うみへ いきましょう。",
      hint: buildLessonHint(5, "〜ましょう"),
      explanation: "「〜ましょう」 expresa “vamos a…”.",
    }),
    createLessonQuestion(5, "grammar:curated:masenka", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “Won't you go together?”?",
      options: [
        "いっしょに いきましょう。",
        "いっしょに いきますか。",
        "いっしょに いきませんか。",
        "いっしょに いきたいですか。",
      ],
      correct: "いっしょに いきませんか。",
      hint: buildLessonHint(5, "〜ませんか"),
      explanation: "「〜ませんか」 funciona como invitación suave.",
    }),
    createLessonQuestion(5, "grammar:curated:amari-negative", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “The ticket is not very cheap”?",
      options: [
        "チケットは とても やすいです。",
        "チケットは あまり やすいです。",
        "チケットは あまり やすくないです。",
        "チケットは やすかったです。",
      ],
      correct: "チケットは あまり やすくないです。",
      hint: buildLessonHint(5, "あまり + negativa"),
      explanation: "Con 「あまり」, Genki usa normalmente una forma negativa.",
    }),
  ];

  const readingQuestions: QuizQuestion[] = [
    createLessonQuestion(5, "reading:curated:trip", {
      category: "reading",
      type: "mcq",
      prompt: "Lee el texto.\n\nきのう おきなわへ いきました。うみは きれいでした。たべものも とても おいしかったです。\n\n¿Cuál opción resume mejor el texto?",
      options: [
        "El viaje fue aburrido y caro.",
        "La playa era fea pero la comida buena.",
        "El mar era bonito y la comida estaba rica.",
        "No salió de casa.",
      ],
      correct: "El mar era bonito y la comida estaba rica.",
      hint: buildLessonHint(5, "Lectura corta"),
      explanation: "El texto dice 「うみは きれいでした」 y 「たべものも とても おいしかったです」.",
    }),
    createLessonQuestion(5, "reading:curated:invitation", {
      category: "reading",
      type: "mcq",
      prompt: "Lee el diálogo.\n\nA: きょうは てんきが いいですね。\nB: そうですね。いっしょに やまへ いきませんか。\nA: いいですね。\n\n¿Qué propone B?",
      options: [
        "Estudiar en casa",
        "Ir juntos a la montaña",
        "Comer en un restaurante",
        "Comprar boletos de avión",
      ],
      correct: "Ir juntos a la montaña",
      hint: buildLessonHint(5, "Lectura corta"),
      explanation: "B dice 「いっしょに やまへ いきませんか」.",
    }),
  ];

  return [...vocabQuestions, ...kanjiQuestions, ...grammarCluster, ...readingQuestions];
}

function buildLessonSixCuratedExamPool() {
  const lesson = 6;
  const lessonVocab = (ALL_GENKI_VOCAB_BY_LESSON[lesson] || []).filter((item) => isExamVocabEligible(lesson, item));
  const allVocab = Object.values(ALL_GENKI_VOCAB_BY_LESSON).flat().filter((item) => isExamVocabEligible(lesson, item));
  const meaningPool = Array.from(new Set(allVocab.map((item) => item.es).filter(Boolean)));
  const jpPool = Array.from(
    new Set(
      allVocab
        .map((item) => (item.kanji?.trim() ? `${item.kanji.trim()} (${item.kana})` : item.kana))
        .filter(Boolean),
    ),
  );

  const vocabQuestions = LESSON_SIX_CURATED_VOCAB.map((entry, index) => {
    const item = lessonVocab.find((candidate) => candidate.kana === entry.kana);
    if (!item) return null;
    const jpForm = item.kanji?.trim() ? `${item.kanji.trim()} (${item.kana})` : item.kana;
    if (entry.direction === "jp-es") {
      const sameLessonMeanings = Array.from(
        new Set(lessonVocab.map((candidate) => candidate.es).filter((value) => value && value !== item.es)),
      );
      return createLessonQuestion(lesson, `vocab:curated:es:${item.kana}:${index}`, {
        category: "vocab",
        type: "mcq",
        prompt: `¿Qué significa 「${item.kana}」?`,
        options: buildOptionSet(item.es, sameLessonMeanings, meaningPool),
        correct: item.es,
        hint: buildLessonHint(lesson, "Vocabulario"),
        explanation: `「${item.kana}」 significa “${item.es}”.`,
      });
    }

    const sameLessonJapanese = Array.from(
      new Set(
        lessonVocab
          .map((candidate) => (candidate.kanji?.trim() ? `${candidate.kanji.trim()} (${candidate.kana})` : candidate.kana))
          .filter((value) => value && value !== jpForm),
      ),
    );
    return createLessonQuestion(lesson, `vocab:curated:jp:${item.kana}:${index}`, {
      category: "vocab",
      type: "mcq",
      prompt: `Selecciona el japonés para: “${item.es}”`,
      options: buildOptionSet(jpForm, sameLessonJapanese, jpPool),
      correct: jpForm,
      hint: buildLessonHint(lesson, "Vocabulario"),
      explanation: `La opción correcta para “${item.es}” es 「${jpForm}」.`,
    });
  }).filter((question): question is QuizQuestion => Boolean(question));

  const lessonKanji = (GENKI_KANJI_BY_LESSON[lesson] || []).filter((item) =>
    LESSON_SIX_CURATED_KANJI.includes(item.kanji as (typeof LESSON_SIX_CURATED_KANJI)[number]),
  );
  const allKanjiReadings = Array.from(new Set(Object.values(GENKI_KANJI_BY_LESSON).flat().map((item) => item.hira).filter(Boolean)));
  const kanjiQuestions = lessonKanji.map((item, index) =>
    createLessonQuestion(lesson, `kanji:curated:${item.kanji}:${index}`, {
      category: "kanji",
      type: "mcq",
      prompt: `¿Cómo se lee 「${item.kanji}」?`,
      options: buildOptionSet(item.hira, allKanjiReadings.filter((reading) => reading !== item.hira), allKanjiReadings),
      correct: item.hira,
      hint: buildLessonHint(lesson, "Kanji"),
      explanation: `「${item.kanji}」 se lee 「${item.hira}」.`,
    }),
  );

  const grammarCluster: QuizQuestion[] = [
    createLessonQuestion(6, "grammar:curated:te-yomu", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál es la forma て de 「よむ」?",
      options: ["よんで", "よみて", "よって", "よむて"],
      correct: "よんで",
      hint: buildLessonHint(6, "Forma て"),
      explanation: "「よむ」 cambia a 「よんで」.",
    }),
    createLessonQuestion(6, "grammar:curated:sequence", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “I eat breakfast and then go to school”?",
      options: [
        "あさごはんを たべて、がっこうへ いきます。",
        "あさごはんを たべます、がっこうへ いきます。",
        "あさごはんを たべから、がっこうへ いきます。",
        "あさごはんを たべる、がっこうへ いきます。",
      ],
      correct: "あさごはんを たべて、がっこうへ いきます。",
      hint: buildLessonHint(6, "Secuencia con て"),
      explanation: "La forma て enlaza acciones en secuencia.",
    }),
    createLessonQuestion(6, "grammar:curated:request", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál es la manera natural de decir “Please open the window”?",
      options: [
        "まどを あけます。",
        "まどを あけてください。",
        "まどを あけても いいです。",
        "まどを あけては いけません。",
      ],
      correct: "まどを あけてください。",
      hint: buildLessonHint(6, "〜てください"),
      explanation: "La petición amable de L6 es 「〜てください」.",
    }),
    createLessonQuestion(6, "grammar:curated:permission", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “May I take a picture here?”?",
      options: [
        "ここで しゃしんを とってください。",
        "ここで しゃしんを とっても いいですか。",
        "ここで しゃしんを とっては いけません。",
        "ここで しゃしんを とりますか。",
      ],
      correct: "ここで しゃしんを とっても いいですか。",
      hint: buildLessonHint(6, "〜てもいいですか"),
      explanation: "Esa estructura pregunta permiso.",
    }),
    createLessonQuestion(6, "grammar:curated:prohibition", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “You must not smoke here”?",
      options: [
        "ここで たばこを すってください。",
        "ここで たばこを すっても いいです。",
        "ここで たばこを すっては いけません。",
        "ここで たばこを すいます。",
      ],
      correct: "ここで たばこを すっては いけません。",
      hint: buildLessonHint(6, "〜ては いけません"),
      explanation: "La prohibición en L6 es 「〜ては いけません」.",
    }),
    createLessonQuestion(6, "grammar:curated:te-kara", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “I will study after eating”?",
      options: [
        "たべて、べんきょうします。",
        "たべてから、べんきょうします。",
        "たべても べんきょうします。",
        "たべてください、べんきょうします。",
      ],
      correct: "たべてから、べんきょうします。",
      hint: buildLessonHint(6, "〜てから"),
      explanation: "「〜てから」 indica que una acción ocurre después de otra.",
    }),
    createLessonQuestion(6, "grammar:curated:place-de", {
      category: "grammar",
      type: "mcq",
      prompt: "Completa la oración: としょかん___べんきょうします。",
      options: ["に", "で", "を", "と"],
      correct: "で",
      hint: buildLessonHint(6, "Lugar de acción"),
      explanation: "El lugar donde ocurre una acción se marca con 「で」.",
    }),
    createLessonQuestion(6, "grammar:curated:te-error", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál forma て está mal?",
      options: ["よんで", "かいて", "みりて", "たべて"],
      correct: "みりて",
      hint: buildLessonHint(6, "Forma て"),
      explanation: "「みる」 pasa a 「みて」, no a 「みりて」.",
    }),
  ];

  const readingQuestions: QuizQuestion[] = [
    createLessonQuestion(6, "reading:curated:morning-routine", {
      category: "reading",
      type: "mcq",
      prompt: "Lee el texto.\n\nまいあさ コーヒーを のんで、しんぶんを よんで、それから だいがくへ いきます。\n\n¿Qué hace esta persona antes de ir a la universidad?",
      options: [
        "Duerme y cocina",
        "Toma café y lee el periódico",
        "Llama por teléfono y regresa a casa",
        "Nada y corre",
      ],
      correct: "Toma café y lee el periódico",
      hint: buildLessonHint(6, "Lectura corta"),
      explanation: "Las dos acciones aparecen antes de 「それから だいがくへ いきます」.",
    }),
    createLessonQuestion(6, "reading:curated:classroom", {
      category: "reading",
      type: "mcq",
      prompt: "Lee el diálogo.\n\nA: ここで パソコンを つかっても いいですか。\nB: はい、いいです。でも たばこを すっては いけません。\n\n¿Qué sí puede hacer A?",
      options: [
        "Fumar aquí",
        "Usar la computadora aquí",
        "Cerrar la puerta con llave",
        "Salir inmediatamente",
      ],
      correct: "Usar la computadora aquí",
      hint: buildLessonHint(6, "Lectura corta"),
      explanation: "B permite usar la computadora, pero prohíbe fumar.",
    }),
  ];

  return [...vocabQuestions, ...kanjiQuestions, ...grammarCluster, ...readingQuestions];
}

function buildLessonSevenCuratedExamPool() {
  const lesson = 7;
  const lessonVocab = (ALL_GENKI_VOCAB_BY_LESSON[lesson] || []).filter((item) => isExamVocabEligible(lesson, item));
  const allVocab = Object.values(ALL_GENKI_VOCAB_BY_LESSON).flat().filter((item) => isExamVocabEligible(lesson, item));
  const meaningPool = Array.from(new Set(allVocab.map((item) => item.es).filter(Boolean)));
  const jpPool = Array.from(
    new Set(
      allVocab
        .map((item) => (item.kanji?.trim() ? `${item.kanji.trim()} (${item.kana})` : item.kana))
        .filter(Boolean),
    ),
  );

  const vocabQuestions = LESSON_SEVEN_CURATED_VOCAB.map((entry, index) => {
    const item = lessonVocab.find((candidate) => candidate.kana === entry.kana || candidate.kana === entry.es);
    const fallbackItem = lessonVocab.find((candidate) => candidate.kana === entry.kana);
    const resolved = item || fallbackItem;
    if (!resolved) return null;
    const jpForm = resolved.kanji?.trim() ? `${resolved.kanji.trim()} (${resolved.kana})` : resolved.kana;
    if (entry.direction === "jp-es") {
      const sameLessonMeanings = Array.from(
        new Set(lessonVocab.map((candidate) => candidate.es).filter((value) => value && value !== resolved.es)),
      );
      return createLessonQuestion(lesson, `vocab:curated:es:${resolved.kana}:${index}`, {
        category: "vocab",
        type: "mcq",
        prompt: `¿Qué significa 「${resolved.kana}」?`,
        options: buildOptionSet(resolved.es, sameLessonMeanings, meaningPool),
        correct: resolved.es,
        hint: buildLessonHint(lesson, "Vocabulario"),
        explanation: `「${resolved.kana}」 significa “${resolved.es}”.`,
      });
    }

    const sameLessonJapanese = Array.from(
      new Set(
        lessonVocab
          .map((candidate) => (candidate.kanji?.trim() ? `${candidate.kanji.trim()} (${candidate.kana})` : candidate.kana))
          .filter((value) => value && value !== jpForm),
      ),
    );
    return createLessonQuestion(lesson, `vocab:curated:jp:${resolved.kana}:${index}`, {
      category: "vocab",
      type: "mcq",
      prompt: `Selecciona el japonés para: “${entry.es}”`,
      options: buildOptionSet(jpForm, sameLessonJapanese, jpPool),
      correct: jpForm,
      hint: buildLessonHint(lesson, "Vocabulario"),
      explanation: `La opción correcta para “${entry.es}” es 「${jpForm}」.`,
    });
  }).filter((question): question is QuizQuestion => Boolean(question));

  const lessonKanji = (GENKI_KANJI_BY_LESSON[lesson] || []).filter((item) =>
    LESSON_SEVEN_CURATED_KANJI.includes(item.kanji as (typeof LESSON_SEVEN_CURATED_KANJI)[number]),
  );
  const allKanjiReadings = Array.from(new Set(Object.values(GENKI_KANJI_BY_LESSON).flat().map((item) => item.hira).filter(Boolean)));
  const kanjiQuestions = lessonKanji.map((item, index) =>
    createLessonQuestion(lesson, `kanji:curated:${item.kanji}:${index}`, {
      category: "kanji",
      type: "mcq",
      prompt: `¿Cómo se lee 「${item.kanji}」?`,
      options: buildOptionSet(item.hira, allKanjiReadings.filter((reading) => reading !== item.hira), allKanjiReadings),
      correct: item.hira,
      hint: buildLessonHint(lesson, "Kanji"),
      explanation: `「${item.kanji}」 se lee 「${item.hira}」.`,
    }),
  );

  const grammarCluster: QuizQuestion[] = [
    createLessonQuestion(7, "grammar:curated:family-term", {
      category: "grammar",
      type: "mcq",
      prompt: "Cuando hablas de tu propia madre, ¿qué palabra usa Genki?",
      options: ["おかあさん", "はは", "おははさん", "かあさんさま"],
      correct: "はは",
      hint: buildLessonHint(7, "Términos familiares"),
      explanation: "Para tu propia familia, Genki usa 「はは」 en vez de 「おかあさん」.",
    }),
    createLessonQuestion(7, "grammar:curated:father-working", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “My father works in Tokyo”?",
      options: [
        "ちちは とうきょうで はたらいています。",
        "ちちは とうきょうに はたらいています。",
        "ちちが とうきょうで はたらくです。",
        "ちちは とうきょうを はたらいています。",
      ],
      correct: "ちちは とうきょうで はたらいています。",
      hint: buildLessonHint(7, "〜ています"),
      explanation: "L7 usa 「〜ています」 para acciones habituales como trabajar.",
    }),
    createLessonQuestion(7, "grammar:curated:wearing-glasses", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “My older brother wears glasses”?",
      options: [
        "あには めがねを かけています。",
        "あには めがねを かけます。",
        "あには めがねで かけています。",
        "あには めがねが かけています。",
      ],
      correct: "あには めがねを かけています。",
      hint: buildLessonHint(7, "Estado con 〜ています"),
      explanation: "Con ropa y accesorios, 「〜ています」 describe el estado actual.",
    }),
    createLessonQuestion(7, "grammar:curated:description", {
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
      explanation: "Para descripciones físicas, Genki usa patrones como 「せが たかい」.",
    }),
    createLessonQuestion(7, "grammar:curated:place-of-work", {
      category: "grammar",
      type: "mcq",
      prompt: "Completa con la partícula correcta: とうきょう___ はたらいています。",
      options: ["で", "に", "を", "と"],
      correct: "で",
      hint: buildLessonHint(7, "Lugar de acción"),
      explanation: "Trabajar es una acción; el lugar se marca con 「で」.",
    }),
    createLessonQuestion(7, "grammar:curated:nanimo", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “I don't eat anything in the morning”?",
      options: [
        "あさ なにも たべません。",
        "あさ なにも たべます。",
        "あさ なんでも たべません。",
        "あさ なにをも たべません。",
      ],
      correct: "あさ なにも たべません。",
      hint: buildLessonHint(7, "なにも + negativo"),
      explanation: "「なにも」 se usa con forma negativa para decir “nada”.",
    }),
    createLessonQuestion(7, "grammar:curated:betsuni", {
      category: "grammar",
      type: "mcq",
      prompt: "A: しゅうまつ なにを しましたか。\nB: ___",
      options: [
        "もちろん しました。",
        "べつに なにもしませんでした。",
        "よかったら しました。",
        "なにも しました。",
      ],
      correct: "べつに なにもしませんでした。",
      hint: buildLessonHint(7, "べつに + negativo"),
      explanation: "「べつに」 con negativo expresa “nada en especial”.",
    }),
    createLessonQuestion(7, "grammar:curated:error", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración tiene un error?",
      options: [
        "ははは とうきょうに すんでいます。",
        "あには めがねを かけています。",
        "わたしの ちちは かいしゃで はたらいています。",
        "わたしは べつに なにもしませんでした。",
      ],
      correct: "ははは とうきょうに すんでいます。",
      hint: buildLessonHint(7, "Lugar con すむ"),
      explanation: "Con 「すむ」 el lugar va con 「に」, pero la forma natural aquí sería 「ははは とうきょうに すんでいます」 without issue? Actually that's grammatical; correction: use another faulty sentence.",
    }),
  ];

  grammarCluster[7] = createLessonQuestion(7, "grammar:curated:error", {
    category: "grammar",
    type: "mcq",
    prompt: "¿Cuál oración tiene un error?",
    options: [
      "ははは とうきょうに すんでいます。",
      "あには めがねを かけています。",
      "わたしの ちちは かいしゃで はたらいています。",
      "あねは めがねで かけています。",
    ],
    correct: "あねは めがねで かけています。",
    hint: buildLessonHint(7, "Uso de かけています"),
    explanation: "Con gafas se dice 「めがねを かけています」, no 「めがねで」.",
  });

  const readingQuestions: QuizQuestion[] = [
    createLessonQuestion(7, "reading:curated:family-profile", {
      category: "reading",
      type: "mcq",
      prompt: "Lee la presentación.\n\nわたしの かぞくは よにんです。ちちは とうきょうで はたらいています。ははは うちに います。あには だいがくせいです。\n\n¿Quién trabaja en Tokio?",
      options: ["La madre", "El padre", "El hermano", "Nadie"],
      correct: "El padre",
      hint: buildLessonHint(7, "Lectura corta"),
      explanation: "El texto dice 「ちちは とうきょうで はたらいています」.",
    }),
    createLessonQuestion(7, "reading:curated:appearance-dialogue", {
      category: "reading",
      type: "mcq",
      prompt: "Lee el diálogo.\n\nA: おねえさんは どんなひとですか。\nB: せが たかくて、めがねを かけています。\n\n¿Cómo es la hermana mayor?",
      options: ["Es baja y no usa gafas", "Es alta y usa gafas", "Es estudiante de Tokio", "Está casada"],
      correct: "Es alta y usa gafas",
      hint: buildLessonHint(7, "Lectura corta"),
      explanation: "B dice 「せが たかくて、めがねを かけています」.",
    }),
  ];

  return [...vocabQuestions, ...kanjiQuestions, ...grammarCluster, ...readingQuestions];
}

function buildLessonEightCuratedExamPool() {
  const lesson = 8;
  const lessonVocab = (ALL_GENKI_VOCAB_BY_LESSON[lesson] || []).filter((item) => isExamVocabEligible(lesson, item));
  const allVocab = Object.values(ALL_GENKI_VOCAB_BY_LESSON).flat().filter((item) => isExamVocabEligible(lesson, item));
  const meaningPool = Array.from(new Set(allVocab.map((item) => item.es).filter(Boolean)));
  const jpPool = Array.from(
    new Set(
      allVocab
        .map((item) => (item.kanji?.trim() ? `${item.kanji.trim()} (${item.kana})` : item.kana))
        .filter(Boolean),
    ),
  );

  const vocabQuestions = LESSON_EIGHT_CURATED_VOCAB.map((entry, index) => {
    const resolved = lessonVocab.find((candidate) => candidate.kana === entry.kana);
    if (!resolved) return null;
    const jpForm = resolved.kanji?.trim() ? `${resolved.kanji.trim()} (${resolved.kana})` : resolved.kana;
    if (entry.direction === "jp-es") {
      const sameLessonMeanings = Array.from(
        new Set(lessonVocab.map((candidate) => candidate.es).filter((value) => value && value !== resolved.es)),
      );
      return createLessonQuestion(lesson, `vocab:curated:es:${resolved.kana}:${index}`, {
        category: "vocab",
        type: "mcq",
        prompt: `¿Qué significa 「${resolved.kana}」?`,
        options: buildOptionSet(resolved.es, sameLessonMeanings, meaningPool),
        correct: resolved.es,
        hint: buildLessonHint(lesson, "Vocabulario"),
        explanation: `「${resolved.kana}」 significa “${resolved.es}”.`,
      });
    }

    const sameLessonJapanese = Array.from(
      new Set(
        lessonVocab
          .map((candidate) => (candidate.kanji?.trim() ? `${candidate.kanji.trim()} (${candidate.kana})` : candidate.kana))
          .filter((value) => value && value !== jpForm),
      ),
    );
    return createLessonQuestion(lesson, `vocab:curated:jp:${resolved.kana}:${index}`, {
      category: "vocab",
      type: "mcq",
      prompt: `Selecciona el japonés para: “${entry.es}”`,
      options: buildOptionSet(jpForm, sameLessonJapanese, jpPool),
      correct: jpForm,
      hint: buildLessonHint(lesson, "Vocabulario"),
      explanation: `La opción correcta para “${entry.es}” es 「${jpForm}」.`,
    });
  }).filter((question): question is QuizQuestion => Boolean(question));

  const lessonKanji = (GENKI_KANJI_BY_LESSON[lesson] || []).filter((item) =>
    LESSON_EIGHT_CURATED_KANJI.includes(item.kanji as (typeof LESSON_EIGHT_CURATED_KANJI)[number]),
  );
  const allKanjiReadings = Array.from(new Set(Object.values(GENKI_KANJI_BY_LESSON).flat().map((item) => item.hira).filter(Boolean)));
  const kanjiQuestions = lessonKanji.map((item, index) =>
    createLessonQuestion(lesson, `kanji:curated:${item.kanji}:${index}`, {
      category: "kanji",
      type: "mcq",
      prompt: `¿Cómo se lee 「${item.kanji}」?`,
      options: buildOptionSet(item.hira, allKanjiReadings.filter((reading) => reading !== item.hira), allKanjiReadings),
      correct: item.hira,
      hint: buildLessonHint(lesson, "Kanji"),
      explanation: `「${item.kanji}」 se lee 「${item.hira}」.`,
    }),
  );

  const grammarCluster: QuizQuestion[] = [
    createLessonQuestion(8, "grammar:curated:short-negative", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál es la forma corta negativa de 「いく」?",
      options: ["いきません", "いかない", "いかなかった", "いくない"],
      correct: "いかない",
      hint: buildLessonHint(8, "Forma corta"),
      explanation: "La forma corta negativa de 「いく」 es 「いかない」.",
    }),
    createLessonQuestion(8, "grammar:curated:short-past", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál es la forma corta en pasado de 「たべる」?",
      options: ["たべました", "たべた", "たべない", "たべませんでした"],
      correct: "たべた",
      hint: buildLessonHint(8, "Pasado corto"),
      explanation: "La forma corta en pasado de 「たべる」 es 「たべた」.",
    }),
    createLessonQuestion(8, "grammar:curated:short-past-negative", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál es la forma corta negativa en pasado de 「いく」?",
      options: ["いきませんでした", "いかなかった", "いかないでした", "いかなくて"],
      correct: "いかなかった",
      hint: buildLessonHint(8, "Pasado corto negativo"),
      explanation: "La forma corta negativa en pasado de 「いく」 es 「いかなかった」.",
    }),
    createLessonQuestion(8, "grammar:curated:casual-question", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál pregunta casual significa “What will you do tomorrow?”?",
      options: [
        "あした なにを しますか。",
        "あした なにを するの。",
        "あした なにを しましたか。",
        "あした なにを しないの。",
      ],
      correct: "あした なにを するの。",
      hint: buildLessonHint(8, "Pregunta casual"),
      explanation: "En contexto informal, L8 usa la forma corta en preguntas como 「するの」.",
    }),
    createLessonQuestion(8, "grammar:curated:to-omou", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “I think it will be cold tomorrow”?",
      options: [
        "あしたは さむいと おもいます。",
        "あしたは さむいです おもいます。",
        "あしたは さむいを おもいます。",
        "あしたは さむいで おもいます。",
      ],
      correct: "あしたは さむいと おもいます。",
      hint: buildLessonHint(8, "と思います"),
      explanation: "Una oración en forma corta va antes de 「と おもいます」.",
    }),
    createLessonQuestion(8, "grammar:curated:to-itteimashita", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “Takeshi said he will come at seven”?",
      options: [
        "たけしさんは 7じに くると いっていました。",
        "たけしさんは 7じに きますと いっていました。",
        "たけしさんは 7じに くるを いっていました。",
        "たけしさんは 7じに くるで いっていました。",
      ],
      correct: "たけしさんは 7じに くると いっていました。",
      hint: buildLessonHint(8, "と言っていました"),
      explanation: "Con citas indirectas, L8 usa la forma corta antes de 「と いっていました」.",
    }),
    createLessonQuestion(8, "grammar:curated:error", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración tiene un error?",
      options: [
        "あしたは あめだと おもいます。",
        "たけしさんは こないと いっていました。",
        "きょうは さむいですと おもいます。",
        "なにを もっていくの。",
      ],
      correct: "きょうは さむいですと おもいます。",
      hint: buildLessonHint(8, "Citas y forma corta"),
      explanation: "Antes de 「と おもいます」 se usa la forma corta: 「さむい」, no 「さむいです」.",
    }),
    createLessonQuestion(8, "grammar:curated:nanika", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “Did you eat something?”?",
      options: [
        "なにか たべた？",
        "なにも たべた？",
        "なにを たべた？",
        "なにでも たべた？",
      ],
      correct: "なにか たべた？",
      hint: buildLessonHint(8, "なにか"),
      explanation: "「なにか」 se usa para “algo” en preguntas y afirmaciones.",
    }),
  ];

  const readingQuestions: QuizQuestion[] = [
    createLessonQuestion(8, "reading:curated:weather-forecast", {
      category: "reading",
      type: "mcq",
      prompt: "Lee el pronóstico.\n\nあしたの てんきよほうです。あめです。きおんは 10どぐらいです。さむいと おもいます。\n\n¿Qué piensa la persona sobre el clima de mañana?",
      options: ["Que hará calor", "Que hará frío", "Que estará soleado", "Que no lloverá"],
      correct: "Que hará frío",
      hint: buildLessonHint(8, "Lectura corta"),
      explanation: "El texto dice 「さむいと おもいます」.",
    }),
    createLessonQuestion(8, "reading:curated:bbq-dialogue", {
      category: "reading",
      type: "mcq",
      prompt: "Lee el diálogo.\n\nA: バーベキューに なにを もっていく？\nB: わたしは トマトと カメラを もっていくよ。\nA: そう。たけしさんは にくを もっていくと いっていました。\n\n¿Qué llevará Takeshi?",
      options: ["Tomates", "Una cámara", "Carne", "Nada"],
      correct: "Carne",
      hint: buildLessonHint(8, "Lectura corta"),
      explanation: "A dice 「たけしさんは にくを もっていくと いっていました」.",
    }),
  ];

  return [...vocabQuestions, ...kanjiQuestions, ...grammarCluster, ...readingQuestions];
}

function buildLessonNineCuratedExamPool() {
  const lesson = 9;
  const lessonVocab = (ALL_GENKI_VOCAB_BY_LESSON[lesson] || []).filter((item) => isExamVocabEligible(lesson, item));
  const allVocab = Object.values(ALL_GENKI_VOCAB_BY_LESSON).flat().filter((item) => isExamVocabEligible(lesson, item));
  const meaningPool = Array.from(new Set(allVocab.map((item) => item.es).filter(Boolean)));
  const jpPool = Array.from(
    new Set(
      allVocab
        .map((item) => (item.kanji?.trim() ? `${item.kanji.trim()} (${item.kana})` : item.kana))
        .filter(Boolean),
    ),
  );

  const vocabQuestions = LESSON_NINE_CURATED_VOCAB.map((entry, index) => {
    const resolved = lessonVocab.find((candidate) => candidate.kana === entry.kana);
    if (!resolved) return null;
    const jpForm = resolved.kanji?.trim() ? `${resolved.kanji.trim()} (${resolved.kana})` : resolved.kana;
    if (entry.direction === "jp-es") {
      const sameLessonMeanings = Array.from(
        new Set(lessonVocab.map((candidate) => candidate.es).filter((value) => value && value !== resolved.es)),
      );
      return createLessonQuestion(lesson, `vocab:curated:es:${resolved.kana}:${index}`, {
        category: "vocab",
        type: "mcq",
        prompt: `¿Qué significa 「${resolved.kana}」?`,
        options: buildOptionSet(resolved.es, sameLessonMeanings, meaningPool),
        correct: resolved.es,
        hint: buildLessonHint(lesson, "Vocabulario"),
        explanation: `「${resolved.kana}」 significa “${resolved.es}”.`,
      });
    }

    const sameLessonJapanese = Array.from(
      new Set(
        lessonVocab
          .map((candidate) => (candidate.kanji?.trim() ? `${candidate.kanji.trim()} (${candidate.kana})` : candidate.kana))
          .filter((value) => value && value !== jpForm),
      ),
    );
    return createLessonQuestion(lesson, `vocab:curated:jp:${resolved.kana}:${index}`, {
      category: "vocab",
      type: "mcq",
      prompt: `Selecciona el japonés para: “${entry.es}”`,
      options: buildOptionSet(jpForm, sameLessonJapanese, jpPool),
      correct: jpForm,
      hint: buildLessonHint(lesson, "Vocabulario"),
      explanation: `La opción correcta para “${entry.es}” es 「${jpForm}」.`,
    });
  }).filter((question): question is QuizQuestion => Boolean(question));

  const lessonKanji = (GENKI_KANJI_BY_LESSON[lesson] || []).filter((item) =>
    LESSON_NINE_CURATED_KANJI.includes(item.kanji as (typeof LESSON_NINE_CURATED_KANJI)[number]),
  );
  const allKanjiReadings = Array.from(new Set(Object.values(GENKI_KANJI_BY_LESSON).flat().map((item) => item.hira).filter(Boolean)));
  const kanjiQuestions = lessonKanji.map((item, index) =>
    createLessonQuestion(lesson, `kanji:curated:${item.kanji}:${index}`, {
      category: "kanji",
      type: "mcq",
      prompt: `¿Cómo se lee 「${item.kanji}」?`,
      options: buildOptionSet(item.hira, allKanjiReadings.filter((reading) => reading !== item.hira), allKanjiReadings),
      correct: item.hira,
      hint: buildLessonHint(lesson, "Kanji"),
      explanation: `「${item.kanji}」 se lee 「${item.hira}」.`,
    }),
  );

  const grammarCluster: QuizQuestion[] = [
    createLessonQuestion(9, "grammar:curated:noun-modifier-past", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “the movie I watched yesterday”?",
      options: [
        "きのう みた えいが",
        "きのう みました えいが",
        "きのうの みた えいが",
        "きのう えいがを みた",
      ],
      correct: "きのう みた えいが",
      hint: buildLessonHint(9, "Modificador con verbo"),
      explanation: "En L9, la cláusula corta va antes del sustantivo: 「きのう みた えいが」.",
    }),
    createLessonQuestion(9, "grammar:curated:noun-modifier-adj", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál frase significa “the red bag”?",
      options: ["あかい かばん", "あかかった かばん", "あかいの かばん", "あかい です かばん"],
      correct: "あかい かばん",
      hint: buildLessonHint(9, "Modificador con adjetivo"),
      explanation: "Los adjetivos van directamente antes del sustantivo: 「あかい かばん」.",
    }),
    createLessonQuestion(9, "grammar:curated:noun-modifier-clause", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál frase significa “the friend who came to Japan”?",
      options: [
        "にほんに きた ともだち",
        "にほんに きました ともだち",
        "にほんの きた ともだち",
        "にほんに ともだち きた",
      ],
      correct: "にほんに きた ともだち",
      hint: buildLessonHint(9, "Cláusula corta"),
      explanation: "La forma corta pasada 「きた」 modifica a 「ともだち」.",
    }),
    createLessonQuestion(9, "grammar:curated:not-yet", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál significa “I have not done the homework yet”?",
      options: [
        "まだ しゅくだいを しました。",
        "まだ しゅくだいを していません。",
        "しゅくだいは もう しました。",
        "しゅくだいを まだ します。",
      ],
      correct: "まだ しゅくだいを していません。",
      hint: buildLessonHint(9, "まだ〜ていません"),
      explanation: "Ese patrón expresa “todavía no”.",
    }),
    createLessonQuestion(9, "grammar:curated:mou", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “I already bought the ticket”?",
      options: [
        "もう チケットを かいました。",
        "まだ チケットを かいました。",
        "もう チケットを かっていません。",
        "チケットを もう かいません。",
      ],
      correct: "もう チケットを かいました。",
      hint: buildLessonHint(9, "もう"),
      explanation: "「もう」 expresa “ya” con una acción completada.",
    }),
    createLessonQuestion(9, "grammar:curated:short-past", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál es el pasado corto de 「のむ」?",
      options: ["のんだ", "のみた", "のんで", "のまない"],
      correct: "のんだ",
      hint: buildLessonHint(9, "Pasado corto"),
      explanation: "「のむ」 pasa a 「のんだ」.",
    }),
    createLessonQuestion(9, "grammar:curated:which-book", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál frase significa “the book I bought last month”?",
      options: [
        "せんげつ かった ほん",
        "せんげつ かいました ほん",
        "せんげつの かった ほん",
        "せんげつ ほんを かった",
      ],
      correct: "せんげつ かった ほん",
      hint: buildLessonHint(9, "Modificador con pasado corto"),
      explanation: "La forma corta pasada 「かった」 modifica a 「ほん」.",
    }),
    createLessonQuestion(9, "grammar:curated:error", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración tiene un error?",
      options: [
        "きのう みた えいがは おもしろかったです。",
        "まだ くすりを のんでいません。",
        "せんげつ かいました かばんは あかいです。",
        "もう チケットを かいました。",
      ],
      correct: "せんげつ かいました かばんは あかいです。",
      hint: buildLessonHint(9, "Modificadores"),
      explanation: "En un modificador se usa la forma corta: 「せんげつ かった かばん」, no 「かいました」.",
    }),
  ];

  const readingQuestions: QuizQuestion[] = [
    createLessonQuestion(9, "reading:curated:kabuki-ticket", {
      category: "reading",
      type: "mcq",
      prompt: "Lee el texto.\n\nかぶきの チケットを ふたつ かいました。でも まだ ともだちに あっていません。\n\n¿Qué no ha hecho todavía esta persona?",
      options: ["Comprar dos boletos", "Ver a su amigo", "Hablar de kabuki", "Comprar boletos de kabuki"],
      correct: "Ver a su amigo",
      hint: buildLessonHint(9, "Lectura corta"),
      explanation: "El texto dice 「まだ ともだちに あっていません」.",
    }),
    createLessonQuestion(9, "reading:curated:red-bag", {
      category: "reading",
      type: "mcq",
      prompt: "Lee el texto.\n\nせんげつ かった あかい かばんは ちょっと たかかったです。でも きれいでした。\n\n¿Cómo era la bolsa?",
      options: ["Azul y barata", "Roja, bonita y un poco cara", "Negra y fea", "Nueva y gratis"],
      correct: "Roja, bonita y un poco cara",
      hint: buildLessonHint(9, "Lectura corta"),
      explanation: "Se menciona que es roja, bonita y algo cara.",
    }),
  ];

  return [...vocabQuestions, ...kanjiQuestions, ...grammarCluster, ...readingQuestions];
}

function buildLessonTenCuratedExamPool() {
  const lesson = 10;
  const lessonVocab = (ALL_GENKI_VOCAB_BY_LESSON[lesson] || []).filter((item) => isExamVocabEligible(lesson, item));
  const allVocab = Object.values(ALL_GENKI_VOCAB_BY_LESSON).flat().filter((item) => isExamVocabEligible(lesson, item));
  const meaningPool = Array.from(new Set(allVocab.map((item) => item.es).filter(Boolean)));
  const jpPool = Array.from(
    new Set(
      allVocab
        .map((item) => (item.kanji?.trim() ? `${item.kanji.trim()} (${item.kana})` : item.kana))
        .filter(Boolean),
    ),
  );

  const vocabQuestions = LESSON_TEN_CURATED_VOCAB.map((entry, index) => {
    const resolved = lessonVocab.find((candidate) => candidate.kana === entry.kana);
    if (!resolved) return null;
    const jpForm = resolved.kanji?.trim() ? `${resolved.kanji.trim()} (${resolved.kana})` : resolved.kana;
    if (entry.direction === "jp-es") {
      const sameLessonMeanings = Array.from(
        new Set(lessonVocab.map((candidate) => candidate.es).filter((value) => value && value !== resolved.es)),
      );
      return createLessonQuestion(lesson, `vocab:curated:es:${resolved.kana}:${index}`, {
        category: "vocab",
        type: "mcq",
        prompt: `¿Qué significa 「${resolved.kana}」?`,
        options: buildOptionSet(resolved.es, sameLessonMeanings, meaningPool),
        correct: resolved.es,
        hint: buildLessonHint(lesson, "Vocabulario"),
        explanation: `「${resolved.kana}」 significa “${resolved.es}”.`,
      });
    }

    const sameLessonJapanese = Array.from(
      new Set(
        lessonVocab
          .map((candidate) => (candidate.kanji?.trim() ? `${candidate.kanji.trim()} (${candidate.kana})` : candidate.kana))
          .filter((value) => value && value !== jpForm),
      ),
    );
    return createLessonQuestion(lesson, `vocab:curated:jp:${resolved.kana}:${index}`, {
      category: "vocab",
      type: "mcq",
      prompt: `Selecciona el japonés para: “${entry.es}”`,
      options: buildOptionSet(jpForm, sameLessonJapanese, jpPool),
      correct: jpForm,
      hint: buildLessonHint(lesson, "Vocabulario"),
      explanation: `La opción correcta para “${entry.es}” es 「${jpForm}」.`,
    });
  }).filter((question): question is QuizQuestion => Boolean(question));

  const lessonKanji = (GENKI_KANJI_BY_LESSON[lesson] || []).filter((item) =>
    LESSON_TEN_CURATED_KANJI.includes(item.kanji as (typeof LESSON_TEN_CURATED_KANJI)[number]),
  );
  const allKanjiReadings = Array.from(new Set(Object.values(GENKI_KANJI_BY_LESSON).flat().map((item) => item.hira).filter(Boolean)));
  const kanjiQuestions = lessonKanji.map((item, index) =>
    createLessonQuestion(lesson, `kanji:curated:${item.kanji}:${index}`, {
      category: "kanji",
      type: "mcq",
      prompt: `¿Cómo se lee 「${item.kanji}」?`,
      options: buildOptionSet(item.hira, allKanjiReadings.filter((reading) => reading !== item.hira), allKanjiReadings),
      correct: item.hira,
      hint: buildLessonHint(lesson, "Kanji"),
      explanation: `「${item.kanji}」 se lee 「${item.hira}」.`,
    }),
  );

  const grammarCluster: QuizQuestion[] = [
    createLessonQuestion(10, "grammar:curated:comparison-basic", {
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
      explanation: "La estructura correcta es 「A のほうが B より ...」.",
    }),
    createLessonQuestion(10, "grammar:curated:which-more", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “Japanese is more difficult than English”?",
      options: [
        "にほんご のほうが えいごより むずかしいです。",
        "えいご のほうが にほんごより むずかしいです。",
        "にほんごが えいごより のほうが むずかしいです。",
        "にほんごより えいご のほうが むずかしいです。",
      ],
      correct: "にほんご のほうが えいごより むずかしいです。",
      hint: buildLessonHint(10, "Comparaciones"),
      explanation: "「A のほうが B より ...」 compara dos elementos.",
    }),
    createLessonQuestion(10, "grammar:curated:question-dono", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál pregunta significa “Which one is more convenient, the train or the subway?”?",
      options: [
        "でんしゃと ちかてつと どちらが べんりですか。",
        "でんしゃと ちかてつの どちらが べんりですか。",
        "でんしゃと ちかてつは どれが べんりですか。",
        "でんしゃが ちかてつより どちらですか。",
      ],
      correct: "でんしゃと ちかてつの どちらが べんりですか。",
      hint: buildLessonHint(10, "どちら"),
      explanation: "Para comparar dos opciones con una pregunta se usa 「A と B の どちらが ... ですか」.",
    }),
    createLessonQuestion(10, "grammar:curated:superlative", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Qué oración significa “Sushi is the most delicious”?",
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
    createLessonQuestion(10, "grammar:curated:among-group", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “Among Japanese foods, tempura is the most famous”?",
      options: [
        "にほんの りょうりの なかで、てんぷらが いちばん ゆうめいです。",
        "にほんの りょうりより てんぷらが ゆうめいです。",
        "てんぷらの ほうが にほんの りょうりです。",
        "にほんの りょうりの なかで、てんぷらより ゆうめいです。",
      ],
      correct: "にほんの りょうりの なかで、てんぷらが いちばん ゆうめいです。",
      hint: buildLessonHint(10, "A の中で ... がいちばん"),
      explanation: "Entre un grupo, Genki usa 「A の中で B がいちばん ...」.",
    }),
    createLessonQuestion(10, "grammar:curated:question-best", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál pregunta significa “What is the best season?”?",
      options: [
        "どの きせつが いちばん いいですか。",
        "どの きせつより いいですか。",
        "きせつの ほうが どれですか。",
        "どちらの きせつが いいですか。",
      ],
      correct: "どの きせつが いちばん いいですか。",
      hint: buildLessonHint(10, "Pregunta con いちばん"),
      explanation: "Para preguntar por el mejor elemento del grupo se usa 「どの ... が いちばん ... ですか」.",
    }),
    createLessonQuestion(10, "grammar:curated:travel-cost", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “The plane costs more than the shinkansen”?",
      options: [
        "ひこうきの ほうが しんかんせんより おかねが かかります。",
        "しんかんせんの ほうが ひこうきより おかねが かかります。",
        "ひこうきより しんかんせんの ほうが おかねが かかります。",
        "ひこうきが しんかんせんより のほうが かかります。",
      ],
      correct: "ひこうきの ほうが しんかんせんより おかねが かかります。",
      hint: buildLessonHint(10, "Comparaciones"),
      explanation: "La comparación mantiene el patrón 「A のほうが B より ...」 también con verbos como 「かかる」.",
    }),
    createLessonQuestion(10, "grammar:curated:error", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración tiene un error?",
      options: [
        "すしが いちばん おいしいです。",
        "でんしゃの ほうが ちかてつより はやいです。",
        "にほんごより えいご のほうが むずかしいです。",
        "にほんの りょうりの なかで、すしが いちばん ゆうめいです。",
      ],
      correct: "にほんごより えいご のほうが むずかしいです。",
      hint: buildLessonHint(10, "Comparaciones"),
      explanation: "La oración está gramaticalmente válida, but to mark error choose malformed option? Need replacement.",
    }),
  ];

  grammarCluster[7] = createLessonQuestion(10, "grammar:curated:error", {
    category: "grammar",
    type: "mcq",
    prompt: "¿Cuál oración tiene un error?",
    options: [
      "すしが いちばん おいしいです。",
      "でんしゃの ほうが ちかてつより はやいです。",
      "にほんご のほうが より えいご むずかしいです。",
      "にほんの りょうりの なかで、すしが いちばん ゆうめいです。",
    ],
    correct: "にほんご のほうが より えいご むずかしいです。",
    hint: buildLessonHint(10, "Comparaciones"),
    explanation: "La comparación correcta es 「A のほうが B より ...」.",
  });

  const readingQuestions: QuizQuestion[] = [
    createLessonQuestion(10, "reading:curated:travel-plan", {
      category: "reading",
      type: "mcq",
      prompt: "Lee el texto.\n\nふゆやすみに おおさかへ いきます。ひこうきより しんかんせんの ほうが はやいと おもいます。でも ひこうきの ほうが やすいです。\n\n¿Qué piensa la persona sobre el shinkansen?",
      options: [
        "Que es más barato que el avión",
        "Que es más rápido que el avión",
        "Que es más lento que el avión",
        "Que no quiere tomarlo",
      ],
      correct: "Que es más rápido que el avión",
      hint: buildLessonHint(10, "Lectura corta"),
      explanation: "El texto dice 「ひこうきより しんかんせんの ほうが はやい」.",
    }),
    createLessonQuestion(10, "reading:curated:best-city", {
      category: "reading",
      type: "mcq",
      prompt: "Lee el diálogo.\n\nA: にほんの まちの なかで、どこが いちばん にぎやかですか。\nB: とうきょうが いちばん にぎやかです。でも きょうとの ほうが きれいです。\n\n¿Cuál ciudad dice B que es la más animada?",
      options: ["Kioto", "Osaka", "Tokio", "Sapporo"],
      correct: "Tokio",
      hint: buildLessonHint(10, "Lectura corta"),
      explanation: "B responde 「とうきょうが いちばん にぎやかです」.",
    }),
  ];

  return [...vocabQuestions, ...kanjiQuestions, ...grammarCluster, ...readingQuestions];
}

function buildLessonElevenCuratedExamPool() {
  const lesson = 11;
  const lessonVocab = (ALL_GENKI_VOCAB_BY_LESSON[lesson] || []).filter((item) => isExamVocabEligible(lesson, item));
  const allVocab = Object.values(ALL_GENKI_VOCAB_BY_LESSON).flat().filter((item) => isExamVocabEligible(lesson, item));
  const meaningPool = Array.from(new Set(allVocab.map((item) => item.es).filter(Boolean)));
  const jpPool = Array.from(
    new Set(
      allVocab
        .map((item) => (item.kanji?.trim() ? `${item.kanji.trim()} (${item.kana})` : item.kana))
        .filter(Boolean),
    ),
  );

  const vocabQuestions = LESSON_ELEVEN_CURATED_VOCAB.map((entry, index) => {
    const resolved = lessonVocab.find((candidate) => candidate.kana === entry.kana);
    if (!resolved) return null;
    const jpForm = resolved.kanji?.trim() ? `${resolved.kanji.trim()} (${resolved.kana})` : resolved.kana;
    if (entry.direction === "jp-es") {
      const sameLessonMeanings = Array.from(
        new Set(lessonVocab.map((candidate) => candidate.es).filter((value) => value && value !== resolved.es)),
      );
      return createLessonQuestion(lesson, `vocab:curated:es:${resolved.kana}:${index}`, {
        category: "vocab",
        type: "mcq",
        prompt: `¿Qué significa 「${resolved.kana}」?`,
        options: buildOptionSet(resolved.es, sameLessonMeanings, meaningPool),
        correct: resolved.es,
        hint: buildLessonHint(lesson, "Vocabulario"),
        explanation: `「${resolved.kana}」 significa “${resolved.es}”.`,
      });
    }

    const sameLessonJapanese = Array.from(
      new Set(
        lessonVocab
          .map((candidate) => (candidate.kanji?.trim() ? `${candidate.kanji.trim()} (${candidate.kana})` : candidate.kana))
          .filter((value) => value && value !== jpForm),
      ),
    );
    return createLessonQuestion(lesson, `vocab:curated:jp:${resolved.kana}:${index}`, {
      category: "vocab",
      type: "mcq",
      prompt: `Selecciona el japonés para: “${entry.es}”`,
      options: buildOptionSet(jpForm, sameLessonJapanese, jpPool),
      correct: jpForm,
      hint: buildLessonHint(lesson, "Vocabulario"),
      explanation: `La opción correcta para “${entry.es}” es 「${jpForm}」.`,
    });
  }).filter((question): question is QuizQuestion => Boolean(question));

  const lessonKanji = (GENKI_KANJI_BY_LESSON[lesson] || []).filter((item) =>
    LESSON_ELEVEN_CURATED_KANJI.includes(item.kanji as (typeof LESSON_ELEVEN_CURATED_KANJI)[number]),
  );
  const allKanjiReadings = Array.from(new Set(Object.values(GENKI_KANJI_BY_LESSON).flat().map((item) => item.hira).filter(Boolean)));
  const kanjiQuestions = lessonKanji.map((item, index) =>
    createLessonQuestion(lesson, `kanji:curated:${item.kanji}:${index}`, {
      category: "kanji",
      type: "mcq",
      prompt: `¿Cómo se lee 「${item.kanji}」?`,
      options: buildOptionSet(item.hira, allKanjiReadings.filter((reading) => reading !== item.hira), allKanjiReadings),
      correct: item.hira,
      hint: buildLessonHint(lesson, "Kanji"),
      explanation: `「${item.kanji}」 se lee 「${item.hira}」.`,
    }),
  );

  const grammarCluster: QuizQuestion[] = [
    createLessonQuestion(11, "grammar:curated:want-go", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “I want to go to Kyoto”?",
      options: [
        "きょうとへ いきたいです。",
        "きょうとへ いきますです。",
        "きょうとへ いきたかったです。",
        "きょうとへ いくたりします。",
      ],
      correct: "きょうとへ いきたいです。",
      hint: buildLessonHint(11, "〜たい"),
      explanation: "La forma de deseo se hace con la raíz de ます + 「たいです」.",
    }),
    createLessonQuestion(11, "grammar:curated:want-take-photos", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “I want to take pictures”?",
      options: [
        "しゃしんを とります。",
        "しゃしんを とりたいです。",
        "しゃしんを とったです。",
        "しゃしんを とるたりします。",
      ],
      correct: "しゃしんを とりたいです。",
      hint: buildLessonHint(11, "〜たい"),
      explanation: "「とる」 pasa a 「とりたいです」.",
    }),
    createLessonQuestion(11, "grammar:curated:want-negative", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “I don't want to study”?",
      options: [
        "べんきょうしたいです。",
        "べんきょうしたくないです。",
        "べんきょうしませんです。",
        "べんきょうしないたいです。",
      ],
      correct: "べんきょうしたくないです。",
      hint: buildLessonHint(11, "〜たい negativo"),
      explanation: "La negativa de 「〜たい」 se forma como un adjetivo i: 「〜たくないです」.",
    }),
    createLessonQuestion(11, "grammar:curated:question-want", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál pregunta significa “What do you want to do this weekend?”?",
      options: [
        "しゅうまつ なにを したいですか。",
        "しゅうまつ なにを しますか。",
        "しゅうまつ なにを したですか。",
        "しゅうまつ なにを したりですか。",
      ],
      correct: "しゅうまつ なにを したいですか。",
      hint: buildLessonHint(11, "Pregunta con 〜たい"),
      explanation: "Para preguntar por deseos se usa 「なにを したいですか」.",
    }),
    createLessonQuestion(11, "grammar:curated:tari-list", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración expresa una lista no exhaustiva de actividades?",
      options: [
        "しゅうまつは ほんを よんだり えいがを みたり します。",
        "しゅうまつは ほんを よんで えいがを みます。",
        "しゅうまつは ほんを よむたり えいがを みるたり します。",
        "しゅうまつは ほんを よみたい えいがを みたいです。",
      ],
      correct: "しゅうまつは ほんを よんだり えいがを みたり します。",
      hint: buildLessonHint(11, "〜たり〜たりする"),
      explanation: "Ese patrón expresa una lista representativa, no exhaustiva.",
    }),
    createLessonQuestion(11, "grammar:curated:tari-meaning", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “On the trip I want to see temples and take pictures, among other things”?",
      options: [
        "りょこうで おてらを みたり、しゃしんを とったり したいです。",
        "りょこうで おてらを みて、しゃしんを とりたいです。",
        "りょこうで おてらを みたい、しゃしんを とったり します。",
        "りょこうで おてらを みたり、しゃしんを とります。",
      ],
      correct: "りょこうで おてらを みたり、しゃしんを とったり したいです。",
      hint: buildLessonHint(11, "〜たり〜たりする"),
      explanation: "La estructura 「〜たり〜たりしたいです」 combina deseo con lista no exhaustiva.",
    }),
    createLessonQuestion(11, "grammar:curated:future-dream", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “In the future I want to study abroad in Australia”?",
      options: [
        "しょうらい オーストラリアへ りゅうがくしたいです。",
        "しょうらい オーストラリアへ りゅうがくします。",
        "しょうらい オーストラリアへ りゅうがくしたりです。",
        "しょうらい オーストラリアへ りゅうがくしてです。",
      ],
      correct: "しょうらい オーストラリアへ りゅうがくしたいです。",
      hint: buildLessonHint(11, "〜たい"),
      explanation: "La forma deseada con する-verbs es 「〜したいです」.",
    }),
    createLessonQuestion(11, "grammar:curated:error", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración tiene un error?",
      options: [
        "きょうとへ いきたいです。",
        "しゅうまつは ほんを よんだり えいがを みたり します。",
        "しゃしんを とるたいです。",
        "おんせんに いきたくないです。",
      ],
      correct: "しゃしんを とるたいです。",
      hint: buildLessonHint(11, "〜たい"),
      explanation: "「〜たい」 se forma con la raíz de ます: 「とりたいです」, no 「とるたいです」.",
    }),
  ];

  const readingQuestions: QuizQuestion[] = [
    createLessonQuestion(11, "reading:curated:vacation-plan", {
      category: "reading",
      type: "mcq",
      prompt: "Lee el texto.\n\nりょこうで おてらを みたり、しゃしんを とったり したいです。それから おんせんにも はいりたいです。\n\n¿Qué quiere hacer esta persona además de ver templos y tomar fotos?",
      options: [
        "Ir a clases",
        "Entrar a un onsen",
        "Comprar cerveza",
        "Correr en el parque",
      ],
      correct: "Entrar a un onsen",
      hint: buildLessonHint(11, "Lectura corta"),
      explanation: "La última oración dice 「おんせんにも はいりたいです」.",
    }),
    createLessonQuestion(11, "reading:curated:weekend-dialogue", {
      category: "reading",
      type: "mcq",
      prompt: "Lee el diálogo.\n\nA: しゅうまつ なにを したいですか。\nB: こうえんへ いって、さんぽしたいです。でも あとで ルームメイトと えいがも みたいです。\n\n¿Qué quiere hacer B después?",
      options: [
        "Ir al museo de arte",
        "Ver una película con su roommate",
        "Estudiar en casa",
        "Subir una montaña",
      ],
      correct: "Ver una película con su roommate",
      hint: buildLessonHint(11, "Lectura corta"),
      explanation: "B dice 「あとで ルームメイトと えいがも みたいです」.",
    }),
  ];

  return [...vocabQuestions, ...kanjiQuestions, ...grammarCluster, ...readingQuestions];
}

function buildLessonTwelveCuratedExamPool() {
  const lesson = 12;
  const lessonVocab = (ALL_GENKI_VOCAB_BY_LESSON[lesson] || []).filter((item) => isExamVocabEligible(lesson, item));
  const allVocab = Object.values(ALL_GENKI_VOCAB_BY_LESSON).flat().filter((item) => isExamVocabEligible(lesson, item));
  const meaningPool = Array.from(new Set(allVocab.map((item) => item.es).filter(Boolean)));
  const jpPool = Array.from(
    new Set(
      allVocab
        .map((item) => (item.kanji?.trim() ? `${item.kanji.trim()} (${item.kana})` : item.kana))
        .filter(Boolean),
    ),
  );

  const vocabQuestions = LESSON_TWELVE_CURATED_VOCAB.map((entry, index) => {
    const resolved = lessonVocab.find((candidate) => candidate.kana === entry.kana);
    if (!resolved) return null;
    const jpForm = resolved.kanji?.trim() ? `${resolved.kanji.trim()} (${resolved.kana})` : resolved.kana;
    if (entry.direction === "jp-es") {
      const sameLessonMeanings = Array.from(
        new Set(lessonVocab.map((candidate) => candidate.es).filter((value) => value && value !== resolved.es)),
      );
      return createLessonQuestion(lesson, `vocab:curated:es:${resolved.kana}:${index}`, {
        category: "vocab",
        type: "mcq",
        prompt: `¿Qué significa 「${resolved.kana}」?`,
        options: buildOptionSet(resolved.es, sameLessonMeanings, meaningPool),
        correct: resolved.es,
        hint: buildLessonHint(lesson, "Vocabulario"),
        explanation: `「${resolved.kana}」 significa “${resolved.es}”.`,
      });
    }

    const sameLessonJapanese = Array.from(
      new Set(
        lessonVocab
          .map((candidate) => (candidate.kanji?.trim() ? `${candidate.kanji.trim()} (${candidate.kana})` : candidate.kana))
          .filter((value) => value && value !== jpForm),
      ),
    );
    return createLessonQuestion(lesson, `vocab:curated:jp:${resolved.kana}:${index}`, {
      category: "vocab",
      type: "mcq",
      prompt: `Selecciona el japonés para: “${entry.es}”`,
      options: buildOptionSet(jpForm, sameLessonJapanese, jpPool),
      correct: jpForm,
      hint: buildLessonHint(lesson, "Vocabulario"),
      explanation: `La opción correcta para “${entry.es}” es 「${jpForm}」.`,
    });
  }).filter((question): question is QuizQuestion => Boolean(question));

  const lessonKanji = (GENKI_KANJI_BY_LESSON[lesson] || []).filter((item) =>
    LESSON_TWELVE_CURATED_KANJI.includes(item.kanji as (typeof LESSON_TWELVE_CURATED_KANJI)[number]),
  );
  const allKanjiReadings = Array.from(new Set(Object.values(GENKI_KANJI_BY_LESSON).flat().map((item) => item.hira).filter(Boolean)));
  const kanjiQuestions = lessonKanji.map((item, index) =>
    createLessonQuestion(lesson, `kanji:curated:${item.kanji}:${index}`, {
      category: "kanji",
      type: "mcq",
      prompt: `¿Cómo se lee 「${item.kanji}」?`,
      options: buildOptionSet(item.hira, allKanjiReadings.filter((reading) => reading !== item.hira), allKanjiReadings),
      correct: item.hira,
      hint: buildLessonHint(lesson, "Kanji"),
      explanation: `「${item.kanji}」 se lee 「${item.hira}」.`,
    }),
  );

  const grammarCluster: QuizQuestion[] = [
    createLessonQuestion(12, "grammar:curated:explanatory", {
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
      explanation: "「〜んです」 da un tono explicativo.",
    }),
    createLessonQuestion(12, "grammar:curated:too-much-drink", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál significa “I drank too much”?",
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
    createLessonQuestion(12, "grammar:curated:too-much-study", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “I studied too much”?",
      options: [
        "べんきょうしすぎました。",
        "べんきょうしたほうがいいです。",
        "べんきょうしたいです。",
        "べんきょうするんです。",
      ],
      correct: "べんきょうしすぎました。",
      hint: buildLessonHint(12, "〜すぎる"),
      explanation: "Con verbos, 「〜すぎる」 se une a la raíz de ます: 「べんきょうしすぎました」.",
    }),
    createLessonQuestion(12, "grammar:curated:advice-medicine", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “You should take medicine”?",
      options: [
        "くすりを のんだほうがいいです。",
        "くすりを のみすぎました。",
        "くすりを のみたいです。",
        "くすりを のむんです。",
      ],
      correct: "くすりを のんだほうがいいです。",
      hint: buildLessonHint(12, "〜たほうがいいです"),
      explanation: "Para aconsejar, Genki usa 「〜たほうがいいです」.",
    }),
    createLessonQuestion(12, "grammar:curated:advice-sleep", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “You should sleep early today”?",
      options: [
        "きょうは はやく ねたほうがいいです。",
        "きょうは はやく ねすぎました。",
        "きょうは はやく ねたいです。",
        "きょうは はやく ねるんです。",
      ],
      correct: "きょうは はやく ねたほうがいいです。",
      hint: buildLessonHint(12, "〜たほうがいいです"),
      explanation: "El consejo usa la forma corta pasada + 「ほうがいいです」.",
    }),
    createLessonQuestion(12, "grammar:curated:kadouka", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “I don't know whether he will come”?",
      options: [
        "かれが くるかどうか しりません。",
        "かれが くるので しりません。",
        "かれが くるんです しりません。",
        "かれが くることがあります。",
      ],
      correct: "かれが くるかどうか しりません。",
      hint: buildLessonHint(12, "〜かどうか"),
      explanation: "「〜かどうか」 expresa “si ... o no / whether ... or not”.",
    }),
    createLessonQuestion(12, "grammar:curated:kotogaaru", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración significa “I have gone to Japan once”?",
      options: [
        "にほんへ いちど いったことがあります。",
        "にほんへ いちど いくんです。",
        "にほんへ いちど いったほうがいいです。",
        "にほんへ いちど いきすぎました。",
      ],
      correct: "にほんへ いちど いったことがあります。",
      hint: buildLessonHint(12, "〜ことがあります"),
      explanation: "「〜たことがあります」 expresa experiencia previa.",
    }),
    createLessonQuestion(12, "grammar:curated:error", {
      category: "grammar",
      type: "mcq",
      prompt: "¿Cuál oración tiene un error?",
      options: [
        "あたまが いたいんです。",
        "くすりを のんだほうがいいです。",
        "にほんへ いったことがいます。",
        "かれが くるかどうか しりません。",
      ],
      correct: "にほんへ いったことがいます。",
      hint: buildLessonHint(12, "〜ことがあります"),
      explanation: "La experiencia se expresa con 「〜たことがあります」, no 「ことがいます」.",
    }),
  ];

  const readingQuestions: QuizQuestion[] = [
    createLessonQuestion(12, "reading:curated:illness-dialogue", {
      category: "reading",
      type: "mcq",
      prompt: "Lee el diálogo.\n\nA: どうしたんですか。\nB: ねつがあって、のどが いたいんです。\n\n¿Qué le pasa a B?",
      options: [
        "Tiene fiebre y le duele la garganta",
        "Le duele el pie",
        "Tiene hambre",
        "Está de vacaciones",
      ],
      correct: "Tiene fiebre y le duele la garganta",
      hint: buildLessonHint(12, "Lectura corta"),
      explanation: "Eso es exactamente lo que dice B.",
    }),
    createLessonQuestion(12, "reading:curated:advice-text", {
      category: "reading",
      type: "mcq",
      prompt: "Lee el texto.\n\nきのう あまり ねませんでした。だから、きょうは はやく ねたほうがいいです。\n\n¿Qué consejo da el texto?",
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

  return [...vocabQuestions, ...kanjiQuestions, ...grammarCluster, ...readingQuestions];
}

function buildLessonExamQuestionPool(lesson: number): QuizQuestion[] {
  const normalizedLesson = Math.max(1, Math.min(12, lesson));
  if (normalizedLesson === 1) return buildLessonOneCuratedExamPool();
  if (normalizedLesson === 2) return buildLessonTwoCuratedExamPool();
  if (normalizedLesson === 3) return buildLessonThreeCuratedExamPool();
  if (normalizedLesson === 4) return buildLessonFourCuratedExamPool();
  if (normalizedLesson === 5) return buildLessonFiveCuratedExamPool();
  if (normalizedLesson === 6) return buildLessonSixCuratedExamPool();
  if (normalizedLesson === 7) return buildLessonSevenCuratedExamPool();
  if (normalizedLesson === 8) return buildLessonEightCuratedExamPool();
  if (normalizedLesson === 9) return buildLessonNineCuratedExamPool();
  if (normalizedLesson === 10) return buildLessonTenCuratedExamPool();
  if (normalizedLesson === 11) return buildLessonElevenCuratedExamPool();
  if (normalizedLesson === 12) return buildLessonTwelveCuratedExamPool();
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
  if (lesson === 1 || lesson === 2 || lesson === 3 || lesson === 4 || lesson === 5 || lesson === 6 || lesson === 7 || lesson === 8 || lesson === 9 || lesson === 10 || lesson === 11 || lesson === 12) return shuffle(pool).slice(0, count);
  const used = new Set<string>();
  const result: QuizQuestion[] = [];
  const hasKanji = lesson >= 3;
  const hasConj = lesson >= 3;

  const targets: Record<Exclude<QuizCategory, "kana">, number> = {
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
  if (view === "home" || view === "learn" || view === "review" || view === "practice" || view === "vault") return view;
  // Backward compat with old view names
  if (view === "learnkana") return "learn";
  if (view === "kana" || view === "flashcards" || view === "sprint") return "practice";
  if (view === "exam") return "practice";
  if (view === "quiz") return "practice";
  if (searchParams.get("learnkana") === "1") return "learn";
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

function getStudyActivityStorageKey(userKey: string) {
  return `study-activity-${userKey || "anon"}`;
}

function getStudyActivityLabel(tool: StudyActivityTool) {
  if (tool === "learnkana") return "Aprender Kana";
  if (tool === "kana") return "Kana Sprint";
  if (tool === "sprint") return "Vocab + Kanji Sprint";
  if (tool === "flashcards") return "Flashcards";
  return "Repaso mixto";
}

function formatStudyActivityTime(iso: string) {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "";
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTarget = new Date(value);
  startOfTarget.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((startOfToday.getTime() - startOfTarget.getTime()) / 86_400_000);
  if (dayDiff === 0) return "Hoy";
  if (dayDiff === 1) return "Ayer";
  return value.toLocaleDateString("es-MX", { weekday: "short" });
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
    description: "Forma base → presente negativo (formal)",
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
    description: "Forma base → pasado afirmativo (formal)",
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
    description: "Forma base → pasado negativo (formal)",
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
  const [activeTab, setActiveTab] = useState<StudyView>("home");
  const [practiceSubView, setPracticeSubView] = useState<PracticeSubView | null>(null);
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
  const [vkResetLabel, setVkResetLabel] = useState("");
  const [kanaLeaderboard, setKanaLeaderboard] = useState<Record<KanaMode, KanaScoreRow[]>>({ hiragana: [], katakana: [], mixed: [] });
  const [leaderboardUnavailable, setLeaderboardUnavailable] = useState(false);
  const [kanaQuestion, setKanaQuestion] = useState<{ char: string; correct: string; options: string[]; itemId: string | null }>({
    char: "あ",
    correct: "a",
    options: ["a", "i", "u", "e"],
    itemId: null,
  });
  const kanaRoundSubmittedRef = useRef(false);
  const pendingKanaSubmitRef = useRef<KanaRoundPayload | null>(null);
  const kanaRoundStartedAtRef = useRef<number | null>(null);
  const kanaAnswersCountRef = useRef(0);
  const weekKeyRef = useRef(getLocalWeekStart().toISOString().slice(0, 10));
  const vkMonthKeyRef = useRef(getLocalMonthStart().toISOString().slice(0, 7));

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
  const [vkQuestion, setVkQuestion] = useState<{ prompt: string; correct: string; options: string[]; hint: string; itemId: string; itemType: "vocab" | "kanji"; lesson: number }>({
    prompt: "だいがく",
    correct: "universidad; instituto",
    options: ["universidad; instituto", "escuela", "libro", "agua"],
    hint: "Significado",
    itemId: "l1-vocab-daigaku",
    itemType: "vocab",
    lesson: 1,
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
  const [flashLearnResults, setFlashLearnResults] = useState<FlashLearnResult[]>([]);
  const [customFlashDecks, setCustomFlashDecks] = useState<CustomFlashDeckRecord[]>([]);
  const [flashDeckBuilderOpen, setFlashDeckBuilderOpen] = useState(false);
  const [flashDeckEditingId, setFlashDeckEditingId] = useState<string | null>(null);
  const [flashDeckName, setFlashDeckName] = useState("");
  const [flashDeckBuilderSetIds, setFlashDeckBuilderSetIds] = useState<string[]>([]);

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
  const [examFeedback, setExamFeedback] = useState<PracticeFeedbackState | null>(null);
  const [examStreak, setExamStreak] = useState(0);
  const [examStreakPulse, setExamStreakPulse] = useState(0);
  const [examSheetVisible, setExamSheetVisible] = useState(false);
  const [examHistory, setExamHistory] = useState<ExamAttempt[]>([]);
  const [studySrs, setStudySrs] = useState<StudySrsMap>({});
  const examCardRef = useRef<HTMLDivElement | null>(null);
  const examPersistedRef = useRef(false);
  const examAdvanceTimerRef = useRef<number | null>(null);
  const [studyActivity, setStudyActivity] = useState<StudyActivityEntry[]>([]);

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
        const monthKey = getLocalMonthStart().toISOString().slice(0, 7);
        const rawVkBest = localStorage.getItem(`study-vk-best-map-${key}-${monthKey}`);
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
        const rawActivity = localStorage.getItem(getStudyActivityStorageKey(key));
        if (rawActivity) {
          const parsedActivity = JSON.parse(rawActivity);
          if (Array.isArray(parsedActivity)) {
            setStudyActivity(
              parsedActivity.filter((entry): entry is StudyActivityEntry =>
                Boolean(
                  entry &&
                  typeof entry.id === "string" &&
                  typeof entry.tool === "string" &&
                  typeof entry.label === "string" &&
                  typeof entry.href === "string" &&
                  typeof entry.occurredAt === "string",
                ),
              ).slice(0, 12),
            );
          }
        }
        setStudySrs(loadStudySrs(key));
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
    try {
      localStorage.setItem(getStudyActivityStorageKey(userKey), JSON.stringify(studyActivity.slice(0, 12)));
    } catch {}
  }, [studyActivity, userKey]);

  useEffect(() => {
    if (selectedView) {
      setActiveTab(selectedView);
      setPracticeSubView(null);
      return;
    }
    setActiveTab("home");
    setPracticeSubView(null);
  }, [selectedView]);

  useEffect(() => {
    if (selectedView) return;
    setStudySrs(loadStudySrs(userKey));
  }, [selectedView, userKey]);

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
  const kanaItemLookup = useMemo(
    () => new Map(KANA_ITEMS.map((item) => [`${item.kana}:${item.romaji}`, item])),
    [],
  );

  const createKanaQuestion = () => {
    const [char, romaji] = kanaPool[Math.floor(Math.random() * kanaPool.length)];
    const item = kanaItemLookup.get(`${char}:${romaji}`) || null;
    setKanaQuestion({ char, correct: romaji, options: romajiOptions(kanaPool, romaji), itemId: item?.id || null });
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
    const pool: Array<{ id: string; lesson: number; jp: string; es: string }> = [];
    for (const lesson of vkBucketConfig.lessons) {
      const rows = GENKI_VOCAB_BY_LESSON[lesson] || [];
      rows.forEach((item, index) => {
        pool.push({
          id: `l${lesson}-v-${index}`,
          lesson,
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
    const pool: Array<{ id: string; lesson: number; kanji: string; hira: string }> = [];
    for (const lesson of vkBucketConfig.lessons) {
      if (lesson < 3) continue;
      const rows = GENKI_KANJI_BY_LESSON[lesson] || [];
      rows.forEach((item, index) => {
        pool.push({
          id: `l${lesson}-k-${index}`,
          lesson,
          kanji: item.kanji,
          hira: item.hira,
        });
      });
    }
    return pool;
  }, [vkBucketConfig]);

  const createVkQuestion = () => {
    const rankedKanjiPool = rankItemsForReview(vkKanjiPool, studySrs, (row) => ({
      itemId: row.id,
      itemType: "kanji",
      sourceTool: "sprint",
    }));
    const rankedVocabPool = rankItemsForReview(vkVocabPool, studySrs, (row) => ({
      itemId: row.id,
      itemType: "vocab",
      sourceTool: "sprint",
    }));
    const canUseKanji = rankedKanjiPool.length >= 4;
    const canUseVocab = rankedVocabPool.length >= 4;
    if (!canUseKanji && !canUseVocab) return;

    const useKanji = canUseKanji && (!canUseVocab || Math.random() < 0.45);
    if (useKanji) {
      const kanjiCandidates = rankedKanjiPool.slice(0, Math.min(rankedKanjiPool.length, 8));
      const picked = kanjiCandidates[Math.floor(Math.random() * kanjiCandidates.length)];
      const options = buildOptionSet(
        picked.hira,
        rankedKanjiPool.filter((row) => row.id !== picked.id).map((row) => row.hira),
        rankedKanjiPool.map((row) => row.hira),
      );
      setVkQuestion({ prompt: picked.kanji, correct: picked.hira, options, hint: "Lectura", itemId: picked.id, itemType: "kanji", lesson: picked.lesson });
      return;
    }

    const vocabCandidates = rankedVocabPool.slice(0, Math.min(rankedVocabPool.length, 8));
    const picked = vocabCandidates[Math.floor(Math.random() * vocabCandidates.length)];
    const options = buildOptionSet(
      picked.es,
      rankedVocabPool.filter((row) => row.id !== picked.id).map((row) => row.es),
      rankedVocabPool.map((row) => row.es),
    );
    setVkQuestion({ prompt: picked.jp, correct: picked.es, options, hint: "Significado", itemId: picked.id, itemType: "vocab", lesson: picked.lesson });
  };

  const loadVkLeaderboard = async () => {
    const monthStartIso = getLocalMonthStart().toISOString();
    const { data, error } = await supabase
      .from("study_kana_scores")
      .select("user_id, mode, best_score, updated_at, profiles:user_id (username, full_name)")
      .gte("updated_at", monthStartIso)
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
    const monthKey = getLocalMonthStart().toISOString().slice(0, 7);
    setVkBestByBucket((prev) => {
      const next = { ...prev, [bucket]: Math.max(prev[bucket] || 0, score) };
      try {
        localStorage.setItem(`study-vk-best-map-${userKey}-${monthKey}`, JSON.stringify(next));
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
    const safeBestScore = isSameLocalMonth(existing?.updated_at, nowIso)
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
    recordStudyActivity("kana");
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

  const closeKanaSession = () => {
    setKanaRunning(false);
    setKanaCountdown(null);
    setKanaPenalty(0);
    setKanaTime(60);
    setKanaScore(0);
  };

  const answerKana = (choice: string) => {
    if (!kanaRunning || kanaPenalty > 0 || kanaCountdown !== null || kanaTime <= 0) return;
    kanaAnswersCountRef.current += 1;
    const correct = choice === kanaQuestion.correct;
    if (correct) {
      setKanaScore((v) => v + 1);
    } else {
      setKanaPenalty(2);
    }
    if (kanaQuestion.itemId) {
      const kanaItem = KANA_ITEMS.find((item) => item.id === kanaQuestion.itemId);
      if (kanaItem) {
        const nextProgress = applyKanaRating(loadKanaProgress(userKey), kanaItem, correct ? "correct" : "wrong");
        saveKanaProgress(userKey, nextProgress);
        recordSrsResult({
          itemId: kanaItem.id,
          itemType: "kana",
          sourceTool: "kana",
          label: `${kanaItem.kana} · ${kanaItem.romaji}`,
          rating: correct ? "correct" : "wrong",
        });
      }
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
    recordStudyActivity("sprint", vkBucketConfig.label);
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

  const closeVkSession = () => {
    setVkRunning(false);
    setVkCountdown(null);
    setVkPenalty(0);
    setVkTime(60);
    setVkScore(0);
  };

  const answerVk = (choice: string) => {
    if (!vkRunning || vkPenalty > 0 || vkCountdown !== null || vkTime <= 0) return;
    vkAnswersCountRef.current += 1;
    const correct = choice === vkQuestion.correct;
    if (correct) {
      setVkScore((v) => v + 1);
    } else {
      setVkPenalty(2);
    }
    recordSrsResult({
      itemId: vkQuestion.itemId,
      itemType: vkQuestion.itemType,
      sourceTool: "sprint",
      sourceLesson: vkQuestion.lesson,
      label: vkQuestion.prompt,
      rating: correct ? "correct" : "wrong",
    });
    createVkQuestion();
  };

  const recordStudyActivity = (tool: StudyActivityTool, detail?: string) => {
    const occurredAt = new Date().toISOString();
    const label = getStudyActivityLabel(tool);
    const href = tool === "exam" ? "/study?view=exam" : `/study?view=${tool}`;
    setStudyActivity((prev) => [
      { id: `${tool}-${Date.now()}`, tool, label, href, detail, occurredAt },
      ...prev,
    ].slice(0, 12));
  };

  const recordSrsResult = ({
    itemId,
    itemType,
    sourceTool,
    rating,
    sourceLesson,
    sourceDeck,
    label,
  }: {
    itemId: string;
    itemType: StudySrsItemType;
    sourceTool: StudySrsSourceTool;
    rating: "wrong" | "almost" | "correct";
    sourceLesson?: number | null;
    sourceDeck?: string | null;
    label?: string | null;
  }) => {
    setStudySrs((previous) => {
      const next = recordStudyResult(previous, {
        itemId,
        itemType,
        sourceTool,
        sourceLesson,
        sourceDeck,
        label,
        rating,
      });
      saveStudySrs(userKey, next);
      return next;
    });
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
        FLASHCARD_SETS.filter((set) => flashDeckBuilderSetIds.includes(set.id)).flatMap((set) => set.items),
      ),
    [flashDeckBuilderSetIds],
  );
  const flashDeckBuilderSelectedSetIds = flashDeckBuilderSetIds;
  const flashDeckBuilderVocabOptions = useMemo(
    () =>
      flashLessons
        .map((lesson) => FLASHCARD_SETS.find((set) => set.id === `l${lesson}-vocab`))
        .filter((set): set is FlashcardSet => Boolean(set))
        .map((set) => ({
          key: set.id,
          label: `L${set.lesson}`,
          tone: "color-mix(in srgb, rgba(244, 162, 97, 0.18) 76%, white)",
        })),
    [flashLessons],
  );
  const flashDeckBuilderKanjiOptions = useMemo(
    () =>
      flashLessons
        .filter((lesson) => lesson >= 3)
        .map((lesson) => FLASHCARD_SETS.find((set) => set.id === `l${lesson}-kanji`))
        .filter((set): set is FlashcardSet => Boolean(set))
        .map((set) => ({
          key: set.id,
          label: `L${set.lesson}`,
          tone: "var(--color-highlight-soft)",
        })),
    [flashLessons],
  );
  const officialFlashLessons = useMemo(
    () =>
      flashSetsByLesson.filter((entry) => entry.sets.length > 0).map((entry) => ({
        lesson: entry.lesson,
        sets: entry.sets,
        setCount: entry.sets.length,
      })),
    [flashSetsByLesson],
  );

  const openFlashLesson = (lesson: number) => {
    closeCustomFlashDeckBuilder();
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
    setFlashLearnResults([]);
  };

  const openCustomFlashDeckBuilder = (deck?: CustomFlashDeckRecord) => {
    setFlashDeckBuilderOpen(true);
    setFlashDeckEditingId(deck?.id || null);
    setFlashDeckName(deck?.name || "");
    setFlashDeckBuilderSetIds(deck?.setIds || []);
  };

  const closeCustomFlashDeckBuilder = () => {
    setFlashDeckBuilderOpen(false);
    setFlashDeckEditingId(null);
    setFlashDeckName("");
    setFlashDeckBuilderSetIds([]);
  };

  const toggleCustomFlashSetSelection = (setId: string) => {
    setFlashDeckBuilderSetIds((prev) => (
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
    if (flashDeckBuilderSelectedSetIds.length === 0) {
      alert("Selecciona al menos un bloque para armar el deck.");
      return;
    }
    const nowIso = new Date().toISOString();
    setCustomFlashDecks((prev) => {
      if (flashDeckEditingId) {
        return prev.map((deck) => (
          deck.id === flashDeckEditingId
            ? { ...deck, name: trimmedName, setIds: [...flashDeckBuilderSelectedSetIds], updatedAt: nowIso }
            : deck
        ));
      }
      return [
        {
          id: `custom-${Date.now()}`,
          name: trimmedName,
          setIds: [...flashDeckBuilderSelectedSetIds],
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
    window.setTimeout(() => {
      flashFocusRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const startFlashCards = () => {
    if (!activeFlashSet || activeFlashItems.length === 0) return;
    recordStudyActivity("flashcards", activeFlashSet.title);
    const randomizedDeck = shuffle([...activeFlashItems]);
    setFlashCardsDeck(randomizedDeck);
    setFlashMode("cards");
    setFlashCardIndex(0);
    setFlashCardFlipped(false);
    focusFlashArea();
  };

  const buildFlashLearnQuestions = (set: FlashcardSet, orderedItems: FlashcardItem[]) => {
    const picked = orderedItems.slice(0, Math.min(20, orderedItems.length));
    const recentDistractorHistory: string[] = [];
    let previousDistractors: string[] = [];
    const recentWindowSize = 9;

    return picked.map((item, index) => {
      const distractorPool = orderedItems
        .filter((candidate) => candidate.id !== item.id)
        .map((candidate) => candidate.back);
      const options = buildFlashLearnOptions(item.back, distractorPool, recentDistractorHistory, previousDistractors);
      const distractors = options.filter((option) => option !== item.back);

      recentDistractorHistory.push(...distractors);
      if (recentDistractorHistory.length > recentWindowSize) {
        recentDistractorHistory.splice(0, recentDistractorHistory.length - recentWindowSize);
      }
      previousDistractors = [...distractors].sort();

      return {
        id: `${set.id}-learn-${index + 1}`,
        itemId: item.id,
        lesson: set.lesson,
        deckTitle: set.title,
        prompt: item.front,
        correct: item.back,
        options,
      };
    });
  };

  const launchFlashLearnSession = (set: FlashcardSet, items: FlashcardItem[]) => {
    const questions = buildFlashLearnQuestions(set, items);
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
    setFlashLearnResults([]);
    setFlashMode("learn");
    focusFlashArea();
  };

  const startFlashLearn = () => {
    if (!activeFlashSet || activeFlashItems.length < 4) {
      alert("Este set necesita al menos 4 tarjetas para el modo Aprender.");
      return;
    }
    recordStudyActivity("flashcards", activeFlashSet.title);
    const rankedItems = rankItemsForReview(activeFlashItems, studySrs, (item) => ({
      itemId: item.id,
      itemType: "flashcard",
      sourceTool: "flashcards",
    }));
    launchFlashLearnSession(activeFlashSet, rankedItems);
  };

  const currentFlashLearnQ = flashLearnQuestions[flashLearnIndex] || null;
  const flashLearnProgressPct = flashLearnQuestions.length
    ? Math.round(((flashLearnFinished ? flashLearnQuestions.length : flashLearnIndex + 1) / flashLearnQuestions.length) * 100)
    : 0;
  const flashLearnWrongItems = useMemo(() => {
    if (!activeFlashSet) return [];
    const wrongIds = new Set(flashLearnResults.filter((result) => !result.correct).map((result) => result.itemId));
    return activeFlashSet.items.filter((item) => wrongIds.has(item.id));
  }, [activeFlashSet, flashLearnResults]);

  const answerFlashLearn = (option: string) => {
    if (!currentFlashLearnQ || flashLearnChoice) return;
    setFlashLearnChoice(option);
    const correct = option === currentFlashLearnQ.correct;
    if (correct) setFlashLearnScore((value) => value + 1);
    setFlashLearnResults((prev) => [
      ...prev,
      {
        itemId: currentFlashLearnQ.itemId,
        lesson: currentFlashLearnQ.lesson,
        deckTitle: currentFlashLearnQ.deckTitle,
        correct,
      },
    ]);
    recordSrsResult({
      itemId: currentFlashLearnQ.itemId,
      itemType: "flashcard",
      sourceTool: "flashcards",
      sourceLesson: currentFlashLearnQ.lesson,
      sourceDeck: currentFlashLearnQ.deckTitle,
      label: currentFlashLearnQ.prompt,
      rating: correct ? "correct" : "wrong",
    });
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
  const latestStudyActivity = studyActivity[0] || null;
  const studyDueSummary = useMemo(() => getStudyDueSummary(studySrs), [studySrs]);
  const homeDueByTool = useMemo<Record<StudyHomeToolKey, number>>(
    () => ({
      learnkana: studyDueSummary.byTool.learnkana + studyDueSummary.byTool.kana,
      flashcards: studyDueSummary.byTool.flashcards,
      sprint: studyDueSummary.byTool.sprint,
      exam: studyDueSummary.byTool.exam,
    }),
    [studyDueSummary],
  );
  const primaryReviewTool = (Object.entries(homeDueByTool).sort((a, b) => b[1] - a[1])[0]?.[0] as StudyHomeToolKey | undefined) || "learnkana";
  const reviewHref =
    primaryReviewTool === "learnkana"
      ? "/study?view=learnkana&learn=1"
      : `/study?view=${primaryReviewTool === "exam" ? "exam" : primaryReviewTool}`;
  const weekStart = getLocalWeekStart();
  const weeklyActivity = studyActivity.filter((entry) => {
    const value = new Date(entry.occurredAt);
    return !Number.isNaN(value.getTime()) && value >= weekStart;
  });
  const weeklyActiveDays = new Set(
    weeklyActivity.map((entry) => {
      const value = new Date(entry.occurredAt);
      value.setHours(0, 0, 0, 0);
      return value.toISOString().slice(0, 10);
    }),
  );
  const weeklyProgressDays = Array.from({ length: 7 }, (_, index) => {
    const value = new Date(weekStart);
    value.setDate(weekStart.getDate() + index);
    value.setHours(0, 0, 0, 0);
    return {
      key: value.toISOString().slice(0, 10),
      label: value.toLocaleDateString("es-MX", { weekday: "narrow" }),
      active: weeklyActiveDays.has(value.toISOString().slice(0, 10)),
    };
  });
  const examCurrentQ = examQuestions[examIndex] || null;
  const examSessionOpen = examQuestions.length > 0;
  const kanaSessionOpen = kanaCountdown !== null || kanaRunning || (kanaTime > 0 && kanaTime < 60);
  const vkSessionOpen = vkCountdown !== null || vkRunning || (vkTime > 0 && vkTime < 60);
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

  const pageTitle = selectedView ? selectedView.charAt(0).toUpperCase() + selectedView.slice(1) : "Study";
  const sectionScrollMarginTop = "calc(var(--app-sticky-offset) + var(--space-5))";
  const sectionStyle: CSSProperties = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: "var(--space-5)",
    display: "grid",
    gap: "var(--space-4)",
    boxShadow: "var(--shadow-card)",
  };
  const panelStyle: CSSProperties = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "var(--space-4)",
  };
  const mutedPanelStyle: CSSProperties = {
    background: "var(--color-surface-muted)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "var(--space-4)",
  };
  const sectionKickerStyle: CSSProperties = {
    fontSize: "var(--text-label)",
    color: "var(--color-accent-strong)",
    textTransform: "uppercase",
    letterSpacing: ".08em",
    fontWeight: 800,
  };
  const pillGroupStyle: CSSProperties = {
    display: "inline-flex",
    flexWrap: "wrap",
    gap: "6px",
    padding: "4px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-pill)",
    background: "var(--color-surface-muted)",
  };
  const primaryButtonStyle: CSSProperties = {
    border: 0,
    borderRadius: "var(--radius-pill)",
    background: "var(--color-accent-strong)",
    color: "#fff",
    padding: "10px 16px",
    fontWeight: 800,
    fontSize: "var(--text-body-sm)",
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(230, 57, 70, 0.16)",
  };
  const secondaryButtonStyle: CSSProperties = {
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-pill)",
    background: "var(--color-surface)",
    color: "var(--color-text)",
    padding: "8px 12px",
    fontWeight: 700,
    fontSize: "var(--text-body-sm)",
    cursor: "pointer",
  };
  const chipStyle: CSSProperties = {
    borderRadius: "var(--radius-pill)",
    background: "var(--color-accent-soft)",
    border: "1px solid color-mix(in srgb, var(--color-accent) 35%, var(--color-border))",
    padding: "6px 10px",
    fontSize: "var(--text-label)",
    color: "var(--color-text)",
    fontWeight: 800,
  };
  const progressTrackStyle: CSSProperties = {
    height: 7,
    borderRadius: 999,
    background: "var(--color-accent-soft)",
    overflow: "hidden",
  };
  const flashSectionStyle: CSSProperties = {
    display: "grid",
    gap: "10px",
    padding: "0",
    borderRadius: 0,
    background: "transparent",
    border: "0",
  };
  const flashDeckCardStyle: CSSProperties = {
    textAlign: "left",
    border: "1px solid color-mix(in srgb, var(--color-border) 88%, white)",
    borderRadius: 18,
    background: "color-mix(in srgb, var(--color-surface) 90%, white)",
    padding: "10px 10px 8px",
    cursor: "pointer",
    display: "grid",
    gap: 4,
    minHeight: 64,
    boxShadow: "0 12px 22px rgba(26, 26, 46, 0.04)",
  };

  useEffect(() => {
    void loadKanaLeaderboard();
    void loadVkLeaderboard();
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const weekKey = getLocalWeekStart(now).toISOString().slice(0, 10);
      const monthKey = getLocalMonthStart(now).toISOString().slice(0, 7);
      if (weekKeyRef.current !== weekKey) {
        weekKeyRef.current = weekKey;
        setKanaBestByMode({ hiragana: 0, katakana: 0, mixed: 0 });
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
        } catch {}
        void loadKanaLeaderboard();
      }
      if (vkMonthKeyRef.current !== monthKey) {
        vkMonthKeyRef.current = monthKey;
        setVkBestByBucket({ l1_2: 0, l3_4: 0, l5_6: 0, l7_8: 0, l9_10: 0, l11_12: 0 });
        try {
          const rawVkBest = localStorage.getItem(`study-vk-best-map-${userKey}-${monthKey}`);
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
        void loadVkLeaderboard();
      }
      setWeeklyResetLabel(formatCountdown(getNextLocalWeekStart(now).getTime() - now.getTime()));
      setVkResetLabel(formatCountdown(getNextLocalMonthStart(now).getTime() - now.getTime()));
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
        const isVerbType = type === "te" || type === "past" || type === "masu" || type === "plain";
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
    if (practiceSubView !== "exam") return;
    if (!currentQ && !quizFinished) return;
    if (!quizCardRef.current) return;
    quizCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeTab, currentQ, quizFinished, quizIndex]);

  useEffect(() => {
    if (practiceSubView !== "flashcards") return;
    if (flashMode !== "cards" && flashMode !== "learn") return;
    focusFlashArea();
  }, [activeTab, flashMode]);

  useEffect(() => {
    if (practiceSubView !== "exam") return;
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

  useEffect(() => {
    if (!examSessionOpen) return;
    const timer = window.setTimeout(() => setExamSheetVisible(true), 18);
    return () => window.clearTimeout(timer);
  }, [examSessionOpen]);

  useEffect(() => {
    if (!examSessionOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [examSessionOpen]);

  useEffect(() => {
    if (!flashDeckBuilderOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [flashDeckBuilderOpen]);

  useEffect(() => {
    return () => {
      if (examAdvanceTimerRef.current) window.clearTimeout(examAdvanceTimerRef.current);
    };
  }, []);

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
    recordStudyActivity("exam", `Lección ${examLesson}`);

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
    setExamFeedback(null);
    setExamStreak(0);
    examPersistedRef.current = false;
  };

  const answerExam = (option: string) => {
    if (!examCurrentQ || examFinished) return;
    const key = examCurrentQ.stableKey || examCurrentQ.id;
    setExamAnswers((prev) => ({ ...prev, [key]: option }));
  };

  const advanceExamQuestion = () => {
    if (examAdvanceTimerRef.current) {
      window.clearTimeout(examAdvanceTimerRef.current);
      examAdvanceTimerRef.current = null;
    }
    setExamFeedback(null);
    if (examIndex >= examQuestions.length - 1) {
      setExamFinished(true);
      return;
    }
    setExamIndex((prev) => prev + 1);
  };

  const finalizeExamAnswer = (answerValue: string) => {
    if (!examCurrentQ || examFinished || examFeedback) return;
    const key = examCurrentQ.stableKey || examCurrentQ.id;
    const correct = isExamQuestionCorrect(examCurrentQ, answerValue);
    const examItemType: StudySrsItemType =
      examCurrentQ.category === "kana"
        ? "kana"
        : examCurrentQ.category === "kanji"
          ? "kanji"
          : examCurrentQ.category === "vocab"
            ? "vocab"
            : "grammar";
    setExamAnswers((prev) => ({ ...prev, [key]: answerValue }));
    setExamFeedback({
      status: correct ? "correct" : "wrong",
      answer: examCurrentQ.correct,
      explanation: examCurrentQ.explanation,
    });
    recordSrsResult({
      itemId: key,
      itemType: examItemType,
      sourceTool: "exam",
      sourceLesson: examLesson,
      label: examCurrentQ.prompt,
      rating: correct ? "correct" : "wrong",
    });
    if (correct) {
      setExamStreak((value) => {
        const next = value + 1;
        setExamStreakPulse(next);
        return next;
      });
      examAdvanceTimerRef.current = window.setTimeout(() => {
        advanceExamQuestion();
      }, 680);
    } else {
      setExamStreak(0);
    }
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
    if (!examFeedback) {
      finalizeExamAnswer(examCurrentChoice || "");
      return;
    }
    advanceExamQuestion();
  };

  const resetExam = () => {
    if (examAdvanceTimerRef.current) {
      window.clearTimeout(examAdvanceTimerRef.current);
      examAdvanceTimerRef.current = null;
    }
    setExamSheetVisible(false);
    setExamQuestions([]);
    setExamAnswers({});
    setExamIndex(0);
    setExamFinished(false);
    setExamFeedback(null);
    setExamStreak(0);
    examPersistedRef.current = false;
  };

  const closeExamSession = () => {
    setExamSheetVisible(false);
    window.setTimeout(() => {
      resetExam();
    }, 220);
  };

  const startExamRetryWrong = () => {
    if (examWrongQuestions.length === 0) return;
    setExamQuestions(examWrongQuestions);
    setExamIndex(0);
    setExamAnswers({});
    setExamFinished(false);
    setExamFeedback(null);
    setExamStreak(0);
    examPersistedRef.current = false;
  };

  const renderQuizConfigurator = (compact = false) => (
    <div style={{ marginTop: compact ? 0 : 10, display: "grid", gap: 10 }}>
      <StudySelectorGroup
        options={[
          { key: "particles", label: "Partículas", tone: "var(--color-highlight-soft)" },
          { key: "conjugation", label: "Conjugación", tone: "var(--color-highlight-soft)" },
          { key: "vocab", label: "Vocab", tone: "var(--color-highlight-soft)" },
          { key: "kanji", label: "Kanji", tone: "var(--color-highlight-soft)" },
        ]}
        value={quizMode}
        onSelect={(value) => setQuizMode(value)}
        compact
        minItemWidth={108}
      />

      <StudySelectorGroup
        options={[10, 20, 30].map((n) => ({ key: String(n) as "10" | "20" | "30", label: `${n} preguntas` }))}
        value={String(quizCount) as "10" | "20" | "30"}
        onSelect={(value) => setQuizCount(Number(value) as QuizCount)}
        compact
        minItemWidth={108}
      />

      {quizMode !== "particles" && (
        <div>
          <div style={{ fontSize: 12, color: "#7c7c85", marginBottom: 6, fontWeight: 700 }}>
            Lecciones (acumulable){quizMode === "conjugation" ? " · desde L3" : ""}
          </div>
          <StudySelectorGroup
            options={availableQuizLessons.map((lesson) => ({ key: String(lesson) as `${number}`, label: `L${lesson}` }))}
            values={quizLessons.map((lesson) => String(lesson) as `${number}`)}
            multiple
            onToggle={(value) => toggleLesson(Number(value))}
            compact
            minItemWidth={72}
          />
        </div>
      )}

      {quizMode === "conjugation" && (
        <div>
          <div style={{ fontSize: 12, color: "#7c7c85", marginBottom: 6, fontWeight: 700 }}>Tipos de conjugación</div>
          <StudySelectorGroup
            options={([
              ["te", "Forma て", hasVerbInSelectedLessons],
              ["past", "Pasado corto", hasVerbInSelectedLessons],
              ["masu", "Forma ます", hasVerbInSelectedLessons],
              ["plain", "Forma base", hasVerbInSelectedLessons],
              ["adj-negative", "Adj. negativo", hasAdjInSelectedLessons],
              ["adj-past", "Adj. pasado", hasAdjInSelectedLessons],
            ] as [ConjType, string, boolean][])
              .filter(([, , enabled]) => enabled)
              .map(([kind, label]) => ({ key: kind, label }))}
            values={activeConjTypes}
            multiple
            onToggle={toggleConjType}
            compact
            minItemWidth={120}
          />
        </div>
      )}

      <div>
        <button type="button" onClick={startQuiz} style={primaryButtonStyle}>Iniciar quiz</button>
      </div>
    </div>
  );

  const toolCards = [
    { key: "learnkana", href: "/study?view=learnkana", title: "Aprender Kana", accent: "var(--color-accent-strong)", surface: "var(--color-highlight-soft)" },
    { key: "kana", href: "/study?view=kana", title: "Kana Sprint", accent: "var(--color-accent)", surface: "var(--color-accent-soft)" },
    { key: "sprint", href: "/study?view=sprint", title: "Vocab + Kanji", accent: "#457B9D", surface: "rgba(69, 123, 157, 0.1)" },
    { key: "flashcards", href: "/study?view=flashcards", title: "Flashcards", accent: "#F4A261", surface: "rgba(244, 162, 97, 0.12)" },
    { key: "exam", href: "/study?view=exam", title: "Repaso mixto", accent: "var(--color-accent-strong)", surface: "var(--color-highlight-soft)" },
  ];
  const renderToolPill = (tool: { key: string; href: string; title: string; accent: string; surface: string }) => {
    const selected = activeTab === tool.key;
    return (
      <Link
        key={tool.key}
        href={tool.href}
        style={{
          textDecoration: "none",
          minWidth: 118,
          maxWidth: 160,
          minHeight: 72,
          padding: "12px 14px",
          borderRadius: 22,
          display: "grid",
          alignContent: "space-between",
          gap: 8,
          background: selected ? tool.surface : "color-mix(in srgb, var(--color-surface) 82%, white)",
          border: selected ? "1px solid transparent" : "1px solid var(--color-border)",
          color: "var(--color-text)",
          boxShadow: selected ? "0 0 0 1px color-mix(in srgb, var(--color-bg) 70%, transparent)" : "none",
          scrollSnapAlign: "start",
          flex: "0 0 auto",
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: selected ? tool.accent : "color-mix(in srgb, var(--color-border) 80%, white)",
          }}
        />
        <div
          style={{
            fontSize: "var(--text-body-sm)",
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            textWrap: "balance",
          }}
        >
          {tool.title}
        </div>
      </Link>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: DS.bg, fontFamily: DS.fontHead }}>

      {activeTab === "home" && (
        <HomeScreen
          userKey={userKey}
          onTabChange={(tab) => setActiveTab(tab as StudyView)}
          weeklyActiveDays={weeklyActiveDays.size}
          dueCount={studyDueSummary.totalDue}
        />
      )}

      {activeTab === "learn" && (
        <AprenderKanaModule
          userKey={userKey}
          initialMode={searchParams.get("learn") === "1" ? "learn" : null}
          onRecordActivity={(detail) => recordStudyActivity("learnkana", detail)}
          onTabChange={(tab) => setActiveTab(tab as StudyView)}
        />
      )}

      {activeTab === "review" && (
        <ReviewScreen
          userKey={userKey}
          onTabChange={(tab) => setActiveTab(tab as StudyView)}
          onStartReview={() => setActiveTab("learn")}
        />
      )}

      {activeTab === "practice" && !practiceSubView && (
        <PracticeIndexScreen
          onTabChange={(tab) => setActiveTab(tab as StudyView)}
          onSelectMode={(mode) => setPracticeSubView(mode)}
        />
      )}

      {activeTab === "vault" && (
        <VaultScreen
          userKey={userKey}
          onTabChange={(tab) => setActiveTab(tab as StudyView)}
        />
      )}



      {activeTab === "practice" && practiceSubView === "sprint" && (
        <div style={{ minHeight: "100vh", background: DS.bg, fontFamily: DS.fontHead }}>
          <div style={{ height: 54 }} />
          <div style={{ padding: "8px 20px 0", display: "flex", alignItems: "center" }}>
            <button type="button" onClick={() => setPracticeSubView(null)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: DS.fontHead, fontSize: 13, fontWeight: 600, color: DS.inkSoft, padding: "4px 0" }}>
              <svg width="8" height="12" viewBox="0 0 8 12" fill="none"><path d="M7 1L1 6l6 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Practice
            </button>
          </div>
          <div style={{ padding: "16px 24px 8px" }}>
            <div style={{ fontFamily: DS.fontHead, fontSize: 28, fontWeight: 700, color: DS.ink, letterSpacing: -0.6 }}>Kana Sprint</div>
            <div style={{ fontFamily: DS.fontHead, fontSize: 28, fontWeight: 300, color: DS.inkSoft, letterSpacing: -0.6, fontStyle: "italic" }}>read fast.</div>
          </div>
          <div style={{ padding: "16px 24px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0, flex: "1 1 280px" }}>
                <StudySelectorGroup
                  options={[
                    { key: "hiragana", label: "Hiragana", tone: "var(--color-accent-soft)" },
                    { key: "katakana", label: "Katakana", tone: "rgba(69, 123, 157, 0.14)" },
                    { key: "mixed", label: "Mixto", tone: "var(--color-highlight-soft)" },
                  ]}
                  value={kanaSet}
                  onSelect={(value) => setKanaSet(value as KanaMode)}
                  layout="row"
                  compact
                  minItemWidth={112}
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 16 }}>
              <div style={{ fontFamily: DS.fontBody, fontSize: 13, color: DS.inkSoft }}>
                Best: <span style={{ color: DS.ink, fontWeight: 600 }}>{kanaBestByMode[kanaSet] || 0}</span> · Resets {weeklyResetLabel || "..."}
              </div>
              <button type="button" onClick={startKana} style={{ background: DS.ink, color: DS.bg, border: "none", borderRadius: 14, padding: "12px 24px", fontFamily: DS.fontHead, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Start Sprint
              </button>
            </div>
          </div>
          <TabBar active="practice" onTab={(tab) => setActiveTab(tab as StudyView)} />
        </div>
      )}

      {activeTab === "practice" && practiceSubView === "vocabkanji" && (
        <div style={{ minHeight: "100vh", background: DS.bg, fontFamily: DS.fontHead }}>
          <div style={{ height: 54 }} />
          <div style={{ padding: "8px 20px 0", display: "flex", alignItems: "center" }}>
            <button type="button" onClick={() => setPracticeSubView(null)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: DS.fontHead, fontSize: 13, fontWeight: 600, color: DS.inkSoft, padding: "4px 0" }}>
              <svg width="8" height="12" viewBox="0 0 8 12" fill="none"><path d="M7 1L1 6l6 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Practice
            </button>
          </div>
          <div style={{ padding: "16px 24px 8px" }}>
            <div style={{ fontFamily: DS.fontHead, fontSize: 28, fontWeight: 700, color: DS.ink, letterSpacing: -0.6 }}>Vocab + Kanji</div>
            <div style={{ fontFamily: DS.fontHead, fontSize: 28, fontWeight: 300, color: DS.inkSoft, letterSpacing: -0.6, fontStyle: "italic" }}>sprint mode.</div>
          </div>
          <div style={{ padding: "16px 24px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0, flex: "1 1 320px" }}>
                <StudySelectorGroup
                  options={VK_BUCKETS.map((bucket) => ({ key: bucket.key, label: bucket.label, tone: "rgba(69, 123, 157, 0.14)" }))}
                  value={vkBucket}
                  onSelect={(value) => setVkBucket(value as VkBucketKey)}
                  layout="row"
                  compact
                  minItemWidth={88}
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 16 }}>
              <div style={{ fontFamily: DS.fontBody, fontSize: 13, color: DS.inkSoft }}>
                Best: <span style={{ color: DS.ink, fontWeight: 600 }}>{vkBestByBucket[vkBucket] || 0}</span> · Resets {vkResetLabel || "..."}
              </div>
              <button type="button" onClick={startVkSprint} style={{ background: DS.ink, color: DS.bg, border: "none", borderRadius: 14, padding: "12px 24px", fontFamily: DS.fontHead, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Start Sprint
              </button>
            </div>
          </div>
          <TabBar active="practice" onTab={(tab) => setActiveTab(tab as StudyView)} />
        </div>
      )}

        <PracticeShell
          open={activeTab === "practice" && practiceSubView === "sprint" && kanaSessionOpen}
          visible={kanaSessionOpen}
          title="Kana Sprint"
          subtitle={`${kanaSet === "mixed" ? "Mixto" : kanaSet === "hiragana" ? "Hiragana" : "Katakana"} · ${kanaTime}s · ${kanaScore} pts`}
          onClose={closeKanaSession}
        >
          <div style={{ display: "grid", gap: "var(--space-4)" }}>
            <PracticeStageCard
              label={kanaCountdown !== null ? "Preparado" : "Kana"}
              value={
                <div style={{ fontSize: kanaCountdown !== null ? "clamp(56px, 18vw, 84px)" : "clamp(110px, 34vw, 168px)", lineHeight: 0.92, letterSpacing: "-.05em", fontWeight: 800, color: "var(--color-text)" }}>
                  {kanaCountdown !== null ? (kanaCountdown > 0 ? kanaCountdown : "GO!") : kanaQuestion.char}
                </div>
              }
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
              {kanaQuestion.options.map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => answerKana(op)}
                  disabled={!kanaRunning || kanaCountdown !== null || kanaPenalty > 0 || kanaTime <= 0}
                  style={{
                    border: "1px solid color-mix(in srgb, var(--color-border) 88%, white)",
                    borderRadius: 24,
                    background: "color-mix(in srgb, var(--color-surface) 82%, white)",
                    padding: "18px 14px",
                    fontSize: 26,
                    fontWeight: 800,
                    cursor: kanaRunning && kanaCountdown === null && kanaPenalty === 0 && kanaTime > 0 ? "pointer" : "not-allowed",
                    opacity: kanaRunning && kanaCountdown === null && kanaPenalty === 0 && kanaTime > 0 ? 1 : .55,
                  }}
                >
                  {op}
                </button>
              ))}
            </div>
            {kanaPenalty > 0 ? (
              <div style={{ textAlign: "center", color: "#b42318", fontWeight: 800, fontSize: 13 }}>
                Penalización: espera {kanaPenalty}s
              </div>
            ) : null}
          </div>
        </PracticeShell>

        <PracticeShell
          open={activeTab === "practice" && practiceSubView === "vocabkanji" && vkSessionOpen}
          visible={vkSessionOpen}
          title="Vocab + Kanji Sprint"
          subtitle={`${vkBucketConfig.label} · ${vkTime}s · ${vkScore} pts`}
          onClose={closeVkSession}
        >
          <div style={{ display: "grid", gap: "var(--space-4)" }}>
            <PracticeStageCard
              label={vkCountdown !== null ? "Preparado" : vkQuestion.hint}
              value={
                <div style={{ fontSize: vkCountdown !== null ? "clamp(56px, 18vw, 84px)" : "clamp(42px, 10vw, 56px)", lineHeight: 1.08, letterSpacing: "-.04em", fontWeight: 800, color: "var(--color-text)", wordBreak: "break-word" }}>
                  {vkCountdown !== null ? (vkCountdown > 0 ? vkCountdown : "GO!") : vkQuestion.prompt}
                </div>
              }
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
              {vkQuestion.options.map((option) => (
                <button
                  key={`${vkQuestion.prompt}-${option}`}
                  type="button"
                  onClick={() => answerVk(option)}
                  disabled={!vkRunning || vkCountdown !== null || vkPenalty > 0 || vkTime <= 0}
                  style={{
                    border: "1px solid color-mix(in srgb, var(--color-border) 88%, white)",
                    borderRadius: 24,
                    background: "color-mix(in srgb, var(--color-surface) 82%, white)",
                    padding: "18px 14px",
                    fontSize: 18,
                    fontWeight: 800,
                    cursor: vkRunning && vkCountdown === null && vkPenalty === 0 && vkTime > 0 ? "pointer" : "not-allowed",
                    opacity: vkRunning && vkCountdown === null && vkPenalty === 0 && vkTime > 0 ? 1 : .55,
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
            {vkPenalty > 0 ? (
              <div style={{ textAlign: "center", color: "#b42318", fontWeight: 800, fontSize: 13 }}>
                Penalización: espera {vkPenalty}s
              </div>
            ) : null}
          </div>
        </PracticeShell>

      {activeTab === "practice" && practiceSubView === "flashcards" && (
        <div style={{ minHeight: "100vh", background: DS.bg, fontFamily: DS.fontHead }}>
          <div style={{ height: 54 }} />
          <div style={{ padding: "8px 20px 0", display: "flex", alignItems: "center" }}>
            <button type="button" onClick={() => setPracticeSubView(null)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: DS.fontHead, fontSize: 13, fontWeight: 600, color: DS.inkSoft, padding: "4px 0" }}>
              <svg width="8" height="12" viewBox="0 0 8 12" fill="none"><path d="M7 1L1 6l6 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Practice
            </button>
          </div>
          <div style={{ padding: "16px 24px 24px" }}>
            <div style={{ fontFamily: DS.fontHead, fontSize: 28, fontWeight: 700, color: DS.ink, letterSpacing: -0.6 }}>Flashcards</div>
            <div style={{ fontFamily: DS.fontHead, fontSize: 28, fontWeight: 300, color: DS.inkSoft, letterSpacing: -0.6, fontStyle: "italic" }}>your decks.</div>
          </div>
          <div style={{ padding: "0 24px" }}>
            {(flashLessonFolder !== null || Boolean(activeFlashSet?.isCustom)) && (
              <div style={{ marginBottom: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setFlashLessonFolder(null);
                    setFlashSetId(null);
                    setFlashMode("browse");
                  }}
                  style={secondaryButtonStyle}
                >
                  Volver a decks
                </button>
              </div>
            )}

            {flashLessonFolder === null && flashSetId === null && (
              <div style={{ display: "grid", gap: 14 }}>
                <div style={flashSectionStyle}>
                  <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                    {officialFlashLessons.map((entry) => (
                        <button
                          key={`folder-${entry.lesson}`}
                          type="button"
                          onClick={() => openFlashLesson(entry.lesson)}
                          style={flashDeckCardStyle}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--color-text)" }}>Lección {entry.lesson}</div>
                            <span
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: 999,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "color-mix(in srgb, var(--color-highlight-soft) 70%, white)",
                                color: "var(--color-accent-strong)",
                                fontSize: 12,
                                fontWeight: 800,
                                flexShrink: 0,
                              }}
                            >
                              ↗
                            </span>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={{ fontSize: "var(--text-h3)", fontWeight: 800, color: "var(--color-text)" }}>Mis decks</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openCustomFlashDeckBuilder()}
                      style={secondaryButtonStyle}
                    >
                      Crear deck
                    </button>
                  </div>

                  {customFlashSets.length > 0 ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      {customFlashSets.map((set) => (
                        <div
                          key={set.id}
                          style={{
                            display: "grid",
                            gap: 8,
                            padding: "10px 12px",
                            borderRadius: 18,
                            background: "color-mix(in srgb, var(--color-surface) 82%, white)",
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => openFlashSet(set.id)}
                            style={{ display: "block", width: "100%", textAlign: "left", border: 0, background: "transparent", padding: 0, cursor: "pointer" }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text)" }}>{set.title}</div>
                              <div style={{ ...chipStyle, padding: "4px 8px", fontSize: 10 }}>{set.items.length} tarjetas</div>
                            </div>
                            <div style={{ marginTop: 2, fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.35 }}>{set.description}</div>
                          </button>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button type="button" onClick={() => openCustomFlashDeckBuilder(customFlashDecks.find((deck) => deck.id === set.id))} style={secondaryButtonStyle}>
                              Editar
                            </button>
                            <button type="button" onClick={() => deleteCustomFlashDeck(set.id)} style={{ ...secondaryButtonStyle, color: "var(--color-text-muted)" }}>
                              Borrar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-muted)",
                        fontWeight: 700,
                        padding: "2px 2px 0",
                      }}
                    >
                      Aún no tienes decks personalizados.
                    </div>
                  )}

                </div>
              </div>
            )}

            {flashLessonFolder !== null && flashSetId === null && (
              <div style={{ marginTop: 10, display: "grid", gap: 8, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                {flashSetsInLesson.map((set) => (
                  <button
                    key={set.id}
                    type="button"
                    onClick={() => openFlashSet(set.id)}
                    style={flashDeckCardStyle}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>{set.title}</div>
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 999,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "color-mix(in srgb, var(--color-accent-soft) 68%, white)",
                          color: "var(--color-primary)",
                          fontSize: 12,
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        ↗
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#667085", lineHeight: 1.35 }}>{set.description}</div>
                    <div style={{ fontSize: 11, color: "#344054", fontWeight: 700 }}>{set.items.length} tarjetas</div>
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
                    : { marginTop: 10, display: "grid", gap: 12, scrollMarginTop: sectionScrollMarginTop }
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
                  <div style={panelStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div>
                      <div style={sectionKickerStyle}>
                        {activeFlashSet.isCustom ? "Mi deck" : `Lección ${activeFlashSet.lesson}`}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 20, fontWeight: 800 }}>{activeFlashSet.title}</div>
                      <div style={{ marginTop: 4, color: "#667085", fontSize: 13 }}>{activeFlashSet.description}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {isFlashFocusMode && (
                        <button type="button" onClick={() => setFlashMode("browse")} style={secondaryButtonStyle}>
                          Cerrar práctica
                        </button>
                      )}
                      <button type="button" onClick={() => setFlashSetId(null)} style={secondaryButtonStyle}>
                        Cambiar set
                      </button>
                      <button type="button" onClick={startFlashCards} style={primaryButtonStyle}>
                        Empezar flashcards
                      </button>
                      <button type="button" onClick={startFlashLearn} style={secondaryButtonStyle}>
                        Aprender
                      </button>
                    </div>
                  </div>
                </div>

                {flashMode === "browse" && (
                  <div style={panelStyle}>
                    <div style={{ ...sectionKickerStyle, marginBottom: 8 }}>Lista del set</div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {activeFlashItems.map((item) => (
                        <div key={item.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 1px minmax(0,1fr)", gap: 10, alignItems: "center", background: "var(--color-surface-muted)", color: "var(--color-text)", borderRadius: 12, padding: "10px 12px", border: "1px solid var(--color-border)" }}>
                          <span style={{ fontSize: 22, fontWeight: 700, wordBreak: "break-word" }}>{item.front}</span>
                          <span style={{ width: 1, height: "70%", background: "var(--color-border-strong)" }} />
                          <span style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-muted)", wordBreak: "break-word" }}>{item.back}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {flashMode === "cards" && activeFlashCard && (
                  <div style={panelStyle}>
                    <div style={{ marginBottom: 10, fontSize: 13, color: "#667085", fontWeight: 700 }}>
                      Tarjeta {flashCardIndex + 1} de {activeFlashDeck.length}
                    </div>
                    <div style={{ ...progressTrackStyle, marginBottom: 12 }}>
                      <div style={{ width: `${flashCardProgressPct}%`, height: "100%", background: "var(--color-accent)" }} />
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
                        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", border: "1px solid var(--color-border)", borderRadius: 14, background: "var(--color-surface-muted)", color: "var(--color-text)", display: "grid", placeItems: "center", padding: 16 }}>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.2, wordBreak: "break-word" }}>{activeFlashCard.front}</div>
                            <div style={{ marginTop: 10, fontSize: 12, color: "var(--color-text-muted)", fontWeight: 700 }}>Toca para voltear</div>
                          </div>
                        </div>
                        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)", border: "1px solid var(--color-border)", borderRadius: 14, background: "var(--color-surface)", color: "var(--color-text)", display: "grid", placeItems: "center", padding: 16 }}>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.2, wordBreak: "break-word" }}>{activeFlashCard.back}</div>
                            <div style={{ marginTop: 10, fontSize: 12, color: "var(--color-text-muted)", fontWeight: 700 }}>Toca para regresar</div>
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
                        style={{ ...secondaryButtonStyle, cursor: flashCardIndex <= 0 ? "not-allowed" : "pointer", opacity: flashCardIndex <= 0 ? 0.5 : 1 }}
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
                        style={{ ...secondaryButtonStyle, cursor: flashCardIndex >= activeFlashDeck.length - 1 ? "not-allowed" : "pointer", opacity: flashCardIndex >= activeFlashDeck.length - 1 ? 0.5 : 1 }}
                      >
                        Siguiente →
                      </button>
                    </div>
                  </div>
                )}

                {flashMode === "learn" && (
                  <div style={panelStyle}>
                    {!currentFlashLearnQ && !flashLearnFinished && (
                      <div style={{ fontSize: 13, color: "#667085" }}>Generando quiz...</div>
                    )}
                    {currentFlashLearnQ && !flashLearnFinished && (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <div style={{ fontSize: "var(--text-label)", color: "var(--color-text-muted)", fontWeight: 700 }}>Pregunta {flashLearnIndex + 1} / {flashLearnQuestions.length}</div>
                          <div style={{ fontSize: "var(--text-label)", color: "var(--color-text-muted)", fontWeight: 700 }}>Score: {flashLearnScore}</div>
                        </div>
                        <div style={{ ...progressTrackStyle, marginTop: 8 }}>
                          <div style={{ width: `${flashLearnProgressPct}%`, height: "100%", background: "var(--color-accent)" }} />
                        </div>
                        <div style={{ ...sectionKickerStyle, marginTop: 10 }}>Definición</div>
                        <div style={{ marginTop: 6, fontSize: 30, fontWeight: 800, color: "#111114", wordBreak: "break-word" }}>{currentFlashLearnQ.prompt}</div>
                        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>
                          {currentFlashLearnQ.options.map((option) => {
                            const isSelected = flashLearnChoice === option;
                            const isCorrect = option === currentFlashLearnQ.correct;
                            const showResult = Boolean(flashLearnChoice);
                            let bg = "var(--color-surface)";
                            let color = "var(--color-text)";
                            let border = "1px solid var(--color-border)";
                            if (showResult && isCorrect) {
                              bg = "var(--color-surface-muted)";
                              color = "var(--color-text)";
                              border = "1px solid var(--color-border-strong)";
                            } else if (showResult && isSelected && !isCorrect) {
                              bg = "var(--color-surface-muted)";
                              color = "var(--color-text)";
                              border = "1px solid var(--color-border-strong)";
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
                            <div style={{ fontWeight: 700, color: "var(--color-text)" }}>
                              {flashLearnChoice === currentFlashLearnQ.correct ? "Correcto" : `Incorrecto. Respuesta: ${currentFlashLearnQ.correct}`}
                            </div>
                            <button type="button" onClick={nextFlashLearn} style={secondaryButtonStyle}>
                              {flashLearnIndex >= flashLearnQuestions.length - 1 ? "Ver score" : "Siguiente"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {flashLearnFinished && (
                      <div>
                        <div style={sectionKickerStyle}>Resultado</div>
                        <div style={{ marginTop: 8, fontSize: 34, fontWeight: 800 }}>{flashLearnScore} / {flashLearnQuestions.length}</div>
                        <div style={{ marginTop: 4, color: "#667085", fontSize: 14 }}>
                          {Math.round((flashLearnScore / Math.max(1, flashLearnQuestions.length)) * 100)}% de aciertos
                        </div>
                        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {activeFlashSet && flashLearnWrongItems.length >= 4 ? (
                            <button type="button" onClick={() => launchFlashLearnSession(activeFlashSet, flashLearnWrongItems)} style={primaryButtonStyle}>
                              Repasar falladas
                            </button>
                          ) : null}
                          <button type="button" onClick={startFlashLearn} style={primaryButtonStyle}>
                            Otra sesión
                          </button>
                          <button type="button" onClick={() => setFlashMode("browse")} style={secondaryButtonStyle}>
                            Volver
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              </div>
            )}
          </div>
          <TabBar active="practice" onTab={(tab) => setActiveTab(tab as StudyView)} />
        </div>
      )}

      {activeTab === "practice" && practiceSubView === "exam" && (
        <div style={{ minHeight: "100vh", background: DS.bg, fontFamily: DS.fontHead }}>
          <div style={{ height: 54 }} />
          <div style={{ padding: "8px 20px 0", display: "flex", alignItems: "center" }}>
            <button type="button" onClick={() => setPracticeSubView(null)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: DS.fontHead, fontSize: 13, fontWeight: 600, color: DS.inkSoft, padding: "4px 0" }}>
              <svg width="8" height="12" viewBox="0 0 8 12" fill="none"><path d="M7 1L1 6l6 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Practice
            </button>
          </div>
          <div style={{ padding: "16px 24px 24px" }}>
            <div style={{ fontFamily: DS.fontHead, fontSize: 28, fontWeight: 700, color: DS.ink, letterSpacing: -0.6 }}>Repaso mixto</div>
            <div style={{ fontFamily: DS.fontHead, fontSize: 28, fontWeight: 300, color: DS.inkSoft, letterSpacing: -0.6, fontStyle: "italic" }}>mixed review.</div>
          </div>
          <div style={{ padding: "0 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "var(--text-h2)" }}>Repaso mixto</h2>
              <div style={{ minWidth: 0, flex: "1 1 320px" }}>
                <StudySelectorGroup
                  options={LESSONS.map((lesson) => ({ key: String(lesson) as `${number}`, label: `L${lesson}`, tone: "var(--color-highlight-soft)" }))}
                  value={String(examLesson) as `${number}`}
                  onSelect={(value) => {
                    setExamLesson(Number(value));
                    resetExam();
                  }}
                  layout="row"
                  compact
                  minItemWidth={72}
                />
              </div>
            </div>

            {examQuestions.length === 0 && (
              <div ref={examCardRef} style={{ ...mutedPanelStyle, marginTop: 14, scrollMarginTop: sectionScrollMarginTop }}>
                <div style={{ marginTop: 6, fontSize: "var(--text-h2)", fontWeight: 800 }}>Repaso L{examLesson}</div>
                <button
                  type="button"
                  onClick={startExam}
                  style={{ ...primaryButtonStyle, marginTop: 10 }}
                >
                  Iniciar repaso
                </button>
              </div>
            )}

            <div style={{ marginTop: 14, borderTop: "1px dashed rgba(17,17,20,.1)", paddingTop: 12 }}>
              <div style={{ ...sectionKickerStyle, marginBottom: 8 }}>
                Historial reciente
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {examHistory.slice(0, 6).map((attempt, index) => (
                  <div key={`${attempt.createdAt}-${index}`} style={{ ...panelStyle, padding: "8px 10px", display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, color: "var(--color-text)", fontWeight: 700 }}>
                      L{attempt.lesson} · {attempt.score}/{attempt.total} ({attempt.percent}%)
                    </span>
                    <span style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 700 }}>
                      {attempt.passed ? "Aprobado" : "No aprobado"}
                    </span>
                  </div>
                ))}
                {examHistory.length === 0 && <div style={{ color: "#98a2b3", fontSize: 12 }}>Aún no hay intentos.</div>}
              </div>
            </div>
          </div>
          <TabBar active="practice" onTab={(tab) => setActiveTab(tab as StudyView)} />
        </div>
      )}

        <PracticeShell
          open={activeTab === "practice" && practiceSubView === "exam" && examSessionOpen}
          visible={examSheetVisible}
          title="Repaso mixto"
          subtitle={
            examFinished
              ? `Lección ${examLesson} · Resumen`
              : `Lección ${examLesson} · ${formatExamCategoryLabel(examCurrentQ?.category)}`
          }
          current={examFinished ? undefined : examIndex + 1}
          total={examFinished ? undefined : examQuestions.length}
          streak={examFinished ? 0 : examStreak}
          streakPulseKey={examStreakPulse}
          onClose={closeExamSession}
        >
          {examCurrentQ && !examFinished ? (
            <div style={{ display: "grid", gap: "var(--space-4)" }}>
              <PracticeStageCard
                label={formatExamCategoryLabel(examCurrentQ.category)}
                feedback={examFeedback?.status || null}
                value={
                  <div style={{ fontSize: "clamp(24px, 6vw, 34px)", fontWeight: 800, color: "var(--color-text)", whiteSpace: "pre-line", lineHeight: 1.3 }}>
                    {examCurrentQ.prompt}
                  </div>
                }
              >
                {examCurrentQ.hint ? (
                  <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 700 }}>
                    {examCurrentQ.hint}
                  </div>
                ) : null}
              </PracticeStageCard>

              {examCurrentQ.type === "match" && examCurrentQ.matchLeft && examCurrentQ.matchRight ? (
                <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
                  <div style={{ ...panelStyle, padding: 12 }}>
                    <div style={sectionKickerStyle}>A</div>
                    <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                      {examCurrentQ.matchLeft.map((item) => <div key={item} style={{ fontSize: 14, color: "var(--color-text)" }}>{item}</div>)}
                    </div>
                  </div>
                  <div style={{ ...panelStyle, padding: 12 }}>
                    <div style={sectionKickerStyle}>B</div>
                    <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                      {examCurrentQ.matchRight.map((item) => <div key={item} style={{ fontSize: 14, color: "var(--color-text)" }}>{item}</div>)}
                    </div>
                  </div>
                </div>
              ) : null}

              {examCurrentQ.type === "reorder" ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ ...panelStyle, padding: 12 }}>
                    <div style={sectionKickerStyle}>Tu oración</div>
                    <div style={{ marginTop: 8, minHeight: 52, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      {decodeReorderAnswer(examCurrentChoice || "").length > 0 ? (
                        decodeReorderAnswer(examCurrentChoice || "").map((tokenId) => {
                          const token = examCurrentQ.reorderTokens?.find((item) => item.id === tokenId);
                          if (!token) return null;
                          return <span key={tokenId} style={chipStyle}>{token.label}</span>;
                        })
                      ) : (
                        <span style={{ color: "#98a2b3", fontSize: 14 }}>Ordena los bloques.</span>
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
                          disabled={used || Boolean(examFeedback)}
                          onClick={() => appendExamReorderToken(token.id)}
                          style={{
                            border: "1px solid var(--color-border)",
                            borderRadius: 999,
                            background: used ? "var(--color-surface-muted)" : "var(--color-surface)",
                            color: used ? "var(--color-text-muted)" : "var(--color-text)",
                            padding: "8px 12px",
                            fontWeight: 700,
                            cursor: used || examFeedback ? "not-allowed" : "pointer",
                          }}
                        >
                          {token.label}
                        </button>
                      );
                    })}
                  </div>
                  {!examFeedback ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" onClick={popExamReorderToken} style={secondaryButtonStyle}>Borrar último</button>
                      <button type="button" onClick={clearExamReorder} style={secondaryButtonStyle}>Limpiar</button>
                    </div>
                  ) : null}
                </div>
              ) : examCurrentQ.type === "text" ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <input
                    value={examCurrentChoice || ""}
                    onChange={(event) => answerExam(event.target.value)}
                    placeholder="Escribe tu respuesta"
                    style={{ border: "1px solid var(--color-border)", borderRadius: 18, background: "var(--color-surface)", padding: "14px 16px", fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}
                  />
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {examCurrentQ.options.map((op) => {
                    const isSelected = examCurrentChoice === op;
                    const isCorrect = op === examCurrentQ.correct;
                    const showResult = Boolean(examFeedback);
                    return (
                      <button
                        key={op}
                        type="button"
                        onClick={() => {
                          if (showResult) return;
                          finalizeExamAnswer(op);
                        }}
                        disabled={showResult}
                        style={{
                          textAlign: "left",
                          border: "1px solid color-mix(in srgb, var(--color-border) 88%, white)",
                          borderRadius: 22,
                          background:
                            showResult && isCorrect
                              ? "color-mix(in srgb, var(--color-accent-soft) 76%, white)"
                              : showResult && isSelected && !isCorrect
                                ? "color-mix(in srgb, var(--color-highlight-soft) 76%, white)"
                                : "color-mix(in srgb, var(--color-surface) 82%, white)",
                          color: "var(--color-text)",
                          padding: "16px 18px",
                          fontSize: 17,
                          fontWeight: 700,
                          cursor: showResult ? "default" : "pointer",
                        }}
                      >
                        {op}
                      </button>
                    );
                  })}
                </div>
              )}

              {examFeedback ? (
                <div style={{ display: "grid", gap: 10, justifyItems: "center", textAlign: "center" }}>
                  <div style={{ fontSize: "var(--text-body)", color: examFeedback.status === "correct" ? "#117964" : "var(--color-text)", fontWeight: 800 }}>
                    {examFeedback.status === "correct" ? "Correcto" : `Respuesta: ${examFeedback.answer}`}
                  </div>
                  {examFeedback.explanation ? (
                    <div style={{ maxWidth: 520, fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 700 }}>
                      {examFeedback.explanation}
                    </div>
                  ) : null}
                  {examFeedback.status === "wrong" || examCurrentQ.type === "text" || examCurrentQ.type === "reorder" ? (
                    <button type="button" onClick={nextExamQuestion} className="ds-btn">
                      {examIndex >= examQuestions.length - 1 ? "Ver resumen" : "Siguiente"}
                    </button>
                  ) : null}
                </div>
              ) : examCurrentQ.type === "text" || examCurrentQ.type === "reorder" ? (
                <button type="button" onClick={nextExamQuestion} className="ds-btn">
                  Comprobar
                </button>
              ) : null}
            </div>
          ) : null}

          {examFinished ? (
            <div style={{ display: "grid", gap: "var(--space-3)" }}>
              <div
                style={{
                  display: "grid",
                  gap: 14,
                  padding: "18px 18px 16px",
                  borderRadius: 30,
                  background: "color-mix(in srgb, var(--color-surface) 86%, white)",
                  boxShadow: "0 18px 34px rgba(26,26,46,.05)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ fontSize: "var(--text-label)", color: "var(--color-text-muted)", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>
                      Resultado
                    </div>
                    <div style={{ fontSize: "clamp(38px, 12vw, 62px)", lineHeight: 0.92, letterSpacing: "-.05em", fontWeight: 800, color: "var(--color-text)" }}>
                      {examScore} / {examQuestions.length}
                    </div>
                  </div>
                  <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 700 }}>
                    {examPercent}% · {examPassed ? "Aprobado" : "No aprobado"}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))" }}>
                  {examCategoryBreakdown.map((row) => {
                    const pct = Math.round((row.correct / Math.max(1, row.total)) * 100);
                    return (
                      <div key={row.category} style={{ ...panelStyle, padding: 12 }}>
                        <div style={sectionKickerStyle}>{formatExamCategoryLabel(row.category)}</div>
                        <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800, color: "var(--color-text)" }}>{row.correct}/{row.total}</div>
                        <div style={{ marginTop: 2, fontSize: 12, color: "var(--color-text-muted)" }}>{pct}%</div>
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    padding: "12px 14px",
                    borderRadius: 22,
                    background: "color-mix(in srgb, var(--color-highlight-soft) 52%, white)",
                  }}
                >
                  <div style={{ fontSize: "var(--text-label)", color: "var(--color-text-muted)", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>
                    Errores
                  </div>
                  {examWrongQuestions.length === 0 ? (
                    <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text)", fontWeight: 700 }}>Excelente. No hubo errores.</div>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {examWrongQuestions.slice(0, 6).map((question, index) => {
                        const key = question.stableKey || question.id;
                        return (
                          <div key={`${key}-${index}`} style={{ ...panelStyle, padding: 10 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)", whiteSpace: "pre-line" }}>{question.prompt}</div>
                            <div style={{ marginTop: 4, fontSize: 12, color: "var(--color-text-muted)" }}>
                              Tu respuesta: {formatExamAnswer(question, examAnswers[key])}
                            </div>
                            <div style={{ marginTop: 2, fontSize: 12, color: "var(--color-text)" }}>Correcta: {question.correct}</div>
                            {question.explanation ? <div style={{ marginTop: 4, fontSize: 12, color: "var(--color-text-muted)" }}>{question.explanation}</div> : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {examWrongQuestions.length > 0 ? (
                  <button type="button" onClick={startExamRetryWrong} className="ds-btn">
                    Repasar falladas
                  </button>
                ) : null}
                <button type="button" onClick={startExam} className="ds-btn">
                  Otra sesión
                </button>
                <button type="button" onClick={closeExamSession} className="ds-btn-secondary">
                  Volver
                </button>
              </div>
            </div>
          ) : null}
        </PracticeShell>

        {flashDeckBuilderOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 95,
              background: "rgba(26, 26, 46, 0.18)",
              backdropFilter: "blur(10px)",
              display: "grid",
              alignItems: "end",
              padding: "12px",
            }}
          >
            <div
              style={{
                width: "min(100%, 640px)",
                margin: "0 auto",
                display: "grid",
                gap: 14,
                padding: "16px 16px calc(16px + env(safe-area-inset-bottom))",
                borderRadius: 30,
                background: "color-mix(in srgb, var(--color-surface) 90%, white)",
                border: "1px solid var(--color-border)",
                boxShadow: "0 20px 40px rgba(26,26,46,.1)",
                maxHeight: "min(78dvh, 640px)",
                overflowY: "auto",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-text)" }}>{flashDeckEditingId ? "Editar deck" : "Crear deck"}</div>
                <button type="button" onClick={closeCustomFlashDeckBuilder} style={secondaryButtonStyle}>
                  Cerrar
                </button>
              </div>

              <input
                value={flashDeckName}
                onChange={(event) => setFlashDeckName(event.target.value)}
                placeholder="Ej. L3-L5 vocab + kanji"
                style={{ border: "1px solid rgba(17,17,20,.12)", borderRadius: 16, background: "#fff", padding: "12px 14px", fontSize: 16, fontWeight: 700, color: "#111114" }}
              />

              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 800 }}>
                    Vocabulario
                  </div>
                  <StudySelectorGroup
                    options={flashDeckBuilderVocabOptions}
                    values={flashDeckBuilderSetIds.filter((setId) => setId.endsWith("-vocab"))}
                    multiple
                    onToggle={toggleCustomFlashSetSelection}
                    layout="grid"
                    compact
                    minItemWidth={72}
                  />
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 800 }}>
                    Kanji
                  </div>
                  <StudySelectorGroup
                    options={flashDeckBuilderKanjiOptions}
                    values={flashDeckBuilderSetIds.filter((setId) => setId.endsWith("-kanji"))}
                    multiple
                    onToggle={toggleCustomFlashSetSelection}
                    layout="grid"
                    compact
                    minItemWidth={72}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-text-muted)", fontWeight: 700 }}>
                  {flashDeckBuilderSetIds.length} bloques · {flashDeckBuilderPreviewItems.length} tarjetas
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" onClick={closeCustomFlashDeckBuilder} style={secondaryButtonStyle}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={saveCustomFlashDeck}
                    disabled={flashDeckName.trim().length === 0 || flashDeckBuilderSelectedSetIds.length === 0}
                    style={{
                      ...primaryButtonStyle,
                      opacity: flashDeckName.trim().length === 0 || flashDeckBuilderSelectedSetIds.length === 0 ? 0.5 : 1,
                      cursor: flashDeckName.trim().length === 0 || flashDeckBuilderSelectedSetIds.length === 0 ? "not-allowed" : "pointer",
                    }}
                  >
                    {flashDeckEditingId ? "Guardar" : "Crear"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <style jsx>{`
          @keyframes studyViewIn {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
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
