# Notes CRUD Operations - Implementation Plan

**Spec**: [spec.md](spec.md)
**Status**: Ready to Implement
**Updated**: 2026-03-11
**Depends On**: 001-authentication ✅ Complete

## Overview
Implementation plan for notes CRUD operations in Node.js/TypeScript with MongoDB/Mongoose, building on the completed authentication system. Notes are privately owned documents with rich text (Quill.js Delta) content support.

## Implementation Strategy
Build notes as an independent module that integrates with the existing auth middleware. Follow the layered architecture already established: Model → Service → Controller → Route → Template. Each phase is independently testable before moving to the next.

## Prerequisites
- **Dependency**: Authentication system (001) — ✅ Complete
- **Required**: User authentication and session management — ✅ Working
- **Database**: User model exists in `src/models/User.ts` — ✅ Available
- **Auth middleware**: `authenticateToken` in `src/middleware/auth.ts` — ✅ Available

---

## Phase 1: Data Foundation
**Branch**: `notes-step-1-data`
**Estimate**: ~2 days

### Step 1.1: Note Mongoose Model — `src/models/Note.ts`

Create the Note schema with the following structure:

```typescript
{
  userId: ObjectId,          // ref: 'User', required, indexed
  title: String,             // maxLength: 200, trim, default: 'Untitled'
  content: {
    type: 'delta' | 'plain', // default: 'delta'
    data: Mixed,             // Delta JSON object or plain string
    preview: String          // Auto-generated excerpt for list view
  },
  isPublic: Boolean,         // default: false, reserved for future spec
  tags: [String]             // lowercase, trimmed
}
```

Indexes:
- `{ userId: 1, updatedAt: -1 }` — primary listing query
- `{ userId: 1, title: 'text', 'content.preview': 'text' }` — search
- `{ isPublic: 1, updatedAt: -1 }` — future public notes

Export `INote` interface and `Note` model.

- **Deliverable**: `src/models/Note.ts` with schema, indexes, and TypeScript interface
- **Test**: Note document saves with correct `userId` reference; unique indexes are enforced

### Step 1.2: Content Processor Utility — `src/utils/contentProcessor.ts`

`ContentProcessor` static class with:
- `textToDelta(text)` — wraps plain string in Delta `ops` structure
- `validateDelta(delta)` — checks `ops` is an array of `{ insert: string }` objects
- `deltaToPreview(delta, maxLength=200)` — extracts plain text excerpt for list display
- `sanitizeContent(delta)` — strips disallowed `attributes`, whitelist: `bold`, `italic`, `underline`, `link`, `list`

- **Deliverable**: `src/utils/contentProcessor.ts`
- **Test**: All four methods behave correctly for valid Delta, plain text, and malformed input

### Step 1.3: Note Validation Middleware — `src/middleware/noteValidation.ts`

Using `express-validator` (already installed):
- `validateNote` — validates `title` (optional, max 200), `content.type` (`delta`|`plain`), `content.data` (calls `ContentProcessor.validateDelta` or string check)
- `validateNoteUpdate` — same rules but all fields optional
- `handleValidationErrors` — returns `400 { errors: [...] }` on failure

- **Deliverable**: `src/middleware/noteValidation.ts`
- **Test**: Invalid titles and malformed Delta are rejected with 400

### Step 1.4: Note Ownership Middleware — `src/middleware/noteOwnership.ts`

`verifyNoteOwnership` middleware:
- Fetches note by `req.params.id`
- Returns `404` for missing note **and** for wrong owner (no information leakage)
- Attaches `req.note` for downstream handlers

- **Deliverable**: `src/middleware/noteOwnership.ts`
- **Test**: Returns 404 for non-existent and cross-user access; attaches note on success

### Step 1.5: Note Service Layer — `src/services/noteService.ts`

`NoteService` static class:
- `createNote(userId, noteData)` — converts plain→delta, generates preview, saves
- `getUserNotes(userId, { page, limit, sortBy, search })` — paginated, projection on `title content.preview createdAt updatedAt`, returns `{ notes, pagination }`
- `getNoteById(noteId, userId)` — ownership-enforced retrieval
- `updateNote(noteId, userId, updateData)` — selective field update, re-generates preview
- `deleteNote(noteId, userId)` — `deleteOne` with ownership filter, throws on `deletedCount === 0`

- **Deliverable**: `src/services/noteService.ts`
- **Test**: All five methods enforce ownership; pagination metadata is correct

---

## Phase 2: API Endpoints
**Branch**: `notes-step-2-api`
**Estimate**: ~1 day

### Step 2.1: Note Controller — `src/controllers/noteController.ts`

