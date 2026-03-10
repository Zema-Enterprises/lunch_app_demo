# Project Coding Instructions
> Auto-generated from Enterprise AI Coding Guardrail Framework
> Project: LunchSync  |  Stack: React 18 + Vite (CSR) / Express + Prisma + PostgreSQL / TypeScript  |  Generated: 2026-02-27

## About This File
This file defines concrete, enforceable coding rules for every AI agent working on LunchSync. It maps the Enterprise AI Coding Guardrail Framework to this project's exact stack, file paths, and conventions. Last updated 2026-02-27.

## Project Overview
LunchSync is a multi-tenant SaaS for coordinating corporate lunch orders. It is a two-package TypeScript monorepo (no workspace manager — separate `npm` projects in `/backend` and `/frontend`). The backend is Express 4 with Prisma ORM on PostgreSQL 15, Socket.IO + Redis for real-time, and JWT access/refresh token auth. The frontend is a Vite-built React 18 SPA (CSR only, no SSR) using Tailwind CSS, shadcn/ui-style components, Zustand for client state, and TanStack Query for server state. Multi-tenancy is enforced at the DB level via `companyId` on every query.

## Quick-Reference Rules (Top 10 Non-Negotiable)

1. **Every database query MUST filter by `companyId`** — omitting this leaks data across tenants.
2. **Never hardcode secrets** — all credentials come from `backend/src/config/env.ts` via `process.env`; never write literal keys, tokens, or passwords in source.
3. **Validate all user input with Zod** — backend uses `validate()` middleware from `backend/src/middleware/validation.ts`; frontend uses `zod` + `react-hook-form` resolvers. Never trust raw `req.body`.
4. **Use `async/await` for all I/O** — no synchronous DB calls, file reads, or HTTP requests. Every async function must have `try/catch` or propagate errors to the Express error handler.
5. **API responses use `{ data: ... }` envelope** — success: `res.json({ data: { ... } })`, error: `res.status(4xx).json({ message: '...' })`. Frontend double-unwraps: `response.data.data`.
6. **Specific routes before dynamic params** — `/stats` must be registered before `/:id` in Express routers, or the parameterized route swallows it.
7. **Use the project's logger** — import `{ logger }` from `backend/src/utils/logger.ts`. Never use raw `console.log` in backend production code.
8. **Use shadcn/ui components** — interactive UI must use components from `frontend/src/components/ui/`, not raw `<button>`, `<input>`, `<select>`.
9. **Use Tailwind classes and design tokens** — no inline `style=` with hardcoded hex values. Use `cn()` from `@/lib/utils` for class merging.
10. **Every new function/endpoint must have a test** — backend: Jest + Supertest in `backend/src/__tests__/`; frontend: Vitest + RTL in `frontend/src/test/`.

---

## Domain Rules

### 1. Architecture & Modularity
#### Applies? CRITICAL

**Module structure:**

```
backend/src/
  modules/<feature>/
    <feature>.routes.ts       # Express router definition
    <feature>.controller.ts   # Request handlers (thin — delegates to services/Prisma)
    <feature>.validation.ts   # Zod schemas for request validation
  middleware/                  # Cross-cutting: auth, validation, error, tenant
  config/                     # env.ts, database.ts
  realtime/                   # Socket.IO gateway, dispatcher, registry
  scheduler/                  # Background jobs (deadline-checker)
  telemetry/                  # Honeycomb exporter, notification metrics
  utils/                      # logger, jwt, bcrypt, sanitize, password
  test/helpers/               # Test factories and utilities

frontend/src/
  components/ui/              # shadcn/ui primitives (Button, Input, Dialog, etc.)
  components/layout/          # App shell, navigation
  components/events/          # Event-specific feature components
  components/notifications/   # Notification feature components
  components/features/        # Other feature components (CreateEventDialog, etc.)
  components/error/           # ErrorBoundary
  pages/                      # Route-level pages (lazy-loaded via React.lazy)
  store/                      # Zustand stores (authStore, eventStore, etc.)
  lib/api/                    # Axios client (client.ts) + TanStack Query hooks (hooks.ts)
  lib/realtime/               # Socket.IO client
  lib/push/                   # Push notification manager
  lib/validation/             # Zod schemas (mirror backend schemas)
  types/                      # TypeScript type definitions
  theme/                      # ThemeProvider for dynamic company theming
  test/                       # Test setup, mocks (MSW handlers), factories
```

