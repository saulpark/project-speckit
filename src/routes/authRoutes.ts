import express from 'express';
import { AuthController } from '../controllers/authController';
import {
  validateRegistration,
  validateLogin,
  validatePasswordResetRequest,
  handleValidationErrors,
  sanitizeInput
} from '../middleware/validation';
import { body } from 'express-validator';
import { authenticateToken, authenticateWeb, optionalAuthentication } from '../middleware/auth';
import { CSRFProtection } from '../middleware/security';
import { TokenBlacklistService } from '../services/tokenBlacklistService';

const router = express.Router();

// Apply common middleware to all auth routes
router.use(sanitizeInput);

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
router.get('/me', optionalAuthentication, (req: express.Request, res: express.Response) => {
  const authReq = req as any; // AuthenticatedRequest

  if (!authReq.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated',
      error: 'NOT_AUTHENTICATED',
      timestamp: new Date().toISOString()
    });
  }

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
router.get('/dashboard', authenticateWeb, (req: express.Request, res: express.Response) => {
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

/**
 * @route   GET /auth/test-registration
 * @desc    Test registration functionality
 * @access  Public
 */
router.get('/test-registration', (req: express.Request, res: express.Response) => {
  res.send(`
    <!DOCTYPE html>
    <html><head><title>Registration Test</title></head><body>
    <h2>🧪 Registration Test</h2>
    <p>Test if registration API is working</p>
    <form id="regForm" style="max-width: 400px; font-family: Arial, sans-serif;">
      <div style="margin: 15px 0;">
        <label><strong>Email:</strong></label><br>
        <input type="email" id="email" placeholder="test@example.com" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;" required>
      </div>
      <div style="margin: 15px 0;">
        <label><strong>Password:</strong></label><br>
        <input type="password" id="password" placeholder="Password123!" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;" required>
        <small style="color: #666;">Must be 8+ characters with numbers and symbols</small>
      </div>
      <button type="submit" style="padding: 12px 24px; background: #4361ee; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">Test Registration</button>
    </form>
    <div id="result" style="margin-top: 20px; padding: 15px; border-radius: 4px; display: none;"></div>

    <script>
      // Get CSRF token from meta tag or generate one
      let csrfToken = null;

      // First, get the CSRF token by making a GET request
      async function getCSRFToken() {
        try {
          const response = await fetch('/auth/register', {
            method: 'GET'
          });
          return response.headers.get('X-CSRF-Token');
        } catch (error) {
          console.error('Failed to get CSRF token:', error);
          return null;
        }
      }

      document.getElementById('regForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const resultDiv = document.getElementById('result');
        const submitBtn = document.querySelector('button[type="submit"]');

        submitBtn.textContent = 'Testing...';
        submitBtn.disabled = true;

        // Get CSRF token if we don't have one
        if (!csrfToken) {
          csrfToken = await getCSRFToken();
        }

        try {
          const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          };

          // Add CSRF token if available
          if (csrfToken) {
            headers['X-CSRF-Token'] = csrfToken;
          }

          const response = await fetch('/auth/register', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ email, password })
          });

          const data = await response.json();

          if (response.ok && data.success) {
            resultDiv.innerHTML = '✅ <strong>Registration successful!</strong><br>User: ' + data.data.user.email;
            resultDiv.style.background = '#c6f6d5';
            resultDiv.style.color = '#22543d';
            resultDiv.style.border = '1px solid #38a169';
          } else {
            resultDiv.innerHTML = '❌ <strong>Registration failed:</strong><br>' + (data.message || 'Unknown error') + '<br><small>Error code: ' + (data.error || 'N/A') + '</small>';
            resultDiv.style.background = '#fed7d7';
            resultDiv.style.color = '#e53e3e';
            resultDiv.style.border = '1px solid #e53e3e';
          }
        } catch (error) {
          resultDiv.innerHTML = '❌ <strong>Network error:</strong><br>' + error.message;
          resultDiv.style.background = '#fed7d7';
          resultDiv.style.color = '#e53e3e';
          resultDiv.style.border = '1px solid #e53e3e';
        }

        resultDiv.style.display = 'block';
        submitBtn.textContent = 'Test Registration';
        submitBtn.disabled = false;
      });
    </script>
    <hr style="margin: 30px 0;">
    <h3>Navigation</h3>
    <p><a href="/auth/register" style="color: #4361ee;">→ Go to real registration page</a></p>
    <p><a href="/auth/login" style="color: #4361ee;">→ Go to login page</a></p>
    <p><a href="/auth/dashboard" style="color: #4361ee;">→ Go to dashboard</a></p>
    </body></html>
  `);
});

// Export the configured router
export default router;