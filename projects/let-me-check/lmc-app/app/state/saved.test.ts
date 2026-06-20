// Unit tests for the saved-places store (DATA-01).
//
// Vitest runs in node; the Supabase data layer (lib/api) is mocked. We assert the
// store's mutators persist through lib/api and that its cache hydrates from
// api.getSavedPlaces() — while keeping the original synchronous export surface so
// the importing screens never change.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const addSavedPlace = vi.fn(async () => undefined);
const removeSavedPlace = vi.fn(async () => undefined);
const getSavedPlaces = vi.fn(async () => [] as unknown[]);

// Mock the data layer at the path the STORE imports it from (saved.ts uses
// '../lib/api'); vi.mock resolves specifiers from the module under test.
vi.mock('../lib/api', () => ({ addSavedPlace, removeSavedPlace, getSavedPlaces }));

// The store imports react for its use* hook; mock the two hooks so vitest never
// loads react-native's Flow-typed entry (same isolation the lib tests use).
vi.mock('react', () => ({ useEffect: vi.fn(), useState: () => [0, vi.fn()] }));

const PLACE = {
  id: 'club-space',
  name: 'Club Space',
  address: '34 NE 11th St',
  category: 'nightlife',
  coord: [-80.19, 25.78] as [number, number],
  marketId: 'mia',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe('state/saved', () => {
  it('keeps its synchronous export surface', async () => {
    const saved = await import('./saved');
    expect(typeof saved.getSaved).toBe('function');
    expect(typeof saved.isSaved).toBe('function');
    expect(typeof saved.savePlace).toBe('function');
    expect(typeof saved.removeSaved).toBe('function');
    expect(typeof saved.toggleSaved).toBe('function');
    expect(typeof saved.useSavedPlaces).toBe('function');
  });

  it('savePlace persists through lib/api (DATA-01)', async () => {
    const saved = await import('./saved');
    saved.savePlace(PLACE);
    expect(addSavedPlace).toHaveBeenCalledWith(
      expect.objectContaining({ placeKey: 'club-space', name: 'Club Space' }),
    );
  });

  it('savePlace updates the local cache optimistically so isSaved is true immediately', async () => {
    const saved = await import('./saved');
    saved.savePlace(PLACE);
    expect(saved.isSaved('club-space')).toBe(true);
    expect(saved.getSaved().some((p) => p.id === 'club-space')).toBe(true);
  });

  it('removeSaved persists the delete through lib/api', async () => {
    const saved = await import('./saved');
    saved.savePlace(PLACE);
    saved.removeSaved('club-space');
    expect(removeSavedPlace).toHaveBeenCalledWith('club-space');
    expect(saved.isSaved('club-space')).toBe(false);
  });

  it('toggleSaved adds when absent and removes when present', async () => {
    const saved = await import('./saved');
    saved.toggleSaved(PLACE);
    expect(saved.isSaved('club-space')).toBe(true);
    saved.toggleSaved(PLACE);
    expect(saved.isSaved('club-space')).toBe(false);
  });

  it('hydrate loads the cache from api.getSavedPlaces()', async () => {
    getSavedPlaces.mockResolvedValueOnce([
      {
        id: 'row-1',
        place_key: 'joia-beach',
        name: 'Joia Beach',
        address: null,
        category: null,
        market_id: 'mia',
        saved_at: '2026-06-20T00:00:00Z',
      },
    ]);
    const saved = await import('./saved');
    await saved.hydrateSaved();
    expect(getSavedPlaces).toHaveBeenCalled();
    expect(saved.isSaved('joia-beach')).toBe(true);
  });
});
