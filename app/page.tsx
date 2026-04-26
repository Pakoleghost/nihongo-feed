"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { markActiveToday, getStreak } from "@/lib/streak";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import { getDailyPhrase } from "@/lib/daily-phrases";
import { useStudentViewMode } from "@/lib/use-student-view-mode";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "おはようございます";
  if (h >= 12 && h < 18) return "こんにちは";
  return "こんばんは";
}

type MiniProfile = { username: string | null; avatar_url: string | null; is_admin: boolean | null };

function AvatarCircle({ url, name }: { url: string | null; name: string | null }) {
  const size = 40;
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name ?? "perfil"}
        width={size}
        height={size}
        style={{ borderRadius: "50%", objectFit: "cover", display: "block", flexShrink: 0 }}
      />
    );
  }
  const initial = (name ?? "?").charAt(0).toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#E5E7EB",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        fontWeight: 700,
        color: "#53596B",
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}

function HomeSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: "13px",
        fontWeight: 800,
        letterSpacing: "0.08em",
        color: "#9CA3AF",
        textTransform: "uppercase",
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

export default function InicioPage() {
  const [streak, setStreak] = useState(0);
  const [profile, setProfile] = useState<MiniProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { studentViewActive, effectiveIsAdmin, setStudentViewActive } = useStudentViewMode(isAdmin);
  const phrase = getDailyPhrase();

  useEffect(() => {
    markActiveToday();
    setStreak(getStreak());

    async function init() {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;

      if (uid) {
        const { data: p } = await supabase
          .from("profiles")
          .select("username, avatar_url, is_admin")
          .eq("id", uid)
          .single();
        if (p) {
          setProfile(p as MiniProfile);
          setIsAdmin((p as MiniProfile).is_admin === true);
        }
      }
    }
    init();
  }, []);

  const destinations = [
    {
      href: "/kana",
      title: "Aprender",
      body: "Kana y lectura",
      bg: "#FFFFFF",
      titleColor: "#1A1A2E",
      bodyColor: "#9CA3AF",
    },
    {
      href: "/practicar",
      title: "Practicar",
      body: "Sprint, vocabulario y kanji",
      bg: "#1A1A2E",
      titleColor: "#FFFFFF",
      bodyColor: "rgba(255,255,255,0.72)",
    },
  ] as const;

  return (
    <div
      style={{
        background: "#FFF8E7",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "24px 20px 104px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px",
        }}
      >
        <div>
          <p style={{ fontSize: "14px", color: "#9CA3AF", margin: 0, lineHeight: 1.3 }}>{getGreeting()}</p>
          <h1
            style={{
              fontSize: "34px",
              fontWeight: 800,
              color: "#1A1A2E",
              margin: "6px 0 0",
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
            }}
          >
            ¿Qué sigue?
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <Link href="/perfil" style={{ display: "block", flexShrink: 0 }}>
            <AvatarCircle url={profile?.avatar_url ?? null} name={profile?.username ?? null} />
          </Link>
          <div
            style={{
              background: "rgba(230,57,70,0.12)",
              borderRadius: "999px",
              padding: "8px 14px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span style={{ fontSize: "16px" }}>🔥</span>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "#E63946" }}>{streak}</span>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "22px",
          background: "#1A1A2E",
          borderRadius: "28px",
          padding: "22px",
          boxShadow: "0 18px 44px rgba(26,26,46,0.14)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "14px" }}>
          <div style={{ minWidth: 0 }}>
            <HomeSectionTitle>Frase del día</HomeSectionTitle>
            <p
              style={{
                fontSize: "30px",
                fontWeight: 800,
                color: "#FFFFFF",
                margin: "10px 0 0",
                lineHeight: 1.05,
                letterSpacing: "-0.04em",
              }}
            >
              {phrase.japanese}
            </p>
            <p
              style={{
                fontSize: "15px",
                color: "rgba(78,205,196,0.92)",
                margin: "10px 0 0",
                fontWeight: 700,
                letterSpacing: "0.01em",
              }}
            >
              {phrase.reading}
            </p>
            <p
              style={{
                fontSize: "14px",
                color: "rgba(255,255,255,0.78)",
                margin: "12px 0 0",
                lineHeight: 1.45,
                maxWidth: 320,
              }}
            >
              {phrase.meaning_es}
            </p>
            {phrase.note ? (
              <p
                style={{
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.56)",
                  margin: "8px 0 0",
                  lineHeight: 1.4,
                }}
              >
                {phrase.note}
              </p>
            ) : null}
          </div>

          <div
            style={{
              background: "rgba(78,205,196,0.14)",
              color: "#4ECDC4",
              borderRadius: "999px",
              padding: "8px 12px",
              fontSize: "12px",
              fontWeight: 700,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Hoy
          </div>
        </div>
      </div>

      <div style={{ marginTop: "24px" }}>
        <HomeSectionTitle>Ir a</HomeSectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            marginTop: "12px",
          }}
        >
          {destinations.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                background: item.bg,
                borderRadius: "24px",
                padding: "18px",
                textDecoration: "none",
                boxShadow: "0 10px 26px rgba(26,26,46,0.08)",
                minHeight: "122px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: "22px",
                    fontWeight: 800,
                    color: item.titleColor,
                    margin: 0,
                    lineHeight: 1.05,
                    letterSpacing: "-0.03em",
                  }}
                >
                  {item.title}
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    color: item.bodyColor,
                    margin: "8px 0 0",
                    lineHeight: 1.35,
                  }}
                >
                  {item.body}
                </p>
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: item.titleColor,
                  opacity: 0.9,
                }}
              >
                Abrir →
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "24px", display: "grid", gap: "12px" }}>
        <Link
          href="/comunidad"
          style={{
            background: "#FFFFFF",
            borderRadius: "24px",
            padding: "18px 18px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            textDecoration: "none",
            boxShadow: "0 10px 26px rgba(26,26,46,0.08)",
          }}
        >
          <div>
            <HomeSectionTitle>Comunidad</HomeSectionTitle>
            <p style={{ fontSize: "20px", fontWeight: 800, color: "#1A1A2E", margin: "8px 0 0", lineHeight: 1.1 }}>
              Habla con otros estudiantes
            </p>
          </div>
          <span style={{ fontSize: "18px", color: "#C4BAB0", flexShrink: 0 }}>→</span>
        </Link>

        <Link
          href="/recursos"
          style={{
            background: "#FFFFFF",
            borderRadius: "24px",
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            textDecoration: "none",
            boxShadow: "0 10px 26px rgba(26,26,46,0.08)",
          }}
        >
          <div>
            <HomeSectionTitle>Recursos</HomeSectionTitle>
            <p style={{ fontSize: "16px", fontWeight: 700, color: "#1A1A2E", margin: "8px 0 0", lineHeight: 1.2 }}>
              Ver material del curso
            </p>
          </div>
          <span style={{ fontSize: "18px", color: "#C4BAB0", flexShrink: 0 }}>→</span>
        </Link>
      </div>

      {isAdmin && !studentViewActive && (
        <div style={{ marginTop: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link
            href="/admin/groups"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "#1A1A2E",
              color: "#FFFFFF",
              borderRadius: "3rem",
              padding: "12px 18px",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            <span>⚙️</span>
            <span>Panel de administrador</span>
          </Link>
          {effectiveIsAdmin ? (
            <button
              type="button"
              onClick={() => setStudentViewActive(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                border: "none",
                background: "#FFFFFF",
                color: "#1A1A2E",
                borderRadius: "3rem",
                padding: "12px 18px",
                fontSize: "14px",
                fontWeight: 800,
                boxShadow: "0 8px 22px rgba(26,26,46,0.08)",
                cursor: "pointer",
              }}
            >
              Vista de estudiante
            </button>
          ) : null}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
