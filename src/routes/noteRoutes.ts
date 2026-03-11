import express from 'express';
import { NoteController } from '../controllers/noteController';
import { authenticateToken } from '../middleware/auth';
import { validateNote, validateNoteUpdate } from '../middleware/noteValidation';
import { verifyNoteOwnership } from '../middleware/noteOwnership';

const router = express.Router();

// All note routes require authentication
router.use(authenticateToken);

// Note routes
router.get('/', NoteController.listNotes);
router.get('/new', NoteController.getCreateForm);
router.post('/', validateNote, NoteController.createNote);
router.get('/:id', verifyNoteOwnership, NoteController.getNote);
router.get('/:id/edit', verifyNoteOwnership, NoteController.getEditForm);
router.put('/:id', verifyNoteOwnership, validateNoteUpdate, NoteController.updateNote);
router.delete('/:id', verifyNoteOwnership, NoteController.deleteNote);

export default router;
