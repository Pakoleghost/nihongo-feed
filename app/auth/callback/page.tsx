"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  useEffect(() => {
    supabase.auth.getSession();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <p>Signing you in…</p>
    </main>
  );
}