/**
 * Order factory for generating test order data
 */

import prisma from '../../config/database';

export interface OrderFactoryData {
  customOrder?: string | null;
  totalAmount?: number;
  paymentConfirmed?: boolean;
  userId: string;
  eventId: string;
}

export interface OrderItemData {
  menuItemId: string;
  quantity: number;
  price: number;
}

/**
 * Create an order with factory defaults
 */
export async function createOrder(data: OrderFactoryData, items: OrderItemData[] = []) {
  // Calculate total if not provided
  const totalAmount = data.totalAmount ?? items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const order = await prisma.order.create({
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
    const orderItem = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: item.price,
      },
    });
    createdItems.push(orderItem);
  }

  return prisma.order.findUnique({
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
export async function createOrdersForEvent(
  eventId: string,
  userIds: string[],
  menuItems: { id: string; price: number }[]
) {
  const orders = [];

  for (const userId of userIds) {
    // Each user orders 1-3 random items
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const orderItems: OrderItemData[] = [];

    for (let i = 0; i < itemCount; i++) {
      const randomItem = menuItems[Math.floor(Math.random() * menuItems.length)];
      orderItems.push({
        menuItemId: randomItem.id,
        quantity: Math.floor(Math.random() * 2) + 1,
        price: randomItem.price,
      });
    }

    const order = await createOrder(
      {
        userId,
        eventId,
      },
      orderItems
    );

    orders.push(order);
  }

  return orders;
}

/**
 * Create order with custom items
 */
export async function createCustomOrder(
  userId: string,
  eventId: string,
  customOrderText: string
) {
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
export async function createConfirmedOrder(
  data: OrderFactoryData,
  items: OrderItemData[]
) {
  return createOrder(
    {
      ...data,
      paymentConfirmed: true,
    },
    items
  );
}

/**
 * Build order data without saving (for validation tests)
 */
export function buildOrderData(overrides: Partial<OrderFactoryData> = {}): any {
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
export function buildOrderItemData(overrides: Partial<OrderItemData> = {}): OrderItemData {
  return {
    menuItemId: 'test-menu-item-id',
    quantity: 1,
    price: 12.99,
    ...overrides,
  };
}
