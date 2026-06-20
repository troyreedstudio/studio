// Session + role context and the app boot gate (AUTH-02 / AUTH-03).
//
// SessionProvider restores the persisted session at boot, subscribes to auth
// state changes, and loads the user's profile (incl. current_role). The boot
// gate in _layout.tsx reads this to route a signed-in user to their hub and a
// signed-out user through the normal entry flow.

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { getProfile } from './api';
import type { Database } from './database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

type SessionContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** Re-fetch the profile (e.g. after a role switch or onboarding write). */
  refreshProfile: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue>({
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const loadProfile = async () => {
    try {
      const p = await getProfile();
      if (mounted.current) setProfile(p);
    } catch {
      if (mounted.current) setProfile(null);
    }
  };

  useEffect(() => {
    mounted.current = true;

    // Restore the persisted session at boot.
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted.current) return;
      setSession(data.session);
      if (data.session) await loadProfile();
      if (mounted.current) setLoading(false);
    });

    // React to sign-in / sign-out / token refresh.
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      if (!mounted.current) return;
      setSession(next);
      if (next) await loadProfile();
      else setProfile(null);
      if (mounted.current) setLoading(false);
    });

    return () => {
      mounted.current = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SessionContext.Provider
      value={{ session, profile, loading, refreshProfile: loadProfile }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}

/** Resolve the hub route for a profile's current_role. */
export function hubRouteForRole(role: string | null | undefined): string {
  return role === 'scout' ? '/(scout)/dashboard' : '/(seeker)/home';
}
