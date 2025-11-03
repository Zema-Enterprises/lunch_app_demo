# Notification Regression Checklist
> **Last Updated**: October 20, 2025  
> **Owner**: Frontend QA  

Use this checklist before every release that touches the notification system (frontend or backend).

---

## 1. Environment Prep
- [ ] Seed database with Phase 4 fixtures (`npm run db:seed`).
- [ ] Start stack via `docker-compose up` (Postgres + backend + frontend).
- [ ] Ensure `.env` matches notification defaults (polling interval 30s, `VITE_PUSH_NOTIFICATIONS_ENABLED` + `NOTIFICATIONS_TELEMETRY_ENABLED` per test case).
- [ ] Capture LaunchDarkly (or feature flag service) state for `notificationsRealtime` & related push flags before testing; document toggles in the report.

## 2. Automated Suites
- [ ] `npm test -- --run --pool=vmThreads src/test/components/notifications/NotificationBell.test.tsx`
- [ ] `npm test -- --run --pool=vmThreads src/test/components/notifications/NotificationList.test.tsx`
- [ ] `npm test -- --run --pool=vmThreads src/test/components/notifications/NotificationSettings.test.tsx`
- [ ] `npm test -- --run --pool=vmThreads src/test/components/notifications/NotificationToast.test.tsx`
- [ ] `npm test -- --run --pool=vmThreads src/test/integration/notification-workflow.test.tsx`
- [ ] `npm test -- --run --pool=vmThreads src/test/accessibility/notifications-a11y.test.tsx`
- [ ] `npm test -- --run --pool=vmThreads src/test/performance/notifications-perf.test.tsx`
- [ ] `npm test -- --run --pool=vmThreads src/test/performance/notifications-query-metrics.test.tsx`
- [ ] `npm run test:realtime` (frontend) — realtime hydration, fallback, and polling suppression
- [ ] `npm run test:realtime` (backend) — socket.io handshake + broadcast smoke
- [ ] `npm run test -- notifications.push.integration.test.ts --runInBand` — push subscription CRUD
- [ ] `npm test -- --run --pool=vmThreads src/test/integration/notification-hooks.integration.test.tsx` with service worker queue assertions
- [ ] `npm test -- --run --pool=vmThreads src/test/realtime/notifications-realtime.test.ts` to confirm store behaviour

## 3. Manual Functional Checks
- [ ] Verify bell badge counts update after new notification is seeded.
- [ ] Ensure dropdown toggles via mouse, Enter, and Escape (focus returns to bell).
- [ ] Confirm list filters (All ↔ Unread) update counts + virtualization indicator.
- [ ] Save notification settings and refresh page — changes persist.
- [ ] Trigger toast notification (e.g., mark unread) and confirm polite alert semantics.
- [ ] Toggle `notificationsRealtime` flag (LaunchDarkly test env) and confirm socket handshake succeeds (gateway logs connection + fallbackPolling disabled).
- [ ] Disable realtime flag — ensure polling resumes at fallback interval and badge counts continue updating.
- [ ] Opt-in to push notifications and verify browser permission prompt + Workbox registration.
- [ ] Seed push delivery receipt and confirm Honeycomb dashboard captures `notifications_ws_delivery_ms` point & PagerDuty alerts remain quiet.
- [ ] While tab hidden, emit push `PUSH_NOTIFICATION_RECEIVED`; confirm badge increments via background queue, then flushes on visibility change.
- [ ] Toggle offline mode in DevTools — confirm OfflineBanner appears, cached shell renders, and reconnect clears banner automatically.
- [ ] Unsubscribe from push notifications (Notification Settings) and verify backend deletes subscription + UI reflects disabled state.
- [ ] Validate service worker version updates: trigger `navigator.serviceWorker.getRegistrations()` to confirm new build activates without stale caches.
- [ ] For polling mode run (`run-tests.sh --notifications-mode=polling`), confirm notifications still refresh every 30s; for realtime run (`--notifications-mode=realtime`) confirm fallback remains disabled.

## 4. Accessibility Spot Checks
- [ ] Screen reader (NVDA or VoiceOver) announces bell unread count and dropdown state.
- [ ] Ensure focus order matches keyboard expectations (header → bell → menu).
- [ ] Validate high-contrast mode + 200% zoom for notification surfaces.

## 5. Performance Quick Pass
- [ ] Capture React Profiler trace for NotificationList (≥200 items) — confirm virtualization.
- [ ] Observe devtools network panel: stats + list endpoints ≤2 requests/min when idle.
- [ ] Compare realtime vs polling latency via `npm run test:realtime` output — confirm realtime p95 ≤2s and polling baseline unchanged.
- [ ] Record push delivery success/failure counts (Honeycomb dashboard) before/after regression to ensure telemetry continuity.

## 6. Post-Run Reporting
- [ ] Archive coverage summary (`frontend/coverage/lcov-report`) in Sprint folder.
- [ ] Update Phase 5 progress log with telemetry snapshots + test outcomes.
- [ ] File follow-up tickets for issues uncovered during the pass.
- [ ] If analytics dashboard scope remains deferred, note outstanding items in `docs/testing/DEFERRED_WORK.md` and flag prerequisites for next phase.

---

**Tip**: For day-to-day verifications, use the quick command aliases listed in `docs/testing/TESTING_QUICK_REFERENCE.md`.
