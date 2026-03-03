"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type VocabCard = {
  jp: string;
  kana: string;
  es: string;
};

type QuizQuestion = {
  prompt: string;
  options: string[];
  correct: string;
};

const HIRAGANA = [
  ["あ", "a"], ["い", "i"], ["う", "u"], ["え", "e"], ["お", "o"],
  ["か", "ka"], ["き", "ki"], ["く", "ku"], ["け", "ke"], ["こ", "ko"],
  ["さ", "sa"], ["し", "shi"], ["す", "su"], ["せ", "se"], ["そ", "so"],
  ["た", "ta"], ["ち", "chi"], ["つ", "tsu"], ["て", "te"], ["と", "to"],
  ["な", "na"], ["に", "ni"], ["ぬ", "nu"], ["ね", "ne"], ["の", "no"],
  ["は", "ha"], ["ひ", "hi"], ["ふ", "fu"], ["へ", "he"], ["ほ", "ho"],
  ["ま", "ma"], ["み", "mi"], ["む", "mu"], ["め", "me"], ["も", "mo"],
  ["や", "ya"], ["ゆ", "yu"], ["よ", "yo"], ["ら", "ra"], ["り", "ri"],
  ["る", "ru"], ["れ", "re"], ["ろ", "ro"], ["わ", "wa"], ["を", "wo"], ["ん", "n"],
] as const;

const KATAKANA = [
  ["ア", "a"], ["イ", "i"], ["ウ", "u"], ["エ", "e"], ["オ", "o"],
  ["カ", "ka"], ["キ", "ki"], ["ク", "ku"], ["ケ", "ke"], ["コ", "ko"],
  ["サ", "sa"], ["シ", "shi"], ["ス", "su"], ["セ", "se"], ["ソ", "so"],
  ["タ", "ta"], ["チ", "chi"], ["ツ", "tsu"], ["テ", "te"], ["ト", "to"],
  ["ナ", "na"], ["ニ", "ni"], ["ヌ", "nu"], ["ネ", "ne"], ["ノ", "no"],
  ["ハ", "ha"], ["ヒ", "hi"], ["フ", "fu"], ["ヘ", "he"], ["ホ", "ho"],
  ["マ", "ma"], ["ミ", "mi"], ["ム", "mu"], ["メ", "me"], ["モ", "mo"],
  ["ヤ", "ya"], ["ユ", "yu"], ["ヨ", "yo"], ["ラ", "ra"], ["リ", "ri"],
  ["ル", "ru"], ["レ", "re"], ["ロ", "ro"], ["ワ", "wa"], ["ヲ", "wo"], ["ン", "n"],
] as const;

const BASE_VOCAB: VocabCard[] = [
  { jp: "日本", kana: "にほん", es: "Japón" },
  { jp: "先生", kana: "せんせい", es: "profesor" },
  { jp: "学生", kana: "がくせい", es: "estudiante" },
  { jp: "学校", kana: "がっこう", es: "escuela" },
  { jp: "友達", kana: "ともだち", es: "amigo" },
  { jp: "食べる", kana: "たべる", es: "comer" },
  { jp: "飲む", kana: "のむ", es: "beber" },
  { jp: "行く", kana: "いく", es: "ir" },
  { jp: "来る", kana: "くる", es: "venir" },
  { jp: "見る", kana: "みる", es: "ver" },
  { jp: "読む", kana: "よむ", es: "leer" },
  { jp: "書く", kana: "かく", es: "escribir" },
  { jp: "聞く", kana: "きく", es: "escuchar" },
  { jp: "今日", kana: "きょう", es: "hoy" },
  { jp: "明日", kana: "あした", es: "mañana" },
  { jp: "昨日", kana: "きのう", es: "ayer" },
  { jp: "時間", kana: "じかん", es: "tiempo/hora" },
  { jp: "大丈夫", kana: "だいじょうぶ", es: "está bien" },
  { jp: "好き", kana: "すき", es: "gustar" },
  { jp: "勉強", kana: "べんきょう", es: "estudio" },
];

