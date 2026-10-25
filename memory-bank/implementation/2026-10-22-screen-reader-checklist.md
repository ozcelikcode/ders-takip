# Manual screen reader checklist (22 October 2026)

Automated coverage: axe (every page, light and dark, three browser profiles), Lighthouse accessibility 100, and in the browser tests keyboard calendar navigation, dialog focus return and table equivalents for charts. The items below are what automated tests cannot see: reading order, meaningful announcements and real screen reader behaviour. **Not run yet.**

Environment: macOS VoiceOver + Safari (Cmd+F5) and, if possible, Windows NVDA + Firefox/Chrome. Local development server and a test account (no real user data). Time: about 20 minutes.

| # | Flow | Action | Expected |
|---|---|---|---|
| 1 | Sign-in | Tab through the fields, submit with a wrong password | Field names are read; the error toast is announced on its own |
| 2 | First-run setup | Advance the steps with the keyboard | Each step's heading and step information are read; choices are announced as radio buttons |
| 3 | Dashboard | Open the landmark and heading lists (VO: Rotor) | `main`, navigation and headings in a logical order; the skip-to-content link works |
| 4 | Weekly chart | Move to the chart area | It is not announced as "application"; the table caption (including the goal) and "day, date — duration" for each day are read |
| 5 | Planner | Move to an empty hour with the arrow keys, press Enter | Hour and day are read; the new-session dialog opens, focus stays inside, and after Esc focus returns |
| 6 | Moving a session | Session actions › Change time and duration | The dialog heading and fields are read; the result is announced after saving |
| 7 | Pomodoro | Start / pause | Button names and the state change are clear; the remaining time is not read every second |
| 8 | Settings › Vocabulary | Enter custom terms and an invalid suffix form | The error message is read as linked to the field (`aria-describedby`); the forms preview is read |
| 9 | Settings › Notifications | Toggle the switches | The checkbox state and the save state are announced |
| 10 | Admin › Users | User actions menu | The menu and its items are read; Esc closes the menu and focus returns to the button |

Record findings in `progress.md` with severity, location, expected and actual behaviour and the screen reader and browser versions; for each fixed finding, add a browser test or axe check where possible.
