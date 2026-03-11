import express from 'express';
import { AuthController } from '../controllers/authController';
import {
  validateRegistration,
  validateLogin,
  validatePasswordResetRequest,
  handleValidationErrors,
  sanitizeInput,
  validateRateLimit
} from '../middleware/validation';
import { body } from 'express-validator';
import { authenticateToken, optionalAuthentication } from '../middleware/auth';
import { CSRFProtection, authRateLimit } from '../middleware/security';
import { TokenBlacklistService } from '../services/tokenBlacklistService';

const router = express.Router();

// Apply common middleware to all auth routes
router.use(sanitizeInput);
router.use(validateRateLimit);

// Apply auth-specific rate limiting to sensitive endpoints
router.use(['/login', '/register', '/reset-password-request'], authRateLimit);

/**
 * @route   POST /auth/register
 * @desc    Register a new user
 * @access  Public
 * @body    { email: string, password: string, confirmPassword?: string, firstName?: string, lastName?: string }
 */
router.post('/register',
  CSRFProtection.verifyTokenMiddleware(),
  validateRegistration,
  handleValidationErrors,
  AuthController.register
);

/**
 * @route   POST /auth/login
 * @desc    Authenticate user and return session info
 * @access  Public
 * @body    { email: string, password: string, rememberMe?: boolean }
 */
router.post('/login',
  CSRFProtection.verifyTokenMiddleware(),
  validateLogin,
  handleValidationErrors,
  AuthController.login
);

/**
 * @route   POST /auth/logout
 * @desc    Logout user (primarily client-side for JWT)
 * @access  Public
 * @body    {}
 */
router.post('/logout', AuthController.logout);

/**
 * @route   POST /auth/check-email
 * @desc    Check if email is available for registration
 * @access  Public
 * @body    { email: string }
 */
router.post('/check-email', AuthController.checkEmailAvailability);

/**
 * @route   GET /auth/profile/:userId
 * @route   GET /auth/profile
 * @desc    Get user profile information
 * @access  Protected - requires valid JWT token
 * @params  userId (optional)
 */
router.get('/profile/:userId', authenticateToken, AuthController.getProfile);
router.get('/profile', authenticateToken, AuthController.getProfile);

/**
 * @route   GET /auth/stats
 * @desc    Get authentication statistics
 * @access  Protected - requires authentication
 */
router.get('/stats', authenticateToken, AuthController.getAuthStats);

/**
 * @route   GET /auth/me
 * @desc    Get current authenticated user information
 * @access  Protected - requires valid JWT token
 */
