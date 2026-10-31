# Browser journey tests

This suite runs the production frontend build against the real Express API, authentication and cookie middleware, and SQLite. It does not replace the Vitest and Node tests; it is an additional browser gate for the main journeys.

```bash
npm ci
npx playwright install chromium webkit
npm run check
npm run test:e2e
```

On Linux CI, use `npx playwright install --with-deps chromium webkit` to install the browsers' system dependencies. `npm run test:e2e -- --project=chromium-desktop` runs a single profile. `npx playwright show-report` opens the local HTML report and `npx playwright show-trace test-results/.../trace.zip` opens a failure trace.

## Isolation and lifecycle

- `run.mjs` first builds contracts, backend and frontend and type-checks the browser tests strictly. The build sets `VITE_API_BASE_URL=/api` explicitly, so nothing is built against an external API.
- Every test gets its own empty `mkdtemp` directory, SQLite file, random JWT secret, two synthetic users and an administrator, and a loopback port chosen by the operating system. A running development server is never reused, and there is no option for an external base URL or database path.
- The child process receives only a controlled environment. With `NODE_ENV=test` the backend does not load `.env`. The real administrator password, user database, snapshots and backups are never read. The normal seed, reset and restore commands are never called; migrations run only on the new temporary database.
- Sign-in goes through the real authentication form; no tokens or application state are injected into `localStorage`. The browser context may only reach the fixture origin; external addresses are blocked.
- The process closes after success and after failure. On shutdown the fixture compares SQLite integrity and foreign keys, five sessions that must not change, their notes and the seeded 300 seconds of measured history; if cleanup fails, the test fails. A scenario that sets `test.use({ clearsStudyData: true })` instead verifies that every session and every non-administrator account is gone. If shutdown stalls, only the test child is terminated, and the owned temporary directory is removed in a `finally` block. If the operating system or the test runner kills the process during bootstrap, that guarantee does not apply; the directory still contains only temporary test data.
- `test-results/` and `playwright-report/` are ignored by Git; generated report scripts are excluded from lint, while the test sources are covered by strict type checking, lint and naming checks. Traces and reports contain only synthetic credentials and fixture data. CI keeps artifacts for 7 days.

## Scope

41 scenarios (behaviour and accessibility scans) run in desktop Chromium, desktop WebKit and Pixel 7 mobile Chromium emulation: 123 runs in total (24 October 2026). The mobile profile uses a 412×839 CSS px viewport and touch input; it is not a real Android or iOS device, nor an installed Safari. Every scenario gets a new database and browser context; tests are order-independent and run without automatic retries or skips. A single worker is used so that focus assertions in the active window never compete with another browser window.

The original journeys:

1. Real sign-in, reload with the `HttpOnly`/`SameSite` cookie, and data isolation for a second account in the same browser context.
2. Creating a custom session in the UI, changing its time and duration with versioned writes, the server's response and persistence after reload.
3. The same snapshot in two tabs: the second tab saves, the first gets a real 409, its unsaved draft is kept, and a retry succeeds only after explicit confirmation, keeping the notes.
4. 24 px targets and non-overlapping pixel bounds for short and cancelled neighbouring cards; keyboard navigation of empty hours, the editor and Escape; the focus outline on the last minute of the day.
5. A single controlled 503 injected into the notification query, telling errors from empty data, re-reading from the real API, local read state and focus return. No other successful API response is faked.
6. Responsive navigation, closing the mobile menu by tap, Escape, focus or link, the daily default view and no horizontal page overflow.

Later scenarios cover, among others: a Pomodoro session through start, pause, reload, resume and completion, with the measured time shown on the dashboard (the server timer comes back with the same remaining time after reload, and only running time is added to the seeded 300 seconds); weekly routines; per-record goals; the calendar subscription; tags and tag filters; moving an account through an exported data file; the page switcher; and the administrator journeys: creating an account (the new account lands in the welcome wizard), deactivating it (sign-in is refused with the account-disabled message), the site name appearing on signed-out pages, promoting an account to administrator and deleting it (the deleted account gets the invalid-credentials message), a shared category appearing in a user's record form, restoring a backup (undoes a later site-name change and asks everyone to sign in again; only in the fixture's temporary `BACKUP_DIR`), moving shared records to the chosen category when a category is deleted, resetting only the site settings (accounts and seeded sessions stay), clearing all user and study data (the confirmation lists everything that will be deleted, a safety backup remains, student sign-in is refused and administrator sign-in still works), the idle session limit (values outside 1–1440 show a field error, a valid value survives a reload), refusing a role change with a wrong confirmation password and finding the attempt in the activity log, and closing registration plus maintenance mode (the administrator keeps working, a signed-in student sees the maintenance screen, student sign-in is refused and `/register` reports that registration is closed).

