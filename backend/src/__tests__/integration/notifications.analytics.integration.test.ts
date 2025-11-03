import request from 'supertest';
import app from '../../app';
import prisma from '../../config/database';
import { setupCompanyWithUsers } from '../../test/helpers/auth.helper';
import { cleanupTestData } from '../../test/helpers/db.helper';
import { NotificationType, NotificationDeliveryChannel, NotificationDeliveryStatus } from '@prisma/client';

describe('Notifications analytics summary API', () => {
  let companyId: string;
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    const setup = await setupCompanyWithUsers({ employeeCount: 1 });
    companyId = setup.companyId;
    authToken = setup.employees?.[0].token ?? setup.admin.token;
    userId = setup.employees?.[0].id ?? setup.admin.id;

    await prisma.notificationEvent.create({
      data: {
        id: 'notif_1',
        type: NotificationType.EVENT_CREATED,
        userId,
        read: false,
      },
    });

    await prisma.notificationEvent.create({
      data: {
        id: 'notif_2',
        type: NotificationType.PAYMENT_CONFIRMED,
        userId,
        read: true,
      },
    });

    await prisma.notificationDeliveryReceipt.createMany({
      data: [
        {
          notificationId: 'notif_1',
          userId,
          companyId,
          channel: NotificationDeliveryChannel.REALTIME,
          status: NotificationDeliveryStatus.SUCCESS,
          latencyMs: 120,
          deliveredAt: new Date(),
        },
        {
          notificationId: 'notif_1',
          userId,
          companyId,
          channel: NotificationDeliveryChannel.PUSH,
          status: NotificationDeliveryStatus.FAILED,
          latencyMs: 400,
          deliveredAt: new Date(),
          errorCode: '410',
        },
      ],
    });
  });

  afterEach(async () => {
    await cleanupTestData(companyId);
  });

  it('returns aggregated delivery and notification metrics', async () => {
    const response = await request(app)
      .get('/api/notifications/analytics/summary')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        data: {
          companyId,
          totals: {
            notifications: 2,
            unread: 1,
          },
          delivery: expect.objectContaining({
            REALTIME: expect.objectContaining({ SUCCESS: 1 }),
            PUSH: expect.objectContaining({ FAILED: 1 }),
          }),
        },
      })
    );
  });
});
