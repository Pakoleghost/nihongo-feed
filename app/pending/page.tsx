"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ApplicationStatus = "none" | "pending" | "approved" | "rejected";

export default function PendingApprovalPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ApplicationStatus>("none");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
        .select("status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!app) {
        setStatus("none");
      } else {
        setStatus(app.status as ApplicationStatus);
      }
    };

    checkStatus();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You are not authenticated.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("applications").insert({
      user_id: user.id,
      full_name: form.get("full_name"),
      campus: form.get("campus"),
      class_level: form.get("class_level"),
      jlpt_level: form.get("jlpt_level"),
      date_of_birth: form.get("date_of_birth"),
      gender: form.get("gender"),
    });

    if (insertError) {
      setError("Failed to submit application. Please try again.");
      setLoading(false);
      return;
    }

    setStatus("pending");
    setLoading(false);
  }

  if (status === "pending") {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, marginBottom: 12 }}>審査中</h1>
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