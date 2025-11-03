# LunchSync AI Agent Instructions

## ⚠️ CRITICAL: Read Before Starting ANY Task

### Primary Rule
- Practice strict TDD: write or update a failing test before touching implementation.
- Investigate every red test—decide whether expectations changed (update the spec intentionally) or the code regressed (fix it) before proceeding.
- Do not deliver work with failing suites (`npm test`, `npm run test:coverage`, end-to-end scripts) still red.

**STEP 1**: Always read `INSTRUCTIONS.md` first - this is your source of truth  
**STEP 2**: Check relevant docs in `docs/testing/` for context on what's already done  
**STEP 3**: Update documentation after completing your task  
**STEP 4**: Archive completed work to keep docs current  

### Mandatory Pre-Task Checklist
```bash
# 1. Read the main instructions
cat INSTRUCTIONS.md | grep -A 20 "your-task-area"

# 2. Check what's been done
cat docs/testing/PROGRESS.md

# 3. Read related API adjustments
ls docs/testing/API_ADJUSTMENTS_*.md  # Review relevant ones

# 4. Verify current test status
npm test  # Backend
cd frontend && npm test  # Frontend
```

**Never start coding without understanding existing patterns first.**

## Project Context
Multi-tenant lunch ordering SaaS with Node/Express API + React/Vite SPA. **Test-Driven Development (TDD) is mandatory**: tests define correct behavior, code adjusts to match tests.

## Critical Architecture Patterns

### Multi-Tenancy (Strict Isolation)
**Every database query MUST filter by `companyId`**:
```typescript
// ✅ CORRECT - Company isolation enforced
const events = await prisma.event.findMany({
  where: { companyId: req.user.companyId }
});

// ❌ WRONG - Data leakage risk
const events = await prisma.event.findMany();
```
- Auth middleware attaches `req.user` with `companyId`
- Tenant middleware verifies auth (see `backend/src/middleware/tenant.ts`)
- Seed data and test fixtures both enforce company boundaries

### Response Format Convention
**All API endpoints return data wrapped in `{ data: ... }`**:
```typescript
// Backend response
res.json({ data: { user, token } });

// Frontend consumption
const { token, user } = response.data.data; // Double unwrap
```
When adding/modifying endpoints, maintain this pattern. Frontend hooks in `frontend/src/lib/api/hooks.ts` expect this structure.

### Validation Strategy
- **Backend**: Zod schemas in `backend/src/modules/*/*.validation.ts` (e.g., `createEventSchema`)
- **Frontend**: Mirror backend schemas in `frontend/src/lib/validation/schemas.ts`
- **Middleware**: `validate()` in `backend/src/middleware/validation.ts` applies Zod schemas to routes
- When changing request/response shapes, update both backend validation and frontend schemas

## Essential Workflows

### Test-Driven Development (Non-Negotiable)

**ALWAYS follow this exact sequence - no exceptions:**

```bash
# STEP 1: Read existing instructions and understand the pattern
cat INSTRUCTIONS.md  # Find the section relevant to your task
cat docs/testing/TESTING_IMPROVEMENT_PLAN.md  # Understand testing strategy

# STEP 2: Check what's already implemented
cat docs/testing/PROGRESS.md  # See completed phases
npm test  # See current test status

# STEP 3: Write integration tests FIRST (backend/src/__tests__/integration/)
# - Follow existing test patterns in the __tests__ directory
# - Use setupCompanyWithUsers() from test helpers
# - Test real user flows, not implementation details

# STEP 4: Run tests to see what's missing/broken
npm test -- <feature>.integration.test.ts

# STEP 5: Adjust API to match test expectations (NOT vice versa)
# - Fix response formats to match { data: ... } wrapper
# - Update validation schemas
# - Enforce companyId filtering
# - Update controllers, routes

# STEP 6: Verify all tests pass
npm test -- <feature>.integration.test.ts

# STEP 7: Document API changes
# Create: docs/testing/API_ADJUSTMENTS_<FEATURE>.md
# Include: before/after code, rationale, files changed

# STEP 8: Check frontend compatibility
cd frontend
# - Update types in src/types/
# - Update validation schemas in src/lib/validation/schemas.ts
# - Update API hooks in src/lib/api/hooks.ts
# - Test affected components
npm test

# STEP 9: Update progress tracking
# Edit: docs/testing/PROGRESS.md
# - Mark your phase as complete
# - Add test counts and coverage
# - Link to your API_ADJUSTMENTS doc

# STEP 10: Archive old docs if task is fully complete
# Move completed phase reports to: docs/development/completed-phases/
# Move outdated summaries to: docs/archive/
```

