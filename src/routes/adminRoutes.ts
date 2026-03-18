import express, { Request, Response } from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticateToken, authenticateWeb } from '../middleware/auth';
import { requireAdmin, requireAdminWeb } from '../middleware/adminAuth';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// =============================================
// RATE LIMITING CONFIGURATIONS
// =============================================

// General admin operations rate limit
const adminRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 admin actions per window
  message: {
    success: false,
    message: 'Too many admin actions. Please wait before trying again.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for dashboard and read-only operations
    return req.method === 'GET' && (req.path === '/' || req.path.includes('/stats'));
  }
});

// User status change specific rate limit (more restrictive)
const adminStatusChangeLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 status changes per minute
  message: {
    success: false,
    message: 'Too many user status changes. Please wait before trying again.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false
});

// =============================================
// WEB ROUTES (HTML PAGES)
// =============================================

/**
 * GET /admin
 * Admin dashboard page
 * Requires web authentication and admin role
 */
router.get('/',
  authenticateWeb,
  requireAdminWeb,
  AdminController.getDashboard
);

/**
 * GET /admin/users
 * User management page
 * Requires web authentication and admin role
 */
router.get('/users',
  authenticateWeb,
  requireAdminWeb,
  AdminController.getUsersView
);

// =============================================
// API ROUTES (JSON ENDPOINTS)
// =============================================

// Apply admin rate limiting and authentication to all API routes
router.use('/api', adminRateLimit);
router.use('/api', authenticateToken);
router.use('/api', requireAdmin);

/**
 * GET /admin/api/stats
 * Get system statistics (JSON)
 * Requires API authentication and admin role
 */
router.get('/api/stats',
  AdminController.getSystemStats
);

/**
 * GET /admin/api/users
 * Get paginated users list with search and filtering (JSON)
 * Requires API authentication and admin role
 */
router.get('/api/users',
  AdminController.getUsers
);

/**
 * GET /admin/api/users/search
 * Search users by email or display name (JSON)
 * Requires API authentication and admin role
 */
router.get('/api/users/search',
  AdminController.searchUsers
);

/**
 * GET /admin/api/users/:id
 * Get detailed user information (JSON)
 * Requires API authentication and admin role
 */
router.get('/api/users/:id',
  AdminController.getUserDetails
);

/**
 * PUT /admin/api/users/:id/status
 * Toggle user active status (JSON)
 * Requires API authentication, admin role, and strict rate limiting
 */
router.put('/api/users/:id/status',
  adminStatusChangeLimit,
  AdminController.toggleUserStatus
);

/**
 * GET /admin/api/activity
 * Get recent system activity (JSON)
 * Requires API authentication and admin role
 */
router.get('/api/activity',
  AdminController.getRecentActivity
);

// =============================================
// HEALTH CHECK ROUTE
// =============================================

/**
 * GET /admin/health
 * Health check for admin service
 * Public endpoint for monitoring
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin service is healthy',
    service: 'admin-management',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// =============================================
// ERROR HANDLING MIDDLEWARE
// =============================================

/**
 * Admin-specific error handler
 * Catches any unhandled errors in admin routes
 */
router.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Admin route error:', {
    path: req.path,
    method: req.method,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    adminId: req.user?.id || 'unauthenticated'
  });

  // Don't expose internal error details in production
  const isProduction = process.env.NODE_ENV === 'production';

  // Check if it's an API route
  const isApiRoute = req.path.startsWith('/api/');

  if (isApiRoute) {
    // JSON response for API routes
    res.status(500).json({
      success: false,
      message: isProduction ? 'Internal server error' : error.message,
      error: 'ADMIN_SERVICE_ERROR',
      timestamp: new Date().toISOString(),
      ...(isProduction ? {} : { details: error.message, stack: error.stack })
    });
  } else {
    // HTML response for web routes
    res.status(500).render('error', {
      title: 'Admin Error - SpecKit',
      message: 'An error occurred in the admin interface',
      error: isProduction ? 'Internal server error' : error.message,
      user: req.user
    });
  }
});

// =============================================
// ROUTE DOCUMENTATION
// =============================================

/**
 * Admin Routes Documentation
 *
 * Web Routes:
 * - GET  /admin                     - Admin dashboard page
 * - GET  /admin/users               - User management page
 *
 * API Routes:
 * - GET  /admin/api/stats           - System statistics
 * - GET  /admin/api/users           - Paginated users list
 * - GET  /admin/api/users/search    - Search users
 * - GET  /admin/api/users/:id       - User details
 * - PUT  /admin/api/users/:id/status - Toggle user status
 * - GET  /admin/api/activity        - Recent activity
 *
 * Utility:
 * - GET  /admin/health              - Service health check
 *
 * All routes except /health require authentication.
 * All routes except /health require admin role.
 * Rate limiting is applied to prevent abuse.
 * API routes use JSON responses, web routes use HTML templates.
 */

export default router;