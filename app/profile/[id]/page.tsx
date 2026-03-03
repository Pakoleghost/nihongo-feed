"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getPostParts } from "@/lib/feed-utils";

function AvatarPlaceholder({ size = 96 }: { size?: number }) {
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
  const router = useRouter();
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

    const { data: target } = await supabase.from("profiles").select("*").eq("id", profileId).single();
    setProfile(target);

    const { data: userPosts } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", profileId)
      .order("created_at", { ascending: false });
    setPosts(userPosts || []);
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const isMe = myId === profileId;
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const stats = useMemo(
    () => ({
      postCount: posts.length,
      portfolioCount: posts.filter((p) => p.type === "post" && !p.parent_assignment_id).length,
      taskCount: posts.filter((p) => p.type === "assignment" || p.parent_assignment_id).length,
    }),
    [posts],
  );
  const shownPosts = useMemo(
    () =>
      posts.filter((p) =>
        viewMode === "portfolio"
          ? p.type === "post" && !p.parent_assignment_id
          : p.type === "assignment" || Boolean(p.parent_assignment_id),
      ),
    [posts, viewMode],
  );

  if (loading || !profile) {
    return <div style={{ padding: "110px 16px", textAlign: "center", color: "#9ca3af" }}>Cargando perfil…</div>;
  }

  return (
    <>
      <div className="profilePage">
        <div className="profileShell">
          <header className="profileTop">
            <Link href="/" className="topGhost">← Volver</Link>
            <div className="topActions">
              {isMe && <Link href="/profile/edit" className="topPill">Editar perfil</Link>}
              {isMe && <button type="button" onClick={handleSignOut} className="topPill">Cerrar sesión</button>}
              <Link href="/write" className="topPrimary">Escribir</Link>
            </div>
          </header>

          <main className="profileGrid">
            <section className="profileCard">
              <div className="profileHeader">
                {isMe ? (
                  <Link
                    href="/profile/edit"
                    className="avatarWrap avatarClickable"
                    aria-label="Cambiar foto de perfil"
                    style={{
                      width: 110,
                      height: 110,
                      minWidth: 110,
                      minHeight: 110,
                      maxWidth: 110,
                      maxHeight: 110,
                      borderRadius: 999,
                      overflow: "hidden",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="avatarImg"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <AvatarPlaceholder size={98} />
                    )}
                    <span className="avatarEditBadge">Cambiar</span>
                  </Link>
                ) : (
                  <div
                    className="avatarWrap"
                    style={{
                      width: 110,
                      height: 110,
                      minWidth: 110,
                      minHeight: 110,
                      maxWidth: 110,
                      maxHeight: 110,
                      borderRadius: 999,
                      overflow: "hidden",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="avatarImg"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <AvatarPlaceholder size={98} />
                    )}
                  </div>
                )}

                <div className="profileMainInfo">
                  <div className="profileEyebrow">Perfil</div>
                  <h1 className="profileName">{profile.full_name || profile.username || "Usuario"}</h1>
                  <p className="profileHandle">
                    @{profile.username || "sin-username"}
                    {profile.group_name ? ` · ${profile.group_name}` : ""}
                    {profile.is_admin ? " · Sensei" : ""}
                  </p>

                  {profile.bio && <p className="profileBio">{profile.bio}</p>}

                  <div className="statsRow">
                    <div className="statCard">
                      <span className="statLabel">Publicaciones</span>
                      <strong className="statValue">{stats.postCount}</strong>
                    </div>
                    <div className="statCard">
                      <span className="statLabel">Portafolio</span>
                      <strong className="statValue">{stats.portfolioCount}</strong>
                    </div>
                    <div className="statCard">
                      <span className="statLabel">Tareas</span>
                      <strong className="statValue">{stats.taskCount}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="postsSection">
              <div className="sectionHeader">
                <div>
                  <div className="sectionEyebrow">Archivo</div>
                  <h2 className="sectionTitle">{viewMode === "portfolio" ? "Portafolio" : "Tareas y entregas"}</h2>
                </div>
                <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                  <div className="sectionBadge">{shownPosts.length} items</div>
                  <div style={{ display: "inline-flex", gap: 4, border: "1px solid rgba(17,17,20,.08)", borderRadius: 999, padding: 3, background: "#fff" }}>
                    <button type="button" onClick={() => setViewMode("portfolio")} style={{ border: 0, borderRadius: 999, padding: "6px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer", color: viewMode === "portfolio" ? "#fff" : "#666a73", background: viewMode === "portfolio" ? "#111114" : "transparent" }}>Portafolio</button>
                    <button type="button" onClick={() => setViewMode("tasks")} style={{ border: 0, borderRadius: 999, padding: "6px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer", color: viewMode === "tasks" ? "#fff" : "#666a73", background: viewMode === "tasks" ? "#111114" : "transparent" }}>Tareas</button>
                  </div>
                </div>
              </div>

              {shownPosts.length === 0 ? (
                <div className="emptyState">Todavía no hay publicaciones.</div>
              ) : (
                <div className="postListCard">
                  {shownPosts.map((post, idx) => {
                    const { title, preview } = getPostParts(post.content || "");
                    return (
                    <article key={post.id} className="postRow" style={{ borderBottom: idx === posts.length - 1 ? "none" : "1px solid rgba(17,17,20,.06)" }}>
                        <div className="postRowContent">
                          <div className="postRowMeta">
                            <span>{formatDate(post.created_at)}</span>
                            {post.is_reviewed && <span className="sumiTag">済 Sumi</span>}
                          </div>
                          <Link href={`/post/${post.id}`} className="postRowTitle">
                            {title || "Sin título"}
                          </Link>
                          {preview && <p className="postRowPreview">{preview}</p>}
                        </div>

                        {post.image_url && (
                          <Link href={`/post/${post.id}`} className="thumbLink" aria-label="Abrir publicación">
                            <img src={post.image_url} alt="" className="thumbImg" />
                          </Link>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </main>
        </div>
      </div>

      <style jsx>{`
        .profilePage {
          min-height: 100vh;
          background: radial-gradient(900px 420px at 50% -10%, rgba(88, 168, 255, 0.07), transparent 65%), #f6f7f8;
          padding: 14px;
        }
        .profileShell {
          max-width: 1180px;
          margin: 0 auto;
        }
        .profileTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          position: sticky;
          top: 0;
          z-index: 10;
          background: rgba(246, 247, 248, 0.82);
          backdrop-filter: blur(10px);
          padding: 10px 0;
        }
        .topActions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .topGhost,
        .topPill {
          border: 1px solid rgba(17, 17, 20, 0.1);
          background: #fff;
          color: #222;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 13px;
          text-decoration: none;
        }
        .topPrimary {
          text-decoration: none;
          color: #fff;
          background: linear-gradient(135deg, #34c5a6, #25a98f);
          border-radius: 999px;
          padding: 9px 14px;
          font-size: 13px;
          font-weight: 700;
          box-shadow: 0 8px 18px rgba(44, 182, 150, 0.18);
        }
        .profileGrid {
          display: grid;
          gap: 14px;
          grid-template-columns: minmax(0, 1fr);
        }
        .profileCard,
        .postsSection {
          background: #fff;
          border: 1px solid rgba(17, 17, 20, 0.07);
          border-radius: 20px;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.035);
        }
        .profileCard {
          padding: 18px;
        }
        .profileHeader {
          display: grid;
          grid-template-columns: 110px minmax(0, 1fr);
          gap: 16px;
          align-items: start;
        }
        .avatarWrap {
          width: 110px;
          height: 110px;
          border-radius: 999px;
          overflow: hidden;
          display: grid;
          place-items: center;
          border: 2px solid #fff;
          box-shadow: 0 0 0 1px rgba(17, 17, 20, 0.08);
          background: #f8f8f8;
          position: relative;
          text-decoration: none;
        }
        .avatarClickable { cursor: pointer; }
        .avatarClickable:hover .avatarEditBadge { opacity: 1; transform: translateY(0); }
        .avatarImg {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .avatarEditBadge {
          position: absolute;
          left: 50%;
          bottom: 6px;
          transform: translate(-50%, 4px);
          opacity: 0.95;
          background: rgba(17, 17, 20, 0.75);
          color: #fff;
          border-radius: 999px;
          padding: 4px 8px;
          font-size: 10px;
          font-weight: 700;
          line-height: 1;
          transition: 120ms ease;
          white-space: nowrap;
        }
        .profileEyebrow {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #7a7a84;
          font-weight: 800;
          margin-bottom: 6px;
        }
        .profileMainInfo {
          min-width: 0;
        }
        .profileName {
          margin: 0;
          font-size: 28px;
          line-height: 1.1;
          letter-spacing: -0.02em;
          color: #111114;
        }
        .profileHandle {
          margin: 8px 0 0;
          font-size: 13px;
          color: #767680;
        }
        .profileBio {
          margin: 14px 0 0;
          font-size: 14px;
          line-height: 1.65;
          color: #33343a;
          white-space: pre-wrap;
        }
        .statsRow {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 16px;
        }
        .statCard {
          border: 1px solid rgba(17, 17, 20, 0.07);
          background: #fbfbfc;
          border-radius: 14px;
          padding: 12px;
        }
        .statLabel {
          display: block;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #7a7a84;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .statValue {
          font-size: 22px;
          line-height: 1;
          color: #17171b;
        }
        .postsSection {
          padding: 14px;
        }
        .sectionHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 4px 2px 12px;
        }
        .sectionEyebrow {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #7a7a84;
          font-weight: 800;
        }
        .sectionTitle {
          margin: 4px 0 0;
          font-size: 24px;
          line-height: 1;
          color: #111114;
          letter-spacing: -0.02em;
        }
        .sectionBadge {
          border: 1px solid rgba(17,17,20,.07);
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          color: #666a73;
          background: #f6f7f8;
          font-weight: 600;
        }
        .emptyState {
          border: 1px dashed rgba(17,17,20,.12);
          border-radius: 14px;
          padding: 20px;
          text-align: center;
          color: #8a8a94;
          background: #fcfcfd;
          font-size: 14px;
        }
        .postListCard {
          border: 1px solid rgba(17,17,20,.06);
          border-radius: 16px;
          overflow: hidden;
          background: #fff;
        }
        .postRow {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 10px;
          padding: 14px;
          background: #fff;
        }
        .postRowContent {
          flex: 1;
          min-width: 0;
        }
        .postRowMeta {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #7c7c85;
          font-size: 12px;
          margin-bottom: 8px;
        }
        .sumiTag {
          border: 1px solid #2cb696;
          color: #2cb696;
          border-radius: 6px;
          font-weight: 700;
          font-size: 10px;
          padding: 1px 6px;
        }
        .postRowTitle {
          display: block;
          color: #17171b;
          text-decoration: none;
          font-size: 17px;
          font-weight: 800;
          line-height: 1.3;
          letter-spacing: -0.01em;
          margin-bottom: 8px;
        }
        .postRowPreview {
          margin: 0;
          color: #666a73;
          font-size: 13.5px;
          line-height: 1.55;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .thumbLink {
          width: 100%;
          height: 180px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(17,17,20,.06);
          background: #f5f5f5;
          display: block;
        }
        .thumbImg {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        @media (min-width: 900px) {
          .profilePage {
            padding: 18px 22px 28px;
          }
          .profileCard {
            padding: 22px;
          }
          .profileHeader {
            grid-template-columns: 130px minmax(0, 1fr);
            gap: 20px;
            align-items: start;
          }
          .avatarWrap {
            width: 124px;
            height: 124px;
          }
          .profileName {
            font-size: 34px;
          }
          .postsSection {
            padding: 16px;
          }
          .statsRow {
            grid-template-columns: repeat(3, minmax(0, 170px));
          }
          .postRow {
            grid-template-columns: minmax(0, 1fr) 148px;
            gap: 14px;
            align-items: start;
          }
          .thumbLink {
            width: 148px;
            height: 104px;
          }
        }
      `}</style>
    </>
  );
}
