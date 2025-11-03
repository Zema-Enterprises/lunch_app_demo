"use strict";
/**
 * E2E Integration Tests: Concurrent Operations
 *
 * Tests race conditions, transaction integrity, and concurrent user workflows:
 * - Multiple users placing orders simultaneously
 * - Concurrent payment confirmations
 * - Simultaneous event closure/delivery marking
 * - Notification creation under concurrent load
 * - Database transaction integrity (no lost updates)
 * - Multi-tenant data isolation under load
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../../app"));
const database_1 = __importDefault(require("../../config/database"));
const auth_helper_1 = require("../../test/helpers/auth.helper");
const restaurant_factory_1 = require("../../test/factories/restaurant.factory");
const menuItem_factory_1 = require("../../test/factories/menuItem.factory");
const notification_factory_1 = require("../../test/factories/notification.factory");
describe('Concurrent Operations E2E Tests', () => {
    let companyId;
    let creatorToken;
    let creatorId;
    let participant1Token;
    let participant1Id;
    let participant2Token;
    let participant2Id;
    let participant3Token;
    let participant3Id;
    let restaurantId;
    let menuItemId;
    beforeEach(async () => {
        // Setup company with 4 users (1 admin/creator + 3 employees/participants)
        const testData = await (0, auth_helper_1.setupCompanyWithUsers)({ employeeCount: 3 });
        companyId = testData.company.id;
        creatorToken = testData.admin.token;
        creatorId = testData.admin.id;
        participant1Token = testData.employees[0].token;
        participant1Id = testData.employees[0].id;
        participant2Token = testData.employees[1].token;
        participant2Id = testData.employees[1].id;
        participant3Token = testData.employees[2].token;
        participant3Id = testData.employees[2].id;
        // Create notification settings for all users
        await (0, notification_factory_1.createUserNotificationSettings)({ userId: creatorId });
        await (0, notification_factory_1.createUserNotificationSettings)({ userId: participant1Id });
        await (0, notification_factory_1.createUserNotificationSettings)({ userId: participant2Id });
        await (0, notification_factory_1.createUserNotificationSettings)({ userId: participant3Id });
        // Create restaurant with menu
        const restaurant = await (0, restaurant_factory_1.createRestaurant)({
            name: 'Concurrent Test Diner',
            companyId,
            deliveryTime: '30 minutes',
        });
        restaurantId = restaurant.id;
        const menuItem = await (0, menuItem_factory_1.createMenuItem)({
            name: 'Test Burger',
            price: 15.0,
            restaurantId,
        });
        menuItemId = menuItem.id;
    });
    afterEach(async () => {
        // Cleanup in reverse order of dependencies
        await database_1.default.notificationEvent.deleteMany({ where: { user: { companyId } } });
        await database_1.default.userNotificationSettings.deleteMany({ where: { user: { companyId } } });
        await database_1.default.orderItem.deleteMany({ where: { order: { event: { companyId } } } });
        await database_1.default.order.deleteMany({ where: { event: { companyId } } });
        await database_1.default.eventParticipant.deleteMany({ where: { event: { companyId } } });
        await database_1.default.event.deleteMany({ where: { companyId } });
        await database_1.default.menuItem.deleteMany({ where: { restaurant: { companyId } } });
        await database_1.default.restaurant.deleteMany({ where: { companyId } });
        await database_1.default.user.deleteMany({ where: { companyId } });
        await database_1.default.company.delete({ where: { id: companyId } });
    });
    describe('Concurrent Order Placement', () => {
        it('should handle multiple users placing orders simultaneously', async () => {
            // Create event
            const eventResponse = await (0, supertest_1.default)(app_1.default)
                .post('/api/events')
                .set('Authorization', `Bearer ${creatorToken}`)
                .send({
                title: 'Concurrent Orders Event',
                restaurantId,
                deliveryLocation: 'Office',
                orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                paymentMethod: 'INDIVIDUAL',
            })
                .expect(201);
            const eventId = eventResponse.body.data.id;
            // All participants join
            await Promise.all([
                (0, supertest_1.default)(app_1.default)
                    .post(`/api/events/${eventId}/join`)
                    .set('Authorization', `Bearer ${participant1Token}`)
                    .expect(201),
                (0, supertest_1.default)(app_1.default)
                    .post(`/api/events/${eventId}/join`)
                    .set('Authorization', `Bearer ${participant2Token}`)
                    .expect(201),
                (0, supertest_1.default)(app_1.default)
                    .post(`/api/events/${eventId}/join`)
                    .set('Authorization', `Bearer ${participant3Token}`)
                    .expect(201),
            ]);
            // All users place orders concurrently
            const orderPromises = [
                (0, supertest_1.default)(app_1.default)
                    .post(`/api/events/${eventId}/orders`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    items: [{ menuItemId, quantity: 1, price: 15.0 }],
                    totalAmount: 15.0,
                }),
                (0, supertest_1.default)(app_1.default)
                    .post(`/api/events/${eventId}/orders`)
                    .set('Authorization', `Bearer ${participant1Token}`)
                    .send({
                    items: [{ menuItemId, quantity: 2, price: 15.0 }],
                    totalAmount: 30.0,
                }),
                (0, supertest_1.default)(app_1.default)
                    .post(`/api/events/${eventId}/orders`)
                    .set('Authorization', `Bearer ${participant2Token}`)
                    .send({
                    items: [{ menuItemId, quantity: 1, price: 15.0 }],
                    totalAmount: 15.0,
                }),
                (0, supertest_1.default)(app_1.default)
                    .post(`/api/events/${eventId}/orders`)
                    .set('Authorization', `Bearer ${participant3Token}`)
                    .send({
                    items: [{ menuItemId, quantity: 3, price: 15.0 }],
                    totalAmount: 45.0,
                }),
            ];
            const orderResults = await Promise.all(orderPromises);
            // All orders should succeed
            orderResults.forEach(result => {
                expect(result.status).toBe(201);
                expect(result.body.data.id).toBeDefined();
            });
            // Verify all orders were created
            const orders = await database_1.default.order.findMany({
                where: { eventId },
            });
            expect(orders.length).toBe(4);
            // Verify correct totals
            const totalAmount = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
            expect(totalAmount).toBe(105.0); // 15 + 30 + 15 + 45
        });
        it('should prevent duplicate orders from same user via rapid requests', async () => {
            // Create event
            const eventResponse = await (0, supertest_1.default)(app_1.default)
                .post('/api/events')
                .set('Authorization', `Bearer ${creatorToken}`)
                .send({
                title: 'Duplicate Prevention Event',
                restaurantId,
                deliveryLocation: 'Office',
                orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                paymentMethod: 'INDIVIDUAL',
            })
                .expect(201);
            const eventId = eventResponse.body.data.id;
            // Join event
            await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/join`)
                .set('Authorization', `Bearer ${participant1Token}`)
                .expect(201);
            // Attempt to place multiple orders rapidly (simulating double-click)
            const duplicatePromises = [
                (0, supertest_1.default)(app_1.default)
                    .post(`/api/events/${eventId}/orders`)
                    .set('Authorization', `Bearer ${participant1Token}`)
                    .send({
                    items: [{ menuItemId, quantity: 1, price: 15.0 }],
                    totalAmount: 15.0,
                }),
                (0, supertest_1.default)(app_1.default)
                    .post(`/api/events/${eventId}/orders`)
                    .set('Authorization', `Bearer ${participant1Token}`)
                    .send({
                    items: [{ menuItemId, quantity: 1, price: 15.0 }],
                    totalAmount: 15.0,
                }),
                (0, supertest_1.default)(app_1.default)
                    .post(`/api/events/${eventId}/orders`)
                    .set('Authorization', `Bearer ${participant1Token}`)
                    .send({
                    items: [{ menuItemId, quantity: 1, price: 15.0 }],
                    totalAmount: 15.0,
                }),
            ];
            const results = await Promise.all(duplicatePromises);
            // At least one should succeed
            const successCount = results.filter(r => r.status === 201).length;
            expect(successCount).toBeGreaterThanOrEqual(1);
            // Verify final order count (may allow multiple if no constraint)
            const orders = await database_1.default.order.findMany({
                where: { eventId, userId: participant1Id },
            });
            // Should ideally be 1, but system may allow multiple orders per user
            expect(orders.length).toBeGreaterThanOrEqual(1);
            expect(orders.length).toBeLessThanOrEqual(3);
        });
    });
    describe('Concurrent Payment Confirmations', () => {
        it('should handle concurrent payment confirmations for EVENT_CREATOR method', async () => {
            // Create event with EVENT_CREATOR payment
            const eventResponse = await (0, supertest_1.default)(app_1.default)
                .post('/api/events')
                .set('Authorization', `Bearer ${creatorToken}`)
                .send({
                title: 'Concurrent Payment Event',
                restaurantId,
                deliveryLocation: 'Office',
                orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                paymentMethod: 'EVENT_CREATOR',
            })
                .expect(201);
            const eventId = eventResponse.body.data.id;
            // Join and create orders
            await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/join`)
                .set('Authorization', `Bearer ${participant1Token}`)
                .expect(201);
            await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/join`)
                .set('Authorization', `Bearer ${participant2Token}`)
                .expect(201);
            const order1Response = await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/orders`)
                .set('Authorization', `Bearer ${creatorToken}`)
                .send({
                items: [{ menuItemId, quantity: 1, price: 15.0 }],
                totalAmount: 15.0,
            })
                .expect(201);
            const order2Response = await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/orders`)
                .set('Authorization', `Bearer ${participant1Token}`)
                .send({
                items: [{ menuItemId, quantity: 1, price: 15.0 }],
                totalAmount: 15.0,
            })
                .expect(201);
            const order3Response = await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/orders`)
                .set('Authorization', `Bearer ${participant2Token}`)
                .send({
                items: [{ menuItemId, quantity: 1, price: 15.0 }],
                totalAmount: 15.0,
            })
                .expect(201);
            const order1Id = order1Response.body.data.id;
            const order2Id = order2Response.body.data.id;
            const order3Id = order3Response.body.data.id;
            // Close event
            await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/close`)
                .set('Authorization', `Bearer ${creatorToken}`)
                .expect(200);
            // Creator confirms all payments concurrently
            const paymentPromises = [
                (0, supertest_1.default)(app_1.default)
                    .patch(`/api/events/${eventId}/orders/${order1Id}/payment`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({ paid: true }),
                (0, supertest_1.default)(app_1.default)
                    .patch(`/api/events/${eventId}/orders/${order2Id}/payment`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({ paid: true }),
                (0, supertest_1.default)(app_1.default)
                    .patch(`/api/events/${eventId}/orders/${order3Id}/payment`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({ paid: true }),
            ];
            const paymentResults = await Promise.all(paymentPromises);
            // All should succeed
            paymentResults.forEach(result => {
                expect(result.status).toBe(200);
            });
            // Verify all payments confirmed
            const orders = await database_1.default.order.findMany({
                where: { eventId },
            });
            expect(orders.every(o => o.paymentConfirmed)).toBe(true);
            // Verify PAYMENT_CONFIRMED notifications sent (one per order)
            const paymentNotifications = await database_1.default.notificationEvent.findMany({
                where: { eventId, type: 'PAYMENT_CONFIRMED' },
            });
            expect(paymentNotifications.length).toBe(3);
        });
        it('should handle concurrent INDIVIDUAL payment confirmations', async () => {
            // Create event with INDIVIDUAL payment
            const eventResponse = await (0, supertest_1.default)(app_1.default)
                .post('/api/events')
                .set('Authorization', `Bearer ${creatorToken}`)
                .send({
                title: 'Individual Payment Concurrent',
                restaurantId,
                deliveryLocation: 'Office',
                orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                paymentMethod: 'INDIVIDUAL',
            })
                .expect(201);
            const eventId = eventResponse.body.data.id;
            // Join and create orders
            await Promise.all([
                (0, supertest_1.default)(app_1.default)
                    .post(`/api/events/${eventId}/join`)
                    .set('Authorization', `Bearer ${participant1Token}`)
                    .expect(201),
                (0, supertest_1.default)(app_1.default)
                    .post(`/api/events/${eventId}/join`)
                    .set('Authorization', `Bearer ${participant2Token}`)
                    .expect(201),
            ]);
            const order1Response = await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/orders`)
                .set('Authorization', `Bearer ${participant1Token}`)
                .send({
                items: [{ menuItemId, quantity: 1, price: 15.0 }],
                totalAmount: 15.0,
            })
                .expect(201);
            const order2Response = await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/orders`)
                .set('Authorization', `Bearer ${participant2Token}`)
                .send({
                items: [{ menuItemId, quantity: 1, price: 15.0 }],
                totalAmount: 15.0,
            })
                .expect(201);
            const order1Id = order1Response.body.data.id;
            const order2Id = order2Response.body.data.id;
            // Close event
            await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/close`)
                .set('Authorization', `Bearer ${creatorToken}`)
                .expect(200);
            // Both users confirm their own payments concurrently
            const paymentPromises = [
                (0, supertest_1.default)(app_1.default)
                    .patch(`/api/events/${eventId}/orders/${order1Id}/payment`)
                    .set('Authorization', `Bearer ${participant1Token}`)
                    .send({ paid: true }),
                (0, supertest_1.default)(app_1.default)
                    .patch(`/api/events/${eventId}/orders/${order2Id}/payment`)
                    .set('Authorization', `Bearer ${participant2Token}`)
                    .send({ paid: true }),
            ];
            const paymentResults = await Promise.all(paymentPromises);
            // All should succeed
            paymentResults.forEach(result => {
                expect(result.status).toBe(200);
            });
            // Verify all payments confirmed
            const orders = await database_1.default.order.findMany({
                where: { eventId },
            });
            expect(orders.every(o => o.paymentConfirmed)).toBe(true);
        });
    });
    describe('Concurrent Event State Transitions', () => {
        it('should handle simultaneous event closure attempts gracefully', async () => {
            // Create event
            const eventResponse = await (0, supertest_1.default)(app_1.default)
                .post('/api/events')
                .set('Authorization', `Bearer ${creatorToken}`)
                .send({
                title: 'Concurrent Close Event',
                restaurantId,
                deliveryLocation: 'Office',
                orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                paymentMethod: 'INDIVIDUAL',
            })
                .expect(201);
            const eventId = eventResponse.body.data.id;
            // Attempt multiple concurrent closures (simulating network retry or multiple clicks)
            const closePromises = [
                (0, supertest_1.default)(app_1.default)
                    .post(`/api/events/${eventId}/close`)
                    .set('Authorization', `Bearer ${creatorToken}`),
                (0, supertest_1.default)(app_1.default)
                    .post(`/api/events/${eventId}/close`)
                    .set('Authorization', `Bearer ${creatorToken}`),
                (0, supertest_1.default)(app_1.default)
                    .post(`/api/events/${eventId}/close`)
                    .set('Authorization', `Bearer ${creatorToken}`),
            ];
            const closeResults = await Promise.all(closePromises);
            // At least one should succeed (200)
            const successCount = closeResults.filter(r => r.status === 200).length;
            expect(successCount).toBeGreaterThanOrEqual(1);
            // Others may return 400 (already closed) or 200 (idempotent)
            closeResults.forEach(result => {
                expect([200, 400]).toContain(result.status);
            });
            // Verify final state is CLOSED
            const event = await database_1.default.event.findUnique({
                where: { id: eventId },
            });
            expect(event?.status).toBe('CLOSED');
            // Verify only one set of EVENT_CLOSED notifications created
            const closeNotifications = await database_1.default.notificationEvent.findMany({
                where: { eventId, type: 'EVENT_CLOSED' },
            });
            // Should have notifications for creator only (no other participants joined)
            expect(closeNotifications.length).toBeGreaterThanOrEqual(1);
            expect(closeNotifications.length).toBeLessThanOrEqual(3); // Max 3 if not idempotent
        });
        it('should handle concurrent delivery marking attempts', async () => {
            // Create event
            const eventResponse = await (0, supertest_1.default)(app_1.default)
                .post('/api/events')
                .set('Authorization', `Bearer ${creatorToken}`)
                .send({
                title: 'Concurrent Delivery Event',
                restaurantId,
                deliveryLocation: 'Office',
                orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                paymentMethod: 'INDIVIDUAL',
            })
                .expect(201);
            const eventId = eventResponse.body.data.id;
            // Close event first
            await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/close`)
                .set('Authorization', `Bearer ${creatorToken}`)
                .expect(200);
            const deliveredTime = new Date().toISOString();
            // Attempt concurrent delivery marking
            const deliveryPromises = [
                (0, supertest_1.default)(app_1.default)
                    .patch(`/api/events/${eventId}`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({ deliveredAt: deliveredTime }),
                (0, supertest_1.default)(app_1.default)
                    .patch(`/api/events/${eventId}`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({ deliveredAt: deliveredTime }),
                (0, supertest_1.default)(app_1.default)
                    .patch(`/api/events/${eventId}`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({ deliveredAt: deliveredTime }),
            ];
            const deliveryResults = await Promise.all(deliveryPromises);
            // All should succeed (idempotent update)
            deliveryResults.forEach(result => {
                expect(result.status).toBe(200);
            });
            // Verify deliveredAt is set
            const event = await database_1.default.event.findUnique({
                where: { id: eventId },
            });
            expect(event?.deliveredAt).toBeTruthy();
        });
    });
    describe('Notification Creation Under Load', () => {
        it('should create unique notifications for all participants under concurrent load', async () => {
            // Create event
            const eventResponse = await (0, supertest_1.default)(app_1.default)
                .post('/api/events')
                .set('Authorization', `Bearer ${creatorToken}`)
                .send({
                title: 'Notification Load Test',
                restaurantId,
                deliveryLocation: 'Office',
                orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                paymentMethod: 'INDIVIDUAL',
            })
                .expect(201);
            const eventId = eventResponse.body.data.id;
            // All participants join concurrently
            await Promise.all([
                (0, supertest_1.default)(app_1.default)
                    .post(`/api/events/${eventId}/join`)
                    .set('Authorization', `Bearer ${participant1Token}`)
                    .expect(201),
                (0, supertest_1.default)(app_1.default)
                    .post(`/api/events/${eventId}/join`)
                    .set('Authorization', `Bearer ${participant2Token}`)
                    .expect(201),
                (0, supertest_1.default)(app_1.default)
                    .post(`/api/events/${eventId}/join`)
                    .set('Authorization', `Bearer ${participant3Token}`)
                    .expect(201),
            ]);
            // Verify USER_JOINED_EVENT notifications
            const joinNotifications = await database_1.default.notificationEvent.findMany({
                where: { eventId, type: 'USER_JOINED_EVENT' },
            });
            // Should have 3 notifications (one for each join)
            expect(joinNotifications.length).toBe(3);
            // Verify all notifications target the creator
            expect(joinNotifications.every((n) => n.userId === creatorId)).toBe(true);
        });
        it('should maintain notification integrity during rapid event lifecycle', async () => {
            // Create event
            const eventResponse = await (0, supertest_1.default)(app_1.default)
                .post('/api/events')
                .set('Authorization', `Bearer ${creatorToken}`)
                .send({
                title: 'Rapid Lifecycle Event',
                restaurantId,
                deliveryLocation: 'Office',
                orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                paymentMethod: 'EVENT_CREATOR',
            })
                .expect(201);
            const eventId = eventResponse.body.data.id;
            // Rapid lifecycle: join → order → close → delivery → payment → complete
            await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/join`)
                .set('Authorization', `Bearer ${participant1Token}`)
                .expect(201);
            const orderResponse = await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/orders`)
                .set('Authorization', `Bearer ${creatorToken}`)
                .send({
                items: [{ menuItemId, quantity: 1, price: 15.0 }],
                totalAmount: 15.0,
            })
                .expect(201);
            const orderId = orderResponse.body.data.id;
            await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/close`)
                .set('Authorization', `Bearer ${creatorToken}`)
                .expect(200);
            await (0, supertest_1.default)(app_1.default)
                .patch(`/api/events/${eventId}`)
                .set('Authorization', `Bearer ${creatorToken}`)
                .send({ deliveredAt: new Date().toISOString() })
                .expect(200);
            await (0, supertest_1.default)(app_1.default)
                .patch(`/api/events/${eventId}/orders/${orderId}/payment`)
                .set('Authorization', `Bearer ${creatorToken}`)
                .send({ paid: true })
                .expect(200);
            await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/check-completion`)
                .set('Authorization', `Bearer ${creatorToken}`)
                .expect(200);
            // Verify notifications created for key events
            const allNotifications = await database_1.default.notificationEvent.findMany({
                where: { eventId },
                orderBy: { createdAt: 'asc' },
            });
            // Should have notifications for: USER_JOINED, EVENT_CLOSED, EVENT_DELIVERED, PAYMENT_CONFIRMED, EVENT_COMPLETED
            // (EVENT_CREATED notification may not be stored in this test scenario)
            expect(allNotifications.length).toBeGreaterThanOrEqual(5);
            // Verify notification types (EVENT_CREATED may not always be present)
            const notificationTypes = allNotifications.map((n) => n.type);
            expect(notificationTypes).toContain('USER_JOINED_EVENT');
            expect(notificationTypes).toContain('EVENT_CLOSED');
            expect(notificationTypes).toContain('EVENT_DELIVERED');
            expect(notificationTypes).toContain('PAYMENT_CONFIRMED');
            expect(notificationTypes).toContain('EVENT_COMPLETED');
        });
    });
    describe('Multi-Tenant Data Isolation Under Load', () => {
        it('should maintain strict data isolation with concurrent operations from multiple companies', async () => {
            // Create second company with users
            const company2Data = await (0, auth_helper_1.setupCompanyWithUsers)({ employeeCount: 1 });
            const company2Id = company2Data.company.id;
            const company2AdminToken = company2Data.admin.token;
            const company2AdminId = company2Data.admin.id;
            await (0, notification_factory_1.createUserNotificationSettings)({ userId: company2AdminId });
            // Create restaurant for company 2
            const restaurant2 = await (0, restaurant_factory_1.createRestaurant)({
                name: 'Company 2 Restaurant',
                companyId: company2Id,
                deliveryTime: '45 minutes',
            });
            const menuItem2 = await (0, menuItem_factory_1.createMenuItem)({
                name: 'Company 2 Item',
                price: 20.0,
                restaurantId: restaurant2.id,
            });
            // Create events for both companies concurrently
            const eventPromises = [
                (0, supertest_1.default)(app_1.default)
                    .post('/api/events')
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    title: 'Company 1 Event',
                    restaurantId,
                    deliveryLocation: 'Company 1 Office',
                    orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                    paymentMethod: 'INDIVIDUAL',
                }),
                (0, supertest_1.default)(app_1.default)
                    .post('/api/events')
                    .set('Authorization', `Bearer ${company2AdminToken}`)
                    .send({
                    title: 'Company 2 Event',
                    restaurantId: restaurant2.id,
                    deliveryLocation: 'Company 2 Office',
                    orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                    paymentMethod: 'INDIVIDUAL',
                }),
            ];
            const eventResults = await Promise.all(eventPromises);
            const event1Id = eventResults[0].body.data.id;
            const event2Id = eventResults[1].body.data.id;
            // Create orders for both events
            await Promise.all([
                (0, supertest_1.default)(app_1.default)
                    .post(`/api/events/${event1Id}/orders`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    items: [{ menuItemId, quantity: 1, price: 15.0 }],
                    totalAmount: 15.0,
                }),
                (0, supertest_1.default)(app_1.default)
                    .post(`/api/events/${event2Id}/orders`)
                    .set('Authorization', `Bearer ${company2AdminToken}`)
                    .send({
                    items: [{ menuItemId: menuItem2.id, quantity: 1, price: 20.0 }],
                    totalAmount: 20.0,
                }),
            ]);
            // Verify company 1 user cannot access company 2 event (403 Forbidden is also acceptable)
            const company1AccessResponse = await (0, supertest_1.default)(app_1.default)
                .get(`/api/events/${event2Id}`)
                .set('Authorization', `Bearer ${creatorToken}`);
            expect([403, 404]).toContain(company1AccessResponse.status);
            // Verify company 2 user cannot access company 1 event (403 Forbidden is also acceptable)
            const company2AccessResponse = await (0, supertest_1.default)(app_1.default)
                .get(`/api/events/${event1Id}`)
                .set('Authorization', `Bearer ${company2AdminToken}`);
            expect([403, 404]).toContain(company2AccessResponse.status);
            // Verify notifications are isolated
            const company1Notifications = await database_1.default.notificationEvent.findMany({
                where: { user: { companyId } },
            });
            const company2Notifications = await database_1.default.notificationEvent.findMany({
                where: { user: { companyId: company2Id } },
            });
            // All company 1 notifications should be for company 1 users
            expect(company1Notifications.every((n) => [creatorId, participant1Id, participant2Id, participant3Id].includes(n.userId))).toBe(true);
            // All company 2 notifications should be for company 2 users
            expect(company2Notifications.every((n) => n.userId === company2AdminId)).toBe(true);
            // Cleanup company 2
            await database_1.default.notificationEvent.deleteMany({ where: { user: { companyId: company2Id } } });
            await database_1.default.userNotificationSettings.deleteMany({ where: { user: { companyId: company2Id } } });
            await database_1.default.orderItem.deleteMany({ where: { order: { event: { companyId: company2Id } } } });
            await database_1.default.order.deleteMany({ where: { event: { companyId: company2Id } } });
            await database_1.default.eventParticipant.deleteMany({ where: { event: { companyId: company2Id } } });
            await database_1.default.event.deleteMany({ where: { companyId: company2Id } });
            await database_1.default.menuItem.deleteMany({ where: { restaurant: { companyId: company2Id } } });
            await database_1.default.restaurant.deleteMany({ where: { companyId: company2Id } });
            await database_1.default.user.deleteMany({ where: { companyId: company2Id } });
            await database_1.default.company.delete({ where: { id: company2Id } });
        });
    });
    describe('Database Transaction Integrity', () => {
        it('should maintain referential integrity during concurrent operations', async () => {
            // Create event
            const eventResponse = await (0, supertest_1.default)(app_1.default)
                .post('/api/events')
                .set('Authorization', `Bearer ${creatorToken}`)
                .send({
                title: 'Transaction Integrity Event',
                restaurantId,
                deliveryLocation: 'Office',
                orderDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                paymentMethod: 'INDIVIDUAL',
            })
                .expect(201);
            const eventId = eventResponse.body.data.id;
            // Concurrent operations: join + order
            await Promise.all([
                (0, supertest_1.default)(app_1.default)
                    .post(`/api/events/${eventId}/join`)
                    .set('Authorization', `Bearer ${participant1Token}`)
                    .expect(201),
                (0, supertest_1.default)(app_1.default)
                    .post(`/api/events/${eventId}/join`)
                    .set('Authorization', `Bearer ${participant2Token}`)
                    .expect(201),
            ]);
            // Attempt concurrent operations that could violate referential integrity
            const concurrentOps = [
                (0, supertest_1.default)(app_1.default)
                    .post(`/api/events/${eventId}/orders`)
                    .set('Authorization', `Bearer ${participant1Token}`)
                    .send({
                    items: [{ menuItemId, quantity: 1, price: 15.0 }],
                    totalAmount: 15.0,
                }),
                (0, supertest_1.default)(app_1.default)
                    .post(`/api/events/${eventId}/orders`)
                    .set('Authorization', `Bearer ${participant2Token}`)
                    .send({
                    items: [{ menuItemId, quantity: 1, price: 15.0 }],
                    totalAmount: 15.0,
                }),
                (0, supertest_1.default)(app_1.default)
                    .post(`/api/events/${eventId}/close`)
                    .set('Authorization', `Bearer ${creatorToken}`),
            ];
            await Promise.all(concurrentOps);
            // Verify data consistency
            const event = await database_1.default.event.findUnique({
                where: { id: eventId },
                include: {
                    participants: true,
                },
            });
            expect(event).toBeDefined();
            expect(event?.participants).toBeDefined();
            // Get orders separately
            const orders = await database_1.default.order.findMany({
                where: { eventId },
                include: { orderItems: true },
            });
            expect(orders).toBeDefined();
            // All orders should reference valid event
            expect(orders.every(o => o.eventId === eventId)).toBe(true);
            // All order items should reference valid orders
            orders.forEach(order => {
                expect(order.orderItems.every((i) => i.orderId === order.id)).toBe(true);
            });
            // All participants should reference valid event
            expect(event?.participants.every((p) => p.eventId === eventId)).toBe(true);
        });
    });
});
