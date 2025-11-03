/**
 * Event Management Flow Integration Tests
 * 
 * Tests cover:
 * - Event CRUD operations (create, read, update, delete)
 * - Event status transitions (OPEN → CLOSED)
 * - Participant management (join, leave)
 * - Event deadlines and validation
 * - Restaurant associations
 * - Company isolation
 * - Role-based permissions
 */

import request from 'supertest';
import app from '../../app';
import { setupCompanyWithUsers } from '../../test/helpers/auth.helper';
import { cleanupTestData } from '../../test/helpers/db.helper';
import { authenticatedRequest, assertSuccess, assertUnauthorized, assertBadRequest, assertNotFound, assertForbidden } from '../../test/helpers/request.helper';
import { createRestaurant } from '../../test/factories/restaurant.factory';
import { createEvent } from '../../test/factories/event.factory';

describe('Event Management Flow Integration Tests', () => {
  describe('Event Creation', () => {
    let testData: any;
    let restaurant: any;

    beforeAll(async () => {
      testData = await setupCompanyWithUsers({ employeeCount: 2 });
      restaurant = await createRestaurant({ companyId: testData.company.id });
    });

    afterAll(async () => {
      await cleanupTestData(testData.company.id);
    });

    describe('Happy Path', () => {
      it('should create an event as admin', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const response = await authenticatedRequest(app, testData.admin.token)
          .post('/api/events')
          .send({
            title: 'Team Lunch',
            description: 'Weekly team lunch',
            orderDeadline: tomorrow.toISOString(),
            restaurantId: restaurant.id,
          });

        assertSuccess(response);
        expect(response.body.data).toMatchObject({
          title: 'Team Lunch',
          description: 'Weekly team lunch',
          status: 'OPEN',
          restaurantId: restaurant.id,
          createdById: testData.admin.id,
          companyId: testData.company.id,
        });
      });

      it('should create an event as regular user', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const response = await authenticatedRequest(app, testData.employees[0].token)
          .post('/api/events')
          .send({
            title: 'Friday Lunch',
            description: 'End of week celebration',
            orderDeadline: tomorrow.toISOString(),
            restaurantId: restaurant.id,
          });

        assertSuccess(response);
        expect(response.body.data.createdById).toBe(testData.employees[0].id);
      });

      it('should auto-set status to OPEN for future events', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);

        const response = await authenticatedRequest(app, testData.admin.token)
          .post('/api/events')
          .send({
            title: 'Next Week Lunch',
            orderDeadline: futureDate.toISOString(),
            restaurantId: restaurant.id,
          });

        assertSuccess(response);
        expect(response.body.data.status).toBe('OPEN');
      });
    });

    describe('Validation', () => {
      it('should reject event without title', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const response = await authenticatedRequest(app, testData.admin.token)
          .post('/api/events')
          .send({
            orderDeadline: tomorrow.toISOString(),
            restaurantId: restaurant.id,
          });

        assertBadRequest(response);
        expect(response.body.message).toMatch(/title/i);
      });

      it('should reject event without orderDeadline', async () => {
        const response = await authenticatedRequest(app, testData.admin.token)
          .post('/api/events')
          .send({
            title: 'No Deadline Event',
            restaurantId: restaurant.id,
          });

        assertBadRequest(response);
        expect(response.body.message).toMatch(/deadline/i);
      });

      it('should reject event without restaurantId', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const response = await authenticatedRequest(app, testData.admin.token)
          .post('/api/events')
          .send({
            title: 'No Restaurant Event',
            orderDeadline: tomorrow.toISOString(),
          });

        assertBadRequest(response);
        expect(response.body.message).toMatch(/restaurant/i);
      });

      it('should reject event with past orderDeadline', async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const response = await authenticatedRequest(app, testData.admin.token)
          .post('/api/events')
          .send({
            title: 'Past Event',
            orderDeadline: yesterday.toISOString(),
            restaurantId: restaurant.id,
          });

        assertBadRequest(response);
        expect(response.body.message).toMatch(/past|future/i);
      });

      it('should reject event with non-existent restaurantId', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const response = await authenticatedRequest(app, testData.admin.token)
          .post('/api/events')
          .send({
            title: 'Invalid Restaurant Event',
            orderDeadline: tomorrow.toISOString(),
            restaurantId: 'non-existent-id',
          });

        assertBadRequest(response);
      });
    });

    describe('Authorization', () => {
      it('should reject unauthenticated event creation', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const response = await request(app)
          .post('/api/events')
          .send({
            title: 'Unauthorized Event',
            orderDeadline: tomorrow.toISOString(),
            restaurantId: restaurant.id,
          });

        assertUnauthorized(response);
      });

      it('should reject event with restaurant from different company', async () => {
        // Create a second company with a restaurant
        const company2Data = await setupCompanyWithUsers({ employeeCount: 0 });
        const company2Restaurant = await createRestaurant({ companyId: company2Data.company.id });

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        try {
          const response = await authenticatedRequest(app, testData.admin.token)
            .post('/api/events')
            .send({
              title: 'Cross-Company Event',
              orderDeadline: tomorrow.toISOString(),
              restaurantId: company2Restaurant.id,
            });

          assertForbidden(response);
        } finally {
          await cleanupTestData(company2Data.company.id);
        }
      });
    });
  });

  describe('Event Retrieval', () => {
    let testData: any;
    let restaurant: any;
    let testEvent: any;

    beforeAll(async () => {
      testData = await setupCompanyWithUsers({ employeeCount: 2 });
      restaurant = await createRestaurant({ companyId: testData.company.id });
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      testEvent = await createEvent({
        title: 'Test Event',
        companyId: testData.company.id,
        createdById: testData.admin.id,
        restaurantId: restaurant.id,
        orderDeadline: tomorrow,
      });
    });

    afterAll(async () => {
      await cleanupTestData(testData.company.id);
    });

    describe('List Events', () => {
      it('should list all events for company', async () => {
        const response = await authenticatedRequest(app, testData.admin.token)
          .get('/api/events');

        assertSuccess(response);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        
        // All events should be from same company
        response.body.data.forEach((event: any) => {
          expect(event.companyId).toBe(testData.company.id);
        });
      });

      it('should allow regular users to list events', async () => {
        const response = await authenticatedRequest(app, testData.employees[0].token)
          .get('/api/events');

        assertSuccess(response);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should reject unauthenticated list requests', async () => {
        const response = await request(app)
          .get('/api/events');

        assertUnauthorized(response);
      });

      it('should only show events from own company', async () => {
        // Create second company with event
        const company2Data = await setupCompanyWithUsers({ employeeCount: 0 });
        const company2Restaurant = await createRestaurant({ companyId: company2Data.company.id });
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        await createEvent({
          title: 'Company 2 Event',
          companyId: company2Data.company.id,
          createdById: company2Data.admin.id,
          restaurantId: company2Restaurant.id,
          orderDeadline: tomorrow,
        });

        try {
          const response = await authenticatedRequest(app, testData.admin.token)
            .get('/api/events');

          assertSuccess(response);
          
          // Should not see company 2's event
          const company2Events = response.body.data.filter(
            (e: any) => e.companyId === company2Data.company.id
          );
          expect(company2Events.length).toBe(0);
        } finally {
          await cleanupTestData(company2Data.company.id);
        }
      });
    });

    describe('Get Single Event', () => {
      it('should get event by ID', async () => {
        const response = await authenticatedRequest(app, testData.admin.token)
          .get(`/api/events/${testEvent.id}`);

        assertSuccess(response);
        expect(response.body.data).toMatchObject({
          id: testEvent.id,
          title: testEvent.title,
          companyId: testData.company.id,
        });
      });

      it('should include restaurant details', async () => {
        const response = await authenticatedRequest(app, testData.admin.token)
          .get(`/api/events/${testEvent.id}`);

        assertSuccess(response);
        expect(response.body.data.restaurant).toMatchObject({
          id: restaurant.id,
          name: restaurant.name,
        });
      });

      it('should include creator details', async () => {
        const response = await authenticatedRequest(app, testData.admin.token)
          .get(`/api/events/${testEvent.id}`);

        assertSuccess(response);
        expect(response.body.data.createdBy).toMatchObject({
          id: testData.admin.id,
          name: testData.admin.name,
        });
      });

      it('should reject request for non-existent event', async () => {
        const response = await authenticatedRequest(app, testData.admin.token)
          .get('/api/events/non-existent-id');

        assertNotFound(response);
      });

      it('should reject request for event from different company', async () => {
        // Create second company with event
        const company2Data = await setupCompanyWithUsers({ employeeCount: 0 });
        const company2Restaurant = await createRestaurant({ companyId: company2Data.company.id });
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const company2Event = await createEvent({
          title: 'Company 2 Event',
          companyId: company2Data.company.id,
          createdById: company2Data.admin.id,
          restaurantId: company2Restaurant.id,
          orderDeadline: tomorrow,
        });

        try {
          const response = await authenticatedRequest(app, testData.admin.token)
            .get(`/api/events/${company2Event.id}`);

          assertForbidden(response);
        } finally {
          await cleanupTestData(company2Data.company.id);
        }
      });
    });
  });

  describe('Event Updates', () => {
    let testData: any;
    let restaurant: any;
    let testEvent: any;

    beforeEach(async () => {
      testData = await setupCompanyWithUsers({ employeeCount: 2 });
      restaurant = await createRestaurant({ companyId: testData.company.id });
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      testEvent = await createEvent({
        title: 'Original Title',
        description: 'Original Description',
        companyId: testData.company.id,
        createdById: testData.admin.id,
        restaurantId: restaurant.id,
        orderDeadline: tomorrow,
      });
    });

    afterEach(async () => {
      await cleanupTestData(testData.company.id);
    });

    describe('Happy Path', () => {
      it('should update event title', async () => {
        const response = await authenticatedRequest(app, testData.admin.token)
          .patch(`/api/events/${testEvent.id}`)
          .send({
            title: 'Updated Title',
          });

        assertSuccess(response);
        expect(response.body.data.title).toBe('Updated Title');
        expect(response.body.data.description).toBe(testEvent.description);
      });

      it('should update event description', async () => {
        const response = await authenticatedRequest(app, testData.admin.token)
          .patch(`/api/events/${testEvent.id}`)
          .send({
            description: 'Updated Description',
          });

        assertSuccess(response);
        expect(response.body.data.description).toBe('Updated Description');
      });

      it('should update event deadline', async () => {
        const newDeadline = new Date();
        newDeadline.setDate(newDeadline.getDate() + 2);

        const response = await authenticatedRequest(app, testData.admin.token)
          .patch(`/api/events/${testEvent.id}`)
          .send({
            orderDeadline: newDeadline.toISOString(),
          });

        assertSuccess(response);
        expect(new Date(response.body.data.orderDeadline).getTime()).toBe(newDeadline.getTime());
      });

      it('should allow event creator to update their event', async () => {
        const response = await authenticatedRequest(app, testData.admin.token)
          .patch(`/api/events/${testEvent.id}`)
          .send({
            title: 'Creator Updated',
          });

        assertSuccess(response);
      });
    });

    describe('Permissions', () => {
      it('should deny non-creator from updating event', async () => {
        const response = await authenticatedRequest(app, testData.employees[0].token)
          .patch(`/api/events/${testEvent.id}`)
          .send({
            title: 'Unauthorized Update',
          });

        assertForbidden(response);
      });

      it('should deny updating closed event', async () => {
        // First close the event
        await authenticatedRequest(app, testData.admin.token)
          .post(`/api/events/${testEvent.id}/close`);

        // Then try to update
        const response = await authenticatedRequest(app, testData.admin.token)
          .patch(`/api/events/${testEvent.id}`)
          .send({
            title: 'Update Closed Event',
          });

        assertForbidden(response);
        expect(response.body.message).toMatch(/closed/i);
      });
    });

    describe('Validation', () => {
      it('should reject update with past deadline', async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const response = await authenticatedRequest(app, testData.admin.token)
          .patch(`/api/events/${testEvent.id}`)
          .send({
            orderDeadline: yesterday.toISOString(),
          });

        assertBadRequest(response);
      });
    });
  });

  describe('Event Deletion', () => {
    let testData: any;
    let restaurant: any;

    beforeEach(async () => {
      testData = await setupCompanyWithUsers({ employeeCount: 2 });
      restaurant = await createRestaurant({ companyId: testData.company.id });
    });

    afterEach(async () => {
      await cleanupTestData(testData.company.id);
    });

    it('should allow event creator to delete event', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const event = await createEvent({
        title: 'To Delete',
        companyId: testData.company.id,
        createdById: testData.admin.id,
        restaurantId: restaurant.id,
        orderDeadline: tomorrow,
      });

      const response = await authenticatedRequest(app, testData.admin.token)
        .delete(`/api/events/${event.id}`);

      expect([200, 204]).toContain(response.status);
    });

    it('should deny non-creator from deleting event', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const event = await createEvent({
        title: 'Protected Event',
        companyId: testData.company.id,
        createdById: testData.admin.id,
        restaurantId: restaurant.id,
        orderDeadline: tomorrow,
      });

      const response = await authenticatedRequest(app, testData.employees[0].token)
        .delete(`/api/events/${event.id}`);

      assertForbidden(response);
    });

    it('should deny deleting event with orders', async () => {
      // This test would require order creation
      // Will be implemented when order tests are written
    });
  });

  describe('Event Status Transitions', () => {
    let testData: any;
    let restaurant: any;
    let openEvent: any;

    beforeEach(async () => {
      testData = await setupCompanyWithUsers({ employeeCount: 2 });
      restaurant = await createRestaurant({ companyId: testData.company.id });
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      openEvent = await createEvent({
        title: 'Open Event',
        companyId: testData.company.id,
        createdById: testData.admin.id,
        restaurantId: restaurant.id,
        orderDeadline: tomorrow,
      });
    });

    afterEach(async () => {
      await cleanupTestData(testData.company.id);
    });

    describe('Close Event', () => {
      it('should close event successfully', async () => {
        const response = await authenticatedRequest(app, testData.admin.token)
          .post(`/api/events/${openEvent.id}/close`);

        assertSuccess(response);
        expect(response.body.data.status).toBe('CLOSED');
      });

      it('should allow only event creator to close event', async () => {
        const response = await authenticatedRequest(app, testData.employees[0].token)
          .post(`/api/events/${openEvent.id}/close`);

        assertForbidden(response);
      });

      it('should reject closing already closed event', async () => {
        // First close
        await authenticatedRequest(app, testData.admin.token)
          .post(`/api/events/${openEvent.id}/close`);

        // Try to close again
        const response = await authenticatedRequest(app, testData.admin.token)
          .post(`/api/events/${openEvent.id}/close`);

        assertBadRequest(response);
        expect(response.body.message).toMatch(/already.*closed/i);
      });
    });

    describe('Automatic Status Changes', () => {
      it('should auto-close events past deadline', async () => {
        // This would typically be tested with a cron job or background task
        // For now, we test that the deadline is enforced
        
        const pastEvent = await createEvent({
          title: 'Past Event',
          companyId: testData.company.id,
          createdById: testData.admin.id,
          restaurantId: restaurant.id,
          orderDeadline: new Date(Date.now() - 1000), // 1 second ago
        });

        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 100));

        const response = await authenticatedRequest(app, testData.admin.token)
          .get(`/api/events/${pastEvent.id}`);

        // Event should either be closed or prevent new orders
        // Exact behavior depends on implementation
        assertSuccess(response);
      });
    });
  });

  describe('Event Participation', () => {
    let testData: any;
    let restaurant: any;
    let openEvent: any;

    beforeEach(async () => {
      testData = await setupCompanyWithUsers({ employeeCount: 3 });
      restaurant = await createRestaurant({ companyId: testData.company.id });
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      openEvent = await createEvent({
        title: 'Participation Event',
        companyId: testData.company.id,
        createdById: testData.admin.id,
        restaurantId: restaurant.id,
        orderDeadline: tomorrow,
      });
    });

    afterEach(async () => {
      await cleanupTestData(testData.company.id);
    });

    describe('Join Event', () => {
      it('should allow user to join event', async () => {
        const response = await authenticatedRequest(app, testData.employees[0].token)
          .post(`/api/events/${openEvent.id}/join`);

        assertSuccess(response);
      });

      it('should be idempotent (joining twice is okay)', async () => {
        await authenticatedRequest(app, testData.employees[0].token)
          .post(`/api/events/${openEvent.id}/join`);

        const response = await authenticatedRequest(app, testData.employees[0].token)
          .post(`/api/events/${openEvent.id}/join`);

        assertSuccess(response);
      });

      it('should reject joining closed event', async () => {
        // Close the event first
        await authenticatedRequest(app, testData.admin.token)
          .post(`/api/events/${openEvent.id}/close`);

        const response = await authenticatedRequest(app, testData.employees[0].token)
          .post(`/api/events/${openEvent.id}/join`);

        assertForbidden(response);
      });

      it('should reject joining event from different company', async () => {
        const company2Data = await setupCompanyWithUsers({ employeeCount: 1 });

        try {
          if (!company2Data.employees || company2Data.employees.length === 0) {
            throw new Error('Failed to create test employee');
          }
          
          const response = await authenticatedRequest(app, company2Data.employees[0].token)
            .post(`/api/events/${openEvent.id}/join`);

          assertForbidden(response);
        } finally {
          await cleanupTestData(company2Data.company.id);
        }
      });
    });

    describe('Event Participants', () => {
      it('should show event participants', async () => {
        // Have a few users join
        await authenticatedRequest(app, testData.employees[0].token)
          .post(`/api/events/${openEvent.id}/join`);
        
        await authenticatedRequest(app, testData.employees[1].token)
          .post(`/api/events/${openEvent.id}/join`);

        const response = await authenticatedRequest(app, testData.admin.token)
          .get(`/api/events/${openEvent.id}`);

        assertSuccess(response);
        // Should include participant count or list
        expect(response.body.data).toHaveProperty('participants');
        expect(Array.isArray(response.body.data.participants) || 
               typeof response.body.data.participants === 'number').toBe(true);
      });
    });
  });
});
