"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotificationsServer = void 0;
const notifications_gateway_1 = require("./notifications.gateway");
const constants_1 = require("./constants");
const redis_config_1 = require("./redis-config");
const jwt_1 = require("../utils/jwt");
const createNotificationsServer = async ({ io, redisUrl, redisTls, logger, redisFactory, adapterFactory, }) => {
    const env = { ...process.env };
    if (redisUrl)
        env.NOTIFICATIONS_REDIS_URL = redisUrl;
    if (redisTls !== undefined)
        env.NOTIFICATIONS_REDIS_TLS = redisTls ? 'true' : 'false';
    const config = (0, redis_config_1.buildRedisConfig)(env);
    const socketOptions = config.tls ? { socket: { tls: true } } : {};
    const pubClient = redisFactory({ url: config.url, ...socketOptions });
    const subClient = pubClient.duplicate();
    await pubClient.connect();
    await subClient.connect();
    io.adapter(adapterFactory(pubClient, subClient));
    const namespace = io.of('/notifications');
    namespace.on('connection', (socket) => {
        const token = extractAuthToken(socket);
        const user = extractUserFromToken(token, logger);
        if (!user) {
            logger?.error?.('Socket authentication failed: invalid token');
            socket.disconnect(true);
            return;
        }
        const handshake = (0, notifications_gateway_1.buildHandshakePayload)(user);
        const rooms = (0, notifications_gateway_1.deriveRoomNames)(user);
        socket.join(rooms.companyRoom);
        socket.join(rooms.userRoom);
        socket.emit(constants_1.GATEWAY_HANDSHAKE_EVENT, handshake);
        logger?.info?.('Socket connected', { userId: user.id, companyId: user.companyId });
        const interval = setInterval(() => {
            socket.emit(constants_1.GATEWAY_HEARTBEAT_EVENT, { ts: Date.now() });
        }, handshake.heartbeatMs ?? notifications_gateway_1.DEFAULT_HEARTBEAT_MS);
        socket.on('disconnect', () => {
            clearInterval(interval);
            logger?.info?.('Socket disconnected', { userId: user.id, companyId: user.companyId });
        });
    });
    return {
        namespace,
        close: async () => {
            await Promise.all([pubClient.disconnect(), subClient.disconnect()]);
        },
        emitNotification: (companyId, payload, options) => {
            const eventName = options?.event ?? constants_1.NOTIFICATION_CREATED_EVENT;
            namespace.to(`company:${companyId}`).emit(eventName, payload);
            if (options?.userId) {
                namespace.to(`user:${options.userId}`).emit(eventName, payload);
            }
        },
    };
};
exports.createNotificationsServer = createNotificationsServer;
const extractAuthToken = (socket) => {
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
const extractUserFromToken = (rawToken, logger) => {
    if (!rawToken)
        return null;
    const token = rawToken.startsWith('Bearer ') ? rawToken.slice(7).trim() : rawToken.trim();
    if (!token)
        return null;
    try {
        const payload = (0, jwt_1.verifyToken)(token);
        if (!payload?.userId || !payload?.companyId) {
            logger?.error?.('Socket authentication payload missing required fields', {
                userId: payload?.userId,
                companyId: payload?.companyId,
            });
            return null;
        }
        return { id: payload.userId, companyId: payload.companyId };
    }
    catch (error) {
        logger?.error?.('Socket authentication failed', { error });
        return null;
    }
};
