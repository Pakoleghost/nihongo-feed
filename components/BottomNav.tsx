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
  { href: "/practicar", label: "Practicar",  Icon: EstudiarIcon, prefetch: true  },
  { href: "/recursos",  label: "Recursos",  Icon: RecursosIcon, prefetch: false },
  { href: "/clases",    label: "Clases",    Icon: ClasesIcon,   prefetch: false },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav-wrap">
      <div className="bottom-nav-pill">
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
              className={`nav-tab${isActive ? " active" : ""}`}
            >
              <Icon color={isActive ? "#FFFFFF" : "rgba(255,255,255,0.38)"} />
              <span className="nav-tab-label">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
