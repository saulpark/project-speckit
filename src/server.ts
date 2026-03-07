import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { database } from './config/database';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true,
}));

// Request logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    const dbHealth = await database.healthCheck();

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'project-speckit-auth',
      version: '1.0.0',
      database: dbHealth
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'project-speckit-auth',
      version: '1.0.0',
      error: 'Database health check failed'
    });
  }
});

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Project SpecKit - Authentication System',
    status: 'running',
    version: '1.0.0'
  });
});

// Global error handling middleware
interface AppError extends Error {
  status?: number;
}

app.use((err: AppError, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`Error ${status}: ${message}`);

  res.status(status).json({
    error: message,
    status,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    status: 404,
    path: req.originalUrl
  });
});

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

export { app };