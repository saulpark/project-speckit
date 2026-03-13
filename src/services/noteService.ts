import { Note, INote } from '../models/Note';
import { User, IUser } from '../models/User';
import { UserService } from './userService';
import { ContentProcessor } from '../utils/contentProcessor';
import { Types } from 'mongoose';

export interface CreateNoteData {
  title?: string;
  content: {
    type: 'delta' | 'plain';
    data: any;
  };
  tags?: string[];
}

export interface UpdateNoteData {
  title?: string;
  content?: {
    type?: 'delta' | 'plain';
    data?: any;
  };
  tags?: string[];
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  search?: string;
}

export interface PaginatedNotes {
  notes: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Service layer for note CRUD operations with ownership enforcement
 */
export class NoteService {

  /**
   * Create a new note for a user
   */
  static async createNote(userId: string, noteData: CreateNoteData): Promise<INote> {
    const { title, content, tags } = noteData;

    // Process content based on type
    let processedContent: { type: string; data: any; preview: string };

    if (content.type === 'plain') {
      const delta = ContentProcessor.textToDelta(content.data);
      processedContent = {
        type: 'delta',
        data: delta,
        preview: ContentProcessor.deltaToPreview(delta),
      };
    } else {
      const sanitizedData = ContentProcessor.sanitizeContent(content.data);
      processedContent = {
        type: 'delta',
        data: sanitizedData,
        preview: ContentProcessor.deltaToPreview(sanitizedData),
      };
    }

    const note = new Note({
      userId: new Types.ObjectId(userId),
      title: title || 'Untitled',
      content: processedContent,
      tags: tags || [],
    });

    return await note.save();
  }

