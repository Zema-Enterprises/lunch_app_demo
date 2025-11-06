# Frontend Test Infrastructure

This directory contains all test utilities, factories, fixtures, and mocks for frontend testing.

## Directory Structure

```
frontend/src/test/
├── factories/          # Test data factories for creating mock objects
│   ├── user.ts        # User factory functions
│   ├── event.ts       # Event factory functions
│   ├── order.ts       # Order factory functions
│   └── restaurant.ts  # Restaurant and menu item factory functions
├── fixtures/          # Pre-defined test data and API responses
│   └── api-responses.ts # API response wrappers and common responses
├── mocks/             # MSW handlers for API mocking
│   ├── handlers.ts    # Request handlers for all API endpoints
│   └── server.ts      # MSW server setup
├── utils/             # Test utilities and helpers
│   └── test-utils.tsx # Custom render functions and test utilities
└── setup.ts           # Global test setup and configuration
```

## Testing Stack

- **Testing Framework**: Vitest
- **React Testing Library**: For component testing
- **MSW (Mock Service Worker)**: For API mocking
- **Test Utilities**: Custom render functions with providers

## Test Factories

Factories help you generate realistic test data quickly. They automatically handle IDs, timestamps, and relationships.

### User Factory

```typescript
import { createUser, createAdmin, createUsers, resetUserCounter } from '@/test/factories/user';

// Create a single user
const user = createUser({ name: 'John Doe' });

// Create an admin user
const admin = createAdmin({ email: 'admin@example.com' });

// Create multiple users
const users = createUsers(5);

// Reset counter for test isolation
resetUserCounter();
```

### Event Factory

```typescript
import { createEvent, createOpenEvent, createPastEvent } from '@/test/factories/event';

// Create a basic event
const event = createEvent({ title: 'Team Lunch' });

// Create an open event (order deadline in future)
const openEvent = createOpenEvent();

// Create a closed event (order deadline passed)
const closedEvent = createClosedEvent();

// Create an event with past deadline
const pastEvent = createPastEvent();
```

### Order Factory

```typescript
import { createOrder, createConfirmedOrder, createCustomOrder } from '@/test/factories/order';

// Create an order with items
const order = createOrder({
  userId: 'user-1',
  eventId: 'event-1',
});

// Create a confirmed order
const confirmedOrder = createConfirmedOrder();

// Create a custom order (no items)
const customOrder = createCustomOrder('Please bring me a burger');
```

### Restaurant Factory

```typescript
import { createRestaurant, createRestaurantWithMenu, createMenuItem } from '@/test/factories/restaurant';

// Create a restaurant
const restaurant = createRestaurant({ name: 'Pizza Palace' });

// Create a restaurant with menu items
const restaurantWithMenu = createRestaurantWithMenu(10); // 10 menu items

// Create a single menu item
const menuItem = createMenuItem({ name: 'Margherita Pizza', price: 12.99 });
```

## API Response Fixtures

Use these fixtures to mock API responses consistently.

```typescript
import { mockResponses, createPaginatedResponse, apiErrors } from '@/test/fixtures/api-responses';

// Mock successful responses
const usersResponse = mockResponses.users.list([user1, user2]);
const eventResponse = mockResponses.events.single(event);
const orderCreatedResponse = mockResponses.orders.created(order);

// Mock error responses
const unauthorizedError = apiErrors.unauthorized;
const validationError = apiErrors.validationError({
  email: ['Email is required'],
  password: ['Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'],
});

// Create custom paginated response
const paginatedUsers = createPaginatedResponse([user1, user2, user3], 1, 10);
```

## MSW Mocking

MSW (Mock Service Worker) is used to intercept and mock API requests.

### Using Existing Handlers

The handlers in `mocks/handlers.ts` are automatically loaded. You can override them in individual tests:

