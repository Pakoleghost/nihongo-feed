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
  const [viewMode, setViewMode] = useState<"portfolio" | "tasks">("portfolio");
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
  const taskPosts = useMemo(
    () => posts.filter((p) => p.type === "assignment" || Boolean(p.parent_assignment_id)),
    [posts],
  );

  const shownPosts = viewMode === "portfolio" ? portfolioPosts : taskPosts;

  if (loading || !profile) {
    return <div style={{ padding: "110px 16px", textAlign: "center", color: "#9ca3af" }}>Cargando perfil…</div>;
  }

  return (
    <div className="profilePage">
      <div className="profileShell">
        <header className="profileTop">
          <Link href="/" className="ghostPill">← Volver</Link>
          <div className="topActions">
            {isMe && <Link href="/profile/edit" className="ghostPill">Editar perfil</Link>}
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
              <div className="eyebrow">Perfil</div>
              <h1>{profile.full_name || profile.username || "Usuario"}</h1>
              <p className="handle">@{profile.username || "sin-username"}</p>
              <div className="metaLine">
                {profile.group_name && <span>{profile.group_name}</span>}
                {profile.is_admin && <span>Sensei</span>}
              </div>
              {profile.bio ? <p className="bio">{profile.bio}</p> : <p className="bio muted">Sin biografía todavía.</p>}
            </div>
          </div>

          <div className="statsStrip">
            <div className="statCell">
              <span>Total</span>
              <strong>{posts.length}</strong>
            </div>
            <div className="statCell">
              <span>Portafolio</span>
              <strong>{portfolioPosts.length}</strong>
            </div>
            <div className="statCell">
              <span>Tareas</span>
              <strong>{taskPosts.length}</strong>
            </div>
          </div>
        </section>

        <section className="archiveCard">
          <div className="archiveHead">
            <div>
              <div className="eyebrow">Archivo</div>
              <h2>{viewMode === "portfolio" ? "Portafolio" : "Tareas"}</h2>
            </div>
            <div className="segmented">
              <button type="button" className={viewMode === "portfolio" ? "active" : ""} onClick={() => setViewMode("portfolio")}>
                Portafolio
              </button>
              <button type="button" className={viewMode === "tasks" ? "active" : ""} onClick={() => setViewMode("tasks")}>
                Tareas
              </button>
            </div>
          </div>

          {shownPosts.length === 0 ? (
            <div className="emptyState">Todavía no hay publicaciones aquí.</div>
          ) : (
            <div className="postList">
              {shownPosts.map((post) => {
                const { title, preview } = getPostParts(post.content || "");
                return (
                  <article key={post.id} className="postRow">
                    <div className="postBody">
                      <div className="postMeta">
                        <span>{formatDate(post.created_at)}</span>
                        {post.is_reviewed && <span className="statusTag">済 Sumi</span>}
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
                        <span>{viewMode === "portfolio" ? "Post" : "Task"}</span>
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
          background:
            radial-gradient(900px 420px at 50% -10%, rgba(52, 197, 166, 0.09), transparent 68%),
            linear-gradient(180deg, #fafafa 0%, #f4f5f6 100%);
          padding: 16px;
        }
        .profileShell {
          width: min(100%, 780px);
          margin: 0 auto;
          display: grid;
          gap: 14px;
        }
        .profileTop {
          position: sticky;
          top: 0;
          z-index: 30;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          padding: 6px 0;
          background: rgba(244, 245, 246, 0.88);
          backdrop-filter: blur(10px);
        }
        .topActions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ghostPill,
        .primaryPill {
          min-height: 40px;
          padding: 0 14px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
        }
        .ghostPill {
          border: 1px solid rgba(17, 17, 20, 0.1);
          background: rgba(255, 255, 255, 0.88);
          color: #17171c;
        }
        .primaryPill {
          border: 1px solid transparent;
          color: #fff;
          background: linear-gradient(135deg, #34c5a6, #27ad93);
          box-shadow: 0 10px 24px rgba(39, 173, 147, 0.18);
        }
        .profileCard,
        .archiveCard {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(17, 17, 20, 0.08);
          border-radius: 24px;
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.05);
        }
        .profileCard {
          padding: 22px;
          display: grid;
          gap: 20px;
        }
        .profileIdentity {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }
        .avatarWrap {
          width: 96px;
          height: 96px;
          border-radius: 999px;
          overflow: hidden;
          flex-shrink: 0;
          border: 1px solid rgba(17, 17, 20, 0.08);
          background: #f3f4f6;
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
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #7d7d87;
        }
        .identityCopy h1,
        .archiveHead h2 {
          margin: 4px 0 0;
          color: #111114;
          letter-spacing: -0.03em;
          overflow-wrap: anywhere;
        }
        .identityCopy h1 {
          font-size: clamp(28px, 5vw, 40px);
          line-height: 0.96;
        }
        .handle {
          margin: 8px 0 0;
          color: #6b7280;
          font-size: 15px;
          font-weight: 600;
          overflow-wrap: anywhere;
        }
        .metaLine {
          margin-top: 10px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          color: #555862;
          font-size: 13px;
          font-weight: 600;
        }
        .metaLine span {
          display: inline-flex;
          align-items: center;
          min-height: 30px;
          padding: 0 10px;
          border-radius: 999px;
          background: #f4f6f7;
          border: 1px solid rgba(17, 17, 20, 0.07);
        }
        .bio {
          margin: 14px 0 0;
          max-width: 60ch;
          font-size: 15px;
          line-height: 1.65;
          color: #21232b;
          overflow-wrap: anywhere;
        }
        .muted {
          color: #92929b;
        }
        .statsStrip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .statCell {
          min-width: 0;
          padding: 14px 16px;
          border-radius: 18px;
          background: linear-gradient(180deg, #fbfbfc, #f5f6f7);
          border: 1px solid rgba(17, 17, 20, 0.07);
        }
        .statCell span {
          display: block;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #80808a;
          font-weight: 800;
        }
        .statCell strong {
          display: block;
          margin-top: 6px;
          color: #111114;
          font-size: clamp(22px, 4vw, 30px);
          line-height: 1;
        }
        .archiveCard {
          padding: 18px;
        }
        .archiveHead {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 12px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }
        .archiveHead h2 {
          font-size: clamp(22px, 4vw, 28px);
          line-height: 1.04;
        }
        .segmented {
          display: inline-flex;
          gap: 4px;
          padding: 4px;
          border-radius: 999px;
          background: #f4f6f7;
          border: 1px solid rgba(17, 17, 20, 0.07);
        }
        .segmented button {
          border: 0;
          background: transparent;
          color: #656874;
          cursor: pointer;
          border-radius: 999px;
          min-height: 38px;
          padding: 0 14px;
          font-size: 13px;
          font-weight: 700;
        }
        .segmented button.active {
          background: #111114;
          color: #fff;
        }
        .emptyState {
          padding: 28px 18px;
          border: 1px dashed rgba(17, 17, 20, 0.15);
          border-radius: 18px;
          text-align: center;
          color: #7f818a;
          font-size: 14px;
          background: rgba(249, 250, 251, 0.7);
        }
        .postList {
          display: grid;
          gap: 10px;
        }
        .postRow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 84px;
          gap: 14px;
          align-items: center;
          padding: 14px;
          border-radius: 18px;
          border: 1px solid rgba(17, 17, 20, 0.07);
          background: linear-gradient(180deg, #fff, #fcfcfd);
        }
        .postBody {
          min-width: 0;
        }
        .postMeta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 6px;
          color: #7c7f88;
          font-size: 12px;
          font-weight: 600;
        }
        .statusTag {
          border-radius: 999px;
          border: 1px solid rgba(39, 173, 147, 0.28);
          color: #229c85;
          background: rgba(39, 173, 147, 0.08);
          padding: 2px 8px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.04em;
        }
        .postTitle {
          display: block;
          color: #111114;
          text-decoration: none;
          font-size: 17px;
          line-height: 1.3;
          font-weight: 800;
          letter-spacing: -0.01em;
          overflow-wrap: anywhere;
        }
        .postPreview {
          margin: 7px 0 0;
          color: #626673;
          font-size: 14px;
          line-height: 1.55;
          overflow-wrap: anywhere;
        }
        .postThumb {
          width: 84px;
          height: 84px;
          border-radius: 16px;
          overflow: hidden;
          background: #eef0f2;
          border: 1px solid rgba(17, 17, 20, 0.06);
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
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #9a9da7;
        }
        @media (max-width: 720px) {
          .profilePage {
            padding: 12px;
          }
          .profileCard {
            padding: 18px;
          }
          .profileIdentity {
            grid-template-columns: 76px minmax(0, 1fr);
            gap: 14px;
          }
          .avatarWrap {
            width: 76px;
            height: 76px;
          }
          .identityCopy h1 {
            font-size: 28px;
          }
          .statsStrip {
            gap: 8px;
          }
          .statCell {
            padding: 12px;
          }
          .archiveCard {
            padding: 14px;
          }
          .postRow {
            grid-template-columns: minmax(0, 1fr) 72px;
            gap: 10px;
            padding: 12px;
          }
          .postThumb {
            width: 72px;
            height: 72px;
            border-radius: 14px;
          }
          .postTitle {
            font-size: 16px;
          }
          .postPreview {
            font-size: 13px;
          }
        }
        @media (max-width: 520px) {
          .profileTop {
            justify-content: flex-start;
          }
          .topActions {
            width: 100%;
          }
          .topActions > :global(*) {
            flex: 1 1 auto;
          }
          .profileIdentity {
            grid-template-columns: minmax(0, 1fr);
          }
          .avatarWrap {
            width: 84px;
            height: 84px;
          }
          .statsStrip {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .archiveHead {
            align-items: stretch;
          }
          .segmented {
            width: 100%;
          }
          .segmented button {
            flex: 1 1 0;
          }
        }
      `}</style>
    </div>
  );
}
