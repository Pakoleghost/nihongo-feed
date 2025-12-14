"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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
  const router = useRouter();

  const items: Item[] = [
    { key: "home", href: "/", label: "Home", icon: "🏠" },
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
        borderTop: "1px solid rgba(17,17,20,.10)",
        background: "rgba(255,255,255,.92)",
        backdropFilter: "blur(12px)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "10px 12px",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 6,
        }}
      >
        {items.map((it) => {
          const active = isActive(it.href);
          const isHome = it.key === "home";

          return (
            <Link
              key={it.key}
              href={it.href}
              onClick={(e) => {
                // If already on home, do a smooth scroll to top (with movement)
                // and soft-refresh only when already near the top.
                if (isHome && pathname === "/") {
                  e.preventDefault();

                  // iOS/Safari can report scrollY inconsistently; fall back to document scrollTop.
                  const y =
                    (typeof window !== "undefined" ? window.scrollY : 0) ||
                    (typeof document !== "undefined" ? document.documentElement.scrollTop : 0) ||
                    (typeof document !== "undefined" ? document.body.scrollTop : 0) ||
                    0;

                  // If already near the top, do a soft refresh.
                  if (y < 60) {
                    (window as any).__homeTap?.();
                    router.refresh();
                    return;
                  }

                  // Otherwise scroll up with movement.
                  window.scrollTo({ top: 0, behavior: "smooth" });

                  // Keep any existing home-tap hook
                  (window as any).__homeTap?.();
                }
              }}
              style={{
                textDecoration: "none",
                color: active ? "#111114" : "rgba(17,17,20,.55)",
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
                    ? "1px solid rgba(17,17,20,.14)"
                    : "1px solid rgba(17,17,20,.08)",
                  background: active ? "rgba(17,17,20,.04)" : "rgba(17,17,20,.02)",
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
                          ? "1px solid rgba(17,17,20,.16)"
                          : "1px solid rgba(17,17,20,.10)",
                        color: active ? "#111114" : "rgba(17,17,20,.70)",
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