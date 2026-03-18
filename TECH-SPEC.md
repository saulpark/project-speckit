# Technical Specification

## Architecture Overview

### Technology Stack
- **Runtime**: Node.js 22+
- **Language**: TypeScript 5+ (strict mode)
- **Framework**: Express.js 5+
- **Database**: MongoDB 7+ with Mongoose 9 ODM
- **Authentication**: JWT tokens (cookie-based for browser, Bearer header for API)
- **Password Security**: bcrypt with 12 salt rounds
- **Rich Text**: Quill.js Delta JSON format; `quill-delta-to-html` for server-side rendering
- **Templating**: Handlebars (`express-handlebars`)
- **Security**: helmet, express-validator, CSRF protection, request size limiting, security logging
- **Development**: nodemon, ts-node
- **Testing**: Jest with ts-jest, Supertest, mongodb-memory-server
- **Logging**: Morgan (HTTP), console-based structured logging

### Project Structure
```
src/
├── server.ts                      # Express app entry: middleware chain, route registration
├── config/
│   └── database.ts                # MongoDB connect/disconnect/healthCheck
├── models/
│   ├── User.ts                    # IUser, IUserModel, userSchema
│   └── Note.ts                    # INote, INoteContent, ISharedUser, noteSchema
├── controllers/
│   ├── authController.ts          # register, login, logout, getProfile, getAuthStats, requestPasswordReset, resetPassword
│   └── noteController.ts          # getNotesView, listNotes, createNote, getNote, updateNote, deleteNote,
│                                  # getSharedNotesView, getCreateForm, getEditForm, getShowView,
│                                  # togglePublicSharing, getPublicNote, shareNoteWithUser,
│                                  # unshareNoteWithUser, getSharedNotes, getNoteSharingInfo
├── services/
│   ├── authService.ts             # registerUser, loginUser, getUserById
│   ├── noteService.ts             # createNote, getUserNotes, getNoteById, updateNote, deleteNote,
│   │                              # shareNotePublic, unshareNotePublic, shareNoteWithUser,
│   │                              # unshareNoteWithUser, getSharedNotes, getNoteWithSharingAccess, getPublicNote
│   ├── tokenBlacklistService.ts   # In-memory JWT blacklist: add, isBlacklisted, cleanup, getStats
│   └── userService.ts             # findUserByEmail, findUserById, validateUserForSharing,
│                                  # findUsersByEmails, getUserSharingDisplayInfo
├── middleware/
│   ├── auth.ts                    # authenticateToken (cookie + header), authenticateWeb, optionalAuthentication
│   ├── noteOwnership.ts           # verifyNoteOwnership (owner-only), verifyNoteAccessOrShared (owner or shared)
│   ├── noteValidation.ts          # validateNote, validateNoteUpdate (express-validator chains)
│   ├── validation.ts              # validateRegistration, validateLogin, validatePasswordResetRequest,
│   │                              # handleValidationErrors, sanitizeInput
│   ├── security.ts                # CSRFProtection, securityHeaders, securityLogger, IPBlacklist, requestSizeLimit
│   └── errorHandler.ts            # globalErrorHandler, notFoundHandler, generateClientErrorHandler
├── routes/
│   ├── authRoutes.ts              # /auth/* route definitions
│   ├── noteRoutes.ts              # /notes/* and /public/notes/* route definitions
│   └── testEditRoutes.ts          # Debug routes (dev only — should not reach production)
└── utils/
    ├── jwt.ts                     # JWTUtils: generateToken, verifyToken, extractFromHeader
    ├── crypto.ts                  # hashPassword, verifyPassword
    └── contentProcessor.ts        # ContentProcessor: textToDelta, sanitizeContent, deltaToPreview
```

