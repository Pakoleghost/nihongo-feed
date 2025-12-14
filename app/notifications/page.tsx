"use client";

import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type DbNotificationRow = {
  id: string;
  created_at: string;
  type: string | null;
  actor_id: string | null;
  post_id: number | null;
  message: string | null;
  read: boolean | null;
  actor_username?: string | null;
  actor_avatar_url?: string | null;
};

export default function NotificationsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<DbNotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async (uid: string) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        // Expect a table named `notifications` with at least: id, created_at, type, actor_id, post_id, message, read
        const { data, error } = await supabase
          .from("notifications")
          .select("id, created_at, type, actor_id, post_id, message, read")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          console.error("Notifications fetch error:", error);
          // Friendly guidance when the table/view isn't set up yet
          setErrorMsg(
            "Notifications table is not set up yet. Create a `notifications` table (or view) with columns: user_id, created_at, type, actor_id, post_id, message, read."
          );
          setItems([]);
          return;
        }

        if (!mounted) return;
        setItems((data as DbNotificationRow[]) ?? []);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      if (!mounted) return;
      setUserId(uid);
      if (uid) void load(uid);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) void load(uid);
      else {
        setItems([]);
        setErrorMsg(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const myProfileHref = userId ? `/profile/${encodeURIComponent(userId)}` : "/";

  const emptyHint = useMemo(() => {
    if (loading) return "Loading…";
    if (errorMsg) return errorMsg;
    return "No notifications yet.";
  }, [loading, errorMsg]);

  return (
    <>
      <main className="feed" style={{ minHeight: "100vh", padding: 16, paddingBottom: 80 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>Notifications</h2>
          <div style={{ marginTop: 10 }}>
            {items.length === 0 ? (
              <p style={{ margin: 0, opacity: 0.7 }}>{emptyHint}</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
                {items.map((n) => {
                  const when = new Date(n.created_at).toLocaleString();
                  const title = (n.type ?? "notification").toUpperCase();
                  return (
                    <li
                      key={n.id}
                      style={{
                        border: "1px solid rgba(17,17,20,.10)",
                        background: "#fff",
                        borderRadius: 14,
                        padding: 12,
                        opacity: n.read ? 0.7 : 1,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: 0.5, opacity: 0.8 }}>{title}</div>
                        <div style={{ fontSize: 12, opacity: 0.6 }}>{when}</div>
                      </div>

                      <div style={{ marginTop: 8, lineHeight: 1.35 }}>
                        {n.message ?? "(no message)"}
                      </div>

                      {n.post_id ? (
                        <div style={{ marginTop: 10 }}>
                          <Link
                            href={`/?post=${encodeURIComponent(String(n.post_id))}`}
                            style={{ fontSize: 12, textDecoration: "none", opacity: 0.85 }}
                          >
                            View post →
                          </Link>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </main>

<BottomNav
  profileHref={myProfileHref}
  profileAvatarUrl={myProfile?.avatar_url ?? null}
  profileInitial={(myProfile?.username?.[0] ?? "?").toUpperCase()}
/>    </>
  );
}