# Study Tracker — System Patterns

Verified against the source code on 18 October 2026 (A22 automated browser gate and the earlier contract, administration and planner packages), with later sections added as features landed. This document keeps current behaviour apart from the target standard. Current implementation records are in `implementation/2026-10-16-catalog-editing.md` and `implementation/2026-10-16-shared-planner.md`; the foundation record is historical.

## Current architecture

```text
React SPA
  ├─ Router → pages / planner / modal components
  ├─ TanStack Query → services/api.ts → services/httpClient.ts (fetch)
  └─ Zustand → in-memory auth; site settings and personal preference persistence kept separately
                         │ HTTP JSON / in-memory Bearer JWT + HttpOnly refresh cookie
app.ts middleware → routes → controllers → Sequelize → SQLite
  └─ policies/courseAccess.ts → owner/global/admin scope
index.ts → environment and schema check → listen / scheduled jobs / shutdown
                         │
                         └─ Backup service / periodic due check → native SQLite snapshot + manifest
```

Read controllers run ORM queries; write business rules are collected in the relevant services. The shared course access policy, auth sessions and administrator recovery, and backup and maintenance services are separate; StudySession HTTP writes moved behind a shared service boundary, and catalog HTTP writes behind `services/catalog.ts`. This simple modular single application can keep growing at this scale; none of the current problems require microservices.

## Data boundaries

