"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { markActiveToday, getStreak, getLastActivity } from "@/lib/streak";
import { getDueKanaCount } from "@/lib/kana-due";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

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
  const [dueCount, setDueCount] = useState(0);
  const [lastActivity, setLastActivityState] = useState<{ label: string; path: string } | null>(null);
  const [profile, setProfile] = useState<MiniProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    markActiveToday();
    setStreak(getStreak());
    setLastActivityState(getLastActivity());

    async function init() {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      const userKey = uid ?? "anon";
      setDueCount(getDueKanaCount(userKey));

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

  const primaryAction = useMemo(() => {
    if (dueCount > 0) {
      return {
        eyebrow: "Ahora mismo",
        title: `${dueCount} kana pendientes`,
        body: "Haz tu repaso de hoy antes de seguir con otra cosa.",
        href: "/kana/quiz?mode=smart&difficulty=automatico&count=20",
        buttonLabel: "Repasar kana",
        accent: "#E63946",
        surface: "#1A1A2E",
        bodyColor: "rgba(255,255,255,0.78)",
        pill: `${dueCount} pendientes`,
      };
    }

    return {
      eyebrow: "Sigue desde aquí",
      title: lastActivity?.label ?? "Empieza a practicar",
      body: lastActivity ? "Retoma tu última actividad sin perder el hilo." : "Kana, vocabulario y kanji en un solo lugar.",
      href: lastActivity?.path ?? "/kana",
      buttonLabel: lastActivity ? "Continuar" : "Empezar",
      accent: "#4ECDC4",
      surface: "#1A1A2E",
      bodyColor: "rgba(255,255,255,0.78)",
      pill: lastActivity ? "Última actividad" : "Listo para empezar",
    };
  }, [dueCount, lastActivity]);

  const destinations = [
    {
      href: "/kana",
      title: "Kana",
      body: "Hiragana y katakana",
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
    {
      href: "/practicar/vocabulario",
      title: "Vocabulario",
      body: "Por lección",
      bg: "#E63946",
      titleColor: "#FFFFFF",
      bodyColor: "rgba(255,255,255,0.78)",
    },
    {
      href: "/practicar/kanji",
      title: "Kanji",
      body: "Lectura por lección",
      bg: "#4ECDC4",
      titleColor: "#1A1A2E",
      bodyColor: "rgba(26,26,46,0.68)",
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
          background: primaryAction.surface,
          borderRadius: "28px",
          padding: "22px",
          boxShadow: "0 18px 44px rgba(26,26,46,0.14)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "14px" }}>
          <div style={{ minWidth: 0 }}>
            <HomeSectionTitle>{primaryAction.eyebrow}</HomeSectionTitle>
            <p
              style={{
                fontSize: "28px",
                fontWeight: 800,
                color: "#FFFFFF",
                margin: "10px 0 0",
                lineHeight: 1.05,
                letterSpacing: "-0.04em",
              }}
            >
              {primaryAction.title}
            </p>
            <p
              style={{
                fontSize: "14px",
                color: primaryAction.bodyColor,
                margin: "10px 0 0",
                lineHeight: 1.45,
                maxWidth: 320,
              }}
            >
              {primaryAction.body}
            </p>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.10)",
              color: "#FFFFFF",
              borderRadius: "999px",
              padding: "8px 12px",
              fontSize: "12px",
              fontWeight: 700,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {primaryAction.pill}
          </div>
        </div>

        <Link
          href={primaryAction.href}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            background: primaryAction.accent,
            color: primaryAction.accent === "#E63946" ? "#FFFFFF" : "#1A1A2E",
            borderRadius: "999px",
            padding: "14px 18px",
            fontWeight: 700,
            fontSize: "15px",
            textDecoration: "none",
            marginTop: "18px",
          }}
        >
          <span>{primaryAction.buttonLabel}</span>
          <span>→</span>
        </Link>
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

      {isAdmin && (
        <div style={{ marginTop: "20px" }}>
          <Link
            href="/admin/usuarios"
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
        </div>
      )}

      <BottomNav />
    </div>
  );
}
