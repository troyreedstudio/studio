// Call-shape tests for scout-location.ts (SCOUT-03 / Phase 5 Plan 05).
//
// These tests assert: (a) upsertScoutLocation calls from('scout_locations').upsert
// with WKT 'POINT(lng lat)' — longitude FIRST (Pitfall 1 / RESEARCH A1);
// (b) setScoutOffline flips is_online=false without providing a coord;
// (c) errors are propagated as thrown exceptions.
//
// supabase is fully mocked; supabase.auth.getUser is stubbed to a real user so
// requireUserId passes (unlike the 3 pre-existing clips.test.ts failures which
// stub getUser differently).

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Supabase mock ─────────────────────────────────────────────────────────────
// We record every from().upsert call so we can assert arg shapes.

type UpsertCall = { table: string; payload: unknown; opts: unknown };
const upsertCalls: UpsertCall[] = [];
let upsertError: unknown = null;

// Fluent builder: from(table) -> upsert(payload, opts) -> { error }
function makeFromMock(table: string) {
  return {
    upsert: vi.fn((payload: unknown, opts: unknown) => {
      upsertCalls.push({ table, payload, opts });
      return Promise.resolve({ data: null, error: upsertError });
    }),
  };
}

const supabaseMock = {
  auth: {
    getUser: vi.fn(async () => ({
      data: { user: { id: 'scout-uid-123' } },
      error: null,
    })),
  },
  from: vi.fn((table: string) => makeFromMock(table)),
};

vi.mock('./supabase', () => ({ supabase: supabaseMock }));

beforeEach(() => {
  upsertCalls.length = 0;
  upsertError = null;
  vi.clearAllMocks();
  // Restore getUser mock after vi.clearAllMocks clears it.
  supabaseMock.auth.getUser.mockResolvedValue({
    data: { user: { id: 'scout-uid-123' } },
    error: null,
  });
});

// ── upsertScoutLocation ───────────────────────────────────────────────────────

describe('scout-location upsertScoutLocation', () => {
  it('calls scout_locations.upsert with WKT POINT(lng lat) — longitude FIRST', async () => {
    const { upsertScoutLocation } = await import('./scout-location');
    await upsertScoutLocation(25.7750, -80.1918);

    expect(upsertCalls).toHaveLength(1);
    const call = upsertCalls[0];
    expect(call.table).toBe('scout_locations');

    const payload = call.payload as Record<string, unknown>;
    // Critical: WKT puts longitude first (Pitfall 1)
    expect(payload.coord).toBe('POINT(-80.1918 25.775)');
    expect(payload.is_online).toBe(true);
    expect(payload.scout_id).toBe('scout-uid-123');
  });

  it('WKT order: longitude appears BEFORE latitude in the POINT string', async () => {
    const { upsertScoutLocation } = await import('./scout-location');
    const lat = 40.7128;
    const lng = -74.0060;
    await upsertScoutLocation(lat, lng);

    const payload = upsertCalls[0].payload as Record<string, unknown>;
    const wkt = payload.coord as string;
    // Parse the two numbers out of POINT(x y)
    const match = wkt.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
    expect(match).not.toBeNull();
    const x = parseFloat(match![1]);
    const y = parseFloat(match![2]);
    // x = longitude (negative for New York), y = latitude (positive)
    expect(x).toBeCloseTo(lng, 4);
    expect(y).toBeCloseTo(lat, 4);
  });

  it('passes accuracyM as a separate key when provided', async () => {
    const { upsertScoutLocation } = await import('./scout-location');
    await upsertScoutLocation(25.775, -80.1918, 12.5);

    const payload = upsertCalls[0].payload as Record<string, unknown>;
    expect(payload.accuracy_m).toBe(12.5);
  });

  it('uses onConflict: scout_id so duplicate rows are upserted', async () => {
    const { upsertScoutLocation } = await import('./scout-location');
    await upsertScoutLocation(25.775, -80.1918);

    const opts = upsertCalls[0].opts as Record<string, unknown>;
    expect(opts?.onConflict).toBe('scout_id');
  });

  it('throws when supabase returns an error', async () => {
    upsertError = { message: 'RLS denied' };
    const { upsertScoutLocation } = await import('./scout-location');
    await expect(upsertScoutLocation(25.775, -80.1918)).rejects.toThrow();
  });

  it('throws when not authenticated (getUser returns no user)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabaseMock.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    } as any);
    const { upsertScoutLocation } = await import('./scout-location');
    await expect(upsertScoutLocation(25.775, -80.1918)).rejects.toThrow('Not authenticated');
  });
});

// ── setScoutOffline ───────────────────────────────────────────────────────────

describe('scout-location setScoutOffline', () => {
  it('upserts is_online=false for the current user', async () => {
    const { setScoutOffline } = await import('./scout-location');
    await setScoutOffline();

    expect(upsertCalls).toHaveLength(1);
    const payload = upsertCalls[0].payload as Record<string, unknown>;
    expect(payload.is_online).toBe(false);
    expect(payload.scout_id).toBe('scout-uid-123');
  });

  it('does NOT send a coord when going offline (preserves last known coord via DB)', async () => {
    const { setScoutOffline } = await import('./scout-location');
    await setScoutOffline();

    const payload = upsertCalls[0].payload as Record<string, unknown>;
    // coord should be absent — only flip the flag
    expect('coord' in payload).toBe(false);
  });

  it('throws when supabase returns an error', async () => {
    upsertError = { message: 'forbidden' };
    const { setScoutOffline } = await import('./scout-location');
    await expect(setScoutOffline()).rejects.toThrow();
  });
});
