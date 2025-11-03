"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeHandshake = exports.deriveRoomNames = exports.buildHandshakePayload = exports.DEFAULT_FALLBACK_POLLING_MS = exports.DEFAULT_HEARTBEAT_MS = void 0;
const crypto_1 = require("crypto");
const constants_1 = require("./constants");
exports.DEFAULT_HEARTBEAT_MS = 25_000;
exports.DEFAULT_FALLBACK_POLLING_MS = 30_000;
const buildHandshakePayload = (user, options = {}) => {
    const connectionId = options.connectionId ?? (0, crypto_1.randomUUID)();
    return {
        connectionId,
        heartbeatMs: options.heartbeatMs ?? exports.DEFAULT_HEARTBEAT_MS,
        fallbackPollingMs: options.fallbackPollingMs ?? exports.DEFAULT_FALLBACK_POLLING_MS,
        featureFlags: {
            notificationsRealtime: options.featureFlags?.notificationsRealtime ?? true,
        },
        user,
    };
};
exports.buildHandshakePayload = buildHandshakePayload;
const deriveRoomNames = (user) => ({
    companyRoom: `company:${user.companyId}`,
    userRoom: `user:${user.id}`,
});
exports.deriveRoomNames = deriveRoomNames;
const completeHandshake = (socket, user, options) => {
    const handshake = (0, exports.buildHandshakePayload)(user, options);
    const rooms = (0, exports.deriveRoomNames)(user);
    socket.join(rooms.companyRoom);
    socket.join(rooms.userRoom);
    socket.emit(constants_1.GATEWAY_HANDSHAKE_EVENT, handshake);
    return { handshake, rooms };
};
exports.completeHandshake = completeHandshake;
