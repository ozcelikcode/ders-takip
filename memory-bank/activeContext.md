# Study Tracker — Active Context

Last updated: 31 October 2026. Historical packages live in `progress.md` and `implementation/`; this file is the current hand-over.

## Current state (25 October 2026)

- **Done:** roadmaps R1–R15 and F1–F6 (weekly routines, per-record goals, calendar subscription, tags, data import, the "Go to page" palette); administrator security (password confirmation for sensitive actions and a hash-chained activity log kept outside the database); English custom words; dashboard mobile Lighthouse 91 (sign-in 95); major dependency upgrades with `npm audit` at 0; a text alternative for charts; backup retention. The real database schema is at 014.
- **Cleanup (24 October):** temporary pre-migration copies, generated reports and test leftovers were removed, and the outdated automatic backup (schema 008, no longer restorable) was deleted with its catalog row. The server has since taken automatic backup #8 (24 October); `npm run backup:verify` confirmed it restores cleanly (31 October).
- **Open:** manual screen-reader and physical-device testing (needs a person); DST fold rows in the grid and native drag/resize browser tests; owner-side operations (VAPID/SMTP, `BACKUP_COPY_DIR`, off-site backups, an off-server copy of the activity log).
- **Next:** the S/Q/P/G/D roadmap in `progress.md` (31 October) is done except the Docker trial (owner decision: Docker is not installed) and the off-server activity-log copy. Backlog: device names for signed-in sessions, TOTP 2FA, goal reminders. Since 31 October verified work is committed and pushed without asking; real-database migrations still need the owner's approval each time.

## Lasting instructions

Work continues from the existing project with disciplined, maintainable, senior-level engineering. Unused, obsolete, duplicated or speculative implementations are not kept. Technical symbols, files, folders, packages, comments, logs and documentation are in English; interface text lives in the English and Turkish catalogs, and stored localized values are preserved. Strict and quality gates are never relaxed. At the start of every task the whole memory bank is read; `AGENTS.md`, `workingPrinciples.md` and `design-system.md` apply.

The owner may also work with other AI assistants: the current `progress.md` and source are the basis; completed work is not re-applied from an old chat and existing changes are not overwritten. The modern, simple, neutral Vercel/Geist direction applies; pastel, glass and gradient styles are obsolete. The site identity comes from an administrator setting; no real name is chosen on the owner's behalf.

## Product direction (decided 19 October 2026)

A field- and audience-independent, global system with a configurable focus; there is no requirement for a particular exam or for users to be students. The ordered roadmap is at the top of `progress.md`. AI, social and offline features are not active priorities.

## Roadmap history in brief

