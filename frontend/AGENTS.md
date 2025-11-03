# Frontend Agent Briefing

## Scope & Responsibilities
- Deliver the LunchSync SPA (React 18 + TypeScript) located in `frontend/`
- Keep UI, client-side validation, and API consumption aligned with backend contracts
- Uphold accessibility, responsiveness, and UX patterns defined by existing components

## Environment Checklist
- Node.js 20+
- `.env` file containing `VITE_API_URL` (default `http://localhost:5000/api`)
- Run `npm install` before starting work; dev server runs on `http://localhost:3000`

## Code Map
- `src/components/ui/` → shared shadcn-style primitives
- `src/components/layout/` → navigation, header, layout shell
- `src/components/features/` → dialogs and workflows for events, orders, restaurants
- `src/pages/` → route-level feature screens
- `src/store/` → Zustand stores (auth, events, restaurants, notifications)
- `src/lib/api/` → Axios client and TanStack Query hooks
- `src/lib/validation/` → Zod schemas shared across forms and API responses
- `src/test/` → Vitest + Testing Library + MSW utilities

## Everyday Commands
- Dev server: `npm run dev`
- Type check + build: `npm run build`
- Preview production build: `npm run preview`
- Linting: `npm run lint`
- Tests: `npm test` (watch mode) or `npm run test:coverage`

## Implementation Guidelines
- Use hooks in `src/lib/api/hooks.ts` for data fetching; extend them when new endpoints appear
- Mirror backend validation by updating Zod schemas in `src/lib/validation/schemas.ts`
- Store auth state exclusively in `authStore.ts`; tokens are injected via Axios interceptors (`lib/api/client.ts`)
- Reuse UI primitives; add new variants in the same directory rather than inline styling
- Maintain accessibility helpers (`frontend/src/components/accessibility/` and `frontend/src/hooks/useAccessibility.ts`)
- Observe routing patterns in `App.tsx` and nested layouts in `components/layout/`

## Testing Expectations
- Add/modify tests under `src/test/` whenever you ship new UI flows or API hooks
- Prefer MSW handlers (`src/test/mocks/handlers.ts`) for network scenarios
- Use factory helpers in `src/test/utils/factories.ts` for consistent fixtures
- Keep the phase verification suites (`src/test/phase0-verification.test.ts`) green as a regression guard

### Primary Rule
- Practice strict TDD: write the failing Vitest spec before implementing or changing UI logic.
- Investigate any failing test—determine whether expectations changed (update the spec) or the implementation regressed (fix the code).
- Do not merge unless `npm test` (with `--pool=vmThreads` where needed) and `npm run test:coverage` both succeed.

## Coordination Notes
- Sync API type changes with backend Zod schemas and `docs/testing/API_ADJUSTMENTS_*.md`
- Update `docs/development/FRONTEND_PLAN.md` when milestones shift
- Communicate breaking UI changes (navigation, routes) in pull request descriptions and documentation

## Launch Checklist
- Lint + test locally
- Verify unhappy paths (auth failures, empty states, validation errors)
- Confirm responsive layouts for key routes (Dashboard, Events, Restaurants)
- Update documentation links or screenshots when UI changes materially
