"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const notifications_gateway_server_1 = require("../../realtime/notifications.gateway.server");
const notifications_gateway_1 = require("../../realtime/notifications.gateway");
const constants_1 = require("../../realtime/constants");
const jwt_1 = require("../../utils/jwt");
(0, globals_1.describe)('createNotificationsServer', () => {
    const makeRedisClients = () => {
        const createAsyncMock = () => globals_1.jest.fn(async () => undefined);
        const subClient = {
            connect: createAsyncMock(),
            disconnect: createAsyncMock(),
        };
        const pubClient = {
            connect: createAsyncMock(),
            disconnect: createAsyncMock(),
            duplicate: globals_1.jest.fn().mockReturnValue(subClient),
        };
        const redisFactory = globals_1.jest.fn((options) => pubClient);
        const adapterFn = globals_1.jest.fn();
        const adapterFactory = globals_1.jest.fn((pub, sub) => adapterFn);
        return { pubClient, subClient, redisFactory, adapterFactory, adapterFn };
    };
    const setupIo = () => {
        const onMock = globals_1.jest.fn();
        const namespace = {
            on: onMock,
            to: globals_1.jest.fn(() => namespace),
            emit: globals_1.jest.fn(),
        };
        const io = {
            of: globals_1.jest.fn(() => namespace),
            adapter: globals_1.jest.fn(),
        };
        return { io, namespace, onMock };
    };
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.useFakeTimers();
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.useRealTimers();
    });
    (0, globals_1.it)('wires redis adapter, joins rooms, and emits handshake', async () => {
        const { pubClient, subClient, redisFactory, adapterFactory, adapterFn } = makeRedisClients();
        const { io, onMock, namespace } = setupIo();
        const server = await (0, notifications_gateway_server_1.createNotificationsServer)({ io, redisFactory, adapterFactory });
        (0, globals_1.expect)(redisFactory).toHaveBeenCalledWith({ url: 'redis://localhost:6379' });
        (0, globals_1.expect)(pubClient.connect).toHaveBeenCalled();
        (0, globals_1.expect)(subClient.connect).toHaveBeenCalled();
        (0, globals_1.expect)(adapterFactory).toHaveBeenCalledWith(pubClient, subClient);
        (0, globals_1.expect)(io.adapter).toHaveBeenCalledWith(adapterFn);
        (0, globals_1.expect)(io.of).toHaveBeenCalledWith('/notifications');
        const connectionHandler = onMock.mock.calls[0][1];
        const join = globals_1.jest.fn();
        const emit = globals_1.jest.fn();
        const registeredHandlers = {};
        const token = (0, jwt_1.generateToken)({
            userId: 'user_1',
            email: 'user1@example.com',
            companyId: 'company_5',
            role: 'USER',
        });
        const socket = {
            handshake: { auth: { token: `Bearer ${token}` }, headers: {} },
            join,
            emit,
            on: globals_1.jest.fn((event, handler) => {
                registeredHandlers[event] = handler;
            }),
            disconnect: globals_1.jest.fn(),
        };
        connectionHandler(socket);
        (0, globals_1.expect)(join).toHaveBeenNthCalledWith(1, 'company:company_5');
        (0, globals_1.expect)(join).toHaveBeenNthCalledWith(2, 'user:user_1');
        (0, globals_1.expect)(emit).toHaveBeenCalledWith(constants_1.GATEWAY_HANDSHAKE_EVENT, globals_1.expect.objectContaining({ user: { id: 'user_1', companyId: 'company_5' } }));
        globals_1.jest.advanceTimersByTime(notifications_gateway_1.DEFAULT_HEARTBEAT_MS);
        (0, globals_1.expect)(emit).toHaveBeenCalledWith(constants_1.GATEWAY_HEARTBEAT_EVENT, globals_1.expect.objectContaining({ ts: globals_1.expect.any(Number) }));
        registeredHandlers['disconnect']?.();
        globals_1.jest.advanceTimersByTime(notifications_gateway_1.DEFAULT_HEARTBEAT_MS);
        (0, globals_1.expect)(emit).toHaveBeenCalledTimes(2);
        const notificationPayload = { id: 'notif-1' };
        server.emitNotification('company_5', notificationPayload, { userId: 'user_1' });
        (0, globals_1.expect)(namespace.to).toHaveBeenNthCalledWith(1, 'company:company_5');
        (0, globals_1.expect)(namespace.emit).toHaveBeenNthCalledWith(1, constants_1.NOTIFICATION_CREATED_EVENT, notificationPayload);
        (0, globals_1.expect)(namespace.to).toHaveBeenNthCalledWith(2, 'user:user_1');
        (0, globals_1.expect)(namespace.emit).toHaveBeenNthCalledWith(2, constants_1.NOTIFICATION_CREATED_EVENT, notificationPayload);
        await server.close();
        (0, globals_1.expect)(pubClient.disconnect).toHaveBeenCalled();
        (0, globals_1.expect)(subClient.disconnect).toHaveBeenCalled();
    });
    (0, globals_1.it)('disconnects sockets without valid tokens', async () => {
        const { redisFactory, adapterFactory } = makeRedisClients();
        const { io, onMock } = setupIo();
        await (0, notifications_gateway_server_1.createNotificationsServer)({ io, redisFactory, adapterFactory });
        const connectionHandler = onMock.mock.calls[0][1];
        const socket = {
            handshake: { auth: {}, headers: {} },
            disconnect: globals_1.jest.fn(),
            join: globals_1.jest.fn(),
            emit: globals_1.jest.fn(),
            on: globals_1.jest.fn(),
        };
        connectionHandler(socket);
        (0, globals_1.expect)(socket.disconnect).toHaveBeenCalledWith(true);
        (0, globals_1.expect)(socket.join).not.toHaveBeenCalled();
    });
    (0, globals_1.it)('supports Bearer token in authorization header', async () => {
        const { redisFactory, adapterFactory } = makeRedisClients();
        const { io, onMock } = setupIo();
        await (0, notifications_gateway_server_1.createNotificationsServer)({ io, redisFactory, adapterFactory });
        const connectionHandler = onMock.mock.calls[0][1];
        const token = (0, jwt_1.generateToken)({
            userId: 'user_A',
            email: 'userA@example.com',
            companyId: 'company_Z',
            role: 'ADMIN',
        });
        const join = globals_1.jest.fn();
        const emit = globals_1.jest.fn();
        const socket = {
            handshake: { auth: {}, headers: { authorization: `Bearer ${token}` } },
            join,
            emit,
            on: globals_1.jest.fn(),
            disconnect: globals_1.jest.fn(),
        };
        connectionHandler(socket);
        (0, globals_1.expect)(join).toHaveBeenCalledWith('company:company_Z');
        (0, globals_1.expect)(emit).toHaveBeenCalledWith(constants_1.GATEWAY_HANDSHAKE_EVENT, globals_1.expect.objectContaining({ user: { id: 'user_A', companyId: 'company_Z' } }));
    });
});
