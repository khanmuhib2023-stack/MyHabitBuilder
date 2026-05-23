import type { SupabaseClient } from "@supabase/supabase-js";
import { mapAuthError } from "@/lib/authErrors";

/** Normalize email so laptop/phone logins match (case-insensitive). */
export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Where Supabase should redirect after email confirmation (must be allowlisted in Supabase). */
export function getAuthRedirectUrl(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/auth/callback`;
}

/**
 * Exchange PKCE ?code= from email confirmation / magic links.
 * Returns an error message or null on success.
 */
export async function exchangeAuthCodeFromUrl(
  sb: SupabaseClient
): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (!code) return null;

  const { error } = await sb.auth.exchangeCodeForSession(code);

  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("type");
  url.searchParams.delete("next");
  const clean =
    url.pathname +
    (url.searchParams.toString() ? `?${url.searchParams}` : "") +
    url.hash;
  window.history.replaceState({}, "", clean);

  return mapAuthError(error);
}

/** Strip auth query params without exchanging (e.g. after failed link). */
export function clearAuthQueryParams(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (
    !params.has("code") &&
    !params.has("error") &&
    !params.has("error_description")
  ) {
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("type");
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  window.history.replaceState({}, "", url.pathname + url.hash);
}

export function authErrorFromQuery(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const desc = params.get("error_description");
  const err = params.get("error");
  if (desc) return decodeURIComponent(desc.replace(/\+/g, " "));
  if (err) return `Authentication error: ${err}`;
  return null;
}
