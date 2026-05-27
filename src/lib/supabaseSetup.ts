import { getSupabase, getSupabaseConfigStatus } from "@/lib/supabaseClient";
import { isSchemaMissingError } from "@/lib/supabaseErrors";

export function getSupabaseProjectLabel(): string {
  const { urlHost } = getSupabaseConfigStatus();
  return urlHost ?? "your Supabase project";
}

export function schemaSetupInstructions(): string {
  const host = getSupabaseProjectLabel();
  return (
    `Database tables are missing on ${host}. ` +
    `Open Supabase Dashboard → SQL Editor → run the full script in ` +
    `supabase/schema.sql (from the app repo), then reload this page.`
  );
}

/** True if habits table is reachable via the API. */
export async function probeHabitsTable(): Promise<{
  ok: boolean;
  missing: boolean;
}> {
  const sb = getSupabase();
  if (!sb) return { ok: false, missing: false };

  const { error } = await sb.from("habits").select("id").limit(1);
  if (!error) return { ok: true, missing: false };
  if (isSchemaMissingError(error)) return { ok: false, missing: true };
  return { ok: false, missing: false };
}

/** Creates tables via security-definer RPC (works after bootstrap SQL was run once). */
export async function attemptEnsureTables(): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const { error } = await sb.rpc("ensure_habit_processor_tables");
  if (error) {
    console.warn("[ensure_habit_processor_tables]", error);
    return false;
  }

  const probe = await probeHabitsTable();
  return probe.ok;
}
