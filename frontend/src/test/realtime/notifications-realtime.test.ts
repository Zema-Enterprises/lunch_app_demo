import { describe, expect, test, vi } from 'vitest';
import { handshakeSchema, createMockHandshakeResponse } from '@/lib/realtime/handshake';
import { GATEWAY_HANDSHAKE_EVENT, NOTIFICATION_CREATED_EVENT } from '@/lib/realtime/constants';
import { setupNotificationsSocketMock } from './msw-socket';
import { createNotificationsSocket } from '@/lib/realtime/socket-client';

describe('Notifications realtime channel – handshake contract', () => {
  test('baseline handshake payload satisfies schema', () => {
    const payload = createMockHandshakeResponse();
    const result = handshakeSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  test('missing fallback polling interval is rejected', () => {
    const payload = createMockHandshakeResponse({ fallbackPollingMs: undefined });
    const result = handshakeSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

describe('Notifications realtime channel – mock socket prototype', () => {
  test('emits notification payloads to connected listeners', () => {
    const mockServer = setupNotificationsSocketMock();
    const socket = mockServer.connect({ user: { id: 'user_1', companyId: 'company_9' } });

    const handler = vi.fn();
    socket.on(NOTIFICATION_CREATED_EVENT, handler);

    const payload = {
      id: 'notif_123',
      companyId: 'company_9',
      userId: 'user_1',
      type: 'EVENT_CREATED',
    };

    mockServer.emit(NOTIFICATION_CREATED_EVENT, payload);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(payload);
  });

  test('createNotificationsSocket wires handler and exposes disconnect', async () => {
    const mockServer = setupNotificationsSocketMock();
    const onNotification = vi.fn();

    const handshakeListener = vi.fn();

    const client = createNotificationsSocket({
      user: { id: 'user_99', companyId: 'company_77' },
      connectionFactory: mockServer.connect,
      onNotification,
      onHandshake: handshakeListener,
    });

    expect(client.handshake).toBeDefined();
    expect(client.handshake?.user).toEqual({ id: 'user_99', companyId: 'company_77' });
    await Promise.resolve();
    expect(handshakeListener).toHaveBeenCalledWith(client.handshake);

    const payload = { id: 'notif_abc', companyId: 'company_77', userId: 'user_99', type: 'EVENT_CREATED' };
    mockServer.emit(NOTIFICATION_CREATED_EVENT, payload);
    expect(onNotification).toHaveBeenCalledWith(payload);

    client.disconnect();
    mockServer.emit(NOTIFICATION_CREATED_EVENT, payload);
    expect(onNotification).toHaveBeenCalledTimes(1);
  });

  test('supports connection factories without eager handshake payload', async () => {
    let handshakeEmitter: ((payload: unknown) => void) | undefined;
    const connectionFactory = () => ({
      handshake: undefined,
      on: (event: string, handler: (...args: any[]) => void) => {
        if (event === GATEWAY_HANDSHAKE_EVENT) {
          handshakeEmitter = handler;
        }
      },
      close: vi.fn(),
    });

    const onHandshake = vi.fn();
    const onNotification = vi.fn();

    const client = createNotificationsSocket({
      user: { id: 'user_async', companyId: 'company_async' },
      connectionFactory,
      onNotification,
      onHandshake,
    });

    expect(client.handshake).toBeUndefined();

    const payload = createMockHandshakeResponse({
      user: { id: 'user_async', companyId: 'company_async' },
    });

    handshakeEmitter?.(payload);
    await Promise.resolve();

    expect(onHandshake).toHaveBeenCalledWith(payload);
  });
});
