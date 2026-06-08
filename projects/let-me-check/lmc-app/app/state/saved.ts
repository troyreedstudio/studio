// Lightweight in-memory store for the Seeker's Saved Places.
// Prototype only — would back this with AsyncStorage + Supabase in production.

import { useEffect, useState } from 'react';

export type SavedPlace = {
  id: string; // unique — usually the venue name slugged
  name: string;
  address?: string;
  category?: string;
  coord: [number, number];
  marketId: string;
  savedAt: string; // ISO date
};

let _saved: SavedPlace[] = [];
let _listeners: (() => void)[] = [];

function notify() {
  _listeners.forEach((fn) => fn());
}

export function getSaved(): SavedPlace[] {
  return _saved;
}

export function isSaved(id: string): boolean {
  return _saved.some((p) => p.id === id);
}

export function savePlace(place: Omit<SavedPlace, 'savedAt'>): void {
  if (isSaved(place.id)) return;
  _saved = [{ ...place, savedAt: new Date().toISOString() }, ..._saved];
  notify();
}

export function removeSaved(id: string): void {
  _saved = _saved.filter((p) => p.id !== id);
  notify();
}

export function toggleSaved(place: Omit<SavedPlace, 'savedAt'>): void {
  if (isSaved(place.id)) removeSaved(place.id);
  else savePlace(place);
}

export function useSavedPlaces() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    _listeners.push(fn);
    return () => {
      _listeners = _listeners.filter((l) => l !== fn);
    };
  }, []);
  return {
    list: _saved,
    isSaved,
    save: savePlace,
    remove: removeSaved,
    toggle: toggleSaved,
    count: _saved.length,
  };
}
