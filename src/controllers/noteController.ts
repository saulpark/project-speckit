import { Request, Response } from 'express';
import { NoteService } from '../services/noteService';
import { QuillDeltaToHtmlConverter } from 'quill-delta-to-html';

/**
 * Controller for note CRUD operations
 */
export class NoteController {

  /**
   * Render the main notes view
   * GET /notes
   */
  static async getNotesView(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { page, limit, sortBy, search } = req.query;

      const result = await NoteService.getUserNotes(user.id, {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        sortBy: sortBy as string | undefined,
        search: search as string | undefined,
      });

      res.render('notes/list', {
        pageTitle: 'My Notes',
        notes: result.notes,
        pagination: result.pagination,
        search: search,
        isSharedView: false,
        user,
      });

    } catch (error) {
      console.error('Get notes view error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while retrieving notes',
        error: 'GET_NOTES_VIEW_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * List notes for the authenticated user (API)
   * GET /notes/api
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
   * Get a specific note (access verified by middleware - owner or shared)
   * GET /notes/:id
   */
  static async getNote(req: Request, res: Response): Promise<void> {
    try {
      const note = (req as any).note;
      const user = (req as any).user;
      const noteAccess = (req as any).noteAccess;

      // Return JSON response with access information
      res.status(200).json({
        success: true,
        data: {
          note,
          access: {
            isOwner: noteAccess?.isOwner || false,
            isShared: noteAccess?.isShared || false,
            canEdit: noteAccess?.canEdit || false,
            canShare: noteAccess?.canShare || false,
          }
        },
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
   * Render the shared notes view
   * GET /notes/shared-with-me
   */
  static async getSharedNotesView(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { page, limit, sortBy } = req.query;

      const result = await NoteService.getSharedNotes(user.id, {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        sortBy: sortBy as string | undefined,
      });

      res.render('notes/list', {
        pageTitle: 'Shared Notes',
        notes: result.notes,
        pagination: result.pagination,
        isSharedView: true,
        user,
      });

    } catch (error) {
      console.error('Get shared notes view error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while retrieving shared notes',
        error: 'GET_SHARED_NOTES_VIEW_ERROR',
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

  /**
   * Render the note show view (access verified by middleware)
   * GET /notes/:id/view
   */
  static async getShowView(req: Request, res: Response): Promise<void> {
    try {
      const note = (req as any).note;
      const user = (req as any).user;
      const noteAccess = (req as any).noteAccess;

      // Convert note to plain object for template rendering
      const notePlain = note.toObject ? note.toObject() : JSON.parse(JSON.stringify(note));

      // Convert Quill content to HTML for display
      let htmlContent = '';
      if (notePlain.content && notePlain.content.type === 'delta' && notePlain.content.data) {
        try {
          if (notePlain.content.data.ops && Array.isArray(notePlain.content.data.ops)) {
            const converter = new QuillDeltaToHtmlConverter(notePlain.content.data.ops);
            htmlContent = converter.convert();
          } else if (typeof notePlain.content.data === 'string') {
            htmlContent = notePlain.content.data.replace(/\n/g, '<br>');
          }
        } catch (e) {
          console.warn('Error processing note content:', e);
          // Fallback to plain text rendering
          if (notePlain.content.data.ops) {
            htmlContent = notePlain.content.data.ops
              .filter((op: any) => typeof op.insert === 'string')
              .map((op: any) => op.insert)
              .join('').replace(/\n/g, '<br>');
          } else {
            htmlContent = notePlain.content.preview || 'Error displaying content';
          }
        }
      } else if (notePlain.content && notePlain.content.preview) {
        htmlContent = notePlain.content.preview.replace(/\n/g, '<br>');
      }

      res.render('notes/show', {
        pageTitle: notePlain.title || 'Note',
        note: {
          ...notePlain,
          createdAt: new Date(notePlain.createdAt).toLocaleDateString(),
          updatedAt: new Date(notePlain.updatedAt).toLocaleDateString()
        },
        htmlContent,
        user,
        access: {
          isOwner: noteAccess?.isOwner || false,
          isShared: noteAccess?.isShared || false,
          canEdit: noteAccess?.canEdit || false,
          canShare: noteAccess?.canShare || false,
        }
      });

    } catch (error) {
      console.error('Get show view error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while displaying the note',
        error: 'GET_SHOW_VIEW_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Toggle public sharing for a note
   * POST /notes/:id/share/public
   */
  static async togglePublicSharing(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const noteId = String(req.params.id);

      const result = await NoteService.shareNotePublic(noteId, user.id);

      res.status(200).json({
        success: true,
        message: result.isPublic ? 'Note is now public' : 'Note is now private',
        data: result,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Toggle public sharing error:', error);

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
        message: 'An error occurred while toggling note sharing',
        error: 'TOGGLE_SHARING_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get a public note (no authentication required)
   * GET /public/notes/:id
   */
  static async getPublicNote(req: Request, res: Response): Promise<void> {
    try {
      const noteId = String(req.params.id);

      const result = await NoteService.getPublicNote(noteId);

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Get public note error:', error);

      if (error instanceof Error && error.message === 'Public note not found') {
        res.status(404).json({
          success: false,
          message: 'Public note not found',
          error: 'PUBLIC_NOTE_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'An error occurred while retrieving the public note',
        error: 'GET_PUBLIC_NOTE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Share a note with a specific user
   * POST /notes/:id/share/user
   */
  static async shareNoteWithUser(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const noteId = String(req.params.id);
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required',
          error: 'MISSING_EMAIL',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await NoteService.shareNoteWithUser(noteId, user.id, email);

      res.status(200).json({
        success: true,
        message: `Note shared with ${email}`,
        data: result,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Share note with user error:', error);

      if (error instanceof Error) {
        switch (error.message) {
          case 'Note not found':
            res.status(404).json({
              success: false,
              message: 'Note not found',
              error: 'NOTE_NOT_FOUND',
              timestamp: new Date().toISOString(),
            });
            return;

          case 'User not found with the provided email':
            res.status(404).json({
              success: false,
              message: 'User not found with the provided email',
              error: 'USER_NOT_FOUND',
              timestamp: new Date().toISOString(),
            });
            return;

          case 'Note is already shared with this user':
            res.status(409).json({
              success: false,
              message: 'Note is already shared with this user',
              error: 'ALREADY_SHARED',
              timestamp: new Date().toISOString(),
            });
            return;

          case 'Cannot share note with yourself':
            res.status(400).json({
              success: false,
              message: 'Cannot share note with yourself',
              error: 'SELF_SHARE_ERROR',
              timestamp: new Date().toISOString(),
            });
            return;
        }
      }

      res.status(500).json({
        success: false,
        message: 'An error occurred while sharing the note',
        error: 'SHARE_NOTE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Remove user access from a shared note
   * DELETE /notes/:id/share/user/:userId
   */
  static async unshareNoteWithUser(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const noteId = String(req.params.id);
      const recipientUserId = String(req.params.userId);

      const result = await NoteService.unshareNoteWithUser(noteId, user.id, recipientUserId);

      if (!result.success) {
        res.status(404).json({
          success: false,
          message: result.message,
          error: 'USER_NOT_IN_SHARING_LIST',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Unshare note with user error:', error);

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
        message: 'An error occurred while unsharing the note',
        error: 'UNSHARE_NOTE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get notes shared with the current user
   * GET /notes/shared-with-me
   */
  static async getSharedNotes(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { page, limit, sortBy } = req.query;

      const result = await NoteService.getSharedNotes(user.id, {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        sortBy: sortBy as string | undefined,
      });

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Get shared notes error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while retrieving shared notes',
        error: 'GET_SHARED_NOTES_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get sharing information for a note
   * GET /notes/:id/sharing
   */
  static async getNoteSharingInfo(req: Request, res: Response): Promise<void> {
    try {
      const note = (req as any).note;
      const user = (req as any).user;

      // Get user information for shared users
      const sharedUserIds = note.sharedWith.map((share: any) => share.userId.toString());
      let sharedUsers: any[] = [];

      if (sharedUserIds.length > 0) {
        // Import UserService here to avoid circular dependency issues
        const { UserService } = await import('../services/userService');
        sharedUsers = await UserService.getUserSharingDisplayInfo(sharedUserIds);
      }

      // Build sharing information response
      const sharingInfo = {
        noteId: note._id,
        isPublic: note.isPublic,
        publicUrl: note.isPublic
          ? `${process.env.PUBLIC_NOTE_BASE_URL || 'http://localhost:3000'}/public/notes/${note._id}`
          : null,
        sharedWith: note.sharedWith.map((share: any) => {
          const userInfo = sharedUsers.find(u => u.id === share.userId.toString());
          return {
            userId: share.userId,
            email: userInfo?.email || 'Unknown User',
            grantedAt: share.grantedAt,
            grantedBy: share.grantedBy,
          };
        }),
        totalShares: note.sharedWith.length,
        canShare: true, // Owner always can share
      };

      res.status(200).json({
        success: true,
        data: sharingInfo,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Get note sharing info error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while retrieving sharing information',
        error: 'GET_SHARING_INFO_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
