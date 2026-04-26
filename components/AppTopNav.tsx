"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useStudentViewMode } from "@/lib/use-student-view-mode";

type AppTopNavProps = {
  primary?: "study" | "resources" | null;
  secondary?: "profile" | "write" | "admin" | null;
  tone?: "default" | "study";
};

export default function AppTopNav({ primary = null, secondary = null, tone = "default" }: AppTopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { studentViewActive, effectiveIsAdmin, setStudentViewActive } = useStudentViewMode(isAdmin);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    let alive = true;

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!alive) return;
      setUserId(user?.id || null);

      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      if (!alive) return;
      setIsAdmin(Boolean(profile?.is_admin));
    };

    void loadUser();

    return () => {
      alive = false;
    };
  }, []);

  const menuItems = useMemo(() => {
    const items: Array<{ key: string; label: string; href?: string; action?: () => void }> = [];
    if (userId) {
      items.push({ key: "profile", label: "Perfil", href: `/profile/${userId}` });
    }
    if (isAdmin) {
      items.push({
        key: "student-view",
        label: studentViewActive ? "Salir de vista de estudiante" : "Vista de estudiante",
        action: () => setStudentViewActive(!studentViewActive),
      });
    }
    if (effectiveIsAdmin) {
      items.push({ key: "admin", label: "Administración", href: "/admin/groups" });
    }
    items.push({
      key: "logout",
      label: userId ? "Cerrar sesión" : "Iniciar sesión",
      action: async () => {
        if (userId) {
          await supabase.auth.signOut();
        }
        router.push("/login");
        router.refresh();
      },
    });
    return items;
  }, [effectiveIsAdmin, isAdmin, router, setStudentViewActive, studentViewActive, userId]);

  const navLinkClass = (key: "study" | "resources") =>
    `appNavLink${primary === key ? " active" : ""}`;

  return (
    <div className={`appTopNav${tone === "study" ? " studyTone" : ""}`}>
      <div className="ds-container appTopNavInner">
        <div className={`appTopNavBar${tone === "study" ? " studyTone" : " ds-card"}`}>
          <Link href="/study" className="appNavBrand" aria-label="Ir a estudiar">
            <span className="appNavMark" aria-hidden="true" />
            Nihongo
          </Link>

          <div className="appPrimaryNav" aria-label="Navegación principal">
            <Link href="/study" className={navLinkClass("study")}>
              Inicio
            </Link>
            <Link href="/resources" className={navLinkClass("resources")}>
              Recursos
            </Link>
            <button
              type="button"
              className={`appNavLink appMenuButton${menuOpen ? " active" : ""}`}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((value) => !value)}
            >
              Menú
            </button>
          </div>
        </div>

        {menuOpen && <button type="button" className="appMenuBackdrop" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}

        {menuOpen && (
          <div className="appMenuPanel ds-card" role="menu" aria-label="Navegación secundaria">
            {menuItems.map((item) => {
              const active = item.key === secondary;
              if (item.href) {
                return (
                  <Link key={item.key} href={item.href} className={`appMenuItem${active ? " active" : ""}`} role="menuitem">
                    {item.label}
                  </Link>
                );
              }
              return (
                <button
                  key={item.key}
                  type="button"
                  className="appMenuItem"
                  role="menuitem"
                  onClick={item.action}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
