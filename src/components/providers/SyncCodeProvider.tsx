"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { missingSupabaseConfigMessage } from "@/lib/syncCodeErrors";
import {
  clearStoredSyncCode,
  loadStoredSyncCode,
  normalizeSyncCode,
  saveSyncCode,
} from "@/lib/syncCodeStorage";
import {
  getSupabaseConfigStatus,
  isSupabaseConfigured,
} from "@/lib/supabaseClient";

export type SyncCodeResult = { error: string | null };

type SyncCodeContextValue = {
  syncCode: string | null;
  loading: boolean;
  configured: boolean;
  configStatus: ReturnType<typeof getSupabaseConfigStatus>;
  enterSyncCode: (code: string) => SyncCodeResult;
  clearSyncCode: () => void;
};

const SyncCodeContext = createContext<SyncCodeContextValue | null>(null);

const MIN_SYNC_CODE_LENGTH = 4;

export function SyncCodeProvider({ children }: { children: ReactNode }) {
  const [syncCode, setSyncCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();
  const configStatus = useMemo(() => getSupabaseConfigStatus(), []);

  useEffect(() => {
    setSyncCode(loadStoredSyncCode());
    setLoading(false);
  }, []);

  const enterSyncCode = useCallback(
    (raw: string): SyncCodeResult => {
      if (!configured) {
        return { error: missingSupabaseConfigMessage() };
      }
      const code = normalizeSyncCode(raw);
      if (!code) {
        return { error: "Enter a sync code." };
      }
      if (code.length < MIN_SYNC_CODE_LENGTH) {
        return { error: "Sync code must be at least 4 characters." };
      }
      saveSyncCode(code);
      setSyncCode(code);
      return { error: null };
    },
    [configured]
  );

  const clearSyncCode = useCallback(() => {
    clearStoredSyncCode();
    setSyncCode(null);
  }, []);

  const value = useMemo(
    () => ({
      syncCode,
      loading,
      configured,
      configStatus,
      enterSyncCode,
      clearSyncCode,
    }),
    [syncCode, loading, configured, configStatus, enterSyncCode, clearSyncCode]
  );

  return (
    <SyncCodeContext.Provider value={value}>{children}</SyncCodeContext.Provider>
  );
}

export function useSyncCode(): SyncCodeContextValue {
  const ctx = useContext(SyncCodeContext);
  if (!ctx) {
    throw new Error("useSyncCode must be used within SyncCodeProvider");
  }
  return ctx;
}
