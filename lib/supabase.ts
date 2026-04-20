import { createBrowserClient } from "@supabase/ssr";

// createBrowserClient stores the session in cookies so that middleware can
// read and refresh it on every request — fixing the "logged out on app close"
// issue that localStorage-only storage causes in Next.js App Router.
//
// The singleton pattern is safe here: all consumers are "use client" components
// running in the same browser tab, so there is only ever one user per instance.

let _client: ReturnType<typeof createBrowserClient> | undefined;

export function getSupabaseClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}

// Named export kept for drop-in compatibility with all existing imports:
//   import { supabase } from "@/lib/supabase"
export const supabase = getSupabaseClient();
