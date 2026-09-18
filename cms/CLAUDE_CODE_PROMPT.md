# Implementation prompt — finish, verify, and extend the portfolio + local CMS

Paste everything below into Claude Code, run from the root of this project
(the folder containing `frontend/`, `backend/`, and this file).

---

## Context

This is a two-part project:
- `frontend/` — a React 19 + TypeScript + Vite single-page portfolio
  (`src/Portfolio.tsx`), recently migrated off Sanity CMS onto a local
  backend. Content fetching lives in `src/api/content.ts`. An admin
  dashboard lives in `src/admin/` (`Login.tsx`, `Dashboard.tsx`, `api.ts`),
  routed via `react-router-dom` in `src/main.tsx` at `/admin` and
  `/admin/dashboard`.
- `backend/` — Express + PostgreSQL (via Prisma), with models `AdminUser`,
  `Skill`, `Project`, `Experience`, `Bio` (`prisma/schema.prisma`), JWT
  session auth in an httpOnly cookie (`src/lib/auth.ts`,
  `src/middleware/requireAuth.ts`), rate-limited login
  (`src/routes/auth.ts`), and CRUD routes per model under `src/routes/`.
  `prisma/seed.ts` creates the admin account and seeds initial content
  matching what's hardcoded as frontend fallback data.

The frontend's `tsc --noEmit`, `eslint .`, and `vite build` have already
been verified clean in a sandboxed environment that could not reach
`binaries.prisma.sh`, so **the backend's `prisma generate` /
`prisma migrate dev` has not yet actually been run or verified**. Treat
that as the first real unknown, not something already confirmed working.

---

## Part 1 — Get it running and verify it for real

1. `cd backend && npm install`
2. Copy `.env.example` to `.env`. Generate a real `JWT_SECRET` with
   `openssl rand -base64 48`. Set `ADMIN_USERNAME` and a strong
   `ADMIN_PASSWORD` (8+ characters).
3. Start Postgres: `docker compose up -d` (or point `DATABASE_URL` at an
   existing instance).
4. `npx prisma generate`, then `npx prisma migrate dev --name init`.
   **Fix whatever this surfaces** — schema issues, type mismatches
   between the generated Prisma client and the route handlers in
   `src/routes/*.ts`, etc. The routes were written against the schema
   but never compiled against the real generated client.
5. `npm run seed` — confirm it creates the admin user and seeds skills,
   projects, experience, and bio without errors.
6. `npm run dev` — confirm the server boots and `GET /api/health`
   returns `{ ok: true }`.
7. `npx tsc -p tsconfig.json` — the backend has never actually been
   type-checked end-to-end. Fix any errors.
8. In a second terminal: `cd frontend && npm install && cp .env.example .env && npm run dev`.
9. Manually verify, in a browser:
   - Public site loads at `/` with real content (not just static fallback — check the network tab hits `localhost:4000/api/...`).
   - `/admin` login works with the credentials from `backend/.env`.
   - In `/admin/dashboard`: edit an existing skill and save it, confirm
     it updates on the public site on reload. Add a new project, confirm
     it appears. Delete something, confirm it disappears. Edit the bio
     and stats.
   - Logout works and `/admin/dashboard` redirects to `/admin` when not
     authenticated.
   - Resize the browser to a phone width (375px) and confirm the layout
     doesn't break — mobile nav hamburger, stacked grids, etc.
   - Hover/tap the About-section photo and confirm it flips between the
     two images with the caption changing underneath.
   - Confirm the CV download buttons exist in the navbar, hero, and
     contact section (they'll 404 until a real `cv.pdf` is added to
     `frontend/public/` — that's expected, just confirm the link/button
     itself renders and is clickable).
   - Open the terminal easter egg (press `` ` ``), confirm Tab cycles
     focus between the close button and the input, and Escape closes it
     and returns focus to whatever triggered it.
10. Fix anything broken you find during this pass before moving to Part 2.

## Part 2 — Lint nit (already fixed, just confirm)

`src/Portfolio.tsx`'s typewriter effect previously called `setIsDeleting`
and `setRoleIdx` synchronously inside a `useEffect`, tripping the
`react-hooks/set-state-in-effect` rule. This has already been fixed by
wrapping that transition in a zero-delay `setTimeout`, matching the
pattern the rest of the effect already uses. `npx eslint .` should show
zero warnings. If it doesn't, something regressed — investigate before
moving on, and confirm the typing animation's timing still looks
identical (same speed, same pause between roles).

## Part 3 — Interactive enhancements (already implemented, verify them)

All five of the following are already built into `Portfolio.tsx`. Don't
rebuild them — read the code first (search for `paletteOpen`,
`activeProject`, `tilt`, `bootDone`/`BOOT_LINES`, `cmsSyncing`), then
verify each one actually works in the browser and fix anything broken:

1. **Cmd/Ctrl+K quick-nav palette** — `⌘K`/`Ctrl+K` or the navbar `⌘K`
   button opens it; typing filters `SECTIONS`; arrow keys + Enter or a
   click jumps to that section; Escape/click-outside closes it; Tab
   should cycle only within the modal (via the shared `trapTabWithin`
   helper). Confirm it doesn't fight with the `` ` ``/`/` terminal
   shortcut when both could theoretically be triggered.
2. **Project case-study modals** — clicking a project card (not its
   GitHub/Live links, which still work independently) opens a modal
   with the full description, a larger `MockPreview`, stack, and links.
   Confirm keyboard activation (Enter/Space on the focused card) works
   too, and that Tab/Escape/focus-return behave the same as the palette.
3. **Tilt-hover on project cards** — subtle 3D tilt following the
   cursor; confirm it's inert on a touch/coarse-pointer device (it's
   gated on `hasFinePointer`) rather than leaving a stuck transform.
4. **Boot-sequence intro** — first load in a fresh browser session shows
   the boot lines then reveals the hero; reloading again in the *same*
   tab session should skip straight to the hero (`sessionStorage`
   key `pf_boot_shown`); any keypress or a click during boot should
   skip immediately. Test in an incognito/private window to see it
   fresh.
5. **CMS-sync indicator** — a small pulsing "syncing" badge should
   appear next to the Skills/Projects headers only while the initial
   fetch to the backend is in flight, and disappear once it settles
   (success or failure) — confirm it doesn't get stuck on if the
   backend is unreachable.

If any of these is actually broken, fix it in place — don't rewrite the
surrounding structure unless the bug requires it.

## Part 4 — Final verification

Re-run and confirm all pass before considering this done:
```bash
cd frontend && npx tsc --noEmit && npx eslint . && npx vite build
cd ../backend && npx tsc -p tsconfig.json
```
Then repeat the manual browser pass from Part 1, step 9, plus exercise
each of the five features from Part 3.

## Constraints throughout
- Don't reintroduce Sanity or any third-party CMS dependency.
- Don't remove the fail-soft fallback-to-static-data behavior — the site
  must still render fully even if the backend is down.
- Keep all backend writes behind `requireAuth` and zod validation — no
  new public write endpoints.
- Keep the CORS origin restricted to `FRONTEND_URL`, not wildcarded.