**Golden Rule**: Tests are the specification. Never modify tests to match code - modify code to match tests.

### Database Changes
```bash
# After modifying backend/prisma/schema.prisma
npx prisma format
npx prisma migrate dev --name descriptive_name
npm run db:seed  # Verify seed still works
```
- Keep `prisma/seed.ts` aligned with test fixtures in `backend/src/test/factories/`
- PostgreSQL runs on port 5434 (not default 5432) via `docker-compose up -d`

### Running Services
```bash
# Backend: http://localhost:5000
cd backend && npm run dev

# Frontend: http://localhost:3000  
cd frontend && npm run dev

# Full test suite
./run-tests.sh              # API smoke tests
./security-tests.sh         # Auth/security verification
npm test                    # Unit + integration (backend)
cd frontend && npm test     # Frontend (Vitest + RTL)
```

## Code Patterns & Conventions

### Route Ordering (Critical Bug Prevention)
**Specific routes MUST come before dynamic params**:
```typescript
// ✅ CORRECT - Specific routes first
router.get('/stats', getStats);       // /api/users/stats
router.get('/company', getCompany);   // /api/users/company
router.get('/:id', getUser);          // /api/users/:id

// ❌ WRONG - /:id matches /stats before it's reached
router.get('/:id', getUser);
router.get('/stats', getStats);  // Never reached!
```
See `docs/testing/BUG_FIX_USER_STATS_ROUTE.md` for detailed example.

### Authentication Flow
- **Login/Register**: Returns `{ data: { token, user } }` (no company object)
- **Token Storage**: Frontend stores in `localStorage`, injected via axios interceptor (`frontend/src/lib/api/client.ts`)
- **401 Handling**: Interceptor auto-redirects to `/login` on auth failure
- **Auth State**: Managed in `frontend/src/store/authStore.ts` (Zustand)

### Testing Helpers
**Backend** (`backend/src/test/helpers/`):
- `setupCompanyWithUsers({ employeeCount: 2 })` - Creates isolated test company with users
- `authenticatedRequest(app, token)` - Supertest wrapper with auth header
- `cleanupTestData(companyId)` - Teardown to prevent test pollution

**Frontend** (`frontend/src/test/`):
- `createMockUser()`, `createMockEvent()`, etc. - Factory functions in `utils/factories.ts`
- MSW handlers in `mocks/handlers.ts` - Mock API responses
- `renderWithProviders()` - Wraps components with React Query + Router

### Module Structure (Feature-Based)
```
backend/src/modules/<feature>/
├── <feature>.routes.ts      # Express router, middleware chain
├── <feature>.controller.ts  # Request handlers, business logic
├── <feature>.validation.ts  # Zod schemas for request validation
└── __tests__/              # Optional unit tests (integration preferred)
```

## Common Pitfalls

1. **Starting without reading docs** → Duplicating work or missing context
2. **Forgetting to check `PROGRESS.md`** → Not knowing what's already done
3. **Forgetting `companyId` filters** → Data leakage between tenants
4. **Adjusting tests to match code** → Violates TDD workflow (tests are spec)
5. **Route order mistakes** → Dynamic params shadow specific routes
6. **Missing `{ data: ... }` wrapper** → Frontend hooks fail to unwrap
7. **Zod schema drift** → Backend/frontend validation out of sync
8. **Not updating documentation** → Next agent (or you) wastes time
9. **Not archiving completed work** → Documentation becomes cluttered and confusing
10. **Hard-coding test data** → Use factories/fixtures for maintainability

## When You're Unsure

**ALWAYS check instructions first, never guess:**

```bash
# Question: "How should I structure this test?"
cat INSTRUCTIONS.md | grep -A 30 "Test Structure"

# Question: "What's the validation pattern?"
cat INSTRUCTIONS.md | grep -A 20 "Validation"

# Question: "Has someone already worked on this?"
cat docs/testing/PROGRESS.md
ls docs/testing/API_ADJUSTMENTS_*.md

# Question: "What's the current coverage?"
npm test -- --coverage

# Question: "What testing patterns exist?"
ls backend/src/__tests__/integration/
cat backend/src/__tests__/integration/auth.integration.test.ts

# Question: "What's the frontend structure?"
cat docs/development/FRONTEND_PLAN.md
```

