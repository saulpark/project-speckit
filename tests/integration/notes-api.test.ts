import request from 'supertest';
import express from 'express';
import mongoose, { Types } from 'mongoose';
import bcrypt from 'bcrypt';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../../src/models/User';
import { Note } from '../../src/models/Note';
import noteRoutes from '../../src/routes/noteRoutes';
import cors from 'cors';
import helmet from 'helmet';

describe('Notes API Integration', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let authToken: string;
  let otherAuthToken: string;
  let testUserId: string;
  let otherUserId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    process.env.NODE_ENV = 'test';

    app = express();
    app.use(helmet({ frameguard: { action: 'sameorigin' } }));
    app.use(cors({ origin: true, credentials: true }));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    app.use('/notes', noteRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Note.deleteMany({});

    // Create test users
    const passwordHash = await bcrypt.hash('SecureP@ss1', 12);

    const user1 = new User({ email: 'user1@example.com', passwordHash });
    await user1.save();
    testUserId = (user1._id as Types.ObjectId).toString();

    const user2 = new User({ email: 'user2@example.com', passwordHash });
    await user2.save();
    otherUserId = (user2._id as Types.ObjectId).toString();

    // Generate JWT tokens for both users
    const { JWTUtils } = await import('../../src/utils/jwt');
    const token1 = JWTUtils.generateToken(testUserId, 'user1@example.com');
    authToken = token1.token;

    const token2 = JWTUtils.generateToken(otherUserId, 'user2@example.com');
    otherAuthToken = token2.token;
  });

  describe('POST /notes - Create note (authenticated)', () => {
    it('should create a note with valid delta content', async () => {
      const noteData = {
        title: 'Test Note',
        content: {
          type: 'delta',
          data: { ops: [{ insert: 'Hello World\n' }] }
        }
      };

      const response = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(noteData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.note.title).toBe('Test Note');
      expect(response.body.data.note._id).toBeDefined();
    });

    it('should create a note with plain text content', async () => {
      const noteData = {
        title: 'Plain Note',
        content: {
          type: 'plain',
          data: 'Simple text content'
        }
      };

      const response = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(noteData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.note.content.type).toBe('delta');
    });

    it('should create a note without a title (defaults to Untitled)', async () => {
      const noteData = {
        content: {
          type: 'delta',
          data: { ops: [{ insert: 'No title\n' }] }
        }
      };

      const response = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(noteData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /notes - Create note (unauthenticated)', () => {
    it('should return 401 when no auth token is provided', async () => {
      const noteData = {
        title: 'Test',
        content: { type: 'delta', data: { ops: [{ insert: 'hello\n' }] } }
      };

      await request(app)
        .post('/notes')
        .send(noteData)
        .expect(401);
    });
  });

  describe('GET /notes - List notes', () => {
    it('should return only notes belonging to the authenticated user', async () => {
      // Create notes for user1
      const { NoteService } = await import('../../src/services/noteService');
      await NoteService.createNote(testUserId, {
        title: 'User1 Note 1',
        content: { type: 'plain', data: 'content' }
      });
      await NoteService.createNote(testUserId, {
        title: 'User1 Note 2',
        content: { type: 'plain', data: 'content' }
      });
      // Create note for user2
      await NoteService.createNote(otherUserId, {
        title: 'User2 Note',
        content: { type: 'plain', data: 'content' }
      });

      const response = await request(app)
        .get('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notes).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should return 401 for unauthenticated requests', async () => {
      await request(app).get('/notes').expect(401);
    });
  });

  describe('GET /notes/:id - Get note (own)', () => {
    it('should return a note that belongs to the user', async () => {
      const { NoteService } = await import('../../src/services/noteService');
      const note = await NoteService.createNote(testUserId, {
        title: 'My Note',
        content: { type: 'plain', data: 'content' }
      });
      const noteId = (note._id as Types.ObjectId).toString();

      const response = await request(app)
        .get(`/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.note.title).toBe('My Note');
    });
  });

  describe('GET /notes/:id - Get note (cross-user)', () => {
    it('should return 404 when accessing another user\'s note', async () => {
      const { NoteService } = await import('../../src/services/noteService');
      const note = await NoteService.createNote(otherUserId, {
        title: 'Other User Note',
        content: { type: 'plain', data: 'secret content' }
      });
      const noteId = (note._id as Types.ObjectId).toString();

      await request(app)
        .get(`/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PUT /notes/:id - Update note (own)', () => {
    it('should update a note that belongs to the user', async () => {
      const { NoteService } = await import('../../src/services/noteService');
      const note = await NoteService.createNote(testUserId, {
        title: 'Original',
        content: { type: 'plain', data: 'original content' }
      });
      const noteId = (note._id as Types.ObjectId).toString();

      const response = await request(app)
        .put(`/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated Title' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.note.title).toBe('Updated Title');
    });
  });

  describe('PUT /notes/:id - Update note (cross-user)', () => {
    it('should return 404 when updating another user\'s note', async () => {
      const { NoteService } = await import('../../src/services/noteService');
      const note = await NoteService.createNote(otherUserId, {
        title: 'Other User Note',
        content: { type: 'plain', data: 'content' }
      });
      const noteId = (note._id as Types.ObjectId).toString();

      await request(app)
        .put(`/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Hacked' })
        .expect(404);
    });
  });

  describe('DELETE /notes/:id - Delete note (own)', () => {
    it('should delete a note that belongs to the user', async () => {
      const { NoteService } = await import('../../src/services/noteService');
      const note = await NoteService.createNote(testUserId, {
        title: 'To Delete',
        content: { type: 'plain', data: 'content' }
      });
      const noteId = (note._id as Types.ObjectId).toString();

      const response = await request(app)
        .delete(`/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Confirm deletion
      const found = await Note.findById(noteId);
      expect(found).toBeNull();
    });
  });

  describe('DELETE /notes/:id - Delete note (cross-user)', () => {
    it('should return 404 when deleting another user\'s note', async () => {
      const { NoteService } = await import('../../src/services/noteService');
      const note = await NoteService.createNote(otherUserId, {
        title: 'Other User Note',
        content: { type: 'plain', data: 'content' }
      });
      const noteId = (note._id as Types.ObjectId).toString();

      await request(app)
        .delete(`/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // Confirm note still exists
      const found = await Note.findById(noteId);
      expect(found).not.toBeNull();
    });
  });

  describe('POST /notes - Invalid content format', () => {
    it('should return 400 for invalid delta format', async () => {
      const invalidData = {
        title: 'Bad Note',
        content: {
          type: 'delta',
          data: 'this is not valid delta'
        }
      };

      const response = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 for title exceeding 200 characters', async () => {
      const longTitleData = {
        title: 'a'.repeat(201),
        content: {
          type: 'delta',
          data: { ops: [{ insert: 'hello\n' }] }
        }
      };

      const response = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(longTitleData)
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });
});
