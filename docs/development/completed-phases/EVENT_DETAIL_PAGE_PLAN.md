# Event Detail Page - Phase 1 Implementation Plan

## Overview
Implementing essential user actions and order management on the Event Detail page following TDD principles.

## Event Status Flow & Triggers

### Status Definitions

```typescript
enum EventStatus {
  OPEN = 'OPEN',           // Accepting participants and orders
  CLOSED = 'CLOSED',       // Orders finalized, awaiting delivery
  DELIVERED = 'DELIVERED', // Food has been delivered
  COMPLETED = 'COMPLETED', // Event finished, all payments confirmed
  CANCELLED = 'CANCELLED'  // Event was cancelled
}
```

### Status Transition Rules

#### 1. OPEN → CLOSED
**Triggers:**
- Manual: Admin/Creator clicks "Close Event"
- Automatic: Order deadline passes (backend cron job)

**Conditions:**
- Event must be in OPEN status
- Only creator or admin can manually close

**Effects:**
- No more participants can join
- No new orders can be placed
- Existing orders can no longer be edited
- Notification sent to all participants: "EVENT_CLOSED"

#### 2. CLOSED → DELIVERED
**Triggers:**
- Manual: Admin/Creator clicks "Mark as Delivered"

**Conditions:**
- Event must be in CLOSED status
- Only creator or admin can mark as delivered

**Effects:**
- Notification sent to all participants: "EVENT_DELIVERED"
- Payment reminders can be sent (if payment method is INDIVIDUAL)

#### 3. DELIVERED → COMPLETED
**Triggers:**
- Manual: Admin/Creator clicks "Complete Event"
- Automatic: All payments confirmed (if INDIVIDUAL payment method)

**Conditions:**
- Event must be in DELIVERED status
- If payment method is INDIVIDUAL, all participants must have paymentConfirmed = true

**Effects:**
- Event archived/marked as complete
- Notification sent: "EVENT_COMPLETED"
- Event appears in history/completed events list

#### 4. Any Status → CANCELLED
**Triggers:**
- Manual: Admin/Creator clicks "Cancel Event"

**Conditions:**
- Only creator or admin can cancel
- Cannot cancel if status is already COMPLETED

**Effects:**
- All orders are marked as cancelled
- Notification sent to all participants
- Refunds initiated (if applicable)

### Order Management Rules

#### Order Placement
**User Can Place Order When:**
- Event status is OPEN
- User is a participant (has joined the event)
- User has NOT already placed an order for this event

**One Order Per User Per Event:**
- Each user can only have ONE order per event
- After placing, user sees "Edit Order" instead of "Place Order"

#### Order Editing
**User Can Edit Order When:**
- Event status is OPEN
- User has already placed an order
- Before order deadline

**What Can Be Edited:**
- Order items (add/remove menu items, change quantities)
- Custom order text
- All edits update the same order record (no new order created)

#### Order Cancellation
**User Can Cancel Order When:**
- Event status is OPEN
- User has placed an order
- Before order deadline

**Effects:**
- Order is deleted from database
- User becomes "participant without order"
- User can place a new order

## Phase 1 Implementation - Essential Actions

### 1. User State Detection
Determine user's relationship to the event:

```typescript
interface UserEventState {
  isParticipant: boolean;      // User has joined the event
  isCreator: boolean;          // User created the event
  isAdmin: boolean;            // User has ADMIN role
  hasOrder: boolean;           // User has placed an order
  canJoin: boolean;            // Can join the event
  canLeave: boolean;           // Can leave the event
  canPlaceOrder: boolean;      // Can place new order
  canEditOrder: boolean;       // Can edit existing order
  canCancelOrder: boolean;     // Can cancel their order
  canCloseEvent: boolean;      // Can close the event
  userOrder?: Order;           // User's order if exists
}
```

### 2. Action Buttons Based on State

#### Join Event Button
**Display When:**
- Event status = OPEN
- User is NOT a participant
- User is authenticated

**Action:**
- POST /api/events/:id/join
- Updates participants list
- User sees "Place Order" button
- Notification sent to creator: "USER_JOINED_EVENT"

#### Place Order Button
**Display When:**
- Event status = OPEN
- User IS a participant
- User does NOT have an order
- Before order deadline

**Action:**
- Opens OrderModal with event and restaurant details
- After submission: POST /api/orders
- Order appears in orders section
- Button changes to "Edit Order"

#### Edit Order Button
**Display When:**
- Event status = OPEN
- User IS a participant
- User HAS an order
- Before order deadline

**Action:**
- Opens OrderModal pre-filled with existing order
- After submission: PATCH /api/orders/:id
- Updates existing order
- Order total recalculated

#### Leave Event Button
**Display When:**
- Event status = OPEN
- User IS a participant
- User is NOT the creator
- User does NOT have an order (or after cancelling order)

**Action:**
- DELETE /api/events/:id/participants/:userId
- Removes user from participants list
- User no longer sees event details
- "Join Event" button shows again

### 3. Orders Section

#### Display All Orders (Admin/Creator View)
**Show:**
- All orders from all participants
- Each order card shows:
  - User name and avatar
  - Order items with quantities
  - Total amount
  - Payment confirmation status
  - Timestamp

#### Display User's Order (Regular User View)
**Show:**
- Only the current user's order
- Same information as admin view
- Edit/Cancel order buttons
- "Other participants have ordered" count

#### Empty State
**When no orders exist:**
- "No orders yet"
- "Be the first to place your order!" (if user is participant)
- "Waiting for participants to order" (if user is not participant)

### 4. Participant State Indicators

