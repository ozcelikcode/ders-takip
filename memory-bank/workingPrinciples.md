# Lasting Engineering and Working Principles

Source: the project owner's explicit instruction of 15 October 2026. These principles apply to all later development work.

## Core expectation

The project started as vibe coding; from now on, work must be organised, disciplined, maintainable and held to senior engineering standards. Work continues from the existing product. Every change rests on an understandable problem, a reason and a verifiable result.

## Naming standard (addendum of 15 October 2026)

- All code symbols, variable, function, class and type names, API fields and new file and folder names are in English. Names are descriptive and consistent.
- User-facing text lives in the interface catalogs (English and Turkish); stored localized data values are preserved, and existing persisted data contracts are never renamed without a migration.
- New technical comments, developer logs and documentation are written in English; file names are in English.
- The repository and working directory stay where they are; technical naming inside the application is English. Per the addendum of 16 October, the displayed product name and identity can change completely through an administrator setting and are not tied to code, repository or package names, or the hosting domain. Obsolete files are not archived under new names; they are removed after checking references.

## Currency and code lifecycle

- Runtimes, tools and dependencies that are out of support are not used as a lasting development base. Official support status and security advisories are checked before updating.
- New development uses current, stable, maintained technology. A working system is not replaced blindly just because a version number is old; support, security, compatibility and maintenance cost are weighed concretely.
- Unnecessary, unused, duplicated, leftover-workaround or architecture-inconsistent code is not accumulated. It is removed after examining its references and data impact. History lives in Git; old alternative implementations are not kept in the code base.
- No unused abstractions, services, screens or dependencies are added for hypothetical future needs. Future fitness comes from clear responsibilities, solid contracts, data safety and ease of change.
- Large updates happen in small, verifiable steps. If transition code is needed, it has a scope, a removal condition and a tracking record; it never becomes a permanent second implementation.

## Change discipline

- At the start of every task, all memory-bank files are read and compared with the current source code and verification results.
- The desired behaviour and acceptance criteria are clarified before implementation. Security, data integrity and real user flows come first.
- The same business rule is never implemented separately in different screens or controllers. Permissions, time, state transitions and duration calculations each have a single definition.
- Work is not done by silencing strict TypeScript, using random `any`, `@ts-ignore`, disabling lint or skipping failing tests.
- Installs must be reproducible with the lock file and the chosen Node and npm versions. Checks are automated; when a critical bug is fixed, meaningful regression tests are added.
- Database changes happen through explicit migrations. Dropping tables, automatic schema repair, silent data resets and continuing with a fixed secret during normal startup are not acceptable.
- Existing user data is preserved. Seed, reset, restore and destructive schema commands are never run against it for verification. Data transformations define their backup, verification and rollback method.
- A task is complete only when the behaviour is verified, the required checks pass, the unused old path is removed and the memory bank is updated.

## Documentation accuracy

- Implemented, checked, planned and assumed information are kept clearly apart.
- A feature existing in code is not evidence that it works correctly. Unmeasured performance figures and tests that were not run are never reported as successes.
- Important findings are recorded with severity, source location, impact, fix approach and acceptance criteria.
- `activeContext.md` and `progress.md` are updated at the end of every meaningful piece of work. New decisions are recorded in the relevant architectural or technical context.
- Older documents about product direction do not override the current decision. Where the current state and a historical goal conflict, the conflict is stated explicitly.

## First application of these principles

The 15 October 2026 review was an assessment and documentation exercise only. Listing problems does not mean they were fixed. The open issues and verification limits at that time are recorded in `audits/2026-10-15-project-audit.md`.

## Start of implementation

The first improvement package was implemented under the further instruction of 15 October 2026. Current results are in `progress.md` and `implementation/2026-10-15-foundation.md`; the earlier audit is kept as history.

## Design standard (addendum of 15 October 2026)

A modern, simple, clean and careful design is mandatory. Current official examples from Vercel/Geist and Linear serve as references; visual decisions are kept in `design-system.md`. The old iOS/pastel/glassmorphism direction is obsolete. Neutral surfaces, clear typography, thin borders, measured spacing and purposeful colour are the rule. Code and file names are in English; user-facing text comes from the interface catalogs.

## Local account and secrets (15 October 2026)

The owner's explicit first-setup instruction authorised creating a new local environment, database and administrator account. That permission is not a permission to reset, restore or seed the real database for verification in the future. Administrators are created and recovered through `admin:manage`; the password is read only from a private, Git-ignored file. Secret, password and token values are never copied into the memory bank, chat, command arguments or logs. Records only keep the file path, the permission scope and the verified result.

## Configurable site identity (16 October 2026)

The site name, description, logo and icon on every visible surface derive from a single public branding source. New screens never hard-code a product name. The administration panel exists; the existing administration flow is extended first. Private administration settings are never exposed through anonymous APIs or the persistent browser cache. No test name is given to the real site unless the owner chooses a new name.

## Continuing with several tools (16 October 2026)

The owner may also continue development with other AI assistants because of usage limits. When continuing, `progress.md` and the current code are the basis together; completed work is not reopened from an old chat list or overwritten with an earlier implementation. Unfinished scope is completed, and the integration and runtime environment affected by new changes are verified separately. Historical test results are kept apart from current totals.

## Test discipline (17 October 2026)

The owner re-emphasised a safe, disciplined and professional way of working and noted that the necessary tests may also live under `tests/`. New screen-flow regressions for the administration screens run under `frontend/tests`, and those files are covered by strict TypeScript and ESLint. Existing colocated `src` tests and `backend/tests` are not disturbed or duplicated by bulk moves. A test's location is not evidence of success: the behaviour, error, rollback and account boundaries and the build and lint gates must pass. Mocked API, real HTTP/SQLite and manual browser evidence are kept apart; the real user database is never a fixture for any verification.
