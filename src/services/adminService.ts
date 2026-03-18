import { User } from '../models/User';
import { Note } from '../models/Note';
import mongoose from 'mongoose';

/**
 * Interface for paginated user results
 */
export interface PaginatedUsers {
  users: UserWithStats[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalUsers: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    limit: number;
  };
}

/**
 * Interface for user with statistics
 */
export interface UserWithStats {
  _id: string;
  email: string;
  displayName?: string | null;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date | null;
  passwordChangedAt?: Date | null;
  noteCount: number;
  publicNotesCount: number;
  sharedNotesCount: number;
}

/**
 * Interface for system statistics
 */
export interface SystemStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    admins: number;
    newThisWeek: number;
    newToday: number;
  };
  notes: {
    total: number;
    public: number;
    shared: number;
    createdToday: number;
    createdThisWeek: number;
  };
  activity: {
    activeUsersToday: number;
    activeUsersThisWeek: number;
    averageNotesPerUser: number;
  };
}

/**
 * Admin Service
 * Handles administrative operations and system statistics
 */
export class AdminService {

  /**
   * Get paginated list of all users with search and filtering
   */
  static async getAllUsers(
    page: number = 1,
    limit: number = 20,
    search?: string,
    status?: 'active' | 'inactive',
    role?: 'user' | 'admin'
  ): Promise<PaginatedUsers> {
    try {
      // Build query filter
      const filter: any = {};

      // Add search filter (email or display name)
      if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        filter.$or = [
          { email: { $regex: searchRegex } },
          { displayName: { $regex: searchRegex } }
        ];
      }

      // Add status filter
      if (status === 'active') {
        filter.isActive = true;
      } else if (status === 'inactive') {
        filter.isActive = false;
      }

      // Add role filter
      if (role) {
        filter.role = role;
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Get total count for pagination
      const totalUsers = await User.countDocuments(filter);
      const totalPages = Math.ceil(totalUsers / limit);

      // Get users with basic info
      const users = await User.find(filter)
        .select('email displayName role isActive createdAt lastLoginAt passwordChangedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      // Get note counts for each user
      const userIds = users.map(user => user._id);

      // Aggregate note counts
      const noteCounts = await Note.aggregate([
        { $match: { userId: { $in: userIds } } },
        {
          $group: {
            _id: '$userId',
            totalNotes: { $sum: 1 },
            publicNotes: {
              $sum: {
                $cond: [{ $eq: ['$isPublic', true] }, 1, 0]
              }
            },
            sharedNotes: {
              $sum: {
                $cond: [{ $gt: [{ $size: { $ifNull: ['$sharedWith', []] } }, 0] }, 1, 0]
              }
            }
          }
        }
      ]);

      // Combine user data with note statistics
      const usersWithStats: UserWithStats[] = users.map(user => {
        const noteStats = noteCounts.find(stats => stats._id.equals(user._id));

        return {
          _id: user._id.toString(),
          email: user.email,
          displayName: user.displayName || null,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt || null,
          passwordChangedAt: user.passwordChangedAt || null,
          noteCount: noteStats?.totalNotes || 0,
          publicNotesCount: noteStats?.publicNotes || 0,
          sharedNotesCount: noteStats?.sharedNotes || 0
        };
      });

      return {
        users: usersWithStats,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
          limit
        }
      };

    } catch (error) {
      console.error('❌ AdminService.getAllUsers error:', error);
      throw new Error('Failed to retrieve users');
    }
  }

  /**
   * Get comprehensive system statistics
   */
  static async getSystemStats(): Promise<SystemStats> {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

      // User statistics
      const [
        totalUsers,
        activeUsers,
        inactiveUsers,
        adminUsers,
        newUsersThisWeek,
        newUsersToday
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        User.countDocuments({ isActive: false }),
        User.countDocuments({ role: 'admin' }),
        User.countDocuments({ createdAt: { $gte: weekStart } }),
        User.countDocuments({ createdAt: { $gte: todayStart } })
      ]);

      // Note statistics
      const [
        totalNotes,
        publicNotes,
        sharedNotes,
        notesCreatedToday,
        notesCreatedThisWeek
      ] = await Promise.all([
        Note.countDocuments(),
        Note.countDocuments({ isPublic: true }),
        Note.countDocuments({ 'sharedWith.0': { $exists: true } }),
        Note.countDocuments({ createdAt: { $gte: todayStart } }),
        Note.countDocuments({ createdAt: { $gte: weekStart } })
      ]);

      // Activity statistics
      const [
        activeUsersToday,
        activeUsersThisWeek
      ] = await Promise.all([
        User.countDocuments({
          lastLoginAt: { $gte: todayStart },
          isActive: true
        }),
        User.countDocuments({
          lastLoginAt: { $gte: weekStart },
          isActive: true
        })
      ]);

      const averageNotesPerUser = activeUsers > 0 ? Math.round((totalNotes / activeUsers) * 100) / 100 : 0;

