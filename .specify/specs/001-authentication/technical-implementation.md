# Authentication System - Technical Implementation

## Technology Stack

### Core Libraries
- **Passport.js**: Authentication middleware with JWT strategy
- **jsonwebtoken**: JWT token generation and verification
- **bcrypt**: Password hashing with configurable salt rounds
- **express-validator**: Input validation and sanitization middleware
- **express-rate-limit**: Rate limiting for authentication endpoints

### Database Implementation (MongoDB)
- **ODM**: Mongoose for MongoDB object modeling
- **User Schema**:
  ```javascript
  {
    _id: ObjectId,
    email: String (unique, indexed),
    passwordHash: String,
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }
  ```

### Docker Configuration

#### Development Environment
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/projectspeckit
    depends_on:
      - mongo
    volumes:
      - .:/app
      - /app/node_modules

  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
```

#### Application Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Security Implementation

### Password Security
- **Hashing Algorithm**: bcrypt with 12 salt rounds
- **Async Hashing**: Non-blocking password operations
- **Password Validation**: Minimum 8 characters, complexity rules
- **Verification**: Secure timing-safe comparison

```javascript
// Password hashing utility
import bcrypt from 'bcrypt';

export class PasswordUtils {
  private static readonly SALT_ROUNDS = 12;

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
```

### JWT Token Management
- **Algorithm**: RS256 for enhanced security
- **Token Structure**: { sub: userId, iat: issuedAt, exp: expiresAt }
- **Expiration**: 24 hours for access tokens
- **Secret Management**: Environment variables

```javascript
// JWT utilities
import jwt from 'jsonwebtoken';

export class JWTUtils {
  private static readonly SECRET = process.env.JWT_SECRET!;
  private static readonly EXPIRES_IN = '24h';

  static generateToken(userId: string): string {
    return jwt.sign(
      { sub: userId },
      this.SECRET,
      { expiresIn: this.EXPIRES_IN }
    );
  }

  static verifyToken(token: string): { sub: string } | null {
    try {
      return jwt.verify(token, this.SECRET) as { sub: string };
    } catch {
      return null;
    }
  }
}
```

### Rate Limiting & Security
```javascript
import rateLimit from 'express-rate-limit';

// Authentication rate limiting
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts',
  standardHeaders: true,
  legacyHeaders: false,
});
```

## Database Models

### User Model (Mongoose)
```javascript
import mongoose from 'mongoose';
import { PasswordUtils } from '../utils/crypto';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Instance methods
userSchema.methods.verifyPassword = async function(password: string): Promise<boolean> {
  return PasswordUtils.verifyPassword(password, this.passwordHash);
};

// Static methods
userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

export const User = mongoose.model('User', userSchema);
```

## Route Implementation

### Express Router Structure
```javascript
// routes/auth.ts
import express from 'express';
import { authController } from '../controllers/authController';
import { authLimiter } from '../middleware/rateLimiter';
import { validateRegistration, validateLogin } from '../middleware/validation';

const router = express.Router();

// Authentication routes
router.post('/register', authLimiter, validateRegistration, authController.register);
router.post('/login', authLimiter, validateLogin, authController.login);
router.post('/logout', authController.logout);

// Form routes
router.get('/register', authController.getRegisterForm);
router.get('/login', authController.getLoginForm);

export { router as authRouter };
```

### Authentication Middleware
```javascript
// middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { JWTUtils } from '../utils/jwt';
import { User } from '../models/User';

interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const payload = JWTUtils.verifyToken(token);
  if (!payload) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    return res.status(403).json({ error: 'User not found or inactive' });
  }

  req.user = user;
  next();
};
```

## Input Validation

### Validation Middleware
```javascript
// middleware/validation.ts
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  handleValidationErrors
];

export const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  handleValidationErrors
];

function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}
```

## Service Layer

### Authentication Service
```javascript
// services/authService.ts
import { User } from '../models/User';
import { PasswordUtils } from '../utils/crypto';
import { JWTUtils } from '../utils/jwt';

