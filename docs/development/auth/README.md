# Authentication & Authorization Review

_Last updated: 2025-11-06_

## Current Posture
- **Backend** (`backend/src/modules/auth/`): JWT-based auth with bcrypt password hashing, Express middlewares for auth/role checks, Prisma persistence, rate limiting on `/login` and `/register`.
- **Frontend** (`frontend/src/store/authStore.ts` + related pages/hooks): Zustand store manages token + user state entirely in memory, hydrates via refresh tokens on boot, and gates protected routes until that initial check finishes. Axios interceptors inject the bearer token from store state and coordinate automatic refresh; React Hook Form + Zod drive login/register validation.
- **Real-time** (`backend/src/realtime/notifications.gateway.server.ts`, `frontend/src/lib/realtime/useNotificationsRealtime.ts`): Socket.IO connections reuse the same JWT (sent in the `auth.token` handshake field) without rotation.

## Key Findings

### Backend
- **Privilege escalation via `role`** _(Resolved 2025-11-06)_ – `register` now forces existing-company sign-ups to `USER` and ignores the provided `role` (`backend/src/modules/auth/auth.controller.ts:6-118`), with coverage in `backend/src/modules/auth/__tests__/auth.controller.test.ts:136-154`.
- **Password policy drift** _(Resolved 2025-11-06)_ – Strong password requirements live in `backend/src/utils/password.ts:1-8` and are enforced via shared validation (`backend/src/modules/auth/auth.validation.ts:6-17`, `backend/src/modules/users/users.validation.ts:11-18`, `backend/src/modules/users/users.controller.ts:159-201`).
- **Weak secret defaults** _(Partially addressed 2025-11-06)_ – Boot now fails when `JWT_SECRET` is missing or too short and tokens default to 15 minute lifetimes (`backend/src/config/env.ts:5-28`). Refresh-token rotation/blocklisting still pending.
- **Missing account lifecycle checks** _(Resolved 2025-11-06)_ – `authMiddleware` re-fetches the user from the database on every request (`backend/src/middleware/auth.ts:9-48`) so deleted or role-changed users lose access immediately.
- **Join flow lacks tenancy guardrails** – Accepting raw `companyId` during registration (`backend/src/modules/auth/auth.controller.ts:41-63`) bypasses domain/slug verification or invitation checks. Nothing prevents cross-company enumeration.
- **Error handling consistency** – APIs mix `message` and `error` keys (`backend/src/middleware/auth.ts:13-33`, `backend/src/modules/auth/auth.controller.ts:15-177`), which complicates client parsing and security logging.

### Frontend
- **Token storage & exposure** – Access tokens still live in `localStorage` (`frontend/src/store/authStore.ts:26-110`, `frontend/src/lib/api/client.ts:12-35`). Any XSS yields immediate account compromise; there is no refresh-flow to recover from logout or expiry.
- **Validation mismatch** _(Resolved 2025-11-06)_ – Zod schemas now match backend complexity requirements and surface shared messaging/hints (`frontend/src/lib/validation/schemas.ts:3-59`), with UI updates in `frontend/src/pages/Register.tsx:83-96` and `frontend/src/components/settings/ChangePasswordDialog.tsx:32-133`.
- **Form UX gaps** _(Partially addressed 2025-11-06)_ – Email inputs now use semantic `type="email"` (`frontend/src/pages/Login.tsx:54-62`, `frontend/src/pages/Register.tsx:72-77`) and password hints were added, but error messaging still conflates server and client failures.
- **Global 401 redirect** – Axios interceptor hard-navigates to `/login` on any 401 (`frontend/src/lib/api/client.ts:26-35`), interrupting legitimate flows such as expired API calls during background polling or multi-tab usage.
- **Socket reuse of long-lived JWT** – Notification sockets send the same bearer token without renewal or forced disconnect on logout (`frontend/src/lib/realtime/useNotificationsRealtime.ts:37-144`), so stale tokens remain usable until manually cleared.

## Recommended Improvements

### Immediate (High Priority)
1. **Lock down registration roles** – Ignore/validate incoming `role` for unauthenticated registration; default to `USER` when `companyId` present and require admin provisioning for elevation. Update tests + schema to reflect (`backend/src/modules/auth/auth.controller.ts`, `auth.validation.ts`).
2. **Enforce consistent password policy** – Move password strength rules into shared validation (e.g., Zod schema + reusable helper) and surface actionable error hints on the client (`frontend/src/lib/validation/schemas.ts`, `frontend/src/pages/Register.tsx`).
3. **Harden JWT secret requirements** – Fail-fast boot if `JWT_SECRET` is missing/weak and shorten access-token TTL (e.g., 15m) paired with refresh tokens stored in httpOnly cookies. Blocklist/rotate on logout.
4. **Re-verify users per request** – Extend `authMiddleware` to fetch the user by `userId`, confirm `active` state + `role`, and reject tokens for deleted/role-changed accounts. Cache judiciously to avoid DB overhead.

### Near Term
1. **Invitation or domain confirmation for company join** – Replace raw `companyId` registration with slug + emailed invite or domain-based verification to prevent tenant hopping.
2. **Normalize API error envelopes** – Adopt a consistent `{ error: { code, message, details } }` structure to aid logging and client handling; update middleware + controllers + tests.
3. **Front-end auth polish** – Switch email inputs to `type="email"`, add password strength meters & hints, and differentiate authentication vs. validation failures in toasts/forms.
4. **Token handling modernization** _(Resolved 2025-11-06)_ – Access tokens now live in memory only, backed by rotating httpOnly refresh cookies; Axios interceptors refresh and retry on 401.

### Longer Term
- Add device/session management & force logout support.
- Introduce optional MFA for admins.
- Instrument suspicious login attempts and surface audit logs per tenant.
- Evaluate WebAuthn/passwordless options for enterprise accounts.

## Testing & Documentation Considerations
- Expand backend integration tests under `backend/src/modules/auth/__tests__/` to cover restricted roles, invite flows, and revoked-token access.
- Mirror password policy tests on the front end (`frontend/src/test/pages/Register.test.tsx`, `frontend/src/store/__tests__/authStore.test.ts`).
- Update end-to-end smoke scripts once refresh tokens/httpOnly cookies land.
- Keep this document in sync as improvements roll out; add sub-pages (e.g., `password-policy.md`, `token-strategy.md`) to track progress.

## Open Questions
- Do we need self-service company joins, or should all additional users be invited by existing admins?
- What retention/telemetry requirements exist for auth logs (GDPR, SOC2)?
- Should logout invalidate notification sockets immediately or allow graceful degradation?

> Use this README as the hub for auth/authorization work. Add linked specs and RFCs here as we iterate.

## Progress Log

- **2025-11-06** – Implemented registration role hardening, shared password policy (backend + frontend), runtime JWT secret enforcement, and request-time user revalidation.
- **2025-11-06** – Added persistent refresh tokens with rotation + revocation, httpOnly cookie issuance, logout revocation, and frontend migration from `localStorage` to in-memory tokens with automatic refresh handling.
- **2025-11-07** – Added auth store hydration guard so protected routes wait for refresh-driven bootstrap, preventing logout flashes on reload; updated tests to cover the regression.
