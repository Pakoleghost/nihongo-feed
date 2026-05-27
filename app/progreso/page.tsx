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

  // ── Data ──────────────────────────────────────────────────────────────────
  const lessonSet = new Set<number>();
  for (const n of notas) {
    const l = parseLeccionFromTema(n.tema);
    if (l) lessonSet.add(l);
  }
  const currentLesson = lessonSet.size > 0 ? Math.max(...lessonSet) : null;

  const notasByLesson: Record<number, number> = {};
  for (const n of notas) {
    const l = parseLeccionFromTema(n.tema);
    if (l) notasByLesson[l] = (notasByLesson[l] ?? 0) + 1;
  }

  const currentStop = currentLesson ? getLessonStop(currentLesson) : null;
  const totalLessons = LESSON_STOPS.length;
  const completedCount = currentLesson ?? 0;
  const progressPct = Math.round((completedCount / totalLessons) * 100);

  // Visible stops: all lessons up to current + 3 ahead
  const maxFuture = 3;
  let futureCount = 0;
  const visibleStops: LessonStop[] = [];
  for (const stop of LESSON_STOPS) {
    const isCurrent = stop.leccion === currentLesson;
    const isCompleted = currentLesson !== null && stop.leccion < currentLesson;
    if (isCompleted || isCurrent) {
      visibleStops.push(stop);
    } else if (futureCount < maxFuture) {
      visibleStops.push(stop);
      futureCount++;
    }
  }

  // ── Roadmap geometry ───────────────────────────────────────────────────────
  // cx is in 0-100 scale (= % of container width) — used in both SVG and CSS left
  // cy is in actual pixels
  const ROW_H = 128;
  const NODE_R = 30;   // default node radius → 60px ø
  const CUR_R  = 34;   // current node radius → 68px ø
  const PAD_TOP = 72;  // top space for AHORA chip

  const positions = visibleStops.map((_, i) => ({
    cx:   i % 2 === 0 ? 28 : 66,
    cy:   PAD_TOP + i * ROW_H,
    side: (i % 2 === 0 ? "left" : "right") as "left" | "right",
  }));

  const canvasH = PAD_TOP + (visibleStops.length - 1) * ROW_H + CUR_R + 48;

  // Bezier path through all node centers (x in 0-100, y in px)
  function makePath(pts: typeof positions) {
    return pts
      .map((p, i) => {
        if (i === 0) return `M ${p.cx} ${p.cy}`;
        const prev = pts[i - 1];
        const cpY = ROW_H * 0.52;
        return `C ${prev.cx} ${prev.cy + cpY}, ${p.cx} ${p.cy - cpY}, ${p.cx} ${p.cy}`;
      })
      .join(" ");
  }

  const fullPath  = makePath(positions);
  const curIdx    = currentLesson
    ? positions.findIndex((_, i) => visibleStops[i].leccion === currentLesson)
    : -1;
  const donePath  = curIdx > 0 ? makePath(positions.slice(0, curIdx + 1)) : "";

  // Compact lesson ID: "1.3", "2.1", …
  function lessonId(s: LessonStop) {
    return s.nivel === 1 ? `1.${s.leccion}` : `2.${s.leccion - 12}`;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: "#1A1A2E",
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
    }}>

      {/* ── Header ── */}
      <div style={{ padding: "20px 20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 18, textDecoration: "none" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.3)" }}>Inicio</span>
          </Link>

          <h1 style={{ margin: "0 0 5px", fontSize: 38, fontWeight: 800, color: "#FFFFFF", lineHeight: 1, letterSpacing: "-0.04em" }}>
            Mi Camino
          </h1>
          {currentLesson && currentStop ? (
            <p style={{ margin: "0 0 20px", fontSize: 14, fontWeight: 600, color: "#4ECDC4" }}>
              {currentStop.tagline}
            </p>
          ) : (
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "rgba(255,255,255,0.3)" }}>
              Sin clases registradas aún
            </p>
          )}

          {/* Progress bar */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Progreso</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#4ECDC4" }}>{completedCount} / {totalLessons}</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progressPct}%`, borderRadius: 99, background: "linear-gradient(90deg, #4ECDC4, #178A83)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Roadmap ── */}
      <div style={{ flex: 1, padding: "4px 16px 24px", overflowX: "hidden" }}>
        <div style={{
          position: "relative",
          maxWidth: 480,
          margin: "0 auto",
          height: canvasH,
        }}>

          {/* ── SVG path (background winding road) ── */}
          <svg
            viewBox={`0 0 100 ${canvasH}`}
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
          >
            {/* Full road — muted */}
            <path
              d={fullPath}
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="8"
              strokeLinecap="round"
              style={{ vectorEffect: "non-scaling-stroke" } as React.CSSProperties}
            />
            {/* Completed portion — teal */}
            {donePath && (
              <path
                d={donePath}
                fill="none"
                stroke="rgba(78,205,196,0.45)"
                strokeWidth="8"
                strokeLinecap="round"
                style={{ vectorEffect: "non-scaling-stroke" } as React.CSSProperties}
              />
            )}
          </svg>

          {/* ── Nodes + labels ── */}
          {positions.map((pos, i) => {
            const stop      = visibleStops[i];
            const isCurrent  = stop.leccion === currentLesson;
            const isCompleted = currentLesson !== null && stop.leccion < currentLesson;
            const isFuture   = !isCompleted && !isCurrent;
            const r          = isCurrent ? CUR_R : NODE_R;
            const dia        = r * 2;
            const notaCount  = notasByLesson[stop.leccion] ?? 0;
            const labelRight = pos.side === "left"; // node left → label on right

            return (
              <div key={stop.leccion}>
                {/* AHORA chip — floats above current node */}
                {isCurrent && (
                  <div style={{
                    position: "absolute",
                    left: `${pos.cx}%`,
                    top: pos.cy - r - 30,
                    transform: "translateX(-50%)",
                    background: "#4ECDC4",
                    color: "#1A1A2E",
                    fontSize: 10, fontWeight: 800,
                    letterSpacing: "0.10em", textTransform: "uppercase",
                    padding: "3px 12px", borderRadius: 99,
                    whiteSpace: "nowrap",
                    boxShadow: "0 2px 10px rgba(78,205,196,0.45)",
                    zIndex: 2,
                  }}>
                    AHORA
                  </div>
                )}

                {/* Node circle */}
                <div style={{
                  position: "absolute",
                  left: `${pos.cx}%`,
                  top: pos.cy,
                  transform: "translate(-50%, -50%)",
                  width: dia, height: dia,
                  borderRadius: "50%",
                  zIndex: 1,
                  flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isCompleted
                    ? "linear-gradient(150deg, #5ED8CF 0%, #38B8AF 100%)"
                    : isCurrent
                    ? "#FFFFFF"
                    : "rgba(255,255,255,0.07)",
                  outline: isCurrent
                    ? "3px solid rgba(78,205,196,0.75)"
                    : isCompleted
                    ? "2px solid rgba(78,205,196,0.25)"
                    : "2px solid rgba(255,255,255,0.10)",
                  outlineOffset: isCurrent ? 3 : 1,
                  boxShadow: isCurrent
                    ? "0 0 0 8px rgba(78,205,196,0.12), 0 6px 20px rgba(0,0,0,0.4)"
                    : isCompleted
                    ? "0 3px 12px rgba(0,0,0,0.35)"
                    : "none",
                }}>
                  {isCompleted && (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="#1A1A2E" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {isCurrent && (
                    /* Teal pulse dot */
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#4ECDC4" }} />
                  )}
                  {isFuture && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.2)" }}>
                      {lessonId(stop)}
                    </span>
                  )}
                </div>

                {/* Text label — opposite side of node */}
                <div style={{
                  position: "absolute",
                  top: pos.cy - (isCurrent ? 22 : 18),
                  ...(labelRight
                    ? { left: `calc(${pos.cx}% + ${r + 14}px)`, right: 0 }
                    : { left: 0, right: `calc(${100 - pos.cx}% + ${r + 14}px)` }),
                }}>
                  {/* Lesson ID — small, secondary */}
                  <p style={{
                    margin: "0 0 4px",
                    fontSize: 10, fontWeight: 700,
                    letterSpacing: "0.07em",
                    color: isCompleted
                      ? "rgba(78,205,196,0.65)"
                      : isCurrent
                      ? "rgba(255,255,255,0.45)"
                      : "rgba(255,255,255,0.18)",
                    textAlign: labelRight ? "left" : "right",
                  }}>
                    {lessonId(stop)}
                  </p>
                  {/* Competency — main text */}
                  <p style={{
                    margin: 0,
                    fontSize: isCurrent ? 15 : 13,
                    fontWeight: isCompleted ? 600 : isCurrent ? 700 : 400,
                    lineHeight: 1.35,
                    color: isCompleted
                      ? "#FFFFFF"
                      : isCurrent
                      ? "#FFFFFF"
                      : "rgba(255,255,255,0.22)",
                    textAlign: labelRight ? "left" : "right",
                  }}>
                    {stop.tagline}
                  </p>
                  {/* Class count under current */}
                  {isCurrent && notaCount > 0 && (
                    <p style={{ margin: "5px 0 0", fontSize: 11, fontWeight: 600, color: "rgba(78,205,196,0.65)", textAlign: "left" }}>
                      {notaCount} {notaCount === 1 ? "clase" : "clases"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
