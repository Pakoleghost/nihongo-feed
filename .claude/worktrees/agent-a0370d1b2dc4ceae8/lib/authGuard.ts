import { supabase } from "./supabase";

/**
 * Ensures a Supabase session exists and that the user
 * has been approved by an admin before accessing the app.
 *
 * Returns the user id when approved.
 * Throws NOT_APPROVED when the user is pending.
 */
export async function requireApprovedSession(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("NOT_AUTHENTICATED");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("approved")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("PROFILE_NOT_FOUND");
  }

  if (!profile.approved) {
    throw new Error("NOT_APPROVED");
  }

  return user.id;
}
