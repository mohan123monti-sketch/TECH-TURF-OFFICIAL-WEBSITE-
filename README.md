# Tech Turf - Production-Ready Full-Stack Platform

## Current Deployment Guide

Use the live deployment instructions for this codebase here:
- docs/deployment/production-deploy.md

Note: parts of this README describe an older SQL/PostgreSQL target that does not match the current unified SQLite backend structure.

Tech Turf is a modular, deployable web platform with:
- Multi-page frontend (company site + e-commerce + admin UI)
- SQL backend API (Node.js + Express + PostgreSQL)
- Secure Nexus AI proxy (frontend never exposes provider keys)

## Architecture

User Browser  
→ Frontend (Vercel/Netlify)  
→ Backend API (Render)  
→ PostgreSQL (Supabase/Render/Neon)

## Project Structure

```txt
techturf/
├── frontend/
│   ├── index.html
│   ├── pages/
│   ├── admin/
│   ├── public/
│   │   ├── data/
│   │   ├── images/
│   │   └── icons/
│   └── src/
│       ├── css/
│       └── js/
├── backend/
│   ├── server.js
│   ├── config/
│   │   └── db.js
│   ├── routes/
│   │   └── sql/
│   ├── controllers/
│   │   └── sql/
│   ├── models/
│   │   └── sql/
│   ├── middleware/
│   ├── utils/
│   ├── sql/
│   │   └── schema.sql
│   ├── .env.example
│   └── package.json
└── README.md
```

## Frontend Notes

- Modular JS architecture in `frontend/src/js`:
  - `config.js`, `main.js`, `core/`, `features/`, `effects/`, `ai/`, `admin/`
- Modular CSS architecture in `frontend/src/css`:
  - `base.css`, `layout.css`, `components.css`, `pages/`
- Nexus AI frontend now calls backend endpoint `/api/ai`
- API base uses:
  - `window.__TECHTURF_API_BASE__` (if set)
  - or `localStorage.tt_api_base`
  - or `/api`

## Backend API (SQL)

Base URL: `/api`

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Products
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products` (admin)
- `PUT /api/products/:id` (admin)
- `DELETE /api/products/:id` (admin)

### Orders
- `POST /api/orders`
- `GET /api/orders/mine`
- `GET /api/orders` (admin)
- `PATCH /api/orders/:id/status` (admin)

### Admin
- `GET /api/admin/stats`
- `GET /api/admin/users`
- `GET /api/admin/products`
- `GET /api/admin/orders`

### Nexus AI
- `POST /api/ai`
  - body: `{ "message": "..." }`
  - backend calls AI provider with server-side key

## SQL Schema

Run the schema before backend boot:

- File: `backend/sql/schema.sql`
- Includes tables:
  - `users`
  - `products`
  - `orders`
  - `order_items`
  - optional `reviews`

## Environment Variables

Copy and update:

```bash
cp backend/.env.example backend/.env
```

Required:
- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `OPENAI_API_KEY`

Optional:
- `OPENAI_MODEL` (default `gpt-4o-mini`)
- `OPENAI_BASE_URL` (default OpenAI)

## Local Development

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
Use static serve (example):
```bash
cd frontend
npm install
npm run dev
```

## Deployment (Vercel + Render + Supabase)

### 1) PostgreSQL (Supabase)
1. Create project/database.
2. Run `backend/sql/schema.sql` in SQL editor.
3. Copy connection string as `DATABASE_URL`.

### 2) Backend on Render
1. Create new Web Service from `backend/`.
2. Build command: `npm install`
3. Start command: `npm start`
4. Add env vars from `.env.example`.
5. Confirm `/health` returns `{ success: true, db: 'ok' }`.

### 3) Frontend on Vercel
1. Import repo and set root to `frontend/`.
2. Deploy static site.
3. Optional: inject API base in `<head>`:

```html
<script>
  window.__TECHTURF_API_BASE__ = 'https://your-backend.onrender.com/api';
</script>
```

Or persist at runtime:

```js
localStorage.setItem('tt_api_base', 'https://your-backend.onrender.com/api');
```

## Security Checklist

- [x] AI key removed from frontend
- [x] AI calls proxied through backend `/api/ai`
- [x] JWT auth middleware in backend
- [x] Input validation on core endpoints
- [x] Rate limiting on `/api`
- [x] Helmet + CORS + compression
- [x] SQL-only DB config in backend

## Final Validation Checklist

- [ ] Frontend pages load with no broken links
- [ ] Login/register returns JWT
- [ ] Product CRUD works with admin token
- [ ] Order placement and status updates work
- [ ] `/api/ai` returns responses
- [ ] `/health` is green on Render
- [ ] Mobile responsiveness verified
- [ ] No console errors on critical flows

## Notes

- Existing legacy Mongo-oriented files still exist in repository but are no longer used by the new SQL server entrypoint.
- Production server entrypoint is `backend/server.js` with SQL routes under `backend/routes/sql`.
