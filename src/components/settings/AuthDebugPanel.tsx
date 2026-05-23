"use client";

import { useAuth } from "@/components/providers/AuthProvider";

/** Development-only auth diagnostics (no secrets exposed). */
export default function AuthDebugPanel() {
  if (process.env.NODE_ENV !== "development") return null;

  const { user, session, configured, configStatus, loading } = useAuth();

  return (
    <section className="space-y-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
      <h2 className="text-sm font-semibold text-amber-200/90">
        Auth debug (development only)
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
          <dt>Auth loading</dt>
          <dd className="font-mono">{loading ? "yes" : "no"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Session</dt>
          <dd className="font-mono">{session ? "active" : "none"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>User email</dt>
          <dd className="truncate font-mono text-right">
            {user?.email ?? "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>User id</dt>
          <dd className="truncate font-mono text-right text-[10px]">
            {user?.id ?? "—"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
