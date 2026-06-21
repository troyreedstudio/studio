// Call-shape tests for dispatch.ts (DISP-01 / Phase 5 Plan 05).
//
// These tests assert: listOpenChecksForScout calls supabase.rpc with the correct
// function name ('list_open_checks_for_scout') and the correct param names
// (p_scout_lat, p_scout_lng). Errors are propagated.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Supabase mock ─────────────────────────────────────────────────────────────
type RpcCall = { fn: string; params: unknown };
const rpcCalls: RpcCall[] = [];
let rpcReturn: { data: unknown; error: unknown } = { data: [], error: null };

const supabaseMock = {
  rpc: vi.fn(async (fn: string, params: unknown) => {
    rpcCalls.push({ fn, params });
    return rpcReturn;
  }),
};

vi.mock('./supabase', () => ({ supabase: supabaseMock }));

beforeEach(() => {
  rpcCalls.length = 0;
  rpcReturn = { data: [], error: null };
  vi.clearAllMocks();
  supabaseMock.rpc.mockImplementation(async (fn: string, params: unknown) => {
    rpcCalls.push({ fn, params });
    return rpcReturn;
  });
});

// ── listOpenChecksForScout ────────────────────────────────────────────────────

describe('dispatch listOpenChecksForScout', () => {
  it("calls rpc('list_open_checks_for_scout', { p_scout_lat, p_scout_lng })", async () => {
    const { listOpenChecksForScout } = await import('./dispatch');
    await listOpenChecksForScout(25.775, -80.1918);

    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0].fn).toBe('list_open_checks_for_scout');
    const params = rpcCalls[0].params as Record<string, unknown>;
    expect(params.p_scout_lat).toBe(25.775);
    expect(params.p_scout_lng).toBe(-80.1918);
  });

  it('returns an array of checks on success', async () => {
    const fakeCheck = { id: 'chk-1', status: 'dispatching' };
    rpcReturn = { data: [fakeCheck], error: null };
    const { listOpenChecksForScout } = await import('./dispatch');
    const result = await listOpenChecksForScout(25.775, -80.1918);
    expect(result).toEqual([fakeCheck]);
  });

  it('returns [] when data is null', async () => {
    rpcReturn = { data: null, error: null };
    const { listOpenChecksForScout } = await import('./dispatch');
    const result = await listOpenChecksForScout(25.775, -80.1918);
    expect(result).toEqual([]);
  });

  it('throws when supabase rpc returns an error', async () => {
    rpcReturn = { data: null, error: { message: 'relation not found' } };
    const { listOpenChecksForScout } = await import('./dispatch');
    await expect(listOpenChecksForScout(25.775, -80.1918)).rejects.toThrow();
  });

  it('passes lat as p_scout_lat and lng as p_scout_lng (correct param names)', async () => {
    const { listOpenChecksForScout } = await import('./dispatch');
    await listOpenChecksForScout(40.7128, -74.006);
    const params = rpcCalls[0].params as Record<string, unknown>;
    // Verify parameter names exactly (the RPC expects these specific names)
    expect(Object.keys(params)).toContain('p_scout_lat');
    expect(Object.keys(params)).toContain('p_scout_lng');
    expect(Object.keys(params)).not.toContain('lat');
    expect(Object.keys(params)).not.toContain('lng');
  });
});
