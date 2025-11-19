# Tenant Onboarding Guardrails

**Status**: ✅ Launched – November 21, 2025 (Phase 1 guardrails)  
**Drivers**: Auth squad (backend), Frontend squad (Company Settings)  
**Artifacts**: This doc + `docs/development/auth/PHASE_PLAN.md` + `docs/testing/API_ADJUSTMENTS_TENANT_INVITES.md`  
**Success Metric**: 0 unauthenticated joins per tenant; invite redemption success rate >95% during pilot.

---

## 0. Launch Summary
- **Data + API**: Prisma migration `20251119093000_add_tenant_invites` introduced the `TenantInvite` model plus `POST /api/admin/invites`, `GET /api/admin/invites`, `PATCH /api/admin/invites/:id/revoke`, and `POST /api/auth/invites/redeem`. All routes enforce tenant isolation, 7-day TTL (`INVITE_TTL_DAYS`), and bcrypt-hashed tokens. Service + presenter live in `backend/src/modules/invites/`.
- **Delivery**: Resend is the default invite provider when `INVITE_EMAIL_PROVIDER=resend` and `RESEND_API_KEY` are set. Container env values are plumbed via `docker-compose.yml` and `backend/.env`. Local/dev defaults to `console` provider for easy inspection.
- **Frontend**: Company Settings gained the invite table/form, including resend/revoke actions and timeline copy. A dedicated `AcceptInvite` page handles token lookups + redemption, while Register now orients users to the invite-first flow.
- **Testing Evidence**:
  - Backend integration: `backend/src/__tests__/integration/auth.invites.integration.test.ts`
  - Backend controller coverage: `backend/src/modules/auth/__tests__/auth.controller.test.ts`
  - Frontend flows: `frontend/src/test/pages/CompanySettings.test.tsx` and `frontend/src/test/pages/AcceptInvite.test.tsx`
- **Verification**:
  1. `docker compose exec backend printenv | grep -E 'INVITE|RESEND'` confirms runtime env values.
  2. Trigger invite creation from Company Settings while tailing `docker compose logs -f backend`; Resend responses now show `id` + `to`.
  3. Manual Resend smoke: inside the backend container run `curl https://api.resend.com/emails -H "Authorization: Bearer $RESEND_API_KEY" -H "Content-Type: application/json" -d '{"from":"<INVITE_EMAIL_FROM>","to":"<test-email>","subject":"Ping","html":"ok"}'` to double-check credentials/domain.

---

## 1. Problem Statement
- Any user can currently register against an arbitrary `companyId`, which allows lateral movement between tenants and bypasses admin control.
- There is no record of who initiated a join, no expiration, and no ability to revoke access once a link is shared.
- Company admins cannot safely onboard teammates without sharing credentials out-of-band.

**Outcome**: Lock tenant onboarding behind an invite-only workflow where only existing tenant admins can create new accounts for their company. All joins must be auditable (who invited whom, when it expires, how it was redeemed).

---

## 2. Goals & Non-Goals
| Goals | Non-Goals |
| --- | --- |
| Enforce invite-based joins with 7-day expiration & revocation. | Building a public “request access” portal (separate backlog). |
| Prevent raw `companyId` submissions in registration APIs/UI. | Multi-tenant org switching in-app. |
| Provide admin UI to issue, view, resend, and revoke invites. | Full email branding/templating (basic transactional HTML ok). |
| Deliver actionable audit logs & notifications when invites are issued or revoked. | Multi-factor authentication onboarding (covered by later phases). |

---

## 3. Requirements Snapshot
1. **Invite lifecycle**
   - Token TTL: 7 days from issuance (configurable via env `INVITE_TTL_DAYS`).
   - Storage: Hash tokens at rest (bcrypt or SHA-256) + keep short plaintext copy only for email body.
   - Single-use: Accepting an invite deactivates the token immediately and marks `redeemedAt`.
   - Revocation: Admin can revoke before redemption. Revocation triggers audit log + notification to inviter; (optional) email to invitee if already sent.
2. **Delivery**
   - Prefer a transactional provider with a free tier (Resend, Postmark trial, Mailgun sandbox). Need env placeholders for API keys/domain; fallback “copy invite link” for local/dev.
   - Each invite email includes: company name, role, optional note, CTA button (link), fallback raw URL.
3. **Redemption UX**
   - Landing page consumes invite token, displays company + role, collects required fields (first/last name, password, optional phone). Password uses existing policy.
   - Failed/expired tokens show structured error with CTA to contact admin.
4. **Company creation**
   - Super-admin console (existing manual bootstrap) is the only entry point for creating a new tenant. Public self-serve “create company” remains disabled until we have approval flow.
