# A22 — Automated accessibility and Lighthouse

18 October 2026. Following the owner's instruction to continue with the next task, the existing A22 browser infrastructure was extended. The earlier browser test package had uncommitted changes at the start; they were kept. The whole memory bank was read. No new product scope, API or migration was added.

## Fixes applied

- The sign-in, registration and registration-closed screens use `main`/`h1`; their appearance was kept. Low-contrast dynamic accent links became neutral underlined links, so readability is not lost when the brand colour changes.
- The header account button derives its name from its content instead of an `aria-label` that overrode the visible name and role; an `sr-only` "Account menu" prefix also provides a name on mobile. Focus and Escape behaviour were kept; the existing header regression checks the full new name.
- Lighthouse's target-size audit caught the 18.5 px width of the header Search button; it became at least 24 px. When the same WCAG 2.2 rule was added explicitly to the axe defaults, the 20×20 px show/hide password buttons in settings were also found; they became 32×32 px. The rule was not disabled.
- Profile, user settings and Pomodoro fields were bound with label/id; the password visibility and profile picture icon actions were named. The profile picture URL field is named; the file/URL and working-day choices carry `aria-pressed`.
- The profile heading order, the administration `dt`/`dd` structure and the move-to-date heading were fixed. The calendar scroll region is named with `role=region`; the unsupported `aria-label` path on an unnamed generic `div` was removed.
- The contrast of helper text and the active account state, and the text of "today", the minute mode and the file/URL/day choices, moved to neutral tokens. Personal colours and stored session values were not rewritten. Icon and identity colours stay where they carry meaning.

## Repeatable measurement

`@axe-core/playwright` 4.14.0 and Lighthouse 13.5.0 were added as root dev dependencies with exact pins and lock; Node 24 engine compatibility was checked against the registry. Runtime dependencies and major versions did not change. The install audit continued to show the existing 12 nodes (5 high / 7 moderate).

`tests/e2e/accessibility.spec.ts` scans the public and student pages, the open profile, password, picture URL and personal settings sections, the daily calendar, the move dialog and the Pomodoro editor (at two scroll positions), and the administration pages and settings sections, in light and dark themes. It runs on Chromium and WebKit desktop and Chromium mobile emulation. It waits for fonts, finite animations, a successful data load and visible controls; an error screen does not count as expected content. The axe default rules plus the explicitly enabled WCAG 2.2 target-size rule are applied; there is no exclude, `disableRules` or violation baseline. Every violations list must be empty; the JSON keeps every incomplete result.

The existing per-test temporary app, SQLite and server fixture is used; a synthetic manager account was added. The real administrator password, the real database, seed, reset and restore are never used. The automated browser origin guard, the protected session with its 300-second history, integrity and foreign-key checks and the `finally` cleanup limits continue unchanged.

`npm run test:lighthouse` measures sign-in and a genuinely signed-in dashboard on desktop and mobile with a separate config and report folder. It uses a new, empty, owned Chromium profile, a loopback CDP port from the OS, a real form and cookie sign-in and `disableStorageReset`. External origins are blocked. The expected heading, final URL and runtime errors are checked on the page Lighthouse opens; a dashboard redirected to sign-in does not pass. The heading assertion listens before Lighthouse closes the page. The browser and profile are cleaned up in `finally`; there is no real browser profile and no token or header injection.

The desktop run uses 1350×940 at DPR 1, 40 ms RTT, 10 Mbps and 1× CPU; mobile uses the Lighthouse default of 412×823 at DPR 1.75, 150 ms RTT, 1638.4 Kbps and 4× CPU simulated throttling. Auth preparation can warm the cache; context request interception disables the browser cache. The server is a local HTTP Express static server, not gzip, a CDN or production network conditions. No failure threshold is derived from a single local performance score; the accessibility category is expected to be 100. HTML and JSON reports and FCP, LCP, TBT and CLS are kept. This is not CrUX or field data, full WCAG or real-device evidence.

CI steps for check → browser journeys and axe → Lighthouse with 7-day artifacts are defined; the job time limit is 20 minutes. No remote GitHub run was made. Commands and scope: `tests/e2e/README.md`.

## Verification and remaining work

A clean `npm ci` and the final `npm run check` passed: 18 contracts + 143 backend + 200 frontend = **361 workspace tests**; naming, workspace and browser-test strict mode, lint with zero warnings and the production build passed. The final `npm run test:e2e` passed **36/36**: the earlier 18 behaviour runs plus 18 accessibility runs. Light and dark themes × three profiles gave **150 axe scans with zero violations**, including WCAG 2.2 target-size. No retry, skip or only. No remote CI run was made.

