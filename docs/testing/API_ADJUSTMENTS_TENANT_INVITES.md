# API Adjustments – Tenant Invites

**Status**: ✅ Complete – November 21, 2025  
**Scope**: Phase 1 tenant onboarding guardrails (invite-only joins)  
**Related Docs**: `docs/development/auth/TENANT_ONBOARDING_GUARDRAILS.md`, `docs/development/auth/PHASE_PLAN.md`

---

## Overview
- Removed the ability to register directly against a `companyId`; all joins now flow through time-boxed invites issued by tenant admins.
- Added the `TenantInvite` data model, service, mailer, and admin/auth routes required to issue, list, revoke, resend, and redeem invites.
- Wired Resend as the production mail provider via docker-compose env plumbing with console fallback for local/dev.
- Delivered the matching Company Settings UI (issue/resend/revoke) and public `AcceptInvite` redemption page; Register now defers to the invite CTA.

---

## Backend Adjustments

### Schema & Migration
- Migration `backend/prisma/migrations/20251119093000_add_tenant_invites/` introduces `TenantInvite` with:
  - hashed token storage (`tokenHash` + unique index) and timeline timestamps (`expiresAt`, `redeemedAt`, `revokedAt`).
  - Relations to company (`companyId`), inviter, revoker, and redeemer with cascade semantics.
  - Supporting indexes for `(companyId, email)` and each status timestamp.
- `backend/prisma/schema.prisma` references `invites`, `sentInvites`, `revokedInvites`, and `redeemedInvites` relations from `Company`/`User`.

### Service & Mailer
- New module under `backend/src/modules/invites/` encapsulates invite lifecycle:
  - `invite.service.ts` handles token creation (bcrypt hash + plaintext), TTL enforcement via `INVITE_TTL_DAYS`, presentational status, and auditing hooks.
  - `invite.mailer.ts` wraps the Resend SDK; dev/test default to console output while production uses `INVITE_EMAIL_PROVIDER=resend`.
  - Errors bubble up with actionable messages (e.g., missing API key, unsupported provider, Resend API error).

### Routes & Validation
- `backend/src/modules/invites/invites.controller.ts` exposes:
  - `POST /api/admin/invites` (create + email send)
  - `GET /api/admin/invites` (tenant-scoped list)
  - `PATCH /api/admin/invites/:id/revoke`
  - `POST /api/auth/invites/redeem` (called from Register/AcceptInvite)
- `backend/src/modules/auth/auth.controller.ts` now requires a valid invite token when creating users, removing raw `companyId` registration paths.
- Validation updates in `backend/src/modules/auth/auth.validation.ts` and new invite-specific schemas enforce role subset, email normalization, and token requirements.
- `backend/src/config/env.ts` gained invite/mail configuration (`INVITE_*`, `RESEND_API_KEY`) and defaults for console/local usage.

### Tests
- New Jest integration suite `backend/src/__tests__/integration/auth.invites.integration.test.ts` covers:
  - admin issuing invites, unauthorized attempts, duplicate email guardrails.
  - redemption success, expiration, revocation, and audit metadata.
- Existing auth controller & integration tests updated to expect invite tokens rather than `companyId`.
- Test helpers, factories, and Prisma seed data extended with invite fixtures.

---

## Frontend Adjustments
- `frontend/src/lib/api/hooks.ts` exposes `useTenantInvites` and `useCreateInvite` plus supporting types in `frontend/src/types/index.ts`.
- `frontend/src/pages/CompanySettings.tsx` now renders:
  - Invite table with status badges, timeline copy, and note display.
  - Form/dialog for issuing invites (email, role, optional note) with optimistic toast feedback.
  - Resend/revoke controls wired to the new hooks.
- `frontend/src/pages/AcceptInvite.tsx` handles token-driven registration and error states (expired/revoked).
- `frontend/src/pages/Register.tsx` steers users toward invites and removes the old company selector.
- Tests:
  - `frontend/src/test/pages/CompanySettings.test.tsx` and `frontend/src/test/pages/AcceptInvite.test.tsx` validate UI flows, statuses, and redemption messaging.
  - Factories + MSW handlers updated to include invite shapes (see `frontend/src/test/utils/factories.ts`).

---

## Operational Checklist
1. **Compose Env** – Ensure `docker-compose.yml` (and deployment env) defines:
   - `INVITE_EMAIL_PROVIDER=resend`
   - `RESEND_API_KEY`, `INVITE_EMAIL_FROM`, `INVITE_EMAIL_REPLY_TO`
   - `FRONTEND_URL` for redemption link generation
2. **Runtime Verification** – `docker compose exec backend printenv | grep -E 'INVITE|RESEND'`
3. **Mailer Smoke** – Inside the backend container, run a `curl` POST against `https://api.resend.com/emails` using `$RESEND_API_KEY` to confirm credentials/DNS remain valid.
4. **Flow Test** – Tail `docker compose logs -f backend`, create an invite from Company Settings, and confirm the log shows `Resend invite email` with an `id` plus that the email is received.
5. **Fallback Mode** – For local developers, set `INVITE_EMAIL_PROVIDER=console` to suppress real sends; console output still contains invite links for manual testing.

---

## Follow-Ups
- Add Slack/webhook notifications for invite revocations/expirations (tracked in the guardrails doc).
- Finalize the legacy-user migration plan (grandfather vs. re-invite) ahead of company-wide rollout.
- Move invite failure responses to the Phase 2 error-envelope format once standardized.
