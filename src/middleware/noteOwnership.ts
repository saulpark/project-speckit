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

    const note = await Note.findById(req.params.id);

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
