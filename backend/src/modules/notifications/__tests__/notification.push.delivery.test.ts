import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import webPush from 'web-push';
import prisma from '../../../config/database';
import { setupCompanyWithUsers } from '../../../test/helpers/auth.helper';
import { cleanupTestData } from '../../../test/helpers/db.helper';
import { createNotificationEvent } from '../notification.service';
import { createUserNotificationSettings } from '../../../test/factories/notification.factory';
import { NotificationType } from '@prisma/client';

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(() => Promise.resolve()),
}));

const mockedWebPush = webPush as jest.Mocked<typeof webPush>;

describe('notification push delivery', () => {
  beforeEach(() => {
    process.env.NOTIFICATIONS_VAPID_PUBLIC_KEY = 'test-public-key';
    process.env.NOTIFICATIONS_VAPID_PRIVATE_KEY = 'test-private-key';
    process.env.NOTIFICATIONS_VAPID_CONTACT = 'mailto:test@example.com';
    mockedWebPush.sendNotification.mockClear();
  });

  it('sends push notification when subscription exists', async () => {
    const { companyId, employees } = await setupCompanyWithUsers({ employeeCount: 1 });
    const user = employees![0];

    await createUserNotificationSettings({
      userId: user.id,
      inAppEnabled: true,
      emailEnabled: true,
      notifyOnEventCreated: true,
    });

    await prisma.pushSubscription.create({
      data: {
        endpoint: 'https://push.example.com/test',
        keys: { p256dh: 'key', auth: 'secret' },
        userAgent: 'Vitest',
        userId: user.id,
        companyId,
      },
    });

    const notification = await createNotificationEvent({
      type: NotificationType.EVENT_CREATED,
      userId: user.id,
    });

    expect(notification).toBeTruthy();

    expect(mockedWebPush.sendNotification).toHaveBeenCalledTimes(1);
    const [subscriptionPayload, body] = mockedWebPush.sendNotification.mock.calls[0];
    expect(subscriptionPayload).toMatchObject({
      endpoint: 'https://push.example.com/test',
    });
    expect(typeof body).toBe('string');

    const receipts = await prisma.notificationDeliveryReceipt.findMany({
      where: { notificationId: notification!.id, channel: 'PUSH' },
    });
    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({
      status: 'SUCCESS',
      userId: user.id,
      companyId,
    });

    await cleanupTestData(companyId);
  });

  it('records failure receipt when push send throws', async () => {
    const { companyId, employees } = await setupCompanyWithUsers({ employeeCount: 1 });
    const user = employees![0];

    await createUserNotificationSettings({
      userId: user.id,
      inAppEnabled: true,
      emailEnabled: true,
      notifyOnEventCreated: true,
    });

    await prisma.pushSubscription.create({
      data: {
        endpoint: 'https://push.example.com/fail',
        keys: { p256dh: 'key', auth: 'secret' },
        userAgent: 'Vitest',
        userId: user.id,
        companyId,
      },
    });

    const error = new Error('Push failed') as Error & { statusCode?: number };
    error.statusCode = 410;
    mockedWebPush.sendNotification.mockRejectedValueOnce(error);

    await createNotificationEvent({
      type: NotificationType.EVENT_CREATED,
      userId: user.id,
    });

    const receipts = await prisma.notificationDeliveryReceipt.findMany({
      where: { companyId, userId: user.id, channel: 'PUSH' },
    });
    expect(receipts.some((receipt) => receipt.status === 'FAILED')).toBe(true);

    const remainingSubscriptions = await prisma.pushSubscription.count({
      where: { companyId },
    });
    expect(remainingSubscriptions).toBe(0);

    await cleanupTestData(companyId);
  });
});
