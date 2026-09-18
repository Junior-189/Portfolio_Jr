# Portfolio CMS Backend

A small Express + PostgreSQL (via Prisma) API that replaces the old Sanity
integration. It serves the portfolio's content (skills, projects,
experience, bio) publicly for reading, and exposes an admin-only,
JWT-authenticated set of write endpoints used by the frontend's `/admin`
dashboard.

## 1. Prerequisites
- Node.js 20+
- Docker (for the easiest local Postgres), or your own PostgreSQL instance

## 2. Setup

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and set:
- `DATABASE_URL` — leave as-is if using the included docker-compose Postgres
- `JWT_SECRET` — generate one with `openssl rand -base64 48`
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — your admin login (8+ char password).
  These are only read once, by the seed script below.
- `FRONTEND_URL` — where the React app runs (default `http://localhost:5173`)

Start Postgres (skip if you already have one running):
```bash
docker compose up -d
```

Create the database schema and generate the Prisma client:
```bash
npx prisma generate
npx prisma migrate dev --name init
```

Create your admin account and seed the initial content (matching what's
currently hardcoded in the frontend, so you have something to edit
immediately):
```bash
npm run seed
```

Run the server:
```bash
npm run dev
```

The API is now live at `http://localhost:4000/api`. Check
`http://localhost:4000/api/health`.

## 3. Production notes
- Set `NODE_ENV=production` — this makes the session cookie `secure`
  (HTTPS-only), so the backend must be served over HTTPS in production.
- Run `npx prisma migrate deploy` (not `migrate dev`) on deploy.
- Point `DATABASE_URL` at your real Postgres instance and `FRONTEND_URL`
  at your deployed site's origin (CORS is locked to this one origin).
- Rotate `JWT_SECRET` if it's ever exposed; this immediately invalidates
  all existing admin sessions.
- There's a login rate limiter (10 attempts / 15 min / IP) — if you're
  behind a proxy/load balancer, make sure `app.set('trust proxy', ...)`
  is configured so rate limiting sees real client IPs, not the proxy's.

## 4. Adding more admin users
There's currently one admin account, created by the seed script. To add
more, connect to the database and insert into `AdminUser` with a bcrypt
hash (cost 12), or extend the seed script.
