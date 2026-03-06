"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { GENKI_VOCAB_BY_LESSON } from "@/lib/genki-vocab-l1-l7";

type KanaPair = readonly [string, string];
type QuizCount = 10 | 20 | 30;
type QuizMode = "particles" | "conjugation" | "vocab" | "kanji";
type ConjType = "te" | "past" | "masu" | "dictionary" | "adj-negative" | "adj-past";
type VerbKind = "ru" | "u" | "irregular";
type AdjKind = "i" | "na";
type KanaMode = "hiragana" | "katakana";

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

type KanaScoreRow = {
  user_id: string;
  mode: KanaMode;
  best_score: number;
  updated_at?: string | null;
  profiles?: {
    username?: string | null;
    full_name?: string | null;
  } | null;
};

type StudyView = "kana" | "flashcards" | "quiz";

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
};

type FlashLearnQuestion = {
  id: string;
  prompt: string;
  correct: string;
  options: string[];
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
  return shuffle([correct, ...wrong.slice(0, 3)]);
}

function rankBadgeStyles(index: number) {
  if (index === 0) return { bg: "linear-gradient(135deg,#fbbf24,#f59e0b)", border: "#f59e0b", color: "#111114" };
  if (index === 1) return { bg: "linear-gradient(135deg,#d1d5db,#9ca3af)", border: "#9ca3af", color: "#111114" };
  if (index === 2) return { bg: "linear-gradient(135deg,#f59e0b,#b45309)", border: "#b45309", color: "#fff" };
  return { bg: "#fff", border: "#d1d5db", color: "#6b7280" };
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

function resolveStudyView(searchParams: Pick<URLSearchParams, "get">): StudyView | null {
  const view = searchParams.get("view");
  if (view === "kana" || view === "flashcards") return view;
  if (searchParams.get("kana") === "1") return "kana";
  if (searchParams.get("flashcards") === "1") return "flashcards";
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
    (KANJI_FROM_URL[lesson] || []).map((item, index) => ({
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

  const lesson5Adjs = ALL_ADJECTIVES.filter((adj) => adj.lesson === 5);
  addSet({ id: "l5-vocab", lesson: 5, title: "Vocabulario", description: "Lección 5", items: mapVocab(5) });
  addSet({
    id: "l5-adj-negative",
    lesson: 5,
    title: "Adjetivos · presente negativo",
    description: "Diccionario → presente negativo (formal)",
    items: lesson5Adjs.map((adj, index) => ({
      id: `l5-an-${index + 1}`,
      front: `${adj.kana} (${adj.es})`,
      back: toAdjNegativePolite(adj),
    })),
  });
  addSet({
    id: "l5-adj-past",
    lesson: 5,
    title: "Adjetivos · pasado afirmativo",
    description: "Diccionario → pasado afirmativo (formal)",
    items: lesson5Adjs.map((adj, index) => ({
      id: `l5-ap-${index + 1}`,
      front: `${adj.kana} (${adj.es})`,
      back: toAdjPastPolite(adj),
    })),
  });
  addSet({
    id: "l5-adj-past-negative",
    lesson: 5,
    title: "Adjetivos · pasado negativo",
    description: "Diccionario → pasado negativo (formal)",
    items: lesson5Adjs.map((adj, index) => ({
      id: `l5-apn-${index + 1}`,
      front: `${adj.kana} (${adj.es})`,
      back: toAdjPastNegativePolite(adj),
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
  const [kanaBestByMode, setKanaBestByMode] = useState<Record<KanaMode, number>>({ hiragana: 0, katakana: 0 });
  const [kanaCountdown, setKanaCountdown] = useState<number | null>(null);
  const [kanaPenalty, setKanaPenalty] = useState(0);
  const [kanaLeaderboard, setKanaLeaderboard] = useState<Record<KanaMode, KanaScoreRow[]>>({ hiragana: [], katakana: [] });
  const [leaderboardUnavailable, setLeaderboardUnavailable] = useState(false);
  const [kanaQuestion, setKanaQuestion] = useState<{ char: string; correct: string; options: string[] }>({
    char: "あ",
    correct: "a",
    options: ["a", "i", "u", "e"],
  });
  const kanaRoundSubmittedRef = useRef(false);
  const pendingKanaSubmitRef = useRef<{ mode: KanaMode; score: number } | null>(null);

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
  const flashFocusRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const boot = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const key = user?.id || "anon";
      setCurrentUserId(user?.id || null);
      setUserKey(key);
      try {
        const rawBest = localStorage.getItem(`study-kana-best-map-${key}`);
        if (rawBest) {
          const parsed = JSON.parse(rawBest);
          const hira = Number(parsed?.hiragana || 0);
          const kata = Number(parsed?.katakana || 0);
          setKanaBestByMode({
            hiragana: Number.isNaN(hira) ? 0 : hira,
            katakana: Number.isNaN(kata) ? 0 : kata,
          });
        }
      } catch {}
    };
    void boot();
  }, []);

  useEffect(() => {
    if (selectedView) {
      setActiveTab(selectedView);
      return;
    }
    setActiveTab("kana");
  }, [selectedView]);

  useEffect(() => {
    if (!kanaRunning || kanaTime <= 0 || kanaPenalty > 0 || kanaCountdown !== null) return;
    const timer = window.setTimeout(() => setKanaTime((v) => v - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [kanaRunning, kanaTime, kanaPenalty, kanaCountdown]);

  useEffect(() => {
    if (kanaTime <= 0) setKanaRunning(false);
  }, [kanaTime]);

  useEffect(() => {
    if (kanaCountdown === null) return;
    if (kanaCountdown <= 0) {
      setKanaCountdown(null);
      setKanaRunning(true);
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

  const kanaPool = kanaSet === "hiragana" ? HIRAGANA : KATAKANA;

  const createKanaQuestion = () => {
    const [char, romaji] = kanaPool[Math.floor(Math.random() * kanaPool.length)];
    setKanaQuestion({ char, correct: romaji, options: romajiOptions(kanaPool, romaji) });
  };

  const loadKanaLeaderboard = async () => {
    const { data, error } = await supabase
      .from("study_kana_scores")
      .select("user_id, mode, best_score, updated_at, profiles:user_id (username, full_name)")
      .order("best_score", { ascending: false })
      .order("updated_at", { ascending: true })
      .limit(200);

    if (error) {
      setLeaderboardUnavailable(true);
      return;
    }
    const rows = (data || []) as KanaScoreRow[];
    const hira = rows.filter((r) => r.mode === "hiragana").slice(0, 10);
    const kata = rows.filter((r) => r.mode === "katakana").slice(0, 10);
    setKanaLeaderboard({ hiragana: hira, katakana: kata });
    setLeaderboardUnavailable(false);
  };

  const submitKanaScore = async (mode: KanaMode, score: number) => {
    setKanaBestByMode((prev) => {
      const next: Record<KanaMode, number> = { ...prev, [mode]: Math.max(prev[mode] || 0, score) };
      try {
        localStorage.setItem(`study-kana-best-map-${userKey}`, JSON.stringify(next));
      } catch {}
      return next;
    });

    if (!currentUserId) {
      pendingKanaSubmitRef.current = { mode, score };
      return;
    }
    const safeBestScore = Math.max(score, kanaBestByMode[mode] || 0);
    const { error } = await supabase.from("study_kana_scores").upsert(
      { user_id: currentUserId, mode, best_score: safeBestScore, updated_at: new Date().toISOString() },
      { onConflict: "user_id,mode" },
    );
    if (error) {
      setLeaderboardUnavailable(true);
      return;
    }
    await loadKanaLeaderboard();
  };

  const startKana = () => {
    if ((kanaRunning || kanaTime < 60) && kanaScore > 0 && !kanaRoundSubmittedRef.current) {
      kanaRoundSubmittedRef.current = true;
      void submitKanaScore(kanaSet, kanaScore);
    }
    setKanaRunning(false);
    setKanaTime(60);
    setKanaScore(0);
    setKanaPenalty(0);
    setKanaCountdown(3);
    kanaRoundSubmittedRef.current = false;
    createKanaQuestion();
  };

  const answerKana = (choice: string) => {
    if (!kanaRunning || kanaPenalty > 0 || kanaCountdown !== null || kanaTime <= 0) return;
    if (choice === kanaQuestion.correct) {
      setKanaScore((v) => v + 1);
    } else {
      setKanaPenalty(2);
    }
    createKanaQuestion();
  };

  const flashLessons = useMemo(
    () => Array.from(new Set(FLASHCARD_SETS.map((set) => set.lesson))).sort((a, b) => a - b),
    [],
  );
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
    () => flashSetsInLesson.find((set) => set.id === flashSetId) || null,
    [flashSetsInLesson, flashSetId],
  );
  const activeFlashItems = activeFlashSet?.items || [];
  const activeFlashDeck = flashCardsDeck.length > 0 ? flashCardsDeck : activeFlashItems;
  const activeFlashCard = activeFlashDeck[flashCardIndex] || null;
  const flashCardProgressPct = activeFlashDeck.length > 0 ? Math.round(((flashCardIndex + 1) / activeFlashDeck.length) * 100) : 0;

  const openFlashLesson = (lesson: number) => {
    setFlashLessonFolder(lesson);
    setFlashSetId(null);
    setFlashMode("browse");
    setFlashCardsDeck([]);
  };

  const openFlashSet = (setId: string) => {
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
  const quizProgressPct = quizQuestions.length
    ? Math.round(((quizFinished ? quizQuestions.length : quizIndex + 1) / quizQuestions.length) * 100)
    : 0;
  const availableQuizLessons = quizMode === "conjugation" ? LESSONS.filter((l) => l >= 3) : LESSONS;
  const hasVerbInSelectedLessons = ALL_VERBS.some((v) => quizLessons.includes(v.lesson));
  const hasAdjInSelectedLessons = ALL_ADJECTIVES.some((a) => quizLessons.includes(a.lesson));
  const activeConjTypes: ConjType[] = conjTypes.length > 0 ? [...conjTypes] : ["te"];
  const showHub = !selectedView;

  const pageMeta = selectedView
    ? selectedView === "kana"
      ? { title: "Kana Sprint", subtitle: "Entrena velocidad y precisión de hiragana/katakana." }
      : { title: "Flashcards", subtitle: "Carpetas por lección y práctica por set." }
    : { title: "Study Lab", subtitle: "Selecciona una herramienta y practica por bloques." };

  useEffect(() => {
    void loadKanaLeaderboard();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    const pending = pendingKanaSubmitRef.current;
    if (!pending) return;
    pendingKanaSubmitRef.current = null;
    void submitKanaScore(pending.mode, pending.score);
  }, [currentUserId]);

  useEffect(() => {
    if (kanaTime > 0) return;
    if (kanaRoundSubmittedRef.current) return;
    kanaRoundSubmittedRef.current = true;
    void submitKanaScore(kanaSet, kanaScore);
  }, [kanaTime, kanaSet, kanaScore, currentUserId, kanaBestByMode]);

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

        <section style={{ background: "linear-gradient(145deg, #ffffff, #f7fffc)", border: "1px solid rgba(17,17,20,.07)", borderRadius: 18, padding: 14 }}>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.1, letterSpacing: "-.02em" }}>{pageMeta.title}</h1>
          <p style={{ margin: "8px 0 0", color: "#667085", fontSize: 14, lineHeight: 1.5 }}>
            {pageMeta.subtitle}
          </p>
        </section>

        {!showHub && (
          <section style={{ background: "#fff", border: "1px solid rgba(17,17,20,.07)", borderRadius: 14, padding: 10, display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
            <Link href="/study?view=kana" style={{ textDecoration: "none", border: "1px solid rgba(17,17,20,.1)", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700, color: activeTab === "kana" ? "#fff" : "#344054", background: activeTab === "kana" ? "#111114" : "#fff" }}>Kana Sprint</Link>
            <Link href="/study?view=flashcards" style={{ textDecoration: "none", border: "1px solid rgba(17,17,20,.1)", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700, color: activeTab === "flashcards" ? "#fff" : "#344054", background: activeTab === "flashcards" ? "#111114" : "#fff" }}>Flashcards</Link>
          </section>
        )}

        {showHub && (
          <section style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
            <Link href="/study?view=kana" style={{ textDecoration: "none", color: "#111114", border: "1px solid rgba(17,17,20,.07)", borderRadius: 16, background: "#fff", padding: 14 }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>Sprint</div>
              <div style={{ marginTop: 4, fontSize: 22, fontWeight: 800 }}>Kana Sprint</div>
              <p style={{ margin: "8px 0 0", color: "#667085", fontSize: 13 }}>Hiragana/Katakana con timer, penalty y leaderboard.</p>
            </Link>
            <Link href="/study?view=flashcards" style={{ textDecoration: "none", color: "#111114", border: "1px solid rgba(17,17,20,.07)", borderRadius: 16, background: "#fff", padding: 14 }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>SRS</div>
              <div style={{ marginTop: 4, fontSize: 22, fontWeight: 800 }}>Flashcards</div>
              <p style={{ margin: "8px 0 0", color: "#667085", fontSize: 13 }}>Vocab Genki I por lección con repaso inteligente.</p>
            </Link>
          </section>
        )}

        {!showHub && activeTab === "kana" && (
          <section style={{ background: "#fff", border: "1px solid rgba(17,17,20,.07)", borderRadius: 20, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 24 }}>Kana Sprint</h2>
              <div style={{ display: "inline-flex", gap: 4, border: "1px solid rgba(17,17,20,.08)", borderRadius: 999, padding: 3 }}>
                <button type="button" onClick={() => setKanaSet("hiragana")} style={{ border: 0, borderRadius: 999, padding: "6px 10px", background: kanaSet === "hiragana" ? "#111114" : "transparent", color: kanaSet === "hiragana" ? "#fff" : "#666" }}>Hiragana</button>
                <button type="button" onClick={() => setKanaSet("katakana")} style={{ border: 0, borderRadius: 999, padding: "6px 10px", background: kanaSet === "katakana" ? "#111114" : "transparent", color: kanaSet === "katakana" ? "#fff" : "#666" }}>Katakana</button>
              </div>
            </div>
            <p style={{ color: "#6b7280", fontSize: 14 }}>60 segundos. Elige la romanización correcta. Error = penalización de 2 segundos.</p>
            <div style={{ marginTop: 8, height: 7, borderRadius: 999, background: "#ecedf1", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${kanaTimePct}%`, background: "linear-gradient(90deg, #34c5a6, #25a98f)" }} />
            </div>
            <div style={{ marginTop: 12, display: "grid", gap: 12, gridTemplateColumns: "minmax(0,1fr)", alignItems: "start" }}>
              <div style={{ border: "1px solid rgba(17,17,20,.07)", borderRadius: 16, padding: 14, background: "linear-gradient(145deg,#ffffff,#f8fafc)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ color: "#374151", fontWeight: 700 }}>Tiempo: {kanaTime}s · Score: {kanaScore} · Mejor: {kanaBestByMode[kanaSet] || 0}</div>
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
                  {(["hiragana", "katakana"] as KanaMode[]).map((mode) => (
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

        {!showHub && activeTab === "flashcards" && (
          <section style={{ background: "#fff", border: "1px solid rgba(17,17,20,.07)", borderRadius: 20, padding: 16 }}>
            {flashLessonFolder !== null && (
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
                  Ver lecciones
                </button>
              </div>
            )}

            {flashLessonFolder === null && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
                {flashSetsByLesson.map((entry) => (
                  <button
                    key={entry.lesson}
                    type="button"
                    onClick={() => openFlashLesson(entry.lesson)}
                    style={{ textAlign: "left", border: "1px solid rgba(17,17,20,.08)", borderRadius: 14, background: "#fbfbfc", padding: 12, cursor: "pointer" }}
                  >
                    <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>Carpeta</div>
                    <div style={{ marginTop: 4, fontSize: 22, fontWeight: 800 }}>Lección {entry.lesson}</div>
                    <div style={{ marginTop: 6, fontSize: 13, color: "#667085" }}>{entry.sets.length} sets</div>
                  </button>
                ))}
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

            {flashLessonFolder !== null && activeFlashSet && (
              <div ref={flashFocusRef} style={{ marginTop: 10, display: "grid", gap: 12 }}>
                <div style={{ border: "1px solid rgba(17,17,20,.08)", borderRadius: 14, background: "#fff", padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>
                        Lección {activeFlashSet.lesson}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 20, fontWeight: 800 }}>{activeFlashSet.title}</div>
                      <div style={{ marginTop: 4, color: "#667085", fontSize: 13 }}>{activeFlashSet.description}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
            )}
          </section>
        )}

        {false && !showHub && activeTab === "quiz" && (
          <section style={{ background: "#fff", border: "1px solid rgba(17,17,20,.07)", borderRadius: 20, padding: 16 }}>
            <h2 style={{ margin: 0, fontSize: 24 }}>QUIZ</h2>
            <p style={{ color: "#6b7280", fontSize: 14 }}>Customiza tipo, lecciones y cantidad de preguntas.</p>

            {!currentQ && !quizFinished && renderQuizConfigurator(false)}

            {currentQ && !quizFinished && (
              <div ref={quizCardRef} style={{ marginTop: 14, border: "1px solid rgba(17,17,20,.08)", borderRadius: 14, padding: 12, background: "#fbfbfc" }}>
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
              <div ref={quizCardRef} style={{ marginTop: 14, border: "1px solid rgba(17,17,20,.08)", borderRadius: 14, padding: 14, background: "#f8fafc" }}>
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

            {(currentQ || quizFinished) && (
              <div style={{ marginTop: 14, borderTop: "1px dashed rgba(17,17,20,.1)", paddingTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#7c7c85", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
                  Configuración
                </div>
                {renderQuizConfigurator(true)}
              </div>
            )}
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
