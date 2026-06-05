import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import CurriculumRoadmap from "@/components/CurriculumRoadmap";

const FLASK_BASE = "https://pako-nihongo.tailcd0aee.ts.net";
const SENSEI_KEY = "sensei-pako-2026";

type ClaseNota = {
  id: string;
  fecha: string;
  tema: string;
  [key: string]: unknown;
};

type ModuloResumen = {
  numero?: number;
};

function parseLeccionFromTema(tema: string): number | null {
  const m = tema?.match(/^L(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

export default async function ProgresoPage({
  searchParams,
}: {
  searchParams: Promise<{ grupo?: string }>;
}) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, group_name")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = Boolean((profile as { is_admin: boolean | null } | null)?.is_admin);
  const params = await searchParams;
  let grupo: string | null = null;

  if (isAdmin) {
    grupo = params.grupo?.trim() || null;
    if (!grupo) redirect("/");
  } else {
    grupo = (profile as { group_name: string | null } | null)?.group_name ?? null;
  }

  if (!grupo) redirect("/");

  let showProgreso = false;
  try {
    const pr = await fetch(`${FLASK_BASE}/api/grupos/progreso`, { next: { revalidate: 30 } });
    if (pr.ok) {
      const map: Record<string, boolean> = await pr.json();
      showProgreso = Boolean(map[grupo]);
    }
  } catch {/* silent */}

  if (!showProgreso && !isAdmin) redirect("/");

  let flaskGrupo = grupo;
  try {
    const colRes = await fetch(`${FLASK_BASE}/api/colecciones`, {
      headers: { "X-Sensei-Key": SENSEI_KEY },
      next: { revalidate: 60 },
    });
    if (colRes.ok) {
      const cols: Record<string, { nombre: string }> = await colRes.json();
      const nameLower = grupo.toLowerCase();
      const match = Object.values(cols).find((c) => c.nombre.toLowerCase().includes(nameLower));
      if (match) flaskGrupo = match.nombre;
    }
  } catch {/* silent */}

  let currentModuleNumber: number | null = null;
  try {
    const modRes = await fetch(`${FLASK_BASE}/api/grupos/modulos`, { cache: "no-store" });
    if (modRes.ok) {
      const map: Record<string, ModuloResumen> = await modRes.json();
      const mod = map[flaskGrupo] ?? map[grupo];
      currentModuleNumber = typeof mod?.numero === "number" ? mod.numero : null;
    }
  } catch {/* silent */}

  let notas: ClaseNota[] = [];
  try {
    const res = await fetch(
      `${FLASK_BASE}/api/sensei/grupo/${encodeURIComponent(flaskGrupo)}/clase-notas`,
      {
        headers: { "X-Sensei-Key": SENSEI_KEY },
        cache: "no-store",
      },
    );
    if (res.ok) notas = await res.json();
  } catch {/* silent */}

  const lessonSet = new Set<number>();
  for (const n of notas) {
    const lesson = parseLeccionFromTema(n.tema);
    if (lesson) lessonSet.add(lesson);
  }

  const currentLesson = lessonSet.size > 0 ? Math.max(...lessonSet) : null;
  return <CurriculumRoadmap currentLesson={currentLesson} currentModuleNumber={currentModuleNumber} />;
}
