import { Request, Response } from 'express';
import { UserService, UserError } from '../services/userService';
import { TokenBlacklistService } from '../services/tokenBlacklistService';

/**
 * Profile Controller
 * Handles user profile management including viewing, updating, password changes, and account management
 */
export class ProfileController {

  // =============================================
  // PROFILE VIEW AND DATA METHODS
  // =============================================

  /**
   * Render the profile management page
   * GET /profile
   */
  static async getProfileView(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).redirect('/auth/login');
        return;
      }

      const userId = req.user.id;

      // Get user profile and statistics
      const [profile, stats] = await Promise.all([
        UserService.getProfile(userId),
        UserService.getUserStats(userId)
      ]);

      res.render('profile/index', {
        title: 'Profile - SpecKit',
        user: req.user,
        profile,
        stats,
        messages: {
          success: req.query.success ? req.query.message : null,
          error: req.query.error ? req.query.message : null
        }
      });

    } catch (error) {
      console.error('Profile view error:', error);
      res.status(500).render('error', {
        title: 'Error - SpecKit',
        message: 'Unable to load profile page',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get user profile data (JSON API)
   * GET /profile/api
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const userId = req.user.id;
      const profile = await UserService.getProfile(userId);

      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: { profile },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get profile API error:', error);

      if (error instanceof UserError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.code,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get user statistics (JSON API)
   * GET /profile/api/stats
   */
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const userId = req.user.id;
      const stats = await UserService.getUserStats(userId);

      res.status(200).json({
        success: true,
        message: 'Statistics retrieved successfully',
        data: { stats },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get stats API error:', error);

      if (error instanceof UserError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.code,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }

  // =============================================
  // PROFILE UPDATE METHODS
  // =============================================

  /**
   * Update user profile (JSON API)
   * PUT /profile/api
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const userId = req.user.id;
      const { displayName } = req.body;

      // Update profile
      await UserService.updateProfile(userId, { displayName });

      // Log security event
      console.log(`Profile updated: User ${userId} updated profile`, {
        userId,
        fields: ['displayName'],
        timestamp: new Date(),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Update profile API error:', error);

      if (error instanceof UserError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.code,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }

  // =============================================
  // PASSWORD MANAGEMENT METHODS
  // =============================================

  /**
   * Change user password
   * POST /profile/change-password
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      // Change password
      await UserService.changePassword(userId, currentPassword, newPassword);

      // Blacklist all existing tokens for this user
      await TokenBlacklistService.blacklistAllUserTokens(userId);

      // Log security event
      console.log(`Password changed: User ${userId}`, {
        userId,
        timestamp: new Date(),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully. Please log in again.',
        requiresReauth: true,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Change password error:', error);

      if (error instanceof UserError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.code,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }

}

/**
 * Error handler helper for consistent error responses
 */
export function handleProfileError(error: unknown, res: Response, operation: string): void {
  console.error(`Profile ${operation} error:`, error);

  if (error instanceof UserError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });
    return;
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    timestamp: new Date().toISOString()
  });
}