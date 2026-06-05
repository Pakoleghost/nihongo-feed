/**
 * Kana progress sync — localStorage ↔ Supabase
 *
 * Strategy:
 * - localStorage is the fast local cache (always read/written first)
 * - Supabase is the persistent backup (synced on load and on session end)
 * - Merge: take max(level) per item so no progress is ever lost
 */

import { supabase } from "@/lib/supabase";
import {
  loadKanaProgress,
  saveKanaProgress,
  type KanaProgressMap,
  type KanaProgressEntry,
} from "@/lib/kana-progress";

// ─── Merge ────────────────────────────────────────────────────────────────────

/**
 * Merge two KanaProgressMaps, keeping the best progress per item.
 * "Best" = higher level. Ties broken by more timesCorrect.
 */
export function mergeKanaProgress(
  local: KanaProgressMap,
  remote: KanaProgressMap
): KanaProgressMap {
  const merged: KanaProgressMap = { ...local };

  for (const id of Object.keys(remote)) {
    const r = remote[id];
    const l = local[id];

    if (!l) {
      // Item only in remote — adopt it
      merged[id] = r;
      continue;
    }

    // Keep whichever has the higher level; ties go to more timesCorrect
    if (
      r.level > l.level ||
      (r.level === l.level && r.timesCorrect > l.timesCorrect)
    ) {
      merged[id] = {
        ...r,
        // Accumulate counts from both sides (avoid double-counting by taking max)
        timesSeen:    Math.max(r.timesSeen,    l.timesSeen),
        timesCorrect: Math.max(r.timesCorrect, l.timesCorrect),
        timesWrong:   Math.max(r.timesWrong,   l.timesWrong),
        timesAlmost:  Math.max(r.timesAlmost,  l.timesAlmost),
      };
    }
  }

  return merged;
}

// ─── Load (sync on mount) ─────────────────────────────────────────────────────

/**
 * Call once when the kana section mounts.
 * 1. Reads localStorage (instant, no await needed by caller)
 * 2. Fetches Supabase row in background
 * 3. Merges and writes back to localStorage + Supabase
 * 4. Calls `onUpdate(merged)` so the UI can refresh
 *
 * If the user is not logged in, does nothing extra.
 */
export async function syncKanaProgressOnLoad(
  userId: string,
  userKey: string,
  onUpdate?: (merged: KanaProgressMap) => void
): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("kana_progress")
      .select("progress")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.warn("[kana-sync] fetch error:", error.message);
      return;
    }

    const remote: KanaProgressMap =
      data?.progress && typeof data.progress === "object"
        ? (data.progress as KanaProgressMap)
        : {};

    const local = loadKanaProgress(userKey);

    // Nothing remote → nothing to merge (local already authoritative)
    if (Object.keys(remote).length === 0) {
      // Still upsert local → Supabase so it gets backed up
      if (Object.keys(local).length > 0) {
        await _upsertToSupabase(userId, local);
      }
      return;
    }

    const merged = mergeKanaProgress(local, remote);

    // Only write back if the merge actually changed something
    const mergedStr = JSON.stringify(merged);
    const localStr  = JSON.stringify(local);

    if (mergedStr !== localStr) {
      saveKanaProgress(userKey, merged);
      onUpdate?.(merged);
    }

    // Always push merged back to Supabase to keep it up to date
    await _upsertToSupabase(userId, merged);
  } catch (err) {
    console.warn("[kana-sync] unexpected error:", err);
  }
}

// ─── Save (call after each quiz session) ─────────────────────────────────────

/**
 * Save the current localStorage progress to Supabase.
 * Call this after every quiz session ends.
 * Fire-and-forget — errors are swallowed so they never break the UI.
 */
export async function saveKanaProgressToSupabase(
  userId: string,
  userKey: string
): Promise<void> {
  try {
    const local = loadKanaProgress(userKey);
    if (Object.keys(local).length === 0) return;
    await _upsertToSupabase(userId, local);
  } catch (err) {
    console.warn("[kana-sync] save error:", err);
  }
}

// ─── Internal ─────────────────────────────────────────────────────────────────

async function _upsertToSupabase(
  userId: string,
  progress: KanaProgressMap
): Promise<void> {
  const { error } = await supabase.from("kana_progress").upsert(
    { user_id: userId, progress, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) {
    console.warn("[kana-sync] upsert error:", error.message);
  }
}
