# Shared Planner — 16 October 2026

## Scope

The owner asked to continue with the remaining work. The current `progress.md` and the A17, A18 and A24 work completed with other tools were the basis; the old chat list was not applied. The A21 package unifying the daily and weekly planner was completed. The UI for students managing their own records and topics and the other modal and administrator design conversions were separate open A21 tasks. A19, A22 and A04 were not closed.

`WeeklyPlanner` and `DailyCalendar` are now small entries that only pass a mode to the same `PlannerCalendar`. The shared command and state layer is `usePlannerCalendar`; the card is `CalendarSessionCard`; the time, segment and snap rules live in `calendarGeometry`. No second implementation of the same business rules and no old calendar engines were kept in the source. The unused `WeeklySchedule`/`DragItem`/`DropTarget` types and the old `formatTime` helper path were removed after a reference check. Backend endpoints, the database schema and dependencies did not change. A temporary `npm exec` Prettier 3.9.10 was used for formatting; no formatter dependency or lock change was added to the project.

## Behaviour

- Daily 64 px and weekly 48 px per hour; both cover 24 hours with a shared neutral surface, heading and named state controls. Card colour is only a thin left stripe. The initial 08:00 viewport, week and day arrows, Today, navigating by holding a drag over an arrow for 800 ms and the previous/next period drop zones are kept.
- Drag snaps to 15 minutes and resize to 5 minutes; resize is limited to 5 minutes–24 hours. A drop start that is negative or slides into the next day is clamped to 00:00–23:45 of the visible day. The preview and the commit come from the same pure rules; the mouse position is recomputed at drop time.
- Date moves, grid drops and period moves use the same `moveSessionTimes` path. The real planned end-minus-start duration is kept; no new duration is invented from the rounded `duration`. The time zone lives in the shared `CalendarDate` → real instant conversion; a missing or repeated DST hour stays an error.
- The conflicting midnight constraints of the two earlier engines and the silent clipping to 23:59:59.999 on resize were removed. The existing backend's 24-hour range contract applies; an overnight session is split across days. Only the start segment can be dragged and only the end segment resized. Dragging the half-card on the next day and moving the session's start to the wrong day is prevented. The displayed duration is the planned duration; no measured study is produced.
- Running and completed cards accept no drag or resize. The server stays the authority for permissions, range overlap, state and the optimistic `expectedUpdatedAt`. A local overlap guess does not replace the server check. Start, pause, complete and delete and the date and duration writes go through a single perform boundary with a synchronous busy ref; a fast double click produces no second request. No fake success or order is shown before server confirmation.
- A 409 is not an automatic write retry. The current query is read and the open moving or confirmation snapshot is refreshed. The target date and month selection are kept, and the current source time is shown in the dialog. The person's new confirmation writes with the current version. A failed read or move is never presented as empty or successful. If the auth epoch changed, a late mutation acknowledgement produces no cache refresh or success notice.
- Resize runs on `pointermove`/`pointerup`/`pointercancel`; Escape, blur, a visible-period change or a time-zone change cancels it. No asynchronous write happens before the preview ends; a click arriving after drag or resize does not open edit or create. Touch was not verified end to end.
- The planner modal uses the existing shared Pomodoro hook and engine. Closing or minimising the modal, reopening it and the server deadline policy did not change. Clicking a session card opens the real edit form; small cards and the context menu have the same actions button and dialog.

## Shared dialog and time fixes

`MoveSessionModal` moved to a Headless UI Dialog: the focus boundary, Escape and outside close, the accessible name of the date button and its selected state are kept. It does not close while pending; a false result keeps it open as an error. A source refresh does not reset the target selection. Switching to another session starts fresh on the next open.

`ConfirmDialog` uses neutral tokens and surfaces; only destructive actions are red. The asynchronous callback is awaited, double confirmation is blocked, and it cannot close while pending. A false result keeps it open, and an unexpected exception shows a visible error. Existing void callback calls stay compatible. Older callers that swallow their own errors and return void were not converted to this new failure contract automatically; the remaining surfaces were tracked under A21.

A new fractional-duration test found that `calendarViewInstant` dropped the `CalendarDate` milliseconds. The shared adapter now adds the view's milliseconds to the `wallTimeToInstant` result. Time-zone and DST rejection did not change; no offset ISO or persisted contract or old data was rewritten. A contracts test and the planner move test verify the full round trip.

## Verification

`npm run check`: **8 contracts + 123 backend + 74 frontend = 205 tests**, nothing skipped; naming, strict type checks, lint with zero warnings and the production build passed. 21 new frontend behaviour tests:

- Geometry (6): equal snap and resize with limits at two grid heights, fractional real duration, overnight segments, DST gap and fold rejection with real duration, and the running/completed lock.
- Planner (12; the same matrix for daily and weekly): real event drag and resize, server confirmation and version, blocking a second write, Escape cancel, refetch on a stale version with an explicit retry that keeps the target, late auth acknowledgement isolation and GET error with retry.
- ConfirmDialog (3): waiting for asynchronous confirmation with the duplicate and close lock, an explicit retry after false, and an unexpected error.

Every earlier regression, including the three earlier planner and Pomodoro access tests, passes. No test was skipped and no strict setting was relaxed.

The production build was checked in a real browser on 127.0.0.1:3001 / API 5003 with a separate temporary SQLite database and a student account:

1. A weekly 09:00 / 60-minute session was moved to 11:15 with a native drag.
2. The card's bottom edge was extended by 30 minutes with the pointer; the title showed 90 minutes.
3. Actions → Move to date → the next day; the daily view and a reload showed the same 11:15 / 90-minute card.
4. The real edit form showed the next day, 11:15, 90 minutes and a 12:45 end; Escape closed it.
5. A 5-minute card and the two daily segments of an overnight session were visible.
6. A read-only fixture database assertion: 3 planned sessions, the moved session the next day 11:15–12:45 / 90 minutes, every user note and the other two sessions unchanged; `session_intervals` empty, integrity and foreign keys clean.

Visual evidence: `/Users/ozcelik/.codex/visualizations/2026/10/15/01a13e5c-eabf-70f1-bd97-3a490ffe1079/shared-planner-verified.png`. The account was signed out; the tab, fixture processes, temporary database and ignored fixture script and config files were cleaned up. This manual smoke test is not an automated browser or load test. The stale retry and auth epoch additions were verified in component tests; no second manual browser round was made for the last small retry change.

In the static production output the PlannerPage route chunk went from about 91.58 kB / gzip 18.16 kB to 59.34 kB / gzip 15.42 kB. This is a comparison of the route file; it is not the whole first screen, network latency, Lighthouse or a user performance score.

## Local environment and open limits

No migration, seed, reset, restore or test data was written on the real database; schema 006 was kept. The single root dev server was restarted cleanly for the current contracts and Vite pre-bundle cache: localhost:3000 / API 5002. Earlier developments were kept; no commit, push or deployment.

The A21 UI for students editing and deleting their own records and topics and the remaining modal and administrator design consistency were the next tasks. A19 (contracts and the Plan decision), A22 (full keyboard and touch calendar, browser tests, WCAG, Lighthouse) and A04 (off-site copies, retention, capacity, recovery operations) were open. The 12 dependency audit nodes were the open backlog of the earlier record; no new audit or major upgrade was done in this package.

A separate row for a repeated DST hour, non-overlapping minimum hit areas for very short neighbouring cards, roving keyboard focus in the calendar and large-data and load measurement were not implemented. The unification did not close the whole accessibility or performance backlog.
