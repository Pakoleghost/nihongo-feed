import KanjiPracticeSessionScreen from "@/components/practicar/KanjiPracticeSessionScreen";
import type { PracticeSessionSortKey } from "@/lib/practice-srs";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function KanjiPracticePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const lessonParam = Array.isArray(params.lesson) ? params.lesson[0] : params.lesson;
  const focusParam = Array.isArray(params.focus) ? params.focus[0] : params.focus;
  const parsedLesson = Number(lessonParam);
  const lesson = Number.isFinite(parsedLesson) && parsedLesson > 0 ? parsedLesson : 3;
  const focus = focusParam as PracticeSessionSortKey | undefined;

  return <KanjiPracticeSessionScreen initialLesson={lesson} initialFocusKey={focus ?? null} />;
}
