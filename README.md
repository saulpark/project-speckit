# Project SpecKit

A modern, full-stack note-taking application built with Node.js, TypeScript, and MongoDB. Features secure JWT authentication, rich text editing with Quill.js, and comprehensive note sharing capabilities. Developed using the **Spec-Kit methodology** for structured, specification-driven development.

## 🚀 Features

### ✅ Authentication & Security
- **User Registration & Login**: Complete user account management
- **JWT Cookie Authentication**: Secure, HTTP-only cookie-based sessions
- **Token Blacklisting**: Server-side logout with token invalidation
- **Password Security**: bcrypt hashing with 12 salt rounds
- **Input Validation**: Comprehensive server-side validation with express-validator

### 📝 Note Management
- **Rich Text Editing**: Powered by Quill.js with Delta format storage
- **CRUD Operations**: Create, read, update, delete notes with owner verification
- **Content Processing**: Support for both plain text and rich Delta format
- **Preview Generation**: Automatic text previews for note listings
- **Pagination**: Efficient note listing with pagination support

### 🤝 Note Sharing
- **Public Links**: Toggle public sharing with clean, unauthenticated view
- **User-to-User Sharing**: Share notes via email address lookup
- **Access Control**: Middleware-enforced sharing permissions
- **Shared Notes View**: Dedicated interface for notes shared with you
- **Share Management**: Add/remove users and toggle public access via UI

### 🏗️ Architecture & Quality
- **Layered Architecture**: Controllers → Services → Models separation
- **TypeScript**: Full type safety with strict mode
- **MongoDB**: Document database with Mongoose ODM
- **Express.js**: RESTful API with comprehensive middleware
- **Handlebars**: Server-side rendered views
- **Docker**: Containerized development and deployment

## 📊 Implementation Status

| Feature | Spec | Status | Description |
|---------|------|--------|-------------|
| Authentication System | 001 | ✅ Complete | Registration, login, JWT cookies |
| Logout Enhancement | 002 | ✅ Complete | Server-side token blacklisting |
| Notes CRUD | 003 | ✅ Complete | Rich text notes with Quill.js |
| Note Sharing | 004 | ✅ Complete | Public links and user sharing |
| User Management | 005 | 🚧 In Progress | Enhanced user profile features |

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 22+
- **Language**: TypeScript with strict mode
- **Framework**: Express.js 5+
- **Database**: MongoDB 7+ with Mongoose ODM
- **Authentication**: JWT with HTTP-only cookies
- **Security**: bcrypt, express-validator, helmet
- **Templates**: Handlebars for server-side rendering

### Frontend
- **Rich Text**: Quill.js for note editing
- **UI Framework**: Custom CSS with responsive design
- **JavaScript**: Vanilla JS with modern ES6+ features
- **Icons**: Font Awesome for UI elements

### Development & Deployment
- **Development**: nodemon, ts-node for hot reload
- **Testing**: Jest with ts-jest, Supertest for API testing
- **Code Quality**: ESLint, Prettier, TypeScript strict mode
- **Containerization**: Docker and Docker Compose
- **Process Management**: PM2 for production

### Security Features
- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Management**: Token generation, verification, and blacklisting
- **Input Validation**: express-validator middleware
- **CORS Protection**: Configurable cross-origin policies
- **XSS Prevention**: Input sanitization and CSP headers
- **Rate Limiting**: Request throttling for API endpoints

## 🏗️ Spec-Kit Methodology

This project follows the **Spec-Kit workflow** for structured, specification-driven development:

### Phase 1: Constitution → Phase 2: Specify → Phase 3: Plan → Phase 4: Tasks → Phase 5: Implement

```bash
claude SpecKit constitution                    # Define project principles
claude SpecKit specify "Feature description"  # Create requirements spec
claude SpecKit plan .specify/specs/XXX/       # Generate technical design
claude SpecKit tasks .specify/specs/XXX/      # Break down into tasks
claude SpecKit implement .specify/specs/XXX/  # Execute implementation
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

## 🚀 Quick Start

### Prerequisites
- **Node.js** 22+ with npm
- **Docker** and Docker Compose
- **Git** for version control

### Local Development Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd project-speckit
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration values
   ```

