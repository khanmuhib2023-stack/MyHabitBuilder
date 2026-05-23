"use client";

import { useEffect, useRef, useState } from "react";
import {
  buildImportPreview,
  executeHabitLogsImport,
  parseHabitLogsCsv,
  type ImportPreview,
  type ImportResult,
} from "@/lib/importUtils";
import { readFileAsText } from "@/lib/csvUtils";

const statusColors: Record<string, string> = {
  ready: "text-emerald-400/90",
  warning: "text-amber-400/90",
  error: "text-red-400/90",
  duplicate: "text-[var(--foreground)]/45",
};

type Props = {
  onImported?: () => void;
};

export default function HabitLogsImportPanel({ onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [createMissing, setCreateMissing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const onFile = async (file: File | null, createFlag = createMissing) => {
    setResult(null);
    setFileError(null);
    if (!file) {
      setPreview(null);
      return;
    }
    try {
      const text = await readFileAsText(file);
      const table = parseHabitLogsCsv(text);
      setPreview(buildImportPreview(table, createFlag));
    } catch {
      setFileError("Could not read that file.");
      setPreview(null);
    }
  };

  useEffect(() => {
    const file = fileRef.current?.files?.[0];
    if (file && preview) {
      void onFile(file, createMissing);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-preview when checkbox toggles
  }, [createMissing]);

  const importable =
    preview != null
      ? preview.rows.filter(
          (r) =>
            r.status === "ready" ||
            (r.status === "warning" && createMissing)
        ).length
      : 0;

  const runImport = () => {
    if (!preview) return;
    const res = executeHabitLogsImport(preview, createMissing);
    setResult(res);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
    onImported?.();
  };

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer flex-col gap-2 rounded-xl border border-dashed border-[var(--foreground)]/20 bg-[var(--foreground)]/[0.03] px-4 py-5 text-center transition hover:border-[var(--foreground)]/35">
        <span className="text-sm font-medium text-[var(--foreground)]">
          Choose Habit Logs CSV
        </span>
        <span className="text-xs text-[var(--foreground)]/45">
          date, time, habit_name, value, unit, count, comment, source
        </span>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-[var(--foreground)]/75">
        <input
          type="checkbox"
          checked={createMissing}
          onChange={(e) => setCreateMissing(e.target.checked)}
          className="size-4 rounded accent-[var(--foreground)]"
        />
        Create missing habits from CSV
      </label>

      {fileError ? (
        <p className="text-sm text-red-400/90">{fileError}</p>
      ) : null}

      {preview && preview.totalRows > 0 ? (
        <div className="space-y-3 rounded-xl border border-[var(--foreground)]/10 bg-[var(--foreground)]/[0.02] p-4">
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            <Stat label="Total rows" value={preview.totalRows} />
            <Stat label="Ready" value={preview.ready} />
            <Stat label="Warnings" value={preview.warning} />
            <Stat label="Errors" value={preview.error} />
            <Stat label="Duplicates" value={preview.duplicates} />
            <Stat label="Can import" value={importable} />
          </div>

          <div className="overflow-x-auto rounded-lg border border-[var(--foreground)]/8">
            <table className="w-full min-w-[32rem] text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--foreground)]/10 text-[var(--foreground)]/50">
                  <th className="px-2 py-2 font-medium">#</th>
                  <th className="px-2 py-2 font-medium">Habit</th>
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Time</th>
                  <th className="px-2 py-2 font-medium">Value</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 20).map((r) => (
                  <tr
                    key={r.rowNumber}
                    className="border-b border-[var(--foreground)]/5"
                  >
                    <td className="px-2 py-1.5 tabular-nums">{r.rowNumber}</td>
                    <td className="px-2 py-1.5">{r.habitName || "—"}</td>
                    <td className="px-2 py-1.5">{r.ymd || "—"}</td>
                    <td className="px-2 py-1.5">{r.timeLabel || "—"}</td>
                    <td className="px-2 py-1.5 tabular-nums">
                      {r.value ?? r.count ?? "—"}
                    </td>
                    <td className={`px-2 py-1.5 capitalize ${statusColors[r.status]}`}>
                      {r.status}
                      {r.message ? (
                        <span className="mt-0.5 block font-normal normal-case text-[var(--foreground)]/40">
                          {r.message}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.totalRows > 20 ? (
            <p className="text-[11px] text-[var(--foreground)]/40">
              Showing first 20 of {preview.totalRows} rows.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setResult(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="rounded-full px-4 py-2 text-sm font-medium text-[var(--foreground)]/60 hover:bg-[var(--foreground)]/8"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={importable === 0}
              onClick={runImport}
              className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--background)] enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Import valid rows ({importable})
            </button>
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100/90">
          <p className="font-medium">Import complete</p>
          <ul className="mt-1 list-inside list-disc text-xs text-emerald-100/75">
            <li>{result.imported} log{result.imported === 1 ? "" : "s"} added</li>
            {result.habitsCreated > 0 ? (
              <li>{result.habitsCreated} habit{result.habitsCreated === 1 ? "" : "s"} created</li>
            ) : null}
            {result.commentsAdded > 0 ? (
              <li>{result.commentsAdded} comment{result.commentsAdded === 1 ? "" : "s"} added</li>
            ) : null}
            {result.skippedDuplicates > 0 ? (
              <li>{result.skippedDuplicates} duplicate{result.skippedDuplicates === 1 ? "" : "s"} skipped</li>
            ) : null}
            {result.skippedErrors > 0 ? (
              <li>{result.skippedErrors} row{result.skippedErrors === 1 ? "" : "s"} skipped (errors)</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[var(--foreground)]/[0.04] px-2 py-1.5">
      <p className="text-[var(--foreground)]/45">{label}</p>
      <p className="font-medium tabular-nums text-[var(--foreground)]">{value}</p>
    </div>
  );
}
