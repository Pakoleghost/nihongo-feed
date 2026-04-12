"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function IconBook() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h11.5v15.5H7A2.5 2.5 0 0 0 4.5 21V5.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M7 3v15.5A2.5 2.5 0 0 0 4.5 21H17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7.5 9a4.5 4.5 0 1 1 9 0v2.4c0 .8.24 1.58.7 2.24l.55.8c.42.6 0 1.42-.73 1.42H6.98c-.73 0-1.15-.82-.73-1.42l.55-.8c.46-.66.7-1.44.7-2.24V9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2.75l1.15 2.65 2.88.23-2.2 1.88.67 2.82L12 8.9l-2.5 1.43.67-2.82-2.2-1.88 2.88-.23L12 2.75Z" stroke="currentColor" strokeWidth="1.45" strokeLinejoin="round" />
      <path d="M21.25 12l-2.65 1.15-.23 2.88-1.88-2.2-2.82.67L15.1 12l-1.43-2.5 2.82.67 1.88-2.2.23 2.88L21.25 12Z" stroke="currentColor" strokeWidth="1.45" strokeLinejoin="round" />
      <path d="M12 21.25l-1.15-2.65-2.88-.23 2.2-1.88-.67-2.82L12 15.1l2.5-1.43-.67 2.82 2.2 1.88-2.88.23L12 21.25Z" stroke="currentColor" strokeWidth="1.45" strokeLinejoin="round" />
      <path d="M2.75 12l2.65-1.15.23-2.88 1.88 2.2 2.82-.67L8.9 12l1.43 2.5-2.82-.67-1.88 2.2-.23-2.88L2.75 12Z" stroke="currentColor" strokeWidth="1.45" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconSpark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function IconCards() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="6" width="14" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10h6M8 13h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8.5 4h9A2.5 2.5 0 0 1 20 6.5V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconTarget() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

