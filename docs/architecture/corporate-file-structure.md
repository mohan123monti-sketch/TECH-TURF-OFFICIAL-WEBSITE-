# Tech Turf Corporate File Structure

## Objective
Create a consistent, enterprise-friendly structure and naming strategy that keeps the platform maintainable, searchable, and production-ready.

## Naming Standard
- Use kebab-case for page files (example: `product-details.html`).
- Use kebab-case for public URL paths.
- Keep JS modules in camelCase only where existing imports depend on it.
- Keep route/controller naming aligned (`xRoutes.js` <-> `xController.js`).

## Current Standardized Public Pages
These files were normalized to kebab-case:
- `frontend/aadil-portfolio.html`
- `frontend/pages/click-sphere.html`
- `frontend/pages/trend-hive.html`
- `frontend/pages/nexus-ai.html`
- `frontend/pages/product-details.html`
- `frontend/pages/privacy-policy.html`
- `frontend/pages/terms-of-service.html`

## Current Standardized Backend Scripts
Utility and test scripts are now organized by purpose:
- `backend/scripts/db/check-db.js`
- `backend/scripts/db/fix-db.js`
- `backend/scripts/db/inspect-users.js`
- `backend/scripts/admin/reset-admin.js`
- `backend/scripts/tests/test-brand.js`
- `backend/scripts/tests/test-login-api.js`
- `backend/scripts/tests/test-nexus.js`

## Current Standardized Backend Internal Modules
Internal utility/middleware modules normalized to kebab-case:
- `backend/middleware/auth-middleware.js`
- `backend/middleware/error-handler.js`
- `backend/utils/generate-otp.js`

## Current Standardized Backend API Layers
Route and controller filenames normalized to kebab-case for corporate consistency:
- Routes: `backend/routes/*-routes.js`
- Controllers: `backend/controllers/*-controller.js`

Examples:
- `backend/routes/auth-routes.js`
- `backend/routes/website-routes.js`
- `backend/routes/stats-routes.js`
- `backend/controllers/auth-controller.js`
- `backend/controllers/product-controller.js`
- `backend/controllers/stats-controller.js`

## Corporate Folder Layout

```text
TECH-TURF-OFFICIAL-WEBSITE-
  backend/
    config/
    controllers/
    middleware/
    routes/
    services/
    utils/
    uploads/
    scripts/                 # db/admin/test utility scripts
      db/
      admin/
      tests/
  frontend/
    admin/
    pages/
    public/
    src/
      css/
      js/
        core/
        features/
        effects/
        pages/
        admin/
        ai/
  docs/
    architecture/
      corporate-file-structure.md
```

## URL and Reference Policy
- All internal links must point to kebab-case page names.
- SEO metadata maps must use the same kebab-case page file keys.
- Shared layout/nav/footer links must match renamed pages.

## Validation Checklist
- No stale underscore-based page references remain in frontend/backend code.
- Website editor allowlist supports the renamed root file (`aadil-portfolio.html`).
- Admin website editor can list, open, and save renamed pages.

## Next Hardening Steps (Optional)
- Add lint rules for filename pattern checks.
- Add CI route/link validation for page references.
