// Unit tests for subscribeToCheck (DISP-04 — the Seeker watches ONE check live).
//
// Vitest runs in node; the Supabase Realtime client is mocked. We assert the
// channel is built with a single-row UPDATE filter (id=eq.<id>) on the checks
// table, that the registered postgres_changes handler forwards payload.new to
// onStatus, that a CHANNEL_ERROR / TIMED_OUT subscribe status invokes onError,
// and that the returned teardown removes the channel.

import { describe, it, expect, vi, beforeEach } from 'vitest';

type ChangeHandler = (payload: { new: unknown }) => void;
type StatusHandler = (status: string) => void;

let capturedChannelName: string | null = null;
let capturedOnConfig: any = null;
let capturedChangeHandler: ChangeHandler | null = null;
let capturedStatusHandler: StatusHandler | null = null;
let removedChannel: unknown = null;

const fakeChannel: any = {
  on: vi.fn((event: string, config: any, handler: ChangeHandler) => {
    capturedOnConfig = { event, config };
    capturedChangeHandler = handler;
    return fakeChannel;
  }),
  subscribe: vi.fn((statusHandler: StatusHandler) => {
    capturedStatusHandler = statusHandler;
    return fakeChannel;
  }),
};

const supabaseMock = {
  channel: vi.fn((name: string) => {
    capturedChannelName = name;
    return fakeChannel;
  }),
  removeChannel: vi.fn((ch: unknown) => {
    removedChannel = ch;
  }),
};

vi.mock('./supabase', () => ({ supabase: supabaseMock }));

beforeEach(() => {
  capturedChannelName = null;
  capturedOnConfig = null;
  capturedChangeHandler = null;
  capturedStatusHandler = null;
  removedChannel = null;
  vi.clearAllMocks();
});

describe('lib/realtime subscribeToCheck', () => {
  it('builds a postgres_changes UPDATE channel filtered to the single check row', async () => {
    const { subscribeToCheck } = await import('./realtime');
    subscribeToCheck('check-123', () => {});

    expect(supabaseMock.channel).toHaveBeenCalledTimes(1);
    expect(capturedChannelName).toContain('check-123');

    expect(capturedOnConfig.event).toBe('postgres_changes');
    expect(capturedOnConfig.config).toMatchObject({
      event: 'UPDATE',
      schema: 'public',
      table: 'checks',
      filter: 'id=eq.check-123',
    });
  });

  it('forwards payload.new to onStatus when the change handler fires', async () => {
    const onStatus = vi.fn();
    const { subscribeToCheck } = await import('./realtime');
    subscribeToCheck('check-123', onStatus);

    const row = { id: 'check-123', status: 'filming' };
    capturedChangeHandler!({ new: row });
    expect(onStatus).toHaveBeenCalledWith(row);
  });

  it('invokes onError on CHANNEL_ERROR', async () => {
    const onError = vi.fn();
    const { subscribeToCheck } = await import('./realtime');
    subscribeToCheck('check-123', () => {}, onError);

    capturedStatusHandler!('SUBSCRIBED');
    expect(onError).not.toHaveBeenCalled();

    capturedStatusHandler!('CHANNEL_ERROR');
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('invokes onError on TIMED_OUT', async () => {
    const onError = vi.fn();
    const { subscribeToCheck } = await import('./realtime');
    subscribeToCheck('check-123', () => {}, onError);

    capturedStatusHandler!('TIMED_OUT');
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('does not throw when onError is omitted and the channel errors', async () => {
    const { subscribeToCheck } = await import('./realtime');
    subscribeToCheck('check-123', () => {});
    expect(() => capturedStatusHandler!('CHANNEL_ERROR')).not.toThrow();
  });

  it('returns a teardown that removes the channel', async () => {
    const { subscribeToCheck } = await import('./realtime');
    const unsub = subscribeToCheck('check-123', () => {});
    expect(typeof unsub).toBe('function');

    unsub();
    expect(supabaseMock.removeChannel).toHaveBeenCalledTimes(1);
    expect(removedChannel).toBe(fakeChannel);
  });
});
