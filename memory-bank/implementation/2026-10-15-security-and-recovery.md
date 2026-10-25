# Session and Recovery Package — 15 October 2026

## Instruction and scope

The owner said they had forgotten the administrator password and asked to continue with the next package. After verifying that the folder had no environment or database, the reply "I have not set it up yet; create a local administrator" explicitly authorised the first setup. No old account password was found or recovered; a new local account was created.

Package: revocable sessions, refresh rotation, a safe administrator CLI, consistent SQLite snapshot and restore, a transactional reset and automatic backups based on real elapsed time. Interface text was preserved; new technical names are English. The earlier foundation and design changes were kept. No commit, push or deployment was made.

## Session architecture

- An explicit `002-auth-sessions` migration: AuthSession and RefreshCredential, with user/session foreign-key cascades. Upgrading a temporary database with 001 applied and containing data was verified by a regression test.
- The access JWT carries only the user id and a UUID session id; HS256, issuer and audience are validated explicitly. Permissions and active status come from the database on every protected request. The lifetime is at most 15 minutes.
- The refresh credential is a random 32-byte opaque value; only its SHA-256 hash is written to the database. An `HttpOnly`, `SameSite=Strict` cookie scoped to `/api/auth`; `Secure`/HTTPS in production. Refresh and access persistence in JSON and `localStorage` was removed, and the old auth-storage key is cleared.
- Refresh performs a single-use rotation inside an SQLite IMMEDIATE transaction. When a consumed credential is reused, the family revocation is **committed** inside the transaction rather than rolled back with an exception. The absolute session lifetime does not extend on refresh; the history of consumed hashes is kept until the session expires.
- Logout revokes the session family, and a password change or administrator recovery revokes all of the user's sessions. Role and status changes revoke too. A new login and a password change check inside the transaction that the verified hash is still current, so an old password verification cannot produce a session after the new password.
- Every auth route checks a custom request header and Origin/`Sec-Fetch-Site`; auth and protected responses are `no-store`. New passwords are at least 12 characters and at most 72 UTF-8 bytes; the bcrypt cost is 12–16. Signing in with an existing shorter password stays on a separate verification path.
- The frontend applies a single refresh promise, an epoch and identity check, the current token for a late 401, a retry limit and account cache clearing. If the refresh returns another user, the old request is not repeated with the new identity.
- Logout waits for a late refresh and revokes the cookie on the server. On a network error, only a logout-pending intent without secrets is kept; the next start tries logout instead of an automatic refresh. Web Locks serialise cookie changes across tabs; BroadcastChannel tells other tabs about identity and cache changes. The fallback for browsers without Web Locks does not give the same cross-tab guarantee.

[OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) was reviewed for session storage and cookie attributes. These are this application's decisions; they do not replace a full security audit.

## Administrator creation and recovery

`npm run admin:manage -- --mode create|recover --email EMAIL --username NAME --password-file /absolute/private/path`

The CLI works only on a ready, existing database. The password is read from a small, regular file with 0600 permissions; it never appears in arguments or stdout. Create works while no administrator exists. Recover updates only an active administrator found by exact email; it never promotes a student and revokes their sessions inside a transaction. It touches no other users' data or sample categories. Tests verify the same constraints and that other accounts are preserved.

## Snapshot, restore and maintenance

