"use strict";
/**
 * Notification Service - Phase 4
 *
 * Handles notification event creation and user preference checking.
 * Does NOT handle actual email/in-app delivery (that's Phase 5).
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserNotificationSettings = getUserNotificationSettings;
exports.shouldNotifyUser = shouldNotifyUser;
exports.createNotificationEvent = createNotificationEvent;
exports.createNotificationEvents = createNotificationEvents;
exports.getUnreadNotifications = getUnreadNotifications;
exports.markNotificationAsRead = markNotificationAsRead;
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
exports.getUnreadNotificationCount = getUnreadNotificationCount;
exports.deleteOldReadNotifications = deleteOldReadNotifications;
const database_1 = __importDefault(require("../../config/database"));
const notifications_dispatcher_1 = require("../../realtime/notifications.dispatcher");
/**
 * Get user's notification settings (or create default if not exists)
 */
async function getUserNotificationSettings(userId) {
    let settings = await database_1.default.userNotificationSettings.findUnique({
        where: { userId },
    });
    // Create default settings if user doesn't have any
    if (!settings) {
        settings = await database_1.default.userNotificationSettings.create({
            data: {
                userId,
                emailEnabled: true,
                inAppEnabled: true,
                notifyOnEventCreated: false,
                notifyOnOrderPlaced: true,
                notifyOnDeadlineApproaching: true,
                notifyOnEventClosed: true,
                notifyOnPaymentConfirmed: true,
                notifyOnEventCompleted: true,
            },
        });
    }
    return settings;
}
/**
 * Check if user should be notified for a given notification type
 */
async function shouldNotifyUser(userId, type) {
    const settings = await getUserNotificationSettings(userId);
    // If both channels disabled, don't notify
    if (!settings.emailEnabled && !settings.inAppEnabled) {
        return false;
    }
    // Check type-specific settings
    switch (type) {
        case 'EVENT_CREATED':
            return settings.notifyOnEventCreated;
        case 'ORDER_PLACED':
        case 'ORDER_UPDATED':
            return settings.notifyOnOrderPlaced;
        case 'EVENT_CLOSING_SOON':
            return settings.notifyOnDeadlineApproaching;
        case 'EVENT_CLOSED':
            return settings.notifyOnEventClosed;
        case 'PAYMENT_CONFIRMED':
            return settings.notifyOnPaymentConfirmed;
        case 'EVENT_COMPLETED':
        case 'EVENT_DELIVERED':
            return settings.notifyOnEventCompleted;
        case 'USER_JOINED_EVENT':
            return true; // Always notify event creator when someone joins
        default:
            return true; // Default to notify for unknown types
    }
}
/**
 * Create a notification event (will be sent later in Phase 5)
 */
async function createNotificationEvent(options) {
    const { type, userId, eventId, orderId } = options;
    // Check if user wants this notification
    const shouldNotify = await shouldNotifyUser(userId, type);
    if (!shouldNotify) {
        return null; // User has disabled this notification type
    }
    // Create notification event record
    const notification = await database_1.default.notificationEvent.create({
        data: {
            type,
            userId,
            eventId,
            orderId,
            read: false,
            sentEmail: false,
            sentInApp: false,
        },
        include: {
            user: true,
            event: true,
            order: true,
        },
    });
    (0, notifications_dispatcher_1.broadcastNotificationCreated)(notification);
    return notification;
}
/**
 * Create notification events for multiple users
 */
async function createNotificationEvents(type, userIds, options) {
    const notifications = [];
    for (const userId of userIds) {
        const notification = await createNotificationEvent({
            type,
            userId,
            eventId: options?.eventId,
            orderId: options?.orderId,
        });
        if (notification) {
            notifications.push(notification);
        }
    }
    return notifications;
}
/**
 * Get unread notifications for a user
 */
async function getUnreadNotifications(userId) {
    const notifications = await database_1.default.notificationEvent.findMany({
        where: {
            userId,
            read: false,
        },
        include: {
            event: true,
            order: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
    return notifications;
}
/**
 * Mark notification as read
 */
async function markNotificationAsRead(notificationId) {
    const notification = await database_1.default.notificationEvent.update({
        where: { id: notificationId },
        data: { read: true },
    });
    return notification;
}
/**
 * Mark all notifications as read for a user
 */
async function markAllNotificationsAsRead(userId) {
    const result = await database_1.default.notificationEvent.updateMany({
        where: {
            userId,
            read: false,
        },
        data: {
            read: true,
        },
    });
    return result;
}
/**
 * Get notification count for a user
 */
async function getUnreadNotificationCount(userId) {
    const count = await database_1.default.notificationEvent.count({
        where: {
            userId,
            read: false,
        },
    });
    return count;
}
/**
 * Delete old read notifications (cleanup utility for Phase 5 cron job)
 */
async function deleteOldReadNotifications(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const result = await database_1.default.notificationEvent.deleteMany({
        where: {
            read: true,
            createdAt: {
                lt: cutoffDate,
            },
        },
    });
    return result;
}
