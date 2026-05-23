"use client";

import Link from "next/link";
import { useSyncCode } from "@/components/providers/SyncCodeProvider";

export default function UserMenu() {
  const { syncCode, loading, clearSyncCode } = useSyncCode();

  if (loading) {
    return (
      <span className="text-xs text-[var(--foreground)]/40">…</span>
    );
  }

  if (!syncCode) {
    return (
      <Link
        href="/login"
        className="rounded-full px-3 py-2 text-sm font-medium text-[var(--foreground)]/55 transition hover:bg-[var(--foreground)]/8 hover:text-[var(--foreground)]"
      >
        Sync code
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        className="max-w-[120px] truncate text-xs text-[var(--foreground)]/50"
        title={syncCode}
      >
        {syncCode}
      </span>
      <button
        type="button"
        onClick={() => clearSyncCode()}
        className="rounded-full px-3 py-2 text-sm font-medium text-[var(--foreground)]/55 transition hover:bg-[var(--foreground)]/8 hover:text-[var(--foreground)]"
      >
        Switch code
      </button>
    </div>
  );
}
