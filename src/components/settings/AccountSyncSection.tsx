"use client";

import { useState } from "react";
import { useSyncCode } from "@/components/providers/SyncCodeProvider";
import { useAppData } from "@/components/providers/AppDataProvider";
import Link from "next/link";
import {
  exportAllDataBackupJson,
  exportCategoriesCsv,
  exportCommentsCsv,
  exportHabitLogsCsv,
  exportHabitsCsv,
} from "@/lib/exportUtils";
import { ui } from "@/lib/uiClasses";
import { missingSupabaseConfigMessage } from "@/lib/syncCodeErrors";

const cardBtn = `w-full px-4 py-3 text-left text-sm font-medium ${ui.settingsBtn}`;

export default function AccountSyncSection() {
  const { syncCode, clearSyncCode, configured } = useSyncCode();
  const {
    isSynced,
    saving,
    dataLoading,
    error,
    uploadLocalToCloud,
    downloadCloudToDevice,
    clearError,
  } = useAppData();
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const run = async (fn: () => Promise<string>) => {
    setSyncMessage(null);
    clearError();
    const msg = await fn();
    setSyncMessage(msg);
    window.setTimeout(() => setSyncMessage(null), 5000);
  };

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Sync code
          </h2>
          <p className="mt-1 text-sm text-[var(--foreground)]/50">
            {syncCode
              ? `Connected with code “${syncCode}”`
              : "Enter a sync code to share data across devices."}
          </p>
        </div>
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200/90">
          Temporary testing mode: anyone with your sync code can access this
          data. Not for production use.
        </p>
        {!configured ? (
          <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200/90">
            {missingSupabaseConfigMessage()}
          </p>
        ) : null}
        {syncCode ? (
          <button
            type="button"
            onClick={() => clearSyncCode()}
            className="rounded-xl border border-[var(--foreground)]/12 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--foreground)]/8"
          >
            Switch sync code
          </button>
        ) : (
          <Link
            href="/login"
            className="inline-block rounded-xl bg-[var(--foreground)] px-4 py-2.5 text-sm font-medium text-[var(--background)] transition hover:opacity-90"
          >
            Enter sync code
          </Link>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Data sync
          </h2>
          <p className="mt-1 text-sm text-[var(--foreground)]/50">
            {isSynced
              ? "Connected: data loads from Supabase for your sync code."
              : "No sync code: data is stored only in this browser."}
          </p>
        </div>

        <div className={`px-4 py-3 text-sm text-[var(--foreground)]/70 ${ui.surfaceInset}`}>
          <p className="font-medium text-[var(--foreground)]">Storage status</p>
          <p className="mt-1 text-[var(--foreground)]/55">
            {isSynced ? "Cloud (sync code)" : "Local only"}
          </p>
        </div>

        {(dataLoading || saving) && (
          <p className="text-sm text-[var(--foreground)]/50">
            {dataLoading ? "Loading your data…" : "Saving…"}
          </p>
        )}
        {error ? (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300/90">
            {error}
          </p>
        ) : null}
        {syncMessage ? (
          <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200/90">
            {syncMessage}
          </p>
        ) : null}

        {syncCode ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className={cardBtn}
              disabled={saving}
              onClick={() => void run(uploadLocalToCloud)}
            >
              Upload local data to cloud
            </button>
            <button
              type="button"
              className={cardBtn}
              disabled={saving}
              onClick={() => void run(downloadCloudToDevice)}
            >
              Download cloud data to this device
            </button>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Export
          </h2>
          <p className="mt-1 text-sm text-[var(--foreground)]/50">
            Download CSV or JSON backups from data on this device.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" className={cardBtn} onClick={exportHabitLogsCsv}>
            Export Habit Logs CSV
          </button>
          <button type="button" className={cardBtn} onClick={exportHabitsCsv}>
            Export Habits CSV
          </button>
          <button type="button" className={cardBtn} onClick={exportCommentsCsv}>
            Export Comments CSV
          </button>
          <button type="button" className={cardBtn} onClick={exportCategoriesCsv}>
            Export Categories CSV
          </button>
          <button
            type="button"
            className={`${cardBtn} sm:col-span-2`}
            onClick={exportAllDataBackupJson}
          >
            Export All Data Backup JSON
          </button>
        </div>
      </section>
    </div>
  );
}
