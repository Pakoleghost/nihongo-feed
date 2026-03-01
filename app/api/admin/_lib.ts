import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getAdminClients(authHeader: string | null) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    throw new Error("Supabase env vars missing for admin API.");
  }

  const requester = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });

  const service = createClient(supabaseUrl, supabaseServiceRoleKey);
  return { requester, service };
}

export async function assertAdmin(authHeader: string | null) {
  const { requester, service } = getAdminClients(authHeader);

  const {
    data: { user },
    error: userError,
  } = await requester.auth.getUser();

  if (userError || !user) {
    throw new Error("UNAUTHORIZED");
  }

  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.is_admin) {
    throw new Error("FORBIDDEN");
  }

  return { requester, service, adminUserId: user.id };
}