**Visual States:**
- 👤 Regular participant (no order)
- 🍽️ Participant with order
- 👑 Event creator
- ✅ Order paid/confirmed

**Participant Card Shows:**
```
[Avatar] John Doe [You] [Creator]
        Joined 2 hours ago
        ✅ Order placed • $24.50
```

### 5. Status-Specific UI

#### OPEN Status
- Green badge
- "Event is accepting orders"
- Countdown timer: "2h 15m until deadline"
- All action buttons enabled

#### CLOSED Status
- Yellow badge
- "Orders are closed, awaiting delivery"
- No order actions available
- Show "Mark as Delivered" button (admin only)

#### DELIVERED Status
- Blue badge
- "Food has been delivered"
- Show "Complete Event" button (admin only)
- Payment confirmation UI (if INDIVIDUAL payment)

#### COMPLETED Status
- Green badge with checkmark
- "Event completed"
- All data read-only
- Show completion date

#### CANCELLED Status
- Red badge
- "Event was cancelled"
- Show cancellation reason (if provided)
- All actions disabled

## API Endpoints Used

### Phase 1 Required Endpoints
- `POST /api/events/:id/join` - Join event
- `DELETE /api/events/:id/leave` - Leave event (NEW - needs implementation)
- `POST /api/events/:id/close` - Close event
- `GET /api/events/:id/orders` - Get orders for event (NEW - needs implementation)
- `POST /api/orders` - Create order
- `PATCH /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Cancel order

### Future Endpoints (Phase 2+)
- `POST /api/events/:id/deliver` - Mark as delivered
- `POST /api/events/:id/complete` - Complete event
- `POST /api/events/:id/cancel` - Cancel event
- `PATCH /api/orders/:id/payment` - Confirm payment

## TDD Implementation Steps

### Step 1: Backend API Tests & Implementation
1. **Test**: POST /api/events/:id/leave (new endpoint)
   - Regular participant can leave
   - Creator cannot leave
   - User with order cannot leave without cancelling order first
   - Returns 403 if conditions not met

2. **Test**: GET /api/events/:id/orders (new endpoint)
   - Returns all orders for the event
   - Includes user details and order items
   - Filtered by companyId
   - Includes payment status

3. **Implementation**: Create leave endpoint and orders endpoint

### Step 2: Frontend Tests
1. **Test**: EventDetail shows correct buttons based on user state
2. **Test**: Join button calls joinEvent mutation
3. **Test**: Place Order opens OrderModal
4. **Test**: Edit Order opens OrderModal with existing data
5. **Test**: Leave Event shows confirmation and calls leaveEvent
6. **Test**: Orders section displays correctly
7. **Test**: Different views for admin vs regular user

### Step 3: Frontend Implementation
1. Add user state detection logic
2. Implement conditional button rendering
3. Add OrderModal integration
4. Create orders section component
5. Add status-specific UI elements
6. Implement countdown timer
7. Add confirmation dialogs for destructive actions

### Step 4: Integration Testing
1. Test full user flow: Join → Place Order → Edit Order → Cancel Order → Leave
2. Test admin flow: View all orders → Close Event
3. Test permission boundaries
4. Test status transitions
5. Test real-time updates (if notifications enabled)

## Component Structure

```typescript
EventDetail/
├── EventDetailHeader (title, status, back button)
├── EventActionBar (join, place order, edit, leave, close buttons)
├── EventInfoCard (deadline, location, restaurant, creator)
├── EventStatusBanner (countdown timer, status message)
├── RestaurantCard (clickable, shows menu preview)
├── ParticipantsCard (list with state indicators)
├── OrdersSection
│   ├── OrdersList (admin view - all orders)
│   ├── UserOrderCard (user view - their order)
│   └── EmptyOrdersState
└── EventActionsMenu (admin: duplicate, cancel, export)
```

## Edge Cases to Handle

1. **Race Conditions:**
   - User joins while event closes
   - User places order as deadline passes
   - Multiple users editing same order

2. **Permission Changes:**
   - User loses admin role mid-session
   - Event creator transfers ownership

3. **Data Consistency:**
   - Order total doesn't match items
   - Participant without user record
   - Orphaned orders (user left but order remains)

4. **Network Issues:**
   - Optimistic updates with rollback
   - Offline order edits
   - Stale data after reconnect

## Success Metrics

### Functional Completeness
- ✅ Users can join events
- ✅ Users can place orders
- ✅ Users can edit their orders
- ✅ Users can leave events
- ✅ Admins can close events
- ✅ Orders display correctly
- ✅ Permissions enforced correctly

### Test Coverage
- ✅ 100% of new backend endpoints tested
- ✅ All user flows have integration tests
- ✅ Edge cases covered
- ✅ Permission boundaries tested

### UX Quality
- ✅ Clear call-to-action buttons
- ✅ Disabled states explained
- ✅ Loading states for all actions
- ✅ Error messages are helpful
- ✅ Success feedback visible
- ✅ Countdown timer accurate

## Future Considerations (Post Phase 1)

1. **Order History & Analytics**
   - User's order history across all events
   - Spending analytics
   - Favorite restaurants/items

2. **Advanced Order Features**
   - Split payments
   - Tip/delivery fee sharing
   - Dietary restrictions/notes
   - Special instructions

3. **Event Templates**
   - Save recurring events
   - Quick duplicate with same settings
   - Team lunch schedules

4. **Social Features**
   - Comment on events
   - Reactions to orders
   - Group chat per event
   - @mention participants

5. **Mobile Optimization**
   - Progressive Web App features
   - Push notifications for status changes
   - Offline order drafts
   - Quick actions from notifications
