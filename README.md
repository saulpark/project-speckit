# Project SpecKit

## Overview
A Node.js/TypeScript note-taking application with JWT authentication, rich text note management, and note sharing capabilities, built following the **Spec-Kit methodology** for Spec-Driven Development.

## Implemented Features

| Feature | Spec | Status |
|---------|------|--------|
| User registration and login | 001-authentication | Complete |
| JWT cookie-based authentication | 001-authentication | Complete |
| Server-side token blacklisting on logout | 002-logout-enhancement | Complete |
| Notes CRUD with rich text (Quill.js) | 003-notes-crud | Complete |
| Note ownership enforcement | 003-notes-crud | Complete |
| Public link sharing (toggle isPublic) | 004-note-sharing | Complete |
| User-to-user note sharing via email | 004-note-sharing | Complete |
| "Shared with me" notes view | 004-note-sharing | Complete |
| Sharing access control middleware | 004-note-sharing | Complete |
| Sharing UI (modal, public link copy, user management) | 004-note-sharing | Complete |
| Public note view (unauthenticated, clean template) | 004-note-sharing | Complete |

## Spec-Kit Workflow

This project follows the **Spec-Kit methodology** for structured development:

### Step 1: Constitution
```bash
claude SpecKit constitution
```
Output: `.specify/constitution.md`

### Step 2: Specify (Requirements)
```bash
claude SpecKit specify "Feature description here"
```
Output: `.specify/specs/XXX-feature-name/spec.md`

### Step 3: Plan (Technical Design)
```bash
claude SpecKit plan .specify/specs/XXX-feature-name/spec.md
```
Output: `.specify/specs/XXX-feature-name/plan.md`

### Step 4: Tasks (Action Items)
```bash
claude SpecKit tasks .specify/specs/XXX-feature-name/plan.md
```
Output: `.specify/specs/XXX-feature-name/tasks.md`

### Step 5: Implement (Development)
```bash
claude SpecKit implement .specify/specs/XXX-feature-name/tasks.md
```

## Spec-Kit File Structure
```
.specify/
├── constitution.md              # Project governing principles
├── memory/
│   ├── constitution.md          # Constitution memory copy
│   └── technical-requirements.md
├── templates/
│   └── spec-template.md
└── specs/
    ├── 001-authentication/      # Complete
    ├── 002-logout-enhancement/  # Complete
    ├── 003-notes-crud/          # Complete
    ├── 004-note-sharing/        # Complete
    └── 005-user-management/     # Draft
```

## Setup

### Requirements
- Node.js 22+
- Docker and Docker Compose (for MongoDB)

### Local Development
1. Install dependencies: `npm install`
2. Copy environment file: `cp .env.example .env` and fill in values
3. Start MongoDB: `docker-compose up -d mongo`
4. Build and start development server: `npm run dev`

### Full Docker Stack
```bash
# Build and start all services (required after code changes)
docker-compose down && docker-compose up --build -d
```

Note: Use the full `down`/`up --build` cycle — `docker-compose restart` alone does not pick up new builds.

### Build
```bash
npm run build    # Compile TypeScript
npm run dev      # Development server with hot reload
npm run start    # Production server
npm run test     # Run test suite
npm run lint     # Lint TypeScript files
```

## API Endpoints

### Authentication (`/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | Public | Register new user |
| POST | `/auth/login` | Public | Login, sets auth cookie |
| POST | `/auth/logout` | Public | Logout, blacklists token |
| GET | `/auth/me` | Optional | Current user info |
| GET | `/auth/profile` | Required | User profile |
| GET | `/auth/stats` | Required | Auth statistics |
| POST | `/auth/check-email` | Public | Email availability check |
| POST | `/auth/reset-password-request` | Public | Request password reset |
| POST | `/auth/reset-password` | Public | Reset password with token |
| GET | `/auth/health` | Public | Auth service health |
| GET | `/auth/admin/status` | Required | Admin system status |

### UI Routes (`/auth`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/login` | Login page |
| GET | `/auth/register` | Registration page |
| GET | `/auth/dashboard` | Dashboard (protected) |

### Notes (`/notes`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notes` | Required | Notes list view |
| GET | `/notes/new` | Required | Create note form |
| GET | `/notes/shared-with-me` | Required | Shared notes view |
| GET | `/notes/:id/view` | Required | View note (owner or shared user) |
| GET | `/notes/:id/edit` | Required | Edit note form (owner only) |
| GET | `/notes/api` | Required | List notes (JSON) |
| POST | `/notes` | Required | Create note |
| GET | `/notes/:id` | Required | Get note (owner or shared) |
| PUT | `/notes/:id` | Required | Update note (owner only) |
| DELETE | `/notes/:id` | Required | Delete note (owner only) |

### Note Sharing (`/notes`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/notes/:id/share/public` | Required | Toggle public link sharing |
| POST | `/notes/:id/share/user` | Required | Share with user by email |
| DELETE | `/notes/:id/share/user/:userId` | Required | Revoke user access |
| GET | `/notes/api/shared-with-me` | Required | Shared notes (JSON) |
| GET | `/notes/:id/sharing` | Required | Note sharing details |

### Public Access
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/public/notes/:id` | None | Read public note |
| GET | `/health` | None | Application health check |

## Environment Variables
```env
MONGODB_URI=mongodb://localhost:27017/speckit
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=24h
PORT=3000
NODE_ENV=development
PUBLIC_NOTE_BASE_URL=http://localhost:3000
NOTE_SHARING_RATE_LIMIT=10
```

## Architecture
Built with a layered Node.js/TypeScript stack: Controllers handle requests, Services contain business logic, Models define the MongoDB schema. See `TECH-SPEC.md` for full architecture documentation.
