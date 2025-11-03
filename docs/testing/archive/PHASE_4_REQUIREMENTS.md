# Phase 4: Requirements & Clarifications
> **Review Update (2025-10-07):** Verified during Phase 4.4 accessibility + integration pass.

**Date**: October 7, 2025  
**Status**: ✅ Requirements Confirmed  

---

## Clarification Answers (From User)

### 1. Payment Provider Integration ✅
**Answer**: Boolean flag for now

**Implications for Testing**:
- Test `paymentConfirmed` boolean toggle
- No external payment API mocking needed
- Focus on state management (paid vs unpaid)
- Test payment confirmation permissions (who can confirm)

**Implementation**:
```typescript
// Simple PATCH endpoint
PATCH /api/orders/:eventId/orders/:id/payment
Body: {} (empty, just toggles flag)
Response: { data: { ...order, paymentConfirmed: true } }
```

---

### 2. Notification System ✅
**Answer**: In-app notifications AND email (configurable in user settings)

**Implications for Testing**:
- **Phase 4**: Focus on notification **triggers** (when notifications are sent)
- **Phase 5**: Implement notification delivery system
- **Phase 4 Scope**: Test that notification events are created, not actual delivery

**Notification Events to Test**:
1. **Event Created** - Notify company members (optional for participants)
2. **User Joined Event** - Notify event creator
3. **Order Placed** - Notify event creator (configurable)
4. **Order Updated** - Notify event creator (configurable)
5. **Event Closing Soon** - Notify participants (1 hour before deadline)
6. **Event Closed** - Notify all participants
7. **Payment Confirmed** - Notify user (individual) or creator (event creator pays)
8. **Event Completed** - Notify all participants

**User Preferences Structure**:
```typescript
UserNotificationSettings {
  emailEnabled: boolean
  inAppEnabled: boolean
  notifyOnEventCreated: boolean
  notifyOnOrderPlaced: boolean
  notifyOnDeadlineApproaching: boolean
  notifyOnEventClosed: boolean
  notifyOnPaymentConfirmed: boolean
  notifyOnEventCompleted: boolean
}
```

