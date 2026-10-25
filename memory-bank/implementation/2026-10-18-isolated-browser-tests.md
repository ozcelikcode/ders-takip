# A22 — Isolated browser journey tests

18 October 2026. The owner asked to continue from where the work stopped. The whole memory bank and the current source were read; the starting tree was clean at 121e222. The earlier A19/A21 and two A22 packages were kept. This package adds the first automated real-browser test gate; it is not a claim about all of A22 or production readiness.

## Implementation

- The root dev dependency `@playwright/test` was pinned to 1.64.1; engine compatibility with Node 24 was checked against the npm registry and the fixture, project and CI path against the official documentation. The runtime and major dependencies of the three workspaces did not change. The known 12-node audit backlog in the lock (5 high / 7 moderate) continued.
- `npm run test:e2e` builds the production contracts, backend and frontend and runs the browser-test strict typecheck, then runs six scenarios on desktop Chromium, desktop WebKit and Pixel 7 Chromium emulation. The Pixel viewport is 412×839 CSS px; this is not a physical Android or iOS test or an installed Safari test.
- `tests/e2e/fixtures.ts` sets up a new browser context, an empty owned `mkdtemp` folder and a separate child process for every test. The child uses its own random JWT, two synthetic accounts, SQLite, a backup folder and an OS port on 127.0.0.1. No already running server, base URL or real database path is reused.
- The production frontend API path is forced to `/api` at build time. A browser route guard blocks requests outside the fixture's own origin. Auth runs through the real form, API and cookies; there is no token or state injection. Apart from the controlled 503 in the notification error scenario, success and 409 responses are never mocked.
- The backend does not load the local `.env` when `NODE_ENV=test`. A new child-process regression verifies that the dotenv load is never called; normal development and production behaviour is kept. The test child environment is controlled; `TMPDIR` is passed explicitly so the macOS temp path is the same in parent and child.
- At the end, integrity and foreign keys, every column of five source sessions that must not change, the 300-second interval history and the moved session's note are compared. The child also stops on error, and `finally` removes the temporary data. If the cleanup or protection check fails, the browser test fails. An OS hard kill is not covered by the `finally` cleanup guarantee; there is still no access to real data.
- Test sources are covered by strict TypeScript, ESLint and the ASCII check. The generated HTML, trace and screenshot folders are outside Git and ESLint; no new ignore, `any` or skip was added to suppress errors in sources. forbid-only is on and retries are off. A single worker is used so window focus assertions do not race with another window.
- CI adds browser install, the browser tests and report and trace artifacts kept for 7 days to the existing quality chain. No remote GitHub run was made; local success does not replace it.

## Scenarios

1. Real sign-in, HttpOnly/SameSite cookies, reload bootstrap, a second account in the same browser context and no leak of the earlier private data.
2. Creating a private session from the UI → changing time and duration with native fields → `expectedUpdatedAt` and the server acknowledgement → persistence across reload.
3. The same version in two tabs; the second tab saves → a real 409 in the first tab → the dirty draft is kept → an explicit confirmation with no automatic write retry → success with the current version and note.
4. One-minute neighbouring and cancelled cards with at least 24 px non-overlapping target boundaries; roving hour, Home, Arrow, Enter, editor and Escape, and 23:59 focus.
5. A 503 on the completed-notification query with error/empty separation; a real API retry, local read state and Escape with focus.
6. Responsive menu tap, Escape, focus and closing on link; the mobile daily default and horizontal page overflow.

## Focus race found

The real-browser tests showed that a single RAF scheduled from `onClose` before `MoveSessionModal` closed could race with the React commit and the Headless UI passive cleanup. `PlannerCalendar` now keeps the session ID to return to in a ref; the effect RAF after the commit where moving is closed and pending is false moves focus to the current card or the Today button. The effect cleanup cancels a pending RAF; the old `restoreSessionFocus` path was removed. Focus expectations were not loosened.

Because the outer Headless UI dialog container can have zero height, test visibility is measured from the heading and controls in the fixed panel. Returning to a tab is modelled as a real user step with `bringToFront`. These are not fake time waits or test retries.

## Final verification

A clean `npm ci` passed. After the focus fix, `npm run check`: 18 contracts + 143 backend + 200 frontend = **361 workspace tests**, nothing skipped; workspace and browser-test strict mode, naming, lint with zero warnings and the production build passed. Then `npm run test:e2e`: **18/18 main matrix runs** passed. The two focus scenarios were also repeated three times on three profiles: **18/18**; these repeats are not added to a total of 379 to inflate the main test count.

The clean install, check, matrix and focus regression outputs were logged outside the repository. The local HTML report is `playwright-report/index.html` and the generated artifacts are in `test-results/`; both are outside Git. The final cleanup of fixture processes and temporary folders was checked separately. No temporary folder was left even after failed development runs. No remote CI run was made.

Test commands, sources and scope are in `tests/e2e/README.md`.

## Open limits

Full WCAG and screen readers, Lighthouse, the DST fold, physical touch devices, native drag and resize and automated browser coverage of the full administrator and Pomodoro phase flows stayed open. A04 off-site copies, retention, load and recovery and major dependency work were not closed. No new API or migration, no test writes, seed, reset or restore on the user database and no reading or changing of the real administrator password. No commit, push or deployment.

Official sources: [Playwright fixtures](https://playwright.dev/docs/test-fixtures), [projects](https://playwright.dev/docs/test-projects), [CI](https://playwright.dev/docs/ci-intro), [upload-artifact v7.0.2](https://github.com/actions/upload-artifact/releases/tag/v7.0.2). A temporary server per test and `.env` isolation are decisions of this project.

Local close: no dev listener was running, so a single root `npm run dev` was started. The frontend on localhost:3000 returned HTTP 200 and API 5002 health was OK; one service per port. No test fixture child or temporary database folder remained; the real schema 006 was kept.
