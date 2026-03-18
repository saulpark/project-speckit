import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { engine } from 'express-handlebars';
import path from 'path';
import { database } from './config/database';
import authRoutes from './routes/authRoutes';
import noteRoutes from './routes/noteRoutes';
import testEditRoutes from './routes/testEditRoutes';
import { NoteController } from './controllers/noteController';
import { authenticateWeb } from './middleware/auth';
import { verifyNoteOwnership } from './middleware/noteOwnership';
import {
  CSRFProtection,
  securityHeaders,
  securityLogger,
  IPBlacklist,
  requestSizeLimit
} from './middleware/security';
import {
  globalErrorHandler,
  notFoundHandler,
  generateClientErrorHandler
} from './middleware/errorHandler';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Apply security middlewares in order
// TESTING: app.use(IPBlacklist.middleware()); // Block blacklisted IPs first
app.use(requestSizeLimit()); // Limit request payload size
// TESTING: app.use(helmet({
//   contentSecurityPolicy: false // Disable helmet's default CSP, we'll set it manually
// })); // Basic security headers
// TEMPORARILY DISABLED FOR DEBUGGING CSP ISSUES
// app.use(securityHeaders()); // Additional security headers with custom CSP
app.use(securityLogger()); // Security logging

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true,
}));

// Request logging
app.use(morgan('combined'));

// CSRF protection for forms
app.use(CSRFProtection.addTokenMiddleware());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Configure MIME types for static files
app.use((req, res, next) => {
  if (req.path.endsWith('.css')) {
    res.setHeader('Content-Type', 'text/css');
  } else if (req.path.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript');
  }
  next();
});

// Static file serving
app.use('/static', express.static('public'));
app.use('/assets', express.static('public'));
app.use(express.static('public')); // Serve static files from public directory

// Favicon route
app.get('/favicon.ico', (req: Request, res: Response) => {
  res.sendFile('favicon.svg', { root: 'public' });
});

// Configure Handlebars template engine
app.engine('handlebars', engine({
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, '../views/layouts'),
  partialsDir: path.join(__dirname, '../views/partials'),
  extname: '.handlebars',
  helpers: {
    // Custom template helpers
    eq: (a: any, b: any) => a === b,
    ne: (a: any, b: any) => a !== b,
    json: (context: any) => JSON.stringify(context),
    formatDate: (date: any, options?: any) => {
      // Ignore the options parameter that Handlebars passes
      if (!date) return 'Unknown date';
      if (typeof date === 'string') {
        try {
          const parsed = new Date(date);
          if (isNaN(parsed.getTime())) return 'Invalid date';
          return parsed.toLocaleDateString();
        } catch (e) {
          return 'Invalid date';
        }
      }
      if (date instanceof Date) {
        if (isNaN(date.getTime())) return 'Invalid date';
        return date.toLocaleDateString();
      }
      return 'Invalid date';
    },
    capitalize: (str: string) => str.charAt(0).toUpperCase() + str.slice(1)
  }
}));

app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, '../views'));

// Force disable all template caching
app.set('view cache', false);
app.disable('view cache');

// Add anti-cache headers for all responses
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// Authentication routes
app.use('/auth', authRoutes);

// Public note access (no authentication required, but rate limited)
app.get('/public/notes/:id', NoteController.getPublicNoteView);
app.get('/api/public/notes/:id', NoteController.getPublicNote);

