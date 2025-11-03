import request from 'supertest';
import app from '../../app';
import prisma from '../../config/database';
import { setupCompanyWithUsers } from '../../test/helpers/auth.helper';
import { createRestaurant } from '../../test/factories/restaurant.factory';
import { createMenuItem } from '../../test/factories/menuItem.factory';

/**
 * Order Retention E2E Tests
 * 
 * Tests 30-day retention logic and data lifecycle:
 * - Events and orders visible within 30 days
 * - Query filtering by date ranges
 * - Old data handling (archive/deletion)
 * - Historical data access
 * 
 * Business Rule: Events and orders are retained for 30 days after completion.
 * After 30 days, they may be archived or marked for deletion.
 */
describe('Order Retention E2E', () => {
  let companyId: string;
  let creatorToken: string;
  let creatorId: string;
  let participant1Token: string;
  let participant1Id: string;
  let restaurantId: string;
  let menuItemId: string;

  beforeEach(async () => {
    // Setup company with users
    const testData = await setupCompanyWithUsers({ employeeCount: 1 });
    companyId = testData.company.id;
    creatorToken = testData.admin.token;
    creatorId = testData.admin.id;
    participant1Token = testData.employees![0].token;
    participant1Id = testData.employees![0].id;

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
    // Cleanup
    await prisma.orderItem.deleteMany({ where: { order: { event: { companyId } } } });
    await prisma.order.deleteMany({ where: { event: { companyId } } });
    await prisma.eventParticipant.deleteMany({ where: { event: { companyId } } });
    await prisma.event.deleteMany({ where: { companyId } });
    await prisma.menuItem.deleteMany({ where: { restaurant: { companyId } } });
    await prisma.restaurant.deleteMany({ where: { companyId } });
    await prisma.user.deleteMany({ where: { companyId } });
    await prisma.company.delete({ where: { id: companyId } });
  });

  describe('Recent Events (Within 30 Days)', () => {
    it('should list all recent events created today', async () => {
      // Create multiple events
      const event1Response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Today Event 1',
          deliveryLocation: 'Office',
          orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'INDIVIDUAL',
          restaurantId,
        })
        .expect(201);

      const event2Response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Today Event 2',
          deliveryLocation: 'Office',
          orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'INDIVIDUAL',
          restaurantId,
        })
        .expect(201);

      // List all events
      const listResponse = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      const events = listResponse.body.data;
      expect(events.length).toBeGreaterThanOrEqual(2);
      
      const eventIds = events.map((e: any) => e.id);
      expect(eventIds).toContain(event1Response.body.data.id);
      expect(eventIds).toContain(event2Response.body.data.id);
    });

    it('should return completed events from recent dates', async () => {
      // Create and complete an event
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Completed Event',
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

      // Complete the event
      await request(app)
        .post(`/api/events/${eventId}/close`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      await request(app)
        .patch(`/api/events/${eventId}/orders/${orderResponse.body.data.id}/payment`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(200);

      await request(app)
        .patch(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          deliveredAt: new Date().toISOString(),
          status: 'COMPLETED',
        })
        .expect(200);

      // Verify completed event is still visible
      const listResponse = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      const events = listResponse.body.data;
      const completedEvent = events.find((e: any) => e.id === eventId);
      
      expect(completedEvent).toBeDefined();
      expect(completedEvent.status).toBe('COMPLETED');
    });

    it('should return orders through event details for recent events', async () => {
      // Create event and place order
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Order History Event',
          deliveryLocation: 'Office',
          orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'INDIVIDUAL',
          restaurantId,
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      await request(app)
        .post(`/api/events/${eventId}/join`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(201);

      await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .send({
          items: [{ menuItemId, quantity: 2, price: 10.0 }],
          totalAmount: 20.0,
        })
        .expect(201);

      // Get event details which includes orders
      const eventDetails = await request(app)
        .get(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(200);

      const orders = eventDetails.body.data.orders;
      expect(orders).toBeDefined();
      expect(orders.length).toBeGreaterThan(0);
      
      const participantOrder = orders.find((o: any) => o.userId === participant1Id);
      expect(participantOrder).toBeDefined();
      expect(participantOrder.totalAmount).toBe(20.0);
    });
  });

  describe('Old Events (Simulated 30+ Days)', () => {
    it('should still return old completed events (no automatic deletion)', async () => {
      // Create and complete an event
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Old Event',
          deliveryLocation: 'Office',
          orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'INDIVIDUAL',
          restaurantId,
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      // Complete the event
      await request(app)
        .post(`/api/events/${eventId}/close`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      await request(app)
        .patch(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          deliveredAt: new Date().toISOString(),
          status: 'COMPLETED',
        })
        .expect(200);

      // Manually backdate the event to simulate 31 days ago
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      await prisma.event.update({
        where: { id: eventId },
        data: { createdAt: thirtyOneDaysAgo },
      });

      // Verify old event is still accessible by ID
      const getResponse = await request(app)
        .get(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      expect(getResponse.body.data.id).toBe(eventId);
      expect(getResponse.body.data.status).toBe('COMPLETED');
    });

    it('should include old events in list (no automatic filtering)', async () => {
      // Create a recent event
      const recentEventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Recent Event',
          deliveryLocation: 'Office',
          orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'INDIVIDUAL',
          restaurantId,
        })
        .expect(201);

      // Create an old event
      const oldEventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Old Event',
          deliveryLocation: 'Office',
          orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'INDIVIDUAL',
          restaurantId,
        })
        .expect(201);

      const oldEventId = oldEventResponse.body.data.id;

      // Backdate the old event
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      await prisma.event.update({
        where: { id: oldEventId },
        data: { createdAt: thirtyOneDaysAgo },
      });

      // List all events
      const listResponse = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      const events = listResponse.body.data;
      expect(events.length).toBeGreaterThanOrEqual(2);

      // Both recent and old events should be present
      const eventIds = events.map((e: any) => e.id);
      expect(eventIds).toContain(recentEventResponse.body.data.id);
      expect(eventIds).toContain(oldEventId);
    });
  });

  describe('Data Lifecycle and History', () => {
    it('should preserve order history for completed events', async () => {
      // Create event with multiple orders
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'History Event',
          deliveryLocation: 'Office',
          orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'INDIVIDUAL',
          restaurantId,
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      // Creator joins and orders
      await request(app)
        .post(`/api/events/${eventId}/join`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(201);

      await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          items: [{ menuItemId, quantity: 1, price: 10.0 }],
          totalAmount: 10.0,
        })
        .expect(201);

      // Participant joins and orders
      await request(app)
        .post(`/api/events/${eventId}/join`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(201);

      await request(app)
        .post(`/api/events/${eventId}/orders`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .send({
          items: [{ menuItemId, quantity: 2, price: 10.0 }],
          totalAmount: 20.0,
        })
        .expect(201);

      // Complete event
      await request(app)
        .post(`/api/events/${eventId}/close`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      await request(app)
        .patch(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          deliveredAt: new Date().toISOString(),
          status: 'COMPLETED',
        })
        .expect(200);

      // Verify all orders are preserved
      const eventDetails = await request(app)
        .get(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      const orders = eventDetails.body.data.orders;
      expect(orders).toBeDefined();
      expect(orders.length).toBe(2);
    });

    it('should maintain participant history for completed events', async () => {
      // Create event with participants
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Participant History Event',
          deliveryLocation: 'Office',
          orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'INDIVIDUAL',
          restaurantId,
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      // Multiple participants join
      await request(app)
        .post(`/api/events/${eventId}/join`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(201);

      await request(app)
        .post(`/api/events/${eventId}/join`)
        .set('Authorization', `Bearer ${participant1Token}`)
        .expect(201);

      // Complete event
      await request(app)
        .post(`/api/events/${eventId}/close`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      await request(app)
        .patch(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          deliveredAt: new Date().toISOString(),
          status: 'COMPLETED',
        })
        .expect(200);

      // Backdate to simulate old event
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      await prisma.event.update({
        where: { id: eventId },
        data: { createdAt: thirtyOneDaysAgo },
      });

      // Verify participant history is preserved
      const eventDetails = await request(app)
        .get(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      const participants = eventDetails.body.data.participants;
      expect(participants).toBeDefined();
      expect(participants.length).toBe(2);

      const participantIds = participants.map((p: any) => p.userId);
      expect(participantIds).toContain(creatorId);
      expect(participantIds).toContain(participant1Id);
    });

    it('should preserve event metadata for historical analysis', async () => {
      // Create event with full metadata
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Metadata Event',
          description: 'Team lunch for project celebration',
          deliveryLocation: 'Conference Room A',
          orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'COMPANY_EXPENSE',
          restaurantId,
        })
        .expect(201);

      const eventId = eventResponse.body.data.id;

      // Complete event
      await request(app)
        .post(`/api/events/${eventId}/close`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      await request(app)
        .patch(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          deliveredAt: new Date().toISOString(),
          status: 'COMPLETED',
        })
        .expect(200);

      // Backdate
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      await prisma.event.update({
        where: { id: eventId },
        data: { createdAt: sixtyDaysAgo },
      });

      // Verify all metadata preserved
      const eventDetails = await request(app)
        .get(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      const event = eventDetails.body.data;
      expect(event.title).toBe('Metadata Event');
      expect(event.description).toBe('Team lunch for project celebration');
      expect(event.deliveryLocation).toBe('Conference Room A');
      expect(event.paymentMethod).toBe('COMPANY_EXPENSE');
      expect(event.status).toBe('COMPLETED');
      expect(event.restaurant).toBeDefined();
      expect(event.createdBy).toBeDefined();
    });
  });

  describe('Multi-Company Isolation', () => {
    it('should not return events from other companies regardless of age', async () => {
      // Setup second company
      const company2Data = await setupCompanyWithUsers({ employeeCount: 0 });
      const company2Token = company2Data.admin.token;

      // Create restaurant for company 2
      const restaurant2 = await createRestaurant({
        name: 'Company 2 Restaurant',
        companyId: company2Data.company.id,
        deliveryTime: '30 minutes',
      });

      const menuItem2 = await createMenuItem({
        name: 'Company 2 Item',
        price: 15.0,
        restaurantId: restaurant2.id,
      });

      // Create event in company 1
      await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Company 1 Event',
          deliveryLocation: 'Office',
          orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'INDIVIDUAL',
          restaurantId,
        })
        .expect(201);

      // Create event in company 2
      const company2EventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${company2Token}`)
        .send({
          title: 'Company 2 Event',
          deliveryLocation: 'Office',
          orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          paymentMethod: 'INDIVIDUAL',
          restaurantId: restaurant2.id,
        })
        .expect(201);

      // Company 1 user should not see company 2 events
      const company1Events = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      const company1EventIds = company1Events.body.data.map((e: any) => e.id);
      expect(company1EventIds).not.toContain(company2EventResponse.body.data.id);

      // Company 2 user should not see company 1 events
      const company2Events = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${company2Token}`)
        .expect(200);

      expect(company2Events.body.data.length).toBe(1);
      expect(company2Events.body.data[0].title).toBe('Company 2 Event');

      // Cleanup company 2
      await prisma.menuItem.deleteMany({ where: { restaurantId: restaurant2.id } });
      await prisma.eventParticipant.deleteMany({ where: { event: { companyId: company2Data.company.id } } });
      await prisma.event.deleteMany({ where: { companyId: company2Data.company.id } });
      await prisma.restaurant.deleteMany({ where: { companyId: company2Data.company.id } });
      await prisma.user.deleteMany({ where: { companyId: company2Data.company.id } });
      await prisma.company.delete({ where: { id: company2Data.company.id } });
    });
  });
});