`NoteController` static class with handlers for each route. All handlers call `NoteService` and return consistent JSON responses:

| Handler | Success | Error |
|---|---|---|
| `listNotes` | `200 { notes, pagination }` | `500` |
| `createNote` | `201 { note }` | `400` validation |
| `getNote` | `200 { note }` | `404` (via ownership middleware) |
| `updateNote` | `200 { note }` | `400`, `404` |
| `deleteNote` | `200 { message }` | `404` |
| `getCreateForm` | renders `notes/edit` | — |
| `getEditForm` | renders `notes/edit` with note data | `404` |

- **Deliverable**: `src/controllers/noteController.ts`
- **Test**: Each handler returns correct status codes and response shapes

### Step 2.2: Notes Router — `src/routes/noteRoutes.ts`

```
router.use(authenticateToken)      // all note routes require auth

GET    /notes           → listNotes
GET    /notes/new       → getCreateForm
POST   /notes           → validateNote → createNote
GET    /notes/:id       → verifyNoteOwnership → getNote
GET    /notes/:id/edit  → verifyNoteOwnership → getEditForm
PUT    /notes/:id       → verifyNoteOwnership → validateNoteUpdate → updateNote
DELETE /notes/:id       → verifyNoteOwnership → deleteNote
```

- **Deliverable**: `src/routes/noteRoutes.ts`
- **Test**: Routes are registered correctly; unauthenticated requests return 401

### Step 2.3: Register Router in Server — `src/server.ts`

Add `import noteRoutes from './routes/noteRoutes'` and `app.use('/notes', noteRoutes)` after `app.use('/auth', authRoutes)`.

Update root `GET /` endpoint's `endpoints` object to include `notes: '/notes'`.

- **Deliverable**: Notes router mounted in `src/server.ts`
- **Test**: `GET /notes` returns 401 (auth required, not 404)

---

## Phase 3: Frontend Templates
**Branch**: `notes-step-3-frontend`
**Estimate**: ~2 days

### Step 3.1: Note List Template — `views/notes/list.handlebars`

- Bootstrap card grid with note `title` and `content.preview`
- `formatDate updatedAt` helper for human-readable dates
- "New Note" button linking to `/notes/new`
- Empty state with call-to-action
- Pagination controls using `{{> pagination}}` partial (create if needed)

- **Deliverable**: `views/notes/list.handlebars`
- **Test**: Renders correctly with notes array; empty state shows when `notes.length === 0`

### Step 3.2: Note View Template — `views/notes/show.handlebars`

- Displays `title` and rendered rich text content (`{{{htmlContent}}}`)
- Edit button → `/notes/:id/edit`
- Delete button with `<form method="POST">` and `_method=DELETE` hidden field (or JavaScript fetch)
- Back link → `/notes`

- **Deliverable**: `views/notes/show.handlebars`
- **Test**: Title and content render; delete button triggers correct route

### Step 3.3: Note Editor Template — `views/notes/edit.handlebars`

Used for both create and edit:
- Title input pre-populated from `note.title` (empty for new)
- Quill.js editor div `#editor` with Snow theme toolbar
- Hidden `<input name="content">` populated on submit via JS
- Loads existing Delta via `quill.setContents({{{json note.content.data}}})`
- Auto-save on `text-change` (2 second debounce, existing notes only)
- Cancel link → `/notes` (or `/notes/:id` if editing)

- **Deliverable**: `views/notes/edit.handlebars`
- **Test**: Editor initialises; form submission serialises Delta to hidden field

### Step 3.4: Quill.js Asset — `public/js/quill.min.js` + `public/css/quill.snow.css`

Download or copy Quill.js distribution files to `public/`. Reference via `/js/quill.min.js` and `/css/quill.snow.css` in the edit template.

- **Deliverable**: Quill assets in `public/`
- **Test**: Editor loads without CDN dependency

### Step 3.5: Dashboard Link Update — `views/auth/dashboard.handlebars`

Add a "My Notes" link/button pointing to `/notes` in the authenticated dashboard view.

- **Deliverable**: Updated dashboard template
- **Test**: Dashboard shows notes link after login

---

## Phase 4: Testing
**Branch**: `notes-step-4-testing`
**Estimate**: ~1 day

### Step 4.1: Unit Tests — `tests/unit/`

**`tests/unit/utils/contentProcessor.test.ts`**
- `textToDelta`: produces valid `{ ops: [{ insert }] }` structure
- `validateDelta`: returns true for valid, false for null/string/bad ops
- `deltaToPreview`: truncates at maxLength, handles malformed gracefully
- `sanitizeContent`: removes disallowed attributes, keeps whitelisted ones

