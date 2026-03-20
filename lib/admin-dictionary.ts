import fs from "fs";

export type AdminDictionaryEntry = {
  id: string;
  p: string;
  s?: string;
  k: string[];
  r: string[];
  es: string[];
  en: string[];
  pos: string[];
  c: boolean;
  q: string;
};

export type AdminDictionaryResult = {
  id: string;
  primary: string;
  secondary: string;
  kanji: string[];
  readings: string[];
  gloss: string[];
  fallbackGloss: string[];
  pos: string[];
  common: boolean;
};

let cachedEntries: AdminDictionaryEntry[] | null = null;
let cachedCommonResults: AdminDictionaryResult[] | null = null;

function normalize(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Letter}\p{Number}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasJapanese(value: string) {
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(value);
}

function toResult(entry: AdminDictionaryEntry): AdminDictionaryResult {
  return {
    id: entry.id,
    primary: entry.p,
    secondary: entry.s || entry.r[0] || "",
    kanji: entry.k,
    readings: entry.r,
    gloss: entry.es.length > 0 ? entry.es : entry.en,
    fallbackGloss: entry.es.length > 0 ? entry.en : [],
    pos: entry.pos,
    common: entry.c,
  };
}

const DATA_URL = new URL("./generated/admin-dictionary-data.json", import.meta.url);

export function loadAdminDictionary(): AdminDictionaryEntry[] {
  if (cachedEntries) return cachedEntries;
  const raw = JSON.parse(fs.readFileSync(DATA_URL, "utf8"));
  cachedEntries = Array.isArray(raw.entries) ? raw.entries : [];
  return cachedEntries;
}

function getCommonResults(): AdminDictionaryResult[] {
  if (cachedCommonResults) return cachedCommonResults;
  const entries = loadAdminDictionary();
  cachedCommonResults = entries
    .filter((entry) => entry.c)
    .slice(0, 24)
    .map(toResult);
  return cachedCommonResults;
}

function scoreJapaneseEntry(entry: AdminDictionaryEntry, query: string, normalizedQuery: string) {
  let score = 0;
  const terms = [...entry.k, ...entry.r];
  for (const term of terms) {
    if (term === query) score = Math.max(score, 180);
    else if (term.startsWith(query)) score = Math.max(score, 130);
    else if (term.includes(query)) score = Math.max(score, 95);
  }
  if (!score && entry.q.includes(normalizedQuery)) score = 50;
  if (entry.c) score += 8;
  return score;
}

function scoreGlossEntry(entry: AdminDictionaryEntry, normalizedQuery: string) {
  let score = 0;
  const glosses = [...entry.es, ...entry.en].map((gloss) => normalize(gloss));
  for (const gloss of glosses) {
    if (gloss === normalizedQuery) score = Math.max(score, 170);
    else if (gloss.startsWith(normalizedQuery)) score = Math.max(score, 125);
    else if (gloss.includes(` ${normalizedQuery}`) || gloss.includes(`${normalizedQuery} `)) score = Math.max(score, 100);
    else if (gloss.includes(normalizedQuery)) score = Math.max(score, 78);
  }
  if (!score && entry.q.includes(normalizedQuery)) score = 40;
  if (entry.c) score += 10;
  return score;
}

export function searchAdminDictionary(query: string, limit = 24) {
  const entries = loadAdminDictionary();
  const trimmed = String(query || "").trim();
  const normalized = normalize(trimmed);
  if (!normalized) {
    return { fallback: false, query: "", results: getCommonResults().slice(0, limit) };
  }

  const japaneseQuery = hasJapanese(trimmed);
  const hits: Array<{ score: number; entry: AdminDictionaryEntry }> = [];

  for (const entry of entries) {
    const score = japaneseQuery
      ? scoreJapaneseEntry(entry, trimmed, normalized)
      : scoreGlossEntry(entry, normalized);
    if (score > 0) hits.push({ score, entry });
  }

  hits.sort((a, b) => b.score - a.score || Number(b.entry.c) - Number(a.entry.c) || a.entry.p.localeCompare(b.entry.p, "ja"));
  const direct = hits.slice(0, limit).map((item) => toResult(item.entry));
  if (direct.length > 0) return { fallback: false, query: trimmed, results: direct };

  const firstToken = normalized.split(" ")[0] || normalized;
  const related = entries
    .filter((entry) => entry.q.includes(firstToken))
    .slice(0, limit)
    .map(toResult);

  if (related.length > 0) return { fallback: true, query: trimmed, results: related };
  return { fallback: true, query: trimmed, results: getCommonResults().slice(0, limit) };
}
