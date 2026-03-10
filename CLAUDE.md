# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LunchSync is a multi-tenant SaaS platform for coordinating corporate lunch orders. It allows companies to create lunch events, select restaurants, gather orders from team members, and coordinate deliveries.

**Tech Stack:**
- Frontend: React 18 + TypeScript, Vite, Tailwind CSS + shadcn/ui, Zustand, TanStack Query, React Router v6
- Backend: Node.js 20+ + TypeScript, Express.js, PostgreSQL 15+, Prisma ORM, Socket.IO + Redis
- Testing: Jest + Supertest (backend), Vitest + React Testing Library + MSW (frontend)

## Common Commands

### Development
```bash
# Start services (PostgreSQL on 5434, Redis on 6381)
docker-compose up -d

# Backend (port 5000)
cd backend && npm run dev

# Frontend (port 3000)
cd frontend && npm run dev
```

### Testing
```bash
# Backend tests
cd backend && npm test
cd backend && npm test -- --coverage
cd backend && npm test -- <feature>.integration.test.ts  # Single file

# Frontend tests
cd frontend && npm test
cd frontend && npm run test:coverage
cd frontend && npm test -- <Component>.test.tsx  # Single file

# Full test suite
./run-tests.sh
```

### Database
```bash
cd backend
npx prisma migrate dev --name <name>  # Create migration
npm run db:seed                        # Seed demo data
npx prisma studio                      # GUI for database
```

### Build & Lint
```bash
cd frontend && npm run build          # Build frontend
cd frontend && npm run lint           # Lint (strict, 0 warnings)
cd backend && npm run build           # Build backend
```

## Architecture

### Multi-Tenancy (Critical)
Every database query MUST filter by `companyId`. Data isolation is enforced at the database level.

```typescript
// CORRECT - Company isolation enforced
const events = await prisma.event.findMany({
  where: { companyId: req.user.companyId }
});

// WRONG - Data leakage risk
const events = await prisma.event.findMany();
```

### API Response Format
All endpoints return data wrapped in `{ data: ... }`:
```typescript
// Backend response
res.json({ data: { user, token } });

// Frontend consumption - double unwrap
const { token, user } = response.data.data;
```

Error responses use `{ message: ... }`:
```typescript
res.status(400).json({ message: 'Validation failed' });
```

### Module Structure
```
backend/src/modules/<feature>/
├── <feature>.routes.ts       # Express router
├── <feature>.controller.ts   # Request handlers
├── <feature>.validation.ts   # Zod schemas
└── __tests__/                # Unit tests

frontend/src/
├── components/               # React components (ui/, layout/, features/, etc.)
├── pages/                    # Route pages
├── store/                    # Zustand stores (authStore, eventStore, etc.)
├── lib/api/                  # API client, hooks
├── lib/validation/           # Zod schemas (mirror backend)
└── types/                    # TypeScript types
```

### Real-Time Architecture
- Socket.IO server with Redis adapter for horizontal scaling
- Notifications gateway in `backend/src/realtime/`
- Frontend Socket.IO client in `frontend/src/lib/realtime/`
- Push notifications via web-push with VAPID keys

## Development Workflow

### TDD Approach (Mandatory)
Tests define correct behavior. Write/update tests first, then adjust code to match:

1. Write integration tests in `backend/src/__tests__/integration/`
2. Run tests to see failures
3. Implement/adjust API to match test expectations
4. Document changes in `docs/testing/API_ADJUSTMENTS_<FEATURE>.md`
5. Update `docs/testing/PROGRESS.md`

### Route Ordering (Bug Prevention)
Specific routes MUST come before dynamic params:
```typescript
// CORRECT
router.get('/stats', getStats);     // /api/users/stats
router.get('/:id', getUser);        // /api/users/:id

// WRONG - /:id matches /stats
router.get('/:id', getUser);
router.get('/stats', getStats);     // Never reached!
```

### Cross-Layer Changes
When changing frontend that needs new API:
1. Write backend integration test first
2. Implement backend endpoint
3. Document API changes
4. Then complete frontend changes

### Test Helpers
Backend (`backend/src/test/helpers/`):
- `setupCompanyWithUsers({ employeeCount: 2 })` - Creates isolated test company
- `authenticatedRequest(app, token)` - Supertest with auth header
- `cleanupTestData(companyId)` - Test teardown

Frontend (`frontend/src/test/`):
- `createMockUser()`, `createMockEvent()` - Factory functions
- MSW handlers in `mocks/handlers.ts`
- `renderWithProviders()` - Wraps with React Query + Router

## Key Business Rules

1. **Roles**: ADMIN (manage restaurants, menus, settings), MANAGER, USER (create/join events, place orders)
2. **Event Lifecycle**: OPEN → CLOSED → COMPLETED/CANCELLED
3. **Payment Methods**: EVENT_CREATOR, INDIVIDUAL, COMPANY_EXPENSE
4. **Orders**: Menu-based (structured items) or custom (free text)

## Demo Credentials
- Admin: `admin@demo.com` / `password123`
- User: `user@demo.com` / `password123`

## Key Files Reference

| Purpose | Location |
|---------|----------|
| Database schema | `backend/prisma/schema.prisma` |
| API routes | `backend/src/modules/*/\*.routes.ts` |
| Test helpers | `backend/src/test/helpers/` |
| Frontend stores | `frontend/src/store/` |
| API client | `frontend/src/lib/api/client.ts` |
| Test utilities | `frontend/src/test/` |
| Development workflow | `INSTRUCTIONS.md` |
| Testing progress | `docs/testing/PROGRESS.md` |
