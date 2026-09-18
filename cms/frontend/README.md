# Junior Jackson Lyimo — Portfolio (frontend)

React + TypeScript + Vite single-page portfolio. Content is pulled from
the local CMS backend in `../backend` at runtime, with built-in static
fallback data so the site still looks complete if the backend is down.

## Setup

```bash
npm install
cp .env.example .env   # set VITE_API_URL if your backend isn't on :4000
npm run dev
```

Visit `http://localhost:5173`. The admin dashboard is at
`http://localhost:5173/admin` (see `../backend/README.md` to set up your
login).

## Adding your CV
Drop your exported PDF at `public/cv.pdf` — the three "Download CV"
buttons (navbar, hero, contact section) already point at `/cv.pdf` and
will start working immediately, no code changes needed.

## Adding/replacing photos
Two images are used in the About section's hover/tap-to-flip photo:
- `public/junior-portrait.jpeg` — shown by default
- `public/junior-field.jpg` — shown on hover (desktop) or tap (mobile)

Replace either file (keep the same filename) to swap the photo. The
caption underneath is hardcoded in `src/Portfolio.tsx` — search for
`IN THE FIELD` to edit it.

## Editing content after launch
Once the backend is running and you're logged into `/admin`, everything
in the Skills / Projects / Experience / About sections is editable from
the dashboard — no redeploy needed, it's pulled live on every page load.

## Build
```bash
npm run build    # type-checks then builds to dist/
npm run preview  # serve the production build locally
```

## What changed from the original Sanity-based version
- Removed `@sanity/client` and all Sanity-specific code.
- Added `src/api/content.ts`, a small fetch layer against the local
  backend, with the same fail-soft-to-static-data behavior the Sanity
  integration had.
- Added full responsive breakpoints (there were none before — this is
  the biggest functional fix; the old grid layouts broke on phones).
- Added a mobile hamburger nav.
- Wired the two uploaded photos into the About section with a
  hover/tap-to-flip interaction (they were unused placeholders before).
- Added the CV download button (navbar, hero, contact).
- Fixed terminal-modal accessibility: focus trap, `role="dialog"`,
  focus returns to the trigger button on close.
- Disabled the custom cursor on touch devices (it only ever listened
  for mouse events, so touch users had no visible cursor at all).
- Added a scroll-progress bar, favicon, and Open Graph/Twitter meta tags.
- Added `react-router-dom` for the new `/admin` and `/admin/dashboard`
  routes.

## Interactive polish (second pass)
- **Cmd/Ctrl+K quick-nav palette** — press `⌘K`/`Ctrl+K` or the navbar
  button to fuzzy-jump to any section. Arrow keys + Enter, or click.
- **Project case-study modals** — click a project card (not its
  GitHub/Live links) for a larger view with the full description and
  a bigger preview.
- **Tilt-hover on project cards** — a subtle 3D tilt follows the
  cursor; automatically disabled on touch devices.
- **Boot-sequence intro** — a short terminal-style boot animation on
  first load each browser session (stored in `sessionStorage`), fully
  skippable by clicking or pressing any key.
- **Syncing indicator** — a small pulsing "syncing" badge appears next
  to the Skills/Projects headers while the initial CMS fetch is in
  flight, so a slow backend doesn't cause an unexplained content jump.
  The static fallback data still renders instantly underneath it either
  way — this is a status hint, not a loading gate.
