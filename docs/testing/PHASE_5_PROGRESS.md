# Phase 5 Progress Log – Real-Time Notifications

> **Last Updated**: October 20, 2025

## Kickoff Summary (Completed October 18, 2025)

- Participants (updated roster):
  - **Backend Lead** – Asha Patel
  - **DevOps** – Lennox Rivera
  - **Frontend** – Morgan Lee
  - **QA/Test** – Riley Chen (facilitator)
- Meeting cadence: weekly realtime sync (Tuesdays 10:00 ET) + async Slack channel `#phase-5-realtime`.

### Decisions & Rationale

1. **Transport & Infrastructure**

   - Adopt **Socket.IO (v4)** on top of Node `ws` due to built-in reconnection, heartbeat, and namespace support.
   - Deploy a dedicated `notifications-gateway` service behind the existing ingress; sticky sessions enabled via Nginx `ip_hash`.
   - Redis (existing cache cluster) selected as Socket.IO adapter for horizontal scaling and cross-instance pub/sub.
2. **Authentication & Handshake Contract**

   - Client connects to `wss://api.lunchsync.com/notifications` with JWT in `Authorization` header (Bearer).
   - Server validates token, extracts `userId` + `companyId`, and assigns client to room `company:<companyId>` plus `user:<userId>`.
   - Handshake response includes `connectionId`, heartbeat interval (25s), and feature flag payload (`realtimeEnabled`, `fallbackPollingMs`).
3. **Payload Schema**

   ```json
   {
     "event": "notification.created",
     "data": {
       "id": "notif_123",
       "companyId": "comp_42",
       "userId": "user_101",
       "type": "EVENT_CREATED",
       "createdAt": "2025-10-18T14:12:00.000Z",
       "payload": {
         "title": "Team Lunch scheduled",
         "body": "Morgan added a new lunch event",
         "resource": {
           "kind": "event",
           "id": "event_88"
         }
       }
     }
   }
   ```

   - Additional events: `notification.updated`, `notification.read`, `gateway.heartbeat`, `gateway.disconnect`.
   - All messages scoped to company room; per-user events (e.g., read receipts) also sent to `user:<userId>` room.
4. **Fallback & Feature Flags**

   - Maintain existing polling hook with feature flag `notificationsRealtime` (remote config stored in LaunchDarkly).
   - Frontend will attempt WebSocket first; on failure, revert to polling interval returned in handshake.
5. **Testing & Observability**

   - **Backend**: adopt Pact-like contract tests for handshake, plus integration suite using `supertest` + `socket.io-client` in Jest.
   - **Frontend**: extend MSW with experimental WebSocket API to stub server events (prototype file created under `src/test/realtime`). Handshake schema captured in `frontend/src/lib/realtime/handshake.ts` with validation tests.
   - Metrics: introduce `notifications_ws_delivery_ms` (histogram), `notifications_ws_connected` (gauge), `notifications_ws_errors_total` (counter) via OpenTelemetry exporting to Honeycomb.
   - Gateway scaffold (`backend/src/realtime/notifications.gateway.server.ts`) unit-tested via injectable Redis/socket factories; exposes `emitNotification` helper for future integration tests.

### Risks & Mitigations

- **Ingress limitations**: verify ALB WebSocket timeouts (idle 60s) → keep heartbeat at 25s.
- **Redis load**: coordinate capacity planning; DevOps to baseline current utilisation and provision read replicas if needed.
- **Browser support**: IE11 unsupported (acceptable); fallback ensures legacy browsers keep polling.
- **Test fragility**: segregate realtime suites under `npm run test:realtime` to avoid slowing core unit runs.

## Updated Action Items

- [x] Implement Socket.IO gateway skeleton in backend (`/notifications` namespace) with Redis adapter (Asha, due Oct 25).
  - Skeleton utilities for handshake, room derivation, and gateway handshake emission landed (`backend/src/realtime/notifications.gateway.ts`).
  - Redis configuration helper created (`backend/src/realtime/redis-config.ts`) with unit coverage.
  - Initial Socket.IO server scaffold drafted with injectable Redis/adapter factories (`backend/src/realtime/notifications.gateway.server.ts`) and tested via pure unit mocks; production wiring (Redis adapter in staging) still pending.
  - ✅ Socket authentication now validates real JWTs via `verifyToken`; unit suite updated to require signed tokens (`notifications.gateway.server.test.ts`).
  - ✅ Realtime gateway boots with Socket.IO + Redis in `server.ts`, broadcasting `notification.created` to company + user rooms and exposing graceful shutdown hooks.
  - ✅ Notification service now streams `notification.created` payloads through dispatcher → gateway; broadcaster skips when company context missing.
- [x] Build MSW WebSocket handler prototype in `frontend/src/test/realtime/notifications-realtime.test.ts` (Morgan, Oct 18).
- [x] Draft frontend socket client wrapper (`frontend/src/lib/realtime/socket-client.ts`) for dependency-injected connections (Morgan, Oct 18).
  - MSW Socket.IO prototype (`frontend/src/test/realtime/msw-socket.ts`) now emits handshake events and supports listener teardown for deterministic tests.
