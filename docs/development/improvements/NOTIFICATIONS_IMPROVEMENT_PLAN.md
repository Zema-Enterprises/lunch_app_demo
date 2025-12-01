# Notifications Improvement Plan

Last updated: 2025-12-01  
Scope: Categorize notifications and enrich messaging so recipients can quickly understand who did what, where, and why (backend + frontend + realtime + push).

## Objectives
- Introduce explicit categories/keys so notification consumers can filter and prioritize (event vs. order vs. company/system).
- Deliver descriptive titles/bodies that include actors and context (e.g., participant name, event title, restaurant).
- Normalize payload shape across REST, realtime, and push while keeping company isolation and preferences intact.
- Drive the work with TDD: add/extend failing tests first at the backend API layer, then propagate to frontend contracts and UI behavior.

## Current State Snapshot
- Payloads lack `category`, human-readable `title/body`, and actor context; UI derives a generic label from `type` only.
- Realtime and push deliver the same minimal shape (`id`, `type`, `eventId`, `orderId`, `userId`, flags); no descriptive copy.
- Frontend type list includes `REMINDER_SENT` and `PAYMENT_REMINDER`, but Prisma enum does not; gaps between layers.
- Existing triggers (observed in controllers/services/tests):

| Type | Trigger Source | Recipients | Notes |
| --- | --- | --- | --- |
| `EVENT_CREATED` | Event create (`events.controller`) | All company users except creator | No actor/description; company-scoped |
| `USER_JOINED_EVENT` | Join event (`events.controller`) | Event creator | Missing joiner name |
| `USER_LEFT_EVENT` | Leave event (`events.controller`) | Event creator | Missing leaver name |
| `EVENT_CLOSED` | Close event (`events.controller`) | Event participants | No closure reason/context |
| `EVENT_DELIVERED` | Event delivered timestamp set (`events.controller`) | Event participants | No delivery ETA/actor |
| `EVENT_COMPLETED` | Event completed (`events.controller` + `checkCompletion`) | Event participants | No completion summary |
| `ORDER_PLACED` | New order (`orders.controller`) | Event creator (when not self) | No order/user/restaurant details |
| `ORDER_UPDATED` | Not currently triggered | — | Candidate for future |
| `EVENT_CLOSING_SOON` | Not currently triggered | — | Candidate for reminders |
| `PAYMENT_CONFIRMED` | Payment confirmation (`orders.controller`) | Order owner | No payer/amount info |

## Proposed Categories & Payload Shape
- Categories: `event_lifecycle`, `participant_activity`, `order_payment`, `reminder`, `company_system`.
- Payload shape (REST + realtime + push):
  - `id`, `type`, `category`, `createdAt`
  - `title` (short, action-focused), `body` (with actor + context)
  - `actor` `{ id, name }` when applicable (join/leave/order/payment)
  - `subject` `{ eventId, eventTitle, restaurantName? }`, `{ orderId? }`
  - `cta` `{ kind: 'event' | 'order' | 'settings', id?: string }`
  - `meta` (structured JSON for analytics/telemetry: payment amount, delivery eta, etc.)
- Derive `category` from `type` server-side; ensure parity across DB, API responses, sockets, and service worker payloads.

## Phase Plan (TDD-First)

### Phase 0 – Inventory & Baseline Tests
- Add backend integration suite `backend/src/__tests__/integration/notifications.content.integration.test.ts` that covers event create/join/close, order placed, payment confirmed, and asserts the desired payload keys (`category`, `title`, `body`, `actor`, `subject`); expect failures to drive implementation.
- Capture realtime/push payload expectations in the same suite (mock dispatcher/registry) so sockets and push stay aligned.
- Document current vs. expected shape in `docs/testing/API_ADJUSTMENTS_NOTIFICATIONS.md` once behavior lands.

### Phase 1 – Contract & Data Model
- Add Prisma migration for new fields on `NotificationEvent`: `category` (enum/string), `title`, `body`, `actorId?`, `meta` (JSON). Update seed data and factories.
- Extend `createNotificationEvent(s)` to populate the new fields and category mapping; include actor relation when provided.
- Ensure company isolation persists; add tests for cross-tenant access to new fields.
- Update notification dispatcher, telemetry, and push service to emit the enriched payload; extend unit tests accordingly.

### Phase 2 – Descriptive Templates by Type
- Define templates per `NotificationType` (tests first):
  - `EVENT_CREATED`: "`<creatorName>` created `<eventTitle>` at `<restaurant>`"
  - `USER_JOINED_EVENT`: "`<userName>` joined `<eventTitle>`"
  - `USER_LEFT_EVENT`: "`<userName>` left `<eventTitle>`"
  - `EVENT_CLOSED`: "`<eventTitle>` is closed; ordering disabled"
  - `EVENT_DELIVERED`: "`<eventTitle>` is out for delivery/arrived`"
  - `EVENT_COMPLETED`: "`<eventTitle>` marked completed"
  - `ORDER_PLACED`: "`<userName>` placed an order for `<eventTitle>`"
  - `ORDER_UPDATED`: "`<userName>` updated their order for `<eventTitle>`"
  - `EVENT_CLOSING_SOON`: "`<eventTitle>` closes in <X> minutes"
  - `PAYMENT_CONFIRMED`: "Payment confirmed for `<eventTitle>` by `<userName>`"
- Add validation so templates degrade gracefully when optional data is missing (tests for null actor/event).

### Phase 3 – Frontend Consumption & UX
- Update types/services to the new payload shape; enforce Zod schema parity with backend integration tests.
- Enhance Notification List/Bell/Toast to display `category`, `title/body`, and actor chips; add filters (all/unread/by-category) and meaningful icons per category.
- Update MSW handlers and Vitest suites under `frontend/src/test/` to assert the enriched copy and filters.
- Ensure navigation CTAs resolve from the new `cta` data (events/orders/settings).

### Phase 4 – Delivery, Analytics, & Ops
- Extend telemetry to track `category`, `type`, and delivery channel success per tenant; add coverage in `notifications.telemetry.test.ts`.
- Backfill recent notifications with default categories/titles via a migration script; protect with idempotent retry tests.
- Update docs: `docs/testing/PROGRESS.md`, `docs/testing/API_ADJUSTMENTS_NOTIFICATIONS.md`, and `docs/README.md` index entry once shipped.

## Testing & Documentation Guardrails
- Every phase starts by writing/adjusting failing tests (backend integration first, then frontend/contracts).
- Keep `{ data: ... }` success envelopes and `{ message: ... }` errors consistent in new/updated endpoints.
- Maintain seed/fixtures parity between Prisma seed and test factories for notification examples.
- Archive superseded notes under `docs/development/improvements/archive/` if the plan materially changes.
