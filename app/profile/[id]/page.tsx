"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AppTopNav from "@/components/AppTopNav";

function AvatarPlaceholder({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="11.5" fill="#f7f7f7" stroke="#e8e8e8" />
      <circle cx="12" cy="9.2" r="3.2" fill="#cfcfd4" />
      <path d="M6.7 18.1c1.1-2.3 3.05-3.4 5.3-3.4c2.25 0 4.2 1.1 5.3 3.4" stroke="#cfcfd4" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function StudentProfilePage() {
  const { id } = useParams();
  const profileId = String(id ?? "");

  const [profile, setProfile] = useState<any>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setMyId(user?.id || null);

    const { data: target } = await supabase.from("profiles").select("*").eq("id", profileId).single();
    setProfile(target || null);
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const isMe = myId === profileId;

  if (loading || !profile) {
    return <div style={{ padding: "110px 16px", textAlign: "center", color: "var(--color-text-muted)" }}>Cargando perfil…</div>;
  }

  return (
    <div className="profilePage">
      <div className="profileShell ds-container">
        <AppTopNav secondary={isMe ? "profile" : null} />

        <section className="profileCard">
          <div className="profileHeader">
            <div>
              <div className="eyebrow">Perfil</div>
              <h1>{profile.full_name || profile.username || "Usuario"}</h1>
            </div>
            {isMe ? (
              <Link href="/profile/edit" className="ghostPill">
                Editar perfil
              </Link>
            ) : null}
          </div>

          <div className="identityRow">
            <div className="avatarWrap" aria-hidden="true">
              {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="avatarImg" /> : <AvatarPlaceholder size={84} />}
            </div>

            <div className="identityCopy">
              <p className="handle">@{profile.username || "sin-username"}</p>
              <div className="metaStack">
                <span>{profile.is_admin ? "Sensei" : "Alumno"}</span>
                <span>{profile.group_name || "Sin grupo"}</span>
              </div>
              {profile.bio ? <p className="bio">{profile.bio}</p> : null}
            </div>
          </div>

          <div className="statsStrip">
            <div className="statCell">
              <span>Rol</span>
              <strong>{profile.is_admin ? "Sensei" : "Alumno"}</strong>
            </div>
            <div className="statCell">
              <span>Grupo</span>
              <strong>{profile.group_name || "—"}</strong>
            </div>
            <div className="statCell">
              <span>Usuario</span>
              <strong>@{profile.username || "—"}</strong>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .profilePage {
          min-height: 100vh;
          background: var(--color-bg);
          padding: var(--page-padding);
        }
        .profileShell {
          display: grid;
          gap: var(--space-4);
        }
        .profileCard {
          display: grid;
          gap: var(--space-4);
          padding: clamp(18px, 4vw, 26px);
          border-radius: 30px;
          background: color-mix(in srgb, var(--color-surface) 88%, white);
          border: 1px solid var(--color-border);
          box-shadow: 0 18px 34px rgba(26, 26, 46, 0.05);
        }
        .profileHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--space-3);
          flex-wrap: wrap;
        }
        .eyebrow {
          font-size: var(--text-label);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--color-text-muted);
          font-weight: 800;
        }
        .profileHeader h1 {
          margin: 4px 0 0;
          font-size: clamp(2.4rem, 7vw, 4.6rem);
          line-height: 0.92;
          letter-spacing: -0.06em;
          color: var(--color-text);
        }
        .ghostPill {
          min-height: 40px;
          padding: 0 14px;
          border-radius: var(--radius-pill);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-size: var(--text-body-sm);
          font-weight: 700;
          border: 1px solid var(--color-border);
          background: color-mix(in srgb, var(--color-surface) 82%, white);
          color: var(--color-text);
        }
        .identityRow {
          display: grid;
          grid-template-columns: 84px minmax(0, 1fr);
          gap: var(--space-4);
          align-items: center;
        }
        .avatarWrap {
          width: 84px;
          height: 84px;
          border-radius: 999px;
          overflow: hidden;
          border: 1px solid var(--color-border);
          background: var(--color-surface-muted);
          display: grid;
          place-items: center;
        }
        .avatarImg {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .handle {
          margin: 0;
          font-size: var(--text-body-lg);
          font-weight: 700;
          color: var(--color-text);
        }
        .metaStack {
          margin-top: 10px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .metaStack span {
          min-height: 30px;
          padding: 0 10px;
          border-radius: var(--radius-pill);
          background: color-mix(in srgb, var(--color-highlight-soft) 56%, white);
          color: var(--color-text);
          display: inline-flex;
          align-items: center;
          font-size: var(--text-body-sm);
          font-weight: 700;
        }
        .bio {
          margin: 12px 0 0;
          color: var(--color-text-muted);
          font-size: var(--text-body);
          line-height: 1.6;
          max-width: 56ch;
        }
        .statsStrip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .statCell {
          min-width: 0;
          padding: 12px 14px;
          border-radius: 20px;
          background: color-mix(in srgb, var(--color-surface-muted) 78%, white);
        }
        .statCell span {
          display: block;
          font-size: var(--text-label);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-text-muted);
          font-weight: 800;
        }
        .statCell strong {
          display: block;
          margin-top: 6px;
          color: var(--color-text);
          font-size: var(--text-body-lg);
          line-height: 1.25;
          overflow-wrap: anywhere;
        }
        @media (max-width: 720px) {
          .identityRow {
            grid-template-columns: 72px minmax(0, 1fr);
            gap: var(--space-3);
          }
          .avatarWrap {
            width: 72px;
            height: 72px;
          }
          .statsStrip {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 520px) {
          .profileHeader {
            align-items: stretch;
          }
          .identityRow {
            grid-template-columns: minmax(0, 1fr);
          }
          .ghostPill {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
