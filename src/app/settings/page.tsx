"use client";

import CategoryManager from "@/components/CategoryManager";
import AccountSyncSection from "@/components/settings/AccountSyncSection";
import DataImportExportSection from "@/components/settings/DataImportExportSection";

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-8 pb-16">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[var(--foreground)]/50">
          Manage your data, backups, and imports.
        </p>
      </header>

      <div className="space-y-10">
        <AccountSyncSection />
        <CategoryManager />
        <DataImportExportSection />
      </div>
    </main>
  );
}
