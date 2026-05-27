"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import { useStudentViewMode } from "@/lib/use-student-view-mode";

const COLECCIONES_URL = "/api/colecciones";

type Entrada = {
  label: string;
  url: string;
  password?: string;
  notas?: string;
};

type NotaClase = {
  id: string;
  fecha?: string;
  libro?: string;
  tema?: string;
  pagina?: string;
  tarea?: string;
  tarea_completada?: boolean;
};

type Coleccion = {
  nombre: string;
  zoom_topic?: string;
  entradas: Entrada[];
  notas?: NotaClase[];
};

type ColeccionesMap = Record<string, Coleccion>;

/** Returns the most recent nota that has a non-empty tarea. */
function findActiveTarea(coleccion: Coleccion): NotaClase | null {
  const withTarea = (coleccion.notas ?? []).filter((n) => n.tarea?.trim());
  if (withTarea.length === 0) return null;
  return withTarea.sort((a, b) => {
    const da = a.fecha ? new Date(a.fecha).getTime() : 0;
    const db = b.fecha ? new Date(b.fecha).getTime() : 0;
    return db - da; // newest first
  })[0];
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function VideoIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="6" width="14" height="12" rx="2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 10l5-3v10l-5-3V10z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EntradaCard({ entrada }: { entrada: Entrada }) {
  const [copied, setCopied] = useState(false);

  function copyPassword() {
    if (!entrada.password) return;
    navigator.clipboard.writeText(entrada.password).catch(() => null);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: "14px",
        padding: "14px 16px",
        boxShadow: "inset 4px 0 0 #4ECDC4, 0 2px 10px rgba(26,26,46,0.07)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      {/* Label row + button */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
        <p
          style={{
            fontSize: "15px",
            fontWeight: 700,
            color: "#1A1A2E",
            margin: 0,
            lineHeight: 1.35,
            flex: 1,
          }}
        >
          {entrada.label}
        </p>
        <a
          href={entrada.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            background: "#E63946",
            color: "#FFFFFF",
            borderRadius: "8px",
            padding: "7px 12px",
            fontSize: "12px",
            fontWeight: 800,
            textDecoration: "none",
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <polygon points="5 3 19 12 5 21 5 3" fill="#FFFFFF" />
          </svg>
          Ver
        </a>
      </div>

      {/* Notas */}
      {entrada.notas ? (
        <p style={{ fontSize: "13px", color: "#53596B", margin: 0, lineHeight: 1.5 }}>
          {entrada.notas}
        </p>
      ) : null}

      {/* Contraseña */}
      {entrada.password ? (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#9CA3AF",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Contraseña
          </span>
          <code
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#1A1A2E",
              background: "#F7F3ED",
              borderRadius: "6px",
              padding: "3px 8px",
              fontFamily: "monospace",
              letterSpacing: "0.03em",
            }}
          >
            {entrada.password}
          </code>
          <button
            type="button"
            onClick={copyPassword}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: "2px 6px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 700,
              color: copied ? "#178A83" : "#4ECDC4",
              transition: "color 140ms ease",
            }}
          >
            {copied ? "✓ Copiada" : "Copiar"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function TareaSection({
  coleccion,
  slug,
  onToggle,
}: {
  coleccion: Coleccion;
  slug: string;
  onToggle: (notaId: string, completed: boolean) => void;
}) {
  const nota = findActiveTarea(coleccion);
  const [toggling, setToggling] = useState(false);

  if (!nota) return null;

  // Capture as non-null const so TypeScript retains the narrowing inside async closures
  const activeNota = nota;
  const bullets = (activeNota.tarea ?? "").split("\n").filter(Boolean);
  const isCompleted = activeNota.tarea_completada ?? false;

  async function handleToggle() {
    if (toggling) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/colecciones/${slug}/notas/${activeNota.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tarea_completada: !isCompleted }),
      });
      if (res.ok) onToggle(activeNota.id, !isCompleted);
    } finally {
      setToggling(false);
    }
  }

  return (
    <div style={{ marginTop: "20px" }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "#9CA3AF",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Tarea
        </span>
        {isCompleted && (
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#178A83",
              background: "rgba(78,205,196,0.12)",
              borderRadius: "6px",
              padding: "2px 7px",
            }}
          >
            Completada
          </span>
        )}
      </div>

      {/* Card */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "14px",
          padding: "14px 16px",
          boxShadow: isCompleted
            ? "inset 4px 0 0 #4ECDC4, 0 2px 10px rgba(26,26,46,0.07)"
            : "inset 4px 0 0 #E63946, 0 2px 10px rgba(26,26,46,0.07)",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          opacity: isCompleted ? 0.72 : 1,
          transition: "opacity 200ms ease",
        }}
      >
        {/* Meta: fecha · tema */}
        {(activeNota.fecha || activeNota.tema) && (
          <p style={{ fontSize: "12px", color: "#9CA3AF", margin: 0, fontWeight: 500 }}>
            {activeNota.fecha ?? ""}
            {activeNota.tema ? `${activeNota.fecha ? " · " : ""}${activeNota.tema}` : ""}
          </p>
        )}

        {/* Bullet list */}
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" }}>
          {bullets.map((line, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <li
              key={i}
              style={{
                display: "flex",
                gap: "8px",
                fontSize: "14px",
                lineHeight: 1.45,
                color: isCompleted ? "#9CA3AF" : "#1A1A2E",
                textDecoration: isCompleted ? "line-through" : "none",
              }}
            >
              <span style={{ color: isCompleted ? "#C4BAB0" : "#E63946", fontWeight: 700, flexShrink: 0 }}>•</span>
              {line}
            </li>
          ))}
        </ul>

        {/* Toggle button */}
        <button
          type="button"
          onClick={() => void handleToggle()}
          disabled={toggling}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: isCompleted ? "rgba(78,205,196,0.10)" : "#4ECDC4",
            color: isCompleted ? "#178A83" : "#FFFFFF",
            border: isCompleted ? "1px solid rgba(78,205,196,0.30)" : "none",
            borderRadius: "8px",
            padding: "8px 14px",
            fontSize: "13px",
            fontWeight: 800,
            cursor: toggling ? "default" : "pointer",
            alignSelf: "flex-start",
            opacity: toggling ? 0.6 : 1,
            transition: "background 140ms ease, opacity 140ms ease",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {toggling ? "…" : isCompleted ? "Desmarcar" : "Marcar como completada"}
        </button>
      </div>
    </div>
  );
}

