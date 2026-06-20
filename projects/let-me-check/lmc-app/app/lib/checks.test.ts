// Unit tests for the check lifecycle wrappers (CHECK-01/02/03/05/06, DISP-04).
//
// Vitest runs in node; the Supabase client is fully mocked so these tests assert
// CALL SHAPES, not network. The contract under test:
//   - every state change routes through a server RPC (transition_check / accept_check)
//   - NO wrapper ever writes checks.status / scout_id via a direct table UPDATE (DATA-02)
//   - markDelivered inserts a stub clip BEFORE transitioning to 'delivered'
//
// A small chainable mock records the calls made to from().insert().select().single(),
// from().select().eq().order(), from().insert(), and rpc(); the assertions read the
// recorded arguments back out.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Recorded calls ────────────────────────────────────────────────────────────
type Recorded = {
  from: string[];
  inserts: Array<{ table: string; values: unknown }>;
  updates: Array<{ table: string; values: unknown }>;
  rpc: Array<{ fn: string; args: unknown }>;
  selects: Array<{ table: string; eq: Array<[string, unknown]>; order?: [string, unknown] }>;
  order: string[]; // ordered log of operations to assert sequencing
};

let rec: Recorded;

// Configurable per-test responses.
let insertReturn: { data: unknown; error: unknown } = { data: { id: 'check-123' }, error: null };
let selectReturn: { data: unknown; error: unknown } = { data: [], error: null };
let maybeSingleReturn: { data: unknown; error: unknown } = { data: null, error: null };
let rpcReturn: { data: unknown; error: unknown } = { data: 'dispatching', error: null };
let getUserReturn: { data: { user: { id: string } | null }; error: unknown } = {
  data: { user: { id: 'seeker-1' } },
  error: null,
};

function makeFromMock(table: string) {
  rec.from.push(table);
  const selectState: { eq: Array<[string, unknown]>; order?: [string, unknown] } = { eq: [] };

  const chain: any = {
    // INSERT branch
    insert(values: unknown) {
      rec.inserts.push({ table, values });
      rec.order.push(`insert:${table}`);
      return {
        select: (_cols?: string) => ({
          single: async () => insertReturn,
          maybeSingle: async () => insertReturn,
        }),
        // bare insert (no .select()) resolves like a thenable
        then: (resolve: (v: { data: unknown; error: unknown }) => void) =>
          resolve(insertReturn),
      };
    },
    // UPDATE branch — should NEVER be called by these wrappers
    update(values: unknown) {
      rec.updates.push({ table, values });
      rec.order.push(`update:${table}`);
      return {
        eq: async () => ({ data: null, error: null }),
      };
    },
    // SELECT branch
    select(_cols?: string) {
      rec.order.push(`select:${table}`);
      return chain;
    },
    eq(col: string, val: unknown) {
      selectState.eq.push([col, val]);
      return chain;
    },
    order(col: string, opts: unknown) {
      selectState.order = [col, opts];
      rec.selects.push({ table, eq: selectState.eq, order: selectState.order });
      return Promise.resolve(selectReturn);
    },
    async maybeSingle() {
      rec.selects.push({ table, eq: selectState.eq });
      return maybeSingleReturn;
    },
  };
  return chain;
}

const supabaseMock = {
  from: vi.fn((table: string) => makeFromMock(table)),
  rpc: vi.fn(async (fn: string, args: unknown) => {
    rec.rpc.push({ fn, args });
    rec.order.push(`rpc:${fn}`);
    return rpcReturn;
  }),
  auth: {
    getUser: vi.fn(async () => getUserReturn),
  },
};

vi.mock('./supabase', () => ({ supabase: supabaseMock }));

beforeEach(() => {
  rec = { from: [], inserts: [], updates: [], rpc: [], selects: [], order: [] };
  insertReturn = { data: { id: 'check-123' }, error: null };
  selectReturn = { data: [], error: null };
  maybeSingleReturn = { data: null, error: null };
  rpcReturn = { data: 'dispatching', error: null };
  getUserReturn = { data: { user: { id: 'seeker-1' } }, error: null };
  vi.clearAllMocks();
});

