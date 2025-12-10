# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**LunchSync** is a multi-tenant lunch ordering and event management system for companies. Employees can organize lunch events, order from restaurants, and manage payments.

**Tech Stack:**
- Backend: Node.js, Express, TypeScript, Prisma (PostgreSQL)
- Frontend: React 18, TypeScript, Vite, TailwindCSS, TanStack Query, Zustand
- Testing: Jest (backend), Vitest (frontend), MSW (API mocking)
- Auth: JWT tokens with bcrypt

## Development Commands

### Backend (from `/backend`)
```bash
npm run dev              # Start dev server (port 5000)
npm run build            # Compile TypeScript
npm test                 # Run all tests
npm test -- <pattern>    # Run specific test file
npm test -- --coverage   # Run with coverage
npm run db:migrate       # Apply Prisma migrations
npm run db:seed          # Seed database
npx prisma studio        # Open Prisma Studio
npx prisma migrate dev --name <name>  # Create new migration
npx prisma generate      # Regenerate Prisma client
```

### Frontend (from `/frontend`)
```bash
npm run dev              # Start dev server (port 3000)
npm run build            # Build for production
npm test                 # Run tests (Vitest)
npm test -- <pattern>    # Run specific test
npm test -- --coverage   # Run with coverage
npm run lint             # Run ESLint
```

### Full Stack Development
```bash
# Terminal 1: Start PostgreSQL
docker-compose up -d

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: Frontend
cd frontend && npm run dev
```

## Architecture

### Backend Modules (`backend/src/modules/`)
Each feature follows the pattern: `<feature>.controller.ts`, `<feature>.routes.ts`, `<feature>.validation.ts`
- **auth**: Login, register, JWT refresh tokens
- **events**: CRUD, status transitions (OPEN → CLOSED → COMPLETED/CANCELLED)
- **orders**: Order placement, menu-based or custom orders
- **restaurants**: Restaurant and menu item management
- **notifications**: Real-time (Socket.IO), push, email notifications
- **push**: Web push subscription management

### Frontend Structure (`frontend/src/`)
- **components/ui/**: Reusable shadcn-style components (Button, Card, Input, etc.)
- **components/layout/**: Header, Sidebar, Layout
- **components/features/**: Feature-specific components
- **lib/api/**: Axios client with JWT injection, React Query hooks
- **store/**: Zustand stores (auth, events, restaurants, notifications)
- **pages/**: Route components

### Multi-Tenant Data Model
- All data is isolated by `companyId`
- Company identified by unique `slug` in URLs
- Users belong to exactly one company
- Events, restaurants, orders scoped to company

## API Response Formats

**Success responses** must wrap data:
```typescript
res.json({ data: result });         // 200/201
res.status(204).send();             // DELETE
```

**Error responses** use message field:
```typescript
res.status(400).json({ message: 'Validation error' });
res.status(401).json({ message: 'Unauthorized' });
res.status(403).json({ message: 'Forbidden' });
res.status(404).json({ message: 'Not found' });
```

## Key Patterns

### Company Data Isolation (CRITICAL)
Every query MUST filter by `companyId`:
```typescript
const event = await prisma.event.findFirst({
  where: { id, companyId: req.user!.companyId }
});
```

### Test Helpers (`backend/src/test/helpers/`)
- `setupCompanyWithUsers({ employeeCount })` - Create test company with users
- `cleanupTestData(companyId)` - Clean up after tests
- `authenticatedRequest(app, token)` - Make authenticated requests

### Frontend API Hooks (`frontend/src/lib/api/hooks.ts`)
- Use `useQuery` for fetching, `useMutation` for mutations
- Hooks unwrap `{ data: ... }` wrapper automatically
- Mutations invalidate related queries

## TDD Workflow

This project follows **test-driven development**: tests define correct behavior, code is adjusted to pass tests.

1. Write comprehensive tests first (integration tests for API, component tests for UI)
2. Run tests, expect failures
3. Implement/fix code to match test expectations
4. Repeat until all tests pass
5. Document API changes in `docs/testing/API_ADJUSTMENTS_<FEATURE>.md`

## Database

Schema defined in `backend/prisma/schema.prisma`. Key models:
- **Company**: Multi-tenant root entity
- **User**: Belongs to one company, has role (ADMIN/MANAGER/USER)
- **Event**: Lunch event with status workflow
- **Order**: User order for an event (menu items or custom text)
- **Restaurant/MenuItem**: Company-scoped restaurant data
- **NotificationEvent**: In-app notification with delivery tracking

## Environment Variables

Backend `.env`:
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
```

Frontend `.env`:
```
VITE_API_URL=http://localhost:5000/api
VITE_VAPID_PUBLIC_KEY=...
```
