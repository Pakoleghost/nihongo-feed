"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ApplicationStatus = "pending" | "rejected";

export default function PendingApprovalPage() {
  const [status, setStatus] = useState<ApplicationStatus>("pending");
  const [checked, setChecked] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Auth hydration (local + first load). Use session + auth state changes.
  useEffect(() => {
    let alive = true;

    const boot = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;

      if (!alive) return;

      if (uid) {
        setUserId(uid);
        setAuthReady(true);
        return;
      }

      // No session on first load.
      setSessionExpired(true);

      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        const nextUid = session?.user?.id ?? null;
        if (!alive) return;
        if (nextUid) {
          setUserId(nextUid);
          setSessionExpired(false);
        }
        setAuthReady(true);
      });

      return () => sub.subscription.unsubscribe();
    };

    const cleanupPromise = boot();

    return () => {
      alive = false;
      Promise.resolve(cleanupPromise).then((fn) => (typeof fn === "function" ? fn() : null));
    };
  }, []);

  // Check status after auth hydration.
  useEffect(() => {
    if (!authReady) return;
    if (!userId) {
      setChecked(true);
      return;
    }

    const checkStatus = async () => {
      setChecked(false);

      const { data: profile } = await supabase
        .from("profiles")
        .select("approved,is_admin,username")
        .eq("id", userId)
        .single();

      const username = (profile?.username ?? "").toString().trim();

      if (profile?.is_admin) {
        window.location.href = "/notifications";
        return;
      }

      if (profile?.approved) {
        window.location.href = username ? "/" : "/pick-username";
        return;
      }

      const { data: app } = await supabase
        .from("applications")
        .select("id,status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (app?.status === "rejected") {
        setStatus("rejected");
        setChecked(true);
        return;
      }

      // Default: pending (covers none, pending, approved not yet propagated, or missing application row)
      setStatus("pending");
      setChecked(true);
    };

    checkStatus();
  }, [authReady, userId]);

  // While pending, poll for approval and then send the user to the feed (no re-login).
  useEffect(() => {
    if (!authReady) return;
    if (!userId) return;
    if (status !== "pending") return;

    let alive = true;
    const tick = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("approved,is_admin,username")
        .eq("id", userId)
        .single();

      const username = (profile?.username ?? "").toString().trim();

      if (!alive) return;

      if (profile?.is_admin) {
        window.location.href = "/notifications";
        return;
      }

      if (profile?.approved) {
        // Keep the session. Just move them into the app.
        window.location.href = username ? "/" : "/pick-username";
      }
    };

    // Run once quickly, then poll.
    tick();
    const id = window.setInterval(tick, 4000);

    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [authReady, userId, status]);

  async function goToLogin() {
    try {
      await supabase.auth.signOut();
    } catch {}
    window.location.href = "/";
  }

  if (!authReady || (userId && !checked)) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, marginBottom: 12 }}>Loading…</h1>
          <p style={{ opacity: 0.7 }}>Please wait.</p>
        </div>
      </main>
    );
  }

  if (sessionExpired) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, marginBottom: 12 }}>Session expired</h1>
          <p style={{ opacity: 0.7 }}>
            Please log in again to continue.<br />
            If your application is already approved, you will go straight to the feed.
          </p>
          <button onClick={goToLogin} style={{ marginTop: 14 }}>
            Go to login
          </button>
        </div>
      </main>
    );
  }

  if (status === "pending") {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, marginBottom: 12 }}>Pending approval</h1>
          <p style={{ opacity: 0.7 }}>
            Your application is under review.<br />
            Once an administrator approves your account, you will be sent to the feed automatically.
          </p>
        </div>
      </main>
    );
  }

  if (status === "rejected") {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, marginBottom: 12 }}>Application rejected</h1>
          <p style={{ opacity: 0.7 }}>
            Your application was not approved.<br />
            Please contact an administrator if you believe this is a mistake.
          </p>
        </div>
      </main>
    );
  }

  // Default screen (no form here)
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <h1 style={{ fontSize: 22, marginBottom: 12 }}>Pending approval</h1>
        <p style={{ opacity: 0.7 }}>
          Your account is under review.<br />
          Once an administrator approves your account, you will be sent into the app automatically.
        </p>
      </div>
    </main>
  );
}