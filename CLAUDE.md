# Claude Code Instructions

## Project Overview
This is a Node.js/TypeScript note-taking application with JWT authentication, rich text note CRUD, and note sharing features. Backend is MongoDB with Mongoose ODM. Templating uses Handlebars with Quill.js for rich text editing.

## Spec-Kit Methodology
All features follow Spec-Driven Development. The authoritative source of truth for feature requirements, plans, and task status is the `.specify/` directory.

## Architecture
```
src/
├── server.ts                      # Express app, route registration, middleware chain
├── config/
│   └── database.ts                # MongoDB connection and health check
├── models/
│   ├── User.ts                    # User schema (email, passwordHash, isActive, displayName, role, lastLoginAt, passwordChangedAt, deactivatedAt)
│   └── Note.ts                    # Note schema (userId, title, content, isPublic, sharedWith, tags)
├── controllers/
│   ├── authController.ts          # Registration, login, logout, profile handlers
│   ├── noteController.ts          # Note CRUD + sharing endpoint handlers
│   ├── profileController.ts       # User profile view/update, password change, user stats
│   └── adminController.ts         # Admin dashboard, user management, system stats, activity
├── services/
│   ├── authService.ts             # User registration and authentication logic
│   ├── noteService.ts             # Note CRUD, public sharing, user sharing operations
│   ├── tokenBlacklistService.ts   # In-memory JWT token blacklist; blacklistAllUserTokens for password changes
│   ├── userService.ts             # User lookup, profile management, password change, user stats
│   └── adminService.ts            # Admin-only: getAllUsers, getSystemStats, toggleUserStatus, getUserWithStats, searchUsers, getRecentActivity
├── middleware/
│   ├── auth.ts                    # authenticateToken, authenticateWeb, optionalAuthentication
│   ├── adminAuth.ts               # requireAdmin (API), requireAdminWeb (HTML), optionalAdmin
│   ├── noteOwnership.ts           # verifyNoteOwnership, verifyNoteAccessOrShared
│   ├── noteValidation.ts          # validateNote, validateNoteUpdate
│   ├── profileValidation.ts       # validateProfileUpdate, validatePasswordChange, sanitizeProfileInput, validateRateLimit
│   ├── validation.ts              # validateRegistration, validateLogin, handleValidationErrors
│   ├── security.ts                # CSRFProtection, securityHeaders, securityLogger, IPBlacklist, requestSizeLimit
│   └── errorHandler.ts            # globalErrorHandler, notFoundHandler, generateClientErrorHandler
├── routes/
│   ├── authRoutes.ts              # All /auth/* routes
│   ├── noteRoutes.ts              # All /notes/* routes
│   ├── profileRoutes.ts           # All /profile/* routes (web + API); rate limiting for password changes
│   ├── adminRoutes.ts             # All /admin/* routes (web + API); admin rate limiting
│   └── testEditRoutes.ts          # Debug/test routes (dev only)
└── utils/
    ├── jwt.ts                     # JWT generation and verification
    ├── crypto.ts                  # Password hashing utilities
    └── contentProcessor.ts        # Quill Delta processing: textToDelta, sanitizeContent, deltaToPreview
```

## Views (Handlebars)
```
views/
├── layouts/
│   └── main.handlebars            # Main layout with nav
├── partials/
│   ├── alert.handlebars
│   └── footer.handlebars
├── auth/
│   ├── login.handlebars
│   └── register.handlebars
├── dashboard.handlebars
├── profile/
│   └── index.handlebars           # User profile page: display name edit, password change form, user stats
├── admin/
│   ├── dashboard.handlebars       # Admin dashboard: system stats cards, recent activity
│   └── users.handlebars           # User management: search/filter table, paginated, status toggles (JS-loaded)
└── notes/
    ├── list.handlebars            # Paginated note cards with sharing badges
    ├── show.handlebars            # Note view (legacy, not actively routed)
    ├── fresh-view.handlebars      # Active note view; sharing panel + modal for owners; logout/nav buttons
    ├── public-view.handlebars     # Unauthenticated public note view (isPublic: true only)
    ├── edit.handlebars            # Note edit (legacy, not actively routed)
    └── fresh-edit.handlebars      # Active note create/edit form with Quill.js
```

## Note Content Model
Note content is stored as a structured object:
```typescript
{
  type: 'delta' | 'plain',
  data: any,       // Quill Delta JSON or plain text string
  preview?: string // Plain-text excerpt for list display
}
```
Plain text input is auto-converted to Quill Delta format server-side via `ContentProcessor.textToDelta()`.

## API Response Format
All JSON responses follow this structure:
```json
{
  "success": true,
  "message": "Operation description",
  "data": { /* response payload */ },
  "timestamp": "2026-03-17T..."
}
```
Notes API response nests under `data.note`: `result.data.data.note._id`

## Authentication Flow
- Tokens stored in `authToken` HTTP-only cookie after login
- `authenticateToken` reads from `Authorization: Bearer` header or `authToken` cookie
- `authenticateWeb` redirects to `/auth/login` on failure (for UI routes)
- `optionalAuthentication` never fails — sets `req.user` if valid token present
- Logout blacklists the token in `TokenBlacklistService` (in-memory)

## Sharing Access Model
```
verifyNoteOwnership   — owner only (used for edit, delete, share management)
verifyNoteAccessOrShared — owner OR sharedWith user (used for read GET /notes/:id)
NoteController.getPublicNote — no auth (isPublic: true only)
```

## Admin Access Model
```
requireAdmin    — role === 'admin' check for JSON API routes; returns 401/403 JSON on failure
requireAdminWeb — role === 'admin' check for HTML routes; redirects to /auth/login on failure
optionalAdmin   — sets req.isAdmin flag; never blocks access (used for conditional UI)
```
Admin users cannot deactivate themselves or other admin accounts.
Admin role is set directly in the database; there is no self-promotion endpoint.

## Docker Development Workflow
CRITICAL: Use full rebuild cycle, not just restart:
```bash
docker-compose down && docker-compose up --build -d
```
A plain `docker-compose restart` does not pick up new TypeScript builds.

## Development Guidelines
- Use TypeScript strict mode; no `any` types in new code
- Follow RESTful API conventions
- Business logic belongs in services, not controllers
- Use `authenticateWeb` for rendered page routes, `authenticateToken` for JSON API routes
- Environment variables for all configuration (see `.env.example`)
- Comprehensive logging for security-related events
- No console.log in new production code — use the logger or structured error handling

## Security Measures
- JWT token authentication (cookie-based for browser, Bearer for API)
- Password hashing with bcrypt (12 salt rounds)
- Server-side token blacklisting on logout
- CSRF protection middleware (CSRFProtection)
- Input validation with express-validator
- CORS protection
- Request size limiting
- Security logging middleware
- Note ownership enforcement at middleware level (prevents info leakage — always 404, never 403)

## Spec Roadmap
| Spec | Feature | Status |
|------|---------|--------|
| 001 | Authentication | Complete |
| 002 | Logout Enhancement (token blacklisting) | Complete |
| 003 | Notes CRUD | Complete |
| 004 | Note Sharing | Complete (backend + UI; branch: `implement_sharing_notes`) |
| 005 | User Management | In Progress — Phase 1 (Profile), Phase 2 (Password Change), Phase 3 (Admin Interface) implemented; Phase 4 (Testing) pending |

## Quality Assurance
- TypeScript compilation: `npm run build`
- Linting: `npm run lint`
- Testing: `npm run test` (Jest + ts-jest)
- Pre-commit hook validation
