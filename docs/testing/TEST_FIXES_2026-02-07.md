# Test Fixes - February 7, 2026

## Overview
Stabilization pass to restore backend authorization rules and align frontend notification UX with existing test expectations. All backend and frontend suites are green after these fixes.

## Test Results
- **Backend:** 398/398 passing (33 suites)
- **Frontend:** 752/752 passing (53 files)

## Backend Fixes
1. **Payment confirmation permissions**
   - Restored payment confirmation rules by payment method.
   - EVENT_CREATOR: only event creator can confirm payments.
   - INDIVIDUAL/COMPANY_EXPENSE: only the order owner can confirm.

2. **Notification defaults**
   - Default `emailEnabled` set to true when creating notification settings.

## Frontend Fixes
1. **Notification settings workflow**
   - Added unsaved changes banner with `Save Changes` and `Reset` actions.
   - Save disables during network request and clears banner on success.
   - Push enable/disable messaging aligns with UI expectations.

2. **Notification display consistency**
   - Toast and list titles now use type-derived labels for consistency.

3. **Create Event deadline guard**
   - `datetime-local` min uses local time to prevent past selections.

4. **Testing utilities and mocks**
   - Added push-subscription MSW handlers.
   - Updated notification workflow path assertions for tenant routes.
   - Added missing hook mock for `useConfirmPayment` in modal tests.
   - Push manager test expectations aligned with configured API base URL.

## Files Modified (Highlights)
- `backend/src/modules/orders/orders.controller.ts`
- `backend/src/modules/notifications/notification.service.ts`
- `frontend/src/components/notifications/NotificationSettings.tsx`
- `frontend/src/components/notifications/NotificationToast.tsx`
- `frontend/src/components/notifications/NotificationList.tsx`
- `frontend/src/components/features/CreateEventDialog.tsx`
- `frontend/src/lib/push/push-manager.ts`
- `frontend/src/test/integration/notification-workflow.test.tsx`
- `frontend/src/test/mocks/handlers.ts`

## Notes
- Full backend + frontend test runs were executed and completed successfully.
