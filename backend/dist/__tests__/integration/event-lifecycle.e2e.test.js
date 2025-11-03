"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../../app"));
const auth_helper_1 = require("../../test/helpers/auth.helper");
const restaurant_factory_1 = require("../../test/factories/restaurant.factory");
const menuItem_factory_1 = require("../../test/factories/menuItem.factory");
const notification_factory_1 = require("../../test/factories/notification.factory");
const database_1 = __importDefault(require("../../config/database"));
describe('Event Lifecycle E2E', () => {
    let companyId;
    let creatorToken;
    let creatorId;
    let participant1Token;
    let participant1Id;
    let participant2Token;
    let participant2Id;
    let restaurantId;
    let menuItemId;
    beforeEach(async () => {
        // Setup company with 3 users (1 admin/creator + 2 employees/participants)
        const testData = await (0, auth_helper_1.setupCompanyWithUsers)({ employeeCount: 2 });
        companyId = testData.company.id;
        creatorToken = testData.admin.token;
        creatorId = testData.admin.id;
        participant1Token = testData.employees[0].token;
        participant1Id = testData.employees[0].id;
        participant2Token = testData.employees[1].token;
        participant2Id = testData.employees[1].id;
        // Create notification settings for all users
        await (0, notification_factory_1.createUserNotificationSettings)({ userId: creatorId });
        await (0, notification_factory_1.createUserNotificationSettings)({ userId: participant1Id });
        await (0, notification_factory_1.createUserNotificationSettings)({ userId: participant2Id });
        // Create restaurant with menu
        const restaurant = await (0, restaurant_factory_1.createRestaurant)({
            name: 'Test Restaurant',
            companyId,
            deliveryTime: '45-60 minutes',
        });
        restaurantId = restaurant.id;
        const menuItem = await (0, menuItem_factory_1.createMenuItem)({
            name: 'Test Pizza',
            price: 12.99,
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
            const createResponse = await (0, supertest_1.default)(app_1.default)
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
            const createdNotifications = await database_1.default.notificationEvent.findMany({
                where: { eventId, type: 'EVENT_CREATED' },
            });
            expect(createdNotifications.length).toBe(0); // Default is disabled
            // ============================================================
            // STEP 2: Participants join event
            // ============================================================
            // Participant 1 joins
            await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/join`)
                .set('Authorization', `Bearer ${participant1Token}`)
                .expect(201); // Creates new participant record
            // Verify USER_JOINED_EVENT notification sent to creator
            let joinNotifications = await database_1.default.notificationEvent.findMany({
                where: {
                    eventId,
                    type: 'USER_JOINED_EVENT',
                    userId: creatorId
                },
            });
            expect(joinNotifications.length).toBe(1);
            // Participant 2 joins
            await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/join`)
                .set('Authorization', `Bearer ${participant2Token}`)
                .expect(201);
            // Verify second join notification
            joinNotifications = await database_1.default.notificationEvent.findMany({
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
            await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/orders`)
                .set('Authorization', `Bearer ${creatorToken}`)
                .send(creatorOrderData)
                .expect(201);
            // Participant 1 places order
            const participant1OrderData = {
                items: [{ menuItemId, quantity: 1 }],
            };
            await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/orders`)
                .set('Authorization', `Bearer ${participant1Token}`)
                .send(participant1OrderData)
                .expect(201);
            // Participant 2 places order
            const participant2OrderData = {
                items: [{ menuItemId, quantity: 3 }],
            };
            await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/orders`)
                .set('Authorization', `Bearer ${participant2Token}`)
                .send(participant2OrderData)
                .expect(201);
            // Verify ORDER_PLACED notifications sent to creator
            const orderNotifications = await database_1.default.notificationEvent.findMany({
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
            await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/close`)
                .set('Authorization', `Bearer ${creatorToken}`)
                .expect(200);
            // Verify event status changed to CLOSED
            const closedEvent = await database_1.default.event.findUnique({
                where: { id: eventId },
            });
            expect(closedEvent?.status).toBe('CLOSED');
            // Verify EVENT_CLOSED notifications sent to all participants
            const closedNotifications = await database_1.default.notificationEvent.findMany({
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
            const participant1Order = await database_1.default.order.findFirst({
                where: { eventId, userId: participant1Id },
            });
            await (0, supertest_1.default)(app_1.default)
                .delete(`/api/events/${eventId}/orders/${participant1Order.id}`)
                .set('Authorization', `Bearer ${participant1Token}`)
                .expect(400);
            // Order should still exist
            const stillExists = await database_1.default.order.findUnique({
                where: { id: participant1Order.id },
            });
            expect(stillExists).not.toBeNull();
            // ============================================================
            // STEP 6: Creator confirms all payments (EVENT_CREATOR method)
            // ============================================================
            // Get all orders
            const allOrders = await database_1.default.order.findMany({
                where: { eventId },
            });
            expect(allOrders.length).toBe(3);
            // Creator confirms all payments
            for (const order of allOrders) {
                await (0, supertest_1.default)(app_1.default)
                    .patch(`/api/events/${eventId}/orders/${order.id}/payment`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .expect(200);
            }
            // Verify all orders marked as paid
            const paidOrders = await database_1.default.order.findMany({
                where: { eventId, paymentConfirmed: true },
            });
            expect(paidOrders.length).toBe(3);
            // Verify PAYMENT_CONFIRMED notifications sent
            const paymentNotifications = await database_1.default.notificationEvent.findMany({
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
            await (0, supertest_1.default)(app_1.default)
                .patch(`/api/events/${eventId}`)
                .set('Authorization', `Bearer ${creatorToken}`)
                .send({ deliveredAt: deliveryTime.toISOString() })
                .expect(200);
            // Verify deliveredAt timestamp recorded
            const deliveredEvent = await database_1.default.event.findUnique({
                where: { id: eventId },
            });
            expect(deliveredEvent?.deliveredAt).not.toBeNull();
            // Verify EVENT_DELIVERED notification sent
            const deliveredNotifications = await database_1.default.notificationEvent.findMany({
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
            await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/check-completion`)
                .set('Authorization', `Bearer ${creatorToken}`)
                .expect(200);
            // Verify event status changed to COMPLETED
            const completedEvent = await database_1.default.event.findUnique({
                where: { id: eventId },
            });
            expect(completedEvent?.status).toBe('COMPLETED');
            // Verify EVENT_COMPLETED notifications sent
            const completedNotifications = await database_1.default.notificationEvent.findMany({
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
            const eventResponse = await (0, supertest_1.default)(app_1.default)
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
            await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/join`)
                .set('Authorization', `Bearer ${participant1Token}`)
                .expect(201);
            // Participant places order
            const orderResponse = await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/orders`)
                .set('Authorization', `Bearer ${participant1Token}`)
                .send({ items: [{ menuItemId, quantity: 1 }] })
                .expect(201);
            const orderId = orderResponse.body.data.id;
            // Event is OPEN, deletion should work
            await (0, supertest_1.default)(app_1.default)
                .delete(`/api/events/${eventId}/orders/${orderId}`)
                .set('Authorization', `Bearer ${participant1Token}`)
                .expect(200);
            // Verify order deleted
            const deletedOrder = await database_1.default.order.findUnique({
                where: { id: orderId },
            });
            expect(deletedOrder).toBeNull();
        });
        it('should prevent order deletion when event is CLOSED', async () => {
            // Create event
            const eventResponse = await (0, supertest_1.default)(app_1.default)
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
            await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/join`)
                .set('Authorization', `Bearer ${participant1Token}`)
                .expect(201);
            // Participant places order
            const orderResponse = await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/orders`)
                .set('Authorization', `Bearer ${participant1Token}`)
                .send({ items: [{ menuItemId, quantity: 1 }] })
                .expect(201);
            const orderId = orderResponse.body.data.id;
            // Close event
            await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/close`)
                .set('Authorization', `Bearer ${creatorToken}`)
                .expect(200);
            // Attempt to delete order - should fail
            const deleteResponse = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/events/${eventId}/orders/${orderId}`)
                .set('Authorization', `Bearer ${participant1Token}`)
                .expect(400);
            expect(deleteResponse.body.message).toContain('closed');
            // Verify order still exists
            const stillExists = await database_1.default.order.findUnique({
                where: { id: orderId },
            });
            expect(stillExists).not.toBeNull();
        });
        it('should prevent order deletion when event is COMPLETED', async () => {
            // Create and complete event
            const eventResponse = await (0, supertest_1.default)(app_1.default)
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
            await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/join`)
                .set('Authorization', `Bearer ${participant1Token}`)
                .expect(201);
            // Participant places order
            const orderResponse = await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/orders`)
                .set('Authorization', `Bearer ${participant1Token}`)
                .send({ items: [{ menuItemId, quantity: 1 }] })
                .expect(201);
            const orderId = orderResponse.body.data.id;
            // Manually set event to COMPLETED
            await database_1.default.event.update({
                where: { id: eventId },
                data: { status: 'COMPLETED' },
            });
            // Attempt to delete order - should fail
            await (0, supertest_1.default)(app_1.default)
                .delete(`/api/events/${eventId}/orders/${orderId}`)
                .set('Authorization', `Bearer ${participant1Token}`)
                .expect(400);
            // Verify order still exists
            const stillExists = await database_1.default.order.findUnique({
                where: { id: orderId },
            });
            expect(stillExists).not.toBeNull();
        });
    });
    describe('Manual Event Completion', () => {
        it('should allow creator to manually complete event', async () => {
            // Create event
            const eventResponse = await (0, supertest_1.default)(app_1.default)
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
            await (0, supertest_1.default)(app_1.default)
                .post(`/api/events/${eventId}/close`)
                .set('Authorization', `Bearer ${creatorToken}`)
                .expect(200);
            // Manually complete event
            await (0, supertest_1.default)(app_1.default)
                .patch(`/api/events/${eventId}`)
                .set('Authorization', `Bearer ${creatorToken}`)
                .send({ status: 'COMPLETED' })
                .expect(200);
            // Verify event completed
            const completedEvent = await database_1.default.event.findUnique({
                where: { id: eventId },
            });
            expect(completedEvent?.status).toBe('COMPLETED');
            // Verify EVENT_COMPLETED notifications sent
            const notifications = await database_1.default.notificationEvent.findMany({
                where: {
                    eventId,
                    type: 'EVENT_COMPLETED'
                },
            });
            expect(notifications.length).toBeGreaterThan(0);
        });
        it('should prevent non-creator from manually completing event', async () => {
            // Create event
            const eventResponse = await (0, supertest_1.default)(app_1.default)
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
            await (0, supertest_1.default)(app_1.default)
                .patch(`/api/events/${eventId}`)
                .set('Authorization', `Bearer ${participant1Token}`)
                .send({ status: 'COMPLETED' })
                .expect(403);
            // Verify event still OPEN
            const event = await database_1.default.event.findUnique({
                where: { id: eventId },
            });
            expect(event?.status).toBe('OPEN');
        });
    });
});