3. **Start Database**
   ```bash
   docker-compose up -d mongo
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

   Access the application at [http://localhost:3000](http://localhost:3000)

### Full Docker Stack (Recommended)

For complete isolation and production-like environment:

```bash
# Initial setup or after major changes
docker-compose down && docker-compose up --build -d

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down
```

**Important**: Always use the full `down`/`up --build` cycle after code changes. Simple restart doesn't pick up new TypeScript builds.

### Available Scripts

```bash
# Development
npm run dev      # Start development server with hot reload
npm run build    # Compile TypeScript to dist/
npm run start    # Start production server

# Quality Assurance
npm run test     # Run test suite (Jest)
npm run test:unit # Run only unit tests
npm run lint     # Lint TypeScript files with ESLint
npm run type-check # TypeScript compilation check

# Database
npm run db:seed  # Seed database with sample data
npm run db:reset # Reset database (development only)
```

## 🔌 API Reference

### 🔐 Authentication Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | Public | Register new user account |
| `POST` | `/auth/login` | Public | Login and set auth cookie |
| `POST` | `/auth/logout` | Public | Logout and blacklist token |
| `GET` | `/auth/me` | Optional | Get current user info |
| `GET` | `/auth/profile` | Required | Get user profile |
| `GET` | `/auth/health` | Public | Auth service health check |

### 📝 Notes Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/notes` | Required | List user's notes (paginated) |
| `POST` | `/notes` | Required | Create new note |
| `GET` | `/notes/:id` | Required | Get note (owner or shared access) |
| `PUT` | `/notes/:id` | Required | Update note (owner only) |
| `DELETE` | `/notes/:id` | Required | Delete note (owner only) |
| `GET` | `/notes/api` | Required | List notes (JSON response) |

### 🤝 Note Sharing
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/notes/:id/share/public` | Required | Toggle public link sharing |
| `POST` | `/notes/:id/share/user` | Required | Share note with user by email |
| `DELETE` | `/notes/:id/share/user/:userId` | Required | Revoke user access |
| `GET` | `/notes/:id/sharing` | Required | Get note sharing details |
| `GET` | `/notes/api/shared-with-me` | Required | List shared notes (JSON) |

### 🌐 Web UI Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/auth/login` | Login page |
| `GET` | `/auth/register` | Registration page |
| `GET` | `/notes` | Notes dashboard |
| `GET` | `/notes/new` | Create note form |
| `GET` | `/notes/:id/view` | View note page |
| `GET` | `/notes/:id/edit` | Edit note form |
| `GET` | `/notes/shared-with-me` | Shared notes view |

### 🌍 Public Access
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/public/notes/:id` | None | View public note |
| `GET` | `/health` | None | Application health check |

### 📊 API Response Format
All JSON API responses follow this consistent structure:
```json
{
  "success": true,
  "message": "Operation description",
  "data": { /* response payload */ },
  "timestamp": "2026-03-18T..."
}
```

## ⚙️ Environment Configuration

### Required Environment Variables
```env
# Database
MONGODB_URI=mongodb://localhost:27017/speckit

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3000
NODE_ENV=development

# Note Sharing
PUBLIC_NOTE_BASE_URL=http://localhost:3000
NOTE_SHARING_RATE_LIMIT=10

# Security (Optional)
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### Environment Files
- `.env` - Local development (not committed)
- `.env.example` - Template with default values
- `.env.test` - Test environment configuration
- `.env.production` - Production settings (deploy-specific)

## 🧪 Testing

### Test Structure
```
tests/
├── unit/                    # Unit tests
│   ├── utils/              # Utility function tests
│   ├── models/             # Database model tests
│   └── services/           # Business logic tests
├── integration/            # Integration tests
│   ├── auth-api.test.ts    # Authentication API tests
│   └── notes-api.test.ts   # Notes API tests
└── setup.ts                # Test environment setup
```

