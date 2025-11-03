import { beforeEach, describe, expect, it } from 'vitest';
import { createMockHandshakeResponse } from '@/lib/realtime/handshake';
import {
  useNotificationsRealtimeStore,
  selectNotificationsRefetchInterval,
  DEFAULT_FALLBACK_MS,
} from '@/store/notificationsRealtimeStore';

describe('notificationsRealtimeStore', () => {
  beforeEach(() => {
    useNotificationsRealtimeStore.getState().reset();
  });

  it('sets status to connected when realtime flag enabled', () => {
    const handshake = createMockHandshakeResponse({
      featureFlags: { notificationsRealtime: true },
      heartbeatMs: 20_000,
      fallbackPollingMs: 15_000,
    });

    useNotificationsRealtimeStore.getState().applyHandshake(handshake);

    const state = useNotificationsRealtimeStore.getState();
    expect(state.status).toBe('connected');
    expect(state.fallbackPollingMs).toBe(15_000);
    expect(selectNotificationsRefetchInterval(state)).toBe(false);
  });

  it('falls back to polling when realtime flag disabled', () => {
    const handshake = createMockHandshakeResponse({
      featureFlags: { notificationsRealtime: false },
      fallbackPollingMs: 45_000,
    });

    useNotificationsRealtimeStore.getState().applyHandshake(handshake);

    const state = useNotificationsRealtimeStore.getState();
    expect(state.status).toBe('fallback');
    expect(state.fallbackPollingMs).toBe(45_000);
    expect(selectNotificationsRefetchInterval(state)).toBe(45_000);
  });

  it('enforceFallback overrides interval and status', () => {
    useNotificationsRealtimeStore.getState().enforceFallback(12_000);
    const state = useNotificationsRealtimeStore.getState();
    expect(state.status).toBe('fallback');
    expect(state.fallbackPollingMs).toBe(12_000);
  });

  it('reset returns to initial idle state', () => {
    useNotificationsRealtimeStore.getState().enforceFallback(10_000);
    useNotificationsRealtimeStore.getState().reset();
    const state = useNotificationsRealtimeStore.getState();
    expect(state.status).toBe('idle');
    expect(state.fallbackPollingMs).toBe(DEFAULT_FALLBACK_MS);
  });
});
