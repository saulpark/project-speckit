# Notes CRUD Operations - Technical Implementation

## Technology Stack

### Core Dependencies
- **Mongoose**: MongoDB ODM for note document modeling
- **express-validator**: Input validation for note content and metadata
- **Quill.js**: Rich text editor for Delta format content
- **helmet**: Security middleware for content protection

### Database Implementation (MongoDB)

#### Note Schema (Mongoose)
```javascript
import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    maxLength: 200,
    trim: true,
    default: 'Untitled'
  },
  content: {
    type: {
      type: String,
      enum: ['delta', 'plain'],
      default: 'delta'
    },
    data: mongoose.Schema.Types.Mixed, // Flexible for Delta JSON or plain text
    preview: String // Generated excerpt for lists
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }]
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Indexes for performance
noteSchema.index({ userId: 1, updatedAt: -1 });
noteSchema.index({ userId: 1, title: 'text', 'content.preview': 'text' });
noteSchema.index({ isPublic: 1, updatedAt: -1 });

export const Note = mongoose.model('Note', noteSchema);
```

### Docker Integration

#### Updated docker-compose.yml
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongo:27017/projectspeckit
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - mongo

  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
      - ./mongo-init:/docker-entrypoint-initdb.d
    environment:
      - MONGO_INITDB_DATABASE=projectspeckit

volumes:
  mongo_data:
```

## Express Route Implementation

### Notes Router Structure
```javascript
// routes/notes.ts
import express from 'express';
import { noteController } from '../controllers/noteController';
import { authenticateToken } from '../middleware/auth';
import { validateNote, validateNoteUpdate } from '../middleware/validation';

const router = express.Router();

// All note routes require authentication
router.use(authenticateToken);

// API routes
router.get('/', noteController.listNotes);
router.post('/', validateNote, noteController.createNote);
router.get('/:id', noteController.getNote);
router.put('/:id', validateNoteUpdate, noteController.updateNote);
router.delete('/:id', noteController.deleteNote);

// UI routes
router.get('/new', noteController.getCreateForm);
router.get('/:id/edit', noteController.getEditForm);

export { router as noteRouter };
```

### Note Ownership Middleware
```javascript
// middleware/noteOwnership.ts
import { Request, Response, NextFunction } from 'express';
import { Note } from '../models/Note';

interface AuthenticatedRequest extends Request {
  user?: any;
  note?: any;
}

export const verifyNoteOwnership = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Check ownership (hide existence from other users)
    if (note.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: 'Note not found' });
    }

    req.note = note;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
```

## Content Management

### Delta Content Processing
```javascript
// utils/contentProcessor.ts
export class ContentProcessor {

  // Convert plain text to Delta format
  static textToDelta(text: string): object {
    return {
      ops: [{ insert: text + '\n' }]
    };
  }

  // Validate Delta format
  static validateDelta(delta: any): boolean {
    try {
      return (
        delta &&
        Array.isArray(delta.ops) &&
        delta.ops.every((op: any) =>
          typeof op === 'object' &&
          typeof op.insert === 'string'
        )
      );
    } catch {
      return false;
    }
  }

  // Generate preview text from Delta
  static deltaToPreview(delta: any, maxLength: number = 200): string {
    try {
      const text = delta.ops
        .map((op: any) => op.insert || '')
        .join('')
        .replace(/\n/g, ' ')
        .trim();

      return text.length > maxLength
        ? text.substring(0, maxLength) + '...'
        : text;
    } catch {
      return 'No content preview available';
    }
  }

  // Sanitize content for security
  static sanitizeContent(content: any): any {
    // Remove any potentially dangerous operations
    if (content.ops) {
      return {
        ops: content.ops.map((op: any) => ({
          insert: typeof op.insert === 'string' ? op.insert : '',
          attributes: this.sanitizeAttributes(op.attributes)
        }))
      };
    }
    return content;
  }

  private static sanitizeAttributes(attrs: any): any {
    if (!attrs || typeof attrs !== 'object') return undefined;

    // Whitelist safe attributes
    const safeAttrs = ['bold', 'italic', 'underline', 'link', 'list'];
    const sanitized: any = {};

    Object.keys(attrs).forEach(key => {
      if (safeAttrs.includes(key)) {
        sanitized[key] = attrs[key];
      }
    });

    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
  }
}
```

## Input Validation

### Note Validation Middleware
```javascript
// middleware/noteValidation.ts
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ContentProcessor } from '../utils/contentProcessor';

