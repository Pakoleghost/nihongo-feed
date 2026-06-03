import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import Link from "next/link";
import {
  CURRICULUM_MODULES,
  getCurrentCurriculumModule,
  getCurriculumModuleIndex,
  isCurriculumModuleCompleted,
  isCurriculumModuleCurrent,
  type CurriculumModule,
} from "@/lib/curriculum-modules";

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

function moduleLessonsLabel(module: CurriculumModule) {
  const first = module.lecciones[0];
  const last = module.lecciones[module.lecciones.length - 1];
  return first === last ? `L${first}` : `L${first}-L${last}`;
}

function makePath(points: Array<{ cx: number; cy: number }>, rowH: number) {
  return points.map((p, i) => {
    if (i === 0) return `M ${p.cx} ${p.cy}`;
    const prev = points[i - 1];
    const cpY = rowH * 0.54;
    return `C ${prev.cx} ${prev.cy + cpY}, ${p.cx} ${p.cy - cpY}, ${p.cx} ${p.cy}`;
  }).join(" ");
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
  const currentModule = getCurrentCurriculumModule(currentLesson);
  const currentModuleIndex = getCurriculumModuleIndex(currentLesson);
  const progressPct = Math.round(((currentModuleIndex + 1) / CURRICULUM_MODULES.length) * 100);

  const rowH = 178;
  const padTop = 98;
  const padBottom = 150;
  const canvasH = padTop + (CURRICULUM_MODULES.length - 1) * rowH + padBottom;
  const positions = CURRICULUM_MODULES.map((_, i) => ({
    cx: i % 2 === 0 ? 22 : 76,
    cy: padTop + i * rowH,
    side: (i % 2 === 0 ? "right" : "left") as "right" | "left",
  }));
  const fullPath = makePath(positions, rowH);
  const donePath = currentModuleIndex > 0
    ? makePath(positions.slice(0, currentModuleIndex + 1), rowH)
    : "";

  return (
    <div style={{
      position: "relative",
      minHeight: "100dvh",
      overflowX: "hidden",
      fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
      color: "#FFFFFF",
      background: "#1A1A2E",
      paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
    }}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", inset: 0, background: "#1A1A2E" }} />
        <div style={{
          position: "absolute", top: -180, left: -120, width: 430, height: 430,
          background: "radial-gradient(circle, rgba(78,205,196,0.16) 0%, rgba(78,205,196,0) 62%)",
        }} />
        <div style={{
          position: "absolute", bottom: 80, right: -180, width: 420, height: 420,
          background: "radial-gradient(circle, rgba(230,57,70,0.10) 0%, rgba(230,57,70,0) 66%)",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(rgba(255,255,255,0.065) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.32) 100%)",
        }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <header style={{ padding: "calc(env(safe-area-inset-top, 20px) + 20px) 18px 20px" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none", marginBottom: 22 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="rgba(255,255,255,0.55)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 750, color: "rgba(255,255,255,0.55)" }}>Inicio</span>
          </Link>

          <h1 style={{ margin: "0 0 6px", fontSize: 42, fontWeight: 950, color: "#FFFFFF", lineHeight: 1, letterSpacing: 0 }}>
            Mi Camino
          </h1>
          <p style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 900, color: "#4ECDC4", lineHeight: 1.2 }}>
            {currentModule.nombreJa}
          </p>
          <p style={{ margin: "0 0 22px", fontSize: 14.5, fontWeight: 700, color: "rgba(255,255,255,0.68)", lineHeight: 1.35 }}>
            {currentModule.nombre} · {currentModule.cefr}/{currentModule.jlpt}
          </p>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{ fontSize: 10.5, fontWeight: 900, color: "rgba(255,255,255,0.45)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                Progreso modular
              </span>
              <span style={{ fontSize: 13, fontWeight: 900, color: "#4ECDC4", whiteSpace: "nowrap" }}>
                {currentModuleIndex + 1} / {CURRICULUM_MODULES.length}
              </span>
            </div>
            <div style={{
              height: 8,
              borderRadius: 99,
              background: "rgba(255,255,255,0.075)",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.34)",
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                width: `${progressPct}%`,
                borderRadius: 99,
                background: "linear-gradient(90deg, #178A83 0%, #4ECDC4 100%)",
                boxShadow: "0 0 14px rgba(78,205,196,0.5)",
              }} />
            </div>
            <div style={{ marginTop: 7, fontSize: 11, fontWeight: 750, color: "rgba(255,255,255,0.38)" }}>
              {currentLesson ? `Última clase registrada: L${currentLesson}` : "Todavía no hay clases registradas"}
            </div>
          </div>
        </header>

        <section style={{ padding: "8px 18px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, rgba(255,255,255,0.18))" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.18em", color: "#4ECDC4", textTransform: "uppercase" }}>
                Genki I · A1/N5
              </div>
              <div style={{ fontSize: 11, fontWeight: 650, color: "rgba(255,255,255,0.32)", marginTop: 2 }}>
                g1-a → g1-d
              </div>
            </div>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(255,255,255,0.18))" }} />
          </div>
        </section>

        <main style={{ position: "relative", width: "100%", height: canvasH, marginTop: 6 }}>
          <svg
            viewBox={`0 0 100 ${canvasH}`}
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
          >
            <defs>
              <filter id="mcPathGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <path
              d={fullPath}
              fill="none"
              stroke="rgba(255,255,255,0.10)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="2 12"
              style={{ vectorEffect: "non-scaling-stroke" } as React.CSSProperties}
            />
            <path
              d={fullPath}
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="8"
              strokeLinecap="round"
              style={{ vectorEffect: "non-scaling-stroke" } as React.CSSProperties}
            />
            {donePath && (
              <path
                d={donePath}
                fill="none"
                stroke="rgba(78,205,196,0.24)"
                strokeWidth="16"
                strokeLinecap="round"
                filter="url(#mcPathGlow)"
                style={{ vectorEffect: "non-scaling-stroke" } as React.CSSProperties}
              />
            )}
            {donePath && (
              <path
                d={donePath}
                fill="none"
                stroke="rgba(78,205,196,0.72)"
                strokeWidth="8"
                strokeLinecap="round"
                style={{ vectorEffect: "non-scaling-stroke" } as React.CSSProperties}
              />
            )}
          </svg>

          {CURRICULUM_MODULES.map((module, i) => {
            const pos = positions[i];
            const isCurrent = isCurriculumModuleCurrent(module, currentLesson);
            const isCompleted = isCurriculumModuleCompleted(module, currentLesson);
            const isFuture = !isCurrent && !isCompleted;
            const isGenki2Start = i > 0 && CURRICULUM_MODULES[i - 1].nivel === 1 && module.nivel === 2;
            const r = isCurrent ? 38 : 32;
            const dia = r * 2;
            const labelRight = pos.side === "right";
            const nodeBg = module.nivel === 1
              ? "linear-gradient(150deg, #5FE0D6 0%, #2BA59C 100%)"
              : "linear-gradient(150deg, #8EA0FF 0%, #6677F5 100%)";

            return (
              <div key={module.id}>
                {isGenki2Start && (
                  <div style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: pos.cy - rowH / 2 - 22,
                    padding: "0 18px",
                    zIndex: 1,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, rgba(255,255,255,0.18))" }} />
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.18em", color: "#818CF8", textTransform: "uppercase" }}>
                          Genki II · A2/N4
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 650, color: "rgba(255,255,255,0.32)", marginTop: 2 }}>
                          g2-a → g2-d
                        </div>
                      </div>
                      <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(255,255,255,0.18))" }} />
                    </div>
                  </div>
                )}

                {isCurrent && (
                  <div style={{
                    position: "absolute",
                    left: `${pos.cx}%`,
                    top: pos.cy - r - 36,
                    transform: "translateX(-50%)",
                    background: "#4ECDC4",
                    color: "#1A1A2E",
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    padding: "5px 13px",
                    borderRadius: 99,
                    whiteSpace: "nowrap",
                    boxShadow: "0 4px 16px rgba(78,205,196,0.50), 0 0 0 4px rgba(78,205,196,0.08)",
                    zIndex: 4,
                  }}>
                    AHORA
                    <div style={{
                      position: "absolute",
                      bottom: -4,
                      left: "50%",
                      transform: "translateX(-50%) rotate(45deg)",
                      width: 8,
                      height: 8,
                      background: "#4ECDC4",
                    }} />
                  </div>
                )}

                {isCurrent && (
                  <>
                    <div style={{
                      position: "absolute",
                      left: `${pos.cx}%`,
                      top: pos.cy,
                      transform: "translate(-50%, -50%)",
                      width: dia + 62,
                      height: dia + 62,
                      borderRadius: "50%",
                      background: "radial-gradient(circle, rgba(78,205,196,0.18) 0%, rgba(78,205,196,0) 70%)",
                      pointerEvents: "none",
                      zIndex: 1,
                    }} />
                    <div style={{
                      position: "absolute",
                      left: `${pos.cx}%`,
                      top: pos.cy,
                      transform: "translate(-50%, -50%)",
                      width: dia + 18,
                      height: dia + 18,
                      borderRadius: "50%",
                      border: "2px solid rgba(78,205,196,0.55)",
                      pointerEvents: "none",
                      zIndex: 1,
                    }} />
                  </>
                )}

                <div style={{
                  position: "absolute",
                  left: `${pos.cx}%`,
                  top: pos.cy,
                  transform: "translate(-50%, -50%)",
                  width: dia,
                  height: dia,
                  borderRadius: "50%",
                  zIndex: 3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  background: isFuture ? "rgba(255,255,255,0.055)" : nodeBg,
                  outline: isCurrent
                    ? "3px solid rgba(78,205,196,0.88)"
                    : isCompleted
                    ? "1.5px solid rgba(78,205,196,0.24)"
                    : "1.5px dashed rgba(255,255,255,0.18)",
                  outlineOffset: isCurrent ? 4 : 2,
                  boxShadow: isFuture
                    ? "none"
                    : "0 8px 22px rgba(0,0,0,0.42), inset 0 -4px 10px rgba(0,0,0,0.16)",
                }}>
                  {isCompleted ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="#1A1A2E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <>
                      <span style={{
                        color: isFuture ? "rgba(255,255,255,0.28)" : module.nivel === 1 ? "#1A1A2E" : "#FFFFFF",
                        fontSize: isCurrent ? 18 : 15,
                        fontWeight: 950,
                        lineHeight: 1,
                      }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span style={{
                        marginTop: 4,
                        color: isFuture ? "rgba(255,255,255,0.22)" : module.nivel === 1 ? "rgba(26,26,46,0.68)" : "rgba(255,255,255,0.72)",
                        fontSize: 8,
                        fontWeight: 950,
                        textTransform: "uppercase",
                      }}>
                        {module.id}
                      </span>
                    </>
                  )}
                </div>

                <div style={{
                  position: "absolute",
                  top: pos.cy - 28,
                  pointerEvents: "none",
                  ...(labelRight
                    ? { left: `calc(${pos.cx}% + ${r + 18}px)`, right: 18 }
                    : { left: 18, right: `calc(${100 - pos.cx}% + ${r + 18}px)` }),
                }}>
                  <p style={{
                    margin: "0 0 4px",
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: "0.10em",
                    color: isFuture ? "rgba(255,255,255,0.24)" : module.nivel === 1 ? "rgba(78,205,196,0.78)" : "rgba(129,140,248,0.86)",
                    textAlign: labelRight ? "left" : "right",
                    textTransform: "uppercase",
                  }}>
                    {bookName(module.nivel)} · {module.id.toUpperCase()} · {moduleLessonsLabel(module)}
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: isCurrent ? 17 : 14,
                    fontWeight: isCurrent ? 950 : 800,
                    lineHeight: 1.22,
                    color: isFuture ? "rgba(255,255,255,0.30)" : "#FFFFFF",
                    textAlign: labelRight ? "left" : "right",
                  }}>
                    {module.nombre}
                  </p>
                  <p style={{
                    margin: "3px 0 0",
                    fontSize: isCurrent ? 15 : 12.5,
                    fontWeight: 800,
                    lineHeight: 1.2,
                    color: isFuture ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.54)",
                    textAlign: labelRight ? "left" : "right",
                  }}>
                    {module.nombreJa}
                  </p>
                  {isCurrent && (
                    <div style={{ marginTop: 9, textAlign: labelRight ? "left" : "right" }}>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "5px 10px",
                        borderRadius: 99,
                        background: "rgba(78,205,196,0.10)",
                        border: "1px solid rgba(78,205,196,0.28)",
                        color: "#4ECDC4",
                        fontSize: 11,
                        fontWeight: 850,
                      }}>
                        {module.proyectos[0]?.nombre ?? "Proyecto"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </main>

        <section style={{ padding: "0 18px 28px", marginTop: -94 }}>
          <div style={{
            borderRadius: 20,
            background: "rgba(255,255,255,0.075)",
            border: "1px solid rgba(255,255,255,0.10)",
            padding: 18,
            boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
          }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", color: "#4ECDC4" }}>
              Módulo actual
            </div>
            <h2 style={{ margin: "7px 0 2px", fontSize: 24, fontWeight: 950, lineHeight: 1.12 }}>
              {currentModule.nombre}
            </h2>
            <div style={{ fontSize: 19, fontWeight: 900, color: "rgba(255,255,255,0.56)" }}>
              {currentModule.nombreJa}
            </div>
            <p style={{ margin: "14px 0 0", fontSize: 14, fontWeight: 650, lineHeight: 1.5, color: "rgba(255,255,255,0.76)" }}>
              {currentModule.canDo}
            </p>

            {/* Temas de vocabulario */}
            {currentModule.vocabTemas.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
                  Lo que vas a aprender
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {currentModule.vocabTemas.map((t) => (
                    <span key={t} style={{
                      fontSize: 12, fontWeight: 650, padding: "5px 11px", borderRadius: 99,
                      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.78)",
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Competencias */}
            {currentModule.competencias.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
                  Habilidades que dominas
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {currentModule.competencias.map((c) => (
                    <span key={c} style={{
                      fontSize: 12, fontWeight: 650, padding: "5px 11px", borderRadius: 99,
                      background: "rgba(78,205,196,0.1)", border: "1px solid rgba(78,205,196,0.22)",
                      color: "#4ECDC4",
                    }}>{c}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Proyectos — solo nombres */}
            <div style={{
              marginTop: 16,
              borderRadius: 14,
              background: "rgba(78,205,196,0.10)",
              border: "1px solid rgba(78,205,196,0.22)",
              padding: "12px 13px",
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 850,
            }}>
              Proyectos del módulo
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {currentModule.proyectos.map((project, i) => (
                  <div
                    key={project.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      padding: "10px 12px",
                    }}
                  >
                    <span style={{
                      flexShrink: 0, width: 22, height: 22, borderRadius: 7,
                      display: "grid", placeItems: "center",
                      background: "rgba(78,205,196,0.18)", color: "#4ECDC4",
                      fontSize: 11, fontWeight: 900,
                    }}>{i + 1}</span>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 850, color: "#FFFFFF" }}>{project.nombre}</div>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>{project.nombreJa}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function bookName(level: 1 | 2) {
  return level === 1 ? "Genki I" : "Genki II";
}
