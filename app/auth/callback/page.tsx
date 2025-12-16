"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();
  const [msg, setMsg] = useState("Signing you in…");

  useEffect(() => {
    (async () => {
      try {
        // Supabase email links usually include ?code=...
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setMsg(`Auth error: ${error.message}`);
            return;
          }
        }

        // At this point, session should exist if exchange succeeded
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        if (!session) {
          setMsg("No session found. Redirecting to login…");
          router.replace("/login");
          return;
        }

        // After auth, decide where to send the user based on their profile.
        const userId = session.user.id;

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("approved, username")
          .eq("id", userId)
          .maybeSingle();

        if (profileError) {
          // If profile lookup fails, fall back to pending which can handle onboarding states.
          router.replace("/pending");
          return;
        }

        const approved = Boolean(profile?.approved);
        const username = (profile?.username ?? "").toString().trim();

        if (approved && !username) {
          router.replace("/pick-username");
          return;
        }

        // Not approved (or no profile yet) -> pending flow.
        if (!approved) {
          router.replace("/pending");
          return;
        }

        // Approved + username set.
        router.replace("/");
      } catch (e: any) {
        setMsg(`Callback failed: ${e?.message ?? "unknown error"}`);
      }
    })();
  }, [router]);

  return (
    <main style={{ padding: 24 }}>
      <p>{msg}</p>
    </main>
  );
}