- [x] Ship realtime client hook + polling bridge (`frontend/src/lib/realtime/useNotificationsRealtime.ts`); Zustand store drives dynamic `refetchInterval`, React Query caches hydrate from socket pushes, and fallback auto-enables on disconnect.
- [x] Add realtime store coverage + async handshake regression tests (`notifications.realtime.test.ts`, `notificationsRealtimeStore.test.ts`).
- [x] Provision delivery analytics schema (`NotificationDeliveryReceipt` table + enums via `20251016190000_add_notification_delivery_receipts` migration) to capture latency + channel metrics.
- [x] Auth store seeded for realtime integration tests; React Query harness verifies cache hydration + fallback toggling (`notifications-realtime.integration.test.tsx`).
- [x] Document handshake + payload schema in `docs/testing/PHASE_5_PLAN.md` (Riley, Oct 18).
- [x] Design analytics table migration for delivery receipts (Asha, draft Oct 24).
- [x] Upgrade socket.io-client smoke regression to cover feature flag handshake overrides + targeted broadcast isolation (`notifications.gateway.smoke.test.ts`, `notifications.gateway.server.ts` now accepts resolver hooks).
- [x] Draft push subscription API contract + Prisma model (`PushSubscription`) with integration tests covering create/delete/public key flow (`notifications.push.integration.test.ts`).
- [x] Stand up frontend push manager module with service worker scaffolding and unit tests (`src/lib/push/push-manager.ts`, `src/test/push/push-manager.test.ts`).
- [x] Implement push dispatch + delivery receipts (web-push mock coverage via `notification.push.delivery.test.ts`) and expose flag-gated push controls in Notification Settings.
- [x] Integrate Vite PWA (Workbox inject manifest) with auto-updating service worker, offline banner, and analytics hook coverage (`src/service-worker.ts`, `vite.config.ts`, `useOnlineStatus.test.ts`).
- [x] Consume analytics summary on Dashboard via new NotificationAnalytics panel; filters/charts pending.
- [x] Deliver React Query notification hook integration suite covering realtime hydration, fallback, and optimistic read flows (`frontend/src/test/integration/notification-hooks.integration.test.tsx`); coverage delta pending roll-up.
- [x] Add Honeycomb exporter + telemetry logging (`backend/src/telemetry/honeycomb.exporter.ts`) and introduce realtime smoke scripts (`npm run test:realtime`) for backend/frontend CI gating.
- [x] Restore frontend function coverage gate to ≥75% and capture Honeycomb dashboard + alert templates under `docs/testing/assets/notifications-telemetry/`.
- [x] Seed data now includes sample `NotificationDeliveryReceipt` rows to drive telemetry dashboards in dev/staging.
- [x] Wire realtime telemetry + perf harness: backend gateway now emits `notifications_ws_delivery_ms` / `notifications_ws_connected` log metrics, and frontend perf suite asserts realtime polling suppression + <2s SLA (`notifications-query-metrics.test.tsx`, `notifications-realtime.integration.test.tsx`).
- [x] Bridge service worker push events into React Query via background queue (`useNotificationQueueStore`) and NotificationBell badge aggregation; added queue-aware integration + component tests.
- [x] Updated push notification documentation + tooling (`npm run push:vapid:generate`) and published Phase 5 accessibility audit & flag messaging guidance (`ACCESSIBILITY_AUDIT_NOTIFICATIONS_PHASE_5.md`, `NOTIFICATIONS_REALTIME_FLAG_PLAYBOOK.md`).

## Notes

- Accessibility transcripts & HC captures archived under `docs/testing/assets/notifications-a11y/` for reference.
- Coverage gate restored to functions ≥75% (frontend + backend); monitor nightly coverage to maintain threshold.
- Realtime rollout plan, fallback procedures, and telemetry benchmarks captured in `docs/testing/NOTIFICATIONS_REALTIME_FLAG_PLAYBOOK.md`.

## Immediate Next Steps

- Harden cross-service analytics: wire new Honeycomb dashboard (template added) and push alert configs through staging before GA.
- Monitor background queue telemetry during pilot and keep Vitest function thresholds green (run `notification-hooks.integration.test.tsx` for regressions).
- Instrument observability: coordinate with SRE to ingest Honeycomb exporter output and enable PagerDuty rules prior to flag expansion.
- Capture runtime benchmarks via `npm run test:realtime:perf` and archive latency deltas alongside flag rollout dry run.
- **Phase 5.2 Kickoff Checklist** (Push Notifications & Offline UX):
  - ✅ Backend push subscription API contract + integration tests in place.
  - ✅ Frontend push manager module with service worker registration + permission flow tests.
  - ✅ Plan Workbox/vite-plugin integration strategy and update build tooling to emit service worker.
  - ✅ Offline validation checklist documented (`docs/testing/performance/WORKBOX_OFFLINE_VALIDATION.md`).
  - ✅ Outline accessibility updates (permission modal, offline banner) and corresponding automated checks (see `ACCESSIBILITY_AUDIT_NOTIFICATIONS_PHASE_5.md`).
- **Phase 5.3 Early Tasks**:
  - ✅ Analytics summary endpoint stub returning delivery + unread counts (`/api/notifications/analytics/summary`) with integration coverage.
  - ⏸️ Remaining Phase 5.3 scope (dashboard UI, telemetry, alerting) deferred — tracked in `docs/testing/DEFERRED_WORK.md`.
- **Phase 5.4 Progress**:
  - ✅ Regression checklist expanded with realtime + push coverage.
  - ✅ `run-tests.sh` parameterized for polling vs realtime notification modes.
- ⚠️ Push integration test requires local Postgres (`localhost:5434`) before final execution.
- ⏳ Security smokes (`./security-tests.sh`, `./verify-security.sh`) pending before sign-off.
- ✅ Push integration test executed (docker-compose stack running on localhost:5434).
- ✅ Security smokes executed (`./security-tests.sh`, `./verify-security.sh`) with clean results.
- ✅ Realtime perf harness executed (`npm run test:realtime:perf`); summary logged under `docs/testing/assets/notifications-telemetry/2025-10-17_realtime-perf.txt`.
