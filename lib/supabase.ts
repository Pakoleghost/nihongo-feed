import { createClient } from "@supabase/supabase-js";

// All pages in this app are "use client" — no Server Components read auth state.
// localStorage persists across PWA close/reopen on iOS, unlike session cookies
// which are wiped when the PWA process is terminated.

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      storageKey: "nihongo-auth",
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
