import { supabase } from "./supabase";

/**
 * Ensures a Supabase session exists and that the user
 * has been approved by an admin before accessing the app.
 *
 * Returns the user id when approved, otherwise redirects
 * to a pending approval screen.
 */
export async function requireApprovedSession(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.user) {
    alert("Session expired. Please log in again.");
    return null;
  }

  const uid = data.session.user.id;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", uid)
    .single();

  if (profileError || !profile) {
    console.error("Failed to load profile", profileError);
    alert("Unable to verify account status.");
    return null;
  }

  if (profile.status !== "approved") {
    window.location.href = "/pending";
    return null;
  }

  return uid;
}
