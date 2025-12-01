import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:5000/api';

// Mock data
export const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'USER',
  companyId: 'company-1',
};

export const mockCompany = {
  id: 'company-1',
  name: 'Mock Company',
  domain: 'mock.com',
  slug: 'mock-company',
  createdAt: new Date().toISOString(),
};

export const mockTheme = {
  primaryColor: '#0f172a',
  secondaryColor: '#22c55e',
  backgroundColor: '#f8fafc',
  coverPhotoUrl: null as string | null,
  coverPhotoMeta: null as any,
};

export const mockRestaurants = [
  {
    id: 'restaurant-1',
    name: 'Test Restaurant',
    cuisine: 'Italian',
    description: 'A great restaurant',
    phone: '123-456-7890',
    address: '123 Main St',
    imageUrl: 'https://example.com/image.jpg',
    hasMenu: true,
    companyId: 'company-1',
    menuItems: [
      {
        id: 'menu-1',
        name: 'Pizza Margherita',
        description: 'Classic Italian pizza',
        price: 12.99,
        category: 'Main',
        available: true,
        restaurantId: 'restaurant-1',
      },
      {
        id: 'menu-2',
        name: 'Caesar Salad',
        description: 'Fresh salad',
        price: 8.99,
        category: 'Appetizer',
        available: true,
        restaurantId: 'restaurant-1',
      },
    ],
  },
  {
    id: 'restaurant-2',
    name: 'Sushi Place',
    cuisine: 'Japanese',
    description: 'Fresh sushi daily',
    phone: '123-456-7891',
    address: '456 Oak Ave',
    imageUrl: 'https://example.com/sushi.jpg',
    hasMenu: true,
    companyId: 'company-1',
    menuItems: [],
  },
];

export const mockEvents = [
  {
    id: 'event-1',
    title: 'Team Lunch',
    description: 'Monthly team lunch',
    status: 'OPEN',
    orderDeadline: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    deliveryLocation: 'Office',
    paymentMethod: 'COMPANY_EXPENSE',
    restaurantId: 'restaurant-1',
    companyId: 'company-1',
    createdById: 'user-1',
    restaurant: mockRestaurants[0],
    createdBy: mockUser,
    participants: [
      {
        id: 'participant-1',
        userId: 'user-1',
        eventId: 'event-1',
        joinedAt: new Date().toISOString(),
        user: mockUser,
      },
    ],
    orders: [],
    _count: { orders: 0 },
  },
];

export const mockOrders = [
  {
    id: 'order-1',
    userId: 'user-1',
    eventId: 'event-1',
    totalAmount: 21.98,
    paymentConfirmed: false,
    customOrder: null,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    event: mockEvents[0],
    orderItems: [
      {
        id: 'item-1',
        orderId: 'order-1',
        menuItemId: 'menu-1',
        quantity: 1,
        price: 12.99,
        menuItem: mockRestaurants[0].menuItems[0],
      },
      {
        id: 'item-2',
        orderId: 'order-1',
        menuItemId: 'menu-2',
        quantity: 1,
        price: 8.99,
        menuItem: mockRestaurants[0].menuItems[1],
      },
    ],
  },
];

export const mockStats = {
  totalOrders: 1,
  totalSpent: 21.98,
  upcomingEvents: 1,
  activeRestaurants: 2,
};

