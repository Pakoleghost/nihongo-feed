import { createClient } from "@supabase/supabase-js";

function getStorage() {
  if (typeof window !== "undefined") return window.localStorage;
  return undefined;
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      storageKey: "nihongo-auth",
      storage: getStorage(),
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
