"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ApplicationStatus = "none" | "pending" | "approved" | "rejected";

export default function PendingApprovalPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ApplicationStatus>("none");
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<any | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem("nhf_application_draft");
        if (raw) setDraft(JSON.parse(raw));
      } catch {}
    }

    const checkStatus = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("approved")
        .eq("id", user.id)
        .single();

      if (profile?.approved) {
        window.location.href = "/";
        return;
      }

      const { data: app } = await supabase
        .from("applications")
        .select("id,status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!app && draft) {
        // Auto-submit draft
        const { data: insertData, error: insertError } = await supabase
          .from("applications")
          .insert({
            user_id: user.id,
            full_name: draft.full_name ?? null,
            campus: draft.campus ?? null,
            class_level: draft.class_level ?? null,
            jlpt_level: draft.jlpt_level ?? null,
            date_of_birth: draft.date_of_birth ?? null,
            gender: draft.gender ?? null,
          })
          .select("status")
          .single();

        if (insertError) {
          setError("Failed to auto-submit your saved application draft. Please try submitting the form manually.");
          setStatus("none");
          return;
        }

        window.localStorage.removeItem("nhf_application_draft");
        setStatus("pending");
      } else if (!app) {
        setStatus("none");
      } else {
        setStatus(app.status as ApplicationStatus);
      }
    };

    checkStatus();
  }, [draft]);

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
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You are not authenticated.");
      setLoading(false);
      return;
    }

    const payload = draft ?? {
      full_name: toStringOrNull(form.get("full_name")),
      campus: toStringOrNull(form.get("campus")),
      class_level: toStringOrNull(form.get("class_level")),
      jlpt_level: toStringOrNull(form.get("jlpt_level")),
      date_of_birth: toStringOrNull(form.get("date_of_birth")),
      gender: toStringOrNull(form.get("gender")),
    };

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
        .update({ ...payload, status: "pending" })
        .eq("id", existingApp.id);

      if (updateError) {
        setError("Failed to update your application. Please try again.");
        setLoading(false);
        return;
      }
    } else {
      // Insert new application
      const { error: insertError } = await supabase.from("applications").insert({
        user_id: user.id,
        ...payload,
      });

      if (insertError) {
        setError("Failed to submit application. Please try again.");
        setLoading(false);
        return;
      }
    }

    window.localStorage.removeItem("nhf_application_draft");
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

  if (draft && status === "none") {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, marginBottom: 12 }}>Pending approval</h1>
          <p style={{ opacity: 0.7 }}>
            Your application has been received.<br />
            Please wait for administrator approval.
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

        <input name="full_name" required placeholder="Full name" />
        <input name="campus" required placeholder="Campus" />
        <input name="class_level" required placeholder="Class / level" />

        <select name="jlpt_level" required>
          <option value="">JLPT level</option>
          <option value="none">None</option>
          <option value="N5">N5</option>
          <option value="N4">N4</option>
          <option value="N3">N3</option>
          <option value="N2">N2</option>
          <option value="N1">N1</option>
        </select>

        <input type="date" name="date_of_birth" required />

        <select name="gender" required>
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