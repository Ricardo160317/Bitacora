# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Bitácora Diaria: a personal daily-planner web app (agenda, tasks, habits, notes, goals, journal) for a single user, in Spanish. It's a Node/Express server backed by Postgres, serving a single-page vanilla-JS frontend. No build step, no frontend framework, no bundler — the whole client app is one HTML file.

## Commands

```bash
npm install     # install server dependencies
npm start        # run the server (node server.js), serves on $PORT or 3000
```

There is no test suite, linter, or build step in this repo. Required env vars for the server to function: `APP_PASSWORD` (shared login password), `SESSION_SECRET` (HMAC signing key for session cookies), `DATABASE_URL` (Postgres connection string). Without them the server still starts but logs warnings and login/data endpoints won't work correctly. Run locally against any reachable Postgres instance by setting these three env vars before `npm start`.

To iterate on the frontend, just edit `public/index.html`/`public/sw.js` and refresh the browser — the server serves `public/` as static files with no build/transpile step.

## Architecture

**Backend (`server.js`, ~150 lines):** a thin Express app with almost no business logic. It has exactly two data endpoints:
- `GET /api/state` — returns the entire app state as one JSON blob
- `PUT /api/state` — overwrites the entire app state with the JSON body

State is stored as a single JSONB column (`app_state` table, always `id = 1` — one row for the one user). There's no per-entity CRUD API; the client owns all state shape/logic and just round-trips the whole document. Auth is a shared password (`APP_PASSWORD`) compared to a signed, expiring cookie (HMAC-SHA256 over a base64url JSON payload, verified with `crypto.timingSafeEqual`) — no user accounts, no session store, no external auth library.

**Frontend (`public/index.html`, ~4800 lines: markup + `<style>` + `<script>` all in one file):**
- Single IIFE, no modules, no framework. One in-memory `state` object (`tasks`, `notes`, `agenda`, `habits`, `futureLog`, `journal`, `goals`, `top3`, `showDone`) is the source of truth, loaded via `fetchState()`/`applyState()` on boot and pushed back via `doSave()` (debounced through `scheduleSave()`, 500ms) on every mutation.
- Rendering is manual/imperative, not reactive: each screen area has its own `renderX()` function (e.g. `renderAgenda`, `renderTasks`, `renderHabits`, `renderMonthView`, `renderFutureLog`, `renderJournal`, `renderGoals`, `renderNotes`). `renderAll()` dispatches to the subset of `renderX()` calls relevant to the current `viewMode`, and is called after every state mutation.
- Navigation is a single `viewMode` string (`"day" | "week" | "month" | "future" | "bitacora" | "objetivos" | "notas"`) toggled by `setViewMode()`, which shows/hides pre-existing DOM sections (`#board`, `#monthSummarySection`, `#futureLogSection`, `#bitacoraSection`, `#objetivosSection`, `#notasSection`, etc.) rather than mounting/unmounting anything.
- All event wiring happens once in `wireEvents()` (delegated listeners), called once from `bootApp()`.
- Auth flow: `init()` calls `fetchState()`; a 401 shows the login overlay (`showLogin()`), success calls `bootApp()` which wires events, sets the default view, and reveals `#appRoot` (`showApp()`).
- Notes support three input modes (`noteMode`: `write`/`draw`/`photo`) — free text, S Pen/canvas drawing, and photo capture with optional OCR via Tesseract.js (loaded lazily from a CDN via `loadTesseract()`, only when the user asks to recognize text in a photo).
- Theming is CSS custom properties on `:root`, switched via `prefers-color-scheme` and an optional `data-theme` override; no CSS framework.
- `public/sw.js` is a minimal service worker: cache-first for static assets, and explicitly never caches `/api/*` requests (so data is always fetched fresh across devices).

**Data model conventions worth knowing before editing:**
- Tasks/agenda entries carry an `area` field validated against the `AREAS` map (operación, mantenimiento, calidad, personas, administración, or none); future-log entries carry a `category` validated against `FUTURE_CATEGORIES`. `applyState()` sanitizes/defaults any field that doesn't match these maps or is missing (important when adding new fields — old stored documents won't have them).
- Incomplete tasks whose `day` is in the past get rolled forward to today on every load (`rolloverTasks()`), then saved back.
- Since the entire state is one JSONB blob with `PUT` overwriting it wholesale, there's no server-side merge/conflict handling — the last client to save wins.

## Notes

- All user-facing strings and comments in the existing code are in Spanish (the app is for a single named user, Freddy Hoyos); match that convention when adding UI text.
- Photos are compressed client-side (`compressImageToDataUrl`) before being stored in the state blob, to keep the single JSONB document from growing unbounded.
