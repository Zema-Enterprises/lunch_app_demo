"use strict";
/**
 * Notification Service Tests - Phase 4.1
 *
 * Tests for notification trigger logic and user preferences.
 * Does NOT test actual email/in-app delivery (that's Phase 5).
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const notification_service_1 = require("../notification.service");
const auth_helper_1 = require("../../../test/helpers/auth.helper");
const event_factory_1 = require("../../../test/factories/event.factory");
const restaurant_factory_1 = require("../../../test/factories/restaurant.factory");
const user_factory_1 = require("../../../test/factories/user.factory");
const notification_factory_1 = require("../../../test/factories/notification.factory");
const database_1 = __importDefault(require("../../../config/database"));
describe('Notification Service', () => {
    let companyId;
    let userId;
    let eventId;
    beforeEach(async () => {
        // Create test company with users
        const testData = await (0, auth_helper_1.setupCompanyWithUsers)({ employeeCount: 1 });
        companyId = testData.company.id;
        userId = testData.admin.id; // Use admin instead
        // Create test restaurant
        const restaurant = await (0, restaurant_factory_1.createRestaurant)({
            name: 'Test Restaurant',
            companyId,
        });
        // Create test event
        const event = await (0, event_factory_1.createEvent)({
            companyId,
            createdById: userId,
            restaurantId: restaurant.id,
        });
        eventId = event.id;
    });
    afterEach(async () => {
        // Cleanup
        await database_1.default.notificationEvent.deleteMany({ where: { userId } });
        await database_1.default.userNotificationSettings.deleteMany({ where: { userId } });
        await database_1.default.event.deleteMany({ where: { companyId } });
        await database_1.default.restaurant.deleteMany({ where: { companyId } });
        await database_1.default.user.deleteMany({ where: { companyId } });
        await database_1.default.company.delete({ where: { id: companyId } });
    });
    describe('getUserNotificationSettings', () => {
        it('should create default settings if user has none', async () => {
            const settings = await (0, notification_service_1.getUserNotificationSettings)(userId);
            expect(settings).toBeDefined();
            expect(settings.userId).toBe(userId);
            expect(settings.emailEnabled).toBe(true);
            expect(settings.inAppEnabled).toBe(true);
            expect(settings.notifyOnEventCreated).toBe(false); // Default: don't notify on all events
            expect(settings.notifyOnOrderPlaced).toBe(true);
            expect(settings.notifyOnPaymentConfirmed).toBe(true);
        });
        it('should return existing settings if user already has them', async () => {
            // Create custom settings
            await (0, notification_factory_1.createUserNotificationSettings)({
                userId,
                emailEnabled: false,
                notifyOnEventCreated: true,
            });
            const settings = await (0, notification_service_1.getUserNotificationSettings)(userId);
            expect(settings.emailEnabled).toBe(false);
            expect(settings.notifyOnEventCreated).toBe(true);
        });
    });
    describe('shouldNotifyUser', () => {
        it('should return false if both email and in-app notifications are disabled', async () => {
            await (0, notification_factory_1.createUserNotificationSettings)({
                userId,
                emailEnabled: false,
                inAppEnabled: false,
            });
            const shouldNotify = await (0, notification_service_1.shouldNotifyUser)(userId, 'EVENT_CREATED');
            expect(shouldNotify).toBe(false);
        });
        it('should respect EVENT_CREATED preference', async () => {
            await (0, notification_factory_1.createUserNotificationSettings)({
                userId,
                notifyOnEventCreated: true,
            });
            const shouldNotify = await (0, notification_service_1.shouldNotifyUser)(userId, 'EVENT_CREATED');
            expect(shouldNotify).toBe(true);
        });
        it('should respect ORDER_PLACED preference', async () => {
            await (0, notification_factory_1.createUserNotificationSettings)({
                userId,
                notifyOnOrderPlaced: false,
            });
            const shouldNotify = await (0, notification_service_1.shouldNotifyUser)(userId, 'ORDER_PLACED');
            expect(shouldNotify).toBe(false);
        });
        it('should always notify for USER_JOINED_EVENT (event creator)', async () => {
            await (0, notification_factory_1.createUserNotificationSettings)({
                userId,
                emailEnabled: false,
                inAppEnabled: true,
            });
            const shouldNotify = await (0, notification_service_1.shouldNotifyUser)(userId, 'USER_JOINED_EVENT');
            expect(shouldNotify).toBe(true);
        });
        it('should respect deadline approaching preference', async () => {
            await (0, notification_factory_1.createUserNotificationSettings)({
                userId,
                notifyOnDeadlineApproaching: false,
            });
            const shouldNotify = await (0, notification_service_1.shouldNotifyUser)(userId, 'EVENT_CLOSING_SOON');
            expect(shouldNotify).toBe(false);
        });
    });
    describe('createNotificationEvent', () => {
        it('should create notification event if user preferences allow', async () => {
            await (0, notification_factory_1.createUserNotificationSettings)({
                userId,
                notifyOnEventCreated: true,
            });
            const notification = await (0, notification_service_1.createNotificationEvent)({
                type: 'EVENT_CREATED',
                userId,
                eventId,
            });
            expect(notification).toBeDefined();
            expect(notification?.type).toBe('EVENT_CREATED');
            expect(notification?.userId).toBe(userId);
            expect(notification?.eventId).toBe(eventId);
            expect(notification?.read).toBe(false);
            expect(notification?.sentEmail).toBe(false);
            expect(notification?.sentInApp).toBe(false);
        });
        it('should NOT create notification if user has disabled that type', async () => {
            await (0, notification_factory_1.createUserNotificationSettings)({
                userId,
                notifyOnEventCreated: false,
            });
            const notification = await (0, notification_service_1.createNotificationEvent)({
                type: 'EVENT_CREATED',
                userId,
                eventId,
            });
            expect(notification).toBeNull();
        });
        it('should include event relation when eventId is provided', async () => {
            await (0, notification_factory_1.createUserNotificationSettings)({
                userId,
                notifyOnPaymentConfirmed: true,
            });
            const notification = await (0, notification_service_1.createNotificationEvent)({
                type: 'PAYMENT_CONFIRMED',
                userId,
                eventId,
            });
            expect(notification).toBeDefined();
            expect(notification?.event).toBeDefined();
            expect(notification?.event?.id).toBe(eventId);
        });
    });
    describe('createNotificationEvents (bulk)', () => {
        it('should create notifications for multiple users', async () => {
            // Create second user
            const user2 = await (0, user_factory_1.createUser)({
                email: `user2-${Date.now()}@test.com`,
                name: 'Test User 2',
                companyId,
            });
            // Both users have default settings (notifyOnOrderPlaced = true)
            await (0, notification_factory_1.createUserNotificationSettings)({ userId });
            await (0, notification_factory_1.createUserNotificationSettings)({ userId: user2.id });
            const notifications = await (0, notification_service_1.createNotificationEvents)('ORDER_PLACED', [userId, user2.id], { eventId });
            expect(notifications).toHaveLength(2);
            expect(notifications[0].userId).toBe(userId);
            expect(notifications[1].userId).toBe(user2.id);
            // Cleanup
            await database_1.default.notificationEvent.deleteMany({
                where: { userId: user2.id },
            });
            await database_1.default.userNotificationSettings.delete({
                where: { userId: user2.id },
            });
            await database_1.default.user.delete({ where: { id: user2.id } });
        });
        it('should skip users who have disabled notifications', async () => {
            // Create second user
            const user2 = await (0, user_factory_1.createUser)({
                email: `user2-${Date.now()}@test.com`,
                name: 'Test User 2',
                companyId,
            });
            // User 1: enabled, User 2: disabled
            await (0, notification_factory_1.createUserNotificationSettings)({
                userId,
                notifyOnOrderPlaced: true,
            });
            await (0, notification_factory_1.createUserNotificationSettings)({
                userId: user2.id,
                notifyOnOrderPlaced: false,
            });
            const notifications = await (0, notification_service_1.createNotificationEvents)('ORDER_PLACED', [userId, user2.id], { eventId });
            // Should only create 1 notification (for user 1)
            expect(notifications).toHaveLength(1);
            expect(notifications[0].userId).toBe(userId);
            // Cleanup
            await database_1.default.userNotificationSettings.delete({
                where: { userId: user2.id },
            });
            await database_1.default.user.delete({ where: { id: user2.id } });
        });
    });
    describe('getUnreadNotifications', () => {
        it('should return only unread notifications', async () => {
            await (0, notification_factory_1.createUserNotificationSettings)({ userId });
            // Create unread notification
            const notification1 = await (0, notification_service_1.createNotificationEvent)({
                type: 'ORDER_PLACED',
                userId,
                eventId,
            });
            // Create and mark as read
            const notification2 = await (0, notification_service_1.createNotificationEvent)({
                type: 'EVENT_CLOSED',
                userId,
                eventId,
            });
            if (notification2) {
                await database_1.default.notificationEvent.update({
                    where: { id: notification2.id },
                    data: { read: true },
                });
            }
            const unreadNotifications = await (0, notification_service_1.getUnreadNotifications)(userId);
            expect(unreadNotifications).toHaveLength(1);
            expect(unreadNotifications[0].id).toBe(notification1?.id);
        });
        it('should order by newest first', async () => {
            await (0, notification_factory_1.createUserNotificationSettings)({ userId });
            const notification1 = await (0, notification_service_1.createNotificationEvent)({
                type: 'ORDER_PLACED',
                userId,
                eventId,
            });
            // Wait a bit to ensure different timestamps
            await new Promise((resolve) => setTimeout(resolve, 10));
            const notification2 = await (0, notification_service_1.createNotificationEvent)({
                type: 'EVENT_CLOSED',
                userId,
                eventId,
            });
            const unreadNotifications = await (0, notification_service_1.getUnreadNotifications)(userId);
            expect(unreadNotifications).toHaveLength(2);
            expect(unreadNotifications[0].id).toBe(notification2?.id); // Newest first
            expect(unreadNotifications[1].id).toBe(notification1?.id);
        });
    });
    describe('markNotificationAsRead', () => {
        it('should mark single notification as read', async () => {
            await (0, notification_factory_1.createUserNotificationSettings)({ userId });
            const notification = await (0, notification_service_1.createNotificationEvent)({
                type: 'ORDER_PLACED',
                userId,
                eventId,
            });
            expect(notification?.read).toBe(false);
            if (notification) {
                const updated = await (0, notification_service_1.markNotificationAsRead)(notification.id);
                expect(updated.read).toBe(true);
            }
        });
    });
    describe('markAllNotificationsAsRead', () => {
        it('should mark all unread notifications as read', async () => {
            await (0, notification_factory_1.createUserNotificationSettings)({ userId });
            await (0, notification_service_1.createNotificationEvent)({
                type: 'ORDER_PLACED',
                userId,
                eventId,
            });
            await (0, notification_service_1.createNotificationEvent)({
                type: 'EVENT_CLOSED',
                userId,
                eventId,
            });
            let unread = await (0, notification_service_1.getUnreadNotifications)(userId);
            expect(unread).toHaveLength(2);
            await (0, notification_service_1.markAllNotificationsAsRead)(userId);
            unread = await (0, notification_service_1.getUnreadNotifications)(userId);
            expect(unread).toHaveLength(0);
        });
    });
    describe('getUnreadNotificationCount', () => {
        it('should return correct count of unread notifications', async () => {
            await (0, notification_factory_1.createUserNotificationSettings)({ userId });
            const count1 = await (0, notification_service_1.getUnreadNotificationCount)(userId);
            expect(count1).toBe(0);
            await (0, notification_service_1.createNotificationEvent)({
                type: 'ORDER_PLACED',
                userId,
                eventId,
            });
            const count2 = await (0, notification_service_1.getUnreadNotificationCount)(userId);
            expect(count2).toBe(1);
            await (0, notification_service_1.createNotificationEvent)({
                type: 'EVENT_CLOSED',
                userId,
                eventId,
            });
            const count3 = await (0, notification_service_1.getUnreadNotificationCount)(userId);
            expect(count3).toBe(2);
        });
    });
});
