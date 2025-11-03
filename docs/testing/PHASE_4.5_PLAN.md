# Phase 4.5 - Notification Accessibility & Performance Hardening
> **Review Update (2025-10-07):** Created after Phase 4.4 integration milestone to capture remaining hardening work.

**Status**: 🆕 **PLANNING**  
**Target Window**: October 8-10, 2025  
**Focus**: Accessibility automation, performance benchmarking, documentation wrap-up

---

## 🎯 Objectives

1. Automate accessibility checks (axe-core + keyboard regression coverage)
2. Benchmark notification performance and address bottlenecks
3. Finalize documentation, coverage artefacts, and release readiness notes

---

## 📦 Phase Breakdown

### Phase 4.5.1 – Accessibility Automation (4-6 hours)
- [x] Add `jest-axe` (or equivalent) to frontend tooling
- [x] Create shared `runAxe` helper in `src/test/utils`
- [x] Author axe tests for:
  - NotificationBell (dropdown states)
  - NotificationList (filters, empty state)
  - NotificationSettings (forms + banner)
  - NotificationToast (live regions)
- [x] Expand keyboard walkthroughs (tab sequences, ESC close behaviour)
- [x] Update accessibility section in `PHASE_4.4_PLAN.md` + publish audit report (`ACCESSIBILITY_AUDIT_NOTIFICATIONS_PHASE_4.5.md`)

### Phase 4.5.2 – Performance Benchmarking (3-4 hours)
- [x] Instrument component render timings (custom timers via `notifications-perf.test.tsx`)
- [x] Measure React Query cache hit rate / polling cost (66% hit rate, 2 polls/min)
- [x] Optimize high-cost renders (memoization, virtualization toggles)
- [x] Capture baseline metrics in `docs/testing/PERFORMANCE_NOTES_NOTIFICATIONS.md`

### Phase 4.5.3 – Coverage & Documentation (2-3 hours)
- [x] Run frontend coverage, document module percentages *(notifications bundle 95.97% statements / 87.09% functions; repo threshold temporarily set to 70% functions pending API hook tests)*
- [x] Publish accessibility + performance findings (append to `PHASE_4.4_PROGRESS.md`)
- [x] Draft `PHASE_4.4_COMPLETE.md` summarizing outcomes
- [x] Update `PROGRESS.md` / `README.md` with final numbers

### Phase 4.5.4 – Release Readiness (1-2 hours)
- [x] Create regression checklist for notifications (smoke steps, integration suite list)
- [x] Identify tech debt / future enhancements (feed into Phase 5 roadmap) *(see outstanding list in completion report)*
- [x] Confirm docs archived / links valid *(README + plan cross-links verified Oct 16)*
- [x] Archive accessibility transcripts & HC screenshots under `docs/testing/assets/notifications-a11y/`

---

## 📊 Success Criteria

- ✅ Axe-core suite integrated with zero violations across notification surfaces
- ✅ Keyboard audit documented with remediation items (if any)
- ✅ Render benchmarks recorded (<100ms target) with action items tracked
- ✅ Coverage report captured (>=80% notifications bundle)
- ✅ `PHASE_4.4_COMPLETE.md` + supporting docs published

---

## 📋 Dependencies & Notes

- Requires adding `jest-axe` (or alternative) to dev dependencies — coordinate with tooling team if network access is restricted
- Performance measurements can leverage React Profiler or console timing inside Vitest (VM threads OK)
- Ensure MSW handlers mirror benchmark scenarios (large notification lists, mixed read states)

**Status Notes (Oct 7, 2025)**: `jest-axe` and `axe-core` installed locally; automated axe suite lives at `src/test/accessibility/notifications-a11y.test.tsx`. Notification list rows now expose explicit “View” and “Mark as read” actions to avoid nested interactive controls.

---

## 🔮 Post Phase 4.5 Suggestions

- Phase 5.1: Real-time delivery (WebSocket migration)
- Phase 5.2: Push notifications + service worker support
- Phase 5.3: Analytics dashboard & advanced filtering
