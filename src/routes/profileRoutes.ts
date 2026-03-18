import express from 'express';
import { ProfileController } from '../controllers/profileController';
import { authenticateToken, authenticateWeb } from '../middleware/auth';
import {
  handleProfileUpdate,
  handlePasswordChange,
  sanitizeProfileInput,
  validateRateLimit
} from '../middleware/profileValidation';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// =============================================
// RATE LIMITING CONFIGURATIONS
// =============================================

// General profile operations rate limit
const profileRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window
  message: {
    success: false,
    message: 'Too many profile requests. Please try again later.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for profile view (GET requests)
    return req.method === 'GET';
  }
});

// Password change specific rate limit (more restrictive)
const passwordChangeRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 password change attempts per window
  message: {
    success: false,
    message: 'Too many password change attempts. Please wait 15 minutes before trying again.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false
});


// =============================================
// WEB ROUTES (HTML PAGES)
// =============================================

/**
 * GET /profile
 * Render user profile page
 * Requires web authentication
 */
router.get('/',
  authenticateWeb,
  ProfileController.getProfileView
);

// =============================================
// API ROUTES (JSON ENDPOINTS)
// =============================================

/**
 * GET /profile/api
 * Get user profile data (JSON)
 * Requires API authentication
 */
router.get('/api',
  authenticateToken,
  ProfileController.getProfile
);

/**
 * GET /profile/api/stats
 * Get user statistics (JSON)
 * Requires API authentication
 */
router.get('/api/stats',
  authenticateToken,
  ProfileController.getStats
);

/**
 * PUT /profile/api
 * Update user profile (JSON)
 * Requires API authentication, input sanitization, and validation
 */
router.put('/api',
  profileRateLimit,
  authenticateToken,
  sanitizeProfileInput,
  ...handleProfileUpdate,
  validateRateLimit('profileUpdate'),
  ProfileController.updateProfile
);

// =============================================
// PASSWORD MANAGEMENT ROUTES
// =============================================

/**
 * POST /profile/change-password
 * Change user password
 * Requires strong rate limiting and validation
 */
router.post('/change-password',
  passwordChangeRateLimit,
  authenticateToken,
  sanitizeProfileInput,
  ...handlePasswordChange,
  validateRateLimit('passwordChange'),
  ProfileController.changePassword
);


// =============================================
// HEALTH CHECK ROUTE
// =============================================

/**
 * GET /profile/health
 * Health check for profile service
 * Public endpoint for monitoring
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Profile service is healthy',
    service: 'profile-management',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// =============================================
// ERROR HANDLING MIDDLEWARE
// =============================================

/**
 * Profile-specific error handler
 * Catches any unhandled errors in profile routes
 */
router.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Profile route error:', {
    path: req.path,
    method: req.method,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    userId: req.user?.id || 'unauthenticated'
  });

  // Don't expose internal error details in production
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(500).json({
    success: false,
    message: isProduction ? 'Internal server error' : error.message,
    timestamp: new Date().toISOString(),
    ...(isProduction ? {} : { error: error.message, stack: error.stack })
  });
});

// =============================================
// ROUTE DOCUMENTATION
// =============================================

/**
 * Profile Routes Documentation
 *
 * Web Routes:
 * - GET  /profile              - Profile management page
 *
 * API Routes:
 * - GET  /profile/api          - Get profile data
 * - PUT  /profile/api          - Update profile
 * - GET  /profile/api/stats    - Get user statistics
 *
 * Password Management:
 * - POST /profile/change-password  - Change password
 *
 * Utility:
 * - GET  /profile/health       - Service health check
 *
 * All routes except /health require authentication.
 * Rate limiting is applied to prevent abuse.
 * Input validation and sanitization is performed on all update operations.
 */

export default router;