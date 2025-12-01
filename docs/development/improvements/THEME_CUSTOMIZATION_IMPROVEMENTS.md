# Theme Customization Improvements

Last updated: 2025-12-01  
Scope: Post-MVP hardening for theme customization (backend + frontend + ops)

## Follow-Ups
1. **Contrast guardrails + defaults**  
   - Add backend validation for minimum contrast on header text vs background.  
   - Add shared default theme fixtures for tests (backend/frontend).  
   - Surface UI warnings when contrast is low.

2. **Upload pipeline hardening**  
   - Enforce aspect ratio (2:1–3:1) and min resolution ≥1200x500; reject animated assets.  
   - Generate signed URLs with TTL; add storage/CDN toggle (S3/local).  
   - Add explicit DELETE `/admin/theme/cover` that removes stored files.

3. **Frontend resilience and UX**  
   - Add offline/error fallback for `/theme` (cache-first, stale-while-revalidate).  
   - Theme notification/banner surfaces; extend tests for error/offline states.  
   - Client-side file validation (size, type, ratio hints) + upload progress/rollback.

4. **Ops and runbook**  
   - Seed/update defaults during company provision or seed script.  
   - Document env vars (`THEME_UPLOAD_DIR`, `THEME_BUCKET`, `THEME_CDN_URL`, TTL).  
   - Support runbook: reset theme to defaults, purge cover assets, audit logging guidance.
