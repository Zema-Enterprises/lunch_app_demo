"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("../../app"));
const database_1 = __importDefault(require("../../config/database"));
const auth_helper_1 = require("../../test/helpers/auth.helper");
const db_helper_1 = require("../../test/helpers/db.helper");
const request_helper_1 = require("../../test/helpers/request.helper");
const event_factory_1 = require("../../test/factories/event.factory");
const restaurant_factory_1 = require("../../test/factories/restaurant.factory");
const menuItem_factory_1 = require("../../test/factories/menuItem.factory");
describe('Order Management Integration Tests', () => {
    let testData;
    let company2Data;
    beforeEach(async () => {
        testData = await (0, auth_helper_1.setupCompanyWithUsers)({ companyName: 'OrderTestCo', employeeCount: 1 });
        testData.employee = testData.employees[0]; // Add shorthand for first employee
        company2Data = await (0, auth_helper_1.setupCompanyWithUsers)({ companyName: 'Company2', employeeCount: 1 });
        company2Data.employee = company2Data.employees[0]; // Add shorthand for first employee
    });
    afterEach(async () => {
        await (0, db_helper_1.cleanupTestData)(testData.company.id);
        await (0, db_helper_1.cleanupTestData)(company2Data.company.id);
    });
    describe('Order Creation', () => {
        describe('Happy Path - Create Order', () => {
            it('should create order with menu items for an open event', async () => {
                // Create restaurant and menu items
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
                const menuItem1 = await (0, menuItem_factory_1.createMenuItem)(restaurant.id, { price: 10.50 });
                const menuItem2 = await (0, menuItem_factory_1.createMenuItem)(restaurant.id, { price: 5.00 });
                // Create event
                const event = await (0, event_factory_1.createEvent)({
                    companyId: testData.company.id,
                    createdById: testData.admin.id,
                    restaurantId: restaurant.id,
                    status: 'OPEN',
                });
                // Join event first
                await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/events/${event.id}/join`)
                    .expect(201);
                // Create order
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/orders/${event.id}/orders`)
                    .send({
                    orderItems: [
                        { menuItemId: menuItem1.id, quantity: 2, price: 10.50 },
                        { menuItemId: menuItem2.id, quantity: 1, price: 5.00 },
                    ],
                    totalAmount: 26.00,
                })
                    .expect(201);
                expect(response.body).toMatchObject({
                    data: {
                        userId: testData.employee.id,
                        eventId: event.id,
                        totalAmount: 26.00,
                        paymentConfirmed: false,
                        orderItems: expect.arrayContaining([
                            expect.objectContaining({
                                menuItemId: menuItem1.id,
                                quantity: 2,
                                price: 10.50,
                            }),
                            expect.objectContaining({
                                menuItemId: menuItem2.id,
                                quantity: 1,
                                price: 5.00,
                            }),
                        ]),
                    },
                });
            });
            it('should create custom order without menu items', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
                const event = await (0, event_factory_1.createEvent)({
                    companyId: testData.company.id,
                    createdById: testData.admin.id,
                    restaurantId: restaurant.id,
                    status: 'OPEN',
                });
                // Join event
                await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/events/${event.id}/join`)
                    .expect(201);
                // Create custom order
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/orders/${event.id}/orders`)
                    .send({
                    customOrder: 'Large pepperoni pizza with extra cheese',
                    totalAmount: 15.99,
                })
                    .expect(201);
                expect(response.body).toMatchObject({
                    data: {
                        customOrder: 'Large pepperoni pizza with extra cheese',
                        totalAmount: 15.99,
                        paymentConfirmed: false,
                        orderItems: [],
                    },
                });
            });
            it('should create order with both custom order and menu items', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
                const menuItem = await (0, menuItem_factory_1.createMenuItem)(restaurant.id, { price: 8.50 });
                const event = await (0, event_factory_1.createEvent)({
                    companyId: testData.company.id,
                    createdById: testData.admin.id,
                    restaurantId: restaurant.id,
                    status: 'OPEN',
                });
                await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/events/${event.id}/join`)
                    .expect(201);
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/orders/${event.id}/orders`)
                    .send({
                    customOrder: 'Extra spicy, please!',
                    orderItems: [{ menuItemId: menuItem.id, quantity: 1, price: 8.50 }],
                    totalAmount: 8.50,
                })
                    .expect(201);
                expect(response.body.data).toMatchObject({
                    customOrder: 'Extra spicy, please!',
                    totalAmount: 8.50,
                    orderItems: expect.arrayContaining([
                        expect.objectContaining({ menuItemId: menuItem.id }),
                    ]),
                });
            });
        });
        describe('Validation - Create Order', () => {
            it('should reject order with negative totalAmount', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
                const event = await (0, event_factory_1.createEvent)({
                    companyId: testData.company.id,
                    createdById: testData.admin.id,
                    restaurantId: restaurant.id,
                    status: 'OPEN',
                });
                await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/events/${event.id}/join`)
                    .expect(201);
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/orders/${event.id}/orders`)
                    .send({
                    customOrder: 'Test order',
                    totalAmount: -10.00,
                })
                    .expect(400);
                expect(response.body).toHaveProperty('message');
            });
            it('should reject order with invalid quantity (zero)', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
                const menuItem = await (0, menuItem_factory_1.createMenuItem)(restaurant.id);
                const event = await (0, event_factory_1.createEvent)({
                    companyId: testData.company.id,
                    createdById: testData.admin.id,
                    restaurantId: restaurant.id,
                    status: 'OPEN',
                });
                await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/events/${event.id}/join`)
                    .expect(201);
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/orders/${event.id}/orders`)
                    .send({
                    orderItems: [{ menuItemId: menuItem.id, quantity: 0, price: 10.00 }],
                    totalAmount: 0,
                })
                    .expect(400);
                expect(response.body).toHaveProperty('message');
            });
            it('should reject order with invalid quantity (negative)', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
                const menuItem = await (0, menuItem_factory_1.createMenuItem)(restaurant.id);
                const event = await (0, event_factory_1.createEvent)({
                    companyId: testData.company.id,
                    createdById: testData.admin.id,
                    restaurantId: restaurant.id,
                    status: 'OPEN',
                });
                await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/events/${event.id}/join`)
                    .expect(201);
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/orders/${event.id}/orders`)
                    .send({
                    orderItems: [{ menuItemId: menuItem.id, quantity: -5, price: 10.00 }],
                })
                    .expect(400);
                expect(response.body).toHaveProperty('message');
            });
            it('should reject order with negative price in order items', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
                const menuItem = await (0, menuItem_factory_1.createMenuItem)(restaurant.id);
                const event = await (0, event_factory_1.createEvent)({
                    companyId: testData.company.id,
                    createdById: testData.admin.id,
                    restaurantId: restaurant.id,
                    status: 'OPEN',
                });
                await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/events/${event.id}/join`)
                    .expect(201);
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/orders/${event.id}/orders`)
                    .send({
                    orderItems: [{ menuItemId: menuItem.id, quantity: 1, price: -10.00 }],
                })
                    .expect(400);
                expect(response.body).toHaveProperty('message');
            });
        });
        describe('Authorization - Create Order', () => {
            it('should reject order if user has not joined the event', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
                const event = await (0, event_factory_1.createEvent)({
                    companyId: testData.company.id,
                    createdById: testData.admin.id,
                    restaurantId: restaurant.id,
                    status: 'OPEN',
                });
                // Try to create order without joining event
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/orders/${event.id}/orders`)
                    .send({
                    customOrder: 'Test order',
                    totalAmount: 10.00,
                })
                    .expect(403);
                expect(response.body).toHaveProperty('message', 'Must join event before placing order');
            });
            it('should reject order if event is from different company', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: company2Data.company.id });
                const event = await (0, event_factory_1.createEvent)({
                    companyId: company2Data.company.id,
                    createdById: company2Data.admin.id,
                    restaurantId: restaurant.id,
                    status: 'OPEN',
                });
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/orders/${event.id}/orders`)
                    .send({
                    customOrder: 'Test order',
                    totalAmount: 10.00,
                })
                    .expect(404);
                expect(response.body).toHaveProperty('message', 'Event not found');
            });
            it('should reject order if event is closed', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
                const event = await (0, event_factory_1.createEvent)({
                    companyId: testData.company.id,
                    createdById: testData.admin.id,
                    restaurantId: restaurant.id,
                    status: 'OPEN',
                });
                // Join event while it's open
                await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/events/${event.id}/join`)
                    .expect(201);
                // Close the event
                await database_1.default.event.update({
                    where: { id: event.id },
                    data: { status: 'CLOSED' },
                });
                // Try to create order after event is closed
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/orders/${event.id}/orders`)
                    .send({
                    customOrder: 'Test order',
                    totalAmount: 10.00,
                })
                    .expect(400);
                expect(response.body).toHaveProperty('message', 'Event is closed for orders');
            });
            it('should reject order with non-existent menu item', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
                const event = await (0, event_factory_1.createEvent)({
                    companyId: testData.company.id,
                    createdById: testData.admin.id,
                    restaurantId: restaurant.id,
                    status: 'OPEN',
                });
                await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/events/${event.id}/join`)
                    .expect(201);
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/orders/${event.id}/orders`)
                    .send({
                    orderItems: [{ menuItemId: 'non-existent-id', quantity: 1, price: 10.00 }],
                    totalAmount: 10.00,
                })
                    .expect(404);
                expect(response.body).toHaveProperty('message');
            });
        });
    });
    describe('Order Retrieval', () => {
        describe('Get Event Orders', () => {
            it('should get all orders for an event', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
                const menuItem = await (0, menuItem_factory_1.createMenuItem)(restaurant.id);
                const event = await (0, event_factory_1.createEvent)({
                    companyId: testData.company.id,
                    createdById: testData.admin.id,
                    restaurantId: restaurant.id,
                    status: 'OPEN',
                });
                // Two users join and create orders
                await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.admin.token)
                    .post(`/api/events/${event.id}/join`)
                    .expect(201);
                await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/events/${event.id}/join`)
                    .expect(201);
                await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.admin.token)
                    .post(`/api/orders/${event.id}/orders`)
                    .send({
                    customOrder: 'Admin order',
                    totalAmount: 20.00,
                })
                    .expect(201);
                await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/orders/${event.id}/orders`)
                    .send({
                    orderItems: [{ menuItemId: menuItem.id, quantity: 1, price: 10.00 }],
                    totalAmount: 10.00,
                })
                    .expect(201);
                // Get all orders for event
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.admin.token)
                    .get(`/api/orders/${event.id}/orders`)
                    .expect(200);
                expect(response.body).toEqual({
                    data: expect.arrayContaining([
                        expect.objectContaining({
                            userId: testData.admin.id,
                            customOrder: 'Admin order',
                        }),
                        expect.objectContaining({
                            userId: testData.employee.id,
                            totalAmount: 10.00,
                        }),
                    ]),
                });
                expect(response.body.data).toHaveLength(2);
            });
            it('should return empty array if event has no orders', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
                const event = await (0, event_factory_1.createEvent)({
                    companyId: testData.company.id,
                    createdById: testData.admin.id,
                    restaurantId: restaurant.id,
                    status: 'OPEN',
                });
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.admin.token)
                    .get(`/api/orders/${event.id}/orders`)
                    .expect(200);
                expect(response.body).toEqual({ data: [] });
            });
            it('should reject getting orders for event from different company', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: company2Data.company.id });
                const event = await (0, event_factory_1.createEvent)({
                    companyId: company2Data.company.id,
                    createdById: company2Data.admin.id,
                    restaurantId: restaurant.id,
                    status: 'OPEN',
                });
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.admin.token)
                    .get(`/api/orders/${event.id}/orders`)
                    .expect(404);
                expect(response.body).toHaveProperty('message', 'Event not found');
            });
        });
        describe('Get User Orders', () => {
            it('should get all orders for current user across all events', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
                const menuItem = await (0, menuItem_factory_1.createMenuItem)(restaurant.id);
                const event1 = await (0, event_factory_1.createEvent)({
                    companyId: testData.company.id,
                    createdById: testData.admin.id,
                    restaurantId: restaurant.id,
                    status: 'OPEN',
                });
                const event2 = await (0, event_factory_1.createEvent)({
                    companyId: testData.company.id,
                    createdById: testData.admin.id,
                    restaurantId: restaurant.id,
                    status: 'OPEN',
                });
                // Join both events and create orders
                await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/events/${event1.id}/join`)
                    .expect(201);
                await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/events/${event2.id}/join`)
                    .expect(201);
                await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/orders/${event1.id}/orders`)
                    .send({ customOrder: 'Order 1', totalAmount: 10.00 })
                    .expect(201);
                await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/orders/${event2.id}/orders`)
                    .send({ customOrder: 'Order 2', totalAmount: 15.00 })
                    .expect(201);
                // Get all user orders
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .get('/api/orders/me')
                    .expect(200);
                expect(response.body).toEqual({
                    data: expect.arrayContaining([
                        expect.objectContaining({ customOrder: 'Order 1', eventId: event1.id }),
                        expect.objectContaining({ customOrder: 'Order 2', eventId: event2.id }),
                    ]),
                });
                expect(response.body.data).toHaveLength(2);
            });
            it('should return empty array if user has no orders', async () => {
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .get('/api/orders/me')
                    .expect(200);
                expect(response.body).toEqual({ data: [] });
            });
            it('should include event and restaurant information', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
                const event = await (0, event_factory_1.createEvent)({
                    companyId: testData.company.id,
                    createdById: testData.admin.id,
                    restaurantId: restaurant.id,
                    status: 'OPEN',
                });
                await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/events/${event.id}/join`)
                    .expect(201);
                await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/orders/${event.id}/orders`)
                    .send({ customOrder: 'Test order', totalAmount: 10.00 })
                    .expect(201);
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .get('/api/orders/me')
                    .expect(200);
                expect(response.body.data[0]).toMatchObject({
                    event: expect.objectContaining({
                        id: event.id,
                        restaurant: expect.objectContaining({
                            id: restaurant.id,
                            name: restaurant.name,
                        }),
                    }),
                });
            });
        });
    });
    describe('Order Updates', () => {
        describe('Update Existing Order', () => {
            it('should update order with new items (replaces old items)', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
                const menuItem1 = await (0, menuItem_factory_1.createMenuItem)(restaurant.id, { price: 10.00 });
                const menuItem2 = await (0, menuItem_factory_1.createMenuItem)(restaurant.id, { price: 15.00 });
                const event = await (0, event_factory_1.createEvent)({
                    companyId: testData.company.id,
                    createdById: testData.admin.id,
                    restaurantId: restaurant.id,
                    status: 'OPEN',
                });
                await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/events/${event.id}/join`)
                    .expect(201);
                // Create initial order
                await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/orders/${event.id}/orders`)
                    .send({
                    orderItems: [{ menuItemId: menuItem1.id, quantity: 1, price: 10.00 }],
                    totalAmount: 10.00,
                })
                    .expect(201);
                // Update order with different items
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/orders/${event.id}/orders`)
                    .send({
                    orderItems: [{ menuItemId: menuItem2.id, quantity: 2, price: 15.00 }],
                    totalAmount: 30.00,
                })
                    .expect(200);
                expect(response.body.data).toMatchObject({
                    totalAmount: 30.00,
                    orderItems: [
                        expect.objectContaining({
                            menuItemId: menuItem2.id,
                            quantity: 2,
                        }),
                    ],
                });
                expect(response.body.data.orderItems).toHaveLength(1);
            });
            it('should update custom order text', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
                const event = await (0, event_factory_1.createEvent)({
                    companyId: testData.company.id,
                    createdById: testData.admin.id,
                    restaurantId: restaurant.id,
                    status: 'OPEN',
                });
                await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/events/${event.id}/join`)
                    .expect(201);
                // Create initial order
                await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/orders/${event.id}/orders`)
                    .send({ customOrder: 'Original order', totalAmount: 10.00 })
                    .expect(201);
                // Update order
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/orders/${event.id}/orders`)
                    .send({ customOrder: 'Updated order', totalAmount: 15.00 })
                    .expect(200);
                expect(response.body.data).toMatchObject({
                    customOrder: 'Updated order',
                    totalAmount: 15.00,
                });
            });
            it('should maintain one order per user per event (idempotency)', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
                const event = await (0, event_factory_1.createEvent)({
                    companyId: testData.company.id,
                    createdById: testData.admin.id,
                    restaurantId: restaurant.id,
                    status: 'OPEN',
                });
                await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/events/${event.id}/join`)
                    .expect(201);
                // Create order
                const firstOrder = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/orders/${event.id}/orders`)
                    .send({ customOrder: 'First order', totalAmount: 10.00 })
                    .expect(201);
                // Create/update order again
                const secondOrder = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                    .post(`/api/orders/${event.id}/orders`)
                    .send({ customOrder: 'Second order', totalAmount: 20.00 })
                    .expect(200);
                // Should have same ID (updated, not created new)
                expect(secondOrder.body.data.id).toBe(firstOrder.body.data.id);
                // Verify only one order exists
                const orders = await database_1.default.order.findMany({
                    where: { eventId: event.id, userId: testData.employee.id },
                });
                expect(orders).toHaveLength(1);
            });
        });
    });
    describe('Order Deletion', () => {
        it('should delete own order from open event', async () => {
            const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
            const event = await (0, event_factory_1.createEvent)({
                companyId: testData.company.id,
                createdById: testData.admin.id,
                restaurantId: restaurant.id,
                status: 'OPEN',
            });
            await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                .post(`/api/events/${event.id}/join`)
                .expect(201);
            const orderResponse = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                .post(`/api/orders/${event.id}/orders`)
                .send({ customOrder: 'Test order', totalAmount: 10.00 })
                .expect(201);
            const orderId = orderResponse.body.data.id;
            // Delete order
            const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                .delete(`/api/orders/${event.id}/orders/${orderId}`)
                .expect(200);
            expect(response.body).toHaveProperty('message', 'Order deleted successfully');
            // Verify deleted
            const deletedOrder = await database_1.default.order.findUnique({ where: { id: orderId } });
            expect(deletedOrder).toBeNull();
        });
        it('should reject deleting order from closed event', async () => {
            const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
            const event = await (0, event_factory_1.createEvent)({
                companyId: testData.company.id,
                createdById: testData.admin.id,
                restaurantId: restaurant.id,
                status: 'OPEN',
            });
            await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                .post(`/api/events/${event.id}/join`)
                .expect(201);
            const orderResponse = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                .post(`/api/orders/${event.id}/orders`)
                .send({ customOrder: 'Test order', totalAmount: 10.00 })
                .expect(201);
            // Close event
            await database_1.default.event.update({
                where: { id: event.id },
                data: { status: 'CLOSED' },
            });
            const orderId = orderResponse.body.data.id;
            const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                .delete(`/api/orders/${event.id}/orders/${orderId}`)
                .expect(400);
            expect(response.body).toHaveProperty('message', 'Cannot delete order - event is closed');
        });
        it('should reject deleting another user\'s order', async () => {
            const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
            const event = await (0, event_factory_1.createEvent)({
                companyId: testData.company.id,
                createdById: testData.admin.id,
                restaurantId: restaurant.id,
                status: 'OPEN',
            });
            await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.admin.token)
                .post(`/api/events/${event.id}/join`)
                .expect(201);
            const orderResponse = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.admin.token)
                .post(`/api/orders/${event.id}/orders`)
                .send({ customOrder: 'Admin order', totalAmount: 10.00 })
                .expect(201);
            const orderId = orderResponse.body.data.id;
            // Employee tries to delete admin's order
            const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                .delete(`/api/orders/${event.id}/orders/${orderId}`)
                .expect(404);
            expect(response.body).toHaveProperty('message', 'Order not found');
        });
        it('should reject deleting non-existent order', async () => {
            const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
            const event = await (0, event_factory_1.createEvent)({
                companyId: testData.company.id,
                createdById: testData.admin.id,
                restaurantId: restaurant.id,
                status: 'OPEN',
            });
            const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                .delete(`/api/orders/${event.id}/orders/non-existent-id`)
                .expect(404);
            expect(response.body).toHaveProperty('message', 'Order not found');
        });
    });
    describe('Payment Confirmation', () => {
        it('should confirm payment for own order', async () => {
            const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
            const event = await (0, event_factory_1.createEvent)({
                companyId: testData.company.id,
                createdById: testData.admin.id,
                restaurantId: restaurant.id,
                status: 'OPEN',
            });
            await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                .post(`/api/events/${event.id}/join`)
                .expect(201);
            const orderResponse = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                .post(`/api/orders/${event.id}/orders`)
                .send({ customOrder: 'Test order', totalAmount: 10.00 })
                .expect(201);
            const orderId = orderResponse.body.data.id;
            // Confirm payment
            const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                .patch(`/api/orders/${event.id}/orders/${orderId}/payment`)
                .expect(200);
            expect(response.body).toMatchObject({
                data: {
                    id: orderId,
                    paymentConfirmed: true,
                },
            });
        });
        it('should reject confirming payment for non-existent order', async () => {
            const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
            const event = await (0, event_factory_1.createEvent)({
                companyId: testData.company.id,
                createdById: testData.admin.id,
                restaurantId: restaurant.id,
                status: 'OPEN',
            });
            const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                .patch(`/api/orders/${event.id}/orders/non-existent-id/payment`)
                .expect(404);
            expect(response.body).toHaveProperty('message', 'Order not found');
        });
        it('should reject confirming payment for another user\'s order', async () => {
            const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
            const event = await (0, event_factory_1.createEvent)({
                companyId: testData.company.id,
                createdById: testData.admin.id,
                restaurantId: restaurant.id,
                status: 'OPEN',
            });
            await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.admin.token)
                .post(`/api/events/${event.id}/join`)
                .expect(201);
            const orderResponse = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.admin.token)
                .post(`/api/orders/${event.id}/orders`)
                .send({ customOrder: 'Admin order', totalAmount: 10.00 })
                .expect(201);
            const orderId = orderResponse.body.data.id;
            // Employee tries to confirm admin's payment
            const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                .patch(`/api/orders/${event.id}/orders/${orderId}/payment`)
                .expect(404);
            expect(response.body).toHaveProperty('message', 'Order not found');
        });
        it('should allow confirming payment multiple times (idempotent)', async () => {
            const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
            const event = await (0, event_factory_1.createEvent)({
                companyId: testData.company.id,
                createdById: testData.admin.id,
                restaurantId: restaurant.id,
                status: 'OPEN',
            });
            await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                .post(`/api/events/${event.id}/join`)
                .expect(201);
            const orderResponse = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                .post(`/api/orders/${event.id}/orders`)
                .send({ customOrder: 'Test order', totalAmount: 10.00 })
                .expect(201);
            const orderId = orderResponse.body.data.id;
            // Confirm payment first time
            await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                .patch(`/api/orders/${event.id}/orders/${orderId}/payment`)
                .expect(200);
            // Confirm payment second time (should succeed)
            const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                .patch(`/api/orders/${event.id}/orders/${orderId}/payment`)
                .expect(200);
            expect(response.body.data.paymentConfirmed).toBe(true);
        });
    });
    describe('Order-Event Relationship', () => {
        it('should cascade delete orders when event is deleted', async () => {
            const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
            const event = await (0, event_factory_1.createEvent)({
                companyId: testData.company.id,
                createdById: testData.admin.id,
                restaurantId: restaurant.id,
                status: 'OPEN',
            });
            await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                .post(`/api/events/${event.id}/join`)
                .expect(201);
            const orderResponse = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                .post(`/api/orders/${event.id}/orders`)
                .send({ customOrder: 'Test order', totalAmount: 10.00 })
                .expect(201);
            const orderId = orderResponse.body.data.id;
            // Delete event
            await database_1.default.event.delete({ where: { id: event.id } });
            // Verify order is deleted
            const deletedOrder = await database_1.default.order.findUnique({ where: { id: orderId } });
            expect(deletedOrder).toBeNull();
        });
        it('should prevent event deletion if it has orders', async () => {
            const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
            const event = await (0, event_factory_1.createEvent)({
                companyId: testData.company.id,
                createdById: testData.admin.id,
                restaurantId: restaurant.id,
                status: 'OPEN',
            });
            await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                .post(`/api/events/${event.id}/join`)
                .expect(201);
            await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                .post(`/api/orders/${event.id}/orders`)
                .send({ customOrder: 'Test order', totalAmount: 10.00 })
                .expect(201);
            // Try to delete event via API
            const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.admin.token)
                .delete(`/api/events/${event.id}`)
                .expect(400);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toMatch(/cannot delete event/i);
        });
    });
    describe('Company Isolation', () => {
        it('should not show orders from different companies', async () => {
            const restaurant1 = await (0, restaurant_factory_1.createRestaurant)({ companyId: testData.company.id });
            const restaurant2 = await (0, restaurant_factory_1.createRestaurant)({ companyId: company2Data.company.id });
            const event1 = await (0, event_factory_1.createEvent)({
                companyId: testData.company.id,
                createdById: testData.admin.id,
                restaurantId: restaurant1.id,
                status: 'OPEN',
            });
            const event2 = await (0, event_factory_1.createEvent)({
                companyId: company2Data.company.id,
                createdById: company2Data.admin.id,
                restaurantId: restaurant2.id,
                status: 'OPEN',
            });
            // Create orders in both companies
            await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                .post(`/api/events/${event1.id}/join`)
                .expect(201);
            await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                .post(`/api/orders/${event1.id}/orders`)
                .send({ customOrder: 'Company 1 order', totalAmount: 10.00 })
                .expect(201);
            await (0, request_helper_1.authenticatedRequest)(app_1.default, company2Data.employee.token)
                .post(`/api/events/${event2.id}/join`)
                .expect(201);
            await (0, request_helper_1.authenticatedRequest)(app_1.default, company2Data.employee.token)
                .post(`/api/orders/${event2.id}/orders`)
                .send({ customOrder: 'Company 2 order', totalAmount: 15.00 })
                .expect(201);
            // Company 1 user should not see Company 2 orders
            const response1 = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.employee.token)
                .get('/api/orders/me')
                .expect(200);
            expect(response1.body.data).toHaveLength(1);
            expect(response1.body.data[0]).toMatchObject({
                customOrder: 'Company 1 order',
            });
            // Company 2 user should not see Company 1 orders
            const response2 = await (0, request_helper_1.authenticatedRequest)(app_1.default, company2Data.employee.token)
                .get('/api/orders/me')
                .expect(200);
            expect(response2.body.data).toHaveLength(1);
            expect(response2.body.data[0]).toMatchObject({
                customOrder: 'Company 2 order',
            });
        });
    });
});
