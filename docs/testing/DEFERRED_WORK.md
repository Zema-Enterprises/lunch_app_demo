# Deferred Work Log
> Living list of scoped tasks intentionally postponed for a later release cycle.

This document captures features, enhancements, and follow-up efforts we have chosen to defer. Each entry records the original context, outstanding actions, and the trigger for re-activation.

---

## Phase 5.3 – Analytics, Filtering & Observability

**Status**: ⏸️ Deferred (moved out of Phase 5 scope, October 22, 2025)  
**Reason**: Focus shift to Phase 5.4 regression automation while realtime + push deliverables are stabilized.

### Outstanding Deliverables
- Analytics dashboard UI with filtering, time slicing, and latency visualisations surfaced in the frontend.
- Honeycomb / PagerDuty telemetry wiring for realtime latency (p95), disconnect rates, and push delivery success.
- React Testing Library + Vitest specs covering dashboard interactions, query behaviour, and error states.
- Backend aggregation jobs (delivery receipts → daily buckets) and accompanying Prisma integration tests.
- Documentation updates: telemetry runbook, analytics usage guide, and coverage impact notes.

### Reactivation Criteria
- Re-enable once Phase 5.4 regression automation is complete and stakeholders confirm analytics priorities for Phase 6 planning.
- Requires product sign-off to re-introduce dashboard scope and telemetry rollout checklist.

---

Add new sections here as additional work is deferred. Each section should outline:
1. **What** was deferred (feature/test/doc scope).  
2. **Why** it was deferred and target revisit window.  
3. **How** to resume (dependencies, owners, decision checkpoints).

