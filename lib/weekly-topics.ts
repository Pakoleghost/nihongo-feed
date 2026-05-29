import { TEMAS_SEMANA } from "@/lib/temas-semana";

export type WeeklyTopic = {
  kana: string;       // Japanese title
  prompt: string;     // Spanish prompt for students
};

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Rotates through TEMAS_SEMANA by ISO week — guaranteed to have detail. */
export function getWeeklyTopic(): WeeklyTopic {
  const week = getISOWeekNumber(new Date());
  const tema = TEMAS_SEMANA[week % TEMAS_SEMANA.length];
  return { kana: tema.kana, prompt: tema.prompt };
}

// Fetch the admin override from Supabase (returns null if table empty or missing)
export async function fetchTopicOverride(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient: any,
): Promise<WeeklyTopic | null> {
  try {
    const { data, error } = await supabaseClient
      .from("weekly_topic_override")
      .select("kana, prompt")
      .eq("id", 1)
      .single();
    if (error || !data) return null;
    return { kana: data.kana as string, prompt: data.prompt as string };
  } catch {
    return null;
  }
}

// Upsert the admin override (id = 1 is the single row)
export async function saveTopicOverride(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient: any,
  topic: WeeklyTopic,
  userId: string,
): Promise<boolean> {
  try {
    const { error } = await supabaseClient
      .from("weekly_topic_override")
      .upsert({ id: 1, kana: topic.kana, prompt: topic.prompt, updated_by: userId, updated_at: new Date().toISOString() });
    return !error;
  } catch {
    return false;
  }
}
