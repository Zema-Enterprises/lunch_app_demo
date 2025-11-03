# Push Notifications Setup Guide
> **Updated:** October 19, 2025  
> Applies to Phase 5.2 (Push Notifications & Offline UX)

This guide explains how to configure VAPID keys, environment variables, and local tooling for LunchSync's browser push notifications.

---

## 1. Generate VAPID Keys

Use the bundled helper script (wraps `web-push generate-vapid-keys`) to generate a new key pair:

```bash
cd backend
npm run push:vapid:generate
```

The command prints a **Public Key** and a **Private Key**. Keep them safe—VAPID keys grant push send privileges for your domain.

## 2. Configure Environment Variables

Add the values to the backend environment (e.g., `.env` or deployment secrets). The backend recognises the following variables:

```
NOTIFICATIONS_VAPID_PUBLIC_KEY=<<Public Key>>
NOTIFICATIONS_VAPID_PRIVATE_KEY=<<Private Key>>
NOTIFICATIONS_VAPID_CONTACT=mailto:ops@lunchsync.com   # optional; defaults to support@lunchsync.com
NOTIFICATIONS_TELEMETRY_ENABLED=true                   # optional; emit delivery receipts + Honeycomb spans
```

Restart the backend service after updating the variables.

## 3. Verify the API

1. Acquire a JWT token (login via the UI or use existing integration helpers).
2. Call the public-key endpoint:
   ```bash
   curl -H "Authorization: Bearer <token>" \
        http://localhost:5000/api/notifications/push/public-key
   ```
   You should receive the configured `publicKey`.

3. Register a test subscription using the frontend Notification Settings page. The new record will be stored in the `PushSubscription` table.

## 4. Frontend Feature Flag

Push onboarding is gated behind `VITE_PUSH_NOTIFICATIONS_ENABLED`. Update `frontend/.env` to control availability:

```
VITE_PUSH_NOTIFICATIONS_ENABLED=true
```

When enabled, Notification Settings will show “Enable Push Notifications”. With the flag off, the button remains disabled and an informational message is displayed.

## 5. Telemetry (Optional)

Setting `NOTIFICATIONS_TELEMETRY_ENABLED=true` causes the backend to log delivery receipts with a `notification_delivery` tag and emit Honeycomb spans (see templates under `docs/testing/assets/notifications-telemetry/`). Forward these logs to Honeycomb (or your observability stack) for latency and failure dashboards.

## 6. Troubleshooting

| Issue | Fix |
| --- | --- |
| `Push notifications not configured` response | Ensure both VAPID keys are present in the backend environment and service restarted. |
| Subscription fails with `410` errors | The backend automatically removes stale endpoints. Refresh the browser subscription. |
| Frontend button shows “Push Not Available” | Confirm `VITE_PUSH_NOTIFICATIONS_ENABLED=true` and the browser supports service workers/push. |

---

For rollout procedures and telemetry expectations, see `docs/testing/NOTIFICATIONS_REALTIME_FLAG_PLAYBOOK.md`.
