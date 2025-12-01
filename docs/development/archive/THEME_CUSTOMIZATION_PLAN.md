# Company Theme Customization Plan

## Goal

Enable company admins to configure branding (primary/secondary colors, background color, header cover photo) that automatically applies to all users in their company across web clients. Implement via TDD with secure uploads, sensible limits, and visually appealing defaults.

> Status (2025-12-01): Partial delivery. Backend model/endpoints and basic cover upload + frontend theming/admin UI are live, but upload guardrails, signed URLs/CDN toggle, contrast validation, and ops/runbook work remain. See `docs/development/THEME_CUSTOMIZATION_STATUS.md` for the latest audit and follow-ups.

## Scope & Constraints

- **Actors:** Company admin only (create/update). All authenticated company users consume theme.
- **Assets:** Primary/secondary colors, background color, cover photo (optional).
- **Targets:** Web SPA theming + notification surfaces (where feasible).
- **Security:** RBAC enforcement, file validation, size/aspect constraints, signed URLs, caching.
- **Performance:** CDN/edge cache for images, lazy loading, CSS variables for live theming.
- **Compliance:** PII-safe uploads; no user faces required; content-length guarded.

## Proposed Tech Choices

- **Color picker:** `react-colorful` (lightweight, keyboard accessible).
- **Image handling:** `sharp` for server-side resize/crop; `multer` for upload handling (already used? verify and reuse).
- **Storage:** S3-compatible bucket with short-lived signed URLs (currently local for dev/test; add env toggle later).
- **Design tokens:** Generate CSS variables from theme and persist in DB; fallback to defaults.

## Data Model & API (draft)

- Table: `CompanyTheme` (companyId PK/FK, primaryColor, secondaryColor, backgroundColor, coverPhotoUrl, coverPhotoMeta {width,height,format,filesize}, updatedBy, updatedAt).
- Endpoints:
  - `GET /api/theme` → current company theme for caller.
  - `PUT /api/admin/theme` → admin-only update colors (no file).
  - `POST /api/admin/theme/cover` → admin-only upload cover; returns signed URL + theme update.
  - `DELETE /api/admin/theme/cover` → admin-only remove cover.
- Validation:
  - Colors: hex format, contrast guardrails, allow null → fallback to defaults.
  - Cover: max 2MB, formats jpg/png/webp, aspect ratio 2:1 to 3:1 (crop/letterbox server-side), min resolution 1200x500, reject animated.

## Testing Strategy (TDD)

- Integration tests drive behavior (backend `src/__tests__/integration/theme.*.test.ts`).
- Frontend tests in `frontend/src/test/` for admin UI, theming hook, and global stylesheet application.
- Add contract tests for signed URL lifetimes and RBAC rejections.
- Visual regression optional: snapshot CSS variable map for default and custom themes.

## Phases & Subphases

### Phase 0 — Discovery & Defaults

- Document default theme tokens and accessibility targets (contrast >= 4.5:1 for text on background).
- Add fixtures for default theme values shared across backend/frontend tests.

### Phase 1 — Backend Model & Validation

- Add Prisma model migration for `CompanyTheme` with constraints.
- Service layer: create/update/fetch theme; normalize colors; enforce contrast guardrails.
- Tests:
  - Create default row on company provision.
  - Reject invalid hex, disallowed formats.
  - Contrast guardrails adjust secondary/background when needed (documented behavior).

### Phase 2 — Backend API (colors)

- Implement `GET /api/theme` (scoped by user company) and `PUT /api/admin/theme`.
- Middleware: admin-only, company isolation, input validation via schema.
- Tests:
  - Admin can update colors; non-admin forbidden.
  - Unknown fields ignored; missing fields leave existing values.
  - Defaults returned when theme absent (seeded path).

### Phase 3 — Cover Photo Upload Pipeline

- Implement upload endpoint with `multer` (memory) → `sharp` processing → S3/local store.
- Generate responsive derivatives (e.g., 1600w, 1200w, 800w) and store metadata.
- Serve via signed URLs or proxy with cache headers.
- Tests:
  - Reject >2MB, bad mime, wrong aspect, too small.
  - Accept valid image → returns processed URLs + metadata persisted.
  - Delete endpoint removes objects/metadata.
  - Signed URL TTL verified; no leakage across tenants.

### Phase 4 — Frontend Theme Consumption

- Theme provider reads `/api/theme` on bootstrap; caches in Zustand/Query; updates CSS variables.
- Apply tokens to layout shell (header, sidebar, buttons, links, backgrounds).
- Tests:
  - Loads defaults on first render.
  - Applies custom theme variables to DOM (style assertions).
  - Falls back gracefully when API offline (cached/default).

### Phase 5 — Admin UI for Branding

- Admin-only page: color pickers, live preview, cover upload with client-side validation (size, type, ratio hints).
- Use optimistic updates with rollback on failure; show contrast warnings.
- Tests:
  - Non-admin redirected/blocked.
  - Form validation messages for bad hex/oversize image.
  - Successful save updates global theme provider.
  - Upload progress and preview use responsive sources.

### Phase 6 — Documentation & Ops

- Add docs to `docs/development/` and `docs/testing/` for flows and test commands.
- Add feature flag description if gated (e.g., `companyBranding`).
- Update seeds/fixtures to include default theme rows.
- Add runbook for support (reset theme, purge cover).

## Acceptance Criteria

- Admin-only control of theme; tenant isolation enforced.
- Validations prevent bad colors and images; graceful defaults maintained.
- SPA reflects theme instantly without reload; persisted across sessions.
- Upload pipeline secure, size/ratio bounded, and cached.
- Tests cover API + UI paths; all suites green.

## Open Questions

- Storage target: confirm S3 bucket naming and env vars (`THEME_BUCKET`, `THEME_CDN_URL`).
- Should we enforce WCAG AA contrast automatically (adjust) or warn-only? Proposed: warn on UI, reject on backend for critical surfaces (header text).
- Need for audit log entries when theme changes? (recommended).
