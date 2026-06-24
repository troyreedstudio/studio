// TEMP: color audition — remove after color is chosen.
//
// To remove this tool:
//   1. Delete this file (app/state/dev-bg.ts)
//   2. In app/index.tsx, app/how-it-works.tsx, app/welcome.tsx:
//      a. Remove the `useDevBg` import
//      b. Remove the `devBg = useDevBg()` call
//      c. Change `backgroundColor: devBg.color` back to `backgroundColor: '#000000'`
//      d. Remove the <DevBgPill /> JSX and its import
//   3. Delete app/components/DevBgPill.tsx

import { useEffect, useState } from 'react';

export interface BgCandidate {
  name: string;
  hex: string;
  isLight: boolean;
}

export const PALETTE: BgCandidate[] = [
  { name: 'White', hex: '#FFFFFF', isLight: true  },
  { name: 'Red',   hex: '#FF3B30', isLight: false },
  { name: 'Blue',  hex: '#1652F0', isLight: false },
];

let _index = 0;
let _listeners: (() => void)[] = [];

function notify() {
  _listeners.forEach((fn) => fn());
}

export function getDevBg(): BgCandidate {
  return PALETTE[_index];
}

export function cycleDevBg(): void {
  _index = (_index + 1) % PALETTE.length;
  notify();
}

export function useDevBg(): BgCandidate {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    _listeners.push(fn);
    return () => {
      _listeners = _listeners.filter((l) => l !== fn);
    };
  }, []);
  return PALETTE[_index];
}