### Views Structure
```
views/
├── layouts/
│   └── main.handlebars            # Shell layout with navigation, head, scripts
├── partials/
│   ├── alert.handlebars
│   └── footer.handlebars
├── auth/
│   ├── login.handlebars
│   └── register.handlebars
├── dashboard.handlebars           # Post-login dashboard
└── notes/
    ├── list.handlebars            # Paginated note cards; shows sharing badges (isPublic, sharedWith count)
    ├── fresh-view.handlebars      # Active single note view; renders Quill Delta to HTML; includes sharing panel and modal for owners
    ├── public-view.handlebars     # Unauthenticated public note view (isPublic: true only); no nav/auth UI
    └── fresh-edit.handlebars      # Active create/edit form with Quill.js editor
```

## Data Models

### User
```typescript
{
  _id: ObjectId,
  email: string,          // unique, indexed, lowercase
  passwordHash: string,   // bcrypt hash, excluded from default queries
  isActive: boolean,      // default: true; indexed
  createdAt: Date,
  updatedAt: Date
}
```

### Note
```typescript
{
  _id: ObjectId,
  userId: ObjectId,       // ref User; indexed
  title: string,          // max 200 chars; default 'Untitled'
  content: {
    type: 'delta' | 'plain',
    data: Mixed,          // Quill Delta JSON object
    preview: string       // plain-text excerpt for list display
  },
  isPublic: boolean,      // default false; indexed
  sharedWith: [{
    userId: ObjectId,     // ref User; indexed for shared-with-me queries
    grantedAt: Date,
    grantedBy: ObjectId   // ref User (always the note owner)
  }],
  tags: string[],         // lowercase, trimmed
  createdAt: Date,
  updatedAt: Date
}
```
Indexes: `{ userId, updatedAt }`, `{ userId, title: text, content.preview: text }`, `{ isPublic, updatedAt }`, `{ sharedWith.userId }`

## Design Decisions

### Authentication Strategy
- **JWT Tokens**: Stateless authentication; signed with HS256 by default
- **Cookie Storage**: `authToken` HTTP-only cookie for browser sessions
- **Dual Auth Support**: `authenticateToken` reads from cookie OR `Authorization: Bearer` header, enabling both browser and API clients
- **Token Blacklisting**: In-memory `TokenBlacklistService` for immediate logout invalidation; automatic cleanup of expired entries
- **Password Security**: bcrypt with 12 salt rounds; `passwordHash` field excluded from default MongoDB queries

### Note Content Design
- **Quill Delta Format**: All notes stored as Quill Delta JSON (`{ ops: [...] }`)
- **Auto-conversion**: Plain text input converted to Delta server-side via `ContentProcessor.textToDelta()`
- **Preview Field**: `content.preview` stores a plain-text excerpt generated at save time for list display without loading full Delta
- **Server-side HTML rendering**: `quill-delta-to-html` converts Delta to HTML in `getShowView` for display
- **Content Limit**: 500KB maximum enforced in `noteValidation.ts`

### Note Ownership and Sharing
- **Ownership middleware** (`verifyNoteOwnership`): Used for write operations (edit, update, delete, manage sharing). Returns 404 for both missing and other-user notes — no information leakage.
- **Access middleware** (`verifyNoteAccessOrShared`): Used for read operations (`GET /notes/:id`). Allows access for owner OR users in `sharedWith` array. Attaches `noteAccess` object with `{ isOwner, isShared, canEdit, canShare }`.
- **Public access**: `GET /public/notes/:id` bypasses authentication entirely, serves only notes with `isPublic: true`.
- **Sharing revocation**: Deleting a note removes all sharing records automatically (document deletion). Individual user access revocation via `unshareNoteWithUser`.

### Security Measures
- **CORS**: Disabled in production (`origin: false`), permissive in development
- **Helmet**: Imported but CSP currently disabled pending Quill.js compatibility fix (see `AUDIT.md`)
- **CSRF**: Custom `CSRFProtection` middleware applied to form-submitting auth routes
- **Request Size**: `requestSizeLimit()` middleware caps payload size
- **XSS**: Input sanitization via `sanitizeInput` middleware and express-validator
- **Anti-cache Headers**: All responses sent with `no-store, no-cache` headers (development convenience; review for production static assets)

