"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const ioredis_1 = __importDefault(require("ioredis"));
const redis_adapter_1 = require("@socket.io/redis-adapter");
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const logger_1 = require("./utils/logger");
const notifications_gateway_server_1 = require("./realtime/notifications.gateway.server");
const notifications_registry_1 = require("./realtime/notifications.registry");
const PORT = env_1.env.PORT;
const createRedisClient = ({ url, socket }) => {
    const options = { lazyConnect: true };
    if (socket?.tls) {
        options.tls = {};
    }
    return new ioredis_1.default(url, options);
};
const createSocketServer = () => {
    const httpServer = http_1.default.createServer(app_1.default);
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: env_1.env.NODE_ENV === 'production'
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
    let notificationsGateway = null;
    try {
        notificationsGateway = await (0, notifications_gateway_server_1.createNotificationsServer)({
            io: io,
            redisFactory: createRedisClient,
            adapterFactory: (pubClient, subClient) => (0, redis_adapter_1.createAdapter)(pubClient, subClient),
            logger: logger_1.logger,
        });
        (0, notifications_registry_1.registerNotificationsGateway)(notificationsGateway);
        logger_1.logger.info('Notifications realtime gateway initialised');
    }
    catch (error) {
        logger_1.logger.error('Failed to initialise realtime gateway', { error });
    }
    httpServer.listen(PORT, () => {
        logger_1.logger.info(`Server running on port ${PORT}`);
        logger_1.logger.info(`Environment: ${env_1.env.NODE_ENV}`);
    });
    const shutdown = async () => {
        logger_1.logger.info('Shutting down server');
        (0, notifications_registry_1.clearNotificationsGateway)();
        try {
            await Promise.all([
                notificationsGateway?.close?.(),
                new Promise((resolve) => {
                    io.close(() => resolve());
                }),
                new Promise((resolve) => {
                    httpServer.close(() => resolve());
                }),
            ]);
        }
        catch (error) {
            logger_1.logger.error('Error during shutdown', { error });
        }
        finally {
            process.exit(0);
        }
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
};
start().catch((error) => {
    logger_1.logger.error('Failed to start server', { error });
    process.exit(1);
});
