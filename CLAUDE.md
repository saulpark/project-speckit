# Claude Code Instructions

## Project Overview
This is a Node.js/TypeScript authentication system with MongoDB backend.

## Architecture
- `src/server.ts` - Main application server
- `src/models/` - Mongoose data models
- `src/controllers/` - Request handlers
- `src/services/` - Business logic layer
- `src/middleware/` - Express middleware
- `src/utils/` - Utility functions
- `src/routes/` - API route definitions

## Development Guidelines
- Use TypeScript for type safety
- Follow RESTful API conventions
- Implement proper error handling
- Maintain comprehensive logging
- Use environment variables for configuration

## Security Measures
- JWT token authentication
- Password hashing with bcrypt
- Input validation and sanitization
- CORS protection
- Rate limiting
- XSS protection

## Quality Assurance
- TypeScript compilation checks
- Pre-commit hook validation
- Security scanning
- Documentation maintenance
