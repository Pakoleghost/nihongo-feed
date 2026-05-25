"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import { useStudentViewMode } from "@/lib/use-student-view-mode";

const COLECCIONES_URL = "https://pako-nihongo.tailcd0aee.ts.net/api/colecciones";

type Entrada = {
  label: string;
  url: string;
  password?: string;
  notas?: string;
};

type Coleccion = {
  nombre: string;
  zoom_topic?: string;
  entradas: Entrada[];
};

type ColeccionesMap = Record<string, Coleccion>;

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

      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin, group_name")
          .eq("id", session.user.id)
          .maybeSingle();
        if (!alive) return;
        setIsAdmin(Boolean(profile?.is_admin));
        setGroupName((profile?.group_name as string | null)?.trim() || null);
      }

      try {
        const res = await fetch(COLECCIONES_URL);
        if (!res.ok) throw new Error("fetch");
        const data: ColeccionesMap = await res.json();
        if (!alive) return;
        setColecciones(data);
      } catch {
        if (!alive) return;
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

  function findColeccion(name: string | null): Coleccion | null {
    if (!name || !colecciones) return null;
    const normalized = name.toLowerCase().trim();
    const entry = Object.values(colecciones).find(
      (col) => col.nombre.toLowerCase().trim() === normalized
    );
    return entry ?? null;
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

        {currentColeccion ? (
          <ColeccionView coleccion={currentColeccion} />
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
      const coleccion = findColeccion(effectiveGroupName);
      if (!coleccion) {
        content = (
          <NoGroupCard
            message={`No se encontraron grabaciones para el grupo "${effectiveGroupName}".`}
          />
        );
      } else {
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
