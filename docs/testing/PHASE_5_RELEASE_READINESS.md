# Phase 5 Release Readiness Draft
> **Status**: In Progress  
> **Owner**: QA / Engineering Leads  
> **Scope**: Realtime delivery, push notifications, offline experience (Phases 5.1–5.4)

---

## 1. Summary
- **Backend**: Socket.IO gateway, delivery receipts, push subscription API live behind feature flags. Telemetry exporters available (Honeycomb templates staged).  
- **Frontend**: Realtime hook + background queue, NotificationBell enhancements, push manager + service worker, offline banner, regression suites.  
- **Deferred**: Analytics dashboard + observability refinements (Phase 5.3) – tracked in `docs/testing/DEFERRED_WORK.md`.  
- **Current Focus**: Phase 5.4 regression automation, documentation wrap, rollout checklist completion.
- **Telemetry Evidence**: 2025-10-18 realtime benchmark archived under `docs/testing/assets/notifications-telemetry` with latency durations captured for Honeycomb import.

---

## 2. Test Matrix
| Area | Status | Notes / Command |
| --- | --- | --- |
| Backend API suite | ✅ | `run-tests.sh` (default polling mode) |
| Frontend notifications (polling) | ✅ | `npm exec -- vitest run src/test/components/notifications/NotificationList.test.tsx src/test/components/notifications/NotificationSettings.test.tsx --pool threads` |
| Frontend realtime smoke | ✅ | `npm run test:realtime` |
| Backend realtime smoke | ✅ | `cd backend && npm run test:realtime` |
| Push subscription integration | ✅ | `npm run test -- notifications.push.integration.test.ts --runInBand` |
| Accessibility | ✅ | `npm test -- src/test/accessibility/notifications-a11y.test.tsx` (note: existing act warning tracked) |
| Performance | ✅ | `npm test -- src/test/performance/notifications-perf.test.tsx src/test/performance/notifications-query-metrics.test.tsx` |
| Realtime perf benchmark | ✅ | `npm run test:realtime:perf` (logs: `docs/testing/assets/notifications-telemetry/2025-10-18_realtime-perf.txt`, `2025-10-17_realtime-perf.txt`) |
| Security smoke | ✅ | `./security-tests.sh`, `./verify-security.sh` |
| Analytics dashboard | ⏸️ | Deferred (Phase 5.3) |

---

## 3. Feature Flags & Config
- `notificationsRealtime` (LaunchDarkly) – controls websocket rollout; dry-run complete, GA pending.  
- `VITE_PUSH_NOTIFICATIONS_ENABLED` – enables push onboarding UI (per environment).  
- `NOTIFICATIONS_TELEMETRY_ENABLED` – toggles Honeycomb exporter logging.  
- Document flag states & target tenant cohorts before rollout; follow `docs/testing/NOTIFICATIONS_REALTIME_FLAG_PLAYBOOK.md`.

---

## 4. Release Criteria (Phase 5.4)
- [ ] Regression checklist (`docs/testing/NOTIFICATIONS_REGRESSION_CHECKLIST.md`) completed with evidence links (in progress).  
- [ ] `run-tests.sh --notifications-mode both` (or equivalent) passes on CI runner (pending full-stack environment).  
- [ ] Telemetry dashboards imported (Honeycomb JSON) and PagerDuty alerts configured.  
- [ ] Offline banner + push flow validated in Chrome (stable) and Firefox (latest).  
- [ ] Security smoke scripts (`./security-tests.sh`, `./verify-security.sh`) green.  
- [ ] Documentation updates merged (plan, progress, release notes).  
- [ ] Deferred work logged with owners / revisit timeline.

---

## 5. Outstanding Actions
- Document React Router future-flag warnings with upgrade timeline (target React Router v7 GA + audit components relying on deprecated loaders).  
- Finalise CORS tightening decision before GA (current plan: ship with environment-based allowlist in `backend/src/app.ts`, add tenant allowlist ticket for Phase 6 hardening).  
- Capture accessibility & performance audit deltas post Phase 5.4 passes.  
- Confirm customer support / success enablement materials (FAQ, fallback procedures).  
- Schedule production rollout window + rollback plan review.

## 6. Telemetry Evidence
- **Realtime benchmark output**: `docs/testing/assets/notifications-telemetry/2025-10-18_realtime-perf.txt` (Polling vs Realtime completed in 1.46s; Integration SLA completed in 1.30s; no new React Router warnings observed).  
- **Historical reference**: Prior run logged in `docs/testing/assets/notifications-telemetry/2025-10-17_realtime-perf.txt` for delta comparison.  
- **Honeycomb assets**: Dashboard template (`honeycomb-dashboard.json`) and PagerDuty alerts (`pagerduty-alerts.yaml`) ready for import; align dataset before GA.  
- **Next checks**: Validate `notifications_ws_delivery_ms` p95 < 2s and reconnect success ≥ 99% once Honeycomb ingestion is live.

---

## 7. Approvals
| Role | Name | Sign-off | Date |
| --- | --- | --- | --- |
| Engineering Lead | | ☐ | |
| QA Lead | | ☐ | |
| Product Manager | | ☐ | |
| DevOps | | ☐ | |

---

_Update this document as Phase 5.4 tasks progress. Move to the testing archive once the release ships._
