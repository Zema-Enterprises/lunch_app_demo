/**
 * Event factories for generating test event data
 */

export interface Event {
  id: string;
  title: string;
  description?: string;
  status: 'OPEN' | 'CLOSED' | 'COMPLETED' | 'CANCELLED';
  orderDeadline: string;
  deliveryLocation: string;
  paymentMethod: 'EVENT_CREATOR' | 'INDIVIDUAL' | 'COMPANY_EXPENSE';
  restaurantId: string;
  createdById: string;
  companyId: string;
  createdAt?: string;
  restaurant?: {
    id: string;
    name: string;
    cuisine: string;
  };
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  participants?: any[];
  orders?: any[];
  _count?: {
    participants: number;
    orders: number;
  };
}

let eventCounter = 0;

/**
 * Create a mock event
 */
export function createEvent(overrides: Partial<Event> = {}): Event {
  eventCounter++;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    id: `event-${eventCounter}`,
    title: `Test Event ${eventCounter}`,
    description: `Test event description ${eventCounter}`,
    status: 'OPEN',
    orderDeadline: tomorrow.toISOString(),
    deliveryLocation: 'Office - Floor 1',
    paymentMethod: 'EVENT_CREATOR',
    restaurantId: 'restaurant-1',
    createdById: 'user-1',
    companyId: 'company-1',
    createdAt: new Date().toISOString(),
    restaurant: {
      id: 'restaurant-1',
      name: 'Italian Bistro',
      cuisine: 'Italian',
    },
    createdBy: {
      id: 'user-1',
      name: 'Admin User',
      email: 'admin@test.com',
    },
    participants: [],
    orders: [],
    _count: {
      participants: 0,
      orders: 0,
    },
    ...overrides,
  };
}

/**
 * Create open event (ready for orders)
 */
export function createOpenEvent(overrides: Partial<Event> = {}): Event {
  return createEvent({
    ...overrides,
    status: 'OPEN',
  });
}

/**
 * Create closed event
 */
export function createClosedEvent(overrides: Partial<Event> = {}): Event {
  return createEvent({
    ...overrides,
    status: 'CLOSED',
  });
}

/**
 * Create event with past deadline
 */
export function createPastEvent(overrides: Partial<Event> = {}): Event {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return createEvent({
    ...overrides,
    orderDeadline: yesterday.toISOString(),
  });
}

/**
 * Create multiple events
 */
export function createEvents(count: number, overrides: Partial<Event> = {}): Event[] {
  return Array.from({ length: count }, () => createEvent(overrides));
}

/**
 * Reset counter
 */
export function resetEventCounter() {
  eventCounter = 0;
}
