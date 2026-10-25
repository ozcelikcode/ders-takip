# Study Tracker — Product Context

Last updated: 25 October 2026 (R15 rewrote this document after the 19 October product-direction decision; the earlier exam-specific scenarios are in Git history).

## Why it exists

People cannot see in one place what they are working on, how much time they give it and how close they are to their goal. The plan is in one place, the timer in another, and progress nowhere. Whatever the field (school, work, personal goals, skills), this product offers one simple place to plan work, do it with focus and see it in measured time.

### Problems it solves

1. **Scattered plans:** it is unclear when to work on what. → Session planning on the calendar, weekly routines and today's list.
2. **Invisible progress:** nobody knows how much was done; planned and actual time blur together. → Only measured time counts, compared with the goal.
3. **Tools that do not fit:** ready-made systems are built for one audience. → Vocabulary presets, personal categories, personal goals and rhythm.
4. **Not knowing where to start:** an empty screen. → The welcome wizard and personal recommendations on the dashboard.

## Core values

- **Simplicity:** few but clear screens, everything as tidy as a menu.
- **Reliability:** data is never lost, measurement is correct and conflicting changes are handled openly.
- **Fit:** people choose their own words, categories, goals and rhythm.
- **Honest progress:** measured rather than planned time; encouraging but never inflated feedback.
- **Data ownership:** people can download their data, take it to another site and delete their account.

## User journeys

### New user
1. Signs up (the browser's time zone is filled in automatically), or an administrator creates the account.
2. Welcome wizard: purpose (school, work, personal, skill, other) → vocabulary; time zone, week start, active days, daily goal (hours and/or minutes; the weekly goal follows); focus rhythm; a personal category and first records (checkboxes). It can be skipped, or replaced by loading an exported data file.
3. Sees recommendations that fit them on the dashboard (for example "Plan a session for today" or "Add a sub-record to X").

### Daily flow
1. The dashboard shows today's goal, recommendations, weekly progress and per-record goals.
2. Places or moves sessions in the planner.
3. Works with the focus timer; time is measured.
4. Adds notes to a session when needed and finds old notes with search.
5. Picks a range in Statistics and compares the distribution with the goal, optionally filtered by tag.

### Administrator
Manages users and the shared catalog, chooses the site identity, language and default vocabulary, takes backups, hands out password reset links and reviews the activity log.

## How it should work

- **Planner:** daily and weekly views, drag and drop, keyboard creation, a clear warning when two tabs conflict.
- **Focus timer:** durations come from the person's rhythm; the phase state lives on the server and continues after a reload.
- **Goals:** the daily goal applies only on active days; weekly goal = daily goal × active days.
- **Statistics:** old unmeasured time never enters the totals, and this is stated openly.
- **Search:** ignores case and Turkish letter forms and searches only data the person can see.

## Success indicators (targets; no measurement infrastructure yet)

- A new user plans their first session in under 2 minutes.
- Share of accounts that finish the setup or deliberately skip it.
- Share of weeks in which the weekly goal is reached.
- A smooth flow on mobile (no horizontal overflow, large enough touch targets).

## What sets it apart

1. **Field-independent and adaptable:** vocabulary, personal categories, goals and rhythm belong to the person.
2. **Measured time:** planned and actual time are kept apart.
3. **Planning, focus and statistics in one place.**
4. **A simple bilingual interface** (English and Turkish, one site-wide setting).

## Deliberately not included for now

AI suggestions, social or competitive features, offline use or a PWA, native mobile apps, learning content. Dashboard recommendations are rule-based, not AI.

## Current decision notes

- **Design (15 October):** neutral, simple, in the Vercel/Geist line; `design-system.md`.
- **Brand (16 October):** site name and logo come from an administrator setting and are not tied to code names.
- **Plans and sessions (17 October):** the calendar and the timer work on `StudySession`; a Plan is an optional dated goal container, is not required for a session and is never derived from dates. Deleting a plan never deletes session or measurement history.
