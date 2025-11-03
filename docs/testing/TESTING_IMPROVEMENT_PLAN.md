# 🧪 Testing Improvement Plan - LunchSync
> **Review Update (2025-10-20):** Honeycomb exporter, realtime smoke scripts, and coverage gate restoration delivered in Phase 5.1.

## Overview

This document outlines a comprehensive, phased approach to achieving **90%+ test coverage** on the backend and **maximum coverage** on the frontend. The focus is on writing tests that validate **real user flows** and business logic, not just tests that pass.

### Current State (October 20, 2025)
- **Backend**
  - 313 automated tests (252 passing) across Phases 1–4 (auth, events, orders, notifications).
  - Phase 4 backend controllers/routes rebuilt; API adjustments archived for reference.
  - Real-time gateway broadcasting via Socket.IO + Redis; notification service dispatcher streams `notification.created` events to company/user rooms with unit coverage.
  - Delivery analytics foundation in place (`NotificationDeliveryReceipt` schema + migration) capturing per-channel latency for telemetry dashboards.

- **Frontend**
  - 612 automated tests (components, integration, accessibility, performance, stores).
  - Notification bundle at 95.97% statements / 87.09% functions; stores at 100% coverage.
  - Global function threshold restored to 75%; new realtime integration suites cover mark-all + analytics/settings flows.

- **Documentation & Tooling**
  - Active docs reduced to current efforts (Phase 4.4 completion, Phase 4.5 hardening, Phase 5 plan/progress updates).
  - Accessibility audit (automation + manual SR/HC sweep) and performance notes up to date.
  - Regression checklist maintained for notifications (polling + upcoming real-time).

### Target State
- **Backend Coverage**: ≥90% with real-time delivery and analytics suites (Phase 5+6).
- **Frontend Coverage**: ≥85% bundle-wide with real-time sockets, push, analytics dashboards.
- **Reliability Targets**: Real-time notifications under 2s p95, push opt-in ≥85% success, function threshold restored to 75% by Phase 5.2.

---

## 🎯 Core Testing Principles

### ✅ DO: Test User Behavior
```typescript
// ✅ GOOD: Tests what users actually do
it('should allow admin to create lunch event and employees to place orders', async () => {
  // Login as admin
  const adminToken = await loginAsAdmin();
  
  // Create event
  const event = await createEvent(adminToken, {
    name: 'Team Lunch',
    deadline: tomorrow
  });
  
  // Login as employee
  const userToken = await loginAsEmployee();
  
  // Place order
  const order = await placeOrder(userToken, event.id, menuItems);
  
  // Verify order appears in admin's view
  const orders = await getEventOrders(adminToken, event.id);
  expect(orders).toContainEqual(expect.objectContaining({
    userId: employee.id,
    items: menuItems
  }));
});
```

### ❌ DON'T: Test Implementation Details
```typescript
// ❌ BAD: Tests internal implementation
it('should call repository.save with correct parameters', async () => {
  const spy = jest.spyOn(repository, 'save');
  await service.createEvent(data);
  expect(spy).toHaveBeenCalledWith(expect.objectContaining(data));
});
```

### Key Rules
1. **Test from user's perspective** - What would a user do?
2. **Test business logic** - Does it follow requirements?
3. **Test edge cases** - What could go wrong?
4. **Test security** - Can users access what they shouldn't?
5. **Test data integrity** - Is data saved correctly?
6. **Don't mock what you're testing** - Only mock external dependencies
7. **Test the contract, not the implementation** - API responses, not internal methods

---

## 📋 Implementation Phases

### Phase Status Overview (October 16, 2025)
| Phase | Focus | Status | Notes |
| --- | --- | --- | --- |
| Phase 0 | Test infrastructure & tooling | ✅ Complete | Backend + frontend harnesses established. |
| Phase 1 | Core API integration suites | ✅ Complete | Auth, events, orders coverage archived. |
| Phase 2 | Advanced business logic | ✅ Complete | Edge-case suites in place. |
| Phase 3 | Frontend component testing | ✅ Complete | Events/Orders UI suites delivered. |
| Phase 4 | Notification system automation | ✅ Complete | 60 notification-focused tests + docs. |
| Phase 4.5 | Accessibility & performance hardening | ✅ Complete | Manual SR/HC sweep logged Oct 18. |
| Phase 5 | Real-time notifications & engagement | 🔄 Planning | WebSocket, push, analytics roadmap defined. |
| Phase 6 | Load, performance, security | ⏳ Pending | To be scheduled post Phase 5 delivery. |

