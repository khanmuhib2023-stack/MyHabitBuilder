import type { FlexCategory } from "@/lib/categoryUtils";
import type { HabitDefinition } from "@/lib/flexHabitTypes";
import type { ValuesByDate } from "@/lib/flexHabitStorage";
import type { HabitComment } from "@/lib/types";

export type SyncCodeBundle = {
  definitions: HabitDefinition[];
  values: ValuesByDate;
  categories: FlexCategory[];
  comments: HabitComment[];
};

function storageKey(syncCode: string): string {
  return `mhb_bundle_${syncCode}`;
}

export function loadSyncCodeBundle(syncCode: string): SyncCodeBundle | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(syncCode));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SyncCodeBundle;
    if (!parsed || !Array.isArray(parsed.definitions)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSyncCodeBundle(
  syncCode: string,
  bundle: SyncCodeBundle
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(syncCode), JSON.stringify(bundle));
}

export function mergeSyncCodeBundle(
  syncCode: string,
  patch: Partial<SyncCodeBundle>
): void {
  const existing = loadSyncCodeBundle(syncCode) ?? {
    definitions: [],
    values: {},
    categories: [],
    comments: [],
  };
  saveSyncCodeBundle(syncCode, {
    definitions: patch.definitions ?? existing.definitions,
    values: patch.values ?? existing.values,
    categories: patch.categories ?? existing.categories,
    comments: patch.comments ?? existing.comments,
  });
}
