# Preferences, Account Boundaries and Site Identity — 16 October 2026

## Scope and decision

The owner asked for the site name to be fully changeable, for the administration panel to be checked and for work to continue with the next package. The administration panel already existed: `/admin`, `/admin/users`, `/admin/courses`, `/admin/settings`. No copy of the panel was created. The link between the existing general settings and the site identity was completed, and the preference and cache scope of A11 and A14 was implemented.

The displayed product name is an administrator setting; the Git repository, the technical package and file names and the hosting domain are independent of it. No real local site name was chosen on the owner's behalf. A sample name was used only in the disposable browser fixture.

## Shared contract and migration

`packages/contracts` provides Zod 4 runtime schemas and derived types to backend and frontend. A single TypeScript source produces CJS and ESM output; they are not two separate implementations. The root dev, typecheck and test entries and the workspace build run the required contract build. Vite optimises the linked workspace with its own Zod major; `--force` at development start clears the old export cache. The frontend's other Zod 3/React Hook Form forms were not moved in bulk at that time.

Preferences v1: theme light/dark/system, a nullable `customPrimaryColor`, three notification preferences, Pomodoro, break and cycle defaults, daily and weekly goals in hours, active weekdays (0 = Sunday), language/time zone and `studyField`. A valid IANA time zone, hex colour, numeric limits and integers and unique days are validated. A patch rejects unknown fields and unsupported `schemaVersion` values. Storing the language field did not mean an English interface was implemented at that time.

The explicit `003-user-preferences-v1` migration converts the old `notifications`, `workGoals`, `studyGoals` and flat fields. Flat fields take priority; invalid or old values are kept with the source JSON in the `legacyPreferences` archive. An unknown future version or broken JSON stops the migration and the whole transaction rolls back. User identity, password hash and other rows do not change. New users get canonical v1 directly. Auth and administrator user responses return only the canonical fields; the archive JSON never reaches the API.

`/auth/profile` and the administrator user update merge partial preference patches by loading the current row inside an SQLite IMMEDIATE transaction. Concurrent writes to different fields are not lost; the last write wins for the same field. A general DTO conversion was not complete for every API.

## Client and user boundary

Personal preferences are persisted on the server and kept on the client only in the current account's memory. Saves are queued; the previous server confirmation is kept and success is shown only after the response is validated. Error and pending states are visible. An account generation check stops late responses and queued writes from moving to another account. The profile screens' direct `setUser` response path also moved to an epoch-checked `authStore` operation. Profile and preference HTTP writes share a transport queue. A monotonic preference revision stops a late, older refresh or profile snapshot from overwriting a newly confirmed preference on the same account; the ordered server confirmation of an explicit preference patch is authoritative for its own fields. The Layout is rebuilt on an identity change; form and timer UI state never move to the new account.

Old, user-independent browser preference and `readNotifications` values are never assigned automatically to a new account. They are archived in `unassigned-account-state` for manual recovery, and the application never reads or applies them. If the archive cannot be written, the source values are not deleted. The canonical preference in the database wins. New read notifications are stored under `read-notifications:<userId>` with at most 500 ids; corrupt data and storage events are handled. No notification delivery infrastructure was added in this package.

Theme and colour are applied by a single appearance layer; removing the custom colour returns to the site colour, and the system theme listens for OS changes. The new session form uses the personal Pomodoro defaults; an existing session's saved setting takes priority. The state and duration correctness of the two timer engines was not unified in this package.

Query keys carry the account id, resource and filter, the relevant date and, for sessions, the time zone through a single factory. Session writes invalidate that user's daily, weekly, Pomodoro, dashboard, activity and notification views through a shared prefix. Catalog writes refresh the list, detail and category scope; an old, wrong optimistic topic key was fixed. The current day key refreshes every 30 seconds and on focus; the weekly summary is derived again when the day changes. This does not solve the backend time-zone range and real-duration problems (A16/A09).

## Site identity and settings

