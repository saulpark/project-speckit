import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { engine } from 'express-handlebars';
import path from 'path';
import { database } from './config/database';
import authRoutes from './routes/authRoutes';
import noteRoutes from './routes/noteRoutes';
import {
  CSRFProtection,
  generalRateLimit,
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
app.use(IPBlacklist.middleware()); // Block blacklisted IPs first
app.use(generalRateLimit); // Apply general rate limiting
app.use(requestSizeLimit()); // Limit request payload size
app.use(helmet()); // Basic security headers
app.use(securityHeaders()); // Additional security headers
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
    formatDate: (date: Date) => date.toLocaleDateString(),
    capitalize: (str: string) => str.charAt(0).toUpperCase() + str.slice(1)
  }
}));

app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, '../views'));

// Authentication routes
app.use('/auth', authRoutes);

// Notes routes
app.use('/notes', noteRoutes);

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
