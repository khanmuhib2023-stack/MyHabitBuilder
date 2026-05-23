"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";

export default function UserMenu() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <span className="text-xs text-[var(--foreground)]/40">…</span>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-full px-3 py-2 text-sm font-medium text-[var(--foreground)]/55 transition hover:bg-[var(--foreground)]/8 hover:text-[var(--foreground)]"
      >
        Login
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        className="max-w-[140px] truncate text-xs text-[var(--foreground)]/50"
        title={user.email ?? ""}
      >
        {user.email}
      </span>
      <button
        type="button"
        onClick={() => void signOut()}
        className="rounded-full px-3 py-2 text-sm font-medium text-[var(--foreground)]/55 transition hover:bg-[var(--foreground)]/8 hover:text-[var(--foreground)]"
      >
        Log out
      </button>
    </div>
  );
}
