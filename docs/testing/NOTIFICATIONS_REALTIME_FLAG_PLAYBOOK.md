# Notifications Realtime Rollout Playbook
> **Last Updated**: October 20, 2025 – Telemetry exporter + dashboard templates available for pilot rollout.

## 🎯 Goals
- Gradually enable the `notificationsRealtime` LaunchDarkly flag across tenants.
- Capture delivery telemetry (latency, success rate, disconnects) to validate the <2s p95 SLA before full rollout.
- Maintain a rapid rollback path that reverts clients to 30s polling without user-visible downtime.

## ✅ Preconditions
- ✅ Socket.IO gateway deployed with Redis adapter and JWT handshake validation.
- ✅ Gateway handshake now resolves LaunchDarkly overrides via `handshakeOptionsResolver`, surfacing `notificationsRealtime` + fallback intervals per tenant.
- ✅ Gateway telemetry emits realtime metrics (`notifications_ws_connected`, `notifications_ws_delivery_ms`) via structured logs and optional Honeycomb exporter (`NOTIFICATIONS_HONEYCOMB_API_KEY`, `NOTIFICATIONS_HONEYCOMB_DATASET`, `NOTIFICATIONS_HONEYCOMB_API_URL`).
- ✅ Frontend `useNotificationsRealtime` hook + React Query bridge in place (auto fallback on disconnect).
- ✅ `NotificationDeliveryReceipt` table provisioned for analytics (see migration `20251016190000_add_notification_delivery_receipts`).
- ✅ `NOTIFICATIONS_TELEMETRY_ENABLED` flipped to `true` in staging with Honeycomb keys supplied.
- ⏳ Honeycomb dashboards pending (latency, reconnect success, error rate).

## 🚀 Rollout Stages
1. **Pilot (5% traffic / internal tenants)**
   - Flag scope: internal QA + two low-risk tenants.
   - Enable `notificationsRealtime` while preserving polling fallback.
   - Collect telemetry for 48h (metrics below) and validate no degradation in unread counts or toast delivery.
2. **Staged Expansion (25% → 60%)**
   - Rollout in cohorts of companies grouped by size/timezone.
   - At each increment, review: `notifications_ws_delivery_ms` (p95), `notifications_ws_connected` gauge, and error logs.
   - Trigger `NotificationDeliveryReceipt` aggregation to confirm data pipeline.
3. **General Availability (100%)**
   - After two successful staged increments with p95 ≤ 2s and disconnect rate ≤1%, enable flag for all tenants.
   - Update onboarding docs and disable legacy polling flag once perf benchmarks captured.

## Push Notifications Feature Flag (`VITE_PUSH_NOTIFICATIONS_ENABLED`)

- **Scope**: Controls visibility of push opt-in CTA + offline badge messaging on the Notification Settings page.
- **Enablement Steps**:
  1. Confirm VAPID keys configured and `NOTIFICATIONS_TELEMETRY_ENABLED=true` for target environment.
  2. Toggle `VITE_PUSH_NOTIFICATIONS_ENABLED=true` (frontend env or remote config) for pilot tenants.
  3. Announce availability via in-app banner copy: “Real-time push notifications are now available for your workspace—enable them in Settings to stay up to date even when the dashboard is closed.”
  4. Ensure support docs link to `docs/development/guides/PUSH_NOTIFICATIONS_SETUP.md` for key rotation + troubleshooting.
- **Background Queue Note**: When enabled, the service worker broadcasts push deliveries to the app. Hidden tabs accumulate a background queue so the NotificationBell badge reflects unread + pending counts immediately upon focus.
- **Roll-back**: Set the flag to `false` to hide opt-in UI; existing subscriptions remain but users are informed via tooltip (“Push notifications currently disabled by your admin.”).

## 🔁 Fallback Procedure
1. Disable `notificationsRealtime` flag in LaunchDarkly (global or targeted tenants).
2. Verify frontend clients revert to polling (`selectNotificationsRefetchInterval` → 30s) via console sampling.
3. Trigger `emitClientEvent('disconnect')` synthetic in smoke tests to ensure fallback path healthy.
4. Backfill receipts for period (if needed) using `NotificationDeliveryReceipt` data to confirm partial deliveries.
5. Communicate rollback to stakeholders and open incident report if user-facing impact observed.

## 🧪 Telemetry & Performance Plan
- **Metrics** (Honeycomb / Grafana)
  - `notifications_ws_delivery_ms`: histogram, alert on p95 > 2000ms for >5 min.
  - `notifications_ws_connected`: gauge, alert on drop >20% relative to baseline.
  - `notifications_ws_errors_total`: counter tagged by error type (disconnect, auth, timeout).
  - `notifications_ws_reconnect_success`: ratio; alert if <99% within 10s.
  - ✅ Log emission wired via `recordRealtimeDelivery` / `recordRealtimeConnection`; dashboards still pending.
  - 📁 Template assets live in `docs/testing/assets/notifications-telemetry/` (dashboard JSON + PagerDuty YAML).
- **Comparative Benchmarks**
  1. Run `npm run test -- src/test/performance/notifications-query-metrics.test.tsx` in both polling & realtime modes (env flag) to capture render/RQ timings.
  2. Execute backend smoke script (to be added Phase 5.3) publishing synthetic events at 1Hz; compare receipt latencies.
  3. Log derived metrics into `NotificationDeliveryReceipt` table (latencyMs) and export daily percentile table for dashboards.
  4. Use `npm run test:realtime:perf` for the consolidated realtime benchmark (performs #1 + SLA suite sequentially).

## 📋 Pilot Checklist
- [ ] LaunchDarkly flag staged for target tenants with 30s fallback interval defined.
- [ ] Honeycomb board prepared with latency & disconnect visualizations.
- [ ] PagerDuty rule created for websocket latency SLA breach.
- [ ] Synthetic smoke (`socket.io-client` integration test) green in CI with Redis adapter enabled (`npm run test:realtime` in backend).
- [ ] Frontend realtime suites (`npm run test:realtime`) passing in CI before widening rollout.
- [ ] Dashboard + alert configs from `docs/testing/assets/notifications-telemetry/` applied to Honeycomb/PagerDuty.
- [ ] Docs / support brief drafted for Customer Success.

## 🧭 Communication Plan
- Pre-rollout: notify CS + Support with timeline and fallback expectation.
- Post-pilot: share latency + engagement delta vs polling (use receipts & query metrics).
- GA announcement once SLA sustained for 7 consecutive days.

## 📚 References
- Migration: `backend/prisma/migrations/20251016190000_add_notification_delivery_receipts/migration.sql`
- Hook integration tests: `frontend/src/test/integration/notifications-realtime.integration.test.tsx`, `frontend/src/test/integration/notification-hooks.integration.test.tsx`
- Socket smoke tests: `backend/src/__tests__/integration/notifications.gateway.smoke.test.ts`
