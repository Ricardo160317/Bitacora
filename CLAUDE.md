# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Bitácora Diaria: a personal daily-planner PWA (Spanish UI) for a single user — agenda, tasks, habits, notes, goals, and a "future log". It has no build step: a Node/Express backend serves a single static HTML file that contains all the frontend HTML/CSS/JS inline.

## Commands

- Install: `npm install`
- Run: `npm start` (runs `node server.js`, default port 3000, override with `PORT`)
- There is no test suite, linter, or bundler configured. There is no `npm run build` — `public/` is served as-is.

Required environment variables (the server logs a warning and degrades gracefully if missing, but login/DB won't work):
- `APP_PASSWORD` — the single shared password for login (no per-user accounts).
- `SESSION_SECRET` — HMAC secret for signing the session cookie.
- `DATABASE_URL` — Postgres connection string (Railway-style; SSL is enabled automatically whenever this is set).

To develop locally against a real DB, set these three env vars (e.g. via a local Postgres instance or a Railway `DATABASE_URL`) before `npm start`.

## Architecture

**Backend (`server.js`)** — a small Express app, all in one file:
- Auth: single shared password (`APP_PASSWORD`) checked in `POST /api/login`, which sets a signed cookie (`sign`/`verify` using HMAC-SHA256 over `SESSION_SECRET`, no session store — the cookie itself carries `{exp}` and is stateless). `requireAuth` middleware protects `/api/state`.
- Data: one Postgres table `app_state` with a single row (`id = 1`) holding the *entire* app state as one `JSONB` blob. `GET /api/state` returns it, `PUT /api/state` overwrites it wholesale — there's no per-field or per-item persistence, no migrations system, and no multi-document model. `ensureTable()` creates the table and seeds the default row on server startup.
- Static files are served from `public/` after the API routes.

**Frontend (`public/index.html`, ~4800 lines)** — a single self-contained file: inline `<style>` block, then inline HTML, then one large `<script>` IIFE with no modules, no build step, no external frontend framework (vanilla DOM APIs, `document.createElement`/`innerHTML` string templates). The only external runtime dependency loaded dynamically is `tesseract.js` (via CDN, on demand) for OCR on photographed notes.
- Global `state` object is the single source of truth, shaped like `{ tasks, notes, agenda, habits, futureLog, goals, showDone }`. It's fetched whole via `GET /api/state` on load (`fetchState`/`applyState`) and pushed whole via `PUT /api/state` on every change (`scheduleSave` debounces 500ms, then `doSave` does the PUT). There is no local persistence (no localStorage) — by design, so every device sees the same data (see README).
- Navigation is a manual view-mode switch (`viewMode`: `day` / `week` / `month` / `future` / `bitacora` (journal) / `objetivos` (goals) / `notas`), toggled by `setViewMode()` which shows/hides DOM sections and re-renders via `renderAll()`. There's no router/URL state.
- Rendering is imperative: each domain has a `render*()` function (`renderTasks`, `renderAgenda`, `renderHabits`, `renderFutureLog`, `renderJournal`, `renderGoals`, `renderNotes`, etc.) that rebuilds its DOM subtree from `state` on every change. There's no virtual DOM/diffing — mutate `state`, call the relevant `render*`, then `scheduleSave()`.
- Domain constants near the top of the script (`AREAS`, `FUTURE_CATEGORIES`, `GOAL_PERIODS`, `DURATION_OPTIONS`) define the fixed vocabularies used across tasks/agenda/goals/future-log items — extend these when adding new categories rather than hardcoding strings elsewhere.
- The service worker (`public/sw.js`) cache-busts via `CACHE_NAME` version string (bump it, e.g. `bitacora-cache-v9`, when shipping changes to cached static assets) and explicitly never caches `/api/*` requests.

## Conventions

- User-facing text, comments, and commit-worthy strings in this codebase are in Spanish (the app is for a single named user, per `package.json`'s description).
- Since the whole app state round-trips as one JSON blob with no schema/migration layer, when adding a new state field, handle its absence defensively wherever it's read (see the normalization pass in `applyState()`, e.g. `state.habits.forEach(...)` filling in missing `days`) so existing stored rows without the new field don't break.
