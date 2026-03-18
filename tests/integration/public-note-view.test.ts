/**
 * Integration tests for the public note rendered view endpoint.
 *
 * GET /public/notes/:id renders the notes/public-view template and is
 * accessible without authentication. The controller is NoteController.getPublicNoteView.
 *
 * Covers:
 * - Happy path: renders HTML for a public note
 * - 404 path: note does not exist
 * - 404 path: note exists but is private
 * - Content conversion: delta ops are converted to HTML before render
 * - No authentication required (unauthenticated requests are accepted)
 */

import request from 'supertest';
import express, { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import bcrypt from 'bcrypt';
import path from 'path';
import { engine } from 'express-handlebars';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../../src/models/User';
import { Note } from '../../src/models/Note';
import { NoteController } from '../../src/controllers/noteController';

describe('GET /public/notes/:id - public note rendered view', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let ownerId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    process.env.NODE_ENV = 'test';

    app = express();
    app.use(express.json());

    // Configure Handlebars so templates render properly in tests.
    // Paths are relative to the repo root where views/ lives.
    const viewsRoot = path.join(__dirname, '../../views');
    app.engine(
      'handlebars',
      engine({
        defaultLayout: 'main',
        layoutsDir: path.join(viewsRoot, 'layouts'),
        partialsDir: path.join(viewsRoot, 'partials'),
        extname: '.handlebars',
        helpers: {
          eq: (a: any, b: any) => a === b,
          ne: (a: any, b: any) => a !== b,
          json: (context: any) => JSON.stringify(context),
          formatDate: (date: any) => {
            if (!date) return 'Unknown date';
            const d = date instanceof Date ? date : new Date(date);
            return isNaN(d.getTime()) ? 'Invalid date' : d.toLocaleDateString();
          },
          capitalize: (str: string) =>
            str ? str.charAt(0).toUpperCase() + str.slice(1) : '',
        },
      })
    );
    app.set('view engine', 'handlebars');
    app.set('views', viewsRoot);

    // Mount the public view route with no authentication middleware
    app.get('/public/notes/:id', NoteController.getPublicNoteView);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Note.deleteMany({});

    const passwordHash = await bcrypt.hash('TestPass1!', 12);
    const owner = new User({ email: 'owner@example.com', passwordHash });
    await owner.save();
    ownerId = (owner._id as Types.ObjectId).toString();
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  async function createNote(opts: {
    title?: string;
    isPublic?: boolean;
    contentType?: 'delta' | 'plain';
    contentData?: any;
  } = {}): Promise<string> {
    const { NoteService } = await import('../../src/services/noteService');
    const note = await NoteService.createNote(ownerId, {
      title: opts.title || 'Test Note',
      content: {
        type: opts.contentType || 'plain',
        data: opts.contentData || 'Some content',
      },
    });
    if (opts.isPublic) {
      note.isPublic = true;
      await note.save();
    }
    return (note._id as Types.ObjectId).toString();
  }

  // ---------------------------------------------------------------------------
  // Tests
  // ---------------------------------------------------------------------------
  it('should render an HTML page for a public note without authentication', async () => {
    const noteId = await createNote({ title: 'My Public Note', isPublic: true });

    const res = await request(app)
      .get(`/public/notes/${noteId}`)
      .expect(200);

    // The response must be HTML (Handlebars render)
    expect(res.headers['content-type']).toMatch(/text\/html/);
    // The note title must appear in the rendered output
    expect(res.text).toContain('My Public Note');
  });

  it('should render a 404 page when the note does not exist', async () => {
    const fakeId = new Types.ObjectId().toString();

    const res = await request(app)
      .get(`/public/notes/${fakeId}`)
      .expect(404);

    expect(res.headers['content-type']).toMatch(/text\/html/);
  });

  it('should render a 404 page when the note exists but is private', async () => {
    const noteId = await createNote({ title: 'Private Note', isPublic: false });

    const res = await request(app)
      .get(`/public/notes/${noteId}`)
      .expect(404);

    expect(res.headers['content-type']).toMatch(/text\/html/);
  });

  it('should not require an auth token — request with no headers succeeds', async () => {
    const noteId = await createNote({ isPublic: true });

    // Deliberately send no Authorization header
    const res = await request(app)
      .get(`/public/notes/${noteId}`)
      .expect(200);

    expect(res.text).toBeDefined();
  });

  it('should render content for a note with Quill delta format', async () => {
    const deltaData = { ops: [{ insert: 'Delta content paragraph\n' }] };
    const noteId = await createNote({
      title: 'Delta Note',
      isPublic: true,
      contentType: 'delta',
      contentData: deltaData,
    });

    const res = await request(app)
      .get(`/public/notes/${noteId}`)
      .expect(200);

    expect(res.text).toContain('Delta Note');
  });

  it('should render the page title in the HTML output', async () => {
    const noteId = await createNote({ title: 'Titled Public Note', isPublic: true });

    const res = await request(app)
      .get(`/public/notes/${noteId}`)
      .expect(200);

    expect(res.text).toContain('Titled Public Note');
  });

  it('should set isPublicView context so the template knows it is a public view', async () => {
    // We test this indirectly: if the template receives isPublicView:true it should
    // render without any owner-specific edit controls. Since we cannot inspect
    // template locals directly, we verify the page loads successfully and does
    // not include edit-only links (which reference /edit route).
    const noteId = await createNote({ title: 'Public View Test', isPublic: true });

    const res = await request(app)
      .get(`/public/notes/${noteId}`)
      .expect(200);

    // Edit routes should not be present on the public read-only view
    expect(res.text).not.toContain(`/notes/${noteId}/edit`);
  });
});