      return {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers,
          admins: adminUsers,
          newThisWeek: newUsersThisWeek,
          newToday: newUsersToday
        },
        notes: {
          total: totalNotes,
          public: publicNotes,
          shared: sharedNotes,
          createdToday: notesCreatedToday,
          createdThisWeek: notesCreatedThisWeek
        },
        activity: {
          activeUsersToday: activeUsersToday,
          activeUsersThisWeek: activeUsersThisWeek,
          averageNotesPerUser: averageNotesPerUser
        }
      };

    } catch (error) {
      console.error('❌ AdminService.getSystemStats error:', error);
      throw new Error('Failed to calculate system statistics');
    }
  }

  /**
   * Toggle user active status
   */
  static async toggleUserStatus(
    adminId: string,
    targetUserId: string
  ): Promise<{ success: boolean; newStatus: boolean; user: any }> {
    try {
      // Prevent admins from deactivating themselves
      if (adminId === targetUserId) {
        throw new Error('Cannot modify your own account status');
      }

      // Find the target user
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        throw new Error('User not found');
      }

      // Prevent deactivating other admin users (safety measure)
      if (targetUser.role === 'admin' && targetUser.isActive) {
        throw new Error('Cannot deactivate admin users');
      }

      // Toggle the status
      const newStatus = !targetUser.isActive;
      await User.findByIdAndUpdate(targetUserId, {
        isActive: newStatus,
        updatedAt: new Date()
      });

      // Log the admin action
      console.log('👑 Admin action: User status toggled', {
        adminId,
        targetUserId,
        targetEmail: targetUser.email,
        oldStatus: targetUser.isActive,
        newStatus,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        newStatus,
        user: {
          _id: targetUser._id.toString(),
          email: targetUser.email,
          isActive: newStatus
        }
      };

    } catch (error) {
      console.error('❌ AdminService.toggleUserStatus error:', error);
      throw error;
    }
  }

  /**
   * Get detailed user information with statistics
   */
  static async getUserWithStats(userId: string): Promise<UserWithStats | null> {
    try {
      // Get user basic info
      const user = await User.findById(userId)
        .select('email displayName role isActive createdAt lastLoginAt passwordChangedAt')
        .lean();

      if (!user) {
        return null;
      }

      // Get note statistics for this user
      const noteStats = await Note.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalNotes: { $sum: 1 },
            publicNotes: {
              $sum: {
                $cond: [{ $eq: ['$isPublic', true] }, 1, 0]
              }
            },
            sharedNotes: {
              $sum: {
                $cond: [{ $gt: [{ $size: { $ifNull: ['$sharedWith', []] } }, 0] }, 1, 0]
              }
            }
          }
        }
      ]);

      const stats = noteStats[0] || { totalNotes: 0, publicNotes: 0, sharedNotes: 0 };

      return {
        _id: user._id.toString(),
        email: user.email,
        displayName: user.displayName || null,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt || null,
        passwordChangedAt: user.passwordChangedAt || null,
        noteCount: stats.totalNotes,
        publicNotesCount: stats.publicNotes,
        sharedNotesCount: stats.sharedNotes
      };

    } catch (error) {
      console.error('❌ AdminService.getUserWithStats error:', error);
      throw new Error('Failed to get user details');
    }
  }

  /**
   * Search users by email or display name
   */
  static async searchUsers(
    query: string,
    limit: number = 10
  ): Promise<{ _id: string; email: string; displayName?: string | null; role: string }[]> {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }

      const searchRegex = new RegExp(query.trim(), 'i');

      const users = await User.find({
        $or: [
          { email: { $regex: searchRegex } },
          { displayName: { $regex: searchRegex } }
        ],
        isActive: true
      })
        .select('email displayName role')
        .limit(limit)
        .lean();

      return users.map(user => ({
        _id: user._id.toString(),
        email: user.email,
        displayName: user.displayName || null,
        role: user.role
      }));

    } catch (error) {
      console.error('❌ AdminService.searchUsers error:', error);
      throw new Error('Failed to search users');
    }
  }

  /**
   * Get recent activity summary
   */
  static async getRecentActivity(days: number = 7): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [newUsers, newNotes, recentLogins] = await Promise.all([
        User.find({ createdAt: { $gte: startDate } })
          .select('email createdAt')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),

        Note.find({ createdAt: { $gte: startDate } })
          .populate('userId', 'email')
          .select('title createdAt userId')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),

        User.find({
          lastLoginAt: { $gte: startDate },
          isActive: true
        })
          .select('email lastLoginAt')
          .sort({ lastLoginAt: -1 })
          .limit(10)
          .lean()
      ]);

      return {
        newUsers,
        newNotes,
        recentLogins
      };

    } catch (error) {
      console.error('❌ AdminService.getRecentActivity error:', error);
      throw new Error('Failed to get recent activity');
    }
  }
}