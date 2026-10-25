# First Improvement Package — 15 October 2026

## Authorisation and scope

The owner asked to start implementing the technical review's recommendations and to keep code, file and folder names in English. This package addresses the development baseline and some critical access and data-safety issues. It is not a resolution of every A01–A22 finding or a production deployment.

The source commit of the initial review was `90e13cc`. Earlier documentation changes were kept; no commit or push was made. Application and test files were created with English names. User-facing interface and data values were not translated; the hour and minute fields inside the chart were named `hours`/`minutes` because they are not persisted data.

## 1. Reproducible development

- Node 24.21.0 and npm 11.19.0; `.nvmrc`, `.node-version`, engine-strict and the `packageManager` field.
- The root `package-lock.json` is no longer ignored; npm workspaces are managed with a single install.
- `npm run setup`: locked install → create a safe local environment only when missing → build. It never writes to the database.
- `npm run configure` generates random independent JWT secrets and creates `.env` with 0600 and `wx`. It never changes an existing file.
- Vite 5 → 8.3.4 / plugin-react 6.1.2; ESLint 8 → 10.12.0 / typescript-eslint 8.71.2.
- sqlite3 5 → 6.0.1; the old node-gyp/tar install chain was removed. Native script permissions are version-bound in the root `allowScripts`.
- Jest/ts-jest and the empty test command were removed; the backend uses the Node test runner and Supertest. tsx 4.23.15 replaced nodemon and ts-node. The frontend uses Vitest 5.0.4, Testing Library and jsdom.
- TypeScript pinned at 5.9.3; the React 18, Recharts 2, Router 6 and Tailwind 3 compatibility upgrades were later work. No claim that every package moved to its newest version.

## 2. Build and code base cleanup

The frontend's 50 TypeScript errors were fixed without disabling strict, `exactOptionalPropertyTypes` or the unused checks. The missing `canvas-confetti` types were added, and real optional-field checks were made. Unused imports and parameters and meaningless assignments were cleaned up; no ESLint disable or `ts-ignore` was added.

Seven modules confirmed unreachable by a static import scan were removed: AdminScheduleManager, CourseManagementModal, AddTopicModal, EditTopicModal, GoalSettingModal, AdminCategoriesPage and the `pages/courses/CoursesPage` placeholder. The old JS seed, setup and database-setup scripts, the debug, drop and list scripts, debug output, an invalid MongoDB development prompt and an account list were removed. History remains in Git.

The unused express-validator, winston, tailwind-merge and devtools were removed; the Tailwind build plugins moved to devDependencies. The old fixed demo account details on the sign-in page were removed.

## 3. Server and schema lifecycle

`app.ts` exports the HTTP application; importing it starts no listener or scheduled job. `index.ts` owns database and schema validation, listen and scheduled jobs, and controlled shutdown. This separation makes real HTTP tests independent of the user database.

A central environment schema rejects missing, weak, example or identical JWT secrets; there is no fixed fallback. Durations, port, HTTP(S) origin and rate limit values are validated. CORS comes from `FRONTEND_URL`; the default API port is 5002. Secret and value contents are never copied into diagnostic messages.

Dropping tables and `sync` at server startup were removed. The explicit `db:migrate` records the `001-initial-schema` baseline in `schema_migrations`. Compatible existing tables are kept, and a missing column requires a dedicated migration. The baseline uses a transaction and never alters for future model changes automatically. This command was not run on the real user database.

The development seed runs only in development with an explicit administrator identity and password and never logs the password. It uses `findOrCreate` and a transaction for new accounts and categories. In this package the CLI seed was not run on real data; idempotency was assessed at the source level, with no migration rehearsal across every variant of existing data.

## 4. Access and data-safety fixes

