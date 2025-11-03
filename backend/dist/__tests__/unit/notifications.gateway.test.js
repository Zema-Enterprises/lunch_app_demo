"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const notifications_gateway_1 = require("../../realtime/notifications.gateway");
(0, globals_1.describe)('notifications gateway handshake', () => {
    (0, globals_1.it)('builds handshake payload with defaults', () => {
        const payload = (0, notifications_gateway_1.buildHandshakePayload)({ id: 'user_1', companyId: 'company_9' });
        (0, globals_1.expect)(payload.connectionId).toEqual(globals_1.expect.any(String));
        (0, globals_1.expect)(payload.heartbeatMs).toBe(notifications_gateway_1.DEFAULT_HEARTBEAT_MS);
        (0, globals_1.expect)(payload.fallbackPollingMs).toBe(notifications_gateway_1.DEFAULT_FALLBACK_POLLING_MS);
        (0, globals_1.expect)(payload.featureFlags.notificationsRealtime).toBe(true);
        (0, globals_1.expect)(payload.user).toEqual({ id: 'user_1', companyId: 'company_9' });
    });
    (0, globals_1.it)('allows overriding heartbeat and feature flags', () => {
        const payload = (0, notifications_gateway_1.buildHandshakePayload)({ id: 'user_2', companyId: 'company_9' }, {
            heartbeatMs: 10_000,
            fallbackPollingMs: 45_000,
            featureFlags: { notificationsRealtime: false },
            connectionId: 'custom-conn',
        });
        (0, globals_1.expect)(payload.connectionId).toBe('custom-conn');
        (0, globals_1.expect)(payload.heartbeatMs).toBe(10_000);
        (0, globals_1.expect)(payload.fallbackPollingMs).toBe(45_000);
        (0, globals_1.expect)(payload.featureFlags.notificationsRealtime).toBe(false);
    });
});
(0, globals_1.describe)('notifications gateway room derivation', () => {
    (0, globals_1.it)('derives company and user rooms', () => {
        const rooms = (0, notifications_gateway_1.deriveRoomNames)({ id: 'user_3', companyId: 'company_7' });
        (0, globals_1.expect)(rooms).toEqual({ companyRoom: 'company:company_7', userRoom: 'user:user_3' });
    });
});
(0, globals_1.describe)('notifications gateway connection orchestration', () => {
    (0, globals_1.it)('joins rooms and emits handshake payload', () => {
        const join = jest.fn();
        const emit = jest.fn();
        const socket = {
            join,
            emit,
        };
        const { handshake, rooms } = (0, notifications_gateway_1.completeHandshake)(socket, {
            id: 'user_10',
            companyId: 'company_55',
        });
        (0, globals_1.expect)(rooms).toEqual({ companyRoom: 'company:company_55', userRoom: 'user:user_10' });
        (0, globals_1.expect)(join).toHaveBeenNthCalledWith(1, 'company:company_55');
        (0, globals_1.expect)(join).toHaveBeenNthCalledWith(2, 'user:user_10');
        (0, globals_1.expect)(emit).toHaveBeenCalledWith('gateway.handshake', handshake);
    });
});