**Layer rules:**
- Controllers (`*.controller.ts`) may import Prisma, utils, and middleware types. They must NOT import from other modules' controllers.
- Routes (`*.routes.ts`) only wire middleware and call controller functions. No business logic in route files.
- Frontend `pages/` import from `components/`, `store/`, and `lib/`. Pages must NOT import directly from `backend/`.
- `frontend/src/lib/api/hooks.ts` is the single location for all TanStack Query hooks. Do not create query hooks elsewhere.
- `frontend/src/store/` is for Zustand stores only. Do not mix TanStack Query logic into stores.

**Forbidden cross-layer patterns:**
```typescript
// WRONG — SQL/Prisma in a route file
router.get('/events', async (req, res) => {
  const events = await prisma.event.findMany(); // NO — belongs in controller
});

// WRONG — Direct fetch() in a React component
const Component = () => {
  const data = await fetch('/api/events'); // NO — use hooks from @/lib/api/hooks
};

// WRONG — Frontend importing backend code
import { env } from '../../backend/src/config/env'; // NEVER
```

**Import conventions:**
- Frontend: always use `@/` path alias (e.g., `import { Button } from '@/components/ui/button'`)
- Backend: relative imports (e.g., `import prisma from '../../config/database'`)

---

### 2. Security & Privacy
#### Applies? CRITICAL

**Input validation:**
- Backend: every route that accepts user input MUST use the `validate()` middleware from `backend/src/middleware/validation.ts`.
- Validation schemas live in `backend/src/modules/<feature>/<feature>.validation.ts` as Zod objects that validate `{ body, query, params }`.
- Frontend: forms use `zod` schemas from `frontend/src/lib/validation/schemas.ts` with `@hookform/resolvers/zod`.

```typescript
// CORRECT — backend route with validation
import { validate } from '../../middleware/validation';
import { createEventSchema } from './events.validation';
router.post('/', authMiddleware, validate(createEventSchema), createEvent);

// WRONG — no validation
router.post('/', authMiddleware, createEvent); // Missing validate()
```

**Forbidden patterns:**
```typescript
// NEVER — string interpolation in Prisma queries
const events = await prisma.$queryRaw(`SELECT * FROM events WHERE id = '${req.params.id}'`);

// NEVER — eval or dynamic code execution
eval(req.body.code);

// NEVER — unvalidated redirect
res.redirect(req.query.returnUrl as string);
```

**Secrets management:**
- All secrets are loaded via `backend/src/config/env.ts` which reads `process.env` with validation.
- `.env` files are gitignored. Reference `.env.example` for required variables.
- JWT_SECRET must be >= 32 characters (enforced at startup in `env.ts`).
- Never write literal API keys, passwords, or tokens in source files.

**Authentication:**
- JWT middleware: `backend/src/middleware/auth.ts` → `authMiddleware`
- Admin guard: `backend/src/middleware/auth.ts` → `adminMiddleware`
- All routes except `/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/logout`, `/health`, and `/invites/:token/accept` require `authMiddleware`.
- Auth request type: `AuthRequest` (extends Express `Request` with `user?: JWTPayload`).
- Access tokens are short-lived (15m), stored in-memory. Refresh tokens are httpOnly cookies, SHA-512 hashed in DB.

**Multi-tenancy (CRITICAL):**
```typescript
// CORRECT — always filter by companyId
const events = await prisma.event.findMany({
  where: { companyId: req.user!.companyId }
});

// WRONG — data leakage across tenants
const events = await prisma.event.findMany();
const event = await prisma.event.findUnique({ where: { id: eventId } }); // Missing companyId!
```

