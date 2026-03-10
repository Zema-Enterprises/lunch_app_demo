# LunchSync Audit Report

**Date of audit:** 2026-02-27
**Auditor:** Claude Code (automated code quality audit)

---

## Summary

- **Total violations found:** 112 (7 CRITICAL, 90 HIGH, 15 QUALITY)
- **Violations fixed:** 98+
- **Remaining known issues:** 6 (documented below, out of scope for this audit)

---

## CRITICAL Fixes Applied (7 violations)

1. **Added try/catch to analytics.controller.ts** — `getAnalyticsSummary` handler had no error handling; unhandled exceptions would crash the process.
2. **Added try/catch to push.controller.ts** — `registerPushSubscription` and `unregisterPushSubscription` handlers lacked error handling.
3. **Added companyId scoping to menu item validation in orders.controller.ts** — Menu items were fetched without company isolation, violating the multi-tenancy model and risking cross-tenant data leakage.
4. **Added Zod validation to 6 unprotected routes:**
   - `PUT /api/users/profile` — profile updates accepted unvalidated input
   - `PUT /api/users/notification-settings` — notification preferences unvalidated
   - `POST /api/notifications/push/subscribe` — push subscription payload unvalidated
   - `POST /api/notifications/push/unsubscribe` — unsubscribe payload unvalidated
   - `PUT /api/notifications/:id/read` — route param unvalidated
   - `PUT /api/notifications/read-all` — no validation middleware applied

---

## HIGH Fixes Applied (90 violations)

### Backend: Logger standardization (63 violations)
- Replaced all `console.error`, `console.log`, and `console.warn` calls with structured `logger` calls across all backend controllers and services:
  - `analytics.controller.ts`
  - `push.controller.ts`
  - `events.controller.ts`
  - `orders.controller.ts`
  - `restaurants.controller.ts`
  - `users.controller.ts`
  - `notification.service.ts`
  - `auth.controller.ts`
  - `menu.controller.ts`
  - `error.middleware.ts`

### Backend: Error response format standardization
- Standardized all error responses to use `{ message: string }` format in middleware and controllers, replacing inconsistent patterns like `{ error: ... }`.

### Frontend: Raw button replacement (15 violations across 11 files)
- Replaced raw `<button>` elements with shadcn/ui `<Button>` component:
  - `EventCard.tsx` — close/action buttons
  - `EventDetailsModal.tsx` — modal close button
  - `OrdersSection.tsx` — order action buttons
  - `CreateEventDialog.tsx` — dialog buttons
  - `RestaurantCard.tsx` — action buttons
  - `RestaurantSelector.tsx` — selection buttons
  - `NotificationBell.tsx` — notification trigger
  - `NotificationSettings.tsx` — settings actions
  - `NotificationToast.tsx` — toast dismiss
  - `Header.tsx` — navigation buttons
  - `MobileNav.tsx` — mobile navigation buttons

### Frontend: Hardcoded color removal
- Replaced hardcoded hex colors (`#ffffff`, `#000000`, etc.) with Tailwind utility classes in `Header.tsx` and `MobileNav.tsx`.

### Frontend: Console statement removal (9 components)
- Removed `console.error` calls from production components, replacing with proper error handling or silent failure where appropriate.

---

## QUALITY Fixes Applied (15 violations)

### Path alias migration
- Migrated 10 page files from relative imports (`../../`) to `@/` path alias:
  - `DashboardPage.tsx`
  - `EventsPage.tsx`
  - `LoginPage.tsx`
  - `ProfilePage.tsx`
  - `RegisterPage.tsx`
  - `RestaurantsPage.tsx`
  - `SettingsPage.tsx`
  - `NotificationsPage.tsx`
  - `CompanySettingsPage.tsx`
  - `CreateCompanyPage.tsx`

---

## Remaining Known Issues (NOT fixed — out of scope)

These items were identified during the audit but intentionally left unfixed due to scope, complexity, or being justified patterns:

1. **~20 more component files still use relative imports** — Lower priority; pages were prioritized as the most impactful migration targets.
2. **Inline styles for dynamic theming remain** — Justified: runtime values from company theme settings require inline styles (CSS custom properties set dynamically).
3. **authStore directly calls apiClient** — Borderline violation; accepted pattern for auth flows where store needs direct API access for token refresh and login.
4. **eventStore/restaurantStore have unused `setEvents`/`setRestaurants` dead code** — Minor dead code; may be used by future features.
5. **CompanySettings.tsx has extensive inline styles for theme preview** — Complex refactor needed; theme preview requires dynamic style calculation that can't easily use Tailwind classes.
6. **Frontend type error in NotificationSettings.tsx line 201** — Pre-existing TypeScript error (`Type 'string | boolean' is not assignable to type 'undefined'`). Requires refactoring the notification settings type system.