const PARTICLE_QUESTIONS: QuizQuestion[] = [
  { prompt: "わたし___がくせいです。", options: ["は", "を", "に", "で"], correct: "は" },
  { prompt: "パン___たべます。", options: ["は", "が", "を", "に"], correct: "を" },
  { prompt: "学校___いきます。", options: ["で", "に", "を", "は"], correct: "に" },
  { prompt: "図書館___べんきょうします。", options: ["で", "に", "が", "を"], correct: "で" },
  { prompt: "だれ___きましたか。", options: ["が", "を", "は", "で"], correct: "が" },
];

const CONJUGATION_QUESTIONS: QuizQuestion[] = [
  { prompt: "たべる → ます形", options: ["たべます", "たべない", "たべた", "たべて"], correct: "たべます" },
  { prompt: "いく → て形", options: ["いって", "いきて", "いくて", "いきった"], correct: "いって" },
  { prompt: "みる → ない形", options: ["みない", "みません", "みた", "みりない"], correct: "みない" },
  { prompt: "のむ → 過去形", options: ["のんだ", "のみた", "のむた", "のんで"], correct: "のんだ" },
  { prompt: "かく → て形", options: ["かいて", "かきて", "かって", "かくて"], correct: "かいて" },
];

const KANJI_MINI = [
  { kanji: "日", on: "ニチ", kun: "ひ / -び", meaning: "día / sol" },
  { kanji: "月", on: "ゲツ", kun: "つき", meaning: "mes / luna" },
  { kanji: "人", on: "ジン", kun: "ひと", meaning: "persona" },
  { kanji: "学", on: "ガク", kun: "まなぶ", meaning: "aprender" },
  { kanji: "先", on: "セン", kun: "さき", meaning: "antes / previo" },
  { kanji: "生", on: "セイ", kun: "いきる", meaning: "vida / nacer" },
  { kanji: "食", on: "ショク", kun: "たべる", meaning: "comer" },
];

const READINGS = [
  {
    title: "N5 Lectura corta",
    jp: "私(わたし)は 毎日(まいにち) 学校(がっこう)で 日本語(にほんご)を 勉強(べんきょう)します。",
    es: "Yo estudio japonés todos los días en la escuela.",
  },
  {
    title: "N4 Lectura corta",
    jp: "来週(らいしゅう)、友達(ともだち)と 図書館(としょかん)へ 行(い)って、宿題(しゅくだい)を 終(お)わらせる 予定(よてい)です。",
    es: "La próxima semana iré a la biblioteca con un amigo para terminar la tarea.",
  },
];

function shuffle<T>(arr: T[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function parseFurigana(text: string) {
  return text.split(/(\S+\([^\)]+\))/g).map((chunk, index) => {
    const match = chunk.match(/^(.+)\(([^\)]+)\)$/);
    if (!match) return { key: `${index}`, plain: chunk, base: "", ruby: "", hasRuby: false };
    return { key: `${index}`, plain: "", base: match[1], ruby: match[2], hasRuby: true };
  });
}

