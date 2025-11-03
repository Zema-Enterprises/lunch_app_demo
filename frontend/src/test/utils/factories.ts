import { Event, Restaurant, Order, User, MenuItem, OrderItem, EventParticipant, Company, NotificationEvent, UserNotificationSettings, NotificationStats } from '@/types';

// User factory
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'USER',
  companyId: 'company-1',
  createdAt: new Date().toISOString(),
  ...overrides,
} as User);

// Company factory
export const createMockCompany = (overrides?: Partial<Company>): Company => ({
  id: 'company-1',
  name: 'Test Company',
  domain: 'testcompany.com',
  slug: 'test-company',
  createdAt: new Date().toISOString(),
  ...overrides,
});

// Restaurant factory
export const createMockRestaurant = (overrides?: Partial<Restaurant>): Restaurant => ({
  id: 'restaurant-1',
  name: 'Test Restaurant',
  cuisine: 'Italian',
  phone: '123-456-7890',
  address: '123 Main St',
  imageUrl: 'https://example.com/image.jpg',
  hasMenu: true,
  companyId: 'company-1',
  ...overrides,
} as Restaurant);

// MenuItem factory
export const createMockMenuItem = (overrides?: Partial<MenuItem>): MenuItem => ({
  id: 'menu-1',
  name: 'Pizza Margherita',
  description: 'Classic Italian pizza',
  price: 12.99,
  category: 'Main',
  available: true,
  restaurantId: 'restaurant-1',
  ...overrides,
} as MenuItem);

// Event factory
export const createMockEvent = (overrides?: Partial<Event>): Event => ({
  id: 'event-1',
  title: 'Team Lunch',
  description: 'Monthly team lunch',
  status: 'OPEN',
  orderDeadline: new Date(Date.now() + 86400000).toISOString(),
  deliveryLocation: 'Office',
  paymentMethod: 'COMPANY_EXPENSE',
  restaurantId: 'restaurant-1',
  companyId: 'company-1',
  createdById: 'user-1',
  createdAt: new Date().toISOString(),
  participants: [],
  orders: [],
  ...overrides,
} as Event);

// EventParticipant factory
export const createMockEventParticipant = (overrides?: Partial<EventParticipant>): EventParticipant => ({
  id: 'participant-1',
  userId: 'user-1',
  eventId: 'event-1',
  joinedAt: new Date().toISOString(),
  ...overrides,
});

// OrderItem factory
export const createMockOrderItem = (overrides?: Partial<OrderItem>): OrderItem => ({
  id: 'item-1',
  orderId: 'order-1',
  menuItemId: 'menu-1',
  quantity: 1,
  price: 12.99,
  ...overrides,
});

// Order factory
export const createMockOrder = (overrides?: Partial<Order>): Order => ({
  id: 'order-1',
  userId: 'user-1',
  eventId: 'event-1',
  totalAmount: 12.99,
  paymentConfirmed: false,
  customOrder: undefined,
  notes: undefined,
  createdAt: '2025-10-06T12:00:00.000Z',
  ...overrides,
} as Order);

// Create multiple items
export const createMockRestaurants = (count: number): Restaurant[] =>
  Array.from({ length: count }, (_, i) =>
    createMockRestaurant({
      id: `restaurant-${i + 1}`,
      name: `Restaurant ${i + 1}`,
    })
  );

export const createMockEvents = (count: number): Event[] =>
  Array.from({ length: count }, (_, i) =>
    createMockEvent({
      id: `event-${i + 1}`,
      title: `Event ${i + 1}`,
    })
  );

export const createMockOrders = (count: number): Order[] =>
  Array.from({ length: count }, (_, i) =>
    createMockOrder({
      id: `order-${i + 1}`,
      totalAmount: (i + 1) * 10,
    })
  );

// NotificationEvent factory
export const createMockNotification = (overrides?: Partial<NotificationEvent>): NotificationEvent => ({
  id: 'notification-1',
  type: 'EVENT_CREATED',
  userId: 'user-1',
  read: false,
  sentEmail: false,
  sentInApp: true,
  eventId: 'event-1',
  createdAt: new Date().toISOString(),
  event: createMockEvent(),
  ...overrides,
});

// NotificationStats factory
export const createMockNotificationStats = (overrides?: Partial<NotificationStats>): NotificationStats => ({
  unread: 3,
  total: 10,
  ...overrides,
});

// UserNotificationSettings factory
export const createMockNotificationSettings = (overrides?: Partial<UserNotificationSettings>): UserNotificationSettings => ({
  id: 'settings-1',
  userId: 'user-1',
  emailNotifications: true,
  inAppNotifications: true,
  notifyOnEventCreated: true,
  notifyOnUserJoinedEvent: true,
  notifyOnEventClosed: true,
  notifyOnEventDelivered: true,
  notifyOnPaymentConfirmed: true,
  notifyOnEventCompleted: true,
  notifyOnOrderPlaced: false,
  notifyOnOrderUpdated: false,
  notifyOnPaymentReminder: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// Create multiple notifications
export const createMockNotifications = (count: number, options?: { someRead?: boolean }): NotificationEvent[] => {
  const types: NotificationEvent['type'][] = [
    'EVENT_CREATED',
    'USER_JOINED_EVENT',
    'EVENT_CLOSED',
    'EVENT_DELIVERED',
    'PAYMENT_CONFIRMED',
    'EVENT_COMPLETED',
    'PAYMENT_REMINDER',
  ];
  
  return Array.from({ length: count }, (_, i) => {
    const read = options?.someRead ? i % 2 === 0 : false;
    return createMockNotification({
      id: `notification-${i + 1}`,
      type: types[i % types.length],
      read,
      createdAt: new Date(Date.now() - i * 3600000).toISOString(), // 1 hour apart
    });
  });
};
