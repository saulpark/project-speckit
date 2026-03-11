# Notes CRUD Operations - Specification

**Spec ID**: 003
**Status**: Implemented ✅
**Created**: 2026-03-08
**Updated**: 2026-03-11
**Priority**: High
**Depends On**: 001-authentication ✅ Complete

## Overview
Core note-taking functionality allowing authenticated users to create, read, update, and delete their personal notes with rich text content support. Notes are private by default and strictly owned by the creating user.

## Requirements

### FR-001: Create New Notes
- **Description**: Authenticated users can create new notes with title and content
- **Acceptance Criteria**:
  - Note creation form with title and content fields
  - Notes automatically associated with logged-in user
  - Support for rich content formatting
  - Automatic creation and modification tracking
  - Protection against unauthorized form submission
- **Priority**: High

### FR-002: View Note List
- **Description**: Users can view a list of all their notes
- **Acceptance Criteria**:
  - Paginated list showing note titles and creation dates
  - Only user's own notes are visible
  - Links to view/edit individual notes
  - Empty state message for users with no notes
- **Priority**: High

### FR-003: View Individual Notes
- **Description**: Users can read the full content of their notes
- **Acceptance Criteria**:
  - Full note display with title and formatted content
  - Proper rendering of rich content formatting
  - Edit and delete action buttons
  - Navigation back to note list
- **Priority**: High

### FR-004: Edit Existing Notes
- **Description**: Users can modify their existing notes
- **Acceptance Criteria**:
  - Pre-populated edit form with current note data
  - Save changes updates content and modification tracking
  - Cancel option returns to note view without changes
  - Protection against unauthorized form submission
- **Priority**: High

### FR-005: Delete Notes
- **Description**: Users can permanently remove their notes
- **Acceptance Criteria**:
  - Delete confirmation to prevent accidental removal
  - Permanent removal from database
  - Redirect to note list after successful deletion
  - Only note owner can delete their notes
- **Priority**: High

### FR-006: Note Ownership Security
- **Description**: Users can only access their own notes
- **Acceptance Criteria**:
  - All note operations enforce user ownership
  - Appropriate error for accessing other users' notes
  - Data access restricted to user's own content
  - No information leakage about other users' notes
- **Priority**: High

## Success Criteria

### SC-001: Note Creation Success Rate
- **Metric**: Successful note saves / total creation attempts
- **Target**: >99% for valid input

### SC-002: Data Integrity
- **Metric**: Notes correctly associated with owners
- **Target**: 100% ownership accuracy

### SC-003: Performance
- **Metric**: Page load time for note list
- **Target**: <500ms for lists under 100 notes

## User Stories

### US-001: Create First Note
**As a** new user
**I want** to create my first note easily
**So that** I can start organizing my thoughts

**Acceptance Criteria:**
- [ ] Clear "Create Note" button on empty dashboard
- [ ] Simple form with title and content fields
- [ ] Rich text support for formatting
- [ ] Save and continue editing option

### US-002: Manage Note Collection
**As a** regular user
**I want** to view and organize my notes
**So that** I can find and reference them later

**Acceptance Criteria:**
- [ ] Searchable note list with titles and dates
- [ ] Quick actions for edit/delete
- [ ] Responsive design for mobile access
- [ ] Bulk operations (future enhancement)

### US-003: Edit Note Content
**As a** note author
**I want** to modify my existing notes
**So that** I can keep information up to date

**Acceptance Criteria:**
- [ ] Seamless editing experience
- [ ] Auto-save or clear save indication
- [ ] Version history (future enhancement)
- [ ] Undo/redo capabilities

## Edge Cases & Constraints

### Business Rules
- Notes belong to exactly one user (no sharing in this feature)
- Note titles can be empty (default to "Untitled")
- Content supports rich text formatting
- Note deletion is permanent (no recovery option)

### Edge Cases
- Very large note content (size limits)
- Concurrent editing by same user (multiple tabs)
- System failures during save operations
- Corrupted or invalid content format recovery

## Dependencies

### Feature Dependencies
- User authentication system (001-authentication)
- User account management capabilities
- Data persistence and retrieval system
- Web form handling and validation

### Integration Points
- User session and identity management
- Content formatting and display system
- Responsive user interface framework

### Future Enhancements
- Advanced rich text editing capabilities
- Search and filtering functionality
- Note organization and categorization

## Clarifications Resolved

| Item | Decision |
|---|---|
| Rich text editor | Quill.js with Delta format (documented in `technical-implementation.md`) |
| Note sharing | Out of scope — `isPublic` field reserved for future spec |
| Search/filtering | Out of scope — text index created but search UI deferred |
| Maximum note size | 500KB content limit, enforced in validation middleware |
| Plain text API input | Auto-converted to Delta format server-side |

## Technology Stack

| Layer | Technology |
|---|---|
| Database | MongoDB via Mongoose ODM |
| Validation | express-validator (already installed) |
| Rich Text | Quill.js Delta JSON in MongoDB Mixed field |
| Templates | Handlebars (configured in server.ts) |
| Auth | `authenticateToken` middleware from auth system (001) |

> **Important**: `plan.md` and `tasks.md` contain Prisma references from an earlier design iteration. All implementation uses **Mongoose** as documented in `technical-implementation.md`.

## Implementation Phases

### Phase 1: Data Foundation (2 days)
- Note Mongoose model — `src/models/Note.ts`
- `NoteService` class — `src/services/noteService.ts`
- `ContentProcessor` utility — `src/utils/contentProcessor.ts`
- Note validation middleware — `src/middleware/noteValidation.ts`
- Ownership middleware — `src/middleware/noteOwnership.ts`

### Phase 2: API Endpoints (1 day)
- Notes router — `src/routes/noteRoutes.ts`
- `NoteController` with all CRUD handlers — `src/controllers/noteController.ts`
- Register router in `src/server.ts`

### Phase 3: Frontend Templates (2 days)
- `views/notes/list.handlebars` — paginated note cards
- `views/notes/show.handlebars` — full note view
- `views/notes/edit.handlebars` — Quill editor for create and edit
- Quill.js bundle in `public/js/`
- Update dashboard with link to `/notes`

### Phase 4: Testing (1 day)
- Unit tests: `NoteService`, `ContentProcessor`
- Integration tests: all 7 note API endpoints
- Security tests: cross-user access attempts
- Coverage ≥ 80% (constitutional requirement)

## Dependency Status

### Completed Prerequisites
- ✅ Authentication system (001) — JWT middleware, User model, MongoDB connection

### New Dependencies Required
- `isomorphic-dompurify` — HTML sanitisation for Delta-to-HTML rendering
- Quill.js (CDN or local bundle)

## API Endpoints Summary

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/notes` | Required | List user's notes (paginated) |
| `POST` | `/notes` | Required | Create a new note |
| `GET` | `/notes/new` | Required | Note creation form |
| `GET` | `/notes/:id` | Required | View a single note |
| `GET` | `/notes/:id/edit` | Required | Note edit form |
| `PUT` | `/notes/:id` | Required | Update a note |
| `DELETE` | `/notes/:id` | Required | Delete a note |

## Success Criteria

| Metric | Target |
|---|---|
| Note list query time | < 100ms (indexed) |
| Create/update latency | < 200ms |
| Ownership enforcement | 100% |
| Test coverage (notes module) | ≥ 80% |

## Technical Implementation
Full database schema, service layer patterns, content processing utilities, Handlebars template examples, and testing strategy are documented in [`technical-implementation.md`](technical-implementation.md).