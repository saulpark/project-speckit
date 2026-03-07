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
import { authenticateToken, optionalAuthentication } from '../middleware/auth';

const router = express.Router();

// Apply common middleware to all auth routes
router.use(sanitizeInput);
router.use(validateRateLimit);

/**
 * @route   POST /auth/register
 * @desc    Register a new user
 * @access  Public
 * @body    { email: string, password: string, confirmPassword?: string, firstName?: string, lastName?: string }
 */
router.post('/register',
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
 * @route   POST /auth/reset-password-request
 * @desc    Request password reset (future implementation)
 * @access  Public
 * @body    { email: string }
 */
router.post('/reset-password-request',
  validatePasswordResetRequest,
  handleValidationErrors,
  (req: express.Request, res: express.Response) => {
    res.status(501).json({
      success: false,
      message: 'Password reset feature not yet implemented',
      error: 'NOT_IMPLEMENTED',
      timestamp: new Date().toISOString()
    });
  }
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
      stats: 'GET /auth/stats'
    }
  });
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