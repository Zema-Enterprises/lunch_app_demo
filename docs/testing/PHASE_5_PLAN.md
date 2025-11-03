# Phase 5 – Real-Time Notifications & Engagement Expansion
> **Status**: 🚧 **IN PROGRESS** (Phase 5.1 – Real-Time Delivery)  
> **Last Updated**: October 20, 2025  
> **Target Window**: October 21 – November 1, 2025  
> **Focus**: Real-time delivery, push engagement, analytics visibility, and observability/QA automation.

---

## 🎯 Objectives

1. Replace polling-based notification delivery with real-time updates (WebSockets or Server-Sent Events).
2. Add push notifications + offline support via service workers.
3. Deliver notification analytics & advanced filtering dashboards.
4. Restore global coverage threshold (functions ≥75%) with new integration suites.
5. Harden observability: latency SLAs, error budgets, and regression automation.

---

## 📦 Phase Breakdown

### Phase 5.1 – Real-Time Delivery (Backend + Frontend) — 5-6 days
- Kickoff with Backend + DevOps completed **Oct 18, 2025**; weekly sync every Tuesday 10:00 ET.
- Stack decisions:
  - Socket.IO v4 gateway (Node) using Redis adapter for horizontal fan-out.
  - Endpoint: `wss://api.lunchsync.com/notifications` (namespace `/notifications`).
  - Clients authenticate via Bearer token in `Authorization` header; server validates and joins rooms `company:<companyId>` + `user:<userId>`.
  - Heartbeat interval 25s; fallback polling interval surfaced via handshake payload.
  - Handshake schema tracked in `frontend/src/lib/realtime/handshake.ts` with Vitest coverage under `src/test/realtime`.
  - Frontend wrapper for dependency-injected Socket.IO clients lives in `frontend/src/lib/realtime/socket-client.ts` and will be wired to the real gateway once deployed.
  - Redis adapter configuration centralised in `backend/src/realtime/redis-config.ts` (reads `NOTIFICATIONS_REDIS_URL` / `REDIS_URL`, optional TLS flag).
  - Backend server scaffold supports injectable Redis/client factories for testability (`backend/src/realtime/notifications.gateway.server.ts`) and exposes `emitNotification`/`close` helpers.
- TODOs:
  - [x] Provision WebSocket gateway service (`notifications-gateway`) with sticky sessions enabled.
  - [x] Implement broadcast pipeline (Prisma event → queue → Redis → Socket.IO emit) enforcing tenant isolation.
  - [x] Add reconnect/resubscribe logic on the frontend with exponential backoff and feature-flag toggle (`notificationsRealtime`).
  - [x] Maintain compatibility fallback: existing polling remains; handshake returns `fallbackPollingMs`.
  - [x] Create delivery analytics schema (`NotificationDeliveryReceipt` + enums) to persist latency + channel data for telemetry dashboards.
  - [x] Author integration tests:
    - Backend: socket.io-client smoke suite now exercises handshake auth, feature-flag overrides, and targeted broadcast isolation (`notifications.gateway.smoke.test.ts`).
    - Frontend: React Query + realtime integration coverage verifies push hydration, fallback, and optimistic read flows (`notifications-realtime.integration.test.tsx`, `notification-hooks.integration.test.tsx`).
  - [x] Extend perf harness to compare latency (poll vs push) with target <2s end-to-end; export metrics to Honeycomb.
    - Frontend perf suite asserts realtime disables polling + retains SLA (<2s) via `frontend/src/test/performance/notifications-query-metrics.test.tsx` and `notifications-realtime.integration.test.tsx`.
    - Backend gateway instrumentation emits `notifications_ws_delivery_ms` / `notifications_ws_connected` log metrics for Honeycomb ingest.
  - [x] Wire Honeycomb exporter for realtime metrics (env: `NOTIFICATIONS_HONEYCOMB_API_KEY`, `NOTIFICATIONS_HONEYCOMB_DATASET`, `NOTIFICATIONS_HONEYCOMB_API_URL`) with structured logging fallback.
  - [x] Provide dedicated realtime smoke commands for CI gating (`npm run test:realtime` in backend/frontend) covering socket + React Query suites.
  - [x] Seed fixtures updated with sample `NotificationDeliveryReceipt` rows to feed telemetry dashboards.
  - [x] Enforce JWT validation on handshake; update unit harness to require signed tokens (`notifications.gateway.server.ts`, `notifications.gateway.server.test.ts`).

