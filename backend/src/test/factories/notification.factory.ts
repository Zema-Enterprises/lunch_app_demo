/**
 * Notification factory for generating test notification data
 */

import prisma from '../../config/database';
import { NotificationType } from '@prisma/client';

export interface NotificationEventFactoryData {
  type: NotificationType;
  userId: string;
  eventId?: string;
  orderId?: string;
  read?: boolean;
  sentEmail?: boolean;
  sentInApp?: boolean;
}

export interface UserNotificationSettingsFactoryData {
  userId: string;
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
  notifyOnEventCreated?: boolean;
  notifyOnOrderPlaced?: boolean;
  notifyOnDeadlineApproaching?: boolean;
  notifyOnEventClosed?: boolean;
  notifyOnPaymentConfirmed?: boolean;
  notifyOnEventCompleted?: boolean;
}

/**
 * Create a notification event with factory defaults
 */
export async function createNotificationEvent(data: NotificationEventFactoryData) {
  const notificationEvent = await prisma.notificationEvent.create({
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
export async function createNotificationEvents(
  count: number,
  baseData: NotificationEventFactoryData
) {
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
export async function createUserNotificationSettings(
  data: UserNotificationSettingsFactoryData
) {
  const settings = await prisma.userNotificationSettings.create({
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
export function getDefaultNotificationSettings() {
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
export function getAllNotificationsDisabledSettings() {
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
