"use client";

import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import { ui } from "@/lib/uiClasses";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  return (
    <main className={`mx-auto my-10 max-w-md p-6 sm:mx-4 sm:p-8 ${ui.card}`}>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Account
        </h1>
        <p className="mt-1 text-sm text-[var(--foreground)]/50">
          Sign in to sync habits across your phone and laptop.
        </p>
      </header>
      <AuthForm />
      <p className="mt-6 text-center text-sm text-[var(--foreground)]/45">
        <Link href="/" className="hover:text-[var(--foreground)]">
          ← Back to Today
        </Link>
      </p>
    </main>
  );
}
