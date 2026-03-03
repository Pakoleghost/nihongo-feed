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
          <div className="heroRowV2">
            {isMe ? (
              <Link href="/profile/edit" className="avatarWrapV2" aria-label="Cambiar foto">
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="avatarImgV2" /> : <AvatarPlaceholder size={52} />}
              </Link>
            ) : (
              <div className="avatarWrapV2">
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="avatarImgV2" /> : <AvatarPlaceholder size={52} />}
              </div>
            )}

            <div className="heroInfoV2">
              <div className="eyebrowV2">Perfil</div>
              <h1>{profile.full_name || profile.username || "Usuario"}</h1>
              <p>
                @{profile.username || "sin-username"}
                {profile.group_name ? ` · ${profile.group_name}` : ""}
                {profile.is_admin ? " · Sensei" : ""}
              </p>
            </div>
          </div>

          {profile.bio && <p className="bioV2">{profile.bio}</p>}

          <div className="statsRowV2">
            <div className="statV2">
              <span>Total</span>
              <strong>{posts.length}</strong>
            </div>
            <div className="statV2">
              <span>Portafolio</span>
              <strong>{portfolioPosts.length}</strong>
            </div>
            <div className="statV2">
              <span>Tareas</span>
              <strong>{taskPosts.length}</strong>
            </div>
          </div>
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
              {shownPosts.map((post, idx) => {
                const { title, preview } = getPostParts(post.content || "");
                return (
                  <article key={post.id} className="rowV2" style={{ borderBottom: idx === shownPosts.length - 1 ? "none" : "1px solid rgba(17,17,20,.06)" }}>
                    <div className="rowMetaV2">
                      <span>{formatDate(post.created_at)}</span>
                      {post.is_reviewed && <span className="sumiV2">済 Sumi</span>}
                    </div>
                    <Link href={`/post/${post.id}`} className="rowTitleV2">{title || "Sin título"}</Link>
                    {preview && <p className="rowPreviewV2">{preview}</p>}
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
          max-width: 980px;
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
          padding: 8px 12px;
          font-size: 13px;
          text-decoration: none;
        }
        .primaryPillV2 {
          text-decoration: none;
          color: #fff;
          border-radius: 999px;
          padding: 9px 14px;
          font-size: 13px;
          font-weight: 700;
          background: linear-gradient(135deg,#34c5a6,#25a98f);
          box-shadow: 0 8px 18px rgba(44,182,150,.2);
        }
        .heroCardV2,
        .feedCardV2 {
          border: 1px solid rgba(17,17,20,.07);
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 12px 30px rgba(0,0,0,.035);
          padding: 16px;
        }
        .heroRowV2 {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 12px;
          align-items: center;
        }
        .avatarWrapV2 {
          width: 68px;
          height: 68px;
          border-radius: 999px;
          overflow: hidden;
          border: 1px solid rgba(17,17,20,.09);
          display: grid;
          place-items: center;
          background: #f5f5f5;
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
          font-size: 34px;
          line-height: 1.1;
          letter-spacing: -.02em;
          color: #111114;
        }
        .heroInfoV2 p {
          margin: 6px 0 0;
          color: #72727c;
          font-size: 14px;
        }
        .bioV2 {
          margin: 14px 0 0;
          color: #1f2937;
          font-size: 15px;
          line-height: 1.6;
        }
        .statsRowV2 {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }
        .statV2 {
          border: 1px solid rgba(17,17,20,.07);
          border-radius: 14px;
          padding: 10px;
          background: #fbfbfc;
        }
        .statV2 span {
          display: block;
          font-size: 11px;
          letter-spacing: .06em;
          text-transform: uppercase;
          font-weight: 700;
          color: #808089;
        }
        .statV2 strong {
          margin-top: 2px;
          display: block;
          font-size: 24px;
          color: #111114;
          line-height: 1.1;
        }
        .feedHeadV2 {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 8px;
          margin-bottom: 10px;
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
          border: 1px solid rgba(17,17,20,.07);
          border-radius: 14px;
          overflow: hidden;
          background: #fff;
        }
        .rowV2 {
          padding: 12px;
          position: relative;
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
          font-size: 18px;
          line-height: 1.3;
          letter-spacing: -.01em;
          font-weight: 800;
          color: #15151a;
          text-decoration: none;
          padding-right: 108px;
        }
        .rowPreviewV2 {
          margin: 6px 0 0;
          font-size: 14px;
          line-height: 1.6;
          color: #656574;
          padding-right: 108px;
        }
        .thumbV2 {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 92px;
          height: 72px;
          border-radius: 10px;
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
            font-size: 28px;
          }
          .statsRowV2 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .rowTitleV2,
          .rowPreviewV2 {
            padding-right: 0;
          }
          .thumbV2 {
            position: static;
            display: block;
            margin-top: 10px;
            width: 100%;
            height: 170px;
          }
        }
      `}</style>
    </div>
  );
}
