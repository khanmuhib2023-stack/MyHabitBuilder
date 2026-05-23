"use client";

import HabitLogsImportPanel from "@/components/settings/HabitLogsImportPanel";
import { downloadHabitLogsTemplate } from "@/lib/exportUtils";
import { ui } from "@/lib/uiClasses";

const cardBtn = `w-full px-4 py-3 text-left text-sm font-medium ${ui.settingsBtn}`;

export default function DataImportExportSection() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          Import
        </h2>
        <p className="mt-1 text-sm text-[var(--foreground)]/50">
          Import habit logs from CSV. Imports add data only — nothing is deleted.
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/45">
          Import
        </h3>
        <HabitLogsImportPanel />
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/45">
          Template
        </h3>
        <button
          type="button"
          className={cardBtn}
          onClick={downloadHabitLogsTemplate}
        >
          Download Habit Logs CSV Template
        </button>
      </div>
    </section>
  );
}
