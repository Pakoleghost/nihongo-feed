"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function HomeIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9 21V13h6v8" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function KanaIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <text x="1" y="16" fontSize="13" fontWeight="700" fill={color} fontFamily="system-ui, sans-serif">
        文
      </text>
      <text x="13" y="20" fontSize="9" fontWeight="700" fill={color} fontFamily="system-ui, sans-serif">
        A
      </text>
    </svg>
  );
}

function PracticarIcon({ color }: { color: string }) {
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

function ComunidadIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const tabs = [
  { href: "/", label: "Inicio", Icon: HomeIcon },
  { href: "/kana", label: "Kana", Icon: KanaIcon },
  { href: "/practicar", label: "Practicar", Icon: PracticarIcon },
  { href: "/comunidad", label: "Comunidad", Icon: ComunidadIcon },
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
        background: "#FFFFFF",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        padding: "8px 4px 20px",
        boxShadow: "0 -1px 0 rgba(26,26,46,0.07)",
        zIndex: 100,
      }}
    >
      {tabs.map(({ href, label, Icon }) => {
        const isActive = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
        const color = isActive ? "#FFFFFF" : "#9CA3AF";

        return (
          <Link
            key={href}
            href={href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "3px",
              textDecoration: "none",
              padding: "6px 18px",
              borderRadius: "999px",
              background: isActive ? "#E63946" : "transparent",
              minWidth: "64px",
              transition: "background 0.15s",
            }}
          >
            <Icon color={color} />
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color,
                lineHeight: 1,
              }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
