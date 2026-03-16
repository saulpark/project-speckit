import { Request, Response, NextFunction } from 'express';
import { Note } from '../models/Note';

/**
 * Middleware to verify that the authenticated user owns the requested note.
 * Returns 404 for both missing notes and notes owned by other users
 * to prevent information leakage.
 */
export const verifyNoteOwnership = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED',
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log('🔍 verifyNoteOwnership debug:', {
      requestedNoteId: req.params.id,
      userId: user.id,
      path: req.path
    });

    const note = await Note.findById(req.params.id);

    console.log('📝 Note lookup result:', {
      noteFound: !!note,
      noteUserId: note?.userId?.toString(),
      requestingUserId: user.id.toString(),
      ownershipMatch: note ? note.userId.toString() === user.id.toString() : false
    });

    // Return 404 for missing note OR wrong owner (no information leakage)
    if (!note || note.userId.toString() !== user.id.toString()) {
      res.status(404).json({
        success: false,
        message: 'Note not found',
        error: 'NOTE_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Attach note to request for downstream handlers
    (req as any).note = note;
    next();

  } catch (error) {
    console.error('Note ownership middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: 'SERVER_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Middleware to verify note access with sharing support.
 * Allows access if:
 * 1. User owns the note, OR
 * 2. Note is shared with the user
 * Returns 404 for missing notes or no access to prevent information leakage.
 */
export const verifyNoteAccessOrShared = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const note = await Note.findById(req.params.id);

    if (!note) {
      res.status(404).json({
        success: false,
        message: 'Note not found',
        error: 'NOTE_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if user owns the note
    const isOwner = note.userId.toString() === user.id.toString();

    // Check if note is shared with user
    const isShared = note.sharedWith.some(
      (share) => share.userId.toString() === user.id.toString()
    );

    if (!isOwner && !isShared) {
      res.status(404).json({
        success: false,
        message: 'Note not found',
        error: 'NOTE_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Attach note and access type to request for downstream handlers
    (req as any).note = note;
    (req as any).noteAccess = {
      isOwner,
      isShared,
      canEdit: isOwner, // Only owners can edit
      canShare: isOwner // Only owners can manage sharing
    };

    next();

  } catch (error) {
    console.error('Note access middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: 'SERVER_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};


