"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastNotificationCreated = void 0;
const notifications_registry_1 = require("./notifications.registry");
const constants_1 = require("./constants");
const buildBroadcastPayload = (notification) => {
    const base = {
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        eventId: notification.eventId ?? undefined,
        orderId: notification.orderId ?? undefined,
        createdAt: notification.createdAt instanceof Date
            ? notification.createdAt.toISOString()
            : notification.createdAt,
    };
    const meta = {};
    if (notification.event) {
        meta.event = {
            id: notification.event.id,
            title: notification.event.title,
            restaurantId: notification.event.restaurantId,
        };
    }
    if (notification.order) {
        meta.order = {
            id: notification.order.id,
            totalAmount: notification.order.totalAmount,
            paymentConfirmed: notification.order.paymentConfirmed,
            customOrder: notification.order.customOrder,
        };
    }
    return {
        ...base,
        ...meta,
    };
};
const broadcastNotificationCreated = (notification) => {
    const companyId = notification.user?.companyId;
    if (!companyId)
        return;
    const payload = buildBroadcastPayload(notification);
    (0, notifications_registry_1.emitRealtimeNotification)(companyId, { companyId, ...payload }, {
        userId: notification.userId,
        event: constants_1.NOTIFICATION_CREATED_EVENT,
    });
};
exports.broadcastNotificationCreated = broadcastNotificationCreated;
