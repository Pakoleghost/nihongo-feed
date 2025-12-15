"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";


type ApplicationStatus = "none" | "pending" | "approved" | "rejected";

const APPLICATION_SUBMITTED_KEY = "nhf_application_submitted_at";

function markRecentlySubmitted() {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(APPLICATION_SUBMITTED_KEY, String(Date.now()));
  } catch {}
}

function wasRecentlySubmitted(ms: number): boolean {
  try {
    if (typeof window === "undefined") return false;
    const raw = window.localStorage.getItem(APPLICATION_SUBMITTED_KEY);
    const t = raw ? Number(raw) : NaN;
    if (!Number.isFinite(t)) return false;
    return Date.now() - t <= ms;
  } catch {
    return false;
  }
}

function clearRecentlySubmitted() {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(APPLICATION_SUBMITTED_KEY);
  } catch {}
}

function normalizeDateInput(v: any): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

function normalizeJlpt(v: any): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s === "none") return null;
  return s;
}

export default function PendingApprovalPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ApplicationStatus>("none");
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [draft, setDraft] = useState<any | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const draftRef = useRef<any | null>(null);

  // keep a ref so async code can read the latest draft without effect loops
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  // Load saved draft once. Do NOT depend on `draft` here.
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem("nhf_application_draft");
      if (raw) setDraft(JSON.parse(raw));
    } catch {}

    setDraftLoaded(true);
  }, []);

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

  // Run status check after initial draft load.
  useEffect(() => {
    if (!draftLoaded) return;
    if (!authReady) return;
    if (!userId) {
      setChecked(true);
      return;
    }

    const checkStatus = async () => {
      setChecked(false);

      const { data: profile } = await supabase
        .from("profiles")
        .select("approved,is_admin")
        .eq("id", userId)
        .single();

      if (profile?.is_admin) {
        clearRecentlySubmitted();
        window.location.href = "/notifications";
        return;
      }

      if (profile?.approved) {
        clearRecentlySubmitted();
        window.location.href = "/";
        return;
      }

      const { data: app } = await supabase
        .from("applications")
        .select("id,status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!app) {
        // If the user just submitted on the previous screen, the row can take a moment to appear.
        // Avoid showing a second confusing form.
        if (wasRecentlySubmitted(5 * 60 * 1000)) {
          setStatus("pending");
          setChecked(true);
          return;
        }
        setStatus("none");
        setChecked(true);
        return;
      }

      setStatus(app.status as ApplicationStatus);
      setChecked(true);
    };

    checkStatus();
  }, [draftLoaded, authReady, userId]);

  // While pending, poll for approval and then send the user to the feed (no re-login).
  useEffect(() => {
    if (!authReady) return;
    if (!userId) return;
    if (status !== "pending") return;

    let alive = true;
    const tick = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("approved,is_admin")
        .eq("id", userId)
        .single();

      if (!alive) return;

      if (profile?.is_admin) {
        clearRecentlySubmitted();
        window.location.href = "/notifications";
        return;
      }

      if (profile?.approved) {
        clearRecentlySubmitted();
        // Keep the session. Just move them into the app.
        window.location.href = "/";
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (status === "pending" || status === "approved") {
      setLoading(false);
      return;
    }

    const form = new FormData(e.currentTarget);

    const toStringOrNull = (value: FormDataEntryValue | null): string | null => {
      if (value === null) return null;
      if (typeof value === "string") return value;
      return value.toString();
    };

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user = session?.user ?? null;

    if (!user) {
      setError("You are not authenticated.");
      setLoading(false);
      return;
    }

    const raw = {
      full_name: toStringOrNull(form.get("full_name")),
      campus: toStringOrNull(form.get("campus")),
      class_level: toStringOrNull(form.get("class_level")),
      jlpt_level: toStringOrNull(form.get("jlpt_level")),
      date_of_birth: toStringOrNull(form.get("date_of_birth")),
      gender: toStringOrNull(form.get("gender")),
    };

    const payload = {
      full_name: (raw.full_name ?? "").toString().trim(),
      campus: (raw.campus ?? "").toString().trim(),
      class_level: (raw.class_level ?? "").toString().trim(),
      jlpt_level: normalizeJlpt(raw.jlpt_level),
      date_of_birth: normalizeDateInput(raw.date_of_birth),
      gender: (raw.gender ?? "").toString().trim(),
    };

    if (!payload.full_name || !payload.campus || !payload.class_level || !payload.date_of_birth || !payload.gender) {
      setError("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    // Check if application exists
    const { data: existingApp } = await supabase
      .from("applications")
      .select("id,status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingApp) {
      // Update existing application
      const { error: updateError } = await supabase
        .from("applications")
        .update({
          full_name: payload.full_name,
          campus: payload.campus,
          class_level: payload.class_level,
          jlpt_level: payload.jlpt_level,
          date_of_birth: payload.date_of_birth,
          gender: payload.gender,
          status: "pending",
        })
        .eq("id", existingApp.id);

      if (updateError) {
        setError(`Failed to update your application: ${updateError.message}`);
        setLoading(false);
        return;
      }
    } else {
      // Insert new application via RPC (server-side)
      const { error: rpcError } = await supabase.rpc("create_application", {
        full_name: payload.full_name,
        campus: payload.campus,
        class_level: payload.class_level,
        jlpt_level: payload.jlpt_level,
        date_of_birth: payload.date_of_birth,
        gender: payload.gender,
      });

      if (rpcError) {
        setError(`Failed to submit application: ${rpcError.message}`);
        setLoading(false);
        return;
      }
    }

    markRecentlySubmitted();

    window.localStorage.removeItem("nhf_application_draft");
    setDraft(null);
    setStatus("pending");
    setLoading(false);
  }

  if (!draftLoaded || !authReady || (userId && !checked)) {
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

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <form
        onSubmit={handleSubmit}
        style={{ width: "100%", maxWidth: 420, display: "grid", gap: 12 }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Student application</h1>

        <input name="full_name" required placeholder="Full name" defaultValue={draft?.full_name ?? ""} />
        <input name="campus" required placeholder="Campus" defaultValue={draft?.campus ?? ""} />
        <input name="class_level" required placeholder="Class / level" defaultValue={draft?.class_level ?? ""} />

        <select name="jlpt_level" defaultValue={draft?.jlpt_level ?? ""}>
          <option value="">JLPT level</option>
          <option value="none">None</option>
          <option value="N5">N5</option>
          <option value="N4">N4</option>
          <option value="N3">N3</option>
          <option value="N2">N2</option>
          <option value="N1">N1</option>
        </select>

        <input type="date" name="date_of_birth" required defaultValue={draft?.date_of_birth ?? ""} />

        <select name="gender" required defaultValue={draft?.gender ?? ""}>
          <option value="">Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="non-binary">Non-binary</option>
          <option value="prefer-not">Prefer not to say</option>
        </select>

        {error && <p style={{ color: "crimson", fontSize: 12 }}>{error}</p>}

        <button disabled={loading} style={{ marginTop: 8 }}>
          {loading ? "Submitting…" : "Submit application"}
        </button>

        <p style={{ fontSize: 12, opacity: 0.6 }}>
          Your account will remain inactive until an administrator approves your application.
        </p>
      </form>
    </main>
  );
}