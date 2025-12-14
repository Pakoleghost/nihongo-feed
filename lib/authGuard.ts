import { supabase } from "./supabase";

/**
 * Ensures a Supabase session exists before performing a write.
 * Returns the user id when available, otherwise shows a unified
 * "Session expired" message and resolves to null.
 */
export async function requireSession(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error("Failed to check session", error);
    alert("Session expired. Please log in again.");
    return null;
  }

  const uid = data.session?.user?.id ?? null;

  if (!uid) {
    alert("Session expired. Please log in again.");
    return null;
  }

  return uid;
}
