import { supabase } from "@/lib/supabaseClient";
import { trpc } from "@/lib/trpc";
import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Auth is driven by the Supabase session (held client-side by the Supabase SDK).
 * `trpc.auth.me` cross-checks against our own `users` table, which the backend
 * upserts automatically the first time it sees a valid Supabase access token.
 */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const utils = trpc.useUtils();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      utils.auth.me.invalidate();
    });

    return () => listener.subscription.unsubscribe();
    // Intentionally run once on mount only. `utils` (trpc.useUtils()) is not
    // guaranteed to be a stable reference across renders — including it here
    // caused this effect to re-fire every render, which re-triggers
    // getSession()/setSession() each time, producing a fast render loop
    // (visible as a flashing/flickering screen after sign-in).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: Boolean(session),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const signInWithEmail = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/os` },
    });
    if (error) throw error;
  }, []);

  const signInWithOAuth = useCallback(async (provider: "google" | "github") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/os` },
    });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    utils.auth.me.setData(undefined, null);
  }, [utils]);

  const state = useMemo(() => {
    return {
      user: session ? (meQuery.data ?? null) : null,
      loading: sessionLoading || (Boolean(session) && meQuery.isLoading),
      error: meQuery.error ?? null,
      isAuthenticated: Boolean(session) && Boolean(meQuery.data),
    };
  }, [session, sessionLoading, meQuery.data, meQuery.isLoading, meQuery.error]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    signInWithEmail,
    signInWithOAuth,
    logout,
  };
}
