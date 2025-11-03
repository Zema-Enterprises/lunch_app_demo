"use strict";
/**
 * Phase 0 Verification Tests
 *
 * These tests verify that the test infrastructure is working correctly.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const auth_helper_1 = require("./helpers/auth.helper");
const db_helper_1 = require("./helpers/db.helper");
const user_factory_1 = require("./factories/user.factory");
const event_factory_1 = require("./factories/event.factory");
const restaurant_factory_1 = require("./factories/restaurant.factory");
const order_factory_1 = require("./factories/order.factory");
const companies_1 = require("./fixtures/companies");
const users_1 = require("./fixtures/users");
const restaurants_1 = require("./fixtures/restaurants");
describe('Phase 0: Test Infrastructure Verification', () => {
    describe('Database Connection', () => {
        it('should connect to database', async () => {
            const isConnected = await (0, db_helper_1.isDatabaseConnected)();
            expect(isConnected).toBe(true);
        });
        it('should get database stats', async () => {
            const stats = await (0, db_helper_1.getDatabaseStats)();
            expect(stats).toHaveProperty('users');
            expect(stats).toHaveProperty('companies');
            expect(stats).toHaveProperty('events');
            expect(stats).toHaveProperty('orders');
            expect(stats).toHaveProperty('restaurants');
            expect(typeof stats.users).toBe('number');
        });
    });
    describe('User Factory', () => {
        let testData;
        beforeAll(async () => {
            testData = await (0, auth_helper_1.setupCompanyWithUsers)({ employeeCount: 2 });
        });
        afterAll(async () => {
            await (0, db_helper_1.cleanupTestData)(testData.company.id);
        });
        it('should create a user with factory', async () => {
            const user = await (0, user_factory_1.createUser)({
                email: 'factory-test@example.com',
                companyId: testData.company.id,
            });
            expect(user).toHaveProperty('id');
            expect(user.email).toBe('factory-test@example.com');
            expect(user).toHaveProperty('plainPassword');
        });
        it('should create an admin user', async () => {
            const admin = await (0, user_factory_1.createAdmin)(testData.company.id);
            expect(admin.role).toBe('ADMIN');
            expect(admin.companyId).toBe(testData.company.id);
        });
        it('should create an employee user', async () => {
            const employee = await (0, user_factory_1.createEmployee)(testData.company.id);
            expect(employee.role).toBe('EMPLOYEE');
            expect(employee.companyId).toBe(testData.company.id);
        });
    });
    describe('Event Factory', () => {
        let testData;
        let restaurant;
        beforeAll(async () => {
            testData = await (0, auth_helper_1.setupCompanyWithUsers)({ employeeCount: 1 });
            restaurant = await (0, restaurant_factory_1.createRestaurant)({
                name: 'Test Restaurant',
                companyId: testData.company.id,
            });
        });
        afterAll(async () => {
            await (0, db_helper_1.cleanupTestData)(testData.company.id);
        });
        it('should create an event', async () => {
            const event = await (0, event_factory_1.createEvent)({
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
            const event = await (0, event_factory_1.createOpenEvent)({
                companyId: testData.company.id,
                createdById: testData.admin.id,
                restaurantId: restaurant.id,
            });
            expect(event.status).toBe('OPEN');
            expect(new Date(event.orderDeadline).getTime()).toBeGreaterThan(Date.now());
        });
    });
    describe('Restaurant Factory', () => {
        let testData;
        beforeAll(async () => {
            testData = await (0, auth_helper_1.setupCompanyWithUsers)({ employeeCount: 1 });
        });
        afterAll(async () => {
            await (0, db_helper_1.cleanupTestData)(testData.company.id);
        });
        it('should create a restaurant', async () => {
            const restaurant = await (0, restaurant_factory_1.createRestaurant)({
                name: 'Factory Test Restaurant',
                companyId: testData.company.id,
            });
            expect(restaurant).toHaveProperty('id');
            expect(restaurant.name).toBe('Factory Test Restaurant');
        });
        it('should create a restaurant with menu', async () => {
            const restaurant = await (0, restaurant_factory_1.createRestaurantWithMenu)({
                name: 'Restaurant with Menu',
                companyId: testData.company.id,
            }, 5);
            expect(restaurant).toHaveProperty('id');
            expect(restaurant.menuItems).toHaveLength(5);
            restaurant.menuItems.forEach((item) => {
                expect(item).toHaveProperty('id');
                expect(item).toHaveProperty('name');
                expect(item).toHaveProperty('price');
            });
        });
    });
    describe('Order Factory', () => {
        let testData;
        let restaurant;
        let event;
        beforeAll(async () => {
            testData = await (0, auth_helper_1.setupCompanyWithUsers)({ employeeCount: 1 });
            restaurant = await (0, restaurant_factory_1.createRestaurantWithMenu)({ companyId: testData.company.id }, 3);
            event = await (0, event_factory_1.createEvent)({
                companyId: testData.company.id,
                createdById: testData.admin.id,
                restaurantId: restaurant.id,
            });
        });
        afterAll(async () => {
            await (0, db_helper_1.cleanupTestData)(testData.company.id);
        });
        it('should create an order with items', async () => {
            const order = await (0, order_factory_1.createOrder)({
                userId: testData.employees[0].id,
                eventId: event.id,
            }, [
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
            ]);
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
            const company = (0, companies_1.getTestCompany)('acmeCorp');
            expect(company).toHaveProperty('name');
            expect(company.name).toBe('Acme Corporation');
            const allCompanies = (0, companies_1.getAllTestCompanies)();
            expect(allCompanies.length).toBeGreaterThan(0);
        });
        it('should provide test users', () => {
            const user = (0, users_1.getTestUser)('admin');
            expect(user).toHaveProperty('email');
            expect(user.role).toBe('ADMIN');
            const allUsers = (0, users_1.getAllTestUsers)();
            expect(allUsers.length).toBeGreaterThan(0);
        });
        it('should provide test restaurants', () => {
            const restaurant = (0, restaurants_1.getTestRestaurant)('italianBistro');
            expect(restaurant).toHaveProperty('name');
            expect(restaurant).toHaveProperty('menu');
            const allRestaurants = (0, restaurants_1.getAllTestRestaurants)();
            expect(allRestaurants.length).toBeGreaterThan(0);
        });
    });
    describe('Authentication Helper', () => {
        let testData;
        beforeAll(async () => {
            testData = await (0, auth_helper_1.setupCompanyWithUsers)({ employeeCount: 3 });
        });
        afterAll(async () => {
            await (0, db_helper_1.cleanupTestData)(testData.company.id);
        });
        it('should setup company with admin and employees', () => {
            expect(testData).toHaveProperty('company');
            expect(testData).toHaveProperty('admin');
            expect(testData).toHaveProperty('employees');
            expect(testData.company).toHaveProperty('id');
            expect(testData.admin.role).toBe('ADMIN');
            expect(testData.employees).toHaveLength(3);
            testData.employees.forEach((employee) => {
                expect(employee.role).toBe('EMPLOYEE');
                expect(employee).toHaveProperty('token');
            });
        });
        it('should provide valid tokens', () => {
            expect(testData.admin.token).toBeTruthy();
            expect(typeof testData.admin.token).toBe('string');
            testData.employees.forEach((employee) => {
                expect(employee.token).toBeTruthy();
                expect(typeof employee.token).toBe('string');
            });
        });
    });
});
