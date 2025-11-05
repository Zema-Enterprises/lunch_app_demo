# Notification Scenarios & Requirements
**Date:** November 4, 2025  
**Purpose:** Define expected notification behavior for all user actions  
**Approach:** Test-Driven Development (TDD)

---

## Notification Principles

### Core Rules
1. **Never notify the actor** - Users don't receive notifications for their own actions
2. **Real-time delivery** - Use Socket.IO for instant notifications (not HTTP polling)
3. **Respect preferences** - Honor user notification settings
4. **Company isolation** - Only notify users within the same company
5. **Role-aware** - Different notifications for admins vs regular users

---

## Scenario 1: Event Creation

### Current Behavior ❌ INCORRECT
- Admin creates event → Admin receives "Event Created" notification
- Regular users receive notification via HTTP polling (delayed)

### Expected Behavior ✅ CORRECT
**When:** Admin/User creates an event  
**Then:**
- ✅ Creator does NOT receive notification (own action)
- ✅ All other company users receive "New Event: [Event Title]" notification via Socket.IO
- ✅ Notification delivered instantly (real-time)

### Test Case
```typescript
describe('Event Creation Notifications', () => {
  it('should NOT notify event creator', async () => {
    const creator = await createUser({ role: 'ADMIN' });
    const event = await createEvent({ createdById: creator.id });
    
    const notifications = await getNotifications(creator.id);
    expect(notifications).not.toContainEqual(
      expect.objectContaining({ type: 'EVENT_CREATED', eventId: event.id })
    );
  });

  it('should notify all other company users via Socket.IO', async () => {
    const creator = await createUser({ role: 'ADMIN' });
    const user1 = await createUser({ companyId: creator.companyId });
    const user2 = await createUser({ companyId: creator.companyId });
    
    const socketSpy = jest.spyOn(socketIO, 'emitNotification');
    await createEvent({ createdById: creator.id });
    
    expect(socketSpy).toHaveBeenCalledWith(
      creator.companyId,
      expect.objectContaining({ type: 'EVENT_CREATED' }),
      { excludeUserId: creator.id } // Don't notify creator
    );
  });
});
```

---

## Scenario 2: User Joins Event

### Current Behavior ✅ PARTIALLY CORRECT
- User joins event → Event creator receives notification (correct)
- But likely via HTTP polling, not Socket.IO

### Expected Behavior ✅ CORRECT
**When:** User joins an event  
**Then:**
- ✅ Event creator receives "[User Name] joined [Event Title]" notification via Socket.IO
- ✅ Joining user does NOT receive notification (own action)
- ✅ Other participants do NOT receive notification

### Test Case
```typescript
describe('User Joins Event Notifications', () => {
  it('should notify event creator via Socket.IO', async () => {
    const creator = await createUser({ role: 'ADMIN' });
    const joiner = await createUser({ companyId: creator.companyId });
    const event = await createEvent({ createdById: creator.id });
    
    const socketSpy = jest.spyOn(socketIO, 'emitNotification');
    await joinEvent(event.id, joiner.id);
    
    expect(socketSpy).toHaveBeenCalledWith(
      creator.companyId,
      expect.objectContaining({ 
        type: 'USER_JOINED_EVENT',
        eventId: event.id 
      }),
      { userId: creator.id } // Only notify creator
    );
  });

  it('should NOT notify the joining user', async () => {
    const creator = await createUser({ role: 'ADMIN' });
    const joiner = await createUser({ companyId: creator.companyId });
    const event = await createEvent({ createdById: creator.id });
    
    await joinEvent(event.id, joiner.id);
    
    const notifications = await getNotifications(joiner.id);
    expect(notifications).not.toContainEqual(
      expect.objectContaining({ type: 'USER_JOINED_EVENT' })
    );
  });
});
```

---

## Scenario 3: Order Placement

### Current Behavior ⚠️ UNKNOWN
- Needs verification

### Expected Behavior ✅ CORRECT
**When:** User places an order for an event  
**Then:**
- ✅ Event creator receives "[User Name] placed an order" notification via Socket.IO
- ✅ User who placed order does NOT receive notification (own action)
- ✅ Other participants do NOT receive notification