export const validateNote = [
  body('title')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Title must be 200 characters or less')
    .trim(),

  body('content.data')
    .custom((value, { req }) => {
      const contentType = req.body?.content?.type || 'delta';

      if (contentType === 'delta') {
        if (!ContentProcessor.validateDelta(value)) {
          throw new Error('Invalid Delta format');
        }
      } else if (contentType === 'plain') {
        if (typeof value !== 'string') {
          throw new Error('Plain content must be a string');
        }
      }

      return true;
    }),

  body('content.type')
    .optional()
    .isIn(['delta', 'plain'])
    .withMessage('Content type must be delta or plain'),

  handleValidationErrors
];

export const validateNoteUpdate = [
  body('title')
    .optional()
    .isLength({ max: 200 })
    .trim(),

  body('content')
    .optional()
    .custom((value) => {
      if (value && value.data) {
        const contentType = value.type || 'delta';
        if (contentType === 'delta' && !ContentProcessor.validateDelta(value.data)) {
          throw new Error('Invalid Delta format');
        }
      }
      return true;
    }),

  handleValidationErrors
];

function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}
```

## Service Layer

### Note Service
```javascript
// services/noteService.ts
import { Note } from '../models/Note';
import { ContentProcessor } from '../utils/contentProcessor';
import { Types } from 'mongoose';

export class NoteService {

  static async createNote(userId: string, noteData: any) {
    const { title, content } = noteData;

    // Process content based on type
    let processedContent = content;
    if (content.type === 'plain') {
      processedContent = {
        type: 'delta',
        data: ContentProcessor.textToDelta(content.data)
      };
    } else if (content.type === 'delta') {
      processedContent.data = ContentProcessor.sanitizeContent(content.data);
    }

    // Generate preview
    const preview = ContentProcessor.deltaToPreview(processedContent.data);

    const note = new Note({
      userId: new Types.ObjectId(userId),
      title: title || 'Untitled',
      content: {
        ...processedContent,
        preview
      }
    });

    return await note.save();
  }

  static async getUserNotes(userId: string, options: {
    page?: number;
    limit?: number;
    sortBy?: string;
    search?: string;
  } = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = '-updatedAt',
      search
    } = options;

    const query: any = { userId: new Types.ObjectId(userId) };

    // Add search if provided
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
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async getNoteById(noteId: string, userId: string) {
    const note = await Note.findOne({
      _id: new Types.ObjectId(noteId),
      userId: new Types.ObjectId(userId)
    });

    if (!note) {
      throw new Error('Note not found');
    }

    return note;
  }

  static async updateNote(noteId: string, userId: string, updateData: any) {
    const note = await this.getNoteById(noteId, userId);

    if (updateData.title !== undefined) {
      note.title = updateData.title || 'Untitled';
    }

    if (updateData.content) {
      let processedContent = updateData.content;

      if (updateData.content.type === 'plain') {
        processedContent = {
          type: 'delta',
          data: ContentProcessor.textToDelta(updateData.content.data)
        };
      } else if (updateData.content.data) {
        processedContent.data = ContentProcessor.sanitizeContent(updateData.content.data);
      }

      note.content = {
        ...processedContent,
        preview: ContentProcessor.deltaToPreview(processedContent.data)
      };
    }

    note.updatedAt = new Date();
    return await note.save();
  }

