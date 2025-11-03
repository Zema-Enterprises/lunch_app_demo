/**
 * Phase 0 Verification Tests - Frontend
 * 
 * These tests verify that the frontend test infrastructure is working correctly.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createUser, createAdmin, createUsers, resetUserCounter } from './factories/user';
import { createEvent, createOpenEvent, createClosedEvent, createPastEvent, resetEventCounter } from './factories/event';
import { createOrder, createConfirmedOrder, createCustomOrder, resetOrderCounter } from './factories/order';
import { createRestaurant, createRestaurantWithMenu, createMenuItem, resetRestaurantCounter } from './factories/restaurant';
import { createPaginatedResponse, createApiError, createAuthResponse, mockResponses, apiErrors } from './fixtures/api-responses';

describe('Phase 0: Frontend Test Infrastructure Verification', () => {
  afterEach(() => {
    resetUserCounter();
    resetEventCounter();
    resetOrderCounter();
    resetRestaurantCounter();
  });

  describe('User Factory', () => {
    it('should create a user', () => {
      const user = createUser({ name: 'John Doe' });

      expect(user).toHaveProperty('id');
      expect(user.name).toBe('John Doe');
      expect(user.email).toContain('@example.com');
    });

    it('should create an admin user', () => {
      const admin = createAdmin();

      expect(admin.role).toBe('ADMIN');
    });

    it('should create multiple users', () => {
      const users = createUsers(5);

      expect(users).toHaveLength(5);
      users.forEach((user) => {
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
      });
    });

    it('should create unique users with counter', () => {
      const user1 = createUser();
      const user2 = createUser();

      expect(user1.id).not.toBe(user2.id);
      expect(user1.email).not.toBe(user2.email);
    });

    it('should reset counter', () => {
      createUser();
      createUser();
      resetUserCounter();

      const user = createUser();
      expect(user.id).toBe('user-1');
    });
  });

  describe('Event Factory', () => {
    it('should create an event', () => {
      const event = createEvent({ title: 'Team Lunch' });

      expect(event).toHaveProperty('id');
      expect(event.title).toBe('Team Lunch');
      expect(event).toHaveProperty('orderDeadline');
    });

    it('should create an open event', () => {
      const event = createOpenEvent();

      expect(event.status).toBe('OPEN');
      expect(new Date(event.orderDeadline).getTime()).toBeGreaterThan(Date.now());
    });

    it('should create a closed event', () => {
      const event = createClosedEvent();

      expect(event.status).toBe('CLOSED');
    });

    it('should create a past event', () => {
      const event = createPastEvent();

      expect(new Date(event.orderDeadline).getTime()).toBeLessThan(Date.now());
    });
  });

  describe('Order Factory', () => {
    it('should create an order', () => {
      const order = createOrder();

      expect(order).toHaveProperty('id');
      expect(order).toHaveProperty('userId');
      expect(order).toHaveProperty('eventId');
      expect(order).toHaveProperty('orderItems');
    });

    it('should create a confirmed order', () => {
      const order = createConfirmedOrder();

      expect(order.paymentConfirmed).toBe(true);
    });

    it('should create a custom order', () => {
      const order = createCustomOrder('Please bring me a burger');

      expect(order.customOrder).toBe('Please bring me a burger');
      expect(order.orderItems).toHaveLength(0);
    });

    it('should calculate total amount', () => {
      const order = createOrder();

      expect(order.totalAmount).toBeGreaterThan(0);
    });
  });

  describe('Restaurant Factory', () => {
    it('should create a restaurant', () => {
      const restaurant = createRestaurant({ name: 'Pizza Palace' });

      expect(restaurant).toHaveProperty('id');
      expect(restaurant.name).toBe('Pizza Palace');
    });

    it('should create a restaurant with menu', () => {
      const restaurant = createRestaurantWithMenu(10);

      expect(restaurant).toHaveProperty('menuItems');
      expect(restaurant.menuItems).toHaveLength(10);
      restaurant.menuItems?.forEach((item) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('price');
        expect(item.price).toBeGreaterThan(0);
      });
    });

    it('should create a menu item', () => {
      const menuItem = createMenuItem({ name: 'Margherita Pizza' });

      expect(menuItem.name).toBe('Margherita Pizza');
      expect(menuItem).toHaveProperty('price');
      expect(menuItem).toHaveProperty('category');
    });
  });

  describe('API Response Fixtures', () => {
    it('should create paginated response', () => {
      const users = createUsers(25);
      const response = createPaginatedResponse(users, 1, 10);

      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('pagination');
      expect(response.data).toHaveLength(10);
      expect(response.pagination.total).toBe(25);
      expect(response.pagination.totalPages).toBe(3);
    });

    it('should create API error', () => {
      const error = createApiError('Not found', 404);

      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
    });

    it('should create auth response', () => {
      const user = createUser();
      const response = createAuthResponse(user);

      expect(response).toHaveProperty('token');
      expect(response).toHaveProperty('user');
      expect(response.user.id).toBe(user.id);
    });

    it('should provide common error responses', () => {
      expect(apiErrors.unauthorized.statusCode).toBe(401);
      expect(apiErrors.forbidden.statusCode).toBe(403);
      expect(apiErrors.notFound.statusCode).toBe(404);
      expect(apiErrors.badRequest.statusCode).toBe(400);
    });

    it('should provide mock responses', () => {
      const users = createUsers(3);
      const userListResponse = mockResponses.users.list(users);

      expect(userListResponse).toHaveProperty('data');
      expect(userListResponse).toHaveProperty('pagination');

      const user = createUser();
      const userResponse = mockResponses.users.single(user);
      expect(userResponse.data).toBe(user);
    });
  });

  describe('Mock Responses', () => {
    it('should provide event mock responses', () => {
      const event = createEvent();
      
      const listResponse = mockResponses.events.list([event]);
      expect(listResponse.data).toHaveLength(1);

      const singleResponse = mockResponses.events.single(event);
      expect(singleResponse.data).toBe(event);

      const createdResponse = mockResponses.events.created(event);
      expect(createdResponse.data).toBe(event);
      expect(createdResponse.message).toContain('created');
    });

    it('should provide order mock responses', () => {
      const order = createOrder();
      
      const listResponse = mockResponses.orders.list([order]);
      expect(listResponse.data).toHaveLength(1);

      const confirmedResponse = mockResponses.orders.confirmed(order);
      expect(confirmedResponse.message).toContain('confirmed');
    });

    it('should provide restaurant mock responses', () => {
      const restaurant = createRestaurant();
      
      const listResponse = mockResponses.restaurants.list([restaurant]);
      expect(listResponse.data).toHaveLength(1);

      const singleResponse = mockResponses.restaurants.single(restaurant);
      expect(singleResponse.data).toBe(restaurant);
    });

    it('should provide auth mock responses', () => {
      const user = createUser();
      
      const loginResponse = mockResponses.auth.login(user);
      expect(loginResponse).toHaveProperty('token');
      expect(loginResponse.user).toBe(user);

      const profileResponse = mockResponses.auth.profile(user);
      expect(profileResponse.data).toBe(user);
    });
  });

  describe('Test Isolation', () => {
    it('should isolate user creation', () => {
      resetUserCounter();
      const user1 = createUser();
      
      resetUserCounter();
      const user2 = createUser();

      expect(user1.id).toBe(user2.id);
      expect(user1.email).toBe(user2.email);
    });

    it('should isolate event creation', () => {
      resetEventCounter();
      const event1 = createEvent();
      
      resetEventCounter();
      const event2 = createEvent();

      expect(event1.id).toBe(event2.id);
    });

    it('should isolate order creation', () => {
      resetOrderCounter();
      const order1 = createOrder();
      
      resetOrderCounter();
      const order2 = createOrder();

      expect(order1.id).toBe(order2.id);
    });
  });
});
