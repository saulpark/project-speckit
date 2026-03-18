# Security & Quality Audit Log

## Overview
This document tracks security issues, code quality concerns, and their resolution status.

## Open Issues

### Security

- [ ] **CSP Headers Disabled** — `helmet()` and `securityHeaders()` are commented out in `src/server.ts` (lines 38-42). Content Security Policy is not enforced. This was disabled during debugging of CSP violations with the Quill.js inline editor. Needs a proper CSP policy that permits Quill.js operation before re-enabling.

- [ ] **Debug Routes in Production Code** — Several test/debug routes are registered unconditionally in `src/server.ts` and `src/routes/noteRoutes.ts`: `/test-register`, `/test-ui`, `/test-shared`, `/test-server-changes`, `/test-cache-clear`, `/test-direct-delete`, `/notes/test-changes`, `/notes/debug-auth`, `/simple-test/:id`. These should be gated behind `NODE_ENV !== 'production'` or removed before production deployment.

- [ ] **Debug Logging in Middleware** — `src/middleware/noteOwnership.ts` contains `console.log` statements with internal note and user ID details. This should be replaced with a structured logger and removed from the `verifyNoteOwnership` middleware before production.

- [ ] **Test Route Exposes JWT Token** — `GET /auth/test-token` in `src/routes/authRoutes.ts` generates and returns a real JWT token for any caller without authentication. Must be removed or protected before production.

- [ ] **Rate Limiting for Sharing Operations** — Spec 004 plan specifies a `noteSharingLimits.ts` middleware for rate limiting share/unshare operations. This file has not been created. Sharing endpoints are currently unrate-limited.

- [ ] **Environment Variable Handling** — `JWT_SECRET` and `MONGODB_URI` have no validation at startup. If absent, the app will fail in a non-obvious way. Startup should validate required environment variables.

### Code Quality

- [ ] **Note Creation Uses `optionalAuthentication`** — `POST /notes` in `src/routes/noteRoutes.ts` uses `optionalAuthentication` with a manual user check instead of `authenticateToken`. This is a leftover from debugging and should be reverted to standard `authenticateToken` middleware.

- [ ] **Debug Logging in `src/server.ts`** — A startup `console.log` contains `🔥🔥🔥 MAJOR CHANGE APPLIED...` (line 487). This should be removed.

- [ ] **`testEditRoutes.ts` Registered in Production** — `src/routes/testEditRoutes.ts` is imported and registered at `/test` unconditionally. Should be removed or gated for production.

- [ ] **`console.log` in Controllers** — `noteController.ts` `getCreateForm` and `getEditForm` methods contain `console.log` debug statements that should be removed or replaced with a logger.

- [ ] **Increase Test Coverage** — Current test files in `src/utils/` are standalone test scripts, not Jest tests. Actual Jest test coverage for the notes system and sharing service is not yet written.

### Performance

- [ ] **Missing Index for Sharing Queries** — The `sharedWith.userId` compound index is defined in `Note.ts` but the migration script (`scripts/migrations/004-add-note-sharing.js`) specified in the spec 004 tasks has not been created. Existing notes in the database do not have the `sharedWith` field seeded.

- [ ] **Profile and Optimize Database Connections** — No connection pool configuration set in `database.ts`.

## Resolved Issues

### 2026-03-18
- [x] **Note Sharing UI — Phase 4 Complete** — `fresh-view.handlebars` now includes the full sharing panel (public link toggle, copy URL, user email input, revoke buttons) and sharing modal. `public-view.handlebars` created for unauthenticated public note access. Logout and main-menu navigation buttons added to the note view action bar.

### 2026-03-17
- [x] **Edit Form Data Loading** — Fixed `Cannot read properties of undefined (reading '_id')` in `views/notes/edit.handlebars`. The API response structure is `result.data.data.note._id` (double-nested `data`). The `fresh-edit.handlebars` template and `getEditForm` controller now load note data correctly.
- [x] **DELETE 403 Errors** — Browser DELETE requests were failing due to authentication middleware not reading cookies. `authenticateToken` now supports both `Authorization: Bearer` header and `authToken` cookie.
- [x] **Docker Caching Issues** — Root cause of all template/route changes not applying was using `docker-compose restart` instead of full `down && up --build -d`. Documented in `CLAUDE.md`.

### 2026-03-11
- [x] **Notes CRUD Implementation** — Full notes CRUD operations implemented: create, list (paginated), view, edit, delete with Quill.js rich text support.
- [x] **Note Ownership Enforcement** — `verifyNoteOwnership` middleware prevents cross-user note access. Returns 404 (not 403) to prevent information leakage.
- [x] **Note Sharing Backend** — Full sharing backend implemented: `isPublic` toggle, user-to-user sharing via email, `sharedWith` array on Note model, `verifyNoteAccessOrShared` middleware, `getSharedNotes`, `getPublicNote`, `shareNoteWithUser`, `unshareNoteWithUser` service methods.

### 2026-03-08
- [x] **JWT Implementation** — Secure JWT token management with expiration and blacklisting.
- [x] **Password Security** — bcrypt with 12 salt rounds.
- [x] **Input Validation** — express-validator middleware for registration and login.
- [x] **Anti-Cache Headers** — `no-store, no-cache` headers applied globally in `server.ts` to prevent stale template caching during development.

## Security Best Practices

- Never commit secrets or API keys
- All user inputs validated via express-validator
- Use Mongoose ODM only (no raw MongoDB query strings)
- Implement proper error handling
- Log security events appropriately
- Note access middleware always returns 404 (never 403) to prevent information leakage about other users' notes

## Review Guidelines

When adding new issues:
1. Categorize as Security / Code Quality / Performance
2. Provide clear description, impact, and affected file
3. Add date discovered
4. Mark with checkbox `[ ]` for tracking

When resolving issues:
1. Move to "Resolved Issues" section under the current date
2. Mark with `- [x]` and include resolution date
3. Add brief description of the fix
4. Include git commit hash if applicable