describe('lib/checks createCheck', () => {
  it('INSERTs a requested check then transitions it to dispatching, returning the id', async () => {
    const { createCheck } = await import('./checks');
    const id = await createCheck({ tier: 'standard', locationLabel: 'JFK Terminal 4' });

    expect(id).toBe('check-123');

    // INSERT into checks with status requested + location_label + seeker_id
    expect(rec.inserts).toHaveLength(1);
    expect(rec.inserts[0].table).toBe('checks');
    expect(rec.inserts[0].values).toMatchObject({
      seeker_id: 'seeker-1',
      tier: 'standard',
      status: 'requested',
      location_label: 'JFK Terminal 4',
      currency: 'USD',
    });

    // then transition_check to dispatching
    expect(supabaseMock.rpc).toHaveBeenCalledWith('transition_check', {
      p_check_id: 'check-123',
      p_to: 'dispatching',
    });

    // ordering: insert happens before the transition rpc
    expect(rec.order.indexOf('insert:checks')).toBeLessThan(rec.order.indexOf('rpc:transition_check'));
  });

  it('passes through optional lat/lng/venue/market/currency', async () => {
    const { createCheck } = await import('./checks');
    await createCheck({
      tier: 'priority',
      locationLabel: 'Bondi Beach',
      lat: -33.89,
      lng: 151.27,
      venueId: 'venue-1',
      marketId: 'mkt-syd',
      currency: 'AUD',
    });
    expect(rec.inserts[0].values).toMatchObject({
      tier: 'priority',
      requested_lat: -33.89,
      requested_lng: 151.27,
      venue_id: 'venue-1',
      market_id: 'mkt-syd',
      currency: 'AUD',
    });
  });

  it('throws if there is no authenticated user', async () => {
    getUserReturn = { data: { user: null }, error: null };
    const { createCheck } = await import('./checks');
    await expect(createCheck({ tier: 'standard', locationLabel: 'X' })).rejects.toThrow(
      /not authenticated/i,
    );
    // never inserts or transitions when signed out
    expect(rec.inserts).toHaveLength(0);
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('throws (and does not transition) if the INSERT errors', async () => {
    insertReturn = { data: null, error: { message: 'insert failed' } };
    const { createCheck } = await import('./checks');
    await expect(createCheck({ tier: 'standard', locationLabel: 'X' })).rejects.toBeTruthy();
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });
});

describe('lib/checks listOpenChecks', () => {
  it('selects dispatching checks ordered by created_at asc', async () => {
    selectReturn = { data: [{ id: 'a' }, { id: 'b' }], error: null };
    const { listOpenChecks } = await import('./checks');
    const rows = await listOpenChecks();

    expect(rows).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(rec.from).toContain('checks');
    const sel = rec.selects.find((s) => s.table === 'checks');
    expect(sel?.eq).toContainEqual(['status', 'dispatching']);
    expect(sel?.order).toEqual(['created_at', { ascending: true }]);
  });

  it('returns [] when data is null', async () => {
    selectReturn = { data: null, error: null };
    const { listOpenChecks } = await import('./checks');
    expect(await listOpenChecks()).toEqual([]);
  });
});

describe('lib/checks getCheck', () => {
  it('selects a single check by id', async () => {
    maybeSingleReturn = { data: { id: 'check-123', status: 'dispatching' }, error: null };
    const { getCheck } = await import('./checks');
    const row = await getCheck('check-123');
    expect(row).toMatchObject({ id: 'check-123' });
    const sel = rec.selects.find((s) => s.table === 'checks');
    expect(sel?.eq).toContainEqual(['id', 'check-123']);
  });
});

describe('lib/checks acceptCheck', () => {
  it('calls the accept_check RPC with the check id', async () => {
    const { acceptCheck } = await import('./checks');
    await acceptCheck('check-123');
    expect(supabaseMock.rpc).toHaveBeenCalledWith('accept_check', { p_check_id: 'check-123' });
  });

  it('surfaces the RPC error (e.g. already taken) by throwing', async () => {
    rpcReturn = { data: null, error: { message: 'check already taken or not open' } };
    const { acceptCheck } = await import('./checks');
    await expect(acceptCheck('check-123')).rejects.toThrow(/taken/i);
  });

  it('never UPDATEs checks.scout_id directly', async () => {
    const { acceptCheck } = await import('./checks');
    await acceptCheck('check-123');
    expect(rec.updates.filter((u) => u.table === 'checks')).toHaveLength(0);
  });
});

describe('lib/checks markFilming', () => {
  it('transitions to filming via RPC', async () => {
    const { markFilming } = await import('./checks');
    await markFilming('check-123');
    expect(supabaseMock.rpc).toHaveBeenCalledWith('transition_check', {
      p_check_id: 'check-123',
      p_to: 'filming',
    });
  });
});

describe('lib/checks markDelivered', () => {
  it('inserts a stub clip BEFORE transitioning to delivered', async () => {
    const { markDelivered } = await import('./checks');
    await markDelivered('check-123', '2026-06-20T12:00:00Z', { lat: 25.79, lng: -80.13 });

    // a clips row was inserted with status stub + filmed_at + coords
    const clipInsert = rec.inserts.find((i) => i.table === 'clips');
    expect(clipInsert).toBeTruthy();
    expect(clipInsert?.values).toMatchObject({
      check_id: 'check-123',
      status: 'stub',
      filmed_at: '2026-06-20T12:00:00Z',
      filmed_lat: 25.79,
      filmed_lng: -80.13,
    });

    // transition to delivered
    expect(supabaseMock.rpc).toHaveBeenCalledWith('transition_check', {
      p_check_id: 'check-123',
      p_to: 'delivered',
    });

    // ORDER: the clip insert must precede the transition (deliver-needs-clip)
    expect(rec.order.indexOf('insert:clips')).toBeLessThan(
      rec.order.indexOf('rpc:transition_check'),
    );
  });

  it('works without optional coords', async () => {
    const { markDelivered } = await import('./checks');
    await markDelivered('check-123', '2026-06-20T12:00:00Z');
    const clipInsert = rec.inserts.find((i) => i.table === 'clips');
    expect(clipInsert?.values).toMatchObject({
      check_id: 'check-123',
      status: 'stub',
      filmed_lat: null,
      filmed_lng: null,
    });
  });

  it('does not transition if the clip insert errors', async () => {
    insertReturn = { data: null, error: { message: 'clip insert failed' } };
    const { markDelivered } = await import('./checks');
    await expect(markDelivered('check-123', '2026-06-20T12:00:00Z')).rejects.toBeTruthy();
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });
});

describe('lib/checks rateCheck', () => {
  it('inserts a rating THEN transitions to rated', async () => {
    const { rateCheck } = await import('./checks');
    await rateCheck('check-123', 4);

    const ratingInsert = rec.inserts.find((i) => i.table === 'ratings');
    expect(ratingInsert?.values).toMatchObject({
      check_id: 'check-123',
      seeker_id: 'seeker-1',
      stars: 4,
    });
    expect(supabaseMock.rpc).toHaveBeenCalledWith('transition_check', {
      p_check_id: 'check-123',
      p_to: 'rated',
    });
    expect(rec.order.indexOf('insert:ratings')).toBeLessThan(
      rec.order.indexOf('rpc:transition_check'),
    );
  });

  it('rejects out-of-range star values before any write', async () => {
    const { rateCheck } = await import('./checks');
    await expect(rateCheck('check-123', 0)).rejects.toThrow();
    await expect(rateCheck('check-123', 6)).rejects.toThrow();
    expect(rec.inserts).toHaveLength(0);
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });
});

describe('lib/checks cancelCheck', () => {
  it('transitions to cancelled via RPC', async () => {
    const { cancelCheck } = await import('./checks');
    await cancelCheck('check-123');
    expect(supabaseMock.rpc).toHaveBeenCalledWith('transition_check', {
      p_check_id: 'check-123',
      p_to: 'cancelled',
    });
  });
});

describe('lib/checks getCheckClip', () => {
  it('selects the delivered clip row for a check', async () => {
    maybeSingleReturn = {
      data: { id: 'clip-1', check_id: 'check-123', status: 'stub', filmed_at: 'x' },
      error: null,
    };
    const { getCheckClip } = await import('./checks');
    const clip = await getCheckClip('check-123');
    expect(clip).toMatchObject({ check_id: 'check-123' });
    const sel = rec.selects.find((s) => s.table === 'clips');
    expect(sel?.eq).toContainEqual(['check_id', 'check-123']);
  });

  it('returns null when there is no clip yet', async () => {
    maybeSingleReturn = { data: null, error: null };
    const { getCheckClip } = await import('./checks');
    expect(await getCheckClip('check-123')).toBeNull();
  });
});

describe('lib/checks DATA-02 invariant', () => {
  it('NO wrapper ever calls .from("checks").update(...) (status/scout_id are server-only)', async () => {
    const checks = await import('./checks');
    await checks.createCheck({ tier: 'standard', locationLabel: 'X' });
    await checks.listOpenChecks();
    await checks.acceptCheck('id');
    await checks.markFilming('id');
    await checks.markDelivered('id', '2026-06-20T12:00:00Z');
    await checks.rateCheck('id', 3);
    await checks.cancelCheck('id');
    expect(rec.updates.filter((u) => u.table === 'checks')).toHaveLength(0);
  });
});
