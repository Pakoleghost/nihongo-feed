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
        if (!data.session) {
          setMsg("No session found. Try logging in again.");
          return;
        }

        // Send user back to app
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