// Test registration form
app.get('/test-register', (req: Request, res: Response) => {
  res.send(`
    <h2>Registration Test</h2>
    <form id="testForm">
      <div style="margin: 10px 0;">
        <label>Email:</label><br>
        <input type="email" id="email" placeholder="test@example.com" style="width: 300px; padding: 8px;" required>
      </div>
      <div style="margin: 10px 0;">
        <label>Password:</label><br>
        <input type="password" id="password" placeholder="Password123!" style="width: 300px; padding: 8px;" required>
      </div>
      <button type="submit" style="padding: 10px 20px; background: #4361ee; color: white; border: none; border-radius: 4px;">Test Registration</button>
    </form>
    <div id="result" style="margin-top: 20px; padding: 10px; border-radius: 4px;"></div>

    <script>
      document.getElementById('testForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const resultDiv = document.getElementById('result');

        try {
          const response = await fetch('/test-register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });

          const data = await response.json();

          if (data.success) {
            resultDiv.innerHTML = '✅ Registration successful! User created: ' + data.user.email;
            resultDiv.style.background = '#c6f6d5';
            resultDiv.style.color = '#22543d';
          } else {
            resultDiv.innerHTML = '❌ Registration failed: ' + data.message + ' (Error: ' + data.error + ')';
            resultDiv.style.background = '#fed7d7';
            resultDiv.style.color = '#e53e3e';
          }
        } catch (error) {
          resultDiv.innerHTML = '❌ Network error: ' + error.message;
          resultDiv.style.background = '#fed7d7';
          resultDiv.style.color = '#e53e3e';
        }
      });
    </script>
  `);
});

// Test UI route (no auth required)
app.get('/test-ui', (req: Request, res: Response) => {
  res.render('notes/list', {
    pageTitle: 'UI Test - Notes Interface',
    notes: [
      {
        _id: 'test1',
        title: '✅ UI Test - Notes Interface Working!',
        content: { preview: 'If you can see this styled note card, the template system and CSS are working correctly.' },
        updatedAt: new Date(),
        createdAt: new Date(),
        isPublic: true,
        sharedWith: []
      },
      {
        _id: 'test2',
        title: '🔗 Test Public Note',
        content: { preview: 'This note has sharing enabled - you should see sharing indicators.' },
        updatedAt: new Date(),
        createdAt: new Date(),
        isPublic: true,
        sharedWith: [{userId: 'user1', grantedAt: new Date()}]
      },
      {
        _id: 'test3',
        title: '👥 Test Shared Note',
        content: { preview: 'This note is shared with users - check the sharing badges.' },
        updatedAt: new Date(),
        createdAt: new Date(),
        isPublic: false,
        sharedWith: [
          {userId: 'user1', grantedAt: new Date()},
          {userId: 'user2', grantedAt: new Date()}
        ]
      }
    ],
    pagination: { page: 1, limit: 20, total: 3, pages: 1 },
    isSharedView: false,
    user: { id: 'test', email: 'test@example.com' }
  });
});

// Test shared notes UI (no auth required)
app.get('/test-shared', (req: Request, res: Response) => {
  res.render('notes/list', {
    pageTitle: 'UI Test - Shared Notes',
    notes: [
      {
        _id: 'shared1',
        title: '📤 Note Shared With You',
        content: { preview: 'This is how shared notes appear in your shared notes list.' },
        updatedAt: new Date(),
        createdAt: new Date(),
        owner: { email: 'john@example.com' },
        isPublic: false,
        sharedWith: []
      }
    ],
    pagination: { page: 1, limit: 20, total: 1, pages: 1 },
    isSharedView: true,
    user: { id: 'test', email: 'test@example.com' }
  });
});

// Test registration endpoint
app.post('/test-register', express.json(), async (req: Request, res: Response) => {
  try {
    console.log('Test registration attempt:', req.body);

    // Basic validation
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
        error: 'MISSING_FIELDS'
      });
    }

    // Try to create user
    const { AuthService } = await import('./services/authService');
    const user = await AuthService.registerUser({ email, password });

    res.json({
      success: true,
      message: 'User created successfully!',
      user: user
    });

  } catch (error: any) {
    console.error('Registration test error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Registration failed',
      error: error.code || 'REGISTRATION_ERROR'
    });
  }
});

// TEST: Simple route to verify server changes work
app.get('/test-server-changes', (req: Request, res: Response) => {
  console.log('🔥 SERVER-LEVEL ROUTE WORKING!');
  res.json({
    success: true,
    message: 'Server-level route changes are working!',
    timestamp: new Date().toISOString()
  });
});


// Debug all requests to /notes
app.use('/notes', (req: Request, res: Response, next: NextFunction) => {
  console.log('🎯 SERVER LEVEL: Request to /notes detected!', {
    path: req.path,
    originalUrl: req.originalUrl,
    method: req.method,
    params: req.params
  });
  next();
});

