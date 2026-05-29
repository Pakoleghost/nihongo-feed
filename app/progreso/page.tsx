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

  const currentStop    = currentLesson ? getLessonStop(currentLesson) : null;
  const totalLessons   = LESSON_STOPS.length;
  const completedCount = currentLesson ?? 0;
  const progressPct    = Math.round((completedCount / totalLessons) * 100);

  // Visible stops: all up to current + 3 future
  const visibleStops: LessonStop[] = LESSON_STOPS.filter(s => {
    if (s.leccion <= (currentLesson ?? 0)) return true;
    if (s.leccion <= (currentLesson ?? 0) + 3)  return true;
    return false;
  });

  // ── Roadmap geometry (matches Claude Design spec) ─────────────────────────
  const ROW_H   = 148;
  const NODE_R  = 30;   // 60px ø
  const CUR_R   = 34;   // 68px ø — current node is slightly bigger
  const PAD_TOP = 78;   // space above first node for AHORA chip

  const positions = visibleStops.map((_, i) => ({
    cx:   i % 2 === 0 ? 22 : 72,
    cy:   PAD_TOP + i * ROW_H,
    side: (i % 2 === 0 ? "left" : "right") as "left" | "right",
  }));

  const canvasH = PAD_TOP + (visibleStops.length - 1) * ROW_H + CUR_R + 80;

  function makePath(pts: typeof positions) {
    return pts.map((p, i) => {
      if (i === 0) return `M ${p.cx} ${p.cy}`;
      const prev = pts[i - 1];
      const cpY  = ROW_H * 0.52;
      return `C ${prev.cx} ${prev.cy + cpY}, ${p.cx} ${p.cy - cpY}, ${p.cx} ${p.cy}`;
    }).join(" ");
  }

  const fullPath = makePath(positions);
  const curIdx   = currentLesson
    ? positions.findIndex((_, i) => visibleStops[i].leccion === currentLesson)
    : -1;
  const donePath = curIdx > 0 ? makePath(positions.slice(0, curIdx + 1)) : "";

  function lessonId(s: LessonStop) {
    return s.nivel === 1 ? `1.${s.leccion}` : `2.${s.leccion - 12}`;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: "relative",
      minHeight: "100dvh",
      overflowX: "hidden",
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      color: "#FFFFFF",
      paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
    }}>

      {/* ── Atmospheric backdrop ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        {/* base navy */}
        <div style={{ position: "absolute", inset: 0, background: "#1A1A2E" }} />
        {/* teal glow top-left */}
        <div style={{
          position: "absolute", top: -180, left: -120, width: 420, height: 420,
          background: "radial-gradient(circle, rgba(78,205,196,0.16) 0%, rgba(78,205,196,0) 60%)",
        }} />
        {/* red glow bottom-right (very subtle) */}
        <div style={{
          position: "absolute", bottom: 40, right: -180, width: 380, height: 380,
          background: "radial-gradient(circle, rgba(230,57,70,0.08) 0%, rgba(230,57,70,0) 65%)",
        }} />
        {/* dot grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }} />
        {/* vignette */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.32) 100%)",
        }} />
      </div>

      {/* ── Scroll content ── */}
      <div style={{ position: "relative", zIndex: 1 }}>

        {/* ── Header ── */}
        <div style={{ padding: "calc(env(safe-area-inset-top, 20px) + 20px) 22px 22px" }}>
          {/* Top row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="rgba(255,255,255,0.55)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.55)" }}>Inicio</span>
            </Link>
          </div>

          <h1 style={{ margin: "0 0 6px", fontSize: 40, fontWeight: 800, color: "#FFFFFF", lineHeight: 1, letterSpacing: "-0.045em" }}>
            Mi Camino
          </h1>
          {currentLesson && currentStop ? (
            <p style={{ margin: "0 0 20px", fontSize: 14.5, fontWeight: 600, color: "#4ECDC4", letterSpacing: "-0.01em" }}>
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
              <span style={{ fontSize: 10.5, fontWeight: 800, color: "rgba(255,255,255,0.45)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                Progreso
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#4ECDC4", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
                {completedCount} / {totalLessons}
              </span>
            </div>
            <div style={{
              height: 7, borderRadius: 99,
              background: "rgba(255,255,255,0.07)",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.3)",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{
                height: "100%", width: `${progressPct}%`, borderRadius: 99,
                background: "linear-gradient(90deg, #178A83 0%, #4ECDC4 100%)",
                boxShadow: "0 0 12px rgba(78,205,196,0.5)",
                position: "relative",
              }}>
                {/* moving shine */}
                <div style={{
                  position: "absolute", top: 0, left: 0, height: "100%", width: 32,
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
                  animation: "mcShine 2.6s ease-in-out infinite",
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Section marker ── */}
        <div style={{ padding: "8px 22px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, rgba(255,255,255,0.18))" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", color: "#4ECDC4", textTransform: "uppercase" }}>
                Genki I · Cap. 1
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.32)", marginTop: 2 }}>
                Fundamentos · L1–L12
              </div>
            </div>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(255,255,255,0.18))" }} />
          </div>
        </div>

        {/* ── Roadmap canvas ── */}
        <div style={{ padding: "4px 0 24px" }}>
          <div style={{ position: "relative", width: "100%", height: canvasH }}>

            {/* SVG path */}
            <svg
              viewBox={`0 0 100 ${canvasH}`}
              preserveAspectRatio="none"
              aria-hidden="true"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
            >
              <defs>
                <linearGradient id="mcDoneGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(78,205,196,0.65)"/>
                  <stop offset="100%" stopColor="rgba(78,205,196,0.35)"/>
                </linearGradient>
                <filter id="mcPathGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>

              {/* Future road — dashed muted */}
              <path d={fullPath} fill="none" stroke="rgba(255,255,255,0.10)"
                strokeWidth="8" strokeLinecap="round" strokeDasharray="2 12"
                style={{ vectorEffect: "non-scaling-stroke" } as React.CSSProperties}/>
              <path d={fullPath} fill="none" stroke="rgba(255,255,255,0.04)"
                strokeWidth="8" strokeLinecap="round"
                style={{ vectorEffect: "non-scaling-stroke" } as React.CSSProperties}/>

              {/* Completed glow halo */}
              {donePath && (
                <path d={donePath} fill="none" stroke="rgba(78,205,196,0.22)"
                  strokeWidth="16" strokeLinecap="round"
                  filter="url(#mcPathGlow)"
                  style={{ vectorEffect: "non-scaling-stroke" } as React.CSSProperties}/>
              )}
              {/* Completed solid teal */}
              {donePath && (
                <path d={donePath} fill="none" stroke="url(#mcDoneGrad)"
                  strokeWidth="8" strokeLinecap="round"
                  style={{ vectorEffect: "non-scaling-stroke" } as React.CSSProperties}/>
              )}
            </svg>

            {/* Nodes + labels */}
            {positions.map((pos, i) => {
              const stop       = visibleStops[i];
              const isCurrent  = stop.leccion === currentLesson;
              const isCompleted = currentLesson !== null && stop.leccion < currentLesson;
              const isFuture   = !isCompleted && !isCurrent;
              const r          = isCurrent ? CUR_R : NODE_R;
              const dia        = r * 2;
              const notaCount  = notasByLesson[stop.leccion] ?? 0;
              const labelRight = pos.side === "left";

              // Genki II section marker between L12 and L13
              const prevStop    = i > 0 ? visibleStops[i - 1] : null;
              const showNivel2  = prevStop?.nivel === 1 && stop.nivel === 2;

              return (
                <div key={stop.leccion}>
                  {/* Genki II separator */}
                  {showNivel2 && (
                    <div style={{
                      position: "absolute", left: 0, right: 0,
                      top: pos.cy - ROW_H / 2 - 18,
                      padding: "0 12px", zIndex: 1,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, rgba(255,255,255,0.18))" }} />
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", color: "#4ECDC4", textTransform: "uppercase" }}>
                            Genki II · Cap. 2
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.32)", marginTop: 2 }}>
                            Intermedio · L13–L23
                          </div>
                        </div>
                        <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(255,255,255,0.18))" }} />
                      </div>
                    </div>
                  )}

                  {/* ── AHORA chip ── */}
                  {isCurrent && (
                    <div style={{
                      position: "absolute",
                      left: `${pos.cx}%`,
                      top: pos.cy - r - 34,
                      transform: "translateX(-50%)",
                      background: "#4ECDC4",
                      color: "#1A1A2E",
                      fontSize: 10, fontWeight: 800,
                      letterSpacing: "0.14em", textTransform: "uppercase",
                      padding: "4px 12px", borderRadius: 99,
                      whiteSpace: "nowrap",
                      boxShadow: "0 4px 14px rgba(78,205,196,0.5), 0 0 0 4px rgba(78,205,196,0.08)",
                      animation: "mcBob 2.4s ease-in-out infinite",
                      zIndex: 3,
                    }}>
                      AHORA
                      {/* triangle tail */}
                      <div style={{
                        position: "absolute", bottom: -4, left: "50%",
                        transform: "translateX(-50%) rotate(45deg)",
                        width: 7, height: 7, background: "#4ECDC4",
                      }} />
                    </div>
                  )}

                  {/* ── Glow rings (current only) ── */}
                  {isCurrent && (
                    <>
                      <div style={{
                        position: "absolute",
                        left: `${pos.cx}%`,
                        top: pos.cy,
                        transform: "translate(-50%, -50%)",
                        width: dia + 60, height: dia + 60,
                        borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(78,205,196,0.16) 0%, rgba(78,205,196,0) 70%)",
                        animation: "mcBreathe 3.6s ease-in-out infinite",
                        pointerEvents: "none",
                        zIndex: 0,
                      }} />
                      <div style={{
                        position: "absolute",
                        left: `${pos.cx}%`,
                        top: pos.cy,
                        transform: "translate(-50%, -50%)",
                        width: dia + 18, height: dia + 18,
                        borderRadius: "50%",
                        border: "2px solid rgba(78,205,196,0.45)",
                        animation: "mcRing 2.8s ease-out infinite",
                        pointerEvents: "none",
                        zIndex: 0,
                      }} />
                    </>
                  )}

                  {/* ── Node circle ── */}
                  <div style={{
                    position: "absolute",
                    left: `${pos.cx}%`,
                    top: pos.cy,
                    transform: "translate(-50%, -50%)",
                    width: dia, height: dia,
                    borderRadius: "50%",
                    zIndex: 2,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: isCompleted
                      ? "linear-gradient(150deg, #5FE0D6 0%, #2BA59C 100%)"
                      : isCurrent
                      ? "linear-gradient(150deg, #FFFFFF 0%, #E7F8F6 100%)"
                      : "rgba(255,255,255,0.05)",
                    outline: isCurrent
                      ? "3px solid rgba(78,205,196,0.85)"
                      : isCompleted
                      ? "1.5px solid rgba(78,205,196,0.2)"
                      : "1.5px dashed rgba(255,255,255,0.16)",
                    outlineOffset: isCurrent ? 4 : 2,
                    boxShadow: isCurrent
                      ? "0 8px 24px rgba(0,0,0,0.5), inset 0 -4px 10px rgba(78,205,196,0.18)"
                      : isCompleted
                      ? "0 4px 14px rgba(0,0,0,0.4), inset 0 -3px 6px rgba(0,0,0,0.18)"
                      : "none",
                  }}>
                    {isCompleted && (
                      <>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                          <path d="M5 13l4 4L19 7" stroke="#1A1A2E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {/* shine highlight */}
                        <div style={{
                          position: "absolute", top: 6, left: 12, width: 14, height: 8,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.35)",
                          filter: "blur(2px)",
                          pointerEvents: "none",
                        }} />
                      </>
                    )}
                    {isCurrent && (
                      <div style={{
                        width: 14, height: 14, borderRadius: "50%", background: "#4ECDC4",
                        boxShadow: "0 0 12px rgba(78,205,196,0.9)",
                        animation: "mcPulse 2.2s ease-in-out infinite",
                      }} />
                    )}
                    {isFuture && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.22)", letterSpacing: "-0.01em" }}>
                        {lessonId(stop)}
                      </span>
                    )}
                  </div>

                  {/* ── Text label (opposite side) ── */}
                  <div style={{
                    position: "absolute",
                    top: pos.cy - (isCurrent ? 26 : 22),
                    pointerEvents: "none",
                    ...(labelRight
                      ? { left: `calc(${pos.cx}% + ${r + 18}px)`, right: 12 }
                      : { left: 12, right: `calc(${100 - pos.cx}% + ${r + 18}px)` }),
                  }}>
                    <p style={{
                      margin: "0 0 4px",
                      fontSize: 10, fontWeight: 800, letterSpacing: "0.10em",
                      color: isCompleted ? "rgba(78,205,196,0.7)" : isCurrent ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.22)",
                      textAlign: labelRight ? "left" : "right",
                    }}>
                      {lessonId(stop)}
                    </p>
                    <p style={{
                      margin: 0,
                      fontSize: isCurrent ? 15.5 : 13.5,
                      fontWeight: isCompleted ? 600 : isCurrent ? 800 : 500,
                      lineHeight: 1.3, letterSpacing: "-0.01em",
                      color: isCompleted || isCurrent ? "#FFFFFF" : "rgba(255,255,255,0.30)",
                      textAlign: labelRight ? "left" : "right",
                    }}>
                      {stop.tagline}
                    </p>
                    {/* Continuar button for current lesson */}
                    {isCurrent && (
                      <div style={{ marginTop: 8, textAlign: labelRight ? "left" : "right" }}>
                        <Link href="/" style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          padding: "5px 10px",
                          background: "rgba(78,205,196,0.10)",
                          border: "1px solid rgba(78,205,196,0.28)",
                          borderRadius: 99,
                          textDecoration: "none",
                        }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                            <path d="M8 5v14l11-7z" fill="#4ECDC4"/>
                          </svg>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#4ECDC4", letterSpacing: "-0.01em" }}>
                            {notaCount > 0 ? `${notaCount} ${notaCount === 1 ? "clase" : "clases"}` : "Continuar"}
                          </span>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CSS animations ── */}
      <style>{`
        @keyframes mcPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.18); opacity: 0.85; }
        }
        @keyframes mcBreathe {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.18); opacity: 0.55; }
        }
        @keyframes mcRing {
          0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        @keyframes mcBob {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-4px); }
        }
        @keyframes mcShine {
          0% { transform: translateX(-32px); }
          100% { transform: translateX(420px); }
        }
      `}</style>
    </div>
  );
}
