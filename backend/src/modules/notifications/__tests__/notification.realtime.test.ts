import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import prisma from '../../../config/database';
import { emitRealtimeNotification } from '../../../realtime/notifications.registry';
import { NotificationType } from '@prisma/client';
import { createNotificationEvent } from '../notification.service';

jest.mock('../../../realtime/notifications.registry', () => ({
  emitRealtimeNotification: jest.fn(),
  registerNotificationsGateway: jest.fn(),
  getNotificationsGateway: jest.fn(),
}));

describe('notification realtime dispatch', () => {
  const mockNotification = {
    id: 'notif_123',
    type: NotificationType.EVENT_CREATED,
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

  let createSpy: jest.SpiedFunction<typeof prisma.notificationEvent.create>;
  let findSettingsSpy: jest.SpiedFunction<typeof prisma.userNotificationSettings.findUnique>;
  let createSettingsSpy: jest.SpiedFunction<typeof prisma.userNotificationSettings.create>;

  beforeEach(() => {
    createSpy = jest
      .spyOn(prisma.notificationEvent, 'create')
      .mockResolvedValue({ ...mockNotification } as any);
    findSettingsSpy = jest
      .spyOn(prisma.userNotificationSettings, 'findUnique')
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
      } as any);
    createSettingsSpy = jest
      .spyOn(prisma.userNotificationSettings, 'create')
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
    } as any);
  });

  afterEach(() => {
    createSpy.mockRestore();
    findSettingsSpy.mockRestore();
    createSettingsSpy.mockRestore();
    (emitRealtimeNotification as jest.Mock).mockReset();
  });

  it('emits realtime payload after creating a notification event', async () => {
    await createNotificationEvent({
      type: NotificationType.EVENT_CREATED,
      userId: 'user_1',
    });

    expect(emitRealtimeNotification).toHaveBeenCalledWith(
      'company_42',
      expect.objectContaining({
        id: mockNotification.id,
        userId: mockNotification.userId,
        companyId: mockNotification.user.companyId,
        type: mockNotification.type,
      }),
      { userId: mockNotification.userId, event: 'notification.created' }
    );
  });

  it('does not emit realtime payload when user should not be notified', async () => {
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
    } as any);

    await createNotificationEvent({
      type: NotificationType.EVENT_CREATED,
      userId: 'user_1',
    });

    expect(emitRealtimeNotification).not.toHaveBeenCalled();
  });
});
