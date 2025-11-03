# 🧪 Testing Quick Reference Guide
> **Review Update (2025-10-20):** Realtime smoke/benchmark scripts landed; Honeycomb exporter logging telemetry metrics.

## Overview
Quick reference for writing tests in LunchSync. Use this as a cheat sheet while implementing tests from the [TESTING_IMPROVEMENT_PLAN.md](./TESTING_IMPROVEMENT_PLAN.md).

---

## 🏃 Quick Commands

| Purpose | Command |
| --- | --- |
| Run full frontend coverage (jsdom + V8) | `npm run test:coverage` |
| Notification component suites | `npm test -- --run --pool=vmThreads src/test/components/notifications/*.test.tsx` |
| Notification integration workflow | `npm test -- --run --pool=vmThreads src/test/integration/notification-workflow.test.tsx` |
| Accessibility smoke suite | `npm test -- --run --pool=vmThreads src/test/accessibility/notifications-a11y.test.tsx` |
| Performance benchmarks | `npm test -- --run --pool=vmThreads src/test/performance/*.test.tsx` |
| Store regression suites | `npm test -- --run --pool=vmThreads src/store/__tests__/*.test.ts` |
| Phase 5 realtime harness (frontend) | `npm run test:realtime` *(MSW socket + React Query perf suites)* |
| Phase 5 realtime backend tests | `npm run test:realtime` *(socket.io-client smoke + handshake resolver)* |
| Realtime latency comparison helper | `npm run test:realtime:perf` *(sequential perf + SLA checks)* |

---

## 🎯 Testing Philosophy

### Golden Rules
1. **Test behavior, not implementation**
2. **Test from the user's perspective**
3. **Test should fail when behavior changes**
4. **One test = one scenario**
5. **Arrange, Act, Assert pattern**

---

## 🔨 Backend Testing Patterns

### Pattern 1: API Integration Test
```typescript
describe('Feature Name', () => {
  let adminToken: string;
  let employeeToken: string;
  let companyId: number;

  beforeEach(async () => {
    // Setup: Create test data
    const setup = await setupCompanyWithUsers();
    adminToken = setup.admin.token;
    employeeToken = setup.employee.token;
    companyId = setup.companyId;
  });

  afterEach(async () => {
    // Cleanup: Remove test data
    await cleanupTestData(companyId);
  });

  it('should do X when Y happens', async () => {
    // Arrange: Setup specific test data
    const testData = { /* ... */ };

    // Act: Make API request
    const response = await request(app)
      .post('/api/endpoint')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(testData);

    // Assert: Verify response
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: expect.any(Number),
      // ... expected fields
    });

    // Assert: Verify side effects
    const saved = await Model.findByPk(response.body.id);
    expect(saved).toBeDefined();
  });
});
```

### Pattern 2: Permission Test
```typescript
describe('Authorization', () => {
  it('should allow admin but deny employee', async () => {
    const { admin, employee } = await setupCompanyWithUsers();

    // Admin succeeds
    const adminResponse = await request(app)
      .post('/api/admin-only-endpoint')
      .set('Authorization', `Bearer ${admin.token}`)
      .send(data);
    expect(adminResponse.status).toBe(201);

    // Employee fails
    const employeeResponse = await request(app)
      .post('/api/admin-only-endpoint')
      .set('Authorization', `Bearer ${employee.token}`)
      .send(data);
    expect(employeeResponse.status).toBe(403);
  });
});
```

### Pattern 3: Data Isolation Test
```typescript
it('should isolate data between companies', async () => {
  // Create two separate companies
  const company1 = await setupCompanyWithUsers();
  const company2 = await setupCompanyWithUsers();

  // Company 1 creates data
  const c1Data = await createEventAs(company1.admin);

  // Company 2 tries to access Company 1's data
  const response = await request(app)
    .get(`/api/events/${c1Data.id}`)
    .set('Authorization', `Bearer ${company2.admin.token}`);

  expect(response.status).toBe(404); // Or 403
});
```

### Pattern 4: Edge Case Test
```typescript
describe('Edge Cases', () => {
  it('should handle deadline exactly at current time', async () => {
    const now = new Date();
    const event = await createEvent({
      orderDeadline: now
    });

    const response = await placeOrder(event.id);
    
    // Define expected behavior
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('deadline');
  });

  it('should handle empty order items array', async () => {
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        eventId: 1,
        items: [] // Empty array
      });

    expect(response.status).toBe(400);
    expect(response.body.errors).toContainEqual(
      expect.objectContaining({
        field: 'items',
        message: expect.stringContaining('at least one')
      })
    );
  });
});
```

---

## 🎨 Frontend Testing Patterns

### Pattern 1: Component Render Test
```typescript
import { renderWithProviders } from '@/test/utils/render';
import { screen } from '@testing-library/react';

describe('ComponentName', () => {
  it('should render with correct content', () => {
    renderWithProviders(<ComponentName title="Test" />);
    
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

### Pattern 2: User Interaction Test
```typescript
import userEvent from '@testing-library/user-event';

