import VocabularioLearnSessionScreen from "@/components/practicar/VocabularioLearnSessionScreen";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VocabularioLearnPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const lessonParam = Array.isArray(params.lesson) ? params.lesson[0] : params.lesson;
  const parsedLesson = Number(lessonParam);
  const lesson = Number.isFinite(parsedLesson) && parsedLesson > 0 ? parsedLesson : 1;

  return <VocabularioLearnSessionScreen initialLesson={lesson} />;
}
