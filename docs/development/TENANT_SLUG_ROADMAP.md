# Tenant Slug Routing & Asset Partitioning

Last updated: 2025-12-01  
Goal: adopt company slug across routing, invites, and asset paths to improve tenant isolation, UX, and caching.

## Status (2025-12-01)
- Backend slug routing added for theme (`/api/c/:slug/theme`, `/api/c/:slug/admin/theme`, `/api/c/:slug/admin/theme/cover`) with company isolation middleware and slug-based asset paths (`/uploads/themes/{slug}/...`).
- Invite redemption supports slug route (`/api/auth/invites/:slug/redeem`) with tenant validation; legacy route retained for compatibility.
- Upload storage now partitions by slug (fallback to temp if storage not writable).
- Frontend API hooks for theme and invite redemption now auto-prefix requests with the current `/c/{slug}` context (derived from the URL); mocks updated to respond to slugged routes.

## Advantages
- Tenant-aware routing: `/c/{slug}/...` scopes SPA routes and API calls without exposing UUIDs.
- Vanity invites/signup: slug in invite links to auto-select tenant and reduce phishing risk.
- Asset partitioning: `/uploads/themes/{slug}/...` or `/assets/{slug}/...` keeps files and caches tenant-scoped.
- Better caches/claims: slug becomes part of cache keys (`company:{slug}`) and auth/session context for isolation.

## Scope
- Routing: introduce slug-prefixed SPA and API routes while maintaining backwards-compatible IDs during transition.
- Invites/onboarding: embed slug in invite URLs and registration to pre-select company.
- Assets: ensure upload and CDN paths are slug-scoped; clean-up routines remain tenant-bound.

## Story: “Adopt slug as the first-class tenant key”
- Acceptance: Slug is required and validated; users can navigate via `/c/{slug}/...`; invites and assets resolve to the correct tenant using slug; company isolation enforced via slug resolution middleware; tests green.

### Backend Tasks
1) Routing middleware: add resolver that maps `{slug}` → `companyId` with 404/403 handling; inject into request context.  
2) API surface: add slug-aware routes (e.g., `/api/c/:slug/events`, `/api/c/:slug/theme`) while keeping current routes for a deprecation window; align validators.  
3) Invites: allow redeem endpoints to accept slug in URL (`/auth/invites/:slug/:token`) and verify slug/company match.  
4) Assets: adjust upload paths to use slug instead of companyId; update static serving to allow `/uploads/themes/{slug}/...` and ensure company isolation checks.  
5) Auth claims: include slug in JWT/session and enforce slug/company match on requests; update tests.  
6) Tests: integration suites for slug routing (events, orders, theme), invite redemption with slug, and asset path isolation.

### Frontend Tasks
1) Router: add `/c/:slug/*` base; preserve backwards-compatible redirect from legacy routes.  
2) Query/client: inject slug into API requests and cache keys; derive slug from router context. **(theme + invite redemption wired via URL-derived slug; router change still pending)**  
3) Invites/onboarding: generate and consume invite links with slug; auto-select tenant on signup/login.  
4) Assets/theme: resolve cover/theme URLs using slug-based paths; ensure ThemeProvider works under slugged routes.  
5) Tests: add routing + invite flow coverage (slug present), ThemeProvider under `/c/:slug`, and asset URL resolution.

### Ops & Migration Tasks
1) Slug validation: document rules (lowercase, hyphenated, unique) and add migration guard if needed.  
2) Redirect strategy: define how long legacy non-slug routes stay active; add telemetry for usage.  
3) CDN/storage: configure buckets or directories by slug; document envs (`THEME_UPLOAD_DIR`, `THEME_BUCKET`, `THEME_CDN_URL`).  
4) Rollout plan: feature flag + shadow traffic for slug routes; clear rollback steps.

## Testing Plan
- Backend integration: slug-scoped routes for events/orders/theme + invite redemption.  
- Frontend e2e/component: router slug context, invite landing with auto-tenant, ThemeProvider under slug paths.  
- Asset isolation: ensure files saved/fetched under slug path; negative tests for cross-tenant access.
