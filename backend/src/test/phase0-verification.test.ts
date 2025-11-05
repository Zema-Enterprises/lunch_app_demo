/**
 * Phase 0 Verification Tests
 * 
 * These tests verify that the test infrastructure is working correctly.
 */

import { setupCompanyWithUsers } from './helpers/auth.helper';
import { cleanupTestData, isDatabaseConnected, getDatabaseStats } from './helpers/db.helper';
import { createUser, createAdmin, createEmployee } from './factories/user.factory';
import { createEvent, createOpenEvent } from './factories/event.factory';
import { createRestaurant, createRestaurantWithMenu } from './factories/restaurant.factory';
import { createOrder } from './factories/order.factory';
import { getTestCompany, getAllTestCompanies } from './fixtures/companies';
import { getTestUser, getAllTestUsers } from './fixtures/users';
import { getTestRestaurant, getAllTestRestaurants } from './fixtures/restaurants';

describe('Phase 0: Test Infrastructure Verification', () => {
  describe('Database Connection', () => {
    it('should connect to database', async () => {
      const isConnected = await isDatabaseConnected();
      expect(isConnected).toBe(true);
    });

    it('should get database stats', async () => {
      const stats = await getDatabaseStats();
      expect(stats).toHaveProperty('users');
      expect(stats).toHaveProperty('companies');
      expect(stats).toHaveProperty('events');
      expect(stats).toHaveProperty('orders');
      expect(stats).toHaveProperty('restaurants');
      expect(typeof stats.users).toBe('number');
    });
  });

  describe('User Factory', () => {
    let testData: any;

    beforeAll(async () => {
      testData = await setupCompanyWithUsers({ employeeCount: 2 });
    });

    afterAll(async () => {
      await cleanupTestData(testData.company.id);
    });

    it('should create a user with factory', async () => {
      const user = await createUser({
        email: 'factory-test@example.com',
        companyId: testData.company.id,
      });

      expect(user).toHaveProperty('id');
      expect(user.email).toBe('factory-test@example.com');
      expect(user).toHaveProperty('plainPassword');
    });

    it('should create an admin user', async () => {
      const admin = await createAdmin(testData.company.id);

      expect(admin.role).toBe('ADMIN');
      expect(admin.companyId).toBe(testData.company.id);
    });

    it('should create an employee user', async () => {
      const employee = await createEmployee(testData.company.id);

      expect(employee.role).toBe('USER'); // Employees have USER role
      expect(employee.companyId).toBe(testData.company.id);
    });
  });

  describe('Event Factory', () => {
    let testData: any;
    let restaurant: any;

    beforeAll(async () => {
      testData = await setupCompanyWithUsers({ employeeCount: 1 });
      restaurant = await createRestaurant({
        name: 'Test Restaurant',
        companyId: testData.company.id,
      });
    });

    afterAll(async () => {
      await cleanupTestData(testData.company.id);
    });

    it('should create an event', async () => {
      const event = await createEvent({
        title: 'Factory Test Event',
        companyId: testData.company.id,
        createdById: testData.admin.id,
        restaurantId: restaurant.id,
      });

      expect(event).toHaveProperty('id');
      expect(event.title).toBe('Factory Test Event');
      expect(event.status).toBe('OPEN');
    });

    it('should create an open event', async () => {
      const event = await createOpenEvent({
        companyId: testData.company.id,
        createdById: testData.admin.id,
        restaurantId: restaurant.id,
      });

      expect(event.status).toBe('OPEN');
      expect(new Date(event.orderDeadline).getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Restaurant Factory', () => {
    let testData: any;

    beforeAll(async () => {
      testData = await setupCompanyWithUsers({ employeeCount: 1 });
    });

    afterAll(async () => {
      await cleanupTestData(testData.company.id);
    });

    it('should create a restaurant', async () => {
      const restaurant = await createRestaurant({
        name: 'Factory Test Restaurant',
        companyId: testData.company.id,
      });

      expect(restaurant).toHaveProperty('id');
      expect(restaurant.name).toBe('Factory Test Restaurant');
    });

    it('should create a restaurant with menu', async () => {
      const restaurant = await createRestaurantWithMenu(
        {
          name: 'Restaurant with Menu',
          companyId: testData.company.id,
        },
        5
      );

      expect(restaurant).toHaveProperty('id');
      expect(restaurant.menuItems).toHaveLength(5);
      restaurant.menuItems!.forEach((item) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('price');
      });
    });
  });

  describe('Order Factory', () => {
    let testData: any;
    let restaurant: any;
    let event: any;

    beforeAll(async () => {
      testData = await setupCompanyWithUsers({ employeeCount: 1 });
      restaurant = await createRestaurantWithMenu(
        { companyId: testData.company.id },
        3
      );
      event = await createEvent({
        companyId: testData.company.id,
        createdById: testData.admin.id,
        restaurantId: restaurant.id,
      });
    });

    afterAll(async () => {
      await cleanupTestData(testData.company.id);
    });

    it('should create an order with items', async () => {
      const order = await createOrder(
        {
          userId: testData.employees[0].id,
          eventId: event.id,
        },
        [
          {
            menuItemId: restaurant.menuItems[0].id,
            quantity: 2,
            price: restaurant.menuItems[0].price,
          },
          {
            menuItemId: restaurant.menuItems[1].id,
            quantity: 1,
            price: restaurant.menuItems[1].price,
          },
        ]
      );

      expect(order).toBeTruthy();
      expect(order).toHaveProperty('id');
      if (order) {
        expect(order.userId).toBe(testData.employees[0].id);
        expect(order.eventId).toBe(event.id);
        expect(order.totalAmount).toBeGreaterThan(0);
      }
    });
  });

  describe('Fixtures', () => {
    it('should provide test companies', () => {
      const company = getTestCompany('acmeCorp');
      expect(company).toHaveProperty('name');
      expect(company.name).toBe('Acme Corporation');

      const allCompanies = getAllTestCompanies();
      expect(allCompanies.length).toBeGreaterThan(0);
    });

    it('should provide test users', () => {
      const user = getTestUser('admin');
      expect(user).toHaveProperty('email');
      expect(user.role).toBe('ADMIN');

      const allUsers = getAllTestUsers();
      expect(allUsers.length).toBeGreaterThan(0);
    });

    it('should provide test restaurants', () => {
      const restaurant = getTestRestaurant('italianBistro');
      expect(restaurant).toHaveProperty('name');
      expect(restaurant).toHaveProperty('menu');

      const allRestaurants = getAllTestRestaurants();
      expect(allRestaurants.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication Helper', () => {
    let testData: any;

    beforeAll(async () => {
      testData = await setupCompanyWithUsers({ employeeCount: 3 });
    });

    afterAll(async () => {
      await cleanupTestData(testData.company.id);
    });

    it('should setup company with admin and employees', () => {
      expect(testData).toHaveProperty('company');
      expect(testData).toHaveProperty('admin');
      expect(testData).toHaveProperty('employees');

      expect(testData.company).toHaveProperty('id');
      expect(testData.admin.role).toBe('ADMIN');
      expect(testData.employees).toHaveLength(3);
      testData.employees.forEach((employee: any) => {
        expect(employee.role).toBe('USER'); // Employees have USER role
        expect(employee).toHaveProperty('token');
      });
    });

    it('should provide valid tokens', () => {
      expect(testData.admin.token).toBeTruthy();
      expect(typeof testData.admin.token).toBe('string');

      testData.employees.forEach((employee: any) => {
        expect(employee.token).toBeTruthy();
        expect(typeof employee.token).toBe('string');
      });
    });
  });
});
