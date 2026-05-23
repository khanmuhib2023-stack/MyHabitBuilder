"use client";

import { useSyncCode } from "@/components/providers/SyncCodeProvider";

/** Development-only sync diagnostics (no secrets exposed). */
export default function AuthDebugPanel() {
  if (process.env.NODE_ENV !== "development") return null;

  const { syncCode, configured, configStatus, loading } = useSyncCode();

  return (
    <section className="space-y-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
      <h2 className="text-sm font-semibold text-amber-200/90">
        Sync debug (development only)
      </h2>
      <dl className="space-y-1 text-xs text-[var(--foreground)]/65">
        <div className="flex justify-between gap-4">
          <dt>NEXT_PUBLIC_SUPABASE_URL</dt>
          <dd className="font-mono">
            {configStatus.urlSet ? `set (${configStatus.urlHost})` : "missing"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>NEXT_PUBLIC_SUPABASE_ANON_KEY</dt>
          <dd className="font-mono">
            {configStatus.keySet ? "set (hidden)" : "missing"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Configured</dt>
          <dd className="font-mono">{configured ? "yes" : "no"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Loading</dt>
          <dd className="font-mono">{loading ? "yes" : "no"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Sync code</dt>
          <dd className="truncate font-mono text-right">
            {syncCode ?? "—"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