`incomplete` was not turned into success or filtered from the JSON: 18 reports contain `aria-hidden-focus` (36 Headless UI focus-guard nodes) and 44 reports contain `color-contrast` review entries. These are not counts of distinct defects. The `focusable-modal-open` entries belong to dialog sentinels; the existing Escape and focus behaviour is tested, while a screen reader and complete Tab cycle review was open. The reasons for the contrast entries are the native select background arrow, SVG chart labels and short numbers, and partially clipped areas of a scrolled dialog. The editor is scanned at two scroll positions. Contrast computed from the source colours: chart #4b5563 on white 7.56:1, dark #9ca3af on #111 7.44:1; input #171717 on white 17.93:1, white on #1e1e1e 16.67:1. These calculations are not a manual check of every pixel, hover, custom colour and zoom combination. An accessible text alternative for the daily chart data and use with assistive technology had to be evaluated separately.

Synthetic screenshots of the desktop light and mobile dark dashboard and the Pomodoro form were reviewed. A full-page dialog screenshot shows fixed layers in the context of the whole document height; it does not count as real viewport or physical device evidence. Generated JSON, screenshots, traces and HTML reports are outside Git.

In the first Lighthouse run, mobile sign-in performance was 67, with FCP around 5.1 s and LCP 5.4 s; the 90+ target was not met under these conditions. Coverage showed about 353 KiB of unused JS and 43 KiB of CSS, and an estimated 750 ms for render-blocking CSS. These are measurement estimates for one screen; they do not mean the modules are unnecessary across the product or that the savings add up. The expected anonymous refresh 401 on sign-in affects the best-practices score. The `robots.txt` request goes to the fixture's SPA fallback and lowers the SEO score; a production indexing policy is not considered defined. These findings were not hidden, and no audit was disabled just to raise the score. The route and import graph and the shared initial chunk load had to be measured first; production compression, caching and robots settings had to be set up in the deployment context and compared again under the same conditions. A22 screen readers, physical devices, the DST fold, native drag and resize and the full administrator write and Pomodoro phase flows, A04 off-site copies, retention, load and recovery, and major dependency work stayed open. Zero violations in automated scans is not full conformance.

Sources: [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing), [Lighthouse Node API](https://github.com/GoogleChrome/lighthouse/blob/main/docs/readme.md), [authenticated pages](https://github.com/GoogleChrome/lighthouse/blob/main/docs/authenticated-pages.md). The fixture and score gate are decisions specific to this project.

## Final Lighthouse medians

Four screen/profile combinations × three independent runs = **12/12 successful measurements**. Each group used a new app, database and Chromium profile. Lighthouse 13.5.0; accessibility 100 in every run, and the route, heading and runtime checks passed.

| Screen/profile | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| dashboard-desktop | 92 | 100 | 100 | 92 | 1.17 s | 1.47 s | 0 ms | 0.00000 |
| dashboard-mobile | 61 | 100 | 100 | 91 | 6.04 s | 7.52 s | 0 ms | 0.00000 |
| login-desktop | 96 | 100 | 96 | 92 | 1.01 s | 1.09 s | 0 ms | 0.00015 |
| login-mobile | 67 | 100 | 96 | 92 | 5.12 s | 5.43 s | 0 ms | 0.00092 |

The mobile 90+ target was not met in this measurement environment. TBT was zero, but FCP and LCP were high; the next package had to reduce the shared initial JS and CSS load by measuring the route and import graph. The load is not assumed to belong to Lucide just from a single chunk file name; a coverage measurement is not proof of dead code across the application. An uncompressed fixture result does not replace real deployment or field performance. Production caching, compression and the robots and SPA fallback policy had to be verified separately.

The final clean install, check, browser matrix and Lighthouse outputs were logged outside the repository. Reports live in `playwright-report/index.html` and `lighthouse-report/index.html`; raw axe and Lighthouse files in `test-results/` and `lighthouse-results/`. Violations found during development were fixed; failed or interrupted exploratory runs were not used in place of the final successful results.

At the end, the final success and failure teardown checks completed; no browser or profile process remained, and the fixture temporary and profile count was 0. When the bootstrap of an exploratory run was killed, an empty SQLite folder had been left behind (no account or session created yet). Its path created during the task, the absence of processes and file handles, and a read-only integrity, foreign-key, users 0 and sessions 0 check were verified, and only that folder was removed. Automated cleanup for an interrupted runner bootstrap is an open improvement; a successful normal final teardown is not a guarantee under forced termination. The real dev server on 3000 / API 5002 was kept with a single listener and health OK. No test writes, migration, seed, reset or restore on the real user database, no real password reads or changes, and no commit, push or deployment.