- **R12 welcome wizard (20 October):** new accounts see `/welcome` (purpose, time, rhythm, first records, summary); the answers prepare the personal vocabulary, goals, active days, week start, time zone, focus rhythm and a personal category with up to three first records. It can be skipped and restarted from Settings. Migration 008 added personal categories. R12c: goals in hours plus minutes with a derived weekly goal (`weeklyGoalHours`, `mergePreferences` on the server), checkbox first records and personal dashboard recommendations (`utils/recommendations.ts`). R12b (21 October): people manage their personal categories under Records › My categories; the administrator modal has Shared and Personal tabs.
- **R13 (21 October):** search and filters ignore case and Turkish letter forms (`foldSearchText`, `columnContains` on the server); the LIKE wildcard bug in the administrator user search was fixed.
- **R14 (21 October):** Profile › Your data (JSON download, account deletion with the password; the last active administrator is protected; administrator deletion shares the single `deleteAccount`).
- **R15 (21 October):** the project brief, product context and README were rewritten for the global product.
- **R11 (21 October):** Web Push and email reminders (session start, morning plan, weekly summary) as opt-in preferences, with administrator channel keys. Migration 009. Push needs `npm run push:keys -- address` and a backend restart; email needs SMTP.
- **R9 / dependencies:** Tailwind 4.3.3 (21 October), React 19, Recharts 3, Headless UI 2, motion, Zustand 5 and lucide 1 (22 October); axios was replaced with `fetch`. Preferences are saved optimistically with the store as the single source; the unused `secondaryColor` setting was removed.
- **R2d:** administrators and users can write their own words, with correct Turkish suffix forms; English custom words followed on 23 October and belong to their own language.
- **R10 (22 October):** R10a translation infrastructure, R10b every screen in the catalogs with `lib/locale.ts` tied to the language and the `check:text` guard, R10c the server returns only codes and emails and push follow the site language, R10d the language is one site-wide setting chosen by an administrator.
- **Accessibility and performance (22–23 October):** charts are offered to screen readers as tables and the Pomodoro timer is announced; the manual screen-reader checklist is ready. Dashboard mobile Lighthouse went from 87 to 91–92 (the chart chunk loads with its data, the session refresh starts in `index.html` while JavaScript downloads, and the opened page loads together with the layout). A cookieless refresh answers 204 (best practices 100) and the Turkish font subset is preloaded (sign-in mobile 95).
- **Browser tests (23–24 October):** Pomodoro measurement, administrator flows, backups, category moves, settings reset, maintenance and closed registration, clearing all data and the idle session limit.
- **F1–F6 (23–24 October):** see `progress.md`. Migrations 010–013 were each applied to the real database with the owner's approval after a backup.
- **Administrator security (24 October):** password confirmation (`confirmAdminPassword`) for restore, both resets, role changes, administrator creation and account deletion; the activity log (`recordAdminEvent`) in `admin-audit.jsonl` next to the database.

## Preserved completed foundation

- A01–A14 access, atomic session and catalog writes, preferences, cache and session-recovery fixes are in `progress.md`. Session HTTP writes use IMMEDIATE transactions and `expectedUpdatedAt`; one running session, a state table, a stable `completedAt`, a monotonic `updatedAt` and stale 409 responses. `duration` is planned minutes; `SessionInterval` records real study, break and pause; past measurement is never invented.
- A15: the server-owned `PomodoroClock` with deadline, phase and cycle, and a single `usePomodoro`/`PomodoroTimer`. Breaks are opt-in and the next work phase never starts by itself; GET and stats cut measurement at the deadline. Closing the page or modal does not pause; maintenance also drains the scheduler.
- A16: Luxon/IANA day boundaries and the `CalendarDate` view adapter; a synthetic `Date` is not an API instant. `calendarViewInstant`/`wallTimeToInstant` are required; the grid does not produce two DST fold rows.
- A17 global administrator and bulk user measurement, A18 runtime registration, maintenance and idle limit, A24 persistent `UserTopicProgress`; A19 shared auth, user, Plan and backup Zod 4 DTOs and the Plan as an optional goal container. The completed A21 scopes (administration, modals, today, catalog, shared planner) are not rewritten.
- A22: header error, empty, stale and epoch handling, the roving calendar with native time and duration, short-card columns (28 px minimum, 24 px targets, 36 px end-of-day gutter) and focus return after the closed dialog commits are kept. The first browser-test package is described in `implementation/2026-10-18-isolated-browser-tests.md`.

## Local environment and data protection

The first setup created `admin@example.com` (username `admin`) with the owner's authorisation. The password exists only in `.local/admin-password.txt` (0600, Git-ignored); it is never read, changed or documented. The real `.env`, database, `.local/` and backups are never test fixtures. The single root dev server runs on localhost:3000 with the API on 5002.

The real database schema is at 014 (31 October 2026); 007–014 were each applied with the owner's separate approval after a backup. Earlier upgrades 003–006 used private native snapshots with data-preservation comparisons. Migrations on the real database run only with the owner's approval each time; tests never write to it, and seed, reset and restore are never run against it. A snapshot with an older schema is rejected by the current restore; it needs a controlled upgrade on a separate copy.
