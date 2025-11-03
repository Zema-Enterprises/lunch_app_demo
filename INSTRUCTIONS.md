# LunchSync Development Instructions

## Table of Contents
1. [Project Overview](#project-overview)
2. [Development Workflow](#development-workflow)
3. [Testing Strategy](#testing-strategy)
4. [Documentation Standards](#documentation-standards)
5. [API Development Guidelines](#api-development-guidelines)
6. [Frontend Development Guidelines](#frontend-development-guidelines)
7. [Git Workflow](#git-workflow)
8. [Common Tasks](#common-tasks)

---

## Project Overview

**LunchSync** is a comprehensive lunch ordering and event management system for companies. It allows employees to organize lunch events, order from restaurants, manage payments, and track orders.

### Tech Stack
- **Backend**: Node.js, Express, TypeScript, Prisma (PostgreSQL)
- **Frontend**: React, TypeScript, Vite
- **Testing**: Jest (backend), Vitest (frontend), MSW (API mocking)
- **Database**: PostgreSQL
- **Authentication**: JWT tokens with bcrypt

### Project Structure
```
lunch.app/
├── backend/
│   ├── src/
│   │   ├── __tests__/           # Integration tests
│   │   ├── modules/              # Feature modules (auth, events, orders, etc.)
│   │   ├── middleware/           # Auth, validation, error handling
│   │   ├── test/                 # Test helpers, factories, fixtures
│   │   └── config/               # Database, environment config
│   └── prisma/                   # Database schema and migrations
├── frontend/
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── pages/                # Page components
│   │   ├── services/             # API services
│   │   ├── types/                # TypeScript types
│   │   └── __tests__/            # Component tests
└── docs/
    └── testing/                  # Testing documentation
```

---

## Development Workflow

### Core Principle: Test-Driven Development (TDD)

**CRITICAL**: We follow a strict test-driven approach where **tests define the correct API behavior**, and the API is adjusted to match test requirements.

> "We should write tests to adjust the code to it, not to adjust tests to code"

**Before writing any implementation code:**
- Add or update tests so the expected behavior fails first.
- When existing tests fail, determine whether the feature legitimately changes behavior (update the test intentionally) or the implementation regressed (fix the code).
- Never leave suites failing—`npm test` and `npm run test:coverage` (backend & frontend) must pass prior to handoff.

### Standard Development Process

#### 1. For New Features or API Changes

```bash
# Step 1: Write comprehensive integration tests FIRST
# - Create test file in backend/src/__tests__/integration/
# - Write tests for all scenarios (happy path, validation, errors, edge cases)
# - Focus on real user flows, not implementation details

# Step 2: Run tests to identify what needs to be implemented
npm test -- <test-file-name>

# Step 3: Analyze test failures
# - Note all missing endpoints (404 errors)
# - Note incorrect response formats
# - Note validation errors
# - Note permission/security issues

# Step 4: Implement/adjust API to match test requirements
# - Add missing endpoints
# - Fix response formats
# - Implement validation
# - Add security checks

# Step 5: Re-run tests iteratively
npm test -- <test-file-name>
# - Fix one category of failures at a time
# - Re-run after each fix
# - Continue until all tests pass

# Step 6: Document all API changes
# - Create/update API_ADJUSTMENTS_<FEATURE>.md
# - Document before/after comparisons
# - Explain rationale for changes
# - List all files modified

# Step 7: Check frontend compatibility
# - Review API changes for breaking changes
# - Update frontend types and API calls
# - Update components to match new response formats

# Step 8: Update documentation
# - Update PROGRESS.md with completed phase
# - Update relevant documentation files
# - Clean up outdated documentation
```

#### 2. Cross-Layer Change Management (CRITICAL)

**Principle**: Changes in one layer often require adjustments in other layers. Always identify and handle cascading changes.

```bash
# When changing FRONTEND components/tests:
# 1. Identify if backend API changes are needed
#    - New endpoints required?
#    - Different response format needed?
#    - Additional validation needed?
# 2. Update backend first (API, validation, tests)
# 3. Update database schema if needed (migrations)
# 4. Update documentation (API adjustments, schema changes)
# 5. Then complete frontend changes
# 6. Update frontend tests

# When changing BACKEND API:
# 1. Identify frontend impact
#    - Which components consume this API?
#    - Do response formats change?
#    - Are there breaking changes?
# 2. Update backend (API, validation, tests)
# 3. Update frontend hooks/services
# 4. Update frontend types
# 5. Update affected components
# 6. Update component tests
# 7. Document all changes

# When changing DATABASE schema:
# 1. Create Prisma migration
# 2. Update seed data
# 3. Update backend models/types
# 4. Update backend tests and fixtures
# 5. Update API functions that use changed models
# 6. Update frontend types
# 7. Update frontend components using changed data
# 8. Document schema changes

# Example Workflow:
# Frontend test requires new API endpoint:
npm test -- LoginForm.test.tsx  # Test fails: needs POST /api/auth/forgot-password
# → Go to backend
cd backend
# → Write backend integration test first
# → Implement backend endpoint
npm test -- auth.integration.test.ts  # Verify backend works
# → Document API change
# → Return to frontend
cd ../frontend
# → Update API hook
# → Update component
npm test -- LoginForm.test.tsx  # Now test should pass
```

**Golden Rules**:
1. **Backend changes first**: If frontend needs new API, build backend first
2. **Test at each layer**: Don't skip backend tests when adding backend features for frontend
3. **Document cascading changes**: Note all affected layers in API_ADJUSTMENTS docs
4. **Verify end-to-end**: After cross-layer changes, test the complete flow

#### 3. Example: Adding Event Management Tests

```bash
# 1. Create test file
touch backend/src/__tests__/integration/events.integration.test.ts

# 2. Write comprehensive tests (all scenarios)
# - Event CRUD operations
# - Status transitions
# - Participant management
# - Company isolation
# - RBAC enforcement

# 3. Run tests (expect failures)
npm test -- events.integration.test.ts

# 4. Analyze failures and adjust API
# - Update events.controller.ts
# - Update events.validation.ts
# - Add missing functions/routes

# 5. Verify all tests pass
npm test -- events.integration.test.ts
# Expected: ✅ ALL TESTS PASSING

# 6. Document changes
# Create docs/testing/API_ADJUSTMENTS_EVENTS.md

# 7. Check frontend compatibility
# Review frontend event components/services

# 8. Update progress tracking
# Update docs/testing/PROGRESS.md
```

---

## Testing Strategy

### Backend Testing

#### Coverage Targets
- **Overall**: 90%+ coverage
- **Branches**: 70%
- **Functions**: 75%
- **Lines**: 80%
- **Statements**: 80%

#### Test Types
1. **Integration Tests** (Primary focus)
   - Test complete user flows
   - Use real database (with transactions)
   - Test API endpoints end-to-end
   - Include authentication, authorization, validation

2. **Unit Tests** (Secondary)
   - Test complex business logic
   - Test utility functions
   - Test edge cases

#### Test Structure

**Location**: `backend/src/__tests__/integration/<feature>.integration.test.ts`

**Template**:
```typescript
import request from 'supertest';
import app from '../../app';
import { setupCompanyWithUsers } from '../../test/helpers/auth.helper';
import { cleanupTestData } from '../../test/helpers/db.helper';
import { authenticatedRequest, assertSuccess, assertBadRequest } from '../../test/helpers/request.helper';

describe('<Feature> Integration Tests', () => {
  describe('<Scenario Group>', () => {
    let testData: any;

    beforeAll(async () => {
      testData = await setupCompanyWithUsers({ employeeCount: 2 });
      // Additional setup
    });

    afterAll(async () => {
      await cleanupTestData(testData.company.id);
    });

    describe('Happy Path', () => {
      it('should perform expected action successfully', async () => {
        const response = await authenticatedRequest(app, testData.admin.token)
          .post('/api/endpoint')
          .send({ data });

        assertSuccess(response);
        expect(response.body.data).toMatchObject({
          expectedField: 'expectedValue',
        });
      });
    });

    describe('Validation', () => {
      it('should reject invalid input', async () => {
        const response = await authenticatedRequest(app, testData.admin.token)
          .post('/api/endpoint')
          .send({ invalidData });

        assertBadRequest(response);
        expect(response.body.message).toMatch(/expected error/i);
      });
    });

    describe('Authorization', () => {
      it('should deny unauthorized access', async () => {
        const response = await request(app)
          .post('/api/endpoint')
          .send({ data });

        assertUnauthorized(response);
      });
    });
  });
});
```

#### Test Helpers

**Authentication Helpers** (`test/helpers/auth.helper.ts`):
- `setupCompanyWithUsers()` - Create test company with users
- `cleanupTestData()` - Clean up test data

**Request Helpers** (`test/helpers/request.helper.ts`):
- `authenticatedRequest()` - Make authenticated request
- `assertSuccess()` - Assert 2xx response
- `assertBadRequest()` - Assert 400 response
- `assertUnauthorized()` - Assert 401 response
- `assertForbidden()` - Assert 403 response
- `assertNotFound()` - Assert 404 response

**Factory Functions** (`test/factories/`):
- `createUser()` - Create test user
- `createEvent()` - Create test event
- `createRestaurant()` - Create test restaurant
- `createOrder()` - Create test order

#### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- auth.integration.test.ts

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch

# Run tests with verbose output
npm test -- --verbose

# Run specific test suite
npm test -- -t "Authentication"
```

### Frontend Testing

**CRITICAL PRINCIPLE**: UI components should be adjusted to match comprehensive tests, NOT the other way around.

> "The same as backend tests: write tests to adjust the UI to it, not to adjust tests to UI"

#### Coverage Targets
- **Overall**: 80%+ coverage
- **Branches**: 70%
- **Functions**: 75%
- **Lines**: 80%
- **Statements**: 80%

#### Test Types
1. **Component Tests** (Primary focus for Phase 3)
   - Test component rendering
   - Test user interactions (clicks, typing, form submission)
   - Test clear UI states (loading, error, success, empty)
   - Test clear actions (button clicks, link navigation)
   - Mock API calls with MSW
   - Assert on accessible elements (roles, labels, text)

2. **Integration Tests**
   - Test component interactions
   - Test routing flows
   - Test complete user journeys

#### Frontend TDD Workflow (Phase 3)

```bash
# Step 1: Write comprehensive component tests FIRST
# - Create test file in frontend/src/test/components/<feature>/<Component>.test.tsx
# - Test ALL user interactions (every button, input, link)
# - Test ALL UI states (loading, error, success, empty, validation)
# - Test clear, semantic HTML (proper roles, labels, accessible elements)
# - Use user-centric queries (getByRole, getByLabelText, getByText)

# Step 2: Run tests to see what UI changes are needed
npm test -- <Component>.test.tsx

# Step 3: Identify what the test expects
# - What elements should exist? (buttons, inputs, headings)
# - What should happen on interaction? (form submit, navigation)
# - What accessibility features are required? (labels, roles, ARIA)
# - What API calls are expected? (check MSW handlers)

# Step 4: Check if backend API supports the test requirements
# - Does the API endpoint exist?
# - Does it return the expected data format?
# - Are there validation errors that need handling?
# - If API is missing/incorrect → GO TO BACKEND FIRST

# Step 5: Update backend if needed
cd backend
# - Write backend integration tests
# - Implement/fix API endpoint
# - Verify backend tests pass
npm test -- <feature>.integration.test.ts
# - Document API changes
# - Return to frontend
cd ../frontend

# Step 6: Adjust UI component to match test expectations
# - Add missing elements (buttons, inputs, labels)
# - Implement interaction handlers (onClick, onSubmit, onChange)
# - Add proper accessibility attributes (aria-label, role, htmlFor)
# - Use semantic HTML (button not div, label with htmlFor)
# - Handle all states (loading, error, success, empty)
# - Display clear user feedback (error messages, success toasts)

# Step 7: Re-run component tests
npm test -- <Component>.test.tsx
# - Fix one failure at a time
# - Adjust UI, not tests (tests define correct behavior)
# - Continue until all tests pass

# Step 8: Verify visual/manual testing
npm run dev
# - Does it look good?
# - Is it accessible?
# - Does it handle errors gracefully?

# Step 9: Document changes
# - Update PHASE_3.X_COMPLETE.md
# - Note any backend API changes made
# - Note component structure changes
# - Update PROGRESS.md
```

#### Component Test Structure

**Location**: `frontend/src/test/components/<feature>/<Component>.test.tsx`

**Template**:
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ComponentName } from '@/components/features/ComponentName';

// Mock API handlers
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

const renderComponent = (props = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ComponentName {...props} />
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('ComponentName', () => {
  describe('Rendering', () => {
    it('should render all required elements', () => {
      renderComponent();
      
      // Use semantic queries (getByRole preferred)
      expect(screen.getByRole('heading', { name: /title/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });
    
    it('should render in loading state', () => {
      renderComponent({ isLoading: true });
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });
  
  describe('User Interactions', () => {
    it('should handle form submission', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      // Interact with clear, semantic elements
      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);
      
      // Assert on user-visible feedback
      await waitFor(() => {
        expect(screen.getByText(/success/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('Error States', () => {
    it('should display API error message', async () => {
      // Mock API error
      server.use(
        http.post('/api/endpoint', () => {
          return HttpResponse.json(
            { message: 'Invalid email' },
            { status: 400 }
          );
        })
      );
      
      const user = userEvent.setup();
      renderComponent();
      
      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);
      
      // Assert error is displayed to user
      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      });
    });
  });
});
```

#### Key Testing Principles

1. **Test User Behavior, Not Implementation**
   - ✅ `screen.getByRole('button', { name: /submit/i })`
   - ❌ `screen.getByTestId('submit-button')`
   
2. **Use Accessible Queries**
   - Priority: `getByRole` > `getByLabelText` > `getByText` > `getByTestId`
   - Forces accessible UI (proper labels, roles, semantic HTML)
   
3. **Assert on User-Visible Changes**
   - ✅ Error message displays
   - ✅ Success toast appears
   - ❌ Internal state changes
   
4. **Test All States**
   - Loading state
   - Empty state
   - Error state
   - Success state
   - Validation states

5. **UI Adjusts to Tests**
   - If test expects a button → Add `<button>` with proper label
   - If test expects error display → Add error message UI
   - If test expects loading state → Add loading spinner/skeleton
   - If test expects accessible form → Add proper `<label>` elements

#### Running Tests

```bash
cd frontend

# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- LoginForm.test.tsx
```

---

## Documentation Standards

### Documentation Files Structure

```
docs/
└── testing/
    ├── TESTING_IMPROVEMENT_PLAN.md      # Master testing strategy
    ├── TESTING_QUICK_REFERENCE.md        # Quick reference guide
    ├── PROGRESS.md                        # Progress tracker
    ├── API_ADJUSTMENTS_AUTH.md           # Auth API changes
    ├── API_ADJUSTMENTS_EVENTS.md         # Event API changes
    └── API_ADJUSTMENTS_<FEATURE>.md      # Feature-specific changes
```

### Required Documentation After Each Phase

#### 1. API Adjustments Document

**File**: `docs/testing/API_ADJUSTMENTS_<FEATURE>.md`

**Required Sections**:
```markdown
# API Adjustments for <Feature> Tests

## Overview
Brief description of changes

## Test Results
- Total test cases: X
- Status: ✅ ALL X TESTS PASSING
- Test breakdown by suite

## Files Modified
1. File 1 - Description
2. File 2 - Description

## Detailed Changes

### File: filename.ts

#### Function: functionName()

**Before**:
```typescript
// Old code
```

**After**:
```typescript
// New code
```

**Rationale**:
- Why this change was made
- What test requirement it satisfies

## Key API Design Principles Enforced
1. Principle 1
2. Principle 2

## Summary
- Files modified: X
- Lines changed: ~X
- New endpoints: X
- Updated endpoints: X
```

#### 2. Progress Tracker Update

**File**: `docs/testing/PROGRESS.md`

**Update After Each Phase**:
1. Mark phase as complete with ✅
2. Update test counts
3. Update coverage percentages
4. Add documentation references
5. Update "Next Immediate Steps"

#### 3. Documentation Cleanup Checklist

After completing a phase, always:

- [ ] Create/update API_ADJUSTMENTS_<FEATURE>.md
- [ ] Update PROGRESS.md with completion status
- [ ] Review TESTING_IMPROVEMENT_PLAN.md for accuracy
- [ ] Update test statistics and coverage numbers
- [ ] Remove any outdated phase reports from root directory
- [ ] Verify all documentation references are correct
- [ ] Check for duplicate or conflicting information
- [ ] Update this INSTRUCTIONS.md if new patterns emerged

---

## API Development Guidelines

### Response Format Standards

#### Success Responses

**All successful responses must be wrapped in `{ data: ... }`**:

```typescript
// ✅ CORRECT
return res.status(200).json({ data: user });
return res.status(201).json({ data: event });
return res.json({ data: events });

// ❌ INCORRECT
return res.json(user);
return res.status(201).json(event);
```

#### Error Responses

**All error responses must use `{ message: ... }`**:

```typescript
// ✅ CORRECT
return res.status(400).json({ message: 'Validation failed' });
return res.status(403).json({ message: 'Access denied' });
return res.status(404).json({ message: 'Not found' });

// ❌ INCORRECT
return res.status(400).json({ error: 'Validation failed' });
return res.status(403).json({ msg: 'Access denied' });
```

#### HTTP Status Codes

Use appropriate status codes:

- **200 OK**: Successful GET, PATCH, PUT
- **201 Created**: Successful POST (resource creation)
- **204 No Content**: Successful DELETE
- **400 Bad Request**: Validation error, invalid input
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Authenticated but not authorized (company isolation, permissions)
- **404 Not Found**: Resource does not exist
- **500 Internal Server Error**: Unexpected server error

### Security Requirements

#### 1. Company Data Isolation

**CRITICAL**: Every endpoint must enforce company isolation.

```typescript
// ✅ CORRECT - Check company isolation
const event = await prisma.event.findFirst({
  where: {
    id,
    companyId: req.user!.companyId,  // Company isolation
  },
});

if (!event) {
  return res.status(404).json({ message: 'Event not found' });
}

// ❌ INCORRECT - Missing company isolation
const event = await prisma.event.findUnique({
  where: { id },
});
```

#### 2. Separate Existence Check from Permission Check

For better error messages and security:

```typescript
// ✅ CORRECT - Separate checks
const event = await prisma.event.findUnique({ where: { id } });

if (!event) {
  return res.status(404).json({ message: 'Event not found' });
}

if (event.companyId !== req.user!.companyId) {
  return res.status(403).json({ message: 'Access denied' });
}

// ❌ INCORRECT - Combined check hides information
const event = await prisma.event.findFirst({
  where: { id, companyId: req.user!.companyId },
});

if (!event) {
  return res.status(404).json({ message: 'Not found' });  // Is it 404 or 403?
}
```

#### 3. Input Validation

All text inputs must be sanitized:

```typescript
import { sanitize } from '../../utils/sanitize';

const event = await prisma.event.create({
  data: {
    title: sanitize(title),
    description: description ? sanitize(description) : null,
    // ...
  },
});
```

#### 4. Role-Based Access Control (RBAC)

Check permissions based on user role and ownership:

```typescript
// Check if user is creator or admin
if (event.createdById !== req.user!.userId && req.user!.role !== 'ADMIN') {
  return res.status(403).json({ message: 'Only event creator can update event' });
}
```

### Validation Standards

#### Zod Schema Pattern

```typescript
import { z } from 'zod';

export const createResourceSchema = z.object({
  body: z.object({
    requiredField: z.string().min(1).max(200),
    optionalField: z.string().max(1000).optional(),
    enumField: z.enum(['VALUE1', 'VALUE2']).optional(),
    dateField: z.string().datetime(),
  }),
});
```

#### Default Values

Provide sensible defaults for optional fields:

```typescript
const resource = await prisma.resource.create({
  data: {
    requiredField: sanitize(requiredField),
    optionalField: optionalField || 'DefaultValue',
    enumField: enumField || 'DEFAULT_ENUM_VALUE',
    // ...
  },
});
```

### Idempotency

Operations that users might retry should be idempotent:

```typescript
// ✅ CORRECT - Idempotent join operation
const existing = await prisma.eventParticipant.findUnique({
  where: { userId_eventId: { userId, eventId } },
});

if (existing) {
  // Already joined - return success (idempotent)
  return res.status(201).json({ data: existing });
}

// Create new participant
const participant = await prisma.eventParticipant.create({
  data: { userId, eventId },
});

return res.status(201).json({ data: participant });

// ❌ INCORRECT - Returns error on retry
if (existing) {
  return res.status(400).json({ message: 'Already joined' });
}
```

---

## Frontend Development Guidelines

### API Service Pattern

**Location**: `frontend/src/services/<feature>.service.ts`

```typescript
import api from './api';

// Types should match backend response format
interface ApiResponse<T> {
  data: T;
}

interface ErrorResponse {
  message: string;
  errors?: any[];
}

export const eventService = {
  // GET requests
  async getEvents(): Promise<Event[]> {
    const response = await api.get<ApiResponse<Event[]>>('/api/events');
    return response.data.data;  // Unwrap { data: ... }
  },

  // POST requests
  async createEvent(eventData: CreateEventDTO): Promise<Event> {
    const response = await api.post<ApiResponse<Event>>('/api/events', eventData);
    return response.data.data;
  },

  // Error handling
  async getEvent(id: string): Promise<Event> {
    try {
      const response = await api.get<ApiResponse<Event>>(`/api/events/${id}`);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },
};
```

### Type Definitions

**Location**: `frontend/src/types/<feature>.types.ts`

```typescript
// Match backend Prisma models
export interface Event {
  id: string;
  title: string;
  description: string | null;
  deliveryLocation: string;
  orderDeadline: string;  // ISO date string
  paymentMethod: 'EVENT_CREATOR' | 'INDIVIDUAL' | 'COMPANY_EXPENSE';
  status: 'OPEN' | 'CLOSED' | 'COMPLETED' | 'CANCELLED';
  createdById: string;
  restaurantId: string;
  companyId: string;
  createdAt: string;
  
  // Relations (if included)
  createdBy?: User;
  restaurant?: Restaurant;
  participants?: EventParticipant[];
}

// DTOs for API calls
export interface CreateEventDTO {
  title: string;
  description?: string;
  deliveryLocation?: string;
  orderDeadline: string;
  paymentMethod?: 'EVENT_CREATOR' | 'INDIVIDUAL' | 'COMPANY_EXPENSE';
  restaurantId: string;
}
```

### Component Pattern

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { eventService } from '../services/event.service';

export const EventList: React.FC = () => {
  // Fetch data
  const { data: events, isLoading, error } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventService.getEvents(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (eventData: CreateEventDTO) => eventService.createEvent(eventData),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  // Handle errors
  if (error) {
    return <ErrorMessage message={error.message} />;
  }

  // Handle loading
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Render data
  return (
    <div>
      {events?.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
};
```

---

## Git Workflow

### Branch Naming

```
feature/<feature-name>     # New features
bugfix/<bug-name>          # Bug fixes
test/<test-phase>          # Testing phases
docs/<doc-update>          # Documentation updates
refactor/<what>            # Code refactoring
```

### Commit Messages

```
<type>: <subject>

<body (optional)>

<footer (optional)>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `test`: Add or update tests
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `chore`: Build process, dependencies

**Examples**:
```bash
feat: add event management integration tests

- Created 38 comprehensive tests for event CRUD
- Includes status transitions and participant management
- All tests passing

test: adjust events API to match test requirements

- Updated events.controller.ts with proper response formats
- Added company isolation checks
- Implemented idempotent join operation
- Refs: API_ADJUSTMENTS_EVENTS.md

docs: update testing progress after Phase 1.2

- Marked Phase 1.2 as complete
- Updated test statistics (85 tests passing)
- Added event management documentation
```

---

## Common Tasks

### Starting Development Environment

```bash
# Terminal 1: Start PostgreSQL
docker-compose up -d

# Terminal 2: Start backend
cd backend
npm run dev

# Terminal 3: Start frontend
cd frontend
npm run dev

# Terminal 4: Run tests in watch mode (optional)
cd backend
npm test -- --watch
```

### Running Database Migrations

```bash
cd backend

# Create migration
npx prisma migrate dev --name <migration-name>

# Apply migrations
npx prisma migrate deploy

# Reset database (CAUTION: Deletes all data)
npx prisma migrate reset

# Generate Prisma client
npx prisma generate

# Open Prisma Studio
npx prisma studio
```

### Adding a New Feature Module

```bash
# 1. Create module directory
mkdir -p backend/src/modules/<feature>

# 2. Create files
touch backend/src/modules/<feature>/<feature>.controller.ts
touch backend/src/modules/<feature>/<feature>.routes.ts
touch backend/src/modules/<feature>/<feature>.validation.ts

# 3. Create test file
touch backend/src/__tests__/integration/<feature>.integration.test.ts

# 4. Create factory (if needed)
touch backend/src/test/factories/<feature>.factory.ts

# 5. Update database schema
# Edit backend/prisma/schema.prisma

# 6. Run migration
npx prisma migrate dev --name add_<feature>_model
```

### Creating a New Integration Test Phase

```bash
# 1. Create test file
touch backend/src/__tests__/integration/<feature>.integration.test.ts

# 2. Write comprehensive tests (follow TDD approach)
# - Happy path scenarios
# - Validation scenarios
# - Authorization scenarios
# - Edge cases

# 3. Run tests (expect failures)
npm test -- <feature>.integration.test.ts

# 4. Implement/adjust API to match test requirements

# 5. Re-run tests until all pass
npm test -- <feature>.integration.test.ts

# 6. Create API adjustments documentation
touch docs/testing/API_ADJUSTMENTS_<FEATURE>.md

# 7. Update progress tracker
# Edit docs/testing/PROGRESS.md

# 8. Check frontend compatibility
# Review and update frontend services/components

# 9. Clean up documentation
# Remove outdated files, update references
```

### Frontend API Integration

```bash
# 1. Create/update types
touch frontend/src/types/<feature>.types.ts

# 2. Create/update service
touch frontend/src/services/<feature>.service.ts

# 3. Update components to use new API format
# - Change response.data to response.data.data
# - Update error handling to use .message
# - Update types to match backend

# 4. Test frontend changes
cd frontend
npm run dev
# Manually test features

# 5. Update frontend tests
# Update MSW handlers with new response format
```

### Coverage Check

```bash
# Backend coverage
cd backend
npm test -- --coverage

# Frontend coverage
cd frontend
npm test -- --coverage

# View coverage report
# Open backend/coverage/lcov-report/index.html
# Open frontend/coverage/lcov-report/index.html
```

---

## Troubleshooting

### Tests Failing with Database Errors

```bash
# Reset test database
cd backend
npx prisma migrate reset

# Regenerate Prisma client
npx prisma generate

# Run tests again
npm test
```

### Frontend API Calls Failing

Check:
1. Backend is running (`http://localhost:3000`)
2. Response format matches `{ data: ... }` or `{ message: ... }`
3. Types are updated to match backend
4. CORS is configured correctly
5. Authentication token is being sent

### TypeScript Errors After Backend Changes

```bash
# Regenerate Prisma client
cd backend
npx prisma generate

# Check for type mismatches
npm run type-check
```

---

## Code Quality Standards

### ESLint

```bash
# Backend linting
cd backend
npm run lint

# Frontend linting
cd frontend
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### Code Formatting

```bash
# Format code with Prettier
npm run format

# Check formatting
npm run format:check
```

### Pre-commit Checks

Before committing:
- [ ] All tests pass (`npm test`)
- [ ] No linting errors (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] Types are correct (`npm run type-check`)
- [ ] Documentation is updated
- [ ] Coverage thresholds are met

---

## Phase Completion Checklist

After completing any testing phase:

- [ ] All tests passing (100%)
- [ ] API adjustments documented in `API_ADJUSTMENTS_<FEATURE>.md`
- [ ] `PROGRESS.md` updated with completion status
- [ ] Frontend compatibility checked
- [ ] Frontend adjusted if needed (types, services, components)
- [ ] All documentation files reviewed and cleaned up
- [ ] Outdated documentation removed
- [ ] Coverage numbers updated
- [ ] Git commit with proper message
- [ ] Todo list updated (mark phase complete, mark next phase in-progress)

---

## Resources

### Documentation
- [Testing Improvement Plan](./docs/testing/TESTING_IMPROVEMENT_PLAN.md)
- [Testing Quick Reference](./docs/testing/TESTING_QUICK_REFERENCE.md)
- [Progress Tracker](./docs/testing/PROGRESS.md)

### External Resources
- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

---

**Last Updated**: After Phase 1.2 Completion  
**Version**: 1.0  
**Maintained By**: Development Team
