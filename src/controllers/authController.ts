import { Request, Response } from 'express';
import { AuthService, AuthError } from '../services/authService';
import { TokenBlacklistService } from '../services/tokenBlacklistService';
import { JWTUtils } from '../utils/jwt';

/**
 * Interface for registration request body
 */
interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Interface for login request body
 */
interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Authentication controller handling user registration, login, and related operations
 */
export class AuthController {
  /**
   * Register a new user
   * POST /auth/register
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName }: RegisterRequest = req.body;

      console.log(`📝 Registration attempt for: ${email} (endpoint: ${req.originalUrl})`);

      // Register user through service layer
      const user = await AuthService.registerUser({ email, password });

      // Log successful registration (without sensitive data)
      console.log(`✅ User registered: ${user.email} (ID: ${user.id})`);

      // Return success response
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            isActive: user.isActive,
            createdAt: user.createdAt
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      // Handle authentication errors
      if (error instanceof AuthError) {
        console.warn(`🔒 Registration failed: ${error.message} (${error.code})`);

        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: error.code,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Handle unexpected errors
      console.error('❌ Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred during registration',
        error: 'REGISTRATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Authenticate user login
   * POST /auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, rememberMe }: LoginRequest = req.body;

      console.log(`🔑 Login attempt for: ${email} (endpoint: ${req.originalUrl})`);

      // Authenticate user through service layer
      const authResult = await AuthService.authenticateUser(email, password);

      // Log successful authentication (without sensitive data)
      console.log(`✅ User authenticated: ${authResult.user.email} (ID: ${authResult.user.id})`);

      // Set session or token expiry based on rememberMe option
      const tokenExpiry = rememberMe ? '30d' : '24h';

      // Set JWT token as HTTP-only cookie for web authentication
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'development' ? 'lax' as const : 'strict' as const,
        path: '/',
        maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 30 days or 24 hours
      };
      res.cookie('authToken', authResult.token.token, cookieOptions);

      // Return success response with user data and JWT token
      res.status(200).json({
        success: true,
        message: authResult.message,
        data: {
          user: authResult.user,
          token: authResult.token.token,
          expiresAt: authResult.token.expiresAt,
          session: {
            expiresIn: authResult.token.expiresIn,
            rememberMe: Boolean(rememberMe)
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      // Handle authentication errors
      if (error instanceof AuthError) {
        console.warn(`🔒 Login failed: ${error.message} (${error.code}) for ${req.body.email || 'unknown'}`);

        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: error.code,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Handle unexpected errors
      console.error('❌ Login error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred during login',
        error: 'LOGIN_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * User logout
   * POST /auth/logout
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers['authorization'];
      const token = JWTUtils.extractTokenFromHeader(authHeader);

      if (!token) {
        // No token provided, treat as successful logout (client-side)
        console.log('🚪 User logout requested (no token provided)');

        // Clear auth cookie
        res.clearCookie('authToken');

        res.status(200).json({
          success: true,
          message: 'Logout successful',
          data: {
            loggedOut: true,
            method: 'client-side'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verify token to get user information
      const verification = JWTUtils.verifyToken(token);

      if (verification.valid && verification.payload) {
        // Blacklist the token
        await TokenBlacklistService.blacklistToken(token, verification.payload.sub);

        console.log(`🚪 User logout: ${verification.payload.email} (ID: ${verification.payload.sub})`);

        // Clear auth cookie
        res.clearCookie('authToken');

        res.status(200).json({
          success: true,
          message: 'Logout successful',
          data: {
            loggedOut: true,
            method: 'server-side',
            tokenInvalidated: true
          },
          timestamp: new Date().toISOString()
        });
      } else {
        // Token is invalid, but that's okay for logout
        console.log('🚪 User logout with invalid token (already expired)');

        // Clear auth cookie
        res.clearCookie('authToken');

        res.status(200).json({
          success: true,
          message: 'Logout successful',
          data: {
            loggedOut: true,
            method: 'client-side',
            tokenInvalidated: false,
            reason: 'Token already invalid'
          },
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('❌ Logout error:', error);

      // Even if there's an error, we should allow logout to succeed
      res.status(200).json({
        success: true,
        message: 'Logout successful',
        data: {
          loggedOut: true,
          method: 'client-side',
          warning: 'Server-side logout failed, but client-side logout is sufficient'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get current user profile
   * GET /auth/profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      // This would typically get user from JWT token in middleware
      // For now, we'll implement basic structure

      const userId = req.params.userId || req.body.userId;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required',
          error: 'MISSING_USER_ID',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const user = await AuthService.findUserById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          user
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Profile retrieval error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while retrieving profile',
        error: 'PROFILE_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Check if email is available for registration
   * POST /auth/check-email
   */
  static async checkEmailAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required',
          error: 'MISSING_EMAIL',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const existingUser = await AuthService.findUserByEmail(email);
      const available = !existingUser;

