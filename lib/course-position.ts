export type CoursePosition = {
  groupName: string | null;
  resolvedGroupName: string | null;
  currentLesson: number | null;
  currentModuleNumber: number | null;
  source: "teacher-backend" | "fallback";
};

type CollectionMap = Record<string, { nombre?: string }>;
type ModuleInfo = {
  numero?: number;
  lecciones?: number[];
};
type ModuleMap = Record<string, ModuleInfo>;
type ClassNote = {
  tema?: string | null;
  modulo_actual_numero?: number | null;
  modulo?: {
    numero?: number | null;
    lecciones?: number[] | null;
  } | null;
};

function emptyCoursePosition(
  groupName: string | null,
  source: CoursePosition["source"] = "fallback",
): CoursePosition {
  return {
    groupName,
    resolvedGroupName: groupName,
    currentLesson: null,
    currentModuleNumber: null,
    source,
  };
}

function normalizeGroupName(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/日本語/g, "")
    .replace(/nihongo/g, "")
    .replace(/japonés/g, "")
    .replace(/japones/g, "")
    .replace(/[\s・·._-]+/g, "")
    .trim();
}

function namesMatch(a: string, b: string) {
  const left = normalizeGroupName(a);
  const right = normalizeGroupName(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function getGroupCandidates(
  groupName: string,
  collections: CollectionMap,
  modules: ModuleMap,
) {
  const candidates = new Set<string>([groupName]);

  Object.keys(modules).forEach((moduleGroupName) => {
    if (namesMatch(moduleGroupName, groupName)) candidates.add(moduleGroupName);
  });

  Object.values(collections).forEach((collection) => {
    const collectionName = collection.nombre?.trim();
    if (collectionName && namesMatch(collectionName, groupName)) {
      candidates.add(collectionName);
    }
  });

  return [...candidates];
}

function getModuleInfo(groupName: string, modules: ModuleMap) {
  if (modules[groupName]) return modules[groupName];
  const match = Object.entries(modules).find(([moduleGroupName]) =>
    namesMatch(moduleGroupName, groupName),
  );
  return match?.[1] ?? null;
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

function getModuleNumberFromNotes(notes: ClassNote[]) {
  for (const note of notes) {
    if (typeof note.modulo_actual_numero === "number") return note.modulo_actual_numero;
    if (typeof note.modulo?.numero === "number") return note.modulo.numero;
  }

  return null;
}

function getFallbackLesson(moduleInfo: ModuleInfo | null, notes: ClassNote[]) {
  const latestLesson = getLatestLesson(notes);
  if (latestLesson) return latestLesson;

  const noteLesson = notes.find((note) => note.modulo?.lecciones?.length)
    ?.modulo?.lecciones?.[0];
  if (typeof noteLesson === "number") return noteLesson;

  return moduleInfo?.lecciones?.[0] ?? null;
}

async function fetchNotesForCandidates(candidates: string[]) {
  for (const candidate of candidates) {
    const notesResponse = await fetch(
      `/api/clase-notas?grupo=${encodeURIComponent(candidate)}`,
    );
    const notes = notesResponse.ok
      ? ((await notesResponse.json()) as ClassNote[])
      : [];

    if (notes.length > 0) {
      return { notes, resolvedGroupName: candidate };
    }
  }

  return {
    notes: [] as ClassNote[],
    resolvedGroupName: candidates[0] ?? null,
  };
}

export async function fetchCoursePosition(
  groupName: string | null | undefined,
): Promise<CoursePosition> {
  const cleanGroupName = groupName?.trim() || null;

  if (!cleanGroupName) {
    return emptyCoursePosition(null);
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
    const candidates = getGroupCandidates(cleanGroupName, collections, modules);
    const moduleInfo = getModuleInfo(cleanGroupName, modules);
    const { notes, resolvedGroupName } = await fetchNotesForCandidates(candidates);
    const currentModuleNumber =
      getModuleNumberFromNotes(notes) ??
      (typeof moduleInfo?.numero === "number" ? moduleInfo.numero : null);

    return {
      groupName: cleanGroupName,
      resolvedGroupName,
      currentLesson: getFallbackLesson(moduleInfo, notes),
      currentModuleNumber,
      source: "teacher-backend",
    };
  } catch {
    return emptyCoursePosition(cleanGroupName);
  }
}
