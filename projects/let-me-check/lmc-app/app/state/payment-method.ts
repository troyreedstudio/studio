// Lightweight in-memory store for the Seeker's saved payment method.
// Prototype only — in production this is replaced by a Stripe Customer lookup
// (fetched on app start, tokenized on save, never stores raw card data on our servers).

import { useEffect, useState } from 'react';

export type CardBrand = 'Visa' | 'Mastercard' | 'Amex' | 'ApplePay';

export type SavedCard = {
  brand: CardBrand;
  last4: string;
  savedAt: string; // ISO date
};

let _card: SavedCard | null = null;
let _listeners: (() => void)[] = [];

function notify() {
  _listeners.forEach((fn) => fn());
}

export function getCard(): SavedCard | null {
  return _card;
}

export function saveCard(brand: CardBrand, last4: string): void {
  _card = { brand, last4, savedAt: new Date().toISOString() };
  notify();
}

export function clearCard(): void {
  _card = null;
  notify();
}

export function usePaymentMethod() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    _listeners.push(fn);
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