**Data minimization:**
- Never log full request bodies (may contain passwords, tokens).
- Never log `req.headers.authorization` or refresh tokens.
- Passwords are hashed with bcryptjs (10 rounds) via `backend/src/utils/bcrypt.ts`.
- Input sanitization: `backend/src/utils/sanitize.ts` strips HTML/script tags. Use it for any user-supplied text stored in the DB.

**Security middleware already in place:**
- `helmet` with CSP headers (`backend/src/app.ts`)
- `express-rate-limit`: 1000 req/15min general, 5 req/15min on auth endpoints
- CORS restricted to explicit origins

---

### 3. Performance & Scalability
#### Applies? HIGH

**Async patterns:**
- All I/O (Prisma queries, HTTP calls, file ops) MUST use `async/await`.
- Never use synchronous variants (`fs.readFileSync`, synchronous XHR).
- Frontend: all API calls go through `apiClient` (Axios) which is inherently async.

**Frontend performance:**
- Route-level code splitting is already implemented via `React.lazy()` in `frontend/src/App.tsx`. New pages MUST be lazy-loaded.
```typescript
// CORRECT — lazy-loaded page
const NewPage = lazy(() => import('./pages/NewPage'));

// WRONG — static import for a page
import NewPage from './pages/NewPage';
```
- Images: use responsive `srcSet` where possible. Serve WebP when available.
- The frontend is a PWA with service worker (`vite-plugin-pwa` with `injectManifest`). Be careful with caching strategies.

**Backend performance:**
- Prisma queries: always `select` only needed fields or use `include` judiciously. Avoid loading entire relation trees.
- N+1 prevention: use `include` or `select` with nested relations instead of loops with individual queries.
- Redis is used for Socket.IO adapter only — not as a general cache layer.

```typescript
// WRONG — N+1 query pattern
const events = await prisma.event.findMany({ where: { companyId } });
for (const event of events) {
  event.orders = await prisma.order.findMany({ where: { eventId: event.id } }); // N+1!
}

// CORRECT
const events = await prisma.event.findMany({
  where: { companyId },
  include: { orders: true },
});
```

---

### 4. Accessibility
#### Applies? HIGH

**Component rules:**
- Use `Button` from `@/components/ui/button` — never raw `<button>` for interactive elements.
- Use `Input` from `@/components/ui/input` — never raw `<input>`.
- Use `Dialog` from `@/components/ui/dialog` — never raw modal patterns.
- All interactive elements must be keyboard-accessible (focusable, operable via Enter/Space).

**Forms:**
- Every `<Input>` / `<select>` / `<Textarea>` MUST have an associated `<Label>` with matching `htmlFor`/`id`.
- Use `react-hook-form` with Zod resolver for form validation and error display.
- Error messages must be associated with their field via `aria-describedby` or be visually adjacent.

**Images:**
- All `<img>` tags MUST have meaningful `alt` text (or `alt=""` for decorative images).
- Set explicit `width` and `height` to prevent layout shifts.

**Testing:**
- Frontend has `jest-axe` and `axe-core` available. New component tests should include accessibility checks:
```typescript
import { axe } from 'jest-axe';
const { container } = render(<MyComponent />);
expect(await axe(container)).toHaveNoViolations();
```

---

### 5. State Management & Data Integrity
#### Applies? HIGH

**Frontend state architecture:**

| State type | Tool | Location |
|-----------|------|----------|
| Auth (user, token) | Zustand | `frontend/src/store/authStore.ts` |
| UI state (filters, selections) | Zustand | `frontend/src/store/eventStore.ts`, etc. |
| Server data (events, orders, restaurants) | TanStack Query | `frontend/src/lib/api/hooks.ts` |
| Real-time connection status | Zustand | `frontend/src/store/notificationsRealtimeStore.ts` |
| Toast notifications | Zustand | `frontend/src/store/notificationStore.ts` |

