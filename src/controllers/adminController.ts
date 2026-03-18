import { Request, Response } from 'express';
import { AdminService, SystemStats, PaginatedUsers, UserWithStats } from '../services/adminService';

/**
 * Safely extract string value from query parameter
 */
function getQueryString(value: any): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

/**
 * Safely extract integer value from query parameter
 */
function getQueryInt(value: any, defaultValue: number): number {
  const str = getQueryString(value);
  const parsed = parseInt(str || '');
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Admin Controller
 * Handles all administrative HTTP requests including dashboard, user management, and statistics
 */
export class AdminController {

  // =============================================
  // WEB PAGE CONTROLLERS
  // =============================================

  /**
   * Render admin dashboard
   * GET /admin
   */
  static async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).redirect('/auth/login');
        return;
      }

      console.log('📊 Admin dashboard requested', {
        adminId: req.user.id,
        email: req.user.email,
        timestamp: new Date().toISOString()
      });

      // Get system statistics for dashboard
      const stats = await AdminService.getSystemStats();
      const recentActivity = await AdminService.getRecentActivity(7);

      // Calculate percentage values for display
      const activePercentage = stats.users.total > 0
        ? Math.round((stats.users.active / stats.users.total) * 100)
        : 0;

      const sharedPercentage = stats.notes.total > 0
        ? Math.round((stats.notes.shared / stats.notes.total) * 100)
        : 0;

      res.render('admin/dashboard', {
        title: 'Admin Dashboard - SpecKit',
        user: req.user,
        stats: {
          ...stats,
          activePercentage,
          sharedPercentage
        },
        recentActivity,
        messages: {
          success: req.query.success ? req.query.message : null,
          error: req.query.error ? req.query.message : null
        }
      });

    } catch (error) {
      console.error('❌ Admin dashboard error:', error);

      res.status(500).render('error', {
        title: 'Error - SpecKit',
        message: 'Unable to load admin dashboard',
        error: error instanceof Error ? error.message : 'Unknown error',
        user: req.user
      });
    }
  }

  /**
   * Render user management page
   * GET /admin/users
   */
  static async getUsersView(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).redirect('/auth/login');
        return;
      }

      console.log('👥 Admin user management requested', {
        adminId: req.user.id,
        email: req.user.email,
        timestamp: new Date().toISOString()
      });

      res.render('admin/users', {
        title: 'User Management - SpecKit',
        user: req.user,
        messages: {
          success: req.query.success ? req.query.message : null,
          error: req.query.error ? req.query.message : null
        }
      });

    } catch (error) {
      console.error('❌ Admin users view error:', error);

      res.status(500).render('error', {
        title: 'Error - SpecKit',
        message: 'Unable to load user management page',
        error: error instanceof Error ? error.message : 'Unknown error',
        user: req.user
      });
    }
  }

  // =============================================
  // API ENDPOINTS
  // =============================================

  /**
   * Get paginated users list with search and filtering
   * GET /admin/users/api
   */
  static async getUsers(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Parse query parameters
      const page = getQueryInt(req.query.page, 1);
      const limit = Math.min(getQueryInt(req.query.limit, 20), 100); // Max 100 per page
      const search = getQueryString(req.query.search);
      const status = getQueryString(req.query.status) as 'active' | 'inactive' | undefined;
      const role = getQueryString(req.query.role) as 'user' | 'admin' | undefined;

      console.log('📋 Admin users list requested', {
        adminId: req.user.id,
        page,
        limit,
        search,
        status,
        role,
        timestamp: new Date().toISOString()
      });

      // Get paginated users
      const result = await AdminService.getAllUsers(page, limit, search, status, role);

      res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        data: result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Admin get users API error:', error);

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve users',
        error: 'USER_RETRIEVAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Toggle user active status
   * PUT /admin/users/:id/status
   */
  static async toggleUserStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const targetUserId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const adminId = req.user.id;

      console.log('⚙️ Admin user status toggle requested', {
        adminId,
        targetUserId,
        timestamp: new Date().toISOString()
      });

      // Toggle user status
      const result = await AdminService.toggleUserStatus(adminId, targetUserId);

      res.status(200).json({
        success: true,
        message: `User ${result.newStatus ? 'activated' : 'deactivated'} successfully`,
        data: {
          user: result.user,
          newStatus: result.newStatus
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Admin toggle user status error:', error);

      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('Cannot modify your own account')) {
          res.status(400).json({
            success: false,
            message: 'Cannot modify your own account status',
            error: 'SELF_MODIFICATION_ERROR',
            timestamp: new Date().toISOString()
          });
          return;
        }

        if (error.message.includes('Cannot deactivate admin users')) {
          res.status(400).json({
            success: false,
            message: 'Cannot deactivate admin users',
            error: 'ADMIN_DEACTIVATION_ERROR',
            timestamp: new Date().toISOString()
          });
          return;
        }

        if (error.message.includes('User not found')) {
          res.status(404).json({
            success: false,
            message: 'User not found',
            error: 'USER_NOT_FOUND',
            timestamp: new Date().toISOString()
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update user status',
        error: 'STATUS_UPDATE_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get detailed user information
   * GET /admin/users/:id
   */
  static async getUserDetails(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      console.log('🔍 Admin user details requested', {
        adminId: req.user.id,
        targetUserId: userId,
        timestamp: new Date().toISOString()
      });

      // Get user details with statistics
      const userDetails = await AdminService.getUserWithStats(userId);

      if (!userDetails) {
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
        message: 'User details retrieved successfully',
        data: { user: userDetails },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Admin get user details error:', error);

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user details',
        error: 'USER_DETAILS_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get system statistics
   * GET /admin/stats/api
   */
  static async getSystemStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log('📊 Admin system stats requested', {
        adminId: req.user.id,
        timestamp: new Date().toISOString()
      });

      // Get comprehensive system statistics
      const stats = await AdminService.getSystemStats();

      res.status(200).json({
        success: true,
        message: 'System statistics retrieved successfully',
        data: { stats },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Admin get system stats error:', error);

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve system statistics',
        error: 'STATS_RETRIEVAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Search users
   * GET /admin/users/search
   */
  static async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const query = getQueryString(req.query.q);
      const limit = Math.min(getQueryInt(req.query.limit, 10), 20);

      if (!query || typeof query !== 'string' || query.trim().length < 2) {
        res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters',
          error: 'INVALID_SEARCH_QUERY',
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log('🔍 Admin user search requested', {
        adminId: req.user.id,
        query,
        limit,
        timestamp: new Date().toISOString()
      });

      const users = await AdminService.searchUsers(query, limit);

      res.status(200).json({
        success: true,
        message: 'User search completed',
        data: { users, query },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Admin search users error:', error);

      res.status(500).json({
        success: false,
        message: 'Failed to search users',
        error: 'USER_SEARCH_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get recent activity
   * GET /admin/activity/api
   */
  static async getRecentActivity(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const days = Math.min(getQueryInt(req.query.days, 7), 30); // Max 30 days

      console.log('📈 Admin recent activity requested', {
        adminId: req.user.id,
        days,
        timestamp: new Date().toISOString()
      });

      const activity = await AdminService.getRecentActivity(days);

      res.status(200).json({
        success: true,
        message: 'Recent activity retrieved successfully',
        data: { activity, period: `${days} days` },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Admin get recent activity error:', error);

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve recent activity',
        error: 'ACTIVITY_RETRIEVAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }
}