### Running Tests
```bash
# Run all tests
npm test

# Run only unit tests (faster, no DB required)
npm run test:unit

# Run with coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Test Environment
Tests use an isolated environment with:
- In-memory MongoDB (via MongoMemoryServer)
- Separate test database
- Mock authentication tokens
- Isolated test data

## 🚀 Deployment

### Docker Production Deployment
```bash
# Build production image
docker build -t speckit:latest .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose logs -f app
```

### Manual Deployment
```bash
# Install production dependencies
npm ci --only=production

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 logs speckit
pm2 monit
```

### Environment Setup
1. Set up MongoDB instance (Atlas recommended)
2. Configure environment variables
3. Set up reverse proxy (nginx/Apache)
4. Configure SSL certificates
5. Set up monitoring and logging

## 🏗️ Architecture Overview

### Layered Architecture
```
┌─────────────────┐
│   Web Routes    │ ← Handlebars views, form handling
├─────────────────┤
│  API Controllers│ ← Request handling, validation
├─────────────────┤
│    Services     │ ← Business logic, data processing
├─────────────────┤
│   Data Models   │ ← MongoDB schemas with Mongoose
├─────────────────┤
│   Middleware    │ ← Auth, validation, error handling
└─────────────────┘
```

### Key Design Patterns
- **Repository Pattern**: Services encapsulate data access logic
- **Middleware Chain**: Express middleware for cross-cutting concerns
- **MVC Separation**: Clear separation of concerns
- **Service Layer**: Business logic isolated from controllers
- **DTO Pattern**: Consistent API response formats

### Project Structure
```
src/
├── server.ts                 # Application entry point
├── config/
│   └── database.ts          # MongoDB connection
├── controllers/             # Request handlers
├── services/               # Business logic
├── models/                 # Mongoose schemas
├── middleware/             # Express middleware
├── routes/                 # Route definitions
├── utils/                  # Utility functions
└── types/                  # TypeScript type definitions
```

## 🤝 Contributing

### Development Workflow
1. **Follow Spec-Kit Methodology**: All features must follow the 5-phase spec-kit workflow
2. **Branch Naming**: Use `implement_feature_name` for feature branches
3. **Commit Messages**: Use conventional commits with co-authored by Claude
4. **Testing**: Ensure all tests pass before committing
5. **Documentation**: Update specs and README for new features

### Code Standards
- **TypeScript**: Strict mode enabled, no `any` types
- **ESLint**: Follow configured linting rules
- **Prettier**: Use for consistent formatting
- **Testing**: Maintain >80% test coverage
- **Security**: Follow OWASP security practices

### Pull Request Process
1. Create feature branch from `master`
2. Implement following spec-kit methodology
3. Ensure tests pass and coverage maintained
4. Update documentation as needed
5. Submit PR with comprehensive description
6. Address review feedback

### Spec-Kit File Structure
```
.specify/
├── constitution.md              # Project principles
├── specs/
│   ├── 001-authentication/      # ✅ Complete
│   ├── 002-logout-enhancement/  # ✅ Complete
│   ├── 003-notes-crud/         # ✅ Complete
│   ├── 004-note-sharing/       # ✅ Complete
│   └── 005-user-management/    # 🚧 In Progress
└── templates/
    └── spec-template.md         # Specification template
```

## 📄 Documentation

- **[Technical Specification](./TECH-SPEC.md)** - Detailed architecture documentation
- **[API Documentation](./docs/api.md)** - Complete API reference
- **[Security Audit](./AUDIT.md)** - Security review and compliance
- **[Deployment Guide](./docs/deployment.md)** - Production deployment instructions
- **[Development Guide](./CLAUDE.md)** - Claude Code instructions and patterns

---

**Built with ❤️ using Claude Code and the Spec-Kit methodology**

For questions or support, please refer to the [issues page](../../issues) or [spec documentation](./.specify/).
