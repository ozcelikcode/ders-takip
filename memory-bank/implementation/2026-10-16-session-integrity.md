# Session Integrity — 16 October 2026

## Scope

The owner asked to continue with the open work list. A07/A08 were implemented: atomic create, move and resize, a shared state policy and detection of stale client writes. Separating planned and real duration (A09), time zones (A16) and a single Pomodoro engine (A15) are not part of this package's completion claim.

## Write boundary

StudySession HTTP writes are unified in `services/studySessions.ts`. Every create, update, action and delete runs in an SQLite IMMEDIATE transaction. Ownership, the current row, relation access, overlaps, state and the single running session are read from the same transaction; the response snapshot is derived from this operation before commit. No other API write can come between the check and the write. SQLite's single-writer IMMEDIATE behaviour was confirmed with the [official transaction documentation](https://www.sqlite.org/lang_transaction.html). If direct SQL or an external writer does not apply these service rules, the same field policy is not guaranteed; no database triggers were added.

Ranges are `[startTime, endTime)`. A start equal to an end is accepted; partial, contained, containing or equal overlaps get 409. planned, in_progress, paused and completed reserve their range; cancelled frees it. Create, move/resize and reactivating cancelled → planned use the same check. An update excludes its own id. Historical overlaps are not changed in bulk; metadata edits or completion do not silently repair those rows.

Start and end must be ISO instants with an explicit offset or Z; the duration is validated between 1 minute and 24 hours. `duration` is derived on the server; the client cannot write fields such as `duration`, `completedAt` or `userId`. The form and API types come from the shared contracts source. On update, the chosen plan, record and topic are also checked for owner/global/administrator access, active status and topic-record consistency. A contract for clearing relations with null was not added in this package.

`expectedUpdatedAt` is mandatory for PUT, start, pause, complete and DELETE. The row is loaded inside the transaction; an old snapshot gets 409, a missing or malformed field 400 and a foreign row 404. The ORM `beforeUpdate` hook advances `updatedAt` by at least 1 ms over the previous value, so fast writes or a clock going back never produce the same version. No new column or migration was needed. Bulk catalog and foreign-key changes and external SQL are outside this optimistic version contract; catalog integrity was open under A10.

A client that gets a 409 refreshes every session query view of that account; the old mutation is not repeated automatically. The form keeps the user's input, and a retry against the current data is required. The frontend adds the snapshot version the user saw to every write path; PUT and the action endpoints call the same service.

## State policy

| From | Allowed different target states |
|---|---|
| planned | in_progress, completed, cancelled |
| in_progress | paused, completed, cancelled, planned |
| paused | in_progress, completed, cancelled, planned |
| completed | planned |
| cancelled | planned |

A transition to the same state with a valid version is a no-op; completing again with unchanged fields does not change `completedAt`/`updatedAt`. Notes and productivity can be edited separately. A stale repeat still gets 409; the client must read the current snapshot first. A completed or cancelled row needs an explicit transition to planned instead of being started directly. `completedAt` is written on the server only at the first completion and becomes null on reopening. The existing `duration` is not converted into real measured time.

Each user can have one in_progress session; to start another, the current one is paused, completed or cancelled. Several paused sessions can exist. A planned or paused row whose end has passed cannot be started; its times must be updated. An active row whose end has passed can be paused or completed; writing back to planned during an error response was removed. GET is still side-effect free; no automatic cancellation policy on expiry was set up. The old daily and weekly effect that refetched endlessly on that assumption and the move debug output were removed.

## Interface links

The daily and weekly calendar, the session form, the daily summary and both Pomodoro surfaces use the versioned transport. A Pomodoro mutation response is kept as the current snapshot; an older copy from a query does not overwrite it. A snapshot change does not restart the timer phase. If the server rejects a start, the modal timer does not start running.

A browser check found that the separate Pomodoro page's large Pause button changed only the local `isRunning`; it was bound to the real pause action. Resume uses the server start action. Related timer controls are disabled while an operation is pending. These link fixes do not solve the tick and deadline, reload, background, multi-tab ownership and phase and break measurement problems; the two engines still had to be unified at that time.

## Verification and operations

The last `npm run check` passed: **5 contracts + 67 backend + 36 frontend = 108 tests**, nothing skipped; strict type checks, lint with zero warnings, naming and two production builds passed. No dependency changed in this package; a clean `npm ci` had been verified in the previous package. Meaningful regressions: four concurrent creates, two moves to the same free range, end-boundary and overlap variants, partial resize, reactivation after cancellation, stale edits, actions and deletes, monotonic timestamps, concurrent starts and user separation, terminal transitions, repeated complete, a late pause, relation access and transaction rollback on an error injected after an SQL write. Every database test uses a disposable, separate SQLite file.

Frontend: version transport and 409 cache refresh over real HTTP for every write type; the modal start → pause → complete versions and a rejected start; a component regression for the separate page's main pause → resume buttons. This is not a full automated browser or load test.

The production bundle was opened on a separate 127.0.0.1:3001 frontend / 5003 API with a disposable SQLite fixture with two sessions. The first start succeeded and a second concurrent running session got 409; the main pause → resume → complete was verified in the list and the timer summary. The local-only bug in the large pause button was found by this test, fixed and given a component regression. Evidence outside the repository: `session-integrity-completed.png` (same Codex artifact folder). The test account was signed out, tabs and fixture processes closed and the temporary database removed.

No migration, seed, reset or restore was applied on the real user database; this package changes no schema. The new API and frontend must be used together; an old open tab does not send the new version field, so it can get 400 on a write and must reload. No commit, push or deployment was made. The open order at that time: A09/A16 → A10 → A15/A17/A18 → dependencies, browser tests, accessibility and recovery operations.
