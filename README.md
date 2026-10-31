<div align="center">

# Study Tracker

**Plan your study time, focus with a server-backed Pomodoro timer and follow progress built on measured time, not guesses.**

[![CI](https://github.com/ozcelikcode/ders-takip/actions/workflows/ci.yml/badge.svg)](https://github.com/ozcelikcode/ders-takip/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Node.js 24](https://img.shields.io/badge/node-24.21-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)

</div>

Study Tracker is a self-hosted web application for anyone who works toward goals in blocks of focused time: school and exam preparation, work projects, personal goals or practising a skill. The words the interface uses (course/topic, project/task, goal/step, skill/exercise) are configurable, the interface is available in English and Turkish, and every number on the dashboard comes from time the server actually measured.

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Testing](#testing)
- [Project structure](#project-structure)
- [How it works](#how-it-works)
- [Deployment notes](#deployment-notes)
- [Documentation](#documentation)
- [License](#license)

## Features

**Planning**
- Daily and weekly planner with drag to move (15-minute steps), resize (5-minute steps), keyboard creation and native time fields as an accessible alternative.
- Weekly routines: the same session on chosen weekdays, with an optional end date. Changing a single occurrence makes it your own; editing the routine only rebuilds untouched future sessions.

**Focus and measurement**
- Persistent Pomodoro timer stored on the server: closing the window or reloading never pauses it, and every tab shows the same clock.
- Study, break and pause time are measured as separate intervals; totals never invent time for sessions that were not tracked.

**Progress and insight**
- Daily and weekly goals plus a weekly target per record, compared with measured time.
- Statistics by category and record over any range, a weekly chart with a screen-reader table, and recommendations.
- Tags on records and sessions, with tag filters in the planner and statistics.
- Global search that ignores case and Turkish letter forms ("istanbul" finds "İstanbul").

**Personalization**
- Vocabulary presets and custom words, kept per language.
- Time zone, week start, light/dark theme and accent colour per account.
- A short welcome wizard that shapes a new account to its purpose.
- "Go to page" palette (<kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd>) for every page and settings tab.

**Stay in sync**
- Private calendar subscription (iCalendar feed) for Google Calendar, Apple Calendar and Outlook.
- Optional email and browser push reminders.

**Accounts and data**
- Download all of your data as JSON, load it into a new account on another site, or delete your account with your password.
- Password reset by email, or by a one-time link an administrator hands over when email is not configured.

**Administration**
- User management, shared catalog, site identity (name, description, logo, icon) and site language.
- Verified SQLite snapshots with automatic retention, an optional second backup folder, restore and reset with a safety copy taken first.
- Sensitive actions ask for the administrator's password again, and every administration action is written to a hash-chained activity log kept outside the database.

## Tech stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite 8, TypeScript (strict), TanStack Query 5, Zustand 5, Headless UI 2, Tailwind CSS 4, Recharts 3 |
| Backend | Node.js 24, Express 4, Sequelize 6, SQLite, Zod 4 |
| Shared | `@study-tracker/contracts`: one TypeScript source for request/response schemas, built for Node (CJS) and the browser (ESM) |
| Time | Luxon with IANA time zones |
| Testing | Vitest, Testing Library, Node test runner with Supertest, Playwright, axe-core, Lighthouse |

## Getting started

### Requirements

- Node.js **24.21** (see `.nvmrc`)
- npm **11.19** (the only package manager; the root `package-lock.json` is authoritative)

### Install

```bash
nvm use
npm install --global npm@11.19.0
npm run setup
```

`setup` installs the locked dependencies, creates `backend/.env` with a random signing secret when it does not exist yet, and builds every workspace. It never overwrites an existing environment file or user data.

### Prepare the database

Schema changes always run as an explicit step:

```bash
npm run db:migrate
```

The server never creates, changes or drops tables at startup; it refuses to start while a migration is pending or the schema does not match.

### Create the first administrator

Store a strong password (12+ characters, at most 72 UTF-8 bytes) in a file only you can read, then:

```bash
chmod 600 /absolute/path/to/admin-password.txt
npm run admin:manage -- --mode create --email admin@example.com --username admin --password-file /absolute/path/to/admin-password.txt
```

`create` works only while no administrator exists. To recover a forgotten administrator password, run the same command with `--mode recover` and the account's email address; it signs that account out everywhere and changes nothing else. Never pass a password as a command-line argument.

### Run

```bash
npm run dev
```

| Service | URL |
|---|---|
| App | http://localhost:3000 |
| API health | http://localhost:5002/api/health |

The Vite dev server proxies `/api` to the backend.

<details>
<summary>Development sample data</summary>

No account with a default password is ever created automatically. To create sample categories and an administrator in development, add `ADMIN_EMAIL`, `ADMIN_USERNAME` and `ADMIN_PASSWORD` (12+ characters) to `backend/.env` and run:

```bash
npm run seed
```

The seed runs only in development, never resets existing accounts or records and never logs the password.

</details>

## Configuration

The backend reads `backend/.env` in development; production deployments provide environment variables instead. See [`backend/.env.example`](backend/.env.example) and [`frontend/.env.example`](frontend/.env.example).

| Variable | Description |
|---|---|
| `JWT_SECRET` | **Required.** Random, at least 32 characters. The server will not start with a missing, short or example secret. |
| `JWT_EXPIRE` | Access token lifetime, at most 15 minutes. Default `15m`. |
| `SESSION_TTL_DAYS` | Absolute session lifetime, 1–30 days. Default `7`. |
| `BCRYPT_SALT_ROUNDS` | Password hashing cost, 12–16. Default `12`. |
| `PORT` | API port. Default `5002`. |
| `FRONTEND_URL` | Allowed browser origin. Default `http://localhost:3000`; must be HTTPS in production. |
| `DB_PATH` | SQLite file, absolute or relative to `backend/`. Default `database.sqlite`. |
| `BACKUP_DIR` | Snapshot folder, absolute or relative to `backend/`. Default `backups`. |
| `BACKUP_COPY_DIR` | Optional second folder (another disk or a synced folder) that receives a copy of every verified snapshot. |
| `AUDIT_LOG_PATH` | Optional location of the administrator activity log. Default `admin-audit.jsonl` next to the database. |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS` | Production API rate limit. Default 100 requests per 15 minutes. |
| `TRUST_PROXY` | Number of reverse proxies in front of the API. Set `1` behind Caddy or nginx so rate limits and the activity log see the visitor's address. Default `0`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Optional SMTP delivery for password reset mail and email reminders. Any provider works; Mailpit is enough locally. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Optional Web Push keys. `npm run push:keys -- you@example.com` generates them. |
| `VITE_API_BASE_URL` | Frontend build setting. Default `/api`; set it only when the API is served from another origin. |

## Scripts

| Command | What it does |
|---|---|
| `npm run setup` | Install locked dependencies, create a local `.env` and build |
| `npm run dev` | Run the API and the frontend together |
| `npm run db:migrate` | Apply pending migrations |
| `npm run admin:manage` | Create the first administrator or recover one |
| `npm run backup:verify` | Restore the newest (or a chosen) backup into a temporary copy and check it |
| `npm run check` | Naming and interface-text checks, strict type checks, lint (zero warnings), all workspace tests and production builds |
| `npm run test:e2e` | Isolated browser tests in Chromium, WebKit and mobile Chromium |
| `npm run test:lighthouse` | Lighthouse measurements of the sign-in page and the dashboard |
| `npm run push:keys` | Generate Web Push keys into `backend/.env` |
| `npm run seed` | Development sample data |

## Testing

```bash
npm run check
```

`check` is the quality gate used in CI: ASCII naming for files and symbols, a guard that keeps interface text in the translation catalogs, strict TypeScript for every workspace and the browser tests, ESLint with zero warnings, all unit and integration tests, and production builds.

| Suite | Tool | Tests |
|---|---|---|
| Shared contracts | Node test runner | 46 |
| Backend (HTTP + SQLite, temporary databases) | Node test runner, Supertest | 209 |
| Frontend (components and screen flows) | Vitest, Testing Library, jsdom | 310 |
| Browser journeys and accessibility | Playwright, axe-core | 41 scenarios × 3 browsers = 123 runs |

```bash
npx playwright install chromium webkit
npm run test:e2e
npm run test:lighthouse
```

Every browser test starts its own server on a random loopback port with a fresh temporary database and synthetic accounts; it never touches `backend/.env`, a real database or a running dev server. Accessibility scans include WCAG 2.2 target sizes in light and dark themes. See [tests/e2e/README.md](tests/e2e/README.md) for the full scope and its limits.

## Project structure

```text
packages/contracts/   Shared Zod schemas and types (requests, responses, time, vocabulary)
backend/
  src/
    app.ts            HTTP application (importing it starts no server or job)
    index.ts          Startup, schema check, scheduled jobs and shutdown
    config/           Validated environment and file locations
    database/         Explicit, versioned migrations
    middleware/       Authentication, validation, confirmation and errors
    models/           Sequelize models and associations
    policies/         Shared visibility rules
    routes/           API routes
    services/         Business logic: sessions, measurement, catalog, backups, audit log…
    scripts/          Migration, administrator management and development seed
  tests/              HTTP and database regression tests
frontend/
  src/
    components/       Shared and feature components
    hooks/            Data and behaviour hooks
    i18n/             English and Turkish catalogs
    pages/            Route pages, loaded on demand
    services/         HTTP client and API modules
    store/            Authentication, site settings, preferences and language
  tests/              Screen-flow tests
tests/e2e/            Playwright journeys, accessibility scans and Lighthouse
scripts/              Local setup, naming and interface-text checks
memory-bank/          Architecture decisions, current state and implementation notes
```

## How it works

<details>
<summary><b>Shared contracts</b></summary>

Every request body, query and response the frontend relies on is described once in `@study-tracker/contracts`. The backend validates input with the same schemas, and the frontend parses responses with them. Errors are returned as stable codes, never sentences, and each interface language names them. Restart the dev processes after changing contract exports.

</details>

<details>
<summary><b>Authentication and sessions</b></summary>

The access token lives only in memory. The refresh credential travels only in an `HttpOnly`, `SameSite=Strict` cookie scoped to `/api/auth` (`Secure` in production) and rotates on every use; reusing a consumed credential revokes the whole session family. Signing out ends that session; a password change, a role or status change and administrator recovery end all of the account's sessions. Idle sessions expire after the site's idle limit. `/api/auth` requests require the `X-Requested-With: StudyTracker` header and an allowed origin. Concurrent 401 responses share a single refresh, and other tabs follow sign-in and sign-out through `BroadcastChannel`.

</details>

<details>
<summary><b>Measured time and time zones</b></summary>

A session's `duration` is the planned length. Study, break and pause are recorded as separate server-side intervals, and the dashboard, charts and goals use only measured time. Completing a session without starting it measures nothing; older sessions show as `untracked` or `partial` rather than receiving invented time. Calendars and forms work in the account's time zone, the API exchanges UTC/offset ISO instants, and day queries use strict local-day boundaries. Wall-clock times that do not exist or occur twice around a DST change are rejected in forms.

</details>

<details>
<summary><b>Planner and session writes</b></summary>

The daily and weekly views share one grid, card and command layer. Creating, moving, resizing and reactivating run in immediate transactions; overlaps are rejected with 409, and back-to-back sessions are allowed. Every change sends the `updatedAt` it read as `expectedUpdatedAt`; a stale version gets 409 and is never retried automatically. Each account has at most one running session.

</details>

<details>
<summary><b>Pomodoro</b></summary>

The server stores the phase, cycle, remaining milliseconds and the absolute deadline. `POST /api/study-sessions/:id/pomodoro` accepts `resume`, `pause`, `reset`, `complete` and `configure`; clients can never write the phase or the deadline. A break waits for the person unless automatic breaks are chosen, and work never restarts by itself after a break.

</details>

<details>
<summary><b>Backups and recovery</b></summary>

Snapshots use SQLite's online backup API and are checked for integrity, foreign keys, schema compatibility and a SHA-256 checksum, with a manifest stored next to each file (folder `0700`, files `0600`). Automatic snapshots are taken every 1, 5 or 7 full days and the newest 14 are kept; manual and safety snapshots are never pruned. With `BACKUP_COPY_DIR`, every verified snapshot is also copied to a second folder. A restore validates the source, takes a safety snapshot, restores inside a transaction, re-checks the schema and signs everyone out; if the final check fails it rolls back to the safety snapshot. Resetting either clears only the site settings or removes every non-administrator account and all study data, always after a safety snapshot.

</details>

<details>
<summary><b>Administrator security and activity log</b></summary>

Restoring a backup, both kinds of reset, changing a role, creating an administrator and deleting an account require the administrator's password on each request (`adminPassword`). A wrong password returns `400 wrongPassword`, is logged and, in production, is limited to 10 attempts per 15 minutes; the password is removed from the request after the check and stored nowhere.

Administration actions (administrator sign-ins, wrong passwords for administrator accounts, failed confirmations, setting changes by name only, backups, restores, resets, account creation, role, status and deletion, reset links) are appended to a JSON Lines file. Each entry carries the SHA-256 hash of the previous one, so changing, removing or reordering entries shows up in **Site settings › Activity log**. The log lives outside the database, so restoring a backup never rewinds it. Someone with write access to the server could still rewrite the whole file; keep a copy off the server for full protection.

</details>

<details>
<summary><b>Language and vocabulary</b></summary>

The interface language is one site-wide setting (English or Turkish), chosen by an administrator; emails and push notifications follow it. Stored data and the words people type are never translated. Vocabulary presets (General, Education, Goals, Skills) and custom words change only the displayed terms, never stored data or permissions; custom words belong to the language they were written in.

</details>

<details>
<summary><b>Data export and import</b></summary>

An account can download everything it owns as JSON, with the names of the shared records its data points at. Loading that file into an empty account maps every id to a new one, matches shared records by name and turns the ones the site lacks into the person's own records; measured intervals come over unchanged, and a session that was running at export time arrives paused from that moment.

</details>

## Deployment notes

The repository ships a container setup: [`Dockerfile`](Dockerfile) builds an `api` image (the backend, data under the `/data` volume) and a `web` image (Caddy serving the interface and forwarding `/api`, with automatic HTTPS, HTTP/2, compression and long-lived caching for hashed build files). [`compose.yaml`](compose.yaml) runs both.

```bash
cp deploy/.env.example deploy/.env      # set SITE_ADDRESS and JWT_SECRET
docker compose --env-file deploy/.env build
docker compose --env-file deploy/.env run --rm api node backend/dist/scripts/migrate.js
docker compose --env-file deploy/.env run --rm -v /absolute/path/to/admin-password.txt:/run/admin-password.txt:ro api \
  node backend/dist/scripts/manage-admin.js --mode create --email admin@example.com --username admin --password-file /run/admin-password.txt
docker compose --env-file deploy/.env up -d
```

Prove a backup can be restored at any time without touching the live database:

```bash
npm run backup:verify            # the newest verified backup
npm run backup:verify -- 12      # a chosen one
docker compose --env-file deploy/.env exec api node backend/dist/scripts/verify-backup.js
```

- Provide configuration through environment variables and use HTTPS for `FRONTEND_URL`.
- Route `/api` (including the public calendar feed under `/api/calendar/`) from your reverse proxy to the backend.
- Run a single backend process: backup, restore and scheduled-job coordination is per process.
- Behind a reverse proxy set `TRUST_PROXY=1` (the `api` image does), so rate limits and the activity log see visitors' addresses.
- Copy the `/data` volume, or at least `backups/` and `admin-audit.jsonl`, off the server regularly; `BACKUP_COPY_DIR` can point at a mounted second disk.
- Keep the server clock correct; the Pomodoro deadline and reminders rely on it.
- The Vite dev server is for development only.

## Documentation

| Document | Contents |
|---|---|
| [memory-bank/progress.md](memory-bank/progress.md) | Current state, roadmap and history |
| [memory-bank/systemPatterns.md](memory-bank/systemPatterns.md) | Architecture rules and patterns |
| [memory-bank/techContext.md](memory-bank/techContext.md) | Technical context and module map |
| [memory-bank/design-system.md](memory-bank/design-system.md) | Visual design system |
| [memory-bank/workingPrinciples.md](memory-bank/workingPrinciples.md) | Engineering working principles |
| [memory-bank/implementation/](memory-bank/implementation/) | Implementation notes per work package |
| [tests/e2e/README.md](tests/e2e/README.md) | Browser test setup, scope and limits |

## License

[MIT](LICENSE) © 2026 ozcelikcode