- A shared `visibleCourseWhere`: owner, global or administrator. Lists, details and topic parent joins use this policy.
- `/users/:id` is limited to self or administrator; a foreign resource gives 404.
- For a new session, besides plan ownership, record and topic visibility, active status and topic-record consistency are validated. Ids must be positive integers. When only a topic is chosen, the visible parent record is resolved.
- The GET session list no longer changes status or notes. An automatic timeout policy must be designed as a new operation or service; the frontend's old "the backend will cancel it" comments were to be updated in the later planner refactor.
- Debug logs that printed request bodies and parameters and whole record contents were removed.
- The error handler produces Sequelize validation → 400 and unique/foreign key → 409 instead of the old MongoDB codes and never gives the internal error text to the client.
- Backups use the same `DB_PATH` source. A temporary database snapshot was opened and its user count verified. Live copying, atomic restore with rollback and reset transactions were not solved yet at this point.
- An explicit time zone and `noOverlap` were added to the scheduled job; the real-interval issue of `*/5`/`*/7` and rescheduling on a setting change were still open.

## 5. Frontend loading and the account boundary

- Route lazy loading with Suspense; a root ErrorBoundary with a recovery screen. Source maps are off in the production build.
- The QueryClient lives in a single module; the cache and in-flight queries are cleared when the auth identity changes. It was tested that a late query from the first account does not overwrite the second account's data.
- This cache fix is not a complete solution for a user and date query key factory, personal preferences and `readNotifications` storage or refresh state races.
- The API default is `/api`; it fits the same-origin flow with the Vite proxy in development and a reverse proxy in production.

## 6. Verification

A clean `npm ci` passed. Then `npm run check` ran naming, type checks for both workspaces, lint with zero warnings, tests and the production build.

Backend, 22 tests: an owner/other/administrator matrix over real HTTP and a temporary SQLite, login and issued tokens, relation validation, side-effect-free GET, repeated non-destructive connection and migration, the correct snapshot path; plus environment and safe database error responses.

Frontend, 5 tests: the ErrorBoundary when healthy and on a crash; account switch and logout, and an old response not overwriting the new cache. No tests were skipped. A GitHub CI workflow was added; no remote GitHub run was made.

The production build was opened in a browser with a temporary backend and account independent of the user database. Sign-in → dashboard → weekly and daily planner were verified. This check is a desktop smoke test with an empty fixture; it does not cover moving sessions, real study time, mobile or keyboard use, or full browser tests. The temporary tab and server were closed and the database removed.

### Bundle measurement

The static import graph of the minified JS was followed and each file's gzip size computed separately. The dynamic load of the active route was included separately.

| Scope | JS bytes | Gzip bytes |
|---|---:|---:|
| Main entry, static imports | 424,182 | 142,359 |
| Main entry + sign-in route | 519,151 | 168,708 |
| Main entry + dashboard route | 816,755 | 247,417 |

At the start, the single JS file containing every page was 1,367.31 kB / gzip 381.61 kB. These new results are not network or Lighthouse measurements; caching, server compression and later page loads also matter. The shrinking of the main entry file alone must not be presented as the whole first-screen load.

### Dependency audit

`npm audit` on the current lock: **12 affected package nodes; 0 critical, 5 high, 7 moderate**. Because the initial audit came from separate manifest resolutions, no direct percentage comparison is made. A package node is not a unique CVE or a verified attack.

Open direct sources: @tailwindcss/typography, Tailwind, react-router-dom, Sequelize; transitive UUID and CSS/glob chains. The old React and Recharts and other major upgrades are also tracked explicitly. No forced audit fix was applied without compatibility tests.

## Conditions for continuing

The next package should work on auth refresh, logout and password revocation and on reliable backup, restore and reset. The session's atomic overlap, state and real-duration model, Preferences and time zones and a single planner and timer engine continue with separate acceptance criteria. The current findings table is in `progress.md`.

No migration, seed, reset or restore and no real account or secret changes were made on the owner's existing environment or data. No commit, push or deployment was made. These limits are kept apart from completed work.
