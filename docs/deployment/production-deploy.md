# Tech Turf Production Deployment Guide

## Deployment Model

This repository is production-ready with a single backend service that can:
- serve all API routes under /api
- serve uploaded media under /uploads
- serve frontend static files from frontend/ when NODE_ENV=production (or SERVE_FRONTEND=true)

Recommended production target options:
- Render Web Service (single service deployment)
- Railway service
- VPS + PM2

## Required Environment Variables

Use backend/.env.example as the baseline.

Required:
- PORT: service port (platform-provided in most PaaS)
- NODE_ENV=production
- JWT_SECRET: strong random secret
- DATABASE_URL: path to SQLite DB file on persistent volume (example: /data/database.sqlite)
- CORS_ORIGIN: comma-separated public origins

Optional:
- SERVE_FRONTEND=true
- FRONTEND_BASE_URL=https://your-domain.com (used for dev-style redirects when frontend is separate)
- EMAIL_USER, EMAIL_PASS, NEXUS_AI_API_KEY, GOOGLE_CLIENT_ID

## Build And Start Commands

Backend service:
- Build: npm install --prefix backend
- Start: npm start --prefix backend

If deploying as one service (recommended), ensure:
- NODE_ENV=production
- SERVE_FRONTEND=true

## Health Checks

Use:
- GET /health

Expected response:
- success: true
- message: Tech Turf Unified Backend is healthy

## Persistent Storage (SQLite)

SQLite requires persistent disk.

Set DATABASE_URL to a persistent path:
- /data/database.sqlite

Mount/attach persistent storage before first boot.

## Local Production Smoke Test

From repo root:

1. Build frontend CSS (optional if already generated):
- npm run build --prefix frontend

2. Start backend in production mode:
- PowerShell:
  $env:NODE_ENV='production'; $env:SERVE_FRONTEND='true'; npm start --prefix backend

3. Verify:
- http://localhost:5000/ (frontend page)
- http://localhost:5000/health
- http://localhost:5000/api/blog

## PM2 Deployment (VPS)

Example ecosystem usage:
- pm2 start ecosystem.config.js --only TT-Backend

Or run backend only in production:
- pm2 start backend/server.js --name TT-Backend --time

Then configure env in PM2 ecosystem or host environment.

## Post-Deploy Checklist

- /health returns success
- /api/auth/login works
- /api/blog and /api/search respond
- admin page loads (either /admin on unified deployment or frontend host /admin/index.html)
- uploads are writable and served from /uploads
- CORS allows only intended domains
- JWT_SECRET is strong and not default

## Naming Policy Guard

Run before release:
- npm run validate:naming

This verifies route/controller/page naming conventions and blocks legacy references.
