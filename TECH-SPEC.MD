# Technical Specification

Authoritative record of key architectural decisions, design constraints, and technical conventions for this project. Update this file when a significant design decision is made or changed.

---

## Stack Overview

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Runtime | Node.js | 22+ | LTS |
| Language | TypeScript | strict mode | No `any` in new code |
| Framework | Express.js | 5+ | |
| Database | MongoDB | 7+ | Mongoose ODM |
| Auth | JWT | — | HTTP-only cookies + Bearer |
| Templates | Handlebars (express-handlebars) | — | Server-side rendered |
| Rich Text | Quill.js | — | Delta format |
| Testing | Jest + ts-jest + Supertest | — | MongoMemoryServer for isolation |
| Containers | Docker + Docker Compose | — | Full rebuild required on changes |

---

## Architecture Decisions

### AD-001: Layered Architecture (Controllers → Services → Models)
- **Decision**: Business logic lives exclusively in service classes. Controllers handle HTTP request/response only. Models define schema and basic data access.
- **Rationale**: Constitution requirement. Keeps controllers thin, services testable without HTTP overhead.
- **Enforced by**: Code review and lint rules.

### AD-002: JWT Authentication via HTTP-only Cookies
- **Decision**: The auth token is set as an HTTP-only cookie (`authToken`) after login. API consumers can also use `Authorization: Bearer <token>`.
- **Rationale**: Prevents XSS token theft from `localStorage`. Provides seamless browser sessions without client-side JS token management.
- **Middleware**: `authenticateToken` (JSON API), `authenticateWeb` (HTML routes), `optionalAuthentication` (public routes that can optionally show user context).

### AD-003: In-Memory Token Blacklist
- **Decision**: Logged-out tokens are stored in `TokenBlacklistService` (in-memory Map with TTL cleanup).
- **Rationale**: Simple, zero-dependency implementation for current single-instance deployment. Sufficient for MVP.
- **Limitation**: Blacklist is lost on server restart; tokens remain valid until their JWT expiry if the server restarts. See AUDIT-008.
- **Future**: Replace with Redis for multi-instance or persistent invalidation.

### AD-004: Note Content Stored as Structured Object
- **Decision**: Note content is stored as `{ type: 'delta' | 'plain', data: any, preview?: string }` rather than raw HTML or plain text.
- **Rationale**: Preserves Quill.js Delta fidelity for re-editing. `preview` field enables efficient list display without re-parsing content.
- **Processing**: `ContentProcessor.textToDelta()` auto-converts plain text on save. `ContentProcessor.sanitizeContent()` applies XSS sanitization. `ContentProcessor.deltaToPreview()` generates excerpts.

### AD-005: Access Control — 404 instead of 403
- **Decision**: Unauthorized access to notes always returns 404, never 403.
- **Rationale**: Prevents information leakage. A 403 would confirm the note exists. A 404 is indistinguishable from "note not found."
- **Applies to**: `verifyNoteOwnership`, `verifyNoteAccessOrShared`, `NoteController.getPublicNote`.

### AD-006: Role-Based Admin Access
- **Decision**: Admin role is set directly in the database (`role: 'admin'`). There is no self-promotion endpoint.
- **Rationale**: Prevents privilege escalation attacks. Admin access is an out-of-band, operations-level action.
- **Middleware**: `requireAdmin` (JSON API routes), `requireAdminWeb` (HTML routes). Admin users cannot deactivate themselves or other admins.

### AD-007: Docker Full Rebuild Cycle Required
- **Decision**: The documented and enforced development workflow is `docker-compose down && docker-compose up --build -d`.
- **Rationale**: `docker-compose restart` does not trigger a TypeScript recompile inside the container. This caused repeated debugging confusion before being identified and documented.
- **Reference**: CLAUDE.md Docker Development Workflow section.

