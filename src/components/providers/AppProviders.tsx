"use client";

import type { ReactNode } from "react";
import { SyncCodeProvider } from "@/components/providers/SyncCodeProvider";
import { AppDataProvider } from "@/components/providers/AppDataProvider";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SyncCodeProvider>
      <AppDataProvider>{children}</AppDataProvider>
    </SyncCodeProvider>
  );
}