function ColeccionView({ coleccion }: { coleccion: Coleccion }) {
  if (coleccion.entradas.length === 0) {
    return (
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "16px",
          padding: "40px 24px",
          textAlign: "center",
          boxShadow: "0 2px 10px rgba(26,26,46,0.07)",
        }}
      >
        <p style={{ fontSize: "16px", fontWeight: 700, color: "#1A1A2E", margin: "0 0 6px" }}>
          Sin grabaciones aún
        </p>
        <p style={{ fontSize: "13px", color: "#9CA3AF", margin: 0 }}>
          Las clases aparecerán aquí cuando estén disponibles.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {coleccion.zoom_topic ? (
        <p
          style={{
            fontSize: "13px",
            color: "#7A7F8D",
            margin: "0 0 4px",
            fontWeight: 500,
          }}
        >
          {coleccion.zoom_topic}
        </p>
      ) : null}
      {coleccion.entradas.map((entrada, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <EntradaCard key={index} entrada={entrada} />
      ))}
    </div>
  );
}

function NoGroupCard({ message }: { message?: string }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: "16px",
        padding: "40px 24px",
        textAlign: "center",
        boxShadow: "0 2px 10px rgba(26,26,46,0.07)",
      }}
    >
      <div
        style={{
          width: "52px",
          height: "52px",
          borderRadius: "14px",
          background: "rgba(78,205,196,0.10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
        }}
      >
        <VideoIcon color="#4ECDC4" />
      </div>
      <p style={{ fontSize: "16px", fontWeight: 700, color: "#1A1A2E", margin: "0 0 6px" }}>
        {message ?? "Tu grupo aún no está configurado"}
      </p>
      <p style={{ fontSize: "13px", color: "#9CA3AF", margin: 0, lineHeight: 1.5 }}>
        {message ? "Contacta a tu profesor para más información." : "Cuando tu profesor te asigne un grupo, las grabaciones aparecerán aquí."}
      </p>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ClasesPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [groupName, setGroupName] = useState<string | null>(null);
  // Map group_name → coleccion_slug (from groups table)
  const [groupSlugMap, setGroupSlugMap] = useState<Map<string, string>>(new Map());
  const [colecciones, setColecciones] = useState<ColeccionesMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const { effectiveIsAdmin, studentViewActive, studentViewGroupName } = useStudentViewMode(isAdmin);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setFetchError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!alive) return;

      const [profileRes, groupsRes, colRes] = await Promise.all([
        session?.user
          ? supabase.from("profiles").select("is_admin, group_name").eq("id", session.user.id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("groups").select("name, coleccion_slug"),
        fetch(COLECCIONES_URL).then((r) => r.ok ? r.json() : null).catch(() => null),
      ]);

      if (!alive) return;

      if (profileRes.data) {
        setIsAdmin(Boolean(profileRes.data.is_admin));
        setGroupName((profileRes.data.group_name as string | null)?.trim() || null);
      }

      const map = new Map<string, string>();
      ((groupsRes.data ?? []) as { name: string; coleccion_slug: string | null }[]).forEach((g) => {
        if (g.coleccion_slug) map.set(g.name, g.coleccion_slug);
      });
      setGroupSlugMap(map);

      if (colRes) {
        setColecciones(colRes as ColeccionesMap);
      } else {
        setFetchError("No se pudieron cargar las grabaciones. Verifica tu conexión.");
      }

      if (alive) setLoading(false);
    }

    void load();
    return () => { alive = false; };
  }, []);

  // Pick first slug for admin on load
  const allSlugs = colecciones ? Object.keys(colecciones) : [];
  useEffect(() => {
    if (effectiveIsAdmin && allSlugs.length > 0 && selectedSlug === null) {
      setSelectedSlug(allSlugs[0]);
    }
  }, [effectiveIsAdmin, allSlugs, selectedSlug]);

  // Effective group name for non-admin
  const effectiveGroupName: string | null = studentViewActive
    ? (studentViewGroupName || groupName)
    : groupName;

  // Resolve coleccion via groups table slug mapping, with substring fallback.
  // Returns both the coleccion and its slug (needed for the tarea PATCH proxy).
  function findColeccion(name: string | null): { coleccion: Coleccion; slug: string } | null {
    if (!name || !colecciones) return null;
    // 1. Explicit slug mapping (via groups.coleccion_slug)
    const slug = groupSlugMap.get(name);
    if (slug && colecciones[slug]) return { coleccion: colecciones[slug], slug };
    // 2. Fallback: find coleccion whose nombre contains the group name (e.g. "日本語 しばいぬ" ⊃ "しばいぬ")
    const nameLower = name.toLowerCase();
    const fallbackSlug = Object.keys(colecciones).find((s) =>
      colecciones![s].nombre.toLowerCase().includes(nameLower)
    );
    if (fallbackSlug) return { coleccion: colecciones[fallbackSlug], slug: fallbackSlug };
    return null;
  }

  /** Optimistically update tarea_completada in local state after a successful PATCH. */
  function handleTareaToggle(colSlug: string, notaId: string, completed: boolean) {
    setColecciones((prev) => {
      if (!prev) return prev;
      const col = prev[colSlug];
      if (!col?.notas) return prev;
      return {
        ...prev,
        [colSlug]: {
          ...col,
          notas: col.notas.map((n) =>
            n.id === notaId ? { ...n, tarea_completada: completed } : n,
          ),
        },
      };
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  let content: React.ReactNode;

  if (loading) {
    content = (
      <div style={{ textAlign: "center", color: "#9CA3AF", padding: "48px 0", fontSize: "14px" }}>
        Cargando…
      </div>
    );
  } else if (fetchError) {
    content = (
      <div
        style={{
          borderRadius: "16px",
          background: "rgba(230,57,70,0.08)",
          color: "#C53340",
          padding: "14px 16px",
          fontSize: "14px",
          fontWeight: 700,
        }}
      >
        {fetchError}
      </div>
    );
  } else if (effectiveIsAdmin) {
    // Admin: group pill selector + entries
    const currentColeccion = selectedSlug && colecciones ? colecciones[selectedSlug] : null;

    content = (
      <>
        {/* Group selector */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "20px",
          }}
        >
          {allSlugs.map((slug) => {
            const active = slug === selectedSlug;
            return (
              <button
                key={slug}
                type="button"
                onClick={() => setSelectedSlug(slug)}
                style={{
                  border: "none",
                  borderRadius: "999px",
                  background: active ? "#1A1A2E" : "#FFFFFF",
                  color: active ? "#FFFFFF" : "#53596B",
                  padding: "9px 16px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: active ? "none" : "0 2px 8px rgba(26,26,46,0.08)",
                  transition: "background 140ms ease, color 140ms ease",
                }}
              >
                {colecciones![slug].nombre}
              </button>
            );
          })}
        </div>

        {currentColeccion && selectedSlug ? (
          <>
            <ColeccionView coleccion={currentColeccion} />
            <TareaSection
              coleccion={currentColeccion}
              slug={selectedSlug}
              onToggle={(notaId, completed) => handleTareaToggle(selectedSlug, notaId, completed)}
            />
          </>
        ) : (
          <NoGroupCard message="Selecciona un grupo para ver sus grabaciones." />
        )}
      </>
    );
  } else {
    // Student
    if (!effectiveGroupName) {
      content = <NoGroupCard />;
    } else {
      const found = findColeccion(effectiveGroupName);
      if (!found) {
        content = (
          <NoGroupCard
            message={`No se encontraron grabaciones para el grupo "${effectiveGroupName}".`}
          />
        );
      } else {
        const { coleccion, slug } = found;
        content = (
          <>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#FFFFFF",
                borderRadius: "999px",
                padding: "5px 12px 5px 8px",
                boxShadow: "0 1px 6px rgba(26,26,46,0.07)",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#4ECDC4",
                }}
              />
              <span style={{ fontSize: "12px", fontWeight: 800, color: "#1A1A2E" }}>
                {coleccion.nombre}
              </span>
            </div>
            <ColeccionView coleccion={coleccion} />
            <TareaSection
              coleccion={coleccion}
              slug={slug}
              onToggle={(notaId, completed) => handleTareaToggle(slug, notaId, completed)}
            />
          </>
        );
      }
    }
  }

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "12px",
          padding: "20px 20px 16px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "42px",
              fontWeight: 800,
              color: "#1A1A2E",
              margin: 0,
              lineHeight: 1,
            }}
          >
            Clases
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#7A7F8D", lineHeight: 1.35 }}>
            Grabaciones de sesiones
          </p>
        </div>
      </div>

      <div style={{ padding: "0 20px", flex: 1 }}>
        {content}
      </div>

      <BottomNav />
    </div>
  );
}
