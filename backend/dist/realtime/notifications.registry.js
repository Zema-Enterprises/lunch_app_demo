"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitRealtimeNotification = exports.getNotificationsGateway = exports.clearNotificationsGateway = exports.registerNotificationsGateway = void 0;
let gateway = null;
const registerNotificationsGateway = (instance) => {
    gateway = instance;
};
exports.registerNotificationsGateway = registerNotificationsGateway;
const clearNotificationsGateway = () => {
    gateway = null;
};
exports.clearNotificationsGateway = clearNotificationsGateway;
const getNotificationsGateway = () => gateway;
exports.getNotificationsGateway = getNotificationsGateway;
const emitRealtimeNotification = (companyId, payload, options) => {
    gateway?.emitNotification(companyId, payload, options);
};
exports.emitRealtimeNotification = emitRealtimeNotification;
