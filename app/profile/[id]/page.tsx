"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getPostParts } from "@/lib/feed-utils";

function AvatarPlaceholder({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="11.5" fill="#f7f7f7" stroke="#e8e8e8" />
      <circle cx="12" cy="9.2" r="3.2" fill="#cfcfd4" />
      <path d="M6.7 18.1c1.1-2.3 3.05-3.4 5.3-3.4c2.25 0 4.2 1.1 5.3 3.4" stroke="#cfcfd4" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = Date.now();
  const diffH = Math.floor((now - date.getTime()) / (1000 * 60 * 60));
  const diffD = Math.floor(diffH / 24);
  if (diffH < 1) return "ahora";
  if (diffH < 24) return `${diffH}h`;
  if (diffD < 7) return `${diffD}d`;
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export default function StudentProfilePage() {
  const { id } = useParams();
  const profileId = String(id ?? "");

  const [profile, setProfile] = useState<any>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setMyId(user?.id || null);

    const [{ data: target }, { data: userPosts }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", profileId).single(),
      supabase.from("posts").select("*").eq("user_id", profileId).order("created_at", { ascending: false }),
    ]);

    setProfile(target || null);
    setPosts(userPosts || []);
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const isMe = myId === profileId;

  const portfolioPosts = useMemo(
    () => posts.filter((p) => p.type === "post" && !p.parent_assignment_id),
    [posts],
  );

  if (loading || !profile) {
    return <div style={{ padding: "110px 16px", textAlign: "center", color: "var(--color-text-muted)" }}>Cargando perfil…</div>;
  }

  return (
    <div className="profilePage">
      <div className="profileShell ds-container">
        <header className="profileTop">
          <div className="profileTopMain">
            <Link href="/study" className="ghostPill">Study</Link>
            <div className="topCopy">
              <div className="eyebrow">Perfil</div>
              <h1>{profile.full_name || profile.username || "Usuario"}</h1>
            </div>
          </div>
          <div className="topActions">
            {isMe && <Link href="/profile/edit" className="ghostPill">Editar</Link>}
            <Link href="/write" className="primaryPill">Escribir</Link>
          </div>
        </header>

        <section className="profileCard">
          <div className="profileIdentity">
            {isMe ? (
              <Link href="/profile/edit" className="avatarWrap" aria-label="Cambiar foto">
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="avatarImg" /> : <AvatarPlaceholder size={88} />}
              </Link>
            ) : (
              <div className="avatarWrap">
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="avatarImg" /> : <AvatarPlaceholder size={88} />}
              </div>
            )}

            <div className="identityCopy">
              <p className="handle">@{profile.username || "sin-username"}</p>
              <div className="metaLine">
                {profile.group_name && <span>{profile.group_name}</span>}
                {profile.is_admin && <span>Sensei</span>}
              </div>
              {profile.bio ? <p className="bio">{profile.bio}</p> : null}
            </div>
          </div>

          <div className="statsStrip">
            <div className="statCell">
              <span>Publicaciones</span>
              <strong>{portfolioPosts.length}</strong>
            </div>
            <div className="statCell">
              <span>Grupo</span>
              <strong>{profile.group_name || "—"}</strong>
            </div>
            <div className="statCell">
              <span>Rol</span>
              <strong>{profile.is_admin ? "Sensei" : "Alumno"}</strong>
            </div>
          </div>
        </section>

        <section className="archiveCard">
          <div className="archiveHead">
            <div>
              <div className="eyebrow">Archivo</div>
              <h2>Publicaciones</h2>
            </div>
            <span className="countPill">{portfolioPosts.length}</span>
          </div>

          {portfolioPosts.length === 0 ? (
            <div className="emptyState">Todavía no hay publicaciones aquí.</div>
          ) : (
            <div className="postList">
              {portfolioPosts.map((post) => {
                const { title, preview } = getPostParts(post.content || "");
                return (
                  <article key={post.id} className="postRow">
                    <div className="postBody">
                      <div className="postMeta">
                        <span>{formatDate(post.created_at)}</span>
                      </div>
                      <Link href={`/post/${post.id}`} className="postTitle">
                        {title || "Sin título"}
                      </Link>
                      {preview && <p className="postPreview">{preview}</p>}
                    </div>
                    {post.image_url ? (
                      <Link href={`/post/${post.id}`} className="postThumb" aria-label="Abrir post">
                        <img src={post.image_url} alt="" />
                      </Link>
                    ) : (
                      <div className="postThumb placeholderThumb" aria-hidden="true">
                        <span>Post</span>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
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
        .profileTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--space-3);
          flex-wrap: wrap;
          padding: var(--space-2) 0;
        }
        .profileTopMain {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          min-width: 0;
        }
        .topCopy {
          display: grid;
          gap: 2px;
          min-width: 0;
        }
        .topCopy h1 {
          margin: 0;
          font-size: var(--text-h1);
          line-height: 0.98;
          letter-spacing: -0.04em;
          color: var(--color-text);
          overflow-wrap: anywhere;
        }
        .topActions {
          display: flex;
          gap: var(--space-2);
          flex-wrap: wrap;
        }
        .ghostPill,
        .primaryPill {
          min-height: 40px;
          padding: 0 14px;
          border-radius: var(--radius-pill);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-size: var(--text-body-sm);
          font-weight: 700;
        }
        .ghostPill {
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text);
        }
        .primaryPill {
          border: 1px solid transparent;
          color: #fff;
          background: var(--color-primary);
        }
        .profileCard,
        .archiveCard {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-card);
        }
        .profileCard {
          padding: var(--space-5);
          display: grid;
          gap: var(--space-4);
        }
        .profileIdentity {
          display: grid;
          grid-template-columns: 72px minmax(0, 1fr);
          gap: var(--space-4);
          align-items: center;
        }
        .avatarWrap {
          width: 72px;
          height: 72px;
          border-radius: 999px;
          overflow: hidden;
          flex-shrink: 0;
          border: 1px solid var(--color-border);
          background: var(--color-surface-muted);
          display: grid;
          place-items: center;
          text-decoration: none;
        }
        .avatarImg {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .identityCopy {
          min-width: 0;
        }
        .eyebrow {
          font-size: var(--text-label);
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-text-muted);
        }
        .archiveHead h2 {
          margin: 2px 0 0;
          color: var(--color-text);
          letter-spacing: -0.02em;
          overflow-wrap: anywhere;
        }
        .handle {
          margin: 0;
          color: var(--color-text);
          font-size: var(--text-body-lg);
          font-weight: 600;
          overflow-wrap: anywhere;
        }
        .metaLine {
          margin-top: var(--space-2);
          display: flex;
          gap: var(--space-2);
          flex-wrap: wrap;
          color: var(--color-text-muted);
          font-size: var(--text-body-sm);
          font-weight: 600;
        }
        .metaLine span {
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          padding: 0 10px;
          border-radius: var(--radius-pill);
          background: var(--color-surface-muted);
          border: 1px solid var(--color-border);
        }
        .bio {
          margin: var(--space-3) 0 0;
          max-width: 60ch;
          font-size: var(--text-body);
          line-height: 1.65;
          color: var(--color-text);
          overflow-wrap: anywhere;
        }
        .muted {
          color: var(--color-text-muted);
        }
        .statsStrip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: var(--space-3);
        }
        .statCell {
          min-width: 0;
          padding: var(--space-4);
          border-radius: var(--radius-md);
          background: var(--color-surface-muted);
          border: 1px solid var(--color-border);
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
          margin-top: var(--space-2);
          color: var(--color-text);
          font-size: var(--text-body-lg);
          line-height: 1.2;
          overflow-wrap: anywhere;
        }
        .archiveCard {
          padding: var(--space-5);
        }
        .archiveHead {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--space-3);
          margin-bottom: var(--space-4);
          flex-wrap: wrap;
        }
        .archiveHead h2 {
          font-size: var(--text-h2);
          line-height: 1.08;
        }
        .countPill {
          min-height: 32px;
          padding: 0 12px;
          border-radius: var(--radius-pill);
          border: 1px solid var(--color-border);
          background: var(--color-surface-muted);
          color: var(--color-text-muted);
          font-size: var(--text-body-sm);
          font-weight: 700;
          display: inline-flex;
          align-items: center;
        }
        .emptyState {
          padding: var(--space-6) var(--space-4);
          border: 1px dashed var(--color-border-strong);
          border-radius: var(--radius-md);
          text-align: center;
          color: var(--color-text-muted);
          font-size: var(--text-body);
          background: var(--color-surface-muted);
        }
        .postList {
          display: grid;
          gap: var(--space-3);
        }
        .postRow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 72px;
          gap: var(--space-3);
          align-items: center;
          padding: var(--space-4);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
          background: var(--color-surface);
        }
        .postBody {
          min-width: 0;
        }
        .postMeta {
          display: flex;
          gap: var(--space-2);
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 6px;
          color: var(--color-text-muted);
          font-size: var(--text-body-sm);
          font-weight: 600;
        }
        .postTitle {
          display: block;
          color: var(--color-text);
          text-decoration: none;
          font-size: var(--text-body-lg);
          line-height: 1.3;
          font-weight: 700;
          letter-spacing: -0.01em;
          overflow-wrap: anywhere;
        }
        .postPreview {
          margin: 6px 0 0;
          color: var(--color-text-muted);
          font-size: var(--text-body);
          line-height: 1.55;
          overflow-wrap: anywhere;
        }
        .postThumb {
          width: 72px;
          height: 72px;
          border-radius: var(--radius-md);
          overflow: hidden;
          background: var(--color-surface-muted);
          border: 1px solid var(--color-border);
          flex-shrink: 0;
        }
        .postThumb img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .placeholderThumb {
          display: grid;
          place-items: center;
        }
        .placeholderThumb span {
          font-size: var(--text-label);
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-text-muted);
        }
        @media (max-width: 720px) {
          .profileCard {
            padding: var(--space-4);
          }
          .profileIdentity {
            grid-template-columns: 64px minmax(0, 1fr);
            gap: var(--space-3);
          }
          .avatarWrap {
            width: 64px;
            height: 64px;
          }
          .statsStrip {
            grid-template-columns: 1fr;
          }
          .statCell {
            padding: var(--space-3);
          }
          .archiveCard {
            padding: var(--space-4);
          }
          .postRow {
            grid-template-columns: minmax(0, 1fr) 72px;
            gap: var(--space-3);
            padding: var(--space-3);
          }
        }
        @media (max-width: 520px) {
          .profileTop {
            align-items: flex-start;
          }
          .topActions {
            width: 100%;
          }
          .topActions > :global(*) {
            flex: 1 1 auto;
          }
          .profileIdentity {
            grid-template-columns: minmax(0, 1fr);
            align-items: start;
          }
          .avatarWrap {
            width: 72px;
            height: 72px;
          }
          .archiveHead {
            align-items: stretch;
          }
          .countPill {
            width: fit-content;
          }
        }
      `}</style>
    </div>
  );
}