function IconFolder() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4.2l1.7 2H18A2.5 2.5 0 0 1 20.5 9.5v7A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5v-9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function AvatarPlaceholder({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="11.5" fill="#f7f7f7" stroke="#e8e8e8" />
      <circle cx="12" cy="9.2" r="3.2" fill="#cfcfd4" />
      <path d="M6.7 18.1c1.1-2.3 3.05-3.4 5.3-3.4c2.25 0 4.2 1.1 5.3 3.4" stroke="#cfcfd4" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function safeStorageGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fontScale, setFontScale] = useState<"normal" | "large">("normal");

  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    if (opts?.silent) setRefreshing(true);
    else setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      if (!opts?.silent) setLoading(false);
      setRefreshing(false);
      router.push("/login");
      return;
    }

    setCurrentUserId(user.id);

    let { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (!prof) {
      const meta: any = user.user_metadata || {};
      const baseUsername = String(meta?.username || user.email?.split("@")[0] || `user_${user.id.slice(0, 8)}`)
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "")
        .slice(0, 24);
      const fallbackUsername = baseUsername || `user_${user.id.slice(0, 8)}`;
      await supabase.from("profiles").upsert(
        {
          id: user.id,
          username: fallbackUsername,
          full_name: meta?.full_name || null,
          group_name: meta?.group_name || null,
          is_approved: false,
        },
        { onConflict: "id" },
      );
      const retry = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      prof = retry.data || null;
    }
    setMyProfile(prof || null);

    if (prof?.is_approved || prof?.is_admin) {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .or("is_read.eq.false,is_read.is.null");
      setUnreadNotifications(count || 0);

      if (prof?.is_admin) {
        const { count: pendingCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("is_approved", false);
        setPendingApprovalsCount(pendingCount || 0);
      } else {
        setPendingApprovalsCount(0);
      }
    }

    if (!opts?.silent) setLoading(false);
    setRefreshing(false);
  }, [router]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const saved = safeStorageGet("home_font_scale");
    if (saved === "normal" || saved === "large") setFontScale(saved);
  }, []);

  useEffect(() => {
    safeStorageSet("home_font_scale", fontScale);
  }, [fontScale]);

  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel(`notif-count-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${currentUserId}` },
        async () => {
          const { count } = await supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", currentUserId)
            .or("is_read.eq.false,is_read.is.null");
          setUnreadNotifications(count || 0);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  if (!loading && myProfile && !myProfile.is_approved && !myProfile.is_admin) {
    return (
      <div className="pendingPage">
        <div className="pendingCard">Esperando aprobación</div>
        <style jsx>{`
          .pendingPage {
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: linear-gradient(180deg, #fff8e7 0%, #fffdf8 100%);
            color: #1a1a2e;
            padding: 24px;
          }
          .pendingCard {
            border-radius: 28px;
            padding: 24px 28px;
            background: rgba(255,255,255,0.92);
            border: 1px solid rgba(26,26,46,0.08);
            font-size: 18px;
            font-weight: 800;
            box-shadow: 0 20px 40px rgba(26,26,46,0.06);
          }
        `}</style>
      </div>
    );
  }

  const studyCards = [
    { href: "/study", label: "Estudio", tone: "dark", icon: <IconSpark /> },
    { href: "/study?view=flashcards", label: "Flashcards", tone: "mint", icon: <IconCards /> },
    { href: "/study?view=exam", label: "Exámenes", tone: "red", icon: <IconTarget /> },
    { href: "/study?view=kana", label: "Kana Sprint", tone: "sand", icon: <IconSpark /> },
    { href: "/study?view=sprint", label: "Vocab Sprint", tone: "blue", icon: <IconBook /> },
    { href: "/resources", label: "Recursos", tone: "paper", icon: <IconFolder /> },
  ];

  if (myProfile?.is_admin) {
    studyCards.push({ href: "/study?view=dictionary", label: "Diccionario", tone: "mint", icon: <IconBook /> });
  }

  return (
    <div className={`homePage ${fontScale === "large" ? "largeText" : ""}`}>
      <div className="homeShell">
        <header className="homeHeader">
          <button
            type="button"
            className="brandButton"
            onClick={() => void fetchData({ silent: true })}
            aria-label="Actualizar inicio"
          >
            <span className="brandDot" />
            <span className="brandText">Nihongo Feed</span>
          </button>

          <div className="headerRight">
            {refreshing && <span className="refreshChip">...</span>}
            <button type="button" onClick={() => setMenuOpen(true)} className="menuButton" aria-label="Abrir menú">
              <IconMenu />
              {unreadNotifications > 0 && <span className="notifDot">{unreadNotifications > 9 ? "9+" : unreadNotifications}</span>}
            </button>
          </div>
        </header>

        <main className="homeMain">
          <section className="heroCard">
            <Link href="/study" className="heroMain">
              <span className="heroMini">Estudio</span>
              <strong>開く</strong>
            </Link>
            <Link href="/resources" className="heroSide heroResources">
              <IconFolder />
              <span>Recursos</span>
            </Link>
            <Link href="/notifications" className="heroSide heroNotifications">
              <IconBell />
              <span>Notificaciones</span>
              {unreadNotifications > 0 && <em>{unreadNotifications > 9 ? "9+" : unreadNotifications}</em>}
            </Link>
          </section>

          <section className="cardGrid">
            {studyCards.map((card) => (
              <Link key={card.href} href={card.href} className={`studyCard ${card.tone}`}>
                <span className="studyIcon">{card.icon}</span>
                <span className="studyLabel">{card.label}</span>
              </Link>
            ))}
          </section>
        </main>
      </div>

      {menuOpen && (
        <>
          <button type="button" onClick={() => setMenuOpen(false)} className="menuBackdrop" aria-label="Cerrar menú" />
          <aside className="menuPanel">
            <div className="menuHead">
              <strong>Menú</strong>
              <button type="button" onClick={() => setMenuOpen(false)}>Cerrar</button>
            </div>

            <div className="menuList">
              <Link href={`/profile/${myProfile?.id}`} onClick={() => setMenuOpen(false)} className="menuLink">
                <AvatarPlaceholder size={18} /> Perfil
              </Link>
              <Link href="/study" onClick={() => setMenuOpen(false)} className="menuLink">
                <IconSpark /> Estudio
              </Link>
              <Link href="/resources" onClick={() => setMenuOpen(false)} className="menuLink">
                <IconBook /> Recursos
              </Link>
              <Link href="/notifications" onClick={() => setMenuOpen(false)} className="menuLink split">
                <span className="menuLabel"><IconBell /> Notificaciones</span>
                {unreadNotifications > 0 && <span className="menuBadge">{unreadNotifications}</span>}
              </Link>
              {myProfile?.is_admin && (
                <Link href="/admin/groups" onClick={() => setMenuOpen(false)} className="menuLink split">
                  <span className="menuLabel"><IconSettings /> Panel maestro</span>
                  {pendingApprovalsCount > 0 && <span className="menuBadge">{pendingApprovalsCount > 99 ? "99+" : pendingApprovalsCount}</span>}
                </Link>
              )}
            </div>

            <div className="menuSection">
              <div className="menuSectionTitle">Estudio</div>
              <div className="menuList compactList">
                <Link href="/study?view=exam" onClick={() => setMenuOpen(false)} className="menuLink"><IconTarget /> Exámenes</Link>
                <Link href="/study?view=flashcards" onClick={() => setMenuOpen(false)} className="menuLink"><IconCards /> Flashcards</Link>
                <Link href="/study?view=kana" onClick={() => setMenuOpen(false)} className="menuLink"><IconSpark /> Kana Sprint</Link>
                <Link href="/study?view=sprint" onClick={() => setMenuOpen(false)} className="menuLink"><IconBook /> Vocab Sprint</Link>
                {myProfile?.is_admin && (
                  <Link href="/study?view=dictionary" onClick={() => setMenuOpen(false)} className="menuLink">
                    <IconBook /> Diccionario
                  </Link>
                )}
              </div>
            </div>

            <div className="menuSection">
              <div className="menuSectionTitle">Texto</div>
              <div className="segmentedControl panelSegmented">
                <button type="button" onClick={() => setFontScale("normal")} className={fontScale === "normal" ? "active" : ""}>Normal</button>
                <button type="button" onClick={() => setFontScale("large")} className={fontScale === "large" ? "active" : ""}>Grande</button>
              </div>
            </div>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              className="logoutButton"
            >
              Cerrar sesión
            </button>
          </aside>
        </>
      )}

      <style jsx>{`
        .homePage {
          min-height: 100vh;
          background:
            radial-gradient(520px 240px at 12% -4%, rgba(78, 205, 196, 0.13), transparent 62%),
            radial-gradient(420px 220px at 100% 0%, rgba(244, 162, 97, 0.12), transparent 60%),
            linear-gradient(180deg, #fff8e7 0%, #fffdf8 100%);
          color: #1a1a2e;
        }
        .largeText {
          font-size: 1.06rem;
        }
        .homeShell {
          width: min(100%, 760px);
          margin: 0 auto;
          padding: 0 16px 32px;
        }
        .homeHeader {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 0 14px;
          background: linear-gradient(180deg, rgba(255, 248, 231, 0.96), rgba(255, 248, 231, 0.78));
          backdrop-filter: blur(12px);
        }
        .brandButton,
        .menuButton,
        .menuHead button,
        .logoutButton,
        .segmentedControl button {
          appearance: none;
          border: 0;
          font: inherit;
        }
        .brandButton {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: transparent;
          color: inherit;
          cursor: pointer;
          padding: 0;
        }
        .brandDot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: #e63946;
          box-shadow: 0 0 0 6px rgba(230, 57, 70, 0.1);
        }
        .brandText {
          font-size: 26px;
          line-height: 1;
          letter-spacing: -0.04em;
          font-weight: 900;
        }
        .headerRight {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .refreshChip {
          min-height: 32px;
          padding: 0 10px;
          border-radius: 999px;
          background: rgba(26, 26, 46, 0.06);
          color: #457b9d;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 12px;
        }
        .menuButton {
          position: relative;
          width: 44px;
          height: 44px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(26, 26, 46, 0.08);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #1a1a2e;
          box-shadow: 0 12px 28px rgba(26, 26, 46, 0.05);
          cursor: pointer;
        }
        .notifDot {
          position: absolute;
          top: -4px;
          right: -4px;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          border-radius: 999px;
          background: #e63946;
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 800;
        }
        .homeMain {
          display: grid;
          gap: 14px;
          padding-top: 8px;
        }
        .heroCard {
          display: grid;
          grid-template-columns: 1.35fr 1fr;
          gap: 12px;
        }
        .heroMain,
        .heroSide,
        .studyCard {
          text-decoration: none;
          color: inherit;
          border-radius: 28px;
          border: 1px solid rgba(26, 26, 46, 0.08);
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 20px 40px rgba(26, 26, 46, 0.05);
        }
        .heroMain {
          min-height: 220px;
          padding: 22px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: linear-gradient(180deg, #1a1a2e 0%, #232343 100%);
          color: #fff8e7;
        }
        .heroMini {
          display: inline-flex;
          width: fit-content;
          min-height: 30px;
          padding: 0 12px;
          border-radius: 999px;
          background: rgba(255, 248, 231, 0.1);
          color: rgba(255, 248, 231, 0.9);
          align-items: center;
          font-size: 12px;
          font-weight: 800;
        }
        .heroMain strong {
          font-size: clamp(40px, 11vw, 72px);
          line-height: 0.9;
          letter-spacing: -0.07em;
          font-weight: 900;
        }
        .heroSide {
          min-height: 104px;
          padding: 18px 18px 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 10px;
        }
        .heroResources {
          background: rgba(255, 255, 255, 0.9);
        }
        .heroNotifications {
          background: rgba(78, 205, 196, 0.14);
          position: relative;
        }
        .heroSide span {
          font-size: 24px;
          line-height: 1;
          letter-spacing: -0.04em;
          font-weight: 800;
        }
        .heroSide em {
          position: absolute;
          right: 16px;
          top: 16px;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          border-radius: 999px;
          background: #e63946;
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-style: normal;
          font-size: 10px;
          font-weight: 800;
        }
        .cardGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .studyCard {
          min-height: 108px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 12px;
        }
        .studyCard.dark {
          background: rgba(26, 26, 46, 0.94);
          color: #fff8e7;
        }
        .studyCard.mint {
          background: rgba(78, 205, 196, 0.14);
        }
        .studyCard.red {
          background: rgba(230, 57, 70, 0.1);
        }
        .studyCard.sand {
          background: rgba(244, 162, 97, 0.18);
        }
        .studyCard.blue {
          background: rgba(69, 123, 157, 0.14);
        }
        .studyCard.paper {
          background: rgba(255, 255, 255, 0.94);
        }
        .studyIcon {
          width: 40px;
          height: 40px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.55);
        }
        .studyCard.dark .studyIcon {
          background: rgba(255, 248, 231, 0.1);
        }
        .studyLabel {
          font-size: 22px;
          line-height: 1;
          letter-spacing: -0.04em;
          font-weight: 800;
        }
        .menuBackdrop {
          position: fixed;
          inset: 0;
          background: rgba(26, 26, 46, 0.24);
          border: 0;
          z-index: 50;
        }
        .menuPanel {
          position: fixed;
          top: 0;
          right: 0;
          width: min(340px, 88vw);
          height: 100vh;
          z-index: 60;
          background: #fff8e7;
          border-left: 1px solid rgba(26, 26, 46, 0.08);
          padding: 18px 16px 24px;
          display: grid;
          align-content: start;
          gap: 14px;
          overflow-y: auto;
        }
        .menuHead {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }
        .menuHead strong {
          font-size: 18px;
          color: #1a1a2e;
        }
        .menuHead button {
          min-height: 36px;
          padding: 0 12px;
          border-radius: 999px;
          background: rgba(26, 26, 46, 0.06);
          color: #1a1a2e;
          cursor: pointer;
        }
        .menuSection {
          display: grid;
          gap: 8px;
        }
        .menuSectionTitle {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #457b9d;
        }
        .menuList {
          display: grid;
          gap: 8px;
        }
        .compactList .menuLink {
          min-height: 42px;
        }
        .menuLink {
          min-height: 48px;
          padding: 0 14px;
          border-radius: 18px;
          border: 1px solid rgba(26, 26, 46, 0.07);
          background: rgba(255, 255, 255, 0.88);
          color: #1a1a2e;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 700;
        }
        .menuLink.split {
          justify-content: space-between;
        }
        .menuLabel {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }
        .menuBadge {
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          border-radius: 999px;
          background: #e63946;
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 800;
        }
        .segmentedControl {
          display: inline-flex;
          gap: 4px;
          padding: 4px;
          border-radius: 999px;
          background: rgba(26, 26, 46, 0.06);
          width: 100%;
        }
        .segmentedControl button {
          flex: 1 1 0;
          min-height: 38px;
          padding: 0 14px;
          border-radius: 999px;
          background: transparent;
          color: #4d5162;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }
        .segmentedControl button.active {
          background: #fff;
          color: #1a1a2e;
          box-shadow: 0 4px 12px rgba(26, 26, 46, 0.08);
        }
        .logoutButton {
          min-height: 48px;
          border-radius: 18px;
          background: rgba(230, 57, 70, 0.1);
          color: #a92b36;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }
        @media (max-width: 640px) {
          .homeShell {
            padding: 0 12px 24px;
          }
          .heroCard,
          .cardGrid {
            grid-template-columns: 1fr;
          }
          .heroMain {
            min-height: 180px;
          }
          .heroSide {
            min-height: 86px;
          }
        }
        @media (max-width: 480px) {
          .brandText {
            font-size: 23px;
          }
          .studyLabel,
          .heroSide span {
            font-size: 20px;
          }
          .heroMain strong {
            font-size: 48px;
          }
          .studyCard {
            min-height: 94px;
          }
        }
      `}</style>
    </div>
  );
}