it('should submit form when user clicks submit', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  
  renderWithProviders(<Form onSubmit={onSubmit} />);

  // User types
  await user.type(screen.getByLabelText(/name/i), 'John Doe');
  await user.type(screen.getByLabelText(/email/i), 'john@test.com');

  // User clicks
  await user.click(screen.getByRole('button', { name: /submit/i }));

  // Verify
  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@test.com'
    });
  });
});
```

### Pattern 3: API Integration Test
```typescript
import { server, http, HttpResponse } from '@/test/mocks/server';

it('should display data from API', async () => {
  // Setup mock response
  server.use(
    http.get('/api/events', () => {
      return HttpResponse.json({
        events: [
          { id: 1, name: 'Team Lunch' },
          { id: 2, name: 'Friday Pizza' }
        ]
      });
    })
  );

  renderWithProviders(<EventList />);

  // Wait for data to load
  expect(await screen.findByText('Team Lunch')).toBeInTheDocument();
  expect(screen.getByText('Friday Pizza')).toBeInTheDocument();
});
```

### Pattern 4: Error Handling Test
```typescript
it('should display error when API fails', async () => {
  // Setup error response
  server.use(
    http.get('/api/events', () => {
      return HttpResponse.json(
        { message: 'Server error' },
        { status: 500 }
      );
    })
  );

  renderWithProviders(<EventList />);

  // Verify error is displayed
  expect(await screen.findByText(/server error/i)).toBeInTheDocument();
  expect(screen.queryByText('Team Lunch')).not.toBeInTheDocument();
});
```

### Pattern 5: Loading State Test
```typescript
it('should show loading state while fetching', async () => {
  // Setup delayed response
  server.use(
    http.get('/api/events', async () => {
      await delay(100);
      return HttpResponse.json({ events: [] });
    })
  );

  renderWithProviders(<EventList />);

  // Loading should be visible
  expect(screen.getByText(/loading/i)).toBeInTheDocument();

  // Wait for loading to finish
  await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));

  // Content should be visible
  expect(screen.getByText(/no events/i)).toBeInTheDocument();
});
```

### Pattern 6: Form Validation Test
```typescript
it('should display validation errors', async () => {
  const user = userEvent.setup();
  renderWithProviders(<LoginForm />);

  // Submit empty form
  await user.click(screen.getByRole('button', { name: /submit/i }));

  // Check for errors
  expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
  expect(screen.getByText(/password is required/i)).toBeInTheDocument();
});
```

### Pattern 7: Accessibility Test
```typescript
import { axe } from 'jest-axe';

