"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const database_1 = __importDefault(require("../../../config/database"));
const notifications_registry_1 = require("../../../realtime/notifications.registry");
const client_1 = require("@prisma/client");
const notification_service_1 = require("../notification.service");
globals_1.jest.mock('../../../realtime/notifications.registry', () => ({
    emitRealtimeNotification: globals_1.jest.fn(),
    registerNotificationsGateway: globals_1.jest.fn(),
    getNotificationsGateway: globals_1.jest.fn(),
}));
(0, globals_1.describe)('notification realtime dispatch', () => {
    const mockNotification = {
        id: 'notif_123',
        type: client_1.NotificationType.EVENT_CREATED,
        userId: 'user_1',
        eventId: 'event_1',
        orderId: null,
        read: false,
        sentEmail: false,
        sentInApp: false,
        createdAt: new Date(),
        user: {
            id: 'user_1',
            companyId: 'company_42',
            email: 'user@example.com',
            name: 'Test User',
            role: 'USER',
        },
        event: null,
        order: null,
    };
    let createSpy;
    let findSettingsSpy;
    let createSettingsSpy;
    (0, globals_1.beforeEach)(() => {
        createSpy = globals_1.jest
            .spyOn(database_1.default.notificationEvent, 'create')
            .mockResolvedValue({ ...mockNotification });
        findSettingsSpy = globals_1.jest
            .spyOn(database_1.default.userNotificationSettings, 'findUnique')
            .mockResolvedValue({
            id: 'settings_1',
            userId: mockNotification.userId,
            emailEnabled: true,
            inAppEnabled: true,
            notifyOnEventCreated: true,
            notifyOnOrderPlaced: true,
            notifyOnDeadlineApproaching: true,
            notifyOnEventClosed: true,
            notifyOnPaymentConfirmed: true,
            notifyOnEventCompleted: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        createSettingsSpy = globals_1.jest
            .spyOn(database_1.default.userNotificationSettings, 'create')
            .mockResolvedValue({
            id: 'settings_new',
            userId: mockNotification.userId,
            emailEnabled: true,
            inAppEnabled: true,
            notifyOnEventCreated: true,
            notifyOnOrderPlaced: true,
            notifyOnDeadlineApproaching: true,
            notifyOnEventClosed: true,
            notifyOnPaymentConfirmed: true,
            notifyOnEventCompleted: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    });
    (0, globals_1.afterEach)(() => {
        createSpy.mockRestore();
        findSettingsSpy.mockRestore();
        createSettingsSpy.mockRestore();
        notifications_registry_1.emitRealtimeNotification.mockReset();
    });
    (0, globals_1.it)('emits realtime payload after creating a notification event', async () => {
        await (0, notification_service_1.createNotificationEvent)({
            type: client_1.NotificationType.EVENT_CREATED,
            userId: 'user_1',
        });
        (0, globals_1.expect)(notifications_registry_1.emitRealtimeNotification).toHaveBeenCalledWith('company_42', globals_1.expect.objectContaining({
            id: mockNotification.id,
            userId: mockNotification.userId,
            companyId: mockNotification.user.companyId,
            type: mockNotification.type,
        }), { userId: mockNotification.userId, event: 'notification.created' });
    });
    (0, globals_1.it)('does not emit realtime payload when user should not be notified', async () => {
        findSettingsSpy.mockResolvedValue({
            id: 'settings_2',
            userId: mockNotification.userId,
            emailEnabled: false,
            inAppEnabled: false,
            notifyOnEventCreated: false,
            notifyOnOrderPlaced: false,
            notifyOnDeadlineApproaching: false,
            notifyOnEventClosed: false,
            notifyOnPaymentConfirmed: false,
            notifyOnEventCompleted: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        await (0, notification_service_1.createNotificationEvent)({
            type: client_1.NotificationType.EVENT_CREATED,
            userId: 'user_1',
        });
        (0, globals_1.expect)(notifications_registry_1.emitRealtimeNotification).not.toHaveBeenCalled();
    });
});
