# Junior Jackson Lyimo — Developer Portfolio

A production-ready, single-page developer portfolio featuring a black & white editorial aesthetic, interactive particle background, custom cursor, terminal easter egg, and Sanity.io CMS integration.

**Live:** _coming soon_ · **Studio:** _coming soon_

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)
![Sanity](https://img.shields.io/badge/Sanity-v3-F03E2F?logo=sanity)

---

## Features

- **Glitch hero** — name splits into RGB ghost layers every 6 seconds
- **Typewriter** — cycles through 5 professional roles (type 75ms, pause 2.2s, delete 35ms)
- **Particle field** — 70 nodes that flee the cursor, with proximity connection lines
- **Scrolling grid** — diagonal background grid drifts continuously
- **Custom cursor** — 7px snapping dot + 36px lerp-trailing ring
- **Scroll reveal** — sections fade up on first view via IntersectionObserver
- **Theme toggle** — B&W inversion of the entire palette (◐ DARK / ◑ LIGHT)
- **Terminal** — press `` ` `` to open; try `help`, `skills`, `about`, `whoami`
- **Skills** — animated bars on scroll + hover-expand descriptions
- **Projects** — hover cards reveal a MockPreview SVG wireframe
- **Experience timeline** — staggered reveal with dots and connecting line
- **Sanity.io CMS** — bio, skills, projects, and experience are fetched live
- **Hardcoded fallbacks** — site works fully without Sanity configured

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 · TypeScript · Vite |
| Styling | CSS-in-JS (inline style objects + keyframe injection) |
| Fonts | Bebas Neue · JetBrains Mono · Outfit (Google Fonts) |
| CMS | Sanity.io v3 (headless) |
| Data fetching | `@sanity/client` |
| Hosting | Vercel (recommended) or any static host |

---

## Project Structure

```
portfolio/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .env                        ← git-ignored (contains real Sanity keys)
├── .env.example                ← template for env vars
├── public/                     ← static assets (add photo.jpg here)
└── src/
    ├── main.tsx                ← React entry point
    ├── Portfolio.tsx           ← entire app — single component (~640 lines)
    ├── env.d.ts                ← Vite env type declarations
    └── sanity/
        ├── client.ts           ← Sanity client config
        └── queries.ts          ← GROQ query strings
```

The companion **Sanity Studio** lives in a separate project at `../sanity-studio/`.

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Git

### 1. Clone and install

```bash
git clone https://github.com/Junior-189/Portfolio_Jr.git
cd Portfolio_Jr
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your Sanity project ID:

```
VITE_SANITY_PROJECT_ID=your_project_id
VITE_SANITY_DATASET=production
```

> If no Sanity project ID is set, the portfolio renders with hardcoded fallback data — fully functional.

### 3. Run locally

```bash
npm run dev
# → http://localhost:5173
```

### 4. Type check and build

```bash
npx tsc --noEmit     # zero errors required
npm run build        # outputs to dist/
npm run preview      # preview production build at :4173
```

---

## Sanity CMS Setup

The content is managed through a separate **Sanity Studio** project.

### Clone the Studio (separate repo or directory)

```bash
cd ..
mkdir sanity-studio && cd sanity-studio
# Copy the schema files and config from the companion project
npm init -y
npm install sanity @sanity/vision
npx sanity dev
# → http://localhost:3333
```

### Content types

| Type | Fields |
|------|--------|
| **Bio** | heading, paragraph1, paragraph2, stats[] |
| **Skill** | name, years, level (0–100), desc, order |
| **Project** | num, title, desc, stack[], githubUrl, liveUrl, order |
| **Experience** | year, role, company, desc, order |

### Connect to Sanity

1. Create a project at [sanity.io](https://sanity.io) → copy the Project ID
2. Set `VITE_SANITY_PROJECT_ID` in `portfolio/.env`
3. Set `projectId` in `sanity-studio/sanity.config.ts`
4. Add CORS origins at sanity.io/manage → API → CORS:
   - `http://localhost:5173`
   - `http://localhost:3333`
   - (add your production domain later)

---

## Deployment

### Portfolio (Vercel — recommended)

```bash
npm install -g vercel
vercel
# Follow prompts: framework = Vite, root = ./
# Add env vars in Vercel dashboard:
#   VITE_SANITY_PROJECT_ID
#   VITE_SANITY_DATASET
```

Or connect the GitHub repo directly on [vercel.com](https://vercel.com).

### Sanity Studio

```bash
cd ../sanity-studio
npx sanity deploy
# Choose a hostname, e.g. "junior-portfolio"
# → https://junior-portfolio.sanity.studio
```

After deploying, add your production URL to Sanity CORS origins.

---

## Acceptance Checklist

- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm run build` — succeeds, `dist/` produced
- [ ] Nav links smooth-scroll to sections
- [ ] Particles flee cursor within 130px
- [ ] Grid scrolls diagonally; opacity differs light vs dark
- [ ] Custom cursor: dot snaps, ring trails, hover grow, click shrink
- [ ] Typewriter cycles through all 5 roles forever
- [ ] Hero glitches every 6s with RGB ghost layer
- [ ] Sections fade up on first scroll-into-view
- [ ] Theme toggle inverts palette, particles, cursor, grid
- [ ] Backtick opens terminal; `help`, `about`, `skills`, `projects`, `contact`, `whoami`, `clear`, `exit` all work
- [ ] Escape or `✕` closes terminal
- [ ] Skill bars animate from 0% on scroll; hover expands description
- [ ] Project hover slides in MockPreview wireframe
- [ ] Sanity fetch returns 200 in Network tab (when configured)
- [ ] Sanity unreachable → site shows defaults, never blanks
- [ ] External links use `rel="noopener noreferrer"`

---

## License

MIT

---

**Built by [Junior Jackson Lyimo](https://github.com/Junior-189)** — Software Developer, AI/ML Engineer, IoT Builder.
