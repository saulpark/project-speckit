import { Request, Response } from 'express';
import { NoteService } from '../services/noteService';

/**
 * Controller for note CRUD operations
 */
export class NoteController {

  /**
   * List notes for the authenticated user
   * GET /notes
   */
  static async listNotes(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { page, limit, sortBy, search } = req.query;

      const result = await NoteService.getUserNotes(user.id, {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        sortBy: sortBy as string | undefined,
        search: search as string | undefined,
      });

      // Return JSON response
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('List notes error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while retrieving notes',
        error: 'LIST_NOTES_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Create a new note
   * POST /notes
   */
  static async createNote(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { title, content, tags } = req.body;

      const note = await NoteService.createNote(user.id, {
        title,
        content,
        tags,
      });

      res.status(201).json({
        success: true,
        message: 'Note created successfully',
        data: { note },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Create note error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while creating the note',
        error: 'CREATE_NOTE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get a specific note (ownership verified by middleware)
   * GET /notes/:id
   */
  static async getNote(req: Request, res: Response): Promise<void> {
    try {
      const note = (req as any).note;
      const user = (req as any).user;

      // Return JSON response
      res.status(200).json({
        success: true,
        data: { note },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Get note error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while retrieving the note',
        error: 'GET_NOTE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Update a note (ownership verified by middleware)
   * PUT /notes/:id
   */
  static async updateNote(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const noteId = String(req.params.id);
      const { title, content, tags } = req.body;

      const note = await NoteService.updateNote(noteId, user.id, {
        title,
        content,
        tags,
      });

      res.status(200).json({
        success: true,
        message: 'Note updated successfully',
        data: { note },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Update note error:', error);

      if (error instanceof Error && error.message === 'Note not found') {
        res.status(404).json({
          success: false,
          message: 'Note not found',
          error: 'NOTE_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'An error occurred while updating the note',
        error: 'UPDATE_NOTE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Delete a note (ownership verified by middleware)
   * DELETE /notes/:id
   */
  static async deleteNote(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const noteId = String(req.params.id);

      await NoteService.deleteNote(noteId, user.id);

      res.status(200).json({
        success: true,
        message: 'Note deleted successfully',
        data: { deleted: true },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Delete note error:', error);

      if (error instanceof Error && error.message === 'Note not found') {
        res.status(404).json({
          success: false,
          message: 'Note not found',
          error: 'NOTE_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'An error occurred while deleting the note',
        error: 'DELETE_NOTE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Render the create note form
   * GET /notes/new
   */
  static async getCreateForm(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;

      res.render('notes/edit', {
        pageTitle: 'New Note',
        note: null,
        user,
      });

    } catch (error) {
      console.error('Get create form error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred',
        error: 'GET_FORM_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Render the edit note form (ownership verified by middleware)
   * GET /notes/:id/edit
   */
  static async getEditForm(req: Request, res: Response): Promise<void> {
    try {
      const note = (req as any).note;
      const user = (req as any).user;

      res.render('notes/edit', {
        pageTitle: `Edit: ${note.title || 'Note'}`,
        note,
        user,
      });

    } catch (error) {
      console.error('Get edit form error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred',
        error: 'GET_FORM_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
