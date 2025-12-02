import request from 'supertest';
import app from '../../app';
import prisma from '../../config/database';
import { setupCompanyWithUsers } from '../../test/helpers/auth.helper';
import { cleanupTestData } from '../../test/helpers/db.helper';

describe('Notifications settings API', () => {
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

  it('returns settings with both legacy and frontend fields', async () => {
    const response = await request(app)
      .get('/api/notifications/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.data).toMatchObject({
      emailEnabled: expect.any(Boolean),
      inAppEnabled: expect.any(Boolean),
      emailNotifications: expect.any(Boolean),
      inAppNotifications: expect.any(Boolean),
    });
  });

  it('updates settings when frontend field names are used', async () => {
    const updateResponse = await request(app)
      .put('/api/notifications/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        emailNotifications: false,
        inAppNotifications: true,
        notifyOnEventCreated: true,
      })
      .expect(200);

    expect(updateResponse.body.data).toMatchObject({
      emailEnabled: false,
      inAppEnabled: true,
      emailNotifications: false,
      inAppNotifications: true,
    });

    const dbSettings = await prisma.userNotificationSettings.findUnique({
      where: { userId },
    });

    expect(dbSettings).toMatchObject({
      emailEnabled: false,
      inAppEnabled: true,
      notifyOnEventCreated: true,
    });
  });

  it('returns 503 when VAPID key is missing and 200 when present', async () => {
    delete process.env.NOTIFICATIONS_VAPID_PUBLIC_KEY;

    const missing = await request(app)
      .get('/api/notifications/push/public-key')
      .set('Authorization', `Bearer ${authToken}`);

    expect(missing.status).toBe(503);
    expect(missing.body).toHaveProperty('message');

    process.env.NOTIFICATIONS_VAPID_PUBLIC_KEY = 'BN9zVNPRF76UE0pw';
    const present = await request(app)
      .get('/api/notifications/push/public-key')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(present.body).toEqual({ data: { publicKey: 'BN9zVNPRF76UE0pw' } });
  });
});
