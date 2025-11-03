import request from 'supertest';
import app from '../../app';
import prisma from '../../config/database';
import { setupCompanyWithUsers } from '../../test/helpers/auth.helper';
import { cleanupTestData } from '../../test/helpers/db.helper';

describe('Notifications push subscriptions API', () => {
  const subscriptionPayload = {
    endpoint: 'https://push.example.com/test-endpoint',
    keys: {
      p256dh: 'BOrCjA1DRcl7VZVKYp0ujvFp7OclJgCjXged6Zbme1w=',
      auth: '2h8v1fF0nLQ=',
    },
    expirationTime: null,
    userAgent: 'Vitest/Push',
  };

  let companyId: string;
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    const setup = await setupCompanyWithUsers({ employeeCount: 1 });
    companyId = setup.companyId;
    authToken = setup.employees?.[0].token ?? setup.admin.token;
    userId = setup.employees?.[0].id ?? setup.admin.id;
  });

  afterEach(async () => {
    await cleanupTestData(companyId);
  });

  it('persists a push subscription for the authenticated user', async () => {
    const response = await request(app)
      .post('/api/notifications/push-subscriptions')
      .set('Authorization', `Bearer ${authToken}`)
      .send(subscriptionPayload);

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      endpoint: subscriptionPayload.endpoint,
      userId,
      userAgent: subscriptionPayload.userAgent,
    });

    const record = await prisma.pushSubscription.findFirst({
      where: { endpoint: subscriptionPayload.endpoint },
    });

    expect(record).toMatchObject({
      endpoint: subscriptionPayload.endpoint,
      userId,
      companyId,
    });
    expect(record?.keys).toEqual(subscriptionPayload.keys);
  });

  it('allows deleting an existing push subscription', async () => {
    await request(app)
      .post('/api/notifications/push-subscriptions')
      .set('Authorization', `Bearer ${authToken}`)
      .send(subscriptionPayload)
      .expect(201);

    const deleteResponse = await request(app)
      .delete('/api/notifications/push-subscriptions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ endpoint: subscriptionPayload.endpoint });

    expect(deleteResponse.status).toBe(204);

    const record = await prisma.pushSubscription.findFirst({
      where: { endpoint: subscriptionPayload.endpoint },
    });

    expect(record).toBeNull();
  });

  it('exposes the VAPID public key for clients', async () => {
    process.env.NOTIFICATIONS_VAPID_PUBLIC_KEY = 'BN9zVNPRF76UE0pw';

    const response = await request(app)
      .get('/api/notifications/push/public-key')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        publicKey: 'BN9zVNPRF76UE0pw',
      },
    });
  });
});
