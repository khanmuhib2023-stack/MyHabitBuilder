const SYNC_CODE_STORAGE_KEY = "mhb_sync_code";

/** Normalize for consistent matching across devices. */
export function normalizeSyncCode(raw: string): string {
  return raw.trim().toLowerCase();
}

export function loadStoredSyncCode(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SYNC_CODE_STORAGE_KEY);
  if (!raw) return null;
  const normalized = normalizeSyncCode(raw);
  return normalized || null;
}

export function saveSyncCode(code: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SYNC_CODE_STORAGE_KEY, normalizeSyncCode(code));
}

export function clearStoredSyncCode(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SYNC_CODE_STORAGE_KEY);
}
