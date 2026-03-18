import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Note } from '../../../src/models/Note';
import { User } from '../../../src/models/User';
import { NoteService } from '../../../src/services/noteService';
import bcrypt from 'bcrypt';

describe('NoteService', () => {
  let mongoServer: MongoMemoryServer;
  let userId: string;
  let otherUserId: string;
  // Real User documents required for sharing tests (UserService looks them up by email)
  let userEmail: string;
  let otherUserEmail: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Note.deleteMany({});
    await User.deleteMany({});

    // Create real User documents so sharing tests can resolve emails
    const passwordHash = await bcrypt.hash('TestPass1!', 12);
    userEmail = `user-${Date.now()}@example.com`;
    otherUserEmail = `other-${Date.now()}@example.com`;

    const user1 = new User({ email: userEmail, passwordHash });
    await user1.save();
    userId = (user1._id as Types.ObjectId).toString();

    const user2 = new User({ email: otherUserEmail, passwordHash });
    await user2.save();
    otherUserId = (user2._id as Types.ObjectId).toString();
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

  // ---------------------------------------------------------------------------
  // shareNotePublic
  // ---------------------------------------------------------------------------
  describe('shareNotePublic', () => {
    let noteId: string;

    beforeEach(async () => {
      const note = await NoteService.createNote(userId, {
        title: 'Toggleable Note',
        content: { type: 'plain' as const, data: 'some content' },
      });
      noteId = (note._id as Types.ObjectId).toString();
    });

    it('should make a private note public and return isPublic:true', async () => {
      const result = await NoteService.shareNotePublic(noteId, userId);
      expect(result.success).toBe(true);
      expect(result.isPublic).toBe(true);
      expect(result.publicUrl).toBeDefined();
      expect(result.publicUrl).toContain(noteId);
    });

    it('should toggle a public note back to private', async () => {
      // Make it public first
      await NoteService.shareNotePublic(noteId, userId);
      // Toggle back
      const result = await NoteService.shareNotePublic(noteId, userId);
      expect(result.isPublic).toBe(false);
      expect(result.publicUrl).toBeUndefined();
    });

    it('should persist the isPublic flag in the database', async () => {
      await NoteService.shareNotePublic(noteId, userId);
      const dbNote = await Note.findById(noteId);
      expect(dbNote!.isPublic).toBe(true);
    });

    it('should throw when a non-owner tries to toggle public sharing', async () => {
      await expect(NoteService.shareNotePublic(noteId, otherUserId))
        .rejects.toThrow('Note not found');
    });
  });

  // ---------------------------------------------------------------------------
  // shareNoteWithUser / unshareNoteWithUser
  // ---------------------------------------------------------------------------
  describe('shareNoteWithUser', () => {
    let noteId: string;

    beforeEach(async () => {
      const note = await NoteService.createNote(userId, {
        title: 'Shared Note',
        content: { type: 'plain' as const, data: 'content' },
      });
      noteId = (note._id as Types.ObjectId).toString();
    });

    it('should share the note with a registered user by email', async () => {
      const result = await NoteService.shareNoteWithUser(noteId, userId, otherUserEmail);
      expect(result.success).toBe(true);
      expect(Array.isArray(result.sharedWith)).toBe(true);
      expect(result.sharedWith).toHaveLength(1);
      expect(result.sharedWith[0].email).toBe(otherUserEmail);
    });

    it('should persist the recipient in the sharedWith array', async () => {
      await NoteService.shareNoteWithUser(noteId, userId, otherUserEmail);
      const dbNote = await Note.findById(noteId);
      expect(dbNote!.sharedWith).toHaveLength(1);
      expect(dbNote!.sharedWith[0].userId.toString()).toBe(otherUserId);
    });

    it('should throw when sharing with an email that does not exist', async () => {
      await expect(
        NoteService.shareNoteWithUser(noteId, userId, 'nobody@nowhere.com')
      ).rejects.toThrow('No active user found with this email address');
    });

    it('should throw ALREADY_SHARED when sharing with the same user twice', async () => {
      await NoteService.shareNoteWithUser(noteId, userId, otherUserEmail);
      await expect(
        NoteService.shareNoteWithUser(noteId, userId, otherUserEmail)
      ).rejects.toThrow('Note is already shared with this user');
    });

    it('should throw when owner tries to share with themselves', async () => {
      await expect(
        NoteService.shareNoteWithUser(noteId, userId, userEmail)
      ).rejects.toThrow('Cannot share note with yourself');
    });

    it('should throw when non-owner tries to share the note', async () => {
      await expect(
        NoteService.shareNoteWithUser(noteId, otherUserId, userEmail)
      ).rejects.toThrow('Note not found');
    });
  });

  describe('unshareNoteWithUser', () => {
    let noteId: string;

    beforeEach(async () => {
      const note = await NoteService.createNote(userId, {
        title: 'Revokable Note',
        content: { type: 'plain' as const, data: 'content' },
      });
      noteId = (note._id as Types.ObjectId).toString();
      // Pre-share with the other user
      await NoteService.shareNoteWithUser(noteId, userId, otherUserEmail);
    });

    it('should revoke access and return success', async () => {
      const result = await NoteService.unshareNoteWithUser(noteId, userId, otherUserId);
      expect(result.success).toBe(true);
    });

    it('should remove the user from sharedWith in the database', async () => {
      await NoteService.unshareNoteWithUser(noteId, userId, otherUserId);
      const dbNote = await Note.findById(noteId);
      expect(dbNote!.sharedWith).toHaveLength(0);
    });

    it('should return success:false when the user was not in the sharing list', async () => {
      // First revoke
      await NoteService.unshareNoteWithUser(noteId, userId, otherUserId);
      // Attempt to revoke again
      const result = await NoteService.unshareNoteWithUser(noteId, userId, otherUserId);
      expect(result.success).toBe(false);
    });

    it('should throw when a non-owner tries to revoke access', async () => {
      await expect(
        NoteService.unshareNoteWithUser(noteId, otherUserId, otherUserId)
      ).rejects.toThrow('Note not found');
    });
  });

  // ---------------------------------------------------------------------------
  // getSharedNotes
  // ---------------------------------------------------------------------------
  describe('getSharedNotes', () => {
    it('should return notes that have been shared with the user', async () => {
      const note = await NoteService.createNote(userId, {
        title: 'Shared With Me Note',
        content: { type: 'plain' as const, data: 'content' },
      });
      const noteId = (note._id as Types.ObjectId).toString();

      await NoteService.shareNoteWithUser(noteId, userId, otherUserEmail);

      const result = await NoteService.getSharedNotes(otherUserId);
      expect(result.notes).toHaveLength(1);
      expect(result.notes[0].title).toBe('Shared With Me Note');
    });

    it('should return an empty list when no notes are shared with the user', async () => {
      const result = await NoteService.getSharedNotes(otherUserId);
      expect(result.notes).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should not return notes the user owns — only those shared with them', async () => {
      // userId owns a note; nothing is shared with otherUserId
      await NoteService.createNote(userId, {
        title: 'My Own Note',
        content: { type: 'plain' as const, data: 'content' },
      });

      const result = await NoteService.getSharedNotes(otherUserId);
      expect(result.notes).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // getPublicNote
  // ---------------------------------------------------------------------------
  describe('getPublicNote', () => {
    it('should return a public note with owner email', async () => {
      const note = await NoteService.createNote(userId, {
        title: 'Public Note',
        content: { type: 'plain' as const, data: 'public content' },
      });
      note.isPublic = true;
      await note.save();
      const noteId = (note._id as Types.ObjectId).toString();

      const result = await NoteService.getPublicNote(noteId);
      expect(result.note.title).toBe('Public Note');
      expect(result.owner.email).toBe(userEmail);
    });

    it('should throw when the note is private', async () => {
      const note = await NoteService.createNote(userId, {
        title: 'Private Note',
        content: { type: 'plain' as const, data: 'private' },
      });
      const noteId = (note._id as Types.ObjectId).toString();

      await expect(NoteService.getPublicNote(noteId))
        .rejects.toThrow('Public note not found');
    });

    it('should throw for a non-existent note ID', async () => {
      const fakeId = new Types.ObjectId().toString();
      await expect(NoteService.getPublicNote(fakeId))
        .rejects.toThrow('Public note not found');
    });
  });

  // ---------------------------------------------------------------------------
  // getNoteWithSharingAccess
  // ---------------------------------------------------------------------------
  describe('getNoteWithSharingAccess', () => {
    it('should allow the owner to access their own note', async () => {
      const note = await NoteService.createNote(userId, {
        title: 'Owner Access',
        content: { type: 'plain' as const, data: 'content' },
      });
      const noteId = (note._id as Types.ObjectId).toString();

      const found = await NoteService.getNoteWithSharingAccess(noteId, userId);
      expect(found).not.toBeNull();
      expect((found._id as Types.ObjectId).toString()).toBe(noteId);
    });

    it('should allow a shared user to access the note', async () => {
      const note = await NoteService.createNote(userId, {
        title: 'Shared Access',
        content: { type: 'plain' as const, data: 'content' },
      });
      const noteId = (note._id as Types.ObjectId).toString();
      await NoteService.shareNoteWithUser(noteId, userId, otherUserEmail);

      const found = await NoteService.getNoteWithSharingAccess(noteId, otherUserId);
      expect((found._id as Types.ObjectId).toString()).toBe(noteId);
    });

    it('should throw when an unrelated user tries to access the note', async () => {
      const note = await NoteService.createNote(userId, {
        title: 'No Access',
        content: { type: 'plain' as const, data: 'content' },
      });
      const noteId = (note._id as Types.ObjectId).toString();
      const thirdUserId = new Types.ObjectId().toString();

      await expect(
        NoteService.getNoteWithSharingAccess(noteId, thirdUserId)
      ).rejects.toThrow('Note not found or access denied');
    });
  });
});
