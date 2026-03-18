# Security & Correctness Audit

Tracks known security issues, correctness defects, and technical debt. Resolved items are marked with a checkmark and the date they were closed.

---

## Open Issues

### AUDIT-004: Rate limiting for note sharing operations not implemented
- **Severity**: Medium
- **Category**: Security
- **Identified**: 2026-03-17
- **File**: `src/middleware/noteSharingLimits.ts` (file does not yet exist)
- **Detail**: The spec (004-note-sharing plan.md) calls for a dedicated rate limiting middleware for share/unshare operations. Basic abuse prevention is in place via general rate limiting, but per-operation sharing limits are missing.
- **Resolution**: Create `src/middleware/noteSharingLimits.ts` and apply to `POST /notes/:id/share/*` and `DELETE /notes/:id/share/user/:userId` routes.

### AUDIT-005: Database migration script for note sharing not created
- **Severity**: Low
- **Category**: Ops / Correctness
- **Identified**: 2026-03-17
- **File**: `scripts/migrations/004-add-note-sharing.js` (does not exist)
- **Detail**: Existing notes in production databases that pre-date the note sharing feature may not have a `sharedWith` field. New notes default to `sharedWith: []`. A migration script was planned but not implemented.
- **Resolution**: Create and document a migration script to backfill `sharedWith: []` on existing note documents before any production deployment of spec 004.

### AUDIT-006: Unit and integration tests for note sharing not written
- **Severity**: Medium
- **Category**: Test Coverage
- **Identified**: 2026-03-17
- **File**: `tests/` (missing sharing test files)
- **Detail**: The note sharing feature (spec 004) is functionally complete but has no dedicated unit tests for `NoteService` sharing methods, no middleware tests for `verifyNoteAccessOrShared`, and no integration tests for the sharing API endpoints. This violates the Constitution's 80% coverage requirement.
- **Resolution**: Add unit tests for sharing service methods and middleware, and integration tests for all 7 sharing endpoints.

### AUDIT-007: User management feature (spec 005) tests pending
- **Severity**: Medium
- **Category**: Test Coverage
- **Identified**: 2026-03-19
- **File**: `tests/` (missing profile/admin test files)
- **Detail**: Spec 005 Phase 4 (testing) is not yet implemented. Profile management, password change, and admin interface endpoints lack unit and integration test coverage.
- **Resolution**: Implement Phase 4 of spec 005 — unit tests for `UserService`, `AdminService`, and integration tests for all `/profile/*` and `/admin/*` endpoints.

### AUDIT-008: In-memory token blacklist does not survive restarts
- **Severity**: Low
- **Category**: Architecture / Security
- **Identified**: 2026-03-19
- **File**: `src/services/tokenBlacklistService.ts`
- **Detail**: The `TokenBlacklistService` stores blacklisted tokens in memory. Restarting the application clears the blacklist, allowing previously logged-out tokens to be reused until their JWT expiration. This is acceptable for development but is a security gap in production multi-instance deployments.
- **Resolution**: For production, replace with a Redis-backed or database-backed blacklist store. Document this limitation in deployment notes.

---

## Resolved Issues

### AUDIT-001: Inline styles triggering Content Security Policy violations
- **Severity**: High
- **Category**: Security
- **Identified**: Before 2026-03-17
- **Resolved**: 2026-03-17 (commit `45e0d34`)
- **Detail**: Inline note editor JavaScript was violating the configured CSP policy, causing client-side errors.
- **Resolution**: CSP configuration updated to allow required inline execution for Quill.js editor.

### AUDIT-002: Edit form not loading note data (empty form bug)
- **Severity**: High
- **Category**: Correctness
- **Identified**: 2026-03-16
- **Resolved**: 2026-03-16 (commit `43cd3c4`)
- **Detail**: The edit note form (`/notes/:id/edit`) rendered with empty fields despite data existing in the database. Root cause was a Docker workflow issue (container not picking up new builds) combined with a route conflict from the now-removed `/notes/:id/view` route.
- **Resolution**: Created `fresh-edit.handlebars` and `getEditForm` controller with clean logging. Removed conflicting `/notes/:id/view` route. Documented correct Docker rebuild workflow.

### AUDIT-003: JavaScript error on note save due to wrong API response path
- **Severity**: High
- **Category**: Correctness
- **Identified**: 2026-03-16
- **Resolved**: 2026-03-16
- **Detail**: `Cannot read properties of undefined (reading '_id')` in `views/notes/edit.handlebars` because the note ID was accessed at `result.data.note._id` instead of the correct `result.data.data.note._id`.
- **Resolution**: Fixed the JavaScript response accessor in the template. The correct nested path is documented in `CLAUDE.md` under "API Response Format".
