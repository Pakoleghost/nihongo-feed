import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Missing Supabase environment variables. Using mock client.");
}

export const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
}) : {
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  from: () => ({
    select: () => ({
      eq: () => ({ maybeSingle: async () => ({ data: null, error: null }), order: () => ({ limit: async () => ({ data: [], error: null }) }) }),
      gte: () => ({ order: () => ({ order: () => ({ limit: async () => ({ data: [], error: null }) }) }), in: () => ({ order: () => ({ order: () => ({ limit: async () => ({ data: [], error: null }) }) }) }) }),
    }),
    upsert: async () => ({ error: null }),
  }),
} as any;