it('should have no accessibility violations', async () => {
  const { container } = renderWithProviders(<Component />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

it('should support keyboard navigation', async () => {
  const user = userEvent.setup();
  renderWithProviders(<Form />);

  // Tab through elements
  await user.tab();
  expect(screen.getByLabelText(/email/i)).toHaveFocus();

  await user.tab();
  expect(screen.getByLabelText(/password/i)).toHaveFocus();

  // Submit with Enter
  await user.keyboard('{Enter}');
  expect(mockSubmit).toHaveBeenCalled();
});
```

---

## 📚 Common Test Helpers

### Backend Helpers

```typescript
// src/test/helpers/auth.helper.ts
export async function setupCompanyWithUsers(options = {}) {
  const company = await createCompany('Test Company');
  const admin = await createUser(company.id, 'ADMIN');
  const employee = await createUser(company.id, 'EMPLOYEE');

  return {
    companyId: company.id,
    admin: {
      id: admin.id,
      token: generateToken(admin)
    },
    employee: {
      id: employee.id,
      token: generateToken(employee)
    }
  };
}

export async function createEventAs(token: string, data = {}) {
  const response = await request(app)
    .post('/api/events')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Test Event',
      orderDeadline: addHours(new Date(), 24),
      ...data
    });
  return response.body;
}
```

### Frontend Helpers

```typescript
// src/test/utils/render.tsx
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';

export function renderWithProviders(
  ui: React.ReactElement,
  options = {}
) {
  const Wrapper = ({ children }) => (
    <BrowserRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BrowserRouter>
  );

  return render(ui, { wrapper: Wrapper, ...options });
}

// src/test/utils/user.ts
export const mockAdmin = {
  id: 1,
  email: 'admin@test.com',
  name: 'Admin User',
  role: 'ADMIN'
};

export const mockEmployee = {
  id: 2,
  email: 'employee@test.com',
  name: 'Employee User',
  role: 'EMPLOYEE'
};
```

---

## 🎯 Query Selectors Priority (Frontend)

Use queries in this order:

1. **getByRole** (Best - most accessible)
```typescript
screen.getByRole('button', { name: /submit/i })
screen.getByRole('textbox', { name: /email/i })
```

2. **getByLabelText** (Forms)
```typescript
screen.getByLabelText(/email/i)
screen.getByLabelText(/password/i)
```

3. **getByPlaceholderText** (Fallback for inputs)
```typescript
screen.getByPlaceholderText(/enter email/i)
```

4. **getByText** (Content)
```typescript
screen.getByText(/welcome back/i)
```

5. **getByTestId** (Last resort)
```typescript
screen.getByTestId('submit-button')
```

### Query Variants
- `getBy*` - Throws if not found (single element)
- `queryBy*` - Returns null if not found
- `findBy*` - Async, waits for element
- `getAllBy*` - Returns array (multiple elements)

---

## ⚡ Common Assertions

### Backend
```typescript
// Status codes
expect(response.status).toBe(201);

// Response body
expect(response.body).toMatchObject({
  id: expect.any(Number),
  name: 'Test Event'
});

// Arrays
expect(response.body.events).toHaveLength(5);
expect(response.body.items).toContainEqual(
  expect.objectContaining({ id: 1 })
);

// Database
const saved = await Model.findByPk(id);
expect(saved).toBeDefined();
expect(saved.name).toBe('Test');
```

### Frontend
```typescript
// Element presence
expect(screen.getByText('Hello')).toBeInTheDocument();
expect(screen.queryByText('Hidden')).not.toBeInTheDocument();

// Async elements
expect(await screen.findByText('Loaded')).toBeInTheDocument();

// Element states
expect(button).toBeDisabled();
expect(input).toHaveValue('test');
expect(checkbox).toBeChecked();

// Accessibility
expect(button).toHaveAccessibleName('Submit form');
expect(input).toHaveAccessibleDescription('Enter your email');
```

---

## 🚫 Common Anti-Patterns

### ❌ Don't Test Implementation
```typescript
// BAD: Testing internal state
it('should set loading to true', () => {
  const { result } = renderHook(() => useData());
  act(() => result.current.fetchData());
  expect(result.current.loading).toBe(true);
});

// GOOD: Test user-visible behavior
it('should show loading spinner', async () => {
  renderWithProviders(<Component />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});
```

### ❌ Don't Over-Mock
```typescript
// BAD: Mocking everything
const mockService = {
  getData: jest.fn(() => Promise.resolve(data))
};

// GOOD: Mock external dependencies only
server.use(
  http.get('/api/data', () => HttpResponse.json(data))
);
```

### ❌ Don't Use Waiters Without Reason
```typescript
// BAD: Arbitrary wait
await new Promise(resolve => setTimeout(resolve, 1000));

// GOOD: Wait for specific condition
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

---

## 📋 Test Checklist

Before committing, verify:

### Backend Tests
- [ ] Tests real API endpoints, not mocked services
- [ ] Tests both success and error cases
- [ ] Tests permissions (admin vs employee)
- [ ] Tests company isolation
- [ ] Tests data validation
- [ ] Cleans up test data in afterEach
- [ ] Uses meaningful test descriptions
- [ ] Follows Arrange-Act-Assert pattern

### Frontend Tests
- [ ] Uses userEvent for interactions
- [ ] Uses proper query selectors (getByRole, etc.)
- [ ] Tests user-visible behavior
- [ ] Tests loading and error states
- [ ] Uses waitFor for async updates
- [ ] Doesn't test implementation details
- [ ] No arbitrary timeouts
- [ ] Tests accessibility when relevant

---

## 🎯 Test Naming Convention

```typescript
// Pattern: should [expected behavior] when [condition]
it('should create order when user submits valid form', async () => {});
it('should show error when API returns 500', async () => {});
it('should disable submit button when form is invalid', async () => {});

// For permissions
it('should allow admin to delete event', async () => {});
it('should prevent employee from deleting event', async () => {});

// For edge cases
it('should handle empty restaurant list', async () => {});
it('should prevent order after deadline', async () => {});
```

---

## 🔍 Debugging Failed Tests

### Backend
```typescript
// Log response for debugging
console.log('Response:', response.status, response.body);

// Check database state
const dbState = await Model.findAll();
console.log('Database:', dbState);

// Log request details
console.log('Request:', {
  url: '/api/events',
  headers: request.headers,
  body: request.body
});
```

### Frontend
```typescript
// Print DOM tree
import { screen } from '@testing-library/react';
screen.debug(); // Prints entire DOM
screen.debug(screen.getByRole('form')); // Prints specific element

// Check what's rendered
console.log('Body:', document.body.innerHTML);

// Log user actions
const user = userEvent.setup();
console.log('Clicking button...');
await user.click(button);
console.log('Button clicked');
```

---

## 📚 Key Resources

- [Testing Library Docs](https://testing-library.com)
- [Jest Matchers](https://jestjs.io/docs/expect)
- [Vitest API](https://vitest.dev/api/)
- [MSW Documentation](https://mswjs.io/docs/)
- [React Testing Examples](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

## 🚀 Quick Start

### Run Tests
```bash
# Backend
cd backend
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # With coverage
npm test auth              # Run specific test

# Frontend
cd frontend
npm test                   # Run all tests
npm test -- --watch       # Watch mode
npm test -- --coverage    # With coverage
npm test Login            # Run specific test
```

### Create New Test
```bash
# Backend
touch src/modules/events/__tests__/events.integration.test.ts

# Frontend
touch src/test/components/EventList.test.tsx
```

---

*Keep this guide open while writing tests. Focus on testing user behavior, not implementation details.*
