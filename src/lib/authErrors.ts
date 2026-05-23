import type { AuthError } from "@supabase/supabase-js";

export const AUTH_MESSAGES = {
  configError: "App configuration error: Supabase is not connected.",
  passwordsMismatch: "Passwords do not match.",
  passwordTooShort: "Password must be at least 6 characters.",
  signupSuccess: "Account created. You are now logged in.",
  accountExists:
    "An account already exists with this email. Try logging in.",
  invalidCredentials: "Invalid email or password.",
} as const;

const MIN_PASSWORD_LENGTH = 6;

export function validatePasswordLength(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return AUTH_MESSAGES.passwordTooShort;
  }
  return null;
}

/** Map Supabase auth errors to clear user-facing messages. */
export function mapAuthError(error: AuthError | null): string | null {
  if (!error) return null;

  const code = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();

  if (
    code === "invalid_credentials" ||
    msg.includes("invalid login credentials") ||
    msg.includes("invalid email or password")
  ) {
    return AUTH_MESSAGES.invalidCredentials;
  }

  if (
    code === "user_already_exists" ||
    msg.includes("already registered") ||
    msg.includes("already been registered")
  ) {
    return AUTH_MESSAGES.accountExists;
  }

  if (code === "weak_password") {
    return AUTH_MESSAGES.passwordTooShort;
  }

  if (code === "signup_disabled") {
    return "Sign up is disabled for this project. Contact support.";
  }

  if (code === "over_email_send_rate_limit") {
    return "Too many emails sent. Wait a few minutes and try again.";
  }

  if (code === "over_request_rate_limit") {
    return "Too many attempts. Wait a moment and try again.";
  }

  return error.message || "Something went wrong. Please try again.";
}

export function missingSupabaseConfigMessage(): string {
  return AUTH_MESSAGES.configError;
}
