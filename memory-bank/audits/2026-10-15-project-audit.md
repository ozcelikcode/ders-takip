# Technical Project Review — 15 October 2026

> This document is the starting snapshot before implementation. The current status of the fixes that began the same day is in `progress.md` and `implementation/2026-10-15-foundation.md`; the old paths, versions and line numbers below are historical evidence.

## Scope and conclusion

Reviewed Git state: `90e13cc5b58bdc36be07663fa949d2f7b2834e37`; the last commit was on 1 January 2026. The working tree was clean when the review began. The six memory-bank files and `AGENTS.md` were read; manifests, configuration, the source inventory, import relationships and critical backend and frontend flows were reviewed. The backend and frontend sources had 87 TypeScript/TSX files, 20,361 lines and 181 occurrences of `any`. These are not a quality score; they show the size of the maintenance surface.

**Assessment:** a broad product prototype exists; security, data integrity, contracts and quality checks do not support a claim of production readiness. A reliable foundation must be built before returning to feature work. Continuing from the existing code in a controlled way is appropriate; no evidence was found that requires a complete rewrite.

This work did not change application behaviour. It did not connect to the real database, and no seed, reset, restore or schema-changing commands were run. Dependencies were installed with lifecycle scripts disabled. The runtime state of the SQLite native component and the live interface and end-to-end behaviour were not verified.

## Evidence levels

- **Direct verification:** the compiler, lint and test commands, bundling, the real Joi schema and deterministic path resolution.
- **Controlled controller experiment:** the real compiled controller functions were called with fake users and records and in-memory model stubs. This shows gaps in the control flow; it is not a real HTTP and database integration test.
- **Static finding:** behaviour and missing checks visible in the source. Concurrency, mobile interaction and interruption scenarios must be run separately.
- **Recommendation:** not implemented; to be handled as later work together with its acceptance criteria.

P1: a serious bug in user data, security or a core flow. P2: an important functional correctness and maintenance issue. P3: an improvement after the core issues are closed. Priorities are not CVSS.

## Checks run

Environment: Node `24.21.0`, npm `11.19.0`. Because the repository had no lock file, the results belong to the dependencies resolved from the manifest ranges on 15 October 2026; no claim is made that they match the previous developer's installation.

| Check | Result |
|---|---|
| `npm install --ignore-scripts --package-lock=false --no-audit --no-fund` | Passed; 840 packages added. Deprecated dependency warnings were shown. |
| `npm run build:backend` | Passed; no TypeScript errors. This is not a server run test. |
| `npm run build:frontend` | Failed; 50 TypeScript errors, it never reached the Vite stage. |
| `npm run lint` | No ESLint configuration found in the backend; it did not continue to the frontend. |
| `npm run lint:frontend` | Run separately; no ESLint configuration here either. |
| Backend Jest command | No tests found, exit code 1. The repository had no test files. |
| Vite bundling only, output under `/tmp` | Passed; this does not mean the official frontend build passed. |
| Bundle size | JS 1,367.31 kB, gzip 381.61 kB; CSS 87.52 kB, gzip 13.05 kB. JS sourcemap 5,770.45 kB. |
| Controller, schema and path experiments | Unauthorised reads, missing relation validation, a missing overlap check on update, the preference schema rejecting valid input and the backup path mismatch were confirmed. |

Distribution of the frontend errors: 37 unused variables or imports (`TS6133`), 1 unused type (`TS6196`), 2 possibly undefined values (`TS18048`), 5 optional field assignment mismatches (`TS2412`), 1 non-existent `toast.info` API (`TS2339`), 2 missing `canvas-confetti` type declarations (`TS7016`) and 2 optional prop or argument mismatches (`TS2375`, `TS2379`). The errors were not purely cosmetic.

## Understanding the existing architecture

- npm workspaces: `backend` and `frontend`; a single repository and a single deployable application.
- Backend: Express 4, TypeScript, Sequelize 6, SQLite. Eight models: User, Category, Course, Topic, Plan, StudySession, Settings, Backup.
- Categories were global in the code and writable by administrators. Records were personal or global; topics belonged to a record. Sessions and plans belonged to a user. The earlier memory bank's description of personal categories was inaccurate.
- Controllers combined HTTP, permissions, business rules and ORM access. There was no separate business-rule or service layer.
- Frontend: a React 18 SPA; React Router 6, TanStack Query 5, Zustand 4; React Hook Form and Zod 3 in forms. The backend used Joi and Zod 4 together.
- Drag and resize were implemented separately in the daily and weekly calendars. The modal Pomodoro and the separate Pomodoro page had two different timer engines.
- Global settings lived in a key/value table and personal preferences in the `User.preferences` JSON field. Frontend and backend had no shared contract for this JSON.
- `App.tsx` imported pages directly; there was no route lazy loading and no React ErrorBoundary. The documentation's claims of these features could not be accepted as implemented.