router.get('/me', authenticateToken, (req: express.Request, res: express.Response) => {
  const authReq = req as any; // AuthenticatedRequest
  res.json({
    success: true,
    message: 'User information retrieved successfully',
    data: {
      user: authReq.user,
      tokenPayload: {
        sub: authReq.tokenPayload?.sub,
        email: authReq.tokenPayload?.email,
        iat: authReq.tokenPayload?.iat,
        exp: authReq.tokenPayload?.exp
      }
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   GET /auth/login
 * @desc    Display login form
 * @access  Public
 */
router.get('/login', (req: express.Request, res: express.Response) => {
  res.render('auth/login', {
    pageTitle: 'Sign In',
    bodyClass: 'auth-page',
    description: 'Sign in to your SpecKit account',
    showAuthLinks: false,
    currentYear: new Date().getFullYear()
  });
});

/**
 * @route   GET /auth/register
 * @desc    Display registration form
 * @access  Public
 */
router.get('/register', (req: express.Request, res: express.Response) => {
  res.render('auth/register', {
    pageTitle: 'Create Account',
    bodyClass: 'auth-page',
    description: 'Create your SpecKit account',
    showAuthLinks: false,
    currentYear: new Date().getFullYear()
  });
});

/**
 * @route   GET /dashboard
 * @desc    Display authenticated user dashboard
 * @access  Protected - requires authentication
 */
router.get('/dashboard', authenticateToken, (req: express.Request, res: express.Response) => {
  const authReq = req as any; // AuthenticatedRequest

  res.render('dashboard', {
    pageTitle: 'Dashboard',
    bodyClass: 'dashboard-page',
    description: 'SpecKit Dashboard - Authentication System',
    showAuthLinks: true,
    user: authReq.user,
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    currentTime: new Date().toLocaleString(),
    uptime: process.uptime(),
    currentYear: new Date().getFullYear()
  });
});

/**
 * @route   POST /auth/reset-password-request
 * @desc    Request password reset token
 * @access  Public
 * @body    { email: string }
 */
router.post('/reset-password-request',
  validatePasswordResetRequest,
  handleValidationErrors,
  AuthController.requestPasswordReset
);

/**
 * @route   POST /auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 * @body    { resetToken: string, newPassword: string }
 */
router.post('/reset-password',
  // Add validation for reset password fields
  body('resetToken').notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  handleValidationErrors,
  AuthController.resetPassword
);

// Health check endpoint specific to auth routes
router.get('/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({
    success: true,
    message: 'Authentication service is healthy',
    service: 'auth-routes',
    timestamp: new Date().toISOString(),
    endpoints: {
      register: 'POST /auth/register',
      login: 'POST /auth/login',
      logout: 'POST /auth/logout',
      checkEmail: 'POST /auth/check-email',
      profile: 'GET /auth/profile[/:userId]',
      stats: 'GET /auth/stats',
      resetPasswordRequest: 'POST /auth/reset-password-request',
      resetPassword: 'POST /auth/reset-password',
      adminStatus: 'GET /auth/admin/status'
    }
  });
});

/**
 * @route   GET /auth/admin/status
 * @desc    Get detailed system status for administrators
 * @access  Protected - requires authentication
 */
router.get('/admin/status', authenticateToken, (req: express.Request, res: express.Response) => {
  try {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    const blacklistStats = TokenBlacklistService.getBlacklistStats();

    const adminStatus = {
      service: 'authentication-system',
      version: '1.0.0',
      status: 'operational',
      timestamp: new Date().toISOString(),
      system: {
        uptime: {
          seconds: Math.round(uptime),
          human: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
          startedAt: new Date(Date.now() - uptime * 1000).toISOString()
        },
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          heapUsedPercent: `${Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)}%`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
        },
        environment: {
          nodeEnv: process.env.NODE_ENV || 'development',
          nodeVersion: process.version,
          platform: process.platform,
          architecture: process.arch
        }
      },
      authentication: {
        tokenBlacklist: blacklistStats,
        endpoints: {
          total: 12,
          protected: 6,
          public: 6
        },
        security: {
          rateLimiting: 'active',
          csrfProtection: process.env.NODE_ENV !== 'test' ? 'active' : 'disabled-for-tests',
          jwtValidation: 'active',
          passwordHashing: 'bcrypt-12-rounds'
        }
      },
      features: {
        userRegistration: 'active',
        userLogin: 'active',
        tokenBlacklisting: 'active',
        passwordReset: 'active',
        profileManagement: 'active',
        emailValidation: 'active'
      },
      monitoring: {
        healthChecks: 'active',
        performanceTracking: 'active',
        errorLogging: 'active',
        securityLogging: 'active'
      }
    };

    res.status(200).json({
      success: true,
      data: adminStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Admin status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving admin status',
      error: 'ADMIN_STATUS_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Temporary test endpoint to generate JWT tokens for testing
router.get('/test-token', (req: express.Request, res: express.Response) => {
  const { JWTUtils } = require('../utils/jwt');

  const testToken = JWTUtils.generateToken('test-user-123', 'test@example.com');

  res.status(200).json({
    success: true,
    message: 'Test token generated for logout testing',
    data: {
      token: testToken.token,
      expiresAt: testToken.expiresAt,
      expiresIn: testToken.expiresIn,
      usage: 'Use this token in Authorization header as: Bearer <token>'
    },
    timestamp: new Date().toISOString()
  });
});

// Export the configured router
export default router;