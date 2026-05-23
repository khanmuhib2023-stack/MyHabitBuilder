"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  AUTH_MESSAGES,
  missingSupabaseConfigMessage,
  validatePasswordLength,
} from "@/lib/authErrors";
import { ui } from "@/lib/uiClasses";

type Mode = "login" | "signup";

const inputClass = `mt-1 w-full px-3 py-2.5 text-sm ${ui.input}`;

const alertSuccess =
  "rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-200/90";

const alertError =
  "rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-300/90";

export default function AuthForm({ initialMode = "login" }: { initialMode?: Mode }) {
  const { signIn, signUp, configured } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setMessage(null);
    setIsSuccess(false);
    setPassword("");
    setConfirmPassword("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSuccess(false);

    if (!configured) {
      setMessage(missingSupabaseConfigMessage());
      return;
    }

    const lengthErr = validatePasswordLength(password);
    if (lengthErr) {
      setMessage(lengthErr);
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setMessage(AUTH_MESSAGES.passwordsMismatch);
      return;
    }

    setBusy(true);
    const result =
      mode === "login"
        ? await signIn(email, password)
        : await signUp(email, password);
    setBusy(false);

    if (result.error) {
      setMessage(result.error);
      return;
    }

    if (result.loggedIn) {
      setIsSuccess(true);
      setMessage(
        mode === "signup"
          ? AUTH_MESSAGES.signupSuccess
          : "Logged in successfully."
      );
      setPassword("");
      setConfirmPassword("");
    }
  };

  const submitLabel =
    mode === "login"
      ? busy
        ? "Logging in..."
        : "Log in"
      : busy
        ? "Creating account..."
        : "Sign up";

  return (
    <form onSubmit={submit} className="space-y-4">
      {message ? (
        <p className={isSuccess ? alertSuccess : alertError} role="status">
          {message}
        </p>
      ) : null}

      <div>
        <label className="text-xs font-medium text-[var(--foreground)]/55">
          Email
        </label>
        <input
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          disabled={busy}
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
          disabled={busy}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        {mode === "signup" ? (
          <p className="mt-1 text-[10px] text-[var(--foreground)]/40">
            At least 6 characters
          </p>
        ) : null}
      </div>

      {mode === "signup" ? (
        <div>
          <label className="text-xs font-medium text-[var(--foreground)]/55">
            Confirm password
          </label>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            disabled={busy}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
        </div>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-[var(--foreground)] px-4 py-2.5 text-sm font-medium text-[var(--background)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitLabel}
      </button>

      <p className="text-center text-sm text-[var(--foreground)]/50">
        {mode === "login" ? "No account?" : "Already have an account?"}{" "}
        <button
          type="button"
          disabled={busy}
          className="font-medium text-[var(--foreground)] underline-offset-2 hover:underline disabled:opacity-50"
          onClick={() => switchMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "Sign up" : "Log in"}
        </button>
      </p>
    </form>
  );
}