### Phase 5.2 – Push Notifications & Offline UX — 3-4 days
- [x] Introduce service worker scaffold (Vite plugin + Workbox).
- [x] Request & persist browser notification permissions; sync with settings API.
- [x] Implement background notification queue, badge updates while tab hidden (`useNotificationQueueStore`, service worker broadcast bridge, React Query invalidation).
- [x] Automated tests:
  - Unit: service worker registration, push payload parsing, fallback to toast.
  - Integration: simulate Notification API via `@testing-library/dom` + fake timers.
- [x] Restore global coverage thresholds to functions ≥75% (new queue-aware integration suites keep Vitest `functions` gate at 75%).
- [x] Update accessibility audit for push opt-in flows & offline banners (`docs/testing/ACCESSIBILITY_AUDIT_NOTIFICATIONS_PHASE_5.md`).
- [x] Document VAPID env requirements (`NOTIFICATIONS_VAPID_PUBLIC_KEY`, `NOTIFICATIONS_VAPID_PRIVATE_KEY`, `NOTIFICATIONS_VAPID_CONTACT`) and add dev tooling to generate keys (`npm run push:vapid:generate`).
- [x] Surface offline banner in app and ensure Workbox precaching runs via Vite PWA build.
- [x] Roll out `VITE_PUSH_NOTIFICATIONS_ENABLED` feature flag playbook and capture user-facing messaging (see updated guidance in `NOTIFICATIONS_REALTIME_FLAG_PLAYBOOK.md`).
- [x] Expose `NOTIFICATIONS_TELEMETRY_ENABLED` + Honeycomb dashboard/alert documentation for delivery receipts (Honeycomb templates linked + enablement steps documented).

### Phase 5.3 – Analytics, Filtering & Observability — ⏸️ Deferred
- [x] Build notification analytics summary endpoint (unread + delivery breakdown) with integration coverage.
- [ ] Deferred: dashboard analytics UI, filtering, and visualization suites (see `docs/testing/DEFERRED_WORK.md`).
- [ ] Deferred: latency/disconnect telemetry instrumentation (Honeycomb + PagerDuty) (see `docs/testing/DEFERRED_WORK.md`).
- [ ] Deferred: analytics regression tests (visual + query assertions) (see `docs/testing/DEFERRED_WORK.md`).
- [ ] Deferred: alerting integration for SLA breaches (see `docs/testing/DEFERRED_WORK.md`).

### Phase 5.4 – Regression Automation & Docs Wrap — 1-2 days
- [ ] Expand `NOTIFICATIONS_REGRESSION_CHECKLIST.md` with real-time + push cases.
- [ ] Update `run-tests.sh` to parameterize websocket vs polling modes.
- [ ] Produce release readiness report + phase completion summary.
- [ ] Archive Phase 5 assets; prepare Phase 6 performance/load test prerequisites.

---

## ✅ Success Criteria

- Real-time channel delivers notifications to ≥95% of connected clients within 2s (multi-tenant safe).
- Push notifications available for supported browsers with offline badge updates.
- Analytics dashboard shows daily counts, unread trends, delivery latency (with tests).
- Global function coverage ≥75%; notifications bundle ≥90% across statements/functions.
- Regression suites (components, integration, accessibility, performance, websocket, push) all green.
- Updated documentation: plan, progress, audit, performance, regression checklist, release report.

---

## 🔧 Tooling & Testing Strategy

