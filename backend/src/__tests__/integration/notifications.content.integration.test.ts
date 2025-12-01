/**
 * Notifications content contract (TDD baseline)
 *
 * Defines the enriched payload shape we expect for key notification triggers.
 * These tests should fail until notifications include category/title/body/actor/subject/cta.
 */

import request from 'supertest';
import app from '../../app';
import prisma from '../../config/database';
import { setupCompanyWithUsers } from '../../test/helpers/auth.helper';
import { cleanupTestData } from '../../test/helpers/db.helper';
import { createRestaurant } from '../../test/factories/restaurant.factory';

const ensureSettings = async (userId: string, overrides: Partial<Record<string, boolean>> = {}) => {
  await prisma.userNotificationSettings.upsert({
    where: { userId },
    update: {
      emailEnabled: true,
      inAppEnabled: true,
      notifyOnEventCreated: true,
      notifyOnOrderPlaced: true,
      notifyOnDeadlineApproaching: true,
      notifyOnEventClosed: true,
      notifyOnPaymentConfirmed: true,
      notifyOnEventCompleted: true,
      ...overrides,
    },
    create: {
      userId,
      emailEnabled: true,
      inAppEnabled: true,
      notifyOnEventCreated: true,
      notifyOnOrderPlaced: true,
      notifyOnDeadlineApproaching: true,
      notifyOnEventClosed: true,
      notifyOnPaymentConfirmed: true,
      notifyOnEventCompleted: true,
      ...overrides,
    },
  });
};

describe('Notifications content contract', () => {
  let companyId: string;
  let creatorId: string;
  let creatorToken: string;
  let employeeId: string;
  let employeeToken: string;
  let restaurantId: string;
  const eventTitle = 'Team Sync Lunch';
  const restaurantName = 'Payload Bistro';

  beforeAll(async () => {
    const setup = await setupCompanyWithUsers({ employeeCount: 1 });
    companyId = setup.companyId;
    creatorId = setup.admin.id;
    creatorToken = setup.admin.token;
    employeeId = setup.employees![0].id;
    employeeToken = setup.employees![0].token;

    await ensureSettings(employeeId, { notifyOnEventCreated: true });
    await ensureSettings(creatorId);

    const restaurant = await createRestaurant({
      name: restaurantName,
      companyId,
      deliveryTime: '30-40 minutes',
    });
    restaurantId = restaurant.id;
  });

  afterAll(async () => {
    await cleanupTestData(companyId);
  });

  it('returns descriptive payloads for event creation and participant join', async () => {
    const orderDeadline = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const createResponse = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        title: eventTitle,
        deliveryLocation: 'Office',
        orderDeadline,
        restaurantId,
      })
      .expect(201);

    const eventId = createResponse.body.data.id;

    const employeeNotificationsResponse = await request(app)
      .get('/api/notifications?limit=10')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);

    const eventCreated = employeeNotificationsResponse.body.data.find(
      (n: any) => n.type === 'EVENT_CREATED'
    );

    expect(eventCreated).toBeDefined();
    const createdPayload = eventCreated as any;
    expect(createdPayload.category).toBe('event_lifecycle');
    expect(createdPayload.title).toMatch(/Test Admin/i);
    expect(createdPayload.body).toMatch(/Team Sync Lunch/i);
    expect(createdPayload.actor).toMatchObject({ id: creatorId, name: 'Test Admin' });
    expect(createdPayload.subject).toMatchObject({
      eventId,
      eventTitle,
      restaurantName,
    });
    expect(createdPayload.cta).toMatchObject({ kind: 'event', id: eventId });

    await request(app)
      .post(`/api/events/${eventId}/join`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(201);

    const creatorNotificationsResponse = await request(app)
      .get('/api/notifications?limit=10')
      .set('Authorization', `Bearer ${creatorToken}`)
      .expect(200);

    const joinNotification = creatorNotificationsResponse.body.data.find(
      (n: any) => n.type === 'USER_JOINED_EVENT'
    );

    expect(joinNotification).toBeDefined();
    const joinPayload = joinNotification as any;
    expect(joinPayload.category).toBe('participant_activity');
    expect(joinPayload.title).toMatch(/Test User 0/i);
    expect(joinPayload.body).toMatch(/joined/i);
    expect(joinPayload.actor).toMatchObject({ id: employeeId, name: 'Test User 0' });
    expect(joinPayload.subject).toMatchObject({
      eventId,
      eventTitle,
    });
    expect(joinPayload.cta).toMatchObject({ kind: 'event', id: eventId });
  });
});
