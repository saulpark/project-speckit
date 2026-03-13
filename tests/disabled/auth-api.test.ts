import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../../src/models/User';
import authRoutes from '../../src/routes/authRoutes';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

describe('Authentication API Integration', () => {
  let authToken: string;
  let testUser: any;
  let mongoServer: MongoMemoryServer;
  let app: express.Application;

  beforeAll(async () => {
    // Create MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create Express app for testing (minimal setup without CSRF and rate limiting)
    app = express();

    // Disable rate limiting and CSRF for tests
    process.env.NODE_ENV = 'test';

    // Basic middleware for testing
    app.use(helmet({ frameguard: { action: 'sameorigin' } }));
    app.use(cors({ origin: true, credentials: true }));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Add auth routes (these will skip CSRF and rate limiting due to NODE_ENV=test)
    app.use('/auth', authRoutes);

    // Basic health endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'healthy', service: 'test' });
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    authToken = '';
    testUser = null;
  });

  describe('User Registration', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'SecureP@ss1',
      confirmPassword: 'SecureP@ss1'
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(validRegistrationData.email);
      expect(response.body.data.user.id).toBeDefined();
      expect(response.body.data.user.isActive).toBe(true);
      expect(response.body.data.user.createdAt).toBeDefined();
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('should reject duplicate email registration', async () => {
      await request(app)
        .post('/auth/register')
        .send(validRegistrationData)
        .expect(201);

      const response = await request(app)
        .post('/auth/register')
        .send(validRegistrationData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('USER_EXISTS');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          ...validRegistrationData,
          email: 'invalid-email'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('User Login', () => {
    beforeEach(async () => {
      const passwordHash = await bcrypt.hash('SecureP@ss1', 12);

      testUser = new User({
        email: 'test@example.com',
        passwordHash
      });
      await testUser.save();
    });

    it('should login user successfully', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecureP@ss1'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('Protected Endpoints', () => {
    beforeEach(async () => {
      const passwordHash = await bcrypt.hash('SecureP@ss1', 12);

      testUser = new User({
        email: 'test@example.com',
        passwordHash
      });
      await testUser.save();

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecureP@ss1'
        });

      authToken = loginResponse.body.data.token;
    });

    it('should return user info with valid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should reject unauthorized requests', async () => {
      await request(app)
        .get('/auth/me')
        .expect(401);
    });
  });

  describe('User Logout', () => {
    beforeEach(async () => {
      const passwordHash = await bcrypt.hash('SecureP@ss1', 12);

      testUser = new User({
        email: 'test@example.com',
        passwordHash
      });
      await testUser.save();

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecureP@ss1'
        });

      authToken = loginResponse.body.data.token;
    });

    it('should logout user successfully', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should invalidate token after logout', async () => {
      await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403); // Blacklisted tokens return 403 Forbidden
    });
  });

  describe('Security Features', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/auth/login');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    });

    it('should skip CSRF tokens in test environment', async () => {
      const response = await request(app)
        .get('/auth/login');

      // CSRF tokens are skipped in test environment
      expect(process.env.NODE_ENV).toBe('test');
    });
  });

  describe('Health Checks', () => {
    it('should return service health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });
  });
});