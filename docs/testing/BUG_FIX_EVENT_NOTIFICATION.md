# Bug Fix: Regular Users Not Receiving Event Creation Notifications

**Date**: November 6, 2025  
**Issue**: Regular users were not receiving notifications when an admin creates an event  
**Status**: ✅ **FIXED**

## Problem

When an admin created an event, regular users in the same company did not receive `EVENT_CREATED` notifications, even though the notification system was working correctly for other notification types.

## Root Cause

The issue was in the seed data file (`backend/prisma/seed.ts`). The regular user's notification settings had `notifyOnEventCreated` set to `false`:

```typescript
// BEFORE (incorrect)
notifyOnEventCreated: false, // Default user doesn't want ALL event notifications
```

This was inconsistent with:
1. The database schema default: `@default(true)`
2. The notification service default when creating settings programmatically: `notifyOnEventCreated: true`

## Solution

Changed the seed data to set `notifyOnEventCreated: true` for regular users:

```typescript
// AFTER (correct)
notifyOnEventCreated: true, // Users should receive event creation notifications
```

### Files Modified

- `backend/prisma/seed.ts` - Line 63: Changed `notifyOnEventCreated` from `false` to `true`

### Database Update

Reset and re-seeded the database to apply the fix:
```bash
cd backend
npx prisma db push --force-reset
npm run db:seed
```

## Verification

### Test Results
All 54 event integration tests passing, including:
- ✅ `should NOT send notification to event creator` 
- ✅ `should send notification to other company users when event is created`

### Manual Testing Steps

1. **Login as Admin**:
   - Email: `admin@demo.com`
   - Password: `password123`

2. **Create a New Event**:
   - Navigate to Events page
   - Click "Create Event"
   - Fill in event details
   - Submit

3. **Login as Regular User**:
   - Email: `user@demo.com`
   - Password: `password123`

4. **Check Notifications**:
   - Click the notification bell icon
   - You should see an `EVENT_CREATED` notification
   - Notification should show event title and "View Event" link

### Expected Behavior After Fix

- ✅ Admin creates event → Regular users receive notification
- ✅ Event creator does NOT receive notification for their own event
- ✅ Notifications appear in real-time via Socket.IO
- ✅ Users can click notification to view event details
- ✅ Notification is marked as unread until clicked

## Technical Details

### Notification Flow

1. **Event Creation** (`events.controller.ts` line 185-196):
   ```typescript
   const companyUsers = await prisma.user.findMany({
     where: { 
       companyId: req.user!.companyId,
       id: { not: req.user!.userId } // Exclude creator
     },
     select: { id: true },
   });
   
   await createNotificationEvents(
     'EVENT_CREATED',
     companyUsers.map(u => u.id),
     { eventId: event.id }
   );
   ```

2. **Preference Check** (`notification.service.ts` line 48-84):
   ```typescript
   export async function shouldNotifyUser(
     userId: string,
     type: NotificationType
   ): Promise<boolean> {
     const settings = await getUserNotificationSettings(userId);
     
     switch (type) {
       case 'EVENT_CREATED':
         return settings.notifyOnEventCreated; // ← This was false!
       // ...
     }
   }
   ```

3. **Real-Time Broadcast** (`notifications.dispatcher.ts`):
   - Socket.IO emits to user's company room
   - Frontend receives via WebSocket connection
   - Notification bell badge updates automatically

### Default Settings

When a new user is created (via registration), their notification settings default to:

```typescript
{
  emailEnabled: true,
  inAppEnabled: true,
  notifyOnEventCreated: true,      // ← Now consistent
  notifyOnOrderPlaced: true,
  notifyOnDeadlineApproaching: true,
  notifyOnEventClosed: true,
  notifyOnPaymentConfirmed: true,
  notifyOnEventCompleted: true
}
```

## Related Documentation

- `docs/testing/NOTIFICATION_BUG_FIXES.md` - Previous notification bug fixes
- `docs/testing/NOTIFICATION_SCENARIOS.md` - All notification scenarios
- `backend/src/modules/notifications/notification.service.ts` - Notification logic
- `backend/src/modules/events/events.controller.ts` - Event creation flow

## Future Improvements

Consider adding:
1. Admin UI to set default notification preferences for all new users
2. Migration to update existing users' preferences
3. Notification preference template based on user role (ADMIN vs USER)
4. Bulk notification settings update for company admins

---

**Fix Verified**: All tests passing, regular users now receive event creation notifications as expected.
