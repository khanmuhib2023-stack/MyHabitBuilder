"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { exchangeAuthCodeFromUrl } from "@/lib/authUtils";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { missingSupabaseConfigMessage } from "@/lib/authErrors";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Confirming your email…");

  useEffect(() => {
    const run = async () => {
      if (!isSupabaseConfigured()) {
        setMessage(missingSupabaseConfigMessage());
        return;
      }
      const sb = getSupabase();
      if (!sb) {
        setMessage(missingSupabaseConfigMessage());
        return;
      }

      const err = await exchangeAuthCodeFromUrl(sb);
      if (err) {
        setMessage(err);
        return;
      }

      const { data } = await sb.auth.getSession();
      if (data.session) {
        router.replace("/");
        return;
      }

      setMessage(
        "Email confirmed. You can now log in with your email and password."
      );
      window.setTimeout(() => router.replace("/login"), 2500);
    };

    void run();
  }, [router]);

  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-sm text-[var(--foreground)]/70">{message}</p>
      <p className="mt-4">
        <Link href="/login" className="text-sm text-[var(--foreground)]/50 hover:text-[var(--foreground)]">
          Go to login
        </Link>
      </p>
    </main>
  );
}