```typescript
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';
import { createUser } from '@/test/factories/user';

test('handles user not found', async () => {
  // Override handler for this test
  server.use(
    http.get('/api/users/:id', () => {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 });
    })
  );

  // Your test code...
});
```

### Adding New Handlers

Add new handlers to `mocks/handlers.ts`:

```typescript
export const handlers = [
  // ... existing handlers

  // Your new handler
  http.post('/api/new-endpoint', () => {
    return HttpResponse.json({ data: 'response' });
  }),
];
```

## Test Utilities

### Render with Providers

Use `renderWithProviders` to render components with all necessary context providers:

```typescript
import { renderWithProviders } from '@/test/utils/test-utils';
import { MyComponent } from '@/components/MyComponent';

test('renders component', () => {
  const { getByText } = renderWithProviders(<MyComponent />);
  expect(getByText('Hello')).toBeInTheDocument();
});
```

### Custom Queries

```typescript
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('user interactions', async () => {
  const user = userEvent.setup();
  renderWithProviders(<LoginForm />);

  // Find elements
  const emailInput = screen.getByLabelText(/email/i);
  const passwordInput = screen.getByLabelText(/password/i);
  const submitButton = screen.getByRole('button', { name: /login/i });

  // User interactions
  await user.type(emailInput, 'user@example.com');
  await user.type(passwordInput, 'password123');
  await user.click(submitButton);

  // Assertions
  expect(await screen.findByText(/welcome/i)).toBeInTheDocument();
});
```

## Testing Patterns

### Component Testing

```typescript
import { renderWithProviders } from '@/test/utils/test-utils';
import { EventCard } from '@/components/EventCard';
import { createEvent } from '@/test/factories/event';

describe('EventCard', () => {
  it('displays event information', () => {
    const event = createEvent({ title: 'Team Lunch', status: 'OPEN' });
    
    const { getByText } = renderWithProviders(<EventCard event={event} />);
    
    expect(getByText('Team Lunch')).toBeInTheDocument();
    expect(getByText(/OPEN/i)).toBeInTheDocument();
  });

  it('shows closed status for past events', () => {
    const pastEvent = createClosedEvent();
    
    const { getByText } = renderWithProviders(<EventCard event={pastEvent} />);
    
    expect(getByText(/CLOSED/i)).toBeInTheDocument();
  });
});
```

### Hook Testing

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEvents } from '@/hooks/useEvents';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';
import { createEvent } from '@/test/factories/event';

describe('useEvents', () => {
  it('fetches events successfully', async () => {
    const mockEvents = [createEvent(), createEvent()];
    
    server.use(
      http.get('/api/events', () => {
        return HttpResponse.json({ data: mockEvents });
      })
    );

    const queryClient = new QueryClient();
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useEvents(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockEvents);
  });
});
```

### Form Testing

```typescript
import { renderWithProviders } from '@/test/utils/test-utils';
import { OrderForm } from '@/components/OrderForm';
import { createEvent, createRestaurantWithMenu } from '@/test/factories';
import userEvent from '@testing-library/user-event';

describe('OrderForm', () => {
  it('submits order with selected items', async () => {
    const user = userEvent.setup();
    const event = createEvent();
    const restaurant = createRestaurantWithMenu(5);
    const onSubmit = vi.fn();

    const { getByLabelText, getByRole } = renderWithProviders(
      <OrderForm event={event} restaurant={restaurant} onSubmit={onSubmit} />
    );

    // Select menu items
    await user.click(getByLabelText(/Menu Item 1/i));
    await user.click(getByLabelText(/Menu Item 2/i));

    // Submit form
    await user.click(getByRole('button', { name: /submit order/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ menuItemId: expect.any(String) }),
        ]),
      })
    );
  });
});
```

## Best Practices

### 1. Test Isolation

Always reset factory counters between tests:

```typescript
import { resetUserCounter } from '@/test/factories/user';
import { resetEventCounter } from '@/test/factories/event';

