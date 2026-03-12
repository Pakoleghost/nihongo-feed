"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();
  const [msg, setMsg] = useState("Entrando…");

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
          .select("is_approved, username")
          .eq("id", userId)
          .maybeSingle();

        if (profileError) {
          console.error("auth callback profile read failed:", profileError.message);
          // If profile lookup fails, fall back to pending which can handle onboarding states.
          router.replace("/pending");
          return;
        }

        const approved = Boolean(profile?.is_approved);
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
        console.error("auth callback fatal:", e);
        router.replace("/login");
      }
    })();
  }, [router]);

  return (
    <main style={{ padding: 24 }}>
      <p>{msg}</p>
    </main>
  );
}
