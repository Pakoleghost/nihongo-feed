"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function HomeIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EstudiarIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M22 10v6M2 10l10-5 10 5-10 5z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 12v5c3.33 3 8.67 3 12 0v-5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RecursosIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 4h6a2 2 0 012 2v14H7a2 2 0 01-2-2V4zM13 6a2 2 0 012-2h4v14a2 2 0 01-2 2h-4V6z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClasesIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="6" width="14" height="12" rx="2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 10l5-3v10l-5-3V10z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const tabs = [
  { href: "/",          label: "Comunidad", Icon: HomeIcon,     prefetch: true  },
  { href: "/practicar", label: "Estudiar",  Icon: EstudiarIcon, prefetch: true  },
  { href: "/recursos",  label: "Recursos",  Icon: RecursosIcon, prefetch: false },
  { href: "/clases",    label: "Clases",    Icon: ClasesIcon,   prefetch: false },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        paddingBottom: "calc(22px + env(safe-area-inset-bottom, 0px))",
        background: "linear-gradient(180deg, rgba(13,13,26,0) 0%, rgba(13,13,26,0.85) 35%, #0D0D1A 70%)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          margin: "0 16px",
          padding: "10px 8px",
          background: "rgba(26,26,46,0.70)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: "22px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
          pointerEvents: "all",
        }}
      >
        {tabs.map(({ href, label, Icon, prefetch }) => {
          const isActive =
            href === "/" ? pathname === "/" :
            href === "/practicar" ? (pathname === "/practicar" || pathname.startsWith("/practicar/") || pathname === "/kana" || pathname.startsWith("/kana/")) :
            href === "/clases" ? (pathname === "/clases" || pathname.startsWith("/clases/")) :
            pathname === href || pathname.startsWith(href + "/");
          const color = isActive ? "#FFFFFF" : "rgba(255,255,255,0.38)";

          return (
            <Link
              key={href}
              href={href}
              prefetch={prefetch}
              style={{
                display: "flex",
                flexDirection: isActive ? "row" : "column",
                alignItems: "center",
                justifyContent: "center",
                gap: isActive ? "8px" : "0",
                textDecoration: "none",
                padding: isActive ? "10px 18px" : "10px 14px",
                borderRadius: "14px",
                background: isActive ? "#E63946" : "transparent",
                boxShadow: isActive ? "0 8px 20px rgba(230,57,70,0.28)" : "none",
                minWidth: isActive ? "auto" : "50px",
                transition: "background 0.15s, box-shadow 0.15s",
              }}
            >
              <Icon color={color} />
              {isActive && (
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color,
                    lineHeight: 1,
                  }}
                >
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
