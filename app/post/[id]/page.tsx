"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as htmlToImage from "html-to-image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";

type PostRow = {
  id: string | number;
  content: string | null;
  created_at: string;
  user_id: string;
  image_url: string | null;
};

type MiniProfile = { username: string | null; avatar_url: string | null };

type CommentRow = {
  id: string;
  created_at: string;
  user_id: string;
  post_id: string | number;
  content: string | null;
  parent_comment_id: string | null;
  likeCount?: number;
  likedByMe?: boolean;
};

export default function PostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const postId = params?.id;
  const postIdNum = postId ? Number(postId) : null;

  const searchParams = useSearchParams();
  const highlightCommentId = searchParams?.get("c") ?? null;

  const commentInputRef = useRef<HTMLInputElement | null>(null);
  const shareCardRef = useRef<HTMLDivElement | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<{ commentId: string; username: string } | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<MiniProfile | null>(null);

  const [post, setPost] = useState<PostRow | null>(null);
  const [postAuthor, setPostAuthor] = useState<MiniProfile | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [likedByMe, setLikedByMe] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [commentLikeBusyById, setCommentLikeBusyById] = useState<Record<string, boolean>>({});

  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentAuthors, setCommentAuthors] = useState<Record<string, MiniProfile>>({});

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const reloadComments = useCallback(async () => {
    if (!postIdNum || !Number.isFinite(postIdNum)) return;
    const { data: cs, error: cErr } = await supabase
      .from("comments")
      .select("id, created_at, user_id, post_id, content, parent_comment_id")
      .eq("post_id", postIdNum)
      .order("created_at", { ascending: true });

    if (cErr) throw cErr;
    setComments((cs as CommentRow[]) ?? []);

    // Hydrate comment like counts + my-like state
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? null;

      const commentIds = Array.from(new Set(((cs as any[]) ?? []).map((x) => x?.id).filter(Boolean).map(String)));
      if (commentIds.length) {
        const { data: likeRows } = await supabase
          .from("comment_likes")
          .select("comment_id, user_id")
          .in("comment_id", commentIds as any);

        const map = new Map<string, { count: number; mine: boolean }>();
        for (const id of commentIds) map.set(String(id), { count: 0, mine: false });

        (likeRows ?? []).forEach((r: any) => {
          const key = String(r.comment_id);
          const cur = map.get(key);
          if (!cur) return;
          cur.count += 1;
          if (uid && r.user_id === uid) cur.mine = true;
          map.set(key, cur);
        });

        setComments((prev) =>
          (prev ?? []).map((c) => {
            const v = map.get(String(c.id));
            if (!v) return c;
            return { ...c, likeCount: v.count, likedByMe: v.mine };
          })
        );
      }
    } catch {
      // ignore hydration failures
    }

    const ids = Array.from(new Set(((cs as any[]) ?? []).map((x) => x?.user_id).filter(Boolean)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, username, avatar_url").in("id", ids);
      const map: Record<string, MiniProfile> = {};
      (profs as any[] | null)?.forEach((pp) => {
        if (!pp?.id) return;
        map[String(pp.id)] = { username: pp.username ?? null, avatar_url: pp.avatar_url ?? null };
      });
      setCommentAuthors(map);
    } else {
      setCommentAuthors({});
    }
  }, [postIdNum]);

  const reloadLikes = useCallback(async () => {
    if (!postIdNum || !Number.isFinite(postIdNum)) return;
    const { count, error } = await supabase
      .from("likes")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postIdNum);

    if (error) throw error;
    setLikeCount(count ?? 0);
  }, [postIdNum]);

  const reloadMyLike = useCallback(async () => {
    if (!postIdNum || !Number.isFinite(postIdNum)) return;
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) {
      setLikedByMe(false);
      return;
    }

    const { data, error } = await supabase
      .from("likes")
      .select("id")
      .eq("post_id", postIdNum)
      .eq("user_id", uid)
      .maybeSingle();

    if (error) throw error;
    setLikedByMe(!!data);
  }, [postIdNum]);

  const addComment = useCallback(async () => {
    if (!postIdNum || !Number.isFinite(postIdNum)) return;
    const t = commentText.trim();
    if (!t) return;

    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return alert("Session expired. Please log in again.");

    setCommentBusy(true);
    try {
      const parentId = replyTo ? replyTo.commentId : null;

      // 1) Insert comment and get its id for deep-link highlighting
      const { data: inserted, error } = await supabase
        .from("comments")
        .insert({
          post_id: postIdNum,
          user_id: uid,
          content: t,
          parent_comment_id: parentId,
        })
        .select("id")
        .single();

      if (error) throw error;
      const newCommentId = (inserted as any)?.id ? String((inserted as any).id) : null;

      // 2) Best-effort notifications
      try {
        // Post owner
        const postOwnerId = post?.user_id ? String(post.user_id) : null;

        // Parent comment owner (if reply)
        let parentOwnerId: string | null = null;
        if (parentId) {
          const { data: parentRow } = await supabase
            .from("comments")
            .select("user_id")
            .eq("id", parentId)
            .maybeSingle();
          parentOwnerId = (parentRow as any)?.user_id ? String((parentRow as any).user_id) : null;
        }

        const notifInserts: any[] = [];

        // Comment notification to post owner
        if (postOwnerId && postOwnerId !== uid && newCommentId) {
          notifInserts.push({
            user_id: postOwnerId,
            actor_id: uid,
            post_id: postIdNum,
            comment_id: newCommentId,
            type: "comment",
            read: false,
          });
        }

        // Reply notification to parent comment owner
        if (
          parentOwnerId &&
          parentOwnerId !== uid &&
          parentOwnerId !== postOwnerId &&
          newCommentId
        ) {
          notifInserts.push({
            user_id: parentOwnerId,
            actor_id: uid,
            post_id: postIdNum,
            comment_id: newCommentId,
            type: "reply",
            read: false,
          });
        }

        if (notifInserts.length) {
          await supabase.from("notifications").insert(notifInserts);
        }
      } catch {
        // ignore notification failures
      }

      setCommentText("");
      setReplyTo(null);
      await reloadComments();
      await reloadLikes();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to add comment.");
    } finally {
      setCommentBusy(false);
    }
  }, [commentText, postIdNum, post, reloadComments, reloadLikes, replyTo]);

  const deleteComment = useCallback(
    async (commentId: string) => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return alert("Session expired. Please log in again.");

      const ok = confirm("Delete this comment?");
      if (!ok) return;

      const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("user_id", uid);
      if (error) return alert(error.message);

      await reloadComments();
      await reloadLikes();
    },
    [reloadComments, reloadLikes]
  );

  const toggleLike = useCallback(async () => {
    if (!postIdNum || !Number.isFinite(postIdNum)) return;

    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return alert("Session expired. Please log in again.");

    if (likeBusy) return;
    setLikeBusy(true);

    try {
      if (likedByMe) {
        const { error } = await supabase.from("likes").delete().eq("post_id", postIdNum).eq("user_id", uid);
        if (error) throw error;
        setLikedByMe(false);
        setLikeCount((c) => Math.max(0, (c ?? 0) - 1));
      } else {
        const { error } = await supabase.from("likes").insert({ post_id: postIdNum, user_id: uid });
        if (error) throw error;
        setLikedByMe(true);
        setLikeCount((c) => (c ?? 0) + 1);
      }

      // Sync with DB in case of race conditions.
      await reloadLikes();
      await reloadMyLike();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to update like.");
      // Re-sync state.
      try {
        await reloadLikes();
        await reloadMyLike();
      } catch {
        // ignore
      }
    } finally {
      setLikeBusy(false);
    }
  }, [likedByMe, likeBusy, postIdNum, reloadLikes, reloadMyLike]);

  const toggleCommentLike = useCallback(
    async (comment: CommentRow) => {
      const cid = String(comment.id);
      if (commentLikeBusyById[cid]) return;

      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return alert("Session expired. Please log in again.");

      setCommentLikeBusyById((p) => ({ ...p, [cid]: true }));

      const wasLiked = !!comment.likedByMe;

      // optimistic UI
      setComments((prev) =>
        (prev ?? []).map((c) => {
          if (String(c.id) !== cid) return c;
          const liked = !wasLiked;
          const nextCount = Math.max(0, (c.likeCount ?? 0) + (liked ? 1 : -1));
          return { ...c, likedByMe: liked, likeCount: nextCount };
        })
      );

      try {
        if (wasLiked) {
          const { error } = await supabase
            .from("comment_likes")
            .delete()
            .eq("comment_id", cid)
            .eq("user_id", uid);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("comment_likes").insert({ comment_id: cid, user_id: uid });
          if (error) {
            const msg = (error.message || "").toLowerCase();
            const code = (error as any).code;
            if (!(code === "23505" || msg.includes("duplicate") || msg.includes("unique"))) {
              throw error;
            }
          }

          // notify comment owner (best-effort)
          try {
            const ownerId = comment.user_id ? String(comment.user_id) : null;
            if (ownerId && ownerId !== uid) {
              await supabase.from("notifications").insert({
                user_id: ownerId,
                actor_id: uid,
                post_id: postIdNum,
                comment_id: cid,
                type: "comment_like",
                read: false,
              });
            }
          } catch {
            // ignore
          }
        }
      } catch (e: any) {
        console.error(e);
        alert(e?.message ?? "Failed to update comment like.");
        // re-sync
        try {
          await reloadComments();
        } catch {
          // ignore
        }
      } finally {
        setCommentLikeBusyById((p) => ({ ...p, [cid]: false }));
      }
    },
    [commentLikeBusyById, postIdNum, reloadComments]
  );

  const startReply = useCallback((commentId: string, username: string) => {
    const handle = `@${(username || "unknown").toString()} `;
    setReplyTo({ commentId, username: username || "unknown" });
    setCommentText(handle);
    setTimeout(() => {
      try {
        commentInputRef.current?.focus();
      } catch {
        // ignore
      }
    }, 0);
  }, []);

  const clearReply = useCallback(() => {
    setReplyTo(null);
    setCommentText((prev) => {
      const p = (prev ?? "").toString();
      // If the box only contains an @mention prefix, clear it.
      if (/^@\S+\s*$/.test(p.trim())) return "";
      return p;
    });
  }, []);