export default function StudyPage() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"kana" | "srs" | "particles" | "conj" | "reading" | "kanji" | "feedvocab">("kana");
  const [feedText, setFeedText] = useState("");

  const [kanaSet, setKanaSet] = useState<"hiragana" | "katakana">("hiragana");
  const [kanaTimeLeft, setKanaTimeLeft] = useState(60);
  const [kanaRunning, setKanaRunning] = useState(false);
  const [kanaScore, setKanaScore] = useState(0);
  const [kanaInput, setKanaInput] = useState("");
  const [kanaPrompt, setKanaPrompt] = useState<readonly [string, string]>(HIRAGANA[0]);

  const [srsIndex, setSrsIndex] = useState(0);
  const [srsDueMap, setSrsDueMap] = useState<Record<string, number>>({});
  const [particleIndex, setParticleIndex] = useState(0);
  const [particleResult, setParticleResult] = useState<"" | "ok" | "bad">("");
  const [conjIndex, setConjIndex] = useState(0);
  const [conjResult, setConjResult] = useState<"" | "ok" | "bad">("");
  const [showFurigana, setShowFurigana] = useState(true);
  const [readingIndex, setReadingIndex] = useState(0);

  useEffect(() => {
    const boot = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: rows } = await supabase
          .from("posts")
          .select("content")
          .order("created_at", { ascending: false })
          .limit(120);
        setFeedText((rows || []).map((r: any) => String(r.content || "")).join("\n"));
        try {
          const raw = localStorage.getItem(`srs_due_${user.id}`);
          if (raw) setSrsDueMap(JSON.parse(raw));
        } catch {}
      }
      setLoading(false);
    };
    void boot();
  }, []);

  useEffect(() => {
    if (!kanaRunning || kanaTimeLeft <= 0) return;
    const t = window.setTimeout(() => setKanaTimeLeft((v) => v - 1), 1000);
    return () => window.clearTimeout(t);
  }, [kanaRunning, kanaTimeLeft]);

  useEffect(() => {
    if (kanaTimeLeft === 0) setKanaRunning(false);
  }, [kanaTimeLeft]);

  const kanaPool = kanaSet === "hiragana" ? HIRAGANA : KATAKANA;

  const pickKanaPrompt = () => {
    const next = kanaPool[Math.floor(Math.random() * kanaPool.length)];
    setKanaPrompt(next);
  };

  const startKana = () => {
    setKanaScore(0);
    setKanaTimeLeft(60);
    setKanaInput("");
    setKanaRunning(true);
    pickKanaPrompt();
  };

  const submitKana = () => {
    if (!kanaRunning) return;
    if (kanaInput.trim().toLowerCase() === kanaPrompt[1]) {
      setKanaScore((v) => v + 1);
    }
    setKanaInput("");
    pickKanaPrompt();
  };

  const dueFlashcards = useMemo(() => {
    const now = Date.now();
    return BASE_VOCAB.filter((v) => !srsDueMap[v.jp] || srsDueMap[v.jp] <= now);
  }, [srsDueMap]);

  const activeSrs = dueFlashcards[srsIndex] || dueFlashcards[0] || BASE_VOCAB[0];

  const saveSrs = async (card: VocabCard, quality: "again" | "hard" | "good") => {
    const now = Date.now();
    const shift = quality === "again" ? 1 : quality === "hard" ? 3 : 7;
    const nextDue = now + shift * 24 * 60 * 60 * 1000;
    const nextMap = { ...srsDueMap, [card.jp]: nextDue };
    setSrsDueMap(nextMap);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) localStorage.setItem(`srs_due_${user.id}`, JSON.stringify(nextMap));
    } catch {}
    setSrsIndex((v) => v + 1);
  };

  const particleQ = PARTICLE_QUESTIONS[particleIndex % PARTICLE_QUESTIONS.length];
  const conjugationQ = CONJUGATION_QUESTIONS[conjIndex % CONJUGATION_QUESTIONS.length];

  const feedVocab = useMemo(() => {
    const jpOnly = feedText.match(/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]{2,}/gu) || [];
    const unique = Array.from(new Set(jpOnly)).slice(0, 80);
    const bank = BASE_VOCAB.filter((v) => unique.some((u) => u.includes(v.jp) || v.jp.includes(u)));
    return bank.length > 0 ? bank : BASE_VOCAB.slice(0, 8);
  }, [feedText]);

  const feedQuestion = useMemo(() => {
    const card = feedVocab[Math.floor(Math.random() * feedVocab.length)] || BASE_VOCAB[0];
    const distractors = shuffle(BASE_VOCAB.filter((v) => v.jp !== card.jp)).slice(0, 3).map((v) => v.es);
    return {
      jp: card.jp,
      options: shuffle([card.es, ...distractors]),
      correct: card.es,
    };
  }, [feedVocab, tab]);

  if (loading) {
    return <div style={{ padding: "110px 16px", textAlign: "center", color: "#9ca3af" }}>Cargando estudio…</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(900px 420px at 50% -10%, rgba(61,129,206,.08), transparent 65%), #f6f7f8", padding: 14 }}>
      <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 12 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <Link href="/" style={{ textDecoration: "none", border: "1px solid rgba(17,17,20,.1)", background: "#fff", color: "#222", borderRadius: 999, padding: "8px 12px", fontSize: 13 }}>← Volver</Link>
          <div style={{ fontSize: 12, color: "#7c7c85", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>Nihongo Study Lab</div>
        </header>

        <section style={{ background: "#fff", border: "1px solid rgba(17,17,20,.07)", borderRadius: 18, padding: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            ["kana", "Kana Sprint"],
            ["srs", "Flashcards"],
            ["particles", "Partículas"],
            ["conj", "Conjugación"],
            ["reading", "Lecturas"],
            ["kanji", "Kanji"],
            ["feedvocab", "Vocab del feed"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key as any)}
              style={{ border: 0, borderRadius: 999, padding: "8px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: tab === key ? "#fff" : "#61616e", background: tab === key ? "#111114" : "#f3f4f6" }}
            >
              {label}
            </button>
          ))}
        </section>

        {tab === "kana" && (
          <section style={{ background: "#fff", border: "1px solid rgba(17,17,20,.07)", borderRadius: 20, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 24 }}>Kana Sprint</h2>
              <div style={{ display: "inline-flex", gap: 4, border: "1px solid rgba(17,17,20,.08)", borderRadius: 999, padding: 3 }}>
                <button type="button" onClick={() => setKanaSet("hiragana")} style={{ border: 0, borderRadius: 999, padding: "6px 10px", background: kanaSet === "hiragana" ? "#111114" : "transparent", color: kanaSet === "hiragana" ? "#fff" : "#666" }}>Hiragana</button>
                <button type="button" onClick={() => setKanaSet("katakana")} style={{ border: 0, borderRadius: 999, padding: "6px 10px", background: kanaSet === "katakana" ? "#111114" : "transparent", color: kanaSet === "katakana" ? "#fff" : "#666" }}>Katakana</button>
              </div>
            </div>
            <p style={{ color: "#6b7280", fontSize: 14 }}>60 segundos. Escribe la romanización correcta.</p>
            <div style={{ display: "grid", placeItems: "center", margin: "18px 0" }}>
              <div style={{ fontSize: 72, fontWeight: 800, color: "#111114", lineHeight: 1 }}>{kanaPrompt[0]}</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input value={kanaInput} onChange={(e) => setKanaInput(e.target.value)} placeholder="romaji" style={{ flex: 1, border: "1px solid rgba(17,17,20,.1)", borderRadius: 12, padding: "10px 12px", fontSize: 16 }} />
              <button type="button" onClick={submitKana} disabled={!kanaRunning} style={{ border: 0, borderRadius: 12, background: "#111114", color: "#fff", padding: "10px 12px", fontWeight: 700 }}>OK</button>
              <button type="button" onClick={startKana} style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 12, background: "#fff", color: "#222", padding: "10px 12px", fontWeight: 700 }}>Start</button>
            </div>
            <div style={{ marginTop: 10, color: "#374151", fontWeight: 700, display: "flex", gap: 14 }}>
              <span>Tiempo: {kanaTimeLeft}s</span>
              <span>Puntos: {kanaScore}</span>
            </div>
          </section>
        )}

        {tab === "srs" && (
          <section style={{ background: "#fff", border: "1px solid rgba(17,17,20,.07)", borderRadius: 20, padding: 16 }}>
            <h2 style={{ margin: 0, fontSize: 24 }}>Flashcards N5/N4</h2>
            <p style={{ color: "#6b7280", fontSize: 14 }}>Pendientes hoy: {dueFlashcards.length}</p>
            <div style={{ border: "1px solid rgba(17,17,20,.08)", borderRadius: 16, padding: 16, background: "#fbfbfc" }}>
              <div style={{ fontSize: 40, lineHeight: 1.1, fontWeight: 800 }}>{activeSrs.jp}</div>
              <div style={{ marginTop: 6, color: "#6b7280" }}>{activeSrs.kana}</div>
              <div style={{ marginTop: 14, fontSize: 18 }}>{activeSrs.es}</div>
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => void saveSrs(activeSrs, "again")} style={{ border: "1px solid #fecaca", color: "#b91c1c", background: "#fff", borderRadius: 999, padding: "7px 10px", fontWeight: 700 }}>No lo sé</button>
              <button type="button" onClick={() => void saveSrs(activeSrs, "hard")} style={{ border: "1px solid #fde68a", color: "#b45309", background: "#fff", borderRadius: 999, padding: "7px 10px", fontWeight: 700 }}>Difícil</button>
              <button type="button" onClick={() => void saveSrs(activeSrs, "good")} style={{ border: "1px solid #86efac", color: "#15803d", background: "#fff", borderRadius: 999, padding: "7px 10px", fontWeight: 700 }}>Bien</button>
            </div>
          </section>
        )}

        {tab === "particles" && (
          <section style={{ background: "#fff", border: "1px solid rgba(17,17,20,.07)", borderRadius: 20, padding: 16 }}>
            <h2 style={{ margin: 0, fontSize: 24 }}>Entrenador de Partículas</h2>
            <p style={{ fontSize: 26, margin: "14px 0", fontWeight: 700 }}>{particleQ.prompt}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {particleQ.options.map((op) => (
                <button key={op} type="button" onClick={() => setParticleResult(op === particleQ.correct ? "ok" : "bad")} style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 10, background: "#fff", padding: "8px 12px", fontSize: 18, fontWeight: 700 }}>{op}</button>
              ))}
            </div>
            {particleResult && <p style={{ marginTop: 10, color: particleResult === "ok" ? "#15803d" : "#b91c1c", fontWeight: 700 }}>{particleResult === "ok" ? "Correcto" : `Incorrecto. Respuesta: ${particleQ.correct}`}</p>}
            <button type="button" onClick={() => { setParticleIndex((v) => v + 1); setParticleResult(""); }} style={{ marginTop: 8, border: "1px solid rgba(17,17,20,.1)", borderRadius: 999, background: "#fff", padding: "7px 10px", fontWeight: 700 }}>Siguiente</button>
          </section>
        )}

        {tab === "conj" && (
          <section style={{ background: "#fff", border: "1px solid rgba(17,17,20,.07)", borderRadius: 20, padding: 16 }}>
            <h2 style={{ margin: 0, fontSize: 24 }}>Conjugación Rápida</h2>
            <p style={{ fontSize: 24, margin: "14px 0", fontWeight: 700 }}>{conjugationQ.prompt}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {conjugationQ.options.map((op) => (
                <button key={op} type="button" onClick={() => setConjResult(op === conjugationQ.correct ? "ok" : "bad")} style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 10, background: "#fff", padding: "8px 12px", fontSize: 16, fontWeight: 700 }}>{op}</button>
              ))}
            </div>
            {conjResult && <p style={{ marginTop: 10, color: conjResult === "ok" ? "#15803d" : "#b91c1c", fontWeight: 700 }}>{conjResult === "ok" ? "Correcto" : `Incorrecto. Respuesta: ${conjugationQ.correct}`}</p>}
            <button type="button" onClick={() => { setConjIndex((v) => v + 1); setConjResult(""); }} style={{ marginTop: 8, border: "1px solid rgba(17,17,20,.1)", borderRadius: 999, background: "#fff", padding: "7px 10px", fontWeight: 700 }}>Siguiente</button>
          </section>
        )}

        {tab === "reading" && (
          <section style={{ background: "#fff", border: "1px solid rgba(17,17,20,.07)", borderRadius: 20, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 24 }}>Lectura con Furigana</h2>
              <button type="button" onClick={() => setShowFurigana((v) => !v)} style={{ border: "1px solid rgba(17,17,20,.1)", borderRadius: 999, background: "#fff", padding: "7px 10px", fontWeight: 700 }}>
                Furigana: {showFurigana ? "ON" : "OFF"}
              </button>
            </div>
            <div style={{ marginTop: 12, border: "1px solid rgba(17,17,20,.07)", borderRadius: 14, padding: 14, background: "#fbfbfc" }}>
              <div style={{ color: "#6b7280", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>{READINGS[readingIndex].title}</div>
              <p style={{ marginTop: 10, fontSize: 22, lineHeight: 1.7, color: "#111114" }}>
                {parseFurigana(READINGS[readingIndex].jp).map((token) => {
                  if (!token.hasRuby) return <span key={token.key}>{token.plain} </span>;
                  if (!showFurigana) return <span key={token.key}>{token.base} </span>;
                  return (
                    <ruby key={token.key} style={{ marginRight: 2 }}>
                      {token.base}
                      <rt style={{ fontSize: 12 }}>{token.ruby}</rt>
                    </ruby>
                  );
                })}
              </p>
              <p style={{ margin: "12px 0 0", color: "#4b5563" }}>{READINGS[readingIndex].es}</p>
            </div>
            <button type="button" onClick={() => setReadingIndex((v) => (v + 1) % READINGS.length)} style={{ marginTop: 10, border: "1px solid rgba(17,17,20,.1)", borderRadius: 999, background: "#fff", padding: "7px 10px", fontWeight: 700 }}>Siguiente lectura</button>
          </section>
        )}

        {tab === "kanji" && (
          <section style={{ background: "#fff", border: "1px solid rgba(17,17,20,.07)", borderRadius: 20, padding: 16 }}>
            <h2 style={{ margin: 0, fontSize: 24 }}>Kanji mínimo N5</h2>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {KANJI_MINI.map((k) => (
                <article key={k.kanji} style={{ border: "1px solid rgba(17,17,20,.08)", borderRadius: 12, padding: 12, display: "grid", gridTemplateColumns: "56px 1fr", gap: 10, alignItems: "center" }}>
                  <div style={{ fontSize: 34, fontWeight: 800, textAlign: "center" }}>{k.kanji}</div>
                  <div>
                    <div style={{ fontSize: 13, color: "#6b7280" }}>ON: {k.on} · KUN: {k.kun}</div>
                    <div style={{ marginTop: 2, fontWeight: 700 }}>{k.meaning}</div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "feedvocab" && (
          <section style={{ background: "#fff", border: "1px solid rgba(17,17,20,.07)", borderRadius: 20, padding: 16 }}>
            <h2 style={{ margin: 0, fontSize: 24 }}>Quiz de vocab del feed</h2>
            <p style={{ color: "#6b7280", fontSize: 14 }}>Palabras detectadas en publicaciones recientes: {feedVocab.length}</p>
            <div style={{ border: "1px solid rgba(17,17,20,.08)", borderRadius: 16, background: "#fbfbfc", padding: 14 }}>
              <div style={{ color: "#6b7280", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>¿Qué significa?</div>
              <div style={{ marginTop: 8, fontSize: 36, fontWeight: 800 }}>{feedQuestion.jp}</div>
              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                {feedQuestion.options.map((option) => (
                  <button key={option} type="button" style={{ textAlign: "left", border: "1px solid rgba(17,17,20,.1)", borderRadius: 10, background: "#fff", padding: "8px 10px", fontSize: 14, fontWeight: 600 }}>
                    {option}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>Respuesta esperada: {feedQuestion.correct}</div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
