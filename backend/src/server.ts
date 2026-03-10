import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { createNotificationsServer, RedisClient, RedisClientFactory } from './realtime/notifications.gateway.server';
import { registerNotificationsGateway, clearNotificationsGateway } from './realtime/notifications.registry';
import { startDeadlineChecker, stopDeadlineChecker } from './scheduler/deadline-checker';

const PORT = env.PORT;

const createRedisClient: RedisClientFactory = ({ url, socket }) => {
  const options: any = { lazyConnect: true };
  if (socket?.tls) {
    options.tls = {};
  }
  return new Redis(url, options) as unknown as RedisClient;
};

const createSocketServer = () => {
  const httpServer = http.createServer(app);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin:
        env.NODE_ENV === 'production'
          ? process.env.FRONTEND_URL || 'http://localhost:3001'
          : ['http://localhost:3000', 'http://localhost:3001'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Authorization', 'Content-Type'],
      credentials: true,
    },
  });

  return { httpServer, io };
};

const start = async () => {
  const { httpServer, io } = createSocketServer();
  let notificationsGateway: Awaited<ReturnType<typeof createNotificationsServer>> | null = null;

  try {
    notificationsGateway = await createNotificationsServer({
      io: io as any,
      redisFactory: createRedisClient,
      adapterFactory: (pubClient, subClient) => createAdapter(pubClient, subClient),
      logger,
    });
    registerNotificationsGateway(notificationsGateway);
    logger.info('Notifications realtime gateway initialised');
  } catch (error) {
    logger.error('Failed to initialise realtime gateway', { error });
  }

  httpServer.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${env.NODE_ENV}`);
    startDeadlineChecker();
  });

  const shutdown = async () => {
    logger.info('Shutting down server');
    stopDeadlineChecker();
    clearNotificationsGateway();
    try {
      await Promise.all([
        notificationsGateway?.close?.(),
        new Promise<void>((resolve) => {
          io.close(() => resolve());
        }),
        new Promise<void>((resolve) => {
          httpServer.close(() => resolve());
        }),
      ]);
    } catch (error) {
      logger.error('Error during shutdown', { error });
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

start().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});
