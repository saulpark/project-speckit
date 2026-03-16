import express, { Request, Response } from 'express';
import { NoteController } from '../controllers/noteController';
import { authenticateToken, authenticateWeb, optionalAuthentication } from '../middleware/auth';
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
router.get('/:id/view', authenticateWeb, verifyNoteOwnership, NoteController.getShowView);
// Fresh edit route - bypassing old problematic code
router.get('/:id/edit', authenticateWeb, verifyNoteOwnership, NoteController.getEditForm);

// SIMPLE TEST: No auth required - just verify routes are updating
router.get('/test-changes', (req: Request, res: Response) => {
  console.log('🟢 TEST ROUTE CALLED - ROUTE CHANGES ARE WORKING!');
  res.json({
    success: true,
    message: 'Route changes are working! Server is picking up modifications.',
    timestamp: new Date().toISOString()
  });
});

// DEBUG: Test route to verify middleware changes
router.post('/debug-auth', authenticateToken, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Modified authenticateToken middleware is working!',
    user: (req as any).user?.email,
    timestamp: new Date().toISOString()
  });
});

// API routes - TEMPORARILY use optionalAuthentication (we know this works with cookies)
router.get('/api', authenticateToken, NoteController.listNotes);
router.post('/', optionalAuthentication, (req: Request, res: Response, next: express.NextFunction) => {
  // Manual auth check - if no user, return 401 with clear message
  if (!(req as any).user) {
    return res.status(401).json({
      success: false,
      message: 'TESTING: Authentication required for note creation',
      error: 'NO_USER_FOUND',
      debug: {
        hasCookies: !!req.cookies,
        cookieKeys: req.cookies ? Object.keys(req.cookies) : []
      },
      timestamp: new Date().toISOString()
    });
  }
  next();
}, validateNote, NoteController.createNote);
router.get('/:id', authenticateToken, verifyNoteAccessOrShared, NoteController.getNote);
router.put('/:id', authenticateToken, verifyNoteOwnership, validateNoteUpdate, NoteController.updateNote);
// TESTING: Temporarily disable verifyNoteOwnership to isolate authenticateToken
router.delete('/:id', authenticateToken, (req, res, next) => {
  console.log('🟢 MADE IT PAST authenticateToken! User:', (req as any).user?.email);
  next();
}, NoteController.deleteNote);

// Sharing API routes - return JSON - now uses modified authenticateToken that supports cookies
router.post('/:id/share/public', authenticateToken, verifyNoteOwnership, NoteController.togglePublicSharing);
router.post('/:id/share/user', authenticateToken, verifyNoteOwnership, NoteController.shareNoteWithUser);
router.delete('/:id/share/user/:userId', authenticateToken, verifyNoteOwnership, NoteController.unshareNoteWithUser);
router.get('/api/shared-with-me', authenticateToken, NoteController.getSharedNotes);
router.get('/:id/sharing', authenticateToken, verifyNoteOwnership, NoteController.getNoteSharingInfo);

export default router;
