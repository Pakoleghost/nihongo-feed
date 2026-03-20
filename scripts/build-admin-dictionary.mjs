import fs from 'fs';
import path from 'path';

const inputPath = process.argv[2] || path.join(process.cwd(), 'tmp/jmdict/extract/jmdict-all-3.6.2.json');
const outputPath = process.argv[3] || path.join(process.cwd(), 'lib/generated/admin-dictionary-data.json');

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Letter}\p{Number}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueStrings(values) {
  return Array.from(new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean)));
}

const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const words = Array.isArray(raw.words) ? raw.words : [];

const compact = [];
for (const word of words) {
  const kanji = uniqueStrings((word.kanji || []).map((entry) => entry.text));
  const kana = uniqueStrings((word.kana || []).map((entry) => entry.text));
  const glossSpa = uniqueStrings((word.sense || []).flatMap((sense) => (sense.gloss || []).filter((gloss) => gloss.lang === 'spa').map((gloss) => gloss.text))).slice(0, 5);
  const glossEng = uniqueStrings((word.sense || []).flatMap((sense) => (sense.gloss || []).filter((gloss) => gloss.lang === 'eng').map((gloss) => gloss.text))).slice(0, 5);
  const pos = uniqueStrings((word.sense || []).flatMap((sense) => sense.partOfSpeech || [])).slice(0, 4);
  const common = Boolean((word.kanji || []).some((entry) => entry.common) || (word.kana || []).some((entry) => entry.common));
  const primary = kanji[0] || kana[0] || '';
  const secondary = kana[0] || kanji[1] || '';
  const search = normalize([...kanji, ...kana, ...glossSpa, ...glossEng].join(' '));

  if (!primary || !search) continue;

  compact.push({
    id: word.id,
    p: primary,
    s: secondary,
    k: kanji,
    r: kana,
    es: glossSpa,
    en: glossEng,
    pos,
    c: common,
    q: search,
  });
}

fs.writeFileSync(outputPath, JSON.stringify({ version: raw.version, generatedAt: new Date().toISOString(), entries: compact }));
console.log(`Wrote ${compact.length} entries to ${outputPath}`);
