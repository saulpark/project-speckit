# SpecKit Authentication API

## Overview
JWT-based authentication system with security features.

## Quick Start
```bash
npm install
npm run dev
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user

### User Management
- `GET /auth/me` - Get current user info
- `GET /auth/profile` - Get user profile
- `POST /auth/check-email` - Check email availability

### UI Routes
- `GET /auth/login` - Login page
- `GET /auth/register` - Registration page
- `GET /auth/dashboard` - Dashboard (protected)

## Security Features
- JWT token authentication
- Rate limiting (5 auth attempts/15min)
- CSRF protection
- Password strength validation
- Security headers (XSS, CSRF, etc.)

## Response Format
All API responses follow this structure:
```json
{
  "success": true,
  "message": "Operation completed",
  "data": { /* response data */ },
  "timestamp": "2026-03-09T..."
}
```

## Error Codes
- `VALIDATION_ERROR` - Invalid input data
- `INVALID_CREDENTIALS` - Wrong email/password
- `TOKEN_INVALID` - Invalid JWT token
- `DUPLICATE_EMAIL` - Email already exists
- `RATE_LIMIT_EXCEEDED` - Too many requests

## Environment Variables
```env
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
MONGODB_URI=mongodb://localhost:27017/speckit
```