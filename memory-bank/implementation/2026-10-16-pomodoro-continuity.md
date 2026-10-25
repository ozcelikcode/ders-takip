# Persistent Pomodoro — 16 October 2026

## Scope and decisions

A15 was completed. The independent timer engines of `PomodoroPage` and the planner modal were removed; both use the shared `PomodoroTimer`/`usePomodoro`. The duplicated daily and weekly planner commands were open under A21 at that time. Technical names are English; neutral surfaces, typography and named controls follow the design system.

The server owns the clock and the phase machine. `005-pomodoro-clocks` adds a one-to-one `PomodoroClock` with cascade to StudySession: `phase`, `cycle`, `remainingMilliseconds`, `deadlineAt`, `autoStartBreaks`, `completedWorkCycles`. No unknown phase, deadline or measurement is produced for old sessions. A legacy running timer is activated explicitly; the start action of a new or planned session creates work / cycle 1. Changing a live duration setting requires an explicit planned/reset; reset never deletes measured history or the person's note.

When work ends, the short or long break starts paused. If `autoStartBreaks` is chosen explicitly, the break starts at the work deadline; when a break ends the next work phase is always paused. After a long outage, at most the finished work phase and the chosen break advance; no new work phases are produced by themselves. Closing the browser or modal, changing routes and reloading are not pauses; the UI says so. The earlier rule that a paused session whose planned end has passed cannot resume still applies; it must be rescheduled.

## Command and duration integrity

`POST /api/study-sessions/:id/pomodoro` uses a strict command/`expectedUpdatedAt` contract. `resume`, `pause`, `reset`, `complete` and `configure` go through the shared IMMEDIATE transaction in `services/studySessions.ts`. `configure` accepts only a boolean `autoStartBreaks`; the client can never write the phase, deadline or counters. The general planner start, pause, complete and reset actions manage the same server clock. Permissions, the single running session, the optimistic 409, monotonic `updatedAt` and terminal-state policies are kept. The same resume with no change produces no new version or deadline. A clock-only change also advances the session version. Under fault injection, the clock, session and interval roll back together.

The scheduler wakes every second, re-reads the oldest 100 due rows and settles each inside a transaction. The phase boundary is the persisted deadline, not the callback time. `recordActivity` receives a boundary only through the internal server path; users cannot write dates, and the end of the previous interval can never move back. When the worker is late, the read-only GET and stats cut an open study or break interval at the deadline. The worker later closes it at the same boundary; pauses are measured separately. Old `untracked`/`partial` coverage and past measurement are kept.

The scheduler joins the maintenance gate through `withDatabaseActivity`. Before restore, reset or snapshot, in-flight background work is drained and no new work starts. Draining has a controlled 10-second timeout. Startup catches up on due clocks; shutdown stops the timer and waits for the current work. Coordination is tested within a single backend application; multi-process operation and load were not verified.

## Client, account and tabs

The hook derives the display from the server's `serverNow`/deadline observation using the larger of the elapsed wall-clock and monotonic time; the 250 ms callback only re-renders and never subtracts seconds. Focus, visibility and reconnect trigger a re-read. The detail refreshes every 30 seconds, every 2 seconds when due and every 30 seconds after an error. The list refreshes every 60 seconds and also finds an unfinished session from the previous day. Hidden and offline queries follow the TanStack lifecycle. At zero a GET is made; the client never sends a phase-advancing mutation.

The same account/session query key is shared between page and modal. An old `updatedAt` or an older server observation of the same version never overwrites a newer snapshot. Query and mutation responses are protected by the auth epoch; an acknowledgement after logout or an account switch cannot bring back `onComplete` or the cache. When a command is rejected, the timer does not start without server confirmation; the error is visible and a retry is possible.

Browser verification exposed an invalidation mismatch between the numeric API `user.id` and the string view query key. The shared factory now normalises both with `String`, and this is tested separately. BroadcastChannel carries only `sessions-changed` and the user id; it sends no private session content or credentials. Other devices stay consistent through periodic and focus reads and the server's optimistic version; no WebSocket was set up.

The paused Pomodoro play action in the daily and weekly planner now opens the shared modal and never starts a second timer. "Open timer" in the context menu reaches the running or paused timer. Escape, the backdrop and close all close the modal. The previous timer's sound and checkbox implementation, which depended on non-existent `notification.mp3/wav` files, was removed; no sound or push delivery infrastructure was added in this package. The `aria-live` phase region, the progress bar and named controls are kept. No full WCAG audit is claimed.

## Verification

`npm run check` passed: **8 contracts + 116 backend + 51 frontend = 175 tests**, no skipped tests; naming, strict type checks, lint with zero warnings and the production build passed. No dependency was added in this package; the earlier 12 audit nodes (5 high / 7 moderate) were an open backlog at that time.

