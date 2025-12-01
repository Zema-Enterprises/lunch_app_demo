# Theme Customization Status

Last reviewed: 2025-12-01  
Owner: Platform UI

## Snapshot
- Backend: `CompanyTheme` Prisma model + migration, `GET /api/theme`, `PUT /api/admin/theme`, `POST /api/admin/theme/cover` with admin RBAC, 2MB memory uploads, sharp resize to 1600x420 WEBP, local storage under `/uploads/themes/<companyId>/`. Tests: `backend/src/__tests__/integration/theme.integration.test.ts`.
- Frontend: ThemeProvider fetches `/theme`, merges defaults, caches in `ls-theme-cache`, applies CSS variables. Header and sidebar consume theme tokens. CompanySettings includes admin-only color pickers, preview, and cover upload. Tests: `frontend/src/test/theme/ThemeProvider.test.tsx`, `frontend/src/test/pages/CompanySettings.theme.test.tsx`.
- Defaults: Defined in code (backend `DEFAULT_THEME`, frontend `DEFAULT_THEME`); created on-demand via `getOrCreateTheme` rather than seeded.
- Follow-ups live in `docs/development/improvements/THEME_CUSTOMIZATION_IMPROVEMENTS.md`.

## Plan Alignment (per archived THEME_CUSTOMIZATION_PLAN)
| Phase | Status | Notes |
| --- | --- | --- |
| Phase 0 — Discovery & Defaults | Partial | Defaults exist in code but no shared fixtures or documented contrast targets. |
| Phase 1 — Backend Model & Validation | Partial | Prisma model/migration and hex validation shipped; no contrast guardrails or company-provision hook; fixtures absent. |
| Phase 2 — Backend API (colors) | Complete | GET/PUT endpoints with admin RBAC, company isolation, default fallback covered by tests. |
| Phase 3 — Cover Photo Upload Pipeline | Partial | Single WEBP derivative, min 800x400, 2MB max, local storage only. Missing aspect ratio guard (2:1–3:1), min 1200x500, animated-image rejection, signed URLs/TTL, CDN toggle, explicit delete endpoint (currently `useCover:false`), audit logging. |
| Phase 4 — Frontend Theme Consumption | Partial | CSS variables + caching + layout usage done. No offline/error fallback tests, notification surface theming, or contrast checks. |
| Phase 5 — Admin UI for Branding | Partial | Color inputs + preview + upload present. Missing client-side size/ratio validation, contrast warnings, upload progress, and optimistic rollback guardrails. |
| Phase 6 — Documentation & Ops | Not started | No runbook, seed alignment, or feature flag doc; no support steps for reset/purge. |
