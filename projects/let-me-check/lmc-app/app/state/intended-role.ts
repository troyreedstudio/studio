// In-memory store for the user's intended role chosen at /onboarding/role.
// Used to fork at the end of Seeker onboarding (Both users see the Y-fork screen
// instead of dropping straight into /(seeker)/home).
//
// Prototype only — in production this lives on the user record in Supabase.

import { useEffect, useState } from 'react';

export type IntendedRole = 'seeker' | 'scout' | 'both' | null;

let _role: IntendedRole = null;
let _listeners: (() => void)[] = [];

function notify() {
  _listeners.forEach((fn) => fn());
}

export function getIntendedRole(): IntendedRole {
  return _role;
}

export function setIntendedRole(r: IntendedRole): void {
  _role = r;
  notify();
}

export function useIntendedRole() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    _listeners.push(fn);
    return () => {
      _listeners = _listeners.filter((l) => l !== fn);
    };
  }, []);
  return {
    role: _role,
    set: setIntendedRole,
  };
}