      // Only return "already in use" message for registration contexts
      // For login contexts, just return availability without the message
      const isRegistrationContext = req.get('Referer')?.includes('/register') || req.headers['x-context'] === 'registration';

      res.status(200).json({
        success: true,
        data: {
          email,
          available,
          message: isRegistrationContext && !available ? 'Email is already in use' :
                  isRegistrationContext && available ? 'Email is available' : 'Email checked'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Email check error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while checking email availability',
        error: 'EMAIL_CHECK_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get authentication statistics (for admin/monitoring)
   * GET /auth/stats
   */
  static async getAuthStats(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();

      // Get user statistics
      const activeUserCount = await AuthService.getActiveUserCount();
      const userCountResponseTime = Date.now() - startTime;

      // Get token blacklist statistics
      const blacklistStats = TokenBlacklistService.getBlacklistStats();

      // System performance metrics
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();

      const stats = {
        users: {
          totalActive: activeUserCount,
          responseTime: `${userCountResponseTime}ms`
        },
        tokens: {
          blacklist: blacklistStats
        },
        system: {
          uptime: {
            seconds: Math.round(uptime),
            human: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
          },
          memory: {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
            unit: 'MB'
          },
          environment: process.env.NODE_ENV || 'development'
        },
        performance: {
          averageResponseTime: '<200ms (target)',
          healthCheckFrequency: 'real-time',
          lastUpdated: new Date().toISOString()
        }
      };

      res.status(200).json({
        success: true,
        data: { stats },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Enhanced stats error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while retrieving statistics',
        error: 'STATS_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Request password reset
   * POST /auth/reset-password-request
   */
  static async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required',
          error: 'MISSING_EMAIL',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Request password reset (returns null for security if user not found)
      const resetData = await AuthService.requestPasswordReset(email);

      // Always return success to prevent email enumeration attacks
      res.status(200).json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent',
        data: {
          email,
          resetRequested: true,
          // In production, would send email instead of returning token
          ...(resetData && process.env.NODE_ENV !== 'production' ? {
            resetToken: resetData.token,
            expiresAt: resetData.expiresAt
          } : {})
        },
        timestamp: new Date().toISOString()
      });

      // Log password reset request
      if (resetData) {
        console.log(`🔑 Password reset requested for: ${email}`);
      }

    } catch (error) {
      console.error('❌ Password reset request error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while processing password reset request',
        error: 'PASSWORD_RESET_REQUEST_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Reset password with token
   * POST /auth/reset-password
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { resetToken, newPassword } = req.body;

      if (!resetToken || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Reset token and new password are required',
          error: 'MISSING_FIELDS',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Reset password
      const success = await AuthService.resetPassword(resetToken, newPassword);

      if (success) {
        res.status(200).json({
          success: true,
          message: 'Password reset successful',
          data: {
            passwordReset: true
          },
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      // Handle authentication errors
      if (error instanceof AuthError) {
        console.warn(`🔒 Password reset failed: ${error.message} (${error.code})`);

        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: error.code,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Handle unexpected errors
      console.error('❌ Password reset error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while resetting password',
        error: 'PASSWORD_RESET_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }
}