- User → Plan, StudySession; these cascade when the user is deleted.
- User → Course; deleting the user sets `course.userId` to NULL.
- Category → Course; deleting a category is RESTRICTed. A category with a null `userId` is shared (managed by administrators); a non-null `userId` makes it personal (only the owner's own, non-shared records; names are unique among shared categories and per owner). Visibility has one definition: `visibleCategoryWhere` (`services/catalog.ts`). Management: shared → administrator, personal → owner (`managedCategoryById`); name conflicts go through `assertCategoryName`; when deleting, the target must be a category the owner can see.
- Welcome wizard: the optional `onboarding` preference (`pending` only for accounts from registration or created by an administrator; a missing field means finished) and the personal `terminologyPreset` (null or missing = the site preset, `resolveTerminologyPreset`). `POST /api/onboarding` writes the preferences, the personal category and the first records in one transaction.
- Notifications: the `notifications` preference is optional and off by default; a channel = configuration + the administrator's site switch; the scheduler claims every event in `notification_deliveries` first (at most once). The senders (`mailer`, `pushSender`) are replaceable objects in tests.
- Account deletion has one path: `deleteAccount` in `services/accounts.ts` (administrator and self); the last active administrator is protected. `exportAccount` returns only the account's own rows; the names of the shared records they point at are in the `references` section. Import (`services/accountImport.ts`) writes only to an empty account, matches shared records by name and turns the ones it cannot find into the person's own records; it never links to another person's personal record by any path.
- Actions that cannot be undone or that grant administration (restore, reset, role change, administrator creation, account deletion) require the administrator's password on each request (`confirmAdminPassword`); any new action of that kind uses the same middleware. Administration actions are written to the hash-chained log outside the database (`recordAdminEvent`): names and codes only, never values or passwords.
- Text search has one rule: `foldSearchText`/`matchesSearch` (contracts) and, on the server, `columnContains` with the same pairs (`instr`, no wildcards). New searches and filters use them.
- Interface text comes from the catalogs through `useText()`; `src/i18n/tr.ts` is the source catalog that defines the `Text` type, so a new entry is added there and the same key in `en.ts` (the type enforces it). Text that depends on the person's words is a function `(t: Terms) => ...`. Class components read `useLanguageStore.getState().text`. Screens never contain hard-coded visible text; `npm run check:text` (part of `check`) catches it. The server sends no text: `fail(status, code)` (typed, in contracts) and `{ error: { code, params?, details? } }`; screens render them from the catalog with `serverMessage`/`issueMessage` (`lib/messages.ts`). A shared schema message is a `validationCodes` code. The language is one site-wide setting (`settings.language`); there is no per-person or browser language, and stored data is never translated. Email and push text come from `notificationText[settings.language]`. Formatting goes through `useLocale()`/`currentLocaleTag()`; stored Turkish values (difficulty and similar) are not translated, only their displayed names come from the catalog.
- Displayed words: `resolveTerminology` (personal custom → personal preset → site custom → site preset) plus `createTerms`; screens use `useTerms()`, and server emails use the same functions. A custom word carries its forms; suffixes derive from them, with no exception list.
- The weekly goal is a derived value: `weeklyGoalHours` = daily goal × active days (at most 168). Readers use the function; the preference merge rule `mergePreferences` lives in contracts: the server aligns the stored field with it on every write, and the client's optimistic view uses the same function.
- The personal dashboard (counts, recommendations) looks only at the person's own and shared records, administrators included (`isOwnOrShared`); the administrator overview is a separate page.
- Course → Topic; deleting a course cascades; the topic controller applies `isActive=false` for a normal topic delete.
- Plan/Course/Topic → StudySession; deleting them sets the related foreign key to NULL.
- Categories may be global; a Course is personal or global; a Topic inherits its parent Course's access.
- Settings are global key/value pairs; personal preferences are the `User.preferences` JSON field.
- User → AuthSession → RefreshCredential cascade; the refresh hash history is kept for the lifetime of the family.
- Backup metadata lives in the database and the verification manifest next to the snapshot; the catalog is rebuilt from the manifests at startup and after a restore.

Indexes and model validation exist. An explicit baseline migration and the `schema_migrations` record were added; the seed uses a transaction. Auth rotation, password changes, administrator recovery and reset run in transactions; StudySession writes and catalog writes run in IMMEDIATE transactions.

## Current auth and data flow

1. Login and registration return the user and a short-lived access JWT; the refresh credential is written only to an `HttpOnly`/`SameSite=Strict` cookie. The access token is never persisted outside memory.
2. `protect` checks the algorithm, issuer and audience explicitly, then the session id, user, active status, last expiry and revocation; `authorize` uses the current role from the database.
3. Refresh consumes the credential and issues a new one in an IMMEDIATE transaction. Reusing an already consumed hash revokes the whole family. The absolute session lifetime never extends.
4. `httpClient` (fetch) resolves parallel and late 401s with a single refresh; epoch and same-user checks stop a late response from bringing back a finished or changed identity. Web Locks serialise cookie operations across tabs, and BroadcastChannel clears other tabs' cache and identity.
5. Logout clears the local identity and cache first, waits for a late refresh and revokes the server session. On a network error, a pending intent without secrets prevents automatic sign-in on reload.
6. A password change and administrator recovery revoke all of the user's sessions; a role or status change revokes the related old sessions. Races between hash verification and writes are checked inside transactions.
7. Auth routes check a custom header, Origin and `Sec-Fetch-Site`, use credentialed cookie transport and `no-store`, and enforce `Secure`/HTTPS in production. The old `JWT_REFRESH_*` settings and the JSON refresh contract were removed; a migration and a new sign-in are required.

## Current state and query pattern

Server data is mostly in Query; auth and settings are in Zustand. All resources sit under the account key factory, and sessions carry the time zone and the relevant date. The current day key changes every 30 seconds and on focus; the weekly summary is derived again. On an account change, the cache and queries are cleared, late responses are isolated and the Layout is rebuilt. Session and catalog writes refresh every related view key through a shared prefix.

A query key must contain the identity and filters that determine its result. Invalidation may use a prefix; it does not need every parameter. The opposite statement in the earlier memory bank is obsolete.

## Fixed patterns

- Course and topic visibility depend on the shared owner/global/admin policy; user stats endpoints have a self/admin boundary (the single `GET /users/:id` was removed in the 18 October cleanup; there are no single topic or category read endpoints either).
- A new session's course and topic relations are validated for visibility, active status and consistency.
- A session GET no longer changes notes or status.
- Importing `app` starts no server or scheduled job as a side effect; `index` owns startup and shutdown.
- No schema changes at startup; an explicit baseline migration exists and automatic table drops were removed. Backups use the same database path source.
- Route lazy loading, a root ErrorBoundary, working lint, type check, tests, build and a CI workflow exist.
- The error handler classifies the existing Sequelize errors and never exposes internal error messages to users.

## Business-rule issues still open

- The daily and weekly planner share one renderer, command hook, card and geometry. The two Pomodoro engines moved to one shared hook and UI with a server phase machine in A15. The A21 student catalog and category management UI are complete; users, settings and backups were completed in later packages; a final review of the other design surfaces remains open.
- Preferences, site settings, auth, profile, administrator user, Plan and backup inputs come from shared Zod 4 schemas and types in contracts. The Joi and frontend Zod 3 paths were removed; runtime validation of the remaining API responses is not complete.
- The catalog transaction scope is complete; general metadata writes are last-writer-wins, and reorder checks the full active list and its version snapshot. User topic progress lives in the per-user `user_topic_progress` table (A24).

The current status of findings is in `progress.md`; their historical sources are in the A01–A22 audit report.

## Target patterns (the first implemented scope is noted in each subsection)

### Moving authorisation to the query boundary (first scope implemented)

Course reads derive from the owner/global/admin policy and topic reads from the course's visibility. Authentication is not authorisation. Related course, topic and plan selections are validated with the same policy. Every per-user list, detail and aggregate path uses a consistent scope.

### A service boundary per operation

HTTP controllers handle only validated input, the actor and response mapping. A use-case service applies permissions, state transitions and the transaction in one place. Boundaries follow the needs of auth, catalog, planning and study tracking, settings and backup. No generic abstraction is added without a need.

### One contract

Shared schemas and DTOs for requests, responses and Preferences; ISO UTC time, entity id type, optional versus null, error codes and pagination meaning are explicit. Frontend types and API documentation can derive from the same contract. Model persistence details are not used as the external API contract.

### State and time integrity

Planned time and measured work intervals are separate. The state transition table is the same on every write path. Create and move overlap checks are atomic, retries are idempotent and stale client writes are detectable. Day ranges are computed in the user's time zone and converted to UTC `[start, end)` ranges. GET is read-only.

### One frontend behaviour engine

Planner mutation, drag and resize rules live in a shared layer, with separate daily and weekly rendering. The timer works with a deadline, accumulated time and a single phase machine. The query key factory carries the user, date and filter scope. On an auth change, the cache, in-flight requests and the personal persistence boundary are closed.

### Database and recovery (single-process scope implemented)

Explicit migrations instead of repairing or dropping the schema at startup; one database path. A consistent WAL snapshot with SQLite's native online backup API and an atomic destination restore; external manifest, SHA-256, integrity, foreign key and schema checks. A safety backup before restore and a rollback if the final check fails; if recovery also fails, the API stays in maintenance. The HTTP maintenance gate drains active responses, and new requests get 503 with `Retry-After`. A restore revokes old sessions.

Reset runs after a safety backup inside an IMMEDIATE transaction; `settings_only` touches only the settings, while `all` removes student, record and study data (administrators are kept). Catalog deletes and reorders also moved to the shared IMMEDIATE service. The scheduler re-reads the setting every 5 minutes and checks whether 1, 5 or 7 full days have passed since the last successful automatic manifest; the newest 14 automatic snapshots are kept. Coordination is per backend process; external writers, off-site copies, capacity and real-environment recovery drills are needed separately.

### Quality and observability (local check chain implemented)

A build that keeps strict mode, supported lint, regressions for critical behaviour and CI are mandatory. Test priorities are the permission matrix, session ranges, states and durations, preference round trips, cache isolation on account switches and restore. Logs mask sensitive fields; expected database validation errors are 4xx and unexpected ones a safe 5xx. Route splitting, the ErrorBoundary, mobile and keyboard support and performance budgets are completed with measurement.

The lasting process is in `workingPrinciples.md`, the order of work in `activeContext.md` and `progress.md`, and the detailed reasoning in `audits/2026-10-15-project-audit.md`.

## Current visual patterns (15 October 2026)

`design-system.md` is the source standard. CSS variables carry the meaning of light and dark surfaces and text; `PageHeader` provides the main page hierarchy, and the panel, `btn`, `nav` and `segmented-control` classes are shared. Business-data colour is kept apart from neutral text. The old pastel, glass and gradient look is not kept as a second alternative. The mobile menu manages its overlay, focus and Escape with a single Dialog; the Layout has no second overlay. Calendars use the shared `initializeCalendarViewport` and, since the latest A21 package, one shared command and view engine.

The dashboard and `CoursesPage` cache the same raw API response shape for the same key; the dashboard uses `select`. Recent activities and notifications are sorted by completion or end time through `getRecentSessions`; the shared query array is never mutated in place. The design conversion alone did not close the auth and backup issues; they were verified separately in the later security and recovery package. The preference contract and measured time were completed in the 16 October packages, and the timer deadline engine in A15.

## Preferences and site identity (16 October)

The contracts v1 shared runtime schema and types; migration 003 performs an explicit JSON conversion with a lossless source archive. User and administrator preference patches merge with the current row inside an IMMEDIATE transaction. The client saves in a queue and, since 21 October, optimistically: `preferences` = the last server-confirmed value plus pending changes (applied in order with `mergePreferences`); every response brings the confirmed value from the server, a failed change rolls back only itself, and a generation counter cancels pending or late results on an account change. Profile and private administrator responses are also bound to the identity. Profile and preference HTTP writes share one queue; a monotonic preference revision stops a late, older refresh or profile snapshot from overwriting a newly confirmed preference on the same account. The last write wins for the same field; no live cross-device conflict resolution was built.

Personal preference memory starts from the login or refresh profile and is cleared when switching to anonymous or another account. Orphaned old browser values move to a manual recovery archive and are never used as an active fallback. Notification ids are stored per account with a size limit. Theme and colour are applied by one appearance layer with an OS listener; removing the personal colour brings back the public site colour.

Public branding DTO → site-branding cache → Brand, login, registration, sidebar, loading screen, title, meta tags and favicon. Administrator configuration lives only in an authorised separate API and in memory, validated by schema inside a transaction. The site name is the visible brand, not the repository name or domain. The owner chooses the real name in the administrator settings; a fixture name never carries over to a normal installation.

## Session write policy (16 October)

`services/studySessions.ts` is the transaction, permission, state and range boundary for every create, update, action and delete HTTP path. SQLite IMMEDIATE serialises check and write. `[start, end)` overlap is checked per user, excluding the current id; every status except cancelled keeps its calendar range. Reactivating a cancelled session is checked too. There is one `in_progress` session, terminal states reopen through `planned`, completing an unchanged session is a no-op that keeps `completedAt`, and reopening sets `completedAt` to null. When the planned end has passed, GET writes nothing and pause returns an error instead of silently changing the state.

Every edit, action and delete path requires `expectedUpdatedAt`; an old version gets 409. `beforeUpdate` produces at least +1 ms over the previous timestamp. The client carries the snapshot it saw and stores the mutation response; after a 409 the session query prefix is refreshed and no automatic mutation retry happens. This is an HTTP service contract; external SQL or bulk foreign-key writes are outside this policy. The shared Zod session schema, `SessionStatus` and the transition table live in contracts. Evidence and the transition table: `implementation/2026-10-16-session-integrity.md`.

## Measurement and calendar (16 October)

StudySession → SessionInterval cascade; a partial unique index allows one open interval. The session transition and the study, break and pause boundary share the same IMMEDIATE transaction. `duration`, start and end are the planning contract; measured seconds derive from the separate intervals. Reopening or cancelling never deletes measured history. `trackingCoverage` complete/partial/untracked is defined by migration 004; no measurement is inferred from old durations. GET does not write to the database and computes intervals with a single `asOf`.

User and plan stats and the user management rows use the shared `getStudyStats` scope. The self/admin endpoint limits a foreign student with 404. Real intervals are split at local-day UTC boundaries by intersection; the time zone comes from the user or the query, not the server. The stats query range is limited to 366 days, and the all-time view has no day list. Large data and load were not measured; one query loads sessions and intervals into memory.

`contracts/time.ts` provides Luxon/IANA plus the time-zone and day schemas. `CalendarDate` is only a synthetic UTC calendar field; API payloads must use `calendarViewInstant`/`wallTimeToInstant`. The browser's own DST never changes calendar fields. Calendar and form moves and the clipping of overnight cards go through this path. Missing or repeated local times are rejected in forms; the grid does not produce separate rows for the two folds. Details: `implementation/2026-10-16-study-time-and-timezones.md`.

## Catalog integrity (16 October)

`services/catalog.ts` is the permission, check, write and response transaction boundary for create, update, delete and reorder. Category migration moves the records of every user and active state and deletes the source category atomically. Before a course DELETE, related session foreign keys are cleared through instance saves so the monotonic session version advances; the database cascades topics; intervals, sessions and notes are kept. Topic DELETE sets `isActive=false`. Reorder accepts only a complete unique `1..N` permutation of the active topics with an id/`updatedAt` snapshot, and a changed list gets 409. Topic `beforeUpdate` ensures a monotonic +1 ms. Archived order is outside the active ordering scope; a reactivation conflict is appended to the end in a controlled way. Shared catalog schemas and types live in contracts. No optimistic conflict resolution exists for general catalog metadata. Details: `implementation/2026-10-16-catalog-integrity.md`.

## Runtime settings (16 October)

Site settings are read through `services/siteSettings.ts`. The maintenance gate is inside `protect` (503 plus `Retry-After` for everyone except administrators); login and registration check it too, while logout, refresh and the public settings read stay open. While registration is closed, register returns 403. The idle session limit is computed during refresh rotation from the age of the last credential and can never be shorter than the access token lifetime. The frontend derives the maintenance and registration screens from the public DTO.

## User topic progress (16 October)

`UserTopicProgress` between User and Topic (primary key userId+topicId, CASCADE). No row = `not_started`; only `in_progress` and `completed` are stored. Writes live in `services/topicProgress.ts`, follow the course visibility policy and run in an IMMEDIATE transaction; no user state is written to global catalog rows. The frontend writes with server confirmation and refreshes the progress query.

## Server-owned Pomodoro (16 October)

StudySession → PomodoroClock one-to-one with cascade; migration 005 only adds a new table, and no old phase is guessed. The persisted deadline is authoritative; the interval callback only triggers a wake-up. The phase transition and the activity boundary run at the persisted deadline in one IMMEDIATE transaction. GET is read-only; when the worker is late, an open study or break interval is cut at the deadline. Start, pause, reset, complete, configure and the general planner actions use the same versioned session service. Changing a live duration setting requires planned/reset. When work ends, the chosen break starts paused; with opt-in `autoStartBreaks` it runs at the boundary. When a break ends, the next work phase is always paused.

`usePomodoro` shares page and modal observation under the same account/session query key; the display derives from the server time plus elapsed wall and monotonic time, never from counted ticks. The client never writes the phase. Stale GETs and versions and acknowledgements arriving after an account change are not applied. The numeric API user id and the string view id are normalised in a single query factory; BroadcastChannel carries only the user id and a change notice. The maintenance gate also drains background work; scheduler shutdown is awaited and startup catches up. Multi-process, load and offline scope must be verified separately.

## Shared calendar command and view boundary (16 October)

`WeeklyPlanner` and `DailyCalendar` are mode adapters only. `PlannerCalendar` is the single source for the grid, context and actions, drag and pointer resize, and modal rendering; `usePlannerCalendar` is the boundary for queries, session commands and server confirmation; `CalendarSessionCard` is the shared card; `calendarGeometry` holds the pure snap, real-duration, move and segment rules. Row height is a view parameter, not a business rule. The server stays the authority for overlaps, the single running session, states and versions. A synchronous busy ref prevents double writes and an epoch prevents late acknowledgements from being applied. A 409 triggers a read and refetch and refreshes the dialog snapshot; the person's target date is kept and needs a new confirmation. Asynchronous Confirm and Move dialogs wait for success. The real duration of an overnight session is kept; the first segment is dragged and the last segment resized.

## Catalog editing boundary (16 October)

`CourseEditorModal` is the single student and administrator create/edit form for records, and `TopicEditorModal` for topics. They use the shared `EditorDialog` and `CatalogDeleteDialog`; the old forms are not kept. New forms validate with the Zod 4 create schemas from contracts; edits send only changed, permitted fields. A form snapshot is not reset by a background refetch, and metadata is still last-writer-wins. `canManageCourse` is the shared frontend view policy; `services/catalog.ts` is the final permission and transaction boundary.

`useCatalogMutation` uses a busy ref, the epoch and server confirmation and refreshes the catalog, sessions and topic-progress account prefixes. The archive query opens only on request; no reorder or progress writes happen in the archive. Restoring a topic checks active name conflicts inside the transaction even when the name is unchanged; a 409 is never retried automatically. A restored topic's user progress is read from the existing database row. Deleting a record clearly shows the permanent catalog and progress cascade and the session and interval preservation policy; deleting a topic shows the reversible archive policy.

## Category management (17 October)

`CategoryManagementModal` lists after the administrator check; `CategoryEditorModal` uses the shared `EditorDialog` and `useCatalogMutation`. Create and edit validate directly with the contracts category schema, with a dirty patch and a draft snapshot. The delete confirmation sits under the same parent dialog, with an explicit move target, asynchronous success, error handling and a closing lock; the catalog, session and progress caches are refreshed. The shared icon registry also covers the existing category icons. There is no second form or mutation engine. Backend transactions and data contracts did not change.

New feature-flow tests live under `frontend/tests` and pass through the same Vitest, strict and lint gate as the colocated `src` tests. A scenario is never duplicated in two places. Real SQL, permission and rollback evidence comes from the temporary-SQLite tests in `backend/tests`; a mocked frontend API does not count as a browser test. Evidence and limits: `implementation/2026-10-17-category-management.md`.

## User management and the shared mutation boundary (17 October 2026)

`AdminUsersPage` keeps the server's paging and total data and the submitted search parameter in the account query key; 20 rows per page with the bulk `includeStats` read. Dates follow the viewing user's time-zone preference. The administrator `POST /users` and `CreateUserModal` use the same `createManagedUserSchema`. List and patch transport types are shared in contracts.

`EditorDialog` is the single dialog component for the catalog and user forms. `useAccountMutation` is the layer for the busy ref, mount and epoch checks, awaited invalidation and inline errors; `useCatalogMutation` is its catalog adapter. User mutations refresh the whole current-account resource prefix; catalog mutations refresh the catalog, session and progress sub-prefixes. A late confirmation after an account change or unmount never produces UI success or a cache refresh. `ConfirmDialog` stays open on an asynchronous `false`.

## Administrator settings and recovery UI boundary (17 October 2026)

`SettingsForm` separates pristine refetch from dirty protection with a baseline and a draft; after the shared `siteSettingsSchema` normalisation only changed fields are saved with `settingsPatchSchema`. The store's private read/write revision plus the account generation limit stale reads and writes. A public branding error is never written into the private read error. The server's IMMEDIATE settings patch service is kept; no optimistic version was added.

`BackupPanel` is the account `resource('backups')` query; `verified === true` enables restore. A single `useAccountMutation` serialises settings, create, restore and reset writes; `ConfirmDialog` waits for the asynchronous result. After a restore the client signs out before any protected refetch. A reset invalidates the account resource prefix and reads the private settings again; a failed read shows a retry instead of a default form. `useAccountMutation.clearError` clears the previous error for a new operation.

## Daily sessions and the editor lifecycle (17 October 2026)

`TodaysPlans` is the daily list and command boundary; the `GoalsOverview` name and its second modal state were removed. `sessionPresentation` holds the shared status and type labels. `AdminDashboardPage` uses independent error boundaries for the summary and user queries and never produces zero data on a failed read.

`CreateSessionModal` mounts the snapshot-based `SessionEditor` only while open; closed modals do not query the catalog. `useAccountMutation.isCurrent` provides the mount and auth-epoch boundary for asynchronous conflict reads. On a 409 a separate `writeSnapshot` is refreshed and the form draft is kept; a failed GET blocks the write and requires an explicit retry. The nested `ConfirmDialog` stays inside the parent editor's focus and draft boundary; save and delete wait for server confirmation under one busy ref. An existing active or inactive record and a historical title are kept; clearing a description sends an empty string.

## A19 request/response and the Plan boundary (17 October 2026)

`validate` replaces only the declared body, query and params sections with parsed values; the query's adaptation to Express `ParsedQs` happens at this boundary. The shared `validationError` produces only field and message. A sparse `managedUserPatch` carries no role or `isActive` defaults; create defaults never spread into a patch. `userResponse` is the permitted DTO; auth and administrator resources never spread ORM `toJSON`. The client validates auth, profile, administrator list and summary, and backup acknowledgements at runtime; the numeric API id is converted to a string for the auth view. Preferences moved to their own module; the v1 persisted contract did not change.

A Plan is the existing optional goal container; the calendar entry is a StudySession, and there is no automatic or mandatory linking. `services/plans` is the single IMMEDIATE create, update, reactivate and delete boundary. Partial dates are checked against the existing row, goal patches merge, and the response DTO is validated inside the transaction. Delete detaches `planId` through instance saves and advances the session's optimistic version; measurement and notes remain. Metadata is last-writer-wins; external SQL is out of scope. The unused frontend Plan API and DTO copy were removed.

`contractResolver` brings the shared schemas to React Hook Form; `sessionForm` is only a view adapter. The shared request DTO is validated on submit with a real duration limit of 1–1440 minutes. Calendar snap and minimum UX remain separate. Evidence and limits: `implementation/2026-10-17-shared-request-contracts.md`.

## A22 header and calendar access boundary

The header menus manage focus, Escape and mutual closing with a single `Popover.Group`. `NotificationsPanel` uses an account-keyed query and an epoch check; a failed refetch never becomes an empty success or a verified unread count. The local read action is limited to the verified five visible entries; when the action disappears, focus moves to the persistent close control.

Empty calendar hours are one Tab stop with arrow, Home and End navigation and open the existing editor. Native time and duration fields are bound to the same versioned move command; there is no separate mutation engine. Pristine fields follow the refetched source; dirty fields are kept during a 409 and read retry. Only an explicit change alters the instant or duration. The focus reference of a moved card is keyed by session, day and hour, so an old cell's null ref callback cannot delete the new cell's registration. When no card is visible, focus returns to the Today navigation button. Details: `implementation/2026-10-17-header-and-calendar-accessibility.md`.

## A22 short-card layout

The real time geometry and the visual hit area of daily and weekly cards are separate. The shared `layoutCalendarCards` groups the minimum-height ranges of the whole day (including those crossing hour boundaries) into connected overlap groups, uses the id for equal starts and reuses free lanes. This pure view calculation writes no records or intervals. The same day's header and hour grid share a column template; columns are never squeezed until unreadable, and horizontal scrolling is used inside. The end-of-day gutter keeps the focus outline. A short card's resize handle gives way to the native time and duration alternative; the pointer engine stays for large cards. Details: `implementation/2026-10-17-calendar-card-layout.md`.

## A22 isolated browser fixture and focus closing (18 October 2026)

The browser tests set up a browser context and a child server per test and accept no resource other than their own empty temporary directory, SQLite file, random JWT secret and operating-system loopback port. Building with `API=/api` and a browser origin guard block traffic to real external systems. The backend's test mode does not load dotenv. Because importing the app starts no scheduler or listener, the fixture sets up only the real HTTP app and the static production frontend. Integrity, foreign-key and protected session and interval comparisons run when the child shuts down; the parent cleans up the process and directory in `finally` on normal success and failure paths. A fixture cleanup error is a test error.

Headless UI's passive cleanup on unmount can race with an early animation frame in `onClose`. `PlannerCalendar` keeps the id to return focus to in a ref; an effect after the commit where moving is closed and the mutation is no longer pending schedules one animation frame, and its cleanup cancels it. The old pre-commit restore path is not kept. Source: `implementation/2026-10-18-isolated-browser-tests.md`.

## A22 accessibility scans and authenticated measurements (18 October 2026)

axe uses the existing test-scoped isolated app fixture; there is no second database or server engine. The WCAG 2.2 target-size rule is added explicitly to the default rules; zero violations are expected, and incomplete results are stored as JSON for separate manual review. Form and scroll states are opened with the real controls. The header's name derives from its content; screen-reader-only prefixes and explicit text spacing keep the visible name and role. The scroll area is a named region, and the administrator summaries are valid `dt`/`dd`.

Lighthouse keeps the real login cookie in a separate empty Chromium profile on an operating-system loopback CDP port. The new measurement page's expected title is awaited before closing, and the final URL and runtime are checked too. A measurement later redirected to sign-in is rejected. Profile and browser teardown is separate from the app's; external traffic is blocked. The median of three independent runs is reported; no arbitrary gate is placed on a single local performance score, but accessibility must be 100. A forcibly killed bootstrap can skip the parent's `finally`; only the owned temporary directory is removed after verification, and other directories with the same prefix are never deleted in bulk.

## Language and vocabulary (23 October 2026)

The interface language is one site-wide setting (English or Turkish). Stored data and the words people type are never translated. A custom word set carries the language it was written in and is used only in that language; the other language shows a preset. Word forms come from one module (`contracts/terminology.ts`): the Turkish accusative form, and the English plural and a/an, are kept as a suggestion the person can correct plus the stored value. Interface text never hard-codes an English article; it uses `t.x({ article: true })`.

## Weekly routines (23 October 2026)

A routine is not a virtual recurrence rule; it is stored as real sessions created up to a horizon, so every rule about sessions (overlaps, versions, Pomodoro, measurement, reminders) stays in one place. A routine has no priority over a single session: when a person changes or deletes one session, that date becomes an exception of the routine. Editing a routine rebuilds only future, planned, unmeasured and untouched sessions. GETs have no side effects; a daily job moves the horizon forward.

## Tags (24 October 2026)

A tag belongs to one person; a tag attached to a shared record belongs only to the person who attached it and never changes the record itself. A session matches through its own tag or its record's tag; the filter is built in one place on the server (`sessionsWithTag`), and the list and statistics use the same rule. Writing tags is a separate second step after saving a session: if it fails, the session is kept and is not submitted again.
