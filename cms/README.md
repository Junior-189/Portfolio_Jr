# Junior Jackson Lyimo — Portfolio + Local CMS

Two projects:
- **`frontend/`** — the React/TypeScript portfolio site (was Sanity-backed, now talks to your own backend below).
- **`backend/`** — Express + PostgreSQL API + admin dashboard auth, replacing Sanity as your local CMS.

## Quick start (development)

```bash
# 1. Backend — see backend/README.md for full details
cd backend
npm install
cp .env.example .env   # fill in JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD
docker compose up -d
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev             # http://localhost:4000

# 2. Frontend — in a second terminal
cd frontend
npm install
cp .env.example .env
npm run dev              # http://localhost:5173
```

Then:
- Visit `http://localhost:5173` — the public portfolio.
- Visit `http://localhost:5173/admin` — log in with the credentials you
  set in `backend/.env`, and edit skills/projects/experience/bio live.
- Drop your CV PDF at `frontend/public/cv.pdf` to activate the download
  buttons.

## A note on this sandbox vs. your machine
Everything here type-checks and builds cleanly (`npx tsc --noEmit`,
`npx eslint .`, and `npx vite build` all pass in the frontend). The one
thing I could **not** verify end-to-end in this sandboxed environment is
the backend's Prisma client generation — `prisma generate` needs to
download engine binaries from `binaries.prisma.sh`, which my sandbox's
network allowlist blocks. This is a sandbox limitation, not a code
issue — it will work normally the moment you run `npm install && npx
prisma generate` on your own machine with normal internet access. I'd
still recommend doing a full local run-through (both servers up, log
into `/admin`, add/edit/delete one of each content type, confirm it
shows up on the public site) before you consider this done.

## Full audit findings and what was fixed
See the running summary earlier in this conversation for the complete
bug/security/UX audit. Everything flagged there was addressed in this
build: responsive breakpoints, real photo integration, CV download,
terminal accessibility, meta tags/favicon, and the Sanity → local CMS
migration with JWT auth, rate-limited login, and input validation on
every write route.

## Interactive polish — also done
All five previously-suggested enhancements are now implemented (see
`frontend/README.md` for details on each): the Cmd/Ctrl+K quick-nav
palette, project case-study modals, tilt-hover on project cards, a
skippable boot-sequence intro, and a syncing indicator for the initial
CMS fetch. `tsc --noEmit`, `eslint .`, and `vite build` all pass clean
on the frontend with these included.

## What's still genuinely unverified
Only the backend, and only because of this sandbox's network
restrictions (see the note above) — `prisma generate` couldn't run
here. Do the full local run-through in `CLAUDE_CODE_PROMPT.md` Part 1
before treating this as production-ready, and exercise the five new
interactive features (Part 1, step 9) alongside it.
