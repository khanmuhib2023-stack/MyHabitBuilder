"use client";

import { useState } from "react";
import { useSyncCode } from "@/components/providers/SyncCodeProvider";
import { missingSupabaseConfigMessage, SYNC_MESSAGES } from "@/lib/syncCodeErrors";
import { ui } from "@/lib/uiClasses";

const inputClass = `mt-1 w-full px-3 py-2.5 text-sm ${ui.input}`;

const alertSuccess =
  "rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-200/90";

const alertWarning =
  "rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-200/90";

const alertError =
  "rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-300/90";

export default function SyncCodeForm() {
  const { enterSyncCode, configured } = useSyncCode();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSuccess(false);

    if (!configured) {
      setMessage(missingSupabaseConfigMessage());
      return;
    }

    setBusy(true);
    const result = enterSyncCode(code);
    setBusy(false);

    if (result.error) {
      setMessage(result.error);
      return;
    }

    setIsSuccess(true);
    setMessage(SYNC_MESSAGES.connected);
  };

  return (
    <div className="space-y-4">
      <p className={alertWarning}>
        <strong className="font-medium">Temporary testing mode.</strong> Anyone
        who knows your sync code can read or change this data. Do not use for
        sensitive or production data.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label
            htmlFor="sync-code"
            className="block text-sm font-medium text-[var(--foreground)]/80"
          >
            Sync code
          </label>
          <input
            id="sync-code"
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="e.g. muhib-1234"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={inputClass}
            disabled={busy}
          />
          <p className="mt-1.5 text-xs text-[var(--foreground)]/45">
            Use the same code on your laptop and phone to share habits.
          </p>
        </div>

        {message ? (
          <p className={isSuccess ? alertSuccess : alertError}>{message}</p>
        ) : null}

        <button
          type="submit"
          disabled={busy || !configured}
          className="w-full rounded-xl bg-[var(--foreground)] px-4 py-2.5 text-sm font-medium text-[var(--background)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Connecting…" : "Connect sync code"}
        </button>
      </form>
    </div>
  );
}
