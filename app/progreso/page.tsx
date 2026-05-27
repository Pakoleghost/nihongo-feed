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

  // Resolve the Flask-internal grupo name from colecciones
  // (clases_log.json uses coleccion.nombre like "Nihongo ゴジラ", not the short Supabase name)
  let flaskGrupo = grupo;
  try {
    const colRes = await fetch(`${FLASK_BASE}/api/colecciones`, {
      headers: { "X-Sensei-Key": SENSEI_KEY },
      next: { revalidate: 60 },
    });
    if (colRes.ok) {
      const cols: Record<string, { nombre: string }> = await colRes.json();
      const nameLower = grupo.toLowerCase();
      const match = Object.values(cols).find(c =>
        c.nombre.toLowerCase().includes(nameLower)
      );
      if (match) flaskGrupo = match.nombre;
    }
  } catch {/* silent — fall back to short name */}

  // Fetch clase-notas from Flask server-side using the resolved grupo name
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
  } catch {/* silent — show empty state */}

  // Parse lesson numbers from notas
  const lessonSet = new Set<number>();
  for (const n of notas) {
    const l = parseLeccionFromTema(n.tema);
    if (l) lessonSet.add(l);
  }
  const currentLesson = lessonSet.size > 0 ? Math.max(...lessonSet) : null;

  // Count notas per lesson for the current lesson display
  const notasByLesson: Record<number, number> = {};
  for (const n of notas) {
    const l = parseLeccionFromTema(n.tema);
    if (l) notasByLesson[l] = (notasByLesson[l] ?? 0) + 1;
  }

  const currentStop = currentLesson ? getLessonStop(currentLesson) : null;
  const totalLessons = LESSON_STOPS.length; // 23
  // All lessons up to currentLesson count as done (student passed through them)
  const completedCount = currentLesson ?? 0;
  const progressPct = Math.round((completedCount / totalLessons) * 100);

  // Build the visible stops: all up to current + 3 future
  const maxFuture = 3;
  let futureCount = 0;
  const visibleStops: LessonStop[] = [];
  for (const stop of LESSON_STOPS) {
    const isCurrent = stop.leccion === currentLesson;
    const isCompleted = currentLesson !== null && stop.leccion < currentLesson;
    const isFuture = !isCompleted && !isCurrent;
    if (isCompleted || isCurrent) {
      visibleStops.push(stop);
    } else if (isFuture && futureCount < maxFuture) {
      visibleStops.push(stop);
      futureCount++;
    }
  }

  // Find level-2 boundary
  const firstNivel2 = LESSON_STOPS.find(s => s.nivel === 2)?.leccion ?? 13;

  return (
    <div style={{ background: "#FFF8E7", minHeight: "100dvh", display: "flex", flexDirection: "column", paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}>

      {/* ── Header ── */}
      <div style={{ background: "#1A1A2E", padding: "20px 20px 28px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", width: "100%" }}>
          <Link
            href="/"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 20, textDecoration: "none" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>Inicio</span>
          </Link>

          <h1 style={{ margin: "0 0 6px", fontSize: 38, fontWeight: 800, color: "#FFFFFF", lineHeight: 1, letterSpacing: "-0.04em" }}>
            Mi Camino
          </h1>
          {currentLesson && currentStop ? (
            <p style={{ margin: "0 0 20px", fontSize: 14, fontWeight: 600, color: "#4ECDC4" }}>
              Lección {currentLesson} · {currentStop.titulo}
            </p>
          ) : (
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "rgba(255,255,255,0.35)" }}>
              Sin clases registradas aún
            </p>
          )}

          {/* Progress bar */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Progreso
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#4ECDC4" }}>
                {completedCount} / {totalLessons}
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${progressPct}%`,
                borderRadius: 99,
                background: "linear-gradient(90deg, #4ECDC4, #178A83)",
                transition: "width 0.6s ease",
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Cards ── */}
      <div style={{ flex: 1, padding: "20px 16px 8px", maxWidth: 760, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        {visibleStops.map((stop, idx) => {
          const isCurrent = stop.leccion === currentLesson;
          const isCompleted = currentLesson !== null && stop.leccion < currentLesson;
          const isFuture = !isCompleted && !isCurrent;
          const notaCount = notasByLesson[stop.leccion] ?? 0;

          // Show a nivel-2 separator when crossing from genki I → II
          const prevStop = visibleStops[idx - 1];
          const showNivel2Sep =
            stop.nivel === 2 &&
            stop.leccion === firstNivel2 &&
            (!prevStop || prevStop.nivel === 1);

          // Connector color between cards (teal for done, muted for upcoming)
          const isLastVisible = idx === visibleStops.length - 1;
          const connectorTeal = isCompleted || isCurrent;

          return (
            <div key={stop.leccion}>
              {/* ── Nivel 2 separator ── */}
              {showNivel2Sep && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 8px" }}>
                  <div style={{ flex: 1, height: 1, background: "rgba(78,205,196,0.3)" }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#4ECDC4", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    Genki II
                  </span>
                  <div style={{ flex: 1, height: 1, background: "rgba(78,205,196,0.3)" }} />
                </div>
              )}

              {/* ── Completed card ── */}
              {isCompleted && (
                <div style={{
                  background: "#FFFFFF",
                  borderRadius: 14,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  boxShadow: "inset 4px 0 0 #4ECDC4, 0 1px 6px rgba(26,26,46,0.06)",
                  overflow: "hidden",
                  position: "relative",
                }}>
                  {/* Check circle */}
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: "rgba(78,205,196,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="#4ECDC4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.07em" }}>L{stop.leccion}</span>
                    <p style={{ margin: "1px 0 0", fontSize: 14, fontWeight: 600, color: "#1A1A2E", lineHeight: 1.3 }}>
                      {stop.tagline}
                    </p>
                  </div>
                  {/* Decorative lesson number */}
                  <span style={{
                    fontSize: 44, fontWeight: 800, color: "rgba(26,26,46,0.04)",
                    lineHeight: 1, flexShrink: 0, userSelect: "none",
                    letterSpacing: "-0.04em",
                  }}>
                    {String(stop.leccion).padStart(2, "0")}
                  </span>
                </div>
              )}

              {/* ── Current card ── */}
              {isCurrent && (
                <div style={{
                  background: "#1A1A2E",
                  borderRadius: 16,
                  padding: "20px 18px",
                  boxShadow: "0 6px 24px rgba(26,26,46,0.22)",
                  overflow: "hidden",
                  position: "relative",
                }}>
                  {/* Decorative large number (background watermark) */}
                  <span style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    fontSize: 80, fontWeight: 800, color: "rgba(255,255,255,0.04)",
                    lineHeight: 1, letterSpacing: "-0.04em", userSelect: "none",
                    pointerEvents: "none",
                  }}>
                    {String(stop.leccion).padStart(2, "0")}
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase",
                      background: "#4ECDC4", color: "#1A1A2E",
                      borderRadius: 6, padding: "3px 9px",
                    }}>
                      Ahora
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>
                      Lección {stop.leccion}
                    </span>
                  </div>

                  <p style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800, color: "#FFFFFF", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
                    {stop.tagline}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#4ECDC4" }}>
                    {stop.titulo}
                  </p>
                  {notaCount > 0 && (
                    <p style={{ margin: "10px 0 0", fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>
                      {notaCount} {notaCount === 1 ? "clase registrada" : "clases registradas"}
                    </p>
                  )}
                </div>
              )}

              {/* ── Future card ── */}
              {isFuture && (
                <div style={{
                  background: "rgba(255,255,255,0.55)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  boxShadow: "inset 0 0 0 1px rgba(26,26,46,0.07)",
                  overflow: "hidden",
                  position: "relative",
                }}>
                  {/* Hollow circle */}
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%",
                    border: "2px solid rgba(26,26,46,0.10)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(26,26,46,0.20)" }}>
                      L{stop.leccion}
                    </span>
                  </div>
                  <p style={{ margin: 0, flex: 1, fontSize: 14, color: "#C4BAB0", lineHeight: 1.3 }}>
                    {stop.tagline}
                  </p>
                  <span style={{
                    fontSize: 44, fontWeight: 800, color: "rgba(26,26,46,0.03)",
                    lineHeight: 1, flexShrink: 0, userSelect: "none",
                    letterSpacing: "-0.04em",
                  }}>
                    {String(stop.leccion).padStart(2, "0")}
                  </span>
                </div>
              )}

              {/* ── Connector between cards ── */}
              {!isLastVisible && (
                <div style={{ display: "flex", justifyContent: "flex-start", paddingLeft: 23, height: 14 }}>
                  <div style={{
                    width: 2,
                    height: "100%",
                    background: connectorTeal ? "#4ECDC4" : "rgba(26,26,46,0.10)",
                    opacity: connectorTeal ? 0.6 : 1,
                    borderRadius: 1,
                  }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
