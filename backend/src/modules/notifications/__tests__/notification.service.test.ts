/**
 * Notification Service Tests - Phase 4.1
 * 
 * Tests for notification trigger logic and user preferences.
 * Does NOT test actual email/in-app delivery (that's Phase 5).
 */

import {
  createNotificationEvent,
  createNotificationEvents,
  getUserNotificationSettings,
  shouldNotifyUser,
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
} from '../notification.service';
import { setupCompanyWithUsers } from '../../../test/helpers/auth.helper';
import { createEvent } from '../../../test/factories/event.factory';
import { createRestaurant } from '../../../test/factories/restaurant.factory';
import { createUser } from '../../../test/factories/user.factory';
import { createUserNotificationSettings } from '../../../test/factories/notification.factory';
import prisma from '../../../config/database';

describe('Notification Service', () => {
  let companyId: string;
  let userId: string;
  let eventId: string;

  beforeEach(async () => {
    // Create test company with users
    const testData = await setupCompanyWithUsers({ employeeCount: 1 });
    companyId = testData.company.id;
    userId = testData.admin.id; // Use admin instead

    // Create test restaurant
    const restaurant = await createRestaurant({
      name: 'Test Restaurant',
      companyId,
    });

    // Create test event
    const event = await createEvent({
      companyId,
      createdById: userId,
      restaurantId: restaurant.id,
    });
    eventId = event.id;
  });

  afterEach(async () => {
    // Cleanup
    await prisma.notificationEvent.deleteMany({ where: { userId } });
    await prisma.userNotificationSettings.deleteMany({ where: { userId } });
    await prisma.event.deleteMany({ where: { companyId } });
    await prisma.restaurant.deleteMany({ where: { companyId } });
    await prisma.user.deleteMany({ where: { companyId } });
    await prisma.company.delete({ where: { id: companyId } });
  });

  describe('getUserNotificationSettings', () => {
    it('should create default settings if user has none', async () => {
      const settings = await getUserNotificationSettings(userId);

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
      await createUserNotificationSettings({
        userId,
        emailEnabled: false,
        notifyOnEventCreated: true,
      });

      const settings = await getUserNotificationSettings(userId);

      expect(settings.emailEnabled).toBe(false);
      expect(settings.notifyOnEventCreated).toBe(true);
    });
  });

  describe('shouldNotifyUser', () => {
    it('should return false if both email and in-app notifications are disabled', async () => {
      await createUserNotificationSettings({
        userId,
        emailEnabled: false,
        inAppEnabled: false,
      });

      const shouldNotify = await shouldNotifyUser(userId, 'EVENT_CREATED');
      expect(shouldNotify).toBe(false);
    });

    it('should respect EVENT_CREATED preference', async () => {
      await createUserNotificationSettings({
        userId,
        notifyOnEventCreated: true,
      });

      const shouldNotify = await shouldNotifyUser(userId, 'EVENT_CREATED');
      expect(shouldNotify).toBe(true);
    });

    it('should respect ORDER_PLACED preference', async () => {
      await createUserNotificationSettings({
        userId,
        notifyOnOrderPlaced: false,
      });

      const shouldNotify = await shouldNotifyUser(userId, 'ORDER_PLACED');
      expect(shouldNotify).toBe(false);
    });

    it('should always notify for USER_JOINED_EVENT (event creator)', async () => {
      await createUserNotificationSettings({
        userId,
        emailEnabled: false,
        inAppEnabled: true,
      });

      const shouldNotify = await shouldNotifyUser(userId, 'USER_JOINED_EVENT');
      expect(shouldNotify).toBe(true);
    });

    it('should respect deadline approaching preference', async () => {
      await createUserNotificationSettings({
        userId,
        notifyOnDeadlineApproaching: false,
      });

      const shouldNotify = await shouldNotifyUser(
        userId,
        'EVENT_CLOSING_SOON'
      );
      expect(shouldNotify).toBe(false);
    });
  });

  describe('createNotificationEvent', () => {
    it('should create notification event if user preferences allow', async () => {
      await createUserNotificationSettings({
        userId,
        notifyOnEventCreated: true,
      });

      const notification = await createNotificationEvent({
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
      await createUserNotificationSettings({
        userId,
        notifyOnEventCreated: false,
      });

      const notification = await createNotificationEvent({
        type: 'EVENT_CREATED',
        userId,
        eventId,
      });

      expect(notification).toBeNull();
    });

    it('should include event relation when eventId is provided', async () => {
      await createUserNotificationSettings({
        userId,
        notifyOnPaymentConfirmed: true,
      });

      const notification = await createNotificationEvent({
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
      const user2 = await createUser({
        email: `user2-${Date.now()}@test.com`,
        name: 'Test User 2',
        companyId,
      });

      // Both users have default settings (notifyOnOrderPlaced = true)
      await createUserNotificationSettings({ userId });
      await createUserNotificationSettings({ userId: user2.id });

      const notifications = await createNotificationEvents(
        'ORDER_PLACED',
        [userId, user2.id],
        { eventId }
      );

      expect(notifications).toHaveLength(2);
      expect(notifications[0].userId).toBe(userId);
      expect(notifications[1].userId).toBe(user2.id);

      // Cleanup
      await prisma.notificationEvent.deleteMany({
        where: { userId: user2.id },
      });
      await prisma.userNotificationSettings.delete({
        where: { userId: user2.id },
      });
      await prisma.user.delete({ where: { id: user2.id } });
    });

    it('should skip users who have disabled notifications', async () => {
      // Create second user
      const user2 = await createUser({
        email: `user2-${Date.now()}@test.com`,
        name: 'Test User 2',
        companyId,
      });

      // User 1: enabled, User 2: disabled
      await createUserNotificationSettings({
        userId,
        notifyOnOrderPlaced: true,
      });
      await createUserNotificationSettings({
        userId: user2.id,
        notifyOnOrderPlaced: false,
      });

      const notifications = await createNotificationEvents(
        'ORDER_PLACED',
        [userId, user2.id],
        { eventId }
      );

      // Should only create 1 notification (for user 1)
      expect(notifications).toHaveLength(1);
      expect(notifications[0].userId).toBe(userId);

      // Cleanup
      await prisma.userNotificationSettings.delete({
        where: { userId: user2.id },
      });
      await prisma.user.delete({ where: { id: user2.id } });
    });
  });

  describe('getUnreadNotifications', () => {
    it('should return only unread notifications', async () => {
      await createUserNotificationSettings({ userId });

      // Create unread notification
      const notification1 = await createNotificationEvent({
        type: 'ORDER_PLACED',
        userId,
        eventId,
      });

      // Create and mark as read
      const notification2 = await createNotificationEvent({
        type: 'EVENT_CLOSED',
        userId,
        eventId,
      });

      if (notification2) {
        await prisma.notificationEvent.update({
          where: { id: notification2.id },
          data: { read: true },
        });
      }

      const unreadNotifications = await getUnreadNotifications(userId);

      expect(unreadNotifications).toHaveLength(1);
      expect(unreadNotifications[0].id).toBe(notification1?.id);
    });

    it('should order by newest first', async () => {
      await createUserNotificationSettings({ userId });

      const notification1 = await createNotificationEvent({
        type: 'ORDER_PLACED',
        userId,
        eventId,
      });

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const notification2 = await createNotificationEvent({
        type: 'EVENT_CLOSED',
        userId,
        eventId,
      });

      const unreadNotifications = await getUnreadNotifications(userId);

      expect(unreadNotifications).toHaveLength(2);
      expect(unreadNotifications[0].id).toBe(notification2?.id); // Newest first
      expect(unreadNotifications[1].id).toBe(notification1?.id);
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark single notification as read', async () => {
      await createUserNotificationSettings({ userId });

      const notification = await createNotificationEvent({
        type: 'ORDER_PLACED',
        userId,
        eventId,
      });

      expect(notification?.read).toBe(false);

      if (notification) {
        const updated = await markNotificationAsRead(notification.id);
        expect(updated.read).toBe(true);
      }
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      await createUserNotificationSettings({ userId });

      await createNotificationEvent({
        type: 'ORDER_PLACED',
        userId,
        eventId,
      });

      await createNotificationEvent({
        type: 'EVENT_CLOSED',
        userId,
        eventId,
      });

      let unread = await getUnreadNotifications(userId);
      expect(unread).toHaveLength(2);

      await markAllNotificationsAsRead(userId);

      unread = await getUnreadNotifications(userId);
      expect(unread).toHaveLength(0);
    });
  });

  describe('getUnreadNotificationCount', () => {
    it('should return correct count of unread notifications', async () => {
      await createUserNotificationSettings({ userId });

      const count1 = await getUnreadNotificationCount(userId);
      expect(count1).toBe(0);

      await createNotificationEvent({
        type: 'ORDER_PLACED',
        userId,
        eventId,
      });

      const count2 = await getUnreadNotificationCount(userId);
      expect(count2).toBe(1);

      await createNotificationEvent({
        type: 'EVENT_CLOSED',
        userId,
        eventId,
      });

      const count3 = await getUnreadNotificationCount(userId);
      expect(count3).toBe(2);
    });
  });
});
