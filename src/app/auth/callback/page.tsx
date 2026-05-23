"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Legacy email-auth callback — redirects to sync code login. */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <main className="mx-auto max-w-md p-8 text-center">
      <p className="text-sm text-[var(--foreground)]/60">
        Redirecting to sync code login…
      </p>
      <Link href="/login" className="mt-4 inline-block text-sm text-[var(--foreground)]/50 hover:text-[var(--foreground)]">
        Go to sync code
      </Link>
    </main>
  );
}
