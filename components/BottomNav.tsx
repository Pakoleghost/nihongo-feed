"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  viewerId,
}: {
  profileHref: string;
  profileAvatarUrl?: string | null;
  profileInitial?: string;
  viewerId?: string;
}) {
  const pathname = usePathname();

  const [hasUnseen, setHasUnseen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        // Do not show badge while on the notifications page.
        if (pathname === "/notifications" || pathname.startsWith("/notifications/")) {
          if (!cancelled) setHasUnseen(false);
          return;
        }

        const uid = viewerId || (await supabase.auth.getUser()).data?.user?.id;
        if (!uid) {
          if (!cancelled) setHasUnseen(false);
          return;
        }

        const [{ data: prof }, { data: latestNoti }] = await Promise.all([
          supabase
            .from("profiles")
            .select("notifications_last_seen_at")
            .eq("id", uid)
            .maybeSingle(),
          supabase
            .from("notifications")
            .select("created_at")
            .eq("user_id", uid)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        const lastSeenMs = prof?.notifications_last_seen_at
          ? new Date(prof.notifications_last_seen_at).getTime()
          : 0;
        const newestMs = latestNoti?.created_at ? new Date(latestNoti.created_at).getTime() : 0;

        if (!cancelled) setHasUnseen(newestMs > lastSeenMs);
      } catch (e) {
        // If anything fails (RLS, missing columns, etc.), fail closed.
        if (!cancelled) setHasUnseen(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [pathname, viewerId]);

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

                  const y =
                    (typeof window !== "undefined" ? window.scrollY : 0) ||
                    (typeof document !== "undefined" ? document.documentElement.scrollTop : 0) ||
                    (typeof document !== "undefined" ? document.body.scrollTop : 0) ||
                    0;

                  // If already basically at the top, trigger the same "tap フィード" behavior (soft refresh).
                  if (y < 8) {
                    (window as any).__homeTap?.();
                    return;
                  }

                  // If near the top, scroll up with movement, then trigger soft refresh once we're at the top.
                  if (y < 120) {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    window.setTimeout(() => {
                      (window as any).__homeTap?.();
                    }, 180);
                    return;
                  }

                  // Otherwise just scroll to top with movement.
                  window.scrollTo({ top: 0, behavior: "smooth" });
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
                  <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
                    <span style={{ fontSize: it.icon === "＋" ? 20 : 18 }}>{it.icon}</span>

                    {it.key === "noti" && hasUnseen && (
                      <span
                        aria-label="New notifications"
                        style={{
                          position: "absolute",
                          top: -2,
                          right: -2,
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          background: "#ff3b30",
                          boxShadow: "0 0 0 2px rgba(255,255,255,.92)",
                          animation: "nhfPulse 1.35s ease-in-out infinite",
                        }}
                      />
                    )}

                    <style jsx>{`
                      @keyframes nhfPulse {
                        0% {
                          transform: scale(1);
                          opacity: 0.95;
                        }
                        50% {
                          transform: scale(1.45);
                          opacity: 0.55;
                        }
                        100% {
                          transform: scale(1);
                          opacity: 0.95;
                        }
                      }
                    `}</style>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}