  /**
   * Get paginated notes for a user
   */
  static async getUserNotes(userId: string, options: PaginationOptions = {}): Promise<PaginatedNotes> {
    const {
      page = 1,
      limit = 20,
      sortBy = '-updatedAt',
      search,
    } = options;

    const query: any = { userId: new Types.ObjectId(userId) };

    if (search) {
      query.$text = { $search: search };
    }

    const notes = await Note
      .find(query)
      .sort(sortBy)
      .skip((page - 1) * limit)
      .limit(limit)
      .select('title content.preview createdAt updatedAt')
      .lean();

    const total = await Note.countDocuments(query);

    return {
      notes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a note by ID with ownership enforcement
   */
  static async getNoteById(noteId: string, userId: string): Promise<INote> {
    const note = await Note.findOne({
      _id: new Types.ObjectId(noteId),
      userId: new Types.ObjectId(userId),
    });

    if (!note) {
      throw new Error('Note not found');
    }

    return note;
  }

  /**
   * Update a note with ownership enforcement
   */
  static async updateNote(noteId: string, userId: string, updateData: UpdateNoteData): Promise<INote> {
    const note = await NoteService.getNoteById(noteId, userId);

    if (updateData.title !== undefined) {
      note.title = updateData.title || 'Untitled';
    }

    if (updateData.content) {
      let processedData: any;
      let processedType: string = 'delta';

      if (updateData.content.type === 'plain' && updateData.content.data) {
        processedData = ContentProcessor.textToDelta(updateData.content.data);
      } else if (updateData.content.data) {
        processedData = ContentProcessor.sanitizeContent(updateData.content.data);
        processedType = updateData.content.type || 'delta';
      }

      if (processedData !== undefined) {
        note.content = {
          type: processedType as 'delta' | 'plain',
          data: processedData,
          preview: ContentProcessor.deltaToPreview(processedData),
        };
      }
    }

    if (updateData.tags !== undefined) {
      note.tags = updateData.tags;
    }

    return await note.save();
  }

  /**
   * Delete a note with ownership enforcement
   */
  static async deleteNote(noteId: string, userId: string): Promise<{ deleted: boolean }> {
    const result = await Note.deleteOne({
      _id: new Types.ObjectId(noteId),
      userId: new Types.ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      throw new Error('Note not found');
    }

    return { deleted: true };
  }

  /**
   * Toggle public sharing for a note
   */
  static async shareNotePublic(noteId: string, userId: string): Promise<{ success: boolean; isPublic: boolean; publicUrl?: string }> {
    const note = await NoteService.getNoteById(noteId, userId);

    // Toggle the public status
    note.isPublic = !note.isPublic;
    await note.save();

    const result: { success: boolean; isPublic: boolean; publicUrl?: string } = {
      success: true,
      isPublic: note.isPublic,
    };

    if (note.isPublic) {
      // Generate public URL (this could be configured via environment variable)
      const baseUrl = process.env.PUBLIC_NOTE_BASE_URL || 'http://localhost:3000';
      result.publicUrl = `${baseUrl}/public/notes/${noteId}`;
    }

    return result;
  }

  /**
   * Remove public sharing from a note
   */
  static async unshareNotePublic(noteId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const note = await NoteService.getNoteById(noteId, userId);

    if (!note.isPublic) {
      return { success: true, message: 'Note is already private' };
    }

    note.isPublic = false;
    await note.save();

    return { success: true, message: 'Note is no longer public' };
  }

  /**
   * Share a note with a specific user by email
   */
  static async shareNoteWithUser(noteId: string, ownerId: string, recipientEmail: string): Promise<{ success: boolean; sharedWith: any[] }> {
    // Verify note ownership
    const note = await NoteService.getNoteById(noteId, ownerId);

    // Find and validate the recipient user
    const recipientUser = await UserService.validateUserForSharing(recipientEmail);

    // Check if note is already shared with this user
    const alreadyShared = note.sharedWith.some(
      (share) => share.userId.toString() === recipientUser.id
    );

    if (alreadyShared) {
      throw new Error('Note is already shared with this user');
    }

    // Prevent sharing with self
    if (recipientUser.id === ownerId) {
      throw new Error('Cannot share note with yourself');
    }

    // Add user to sharedWith array
    note.sharedWith.push({
      userId: new Types.ObjectId(recipientUser.id),
      grantedAt: new Date(),
      grantedBy: new Types.ObjectId(ownerId),
    });

    await note.save();

    // Get user information for all shared users
    const sharedUserIds = note.sharedWith.map(share => share.userId.toString());
    const sharedUsers = await UserService.getUserSharingDisplayInfo(sharedUserIds);

    return {
      success: true,
      sharedWith: note.sharedWith.map(share => {
        const userInfo = sharedUsers.find(user => user.id === share.userId.toString());
        return {
          email: userInfo?.email || 'Unknown User',
          grantedAt: share.grantedAt,
        };
      }),
    };
  }

  /**
   * Remove user access from a shared note
   */
  static async unshareNoteWithUser(noteId: string, ownerId: string, recipientUserId: string): Promise<{ success: boolean; message: string }> {
    // Verify note ownership
    const note = await NoteService.getNoteById(noteId, ownerId);

    // Find and remove the user from sharedWith array
    const initialLength = note.sharedWith.length;
    note.sharedWith = note.sharedWith.filter(
      (share) => share.userId.toString() !== recipientUserId
    );

    if (note.sharedWith.length === initialLength) {
      return { success: false, message: 'User was not found in sharing list' };
    }

    await note.save();

    return { success: true, message: 'User access revoked successfully' };
  }

  /**
   * Get notes shared with a specific user
   */
  static async getSharedNotes(userId: string, options: PaginationOptions = {}): Promise<PaginatedNotes> {
    const {
      page = 1,
      limit = 20,
      sortBy = '-updatedAt',
    } = options;

    const query = {
      'sharedWith.userId': new Types.ObjectId(userId),
    };

    const notes = await Note
      .find(query)
      .sort(sortBy)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'email')
      .select('title content.preview createdAt updatedAt userId')
      .lean();

    const total = await Note.countDocuments(query);

    // Format notes to include owner information
    const formattedNotes = notes.map(note => ({
      ...note,
      owner: note.userId,
      userId: undefined, // Remove the raw userId field
    }));

    return {
      notes: formattedNotes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a note with sharing access (for shared users)
   * This allows read access for users who have the note shared with them
   */
  static async getNoteWithSharingAccess(noteId: string, userId: string): Promise<INote> {
    const query = {
      _id: new Types.ObjectId(noteId),
      $or: [
        { userId: new Types.ObjectId(userId) }, // Owner access
        { 'sharedWith.userId': new Types.ObjectId(userId) }, // Shared access
      ],
    };

    const note = await Note.findOne(query).populate('userId', 'email');

    if (!note) {
      throw new Error('Note not found or access denied');
    }

    return note;
  }

  /**
   * Get public note (no authentication required)
   */
  static async getPublicNote(noteId: string): Promise<{ note: any; owner: any }> {
    const note = await Note.findOne({
      _id: new Types.ObjectId(noteId),
      isPublic: true,
    })
    .populate('userId', 'email')
    .select('title content createdAt updatedAt');

    if (!note) {
      throw new Error('Public note not found');
    }

    return {
      note: {
        id: note._id,
        title: note.title,
        content: note.content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      },
      owner: {
        email: (note.userId as any).email,
      },
    };
  }
}