## P1 findings

### A01 — Missing ownership checks when reading private records

**Basis:** `backend/src/controllers/courseController.ts:63`, `:87`, `:299`; `topicController.ts:5`, `:53`; `userController.ts:65`; `backend/src/routes/users.ts:19`.

The record list applied a user/global filter, but a single record and its topics were read by id without any ownership filter. The topic list and topic detail were not limited per user either. `/api/users/:id` could return another user's email and preferences to any signed-in user. The password was removed from the response; that did not prevent other personal fields from being exposed.

**Experiment:** as user 1, querying user 2's private record returned 200 from the controller. Another user's detail also returned 200; the topic list query had no user or record visibility scope.

**Fix:** one visibility policy for records: owner, global or administrator. Topic access derives from the parent record's visibility. User detail is limited to self or administrator, and response fields are selected with an explicit DTO.

**Acceptance:** test the access matrix on every list, detail and relation endpoint with two students and one administrator. One student's private record must never appear in any list or detail for another student.

### A02 — Authentication continues with a fixed secret when configuration is missing

**Basis:** `backend/src/index.ts:10`; `backend/src/scripts/seed.ts:32`; `backend/src/utils/jwt.ts`.

Without `JWT_SECRET`, fixed secrets from the source were used, with no production exception. In this configuration a validly signed token could be created for an account with a known user id. Because the middleware reads the role from the database, changing the `role` claim alone did not escalate privileges; the risk was impersonating a known user id. A missing `JWT_REFRESH_SECRET` on its own was not validated at startup either. The seed used a default administrator password and logged it.

**Fix:** a startup schema for mandatory, sufficiently strong secrets; refuse to start on missing or invalid settings. Limit the demo seed to an explicit development environment; require explicit credentials for a real administrator setup and never log the password.

**Acceptance:** production startup must fail with missing or weak settings, with no silent fallback. If a verified deployment is found to use these secrets, the secrets and sessions must be rotated.

### A03 — Backup and the application target different database files

**Basis:** `backend/src/config/database.ts:4`; `backend/src/controllers/backupController.ts:7`, `:51`, `:108`.

The database was `backend/database.sqlite`; the controller's path was `database.sqlite` at the repository root. The mismatch occurred in both the `src` and the `dist` layouts. Without a file at the root the backup failed; with one, a file other than the application's active data was backed up or restored over. The path mismatch was confirmed by a deterministic experiment.

**Fix:** one absolute database path derived from configuration; backup and restore must use this source.

**Acceptance:** write a marker row to a temporary test database → take a backup → change the row → open the backup as a separate database → verify the row. The same result must hold in development and in the compiled build.

### A04 — Backup and restore carry no consistency or recovery guarantee

**Basis:** `backupController.ts:48`, `:51`, `:108`; `backend/src/index.ts:151`.

The open database was copied with `fs.copy` without coordination. On restore the live connection was closed and not reopened after a copy error. New requests were not stopped; there was no integrity check on a temporary file, no atomic replacement and no rollback on failure. No supervisor that would restart the process after `process.exit(0)` was defined in the repository. Backup metadata was written to the same database after the snapshot; the consistency of a restored file with the catalog was not designed.

The cron setting was read only at startup. `*/5` and `*/7` divide days of the month; they do not mean every five or seven days continuously. The interval changes at month boundaries, and changing the setting from the UI did not reschedule the running job. No time zone was defined explicitly.

