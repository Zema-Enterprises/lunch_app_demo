# Workbox Offline Validation Checklist
> **Updated:** October 19, 2025  
> **Scope:** Phase 5.2 – Verify service worker precaching & offline UX

This checklist describes how to validate LunchSync’s offline experience using Lighthouse and manual browser workflows.

---

## 1. Build & Preview the PWA

```bash
cd frontend
npm run build
npm run preview    # serves at http://localhost:4173 by default
```

Ensure `VITE_PUSH_NOTIFICATIONS_ENABLED=true` (optional) and the service worker manifest is generated (`dist/service-worker.js`).

## 2. Run Lighthouse (Chrome DevTools)

1. Open Chromium-based browser (Chrome 129+ recommended).
2. Visit `http://localhost:4173`.
3. Open DevTools → Lighthouse.
4. Select **Progressive Web App** and **Offline** options.
5. Run the audit.
6. Verify:
   - “Service worker” and “Start URL responds with a 200 when offline” checks pass.
   - `workbox-precaching` assets appear in the audit log.

## 3. Manual Offline Smoke

1. In DevTools → Application → Service Workers, confirm the worker is activated.
2. Enable “Offline” in the Network conditions panel.
3. Refresh the page:
   - Offline banner (top of layout) should appear.
   - Cached assets (Dashboard shell, styles) should render.
   - Network-dependent panels (events, restaurants) may show fallback states.
4. Disable offline mode and ensure the banner disappears automatically.

## 4. Pre-Deployment Checklist

- [ ] Root `start_url` cached and available offline.
- [ ] Critical icons (`/icons/icon-192.png`, `/icons/icon-512.png`) bundled.
- [ ] Offline banner accessible (announced by screen readers) and dismissable on reconnection.
- [ ] Document results (score + notable findings) in `docs/testing/PHASE_5_PROGRESS.md`.
- [ ] Re-run audit whenever the service worker manifest changes (new routes/assets).

---

For push notification configuration, see `docs/development/guides/PUSH_NOTIFICATIONS_SETUP.md`.
