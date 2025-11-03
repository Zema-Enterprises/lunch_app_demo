import { afterEach, afterAll, describe, expect, it, jest } from '@jest/globals';
import { NotificationType } from '@prisma/client';
import { createNotificationEvent } from '../../modules/notifications/notification.service';
import { setupCompanyWithUsers } from '../../test/helpers/auth.helper';
import { cleanupTestData } from '../../test/helpers/db.helper';
import { emitRealtimeNotification } from '../../realtime/notifications.registry';
import prisma from '../../config/database';

jest.mock('../../realtime/notifications.registry', () => ({
  emitRealtimeNotification: jest.fn(),
  registerNotificationsGateway: jest.fn(),
  getNotificationsGateway: jest.fn(),
}));

describe('Notifications realtime integration', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('emits notification.created payload when a notification event is created', async () => {
    const setup = await setupCompanyWithUsers({ employeeCount: 1 });
    const user = setup.employees![0];

    await prisma.userNotificationSettings.upsert({
      where: { userId: user.id },
      update: {
        inAppEnabled: true,
        notifyOnEventCreated: true,
      },
      create: {
        userId: user.id,
        emailEnabled: true,
        inAppEnabled: true,
        notifyOnEventCreated: true,
        notifyOnOrderPlaced: true,
        notifyOnDeadlineApproaching: true,
        notifyOnEventClosed: true,
        notifyOnPaymentConfirmed: true,
        notifyOnEventCompleted: true,
      },
    });

    const notification = await createNotificationEvent({
      type: NotificationType.EVENT_CREATED,
      userId: user.id,
    });

    expect(notification).toBeTruthy();
    expect(emitRealtimeNotification).toHaveBeenCalledWith(
      user.companyId,
      expect.objectContaining({
        id: notification?.id,
        userId: user.id,
        companyId: user.companyId,
        type: NotificationType.EVENT_CREATED,
      }),
      { userId: user.id, event: 'notification.created' }
    );

    await cleanupTestData(setup.companyId);
  });

  it('does not emit realtime payload when user has disabled in-app notifications', async () => {
    const setup = await setupCompanyWithUsers({ employeeCount: 1 });
    const user = setup.employees![0];

    await prisma.userNotificationSettings.upsert({
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

    const notification = await createNotificationEvent({
      type: NotificationType.EVENT_CREATED,
      userId: user.id,
    });

    expect(notification).toBeNull();
    expect(emitRealtimeNotification).not.toHaveBeenCalled();

    await cleanupTestData(setup.companyId);
  });
});