**Rules:**
- Server data MUST use TanStack Query hooks, never fetched into Zustand stores.
- Zustand stores are for client-only state (auth session, UI selections, toasts).
- Never duplicate server state in Zustand — use `queryClient.getQueryData()` if you need to read cached query data outside a component.
- TanStack Query is configured with `refetchOnWindowFocus: false` and `retry: 1`.

```typescript
// WRONG — fetching server data into Zustand
const useEventStore = create((set) => ({
  events: [],
  fetchEvents: async () => {
    const res = await apiClient.get('/events');
    set({ events: res.data.data }); // NO — use TanStack Query
  },
}));

// CORRECT — TanStack Query hook in hooks.ts
export function useEvents(companySlug: string) {
  return useQuery({
    queryKey: ['events', companySlug],
    queryFn: () => apiClient.get(`/companies/${companySlug}/events`).then(r => r.data.data),
  });
}
```

**Backend data integrity:**
- Prisma schema is the single source of truth: `backend/prisma/schema.prisma`.
- ID strategy: `cuid()` — never use auto-increment or UUID unless the schema already does.
- Schema migrations: never edit existing migration files. Always create new migrations with `npx prisma migrate dev --name <name>`.
- Zod schemas in `*.validation.ts` files are the data contracts for API boundaries.

---

### 6. Observability & Reliability
#### Applies? HIGH

**Logging:**
- Import: `import { logger } from '../utils/logger'` (backend)
- Methods: `logger.info(message)`, `logger.error(message)`, `logger.warn(message)`
- Forbidden in backend production code: raw `console.log()`, `console.error()`, `console.warn()`
- Never log: passwords, JWT tokens, refresh tokens, full `req.headers.authorization`, user PII beyond userId

```typescript
// CORRECT
logger.info('Event created', { eventId: event.id, companyId });

// WRONG
console.log('Event created', event); // Raw console + may log sensitive fields
logger.info('Login attempt', { email, password }); // NEVER log passwords
```

**Error handling:**
- Global error handler: `backend/src/middleware/error.ts` — catches ZodError, JWT errors, and generic errors.
- Every controller function must either use try/catch or let errors propagate to the global handler.
- Error response format: `{ error: '...', message?: '...' }` for 4xx/5xx, `{ message: '...', errors?: [...] }` for validation.
- Never return stack traces in production (the error handler conditionally includes `err.message` only in development).

```typescript
// CORRECT — controller with error handling
export const createEvent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const event = await prisma.event.create({ ... });
    res.status(201).json({ data: event });
  } catch (error) {
    next(error); // Delegates to global error handler
  }
};

// WRONG — silently swallowed error
export const createEvent = async (req: AuthRequest, res: Response) => {
  try {
    const event = await prisma.event.create({ ... });
    res.json({ data: event });
  } catch (error) {
    // Empty catch — error disappears silently
  }
};
```

**Health endpoint:**
- `GET /health` returns `{ status: 'ok', timestamp: <ISO string> }` — defined in `backend/src/app.ts`.
- Used by Docker healthcheck and Render.com deployment.

**Frontend error boundary:**
- `frontend/src/components/error/ErrorBoundary.tsx` catches render errors. Ensure new page-level components are wrapped.

---

### 7. Design System Governance
#### Applies? HIGH

**Component library:**
- Official: shadcn/ui-style components in `frontend/src/components/ui/`
- Available: `Button`, `Input`, `Textarea`, `Select`, `Dialog`, `Card`, `Badge`, `Skeleton`, `Toast`, `EmptyState`, `ConfirmDialog`
- Icons: `lucide-react` — import individual icons (e.g., `import { Plus } from 'lucide-react'`)

**Forbidden raw HTML for interactive elements:**
- No raw `<button>` — use `<Button>` from `@/components/ui/button`
- No raw `<input>` — use `<Input>` from `@/components/ui/input`
- No raw `<select>` — use `<Select>` from `@/components/ui/select`
- No raw `<dialog>` — use `<Dialog>` from `@/components/ui/dialog`