17 new backend regressions on temporary SQLite with Supertest: millisecond pause/resume, the deadline cap and read-only GET, a late worker, a bounded automatic break, long and short cycles, concurrent worker, command and stale version, note preservation, the general planner actions, no-op, rejecting forged phases and deadlines, atomic rollback, the owner and single-running-session rules, the clock rollback clamp, 005 idempotence, failure and legacy preservation, maintenance drain and skip, session type and duration conversion, legacy activation, reset and delete cascade. The earlier manual `activityKind` test was kept within untimed study; the server now decides the managed Pomodoro phase.

Frontend: acknowledgement and retry, a large callback delay, remount, no mutation at zero, rejecting an old GET, isolating a late acknowledgement after an account switch; a timer from the previous day, a real HTTP command transport, numeric and string account keys and access from both planner modals are tested. The new planner test uses no fixed clock or expired session.

Manual browser evidence on a production fixture, with a temporary account and database separate from the real user database, API 5003 and preview 3001:

- The first work phase switched to a short break on the server after exactly 60 seconds.
- In two tabs the resume/pause notice refreshed immediately; both showed the paused short break at 00:57.
- The weekly paused play opened the shared modal; work was kept as cycle 2 at 01:00.
- Modal start → close → 00:55 on the Pomodoro page → 00:51 after reload; the count did not reset.
- Both tabs were closed. In a new tab the cycle 2 long break came back at 02:00, paused; the next work phase did not start by itself.
- A read-only assertion on the fixture database: 120 seconds of study, 60 seconds of break, `completedWorkCycles` 2, a single open pause and the person's note unchanged.

Screenshot: `/Users/ozcelik/.codex/visualizations/2026/10/15/01a13e5c-eabf-70f1-bd97-3a490ffe1079/pomodoro-persistent-clock.png`. The fixture was signed out; test tabs and servers, the temporary database and the ignored fixture scripts were cleaned up. This manual smoke test is not an automated browser or load test.

## Real local upgrade and data protection

The old dev processes were stopped. A private native SQLite snapshot was taken with integrity, foreign-key and checksum checks; the private pointer `.local/pomodoro-upgrade-2026-10-16.json` (0600) and the snapshot live under `.local`, outside Git. No values, passwords or hashes were written to chat or logs. The explicit `npm run db:migrate` applied only the missing 005. Every old table row was compared with the snapshot and preserved exactly, including identities, passwords, sessions, notes, times and history. The new clock table was empty; no past phase was derived. A manual current-schema backup with id 5 was created. No seed, reset, restore or verification test writes on the real database.

Normal startup changes no schema; if 005 is missing it asks for the explicit migration. An old snapshot with schema 004 or older does not pass the current restore schema gate; it needs a controlled migration on a separate copy or a compatible application version. The single root `npm run dev` was left on localhost:3000 / API 5002. No commit, push or deployment was made.

## Limits and next work

The server's wall clock must be correct. When the clock goes back during an operation, the interval fence and the remaining-time clamp are tested; the product effect of the clock jumping forward and NTP operations are out of scope. A jump in the client's system clock can affect the display until the next server read; the server measurement is authoritative. A person's physical presence or offline work is never invented retroactively; an explicitly started phase runs on the server until its deadline.

The list reads the whole Pomodoro history; paging and capacity for large data were not verified. Polling, rate-limit capacity and multi-process deployment must be handled separately. The duplicated daily and weekly planner code was open under A21. A17, A18 and A24 were implemented later with other tools; the current remaining work is in `progress.md`.

Primary sources on timer callbacks not being an exact clock and on monotonic clock and sleep limits: [Node timers](https://nodejs.org/docs/latest-v24.x/api/timers.html), [MDN setTimeout](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout), [MDN performance.now](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now). The runtime is Node 24; this package was not a runtime upgrade.

## Close after later work

Because of usage limits, the owner completed A17, A18, A24 and additional fixes with other AI assistants; the current `progress.md` and code were the basis and those packages were not re-applied. The unfinished A15 close (browser evidence, cleanup, memory record) was completed. With all the current code `npm run check` passed again: **8 contracts + 123 backend + 53 frontend = 184 tests**, nothing skipped; naming, strict, lint and production build passed.

The pending normal local 006 upgrade for A24 was also completed: the dev processes were stopped; a private native snapshot was verified with checksum, integrity and foreign keys (`.local/topic-progress-upgrade-2026-10-16.json` private pointer, 0600). After `npm run db:migrate` every row of the previous 12 tables matched the snapshot; `user_topic_progress` was empty and no past state was derived. A manual current-schema backup with id 6 was taken. No seed, reset, restore or test fixture writes on real data. No commit, push or deployment.

The evidence limits of the earlier A17, A18 and A24 records were kept; no new manual browser verification of them was done in this close. The next open items at that time were A21, A19, A22 and A04 in the progress list (all later closed).