---

## Final Verification Status

| Check | Status | Notes |
|-------|--------|-------|
| Backend `tsc --noEmit` | PASS | Clean, no errors |
| Frontend `tsc --noEmit` | FAIL | Pre-existing error in `NotificationSettings.tsx:201` (not introduced by this audit) |
| Frontend lint | SKIPPED | ESLint not installed in `node_modules` (dependency not present; `npm run lint` fails with `eslint: not found`) |

---

## Files Modified During Audit

### Backend
- `src/modules/analytics/analytics.controller.ts`
- `src/modules/push/push.controller.ts`
- `src/modules/orders/orders.controller.ts`
- `src/modules/users/users.controller.ts`
- `src/modules/users/users.routes.ts`
- `src/modules/users/users.validation.ts`
- `src/modules/notifications/notification.routes.ts`
- `src/modules/notifications/notification.controller.ts`
- `src/modules/notifications/notification.service.ts`
- `src/modules/notifications/notification.validation.ts`
- `src/modules/events/events.controller.ts`
- `src/modules/restaurants/restaurants.controller.ts`
- `src/modules/auth/auth.controller.ts`
- `src/modules/menu/menu.controller.ts`
- `src/middleware/error.middleware.ts`
- `src/server.ts`

### Frontend
- `src/components/events/EventCard.tsx`
- `src/components/events/EventDetailsModal.tsx`
- `src/components/events/OrdersSection.tsx`
- `src/components/events/CreateEventDialog.tsx`
- `src/components/restaurants/RestaurantCard.tsx`
- `src/components/restaurants/RestaurantSelector.tsx`
- `src/components/notifications/NotificationBell.tsx`
- `src/components/notifications/NotificationSettings.tsx`
- `src/components/notifications/NotificationToast.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/MobileNav.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/EventsPage.tsx`
- `src/pages/LoginPage.tsx`
- `src/pages/ProfilePage.tsx`
- `src/pages/RegisterPage.tsx`
- `src/pages/RestaurantsPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/NotificationsPage.tsx`
- `src/pages/CompanySettingsPage.tsx`
- `src/pages/CreateCompanyPage.tsx`

---

## Audit V2 — Follow-up Fixes (2026-02-27)

### Issues resolved from V1 remaining list:

1. **NotificationSettings.tsx type error (line 201) — FIXED**
   Added `EditableNotificationKey` utility type to narrow `editableKeys` typing.
   Frontend `tsc --noEmit` now passes cleanly.

2. **eventStore/restaurantStore dead code — FIXED**
   Removed entirely. Both stores were unused in application code (only referenced in
   their own test files). App correctly uses TanStack Query for server data.

3. **Remaining relative imports in store files — FIXED**
   Migrated `authStore.ts` and 16 additional component/lib files to `@/` path alias:
   `ErrorBoundary.tsx`, `OrdersSection.tsx`, `AddRestaurantDialog.tsx`, `Header.tsx`,
   `Layout.tsx`, `SkeletonLoaders.tsx`, `AddMenuItemDialog.tsx`, `EditMenuItemDialog.tsx`,
   `NotificationBell.tsx`, `NotificationList.tsx`, `NotificationSettings.tsx`,
   `NotificationToast.tsx`, `EditRestaurantDialog.tsx`, `ChangePasswordDialog.tsx`,
   `lib/api/hooks.ts`, `lib/realtime/useNotificationsRealtime.ts`.

4. **CompanySettings.tsx hardcoded hex colors — FIXED**
   Replaced `#e2e8f0`, `#f8fafc`, `#0f172a`, `rgb(71 85 105)` with Tailwind utility
   classes (`text-slate-200`, `text-slate-50`, `text-slate-900`, `text-slate-500`).

5. **CompanySettings.tsx inline styles — PARTIALLY FIXED**
   Extracted theme preview into `ThemePreview` component with memoized style objects.
   Dynamic runtime values (theme colors, rgba computations) remain as inline styles
   (justified — cannot use Tailwind for dynamic values).

### Issues NOT addressed (accepted patterns):

- **authStore directly calls apiClient** — Accepted pattern for auth flows. The auth
  store needs direct API access for token refresh, login, and logout which are
  bootstrapping operations that run before React Query is available.

- **~20 component files with relative imports** — After V1 and V2 fixes, remaining
  relative imports are in `components/ui/` (shadcn/ui convention) and deep component
  files. Lower priority.

### Final verification status:

| Check | Status | Notes |
|-------|--------|-------|
| Backend `tsc --noEmit` | PASS | Clean, no errors |
| Frontend `tsc --noEmit` | PASS | Clean, no errors (V1 NotificationSettings error now fixed) |
