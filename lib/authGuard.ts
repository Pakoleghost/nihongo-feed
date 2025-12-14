import { supabase } from "./supabase";

export async function requireSession(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id ?? null;

  if (!uid) {
    alert("Session expired. Please log in again.");
    return null;
  }

  return uid;
}
