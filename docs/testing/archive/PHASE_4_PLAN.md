# Phase 4: End-to-End Event Flow Testing - Comprehensive Plan
> **Review Update (2025-10-07):** Verified during Phase 4.4 accessibility + integration pass.

**Created**: October 7, 2025  
**Status**: Planning & Investigation  
**Objective**: Test complete real-world event lifecycle from creation through payment confirmation

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current System Analysis](#current-system-analysis)
3. [Event Lifecycle Map](#event-lifecycle-map)
4. [Test Scenarios](#test-scenarios)
5. [Clarification Questions](#clarification-questions)
6. [Implementation Strategy](#implementation-strategy)
7. [Success Criteria](#success-criteria)

---

## Executive Summary

### Purpose
Phase 4 validates that all components of the LunchSync system work together seamlessly to support the complete event lifecycle, from event creation through final payment confirmation.

### Scope
- **Backend**: Event, Order, Payment, Participant APIs
- **Frontend**: Event creation, menu browsing, order placement, payment confirmation
- **Integration**: Multi-user scenarios, state transitions, error handling
- **Edge Cases**: Deadlines, capacity limits, concurrent operations, payment failures

### Expected Outcomes
- 100% end-to-end flow coverage
- Confidence in production deployment
- Documentation of all critical user journeys
- Identification of any remaining integration gaps

---

## Current System Analysis

### Backend API Capabilities ✅ (Already Implemented)

#### Events Module
**Routes** (`backend/src/modules/events/events.routes.ts`):
```typescript
GET    /api/events              // List events (filtered by company)
GET    /api/events/:id          // Get single event with participants/orders
POST   /api/events              // Create event
PATCH  /api/events/:id          // Update event
DELETE /api/events/:id          // Delete event (creator only)
POST   /api/events/:id/close    // Close event (creator only)
POST   /api/events/:id/join     // Join event (idempotent)
```

**Business Rules**:
- Event status: `OPEN → CLOSED → COMPLETED/CANCELLED`
- Only creator can edit/delete/close events
- Any company member can join open events
- Participants auto-created on join (idempotent)
- Events filterable by status, creator, date range

#### Orders Module
**Routes** (`backend/src/modules/orders/orders.routes.ts`):
```typescript
GET    /api/orders/me                      // User's all orders
GET    /api/orders/:eventId/orders         // All orders for an event
POST   /api/orders/:eventId/orders         // Create/update order (upsert)
DELETE /api/orders/:eventId/orders/:id     // Delete order
PATCH  /api/orders/:eventId/orders/:id/payment  // Confirm payment
```

**Business Rules**:
- One order per user per event (upsert pattern)
- Orders can include menu items OR custom text
- Total amount calculated on backend
- Payment confirmation is boolean flag
- Orders deletable only if event is OPEN

#### Data Model (Prisma Schema)
```prisma
Event {
  id, title, description, deliveryLocation, orderDeadline
  paymentMethod: EVENT_CREATOR | INDIVIDUAL | COMPANY_EXPENSE
  status: OPEN | CLOSED | COMPLETED | CANCELLED
  createdBy, restaurant, company
  participants[], orders[]
}

Order {
  id, userId, eventId, totalAmount
  customOrder (optional text)
  paymentConfirmed (boolean)
  orderItems[] (menu-based orders)
  @@unique([userId, eventId])  // One order per user per event
}

EventParticipant {
  id, userId, eventId, joinedAt
  @@unique([userId, eventId])  // Prevents duplicate joins
}
```

### Frontend Components ✅ (Already Implemented)

#### Event Management
- **Events.tsx** - Event list page with filters (status, search, creator)
- **CreateEventDialog** - Multi-step event creation form
- **EditEventDialog** - Event editing (creator only)
- **EventDetailsModal** - Event details with participants and orders
  - Shows participant list
  - Shows all orders with payment status
  - Join event button
  - Close event button (creator only)

#### Order Management
- **Orders.tsx** - User's order history
- **OrderModal** - Order creation/editing
  - Browse menu items
  - Add quantities
  - Custom order text option
  - Special instructions
  - Total calculation

#### Restaurant/Menu
- **Restaurants.tsx** - Restaurant list
- **RestaurantDetails.tsx** - Restaurant page with menu
- **MenuManagement.tsx** - Admin menu CRUD

### Existing Test Coverage

#### Backend Integration Tests ✅
- **auth.integration.test.ts** (47 tests) - Authentication flows
- **events.integration.test.ts** (85 tests) - Event CRUD, participants, status transitions
- **orders.integration.test.ts** (88 tests) - Order creation, updates, payment confirmation
- **restaurants.integration.test.ts** (24 tests) - Restaurant management
- **users.integration.test.ts** (17 tests) - User management

**Total Backend Tests**: 261 tests (100% passing)

#### Frontend Component Tests ✅
- **Phase 3.1**: Authentication components (128 tests)
- **Phase 3.2**: Event management components (126 tests)
- **Phase 3.3**: Order management components (57 tests)
- **Phase 3.4**: Restaurant management components (72 tests)
- **Phase 3.5**: Menu management components (80 tests)
- **Phase 3.6**: User/company management (128 tests)

**Total Frontend Tests**: 591 tests (100% passing)

---

## Event Lifecycle Map

### Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 1: EVENT CREATION (Admin/Creator)                            │
├─────────────────────────────────────────────────────────────────────┤
│  1. Creator logs in                                                  │
│  2. Navigates to Events page                                         │
│  3. Clicks "Create Event"                                            │
│  4. Fills form:                                                      │
│     - Title, description                                             │
│     - Selects restaurant                                             │
│     - Sets delivery location                                         │
│     - Sets order deadline                                            │
│     - Chooses payment method                                         │
│  5. Submits → Event created with status OPEN                         │
│  6. Creator auto-joined as participant                               │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 2: PARTICIPANT INVITATION & JOINING (All Users)               │
├─────────────────────────────────────────────────────────────────────┤
│  7. Other users browse Events page                                   │
│  8. See event in "Open Events" list                                  │
│  9. Click event → View details in modal                              │
│  10. Click "Join Event" button                                       │
│  11. Participant record created (idempotent)                         │
│  12. User now sees event in "My Events"                              │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 3: MENU BROWSING & ORDER PLACEMENT (Participants)             │
├─────────────────────────────────────────────────────────────────────┤
│  13. Participant opens event details                                 │
│  14. Clicks "Place Order" or "View Restaurant"                       │
│  15. Browses restaurant menu                                         │
│  16. Adds items to order:                                            │
│      - Select menu items with quantities                             │
│      - OR enter custom order text                                    │
│      - Add special instructions (optional)                           │
│  17. Reviews total amount                                            │
│  18. Submits order                                                   │
│  19. Order created/updated (upsert pattern)                          │
│  20. Order appears in event details                                  │
│  21. Can edit order until deadline                                   │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 4: ORDER DEADLINE & EVENT CLOSURE (Creator)                   │
├─────────────────────────────────────────────────────────────────────┤
│  22. Order deadline passes                                           │
│  23. Creator clicks "Close Event"                                    │
│  24. Event status → CLOSED                                           │
│  25. No more orders can be placed/edited                             │
│  26. Creator reviews all orders                                      │
│  27. Creator places actual restaurant order                          │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 5: PAYMENT PROCESSING (Depends on paymentMethod)              │
├─────────────────────────────────────────────────────────────────────┤
│  IF paymentMethod === EVENT_CREATOR:                                 │
│    28a. Creator pays for all orders                                  │
│    29a. Creator confirms all payments at once                        │
│                                                                       │
│  IF paymentMethod === INDIVIDUAL:                                    │
│    28b. Each participant pays individually                           │
│    29b. Each user confirms their own payment                         │
│    30b. Payment status tracked per order                             │
│                                                                       │
│  IF paymentMethod === COMPANY_EXPENSE:                               │
│    28c. Company pays (via expense system)                            │
│    29c. Admin confirms payment                                       │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 6: DELIVERY & COMPLETION                                      │
├─────────────────────────────────────────────────────────────────────┤
│  31. Food delivered to delivery location                             │
│  32. Participants pick up their orders                               │
│  33. Creator marks event as COMPLETED                                │
│  34. Event archived in history                                       │
│  35. Statistics updated                                              │
└─────────────────────────────────────────────────────────────────────┘
```

### State Transition Diagram

```
     ┌─────────┐
     │ CREATED │
     └────┬────┘
          │
          │ (Auto on creation)
          ↓
     ┌────────┐    closeEvent()     ┌────────┐
  ┌──│  OPEN  │───────────────────→ │ CLOSED │
  │  └────┬───┘                      └────┬───┘
  │       │                               │
  │       │ deleteEvent()                 │ markComplete()
  │       │ (before orders)               │
  │       ↓                               ↓
  │  ┌───────────┐                  ┌───────────┐
  └─→│ CANCELLED │                  │ COMPLETED │
     └───────────┘                  └───────────┘
```

### Critical Business Rules

1. **Event Creation**
   - Must select existing restaurant
   - Order deadline must be in the future
   - Creator auto-joins as participant

2. **Participant Management**
   - Users can only join events in their company
   - Joining is idempotent (no duplicate participants)
   - Participants can view event details and orders

3. **Order Management**
   - One order per user per event (upsert pattern)
   - Orders can only be created/edited while event is OPEN
   - Can have menu items OR custom text, not both
   - Total amount required for tracking

4. **Event Closure**
   - Only creator can close event
   - Event must be OPEN to close
   - After closure, no new orders or edits allowed
   - Closure triggers payment workflow

5. **Payment Confirmation**
   - Payment method determines who confirms
   - Individual payments tracked per order
   - Payment confirmation updates `paymentConfirmed` flag

---

## Test Scenarios

### Critical End-to-End Flows

#### E2E-1: Happy Path - Complete Event Lifecycle (CRITICAL)
**Actors**: Event Creator, Participant 1, Participant 2

**Steps**:
1. ✅ Creator creates event with restaurant A
2. ✅ Participant 1 joins event
3. ✅ Participant 2 joins event
4. ✅ Participant 1 places menu-based order (2 items, $25)
5. ✅ Participant 2 places custom order ($15)
6. ✅ Creator places own order ($20)
7. ✅ Creator closes event (status OPEN → CLOSED)
8. ✅ All participants confirm payments
9. ✅ Creator marks event as COMPLETED

**Assertions**:
- Event visible to all company members
- 3 participants created
- 3 orders created with correct totals
- Event status transitions correctly
- Payment confirmations recorded
- Orders locked after event closure
- Statistics updated

---

#### E2E-2: Order Modification Flow
**Actors**: Participant

**Steps**:
1. Participant joins event
2. Participant places order (menu: item A, qty 1, $10)
3. Participant edits order (changes to item B, qty 2, $20)
4. Participant submits updated order
5. Event creator closes event
6. Participant attempts to edit order (should fail)

**Assertions**:
- First order created successfully
- Order update (upsert) works correctly
- Only one order exists for user (no duplicates)
- Order update fails after event closure
- Error message displayed appropriately

---

#### E2E-3: Concurrent Order Placement
**Actors**: 5 Participants

**Steps**:
1. All 5 participants join event simultaneously
2. All 5 place orders at the same time
3. All orders submitted concurrently

**Assertions**:
- No race conditions
- Exactly 5 orders created
- No duplicate orders
- All totals calculated correctly
- Database constraints enforced

---

#### E2E-4: Payment Method - Event Creator Pays
**Actors**: Creator, 3 Participants

**Steps**:
1. Creator creates event with paymentMethod: EVENT_CREATOR
2. 3 participants join and place orders
3. Creator closes event
4. Creator views all orders (total: $75)
5. Creator confirms all payments at once

**Assertions**:
- Payment responsibility clear in UI
- Creator can see total amount to pay
- All orders marked as paymentConfirmed
- Event can be completed after payment

---

#### E2E-5: Payment Method - Individual Payments
**Actors**: Creator, 3 Participants

**Steps**:
1. Creator creates event with paymentMethod: INDIVIDUAL
2. 3 participants place orders
3. Creator closes event
4. Each participant confirms own payment independently
5. Creator verifies all payments confirmed

**Assertions**:
- Each user only sees own payment option
- Payment status tracked per order
- Creator can see which users have paid
- Event completion requires all payments

---

#### E2E-6: Deadline Enforcement
**Actors**: Creator, Participant

**Steps**:
1. Creator creates event with deadline in 1 hour
2. Participant joins and places order
3. Time passes (deadline reached)
4. Participant attempts to edit order
5. Another user attempts to place order

**Assertions**:
- UI shows deadline prominently
- Orders locked after deadline
- Appropriate error messages shown
- Creator can still close event manually

---

#### E2E-7: Error Handling - Restaurant Unavailable
**Actors**: Creator, Participant

**Steps**:
1. Creator creates event with restaurant A
2. Admin deletes restaurant A (edge case)
3. Participant attempts to view event
4. Participant attempts to place order

**Assertions**:
- Graceful error handling
- Event still visible with error state
- Users can't place orders
- Creator notified of issue
- Event can be cancelled

---

#### E2E-8: Multi-User Real-Time Updates
**Actors**: Creator, 5 Participants

**Steps**:
1. All users viewing event details simultaneously
2. Participant 1 places order → all see update
3. Participant 2 edits order → all see update
4. Creator closes event → all see status change

**Assertions**:
- Real-time updates (if implemented)
- OR manual refresh shows correct state
- No stale data displayed
- Optimistic UI updates work correctly

---

#### E2E-9: Event Cancellation Flow
**Actors**: Creator, 3 Participants

**Steps**:
1. Creator creates event
2. 3 participants join and place orders
3. Creator cancels event (status → CANCELLED)
4. Participants notified of cancellation
5. Orders remain visible for history

**Assertions**:
- Event status updated
- Users can't place new orders
- Existing orders preserved
- Cancellation reason recorded (if applicable)

---

#### E2E-10: Company Isolation Verification
**Actors**: Company A User, Company B User

**Steps**:
1. Company A user creates event
2. Company B user attempts to view event
3. Company B user attempts to join event
4. Company A user's event not visible to Company B

**Assertions**:
- Strict company isolation maintained
- No cross-company data leakage
- 403 Forbidden errors on unauthorized access
- Event lists properly filtered by company

---

### Edge Cases & Error Scenarios

#### E2E-E1: Empty Menu Restaurant
**Setup**: Restaurant with no menu items  
**Test**: Can users place custom orders only?  
**Expected**: Custom orders allowed, menu ordering disabled

#### E2E-E2: Zero Total Amount Order
**Setup**: Event created, user places order with $0 total  
**Test**: Is this allowed?  
**Expected**: TBD - need clarification

#### E2E-E3: Participant Leaves Event
**Setup**: User joined event, placed order  
**Test**: Can user leave event? What happens to order?  
**Expected**: TBD - need clarification (no leave functionality currently)

#### E2E-E4: Creator Deletes Own Participation
**Setup**: Creator has order in own event  
**Test**: Can creator delete own order?  
**Expected**: Yes, creator is also a participant

#### E2E-E5: Event with No Participants
**Setup**: Creator creates event but no one joins  
**Test**: Can event be closed and completed?  
**Expected**: Yes, valid scenario (creator-only lunch)

#### E2E-E6: Duplicate Order Submission
**Setup**: User double-clicks submit button  
**Test**: Are duplicate orders prevented?  
**Expected**: Upsert pattern should prevent duplicates

#### E2E-E7: Menu Item Price Changes
**Setup**: User adds item to order, menu price changes before submission  
**Test**: Which price is recorded?  
**Expected**: Price at order time (captured in orderItems)

#### E2E-E8: Restaurant Closes During Event
**Setup**: Event created for restaurant with openTime/closeTime  
**Test**: Event deadline extends past restaurant closeTime  
**Expected**: TBD - validation needed?

#### E2E-E9: Payment Partial Confirmation
**Setup**: 5 orders in event with INDIVIDUAL payment  
**Test**: Only 3 users confirm payment  
**Expected**: Event can't be completed until all confirm

#### E2E-E10: Concurrent Event Closure
**Setup**: Multiple admins viewing same event  
**Test**: Two admins click "Close Event" simultaneously  
**Expected**: Idempotent operation, no errors

---

## Clarification Questions

### Critical Questions (Need Answers Before Testing)

#### 1. **Payment Provider Integration**
**Question**: Is there an actual payment provider integration (Stripe, PayPal, etc.) or is "payment confirmation" just a boolean flag?

**Current Understanding**: 
- Backend has `paymentConfirmed` boolean field
- No external payment API calls visible
- PATCH endpoint just toggles flag

**Impact on Testing**:
- If boolean only: Test flag toggling and state management
- If real integration: Test payment webhooks, refunds, failures, etc.

**Recommendation**: Clarify immediately to scope Phase 4 correctly

---

#### 2. **Notification/Email System**
**Question**: Are there email notifications or in-app notifications for:
- Event invitations?
- Order deadlines approaching?
- Event closure?
- Payment confirmations?

**Current Understanding**: No notification system visible in codebase

**Impact on Testing**:
- If yes: Need to test notification delivery, content, timing
- If no: Phase 4 can skip notification testing

**Recommendation**: Clarify notification requirements

---

#### 3. **Real-Time Updates**
**Question**: Are event details updated in real-time when orders are placed, or does the UI require manual refresh?

**Current Understanding**: 
- React Query may provide some caching/refetching
- No WebSocket or SSE implementation visible

**Impact on Testing**:
- Real-time: Test race conditions, concurrent updates, WebSocket reliability
- Polling: Test refetch intervals, stale data handling

**Recommendation**: Document expected behavior for tests

---

#### 4. **Event Capacity Limits**
**Question**: Can events have a maximum participant count? Can orders have quantity limits?

**Current Understanding**: No capacity fields in Event schema

**Impact on Testing**:
- If yes: Test capacity enforcement, waitlists, first-come-first-served
- If no: Skip capacity testing

**Recommendation**: Confirm if capacity limits are a requirement

---

#### 5. **Order Deletion After Event Closure**
**Question**: Can orders be deleted after event is closed? What about completed events?

**Current Understanding**: 
- Backend checks `event.status !== 'OPEN'` and blocks deletion
- Once closed, orders are locked

**Impact on Testing**:
- Verify orders are immutable after closure
- Test error handling for deletion attempts

**Recommendation**: Confirm this is intended behavior

---

#### 6. **Event Completion Trigger**
**Question**: What triggers event status change from CLOSED → COMPLETED?
- Manual action by creator?
- Automatic after delivery time?
- After all payments confirmed?

**Current Understanding**: No automatic completion logic visible

**Impact on Testing**:
- Manual: Test creator completion workflow
- Automatic: Test timing, triggers, edge cases

**Recommendation**: Clarify completion workflow

---

#### 7. **Company Expense Payment Method**
**Question**: How does COMPANY_EXPENSE payment method work? Is there an expense approval flow?

**Current Understanding**: Payment method is enum, no special handling visible

**Impact on Testing**:
- If approval flow exists: Test approval states, rejections
- If simple flag: Test basic expense tracking

**Recommendation**: Document COMPANY_EXPENSE workflow

---

#### 8. **Order History & Analytics**
**Question**: Are completed events and orders preserved for history/reporting? Can they be viewed later?

**Current Understanding**: 
- No soft delete on events/orders
- Completed status exists

**Impact on Testing**:
- Test historical data access
- Test filtering by date ranges
- Verify data integrity over time

**Recommendation**: Confirm retention/archival policy

---

#### 9. **Error Recovery Mechanisms**
**Question**: If payment fails or order can't be fulfilled, what's the recovery process?
- Can events be reopened?
- Can orders be refunded?
- Can status be rolled back?

**Current Understanding**: No rollback mechanisms visible

**Impact on Testing**:
- Test error states
- Test manual intervention paths
- Verify data consistency

**Recommendation**: Define error recovery procedures

---

#### 10. **Restaurant Delivery Time**
**Question**: Is the `deliveryTime` field used to calculate expected delivery? Does it affect event completion?

**Current Understanding**: deliveryTime is a string field, no logic using it

**Impact on Testing**:
- If used: Test delivery time calculations, estimates
- If not: Can skip delivery time testing

**Recommendation**: Clarify deliveryTime purpose

---

### Nice-to-Have Clarifications

11. **Custom Order Validation**: Any restrictions on custom order text length or content?
12. **Order Amount Validation**: Min/max order amounts? Zero-dollar orders allowed?
13. **Restaurant Selection**: Can events use restaurants from other companies? (Probably no - company isolation)
14. **Event Templates**: Can users save event templates for recurring lunches?
15. **Participant Limits**: Is there a max participants per event?

---

## Implementation Strategy

### Phase 4 Sub-Phases

#### Phase 4.1: Backend E2E Integration Tests (Week 1)
**Objective**: Test complete backend flow with real database transactions

**Test Files to Create**:
1. `event-lifecycle.e2e.test.ts` - Full event flow (create → join → order → close → complete)
2. `payment-flows.e2e.test.ts` - All payment method scenarios
3. `concurrent-operations.e2e.test.ts` - Race conditions, locks, constraints
4. `error-scenarios.e2e.test.ts` - Edge cases, failures, rollbacks

**Estimated Tests**: 40-50 comprehensive E2E tests  
**Estimated Time**: 16-20 hours

---

#### Phase 4.2: Frontend E2E Integration Tests (Week 2)
**Objective**: Test frontend user flows with MSW mocked backend

**Test Files to Create**:
1. `event-creation-flow.e2e.test.tsx` - Complete event creation wizard
2. `order-placement-flow.e2e.test.tsx` - Browse menu → add items → submit
3. `multi-user-scenarios.e2e.test.tsx` - Concurrent actions, state sync
4. `payment-confirmation-flow.e2e.test.tsx` - All payment method UIs

**Estimated Tests**: 30-40 frontend E2E tests  
**Estimated Time**: 12-16 hours

---

#### Phase 4.3: Full-Stack E2E Tests (Week 3) - OPTIONAL
**Objective**: Test with real backend + frontend interaction (Playwright/Cypress)

**Scope**:
- Spin up backend API server
- Spin up frontend dev server
- Run browser automation tests
- Verify complete system integration

**Estimated Tests**: 15-20 critical paths  
**Estimated Time**: 20-24 hours  
**Note**: Only if time permits and critical issues found in Phases 4.1/4.2

---

### Testing Tools & Setup

#### Backend E2E Tests
- **Framework**: Jest + Supertest (existing)
- **Database**: Real PostgreSQL with transactions
- **Helpers**: Existing setupCompanyWithUsers, cleanupTestData
- **Pattern**: Multi-user scenarios with separate auth tokens

#### Frontend E2E Tests
- **Framework**: Vitest + React Testing Library (existing)
- **API Mocking**: MSW (existing)
- **Router**: React Router with MemoryRouter for tests
- **Pattern**: User event simulation with userEvent library

#### Full-Stack E2E Tests (Optional)
- **Framework**: Playwright or Cypress
- **Database**: Separate test database with seed data
- **Setup**: Docker Compose for backend + frontend
- **Pattern**: Real browser automation with selectors

---

### Test Development Workflow

1. **Read Clarification Answers** (from user)
2. **Update Phase 4 Plan** (based on answers)
3. **Write Test Case** (following TDD)
4. **Run Test** (should fail initially)
5. **Fix Implementation** (backend or frontend)
6. **Verify Test Passes**
7. **Document Findings** (in test comments)
8. **Repeat** for next scenario

---

## Success Criteria

### Phase 4 Completion Criteria

✅ **Backend E2E Tests**:
- [ ] 40+ comprehensive E2E tests written
- [ ] 100% test pass rate
- [ ] All critical flows covered (E2E-1 through E2E-10)
- [ ] Edge cases validated
- [ ] Performance acceptable (< 30s total test time)

✅ **Frontend E2E Tests**:
- [ ] 30+ user flow tests written
- [ ] 100% test pass rate
- [ ] All UI interactions tested
- [ ] Error states properly displayed
- [ ] Loading states handled

✅ **Documentation**:
- [ ] PHASE_4.1_COMPLETE.md created
- [ ] PHASE_4.2_COMPLETE.md created
- [ ] PHASE_4_COMPLETE.md summary
- [ ] PROGRESS.md updated
- [ ] All clarification questions answered

✅ **Code Quality**:
- [ ] No regressions in existing tests (591 frontend + 261 backend)
- [ ] Test code follows established patterns
- [ ] Clear test descriptions and comments
- [ ] Proper cleanup in afterEach hooks

✅ **Production Readiness**:
- [ ] Confidence in complete event lifecycle
- [ ] All payment flows validated
- [ ] Multi-user scenarios work correctly
- [ ] Error handling comprehensive
- [ ] No critical bugs identified

---

## Risk Assessment

### High Risk Areas

1. **Concurrent Order Placement**
   - Risk: Race conditions, duplicate orders
   - Mitigation: Database constraints, upsert pattern, transaction tests

2. **Payment State Management**
   - Risk: Inconsistent payment states, lost confirmations
   - Mitigation: Comprehensive payment flow tests, state validation

3. **Event Status Transitions**
   - Risk: Invalid state changes, stuck events
   - Mitigation: State machine tests, transition guards

4. **Company Isolation**
   - Risk: Data leakage across companies
   - Mitigation: Extensive company isolation tests

### Medium Risk Areas

5. **Deadline Enforcement**
   - Risk: Orders accepted after deadline
   - Mitigation: Time-based tests, deadline validation

6. **Order Upsert Logic**
   - Risk: Duplicate orders, lost updates
   - Mitigation: Unique constraint tests, update scenarios

7. **Menu Item Changes**
   - Risk: Price mismatches, missing items
   - Mitigation: Historical price preservation tests

### Low Risk Areas

8. **Restaurant Management** - Already well-tested in Phase 2
9. **User Authentication** - Already well-tested in Phase 1
10. **UI Components** - Already well-tested in Phase 3

---

## Next Steps

1. **User Reviews This Plan** ✅ (You are here)
2. **User Answers Clarification Questions** ⏳ (Waiting for you)
3. **Agent Updates Plan** (Based on answers)
4. **Phase 4.1 Begins** (Backend E2E tests)
5. **Phase 4.2 Follows** (Frontend E2E tests)
6. **Phase 4 Complete** (Full event flow validated)

---

## Appendix: Test Naming Conventions

### Backend E2E Tests
```typescript
describe('Event Lifecycle E2E', () => {
  describe('E2E-1: Complete Event Flow - Happy Path', () => {
    it('should allow creator to create event, users to join, place orders, and complete payment', async () => {
      // Test implementation
    });
  });
});
```

### Frontend E2E Tests
```typescript
describe('Event Creation Flow E2E', () => {
  describe('E2E-1: Happy Path - Create Event with Menu Orders', () => {
    it('should guide user through complete event creation and order placement', async () => {
      // Test implementation
    });
  });
});
```

---

**End of Phase 4 Plan**
