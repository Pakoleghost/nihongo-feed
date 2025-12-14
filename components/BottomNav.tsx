"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = {
  key: string;
  href: string;
  label: string;
  icon: string;
};

export default function BottomNav({
  profileHref,
  profileAvatarUrl,
  profileInitial,
}: {
  profileHref: string;
  profileAvatarUrl?: string | null;
  profileInitial?: string;
}) {
  const pathname = usePathname();

  const items: Item[] = [
    { key: "home", href: "/", label: "Home", icon: "🏠" },
    { key: "new", href: "/new", label: "New", icon: "＋" },
    { key: "noti", href: "/notifications", label: "Notifs", icon: "🔔" },
    { key: "rank", href: "/leaderboard", label: "Rank", icon: "🏆" },
    { key: "me", href: profileHref, label: "Me", icon: "" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav
      aria-label="Bottom Navigation"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        borderTop: "1px solid rgba(255,255,255,.08)",
        background: "rgba(12,12,12,.92)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "10px 12px",
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 6,
        }}
      >
        {items.map((it) => {
          const active = isActive(it.href);
          return (
            <Link
              key={it.key}
              href={it.href}
              style={{
                textDecoration: "none",
                color: active ? "#fff" : "rgba(255,255,255,.6)",
              }}
              title={it.label}
            >
              <div
                style={{
                  height: 44,
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  border: active
                    ? "1px solid rgba(255,255,255,.18)"
                    : "1px solid rgba(255,255,255,.06)",
                  background: active ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.03)",
                  fontWeight: 800,
                  letterSpacing: 0.5,
                }}
              >
                {it.key === "me" ? (
                  profileAvatarUrl ? (
                    <img
                      src={profileAvatarUrl}
                      alt="Profile"
                      style={{ width: 22, height: 22, borderRadius: 999, objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      aria-label="Profile"
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        display: "grid",
                        placeItems: "center",
                        border: active
                          ? "1px solid rgba(255,255,255,.22)"
                          : "1px solid rgba(255,255,255,.14)",
                        color: active ? "#fff" : "rgba(255,255,255,.85)",
                        fontSize: 12,
                        fontWeight: 900,
                      }}
                    >
                      {(profileInitial || "?").toUpperCase()}
                    </div>
                  )
                ) : (
                  <span style={{ fontSize: it.icon === "＋" ? 20 : 18 }}>{it.icon}</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}