- **Backend**: Vitest (API integration), supertest, ws mocks; consider contract tests against Prisma seed data.
- **Frontend**: Vitest + Testing Library; `msw` WebSocket handlers; Playwright smoke for push UI (headless).
- **Service Worker**: Workbox testing via `jest-worker` shim; manual verification in Chromium + Firefox.
- **Performance**: Extend `notifications-perf.test.tsx` (push vs polling), Lighthouse for PWA footprint.
- **Observability**: Add OpenTelemetry spans around broadcast pipeline; verify via docker-compose stack.
- **Tooling**: Use `npm run test:realtime` (backend/frontend) and `npm run test:realtime:perf` to validate SLA prior to flag toggles; dashboard + alert templates available under `docs/testing/assets/notifications-telemetry/`.

---

## 📊 Metrics & Targets

| Metric | Target | Notes |
| --- | --- | --- |
| Broadcast latency (WS) | ≤2000 ms p95 | Compare against polling baseline 30s. |
| Socket reconnect success | ≥99% within 10s | Test via artificial network disruptions. |
| Push opt-in completion | ≥85% success (QA baseline) | Track via analytics dashboards. |
| Coverage | Components ≥90%, Stores ≥90%, API hooks ≥75%, Global functions ≥75% | Threshold restored in `vitest.config.ts`. |
| Accessibility | No axe violations; SR + HC passes for new surfaces | Update audit log with new flows. |

---

## 🧩 Dependencies & Risks

- **Infrastructure**: Requires WebSocket-ready hosting (verify ingress, load balancer sticky sessions).
- **Security**: Ensure JWT validation on socket handshake; rate-limit push subscription endpoints.
- **Browser Support**: Service worker / push not available on Safari desktop; document limitations.
- **Performance**: Real-time fan-out may increase DB load; consider Redis pub/sub or message queue.
- **Testing**: WebSocket mocking in Vitest still experimental—fall back to integration harness (`run-tests.sh`) if unstable.
- **Team Coordination**: Align with backend team for Prisma schema updates (delivery receipts, analytics tables).

---

## 📚 Documentation & Reporting

- Create/Update:
  - `PHASE_5_PLAN.md` (this document)
  - `PHASE_5_PROGRESS.md` (daily log)
  - `API_ADJUSTMENTS_NOTIFICATIONS_REALTIME.md`
  - `FRONTEND_ADJUSTMENTS_NOTIFICATIONS_REALTIME.md`
  - `ACCESSIBILITY_AUDIT_NOTIFICATIONS_PHASE_5.md`
  - `PERFORMANCE_NOTES_NOTIFICATIONS_PHASE_5.md`
- Archive assets/screenshots under `docs/testing/assets/notifications-phase5/`.
- Add Phase 5 summary to `docs/testing/README.md` and `PROGRESS.md`.

---

## 🛠 Work Breakdown & Estimates

| Task | Owner | Estimate |
| --- | --- | --- |
| WebSocket gateway & auth | Backend | 2 days |
| Frontend socket client + fallback | Frontend | 1.5 days |
| Backend broadcast integration tests | QA/Backend | 1 day |
| Frontend realtime integration tests | QA/Frontend | 1 day |
| Service worker & push flows | Frontend | 2 days |
| Push automation & coverage lift | QA | 1 day |
| Analytics API & dashboard | Backend/Frontend | 2 days |
| Observability & alerts | DevOps/Backend | 1 day |
| Documentation & release checklist | QA/Tech Writer | 1 day |

---

## 🔮 Post Phase 5 Outlook

- Phase 6.1: Load & chaos testing for real-time pipeline (Redis pub/sub scaling).
- Phase 6.2: Security hardening (websocket auth signed tokens, push subscription rotation).
- Phase 6.3: Mobile/PWA readiness (install prompts, offline caching).

---

**Status Checkpoint**: October 19, 2025  
**Next Action**: Finalise Honeycomb dashboards + socket.io-client regression harness, then execute rollout plan per `NOTIFICATIONS_REALTIME_FLAG_PLAYBOOK.md` before expanding the flag.
