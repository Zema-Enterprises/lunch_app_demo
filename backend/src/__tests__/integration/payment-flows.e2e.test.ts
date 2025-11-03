import request from 'supertest';
import app from '../../app';
import prisma from '../../config/database';
import { setupCompanyWithUsers } from '../../test/helpers/auth.helper';
import { createRestaurant } from '../../test/factories/restaurant.factory';
import { createMenuItem } from '../../test/factories/menuItem.factory';
import { createUserNotificationSettings } from '../../test/factories/notification.factory';

/**
 * Payment Flows E2E Tests
 * 
 * Tests different payment methods and their associated notification flows:
 * - EVENT_CREATOR: Creator pays for everyone
 * - INDIVIDUAL: Each participant pays for themselves
 * - COMPANY_EXPENSE: Company covers the cost (no payment confirmation needed)
 * 
 * Verifies:
 * - Payment confirmation permissions
 * - PAYMENT_CONFIRMED notifications sent correctly
 * - Auto-completion after all payments confirmed
 * - Partial payment scenarios
 */
describe('Payment Flows E2E', () => {
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

    // Create notification settings for all users (enable all notifications)
    await createUserNotificationSettings({ userId: creatorId });
    await createUserNotificationSettings({ userId: participant1Id });
    await createUserNotificationSettings({ userId: participant2Id });

    // Create restaurant with menu
    const restaurant = await createRestaurant({
      name: 'Test Restaurant',
      companyId,
      deliveryTime: '30-45 minutes',
    });
    restaurantId = restaurant.id;

    const menuItem = await createMenuItem({
      name: 'Test Item',
      price: 10.0,
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

  describe('EVENT_CREATOR Payment Method', () => {
    it('should allow only creator to confirm all payments', async () => {
      // Create event with EVENT_CREATOR payment method
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Creator Pays Event',
          deliveryLocation: 'Office',
          orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'EVENT_CREATOR',
          restaurantId,
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      // Participants join
      await request(app)
        .post(`/api/events/${eventId}/join`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(201);

      await request(app)
        .post(`/api/events/${eventId}/join`)
        .set('Authorization', `Bearer ${participant2Token}`)
        .expect(201);

      // Participants place orders
      const order1Response = await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .send({
          items: [{ menuItemId, quantity: 1, price: 10.0 }],
          totalAmount: 10.0,
        })
        .expect(201);

      const order1Id = order1Response.body.data.id;

      const order2Response = await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Authorization', `Bearer ${participant2Token}`)
        .send({
          items: [{ menuItemId, quantity: 1, price: 10.0 }],
          totalAmount: 10.0,
        })
        .expect(201);

      const order2Id = order2Response.body.data.id;

      // Creator places their own order
      const creatorOrderResponse = await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          items: [{ menuItemId, quantity: 1, price: 10.0 }],
          totalAmount: 10.0,
        })
        .expect(201);

      const creatorOrderId = creatorOrderResponse.body.data.id;

      // Participant tries to confirm their own payment - should fail
      await request(app)
        .patch(`/api/events/${eventId}/orders/${order1Id}/payment`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(403);

      // Creator confirms all payments - should succeed
      await request(app)
        .patch(`/api/events/${eventId}/orders/${order1Id}/payment`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      await request(app)
        .patch(`/api/events/${eventId}/orders/${order2Id}/payment`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      await request(app)
        .patch(`/api/events/${eventId}/orders/${creatorOrderId}/payment`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      // Verify PAYMENT_CONFIRMED notifications sent to each order owner
      const paymentNotifications = await prisma.notificationEvent.findMany({
        where: { eventId, type: 'PAYMENT_CONFIRMED' },
        orderBy: { createdAt: 'asc' },
      });

      expect(paymentNotifications.length).toBe(3);
      expect(paymentNotifications[0].userId).toBe(participant1Id);
      expect(paymentNotifications[1].userId).toBe(participant2Id);
      expect(paymentNotifications[2].userId).toBe(creatorId);
    });

    it('should auto-complete event after creator confirms all payments and marks delivery', async () => {
      // Create event
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Auto Complete Event',
          deliveryLocation: 'Office',
          orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'EVENT_CREATOR',
          restaurantId,
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      // Participant joins and orders
      await request(app)
        .post(`/api/events/${eventId}/join`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(201);

      const orderResponse = await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .send({
          items: [{ menuItemId, quantity: 1, price: 10.0 }],
          totalAmount: 10.0,
        })
        .expect(201);

      const orderId = orderResponse.body.data.id;

      // Close event
      await request(app)
        .post(`/api/events/${eventId}/close`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      // Creator confirms payment
      await request(app)
        .patch(`/api/events/${eventId}/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      // Mark as delivered
      await request(app)
        .patch(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          deliveredAt: new Date().toISOString(),
        })
        .expect(200);

      // Check auto-completion
      const completionResponse = await request(app)
        .post(`/api/events/${eventId}/check-completion`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      expect(completionResponse.body.data.completed).toBe(true);

      // Verify event status is COMPLETED
      const finalEvent = await prisma.event.findUnique({
        where: { id: eventId },
      });
      expect(finalEvent?.status).toBe('COMPLETED');

      // Verify EVENT_COMPLETED notification sent
      const completedNotifications = await prisma.notificationEvent.findMany({
        where: { eventId, type: 'EVENT_COMPLETED' },
      });
      expect(completedNotifications.length).toBe(2); // Creator and participant
    });
  });

  describe('INDIVIDUAL Payment Method', () => {
    it('should allow each participant to confirm only their own payment', async () => {
      // Create event with INDIVIDUAL payment method
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Individual Pays Event',
          deliveryLocation: 'Office',
          orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'INDIVIDUAL',
          restaurantId,
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      // Participants join
      await request(app)
        .post(`/api/events/${eventId}/join`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(201);

      await request(app)
        .post(`/api/events/${eventId}/join`)
        .set('Authorization', `Bearer ${participant2Token}`)
        .expect(201);

      // Place orders
      const order1Response = await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .send({
          items: [{ menuItemId, quantity: 1, price: 10.0 }],
          totalAmount: 10.0,
        })
        .expect(201);

      const order1Id = order1Response.body.data.id;

      const order2Response = await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Authorization', `Bearer ${participant2Token}`)
        .send({
          items: [{ menuItemId, quantity: 1, price: 10.0 }],
          totalAmount: 10.0,
        })
        .expect(201);

      const order2Id = order2Response.body.data.id;

      // Participant 1 tries to confirm Participant 2's payment - should fail
      await request(app)
        .patch(`/api/events/${eventId}/orders/${order2Id}/payment`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(403);

      // Creator tries to confirm participant's payment - should fail (not EVENT_CREATOR method)
      await request(app)
        .patch(`/api/events/${eventId}/orders/${order1Id}/payment`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(403);

      // Each participant confirms their own payment - should succeed
      await request(app)
        .patch(`/api/events/${eventId}/orders/${order1Id}/payment`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(200);

      await request(app)
        .patch(`/api/events/${eventId}/orders/${order2Id}/payment`)
        .set('Authorization', `Bearer ${participant2Token}`)
        .expect(200);

      // Verify payments confirmed
      const orders = await prisma.order.findMany({
        where: { eventId },
      });

      expect(orders.every(o => o.paymentConfirmed)).toBe(true);
    });

    it('should auto-complete after all individuals confirm payments and delivery marked', async () => {
      // Create event
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Individual Auto Complete',
          deliveryLocation: 'Office',
          orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'INDIVIDUAL',
          restaurantId,
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      // Join and order
      await request(app)
        .post(`/api/events/${eventId}/join`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(201);

      const orderResponse = await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .send({
          items: [{ menuItemId, quantity: 1, price: 10.0 }],
          totalAmount: 10.0,
        })
        .expect(201);

      const orderId = orderResponse.body.data.id;

      // Close event
      await request(app)
        .post(`/api/events/${eventId}/close`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      // Participant confirms their own payment
      await request(app)
        .patch(`/api/events/${eventId}/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(200);

      // Mark as delivered
      await request(app)
        .patch(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          deliveredAt: new Date().toISOString(),
        })
        .expect(200);

      // Check auto-completion
      const completionResponse = await request(app)
        .post(`/api/events/${eventId}/check-completion`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      expect(completionResponse.body.data.completed).toBe(true);
    });
  });

  describe('COMPANY_EXPENSE Payment Method', () => {
    it('should allow any participant to confirm payments for company expense', async () => {
      // Create event with COMPANY_EXPENSE payment method
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Company Expense Event',
          deliveryLocation: 'Office',
          orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'COMPANY_EXPENSE',
          restaurantId,
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      // Participants join
      await request(app)
        .post(`/api/events/${eventId}/join`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(201);

      await request(app)
        .post(`/api/events/${eventId}/join`)
        .set('Authorization', `Bearer ${participant2Token}`)
        .expect(201);

      // Place orders
      const order1Response = await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .send({
          items: [{ menuItemId, quantity: 1, price: 10.0 }],
          totalAmount: 10.0,
        })
        .expect(201);

      const order1Id = order1Response.body.data.id;

      const order2Response = await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Authorization', `Bearer ${participant2Token}`)
        .send({
          items: [{ menuItemId, quantity: 1, price: 10.0 }],
          totalAmount: 10.0,
        })
        .expect(201);

      const order2Id = order2Response.body.data.id;

      // Each participant can confirm their own payment
      await request(app)
        .patch(`/api/events/${eventId}/orders/${order1Id}/payment`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(200);

      await request(app)
        .patch(`/api/events/${eventId}/orders/${order2Id}/payment`)
        .set('Authorization', `Bearer ${participant2Token}`)
        .expect(200);

      // Verify both payments confirmed
      const orders = await prisma.order.findMany({
        where: { eventId },
      });

      expect(orders.every(o => o.paymentConfirmed)).toBe(true);
    });
  });

  describe('Partial Payment Scenarios', () => {
    it('should not auto-complete if some payments are missing', async () => {
      // Create event
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Partial Payment Event',
          deliveryLocation: 'Office',
          orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'INDIVIDUAL',
          restaurantId,
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      // Two participants join and order
      await request(app)
        .post(`/api/events/${eventId}/join`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(201);

      await request(app)
        .post(`/api/events/${eventId}/join`)
        .set('Authorization', `Bearer ${participant2Token}`)
        .expect(201);

      const order1Response = await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .send({
          items: [{ menuItemId, quantity: 1, price: 10.0 }],
          totalAmount: 10.0,
        })
        .expect(201);

      const order1Id = order1Response.body.data.id;

      await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Authorization', `Bearer ${participant2Token}`)
        .send({
          items: [{ menuItemId, quantity: 1, price: 10.0 }],
          totalAmount: 10.0,
        })
        .expect(201);

      // Close event
      await request(app)
        .post(`/api/events/${eventId}/close`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      // Only one participant confirms payment
      await request(app)
        .patch(`/api/events/${eventId}/orders/${order1Id}/payment`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(200);

      // Mark as delivered
      await request(app)
        .patch(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          deliveredAt: new Date().toISOString(),
        })
        .expect(200);

      // Check auto-completion - should return false
      const completionResponse = await request(app)
        .post(`/api/events/${eventId}/check-completion`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      expect(completionResponse.body.data.completed).toBe(false);
      expect(completionResponse.body.data.criteria.allPaid).toBe(false);

      // Verify event still CLOSED
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });
      expect(event?.status).toBe('CLOSED');
    });

    it('should not auto-complete if delivery not marked even with all payments', async () => {
      // Create event
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'No Delivery Event',
          deliveryLocation: 'Office',
          orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'INDIVIDUAL',
          restaurantId,
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      // Join and order
      await request(app)
        .post(`/api/events/${eventId}/join`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(201);

      const orderResponse = await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .send({
          items: [{ menuItemId, quantity: 1, price: 10.0 }],
          totalAmount: 10.0,
        })
        .expect(201);

      const orderId = orderResponse.body.data.id;

      // Close and confirm payment
      await request(app)
        .post(`/api/events/${eventId}/close`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      await request(app)
        .patch(`/api/events/${eventId}/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(200);

      // Check auto-completion without marking delivery - should return false
      const completionResponse = await request(app)
        .post(`/api/events/${eventId}/check-completion`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      expect(completionResponse.body.data.completed).toBe(false);
      expect(completionResponse.body.data.criteria.isDelivered).toBe(false);
      expect(completionResponse.body.data.criteria.allPaid).toBe(true);
    });

    it('should not auto-complete if event not closed even with payments and delivery', async () => {
      // Create event
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Not Closed Event',
          deliveryLocation: 'Office',
          orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'INDIVIDUAL',
          restaurantId,
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      // Join and order
      await request(app)
        .post(`/api/events/${eventId}/join`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(201);

      const orderResponse = await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .send({
          items: [{ menuItemId, quantity: 1, price: 10.0 }],
          totalAmount: 10.0,
        })
        .expect(201);

      const orderId = orderResponse.body.data.id;

      // Confirm payment and mark delivery WITHOUT closing event
      await request(app)
        .patch(`/api/events/${eventId}/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(200);

      await request(app)
        .patch(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          deliveredAt: new Date().toISOString(),
        })
        .expect(200);

      // Check auto-completion - should return false
      const completionResponse = await request(app)
        .post(`/api/events/${eventId}/check-completion`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      expect(completionResponse.body.data.completed).toBe(false);
      expect(completionResponse.body.data.criteria.isClosed).toBe(false);
    });
  });

  describe('Payment Notification Flow', () => {
    it('should send PAYMENT_CONFIRMED notification to correct user', async () => {
      // Create event
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Payment Notification Test',
          deliveryLocation: 'Office',
          orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'INDIVIDUAL',
          restaurantId,
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      // Join and order
      await request(app)
        .post(`/api/events/${eventId}/join`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(201);

      const orderResponse = await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .send({
          items: [{ menuItemId, quantity: 1, price: 10.0 }],
          totalAmount: 10.0,
        })
        .expect(201);

      const orderId = orderResponse.body.data.id;

      // Confirm payment
      await request(app)
        .patch(`/api/events/${eventId}/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(200);

      // Verify notification sent to order owner
      const notification = await prisma.notificationEvent.findFirst({
        where: {
          type: 'PAYMENT_CONFIRMED',
          userId: participant1Id,
          eventId,
          orderId,
        },
      });

      expect(notification).not.toBeNull();
      expect(notification?.read).toBe(false);
    });
  });
});
