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

        // Always send users to /pending after auth.
        // /pending is responsible for deciding whether to show the pending screen,
        // the application form, or redirect approved users into the app.
        router.replace("/pending");
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