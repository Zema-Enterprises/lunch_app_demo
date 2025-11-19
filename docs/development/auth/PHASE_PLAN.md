# Auth Hardening Phase Plan

_Created: 2025-11-18_

## Completed Work Recap
- **Role safety** – Registration ignores elevated roles and forces `USER` (`backend/src/modules/auth/auth.controller.ts`), with coverage in `backend/src/modules/auth/__tests__/auth.controller.test.ts`.
- **Password policy** – Shared rules now live in `backend/src/utils/password.ts` and the matching Zod schema (`frontend/src/lib/validation/schemas.ts`), surfaced in the Register and Change Password flows.
- **Runtime env guardrails** – `backend/src/config/env.ts` refuses to boot when `JWT_SECRET` is weak/missing and enforces the new 15‑minute access-token TTL.
- **Request-time revalidation** – `backend/src/middleware/auth.ts` refetches the user on each request so deleted/role-changed accounts cannot keep old privileges.
- **Refresh-token rotation** – Backend issues httpOnly refresh cookies with rotation + revocation (see `backend/src/modules/auth/refreshToken.service.ts`), and the frontend auth store now hydrates from in-memory access tokens plus Axios refresh interceptors.
- **Hydration guard** – Protected routes wait for the refresh bootstrap before rendering to avoid logout flashes (`frontend/src/store/authStore.ts` + related tests).
- **Tenant invites** – Prisma migration + admin APIs + Resend delivery + frontend redemption flow completed (see `docs/development/auth/TENANT_ONBOARDING_GUARDRAILS.md` and `docs/testing/API_ADJUSTMENTS_TENANT_INVITES.md` for full breakdown).

## Outstanding Themes & Phases

### Phase 1 – Tenant Onboarding Guardrails (✅ Complete – Nov 21, 2025)
- **Goal**: Prevent cross-company registration and establish a verifiable join flow.
- **Delivered**:
  - Prisma migration `20251119093000_add_tenant_invites` + `TenantInvite` service/controller layer with create/list/revoke/redeem endpoints.
  - Resend-powered invite mailer with configurable provider + fallback console mode; docker-compose plumbing for `INVITE_*` and `RESEND_*` envs.
  - Company Settings invite UI (issue/resend/revoke) plus dedicated `AcceptInvite` page and Register adjustments.
  - Test coverage across `backend/src/__tests__/integration/auth.invites.integration.test.ts`, updated auth controller tests, and frontend Company Settings + AcceptInvite suites.
- **Artifacts**:
  - `docs/development/auth/TENANT_ONBOARDING_GUARDRAILS.md` – guardrails doc + verification checklist.
  - `docs/testing/API_ADJUSTMENTS_TENANT_INVITES.md` – API + frontend adjustments summary.

### Phase 2 – Error Envelope & Logging Consistency
- **Goal**: Standardize API responses and improve traceability.
- **Scope**:
  - Adopt `{ error: { code, message, details } }` shape for all auth endpoints and middleware failures.
  - Ensure rate-limit, validation, and unexpected errors emit structured logs (with request id + tenant id).
  - Update frontend Axios error handling to rely on the new structure.
  - Document codes in `docs/development/auth/error-codes.md` (new file).
- **Deliverables**:
  - Updated backend middleware/controllers/tests
  - Frontend toast/error helpers consuming the envelope
  - Logging playbook entry describing how to trace auth flows

### Phase 3 – Client UX & Session Resilience
- **Goal**: Smooth degradation when tokens expire or network issues occur.
- **Scope**:
  - Replace the global “redirect on first 401” behavior; instead queue retries after refresh and only force logout when refresh fails.
  - Differentiate client vs. server validation errors in the login/register UI.
  - Add password strength meter + hints surfaced near fields.
  - Expand tests in `frontend/src/test/pages/Login.test.tsx` and Register counterparts.
- **Deliverables**:
  - Updated Axios interceptor logic + auth store
  - Refined form components + error toasts
  - Playbook entry for QA scenarios (multi-tab, offline, expired tokens)

### Phase 4 – Realtime Token Hygiene & Session Management
- **Goal**: Ensure sockets and long-lived sessions respect logout/rotation.
- **Scope**:
  - Rotate Socket.IO auth tokens when the access token updates; disconnect sockets on logout.
  - Add backend enforcement to reject stale socket tokens and optionally broadcast forced logout events.
  - Introduce session tracking (device list, last active) with optional force logout per device.
  - Evaluate MFA / WebAuthn roadmap (doc stub + spike).
- **Deliverables**:
  - Backend socket auth middleware updates with tests
  - Frontend realtime hook changes + regression coverage
  - Session management UI sketches + API contract

## Next Steps
1. Kick off Phase 2 (error envelope + logging) using the lessons learned from invite failure handling.
2. Partner with design on Phase 3 UX improvements (session resilience + password hints).
3. Timebox a WebAuthn feasibility spike (Phase 4) so token hygiene roadmap stays unblocked.

> Keep this plan under `docs/development/auth/` and update status/owners as phases progress.