### AD-008: Spec-Driven Development via `.specify/` Directory
- **Decision**: All features begin with a spec in `.specify/specs/<id>-<name>/`. The canonical file order is `spec.md` → `plan.md` → `tasks.md` → `technical-implementation.md`.
- **Rationale**: Constitution requirement. Ensures implementation matches intent and provides audit trail.
- **Tooling**: `.claude/commands/SpecKit.md` provides the `SpecKit` slash command for spec lifecycle management.

---

## API Design Conventions

### Uniform Response Envelope
All JSON responses use:
```json
{
  "success": true | false,
  "message": "Human-readable description",
  "data": { /* payload */ },
  "timestamp": "ISO-8601 datetime"
}
```

### Notes API Response Nesting
The Notes API wraps the note under `data.note`:
```
response.data.data.note._id
```
This double-nesting (`data.data.note`) is the current behavior and must be accounted for in all client-side JavaScript templates.

### Route Conventions
| Pattern | Middleware | Purpose |
|---------|-----------|---------|
| `GET /notes` | `authenticateWeb` | HTML rendered views |
| `GET /notes/api/*` | `authenticateToken` | JSON API responses |
| `GET /public/notes/:id` | none | Public note HTML view |
| `POST /notes/:id/share/*` | `authenticateToken` + `verifyNoteOwnership` | Owner-only sharing ops |

---

## Security Controls Summary

| Control | Implementation | Location |
|---------|---------------|---------|
| Password hashing | bcrypt, 12 salt rounds | `src/utils/crypto.ts` |
| JWT signing | HS256, configurable expiry | `src/utils/jwt.ts` |
| Token blacklist | In-memory Map with TTL | `src/services/tokenBlacklistService.ts` |
| CSRF protection | `CSRFProtection` middleware | `src/middleware/security.ts` |
| Input validation | express-validator | `src/middleware/validation.ts`, `profileValidation.ts`, `noteValidation.ts` |
| Request size limit | `requestSizeLimit` middleware | `src/middleware/security.ts` |
| Security headers | Helmet + custom | `src/middleware/security.ts` |
| IP blacklisting | `IPBlacklist` middleware | `src/middleware/security.ts` |
| Note access | Always 404 on unauthorized (never 403) | `src/middleware/noteOwnership.ts` |
| Admin access | Role check at middleware level | `src/middleware/adminAuth.ts` |
| Password change | Invalidates all user tokens | `src/services/tokenBlacklistService.ts` (`blacklistAllUserTokens`) |

---

## Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `JWT_SECRET` | Yes | — | JWT signing secret |
| `JWT_EXPIRES_IN` | No | `24h` | JWT token expiry |
| `PORT` | No | `3000` | HTTP server port |
| `NODE_ENV` | No | `development` | Environment mode |
| `PUBLIC_NOTE_BASE_URL` | No | `http://localhost:3000` | Base URL for public note links |
| `NOTE_SHARING_RATE_LIMIT` | No | `10` | Max sharing ops per window |
| `CORS_ORIGIN` | No | `http://localhost:3000` | CORS allowed origin |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per window |

---

## Testing Strategy

- **Unit tests**: Service-layer functions, utility functions, model methods. Use `MongoMemoryServer` for DB isolation.
- **Integration tests**: Full HTTP request/response cycle via Supertest. Covers auth endpoints and note CRUD.
- **Coverage target**: 80% minimum (Constitution requirement). Currently met for auth (spec 001). Note sharing (spec 004) and user management (spec 005) tests are pending.
- **Test runner**: `npm run test` (Jest + ts-jest). `npm run test:unit` for unit-only.

---

## Known Technical Debt

See `AUDIT.md` for the full list. Key items:
- No rate limiting middleware for note sharing operations (AUDIT-004)
- No database migration script for `sharedWith` backfill (AUDIT-005)
- Missing test coverage for sharing (AUDIT-006) and user management (AUDIT-007)
- In-memory token blacklist not suitable for production multi-instance (AUDIT-008)
