"use strict";
/**
 * Order factory for generating test order data
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrder = createOrder;
exports.createOrdersForEvent = createOrdersForEvent;
exports.createCustomOrder = createCustomOrder;
exports.createConfirmedOrder = createConfirmedOrder;
exports.buildOrderData = buildOrderData;
exports.buildOrderItemData = buildOrderItemData;
const database_1 = __importDefault(require("../../config/database"));
/**
 * Create an order with factory defaults
 */
async function createOrder(data, items = []) {
    // Calculate total if not provided
    const totalAmount = data.totalAmount ?? items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const order = await database_1.default.order.create({
        data: {
            customOrder: data.customOrder,
            totalAmount,
            paymentConfirmed: data.paymentConfirmed ?? false,
            userId: data.userId,
            eventId: data.eventId,
        },
    });
    // Create order items
    const createdItems = [];
    for (const item of items) {
        const orderItem = await database_1.default.orderItem.create({
            data: {
                orderId: order.id,
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                price: item.price,
            },
        });
        createdItems.push(orderItem);
    }
    return database_1.default.order.findUnique({
        where: { id: order.id },
        include: {
            orderItems: {
                include: {
                    menuItem: true,
                },
            },
            user: true,
            event: true,
        },
    });
}
/**
 * Create multiple orders for an event
 */
async function createOrdersForEvent(eventId, userIds, menuItems) {
    const orders = [];
    for (const userId of userIds) {
        // Each user orders 1-3 random items
        const itemCount = Math.floor(Math.random() * 3) + 1;
        const orderItems = [];
        for (let i = 0; i < itemCount; i++) {
            const randomItem = menuItems[Math.floor(Math.random() * menuItems.length)];
            orderItems.push({
                menuItemId: randomItem.id,
                quantity: Math.floor(Math.random() * 2) + 1,
                price: randomItem.price,
            });
        }
        const order = await createOrder({
            userId,
            eventId,
        }, orderItems);
        orders.push(order);
    }
    return orders;
}
/**
 * Create order with custom items
 */
async function createCustomOrder(userId, eventId, customOrderText) {
    return createOrder({
        userId,
        eventId,
        customOrder: customOrderText,
        totalAmount: 0,
    });
}
/**
 * Create confirmed/paid order
 */
async function createConfirmedOrder(data, items) {
    return createOrder({
        ...data,
        paymentConfirmed: true,
    }, items);
}
/**
 * Build order data without saving (for validation tests)
 */
function buildOrderData(overrides = {}) {
    return {
        customOrder: null,
        totalAmount: 25.50,
        paymentConfirmed: false,
        ...overrides,
    };
}
/**
 * Build order item data
 */
function buildOrderItemData(overrides = {}) {
    return {
        menuItemId: 'test-menu-item-id',
        quantity: 1,
        price: 12.99,
        ...overrides,
    };
}
