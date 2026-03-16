import express, { Request, Response } from 'express';
import { NoteController } from '../controllers/noteController';
import { authenticateWeb } from '../middleware/auth';
import { verifyNoteOwnership } from '../middleware/noteOwnership';

const router = express.Router();

// Test edit route with different URL pattern to bypass caching
router.get('/fix-edit/:id', authenticateWeb, verifyNoteOwnership, (req: Request, res: Response) => {
  console.log('🔧 FIX EDIT ROUTE - Testing note data loading');
  const note = (req as any).note;
  const user = (req as any).user;

  console.log('🔧 Fix edit note data:', {
    noteId: note?._id,
    title: note?.title,
    hasContent: !!note?.content,
    contentType: note?.content?.type,
    noteExists: !!note
  });

  // Use same template as regular edit
  res.render('notes/edit', {
    pageTitle: `Fix Edit: ${note?.title || 'Note'}`,
    note,
    user,
  });
});

export default router;