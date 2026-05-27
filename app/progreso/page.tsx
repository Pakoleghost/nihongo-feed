import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import Link from "next/link";
import { LESSON_STOPS, getLessonStop, type LessonStop } from "@/lib/lesson-competencies";

const FLASK_BASE = "https://pako-nihongo.tailcd0aee.ts.net";
const SENSEI_KEY = "sensei-pako-2026";

type ClaseNota = {
  id: string;
  fecha: string;
  tema: string;
  [key: string]: unknown;
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

  // Determine which group to display
  const params = await searchParams;
  let grupo: string | null = null;
  if (isAdmin) {
    // Admin: use ?grupo= param (comes from student-view mini-card link)
    grupo = params.grupo?.trim() || null;
    if (!grupo) redirect("/");
  } else {
    grupo = (profile as { group_name: string | null } | null)?.group_name ?? null;
  }

  if (!grupo) redirect("/");

  // Check show_progreso from Flask (public endpoint)
  let showProgreso = false;
  try {
    const pr = await fetch(
      "https://pako-nihongo.tailcd0aee.ts.net/api/grupos/progreso",
      { next: { revalidate: 30 } },
    );
    if (pr.ok) {
      const map: Record<string, boolean> = await pr.json();
      showProgreso = Boolean(map[grupo]);
    }
  } catch {/* silent */}

  if (!showProgreso && !isAdmin) redirect("/");

  // Fetch clase-notas from Flask server-side
  let notas: ClaseNota[] = [];
  try {
    const res = await fetch(
      `${FLASK_BASE}/api/sensei/grupo/${encodeURIComponent(grupo)}/clase-notas`,
      {
        headers: { "X-Sensei-Key": SENSEI_KEY },
        cache: "no-store",
      },
    );
    if (res.ok) notas = await res.json();
  } catch {/* silent — show empty state */}

  // Parse lesson numbers from notas
  const lessonSet = new Set<number>();
  for (const n of notas) {
    const l = parseLeccionFromTema(n.tema);
    if (l) lessonSet.add(l);
  }
  const lessonsWithNotes = Array.from(lessonSet).sort((a, b) => a - b);
  const currentLesson = lessonsWithNotes.length > 0
    ? Math.max(...lessonsWithNotes)
    : null;

  // Count notas per lesson for the current lesson display
  const notasByLesson: Record<number, number> = {};
  for (const n of notas) {
    const l = parseLeccionFromTema(n.tema);
    if (l) notasByLesson[l] = (notasByLesson[l] ?? 0) + 1;
  }

  const currentStop = currentLesson ? getLessonStop(currentLesson) : null;

  // Build the visible stops: all completed + current + 3 future
  const maxFuture = 3;
  let futureCount = 0;
  const visibleStops: LessonStop[] = [];
  for (const stop of LESSON_STOPS) {
    const hasNotes = lessonSet.has(stop.leccion);
    const isCurrent = stop.leccion === currentLesson;
    const isCompleted = hasNotes && !isCurrent;
    if (isCompleted || isCurrent) {
      visibleStops.push(stop);
    } else if (!hasNotes && futureCount < maxFuture) {
      visibleStops.push(stop);
      futureCount++;
    }
  }

  // Find which stop is the level-2 boundary (first leccion with nivel === 2)
  const firstNivel2 = LESSON_STOPS.find(s => s.nivel === 2)?.leccion ?? 13;

  return (
    <div style={{ background: "#FFF8E7", minHeight: "100dvh", display: "flex", flexDirection: "column", paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}>

      {/* ── Header navy ── */}
      <div style={{ background: "#1A1A2E", padding: "20px 20px 24px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", width: "100%" }}>
          {/* Back link */}
          <Link
            href="/"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16, textDecoration: "none" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>Inicio</span>
          </Link>

          <h1 style={{ margin: 0, fontSize: 36, fontWeight: 800, color: "#FFFFFF", lineHeight: 1, letterSpacing: "-0.04em" }}>
            Mi Camino
          </h1>
          {currentLesson && currentStop ? (
            <p style={{ margin: "8px 0 0", fontSize: 14, fontWeight: 600, color: "#4ECDC4" }}>
              Lección {currentLesson} · {currentStop.titulo}
            </p>
          ) : (
            <p style={{ margin: "8px 0 0", fontSize: 14, color: "rgba(255,255,255,0.45)" }}>
              Sin clases registradas aún
            </p>
          )}
        </div>
      </div>

      {/* ── Timeline ── */}
      <div style={{ flex: 1, padding: "32px 20px", maxWidth: 760, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <div style={{ position: "relative" }}>
          {/* Vertical line */}
          <div style={{
            position: "absolute",
            left: 7,
            top: 0,
            bottom: 0,
            width: 2,
            background: "rgba(26,26,46,0.12)",
          }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {visibleStops.map((stop, idx) => {
              const hasNotes = lessonSet.has(stop.leccion);
              const isCurrent = stop.leccion === currentLesson;
              const isCompleted = hasNotes && !isCurrent;
              const isFuture = !hasNotes;

              // Level separator before first nivel-2 lesson (if it appears in visible stops)
              const prevStop = visibleStops[idx - 1];
              const showNivel2Sep =
                stop.nivel === 2 &&
                stop.leccion === firstNivel2 &&
                (!prevStop || prevStop.nivel === 1);

              return (
                <div key={stop.leccion}>
                  {/* Nivel 2 separator */}
                  {showNivel2Sep && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0", paddingLeft: 24 }}>
                      <div style={{ flex: 1, height: 1, background: "#4ECDC4", opacity: 0.4 }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#4ECDC4", letterSpacing: "0.10em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                        Nivel 2
                      </span>
                      <div style={{ flex: 1, height: 1, background: "#4ECDC4", opacity: 0.4 }} />
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: isCurrent ? "flex-start" : "center", gap: 16, paddingBottom: isCurrent ? 20 : 16, position: "relative" }}>
                    {/* Node */}
                    <div style={{ flexShrink: 0, width: 16, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: isCurrent ? 3 : 0 }}>
                      {isCompleted ? (
                        <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#4ECDC4" }} />
                      ) : isCurrent ? (
                        <div style={{
                          width: 18, height: 18, borderRadius: "50%",
                          background: "#1A1A2E",
                          boxShadow: "0 0 0 3px #4ECDC4",
                        }} />
                      ) : (
                        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FFF8E7", border: "2px solid #E8E8F0" }} />
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {isCompleted && (
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF" }}>L{stop.leccion}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E", lineHeight: 1.3 }}>{stop.tagline}</span>
                        </div>
                      )}

                      {isCurrent && (
                        <div style={{
                          background: "#1A1A2E",
                          borderRadius: 12,
                          padding: "14px 16px",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                              background: "#4ECDC4", color: "#1A1A2E",
                              borderRadius: 4, padding: "2px 7px", textTransform: "uppercase",
                            }}>
                              AHORA
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)" }}>L{stop.leccion}</span>
                          </div>
                          <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600, color: "#FFFFFF", lineHeight: 1.35 }}>
                            {stop.tagline}
                          </p>
                          {notasByLesson[stop.leccion] && (
                            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                              {notasByLesson[stop.leccion]} {notasByLesson[stop.leccion] === 1 ? "clase" : "clases"}
                            </p>
                          )}
                        </div>
                      )}

                      {isFuture && (
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#C4BAB0" }}>L{stop.leccion}</span>
                          <span style={{ fontSize: 14, color: "#C4BAB0", lineHeight: 1.3 }}>{stop.tagline}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