afterEach(() => {
  resetUserCounter();
  resetEventCounter();
});
```

### 2. Mock Reset

MSW server is automatically reset between tests. If you need manual control:

```typescript
import { server } from '@/test/mocks/server';

afterEach(() => {
  server.resetHandlers(); // Reset to original handlers
});
```

### 3. Async Testing

Always use `waitFor` for async operations:

```typescript
import { waitFor } from '@testing-library/react';

test('loads data', async () => {
  renderWithProviders(<DataComponent />);

  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });
});
```

### 4. User-Centric Testing

Write tests from the user's perspective:

```typescript
// ❌ Bad - testing implementation details
expect(component.state.isLoading).toBe(false);

// ✅ Good - testing user experience
expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
expect(screen.getByText('Welcome back!')).toBeInTheDocument();
```

### 5. Accessible Queries

Prefer queries that reflect how users interact with your app:

```typescript
// ✅ Best - accessible to screen readers
screen.getByRole('button', { name: /submit/i });
screen.getByLabelText(/email/i);

// ⚠️ Okay - visible text
screen.getByText('Submit');

// ❌ Avoid - implementation details
screen.getByTestId('submit-button');
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests in UI mode (interactive)
npm run test:ui
```

## Coverage Goals

The project aims for the following coverage thresholds:

- **Branches**: 70%
- **Functions**: 75%
- **Lines**: 80%
- **Statements**: 80%

These thresholds are enforced by Vitest configuration.

## Debugging Tests

### Vitest UI

Run tests in UI mode for an interactive debugging experience:

```bash
npm run test:ui
```

### Debug Specific Test

```typescript
import { screen, logRoles } from '@testing-library/react';

test('debug test', () => {
  const { container } = renderWithProviders(<MyComponent />);
  
  // Log available roles
  logRoles(container);
  
  // Log current DOM
  screen.debug();
  
  // Log specific element
  screen.debug(screen.getByRole('button'));
});
```

### MSW Debugging

Enable MSW logging to see intercepted requests:

```typescript
// In your test file
import { server } from '@/test/mocks/server';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});
```

## Common Testing Scenarios

### Testing Error States

```typescript
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

test('displays error message', async () => {
  server.use(
    http.get('/api/events', () => {
      return HttpResponse.json(
        { message: 'Failed to load events' },
        { status: 500 }
      );
    })
  );

  renderWithProviders(<EventList />);

  expect(await screen.findByText(/failed to load/i)).toBeInTheDocument();
});
```

### Testing Loading States

```typescript
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

test('shows loading state', async () => {
  server.use(
    http.get('/api/events', async () => {
      await delay(100); // Simulate slow network
      return HttpResponse.json({ data: [] });
    })
  );

  renderWithProviders(<EventList />);

  expect(screen.getByText(/loading/i)).toBeInTheDocument();
  
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
});
```

### Testing Authentication

```typescript
import { createUser, createAuthResponse } from '@/test/factories';

test('requires authentication', async () => {
  const user = userEvent.setup();
  const mockUser = createUser();

  server.use(
    http.post('/api/auth/login', async ({ request }) => {
      const body = await request.json();
      if (body.email === mockUser.email) {
        return HttpResponse.json(createAuthResponse(mockUser));
      }
      return HttpResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    })
  );

  renderWithProviders(<LoginPage />);

  await user.type(screen.getByLabelText(/email/i), mockUser.email);
  await user.type(screen.getByLabelText(/password/i), 'password123');
  await user.click(screen.getByRole('button', { name: /login/i }));

  expect(await screen.findByText(/welcome/i)).toBeInTheDocument();
});
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [MSW Documentation](https://mswjs.io/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Project Testing Improvement Plan](../../docs/testing/TESTING_IMPROVEMENT_PLAN.md)
- [Testing Quick Reference](../../docs/testing/TESTING_QUICK_REFERENCE.md)