// Notes routes (authentication required)
app.use('/notes', noteRoutes);

// Test edit routes (to bypass caching issues)
app.use('/test', testEditRoutes);

// SIMPLE TEST: No middleware
app.get('/simple-test/:id', (req: Request, res: Response) => {
  console.log('🧪 SIMPLE TEST ROUTE HIT!', req.params.id);
  res.json({ message: 'Simple test works!', id: req.params.id });
});

// DIRECT EDIT TEST: Bypass /notes path completely
app.get('/direct-edit/:id', authenticateWeb, verifyNoteOwnership, (req: Request, res: Response) => {
  console.log('🚀 DIRECT EDIT ROUTE - bypassing /notes path!');
  const note = (req as any).note;
  const user = (req as any).user;

  console.log('📝 Direct edit note data:', {
    noteId: note._id,
    title: note.title,
    hasContent: !!note.content,
    contentType: note.content?.type
  });

  res.render('notes/edit', {
    pageTitle: `Direct Edit: ${note.title || 'Note'}`,
    note,
    user,
  });
});

// CACHE TEST: Simple route to verify server changes are working
app.get('/test-cache-clear', (req: Request, res: Response) => {
  console.log('🧪 CACHE CLEAR TEST - Server changes are active!');
  res.json({
    success: true,
    message: 'Cache clear worked! Server changes are active.',
    timestamp: new Date().toISOString(),
    testId: Math.random()
  });
});

// NUCLEAR TEST: Direct DELETE route with NO middleware (placed after note routes)
app.delete('/test-direct-delete', (req: Request, res: Response) => {
  console.log('🚀 DIRECT DELETE CALLED - NO MIDDLEWARE!');
  console.log('🔍 Method:', req.method);
  console.log('🔍 Headers:', req.headers);
  console.log('🔍 Cookies:', req.cookies);
  res.json({
    success: true,
    message: 'Direct DELETE works!',
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// TEST: Same route but with GET method
app.get('/test-direct-delete-get', (req: Request, res: Response) => {
  console.log('🚀 DIRECT GET CALLED - NO MIDDLEWARE!');
  res.json({
    success: true,
    message: 'Direct GET works!',
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Enhanced health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const dbHealth = await database.healthCheck();
    const dbResponseTime = Date.now() - startTime;

    // Memory usage information
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    // System status
    const status = {
      service: 'project-speckit-auth',
      version: '1.0.0',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.round(uptime),
        human: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
      },
      database: {
        ...dbHealth,
        responseTime: `${dbResponseTime}ms`
      },
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform
      }
    };

    res.status(200).json(status);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'project-speckit-auth',
      version: '1.0.0',
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Project SpecKit - Authentication System',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/auth',
      authHealth: '/auth/health',
      notes: '/notes',
      dashboard: '/dashboard',
      templateTest: '/test-template'
    }
  });
});

// Dashboard route (redirect to auth dashboard)
app.get('/dashboard', (req: Request, res: Response) => {
  res.redirect('/auth/dashboard');
});

// Template test route
app.get('/test-template', (req: Request, res: Response) => {
  res.render('test', {
    pageTitle: 'Template Test',
    currentTime: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    testDate: new Date(),
    showMessage: true,
    testItems: ['First Item', 'Second Item', 'Third Item'],
    currentYear: new Date().getFullYear()
  });
});

// Client-side error handler script
app.get('/js/error-handler.js', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(generateClientErrorHandler());
});

// Error handling middleware (must be last)
app.use(notFoundHandler());
app.use(globalErrorHandler());

// Start server function
async function startServer(): Promise<void> {
  try {
    // Connect to database
    await database.connect();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('🔥🔥🔥 MAJOR CHANGE APPLIED - IF YOU SEE THIS, BUILDS ARE WORKING! 🔥🔥🔥');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  try {
    await database.disconnect();
    console.log('👋 Server shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Received SIGTERM, shutting down...');
  await database.disconnect();
  process.exit(0);
});

// Start the server
startServer();

export { app };// Hook test comment
