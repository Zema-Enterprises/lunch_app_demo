# Notification Performance Benchmarks
> **Review Update (2025-10-07):** Initial jsdom-based profiling from Phase 4.5.2.

## Test Harness

- File: `frontend/src/test/performance/notifications-perf.test.tsx`
- Environment: Vitest `--pool=vmThreads`, jsdom
- Data set: 200 notifications (mixed read/unread)

## Measurements (ms)

| Scenario | Target | Observed | Notes |
| --- | --- | --- | --- |
| NotificationBell initial render (stats + 5 items) | <150 | ~95 | Within target |
| NotificationList render (200 items) | <250 (stretch) | ~960 | Load-more pagination renders 50 at a time; still above stretch goal, needs virtualization for large datasets |
| NotificationSettings load (with API data) | <120 | ~40 | Within target |

## React Query Metrics (Phase 4.5)

| Metric | Observed | Notes |
| --- | --- | --- |
| Cache hit rate (NotificationBell ×3 instances) | **66%** | 3 consumers, 1 network round-trip → 2/3 served from cache (`notifications-query-metrics.test.tsx`). |
| Polling cadence | **2 polls / minute** | `refetchInterval` locked to 30s for stats + list queries. |
| Stale time | **15s** | Prevents redundant refetching while dropdown/list remain open. |

## Virtualization Snapshot

- Virtualization enabled for lists ≥60 rows (`NotificationList`).
- Initial window renders ≤24 rows (12 view + 3 buffer per edge), padded via spacer divs.
- Scroll handler resets padding on filter change to avoid layout jumps.
- `data-testid="notification-scroll-region"` exposes telemetry hook for future perf tooling.
- Guarded by `NotificationList.test.tsx` ("virtualizes long notification lists") to prevent regressions.

## Follow-up Actions

1. ✅ Implement virtualization/windowing for long lists (≤24 rows rendered at once)
2. ✅ Memoize list rows + expensive formatters
3. Re-run benchmarks in browser with React Profiler to validate real-world timings
4. Establish production SLA (e.g., <150ms for 50 items); document fallback behavior for large datasets

## Next Steps

- Capture React Profiler traces once virtualization strategy is piloted
- Track regressions by keeping `notifications-perf.test.tsx` in CI (non-blocking) with loose thresholds
