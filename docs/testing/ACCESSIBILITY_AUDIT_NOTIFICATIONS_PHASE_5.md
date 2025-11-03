# Notification Accessibility Audit — Phase 5
> **Audit Date**: October 22, 2025  
> **Scope**: Push opt-in UX, offline banner, NotificationBell badge updates while hidden, service worker background queue.

---

## 🔍 Overview

- **Objective**: Validate that the push notification rollout (Phase 5.2) preserves WCAG 2.1 AA compliance across new user flows (background queue, offline banner, opt-in messaging).
- **Tooling**:
  - Automated suites in `frontend/src/test/components/notifications/NotificationBell.test.tsx` (badge aria-label aggregation).
  - Integration coverage in `frontend/src/test/integration/notification-hooks.integration.test.tsx` (service worker queue → React Query bridge).
  - Manual screen reader + high contrast walkthroughs (NVDA 2025.3, VoiceOver macOS 14.6, Windows HC White/Black).
- **Result**: ✅ **No accessibility regressions detected**; badge copy, offline announcements, and opt-in prompts remain perceivable and operable.

---

## ✅ Automated Assertions

| Area | What Changed | Coverage | Outcome |
| ---- | ------------ | -------- | ------- |
| NotificationBell badge | Badge now aggregates unread count + queued push deliveries | `NotificationBell.test.tsx` | ✅ Aria label reads “Notifications (n unread)” reflecting queued count. |
| Service worker queue | Hidden-tab queue invalidates data and clears badge on focus | `notification-hooks.integration.test.tsx` | ✅ Queue flush triggers React Query refetch + badge reset, no duplicate announcements. |
| Offline banner | Existing Workbox banner surfaced for push/offline flow | `useOnlineStatus.test.tsx` | ✅ Banner still announced via live region when network toggled. |

---

## 🧪 Manual Findings

- **Push Opt-in Modal**: VoiceOver reads rationale (“Enable push notifications”) and status (“Notifications are disabled”) with live region updates when toggling the switch. Tooltip copy updated to clarify when admins disable the feature.
- **NotificationBell (tab hidden → visible)**: When the tab regains focus, badge shrinks back to actual unread count; NVDA announces “Notifications, 5 unread, button” as soon as queue flush completes.
- **Offline Banner**: Verified that banner text remains 4.5:1 contrast in Windows HC White/Black and disappears automatically when back online. Screen readers announce message once without repetition.
- **Service Worker Broadcast**: Background queue does not steal focus or announce duplicate notifications while hidden. On focus, announcements occur once when React Query fetch completes.

---

## ♿ Screen Reader Notes

- **NVDA 2025.3 (Windows 11)**  
  - Push toggle labelled as “Enable push notifications, button” with state feedback.  
  - Hidden-tab scenario: upon returning, NVDA announces updated badge count a single time.
- **VoiceOver (macOS 14.6)**  
  - Rotor surfaces “Notifications (n unread, button)” reflecting aggregated count.  
  - Offline banner read as “You are offline. Some actions will sync when connection is restored.”, then dismissed automatically once online.

---

## 🖼️ Visual / HC Verification

- High contrast captures + transcripts archived under `docs/testing/assets/notifications-a11y/`.
- 200% zoom retains layout without truncation; badge and offline banner remain visible without overlapping navigation.

---

## 📚 References

- Tests: `NotificationBell.test.tsx`, `notification-hooks.integration.test.tsx`, `useOnlineStatus.test.tsx`
- Implementation: `frontend/src/store/notificationQueueStore.ts`, `frontend/src/service-worker.ts`, `frontend/src/components/notifications/NotificationBell.tsx`
- Docs: `docs/development/guides/PUSH_NOTIFICATIONS_SETUP.md`, `docs/testing/NOTIFICATIONS_REALTIME_FLAG_PLAYBOOK.md`