### Test Case
```typescript
describe('Order Placement Notifications', () => {
  it('should notify event creator via Socket.IO', async () => {
    const creator = await createUser({ role: 'ADMIN' });
    const user = await createUser({ companyId: creator.companyId });
    const event = await createEvent({ createdById: creator.id });
    await joinEvent(event.id, user.id);
    
    const socketSpy = jest.spyOn(socketIO, 'emitNotification');
    await placeOrder(event.id, user.id, { customOrder: 'Pizza' });
    
    expect(socketSpy).toHaveBeenCalledWith(
      creator.companyId,
      expect.objectContaining({ 
        type: 'ORDER_PLACED',
        eventId: event.id 
      }),
      { userId: creator.id } // Only notify creator
    );
  });

  it('should NOT notify the user who placed the order', async () => {
    const creator = await createUser({ role: 'ADMIN' });
    const user = await createUser({ companyId: creator.companyId });
    const event = await createEvent({ createdById: creator.id });
    await joinEvent(event.id, user.id);
    
    await placeOrder(event.id, user.id, { customOrder: 'Pizza' });
    
    const notifications = await getNotifications(user.id);
    expect(notifications).not.toContainEqual(
      expect.objectContaining({ type: 'ORDER_PLACED' })
    );
  });
});
```

---

## Scenario 4: Event Status Changes

### Expected Behavior ✅ CORRECT

#### 4a. Event Closed (Deadline Passed)
**When:** Admin/System closes an event  
**Then:**
- ✅ All participants receive "Event [Event Title] is now closed" notification via Socket.IO
- ✅ User who closed it does NOT receive notification (if manual close)

#### 4b. Event Completed
**When:** Event marked as completed (delivery received)  
**Then:**
- ✅ All participants receive "Event [Event Title] completed" notification via Socket.IO

### Test Case
```typescript
describe('Event Status Change Notifications', () => {
  it('should notify all participants when event closes', async () => {
    const creator = await createUser({ role: 'ADMIN' });
    const user1 = await createUser({ companyId: creator.companyId });
    const user2 = await createUser({ companyId: creator.companyId });
    const event = await createEvent({ createdById: creator.id });
    await joinEvent(event.id, user1.id);
    await joinEvent(event.id, user2.id);
    
    const socketSpy = jest.spyOn(socketIO, 'emitNotification');
    await closeEvent(event.id);
    
    // Should notify all 3 participants
    expect(socketSpy).toHaveBeenCalledTimes(3);
    expect(socketSpy).toHaveBeenCalledWith(
      creator.companyId,
      expect.objectContaining({ type: 'EVENT_CLOSED' }),
      { userId: expect.any(String) }
    );
  });
});
```

---

## Scenario 5: Order Updates

### Expected Behavior ✅ CORRECT

#### 5a. Order Modified
**When:** User modifies their own order  
**Then:**
- ✅ Event creator receives "[User Name] updated their order" notification via Socket.IO
- ✅ User who modified does NOT receive notification (own action)

#### 5b. Order Cancelled
**When:** User cancels their order  
**Then:**
- ✅ Event creator receives "[User Name] cancelled their order" notification via Socket.IO
- ✅ User who cancelled does NOT receive notification (own action)

---

## Scenario 6: Payment Status

### Expected Behavior ✅ CORRECT
**When:** User marks their order as paid  
**Then:**
- ✅ Event creator receives "[User Name] marked order as paid" notification via Socket.IO
- ✅ User who paid does NOT receive notification (own action)

---

## Scenario 7: Event Deletion

### Expected Behavior ✅ CORRECT
**When:** Admin deletes an event  
**Then:**
- ✅ All participants (except deleter) receive "Event [Event Title] was cancelled" notification via Socket.IO
- ✅ Admin who deleted does NOT receive notification (own action)

---

## Summary Matrix

