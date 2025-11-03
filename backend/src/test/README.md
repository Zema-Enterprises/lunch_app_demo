# Backend Test Infrastructure

This directory contains test utilities, helpers, factories, and fixtures for the LunchSync backend.

## Directory Structure

```
src/test/
├── setup.ts              # Global test setup and configuration
├── helpers/              # Test helper utilities
│   ├── auth.helper.ts    # Authentication and user setup
│   ├── db.helper.ts      # Database operations and cleanup
│   └── request.helper.ts # HTTP request utilities
├── factories/            # Data factories for generating test data
│   ├── user.factory.ts
│   ├── event.factory.ts
│   ├── order.factory.ts
│   └── restaurant.factory.ts
└── fixtures/             # Predefined test data
    ├── companies.ts
    ├── users.ts
    └── restaurants.ts
```

## Usage

### Quick Start

```typescript
import { setupCompanyWithUsers } from '../test/helpers/auth.helper';
import { cleanupTestData } from '../test/helpers/db.helper';
import { createEvent } from '../test/factories/event.factory';
import { createRestaurant } from '../test/factories/restaurant.factory';

describe('My Feature', () => {
  let companyId: string;
  let adminToken: string;

  beforeEach(async () => {
    // Setup company with users
    const setup = await setupCompanyWithUsers({ employeeCount: 2 });
    companyId = setup.companyId;
    adminToken = setup.admin.token;
  });

  afterEach(async () => {
    // Cleanup all test data
    await cleanupTestData(companyId);
  });

  it('should do something', async () => {
    // Your test here
  });
});
```

### Helpers

#### Authentication Helper

```typescript
import { setupCompanyWithUsers, createTestUser } from '../test/helpers/auth.helper';

// Create company with admin and employees
const setup = await setupCompanyWithUsers({ employeeCount: 3 });
const { admin, employees, companyId } = setup;

// Use admin token
const response = await request(app)
  .post('/api/events')
  .set('Authorization', `Bearer ${admin.token}`)
  .send(eventData);

// Use employee token
const userResponse = await request(app)
  .get('/api/events')
  .set('Authorization', `Bearer ${employees[0].token}`);
```

#### Database Helper

```typescript
import { cleanupTestData, cleanupUser, cleanupEvent } from '../test/helpers/db.helper';

// Cleanup entire company data
await cleanupTestData(companyId);

// Cleanup specific user
await cleanupUser(userId);

// Cleanup specific event
await cleanupEvent(eventId);

// Get database stats
const stats = await getDatabaseStats();
console.log(`Total users: ${stats.users}`);
```

#### Request Helper

```typescript
import {
  authenticatedRequest,
  postRequest,
  assertSuccess,
  assertForbidden
} from '../test/helpers/request.helper';

// Use authenticated request builder
const client = authenticatedRequest(app, token);
const response = await client.post('/api/events').send(data);

// Or use direct functions
const response = await postRequest(app, '/api/events', token, data);

// Assert responses
assertSuccess(response);
assertForbidden(response);
assertNotFound(response);
```

### Factories

#### User Factory

```typescript
import { createUser, createAdmin, createEmployee, createUsers } from '../test/factories/user.factory';

// Create admin user
const admin = await createAdmin(companyId, {
  name: 'Custom Admin',
  email: 'admin@custom.com'
});

// Create employee
const employee = await createEmployee(companyId);

// Create multiple users
const users = await createUsers(5, { companyId });

// Build data without saving (for validation tests)
const userData = buildUserData({ email: 'invalid' });
```

#### Event Factory

```typescript
import {
  createEvent,
  createOpenEvent,
  createEventWithParticipants,
  createEventWithPastDeadline
} from '../test/factories/event.factory';

// Create basic event
const event = await createEvent({
  title: 'Team Lunch',
  createdById: admin.id,
  restaurantId: restaurant.id,
  companyId: company.id
});

// Create open event (ready for orders)
const openEvent = await createOpenEvent({
  createdById: admin.id,
  restaurantId: restaurant.id,
  companyId: company.id
});

// Create event with participants
const eventWithUsers = await createEventWithParticipants(
  eventData,
  [user1.id, user2.id, user3.id]
);

// Create event with past deadline
const pastEvent = await createEventWithPastDeadline(eventData);
```

#### Restaurant Factory

