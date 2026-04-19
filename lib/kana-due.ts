import { getKanaProgressStorageKey } from "@/lib/kana-progress";

export function getDueKanaCount(userKey: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(getKanaProgressStorageKey(userKey));
    if (!raw) return 0;
    const map = JSON.parse(raw) as Record<
      string,
      { next_due_at?: number | null; timesSeen?: number }
    >;
    return Object.values(map).filter(
      (e) =>
        (e.timesSeen ?? 0) > 0 &&
        e.next_due_at !== null &&
        e.next_due_at !== undefined &&
        e.next_due_at <= Date.now()
    ).length;
  } catch {
    return 0;
  }
}