`siteName`, `siteDescription`, `siteLogo` and `siteIcon` in the administrator's general settings were bound to the shared Brand, sign-in and registration, the sidebar, the loading screen, the document title, the description, application-name and `og:site_name` meta tags and the favicon. The initial HTML title is neutral; the single default product name lives in contracts. Old icon names are kept; safe HTTP(S) logo and icon URLs are accepted. The local icon SVGs were generated from the existing Lucide set with its licence kept next to the assets. No hidden rename or domain change happens.

`GET /settings` returns only the allowed public branding DTO. `GET /settings/admin` and `PUT /settings` require an administrator, and private data is never written to the persistent browser cache. The old public `/settings/category/:category` path was removed. Settings patches are validated entirely against the shared schema and written in a single transaction; internal error details never reach the response. Unknown existing database settings are not deleted and not exposed through the API.

The public branding cache contains no personal data. Page start, focus and a 60-second refresh on a visible page bring site changes; a late old GET cannot overwrite a newer save. An administrator's save shows immediately on the same client. A CSR metadata change is not a server-side SEO rendering service.

A18 was not fully closed at that time: server enforcement of `allowRegistration`, `maintenanceMode`, `sessionTimeout` and some notification and capacity settings was later work. The public/administrator separation, allowed types and atomic writes were completed in this package.

## Verification and operations

A clean `npm ci` passed. The last `npm run check`: **3 contracts + 52 backend + 31 frontend = 86 tests**, nothing skipped; strict type checks, lint with zero warnings, naming and two production builds passed. The lock audit was still 12 package nodes (5 high / 7 moderate); the earlier dependency backlog was open. No remote CI, deployment, commit or push was made.

Tests: converting old JSON with the archive and repeating the migration; a full rollback on an unsupported version; a round trip of every preference; concurrent user and administrator patches and account isolation; rejecting invalid data; the public/private settings matrix and rollback on an intermediate upsert error; queued, failed and late client saves; a late profile or administrator response, an old refresh snapshot on the same account and ordered real HTTP profile writes from different calls; the user, date and time-zone query scope; midnight and notification separation; preserving browser data whose owner is unknown.

Browser: a separate `127.0.0.1:3001` frontend / `5003` API, a temporary SQLite database and two fixture accounts. Saving the site name, description and icon was verified on every surface; the dark theme survived a reload; the second account opened with its system preference and no administrator menu. A student's 35-minute Pomodoro preference appeared as 35 in the new session form. During testing, Vite mixing two different Zod majors and reading the new workspace export from an old cache were caught; workspace optimisation and a clean dev start fixed it. The fixture ran with its own separate Vite cache. The test account was signed out; tabs and servers were closed and the temporary database removed. This manual smoke test is not a full automated browser test.

The real local upgrade was done without resetting data for verification: the development processes were stopped; a `.local/before-preferences-<uuid>.sqlite` copy was made with the native SQLite API and checked for integrity and foreign keys; the explicit `npm run db:migrate` ran; identities, password hashes, sessions and table row counts were compared and preserved; a manual backup with the new schema (id 3) was taken. The copy's path is recorded in `.local/preferences-upgrade-2026-10-16.json`; both are Git-ignored and private. No reset, restore or seed was run. The current local server was started, and the dashboard and general settings were verified read-only with the preserved real administrator session. Backups with the earlier schema were kept as files; the current restore schema check rejects them. Using an old backup first requires a compatible version or a controlled migration on a separate copy; no silent schema conversion happens during a restore.

Visual evidence is outside the repository in the same Codex artifact folder: `site-identity-settings.jpg`, `preferences-persisted.jpg`, `personal-pomodoro-default.jpg`. All contain fixture data.

## Next scope at that time

A07/A08 atomic time overlap and a shared StudySession state machine; A09 separating planned and real duration; A16 time-zone ranges; A10 the other multi-step deletions and orderings. Then a single timer and planner engine, A17 administrator aggregates, the rest of A18, dependency upgrades, automated browser and accessibility tests and recovery operations.
