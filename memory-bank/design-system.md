# Visual Design System

Source: the project owner's explicit instruction of 15 October 2026. A modern, simple, clean and careful product interface was requested, with Vercel named as a reference. The earlier iOS/pastel/glassmorphism direction is obsolete.

The verification figures in this document belong to the historical close of this design package. Current totals and later engineering changes are in `progress.md` and `implementation/2026-10-15-security-and-recovery.md`.

## Reference review

On 15 October 2026 current official sources were reviewed:

- [Vercel Geist](https://vercel.com/geist/introduction): a consistent component and surface system.
- [Geist colors](https://vercel.com/geist/colors): grey by default for text, icons and borders, two base backgrounds, little and purposeful use of colour.
- [Geist typography](https://vercel.com/geist/typography) and [Geist font](https://vercel.com/font): readability, a clear but restrained hierarchy.
- [Linear](https://linear.app/features): product-focused layout and a simple information hierarchy. The site was also reviewed visually in a browser.

These are not a ranking of all 2026 designs. The product decisions are our interpretation of these sources; no Vercel logo or brand and no one-to-one page copy is used.

## Lasting rules

- Neutral white, grey and black surfaces; semantic CSS variables: canvas, surface, sidebar, subtle, line, text, muted, solid, solid-text.
- Light theme: #fafafa canvas, #fff surface, #171717 text, #666 secondary text, #e5e5e5 border. Dark theme: #0a0a0a canvas, #111 surface, #ededed text, #a1a1a1 secondary text, #2a2a2a border.
- The primary action is a high-contrast neutral button; the secondary action has a thin outline. The person's accent colour is kept for focus, links and selection; surfaces are not painted with it.
- Geist Variable is loaded from the local npm package. Remote Google Fonts links were removed. The Latin and Latin Extended glyphs cover both interface languages; `font-display: swap` is used.
- Page titles 28–32 px, body mostly 14 px, helper text 12 px; normal and medium weights, `tabular-nums` for numbers. Not every heading should be huge or bold.
- Spacing on a 4 px base; roughly 8 px corners on panels and 6 px on buttons. No large rounded cards nested in each other, decorative gradients, glass effects or heavy shadows. Popover and dialog shadows carry layering meaning.
- Colour is for meaningful states such as success, warning and error, and for record and session identity. The calendar uses neutral text, a light tint and a coloured edge; text readability never depends on the colour a person picked.
- Motion is short and functional; CSS reduced-motion and motion (`motion/react`) with `reducedMotion="user"` apply. Confetti was removed; the existing toast provides completion feedback.
- Interface text comes from the catalogs; code and file names are in English. New pages use `PageHeader` and the shared panel and button classes; the old look is not kept as a second alternative.

## Implemented scope

- Layout, Sidebar and Header: 232 px desktop navigation, a simple active state, a section path and a single mobile overlay.
- Mobile menu as a Headless UI Dialog: focus boundary, Escape and focus returning on close. A skip-to-content link and icon button names were added.
- Dashboard: shared header, a single summary strip, natural page flow instead of a fixed viewport height; a simple chart, activity list and quick access.
- Records page: left-aligned header, shared actions, simple cards and search. Sign-in and registration, loading, Pomodoro and user settings follow the same surface and typography direction. Administrator avatar gradients were removed.
- Planner: a compact expandable daily summary, daily/weekly control, an initial scroll to 08:00, a 24-hour calendar that scrolls inside its frame, and sticky day headings in the weekly view. At 639 px and below the first view is daily; people can switch between both views.
- Session form: neutral dialog, surfaces and choice fields, the shared primary button and a named close button. Business rules and the timer engine were not rewritten.
- Pomodoro: instead of a coloured circular SVG with gradients, a large typographic timer, a thin accessible progress bar and named shared controls. Session selection is a keyboard-accessible button; since A15 the page and the modal share the same timer component. Phase changes are announced in an `aria-live` status region; start, pause, reset and complete are named. The interface states that closing the window does not pause the timer.
- Confetti and the `canvas-confetti` dependency and types were removed. The two old `@ts-ignore` comments in the planner were removed; strict checks pass.

## Small correctness fixes

- The dashboard reads the real topic count with `includeTopics`. Wrong comparisons against fixed exam categories were removed; records, topics, completed sessions and recorded time are shown. No number is invented while loading or on error.
- Duration at that time was still the backend `duration` value; no "real focus time" claim was made. A09 and the administrator aggregates were open then.
- The dashboard and the records page use the same raw response shape for the same query key; the dashboard maps it to view data with `select`.
- Recent activities and notifications pick the five newest entries by completion or end time; the shared helper never sorts the cached array in place. Three regression tests were added.
- The daily summary never mutates the cached array; loading and error states are separate. An unnecessary second polling effect that assumed a GET would cancel something was removed; the main query keeps refreshing.

## Verification and limits

- `npm run check`: English/ASCII naming, strict type checks for two workspaces, lint with zero warnings, 22 backend + 8 frontend = 30 tests and two production builds passed.
- Browser check of the final production bundle with a temporary SQLite database and account: sign-in, switching between dashboard and records and the counts shown, weekly and daily views, opening and closing the daily summary, record search, the session form, the Pomodoro display and keyboard session selection, and creating a custom session on mobile.
- 390×844 mobile viewport: daily default, menu, focus and Escape, search; the measured page width equals the viewport (382 CSS px content area; the browser's scrollbar area is separate).
- Light and dark themes were checked visually. At that time saving the theme to the backend returned 400 because of A11; a local visual change was not evidence of persistence across devices, and the server preference could win on reload.
- After a rebuild, an open tab requesting an old hashed chunk from `dist` briefly hit a dynamic-import error; the final build was reloaded and checked again. A deployment strategy for keeping old assets and caching must be designed separately.
- Automated browser tests, full WCAG and Lighthouse, touch drag and resize and all administrator flows were not verified at that time. This work did not close the security and data-integrity backlog.
- No seed, migration, reset or restore ran on the real user database; tests ran in a temporary directory, the test session was signed out, the tab and server were closed and the temporary database was removed. No commit, push or deployment was made.

Visual evidence is kept outside the repository in the Codex visualisation folder as `planner-modern-light.jpg`, `planner-modern-dark.jpg`, `planner-modern-mobile.jpg`, `dashboard-modern.jpg` and `pomodoro-modern.jpg`. They contain fictional test data.

## Configurable site identity (16 October 2026)

The displayed name, description, logo and icon are an administrator setting. The shared Brand component, sign-in, registration, sidebar, loading screen and the document title, meta tags and favicon all use the same public DTO. Long names are truncated in the layout while the full name stays in the title and the accessible link text; new screens never hard-code a product name. Repository and package names are the English technical identity. New icon SVGs come from the existing Lucide set, with its licence kept next to the assets. Changing the brand does not change the simple neutral design language.

## Duration and time-zone wording (16 October)

The dashboard shows "Measured study"; study, break and pause are separate, and old unmeasured time is explicitly excluded. Planner durations are planned minutes. The calendar and the form show the selected time zone; stored instants stay in UTC. This wording and correctness update does not change the earlier visual system. Current behaviour and evidence are in `implementation/2026-10-16-study-time-and-timezones.md`; the older duration/A09 notes and test counts above are the historical close of the design package.

## Shared calendar and dialogs (16 October)

In the A21 planner package, daily and weekly cards use a single `CalendarSessionCard` and neutral panel and grid tokens; record and session colour is limited to a thin left stripe. Start, pause, complete, timer and actions are named; small cards keep their title and actions. `ConfirmDialog` is neutral: destructive actions are red, asynchronous waiting and errors are visible, and closing is locked while pending. `MoveSessionModal` uses Headless UI focus and Escape with a named day picker. No claim of full WCAG, mobile or touch support was made; minimum hit areas for very short neighbouring cards and keyboard focus in the grid belonged to A22. The remaining modal and administrator conversions were open in A21 at that time. Evidence and limits: `implementation/2026-10-16-shared-planner.md`.

## Catalog and administrator record surfaces (16 October)

`CoursesPage`, `CourseDetailPage` and `AdminCoursesPage` use the neutral panel, surface, typography and `btn` classes. Record colour is limited to a small icon; topic states are shown with compact buttons carrying an accessible pressed state instead of large coloured cards. A card's detail link and its edit and delete buttons are separate interaction areas. Controls and rows wrap on mobile; no new manual mobile or touch verification was done in this package.

`CourseEditorModal` and `TopicEditorModal` share one `EditorDialog` with labelled native inputs and selects, validation descriptions, server errors, a pending state and Headless UI focus and Escape. There is no second record form for administrators. Archive and delete confirmations explain their different data effects. The remaining settings, backup modal and administrator surfaces were open in A21 at that time; no full WCAG claim. Evidence and the 223-test quality baseline at that time: `implementation/2026-10-16-catalog-editing.md`.

## Category management (17 October)

The list and `CategoryEditorModal` use the neutral surface, typography and button tokens; colour appears only in a small icon. Instead of the old coloured preset buttons and a second icon map, a labelled HEX field and the shared icon select are used. Inactive records stay visible. The parent management dialog and its child edit and confirmation dialogs share the Headless UI focus and Escape boundary; closing is locked while pending, and errors are told apart from empty data. Verified with a desktop production fixture and 13 new behaviour tests; no mobile, touch or full WCAG claim. User, settings and backup surfaces were still open in A21. Details: `implementation/2026-10-17-category-management.md`.

## User management (17 October 2026)

The administrator user list uses neutral panel rows, thin borders, typographic role, inactive and own-account markers and the measured study summary; the coloured statistic cards were removed. Search, paging and menus have accessible names; `EditorDialog` offers labelled fields, inline errors and a locked fieldset while pending. Role, status and deletion confirmations explain their concrete effect and wait for the server. Form Escape and focus return were verified in the browser and pending, epoch and error handling in tests; comprehensive WCAG and mobile browser tests were still part of A22.

## Site settings and backups (17 October 2026)

`AdminSettingsPage` uses a neutral `PageHeader`, wrapping section buttons, labelled inputs and checkboxes and a visible dirty, pending and error state. `BackupPanel` shows date, type, size and verification in a horizontally scrollable table with a caption and headers; unverified entries are locked. Reset and restore use the shared asynchronous `ConfirmDialog`, and their scope and session effect are explicit. At that time the panel stated that notification delivery, off-site copies and retention were not available. Drafts, sections, Escape, focus and backup creation were verified with a desktop fixture; no mobile, WCAG or browser-test claim. Details: `implementation/2026-10-17-admin-settings-and-backups.md`.

## Administration overview and session surfaces (17 October 2026)

The administration overview uses a neutral `PageHeader` and summary strip, thin borders and semantic user and session lists; global counts and measured time are separate from loading, error and empty states. `TodaysPlans` offers a neutral expandable daily summary and commands labelled with the session name. `CreateSessionModal` and `PomodoroModal` moved to the panel, input and button tokens; colour remains only for existing session identity, meaningful states and destructive actions. Colour and type choices carry a named pressed state; the minimised Pomodoro adapts to the viewport width. A desktop production fixture and 24 new behaviour regressions passed; this package added no new mobile, full WCAG or browser-test evidence. Details: `implementation/2026-10-17-admin-and-session-surfaces.md`.

## A19 form validation (17 October 2026)

The visual language did not change. Sign-in and registration use the shared contract messages; the session form offers the same 1–1440 real-minute limit as the API and shows a visible error for an invalid request. The request and view adapters are separate; interface content and stored colours are preserved. The new form regressions run on real React and React Hook Form; no new manual browser or WCAG evidence.

## A22 header and calendar access package

The header's notification and account panels use the neutral dropdown panel and thin borders. Errors, stale data and a truly empty state are told apart in text. The result of a notification action is announced live. The calendar shows a visible focus outline on empty hours and an add marker on small screens; the arrow, Home and End navigation hint is visible. Labelled native time and duration fields remove the need to drag; the modal scrolls within the viewport height. Small-card commands are at least 24×24 px and titles at least 24 px tall; real touch targets, the layout of neighbouring short cards and full WCAG were to be verified separately.

## A22 short cards

The visual minimum card height is 28 px and the inner title and icon targets are at least 24 px; below 68 px a compact single-line layout is used. Neighbouring and cancelled cards that overlap in the same pixel range go into separate columns, each at least 160 px wide. A busy day scrolls horizontally inside the calendar, with hour and day headings aligned to the same columns. Empty weekly days keep a 104 px minimum. A 36 px trailing gutter keeps cards and focus outlines from being clipped; on short cards the resize handle does not cover the target and the time and duration dialog is used instead. Real time and duration never change. This is desktop and geometry evidence; real touch devices and full WCAG remain open.

## A22 automated browser evidence (18 October 2026)

Visual tokens and layout did not change. Focus return from the move dialog moved after React's close commit and Headless UI's passive cleanup; a pending animation frame is cancelled on unmount. Short-card targets, end-of-day focus, native time and duration, the header and the mobile menu are verified automatically against the real production bundle in Chromium and WebKit desktop and 412×839 Chromium touch emulation. Those 18 runs were not full WCAG, Lighthouse or physical touch-device success; the remaining items are in `progress.md`.

## A22 measured accessibility (18 October 2026)

Keeping the visual hierarchy, the following were fixed: `main` and `h1` on the authentication pages, the profile heading order, field labels, icon names and pressed states, the header's name derived from its content and the administrator definition list. Low-contrast helper and active text moved to neutral tokens; "today", the minutes mode and file, URL and day choices read independently of the accent colour. The header search button is at least 24 px; the settings password buttons are 32×32 px. Personal and stored session colours were not changed. The default plus target-size axe scan returned 0 violations in 150 states; incomplete results and the limits of full manual WCAG and screen-reader testing remain. Accessibility scored 100 on all four Lighthouse screens and profiles while mobile performance was 67/61 at that time; visual simplification did not mean the performance goal was met. Details: `implementation/2026-10-18-accessibility-and-lighthouse.md`.

## Consistency of settings, profile and the session form (19 October 2026)

The owner reported that the inner Settings page was inconsistent with the menu and oversized in an old style. The settings tabs were rebuilt with the sidebar `nav-item` buttons (`aria-current`); content uses a `text-base font-medium` heading, `text-sm` labels and the `.input` and `btn` classes. Theme and colour choices are small neutral cards and buttons with a colour dot; notifications use the same checkbox row as the administrator settings; study days are neutral pressed-state buttons. The profile page uses `PageHeader` plus `.panel` cards, a small `.avatar` and a `segmented-control`; the narrow centred layout was removed. The base text of `.input` became 14 px (`text-sm`). The session form, the move modal, `ErrorBoundary`, `LoadingScreen` and recent activities moved from the old gray, purple, large and bold styles to semantic tokens; colour remains only in the session colour picker and the person's accent. New rule: in-page headings are `text-base font-medium`, bold or `text-xl` and larger only in `PageHeader`; new UI uses tokens instead of `gray-*`, `border-2`, `rounded-xl` and `shadow-lg`. Evidence: 36 browser runs (including axe) and a desktop screenshot comparison; no mobile visual check was made.