- The `fs.copy`/`process.exit` paths and the unused fs-extra package were removed. The existing sqlite3 native Online Backup API is used. [SQLite Online Backup API](https://sqlite.org/backup.html) and [VACUUM INTO](https://www.sqlite.org/lang_vacuum.html) were reviewed; the current driver's backup API was chosen because it supports an open connection with WAL and a destination transaction.
- A single-process maintenance gate stops new requests with 503/`Retry-After` and waits for in-flight HTTP responses to finish, except the current administration request. Timeouts and conflicts release the lock in `finally`. The scheduled job uses the same gate. Multiple backends or an external direct SQLite writer are outside this coordination.
- A snapshot goes to a `.partial` file first. Integrity, foreign keys and the required migration and model columns are verified; SHA-256, size, fsync and rename follow. UUID file names are validated; a new folder is 0700 and snapshots and manifests are 0600.
- The JSON manifest sits next to the snapshot; the in-database catalog is not the single source. At startup and after a restore the catalog is upserted from the manifests. A missing or corrupt manifest inventory does not stop a healthy database from opening; it is only logged with the safe file name. The list checks manifest, identity and size; the full checksum and database verification run again before a restore. The "verified" label does not mean continuous bit-rot scanning.
- Restore checks the source's identity, checksum, size, integrity, foreign keys and schema **before changing live data**. It takes a separate safety snapshot of the current data and loads into the existing file with a native destination transaction. The Sequelize pool is not closed and the server is not killed. After the final schema and catalog validation, every session that came back is revoked.
- If the final check fails, the safety snapshot is restored natively. If that recovery also fails, health and the API stay in maintenance; access fails closed. No real disk-loss or process-crash drill was done.
- `settings_only` clears only the Settings table. `all` clears student, record and study data and keeps administrators and backup records. Both take a safety snapshot first and run the deletions in an IMMEDIATE transaction. The other catalog delete and ordering transaction issues were still open.
- The scheduled job runs every 5 minutes; each run reads the 1, 5 or 7-day setting and computes the time elapsed since the last successful automatic manifest. Without a first automatic backup it creates one; the month/day-number cron bug was removed. The old "03:00 / only the last 5 backups" interface text was removed. No automatic deletion at that time.
- Old files without a manifest are not deleted; they show as unverified with restore disabled. Their safe schema conversion is separate work. Separate disk or off-site copies, encryption, capacity and retention, alerts and RPO/RTO operations were not set up in this package.

## Local setup and user access

With the owner's authorisation, `configure`, `db:migrate` and `admin:manage --mode create` were run. The first environment file, a new `backend/database.sqlite` and `admin@example.com` (username `admin`) were created. The random password is in `.local/admin-password.txt` with 0600 permissions; the folder is 0700. Password values are not documented; `.local/`, environment, database and backup files are Git-ignored.

The local app runs at http://localhost:3000 with the API on 5002. The single development process was restarted; an old Vite module loading error went away with a clean start. A sign-in with the new administrator, the cookie bootstrap after reload and creating a manual snapshot were verified in the browser; the first automatic snapshot also appeared in the catalog. No reset, restore or seed was run on the real local database. Browser evidence: `/Users/ozcelik/.codex/visualizations/2026/10/15/01a13e5c-eabf-70f1-bd97-3a490ffe1079/admin-backup-ready.jpg`.

## Verification and open work

The last `npm run check` passed: technical naming, strict type checks, lint with zero warnings, **43 backend + 14 frontend = 57 tests** and two production builds; no skipped tests. The real browser smoke test is not an automated browser test. No GitHub CI run or production deployment was made.

Regressions: HTTP cookies, CSRF and rejecting old JWTs, replay and concurrent refresh, logout and the absolute lifetime, password, role and status revocation and the hash race; administrator recovery; concurrent and late 401s over a real HTTP transport; a late refresh, account switch and offline sign-out; WAL snapshots, a corrupt source, the catalog and revocation after restore, rollback on an injected final-check error; rollback on an error in the middle of a reset with administrator protection; elapsed days, month boundaries and a changed interval.

Migrating an existing installation: frontend and backend must be updated together, the explicit migration applied and users must sign in again. The old refresh JWT/JSON and the `JWT_REFRESH_*` settings were removed. No old real database was converted automatically.

**The A11 Preferences bug was not solved in this package.** Next package: a shared Preferences and API contract and the user and date query scope; then atomic planner overlap and state transitions, real study time and time zones, and a single timer engine. The remaining audit and dependency work is in `progress.md`; the whole project was not considered production-ready.