### Phase 0: Preparation & Setup (2-3 hours)
**Goal**: Set up testing infrastructure and documentation

#### 0.1 Backend Test Infrastructure
**Tasks**:
- [ ] Create test database configuration
- [ ] Set up test data factories/fixtures
- [ ] Create test helpers and utilities
- [ ] Configure coverage thresholds in Jest
- [ ] Set up test database seeding

**Files to Create**:
```
backend/
├── src/test/
│   ├── setup.ts              # Global test setup
│   ├── helpers/
│   │   ├── auth.helper.ts    # Login helpers
│   │   ├── db.helper.ts      # Database utilities
│   │   └── request.helper.ts # API request helpers
│   ├── factories/
│   │   ├── user.factory.ts   # User test data
│   │   ├── event.factory.ts  # Event test data
│   │   ├── order.factory.ts  # Order test data
│   │   └── restaurant.factory.ts
│   └── fixtures/
│       ├── users.ts          # Predefined test users
│       ├── companies.ts      # Test companies
│       └── restaurants.ts    # Test restaurants
```

**Configuration**:
```typescript
// jest.config.js - Update coverage thresholds
module.exports = {
  // ... existing config
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 90,
      statements: 90
    }
  },
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.integration.test.ts'
  ]
};
```

#### 0.2 Frontend Test Infrastructure
**Tasks**:
- [ ] Set up MSW (Mock Service Worker) for API mocking
- [ ] Create test data factories
- [ ] Set up React Router test wrapper
- [ ] Configure coverage thresholds in Vitest
- [ ] Create custom render functions

**Files to Create**:
```
frontend/
├── src/test/
│   ├── setup.ts              # Global test setup
│   ├── mocks/
│   │   ├── handlers.ts       # MSW handlers
│   │   └── server.ts         # MSW server setup
│   ├── utils/
│   │   ├── render.tsx        # Custom render with providers
│   │   ├── user.ts           # User interaction utilities
│   │   └── wait.ts           # Async utilities
│   ├── factories/
│   │   ├── user.ts           # User test data
│   │   ├── event.ts          # Event test data
│   │   └── order.ts          # Order test data
│   └── fixtures/
│       └── api-responses.ts  # Mock API responses
```

**Configuration**:
```typescript
// vitest.config.ts - Update coverage
export default defineConfig({
  test: {
    // ... existing config
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/node_modules/**', '**/test/**'],
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
});
```

---

### Phase 1: Backend - Core User Flows (8-12 hours)
**Priority**: HIGH | **Target Coverage**: 60%

#### 1.1 Authentication & Authorization (2 hours)
**User Flows to Test**:

1. **Company Registration Flow**
   - New company signs up
   - Admin account is created
   - JWT token is issued
   - Company is isolated from others

2. **User Login Flow**
   - Valid credentials → success
   - Invalid credentials → error
   - Inactive account → error
   - Token expiry → refresh flow

3. **Role-Based Access**
   - Admin can access admin endpoints
   - Employee cannot access admin endpoints
   - User can only see their company's data

**Test File**: `backend/src/modules/auth/__tests__/auth.integration.test.ts`