```typescript
import {
  createRestaurant,
  createRestaurantWithMenu,
  createRestaurants
} from '../test/factories/restaurant.factory';

// Create restaurant
const restaurant = await createRestaurant({
  name: 'Italian Bistro',
  companyId: company.id
});

// Create restaurant with menu items
const { menuItems } = await createRestaurantWithMenu(
  { companyId: company.id },
  5 // number of menu items
);

// Create multiple restaurants
const restaurants = await createRestaurants(3, { companyId: company.id });
```

#### Order Factory

```typescript
import {
  createOrder,
  createOrdersForEvent,
  createConfirmedOrder
} from '../test/factories/order.factory';

// Create order with items
const order = await createOrder(
  { userId: user.id, eventId: event.id },
  [
    { menuItemId: item1.id, quantity: 2, price: item1.price },
    { menuItemId: item2.id, quantity: 1, price: item2.price }
  ]
);

// Create multiple orders for an event
const orders = await createOrdersForEvent(
  event.id,
  [user1.id, user2.id, user3.id],
  menuItems
);

// Create confirmed order
const paidOrder = await createConfirmedOrder(orderData, orderItems);
```

### Fixtures

#### Company Fixtures

```typescript
import { getTestCompany, getAllTestCompanies } from '../test/fixtures/companies';

const acme = getTestCompany('acmeCorp');
// { name: 'Acme Corporation', domain: 'acme.com', slug: 'acme-corp' }

const allCompanies = getAllTestCompanies();
```

#### User Fixtures

```typescript
import { getTestUser, getTestAdmin, getTestEmployees } from '../test/fixtures/users';

const admin = getTestAdmin();
// { email: 'admin@test.com', password: 'Admin123!', ... }

const employee = getTestUser('employee1');
const allEmployees = getTestEmployees();
```

#### Restaurant Fixtures

```typescript
import { getTestRestaurant, getAllTestRestaurants } from '../test/fixtures/restaurants';

const italian = getTestRestaurant('italianBistro');
// { name: 'Italian Bistro', cuisine: 'Italian', menu: [...] }

const allRestaurants = getAllTestRestaurants();
```

## Best Practices

### 1. Always Cleanup After Tests

```typescript
afterEach(async () => {
  await cleanupTestData(companyId);
});
```

### 2. Use Factories Instead of Raw Data

```typescript
// ✅ Good
const user = await createEmployee(companyId);

// ❌ Bad
const user = await prisma.user.create({
  data: { /* manual data */ }
});
```

### 3. Use Unique Data

Factories automatically generate unique timestamps and random values to avoid conflicts.

### 4. Test User Flows, Not Implementation

```typescript
// ✅ Good - tests user behavior
it('should allow employee to place order', async () => {
  const response = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${employee.token}`)
    .send(orderData);
  
  expect(response.status).toBe(201);
  expect(response.body.totalAmount).toBeGreaterThan(0);
});

// ❌ Bad - tests implementation
it('should call orderService.create', async () => {
  const spy = jest.spyOn(orderService, 'create');
  // ...
});
```

### 5. Test Company Isolation

```typescript
it('should not allow access to other company data', async () => {
  const company1 = await setupCompanyWithUsers();
  const company2 = await setupCompanyWithUsers();

  const response = await request(app)
    .get(`/api/events/${company1Event.id}`)
    .set('Authorization', `Bearer ${company2.admin.token}`);

  expect(response.status).toBe(404);
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test auth.controller.test

# Watch mode
npm test -- --watch

# Run only integration tests
npm test -- integration.test
```

## Coverage Thresholds

Current thresholds (from jest.config.js):
- **Branches**: 70%
- **Functions**: 75%
- **Lines**: 80%
- **Statements**: 80%

Target thresholds (Phase 3):
- **All metrics**: 90%+

## Tips

1. **Use descriptive test names**: `should allow admin to create event`
2. **Test one thing per test**: Don't combine multiple scenarios
3. **Arrange-Act-Assert**: Structure tests clearly
4. **Use beforeEach/afterEach**: Set up and tear down properly
5. **Avoid test interdependence**: Each test should run independently

## Resources

- [Testing Improvement Plan](../../../docs/development/TESTING_IMPROVEMENT_PLAN.md)
- [Testing Quick Reference](../../../docs/development/TESTING_QUICK_REFERENCE.md)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