5. **Notifications**
   - Admin dashboard surfaces pending invites (status, expiration). Revoked + expired invites flagged with reason.
   - Optional Slack/email to inviters when invite expires unused.

---

## 4. System Design Overview
### 4.1 Data Model (Prisma)
New table `Invite` (or `TenantInvite`):
| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` (cuid) | Primary key. |
| `companyId` | FK | Tenant scope. |
| `inviterId` | FK | User (must be ADMIN for the company). |
| `email` | string | Normalized + unique per company & pending invite. |
| `role` | enum | `ADMIN`, `MANAGER`, `USER` (restricted subset). |
| `tokenHash` | string | Hashed invite token. |
| `expiresAt` | DateTime | `createdAt + 7 days`. |
| `redeemedAt` | DateTime? | Null until accepted. |
| `revokedAt` | DateTime? | Null until revoked. |
| `revokedById` | FK? | Track admin who revoked. |
| `note` | string? | Optional message. |
| `metadata` | Json? | Delivery status, bounce info. |

Indexes: `(companyId, email, redeemedAt IS NULL, revokedAt IS NULL)` to prevent duplicate pending invites.

API payloads expose a derived `status` (`PENDING`, `REDEEMED`, `REVOKED`, `EXPIRED`) computed from the timestamp fields above so the frontend can render badges without duplicating logic.

### 4.2 Backend Components
1. **Services**
   - `invite.service.ts`: create, resend, revoke, accept flows; handles hashing, TTL, and event emission.
   - `invite.mailer.ts`: wrappers for provider + dev-mode console output.
2. **Routes**
   - `POST /api/admin/invites` – create invite (role, email, optional note).
   - `GET /api/admin/invites` – list pending + historical invites (paginated).
   - `PATCH /api/admin/invites/:id/revoke` – revoke + emit notification/email.
   - `POST /api/auth/invites/redeem` – accept token + create user (or attach existing).
3. **Validation**
   - Zod/Joi schema ensures email uniqueness, role subset, invite limit per admin per minute (rate limiter).
   - Registration endpoint removes `companyId` option entirely; only invites may produce new company memberships.
4. **Audit & Logs**
   - Emit `tenant.invite.created`, `tenant.invite.redeemed`, `tenant.invite.revoked`, `tenant.invite.expired`.
   - Store event data for security reviews (Honeycomb traces + DB `AuditLog` table if available).

### 4.3 Frontend UX
1. **Company Settings → “Invitations” tab**
   - Table listing email, role, inviter, status, expiration countdown.
   - Actions: `Resend`, `Copy link`, `Revoke`.
   - Form modal to add invite (email, role dropdown, optional note).
2. **Invite Redemption Page**
   - Public route `/invite/:token` (or query param) loads token status via API.
   - If valid: show summary, fields (name/password/terms) + submit button.
   - On success: automatically logs in (same as register) and redirects to dashboard.
3. **Register Page**
   - Remove company selector; add copy explaining invites requirement.
   - Add “Have an invite link?” CTA that routes to redemption page.
4. **Notifications**
   - Toasts/snackbars for success/failure in admin UI.
   - Optional email preview in dev mode (modal showing raw message for QA).

---

## 5. Email Infrastructure Plan
1. **Provider**: Resend (simple REST API, free 100 emails/day) with console fallback for local/test environments. Mailgun remains a backup if DNS constraints appear.
2. **Env Variables**
   - `INVITE_EMAIL_PROVIDER` (`resend` | `console`)
   - `INVITE_EMAIL_API_KEY`
   - `INVITE_EMAIL_FROM` (e.g., `LunchSync <invites@lunchsync.com>`)
   - `INVITE_EMAIL_REPLY_TO`
3. **Local Dev**
   - Default to `console` provider (logs deep-link to server console + returns copy link) to avoid provider throttles.
4. **Testing**
   - Mock mailer in unit tests; integration tests assert that messages are queued (without hitting provider).
5. **To-Do**
   - Confirm whether DNS + domain are ready; if not, coordinate with infra team to set up `invites@`.

---

## 6. Security & Compliance Checklist
- [ ] Server-side check ensures inviter has ADMIN role for the tenant.
- [ ] Rate limit invite creation per admin (e.g., 5/minute) + global throttles.
- [ ] Log all invite events with tenant/user context (PII safe).
- [ ] Token stored hashed; plaintext only sent via email and shown once in UI copy-link.
- [ ] Accept endpoint invalidates token on success/failure exceeding attempts (3 strikes) to avoid brute force.
- [ ] Revoke emails include security context (“If you didn’t expect this, contact your admin”).
- [ ] Tenants cannot invite domain outside allow-list? (optional future). Documented as stretch.

---

## 7. Testing Strategy
### Backend
- **Unit**: invite service (token generation, TTL, revoke), mailer adapter.
- **Integration** (`backend/src/__tests__/integration/auth.invites.test.ts`):
  - Admin can issue invite; non-admin gets 403.
  - Invite redeems successfully and creates user with correct role.
  - Expired invite returns 410 + audit event.
  - Revoked invite cannot be redeemed, returns 410/403 with message.
  - Registration endpoint rejects payloads without invite token.
- **Security scripts**: extend `security-tests.sh` to include token tampering scenario.

### Frontend
- **Unit / Component Tests**:
  - CompanySettings invitations table interactions (resend/revoke).
  - Invite form validation (email, role).
- **Integration (Vitest + MSW)**:
  - Invite redemption happy path (valid token, registration).
  - Expired token path (error screen).
  - Register page ensures no company dropdown and displays invite CTA.

### E2E / Manual
- Document manual test script in `docs/testing/NOTIFICATION_SCENARIOS.md`? (add new doc if needed) covering email delivery, multi-tenant isolation.

---

## 8. Progress Tracker
| Phase | Scope | Owner | Status | Links |
| --- | --- | --- | --- | --- |
| P0 – Spec & Alignment | Finalize this doc, confirm requirements, pick email provider. | Auth PM + Eng | ✅ Complete (Nov 19) | This doc |
| P1 – Backend Foundations | Prisma migration, service, admin APIs, tests. | Backend | ✅ Complete (Nov 20) | Schema + service details in `docs/testing/API_ADJUSTMENTS_TENANT_INVITES.md` |
| P2 – Email Delivery | Provider integration, env plumbing, audit logging. | Backend/Infra | ✅ Complete (Nov 21) | `backend/src/modules/invites/invite.mailer.ts`, Resend verification checklist |
| P3 – Frontend UI/Flows | Admin invite UI, redemption page, register updates. | Frontend | ✅ Complete (Nov 21) | Company Settings + `AcceptInvite` implementation + tests |
| P4 – QA & Rollout | Integration tests, manual playbook, enable feature flag per tenant. | QA + Eng | ✅ Complete (Nov 22) | Regression steps captured in `docs/testing/API_ADJUSTMENTS_TENANT_INVITES.md` |

Each phase requires passing tests + documentation updates (`docs/development/auth/PHASE_PLAN.md`, README snippets).

---

## 9. Open Items / Decisions Needed
1. **Email Provider** – ✅ Resend approved + DNS verified for `invites@lunchsync.com`. Keep `INVITE_EMAIL_PROVIDER=console` in local `.env` if email spam is a concern.
2. **Notification Channel for Revocation** – Still email/log only. Slack/webhook alerting remains a backlog item (Phase 2 candidate).
3. **Existing Users** – Decision pending: whether to grandfather legacy manual signups or trigger forced invites. Tracked in `docs/development/auth/PHASE_PLAN.md`.
4. **Cross-tenant duplicates** – Enforced as **No**. Support should document exception requests; automation for cross-tenant membership is future scope.

---

## 10. Next Steps
1. Monitor Resend metrics (bounces, complaints) weekly for the first month; escalate to Infra if deliverability dips.
2. Add Slack/webhook notifications for revoked/expired invites once comms owners sign off.
3. Evaluate legacy users and decide whether to auto-invite or keep grandfathered accounts (depends on compliance review).
4. Feed rollout learnings into Phase 2 (error envelope) so invite failures use the standard response format.

> Keep this document updated as phases complete (checkboxes, dates, links to PRs/tests).

---

## 11. Deployment Notes
- Apply the `TenantInvite` schema changes in every shared environment: `cd backend && npx prisma migrate deploy`.
- Production/staging environments require explicit invite mail configuration:
  - `INVITE_EMAIL_PROVIDER=resend`
  - `RESEND_API_KEY=<service-api-key>`
  - `INVITE_EMAIL_FROM=LunchSync Invites <invites@your-domain>`
  - `INVITE_EMAIL_REPLY_TO=support@your-domain`
  - `INVITE_TTL_DAYS=7` (override as needed)
  - `FRONTEND_URL=<https://your-frontend-domain>`
- Local development defaults to the console mail provider; no API key is required.
- Runtime validation steps:
  1. `docker compose exec backend printenv | grep -E 'INVITE|RESEND'`
  2. `docker compose logs -f backend` while issuing an invite to confirm Resend `id` responses.
  3. Optional: trigger the curl smoke (outlined in the launch summary) from inside the backend container to confirm the API key + domain remain valid.
