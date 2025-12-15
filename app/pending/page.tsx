"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";


type ApplicationStatus = "none" | "pending" | "approved" | "rejected";

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

      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        const nextUid = session?.user?.id ?? null;
        if (!alive) return;
        if (nextUid) setUserId(nextUid);
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
    if (!userId) return;

    const checkStatus = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("approved,is_admin")
        .eq("id", userId)
        .single();

      if (profile?.is_admin) {
        window.location.href = "/notifications";
        return;
      }

      if (profile?.approved) {
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
        setStatus("none");
        return;
      }

      setStatus(app.status as ApplicationStatus);
    };

    checkStatus();
  }, [draftLoaded, authReady, userId]);

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

    window.localStorage.removeItem("nhf_application_draft");
    setDraft(null);
    setStatus("pending");
    setLoading(false);
  }

  if (status === "pending") {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, marginBottom: 12 }}>Pending approval</h1>
          <p style={{ opacity: 0.7 }}>
            Your application is under review.<br />
            You will be notified once an administrator approves your account.
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