A dialog's outer container is `relative` and may have zero height, so visibility is checked through the heading, field or controls of its fixed panel. In the two-tab scenario the user switching back is modelled with `bringToFront`; a focus event in a background WebKit tab does not count as success. Waits rely on observed responses, DOM and focus states rather than fixed sleeps; the only exception is the Pomodoro scenario, which deliberately lets measurable time pass (3 s + 2 s). The suite also covers a focus race found in a real browser after a move: focus return is scheduled in an effect after the closed dialog commits and is cancelled on unmount.

Out of scope for these tests: DST fold rows in the grid, real touch devices, native drag and resize, Pomodoro phase transitions (break and cycle), and an idle session actually expiring after a real wait (at least the access-token lifetime, 15 minutes; the logic is covered by the backend `runtime-settings` test). Automated scans are not full WCAG or screen-reader conformance. The existing unit and API regressions keep covering these areas within their own limits. The CI workflow runs this suite with one job per browser profile, after the check job.

References: [Playwright fixtures](https://playwright.dev/docs/test-fixtures), [projects](https://playwright.dev/docs/test-projects), [CI](https://playwright.dev/docs/ci-intro). Using a per-test fixture instead of one shared `webServer` is this project's data-isolation decision.

## Accessibility and Lighthouse

`npm run test:e2e` also runs axe-core scans in all three profiles. In both the light and the dark theme it scans the public and student pages, the open profile, password and personal settings sections, the daily calendar, the move dialog, the Pomodoro editor, the routine editor, the page switcher, the tag manager, and the administrator pages and site settings sections including the activity log. axe runs its default rules plus the explicitly enabled WCAG 2.2 target-size rule; there are no excludes, disabled rules or accepted violation baselines. Every violation fails the test; incomplete results are stored separately as JSON and need manual review. Scans wait for visibility, loaded data, fonts and finite animations, and an error screen is never scanned as a success.

```bash
npm run test:e2e -- accessibility --project chromium-desktop
npm run test:lighthouse
npx playwright show-report lighthouse-report
```

Lighthouse 13.5.0 measures the sign-in page and a dashboard reached through the real form and cookie, separately in desktop and mobile emulation. It uses the same isolated app fixture; only an empty temporary Chromium profile and a CDP loopback port are opened, and both are cleaned up in `finally`. The expected title and final URL of the page Lighthouse opens are verified, and a dashboard measurement that was redirected to sign-in is rejected. External traffic is blocked. `disableStorageReset` only keeps the synthetic session; no real profile or injected authentication header is used.

Desktop: 1350×940, DPR 1, 40 ms RTT / 10 Mbps / 1× CPU. Mobile: Lighthouse's default mobile viewport and simulated throttling. Every test starts with a new profile; signing in may warm up dashboard assets. The fixture serves JS and CSS gzip-compressed as production does (Node zlib), but it is still not a CDN, HTTP/2, cache or real deployment; production servers must compress with gzip or brotli. The JSON and HTML reports contain the four categories, FCP, LCP, TBT, CLS and the version and settings used. The accessibility category must score 100; no performance threshold is placed on a single noisy local run. These numbers are not field performance, CrUX, SEO or full WCAG evidence. Use `npm run test:lighthouse -- --repeat-each=3` for three repetitions.

`lighthouse-report/`, `lighthouse-results/` and `test-results/**/axe-*.json` are ignored by Git and included in the CI artifacts. The fixture never changes the real database; administrator scans save no settings and never call restore or reset. The scope and measurement record are in `memory-bank/implementation/2026-10-18-accessibility-and-lighthouse.md`.

References: [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing), [Lighthouse Node API](https://github.com/GoogleChrome/lighthouse/blob/main/docs/readme.md), [authenticated pages](https://github.com/GoogleChrome/lighthouse/blob/main/docs/authenticated-pages.md).
