"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const client_1 = require("@prisma/client");
const notification_service_1 = require("../../modules/notifications/notification.service");
const auth_helper_1 = require("../../test/helpers/auth.helper");
const db_helper_1 = require("../../test/helpers/db.helper");
const notifications_registry_1 = require("../../realtime/notifications.registry");
const database_1 = __importDefault(require("../../config/database"));
globals_1.jest.mock('../../realtime/notifications.registry', () => ({
    emitRealtimeNotification: globals_1.jest.fn(),
    registerNotificationsGateway: globals_1.jest.fn(),
    getNotificationsGateway: globals_1.jest.fn(),
}));
(0, globals_1.describe)('Notifications realtime integration', () => {
    (0, globals_1.afterEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.afterAll)(() => {
        globals_1.jest.resetAllMocks();
    });
    (0, globals_1.it)('emits notification.created payload when a notification event is created', async () => {
        const setup = await (0, auth_helper_1.setupCompanyWithUsers)({ employeeCount: 1 });
        const user = setup.employees[0];
        const notification = await (0, notification_service_1.createNotificationEvent)({
            type: client_1.NotificationType.EVENT_CREATED,
            userId: user.id,
        });
        (0, globals_1.expect)(notification).toBeTruthy();
        (0, globals_1.expect)(notifications_registry_1.emitRealtimeNotification).toHaveBeenCalledWith(user.companyId, globals_1.expect.objectContaining({
            id: notification?.id,
            userId: user.id,
            companyId: user.companyId,
            type: client_1.NotificationType.EVENT_CREATED,
        }), { userId: user.id, event: 'notification.created' });
        await (0, db_helper_1.cleanupTestData)(setup.companyId);
    });
    (0, globals_1.it)('does not emit realtime payload when user has disabled in-app notifications', async () => {
        const setup = await (0, auth_helper_1.setupCompanyWithUsers)({ employeeCount: 1 });
        const user = setup.employees[0];
        await database_1.default.userNotificationSettings.upsert({
            where: { userId: user.id },
            update: {
                emailEnabled: false,
                inAppEnabled: false,
                notifyOnEventCreated: false,
                notifyOnOrderPlaced: false,
                notifyOnDeadlineApproaching: false,
                notifyOnEventClosed: false,
                notifyOnPaymentConfirmed: false,
                notifyOnEventCompleted: false,
            },
            create: {
                userId: user.id,
                emailEnabled: false,
                inAppEnabled: false,
                notifyOnEventCreated: false,
                notifyOnOrderPlaced: false,
                notifyOnDeadlineApproaching: false,
                notifyOnEventClosed: false,
                notifyOnPaymentConfirmed: false,
                notifyOnEventCompleted: false,
            },
        });
        const notification = await (0, notification_service_1.createNotificationEvent)({
            type: client_1.NotificationType.EVENT_CREATED,
            userId: user.id,
        });
        (0, globals_1.expect)(notification).toBeNull();
        (0, globals_1.expect)(notifications_registry_1.emitRealtimeNotification).not.toHaveBeenCalled();
        await (0, db_helper_1.cleanupTestData)(setup.companyId);
    });
});
