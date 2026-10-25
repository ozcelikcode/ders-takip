# Study Tracker — Project Brief

Last updated: 25 October 2026 (R15 rewrote this brief after the 19 October product-direction decision).

## Product direction (owner decision, 19 October 2026)

The product is a field- and audience-independent, global study and task tracker built around a configurable focus. It works for school, work, personal goals, skills or any other area; no screen, type, default or text is tied to a single exam, curriculum or audience. The first version's focus on one national exam is obsolete and survives only as history in Git. The ordered roadmap and status are at the top of `progress.md`.

## Goal

A simple web application where anyone can set up their own workspace, plan their work, work with focus and see their progress in time that was actually measured.

## Engineering standard (15 October 2026)

Work continues from the existing code with disciplined, maintainable, senior-level engineering. Unused, duplicated, obsolete or speculative code is not kept; supported, stable technology and verifiable changes are the rule. Code symbols, packages and file and folder names are in English; user-facing text lives in the interface catalogs. Lasting rules: `workingPrinciples.md`. The requirements in this document are product goals; evidence of what is implemented is in `progress.md`, and the technical inventory is in `techContext.md`.

## Core concepts

- **Record, sub-record, session:** what is being worked on (record), its parts (sub-records) and the block of work on the calendar (session). The displayed words are configurable: an administrator sets them for the whole site and each person may choose a personal vocabulary (General: project/task/session, Education: course/topic/session, Goals: goal/step/session, Skills: skill/exercise/session). Code and data always use the same English concepts (course/topic/session).
- **Category:** groups records. Administrators manage shared categories; every person can create personal categories that only they see.
- **Measured time:** statistics and goals rely on study time that was actually measured, not on planned time; breaks and pauses are excluded.

## Roles

- **User:** their own workspace, personal categories, planning, focus timer, goals, statistics, search, tags, calendar subscription, data download and import, and account deletion.
- **Administrator:** additionally user management, shared categories and records, site identity and settings, backups, password reset links and the activity log. The last active administrator cannot be removed.

## Main features (implemented; details and evidence in `progress.md`)

1. **Welcome wizard:** a new account chooses its purpose, its time (time zone, week start, active days, a daily goal in hours and minutes), its focus rhythm and its first records, and its pages are prepared accordingly. It can be skipped and restarted, and it can load an exported data file instead.
2. **Planner:** daily and weekly calendar, drag and drop, overlap and version checks, weekly routines.
3. **Focus timer (Pomodoro):** phase state kept on the server, adjustable durations.
4. **Goals and recommendations:** the daily goal applies on active days and the weekly goal derives from it; per-record weekly targets; personal recommendations on the dashboard.
5. **Statistics:** range selection, distribution by category and record, comparison with the goal, tag filters.
6. **Search:** across records, sub-records and sessions; ignores case and Turkish letter forms and respects permissions.
7. **Account:** password reset (SMTP or an administrator link), JSON export and import, account deletion with the password, calendar subscription, email and push reminders.
8. **Administration:** users, shared catalog, site identity, vocabulary and security settings, backup and restore, password confirmation for sensitive actions, activity log.

## Out of scope (for now)

Native mobile apps, social or competitive features, AI integration, offline use or a PWA.

## Success criteria

- Accessibility: no violations in automated axe scans (light and dark themes); full WCAG and screen-reader verification must be done separately.
- Lighthouse: 90+ performance on mobile and desktop (latest measurement in `progress.md`).
- User data is preserved: explicit migrations, a backup before each operation, no destructive commands.
- Strict TypeScript, lint with zero warnings, `npm run check` and the browser tests green.

## Constraints

- The interface language is one site-wide setting (English or Turkish, chosen by an administrator; there is no per-browser or per-person language, and stored data is never translated). The server returns codes only, emails follow the site language, and date and number formats come from the single source `lib/locale.ts`.
- An internet connection is required; SQLite is a single-file database.
- Modern browsers; the browser tests run on Chromium, WebKit and mobile Chromium.

## Design (15 October 2026)

Modern, simple and careful, in the line of Vercel/Geist and Linear: neutral surfaces, clear typography, thin borders, purposeful colour. The old pastel/iOS/glass direction is obsolete. The rules are in `design-system.md`.

## Configurable brand (16 October 2026)

The displayed site name, logo, icon and description come from an administrator setting; code, repository and package names do not depend on them. Details in `implementation/2026-10-16-preferences-and-site-identity.md`.