useEffect(() => {
  if (!highlightCommentId) return;

  let cancelled = false;
  let attempts = 0;

  const tryScroll = () => {
    if (cancelled) return;
    attempts += 1;

    const el = document.getElementById(`c-${highlightCommentId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Retry a few times while comments/render settle.
    if (attempts < 25) {
      setTimeout(tryScroll, 80);
    }
  };

  // Start soon, but not immediately.
  const t = setTimeout(tryScroll, 50);

  return () => {
    cancelled = true;
    clearTimeout(t);
  };
}, [highlightCommentId, comments.length]);

  // For BottomNav profile button
  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      if (!mounted) return;
      setUserId(uid);

      if (uid) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", uid)
          .maybeSingle();

        if (!mounted) return;
        setMyProfile((prof as MiniProfile) ?? null);
      } else {
        setMyProfile(null);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Load post + comments
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!postIdNum || !Number.isFinite(postIdNum)) return;

      setLoading(true);
      setErr(null);

      try {
        // 1) Post
        const { data: p, error: pErr } = await supabase
          .from("posts")
          .select("id, content, created_at, user_id, image_url")
          .eq("id", postIdNum)
          .maybeSingle();

        if (pErr) throw pErr;
        if (!p) {
          setPost(null);
          setErr("Post not found.");
          return;
        }
        if (!mounted) return;
        setPost(p as PostRow);

        // 2) Author
        const { data: a } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", (p as any).user_id)
          .maybeSingle();

        if (!mounted) return;
        setPostAuthor((a as MiniProfile) ?? null);

        // Likes (count)
        try {
          await reloadLikes();
        } catch (e) {
          // ignore count failures
        }
        // Likes (mine)
        try {
          await reloadMyLike();
        } catch {
          // ignore
        }

        // 3) Comments
        const { data: cs, error: cErr } = await supabase
          .from("comments")
          .select("id, created_at, user_id, post_id, content, parent_comment_id")
          .eq("post_id", postIdNum)
          .order("created_at", { ascending: true });

        if (cErr) throw cErr;
        if (!mounted) return;
        setComments((cs as CommentRow[]) ?? []);

        // 4) Comment authors (batch)
        const ids = Array.from(new Set(((cs as any[]) ?? []).map((x) => x?.user_id).filter(Boolean)));
        if (ids.length) {
          const { data: profs } = await supabase.from("profiles").select("id, username, avatar_url").in("id", ids);
          const map: Record<string, MiniProfile> = {};
          (profs as any[] | null)?.forEach((pp) => {
            if (!pp?.id) return;
            map[String(pp.id)] = { username: pp.username ?? null, avatar_url: pp.avatar_url ?? null };
          });
          if (!mounted) return;
          setCommentAuthors(map);
        } else {
          setCommentAuthors({});
        }
      } catch (e: any) {
        console.error(e);
        if (!mounted) return;
        setErr("Failed to load post.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [postIdNum, reloadLikes, reloadMyLike]);

  const myProfileHref = userId ? `/profile/${encodeURIComponent(userId)}` : "/";

  const title = "投稿"; // simple

  const { rootComments, childrenByParent } = useMemo(() => {
    const byParent: Record<string, CommentRow[]> = {};
    const roots: CommentRow[] = [];

    for (const c of comments) {
      const pid = c.parent_comment_id ? String(c.parent_comment_id) : "";
      if (!pid) {
        roots.push(c);
      } else {
        (byParent[pid] ||= []).push(c);
      }
    }

    return { rootComments: roots, childrenByParent: byParent };
  }, [comments]);

  const goToProfile = useCallback(
    (id: string) => {
      router.push(`/profile/${encodeURIComponent(String(id))}`);
    },
    [router]
  );

  const downloadShareCard = useCallback(async () => {
    if (!shareCardRef.current) return;

    try {
      const dataUrl = await htmlToImage.toPng(shareCardRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 3,
        cacheBust: true,
      });

      const link = document.createElement("a");
      link.download = `nihongo-feed-${postId ?? "post"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error(e);
      alert("Failed to generate image.");
    }
  }, [postId]);

  const renderComment = useCallback(
    (c: CommentRow, depth: number) => {
      const a = commentAuthors[String(c.user_id)];
      const uname = (a?.username ?? "user").toString();
      const isMine = userId && String(c.user_id) === String(userId);
      const isHi = highlightCommentId === c.id;
      const kids = childrenByParent[String(c.id)] ?? [];

      return (
        <div key={c.id}>
          <div
            id={`c-${c.id}`}
            style={{
              border: "1px solid rgba(17,17,20,.10)",
              borderRadius: 14,
              padding: 10,
              background: isHi ? "rgba(17,17,20,.08)" : "#fff",
              boxShadow: isHi ? "0 0 0 2px rgba(17,17,20,.14) inset" : "none",
              marginLeft: depth > 0 ? 14 : 0,
              borderLeft: depth > 0 ? "3px solid rgba(17,17,20,.08)" : undefined,
            }}
          >
            <button
              type="button"
              onClick={() => goToProfile(String(c.user_id))}
              style={{
                padding: 0,
                border: 0,
                background: "transparent",
                cursor: "pointer",
                fontWeight: 900,
                fontSize: 13,
                textAlign: "left",
                color: "inherit",
              }}
            >
              {`@${uname}`}
            </button>
            <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{c.content ?? ""}</div>
            <div style={{ marginTop: 6, display: "flex", gap: 12, alignItems: "center" }}>
              <button
                type="button"
                onClick={() => void toggleCommentLike(c)}
                disabled={!!commentLikeBusyById[String(c.id)]}
                style={{
                  padding: 0,
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 12,
                  opacity: commentLikeBusyById[String(c.id)] ? 0.5 : 0.85,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
                aria-label="Like comment"
                title="Like"
              >
                <span style={{ fontSize: 13 }}>{c.likedByMe ? "💙" : "🤍"}</span>
                <span style={{ opacity: 0.8 }}>いいね！</span>
                <span style={{ fontSize: 12, opacity: 0.7 }}>{c.likeCount ?? 0}</span>
              </button>

              <button
                type="button"
                onClick={() => startReply(c.id, uname)}
                style={{ padding: 0, border: 0, background: "transparent", cursor: "pointer", fontSize: 12, opacity: 0.7 }}
              >
                返信
              </button>

              {isMine ? (
                <button
                  type="button"
                  onClick={() => void deleteComment(c.id)}
                  style={{ padding: 0, border: 0, background: "transparent", cursor: "pointer", fontSize: 12, opacity: 0.7 }}
                >
                  削除
                </button>
              ) : null}
            </div>
          </div>

          {kids.length ? (
            <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
              {kids.map((k) => renderComment(k, depth + 1))}
            </div>
          ) : null}
        </div>
      );
    },
    [childrenByParent, commentAuthors, deleteComment, goToProfile, highlightCommentId, startReply, userId, toggleCommentLike, commentLikeBusyById]
  );

  return (
    <>
      <main className="feed" style={{ minHeight: "100vh", padding: 16, paddingBottom: 80 }}>
        <div className="header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>{title}</h2>
        </div>

        <div style={{ marginTop: 12 }}>
          {loading ? (
            <p style={{ margin: 0, opacity: 0.7 }}>Loading…</p>
          ) : err ? (
            <p style={{ margin: 0, opacity: 0.7 }}>{err}</p>
          ) : post ? (
            <div
              style={{
                border: "1px solid rgba(17,17,20,.10)",
                borderRadius: 16,
                background: "#fff",
                padding: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (post?.user_id) goToProfile(String(post.user_id));
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: 0,
                    border: 0,
                    background: "transparent",
                    cursor: post?.user_id ? "pointer" : "default",
                    textAlign: "left",
                    color: "inherit",
                  }}
                  aria-label="Open profile"
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 999,
                      overflow: "hidden",
                      border: "1px solid rgba(17,17,20,.10)",
                      background: "#fff",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 900,
                    }}
                  >
                    {postAuthor?.avatar_url ? (
                      <img
                        src={postAuthor.avatar_url}
                        alt={(postAuthor.username ?? "").toString()}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        loading="lazy"
                      />
                    ) : (
                      <span style={{ opacity: 0.8 }}>
                        {((postAuthor?.username ?? "?").toString().trim()[0] ?? "?").toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900 }}>{`@${(postAuthor?.username ?? "user").toString()}`}</div>
                    <div style={{ fontSize: 12, opacity: 0.6 }}>{new Date(post!.created_at).toLocaleString()}</div>
                  </div>
                </button>
              </div>

              {post.content ? <div style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{post.content}</div> : null}

              {post.image_url ? (
                <div style={{ marginTop: 12, overflow: "hidden", borderRadius: 14, border: "1px solid rgba(17,17,20,.10)" }}>
                  <img src={post.image_url} alt="post image" style={{ width: "100%", height: "auto", display: "block" }} />
                </div>
              ) : null}

              <div style={{ marginTop: 12, display: "flex", gap: 14, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => void toggleLike()}
                  disabled={likeBusy}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: likedByMe ? "1px solid rgba(17,17,20,.22)" : "1px solid rgba(17,17,20,.12)",
                    background: likedByMe ? "rgba(17,17,20,.07)" : "rgba(17,17,20,.03)",
                    fontSize: 13,
                    fontWeight: 900,
                    opacity: likeBusy ? 0.6 : 0.95,
                    cursor: likeBusy ? "default" : "pointer",
                    color: "inherit",
                  }}
                  aria-label={likedByMe ? "Unlike" : "Like"}
                >
                  <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>{likedByMe ? "♥" : "♡"}</span>
                  <span>{`いいね！ ${likeCount}`}</span>
                </button>
              </div>
              <div style={{ marginTop: 14, fontWeight: 900, opacity: 0.85 }}>コメント</div>

              {comments.length === 0 ? (
                <div style={{ marginTop: 8, opacity: 0.7 }}>まだコメントはありません。</div>
              ) : (
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {rootComments.map((c) => renderComment(c, 0))}
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                {replyTo ? (
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                    <span>{`@${replyTo.username} に返信中`}</span>
                    <button
                      type="button"
                      onClick={clearReply}
                      style={{ padding: 0, border: 0, background: "transparent", cursor: "pointer", fontSize: 12, opacity: 0.7 }}
                    >
                      やめる
                    </button>
                  </div>
                ) : null}

                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    ref={commentInputRef}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="コメントを書く…"
                    style={{
                      flex: 1,
                      border: "1px solid rgba(17,17,20,.10)",
                      borderRadius: 12,
                      padding: "10px 12px",
                      outline: "none",
                      background: "#fff",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void addComment()}
                    disabled={commentBusy || !commentText.trim()}
                    style={{
                      border: "1px solid rgba(17,17,20,.10)",
                      background: "#fff",
                      borderRadius: 12,
                      padding: "10px 12px",
                      fontWeight: 900,
                      cursor: commentBusy ? "default" : "pointer",
                      opacity: commentBusy ? 0.6 : 1,
                    }}
                  >
                    送信
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <div
          ref={shareCardRef}
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: 420,
            padding: 20,
            background: "#fff",
            borderRadius: 24,
            fontFamily: "inherit",
            color: "#111",
            pointerEvents: "none",
            opacity: 0,
            transform: "translateX(-200%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                overflow: "hidden",
                border: "1px solid rgba(17,17,20,.10)",
                display: "grid",
                placeItems: "center",
                fontWeight: 900,
              }}
            >
              {postAuthor?.avatar_url ? (
                <img
                  src={postAuthor.avatar_url}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  crossOrigin="anonymous"
                />
              ) : (
                <span>{((postAuthor?.username ?? "?")[0] ?? "?").toUpperCase()}</span>
              )}
            </div>
            <div style={{ fontWeight: 900 }}>{`@${postAuthor?.username ?? "user"}`}</div>
          </div>

          {post?.content ? (
            <div style={{ marginTop: 16, whiteSpace: "pre-wrap", fontSize: 15 }}>
              {post.content}
            </div>
          ) : null}

          {post?.image_url ? (
            <div style={{ marginTop: 16, overflow: "hidden", borderRadius: 18 }}>
              <img
                src={post.image_url}
                alt=""
                style={{ width: "100%", height: "auto", display: "block" }}
                crossOrigin="anonymous"
              />
            </div>
          ) : null}

          <div
            style={{
              marginTop: 20,
              fontSize: 12,
              opacity: 0.6,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>nihongo feed</span>
            <img src="/logo.png" alt="" style={{ height: 18 }} crossOrigin="anonymous" />
          </div>
        </div>
      </main>

      <BottomNav
        profileHref={myProfileHref}
        profileAvatarUrl={myProfile?.avatar_url ? myProfile.avatar_url : null}
        profileInitial={((myProfile?.username ?? "?").toString().trim()[0] ?? "?").toUpperCase()}
        viewerId={userId ?? ""}
      />
    </>
  );
}