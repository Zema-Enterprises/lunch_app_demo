# LunchSync Agent Briefing

## Mission Snapshot
- Multi-tenant lunch ordering SaaS made of a Node/Express API and a React/Vite SPA
- Keep auth, restaurants, events, and orders in sync across backend and frontend modules
- Follow the repo-wide TDD workflow described in `INSTRUCTIONS.md`

## Primary Rule
- Every change starts with tests: write or update a failing test first, then implement code until it passes.
- Run the relevant suites after each change; if failures appear, identify whether they reveal outdated behavior (update the test intentionally) or regressions caused by the change (fix the code).
- Do not ship with failing tests—green test runs are mandatory before handoff.

## Architecture Overview
- **Backend (`backend/`)**: Express + Prisma API, JWT auth, PostgreSQL persistence
- **Frontend (`frontend/`)**: React 18 + TypeScript + TanStack Query + Zustand
- **Database**: PostgreSQL 15 (Docker, port 5434) accessed via Prisma
- **Docs (`docs/`)**: Living knowledge base with testing plans, phase reports, and quick references

## Environment & Tooling
1. Install Node.js 20+, Docker, and docker-compose
2. Start PostgreSQL: `docker-compose up -d`
3. Backend setup: `cd backend && npm install && npm run db:migrate && npm run db:seed`
4. Frontend setup: `cd frontend && npm install && cp .env.example .env`
5. Default local URLs: API `http://localhost:5000`, UI `http://localhost:3000`

## Running & Testing
- Backend dev server: `cd backend && npm run dev`
- Frontend dev server: `cd frontend && npm run dev`
- Backend tests: `npm test`, coverage via `npm run test:coverage`
- Frontend tests: `npm test`, lint via `npm run lint`
- Full API smoke: `./run-tests.sh`
- Security smoke: `./security-tests.sh` and `./verify-security.sh`

## Cross-Team Workflow
- Start with tests: integration tests live in `backend/src/__tests__/integration/`, frontend tests in `frontend/src/test/`
- Align API/Frontend contracts: update Zod schemas (`frontend/src/lib/validation/`) when backend responses change
- Document every notable change under `docs/testing/` (API adjustments, progress, reports)
- Keep seed data aligned with fixtures (`backend/prisma/seed.ts` vs `backend/src/test/fixtures/`)

## Key References
- `INSTRUCTIONS.md`: canonical development workflow & expectations
- `docs/README.md`: documentation index
- `docs/development/FRONTEND_PLAN.md`: active frontend roadmap
- `docs/testing/PROGRESS.md`: status tracker

## Delivery Checklist
- All relevant tests pass locally (backend + frontend)
- Database schema changes captured via Prisma migrations
- Documentation updated alongside code changes
- Security scripts executed when touching auth or sensitive flows
- Summarize work in commit messages and phase reports where applicable
