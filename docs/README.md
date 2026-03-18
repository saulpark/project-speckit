# SpecKit API Documentation

## Overview
JWT-based authentication and note-taking system with rich text support and note sharing.

## Quick Start
```bash
npm install
docker-compose down && docker-compose up --build -d
```

## Authentication API

### Endpoints
- `POST /auth/register` — Register new user
- `POST /auth/login` — Login, returns JWT in `authToken` cookie
- `POST /auth/logout` — Logout, blacklists token
- `GET /auth/me` — Current user info (optional auth)
- `GET /auth/profile` — User profile (auth required)
- `POST /auth/check-email` — Check email availability
- `POST /auth/reset-password-request` — Request password reset
- `POST /auth/reset-password` — Reset password with token
- `GET /auth/health` — Auth service health

### UI Routes
- `GET /auth/login` — Login page
- `GET /auth/register` — Registration page
- `GET /auth/dashboard` — Dashboard (protected)

## Notes API

### Web Routes (return HTML)
- `GET /notes` — Notes list page
- `GET /notes/new` — Create note form
- `GET /notes/shared-with-me` — Shared notes page
- `GET /notes/:id/view` — View note (owner or shared user)
- `GET /notes/:id/edit` — Edit note form (owner only)

### JSON API
- `GET /notes/api` — List notes (paginated)
- `POST /notes` — Create note
- `GET /notes/:id` — Get note (owner or shared user)
- `PUT /notes/:id` — Update note (owner only)
- `DELETE /notes/:id` — Delete note (owner only)

## Note Sharing API

- `POST /notes/:id/share/public` — Toggle public link sharing
- `GET /public/notes/:id` — View public note page (no auth; renders `public-view.handlebars`)
- `POST /notes/:id/share/user` — Share with user by email
- `DELETE /notes/:id/share/user/:userId` — Revoke user access
- `GET /notes/api/shared-with-me` — List notes shared with current user
- `GET /notes/:id/sharing` — Get sharing details for a note

## Security Features
- JWT token authentication (cookie-based)
- Server-side token blacklisting on logout
- Rate limiting (5 auth attempts / 15 min)
- CSRF protection on auth form routes
- Password strength validation (min 8 chars, upper/lower/number)
- Note ownership enforcement (404 for unauthorized access)
- Request size limiting

## Response Format
All JSON API responses follow this structure:
```json
{
  "success": true,
  "message": "Operation completed",
  "data": { },
  "timestamp": "2026-03-17T..."
}
```

## Error Codes
- `VALIDATION_ERROR` — Invalid input data
- `INVALID_CREDENTIALS` — Wrong email/password
- `TOKEN_INVALID` — Invalid or blacklisted JWT token
- `DUPLICATE_EMAIL` — Email already registered
- `RATE_LIMIT_EXCEEDED` — Too many requests
- `NOTE_NOT_FOUND` — Note missing or not owned by user
- `ALREADY_SHARED` — Note already shared with target user
- `USER_NOT_FOUND` — Recipient email not found
- `SELF_SHARE_ERROR` — Cannot share note with yourself

## Environment Variables
```env
MONGODB_URI=mongodb://localhost:27017/speckit
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
PORT=3000
NODE_ENV=development
PUBLIC_NOTE_BASE_URL=http://localhost:3000
```
