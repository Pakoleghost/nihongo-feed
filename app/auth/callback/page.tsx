"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell, { authStyles } from "@/components/auth/AuthShell";
import { supabase } from "@/lib/supabase";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Error desconocido";
}

export default function AuthCallback() {
  const router = useRouter();
  const [msg] = useState("Entrando…");

  useEffect(() => {
    (async () => {
      try {
        // Supabase email links usually include ?code=...
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("exchangeCodeForSession failed:", error.message);
          }
        }

        // At this point, session should exist if exchange succeeded
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        if (!session) {
          router.replace("/login");
          return;
        }

        // After auth, decide where to send the user based on their profile.
        const userId = session.user.id;

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("is_approved, is_admin")
          .eq("id", userId)
          .maybeSingle();

        if (profileError) {
          console.error("auth callback profile read failed:", profileError.message);
          // If profile lookup fails, fall back to pending which can handle onboarding states.
          router.replace("/pending");
          return;
        }

        const approved = Boolean(profile?.is_approved || profile?.is_admin);

        // Not approved (or no profile yet) -> pending flow.
        if (!approved) {
          router.replace("/pending");
          return;
        }

        // Approved + username set.
        router.replace("/dashboard");
      } catch (e: unknown) {
        console.error("auth callback fatal:", getErrorMessage(e));
        router.replace("/login");
      }
    })();
  }, [router]);

  return (
    <AuthShell
      title="Entrando"
      subtitle="Estamos preparando tu sesión."
    >
      <div className={authStyles.message}>{msg}</div>
    </AuthShell>
  );
}
