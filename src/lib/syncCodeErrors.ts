export const SYNC_MESSAGES = {
  configError: "App configuration error: Supabase is not connected.",
  codeRequired: "Enter a sync code.",
  codeTooShort: "Sync code must be at least 4 characters.",
  connected: "Connected. Your data will sync with this code.",
  loadFailed: "Could not load your data. Check the sync code and try again.",
} as const;

export function missingSupabaseConfigMessage(): string {
  return SYNC_MESSAGES.configError;
}