**Phase 4 Testing Approach**:
- Create `NotificationEvent` table/model
- Test that notification records are created at correct times
- Skip actual email/in-app delivery (that's Phase 5)

---

### 3. Real-Time Updates ✅
**Answer**: Polling (React Query auto-refetch)

**Implications for Testing**:
- Use React Query's default polling/stale-time configuration
- Test that data refreshes after mutations
- Test manual refetch when user navigates back to page
- No WebSocket testing needed

**React Query Configuration**:
```typescript
// Recommended settings
{
  staleTime: 30000,        // 30 seconds
  refetchInterval: 60000,  // 1 minute for active queries
  refetchOnWindowFocus: true,
  refetchOnReconnect: true
}
```

**Testing Approach**:
- Mock time to test stale data detection
- Verify queries refetch after mutations
- Test optimistic updates for better UX

---

### 4. Event Capacity Limits ✅
**Answer**: No limit

**Implications for Testing**:
- Skip capacity enforcement tests
- No max participants validation
- No waitlist functionality needed
- Simpler test scenarios

---

### 5. Order Deletion After Closure ✅
**Answer**: No (orders locked after event closure)

**Implications for Testing**:
- Verify deletion fails when event status is CLOSED
- Verify deletion fails when event status is COMPLETED
- Verify deletion fails when event status is CANCELLED
- Test appropriate error messages
- Confirm deletion works when event is OPEN

**Validation Logic**:
```typescript
// Backend: orders.controller.ts
if (event.status !== 'OPEN') {
  return res.status(400).json({ 
    message: 'Cannot delete order - event is closed' 
  });
}
```

---

### 6. Event Completion Trigger ✅
**Answer**: Manual AND Automatic

**Implications for Testing**:
- **Manual**: Test creator can click "Mark as Completed"
- **Automatic**: Implement background job/cron to auto-complete

**Automatic Completion Criteria**:
```typescript
// Auto-complete when:
1. Event status is CLOSED
2. All orders have paymentConfirmed === true
3. Estimated delivery time has passed
4. Event not already COMPLETED or CANCELLED
```

**Testing Approach**:
- Test manual completion (creator clicks button)
- Test automatic completion (mock cron job/scheduled task)
- Test partial payment scenario (auto-complete blocked)
- Test delivery time estimation

**Implementation Note**:
- Phase 4: Test the completion logic
- Phase 5: Implement actual cron job/scheduler

---

### 7. Company Expense Payment ✅
**Answer**: No approval workflow for now

**Implications for Testing**:
- COMPANY_EXPENSE works same as EVENT_CREATOR
- No admin approval flow
- Simple tracking/reporting only

**Testing Approach**:
- Test paymentMethod selection
- Test payment confirmation for COMPANY_EXPENSE events
- Verify expenses tracked for reporting (future feature)

---

### 8. Order History & Analytics ✅
**Answer**: Keep for 1 month

**Implications for Testing**:
- Test completed events remain accessible for 30 days
- Test archival/deletion after 30 days
- Test date-based filtering in order history

**Retention Policy**:
```typescript
// Auto-archive/delete events where:
event.status === 'COMPLETED' 
AND event.updatedAt < (NOW() - INTERVAL '30 days')
```

**Testing Approach**:
- Mock dates to test 30-day retention
- Test that recent completed events are visible
- Test that old completed events are archived
- Verify analytics still work with archived data (if needed)

**Implementation Note**:
- Phase 4: Test retention logic
- Phase 5: Implement cleanup cron job

---

### 9. Error Recovery ✅
**Answer**: Not for now (manual intervention only)

**Implications for Testing**:
- No automatic rollback mechanisms
- No refund functionality
- Focus on preventing errors (validation)
- Test error states are clearly communicated

**Testing Approach**:
- Test validation prevents invalid states
- Test error messages are clear and actionable
- Test admin can manually fix data (future admin tools)
- Document manual recovery procedures

---

### 10. Restaurant Delivery Time ✅
**Answer**: Near estimation, mark delivered when actually delivered

**Implications for Testing**:
- `deliveryTime` is estimate only (e.g., "45-60 minutes")
- Actual delivery tracked separately
- Test delivery time display in UI
- Test manual "Mark as Delivered" action

**Delivery Workflow**:
```typescript
1. Event shows estimated delivery time (from restaurant.deliveryTime)
2. Actual delivery happens
3. Creator clicks "Mark as Delivered" (updates event.deliveredAt)
4. Can trigger auto-completion if payments confirmed
```

**Testing Approach**:
- Test estimated delivery time calculation/display
- Test manual "Mark as Delivered" action
- Test deliveredAt timestamp recorded
- Test auto-completion after delivery + payment

---

## Updated Phase 4 Scope

### What's IN Scope (Phase 4)

✅ **Core Event Flow**:
- Create → Join → Order → Close → Complete (manual & auto)
- Payment confirmation (boolean flag)
- Order history (30-day retention logic)

✅ **Notification Triggers**:
- Create notification event records
- Test timing and recipients
- Test user preference checks
- Skip actual delivery (Phase 5)

✅ **Multi-User Scenarios**:
- Concurrent orders
- Race conditions
- State synchronization via polling

✅ **Error Handling**:
- Validation prevents bad states
- Clear error messages
- Order deletion restrictions

✅ **Delivery Tracking**:
- Estimated delivery time display
- Manual "Mark as Delivered"
- Auto-completion logic

### What's OUT of Scope (Future Phases)

❌ **Phase 5: Notification Delivery**:
- Email sending (SMTP/SendGrid)
- In-app notification UI
- Push notifications

❌ **Phase 5: Background Jobs**:
- Cron job for auto-completion
- Cron job for 30-day cleanup
- Scheduled deadline reminders

❌ **Future: Advanced Features**:
- Payment provider integration (Stripe/PayPal)
- Approval workflows
- Automatic rollback/refunds
- Event capacity limits

---

## New Database Schema Additions Needed

### 1. Notification Events Table
```prisma
model NotificationEvent {
  id          String   @id @default(cuid())
  type        String   // 'EVENT_CREATED', 'ORDER_PLACED', etc.
  userId      String   // Recipient
  eventId     String?  // Related event
  orderId     String?  // Related order
  read        Boolean  @default(false)
  sentEmail   Boolean  @default(false)
  sentInApp   Boolean  @default(false)
  createdAt   DateTime @default(now())
  
  user  User   @relation(fields: [userId], references: [id])
  event Event? @relation(fields: [eventId], references: [id])
  order Order? @relation(fields: [orderId], references: [id])
}
```

### 2. User Notification Settings
```prisma
model UserNotificationSettings {
  id                              String  @id @default(cuid())
  userId                          String  @unique
  emailEnabled                    Boolean @default(true)
  inAppEnabled                    Boolean @default(true)
  notifyOnEventCreated            Boolean @default(false)
  notifyOnOrderPlaced             Boolean @default(true)
  notifyOnDeadlineApproaching     Boolean @default(true)
  notifyOnEventClosed             Boolean @default(true)
  notifyOnPaymentConfirmed        Boolean @default(true)
  notifyOnEventCompleted          Boolean @default(true)
  
  user User @relation(fields: [userId], references: [id])
}
```

### 3. Event Delivery Tracking
```prisma
// Add to existing Event model
model Event {
  // ... existing fields
  deliveredAt         DateTime? // When food was actually delivered
  estimatedDelivery   String?   // "45-60 minutes" from restaurant
  // ... rest of fields
}
```

---

## Updated Test Scenarios

### Priority 1: Critical Flows (Must Test)

#### E2E-1: Complete Event Lifecycle (Happy Path)
1. Creator creates event
2. 3 users join event
3. All users place orders
4. Creator closes event
5. All users confirm payment
6. System auto-completes event (all paid + delivery time passed)
7. Verify notification events created at each step

#### E2E-2: Manual Completion Flow
1. Creator creates event
2. Users place orders
3. Creator closes event
4. Creator manually marks as delivered
5. Creator manually marks as completed (before auto-complete)

#### E2E-3: Payment Confirmation - Individual Method
1. Event with INDIVIDUAL payment method
2. 3 users place orders
3. Event closed
4. User 1 confirms payment
5. User 2 confirms payment
6. Verify event NOT auto-completed (User 3 not paid)
7. User 3 confirms payment
8. Verify event auto-completes

#### E2E-4: Payment Confirmation - Event Creator Method
1. Event with EVENT_CREATOR payment method
2. 3 users place orders
3. Event closed
4. Creator confirms all payments at once
5. Verify all orders marked as paid
6. Verify event auto-completes

#### E2E-5: Order Deletion Restrictions
1. User places order (event OPEN)
2. User deletes order ✅ Success
3. User places new order
4. Creator closes event
5. User attempts to delete order ❌ Fail (event CLOSED)

#### E2E-6: 30-Day Retention
1. Create completed event with orders
2. Mock date 29 days later → event visible
3. Mock date 31 days later → event archived/deleted

#### E2E-7: Notification Event Creation
1. User creates event → NotificationEvent records for company
2. User joins event → NotificationEvent for creator
3. User places order → NotificationEvent for creator (if enabled)
4. Event approaching deadline → NotificationEvent for participants
5. Verify notification settings respected

#### E2E-8: Polling/Refetch Behavior
1. User A views event details
2. User B places order
3. Mock 30 seconds passing
4. Verify User A's query goes stale
5. User A's UI refetches automatically
6. User A sees User B's order

### Priority 2: Edge Cases (Should Test)

#### E2E-E1: Auto-Completion Blocked by Missing Payment
1. Event closed with 3 orders
2. Only 2 users confirm payment
3. Delivery time passes
4. Verify event NOT auto-completed
5. 3rd user confirms payment
6. Verify event auto-completes immediately

#### E2E-E2: Delivery Time Estimation Display
1. Restaurant has deliveryTime "30-45 minutes"
2. Event created at 12:00 PM
3. Verify estimated delivery shows "12:30-12:45 PM"
4. Creator marks as delivered at 12:40 PM
5. Verify actual delivery time recorded

#### E2E-E3: Notification Settings Respected
1. User disables email notifications
2. Event created
3. Verify NotificationEvent has sentEmail=false
4. Verify in-app notification still created

#### E2E-E4: Concurrent Payment Confirmations
1. Event with 5 orders
2. All 5 users click "Confirm Payment" simultaneously
3. Verify all 5 confirmations recorded
4. Verify event auto-completes exactly once

---

## Implementation Plan - Updated

### Phase 4.1: Database Schema & Notifications (NEW)
**Estimated Time**: 4-6 hours

1. **Create Migration**:
   - Add `NotificationEvent` table
   - Add `UserNotificationSettings` table
   - Add `deliveredAt`, `estimatedDelivery` to `Event`

2. **Create Models & Factories**:
   - NotificationEvent factory
   - UserNotificationSettings factory
   - Update Event factory with delivery fields

3. **Create Notification Service**:
   - `createNotificationEvent(type, userId, eventId, orderId)`
   - `checkUserNotificationSettings(userId, type)`
   - Skip actual sending (Phase 5)

4. **Test Notification Triggers**:
   - Test notification records created
   - Test user settings respected
   - ~15 tests

---

### Phase 4.2: Backend E2E Integration Tests
**Estimated Time**: 16-20 hours

**Test Files**:
1. `event-lifecycle.e2e.test.ts` - Complete flow with notifications
2. `payment-flows.e2e.test.ts` - All payment methods, auto-completion
3. `order-retention.e2e.test.ts` - 30-day cleanup logic
4. `delivery-tracking.e2e.test.ts` - Delivery time, manual marking
5. `concurrent-operations.e2e.test.ts` - Race conditions

**Estimated Tests**: 45-55 comprehensive E2E tests

---

### Phase 4.3: Frontend E2E Integration Tests
**Estimated Time**: 12-16 hours

**Test Files**:
1. `event-creation-flow.e2e.test.tsx` - Create with notification preferences
2. `order-placement-flow.e2e.test.tsx` - Place order, trigger notifications
3. `payment-confirmation-flow.e2e.test.tsx` - All payment methods
4. `notification-display.e2e.test.tsx` - In-app notification UI
5. `settings-management.e2e.test.tsx` - Notification preferences

**Estimated Tests**: 35-45 frontend E2E tests

---

### Phase 4.4: Polish & Documentation
**Estimated Time**: 4-6 hours

1. Run full test suite (backend + frontend)
2. Fix any regressions
3. Create PHASE_4_COMPLETE.md
4. Update PROGRESS.md
5. Document notification system architecture

---

## Total Estimated Effort

- **Phase 4.1**: 4-6 hours (database & notification triggers)
- **Phase 4.2**: 16-20 hours (backend E2E tests)
- **Phase 4.3**: 12-16 hours (frontend E2E tests)
- **Phase 4.4**: 4-6 hours (documentation)

**Total**: 36-48 hours (4.5-6 working days)

---

## Success Criteria - Updated

✅ **Backend**:
- [ ] NotificationEvent table created and tested
- [ ] UserNotificationSettings table created and tested
- [ ] Notification triggers work correctly
- [ ] Auto-completion logic implemented and tested
- [ ] 30-day retention logic implemented and tested
- [ ] Manual delivery marking works
- [ ] 45-55 E2E tests passing (100%)

✅ **Frontend**:
- [ ] Notification preferences UI (user settings)
- [ ] In-app notification display (basic)
- [ ] Payment confirmation flows for all methods
- [ ] Delivery time estimation display
- [ ] 35-45 E2E tests passing (100%)
- [ ] Polling/refetch works correctly

✅ **Documentation**:
- [ ] PHASE_4_COMPLETE.md created
- [ ] Notification system documented
- [ ] Auto-completion logic documented
- [ ] Manual recovery procedures documented

✅ **Production Readiness**:
- [ ] Complete event lifecycle validated
- [ ] Notification system foundation ready for Phase 5
- [ ] No regressions (852+ total tests passing)

---

## Next Steps

1. ✅ Create database migration for new tables
2. ✅ Create notification service and tests
3. ✅ Begin Phase 4.2 - Backend E2E tests
4. ✅ Continue to Phase 4.3 - Frontend E2E tests
5. ✅ Complete Phase 4.4 - Documentation

**Status**: Ready to begin Phase 4.1 - Database Schema & Notifications