```typescript
describe('Authentication User Flows', () => {
  describe('Company Registration & First Login', () => {
    it('should register new company and create admin account', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          companyName: 'Acme Corp',
          email: 'admin@acme.com',
          password: 'SecurePass123!',
          name: 'John Doe'
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        user: {
          email: 'admin@acme.com',
          name: 'John Doe',
          role: 'ADMIN'
        },
        token: expect.any(String)
      });

      // Verify admin can login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@acme.com',
          password: 'SecurePass123!'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.token).toBeDefined();
    });

    it('should isolate companies from each other', async () => {
      // Create two companies
      const company1 = await createCompanyWithAdmin('Company 1', 'admin1@c1.com');
      const company2 = await createCompanyWithAdmin('Company 2', 'admin2@c2.com');

      // Company 1 admin tries to access Company 2 data
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${company2.token}`);

      const users = response.body;
      
      // Should only see Company 2 users
      expect(users).not.toContainEqual(
        expect.objectContaining({ companyId: company1.companyId })
      );
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow admin to create users but deny employees', async () => {
      const { admin, employee } = await setupCompanyWithUsers();

      // Admin should succeed
      const adminResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          email: 'newuser@company.com',
          name: 'New User',
          role: 'EMPLOYEE'
        });

      expect(adminResponse.status).toBe(201);

      // Employee should fail
      const employeeResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${employee.token}`)
        .send({
          email: 'another@company.com',
          name: 'Another User',
          role: 'EMPLOYEE'
        });

      expect(employeeResponse.status).toBe(403);
    });
  });
});
```

#### 1.2 Event Management Flow (3 hours)
**User Flows to Test**:

1. **Event Lifecycle**
   - Admin creates event (PLANNING)
   - Admin adds restaurants
   - Admin opens event (OPEN)
   - Employees join (RSVP)
   - Deadline passes → auto-close
   - Admin closes event manually

2. **Event Permissions**
   - Admin can create/edit/delete
   - Employee can view/RSVP only
   - Cannot edit past deadline

3. **Event Business Rules**
   - Cannot order from closed event
   - Cannot edit after deadline
   - Deadline must be in future
   - Must have at least one restaurant

**Test File**: `backend/src/modules/events/__tests__/events.integration.test.ts`

