# Testing Guide

## Overview

This project uses **Vitest** as the test runner with **React Testing Library** for component testing and **MSW (Mock Service Worker)** for API mocking.

## Test Structure

```
frontend/src/test/
├── setup.ts                      # Global test setup
├── mocks/
│   ├── handlers.ts              # MSW API mock handlers
│   └── server.ts                # MSW server setup
├── utils/
│   ├── test-utils.tsx           # Custom render with providers
│   └── factories.ts             # Test data factories
├── api-hooks.test.tsx           # API hooks tests
└── components/
    └── EventDetailsModal.test.tsx  # Component tests
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (during development)
npm test

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

## Writing Tests

### API Hook Tests

Test hooks that interact with the backend API:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRestaurants } from '@/lib/api/hooks';

describe('useRestaurants', () => {
  it('fetches restaurants successfully', async () => {
    const { result } = renderHook(() => useRestaurants(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});
```

### Component Tests

Test React components with user interactions:

```typescript
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils/test-utils';
import { EventDetailsModal } from '@/components/events/EventDetailsModal';

describe('EventDetailsModal', () => {
  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const mockEvent = createMockEvent();
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    const closeButton = screen.getByRole('button');
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
```

### Using Test Factories

Create test data easily with factories:

```typescript
import {
  createMockEvent,
  createMockRestaurant,
  createMockOrder,
  createMockUser,
} from '../utils/factories';

// Create single item
const event = createMockEvent({ title: 'Custom Title' });

// Create multiple items
const restaurants = createMockRestaurants(5);
const events = createMockEvents(3);
```

## MSW Mock Handlers

All API endpoints are mocked in `src/test/mocks/handlers.ts`:

- **Auth**: `/api/auth/me`
- **Restaurants**: `/api/restaurants`, `/api/restaurants/:id`
- **Events**: `/api/events`, `/api/events/:id`
- **Orders**: `/api/orders/me`, `/api/events/:eventId/orders`
- **Stats**: `/api/users/me/stats`

### Customizing Mock Responses

Override handlers for specific tests:

```typescript
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';

it('handles API error', async () => {
  server.use(
    http.get('/api/restaurants', () => {
      return new HttpResponse(null, { status: 500 });
    })
  );

  // Test error handling...
});
```

## Test Coverage

Current coverage: **~20%** (initial setup)

Coverage goals:
- **Critical paths**: 80%+ (API hooks, core components)
- **UI components**: 60%+
- **Utilities**: 90%+

View coverage report:
```bash
npm run test:coverage
# Open coverage/index.html in browser
```

## Best Practices

### ✅ Do

- Test user behavior, not implementation details
- Use `screen.getByRole()` for better accessibility
- Use `userEvent` for realistic user interactions
- Test error states and loading states
- Use MSW for API mocking
- Clean up after tests (automatic with setup)

### ❌ Don't

- Test internal state or private methods
- Use `container.querySelector()` (prefer semantic queries)
- Mock too much (test as close to production as possible)
- Write tests that depend on each other
- Ignore TypeScript errors in tests

## Common Patterns

### Testing Async Data Fetching

```typescript
await waitFor(() => {
  expect(result.current.isSuccess).toBe(true);
});
```

### Testing User Interactions

```typescript
const user = userEvent.setup();
const button = screen.getByRole('button', { name: /submit/i });
await user.click(button);
```

### Testing Forms

```typescript
const input = screen.getByLabelText(/email/i);
await user.type(input, 'test@example.com');

const form = screen.getByRole('form');
await user.click(within(form).getByRole('button', { name: /submit/i }));
```

### Testing Error States

```typescript
server.use(
  http.get('/api/events', () => {
    return new HttpResponse(null, { status: 500 });
  })
);

const { result } = renderHook(() => useEvents(), { wrapper: createWrapper() });
await waitFor(() => expect(result.current.isError).toBe(true));
```

## Debugging Tests

### View Test UI

```bash
npm run test:ui
```

This opens a browser with an interactive test runner where you can:
- See test results in real-time
- Inspect component snapshots
- Debug failing tests

### Console Logging

```typescript
import { screen } from '@testing-library/react';

// Print DOM structure
screen.debug();

// Print specific element
screen.debug(screen.getByRole('button'));
```

### Pause Tests

```typescript
import { pause } from '@testing-library/react';

it('test with pause', async () => {
  render(<Component />);
  await pause(); // Pauses test execution
});
```

## CI/CD Integration

Tests are designed to run in CI with:
- Deterministic results (no flaky tests)
- Fast execution (<5s for current suite)
- Clear error messages
- Coverage reporting

Add to CI pipeline:
```yaml
- run: npm test -- --run
- run: npm run test:coverage
```

## Future Improvements

- [ ] Add E2E tests with Playwright
- [ ] Increase coverage to 80%+
- [ ] Add visual regression testing
- [ ] Performance benchmarking
- [ ] Accessibility testing automation
