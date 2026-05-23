"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { ui } from "@/lib/uiClasses";

type Mode = "login" | "signup";

const inputClass = `mt-1 w-full px-3 py-2.5 text-sm ${ui.input}`;

export default function AuthForm({ initialMode = "login" }: { initialMode?: Mode }) {
  const { signIn, signUp, configured } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!configured) {
      setMessage("Add Supabase URL and anon key to .env.local");
      return;
    }
    setBusy(true);
    const err =
      mode === "login"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password);
    setBusy(false);
    if (err) setMessage(err);
    else if (mode === "signup")
      setMessage("Check your email to confirm your account, then log in.");
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="text-xs font-medium text-[var(--foreground)]/55">
          Email
        </label>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className="text-xs font-medium text-[var(--foreground)]/55">
          Password
        </label>
        <input
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </div>

      {message ? (
        <p className="rounded-lg border border-[var(--foreground)]/12 bg-[var(--foreground)]/[0.06] px-3 py-2 text-sm text-[var(--foreground)]/80">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-[var(--foreground)] px-4 py-2.5 text-sm font-medium text-[var(--background)] transition hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
      </button>

      <p className="text-center text-sm text-[var(--foreground)]/50">
        {mode === "login" ? "No account?" : "Already have an account?"}{" "}
        <button
          type="button"
          className="font-medium text-[var(--foreground)] underline-offset-2 hover:underline"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setMessage(null);
          }}
        >
          {mode === "login" ? "Sign up" : "Log in"}
        </button>
      </p>
    </form>
  );
}
