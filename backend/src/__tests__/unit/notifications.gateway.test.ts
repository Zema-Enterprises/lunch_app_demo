import { describe, expect, it } from '@jest/globals';
import {
  buildHandshakePayload,
  DEFAULT_HEARTBEAT_MS,
  DEFAULT_FALLBACK_POLLING_MS,
  deriveRoomNames,
  completeHandshake,
} from '../../realtime/notifications.gateway';

describe('notifications gateway handshake', () => {
  it('builds handshake payload with defaults', () => {
    const payload = buildHandshakePayload({ id: 'user_1', companyId: 'company_9' });

    expect(payload.connectionId).toEqual(expect.any(String));
    expect(payload.heartbeatMs).toBe(DEFAULT_HEARTBEAT_MS);
    expect(payload.fallbackPollingMs).toBe(DEFAULT_FALLBACK_POLLING_MS);
    expect(payload.featureFlags.notificationsRealtime).toBe(true);
    expect(payload.user).toEqual({ id: 'user_1', companyId: 'company_9' });
  });

  it('allows overriding heartbeat and feature flags', () => {
    const payload = buildHandshakePayload(
      { id: 'user_2', companyId: 'company_9' },
      {
        heartbeatMs: 10_000,
        fallbackPollingMs: 45_000,
        featureFlags: { notificationsRealtime: false },
        connectionId: 'custom-conn',
      }
    );

    expect(payload.connectionId).toBe('custom-conn');
    expect(payload.heartbeatMs).toBe(10_000);
    expect(payload.fallbackPollingMs).toBe(45_000);
    expect(payload.featureFlags.notificationsRealtime).toBe(false);
  });
});

describe('notifications gateway room derivation', () => {
  it('derives company and user rooms', () => {
    const rooms = deriveRoomNames({ id: 'user_3', companyId: 'company_7' });
    expect(rooms).toEqual({ companyRoom: 'company:company_7', userRoom: 'user:user_3' });
  });
});

describe('notifications gateway connection orchestration', () => {
  it('joins rooms and emits handshake payload', () => {
    const join = jest.fn();
    const emit = jest.fn();
    const socket = {
      join,
      emit,
    } as any;

    const { handshake, rooms } = completeHandshake(socket, {
      id: 'user_10',
      companyId: 'company_55',
    });

    expect(rooms).toEqual({ companyRoom: 'company:company_55', userRoom: 'user:user_10' });
    expect(join).toHaveBeenNthCalledWith(1, 'company:company_55');
    expect(join).toHaveBeenNthCalledWith(2, 'user:user_10');
    expect(emit).toHaveBeenCalledWith('gateway.handshake', handshake);
  });
});
