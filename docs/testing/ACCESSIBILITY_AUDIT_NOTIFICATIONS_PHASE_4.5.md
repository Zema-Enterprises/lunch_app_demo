# Notification Accessibility Audit — Phase 4.5
> **Audit Date**: October 16, 2025  
> **Scope**: NotificationBell, NotificationList, NotificationSettings, NotificationToast

---

## 🔍 Overview

- **Objective**: Validate WCAG 2.1 AA compliance for notification surfaces after Phase 4.4 automation.
- **Tooling**:
  - `jest-axe` via `frontend/src/test/accessibility/notifications-a11y.test.tsx`
  - Keyboard walkthroughs powered by `@testing-library/user-event`
- **Result**: ✅ **No axe-core violations detected** across the four notification components.

---

## ✅ Automated Findings

| Area | Checks Performed | Status | Notes |
|------|------------------|--------|-------|
| NotificationBell | Axe audit, badge announcement, dropdown focus management | ✅ | Badge exposed to SR users; dropdown toggles update `aria-expanded`. |
| NotificationList | Axe audit, tab focus for filter buttons | ✅ | `aria-pressed` equivalent via active class; filters reachable via keyboard. |
| NotificationSettings | Axe audit, labelled switches, section headings | ✅ | Switches expose `role="checkbox"` with descriptive labels. |
| NotificationToast | Axe audit, ARIA live region semantics | ✅ | Toast uses `role="alert"` + `aria-live="polite"`; message text announced. |

**Evidence**: see `frontend/src/test/accessibility/notifications-a11y.test.tsx`.

---

## ⌨️ Keyboard Walkthrough Summary

- **Primary flows covered**:
  1. Focus NotificationBell, toggle dropdown with `Enter`, cycle through menu items.
  2. Navigate NotificationList tabs with `Tab` + `Space`.
  3. Toggle NotificationSettings switches via keyboard activation.
- **Observations**:
  - Focus order remains logical across dropdown, list, and settings surfaces.
  - No focus traps detected; focus returns to bell after closing dropdown.
  - Buttons expose visible focus rings (default Tailwind focus outline).

---

## ⚠️ Outstanding Manual Checks

| Area | Status | Owner Notes |
|------|--------|-------------|
| Escape key closes NotificationBell dropdown | ✅ Complete | Automated via `NotificationBell closes dropdown on Escape` test. |
| Screen reader announcement for toast dismissal action | ✅ Complete | NVDA 2025.3 & VoiceOver (macOS 14.6) announce “Dismiss notification, button” after toast appears. |
| High contrast mode / 200% zoom visual audit | ✅ Complete | Windows HC White/Black + macOS Smart Invert verified; layout holds at 200% zoom. |

---

## 📎 References

- Automated suites: `frontend/src/test/accessibility/notifications-a11y.test.tsx`
- Keyboard helper: `frontend/src/test/utils/axe.ts`
- Phase plan linkage: `docs/testing/PHASE_4.4_PLAN.md#♿-accessibility-testing`

---

## 📝 Manual Audit Results (October 18, 2025)

### Screen Reader Verification
- **NVDA 2025.3 (Windows 11)**  
  - Bell button announces “Notifications, 4 unread, button collapsed/expanded” as state changes.  
  - Dropdown items announced with emoji description + notification title.  
  - Toast dismissal button exposed as “Dismiss notification, button”.
- **VoiceOver (macOS Sonoma 14.6)**  
  - Rotor navigation picks up bell and dropdown entries with correct labels.  
  - Toast region announced once (“New event created, alert, dismiss button”); repeat is suppressed.

### High-Contrast & Zoom
- **Windows High Contrast (White / Black themes)**: Badge, unread dots, and buttons retain sufficient contrast; focus outline remains visible.  
- **macOS Smart Invert & 200% Zoom**: Layout scales without overflow; virtualization container maintains scrollbar visibility.

### Keyboard Regression
- Confirmed Enter/Space, Escape, and Tab/Shift+Tab navigation across bell, dropdown, list, and settings in both environments.

### Phase 5 Additions (October 19, 2025)
- **Push Permission CTA**: Notification Settings exposes “Enable Push Notifications” (flagged via `VITE_PUSH_NOTIFICATIONS_ENABLED`). Checked with VoiceOver + keyboard to ensure status messages are announced (`aria-live` updates) and disabled state is conveyed when feature flag is off.
- **Offline Banner**: New banner (layout header) announces connectivity loss (`WifiOff` icon + message). Verified NVDA reads banner when going offline and focus order remains unchanged. Banner disappears automatically when reconnected.
- **Service Worker Impact**: Confirmed that offline banner retains sufficient contrast under Windows HC modes. Push toast fallback still meets `role="alert"` requirement.

## ✅ Next Steps

1. Extend keyboard suite with ESC-close regression test. ✅
2. Attach captured screenshots and VoiceOver/NVDA transcripts to `docs/testing/assets/notifications-a11y/`. *(In progress — to be archived with Phase 5 kickoff.)*
3. Monitor future UI tweaks for contrast regressions; re-run manual sweep if Tailwind color palette changes.
