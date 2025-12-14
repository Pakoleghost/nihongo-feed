"use client";

import BottomNav from "@/components/BottomNav";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function NotificationsPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const myProfileHref = userId ? `/profile/${encodeURIComponent(userId)}` : "/";

  return (
    <>
      <main style={{ minHeight: "100vh", padding: 16, color: "#fff", paddingBottom: 80 }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>Notifications</h2>
          <p style={{ marginTop: 10, opacity: 0.7 }}>
            Notifications will appear here.
          </p>
        </div>
      </main>

      <BottomNav profileHref={myProfileHref} />
    </>
  );
}