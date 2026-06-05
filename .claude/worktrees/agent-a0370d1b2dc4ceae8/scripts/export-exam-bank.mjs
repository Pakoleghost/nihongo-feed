import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = process.cwd();
const studyPagePath = path.join(repoRoot, "app/study/page.tsx");
const tempDir = path.join(repoRoot, ".tmp");
const tempModulePath = path.join(tempDir, "exam-helper-export.ts");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function buildHelperModuleSource(source) {
  const start = source.indexOf("type KanaPair");
  const end = source.indexOf("function StudyContent()");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Could not isolate study helpers from app/study/page.tsx");
  }

  const helperSource = source.slice(start, end);
  return `import { GENKI_VOCAB_BY_LESSON } from "../lib/genki-vocab-by-lesson.ts";
import { GENKI_KANJI_BY_LESSON } from "../lib/genki-kanji-by-lesson.ts";

${helperSource}

export {
  buildLessonExamQuestionPool,
  PARTICLE_EXAM_BANK,
  buildLessonScenarioQuestions,
  EXAM_CATEGORY_LABELS,
};
`;
}

function inferSourceSection(question) {
  if (question.id.startsWith("exam-vocab-es-") || question.id.startsWith("exam-vocab-jp-")) return "lesson_vocab_generated";
  if (question.id.startsWith("exam-kanji-")) return "lesson_kanji_generated";
  if (question.id.startsWith("exam-particle-")) return "particle_exam_bank";
  if (question.id.startsWith("exam-conj-")) return "lesson_conjugation_generated";
  if (question.type === "match") return "lesson_vocab_matching";
  if ((question.stableKey || "").includes(":reading:")) return "lesson_scenarios_reading";
  if ((question.stableKey || "").includes(":grammar:")) return "lesson_scenarios_grammar";
  if ((question.stableKey || "").includes(":particle:")) return "particle_exam_bank";
  if ((question.stableKey || "").includes(":conj:")) return "lesson_conjugation_generated";
  return "lesson_scenarios_misc";
}

function serializeQuestion(question) {
  const questionType = question.type || "mcq";
  return {
    id: question.id,
    stableKey: question.stableKey || null,
    lesson: question.lesson ?? null,
    category: question.category ?? null,
    questionType,
    prompt: question.prompt,
    choices:
      questionType === "match"
        ? {
            left: question.matchLeft || [],
            right: question.matchRight || [],
          }
        : questionType === "reorder"
          ? (question.reorderTokens || []).map((token) => token.label)
          : question.options || [],
    correctAnswer: question.correct,
    explanation: question.explanation || null,
    hint: question.hint || null,
    acceptedAnswers: question.acceptedAnswers || [],
    tags: [
      question.category || "general",
      question.lesson ? `lesson:${question.lesson}` : "lesson:unknown",
      `type:${questionType}`,
    ],
    difficulty: null,
    sourceFile: "/Users/pako/nihongo-feed-safe/app/study/page.tsx",
    sourceSection: inferSourceSection(question),
  };
}

function countBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Object.fromEntries([...map.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
}

ensureDir(tempDir);
const studySource = fs.readFileSync(studyPagePath, "utf8");
fs.writeFileSync(tempModulePath, buildHelperModuleSource(studySource));

const helperModule = await import(`${pathToFileURL(tempModulePath).href}?t=${Date.now()}`);
const lessons = Array.from({ length: 12 }, (_, index) => index + 1);
const questions = lessons
  .flatMap((lesson) => helperModule.buildLessonExamQuestionPool(lesson))
  .map(serializeQuestion);

const summary = {
  totalQuestions: questions.length,
  byLesson: countBy(questions, (question) => question.lesson),
  byCategory: countBy(questions, (question) => question.category || "general"),
  byQuestionType: countBy(questions, (question) => question.questionType),
  bySourceSection: countBy(questions, (question) => question.sourceSection),
};

const exportPayload = {
  generatedAt: new Date().toISOString(),
  sourceFile: "/Users/pako/nihongo-feed-safe/app/study/page.tsx",
  summary,
  questions,
};

fs.writeFileSync(
  path.join(repoRoot, "docs/exam-bank-review.json"),
  JSON.stringify(exportPayload, null, 2),
);

const lessonRows = Object.entries(summary.byLesson)
  .map(([lesson, total]) => `| ${lesson} | ${total} |`)
  .join("\n");
const categoryRows = Object.entries(summary.byCategory)
  .map(([category, total]) => `| ${category} | ${total} |`)
  .join("\n");
const typeRows = Object.entries(summary.byQuestionType)
  .map(([type, total]) => `| ${type} | ${total} |`)
  .join("\n");

const markdown = `# Exam Bank Review

- Source file: \`/Users/pako/nihongo-feed-safe/app/study/page.tsx\`
- Export file: \`/Users/pako/nihongo-feed-safe/docs/exam-bank-review.json\`
- Total questions: **${summary.totalQuestions}**

## By lesson
| Lesson | Questions |
| --- | ---: |
${lessonRows}

## By category
| Category | Questions |
| --- | ---: |
${categoryRows}

## By question type
| Type | Questions |
| --- | ---: |
${typeRows}

## Notes
- This export reflects the current generated exam pool, not only the 20-question runtime selection.
- Dynamic vocab, kanji, conjugation, particle, matching, and scenario-based questions are all expanded into the review JSON.
`;

fs.writeFileSync(path.join(repoRoot, "docs/exam-bank-review.md"), markdown);

console.log(JSON.stringify(summary, null, 2));
