// Seeker's saved payment method — persisted in Supabase (payment_methods) via
// lib/api. Phase 1 is a placeholder: only the display shape (brand + last4) is
// stored. No Stripe yet, and we NEVER store raw card data. The export surface is
// byte-compatible with the old in-memory store so the payment screen is unchanged.

import { useEffect, useState } from 'react';
import { getPaymentMethod, savePaymentMethod, clearPaymentMethod } from '../lib/api';

export type CardBrand = 'Visa' | 'Mastercard' | 'Amex' | 'ApplePay';

export type SavedCard = {
  brand: CardBrand;
  last4: string;
  savedAt: string; // ISO date
};

let _card: SavedCard | null = null;
let _listeners: (() => void)[] = [];
let _hydrated = false;

function notify() {
  _listeners.forEach((fn) => fn());
}

/** Pull the user's saved card (brand + last4 only) from Supabase. */
export async function hydratePaymentMethod(): Promise<void> {
  try {
    const row = await getPaymentMethod();
    _card = row
      ? { brand: row.brand as CardBrand, last4: row.last4, savedAt: row.saved_at }
      : null;
    _hydrated = true;
    notify();
  } catch {
    // Signed out / offline / none on file — leave the cache as-is.
  }
}

export function getCard(): SavedCard | null {
  return _card;
}

export function saveCard(brand: CardBrand, last4: string): void {
  _card = { brand, last4, savedAt: new Date().toISOString() };
  notify();
  void savePaymentMethod(brand, last4).catch(() => {});
}

export function clearCard(): void {
  _card = null;
  notify();
  void clearPaymentMethod().catch(() => {});
}

export function usePaymentMethod() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    _listeners.push(fn);
    if (!_hydrated) void hydratePaymentMethod();
    return () => {
      _listeners = _listeners.filter((l) => l !== fn);
    };
  }, []);
  return {
    card: _card,
    save: saveCard,
    clear: clearCard,
  };
}
