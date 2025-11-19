# Testing Documentation
> **Review Update (2025-10-22):** Phase 5.1/5.2 complete, realtime regression tooling uplifted, Phase 5.3 deferred, Phase 5.4 release prep in progress.

This directory contains all testing-related documentation for the LunchSync project.

## 📚 Core Documentation

### Strategy & Planning
- **[TESTING_IMPROVEMENT_PLAN.md](./TESTING_IMPROVEMENT_PLAN.md)** - Master testing strategy with complete phase breakdown
- **[TESTING_QUICK_REFERENCE.md](./TESTING_QUICK_REFERENCE.md)** - Quick reference guide for common testing tasks
- **[PROGRESS.md](./PROGRESS.md)** - Live testing progress tracker with current status
- **[PHASE_4.5_PLAN.md](./PHASE_4.5_PLAN.md)** - Accessibility & performance hardening plan (Phase 4.5)
- **[PHASE_4.4_COMPLETE.md](./PHASE_4.4_COMPLETE.md)** - Phase 4.4 completion report & outstanding actions
- **[PHASE_5_PLAN.md](./PHASE_5_PLAN.md)** - Real-time notification & engagement roadmap
- **[PHASE_5_PROGRESS.md](./PHASE_5_PROGRESS.md)** - In-flight updates for real-time delivery
- **[NOTIFICATIONS_REALTIME_FLAG_PLAYBOOK.md](./NOTIFICATIONS_REALTIME_FLAG_PLAYBOOK.md)** - Feature flag rollout & fallback playbook + telemetry checklist
- **[PERFORMANCE_NOTES_NOTIFICATIONS.md](./PERFORMANCE_NOTES_NOTIFICATIONS.md)** - Notification render benchmarks & follow-ups
- **[ACCESSIBILITY_AUDIT_NOTIFICATIONS_PHASE_4.5.md](./ACCESSIBILITY_AUDIT_NOTIFICATIONS_PHASE_4.5.md)** - Accessibility audit log (automation + Oct 18 manual sweeps)
- **[NOTIFICATIONS_REGRESSION_CHECKLIST.md](./NOTIFICATIONS_REGRESSION_CHECKLIST.md)** - Release readiness checklist for notifications

### Assets & Evidence
- Accessibility transcripts & high-contrast captures: [`assets/notifications-a11y/`](./assets/notifications-a11y/)
- Honeycomb dashboards + PagerDuty templates: [`assets/notifications-telemetry/`](./assets/notifications-telemetry/)

### Archived References
- Historical API adjustments, compatibility notes, and bug fix write-ups now live under [`archive/`](./archive/).
- Key examples: `API_ADJUSTMENTS_*.md`, `FRONTEND_*` docs, and Phase 4 plan/progress logs.

## 📊 Current Status

### Completed Phases / Milestones
- ✅ **Phase 0**: Test Infrastructure (baseline tooling in place)
- ✅ **Phase 1.x**: Core API suites (auth, events, orders) with 116 integration tests
- ✅ **Phase 4.1-4.3**: Notification backend + UI delivery (component parity, manual validation)
- ✅ **Phase 4.4**: Notification frontend automation (47 component/integration tests + 9 accessibility + perf/cache instrumentation)

### Next Up
- ✅ **Phase 5.1 Real-Time Delivery**: Realtime gateway + frontend hydration landed; telemetry rollout and flag playbook documented.
- ✅ **Phase 5.2 Push Notifications & Offline UX**: Service worker + push manager shipped, regression suites green.
- ⏸️ **Phase 5.3 Analytics & Observability**: Deferred to `docs/testing/DEFERRED_WORK.md`.
- 🚧 **Phase 5.4 Regression Automation & Release Prep**: Finalise regression checklist, run security suites, capture telemetry snapshots.

### Coverage Snapshots
- **Notification Components**: 95.97% statements / 87.09% functions (Vitest + V8)
- **Notification Store**: 100% statements / 100% functions (store + realtime automation)
- **Backend Integration**: 116 tests passing (Phases 1.1-1.3)
- **Global Threshold**: Functions threshold restored to 75% (frontend & backend); additional uplift tracked via Phase 5 docs

## 🎯 Quick Links

### For Developers
1. Start here: [INSTRUCTIONS.md](../../INSTRUCTIONS.md) - Complete development workflow
2. Testing strategy: [TESTING_IMPROVEMENT_PLAN.md](./TESTING_IMPROVEMENT_PLAN.md)
3. Quick commands: [TESTING_QUICK_REFERENCE.md](./TESTING_QUICK_REFERENCE.md) _(includes realtime smoke aliases)_
4. Track progress: [PROGRESS.md](./PROGRESS.md)

### For Understanding API Changes
- Tenant invite guardrails: [`API_ADJUSTMENTS_TENANT_INVITES.md`](./API_ADJUSTMENTS_TENANT_INVITES.md)
- Authentication changes: [`archive/API_ADJUSTMENTS_AUTH.md`](./archive/API_ADJUSTMENTS_AUTH.md)
- Event management changes: [`archive/API_ADJUSTMENTS_EVENTS.md`](./archive/API_ADJUSTMENTS_EVENTS.md)
- Order management changes: [`archive/API_ADJUSTMENTS_ORDERS.md`](./archive/API_ADJUSTMENTS_ORDERS.md)

## 📝 Document Purpose

| Document | Purpose | When to Use |
|----------|---------|-------------|
| INSTRUCTIONS.md | Complete development workflow | Starting development, onboarding |
| TESTING_IMPROVEMENT_PLAN.md | Overall testing strategy | Planning phases, understanding approach |
| TESTING_QUICK_REFERENCE.md | Quick commands and patterns | Daily development, writing tests |
| PROGRESS.md | Current status and next steps | Checking progress, planning work |
| archive/API_ADJUSTMENTS_*.md | Detailed API changes per phase | Understanding what changed and why |

## 🔄 Documentation Workflow

After completing each testing phase:

1. **Create/Archive API Adjustments Document**
   - File: `archive/API_ADJUSTMENTS_<FEATURE>.md`
   - Include: All file changes, before/after code, rationale

2. **Update Progress Tracker**
   - File: `PROGRESS.md`
   - Mark phase complete, update stats, update next steps

3. **Check Frontend Compatibility**
   - Review API changes for breaking changes
   - Update frontend types and services if needed

4. **Clean Up Documentation**
   - Archive outdated reports
   - Update this README
   - Verify all links work

## 📂 Archive

Legacy phase documentation now lives in [`archive/`](./archive) (e.g., Phase 4 initial readiness/requirements). Refer there for historical context.

---

**Last Updated**: October 19, 2025 (Phase 5.1 kickoff checkpoint)  
**Notification Test Count**: 60 (components/integration 47 + accessibility 9 + perf/cache 4)  
**Next Focus**: Redis adapter wiring, authenticated realtime smoke, reconnect acceptance criteria