  static async deleteNote(noteId: string, userId: string) {
    const result = await Note.deleteOne({
      _id: new Types.ObjectId(noteId),
      userId: new Types.ObjectId(userId)
    });

    if (result.deletedCount === 0) {
      throw new Error('Note not found');
    }

    return { deleted: true };
  }
}
```

## Template Implementation (Handlebars)

### Note List Template
```handlebars
<!-- views/notes/list.hbs -->
<div class="container">
  <div class="d-flex justify-content-between align-items-center mb-4">
    <h1>My Notes</h1>
    <a href="/notes/new" class="btn btn-primary">
      <i class="bi bi-plus-circle"></i> New Note
    </a>
  </div>

  {{#if search}}
    <div class="mb-3">
      <small class="text-muted">Search results for "{{search}}"</small>
    </div>
  {{/if}}

  <div class="row">
    {{#each notes}}
      <div class="col-md-6 col-lg-4 mb-3">
        <div class="card h-100">
          <div class="card-body">
            <h5 class="card-title">{{this.title}}</h5>
            <p class="card-text">{{this.content.preview}}</p>
            <small class="text-muted">
              Updated {{formatDate this.updatedAt}}
            </small>
          </div>
          <div class="card-footer">
            <a href="/notes/{{this._id}}" class="btn btn-sm btn-outline-primary">View</a>
            <a href="/notes/{{this._id}}/edit" class="btn btn-sm btn-outline-secondary">Edit</a>
          </div>
        </div>
      </div>
    {{else}}
      <div class="col-12">
        <div class="text-center py-5">
          <i class="bi bi-journal-text fs-1 text-muted"></i>
          <h3 class="mt-3">No notes yet</h3>
          <p class="text-muted">Create your first note to get started</p>
          <a href="/notes/new" class="btn btn-primary">Create Note</a>
        </div>
      </div>
    {{/each}}
  </div>

  {{#if pagination.pages}}
    {{> pagination pagination=pagination }}
  {{/if}}
</div>
```

### Rich Text Editor Integration
```handlebars
<!-- views/notes/edit.hbs -->
<div class="container">
  <div class="row justify-content-center">
    <div class="col-lg-8">
      <form id="noteForm" method="POST" action="/notes{{#if note._id}}/{{note._id}}{{/if}}">
        {{#if note._id}}
          <input type="hidden" name="_method" value="PUT">
        {{/if}}

        <div class="mb-3">
          <label for="title" class="form-label">Title</label>
          <input type="text" class="form-control" id="title" name="title"
                 value="{{note.title}}" placeholder="Untitled">
        </div>

        <div class="mb-3">
          <label for="editor" class="form-label">Content</label>
          <div id="editor" style="height: 300px;"></div>
          <input type="hidden" name="content" id="content">
        </div>

        <div class="d-flex gap-2">
          <button type="submit" class="btn btn-primary">Save Note</button>
          <a href="/notes" class="btn btn-outline-secondary">Cancel</a>
          {{#if note._id}}
            <button type="button" class="btn btn-outline-danger ms-auto"
                    onclick="deleteNote('{{note._id}}')">Delete</button>
          {{/if}}
        </div>
      </form>
    </div>
  </div>
</div>

<script src="/js/quill.min.js"></script>
<script>
  // Initialize Quill editor
  const quill = new Quill('#editor', {
    theme: 'snow',
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline'],
        ['blockquote', 'code-block'],
        [{ 'header': 1 }, { 'header': 2 }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link', 'clean']
      ]
    }
  });

  // Load existing content
  {{#if note.content.data}}
    quill.setContents({{{json note.content.data}}});
  {{/if}}

  // Handle form submission
  document.getElementById('noteForm').addEventListener('submit', function(e) {
    const content = JSON.stringify(quill.getContents());
    document.getElementById('content').value = JSON.stringify({
      type: 'delta',
      data: JSON.parse(content)
    });
  });

  // Auto-save functionality
  let saveTimeout;
  quill.on('text-change', function() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(autoSave, 2000);
  });

  async function autoSave() {
    if (!document.querySelector('input[name="_method"]')) return; // Only auto-save existing notes

    const formData = {
      title: document.getElementById('title').value,
      content: {
        type: 'delta',
        data: quill.getContents()
      }
    };

    try {
      const response = await fetch(window.location.pathname, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showToast('Auto-saved', 'success');
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }
</script>
```

## Security Implementation

### Content Sanitization
```javascript
// utils/contentSanitizer.ts
import createDOMPurify from 'isomorphic-dompurify';

export class ContentSanitizer {

  static sanitizeHTML(html: string): string {
    const DOMPurify = createDOMPurify();

    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ol', 'ul', 'li', 'blockquote', 'code'],
      ALLOWED_ATTR: ['href', 'target'],
      FORBID_SCRIPTS: true,
      FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
    });
  }

  // Convert Delta to safe HTML for display
  static deltaToHTML(delta: any): string {
    // Basic Delta to HTML conversion
    // In production, use a proper Delta to HTML converter
    if (!delta.ops) return '';

    let html = '';
    delta.ops.forEach((op: any) => {
      if (typeof op.insert === 'string') {
        let text = op.insert;

        // Apply formatting attributes
        if (op.attributes) {
          if (op.attributes.bold) text = `<strong>${text}</strong>`;
          if (op.attributes.italic) text = `<em>${text}</em>`;
          if (op.attributes.underline) text = `<u>${text}</u>`;
          if (op.attributes.link) text = `<a href="${op.attributes.link}" target="_blank">${text}</a>`;
        }

        // Handle line breaks
        text = text.replace(/\n/g, '<br>');
        html += text;
      }
    });

    return this.sanitizeHTML(html);
  }
}
```

## Performance Optimization

### MongoDB Indexing Strategy
```javascript
// config/database.ts - Index creation
export async function createIndexes() {
  await Note.createIndexes([
    // Compound index for user's notes sorted by update time
    { userId: 1, updatedAt: -1 },

    // Text search index
    {
      title: 'text',
      'content.preview': 'text'
    },

    // Public notes index
    { isPublic: 1, updatedAt: -1 },

    // Sparse index for tags
    { tags: 1 },
  ]);
}
```

### Pagination and Query Optimization
```javascript
// Efficient pagination with cursor-based approach for large datasets
export class NotePagination {

  static async paginateNotes(userId: string, options: {
    limit?: number;
    lastId?: string;
    sortBy?: string;
  }) {
    const { limit = 20, lastId, sortBy = '-updatedAt' } = options;

    const query: any = { userId: new Types.ObjectId(userId) };

    // Cursor-based pagination for better performance
    if (lastId) {
      const lastNote = await Note.findById(lastId);
      if (lastNote) {
        query.updatedAt = { $lt: lastNote.updatedAt };
      }
    }

    const notes = await Note
      .find(query)
      .sort(sortBy)
      .limit(limit + 1) // Get one extra to check if there are more
      .select('title content.preview createdAt updatedAt')
      .lean();

    const hasMore = notes.length > limit;
    if (hasMore) notes.pop(); // Remove the extra note

    return {
      notes,
      hasMore,
      nextCursor: hasMore ? notes[notes.length - 1]._id : null
    };
  }
}
```

## Testing Strategy

### Unit Tests
```javascript
// tests/services/noteService.test.ts
import { NoteService } from '../../src/services/noteService';
import { Note } from '../../src/models/Note';
import { ContentProcessor } from '../../src/utils/contentProcessor';

describe('NoteService', () => {
  beforeEach(async () => {
    await Note.deleteMany({});
  });

  describe('createNote', () => {
    it('should create a note with Delta content', async () => {
      const userId = new Types.ObjectId().toString();
      const noteData = {
        title: 'Test Note',
        content: {
          type: 'delta',
          data: { ops: [{ insert: 'Hello World\n' }] }
        }
      };

      const note = await NoteService.createNote(userId, noteData);

      expect(note.title).toBe('Test Note');
      expect(note.content.type).toBe('delta');
      expect(note.content.preview).toContain('Hello World');
    });

    it('should convert plain text to Delta', async () => {
      const userId = new Types.ObjectId().toString();
      const noteData = {
        title: 'Plain Text Note',
        content: {
          type: 'plain',
          data: 'This is plain text'
        }
      };

      const note = await NoteService.createNote(userId, noteData);

      expect(note.content.type).toBe('delta');
      expect(note.content.data.ops).toBeDefined();
    });
  });

  describe('getUserNotes', () => {
    it('should return paginated notes for user', async () => {
      const userId = new Types.ObjectId().toString();

      // Create test notes
      for (let i = 0; i < 25; i++) {
        await NoteService.createNote(userId, {
          title: `Note ${i}`,
          content: { type: 'plain', data: `Content ${i}` }
        });
      }

      const result = await NoteService.getUserNotes(userId, {
        limit: 10,
        page: 1
      });

      expect(result.notes).toHaveLength(10);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.pages).toBe(3);
    });
  });
});
```

### Integration Tests
```javascript
// tests/routes/notes.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { User } from '../../src/models/User';
import { Note } from '../../src/models/Note';

describe('Notes API', () => {
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    // Create test user and get auth token
    const user = await User.create({
      email: 'test@example.com',
      passwordHash: 'hashedpassword'
    });
    userId = user._id.toString();
    authToken = 'valid-jwt-token'; // Mock token
  });

  describe('POST /notes', () => {
    it('should create a new note', async () => {
      const noteData = {
        title: 'Test Note',
        content: {
          type: 'delta',
          data: { ops: [{ insert: 'Hello World\n' }] }
        }
      };

      const response = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(noteData);

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Test Note');

      const note = await Note.findById(response.body._id);
      expect(note).toBeTruthy();
      expect(note?.userId.toString()).toBe(userId);
    });

    it('should validate note content', async () => {
      const invalidNoteData = {
        title: 'a'.repeat(201), // Too long
        content: {
          type: 'delta',
          data: 'invalid-delta-format'
        }
      };

      const response = await request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidNoteData);

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });
});
```

## Docker Development Commands

```bash
# Start development environment with notes functionality
docker-compose up -d

# Watch logs for both app and database
docker-compose logs -f

# Access MongoDB shell for data inspection
docker-compose exec mongo mongosh projectspeckit

# Rebuild after significant changes
docker-compose down && docker-compose up --build

# Run tests in container
docker-compose exec app npm test

# Check MongoDB collections
docker-compose exec mongo mongosh --eval "db.notes.find().pretty()"
```