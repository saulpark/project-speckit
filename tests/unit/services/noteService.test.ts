import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Note } from '../../../src/models/Note';
import { NoteService } from '../../../src/services/noteService';

describe('NoteService', () => {
  let mongoServer: MongoMemoryServer;
  let userId: string;
  let otherUserId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    userId = new Types.ObjectId().toString();
    otherUserId = new Types.ObjectId().toString();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Note.deleteMany({});
  });

  describe('createNote', () => {
    it('should create a note with delta content', async () => {
      const noteData = {
        title: 'Test Note',
        content: {
          type: 'delta' as const,
          data: { ops: [{ insert: 'Hello World\n' }] }
        }
      };

      const note = await NoteService.createNote(userId, noteData);

      expect(note.title).toBe('Test Note');
      expect(note.userId.toString()).toBe(userId);
      expect(note.content.type).toBe('delta');
      expect(note.content.preview).toContain('Hello World');
    });

    it('should convert plain text to delta format', async () => {
      const noteData = {
        title: 'Plain Text Note',
        content: {
          type: 'plain' as const,
          data: 'This is plain text'
        }
      };

      const note = await NoteService.createNote(userId, noteData);

      expect(note.content.type).toBe('delta');
      expect((note.content.data as any).ops).toBeDefined();
      expect(Array.isArray((note.content.data as any).ops)).toBe(true);
      expect(note.content.preview).toContain('This is plain text');
    });

    it('should default title to Untitled when not provided', async () => {
      const noteData = {
        content: {
          type: 'plain' as const,
          data: 'Some content'
        }
      };

      const note = await NoteService.createNote(userId, noteData);
      expect(note.title).toBe('Untitled');
    });

    it('should auto-generate a preview', async () => {
      const noteData = {
        title: 'Preview Test',
        content: {
          type: 'delta' as const,
          data: { ops: [{ insert: 'Preview content here\n' }] }
        }
      };

      const note = await NoteService.createNote(userId, noteData);
      expect(note.content.preview).toBeDefined();
      expect(typeof note.content.preview).toBe('string');
      expect(note.content.preview!.length).toBeGreaterThan(0);
    });

    it('should save with correct userId reference', async () => {
      const noteData = {
        title: 'User Note',
        content: { type: 'plain' as const, data: 'content' }
      };

      const note = await NoteService.createNote(userId, noteData);
      const found = await Note.findById(note._id);

      expect(found).not.toBeNull();
      expect(found!.userId.toString()).toBe(userId);
    });

    it('should sanitize delta content attributes', async () => {
      const noteData = {
        content: {
          type: 'delta' as const,
          data: { ops: [{ insert: 'Hello', attributes: { bold: true, color: 'red' } }] }
        }
      };

      const note = await NoteService.createNote(userId, noteData);
      const ops = (note.content.data as any).ops;
      expect(ops[0].attributes.bold).toBe(true);
      expect(ops[0].attributes.color).toBeUndefined();
    });
  });

  describe('getUserNotes', () => {
    beforeEach(async () => {
      // Create notes for two different users
      for (let i = 0; i < 5; i++) {
        await NoteService.createNote(userId, {
          title: `Note ${i}`,
          content: { type: 'plain' as const, data: `Content ${i}` }
        });
      }
      // Other user's notes
      for (let i = 0; i < 3; i++) {
        await NoteService.createNote(otherUserId, {
          title: `Other Note ${i}`,
          content: { type: 'plain' as const, data: `Other Content ${i}` }
        });
      }
    });

    it('should return only notes belonging to the user', async () => {
      const result = await NoteService.getUserNotes(userId);
      expect(result.notes).toHaveLength(5);
      result.notes.forEach((note: any) => {
        expect(note.userId?.toString() || userId).toBe(userId);
      });
    });

    it('should return paginated results', async () => {
      const result = await NoteService.getUserNotes(userId, { page: 1, limit: 3 });
      expect(result.notes).toHaveLength(3);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.pages).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(3);
    });

    it('should return second page correctly', async () => {
      const result = await NoteService.getUserNotes(userId, { page: 2, limit: 3 });
      expect(result.notes).toHaveLength(2);
      expect(result.pagination.page).toBe(2);
    });

    it('should include pagination metadata', async () => {
      const result = await NoteService.getUserNotes(userId);
      expect(result.pagination).toHaveProperty('page');
      expect(result.pagination).toHaveProperty('limit');
      expect(result.pagination).toHaveProperty('total');
      expect(result.pagination).toHaveProperty('pages');
    });

    it('should return empty array for user with no notes', async () => {
      const newUserId = new Types.ObjectId().toString();
      const result = await NoteService.getUserNotes(newUserId);
      expect(result.notes).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('getNoteById', () => {
    let noteId: string;

    beforeEach(async () => {
      const note = await NoteService.createNote(userId, {
        title: 'My Note',
        content: { type: 'plain' as const, data: 'Test content' }
      });
      noteId = (note._id as Types.ObjectId).toString();
    });

    it('should return note for the correct owner', async () => {
      const note = await NoteService.getNoteById(noteId, userId);
      expect(note).not.toBeNull();
      expect((note._id as Types.ObjectId).toString()).toBe(noteId);
    });

    it('should throw error for wrong owner', async () => {
      await expect(NoteService.getNoteById(noteId, otherUserId))
        .rejects.toThrow('Note not found');
    });

    it('should throw error for non-existent note', async () => {
      const fakeId = new Types.ObjectId().toString();
      await expect(NoteService.getNoteById(fakeId, userId))
        .rejects.toThrow('Note not found');
    });
  });

  describe('updateNote', () => {
    let noteId: string;

    beforeEach(async () => {
      const note = await NoteService.createNote(userId, {
        title: 'Original Title',
        content: { type: 'plain' as const, data: 'Original content' }
      });
      noteId = (note._id as Types.ObjectId).toString();
    });

    it('should update only provided fields', async () => {
      const updated = await NoteService.updateNote(noteId, userId, { title: 'New Title' });
      expect(updated.title).toBe('New Title');
      // Content should remain
      expect(updated.content).toBeDefined();
    });

    it('should update content and regenerate preview', async () => {
      const updated = await NoteService.updateNote(noteId, userId, {
        content: {
          type: 'delta',
          data: { ops: [{ insert: 'Updated content\n' }] }
        }
      });
      expect(updated.content.preview).toContain('Updated content');
    });

    it('should enforce ownership on update', async () => {
      await expect(NoteService.updateNote(noteId, otherUserId, { title: 'Hacked' }))
        .rejects.toThrow('Note not found');
    });

    it('should convert plain text content to delta on update', async () => {
      const updated = await NoteService.updateNote(noteId, userId, {
        content: { type: 'plain', data: 'Plain text update' }
      });
      expect(updated.content.type).toBe('delta');
      expect((updated.content.data as any).ops).toBeDefined();
    });
  });

  describe('deleteNote', () => {
    let noteId: string;

    beforeEach(async () => {
      const note = await NoteService.createNote(userId, {
        title: 'To Delete',
        content: { type: 'plain' as const, data: 'Delete me' }
      });
      noteId = (note._id as Types.ObjectId).toString();
    });

    it('should delete the note for the correct owner', async () => {
      const result = await NoteService.deleteNote(noteId, userId);
      expect(result.deleted).toBe(true);

      const found = await Note.findById(noteId);
      expect(found).toBeNull();
    });

    it('should throw error when deleting with wrong owner', async () => {
      await expect(NoteService.deleteNote(noteId, otherUserId))
        .rejects.toThrow('Note not found');
    });

    it('should throw error when deleting non-existent note', async () => {
      const fakeId = new Types.ObjectId().toString();
      await expect(NoteService.deleteNote(fakeId, userId))
        .rejects.toThrow('Note not found');
    });

    it('should not delete notes belonging to other users', async () => {
      // Verify note still exists after failed cross-user delete attempt
      try {
        await NoteService.deleteNote(noteId, otherUserId);
      } catch {
        // Expected to throw
      }
      const found = await Note.findById(noteId);
      expect(found).not.toBeNull();
    });
  });
});
