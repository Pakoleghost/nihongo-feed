import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const sourcePath = path.join(repoRoot, "docs/exam-bank-review.json");
const outputDir = path.join(repoRoot, "docs/exam-bank-lessons");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

const CATEGORY_ORDER = ["vocab", "kanji", "particles", "conjugation", "grammar", "reading"];
const TYPE_ORDER = ["mcq", "text", "match", "reorder"];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function countBy(items, keyFn, order = []) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) || 0) + 1);
  }
  const entries = [...map.entries()];
  entries.sort((a, b) => {
    const aIndex = order.indexOf(a[0]);
    const bIndex = order.indexOf(b[0]);
    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    }
    return String(a[0]).localeCompare(String(b[0]));
  });
  return Object.fromEntries(entries);
}

function markdownQuestion(question) {
  const lines = [
    `### ${question.id}`,
    `- category: \`${question.category}\``,
    `- type: \`${question.questionType}\``,
    `- source: \`${question.sourceSection}\``,
    `- prompt: ${question.prompt.replace(/\n/g, " / ")}`,
  ];

  if (question.questionType === "match") {
    lines.push(`- choices.left: ${JSON.stringify(question.choices.left || [])}`);
    lines.push(`- choices.right: ${JSON.stringify(question.choices.right || [])}`);
  } else {
    lines.push(`- choices: ${JSON.stringify(question.choices)}`);
  }

  lines.push(`- correct: ${JSON.stringify(question.correctAnswer)}`);
  if (question.explanation) lines.push(`- explanation: ${question.explanation.replace(/\n/g, " / ")}`);
  if (question.hint) lines.push(`- hint: ${question.hint.replace(/\n/g, " / ")}`);
  if (question.acceptedAnswers?.length) lines.push(`- acceptedAnswers: ${JSON.stringify(question.acceptedAnswers)}`);
  return lines.join("\n");
}

function lessonTarget(lesson) {
  if (lesson === 1) return { vocab: 10, kanji: 0, particles: 4, conjugation: 0, grammar: 4, reading: 2 };
  if (lesson === 2) return { vocab: 9, kanji: 0, particles: 5, conjugation: 0, grammar: 4, reading: 2 };
  if (lesson === 3 || lesson === 4) return { vocab: 6, kanji: 2, particles: 3, conjugation: 3, grammar: 4, reading: 2 };
  return { vocab: 5, kanji: 2, particles: 3, conjugation: 4, grammar: 4, reading: 2 };
}

ensureDir(outputDir);

const byLesson = new Map();
for (const question of source.questions) {
  const lesson = question.lesson;
  if (!byLesson.has(lesson)) byLesson.set(lesson, []);
  byLesson.get(lesson).push(question);
}

const lessonSummaries = [];

for (const [lesson, questions] of [...byLesson.entries()].sort((a, b) => a[0] - b[0])) {
  const byCategory = countBy(questions, (question) => question.category || "general", CATEGORY_ORDER);
  const byType = countBy(questions, (question) => question.questionType, TYPE_ORDER);
  const grouped = Object.fromEntries(
    CATEGORY_ORDER.map((category) => [
      category,
      questions.filter((question) => question.category === category),
    ]).filter(([, items]) => items.length > 0),
  );

  const lessonMarkdown = `# Lesson ${lesson} Exam Bank Review

- total questions: **${questions.length}**
- source file: \`/Users/pako/nihongo-feed-safe/app/study/page.tsx\`

## Count by category
${Object.entries(byCategory).map(([category, total]) => `- ${category}: ${total}`).join("\n")}

## Count by question type
${Object.entries(byType).map(([type, total]) => `- ${type}: ${total}`).join("\n")}

${Object.entries(grouped).map(([category, items]) => `## ${category}\n\n${items.map(markdownQuestion).join("\n\n")}`).join("\n\n")}
`;

  fs.writeFileSync(path.join(outputDir, `lesson-${String(lesson).padStart(2, "0")}.md`), lessonMarkdown);

  lessonSummaries.push({
    lesson,
    total: questions.length,
    byCategory,
    byType,
    weakGrammar: (byCategory.grammar || 0) < 4,
    weakReading: (byCategory.reading || 0) < 3,
  });
}

const weakGrammarLessons = lessonSummaries.filter((row) => row.weakGrammar).map((row) => row.lesson);
const weakReadingLessons = lessonSummaries.filter((row) => row.weakReading).map((row) => row.lesson);

const summaryTableRows = lessonSummaries.map((row) => {
  const c = row.byCategory;
  const t = row.byType;
  return `| ${row.lesson} | ${row.total} | ${c.vocab || 0} | ${c.kanji || 0} | ${c.particles || 0} | ${c.conjugation || 0} | ${c.grammar || 0} | ${c.reading || 0} | ${t.mcq || 0} | ${t.text || 0} | ${t.match || 0} | ${t.reorder || 0} |`;
}).join("\n");

const summaryMarkdown = `# Exam Bank Lesson Summary

- source export: \`/Users/pako/nihongo-feed-safe/docs/exam-bank-review.json\`
- lesson files: \`/Users/pako/nihongo-feed-safe/docs/exam-bank-lessons/\`

## Per-lesson counts
| Lesson | Total | Vocab | Kanji | Particles | Conjugation | Grammar | Reading | MCQ | Text | Match | Reorder |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${summaryTableRows}

## Coverage gaps
- Weak grammar coverage (<4 items): ${weakGrammarLessons.join(", ")}
- Weak reading coverage (<3 items): ${weakReadingLessons.join(", ")}

## Global observations
- The bank is heavily skewed toward vocab-generated questions.
- Reading is effectively fixed at 2 items per lesson.
- Grammar-specific inventory is thin in nearly every lesson.
- Conjugation becomes very heavy in upper lessons compared with broader grammar.
`;

fs.writeFileSync(path.join(repoRoot, "docs/exam-bank-lesson-summary.md"), summaryMarkdown);

const recommendationRows = Array.from({ length: 12 }, (_, index) => {
  const lesson = index + 1;
  const target = lessonTarget(lesson);
  const total = Object.values(target).reduce((sum, value) => sum + value, 0);
  return `| ${lesson} | ${target.vocab} | ${target.kanji} | ${target.particles} | ${target.conjugation} | ${target.grammar} | ${target.reading} | ${total} |`;
}).join("\n");

const recommendationMarkdown = `# Exam Bank Balance Recommendations

Recommended target distribution for a 20-question lesson exam.

## Target distribution by lesson
| Lesson | Vocab | Kanji | Particles | Conjugation | Grammar | Reading | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${recommendationRows}

## Why this target
- Lower lessons should not be overwhelmed by vocab volume.
- Grammar should have real presence, not just a few scenario items.
- Reading should remain small but meaningful.
- Kanji starts once the lesson actually introduces it.
- Conjugation should stay important, but not dominate the bank from L8 onward.

## First improvement priorities
1. Add curated grammar items for lessons 5, 6, 9, 10, 11, and 12.
2. Increase reading from 2 to at least 3 items per lesson.
3. Reduce overproduction of vocab-generated MCQ where it crowds out grammar.
4. Add more non-vocab question types in middle and upper lessons.
`;

fs.writeFileSync(path.join(repoRoot, "docs/exam-bank-balance-recommendations.md"), recommendationMarkdown);

console.log(
  JSON.stringify(
    {
      lessonFiles: lessonSummaries.length,
      weakGrammarLessons,
      weakReadingLessons,
    },
    null,
    2,
  ),
);
