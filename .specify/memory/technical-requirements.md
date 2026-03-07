# Technical Requirements

## Technology Stack

### Backend Framework
- **Runtime**: Node.js 18+ LTS with TypeScript
- **Web Framework**: Express.js with TypeScript support
- **Process Manager**: PM2 for production deployment

### Database
- **Database**: MongoDB 6.0+ for document storage and rich content
- **ODM**: Mongoose for MongoDB object modeling and validation
- **Connection**: MongoDB connection pooling and replica set support

### Authentication & Security
- **Authentication**: Passport.js with JWT strategy
- **Session Management**: JWT-based stateless authentication
- **Password Hashing**: bcrypt with configurable salt rounds
- **Input Validation**: express-validator middleware
- **Security Headers**: helmet.js for security headers
- **CORS**: cors middleware for cross-origin requests

### Frontend
- **Template Engine**: Handlebars (hbs) with Express integration
- **CSS Framework**: Bootstrap 5.x with custom styles
- **Icons**: Bootstrap Icons or Font Awesome
- **Rich Text Editor**: Quill.js for rich content editing
- **Client JavaScript**: Modern ES6+ with minimal dependencies

### Development & Build Tools
- **TypeScript**: Strict type checking and compilation
- **Build Tool**: tsc (TypeScript compiler) with watch mode
- **Code Quality**: ESLint + Prettier for code formatting
- **Hot Reload**: nodemon for development auto-restart
- **Package Manager**: npm or yarn for dependency management

### Testing Framework
- **Unit Testing**: Jest with TypeScript support
- **Integration Testing**: Supertest for API endpoint testing
- **Mocking**: Jest mocking capabilities
- **Test Database**: MongoDB Memory Server for isolated testing
- **Coverage**: Jest coverage reports

### Containerization & Deployment
- **Container Runtime**: Docker with multi-stage builds
- **Orchestration**: Docker Compose for development environment
- **Base Images**: Official Node.js Alpine images
- **Database Container**: Official MongoDB container
- **Volume Management**: Named volumes for data persistence

## Database Architecture

### Document Collections

#### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  passwordHash: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### Notes Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', indexed),
  title: String,
  content: {
    type: String, // 'delta' or 'plain'
    data: Mixed   // Quill Delta JSON or plain text
  },
  isPublic: Boolean,
  sharedWith: [ObjectId], // refs to User documents
  createdAt: Date,
  updatedAt: Date
}
```

#### Sessions Collection (if needed for blacklisting)
```javascript
{
  _id: ObjectId,
  jti: String (unique), // JWT ID for token blacklisting
  userId: ObjectId,
  expiresAt: Date
}
```

### Database Indexing
- **Users**: email (unique), createdAt
- **Notes**: userId, createdAt, updatedAt, isPublic
- **Performance**: Compound indexes for common query patterns

## Authentication Implementation

### JWT Token Management
- **Library**: jsonwebtoken with RS256 algorithm
- **Token Structure**: { sub: userId, iat: issuedAt, exp: expiresAt, jti: tokenId }
- **Refresh Strategy**: Short-lived access tokens with refresh token rotation
- **Secret Management**: Environment variables for JWT secrets

### Password Security
- **Hashing**: bcrypt with 12+ salt rounds
- **Validation**: Minimum 8 characters, complexity requirements
- **Storage**: Never store plain text passwords
- **Reset**: Secure password reset with time-limited tokens

### Session Security
- **Stateless**: JWT-based authentication (no server-side sessions)
- **Headers**: Authorization: Bearer <token>
- **CSRF Protection**: SameSite cookies and CSRF tokens for forms
- **Rate Limiting**: express-rate-limit for auth endpoints

## Application Structure

### Directory Layout
```
project-speckit/
├── docker-compose.yml          # Development environment
├── Dockerfile                  # Application container
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── jest.config.js             # Testing configuration
├── .env.example              # Environment template
├── src/                      # Application source
│   ├── app.ts                # Express app configuration
│   ├── server.ts             # Server entry point
│   ├── config/               # Configuration modules
│   │   ├── database.ts       # MongoDB connection
│   │   ├── auth.ts           # Authentication config
│   │   └── environment.ts    # Environment variables
│   ├── models/               # Mongoose models
│   │   ├── User.ts           # User document model
│   │   └── Note.ts           # Note document model
│   ├── routes/               # Express route handlers
│   │   ├── auth.ts           # Authentication routes
│   │   ├── notes.ts          # Notes CRUD routes
│   │   └── users.ts          # User management routes
│   ├── middleware/           # Custom middleware
│   │   ├── auth.ts           # JWT verification
│   │   ├── validation.ts     # Input validation
│   │   └── errorHandler.ts   # Error handling
│   ├── services/             # Business logic layer
│   │   ├── authService.ts    # Authentication logic
│   │   ├── noteService.ts    # Note operations
│   │   └── userService.ts    # User operations
│   ├── utils/                # Utility functions
│   │   ├── crypto.ts         # Password hashing
│   │   ├── jwt.ts            # JWT utilities
│   │   └── validation.ts     # Validation helpers
│   └── views/                # Handlebars templates
│       ├── layouts/          # Base layouts
│       ├── auth/             # Authentication views
│       └── notes/            # Note management views
├── public/                   # Static assets
│   ├── css/                 # Stylesheets
│   ├── js/                  # Client-side JavaScript
│   └── images/              # Images and icons
└── tests/                   # Test files
    ├── unit/                # Unit tests
    ├── integration/         # Integration tests
    └── fixtures/            # Test data
