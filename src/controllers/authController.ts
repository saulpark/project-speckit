import { Request, Response } from 'express';
import { AuthService, AuthError } from '../services/authService';

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

      // Authenticate user through service layer
      const authResult = await AuthService.authenticateUser(email, password);

      // Log successful authentication (without sensitive data)
      console.log(`✅ User authenticated: ${authResult.user.email} (ID: ${authResult.user.id})`);

      // Set session or token expiry based on rememberMe option
      const tokenExpiry = rememberMe ? '30d' : '24h';

      // Return success response with user data
      res.status(200).json({
        success: true,
        message: authResult.message,
        data: {
          user: authResult.user,
          session: {
            expiresIn: tokenExpiry,
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
      // In a JWT-based system, logout is primarily client-side
      // Server-side logout would involve token blacklisting if needed

      console.log('🚪 User logout requested');

      res.status(200).json({
        success: true,
        message: 'Logout successful',
        data: {
          loggedOut: true
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred during logout',
        error: 'LOGOUT_ERROR',
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

      res.status(200).json({
        success: true,
        data: {
          email,
          available,
          message: available ? 'Email is available' : 'Email is already in use'
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
      const activeUserCount = await AuthService.getActiveUserCount();

      res.status(200).json({
        success: true,
        data: {
          stats: {
            totalActiveUsers: activeUserCount,
            lastUpdated: new Date().toISOString()
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Stats error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while retrieving statistics',
        error: 'STATS_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }
}