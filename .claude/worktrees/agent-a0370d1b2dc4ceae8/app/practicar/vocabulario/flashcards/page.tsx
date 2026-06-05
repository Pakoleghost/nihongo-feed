import VocabularioFlashcardsScreen from "@/components/practicar/VocabularioFlashcardsScreen";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VocabularioFlashcardsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const lessonParam = Array.isArray(params.lesson) ? params.lesson[0] : params.lesson;
  const parsedLesson = Number(lessonParam);
  const lesson = Number.isFinite(parsedLesson) && parsedLesson > 0 ? parsedLesson : 1;

  return (
    <VocabularioFlashcardsScreen
      activityPath="/practicar/vocabulario/flashcards"
      activityLabelPrefix="Flashcards"
      backHref={`/practicar/vocabulario?lesson=${lesson}`}
      initialLesson={lesson}
    />
  );
}
