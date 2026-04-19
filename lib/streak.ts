const STREAK_KEY = "app-streak";
const ACTIVITY_KEY = "app-last-activity";

type StreakData = { count: number; lastActiveDate: string };
type ActivityData = { label: string; path: string };

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24);
}

export function getStreak(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return 0;
    const data = JSON.parse(raw) as StreakData;
    const t = todayStr();
    if (data.lastActiveDate === t) return data.count;
    const diff = daysBetween(data.lastActiveDate, t);
    if (diff <= 1) return data.count; // yesterday — still alive
    return 0;
  } catch {
    return 0;
  }
}

export function markActiveToday(): void {
  if (typeof window === "undefined") return;
  try {
    const t = todayStr();
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) {
      localStorage.setItem(STREAK_KEY, JSON.stringify({ count: 1, lastActiveDate: t }));
      return;
    }
    const data = JSON.parse(raw) as StreakData;
    if (data.lastActiveDate === t) return;
    const diff = daysBetween(data.lastActiveDate, t);
    const count = diff <= 1 ? data.count + 1 : 1;
    localStorage.setItem(STREAK_KEY, JSON.stringify({ count, lastActiveDate: t }));
  } catch {}
}

export function getLastActivity(): ActivityData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    return raw ? (JSON.parse(raw) as ActivityData) : null;
  } catch {
    return null;
  }
}

export function setLastActivity(label: string, path: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify({ label, path }));
  } catch {}
}
