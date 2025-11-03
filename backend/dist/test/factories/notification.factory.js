"use strict";
/**
 * Notification factory for generating test notification data
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotificationEvent = createNotificationEvent;
exports.createNotificationEvents = createNotificationEvents;
exports.createUserNotificationSettings = createUserNotificationSettings;
exports.getDefaultNotificationSettings = getDefaultNotificationSettings;
exports.getAllNotificationsDisabledSettings = getAllNotificationsDisabledSettings;
const database_1 = __importDefault(require("../../config/database"));
/**
 * Create a notification event with factory defaults
 */
async function createNotificationEvent(data) {
    const notificationEvent = await database_1.default.notificationEvent.create({
        data: {
            type: data.type,
            userId: data.userId,
            eventId: data.eventId,
            orderId: data.orderId,
            read: data.read ?? false,
            sentEmail: data.sentEmail ?? false,
            sentInApp: data.sentInApp ?? false,
        },
        include: {
            user: true,
            event: true,
            order: true,
        },
    });
    return notificationEvent;
}
/**
 * Create multiple notification events
 */
async function createNotificationEvents(count, baseData) {
    const notifications = [];
    for (let i = 0; i < count; i++) {
        const notification = await createNotificationEvent(baseData);
        notifications.push(notification);
    }
    return notifications;
}
/**
 * Create user notification settings with factory defaults
 */
async function createUserNotificationSettings(data) {
    const settings = await database_1.default.userNotificationSettings.create({
        data: {
            userId: data.userId,
            emailEnabled: data.emailEnabled ?? true,
            inAppEnabled: data.inAppEnabled ?? true,
            notifyOnEventCreated: data.notifyOnEventCreated ?? false,
            notifyOnOrderPlaced: data.notifyOnOrderPlaced ?? true,
            notifyOnDeadlineApproaching: data.notifyOnDeadlineApproaching ?? true,
            notifyOnEventClosed: data.notifyOnEventClosed ?? true,
            notifyOnPaymentConfirmed: data.notifyOnPaymentConfirmed ?? true,
            notifyOnEventCompleted: data.notifyOnEventCompleted ?? true,
        },
        include: {
            user: true,
        },
    });
    return settings;
}
/**
 * Get default notification settings (for testing)
 */
function getDefaultNotificationSettings() {
    return {
        emailEnabled: true,
        inAppEnabled: true,
        notifyOnEventCreated: false,
        notifyOnOrderPlaced: true,
        notifyOnDeadlineApproaching: true,
        notifyOnEventClosed: true,
        notifyOnPaymentConfirmed: true,
        notifyOnEventCompleted: true,
    };
}
/**
 * Get all notifications disabled settings (for testing)
 */
function getAllNotificationsDisabledSettings() {
    return {
        emailEnabled: false,
        inAppEnabled: false,
        notifyOnEventCreated: false,
        notifyOnOrderPlaced: false,
        notifyOnDeadlineApproaching: false,
        notifyOnEventClosed: false,
        notifyOnPaymentConfirmed: false,
        notifyOnEventCompleted: false,
    };
}
