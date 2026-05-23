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
import type { Session, User } from "@supabase/supabase-js";
import {
  authErrorFromQuery,
  clearAuthQueryParams,
  exchangeAuthCodeFromUrl,
  normalizeAuthEmail,
} from "@/lib/authUtils";
import {
  AUTH_MESSAGES,
  mapAuthError,
  missingSupabaseConfigMessage,
} from "@/lib/authErrors";
import {
  getSupabase,
  getSupabaseConfigStatus,
  isSupabaseConfigured,
} from "@/lib/supabaseClient";

export type AuthResult = {
  error: string | null;
  loggedIn?: boolean;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  configStatus: ReturnType<typeof getSupabaseConfigStatus>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function applySession(
  session: Session | null,
  setSession: (s: Session | null) => void,
  setUser: (u: User | null) => void
) {
  setSession(session);
  setUser(session?.user ?? null);
}

async function bootstrapAuthSession(): Promise<{
  session: Session | null;
  initError: string | null;
}> {
  const sb = getSupabase();
  if (!sb) {
    return { session: null, initError: missingSupabaseConfigMessage() };
  }

  const exchangeErr = await exchangeAuthCodeFromUrl(sb);
  if (exchangeErr) {
    return { session: null, initError: exchangeErr };
  }

  const queryErr = authErrorFromQuery();
  if (queryErr) {
    clearAuthQueryParams();
    return { session: null, initError: queryErr };
  }

  const { data, error } = await sb.auth.getSession();
  if (error) {
    return { session: null, initError: mapAuthError(error) };
  }

  return { session: data.session, initError: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();
  const configStatus = useMemo(() => getSupabaseConfigStatus(), []);

  useEffect(() => {
    let mounted = true;

    void bootstrapAuthSession().then(({ session: s, initError }) => {
      if (!mounted) return;
      applySession(s, setSession, setUser);
      setLoading(false);
      if (initError && typeof window !== "undefined") {
        console.warn("[auth]", initError);
      }
    });

    const sb = getSupabase();
    if (!sb) return () => {
      mounted = false;
    };

    const { data: sub } = sb.auth.onAuthStateChange((event, nextSession) => {
      applySession(nextSession, setSession, setUser);
      setLoading(false);
      if (event === "SIGNED_OUT") {
        applySession(null, setSession, setUser);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const sb = getSupabase();
      if (!sb) {
        return { error: missingSupabaseConfigMessage() };
      }

      const normalizedEmail = normalizeAuthEmail(email);
      const { data, error } = await sb.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        return { error: mapAuthError(error) };
      }

      applySession(data.session, setSession, setUser);
      return { error: null, loggedIn: true };
    },
    []
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const sb = getSupabase();
      if (!sb) {
        return { error: missingSupabaseConfigMessage() };
      }

      const normalizedEmail = normalizeAuthEmail(email);
      const { data, error } = await sb.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (error) {
        return { error: mapAuthError(error) };
      }

      if (data.user?.identities?.length === 0) {
        return { error: AUTH_MESSAGES.accountExists };
      }

      if (data.session) {
        applySession(data.session, setSession, setUser);
        return { error: null, loggedIn: true };
      }

      // Email confirmation off: signUp may not return a session — sign in immediately.
      const signInAttempt = await sb.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInAttempt.error) {
        return { error: mapAuthError(signInAttempt.error) };
      }

      applySession(signInAttempt.data.session, setSession, setUser);
      return { error: null, loggedIn: true };
    },
    []
  );

  const signOut = useCallback(async () => {
    applySession(null, setSession, setUser);
    const sb = getSupabase();
    if (!sb) return;
    await sb.auth.signOut({ scope: "local" });
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      configured,
      configStatus,
      signIn,
      signUp,
      signOut,
    }),
    [user, session, loading, configured, configStatus, signIn, signUp, signOut]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