```

## Docker Configuration

### Development Environment (docker-compose.yml)
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongo:27017/projectspeckit
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - mongo
    command: npm run dev

  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=projectspeckit

volumes:
  mongo_data:
```

### Production Dockerfile
```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN npm run build
EXPOSE 3000
USER node
CMD ["npm", "start"]
```

## Environment Configuration

### Required Environment Variables
- **NODE_ENV**: development | production | test
- **PORT**: Application port (default: 3000)
- **MONGODB_URI**: MongoDB connection string
- **JWT_SECRET**: JWT signing secret
- **JWT_EXPIRES_IN**: Token expiration time
- **BCRYPT_ROUNDS**: Password hashing complexity

### Development Environment (.env)
```
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/projectspeckit_dev
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12
```

## Security Specifications

### Input Validation
- **Library**: express-validator for all user inputs
- **Sanitization**: Trim whitespace, escape HTML
- **Email Validation**: RFC 5322 compliant email validation
- **Content Validation**: Rich text content sanitization

### Rate Limiting
- **Authentication**: 5 attempts per 15 minutes per IP
- **API Endpoints**: 100 requests per 15 minutes per user
- **Global**: 1000 requests per 15 minutes per IP

### Security Headers
- **helmet.js**: Comprehensive security headers
- **Content Security Policy**: Restrict resource loading
- **HSTS**: HTTP Strict Transport Security
- **X-Frame-Options**: Prevent clickjacking

## Performance & Scalability

### Database Performance
- **Connection Pooling**: MongoDB connection pool (10-20 connections)
- **Indexes**: Optimized indexes for query patterns
- **Aggregation**: MongoDB aggregation pipeline for complex queries
- **Pagination**: Cursor-based pagination for large datasets

### Caching Strategy
- **Application**: In-memory caching for frequently accessed data
- **Database**: MongoDB query result caching
- **Static Assets**: CDN for static file delivery in production

### Monitoring & Logging
- **Application Logs**: Winston logging library
- **Error Tracking**: Structured error logging
- **Performance**: MongoDB slow query logging
- **Health Checks**: Application and database health endpoints

## Testing Strategy

### Test Database
- **Development**: MongoDB Memory Server for isolated tests
- **CI/CD**: Dockerized MongoDB for integration tests
- **Data**: Test fixtures for consistent test data

### Test Coverage
- **Unit Tests**: >90% coverage for services and utilities
- **Integration Tests**: All API endpoints and database operations
- **E2E Tests**: Complete user workflows and authentication flows

### Test Commands
```bash
npm run test              # Run all tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:coverage     # Coverage report
npm run test:watch        # Watch mode for development
```