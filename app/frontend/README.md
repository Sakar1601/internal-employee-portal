# Frontend

React 19 + Vite. Three pieces share one design system ([`src/styles/tokens.css`](src/styles/tokens.css)):

- **The app** (`src/`), organised by feature:
  - `features/auth`, `features/directory` (timeline, sortable table, dialogs, CSV), `features/activity`, `features/demo` (demo banner)
  - `shared/ui` (modal, toasts, theme toggle), `shared/layout`, `shared/lib` (formatting, theme, department colours)
- **The API seam** (`src/api/`): the only thing the UI imports for data.
  - `index.js` picks the transport at build time: HTTP to the real backend by default, the simulator when `VITE_DEMO=true`.
  - `http.js` is the live transport; `simulator.js` mirrors the backend's routes, auth, validation and ordering in the browser.
  - `activity.js` records each call (secrets redacted) for the Activity page.
- **The project site** (`src/site/`, demo build only): Overview, an animated architecture diagram, and *Watch it deploy*, a replay of the runbook driven by `deployScript.js` (the scripts' own messages). The bundler drops it from the real build.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :5173, proxying `/api` to `localhost:8000` |
| `npm run build` | Production build of the real app into `dist/` (served by the backend) |
| `npm run build:demo` | The whole demo site (project pages + simulated portal) into `dist-demo/`, hash-routed, relative paths |
| `npm test` | Vitest: simulator contract, seam in both modes, formatting |
| `npm run test:e2e` | Playwright against `dist-demo/` (run `build:demo` first; needs `npx playwright install chromium`) |
| `npm run lint` | ESLint |
| `node scripts/make-brand.mjs` | Regenerate touch icon, OG image and README banner |
| `node scripts/capture-screenshots.mjs` | Recapture README screenshots from `dist-demo/` (needs Playwright's Chromium) |

The demo routes with the URL hash and uses relative asset paths, so it can be hosted under any sub-path.
