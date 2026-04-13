"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type AppTopNavProps = {
  primary?: "study" | "resources" | null;
  secondary?: "profile" | "write" | "admin" | null;
};

export default function AppTopNav({ primary = null, secondary = null }: AppTopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

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
      items.push({ key: "profile", label: "Profile", href: `/profile/${userId}` });
    }
    if (isAdmin) {
      items.push({ key: "write", label: "Write", href: "/write" });
      items.push({ key: "admin", label: "Admin", href: "/admin/groups" });
    }
    items.push({
      key: "logout",
      label: userId ? "Log out" : "Log in",
      action: async () => {
        if (userId) {
          await supabase.auth.signOut();
        }
        router.push("/login");
        router.refresh();
      },
    });
    return items;
  }, [isAdmin, router, userId]);

  const navLinkClass = (key: "study" | "resources") =>
    `appNavLink${primary === key ? " active" : ""}`;

  return (
    <div className="appTopNav">
      <div className="ds-container appTopNavInner">
        <div className="appTopNavBar ds-card">
          <Link href="/study" className="appNavBrand" aria-label="Ir a Study">
            <span className="appNavMark" aria-hidden="true" />
            Nihongo
          </Link>

          <div className="appPrimaryNav" aria-label="Primary navigation">
            <Link href="/study" className={navLinkClass("study")}>
              Study
            </Link>
            <Link href="/resources" className={navLinkClass("resources")}>
              Resources
            </Link>
            <button
              type="button"
              className={`appNavLink appMenuButton${menuOpen ? " active" : ""}`}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((value) => !value)}
            >
              Menu
            </button>
          </div>
        </div>

        {menuOpen && <button type="button" className="appMenuBackdrop" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}

        {menuOpen && (
          <div className="appMenuPanel ds-card" role="menu" aria-label="Secondary navigation">
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
