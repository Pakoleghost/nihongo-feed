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
          setMsg("No session found. Try logging in again.");
          return;
        }

        // If user is not approved yet, send them to the pending page.
        // This keeps the UX consistent after email confirmation.
        const uid = session.user?.id;
        if (uid) {
          const { data: prof, error: profErr } = await supabase
            .from("profiles")
            .select("approved")
            .eq("id", uid)
            .maybeSingle();

          if (profErr) {
            // Don't block login for profile fetch issues
            console.warn("Profile lookup failed in callback:", profErr);
          } else {
            const approved = Boolean((prof as any)?.approved);
            if (!approved) {
              router.replace("/pending");
              return;
            }
          }
        }

        // Approved users continue into the app
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