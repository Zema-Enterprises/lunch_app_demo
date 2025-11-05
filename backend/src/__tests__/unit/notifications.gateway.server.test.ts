import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { createNotificationsServer } from '../../realtime/notifications.gateway.server';
import { DEFAULT_HEARTBEAT_MS } from '../../realtime/notifications.gateway';
import { GATEWAY_HANDSHAKE_EVENT, GATEWAY_HEARTBEAT_EVENT, NOTIFICATION_CREATED_EVENT } from '../../realtime/constants';
import { generateToken } from '../../utils/jwt';
import { recordRealtimeConnection, recordRealtimeDelivery } from '../../telemetry/notifications.telemetry';

jest.mock('../../telemetry/notifications.telemetry', () => ({
  recordRealtimeConnection: jest.fn(),
  recordRealtimeDelivery: jest.fn(),
}));

describe('createNotificationsServer', () => {
  const makeRedisClients = () => {
    const createAsyncMock = () => jest.fn(async () => undefined);

    const subClient: any = {
      connect: createAsyncMock(),
      disconnect: createAsyncMock(),
    };

    const pubClient: any = {
      connect: createAsyncMock(),
      disconnect: createAsyncMock(),
      duplicate: jest.fn().mockReturnValue(subClient),
    };

    const redisFactory = jest.fn((options: any) => pubClient);
    const adapterFn = jest.fn();
    const adapterFactory = jest.fn((pub: any, sub: any) => adapterFn);

    return { pubClient, subClient, redisFactory, adapterFactory, adapterFn };
  };

  const setupIo = () => {
    const onMock = jest.fn();
    const namespace = {
      on: onMock,
      to: jest.fn(() => namespace),
      emit: jest.fn(),
    } as any;
    const io = {
      of: jest.fn(() => namespace),
      adapter: jest.fn(),
    } as any;

    return { io, namespace, onMock };
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('wires redis adapter, joins rooms, and emits handshake', async () => {
    const { pubClient, subClient, redisFactory, adapterFactory, adapterFn } = makeRedisClients();

    const { io, onMock, namespace } = setupIo();

    const server = await createNotificationsServer({ io, redisFactory, adapterFactory });

    expect(redisFactory).toHaveBeenCalledWith({ url: 'redis://localhost:6379' });
    expect(pubClient.connect).toHaveBeenCalled();
    expect(subClient.connect).toHaveBeenCalled();
    expect(adapterFactory).toHaveBeenCalledWith(pubClient, subClient);
    expect(io.adapter).toHaveBeenCalledWith(adapterFn);
    expect(io.of).toHaveBeenCalledWith('/notifications');

    const connectionHandler = onMock.mock.calls[0][1] as (socket: any) => void;

    const join = jest.fn();
    const emit = jest.fn();
    const registeredHandlers: Record<string, Function> = {};
    const token = generateToken({
      userId: 'user_1',
      email: 'user1@example.com',
      companyId: 'company_5',
      role: 'USER',
    });

    const socket = {
      handshake: { auth: { token: `Bearer ${token}` }, headers: {} },
      join,
      emit,
      on: jest.fn((event: string, handler: Function) => {
        registeredHandlers[event] = handler;
      }),
      disconnect: jest.fn(),
    } as any;

    connectionHandler(socket);

    expect(join).toHaveBeenNthCalledWith(1, 'company:company_5');
    expect(join).toHaveBeenNthCalledWith(2, 'user:user_1');
    const handshakePayload = emit.mock.calls.find(([event]) => event === GATEWAY_HANDSHAKE_EVENT)?.[1];
    expect(handshakePayload).toEqual(
      expect.objectContaining({ user: { id: 'user_1', companyId: 'company_5' }, connectionId: expect.any(String) })
    );
    const typedHandshake = handshakePayload as any;
    expect(recordRealtimeConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'connected',
        userId: 'user_1',
        companyId: 'company_5',
        connectionId: typedHandshake.connectionId,
        activeConnections: 1,
      })
    );

    jest.advanceTimersByTime(DEFAULT_HEARTBEAT_MS);
    expect(emit).toHaveBeenCalledWith(
      GATEWAY_HEARTBEAT_EVENT,
      expect.objectContaining({ ts: expect.any(Number) })
    );

    registeredHandlers['disconnect']?.();
    jest.advanceTimersByTime(DEFAULT_HEARTBEAT_MS);
    expect(emit).toHaveBeenCalledTimes(2);
    expect(recordRealtimeConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'disconnected',
        userId: 'user_1',
        companyId: 'company_5',
        connectionId: typedHandshake.connectionId,
        activeConnections: 0,
      })
    );

    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-10-19T12:00:02.000Z').getTime());
    const notificationPayload = { id: 'notif-1', createdAt: '2025-10-19T12:00:00.000Z' };
    server.emitNotification('company_5', notificationPayload, { userId: 'user_1' });
    
    // When userId is specified, emit ONLY to user room (not company room) to prevent duplicates
    expect(namespace.to).toHaveBeenCalledTimes(1);
    expect(namespace.to).toHaveBeenCalledWith('user:user_1');
    expect(namespace.emit).toHaveBeenCalledTimes(1);
    expect(namespace.emit).toHaveBeenCalledWith(NOTIFICATION_CREATED_EVENT, notificationPayload);
    
    expect(recordRealtimeDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company_5',
        userId: 'user_1',
        notificationId: 'notif-1',
        eventName: NOTIFICATION_CREATED_EVENT,
        latencyMs: 2000,
        target: 'user',
      })
    );
    nowSpy.mockRestore();

    await server.close();
    expect(pubClient.disconnect).toHaveBeenCalled();
    expect(subClient.disconnect).toHaveBeenCalled();
  });

  it('disconnects sockets without valid tokens', async () => {
    const { redisFactory, adapterFactory } = makeRedisClients();

    const { io, onMock } = setupIo();
    await createNotificationsServer({ io, redisFactory, adapterFactory });

    const connectionHandler = onMock.mock.calls[0][1] as (socket: any) => void;

    const socket = {
      handshake: { auth: {}, headers: {} },
      disconnect: jest.fn(),
      join: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
    } as any;

    connectionHandler(socket);
    expect(socket.disconnect).toHaveBeenCalledWith(true);
    expect(socket.join).not.toHaveBeenCalled();
  });

  it('supports Bearer token in authorization header', async () => {
    const { redisFactory, adapterFactory } = makeRedisClients();

    const { io, onMock } = setupIo();
    await createNotificationsServer({ io, redisFactory, adapterFactory });

    const connectionHandler = onMock.mock.calls[0][1] as (socket: any) => void;

    const token = generateToken({
      userId: 'user_A',
      email: 'userA@example.com',
      companyId: 'company_Z',
      role: 'ADMIN',
    });

    const join = jest.fn();
    const emit = jest.fn();
    const socket = {
      handshake: { auth: {}, headers: { authorization: `Bearer ${token}` } },
      join,
      emit,
      on: jest.fn(),
      disconnect: jest.fn(),
    } as any;

    connectionHandler(socket);

    expect(join).toHaveBeenCalledWith('company:company_Z');
    expect(emit).toHaveBeenCalledWith(
      GATEWAY_HANDSHAKE_EVENT,
      expect.objectContaining({ user: { id: 'user_A', companyId: 'company_Z' } })
    );
  });
});