```typescript
describe('Event Management User Flows', () => {
  describe('Complete Event Lifecycle', () => {
    it('should handle full event flow from creation to closure', async () => {
      const { admin, employee1, employee2 } = await setupCompanyWithUsers();
      const restaurant = await createRestaurant(admin.token);

      // Step 1: Admin creates event
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          name: 'Friday Team Lunch',
          description: 'Weekly team lunch',
          restaurantIds: [restaurant.id],
          orderDeadline: addHours(new Date(), 24),
          deliveryTime: addHours(new Date(), 26)
        });

      expect(eventResponse.status).toBe(201);
      const event = eventResponse.body;
      expect(event.status).toBe('PLANNING');

      // Step 2: Admin opens event
      await request(app)
        .patch(`/api/events/${event.id}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ status: 'OPEN' });

      // Step 3: Employees RSVP
      const rsvp1 = await request(app)
        .post(`/api/events/${event.id}/rsvp`)
        .set('Authorization', `Bearer ${employee1.token}`);
      
      const rsvp2 = await request(app)
        .post(`/api/events/${event.id}/rsvp`)
        .set('Authorization', `Bearer ${employee2.token}`);

      expect(rsvp1.status).toBe(200);
      expect(rsvp2.status).toBe(200);

      // Step 4: Verify participants
      const participantsResponse = await request(app)
        .get(`/api/events/${event.id}`)
        .set('Authorization', `Bearer ${admin.token}`);

      expect(participantsResponse.body.participants).toHaveLength(2);

      // Step 5: Admin closes event
      const closeResponse = await request(app)
        .patch(`/api/events/${event.id}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ status: 'CLOSED' });

      expect(closeResponse.status).toBe(200);
      expect(closeResponse.body.status).toBe('CLOSED');
    });

    it('should prevent orders after deadline', async () => {
      const { admin, employee } = await setupCompanyWithUsers();
      const restaurant = await createRestaurant(admin.token);
      
      // Create event with past deadline
      const event = await createEvent(admin.token, {
        orderDeadline: addMinutes(new Date(), -10) // 10 minutes ago
      });

      // Try to place order
      const orderResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${employee.token}`)
        .send({
          eventId: event.id,
          restaurantId: restaurant.id,
          items: [{ menuItemId: 1, quantity: 1 }]
        });

      expect(orderResponse.status).toBe(400);
      expect(orderResponse.body.message).toContain('deadline');
    });
  });

  describe('Event Permissions', () => {
    it('should prevent employees from creating events', async () => {
      const { employee } = await setupCompanyWithUsers();

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${employee.token}`)
        .send({
          name: 'Unauthorized Event',
          orderDeadline: addHours(new Date(), 24)
        });

      expect(response.status).toBe(403);
    });

    it('should allow admin to cancel event and notify participants', async () => {
      const { admin, employee } = await setupCompanyWithUsers();
      const event = await createEventWithParticipants(admin.token, [employee.id]);

      const response = await request(app)
        .patch(`/api/events/${event.id}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ status: 'CANCELLED' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('CANCELLED');
      
      // Verify employee sees cancelled event
      const employeeView = await request(app)
        .get(`/api/events/${event.id}`)
        .set('Authorization', `Bearer ${employee.token}`);

      expect(employeeView.body.status).toBe('CANCELLED');
    });
  });
});
```

#### 1.3 Order Management Flow (3 hours)
**User Flows to Test**:

1. **Order Placement**
   - Employee browses menu
   - Adds items to order
   - Submits order
   - Receives confirmation

2. **Order Modifications**
   - Edit order before deadline
   - Cannot edit after deadline
   - Cancel order before deadline

3. **Order Restrictions**
   - Can only order from event restaurants
   - Cannot exceed event deadline
   - One order per user per event

4. **Order Summary (Admin)**
   - View all orders for event
   - Group by restaurant
   - Calculate totals

**Test File**: `backend/src/modules/orders/__tests__/orders.integration.test.ts`

```typescript
describe('Order Management User Flows', () => {
  describe('Complete Order Flow', () => {
    it('should handle order placement, modification, and cancellation', async () => {
      const { admin, employee } = await setupCompanyWithUsers();
      const { event, restaurant, menuItems } = await setupEventWithMenu(admin.token);

      // Step 1: Place order
      const orderResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${employee.token}`)
        .send({
          eventId: event.id,
          restaurantId: restaurant.id,
          items: [
            { menuItemId: menuItems[0].id, quantity: 2, notes: 'No onions' },
            { menuItemId: menuItems[1].id, quantity: 1 }
          ],
          specialInstructions: 'Please deliver to building A'
        });

      expect(orderResponse.status).toBe(201);
      const order = orderResponse.body;
      expect(order.items).toHaveLength(2);
      expect(order.totalAmount).toBeGreaterThan(0);

      // Step 2: Modify order
      const updateResponse = await request(app)
        .put(`/api/orders/${order.id}`)
        .set('Authorization', `Bearer ${employee.token}`)
        .send({
          items: [
            { menuItemId: menuItems[0].id, quantity: 1 } // Reduced quantity
          ]
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.items).toHaveLength(1);
      expect(updateResponse.body.totalAmount).toBeLessThan(order.totalAmount);

      // Step 3: Cancel order
      const cancelResponse = await request(app)
        .delete(`/api/orders/${order.id}`)
        .set('Authorization', `Bearer ${employee.token}`);

      expect(cancelResponse.status).toBe(200);

      // Step 4: Verify order is cancelled
      const checkResponse = await request(app)
        .get(`/api/orders/${order.id}`)
        .set('Authorization', `Bearer ${employee.token}`);

      expect(checkResponse.body.status).toBe('CANCELLED');
    });

    it('should enforce one order per user per event', async () => {
      const { employee } = await setupCompanyWithUsers();
      const { event, restaurant, menuItems } = await setupEventWithMenu();

      // Place first order
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${employee.token}`)
        .send({
          eventId: event.id,
          restaurantId: restaurant.id,
          items: [{ menuItemId: menuItems[0].id, quantity: 1 }]
        });

      // Try to place second order
      const secondOrder = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${employee.token}`)
        .send({
          eventId: event.id,
          restaurantId: restaurant.id,
          items: [{ menuItemId: menuItems[1].id, quantity: 1 }]
        });

      expect(secondOrder.status).toBe(400);
      expect(secondOrder.body.message).toContain('already placed');
    });
  });

  describe('Admin Order Summary', () => {
    it('should provide admin with complete order summary', async () => {
      const { admin, employees } = await setupCompanyWithUsers({ employeeCount: 5 });
      const { event, restaurant, menuItems } = await setupEventWithMenu(admin.token);

      // Multiple employees place orders
      for (const employee of employees) {
        await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${employee.token}`)
          .send({
            eventId: event.id,
            restaurantId: restaurant.id,
            items: [
              { menuItemId: menuItems[0].id, quantity: 1 }
            ]
          });
      }

      // Admin gets summary
      const summaryResponse = await request(app)
        .get(`/api/events/${event.id}/orders`)
        .set('Authorization', `Bearer ${admin.token}`);

      expect(summaryResponse.status).toBe(200);
      expect(summaryResponse.body.orders).toHaveLength(5);
      expect(summaryResponse.body.summary).toMatchObject({
        totalOrders: 5,
        totalAmount: expect.any(Number),
        ordersByRestaurant: expect.any(Object)
      });
    });
  });
});
```

#### 1.4 Restaurant & Menu Management (2 hours)
**User Flows to Test**:

1. **Restaurant Management**
   - Admin creates restaurant
   - Admin updates restaurant details
   - Admin activates/deactivates restaurant

2. **Menu Management**
   - Admin adds menu items
   - Admin updates prices
   - Admin sets availability
   - Admin organizes categories

**Test File**: `backend/src/modules/restaurants/__tests__/restaurants.integration.test.ts`

```typescript
describe('Restaurant & Menu Management', () => {
  describe('Restaurant Lifecycle', () => {
    it('should handle complete restaurant setup with menu', async () => {
      const { admin } = await setupCompanyWithUsers();

      // Create restaurant
      const restaurant = await request(app)
        .post('/api/restaurants')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          name: 'Tasty Bites',
          cuisine: 'Italian',
          phone: '555-0100',
          address: '123 Main St'
        });

      expect(restaurant.status).toBe(201);

      // Add menu categories
      const categoryResponse = await request(app)
        .post(`/api/restaurants/${restaurant.body.id}/menu/categories`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          name: 'Main Courses',
          displayOrder: 1
        });

      // Add menu items
      const itemResponse = await request(app)
        .post(`/api/restaurants/${restaurant.body.id}/menu/items`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          name: 'Margherita Pizza',
          description: 'Classic tomato and mozzarella',
          price: 12.99,
          categoryId: categoryResponse.body.id,
          dietary: ['VEGETARIAN'],
          available: true
        });

      expect(itemResponse.status).toBe(201);

      // Verify menu structure
      const menuResponse = await request(app)
        .get(`/api/restaurants/${restaurant.body.id}/menu`)
        .set('Authorization', `Bearer ${admin.token}`);

      expect(menuResponse.body.categories).toHaveLength(1);
      expect(menuResponse.body.categories[0].items).toHaveLength(1);
    });
  });
});
```

#### 1.5 User Management (2 hours)
**User Flows to Test**:

1. **User CRUD**
   - Admin creates employees
   - Admin updates user roles
   - Admin deactivates users
   - Users update their profiles

2. **User Permissions**
   - User can update own profile
   - User cannot update other profiles
   - Admin can manage all users in company

**Test File**: `backend/src/modules/users/__tests__/users.integration.test.ts`

---

### Phase 2: Backend - Edge Cases & Error Handling (4-6 hours)
**Priority**: HIGH | **Target Coverage**: 80%

#### 2.1 Validation Edge Cases
**Test Scenarios**:
- Invalid input formats
- Missing required fields
- Out-of-range values
- SQL injection attempts
- XSS attempts

**Test File**: `backend/src/modules/__tests__/validation.test.ts`

```typescript
describe('Input Validation & Security', () => {
  it('should reject SQL injection attempts', async () => {
    const { employee } = await setupCompanyWithUsers();

    const response = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${employee.token}`)
      .send({
        name: "'; DROP TABLE events; --",
        orderDeadline: addHours(new Date(), 24)
      });

    expect(response.status).toBe(403); // Or 400 depending on implementation
  });

  it('should sanitize XSS attempts in event descriptions', async () => {
    const { admin } = await setupCompanyWithUsers();

    const response = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        name: 'Test Event',
        description: '<script>alert("XSS")</script>',
        orderDeadline: addHours(new Date(), 24)
      });

    expect(response.status).toBe(201);
    expect(response.body.description).not.toContain('<script>');
  });
});
```

#### 2.2 Concurrency & Race Conditions
**Test Scenarios**:
- Multiple users placing orders simultaneously
- Event deadline reached during order placement
- Stock/availability updates during ordering

#### 2.3 Error Recovery
**Test Scenarios**:
- Database connection failures
- Transaction rollbacks
- Partial update failures

---

### Phase 3: Backend - Performance & Security (2-4 hours)
**Priority**: MEDIUM | **Target Coverage**: 90%+

#### 3.1 Performance Tests
- Bulk order processing
- Large dataset queries
- N+1 query prevention

#### 3.2 Security Tests
- Authentication bypass attempts
- Authorization violations
- Token manipulation
- Company isolation breaches

---

### Phase 4: Frontend - Component Tests (6-8 hours)
**Priority**: HIGH | **Target Coverage**: 50%

#### 4.1 Test Infrastructure Setup
**Files to Create**:
```typescript
// frontend/src/test/utils/render.tsx
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';

export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions & {
    initialAuth?: { user: User; token: string } | null;
  }
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <AuthProvider initialAuth={options?.initialAuth}>
        {children}
      </AuthProvider>
    </BrowserRouter>
  );

  return render(ui, { wrapper: Wrapper, ...options });
}
```

#### 4.2 Form Components
**Components to Test**:
- Login form
- Event creation form
- Order form
- Menu item form

**Focus Areas**:
- Form validation
- Error display
- Submit handling
- Loading states

**Example Test**: `frontend/src/test/components/LoginForm.test.tsx`

```typescript
describe('LoginForm', () => {
  it('should handle complete login flow', async () => {
    const user = userEvent.setup();
    const mockLogin = vi.fn();

    renderWithProviders(<Login />, {
      mocks: {
        '/api/auth/login': {
          POST: { user: mockUser, token: 'test-token' }
        }
      }
    });

    // Fill form
    await user.type(screen.getByLabelText(/email/i), 'user@test.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    
    // Submit
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Verify redirect or success
    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
    });
  });

  it('should display validation errors for invalid input', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    // Try to submit empty form
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Check for validation messages
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });

  it('should display server error when login fails', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<Login />, {
      mocks: {
        '/api/auth/login': {
          POST: {
            status: 401,
            body: { message: 'Invalid credentials' }
          }
        }
      }
    });

    await user.type(screen.getByLabelText(/email/i), 'user@test.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });
});
```

#### 4.3 List Components
- Event list with filtering
- Order history
- Restaurant list
- Menu items list

#### 4.4 Modal/Dialog Components
- Event details modal
- Order details modal
- Confirmation dialogs

---

### Phase 5: Frontend - Integration & User Flows (8-10 hours)
**Priority**: HIGH | **Target Coverage**: 75%

#### 5.1 Authentication Flow
**Test File**: `frontend/src/test/flows/authentication.test.tsx`

```typescript
describe('Authentication User Flow', () => {
  it('should handle complete registration and first login', async () => {
    const user = userEvent.setup();
    
    // Setup MSW handlers
    const { result } = setupMockAPI({
      '/api/auth/register': { POST: mockSuccessResponse },
      '/api/auth/login': { POST: mockLoginResponse }
    });

    // Navigate to register
    renderWithProviders(<App />, { route: '/register' });

    // Fill registration form
    await user.type(screen.getByLabelText(/company name/i), 'Acme Corp');
    await user.type(screen.getByLabelText(/your name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@acme.com');
    await user.type(screen.getByLabelText(/password/i), 'SecurePass123!');
    
    // Submit
    await user.click(screen.getByRole('button', { name: /create account/i }));

    // Should redirect to dashboard
    await waitFor(() => {
      expect(screen.getByText(/welcome to lunchsync/i)).toBeInTheDocument();
    });

    // Verify user is logged in
    expect(screen.getByText(/john doe/i)).toBeInTheDocument();
  });
});
```

#### 5.2 Event Management Flow (Admin)
- Create event
- Add restaurants
- Open event
- View participants
- View orders
- Close event

#### 5.3 Order Placement Flow (Employee)
- Browse events
- RSVP to event
- Browse menu
- Add items to order
- Submit order
- View order confirmation

#### 5.4 Order Management Flow (Employee)
- View order history
- View order details
- Edit order (before deadline)
- Cancel order

---

### Phase 6: Frontend - Accessibility & Edge Cases (4-6 hours)
**Priority**: MEDIUM | **Target Coverage**: 80%+

#### 6.1 Accessibility Tests
```typescript
describe('Accessibility', () => {
  it('should have no accessibility violations on login page', async () => {
    const { container } = renderWithProviders(<Login />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should support keyboard navigation through order form', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OrderForm />);

    // Tab through form
    await user.tab();
    expect(screen.getByLabelText(/menu item/i)).toHaveFocus();
    
    await user.tab();
    expect(screen.getByLabelText(/quantity/i)).toHaveFocus();
    
    await user.tab();
    expect(screen.getByLabelText(/notes/i)).toHaveFocus();
  });
});
```

#### 6.2 Error State Tests
- Network errors
- 404 errors
- 500 errors
- Timeout errors

#### 6.3 Loading State Tests
- Skeleton loading
- Spinner states
- Disabled states during submission

---

## 📁 File Structure

### Backend Test Structure
```
backend/
├── src/
│   ├── test/
│   │   ├── setup.ts
│   │   ├── helpers/
│   │   │   ├── auth.helper.ts
│   │   │   ├── db.helper.ts
│   │   │   └── request.helper.ts
│   │   ├── factories/
│   │   │   ├── user.factory.ts
│   │   │   ├── event.factory.ts
│   │   │   ├── order.factory.ts
│   │   │   └── restaurant.factory.ts
│   │   └── fixtures/
│   │       ├── users.ts
│   │       ├── companies.ts
│   │       └── restaurants.ts
│   └── modules/
│       ├── auth/__tests__/
│       │   ├── auth.controller.test.ts          # Unit tests
│       │   └── auth.integration.test.ts          # Integration tests
│       ├── events/__tests__/
│       │   ├── events.controller.test.ts
│       │   ├── events.integration.test.ts
│       │   └── events.edge-cases.test.ts
│       ├── orders/__tests__/
│       │   ├── orders.controller.test.ts
│       │   ├── orders.integration.test.ts
│       │   └── orders.concurrency.test.ts
│       ├── restaurants/__tests__/
│       │   ├── restaurants.controller.test.ts
│       │   └── restaurants.integration.test.ts
│       └── users/__tests__/
│           ├── users.controller.test.ts
│           └── users.integration.test.ts
```

### Frontend Test Structure
```
frontend/
├── src/
│   ├── test/
│   │   ├── setup.ts
│   │   ├── mocks/
│   │   │   ├── handlers.ts
│   │   │   └── server.ts
│   │   ├── utils/
│   │   │   ├── render.tsx
│   │   │   ├── user.ts
│   │   │   └── wait.ts
│   │   ├── factories/
│   │   │   ├── user.ts
│   │   │   ├── event.ts
│   │   │   └── order.ts
│   │   ├── fixtures/
│   │   │   └── api-responses.ts
│   │   ├── components/
│   │   │   ├── Button.test.tsx
│   │   │   ├── LoginForm.test.tsx
│   │   │   ├── EventList.test.tsx
│   │   │   └── OrderForm.test.tsx
│   │   ├── pages/
│   │   │   ├── Login.test.tsx
│   │   │   ├── Dashboard.test.tsx
│   │   │   ├── Events.test.tsx
│   │   │   └── Orders.test.tsx
│   │   └── flows/
│   │       ├── authentication.test.tsx
│   │       ├── event-management.test.tsx
│   │       ├── order-placement.test.tsx
│   │       └── order-management.test.tsx
```

---

## 🎯 Testing Checklist

### For Each Feature
- [ ] Happy path test
- [ ] Error cases
- [ ] Edge cases
- [ ] Permission tests
- [ ] Data validation
- [ ] Isolation (company/tenant)

### For Each User Role
- [ ] Admin workflows
- [ ] Employee workflows
- [ ] Unauthorized access attempts

### For Each API Endpoint
- [ ] Valid request → 200/201
- [ ] Invalid request → 400
- [ ] Unauthorized → 401
- [ ] Forbidden → 403
- [ ] Not found → 404

---

## 🚀 Implementation Guidelines

### Backend Testing

#### DO ✅
```typescript
// Test the full request-response cycle
it('should create event and return event object', async () => {
  const response = await request(app)
    .post('/api/events')
    .set('Authorization', `Bearer ${token}`)
    .send(eventData);

  expect(response.status).toBe(201);
  expect(response.body).toMatchObject({
    id: expect.any(Number),
    name: eventData.name,
    status: 'PLANNING'
  });

  // Verify data was saved
  const savedEvent = await Event.findByPk(response.body.id);
  expect(savedEvent).toBeDefined();
});
```

#### DON'T ❌
```typescript
// Don't test internal implementation
it('should call repository save method', async () => {
  const spy = jest.spyOn(repository, 'save');
  await controller.createEvent(req, res);
  expect(spy).toHaveBeenCalled();
});
```

### Frontend Testing

#### DO ✅
```typescript
// Test user interactions
it('should submit order when user clicks submit', async () => {
  const user = userEvent.setup();
  renderWithProviders(<OrderForm />);

  // User actions
  await user.selectOptions(screen.getByLabelText(/menu item/i), '1');
  await user.type(screen.getByLabelText(/quantity/i), '2');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  // Verify outcome
  await waitFor(() => {
    expect(screen.getByText(/order submitted/i)).toBeInTheDocument();
  });
});
```

#### DON'T ❌
```typescript
// Don't test implementation details
it('should call handleSubmit when form is submitted', () => {
  const handleSubmit = vi.fn();
  render(<OrderForm onSubmit={handleSubmit} />);
  fireEvent.submit(screen.getByRole('form'));
  expect(handleSubmit).toHaveBeenCalled();
});
```

---

## 📊 Success Metrics

### Coverage Targets
- **Backend**: 90%+ overall
  - Controllers: 95%+
  - Services: 90%+
  - Middleware: 85%+
  - Utilities: 95%+

- **Frontend**: 80%+ overall
  - Components: 85%+
  - Pages: 75%+
  - Hooks: 80%+
  - Utilities: 90%+

### Quality Metrics
- All tests pass ✅
- No flaky tests
- Fast test execution (< 30s backend, < 10s frontend)
- Clear test descriptions
- Comprehensive error messages

---

## 🔧 Tools & Libraries

### Backend
- **Jest**: Test framework
- **Supertest**: HTTP assertions
- **Faker**: Test data generation
- **Factory-bot**: Data factories

### Frontend
- **Vitest**: Test framework
- **React Testing Library**: Component testing
- **MSW**: API mocking
- **user-event**: User interaction simulation
- **jest-axe**: Accessibility testing

---

## 📚 Resources

- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Jest Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Backend Testing Guide](https://testingjavascript.com)
- [Frontend Testing Patterns](https://reactjs.org/docs/testing.html)

---

## 🎯 Next Steps

1. **Review this plan** with the team
2. **Start with Phase 0** (infrastructure setup)
3. **Implement Phase 1** (backend core flows)
4. **Run tests frequently** and fix failures immediately
5. **Review coverage** after each phase
6. **Iterate and improve** based on findings

---

*Remember: Write tests for user behavior, not implementation details. Tests should give you confidence that the application works correctly for real users.*
