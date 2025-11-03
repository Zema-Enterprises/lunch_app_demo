/**
 * Event Lifecycle E2E Integration Tests - Phase 4.2
 * 
 * Tests complete event flow from creation through completion:
 * Create → Join → Order → Close → Pay → Deliver → Complete
 * 
 * Validates:
 * - State transitions (OPEN → CLOSED → COMPLETED)
 * - Notification triggers at each step
 * - Multi-user participation
 * - Auto-completion logic
 * - Order deletion restrictions
 */

import request from 'supertest';
import app from '../../app';
import { setupCompanyWithUsers } from '../../test/helpers/auth.helper';
import { createRestaurant } from '../../test/factories/restaurant.factory';
import { createMenuItem } from '../../test/factories/menuItem.factory';
import { createUserNotificationSettings } from '../../test/factories/notification.factory';
import prisma from '../../config/database';

describe('Event Lifecycle E2E', () => {
  let companyId: string;
  let creatorToken: string;
  let creatorId: string;
  let participant1Token: string;
  let participant1Id: string;
  let participant2Token: string;
  let participant2Id: string;
  let restaurantId: string;
  let menuItemId: string;

  beforeEach(async () => {
    // Setup company with 3 users (1 admin/creator + 2 employees/participants)
    const testData = await setupCompanyWithUsers({ employeeCount: 2 });
    companyId = testData.company.id;
    creatorToken = testData.admin.token;
    creatorId = testData.admin.id;
    participant1Token = testData.employees![0].token;
    participant1Id = testData.employees![0].id;
    participant2Token = testData.employees![1].token;
    participant2Id = testData.employees![1].id;

    // Create notification settings for all users
    await createUserNotificationSettings({ userId: creatorId });
    await createUserNotificationSettings({ userId: participant1Id });
    await createUserNotificationSettings({ userId: participant2Id });

    // Create restaurant with menu
    const restaurant = await createRestaurant({
      name: 'Test Restaurant',
      companyId,
      deliveryTime: '45-60 minutes',
    });
    restaurantId = restaurant.id;

    const menuItem = await createMenuItem({
      name: 'Test Pizza',
      price: 12.99,
      restaurantId,
    });
    menuItemId = menuItem.id;
  });

  afterEach(async () => {
    // Cleanup in reverse order of dependencies
    await prisma.notificationEvent.deleteMany({ where: { user: { companyId } } });
    await prisma.userNotificationSettings.deleteMany({ where: { user: { companyId } } });
    await prisma.orderItem.deleteMany({ where: { order: { event: { companyId } } } });
    await prisma.order.deleteMany({ where: { event: { companyId } } });
    await prisma.eventParticipant.deleteMany({ where: { event: { companyId } } });
    await prisma.event.deleteMany({ where: { companyId } });
    await prisma.menuItem.deleteMany({ where: { restaurant: { companyId } } });
    await prisma.restaurant.deleteMany({ where: { companyId } });
    await prisma.user.deleteMany({ where: { companyId } });
    await prisma.company.delete({ where: { id: companyId } });
  });

  describe('Complete Happy Path Flow', () => {
    it('should complete full event lifecycle: Create → Join → Order → Close → Pay → Deliver → Complete', async () => {
      // ============================================================
      // STEP 1: Creator creates event
      // ============================================================
      const eventData = {
        title: 'Team Lunch',
        description: 'Weekly team lunch',
        deliveryLocation: 'Office',
        orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        paymentMethod: 'EVENT_CREATOR',
        restaurantId,
      };

      const createResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send(eventData)
        .expect(201);

      expect(createResponse.body.data).toHaveProperty('id');
      expect(createResponse.body.data.status).toBe('OPEN');
      expect(createResponse.body.data.estimatedDelivery).toBe('45-60 minutes');

      const eventId = createResponse.body.data.id;

      // Verify EVENT_CREATED notification was created for company users
      // (User settings default: notifyOnEventCreated = false, so should be 0)
      const createdNotifications = await prisma.notificationEvent.findMany({
        where: { eventId, type: 'EVENT_CREATED' },
      });
      expect(createdNotifications.length).toBe(0); // Default is disabled

      // ============================================================
      // STEP 2: Participants join event
      // ============================================================
      
      // Participant 1 joins
      await request(app)
        .post(`/api/events/${eventId}/join`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(201); // Creates new participant record

      // Verify USER_JOINED_EVENT notification sent to creator
      let joinNotifications = await prisma.notificationEvent.findMany({
        where: { 
          eventId, 
          type: 'USER_JOINED_EVENT',
          userId: creatorId 
        },
      });
      expect(joinNotifications.length).toBe(1);

      // Participant 2 joins
      await request(app)
        .post(`/api/events/${eventId}/join`)
        .set('Authorization', `Bearer ${participant2Token}`)
        .expect(201);

      // Verify second join notification
      joinNotifications = await prisma.notificationEvent.findMany({
        where: { 
          eventId, 
          type: 'USER_JOINED_EVENT',
          userId: creatorId 
        },
      });
      expect(joinNotifications.length).toBe(2);

      // ============================================================
      // STEP 3: All users place orders
      // ============================================================

      // Creator places order
      const creatorOrderData = {
        items: [{ menuItemId, quantity: 2 }],
      };

      await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send(creatorOrderData)
        .expect(201);

      // Participant 1 places order
      const participant1OrderData = {
        items: [{ menuItemId, quantity: 1 }],
      };

      await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .send(participant1OrderData)
        .expect(201);

      // Participant 2 places order
      const participant2OrderData = {
        items: [{ menuItemId, quantity: 3 }],
      };

      await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Authorization', `Bearer ${participant2Token}`)
        .send(participant2OrderData)
        .expect(201);

      // Verify ORDER_PLACED notifications sent to creator
      const orderNotifications = await prisma.notificationEvent.findMany({
        where: { 
          eventId, 
          type: 'ORDER_PLACED',
          userId: creatorId 
        },
      });
      expect(orderNotifications.length).toBe(2); // Only participants' orders (not creator's own order)

      // ============================================================
      // STEP 4: Creator closes event
      // ============================================================

      await request(app)
        .post(`/api/events/${eventId}/close`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      // Verify event status changed to CLOSED
      const closedEvent = await prisma.event.findUnique({
        where: { id: eventId },
      });
      expect(closedEvent?.status).toBe('CLOSED');

      // Verify EVENT_CLOSED notifications sent to all participants
      const closedNotifications = await prisma.notificationEvent.findMany({
        where: { 
          eventId, 
          type: 'EVENT_CLOSED' 
        },
      });
      expect(closedNotifications.length).toBe(3); // All 3 users

      // ============================================================
      // STEP 5: Test order deletion restriction
      // ============================================================

      // Participant 1 tries to delete order after event closed
      const participant1Order = await prisma.order.findFirst({
        where: { eventId, userId: participant1Id },
      });

      await request(app)
        .delete(`/api/events/${eventId}/orders/${participant1Order!.id}`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(400);

      // Order should still exist
      const stillExists = await prisma.order.findUnique({
        where: { id: participant1Order!.id },
      });
      expect(stillExists).not.toBeNull();

      // ============================================================
      // STEP 6: Creator confirms all payments (EVENT_CREATOR method)
      // ============================================================

      // Get all orders
      const allOrders = await prisma.order.findMany({
        where: { eventId },
      });

      expect(allOrders.length).toBe(3);

      // Creator confirms all payments
      for (const order of allOrders) {
        await request(app)
          .patch(`/api/events/${eventId}/orders/${order.id}/payment`)
          .set('Authorization', `Bearer ${creatorToken}`)
          .expect(200);
      }

      // Verify all orders marked as paid
      const paidOrders = await prisma.order.findMany({
        where: { eventId, paymentConfirmed: true },
      });
      expect(paidOrders.length).toBe(3);

      // Verify PAYMENT_CONFIRMED notifications sent
      const paymentNotifications = await prisma.notificationEvent.findMany({
        where: { 
          eventId, 
          type: 'PAYMENT_CONFIRMED' 
        },
      });
      expect(paymentNotifications.length).toBe(3); // All users notified

      // ============================================================
      // STEP 7: Creator marks event as delivered
      // ============================================================

      const deliveryTime = new Date();
      await request(app)
        .patch(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ deliveredAt: deliveryTime.toISOString() })
        .expect(200);

      // Verify deliveredAt timestamp recorded
      const deliveredEvent = await prisma.event.findUnique({
        where: { id: eventId },
      });
      expect(deliveredEvent?.deliveredAt).not.toBeNull();

      // Verify EVENT_DELIVERED notification sent
      const deliveredNotifications = await prisma.notificationEvent.findMany({
        where: { 
          eventId, 
          type: 'EVENT_DELIVERED' 
        },
      });
      expect(deliveredNotifications.length).toBe(3); // All users notified

      // ============================================================
      // STEP 8: Auto-completion check
      // ============================================================

      // Event should auto-complete because:
      // 1. Status is CLOSED
      // 2. All orders have paymentConfirmed = true
      // 3. Event has deliveredAt timestamp

      // Trigger auto-completion check (this will be a cron job in Phase 5)
      await request(app)
        .post(`/api/events/${eventId}/check-completion`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      // Verify event status changed to COMPLETED
      const completedEvent = await prisma.event.findUnique({
        where: { id: eventId },
      });
      expect(completedEvent?.status).toBe('COMPLETED');

      // Verify EVENT_COMPLETED notifications sent
      const completedNotifications = await prisma.notificationEvent.findMany({
        where: { 
          eventId, 
          type: 'EVENT_COMPLETED' 
        },
      });
      expect(completedNotifications.length).toBe(3); // All users notified
    });
  });

  describe('Order Deletion Restrictions', () => {
    it('should allow order deletion when event is OPEN', async () => {
      // Create event
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Test Event',
          deliveryLocation: 'Office',
          orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'INDIVIDUAL',
          restaurantId,
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      // Participant joins event first
      await request(app)
        .post(`/api/events/${eventId}/join`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(201);

      // Participant places order
      const orderResponse = await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .send({ items: [{ menuItemId, quantity: 1 }] })
        .expect(201);

      const orderId = orderResponse.body.data.id;

      // Event is OPEN, deletion should work
      await request(app)
        .delete(`/api/events/${eventId}/orders/${orderId}`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(200);

      // Verify order deleted
      const deletedOrder = await prisma.order.findUnique({
        where: { id: orderId },
      });
      expect(deletedOrder).toBeNull();
    });

    it('should prevent order deletion when event is CLOSED', async () => {
      // Create event
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Test Event',
          deliveryLocation: 'Office',
          orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'INDIVIDUAL',
          restaurantId,
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      // Participant joins event first
      await request(app)
        .post(`/api/events/${eventId}/join`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(201);

      // Participant places order
      const orderResponse = await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .send({ items: [{ menuItemId, quantity: 1 }] })
        .expect(201);

      const orderId = orderResponse.body.data.id;

      // Close event
      await request(app)
        .post(`/api/events/${eventId}/close`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      // Attempt to delete order - should fail
      const deleteResponse = await request(app)
        .delete(`/api/events/${eventId}/orders/${orderId}`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(400);

      expect(deleteResponse.body.message).toContain('closed');

      // Verify order still exists
      const stillExists = await prisma.order.findUnique({
        where: { id: orderId },
      });
      expect(stillExists).not.toBeNull();
    });

    it('should prevent order deletion when event is COMPLETED', async () => {
      // Create and complete event
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Test Event',
          deliveryLocation: 'Office',
          orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'INDIVIDUAL',
          restaurantId,
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      // Participant joins event first
      await request(app)
        .post(`/api/events/${eventId}/join`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(201);

      // Participant places order
      const orderResponse = await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .send({ items: [{ menuItemId, quantity: 1 }] })
        .expect(201);

      const orderId = orderResponse.body.data.id;

      // Manually set event to COMPLETED
      await prisma.event.update({
        where: { id: eventId },
        data: { status: 'COMPLETED' },
      });

      // Attempt to delete order - should fail
      await request(app)
        .delete(`/api/events/${eventId}/orders/${orderId}`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(400);

      // Verify order still exists
      const stillExists = await prisma.order.findUnique({
        where: { id: orderId },
      });
      expect(stillExists).not.toBeNull();
    });
  });

  describe('Manual Event Completion', () => {
    it('should allow creator to manually complete event', async () => {
      // Create event
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Test Event',
          deliveryLocation: 'Office',
          orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'EVENT_CREATOR',
          restaurantId,
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      // Close event
      await request(app)
        .post(`/api/events/${eventId}/close`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      // Manually complete event
      await request(app)
        .patch(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ status: 'COMPLETED' })
        .expect(200);

      // Verify event completed
      const completedEvent = await prisma.event.findUnique({
        where: { id: eventId },
      });
      expect(completedEvent?.status).toBe('COMPLETED');

      // Verify EVENT_COMPLETED notifications sent
      const notifications = await prisma.notificationEvent.findMany({
        where: { 
          eventId, 
          type: 'EVENT_COMPLETED' 
        },
      });
      expect(notifications.length).toBeGreaterThan(0);
    });

    it('should prevent non-creator from manually completing event', async () => {
      // Create event
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Test Event',
          deliveryLocation: 'Office',
          orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'EVENT_CREATOR',
          restaurantId,
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      // Participant tries to complete event - should fail
      await request(app)
        .patch(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .send({ status: 'COMPLETED' })
        .expect(403);

      // Verify event still OPEN
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });
      expect(event?.status).toBe('OPEN');
    });
  });
});