**Styling rules:**
- Class merging: always use `cn()` from `@/lib/utils` (combines `clsx` + `tailwind-merge`)
- Tailwind classes only — no inline `style={{ }}` with hardcoded values
- Design tokens in `frontend/src/index.css`: `--radius`, `--ls-primary`, `--ls-secondary`, `--ls-background`
- Dynamic company theming via `ThemeProvider` in `frontend/src/theme/ThemeProvider.tsx`

```typescript
// CORRECT
<Button variant="destructive" size="sm" className={cn('mt-2', isActive && 'ring-2')}>

// WRONG — raw element with inline styles
<button style={{ backgroundColor: '#ef4444', padding: '8px 12px' }}>
```

**Adding new UI components:**
- If a needed component doesn't exist in `components/ui/`, create it following the shadcn/ui pattern: `forwardRef`, variant system, `cn()` for class merging.
- Never install a separate component library (no Material UI, Ant Design, etc.).

---

### 8. Change Safety & Refactoring
#### Applies? HIGH

**Testing requirements:**
- Backend: Jest 30 + Supertest. Tests in `backend/src/__tests__/` and `backend/src/modules/*/__tests__/`.
- Frontend: Vitest 3 + React Testing Library + MSW. Tests in `frontend/src/test/`.
- Coverage thresholds: Backend (branches: 70%, functions: 75%, lines: 80%), Frontend (branches: 70%, functions: 75%, lines: 82%).

**Test commands:**
```bash
cd backend && npm test                    # Backend tests
cd frontend && npm test                   # Frontend tests
cd backend && npm test -- --coverage      # Backend with coverage
cd frontend && npm run test:coverage      # Frontend with coverage
```

**Test helpers:**
- Backend: `setupCompanyWithUsers()`, `cleanupTestData()` from `backend/src/test/helpers/`
- Frontend: `createMockUser()`, `createMockEvent()` factories; MSW handlers in `frontend/src/test/mocks/handlers.ts`

**Commit discipline:**
- Format: `[prefix]: [description]` (e.g., `fix: fixed save button functionality`)
- Prefixes: `fix`, `feat`, `upd`, `refactor`, `test`, `docs`
- Keep messages concise — one line, no multi-line descriptions.
- Branch naming: `Smbat/[prefix]/[description]` (e.g., `Smbat/fix/submit-btn-not-working`)

**Before submitting any change:**
```bash
cd frontend && npm run lint    # Zero warnings enforced
cd frontend && npm run build   # Verify build succeeds
cd backend && npm run build    # Verify backend compiles
cd frontend && npm test        # Frontend tests pass
cd backend && npm test         # Backend tests pass
```

**High-risk files (extra care required):**
- `backend/src/middleware/auth.ts` — auth boundary, affects all protected routes
- `backend/src/middleware/tenant.ts` and `backend/src/middleware/company.ts` — tenant isolation
- `backend/prisma/schema.prisma` — DB schema, affects all modules
- `backend/src/config/env.ts` — environment config, affects startup
- `frontend/src/lib/api/client.ts` — Axios interceptors, token refresh logic
- `frontend/src/store/authStore.ts` — auth state, affects entire app

---

### 9. Cognitive Load & Developer Ergonomics
#### Applies? QUALITY

**Naming conventions:**
- Variables/functions: `camelCase` (TypeScript convention throughout)
- React components: `PascalCase` (files and exports)
- File naming: `camelCase.ts` for backend, `PascalCase.tsx` for React components, `kebab-case.ts` for utilities
- Constants: `UPPER_SNAKE_CASE` for environment keys and Socket.IO event names (e.g., `NOTIFICATION_CREATED_EVENT`)
- API endpoints: REST with plural nouns (`/events`, `/orders`, `/restaurants`)
- Prisma models: `PascalCase` singular (`Event`, `Order`, `User`)
- Zod schemas: `camelCase` + `Schema` suffix (e.g., `createEventSchema`)

**Code style:**
- Max function length: use judgment, but prefer extracting helpers if a function exceeds ~50 lines.
- Prefer early returns over deep nesting.
- Forbidden: nested ternaries beyond 1 level.
- Use `async/await` over `.then()` chains.