export class AuthService {
  static async registerUser(email: string, password: string) {
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password and create user
    const passwordHash = await PasswordUtils.hashPassword(password);
    const user = new User({ email, passwordHash });
    await user.save();

    return { id: user._id, email: user.email };
  }

  static async authenticateUser(email: string, password: string) {
    const user = await User.findByEmail(email);
    if (!user || !user.isActive) {
      throw new Error('Invalid credentials');
    }

    const isValid = await user.verifyPassword(password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const token = JWTUtils.generateToken(user._id.toString());
    return { token, user: { id: user._id, email: user.email } };
  }
}
```

## Template Integration (Handlebars)

### Layout Template
```handlebars
<!-- views/layouts/main.hbs -->
<!DOCTYPE html>
<html>
<head>
    <title>Project Spec-Kit</title>
    <link href="/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <nav class="navbar navbar-expand-lg">
        {{#if user}}
            <span>Welcome, {{user.email}}</span>
            <a href="/auth/logout" class="btn btn-outline-secondary">Logout</a>
        {{else}}
            <a href="/auth/login" class="btn btn-primary">Login</a>
            <a href="/auth/register" class="btn btn-outline-primary">Register</a>
        {{/if}}
    </nav>

    <div class="container">
        {{#if messages.error}}
            <div class="alert alert-danger">{{messages.error}}</div>
        {{/if}}
        {{#if messages.success}}
            <div class="alert alert-success">{{messages.success}}</div>
        {{/if}}

        {{{body}}}
    </div>
</body>
</html>
```

### Registration Form
```handlebars
<!-- views/auth/register.hbs -->
<div class="row justify-content-center">
    <div class="col-md-6">
        <h2>Register</h2>
        <form method="POST" action="/auth/register">
            <div class="mb-3">
                <label for="email" class="form-label">Email</label>
                <input type="email" class="form-control" id="email" name="email" required>
            </div>
            <div class="mb-3">
                <label for="password" class="form-label">Password</label>
                <input type="password" class="form-control" id="password" name="password" required>
            </div>
            <button type="submit" class="btn btn-primary">Register</button>
        </form>
    </div>
</div>
```

## Testing Configuration

### Jest Setup
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts'
  ]
};
```

### Test Database Setup
```javascript
// tests/setup.ts
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all collections before each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
```

### Integration Tests
```javascript
// tests/auth.test.ts
import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/models/User';

describe('Authentication', () => {
  describe('POST /auth/register', () => {
    it('should create a new user', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test123!'
        });

      expect(response.status).toBe(201);
      expect(response.body.user.email).toBe('test@example.com');

      const user = await User.findByEmail('test@example.com');
      expect(user).toBeTruthy();
    });
  });

  describe('POST /auth/login', () => {
    it('should authenticate valid user', async () => {
      // Create user first
      await User.create({
        email: 'test@example.com',
        passwordHash: await PasswordUtils.hashPassword('Test123!')
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeTruthy();
    });
  });
});
```

## Development Workflow

### Docker Commands
```bash
# Start development environment
docker-compose up -d

# View logs
docker-compose logs -f app

# Access MongoDB shell
docker-compose exec mongo mongosh

# Rebuild after changes
docker-compose up --build

# Stop environment
docker-compose down
```

### Environment Variables
```bash
# .env (development)
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://mongo:27017/projectspeckit
JWT_SECRET=your-super-secret-development-key
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12
```

## Security Considerations

### Production Deployment
- **HTTPS Only**: All authentication over secure connections
- **Secure Headers**: helmet.js for security headers
- **Rate Limiting**: Strict limits on authentication endpoints
- **Environment Secrets**: Never commit secrets to repository
- **Token Expiration**: Short-lived tokens with refresh mechanism

### Security Audit Checklist
- [ ] Passwords properly hashed with bcrypt
- [ ] JWT tokens signed and verified correctly
- [ ] Rate limiting implemented on auth endpoints
- [ ] Input validation on all authentication fields
- [ ] No password data in logs or error messages
- [ ] Secure session configuration
- [ ] Protection against timing attacks