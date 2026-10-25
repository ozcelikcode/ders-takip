# A21 — User management (17 October 2026)

## Scope and behaviour

`AdminUsersPage` and `CreateUserModal` moved to the neutral design system. The user list no longer treats the first 100 records as the total: it uses 20 records per page, the server's total and page data and a server search that scans every record. Submitting a search returns to the first page; clearing is supported. When the last row is deleted, an invalid page is corrected. A secondary backend ID sort on equal sort values prevents repeats or skips across pages; offset pagination is not a snapshot guarantee during concurrent inserts or deletes.

A read error is separate from a genuinely empty list and offers a retry. The user summary shows the bulk `includeStats` data and the measured `studySeconds`. Dates are formatted with the viewing user's IANA time-zone preference. When the API provides no statistics, "—" is shown instead of an invented zero.

The role, status and delete confirmations explain the data impact and session revocation; they wait for server success and stay open on error. Double submission and closing while pending are blocked. The role, status and delete block on one's own account is kept both in the UI and at the existing server boundary. The administrator check runs in the UI before any read or form opens and on the server in the existing `authorize` middleware.

The new shared `EditorDialog` is the single dialog engine for catalog and user creation forms; the old `CatalogEditorDialog` file was removed. `useAccountMutation` provides a busy ref, mount and epoch checks, inline errors and account-scoped invalidation after server confirmation. `useCatalogMutation` is this hook's adapter for catalog, sessions and progress. User actions refresh the user's whole resource prefix and never touch another account's cache. An account change does not undo a request already sent to the server; a late response does not trigger the old account's success message or refresh.

## Contract

`createManagedUserSchema` is a shared Zod 4 schema in contracts; the frontend and the administrator `POST /users` use the same rules. It enforces an ASCII alphanumeric username of 3–20, trimmed first and last names of 2–50, a valid email, a password of at least 12 characters and at most 72 UTF-8 bytes, a real boolean and the `student`/`admin` role. Passwords are never trimmed; bcrypt truncation is rejected. The default is an active student account. Unknown fields are rejected; the password confirmation is only a form check and is not sent to the API. The form unmounts after cancel or success, so old credentials are not carried into a new open; an error keeps the input. The password is not added to storage, logs or caches.

The list, create and role/status patch types are shared at the frontend transport boundary. This work does not validate every response with a runtime DTO schema. Public auth registration, the remaining user update and controller validation, and the plan and backup contracts were open under A19. The persisted data contract, role values and schema 006 did not change; no migration was needed.

## Regressions

- `frontend/tests/user-management.test.tsx`: 13 real React, Headless UI and Query screen tests. Server pagination and search, read error and retry, self-protection, server confirmation, pending and double submission, staying open on error with retry, account cache separation, last-page correction, shared create validation with confirmation excluded, the draft after an error and on reopen, and late epoch and unmount responses. A disabled parent fieldset test checks the native `:disabled` semantics.
- `backend/tests/user-management.test.cjs`: 5 HTTP/SQLite tests. 102 users across 6 pages with stable sorting, a catalog-wide search that finds the 102nd record, hashing, defaults and normalisation, rejection of invalid and unknown fields, the administrator boundary and self-account protection. Only `mkdtemp` SQLite.
- `packages/contracts/tests/users.test.cjs`: 2 tests. The default, trim and strict contract and the ASCII username, UTF-8 password, role and boolean limits.
- The earlier catalog and category tests run with the same shared dialog and hook; there is no second implementation or bulk test move.

## Completed verification and local environment

`npm run check` passed: 10 contracts + 130 backend + 116 frontend = 256 tests, 0 skipped; naming, strict TypeScript, ESLint with zero warnings and the production build passed. The last test fixture improvement explicitly verifies that the searched user sits outside the first 100, at position 102; the related 5 backend tests passed again. After the last route formatting and documentation update, lint and `git diff --check` were also clean. With the built frontend on 3001 and a separate temporary SQLite API on 5003, 102 users across 6 pages, the second page, server search, the delete confirmation and cancel, form labels and defaults, and Escape with focus return were verified. The final browser operations for a new password, granting a role or a permanent delete were not applied; create and the action acknowledgement, failure and pending states are covered by automated regressions. Screenshot evidence: `/Users/ozcelik/.codex/visualizations/2026/10/15/01a13e5c-eabf-70f1-bd97-3a490ffe1079/user-management-verified.png`.

The fixture session was signed out; the tab, processes and temporary database were removed. Two dev trees of the same project were competing for ports; only those trees were stopped and a single root `npm run dev` started. localhost:3000 and API 5002 were healthy. No real database tests, migration, seed, reset or restore; schema 006 was kept. Earlier local changes were kept; no commit, push or deployment.

## Next package

The next A21 package was `AdminSettingsPage` and the backup screen: the draft being reset by a refetch, saving only changed settings, separating a backup GET error from an empty list, a visible asynchronous confirmation with busy, error and epoch handling for restore and reset, and the `verified === true` check. A neutral design review of the administration dashboard and the other remaining surfaces also continued. A19, A22 and A04 were not closed by this package.
