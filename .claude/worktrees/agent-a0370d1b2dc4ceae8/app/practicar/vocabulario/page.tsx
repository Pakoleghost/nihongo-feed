import VocabularioModuleScreen from "@/components/practicar/VocabularioModuleScreen";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VocabularioPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const lessonParam = Array.isArray(params.lesson) ? params.lesson[0] : params.lesson;
  const parsedLesson = Number(lessonParam);
  const initialLesson = Number.isFinite(parsedLesson) && parsedLesson > 0 ? parsedLesson : undefined;

  return <VocabularioModuleScreen initialLesson={initialLesson} />;
}
