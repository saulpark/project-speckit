import express, { Request, Response } from 'express';
import { NoteController } from '../controllers/noteController';
import { authenticateToken, authenticateWeb } from '../middleware/auth';
import { validateNote, validateNoteUpdate } from '../middleware/noteValidation';
import { verifyNoteOwnership, verifyNoteAccessOrShared } from '../middleware/noteOwnership';

const router = express.Router();

// Test route to verify template rendering (no auth)
router.get('/test-ui', (req: Request, res: Response) => {
  res.render('notes/list', {
    pageTitle: 'Test Notes',
    notes: [
      {
        _id: 'test1',
        title: 'Test Note 1',
        content: { preview: 'This is a test note to verify the UI works.' },
        updatedAt: new Date(),
        createdAt: new Date(),
        isPublic: false,
        sharedWith: []
      },
      {
        _id: 'test2',
        title: 'Test Note 2',
        content: { preview: 'Another test note with sharing enabled.' },
        updatedAt: new Date(),
        createdAt: new Date(),
        isPublic: true,
        sharedWith: [{userId: 'test', grantedAt: new Date()}]
      }
    ],
    pagination: { page: 1, limit: 20, total: 2, pages: 1 },
    isSharedView: false,
    user: { id: 'test', email: 'test@example.com' }
  });
});

// Web routes (redirect to login on auth failure)
router.get('/', authenticateWeb, NoteController.getNotesView);
router.get('/shared-with-me', authenticateWeb, NoteController.getSharedNotesView);
router.get('/new', authenticateWeb, NoteController.getCreateForm);
router.get('/:id/view', authenticateWeb, verifyNoteAccessOrShared, NoteController.getShowView);
router.get('/:id/edit', authenticateWeb, verifyNoteOwnership, NoteController.getEditForm);

// API routes (return JSON on auth failure)
router.get('/api', authenticateToken, NoteController.listNotes);
router.post('/', authenticateToken, validateNote, NoteController.createNote);
router.get('/:id', authenticateToken, verifyNoteAccessOrShared, NoteController.getNote);
router.put('/:id', authenticateToken, verifyNoteOwnership, validateNoteUpdate, NoteController.updateNote);
router.delete('/:id', authenticateToken, verifyNoteOwnership, NoteController.deleteNote);

// Sharing API routes - return JSON
router.post('/:id/share/public', authenticateToken, verifyNoteOwnership, NoteController.togglePublicSharing);
router.post('/:id/share/user', authenticateToken, verifyNoteOwnership, NoteController.shareNoteWithUser);
router.delete('/:id/share/user/:userId', authenticateToken, verifyNoteOwnership, NoteController.unshareNoteWithUser);
router.get('/api/shared-with-me', authenticateToken, NoteController.getSharedNotes);
router.get('/:id/sharing', authenticateToken, verifyNoteOwnership, NoteController.getNoteSharingInfo);

export default router;