// MSW handlers
export const handlers = [
  // Auth
  http.post(`${API_URL}/auth/refresh`, () => {
    return HttpResponse.json({ data: { token: 'mock-refreshed-token' } });
  }),

  http.post(`${API_URL}/auth/login`, () => {
    return HttpResponse.json({ data: { token: 'mock-login-token', user: mockUser } });
  }),

  http.post(`${API_URL}/auth/register`, () => {
    return HttpResponse.json({ data: { token: 'mock-register-token', user: mockUser } });
  }),

  http.get(`${API_URL}/auth/me`, () => {
    return HttpResponse.json({ data: mockUser });
  }),

  http.get(`${API_URL}/users/company`, () => {
    return HttpResponse.json({ data: mockCompany });
  }),

// Theme (slug and non-slug)
http.get(`${API_URL}/theme`, () => HttpResponse.json({ data: mockTheme })),
http.get(`${API_URL}/c/:slug/theme`, () => HttpResponse.json({ data: mockTheme })),
http.options(`${API_URL}/theme`, () => new HttpResponse(null, { status: 200 })),
http.options(`${API_URL}/c/:slug/theme`, () => new HttpResponse(null, { status: 200 })),

http.put(`${API_URL}/admin/theme`, async ({ request }) => {
  const body = (await request.json()) as any;
  Object.assign(mockTheme, body);
  return HttpResponse.json({ data: mockTheme });
}),
http.put(`${API_URL}/c/:slug/admin/theme`, async ({ request }) => {
  const body = (await request.json()) as any;
  Object.assign(mockTheme, body);
  return HttpResponse.json({ data: mockTheme });
}),
http.options(`${API_URL}/admin/theme`, () => new HttpResponse(null, { status: 200 })),
http.options(`${API_URL}/c/:slug/admin/theme`, () => new HttpResponse(null, { status: 200 })),

http.post(`${API_URL}/admin/theme/cover`, () =>
  HttpResponse.json({
    data: {
      ...mockTheme,
      coverPhotoUrl: 'https://example.com/cover.webp',
      coverPhotoMeta: { width: 1400, height: 600, format: 'webp', size: 200000 },
    },
  })
),
http.post(`${API_URL}/c/:slug/admin/theme/cover`, () =>
  HttpResponse.json({
    data: {
      ...mockTheme,
      coverPhotoUrl: 'https://example.com/cover.webp',
      coverPhotoMeta: { width: 1400, height: 600, format: 'webp', size: 200000 },
    },
  })
),
http.options(`${API_URL}/admin/theme/cover`, () => new HttpResponse(null, { status: 200 })),
http.options(`${API_URL}/c/:slug/admin/theme/cover`, () => new HttpResponse(null, { status: 200 })),

  // Restaurants
  http.get(`${API_URL}/restaurants`, () => {
    return HttpResponse.json({ data: mockRestaurants });
  }),

  http.get(`${API_URL}/restaurants/:id`, ({ params }) => {
    const restaurant = mockRestaurants.find((r) => r.id === params.id);
    if (!restaurant) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({ data: restaurant });
  }),

  http.post(`${API_URL}/restaurants`, async ({ request }) => {
    const body = (await request.json()) as any;
    const newRestaurant = {
      id: `restaurant-${Date.now()}`,
      ...body,
      companyId: 'company-1',
      menuItems: [],
    };
    return HttpResponse.json({ data: newRestaurant }, { status: 201 });
  }),

  // Events
  http.get(`${API_URL}/events`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const filtered = status
      ? mockEvents.filter((e) => e.status === status)
      : mockEvents;
    return HttpResponse.json({ data: filtered });
  }),

  http.get(`${API_URL}/events/:id`, ({ params }) => {
    const event = mockEvents.find((e) => e.id === params.id);
    if (!event) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({ data: { ...event, orders: mockOrders } });
  }),

  http.post(`${API_URL}/events`, async ({ request }) => {
    const body = (await request.json()) as any;
    const newEvent = {
      id: `event-${Date.now()}`,
      ...body,
      status: 'OPEN',
      companyId: 'company-1',
      createdById: 'user-1',
      createdBy: mockUser,
      participants: [],
      orders: [],
      _count: { orders: 0 },
    };
    return HttpResponse.json({ data: newEvent }, { status: 201 });
  }),

  // Orders
  http.get(`${API_URL}/orders/me`, () => {
    return HttpResponse.json({ data: mockOrders });
  }),

  http.get(`${API_URL}/events/:eventId/orders`, () => {
    return HttpResponse.json({ data: mockOrders });
  }),

  http.post(`${API_URL}/events/:eventId/orders`, async ({ request }) => {
    const body = await request.json();
    const newOrder = {
      id: `order-${Date.now()}`,
      userId: 'user-1',
      eventId: (body as any).eventId,
      totalAmount: (body as any).totalAmount || 0,
      paymentConfirmed: false,
      customOrder: (body as any).customOrder || null,
      notes: (body as any).notes || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      orderItems: [],
    };
    return HttpResponse.json({ data: newOrder }, { status: 201 });
  }),

  http.delete(`${API_URL}/events/:eventId/orders/:orderId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // User stats
  http.get(`${API_URL}/users/me/stats`, () => {
    return HttpResponse.json({ data: mockStats });
  }),

  // Menu items
  http.get(`${API_URL}/restaurants/:restaurantId/menu-items`, () => {
    return HttpResponse.json({ data: mockRestaurants[0].menuItems });
  }),

  http.post(`${API_URL}/restaurants/:restaurantId/menu-items`, async ({ request }) => {
    const body = (await request.json()) as any;
    const newMenuItem = {
      id: `menu-${Date.now()}`,
      ...body,
      restaurantId: 'restaurant-1',
    };
    return HttpResponse.json({ data: newMenuItem }, { status: 201 });
  }),

  // Notification endpoints
  http.get(`${API_URL}/notifications`, ({ request }) => {
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const limit = Number(url.searchParams.get('limit')) || 20;
    
    const allNotifications = [
      {
        id: 'notification-1',
        type: 'EVENT_CREATED',
        userId: 'user-1',
        eventId: 'event-1',
        category: 'event_lifecycle',
        title: 'Test Admin created Team Lunch',
        body: 'Test Admin created Team Lunch at Test Restaurant',
        read: false,
        sentEmail: false,
        sentInApp: true,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        event: mockEvents[0],
        actor: { id: 'user-1', name: 'Test User' },
        subject: { eventId: 'event-1', eventTitle: 'Team Lunch', restaurantName: 'Test Restaurant' },
        cta: { kind: 'event', id: 'event-1' },
        meta: { subject: { eventId: 'event-1', eventTitle: 'Team Lunch' } },
      },
      {
        id: 'notification-2',
        type: 'USER_JOINED_EVENT',
        userId: 'user-1',
        eventId: 'event-1',
        category: 'participant_activity',
        title: 'Teammate joined Team Lunch',
        body: 'Teammate joined Team Lunch at Test Restaurant',
        read: false,
        sentEmail: false,
        sentInApp: true,
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        event: mockEvents[0],
        actor: { id: 'user-2', name: 'Test User 2' },
        subject: { eventId: 'event-1', eventTitle: 'Team Lunch', restaurantName: 'Test Restaurant' },
        cta: { kind: 'event', id: 'event-1' },
        meta: { actor: { id: 'user-2', name: 'Test User 2' } },
      },
      {
        id: 'notification-3',
        type: 'EVENT_CLOSED',
        userId: 'user-1',
        eventId: 'event-1',
        category: 'event_lifecycle',
        title: 'Event closed',
        body: 'Ordering is now closed for Team Lunch',
        read: true,
        sentEmail: true,
        sentInApp: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        event: mockEvents[0],
        subject: { eventId: 'event-1', eventTitle: 'Team Lunch', restaurantName: 'Test Restaurant' },
        cta: { kind: 'event', id: 'event-1' },
      },
    ];
    
    const filtered = unreadOnly 
      ? allNotifications.filter(n => !n.read)
      : allNotifications;
    
    return HttpResponse.json({ data: filtered.slice(0, limit) });
  }),

  http.get(`${API_URL}/notifications/stats`, () => {
    return HttpResponse.json({ 
      data: { 
        unread: 2, 
        total: 3 
      } 
    });
  }),

  http.get(`${API_URL}/notifications/analytics/summary`, () => {
    return HttpResponse.json({
      data: {
        companyId: 'company-1',
        totals: { notifications: 0, unread: 0 },
        delivery: {},
      },
    });
  }),

  http.patch(`${API_URL}/notifications/:id/read`, () => {
    return HttpResponse.json({ 
      data: { success: true } 
    });
  }),

  http.post(`${API_URL}/notifications/mark-all-read`, () => {
    return HttpResponse.json({ 
      data: { count: 2 } 
    });
  }),

  http.get(`${API_URL}/notifications/settings`, () => {
    return HttpResponse.json({ 
      data: {
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
      }
    });
  }),

  http.put(`${API_URL}/notifications/settings`, async ({ request }) => {
    const body = (await request.json()) as any;
    return HttpResponse.json({ 
      data: {
        ...body,
        id: 'settings-1',
        userId: 'user-1',
        updatedAt: new Date().toISOString(),
      }
    });
  }),
];