**Fix:** a snapshot based on the SQLite online backup API or a suitable `VACUUM INTO`; integrity verification, a single-operation lock, a maintenance flow for restore and error recovery. Track the interval with `lastSuccessfulBackupAt`/`nextRunAt`; a setting change must update the schedule. Source: [SQLite Backup API](https://www.sqlite.org/backup.html).

**Acceptance:** verify active writes, concurrent backups, corrupt files, missing files, copy errors, process restarts and month boundaries separately. Once RPO/RTO targets are set, run a real recovery drill.

### A05 — A list request changes session state and user notes

**Basis:** `backend/src/controllers/studySessionController.ts:18`.

The GET list set every `in_progress` row whose end time had passed to `cancelled` and overwrote the `notes` field with automatic text. Reading statistics, the notification query and the five-second Pomodoro polling could trigger this too. When the business rule ran depended on someone opening a page; a note the person had written could be lost.

**Fix:** reads must have no side effects. Timeout must be a separate, idempotent state transition; a system reason must be stored apart from the person's note. What happens when a session passes its planned end must be defined as a product rule.

**Acceptance:** repeated GET requests must not change a row's status or notes. Running the timeout operation twice must give the same result.

### A06 — Related record and topic choices are not validated against the user's access

**Basis:** `studySessionController.ts:212`, `:259`.

When creating a session the plan's owner was checked, but there was no check of record visibility, topic-record consistency or active status for `courseId` and `topicId`. A user could link their own session to another user's private record or topic and read those resources' fields through `include`. The foreign key only protects the existence of the row.

**Experiment:** the controller path creating a session for user 1 linked to user 2's private record and the given topic returned 201; no query for record or topic access ran.

**Fix/acceptance:** validate every relation inside a single business rule. Reject another person's private record, a topic from the wrong record and inactive resources; test a global record as a valid case.

### A07 — No overlap check when moving a session; the create check is not atomic

**Basis:** `studySessionController.ts:227`, `:357`; `frontend/src/components/planner/WeeklyPlanner.tsx:316`.

Creation had a check; updates saved the new times directly. A frontend check gives no guarantee for API calls or concurrent user interactions. There was no transaction or serialisation between the check and the insert on create; two requests for the same range could pass the check together.

**Experiment:** a time update ran only a single query that found the target session; the controller returned 200 and there was no overlap query. The concurrent insert race was identified as a static risk and not tried on a live database.

**Fix/acceptance:** a shared range rule for create and move, atomic writes and an explicit 409. Choose a workable transaction or serialisation approach for SQLite; if PostgreSQL is chosen, evaluate a suitable database constraint separately. A start exactly equal to an end is valid; test partial and full overlap and two concurrent requests.

### A08 — The general update endpoint bypasses the state machine

**Basis:** `studySessionController.ts:375`, `:496`, `:562`, `:623`; `routes/studySessionRoutes.ts:69`.

The start and pause endpoints checked transitions, while the general PUT could assign any valid status. When a completed session was planned again, `completedAt` was not cleared. Complete ignored the previous state and changed `completedAt` when repeated. The rules for multiple running sessions were not defined either.

**Fix/acceptance:** an explicit transition table with a single server-side implementation; define terminal states, reopening and retry behaviour. Detect stale client writes through the current version/`updatedAt`. Reject disallowed transitions on every endpoint.

### A09 — Planned duration is reported as real study time

**Basis:** `studySessionController.ts:505`, `:623`; `backend/src/controllers/planController.ts:282`; `frontend/src/components/dashboard/WeeklyProgressChart.tsx:69`.

Starting did not record the real start. Pause and resume intervals were not kept. Complete recorded the planned `endTime − startTime` difference in both branches; an hour-long plan completed after five minutes counted as an hour of study. Plan statistics also added the durations of uncompleted sessions to the total study hours. There was no metric separation for break types.

**Fix:** separate planned time from the work record: scheduledStart/End plus real work intervals, or startedAt/pausedAt/accumulatedActiveSeconds. Completion time and state transitions are computed on the server. Existing `duration` values must not be converted as if they were measured real time; the historical uncertainty stays explicit.

**Acceptance:** for a 60-minute plan → work 5 minutes → 3-minute break → work 5 minutes → complete, 10 minutes of study and 3 minutes of break must be measured. Test early finish, midnight, repeated complete and network loss.

### A10 — Multi-step delete and reset operations are open to partial data loss

**Basis:** `backupController.ts:71`; `courseController.ts:288`; `categoryController.ts:180`; `topicController.ts:449`; `models/index.ts:15`.

`settings_only` deleted sessions, plans and topics; it tried to delete categories without deleting records. With existing records the RESTRICT relation could make the operation fail at that point, and the earlier deletions remained because there was no transaction. Although the name suggests settings only, study history was deleted. Record deletion, category moves and topic ordering used no transactions either; the transaction mentioned in the ordering comment did not match the real code.

**Fix/acceptance:** define each operation's data scope explicitly; apply dependency order and transactions. A target category cannot be itself. With an error injected at every stage, earlier data must be kept. Before a reset there must be a verified snapshot to return to and a clear preview of the scope.

### A11 — User preferences are incompatible between frontend and backend

**Basis:** `frontend/src/store/userPreferencesStore.ts:8`, `:77`; `backend/src/utils/validation.ts:134`; `backend/src/models/User.ts:18`.

The frontend sent `theme: system`, flat notification fields, dailyStudyGoal/weeklyStudyGoal and Pomodoro fields. Joi accepted only light/dark, nested notifications and studyGoals. The model used workGoals instead. The frontend saved locally first and wrote a failed server sync only to the console. Preferences looked saved, but persistence was not ensured.

**Experiment:** the real Joi schema rejected all three payloads: `{theme:'system'}`, `{theme:'dark',defaultPomodoroDuration:25}` and the model-shaped `{theme:'dark',workGoals:...}`.

**Fix/acceptance:** a single Preferences contract, a versioned conversion for the existing JSON, an explicit saving and error state. Every preference must give the same result through update → sign in again → reload → read from another device or client.

### A12 — The frontend production build is broken; quality gates do not work

**Basis:** the table of checks run, `frontend/src/components/modals/EditTopicModal.tsx:128`, the workspace `package.json` files.

There are 50 compiler errors; no ESLint configuration, test files, CI workflow or frontend test command. The old progress document's claims that lint/Prettier, code splitting and every core feature were complete could not be verified.

**Fix/acceptance:** first fix the real build errors while keeping the existing strict settings; then set up a supported lint toolchain, behaviour-focused tests and CI. On a clean checkout, a locked install, type check, lint, backend and frontend tests and the build must pass in a single verifiable flow. Suppressing errors or `--passWithNoTests` cannot count as completion.

### A13 — Session revocation and the refresh lifecycle are missing

**Basis:** `authController.ts:148`, `:194`, `:323`; `utils/jwt.ts`; `frontend/src/store/authStore.ts:137`; `frontend/src/services/api.ts:47`.

Access and refresh tokens were in `localStorage`. Although the backend issued new ones after validating a refresh, there was no record, jti or token family to invalidate the previous refresh. Logout only returned a success response; a password change did not revoke old tokens. The `HttpOnly` cookie and secure rotation described in the documentation were not implemented. The refresh interceptor changed only `localStorage`; the in-memory Zustand tokens stayed stale, and a later store write could persist the old token again. There was no single-flight refresh for requests that got 401 at the same time.

**Fix/acceptance:** revocable sessions on the server with refresh reuse detection; a short access lifetime; a suitable `HttpOnly`/`Secure`/`SameSite` cookie design and CSRF checks that fit the deployment origin. On the client a single token source and a shared refresh promise. After logout or a password change the old refresh must be rejected; concurrent 401s must produce a single refresh; a finished session must not come back through a late response.

## P2 findings

### A14 — The query cache is independent of the user and the date

**Basis:** `frontend/src/main.tsx:12`; `authStore.ts:72`; `GoalsOverview.tsx:32`; `PomodoroPage.tsx:35`; `services/api.ts:70`.

The QueryClient lived for the whole application lifetime. There was no cache cleanup on sign-out, and personal query keys had no user id. Signing out of A and into B in the same browser could show A's fresh cache to B. Personal preferences and `readNotifications` also used user-independent `localStorage` keys. Daily queries had no date in the key; midnight or a week change could keep the old scope in some places. Mutation invalidations did not consistently cover the dashboard, the weekly chart and the other session keys.

**Fix/acceptance:** a query key factory: resource + user + normalised filter and date; cancelling in-flight queries and clearing the cache at the auth boundary; per-account `localStorage` scope. Test an A → B account switch, a late request from A, midnight and every summary updating after a session is completed.

### A15 — Two Pomodoro engines drive the timer with browser ticks

**Basis:** `frontend/src/pages/pomodoro/PomodoroPage.tsx:62`, `:78`; `components/planner/PomodoroTimer.tsx:57`, `:71`.

The timer counted down once per second; background-tab throttling and sleep could cause drift. At the end of a phase there were other state changes and side effects inside a state updater. Timer and phase state were not persistent; a reload or remount could restart the duration. The modal version restarted when the session object changed. The two implementations did not follow the same state rules.

**Fix/acceptance:** a single timer hook and domain engine; a deadline and accumulated active time, explicit phase transitions, a persistent session, reconnection and multi-tab ownership. Verify sleep and background, reload, closing the modal, page changes, phase zero and double completion with a fake clock and browser tests.

### A16 — Date ranges depend on the server time zone and the start time only

**Basis:** `studySessionController.ts:43`; `WeeklyProgressChart.tsx:60`; `frontend/src/store/userPreferencesStore.ts:29`.

`new Date('yyyy-MM-dd')` is the start of the day in UTC; `end.setHours` then uses the server's local time zone. A Europe/Istanbul user's sessions between 00:00 and 03:00 could fall outside the day range. Because only the `startTime` range was checked, the second-day share of sessions that cross midnight was wrong. The user's time-zone preference was not used in range calculations.

**Fix/acceptance:** transported times are UTC instants; day boundaries are produced in the defined user time zone. Ranges are `[start, end)`; intersection and splitting metrics across days are explicit rules. Test getting the same day result on Istanbul and UTC servers, a 00:30 session, an overnight session and, if supported, DST scenarios.

### A17 — Dashboard and administrator metrics use the wrong data contract

**Basis:** `frontend/src/pages/dashboard/DashboardPage.tsx:12`, `:29`; `pages/admin/AdminDashboardPage.tsx:12`, `:28`, `:34`; `backend/src/controllers/userController.ts:8`; `courseController.ts:34`.

The dashboard fetched records without topics and summed `topics.length`; it compared the category object with fixed exam-category strings. The administrator total user count showed the length of the default 10-person page. The administrator session total came from the shared user endpoint, and for administrators the backend returned only that administrator's own sessions. Records were filtered to active by default, so some totals were not totals of all data.

**Fix/acceptance:** server aggregate endpoints with a defined product meaning; administrator permission for global management metrics. Verify exact numbers with a fixture of 11+ users, personal and global records, sessions for 2 users and inactive rows. A failed fetch must not look like zero rows.

### A18 — Some administration settings are display values only

**Basis:** `frontend/src/pages/admin/AdminSettingsPage.tsx:320`; `frontend/src/store/settingsStore.ts:10`; `backend/src/controllers/authController.ts:6`; `backend/src/controllers/settingsController.ts:29`; `backend/src/routes/settingsRoutes.ts:10`.

`allowRegistration`, `maintenanceMode` and `sessionTimeout` were stored but not enforced in registration or request handling. The backup interval was read at startup. All settings were returned by an unauthenticated GET without category separation; no active secret exposure was confirmed that day, but security settings added later could leak through this API. Setting writes had no allowed key/type schema.

**Fix/acceptance:** separate a public appearance DTO from the administrator settings; supported settings need an explicit schema and server enforcement. A direct POST must be rejected while registration is closed; the maintenance scope and the administrator exception must be tested explicitly. An unenforced setting must not be presented as if it works.

### A19 — The error layer contains MongoDB leftovers

**Basis:** `backend/src/middleware/errorHandler.ts:19`, `:24`, `:29`; `backend/src/utils/validation.ts`; `backend/src/middleware/validate.ts`.

The central handler dealt with Mongoose `CastError` and the 11000 duplicate code; it did not classify `SequelizeValidationError`, `UniqueConstraint` and `ForeignKeyConstraint` correctly. An expected client error could become a 500, and the internal `error.message` could reach the response. The Joi middleware did not use the parsed value. Joi, Zod and manual checks did not behave the same, and ids and query limits were not validated systematically.

**Fix/acceptance:** error mapping suited to the current database, allowed error codes, shared request and response schemas, and passing validated values to controllers. Verify correct 4xx/5xx responses with internal details protected for a malformed id, an invalid duration, a duplicate name, a foreign-key error and an unexpected database error.

### A20 — No locked install and no safe setup lifecycle

**Basis:** `.gitignore:43`; root `package.json` `setup`, `install:all`; `backend/scripts/database-setup.js:1`, `:12`; `backend/scripts/seed.js:166`; `backend/src/scripts/seed.ts`.

Lock files were ignored; there was no `npm ci` baseline. The root install already installed the workspaces, yet two sub-installs ran as well. `setup` called a database script that needs the compiled `dist` before building. `database-setup` did not load the models; if the models were loaded in the same process, `force: true` could be destructive. Of the two seed implementations, the old JS version used a `category` string field while the current Course requires `categoryId`. The `DB_PATH`/`FRONTEND_URL` environment examples were not applied in the current code.

**Fix/acceptance:** a single package manager and lock file, a pinned supported runtime, a single idempotent seed and a migration command. Setup must never reset normal data. Try setup separately on a clean checkout and on a checkout with existing data; a second run must not change or delete data.

### A21 — Unused modules, oversized components and bundle weight

**Basis:** a reachability scan of static imports from `main.tsx`; `WeeklyPlanner.tsx` 1,404, `CreateSessionModal.tsx` 915 and `DailyCalendar.tsx` 765 lines.

Unreachable frontend modules: AdminScheduleManager, CourseManagementModal, AddTopicModal, EditTopicModal, GoalSettingModal, AdminCategoriesPage and the `pages/courses/CoursesPage.tsx` placeholder. These modules were still compiled by `tsc`, and some broke the build. They must not count as usable features. Direct package candidates with no source or config import: backend express-validator/winston, frontend tailwind-merge; their script and tool usage should be verified one last time before removal.

The daily and weekly calendars duplicated drag, resize, state, mutation and view rules. Pages loaded eagerly from a single entry; bundling produced 1.37 MB of JS. The route-splitting claim was wrong. Source maps were on by default, with no deployment policy. Debug and deletion scripts and a MongoDB development prompt sat alongside the active source. `users.txt` contained data resembling account credentials; the values were not copied into this report, and their real use or validity was not verified.

**Fix/acceptance:** remove unused modules after checking references; a single planner command layer with two views; a single timer engine; feature-based file boundaries. After route lazy loading and separating the chart weight, measure first-load JS under the same conditions. Test users must be explicit fixtures; if valid credentials are found, rotate them separately. Old code can be recovered from Git history; it must not be kept in the source as an alternative.

### A22 — Mobile, accessibility and error experience are unproven

**Basis:** the use of native `draggable` and mousemove/mouseup in WeeklyPlanner/DailyCalendar; `App.tsx`/`main.tsx`; fixed-height and overflow styles in the dashboard and layout.

Calendar interaction showed no equivalent drag or resize path for touch and keyboard. There was a modal move alternative; that is not enough to make the whole flow accessible. There was no evidence of an overall standard for icon buttons, focus management and reduced motion. There was no root ErrorBoundary; some query errors could be confused with an empty or zero view. Lighthouse, WCAG and mobile success percentages had not been measured.

**Fix/acceptance:** a pointer and keyboard interaction contract; accessible names, focus, reduced motion and separate error, empty and loading states. A real mobile viewport, keyboard-only use, accessibility scans and an end-to-end test of the main flow. No success score is written without measurements.

## Dependency security and support status

Because the repository had no lock, temporary lock files were generated for the audit from independent backend and frontend copies of the manifests. The versions of the direct dependencies were compared with the workspace install; there was no difference. Transitive hoisting was not assumed to be the same. The numbers belong to this re-resolution, not to the inventory of a past or production deployment. The same advisory can spread across several package nodes; the backend and frontend counts cannot be added up as a total of unique advisories.

| Resolution | Total affected package nodes | Critical | High | Moderate | Low |
|---|---:|---:|---:|---:|---:|
| Backend, all dependencies | 53 | 1 | 43 | 7 | 2 |
| Frontend, all dependencies | 19 | 0 | 13 | 6 | 0 |
| Backend, `--omit=dev` | 9 | 1 | 4 | 2 | 2 |
| Frontend, `--omit=dev` | 10 | 0 | 5 | 5 | 0 |

The backend critical node is `tar`, related to the sqlite3/node-gyp install chain. This result does not mean a critical attack verified over HTTP. The frontend `--omit=dev` list also contains Tailwind and plugin tools; being under `dependencies` in the manifest does not mean they run in the browser bundle. Reachability and the threat model must be evaluated separately. A direct `npm audit fix --force` is not recommended; the results of breaking upgrades must be tested.

Lifecycle checked against official sources:

- The manifest baseline was Node >=18; Node 18 is EOL. The Node 24 LTS line used in this review is a suitable migration target. [Node release schedule](https://github.com/nodejs/Release).
- Vite 5 is outside the supported lines. The supported stable line and the React plugin must be updated together. [Vite releases](https://vite.dev/releases).
- ESLint 8 is EOL. The current supported line, the TypeScript parser and plugin and flat config compatibility must be handled together. [ESLint version support](https://eslint.org/version-support/).
- React 18 is an older major; moving to the current React 19 must be planned together with Headless UI, drag and drop, chart and animation compatibility. [React versions](https://react.dev/versions).
- Recharts 2 printed a maintenance warning at install; a 3.0 migration guide exists. [Official migration guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide).
- Express 4 is still officially supported; it must not be called EOL just because it is an older major. Moving to Express 5 can be a modernisation decision and does not replace urgent security fixes. [Express support](https://expressjs.com/en/support/).

## Recommended architectural direction

The existing monorepo and a modular single backend are sustainable. The first problem is not a lack of microservices, Redis, an event bus or another framework; it is scattered business rules and missing validation.

1. **Contracts:** a single DTO and schema definition for Auth, Preferences, Course and StudySession; backend runtime validation and frontend types derive from the same source. Reduce the Zod/Joi duplication; clarify optional versus null, ids, times and error formats. OpenAPI can be generated from this contract.
2. **Business rules:** `auth`, `catalog`, `planning`, `study-tracking`, `settings` and `backup` modules. Controllers handle HTTP, services permissions and business rules, and the data layer atomic writes. Add only the boundaries that are needed; do not generate meaningless generic repositories for every model.
3. **Data:** separate plans from real work records. Add foreign keys, unique and check constraints and composite indexes that fit the query patterns, based on measurement. Single-column indexes already exist; "there are no indexes" is not true. Evaluate `(userId, startTime)` and `(userId, status, startTime)` candidates with the query plan.
4. **Frontend:** feature-based APIs, query keys and hooks; a single planner command engine with daily and weekly views; a single timer engine. Server state in Query, UI preferences in Zustand; apply a full personal cache boundary on auth changes.
5. **Appearance:** the current iOS/pastel direction could be kept as history; create shared Button/Dialog/FormField components and design tokens. A large visual redesign should not be a priority until the business rules are fixed.
6. **Operations:** central environment validation, structured logs that mask sensitive fields, request ids, readiness and liveness, draining connections on SIGTERM, a real restore test. If multiple instances and heavy concurrent writes become a goal, write down the reasoning and migration plan for PostgreSQL; SQLite itself is not obsolete technology.

## Plan for continuing and exit criteria

### 1. A reliable development baseline

- A single runtime and package manager and a tracked lock; current supported build and lint tools.
- Fix the 50 frontend errors while keeping strict mode. Remove unused modules after checking references.
- CI: clean install → type check → lint → behaviour tests → build.
- **Exit criterion:** the same result from a fresh checkout; failing checks are never skipped silently.

### 2. Security and preventing data loss

- A01–A07, A10 and A13: a permission matrix, fail-fast configuration, relational validation, side-effect-free GETs, atomic time and delete operations, working backup and recovery, and revocable sessions.
- **Exit criterion:** two-user isolation, rollback and restore tests on a separate temporary database must pass.

### 3. Product correctness

- A08–A09, A11 and A14–A19: the session state and duration model, a single Preferences contract, the auth and cache boundary, a shared timer, time zones and correct aggregate metrics.
- **Exit criterion:** the end-to-end flow register → record → plan → study → pause/resume → complete → correct report → sign in again must pass.

### 4. Maintenance, performance and usability

- Unify the duplicated planner code; route and chart splitting; mobile and keyboard verification; measured performance budgets; deployment and monitoring.
- **Exit criterion:** measured results and repeatable tests; "it seems to work" is not enough.

AI, social features, PWA/offline use, team collaboration and advanced analytics are not active development priorities until this foundation work is done. The product direction between education-specific content and general task tracking must be clarified before new features start; this review did not change that decision on the owner's behalf.

## Re-verification note

The problems in this report were **open** on the review date. Later work must update the finding id, the changed behaviour and the passing verification in `progress.md`/`activeContext.md`; this report is kept as the historical review. The live UI, real SQLite integration, concurrency load, a publicly exposed deployment and the validity of real user data are outside the evidence limits of this review.