**`tests/unit/services/noteService.test.ts`** (uses `MongoMemoryServer`)
- `createNote`: saves with correct `userId`, auto-generates preview, converts plain→delta
- `getUserNotes`: returns paginated results, filters by userId only
- `getNoteById`: enforces ownership (returns error for wrong userId)
- `updateNote`: updates only provided fields, re-generates preview
- `deleteNote`: deletes correct note; throws for wrong owner

- **Deliverable**: Unit test files with >90% coverage on service and utility
- **Test**: `npm test -- --testPathPattern=unit` all green

### Step 4.2: Integration Tests — `tests/integration/notes-api.test.ts`

Uses `MongoMemoryServer` + minimal Express app (same pattern as `auth-api.test.ts`):

| Test scenario | Expected |
|---|---|
| Create note (authenticated) | `201 { note }` |
| Create note (unauthenticated) | `401` |
| List notes (own notes only) | `200 { notes, pagination }` |
| Get note (own) | `200 { note }` |
| Get note (cross-user) | `404` |
| Update note (own) | `200 { note }` |
| Update note (cross-user) | `404` |
| Delete note (own) | `200` |
| Delete note (cross-user) | `404` |
| Invalid content format | `400` |

- **Deliverable**: `tests/integration/notes-api.test.ts`
- **Test**: `npm test -- --testPathPattern=integration/notes` all green

### Step 4.3: Build Verification

Run `npm run build` to confirm zero TypeScript compilation errors across all new files.

- **Deliverable**: Clean build output
- **Test**: `npm run build` exits 0

---

## File Inventory

| File | Phase | Description |
|---|---|---|
| `src/models/Note.ts` | 1.1 | Mongoose schema + `INote` interface |
| `src/utils/contentProcessor.ts` | 1.2 | Delta processing utilities |
| `src/middleware/noteValidation.ts` | 1.3 | express-validator middleware |
| `src/middleware/noteOwnership.ts` | 1.4 | Ownership enforcement middleware |
| `src/services/noteService.ts` | 1.5 | CRUD business logic |
| `src/controllers/noteController.ts` | 2.1 | HTTP request handlers |
| `src/routes/noteRoutes.ts` | 2.2 | Express router |
| `src/server.ts` | 2.3 | Mount notes router (edit) |
| `views/notes/list.handlebars` | 3.1 | Note list page |
| `views/notes/show.handlebars` | 3.2 | Individual note view |
| `views/notes/edit.handlebars` | 3.3 | Create/edit form with Quill |
| `public/js/quill.min.js` | 3.4 | Quill.js bundle |
| `public/css/quill.snow.css` | 3.4 | Quill Snow theme |
| `views/auth/dashboard.handlebars` | 3.5 | Add notes link (edit) |
| `tests/unit/utils/contentProcessor.test.ts` | 4.1 | ContentProcessor unit tests |
| `tests/unit/services/noteService.test.ts` | 4.1 | NoteService unit tests |
| `tests/integration/notes-api.test.ts` | 4.2 | API integration tests |

---

## Success Criteria

### Functional
- [ ] Users can create notes with title and content (FR-001)
- [ ] Users can view list of their notes with pagination (FR-002)
- [ ] Users can view individual note details (FR-003)
- [ ] Users can edit existing notes (FR-004)
- [ ] Users can delete their notes (FR-005)
- [ ] Note ownership enforced across all operations (FR-006)

### Technical
- [ ] Rich text content stored as Delta JSON in `Mixed` Mongoose field
- [ ] `ObjectId` reference from Note to User model
- [ ] All 7 REST endpoints operational
- [ ] `authenticateToken` middleware applied to all note routes
- [ ] Input validation on create and update endpoints

### Quality
- [ ] Unit test coverage ≥ 80% (constitutional requirement)
- [ ] Integration tests for all 10 note API scenarios
- [ ] `npm run build` exits clean
- [ ] Cross-user access returns 404 (no information leakage)

## Dependencies

- **Hard Dependency**: Authentication system (001) — ✅ Complete
- **User model**: `src/models/User.ts` — ✅ Available
- **Auth middleware**: `src/middleware/auth.ts` — ✅ Available
- **Express server**: `src/server.ts` — ✅ Running
- **New package (optional)**: `isomorphic-dompurify` for Delta→HTML sanitisation (Phase 3)

## Risk Mitigation
- Use `MongoMemoryServer` for all tests (same pattern as auth tests — proven working)
- Ownership middleware returns 404 for both missing and cross-user notes (no info leakage)
- Content sanitisation in `ContentProcessor.sanitizeContent` prevents Delta attribute injection
- 500KB content limit enforced in `validateNote` middleware prevents database bloat
- Auto-save only fires for existing notes (edit page), not new notes
