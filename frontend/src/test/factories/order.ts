/**
 * Order factories for generating test order data
 */

export interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  menuItemId: string;
  menuItem: {
    id: string;
    name: string;
    description?: string;
    price: number;
  };
}

export interface Order {
  id: string;
  totalAmount: number;
  customOrder?: string | null;
  paymentConfirmed: boolean;
  userId: string;
  eventId: string;
  createdAt: string;
  event: {
    id: string;
    title: string;
    status: string;
  };
  orderItems: OrderItem[];
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

let orderCounter = 0;

/**
 * Create a mock order
 */
export function createOrder(overrides: Partial<Order> = {}): Order {
  orderCounter++;
  
  const defaultItems: OrderItem[] = [
    {
      id: `item-${orderCounter}-1`,
      quantity: 2,
      price: 12.99,
      menuItemId: 'menu-1',
      menuItem: {
        id: 'menu-1',
        name: 'Pizza Margherita',
        price: 12.99,
      },
    },
  ];

  const items = overrides.orderItems || defaultItems;
  const totalAmount = overrides.totalAmount ?? items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return {
    id: `order-${orderCounter}`,
    totalAmount,
    customOrder: null,
    paymentConfirmed: false,
    userId: 'user-1',
    eventId: 'event-1',
    createdAt: new Date().toISOString(),
    event: {
      id: 'event-1',
      title: 'Team Lunch',
      status: 'OPEN',
    },
    orderItems: items,
    user: {
      id: 'user-1',
      name: 'Test User',
      email: 'user@test.com',
    },
    ...overrides,
  };
}

/**
 * Create confirmed/paid order
 */
export function createConfirmedOrder(overrides: Partial<Order> = {}): Order {
  return createOrder({
    ...overrides,
    paymentConfirmed: true,
  });
}

/**
 * Create custom order (text-based)
 */
export function createCustomOrder(customText: string, overrides: Partial<Order> = {}): Order {
  return createOrder({
    ...overrides,
    customOrder: customText,
    orderItems: [],
    totalAmount: 0,
  });
}

/**
 * Create order item
 */
export function createOrderItem(overrides: Partial<OrderItem> = {}): OrderItem {
  const itemNum = Math.random().toString(36).substring(7);
  
  return {
    id: `item-${itemNum}`,
    quantity: 1,
    price: 12.99,
    menuItemId: 'menu-1',
    menuItem: {
      id: 'menu-1',
      name: 'Pizza Margherita',
      price: 12.99,
    },
    ...overrides,
  };
}

/**
 * Create multiple orders
 */
export function createOrders(count: number, overrides: Partial<Order> = {}): Order[] {
  return Array.from({ length: count }, () => createOrder(overrides));
}

/**
 * Reset counter
 */
export function resetOrderCounter() {
  orderCounter = 0;
}
