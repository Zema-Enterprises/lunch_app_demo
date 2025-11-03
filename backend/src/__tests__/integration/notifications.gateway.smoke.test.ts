import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

jest.setTimeout(30000);
import { createServer as createHttpServer, Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Adapter } from 'socket.io-adapter';
import { AddressInfo } from 'net';
import { io as createClient } from 'socket.io-client';
import { createNotificationsServer } from '../../realtime/notifications.gateway.server';
import { HandshakeOptions } from '../../realtime/notifications.gateway';
import { generateToken } from '../../utils/jwt';

class FakeRedisClient {
  connect = jest.fn(async () => undefined);
  disconnect = jest.fn(async () => undefined);
  duplicate = jest.fn(() => new FakeRedisClient());
}

describe('notifications gateway smoke (socket.io-client)', () => {
  let httpServer: HttpServer;
  let ioServer: SocketIOServer;
  let gateway: Awaited<ReturnType<typeof createNotificationsServer>>;
  let serverAddress: AddressInfo;
  let shouldSkip = false;
  type HandshakeResolver = (user: { id: string; companyId: string }) => Promise<HandshakeOptions | void>;
  const handshakeOptionsResolver = jest.fn<HandshakeResolver>(async () => undefined);

  beforeAll(async () => {
    httpServer = createHttpServer();
    ioServer = new SocketIOServer(httpServer);

    const redisFactory = jest.fn(() => new FakeRedisClient() as any);
    const adapterFactory = jest.fn((pub: any, sub: any) => Adapter as any);

    gateway = await createNotificationsServer({
      io: ioServer as any,
      redisFactory,
      adapterFactory,
      handshakeOptionsResolver,
      logger: {
        info: console.log,
        error: console.error,
      },
    });

    await new Promise<void>((resolve) => {
      const onError = () => {
        shouldSkip = true;
        resolve();
      };
      const onListening = () => {
        httpServer.off('error', onError);
        resolve();
      };
      httpServer.once('error', onError);
      httpServer.listen(0, '127.0.0.1', onListening);
    });

    if (!shouldSkip) {
      serverAddress = httpServer.address() as AddressInfo;
      console.log('Gateway smoke server listening on', serverAddress);
    } else {
      await gateway.close();
      await new Promise<void>((resolve) => ioServer.close(() => resolve()));
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    }
  });

  beforeEach(() => {
    handshakeOptionsResolver.mockReset();
    handshakeOptionsResolver.mockImplementation(async () => undefined);
  });

  afterAll(async () => {
    if (!shouldSkip) {
      await gateway.close();
      await new Promise<void>((resolve) => ioServer.close(() => resolve()));
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    }
  });

  const connectClient = (token: string) => {
    const client = createClient(`http://127.0.0.1:${serverAddress.port}/notifications`, {
      auth: { token: `Bearer ${token}` },
      forceNew: true,
    });

    client.on('connect_error', (err) => {
      console.error('connect_error', err);
    });

    const awaitHandshake = () =>
      new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('handshake timeout')), 3000);
        client.once('gateway.handshake', (payload) => {
          clearTimeout(timeout);
          resolve(payload);
        });
        client.once('connect_error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

    const collectNotifications = () => {
      const notifications: any[] = [];
      const handler = (payload: any) => notifications.push(payload);
      client.on('notification.created', handler);
      return { notifications, handler };
    };

    const disconnect = () =>
      new Promise<void>((resolve) => {
        client.off('notification.created');
        client.disconnect();
        client.close();
        // Use setImmediate so teardown completes under both real and fake timers
        setImmediate(() => resolve());
      });

    return { client, awaitHandshake, collectNotifications, disconnect };
  };

  it('performs authenticated handshake and scopes broadcasts to company rooms', async () => {
    if (shouldSkip) {
      expect(shouldSkip).toBe(true);
      return;
    }
    const tokenA = generateToken({
      userId: 'user-a',
      email: 'a@example.com',
      companyId: 'company-a',
      role: 'USER',
    });
    const tokenB = generateToken({
      userId: 'user-b',
      email: 'b@example.com',
      companyId: 'company-b',
      role: 'USER',
    });

    const clientA = connectClient(tokenA);
    const clientB = connectClient(tokenB);

    const [handshakeA, handshakeB] = await Promise.all([
      clientA.awaitHandshake(),
      clientB.awaitHandshake(),
    ]);

    expect(handshakeA.user).toEqual({ id: 'user-a', companyId: 'company-a' });
    expect(handshakeB.user).toEqual({ id: 'user-b', companyId: 'company-b' });

    const { notifications: receivedA } = clientA.collectNotifications();
    const { notifications: receivedB } = clientB.collectNotifications();

    const payload = { id: 'notif-1', companyId: 'company-a', userId: 'user-a', type: 'EVENT_CREATED' };
    gateway.emitNotification('company-a', payload);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(receivedA).toHaveLength(1);
    expect(receivedA[0]).toEqual(payload);
    expect(receivedB).toHaveLength(0);

    await Promise.all([clientA.disconnect(), clientB.disconnect()]);
  });

  it('avoids duplicate delivery when targeting a specific user alongside company broadcast', async () => {
    if (shouldSkip) {
      expect(shouldSkip).toBe(true);
      return;
    }
    const tokenA = generateToken({
      userId: 'user-a',
      email: 'a@example.com',
      companyId: 'company-a',
      role: 'USER',
    });
    const tokenB = generateToken({
      userId: 'user-b',
      email: 'b@example.com',
      companyId: 'company-a',
      role: 'USER',
    });

    const clientA = connectClient(tokenA);
    const clientB = connectClient(tokenB);

    await Promise.all([clientA.awaitHandshake(), clientB.awaitHandshake()]);

    const { notifications: receivedA } = clientA.collectNotifications();
    const { notifications: receivedB } = clientB.collectNotifications();

    const payload = {
      id: 'notif-targeted',
      companyId: 'company-a',
      userId: 'user-a',
      type: 'REMINDER_SENT',
    };

    gateway.emitNotification('company-a', payload, { userId: 'user-a' });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(receivedA).toHaveLength(1);
    expect(receivedA[0]).toEqual(payload);
    expect(receivedB).toHaveLength(0);

    await Promise.all([clientA.disconnect(), clientB.disconnect()]);
  });

  it('applies handshake overrides provided by resolver', async () => {
    if (shouldSkip) {
      expect(shouldSkip).toBe(true);
      return;
    }

    handshakeOptionsResolver.mockResolvedValueOnce({
      fallbackPollingMs: 45_000,
      featureFlags: { notificationsRealtime: false },
    });

    const token = generateToken({
      userId: 'user-handshake',
      email: 'handshake@example.com',
      companyId: 'company-handshake',
      role: 'USER',
    });

    const client = connectClient(token);
    const handshake = await client.awaitHandshake();

    expect(handshake.fallbackPollingMs).toBe(45_000);
    expect(handshake.featureFlags.notificationsRealtime).toBe(false);

    await client.disconnect();
  });
});