| Action | Actor Gets Notification? | Who Gets Notified? | Delivery Method |
|--------|-------------------------|-------------------|----------------|
| Create Event | ❌ No | All other company users | Socket.IO |
| Join Event | ❌ No | Event creator only | Socket.IO |
| Place Order | ❌ No | Event creator only | Socket.IO |
| Update Order | ❌ No | Event creator only | Socket.IO |
| Cancel Order | ❌ No | Event creator only | Socket.IO |
| Mark as Paid | ❌ No | Event creator only | Socket.IO |
| Close Event | ❌ No (if manual) | All participants | Socket.IO |
| Complete Event | ✅ Yes | All participants | Socket.IO |
| Delete Event | ❌ No | All participants | Socket.IO |

---

## Implementation Plan (TDD)

### Phase 1: Write Failing Tests ✅
1. Write test for "Event creator should NOT receive notification"
2. Write test for "Other users should receive notification via Socket.IO"
3. Write test for "Exclude actor from notification recipients"
4. Run tests → See failures

### Phase 2: Fix Event Creation
1. Modify `createEvent` to exclude creator from notifications
2. Ensure Socket.IO emission (not just DB insert)
3. Run tests → See them pass

### Phase 3: Verify Other Scenarios
1. Review join event logic (likely correct)
2. Review order placement logic
3. Review status change logic
4. Add missing Socket.IO emissions where needed

### Phase 4: Integration Testing
1. Test with real Socket.IO connections
2. Verify real-time delivery in browser
3. Test multiple concurrent users
4. Verify no duplicates

---

## Socket.IO Implementation Requirements

### Current Issue
Notifications are created in database but may not be emitted via Socket.IO immediately.

### Required Changes
Every notification creation must:
1. Insert into database
2. Immediately emit via Socket.IO to target user(s)
3. Respect `excludeUserId` or `userId` targeting

### Example Pattern
```typescript
// ❌ WRONG - Only creates in DB
await createNotificationEvent({
  type: 'EVENT_CREATED',
  userId: user.id,
  eventId: event.id,
});

// ✅ CORRECT - Creates in DB AND emits via Socket.IO
await createNotificationEvent({
  type: 'EVENT_CREATED',
  userId: user.id,
  eventId: event.id,
});
// notification.service should automatically call:
socketIO.emitNotification(companyId, notification, { userId: user.id });

// ✅ CORRECT - Notify all except actor
await createNotificationEvents(
  'EVENT_CREATED',
  allUserIds.filter(id => id !== req.user!.userId), // Exclude actor
  { eventId: event.id }
);
```

---

## Testing Checklist

### Automated Tests (Backend)
- [ ] Event creation excludes creator
- [ ] Event creation notifies others via Socket.IO
- [ ] Join event notifies creator only
- [ ] Join event excludes joiner
- [ ] Order placement notifies creator
- [ ] Order placement excludes orderer
- [ ] All notifications use Socket.IO

### Manual Tests (Frontend)
- [ ] Create event as admin → No notification for admin
- [ ] Create event as admin → Other users see notification instantly
- [ ] Join event as user → Creator sees notification instantly
- [ ] Join event as user → Joiner doesn't see notification
- [ ] Place order → Creator sees notification instantly
- [ ] No duplicate notifications
- [ ] Notifications appear without page refresh

---

## Files to Modify

### Backend
1. `backend/src/modules/events/events.controller.ts`
   - Fix `createEvent` to exclude creator
   - Verify `joinEvent` logic
   - Verify order notification logic

2. `backend/src/modules/notifications/notification.service.ts`
   - Ensure Socket.IO emission on every notification
   - Add `excludeUserId` support

3. `backend/src/realtime/notifications.gateway.server.ts`
   - Verify `emitNotification` supports excluding users

### Tests
1. `backend/src/__tests__/integration/events.integration.test.ts`
   - Add test: creator doesn't receive notification
   - Add test: other users receive via Socket.IO

2. `backend/src/__tests__/integration/notifications.integration.test.ts`
   - Add test: Socket.IO delivery
   - Add test: exclude actor pattern

---

## Next Steps

1. **Write failing tests first** (TDD)
2. **Fix event creation** to exclude creator
3. **Verify Socket.IO emissions** in all notification paths
4. **Manual test** to confirm real-time delivery
5. **Document** results in regression report

---

**Status:** 📋 Specification Complete - Ready for TDD Implementation  
**Priority:** 🔴 HIGH - User-reported bug in production testing  
**Estimated Time:** 2-3 hours for full TDD cycle
