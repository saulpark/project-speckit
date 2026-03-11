import { Note, INote } from '../models/Note';
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
}
