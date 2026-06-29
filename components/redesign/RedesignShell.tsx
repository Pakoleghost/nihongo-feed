"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import styles from "./RedesignApp.module.css";
import { StudentDashboardDataProvider, useStudentDashboardData } from "./student-dashboard-state";

type ShellProps = {
  children: ReactNode;
};

type NavItem = {
  href?: string;
  label: string;
  icon: string;
  box?: boolean;
  disabled?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "",
    items: [{ href: "/dashboard", label: "Inicio", icon: "家" }],
  },
  {
    label: "Aprender",
    items: [
      { href: "/dashboard/hiragana", label: "Hiragana", icon: "あ", box: true },
      { href: "/dashboard/katakana", label: "Katakana", icon: "ア", box: true },
      { href: "/dashboard/kanji", label: "Kanji", icon: "漢", box: true },
      { href: "/dashboard/gramatica", label: "Gramática", icon: "文", box: true },
      { href: "/dashboard/vocabulario", label: "Vocabulario", icon: "語", box: true },
    ],
  },
  {
    label: "Practicar",
    items: [
      { label: "Práctica", icon: "練", disabled: true },
      { label: "Lectura", icon: "読", disabled: true },
      { label: "Escucha", icon: "聴", disabled: true },
      { label: "Repaso inteligente", icon: "復", disabled: true },
    ],
  },
  {
    label: "Actividad",
    items: [
      { label: "Mi Plan", icon: "予", disabled: true },
      { label: "Tareas", icon: "課", disabled: true },
      { label: "Mi Progreso", icon: "進", disabled: true },
    ],
  },
];

const bottomItems = [
  { href: "/dashboard", label: "Inicio", icon: "家" },
  { href: "/dashboard/hiragana", label: "Hiragana", icon: "あ" },
  { href: "/dashboard/katakana", label: "Katakana", icon: "ア" },
  { href: "/dashboard/kanji", label: "Kanji", icon: "漢" },
  { href: "/dashboard/gramatica", label: "Gramática", icon: "文" },
  { href: "/dashboard/vocabulario", label: "Vocab", icon: "語" },
  { href: "/dashboard/perfil", label: "Perfil", icon: "人" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavIcon({ icon, boxed }: { icon: string; boxed?: boolean }) {
  return (
    <span className={`${styles.navIcon} ${boxed ? styles.navIconBox : ""}`} aria-hidden="true">
      {icon}
    </span>
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  const { profile } = useStudentDashboardData();
  const [optimisticNav, setOptimisticNav] = useState<{
    href: string;
    pathAtClick: string;
  } | null>(null);
  const initial = profile.displayName.trim()[0]?.toUpperCase() || "A";
  const roleLabel = profile.roleLabel || "Alumno";
  const activePath =
    optimisticNav?.pathAtClick === pathname ? optimisticNav.href : pathname;

  return (
    <aside className={styles.sidebar} aria-label="Navegación principal del alumno">
      <Link href="/dashboard/perfil" className={styles.brand} aria-label="Abrir tu perfil">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.brandAvatarImage} src={profile.avatarUrl} alt="" />
        ) : (
          <span className={styles.brandMark}>{initial}</span>
        )}
        <span className={styles.brandText}>
          <strong>Pako Nihongo</strong>
          <span>{roleLabel}</span>
        </span>
        <span className={styles.brandChevron} aria-hidden="true">›</span>
      </Link>

      <nav className={styles.nav}>
        {navGroups.map((group) => (
          <section key={group.label || "inicio"} className={styles.navGroup}>
            {group.label && <div className={styles.navLabel}>{group.label}</div>}
            {group.items.map((item) => {
              const href = item.href;
              const active = href ? isActivePath(activePath, href) : false;
              if (!href || item.disabled) {
                return (
                  <div
                    key={`${group.label}-${item.label}`}
                    className={`${styles.navItem} ${styles.navItemDisabled}`}
                    aria-disabled="true"
                  >
                    <NavIcon icon={item.icon} boxed={item.box} />
                    <span>{item.label}</span>
                    <em>Próx.</em>
                  </div>
                );
              }

              return (
                <Link
                  key={href}
                  href={href}
                  prefetch
                  onPointerDown={() =>
                    setOptimisticNav({ href, pathAtClick: pathname })
                  }
                  className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                >
                  <NavIcon icon={item.icon} boxed={item.box} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </section>
        ))}
      </nav>
    </aside>
  );
}

function MobileTopbar() {
  const { profile } = useStudentDashboardData();
  const initial = profile.displayName.trim()[0]?.toUpperCase() || "A";
  const roleLabel = profile.roleLabel || "Alumno";

  return (
    <header className={styles.mobileTopbar}>
      <Link href="/dashboard/perfil" className={styles.mobileProfileBrand} aria-label="Abrir tu perfil">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.avatarImage} src={profile.avatarUrl} alt="" />
        ) : (
          <span className={styles.avatar}>{initial}</span>
        )}
        <span className={styles.brandText}>
          <strong>Pako Nihongo</strong>
          <span>{roleLabel}</span>
        </span>
      </Link>
      <Link href="/dashboard" className={styles.mobileHomeLink} aria-label="Ir al inicio">家</Link>
    </header>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  const [optimisticNav, setOptimisticNav] = useState<{
    href: string;
    pathAtClick: string;
  } | null>(null);
  const activePath =
    optimisticNav?.pathAtClick === pathname ? optimisticNav.href : pathname;

  return (
    <nav className={styles.bottomNav} aria-label="Navegación móvil del rediseño">
      <div className={styles.bottomNavInner}>
        {bottomItems.map((item) => {
          const active = isActivePath(activePath, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onPointerDown={() =>
                setOptimisticNav({ href: item.href, pathAtClick: pathname })
              }
              className={`${styles.bottomNavItem} ${active ? styles.bottomNavActive : ""}`}
            >
              <span className={styles.bottomNavIcon} aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function RedesignShellFrame({ children }: ShellProps) {
  const pathname = usePathname();

  return (
    <div className={styles.app} data-pako-redesign="true">
      <Sidebar pathname={pathname} />
      <main className={styles.main}>
        <MobileTopbar />
        <div className={styles.page}>
          <div className={styles.pageInner}>{children}</div>
        </div>
      </main>
      <BottomNav pathname={pathname} />
    </div>
  );
}

export function RedesignShell({ children }: ShellProps) {
  return (
    <StudentDashboardDataProvider>
      <RedesignShellFrame>{children}</RedesignShellFrame>
    </StudentDashboardDataProvider>
  );
}
