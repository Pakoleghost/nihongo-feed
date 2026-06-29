export type CoursePosition = {
  groupName: string | null;
  resolvedGroupName: string | null;
  currentLesson: number | null;
  currentModuleNumber: number | null;
  source: "teacher-backend" | "fallback";
};

type CollectionMap = Record<string, { nombre?: string }>;
type ModuleMap = Record<string, { numero?: number }>;
type ClassNote = { tema?: string | null };

function resolveFlaskGroupName(groupName: string, collections: CollectionMap) {
  const groupLower = groupName.toLowerCase();
  const match = Object.values(collections).find((collection) =>
    collection.nombre?.toLowerCase().includes(groupLower),
  );

  return match?.nombre ?? groupName;
}

function getLatestLesson(notes: ClassNote[]) {
  let latestLesson = 0;

  for (const note of notes) {
    const match = note.tema?.match(/^L(\d+)/);
    if (!match) continue;

    const lesson = Number.parseInt(match[1], 10);
    if (lesson > latestLesson) latestLesson = lesson;
  }

  return latestLesson > 0 ? latestLesson : null;
}

export async function fetchCoursePosition(
  groupName: string | null | undefined,
): Promise<CoursePosition> {
  const cleanGroupName = groupName?.trim() || null;

  if (!cleanGroupName) {
    return {
      groupName: null,
      resolvedGroupName: null,
      currentLesson: null,
      currentModuleNumber: null,
      source: "fallback",
    };
  }

  try {
    const [collectionsResponse, modulesResponse] = await Promise.all([
      fetch("/api/colecciones"),
      fetch("/api/grupos-modulos"),
    ]);

    const collections = collectionsResponse.ok
      ? ((await collectionsResponse.json()) as CollectionMap)
      : {};
    const modules = modulesResponse.ok
      ? ((await modulesResponse.json()) as ModuleMap)
      : {};
    const resolvedGroupName = resolveFlaskGroupName(cleanGroupName, collections);
    const moduleInfo = modules[resolvedGroupName] ?? modules[cleanGroupName];
    const currentModuleNumber =
      typeof moduleInfo?.numero === "number" ? moduleInfo.numero : null;

    const notesResponse = await fetch(
      `/api/clase-notas?grupo=${encodeURIComponent(resolvedGroupName)}`,
    );
    const notes = notesResponse.ok
      ? ((await notesResponse.json()) as ClassNote[])
      : [];

    return {
      groupName: cleanGroupName,
      resolvedGroupName,
      currentLesson: getLatestLesson(notes),
      currentModuleNumber,
      source: "teacher-backend",
    };
  } catch {
    return {
      groupName: cleanGroupName,
      resolvedGroupName: cleanGroupName,
      currentLesson: null,
      currentModuleNumber: null,
      source: "fallback",
    };
  }
}
