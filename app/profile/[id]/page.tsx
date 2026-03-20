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
    <div className="profilePageV2">
      <div className="profileShellV2">
        <header className="profileTopV2">
          <Link href="/" className="ghostPillV2">← Volver</Link>
          <div className="topActionsV2">
            {isMe && <Link href="/profile/edit" className="ghostPillV2">Editar perfil</Link>}
            <Link href="/write" className="primaryPillV2">Escribir</Link>
          </div>
        </header>

        <section className="heroCardV2">
          <div className="heroHeadV2">
            <div className="heroRowV2">
              {isMe ? (
                <Link href="/profile/edit" className="avatarWrapV2" aria-label="Cambiar foto">
                  {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="avatarImgV2" /> : <AvatarPlaceholder size={64} />}
                </Link>
              ) : (
                <div className="avatarWrapV2">
                  {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="avatarImgV2" /> : <AvatarPlaceholder size={64} />}
                </div>
              )}

              <div className="heroInfoV2">
                <div className="eyebrowV2">Perfil</div>
                <h1>{profile.full_name || profile.username || "Usuario"}</h1>
                <div className="heroHandleV2">@{profile.username || "sin-username"}</div>
                <div className="heroMetaV2">
                  {profile.group_name && <span>{profile.group_name}</span>}
                  {profile.is_admin && <span>Sensei</span>}
                </div>
              </div>
            </div>

            <div className="statsInlineV2">
              <div className="statMiniV2">
                <span>Total</span>
                <strong>{posts.length}</strong>
              </div>
              <div className="statMiniV2">
                <span>Portafolio</span>
                <strong>{portfolioPosts.length}</strong>
              </div>
              <div className="statMiniV2">
                <span>Tareas</span>
                <strong>{taskPosts.length}</strong>
              </div>
            </div>
          </div>

          {profile.bio && <p className="bioV2">{profile.bio}</p>}
        </section>

        <section className="feedCardV2">
          <div className="feedHeadV2">
            <div>
              <div className="eyebrowV2">Archivo</div>
              <h2>{viewMode === "portfolio" ? "Portafolio" : "Tareas"}</h2>
            </div>
            <div className="segmentedV2">
              <button type="button" className={viewMode === "portfolio" ? "active" : ""} onClick={() => setViewMode("portfolio")}>Portafolio</button>
              <button type="button" className={viewMode === "tasks" ? "active" : ""} onClick={() => setViewMode("tasks")}>Tareas</button>
            </div>
          </div>

          {shownPosts.length === 0 ? (
            <div className="emptyV2">Todavía no hay publicaciones aquí.</div>
          ) : (
            <div className="rowsV2">
              {shownPosts.map((post) => {
                const { title, preview } = getPostParts(post.content || "");
                return (
                  <article key={post.id} className="rowV2">
                    <div className="rowContentV2">
                      <div className="rowMetaV2">
                        <span>{formatDate(post.created_at)}</span>
                        {post.is_reviewed && <span className="sumiV2">済 Sumi</span>}
                      </div>
                      <Link href={`/post/${post.id}`} className="rowTitleV2">{title || "Sin título"}</Link>
                      {preview && <p className="rowPreviewV2">{preview}</p>}
                    </div>
                    {post.image_url && (
                      <Link href={`/post/${post.id}`} className="thumbV2" aria-label="Abrir post">
                        <img src={post.image_url} alt="" />
                      </Link>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        .profilePageV2 {
          min-height: 100vh;
          background: radial-gradient(1000px 500px at 50% -10%, rgba(52, 197, 166, .08), transparent 65%), #f6f7f8;
          padding: 14px;
        }
        .profileShellV2 {
          max-width: 760px;
          margin: 0 auto;
          display: grid;
          gap: 12px;
        }
        .profileTopV2 {
          position: sticky;
          top: 0;
          z-index: 20;
          background: rgba(246,247,248,.84);
          backdrop-filter: blur(10px);
          padding: 8px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .topActionsV2 {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .ghostPillV2 {
          border: 1px solid rgba(17,17,20,.1);
          background: #fff;
          color: #222;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: 12px;
          text-decoration: none;
        }
        .primaryPillV2 {
          text-decoration: none;
          color: #fff;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
          background: linear-gradient(135deg,#34c5a6,#25a98f);
          box-shadow: 0 8px 18px rgba(44,182,150,.2);
        }
        .heroCardV2,
        .feedCardV2 {
          border: 1px solid rgba(17,17,20,.07);
          border-radius: 20px;
          background: linear-gradient(180deg,#ffffff,#fcfcfd);
          box-shadow: 0 10px 26px rgba(15,23,42,.04);
          padding: 16px;
        }
        .heroHeadV2 {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: flex-start;
          flex-wrap: wrap;
        }
        .heroRowV2 {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .avatarWrapV2 {
          width: 72px;
          height: 72px;
          border-radius: 999px;
          overflow: hidden;
          border: 1px solid rgba(17,17,20,.08);
          display: grid;
          place-items: center;
          background: #f8f8f8;
          text-decoration: none;
          flex-shrink: 0;
        }
        .avatarImgV2 {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .heroInfoV2 {
          min-width: 0;
        }
        .eyebrowV2 {
          font-size: 11px;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: #7a7a84;
          font-weight: 800;
        }
        .heroInfoV2 h1 {
          margin: 2px 0 0;
          font-size: clamp(24px, 4vw, 34px);
          line-height: 1.04;
          letter-spacing: -.02em;
          color: #111114;
          overflow-wrap: anywhere;
        }
        .heroHandleV2 {
          margin-top: 5px;
          color: #6b7280;
          font-size: 14px;
          font-weight: 600;
        }
        .heroMetaV2 {
          margin: 8px 0 0;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .heroMetaV2 span {
          display: inline-flex;
          align-items: center;
          min-height: 30px;
          border-radius: 999px;
          border: 1px solid rgba(17,17,20,.08);
          background: #f8fafc;
          padding: 0 11px;
          color: #61616b;
          font-size: 12px;
          font-weight: 700;
        }
        .statsInlineV2 {
          display: grid;
          grid-template-columns: repeat(3, minmax(72px, auto));
          gap: 8px;
          align-items: stretch;
        }
        .statMiniV2 {
          border: 1px solid rgba(17,17,20,.07);
          border-radius: 14px;
          background: #f8fafc;
          padding: 10px 12px;
          min-width: 0;
        }
        .statMiniV2 span {
          display: block;
          font-size: 10px;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: #808089;
          font-weight: 800;
        }
        .statMiniV2 strong {
          display: block;
          margin-top: 4px;
          font-size: 20px;
          color: #111114;
          line-height: 1;
        }
        .bioV2 {
          margin: 14px 0 0;
          color: #1f2937;
          font-size: 14px;
          line-height: 1.65;
          max-width: 58ch;
        }
        .feedHeadV2 {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 10px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .feedHeadV2 h2 {
          margin: 4px 0 0;
          font-size: 22px;
          line-height: 1.2;
          color: #111114;
        }
        .segmentedV2 {
          display: inline-flex;
          gap: 4px;
          border: 1px solid rgba(17,17,20,.08);
          border-radius: 999px;
          padding: 3px;
          background: #fff;
        }
        .segmentedV2 button {
          border: 0;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 700;
          color: #666a73;
          background: transparent;
          cursor: pointer;
        }
        .segmentedV2 button.active {
          color: #fff;
          background: #111114;
        }
        .emptyV2 {
          padding: 24px;
          border: 1px dashed rgba(17,17,20,.16);
          border-radius: 14px;
          color: #7c7c85;
          text-align: center;
          font-size: 14px;
        }
        .rowsV2 {
          display: grid;
          gap: 10px;
        }
        .rowV2 {
          padding: 14px;
          display: grid;
          grid-template-columns: minmax(0,1fr) 88px;
          gap: 12px;
          align-items: center;
          border: 1px solid rgba(17,17,20,.07);
          border-radius: 16px;
          background: #fff;
        }
        .rowContentV2 {
          min-width: 0;
        }
        .rowMetaV2 {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #7c7c85;
          margin-bottom: 6px;
        }
        .sumiV2 {
          font-size: 10px;
          border: 1px solid #2cb696;
          color: #2cb696;
          border-radius: 999px;
          padding: 1px 6px;
          font-weight: 700;
        }
        .rowTitleV2 {
          display: block;
          font-size: 16px;
          line-height: 1.35;
          letter-spacing: -.01em;
          font-weight: 800;
          color: #15151a;
          text-decoration: none;
        }
        .rowPreviewV2 {
          margin: 6px 0 0;
          font-size: 13px;
          line-height: 1.55;
          color: #656574;
        }
        .thumbV2 {
          width: 88px;
          height: 88px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(17,17,20,.07);
          background: #f2f3f5;
        }
        .thumbV2 img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        @media (max-width: 740px) {
          .heroInfoV2 h1 {
            font-size: 22px;
          }
          .heroHeadV2 {
            display: grid;
            grid-template-columns: minmax(0,1fr);
            gap: 12px;
          }
          .avatarWrapV2 {
            width: 64px;
            height: 64px;
          }
          .heroHandleV2 {
            font-size: 14px;
          }
          .statsInlineV2 {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .profileTopV2 {
            justify-content: flex-start;
          }
          .topActionsV2 {
            width: 100%;
            justify-content: flex-start;
          }
          .heroCardV2,
          .feedCardV2 {
            padding: 12px;
            border-radius: 16px;
          }
          .rowV2 {
            grid-template-columns: minmax(0,1fr) 76px;
            gap: 10px;
          }
          .thumbV2 {
            width: 76px;
            height: 76px;
          }
        }
      `}</style>
    </div>
  );
}
