import {
  buildHandshakePayload,
  deriveRoomNames,
  DEFAULT_HEARTBEAT_MS,
  HandshakeOptions,
} from './notifications.gateway';
import {
  GATEWAY_HANDSHAKE_EVENT,
  GATEWAY_HEARTBEAT_EVENT,
  NOTIFICATION_CREATED_EVENT,
} from './constants';
import { buildRedisConfig } from './redis-config';
import { verifyToken } from '../utils/jwt';
import { recordRealtimeConnection, recordRealtimeDelivery } from '../telemetry/notifications.telemetry';

interface SocketLike {
  handshake: {
    auth?: Record<string, any>;
    headers?: Record<string, any>;
  };
  join: (room: string) => void;
  emit: (event: string, payload: unknown) => void;
  on: (event: string, handler: (...args: any[]) => void) => void;
  disconnect: (close?: boolean) => void;
}

interface SocketNamespace {
  on: (event: 'connection', handler: (socket: SocketLike) => void) => void;
  to: (room: string) => SocketNamespace;
  emit: (event: string, payload: unknown) => void;
}

interface SocketServer {
  of: (namespace: string) => SocketNamespace;
  adapter: (adapter: any) => void;
}

interface NotificationsServerOptions {
  io: SocketServer;
  redisUrl?: string;
  redisTls?: boolean;
  logger?: { info: (msg: string, meta?: any) => void; error: (msg: string, meta?: any) => void };
  redisFactory: RedisClientFactory;
  adapterFactory: AdapterFactory;
  handshakeOptionsResolver?: (
    user: { id: string; companyId: string }
  ) => Promise<HandshakeOptions | void> | HandshakeOptions | void;
}

export type RedisClient = {
  connect: () => Promise<void>;
  disconnect: () => Promise<void> | void;
  duplicate: () => RedisClient;
};

export type RedisClientFactory = (options: { url: string; socket?: { tls: boolean } }) => RedisClient;

export type AdapterFactory = (pubClient: RedisClient, subClient: RedisClient) => (...args: any[]) => void;

export const createNotificationsServer = async ({
  io,
  redisUrl,
  redisTls,
  logger,
  redisFactory,
  adapterFactory,
  handshakeOptionsResolver,
}: NotificationsServerOptions) => {
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (redisUrl) env.NOTIFICATIONS_REDIS_URL = redisUrl;
  if (redisTls !== undefined) env.NOTIFICATIONS_REDIS_TLS = redisTls ? 'true' : 'false';

  const config = buildRedisConfig(env);

  const socketOptions = config.tls ? { socket: { tls: true } } : {};
  const pubClient = redisFactory({ url: config.url, ...(socketOptions as {}) });
  const subClient = pubClient.duplicate();

  await pubClient.connect();
  await subClient.connect();

  io.adapter(adapterFactory(pubClient, subClient));

  const namespace = io.of('/notifications');
  const activeConnections = new Map<string, { id: string; companyId: string }>();

  namespace.on('connection', (socket: SocketLike) => {
    const token = extractAuthToken(socket);
    const user = extractUserFromToken(token, logger);

    if (!user) {
      logger?.error?.('Socket authentication failed: invalid token');
      socket.disconnect(true);
      return;
    }

    const handleConnection = async () => {
      let handshakeOverrides: HandshakeOptions | undefined;
      if (handshakeOptionsResolver) {
        try {
          const resolved = await handshakeOptionsResolver(user);
          handshakeOverrides = resolved ?? undefined;
        } catch (error) {
          logger?.error?.('Failed to resolve handshake options', { error, userId: user.id });
        }
      }

      const handshake = buildHandshakePayload(user, handshakeOverrides);
      const rooms = deriveRoomNames(user);

      socket.join(rooms.companyRoom);
      socket.join(rooms.userRoom);
      socket.emit(GATEWAY_HANDSHAKE_EVENT, handshake);
      logger?.info?.('Socket connected', { userId: user.id, companyId: user.companyId });

      activeConnections.set(handshake.connectionId, user);
      recordRealtimeConnection({
        status: 'connected',
        userId: user.id,
        companyId: user.companyId,
        connectionId: handshake.connectionId,
        activeConnections: activeConnections.size,
      });

      const interval = setInterval(() => {
        socket.emit(GATEWAY_HEARTBEAT_EVENT, { ts: Date.now() });
      }, handshake.heartbeatMs ?? DEFAULT_HEARTBEAT_MS);

      socket.on('disconnect', () => {
        clearInterval(interval);
        logger?.info?.('Socket disconnected', { userId: user.id, companyId: user.companyId });
        activeConnections.delete(handshake.connectionId);
        recordRealtimeConnection({
          status: 'disconnected',
          userId: user.id,
          companyId: user.companyId,
          connectionId: handshake.connectionId,
          activeConnections: activeConnections.size,
        });
      });
    };

    handleConnection().catch((error) => {
      logger?.error?.('Socket connection handling failed', { error, userId: user.id });
      socket.disconnect(true);
    });
  });

  return {
    namespace,
    close: async () => {
      await Promise.all([
        Promise.resolve(pubClient.disconnect()),
        Promise.resolve(subClient.disconnect()),
      ]);
    },
    emitNotification: (companyId: string, payload: unknown, options?: { userId?: string; event?: string }) => {
      const eventName = options?.event ?? NOTIFICATION_CREATED_EVENT;
      namespace.to(`company:${companyId}`).emit(eventName, payload);

      const notificationId =
        typeof payload === 'object' && payload !== null ? (payload as any).id : undefined;
      const latencyMs = deriveLatencyMs(payload);

      recordRealtimeDelivery({
        companyId,
        notificationId,
        eventName,
        latencyMs,
        target: 'company',
      });

      if (options?.userId) {
        namespace.to(`user:${options.userId}`).emit(eventName, payload);
        recordRealtimeDelivery({
          companyId,
          userId: options.userId,
          notificationId,
          eventName,
          latencyMs,
          target: 'user',
        });
      }
    },
  };
};

const extractAuthToken = (socket: SocketLike): string | undefined => {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === 'string' && authToken.trim().length > 0) {
    return authToken;
  }

  const header = socket.handshake.headers?.authorization;
  if (Array.isArray(header)) {
    return header[0];
  }
  if (typeof header === 'string' && header.trim().length > 0) {
    return header;
  }
  return undefined;
};

const extractUserFromToken = (
  rawToken: string | undefined,
  logger?: { info: (msg: string, meta?: any) => void; error: (msg: string, meta?: any) => void }
) => {
  if (!rawToken) return null;
  const token = rawToken.startsWith('Bearer ') ? rawToken.slice(7).trim() : rawToken.trim();
  if (!token) return null;

  try {
    const payload = verifyToken(token);
    if (!payload?.userId || !payload?.companyId) {
      logger?.error?.('Socket authentication payload missing required fields', {
        userId: payload?.userId,
        companyId: payload?.companyId,
      });
      return null;
    }
    return { id: payload.userId, companyId: payload.companyId };
  } catch (error) {
    logger?.error?.('Socket authentication failed', { error });
    return null;
  }
};

const deriveLatencyMs = (payload: unknown) => {
  if (typeof payload !== 'object' || payload === null) {
    return undefined;
  }
  const createdAt = (payload as any).createdAt;
  if (typeof createdAt !== 'string') {
    return undefined;
  }
  const createdTimestamp = Date.parse(createdAt);
  if (Number.isNaN(createdTimestamp)) {
    return undefined;
  }
  const now = Date.now();
  return now >= createdTimestamp ? now - createdTimestamp : 0;
};