**If instructions don't cover your case, document your decision and rationale.**

## Key Files Reference

| Purpose | Location |
|---------|----------|
| Development workflow | `INSTRUCTIONS.md` |
| Testing strategy | `docs/testing/TESTING_IMPROVEMENT_PLAN.md` |
| API change examples | `docs/testing/API_ADJUSTMENTS_*.md` |
| Progress tracking | `docs/testing/PROGRESS.md` |
| Database schema | `backend/prisma/schema.prisma` |
| Frontend plan | `docs/development/FRONTEND_PLAN.md` |
| Test factories | `backend/src/test/factories/`, `frontend/src/test/utils/factories.ts` |

## Before Committing

**Mandatory completion checklist - verify ALL items:**

```bash
# Tests
npm test                    # Backend: All tests must pass
cd frontend && npm test     # Frontend: All tests must pass
./run-tests.sh             # API smoke tests
./verify-security.sh       # Security checks (if auth changed)

# Documentation (CRITICAL - always update)
# 1. Did you create/update API_ADJUSTMENTS_<FEATURE>.md?
ls docs/testing/API_ADJUSTMENTS_*.md

# 2. Did you update PROGRESS.md?
git diff docs/testing/PROGRESS.md

# 3. Did you archive completed work?
# Move to: docs/development/completed-phases/ or docs/archive/

# 4. Are docs synced with code changes?
# - Backend Zod schemas match frontend validation?
# - Types updated in frontend/src/types/?
# - Component props reflect API changes?

# Database
# 5. Did you create migrations if schema changed?
ls backend/prisma/migrations/

# 6. Does seed data still work?
npm run db:seed
```

**If you can't check ALL boxes above, your task is NOT complete.**

## Documentation Lifecycle & Archive Strategy

### Active Documentation (Keep Current)
Located in `docs/testing/` and root:
- `INSTRUCTIONS.md` - Master workflow guide
- `docs/testing/PROGRESS.md` - Current status tracker
- `docs/testing/API_ADJUSTMENTS_<FEATURE>.md` - Recent API changes
- `docs/testing/TESTING_IMPROVEMENT_PLAN.md` - Testing strategy
- `docs/development/FRONTEND_PLAN.md` - Frontend roadmap

### When to Archive

**After completing a testing phase:**
```bash
# Move phase completion report
mv docs/testing/PHASE_X.X_COMPLETE.md docs/development/completed-phases/

# Update PROGRESS.md to remove completed phase details
# Keep only: phase name, test count, link to archived report
```

**When documentation becomes outdated:**
```bash
# Move to archive with clear naming
mv docs/old-summary.md docs/archive/YYYY-MM-DD_old-summary.md

# Update docs/README.md to remove dead links
```

**Signs documentation should be archived:**
- Contains outdated API contracts that have been superseded
- Describes problems that have been fully resolved
- References code that no longer exists
- Has been superseded by newer, more comprehensive docs

### Documentation Update Protocol

**After EVERY task, update docs in this order:**

1. **Create or update `API_ADJUSTMENTS_<FEATURE>.md`** (if API changed):
   ```markdown
   # API Adjustments - <Feature Name>
   
   ## Summary
   Brief description of what changed and why
   
   ## Changes Made
   ### Endpoint: POST /api/feature
   **Before:**
   ```typescript
   // old code
   ```
   
   **After:**
   ```typescript
   // new code
   ```
   
   **Rationale:** Explain why this changed
   
   ## Files Modified
   - backend/src/modules/feature/feature.controller.ts
   - backend/src/modules/feature/feature.validation.ts
   
   ## Frontend Impact
   - Updated hooks in src/lib/api/hooks.ts
   - Updated types in src/types/
   ```

2. **Update `docs/testing/PROGRESS.md`**:
   - Mark phase as complete
   - Add test statistics
   - Link to API_ADJUSTMENTS doc
   - Note any blockers or next steps

3. **Archive completed work**:
   - Move PHASE_X_COMPLETE.md to `docs/development/completed-phases/`
   - Move outdated summaries to `docs/archive/`
   - Update `docs/README.md` to reflect new structure

4. **Update `docs/README.md`** if needed:
   - Add links to new documentation
   - Remove links to archived docs
   - Update status sections

**Never leave documentation out of sync with code.**
