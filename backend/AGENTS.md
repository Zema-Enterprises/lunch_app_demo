# Backend Agent Briefing

## Scope & Responsibilities
- Maintain the Express + TypeScript API that powers authentication, restaurants, events, orders, and users
- Preserve multi-tenant boundaries: every query must filter by `companyId`
- Keep validation, controllers, and Prisma models in sync with integration tests

## Environment Checklist
- Required env vars (see `backend/.env`):
  - `DATABASE_URL` → PostgreSQL DSN (Docker default: `postgresql://lunchsync:lunchsync123@localhost:5434/lunchsync`)
  - `JWT_SECRET` / `JWT_EXPIRES_IN` → token signing
  - `PORT` → default `5000`
  - `NODE_ENV` → `development`, `test`, or `production`
- Start Postgres with `docker-compose up -d`
- Initialize DB: `npm run db:migrate` then `npm run db:seed`

## Code Map
- `src/modules/*` → feature domains (each has `*.routes.ts`, `*.controller.ts`, `*.validation.ts`)
- `src/middleware/` → `auth`, `tenant`, `validation`, `error` handlers
- `src/utils/` → helpers (`jwt`, `bcrypt`, `sanitize`, `logger`)
- `src/config/` → environment + Prisma connection
- `src/test/` → factories, fixtures, helpers for integration tests
- `prisma/schema.prisma` → DB schema; migrations live in `prisma/migrations/`

## Everyday Commands
- Dev server: `npm run dev` (tsx + nodemon)
- Build: `npm run build`
- Prisma studio: `npm run db:studio`
- Format migrations: `npx prisma format`

## Testing Doctrine
- Jest is configured via `jest.config.js`; run `npm test` for the full suite
- Focus on integration specs in `src/__tests__/integration/`; unit specs live under each module and `utils/__tests__`
- Use `npm test -- <file>` for targeted runs, `npm run test:coverage` before merging
- Keep factories/fixtures aligned with seed data; update both when domain models change

### Primary Rule
- Always write or update tests first. Integration specs must fail before new backend behavior is implemented.
- When a test fails, decide whether the feature requirements changed (update the spec intentionally) or the regression must be fixed—never ignore red tests.
- Backend work is done only when `npm test` and `npm run test:coverage` return green results.

## Implementation Guidelines
- For new endpoints:
  1. Start with integration tests (see `INSTRUCTIONS.md` for TDD workflow)
  2. Add/update Zod schemas in `*.validation.ts`
  3. Extend controllers/services to satisfy tests, enforcing tenant + RBAC rules
  4. Wire routes in the appropriate `*.routes.ts`
  5. Update Prisma schema + migrations if persistence changes
- Sanitize and validate all user input (`sanitize.ts` + Zod)
- Use `tenant` middleware when adding routes that depend on `companyId`
- Return consistent response shapes; mirror what frontend expects in `frontend/src/lib/validation/schemas.ts`

## Quality & Security Checks
- Execute `../../run-tests.sh` for end-to-end API smoke when large changes land
- Run `../../security-tests.sh` or `../../verify-security.sh` after auth/session updates
- Helmet, CORS, and rate limiters are configured in `src/app.ts`; adjust carefully and keep defaults secure
- Log via `logger.ts` instead of `console.log`

## Documentation Hooks
- Record API contract changes in `docs/testing/API_ADJUSTMENTS_<FEATURE>.md`
- Note testing milestones in `docs/testing/PROGRESS.md`
- When adding migrations, document them in release notes or deployment guides as needed
