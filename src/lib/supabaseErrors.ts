/** PostgREST: table not in schema cache (tables never created or wrong project). */
export function isSchemaMissingError(error: unknown): boolean {
  if (error == null || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  if (e.code === "PGRST205") return true;
  const msg = String(e.message ?? "").toLowerCase();
  return msg.includes("schema cache") || msg.includes("could not find the table");
}

/** User-facing message from Supabase/PostgREST errors. */
export function formatSupabaseError(error: unknown): string {
  if (error == null) return "Unknown error";

  if (typeof error === "object") {
    const e = error as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof e.message === "string" && e.message) parts.push(e.message);
    if (typeof e.details === "string" && e.details) parts.push(e.details);
    if (typeof e.hint === "string" && e.hint) parts.push(e.hint);
    if (typeof e.code === "string" && e.code) parts.push(`(${e.code})`);
    if (parts.length > 0) return parts.join(" — ");
  }

  if (error instanceof Error) return error.message;
  return String(error);
}