### API Design
- **RESTful**: Standard HTTP methods and status codes
- **JSON**: Consistent `{ success, message, data, timestamp }` response envelope
- **Error handling**: Centralized `globalErrorHandler`; structured error codes
- **Logging**: Morgan for HTTP access logs; security logger middleware

## Spec Implementation Status

| Spec | Feature | Implementation |
|------|---------|---------------|
| 001 | Authentication | `src/controllers/authController.ts`, `src/services/authService.ts`, `src/models/User.ts` |
| 002 | Token Blacklisting | `src/services/tokenBlacklistService.ts`, integrated in `src/middleware/auth.ts` |
| 003 | Notes CRUD | `src/controllers/noteController.ts`, `src/services/noteService.ts`, `src/models/Note.ts` |
| 004 | Note Sharing (backend) | `NoteService` sharing methods, `verifyNoteAccessOrShared`, `src/services/userService.ts` |
| 004 | Note Sharing (UI) | `views/notes/fresh-view.handlebars` (sharing panel, toggle public, modal for user sharing, revoke); `views/notes/public-view.handlebars` (unauthenticated view); `views/notes/list.handlebars` (sharing badges) |
| 005 | User Management | Draft only — not started |

## Development Guidelines

### Code Style
- TypeScript strict mode enabled; no `any` in new code
- ESLint for code quality (`npm run lint`)
- Prettier for formatting (`npm run format`)
- Controllers handle HTTP; services contain business logic; models define schema

### Testing Strategy
- Jest for unit testing (`npm run test`)
- Supertest for API integration testing
- `mongodb-memory-server` for isolated database tests
- Target: 80%+ coverage for new business logic (constitutional requirement)

### Deployment
- Docker containerization via `docker-compose`
- Full rebuild required after code changes: `docker-compose down && docker-compose up --build -d`
- Environment-based configuration via `.env`
- `/health` endpoint for health monitoring

## Performance Considerations

### Database
- Connection pooling via Mongoose defaults
- Compound indexes on `userId + updatedAt` for note list queries
- Text index on `title + content.preview` for search
- `sharedWith.userId` index for shared-with-me queries

### Caching
- Template caching disabled (`app.set('view cache', false)`) for development correctness
- Anti-cache headers on all responses (development mode convenience)

## Change Log

### 2026-03-18
- Spec 004 frontend UI complete: sharing panel and modal added to `fresh-view.handlebars` (toggle public sharing, copy public URL, share by email, revoke user access)
- `public-view.handlebars` created for unauthenticated public note viewing
- Navigation enhancements: logout and main-menu buttons added to `fresh-view.handlebars` action bar
- `NoteController.getPublicNoteView()` added to render `public-view.handlebars` for `GET /public/notes/:id`
- `NoteController.getShowView()` updated: populates `sharedWith.userId` for owner view, computes `publicUrl`, passes `access` and `htmlContent` to template
- Spec 004 status updated to Complete in all spec files (spec.md, plan.md, tasks.md)
- Spec 001 non-standard files removed; all content consolidated into standard spec.md, plan.md, tasks.md

### 2026-03-17
- Spec 004 backend fully implemented: public sharing toggle, user-to-user sharing, shared notes view, access control middleware extended
- Note model extended with `sharedWith` array and `ISharedUser` interface
- `userService.ts` created for sharing-related user lookups
- `verifyNoteAccessOrShared` middleware added to `noteOwnership.ts`
- `fresh-edit.handlebars` and `fresh-view.handlebars` created; Quill.js integration working
- Fix: Edit form data loading resolved; Docker rebuild workflow established

### 2026-03-11
- Notes CRUD fully implemented (spec 003)
- Quill.js Delta content model implemented with `ContentProcessor` utility
- Note ownership middleware and note validation middleware created
- Paginated notes list view with Handlebars templates

### 2026-03-08
- Initial architecture design
- JWT authentication implementation (spec 001)
- Token blacklisting for logout (spec 002)
- MongoDB integration with Mongoose
- Security middleware stack setup
- Handlebars template engine configured