```typescript
// CORRECT — early return
if (!req.user) {
  return res.status(401).json({ error: 'Not authenticated' });
}
const events = await prisma.event.findMany({ ... });

// WRONG — deeply nested
if (req.user) {
  if (req.user.companyId) {
    const events = await prisma.event.findMany({ ... });
    if (events.length > 0) {
      // ...three more levels deep
    }
  }
}
```

**Documentation:**
- Comments explain *why*, not *what*. Don't add `// Create event` above `prisma.event.create()`.
- Add comments for non-obvious business rules, workarounds, and multi-tenancy checks.
- Don't add JSDoc to every function — only complex public APIs.

---

## Enforcement Reference

### What is already automated

| Tool | Config location | Guardrail rules covered |
|------|----------------|------------------------|
| TypeScript strict mode | `backend/tsconfig.json`, `frontend/tsconfig.json` | Type safety, null checks |
| `noUnusedLocals`, `noUnusedParameters` | `frontend/tsconfig.json` | Dead code prevention |
| ESLint `--max-warnings 0` | `frontend/package.json` script | Zero tolerance for lint warnings |
| Zod validation middleware | `backend/src/middleware/validation.ts` | Input validation at route level |
| Helmet CSP | `backend/src/app.ts` | Security headers |
| express-rate-limit | `backend/src/app.ts` | Brute-force protection |
| JWT secret length check | `backend/src/config/env.ts` | Secret strength |
| Jest/Vitest coverage thresholds | `backend/jest.config.js`, `frontend/vitest.config.ts` | Minimum test coverage |
| jest-axe | `frontend/package.json` | Accessibility testing |

### What requires human review
- Multi-tenancy: every Prisma query must include `companyId` — no automated lint rule exists for this.
- PII logging: context-dependent, cannot be fully automated.
- Route ordering: specific-before-dynamic — must be visually verified.
- Architecture layer violations: no ArchUnit equivalent configured.
- Error response format consistency (`{ data }` vs `{ message }` vs `{ error }`).
- Correct use of shadcn/ui components vs. raw HTML elements.

### Commands cheat sheet
```bash
# Frontend
cd frontend && npm run lint          # Lint (strict, 0 warnings)
cd frontend && npm run build         # Build
cd frontend && npm test              # Tests
cd frontend && npm run test:coverage # Tests + coverage

# Backend
cd backend && npm run build          # Compile TypeScript
cd backend && npm test               # Tests
cd backend && npm test -- --coverage # Tests + coverage

# Database
cd backend && npx prisma migrate dev --name <name>  # New migration
cd backend && npm run db:seed                        # Seed data
cd backend && npx prisma studio                      # DB GUI

# Full suite
./run-tests.sh
```

---

## AI Agent Checklist

Before submitting any generated code, verify:

- [ ] Code placed in the correct module/layer directory
- [ ] Every Prisma query filters by `companyId` (multi-tenancy)
- [ ] No hardcoded secrets or credentials
- [ ] All user inputs validated with Zod via `validate()` middleware (backend) or `zodResolver` (frontend)
- [ ] `async/await` used for all I/O — no blocking calls
- [ ] `logger.info/error/warn` used — no raw `console.log` in backend
- [ ] Error handling: try/catch in controllers, errors passed to `next()` or returned as `{ message }` / `{ error }`
- [ ] API responses follow `{ data: ... }` envelope format
- [ ] Specific routes registered before parameterized routes (`/:id`)
- [ ] Unit/integration test added for new functionality
- [ ] Frontend uses `<Button>`, `<Input>`, `<Dialog>` from `@/components/ui/` — no raw HTML
- [ ] No hardcoded CSS values — Tailwind classes + `cn()` utility
- [ ] Server data fetched via TanStack Query hooks in `@/lib/api/hooks.ts`, not in Zustand
- [ ] Frontend imports use `@/` path alias
- [ ] Lint and type-check pass: `npm run lint`, `npm run build`
