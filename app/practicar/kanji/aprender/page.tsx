import KanjiLearnSessionScreen from "@/components/practicar/KanjiLearnSessionScreen";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function KanjiLearnPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const lessonParam = Array.isArray(params.lesson) ? params.lesson[0] : params.lesson;
  const parsedLesson = Number(lessonParam);
  const lesson = Number.isFinite(parsedLesson) && parsedLesson > 0 ? parsedLesson : 3;

  return <KanjiLearnSessionScreen initialLesson={lesson} />;
}
