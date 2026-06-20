// The user's intended role (chosen at /onboarding/role), backed by the Supabase
// profile (is_seeker / is_scout / current_role) via lib/api (AUTH-03). Used to
// fork at the end of Seeker onboarding (Both users see the Y-fork screen).
//
// The export surface is byte-compatible with the old in-memory store so the
// importing screens (role, quick-finish, seeker/rules) are unchanged: reads stay
// synchronous off a local cache; setIntendedRole persists in the background.

import { useEffect, useState } from 'react';
import { setIntendedRoleFlags, getIntendedRoleFlags } from '../lib/api';

export type IntendedRole = 'seeker' | 'scout' | 'both' | null;

let _role: IntendedRole = null;
let _listeners: (() => void)[] = [];
let _hydrated = false;

function notify() {
  _listeners.forEach((fn) => fn());
}

/** Load the intended role from the Supabase profile flags into the local cache. */
export async function hydrateIntendedRole(): Promise<void> {
  try {
    _role = await getIntendedRoleFlags();
    _hydrated = true;
    notify();
  } catch {
    // Signed out / offline / no profile yet — leave the cache as-is.
  }
}

export function getIntendedRole(): IntendedRole {
  return _role;
}

export function setIntendedRole(r: IntendedRole): void {
  _role = r;
  notify();
  // null clears nothing server-side; only persist a concrete choice.
  if (r) void setIntendedRoleFlags(r).catch(() => {});
}

export function useIntendedRole() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    _listeners.push(fn);
    if (!_hydrated) void hydrateIntendedRole();
    return () => {
      _listeners = _listeners.filter((l) => l !== fn);
    };
  }, []);
  return {
    role: _role,
    set: setIntendedRole,
  };
}
