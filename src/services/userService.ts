import { User, IUser } from '../models/User';
import bcrypt from 'bcrypt';
import { Note } from '../models/Note';

/**
 * Custom error types for user operations
 */
export class UserError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'UserError';
  }
}

/**
 * User data transfer objects for sharing operations
 */
export interface UserSharingInfo {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User profile data transfer objects
 */
export interface UserProfileData {
  id: string;
  email: string;
  displayName: string | null;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface UserStatsData {
  noteCount: number;
  sharedNotesCount: number;
  publicNotesCount: number;
  memberSince: Date;
}

export interface ProfileUpdateData {
  displayName?: string;
}

export interface PaginatedUsers {
  users: UserWithStats[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserWithStats extends UserProfileData {
  noteCount: number;
  lastPasswordChange: Date | null;
}

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminUsers: number;
  totalNotes: number;
  publicNotes: number;
  sharedNotes: number;
}

/**
 * Service layer for user lookup and validation in sharing operations
 */
export class UserService {

  /**
   * Find an active user by email (for sharing operations)
   * Returns user without sensitive information like password hash
   */
  static async findUserByEmail(email: string): Promise<UserSharingInfo | null> {
    try {
      // Validate email format
      if (!UserService.isValidEmail(email)) {
        throw new UserError(
          'Invalid email format',
          'INVALID_EMAIL',
          400
        );
      }

      const user = await User.findOne({
        email: email.toLowerCase().trim(),
        isActive: true
      }).select('email isActive createdAt updatedAt');

      if (!user) {
        return null;
      }

      return {
        id: user._id.toString(),
        email: user.email,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      throw new UserError(
        'Error occurred while looking up user',
        'USER_LOOKUP_ERROR',
        500
      );
    }
  }

  /**
   * Find an active user by ID (for sharing operations)
   * Returns user without sensitive information like password hash
   */
  static async findUserById(userId: string): Promise<UserSharingInfo | null> {
    try {
      const user = await User.findOne({
        _id: userId,
        isActive: true
      }).select('email isActive createdAt updatedAt');

      if (!user) {
        return null;
      }

      return {
        id: user._id.toString(),
        email: user.email,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

    } catch (error) {
      throw new UserError(
        'Error occurred while looking up user by ID',
        'USER_LOOKUP_ERROR',
        500
      );
    }
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }

    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.toLowerCase().trim());
  }

  /**
   * Validate that an email exists and belongs to an active user
   * Throws descriptive errors for different scenarios
   */
  static async validateUserForSharing(email: string): Promise<UserSharingInfo> {
    if (!UserService.isValidEmail(email)) {
      throw new UserError(
        'Please provide a valid email address',
        'INVALID_EMAIL',
        400
      );
    }

    const user = await UserService.findUserByEmail(email);

    if (!user) {
      throw new UserError(
        'No active user found with this email address',
        'USER_NOT_FOUND',
        404
      );
    }

    if (!user.isActive) {
      throw new UserError(
        'This user account is not active',
        'USER_INACTIVE',
        400
      );
    }

    return user;
  }

  /**
   * Batch lookup users by email for bulk sharing operations
   */
  static async findUsersByEmails(emails: string[]): Promise<{ found: UserSharingInfo[]; notFound: string[] }> {
    const found: UserSharingInfo[] = [];
    const notFound: string[] = [];

    for (const email of emails) {
      try {
        const user = await UserService.findUserByEmail(email);
        if (user) {
          found.push(user);
        } else {
          notFound.push(email);
        }
      } catch (error) {
        notFound.push(email);
      }
    }

    return { found, notFound };
  }

  /**
   * Get basic user information for note sharing display
   * Used to show who notes are shared with
   */
  static async getUserSharingDisplayInfo(userIds: string[]): Promise<UserSharingInfo[]> {
    try {
      const users = await User.find({
        _id: { $in: userIds },
        isActive: true
      }).select('email isActive createdAt updatedAt');

      return users.map(user => ({
        id: user._id.toString(),
        email: user.email,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));

    } catch (error) {
      throw new UserError(
        'Error occurred while retrieving user sharing information',
        'USER_SHARING_INFO_ERROR',
        500
      );
    }
  }

  // =============================================
  // PROFILE MANAGEMENT METHODS
  // =============================================

  /**
   * Get user profile with complete information
   */
  static async getProfile(userId: string): Promise<UserProfileData> {
    try {
      const user = await User.findById(userId).select('email displayName role isActive createdAt updatedAt lastLoginAt');

      if (!user) {
        throw new UserError(
          'User not found',
          'USER_NOT_FOUND',
          404
        );
      }

      return {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName || null,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt || null,
      };

    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      throw new UserError(
        'Error occurred while retrieving user profile',
        'PROFILE_FETCH_ERROR',
        500
      );
    }
  }

  /**
   * Update user profile information
   */
  static async updateProfile(userId: string, data: ProfileUpdateData): Promise<void> {
    try {
      // Validate display name if provided
      if (data.displayName !== undefined) {
        if (data.displayName && data.displayName.length > 50) {
          throw new UserError(
            'Display name cannot exceed 50 characters',
            'INVALID_DISPLAY_NAME',
            400
          );
        }
      }

      const updateData: any = {
        updatedAt: new Date()
      };

      if (data.displayName !== undefined) {
        updateData.displayName = data.displayName?.trim() || null;
      }

      const result = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true }
      );

      if (!result) {
        throw new UserError(
          'User not found',
          'USER_NOT_FOUND',
          404
        );
      }

    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      throw new UserError(
        'Error occurred while updating profile',
        'PROFILE_UPDATE_ERROR',
        500
      );
    }
  }

  /**
   * Get user statistics (note counts, etc.)
   */
  static async getUserStats(userId: string): Promise<UserStatsData> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new UserError(
          'User not found',
          'USER_NOT_FOUND',
          404
        );
      }

      // Get note counts using aggregation for better performance
      const [stats] = await Note.aggregate([
        { $match: { userId: user._id } },
        {
          $group: {
            _id: null,
            noteCount: { $sum: 1 },
            publicNotesCount: {
              $sum: { $cond: [{ $eq: ['$isPublic', true] }, 1, 0] }
            },
            sharedNotesCount: {
              $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$sharedWith', []] } }, 0] }, 1, 0] }
            }
          }
        }
      ]);

      return {
        noteCount: stats?.noteCount || 0,
        sharedNotesCount: stats?.sharedNotesCount || 0,
        publicNotesCount: stats?.publicNotesCount || 0,
        memberSince: user.createdAt
      };

    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      throw new UserError(
        'Error occurred while retrieving user statistics',
        'STATS_FETCH_ERROR',
        500
      );
    }
  }

  // =============================================
  // PASSWORD MANAGEMENT METHODS
  // =============================================

  /**
   * Change user password with current password verification
   */
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Get user with password hash
      const user = await User.findById(userId).select('+passwordHash');
      if (!user) {
        throw new UserError(
          'User not found',
          'USER_NOT_FOUND',
          404
        );
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        throw new UserError(
          'Current password is incorrect',
          'INVALID_CURRENT_PASSWORD',
          400
        );
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password and timestamp
      await User.findByIdAndUpdate(userId, {
        $set: {
          passwordHash: newPasswordHash,
          passwordChangedAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Note: Token invalidation should be handled by the calling controller
      // to ensure proper coordination with TokenBlacklistService

    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      throw new UserError(
        'Error occurred while changing password',
        'PASSWORD_CHANGE_ERROR',
        500
      );
    }
  }

  /**
   * Verify current password for sensitive operations
   */
  static async verifyCurrentPassword(userId: string, password: string): Promise<boolean> {
    try {
      const user = await User.findById(userId).select('+passwordHash');
      if (!user) {
        return false;
      }

      return await bcrypt.compare(password, user.passwordHash);

    } catch (error) {
      return false;
    }
  }


  // =============================================
  // ADMIN HELPER METHODS
  // =============================================

  /**
   * Get users by role (for admin interface)
   */
  static async getUsersByRole(role: 'user' | 'admin'): Promise<IUser[]> {
    try {
      return await User.find({ role }).select('email displayName role isActive createdAt updatedAt lastLoginAt');
    } catch (error) {
      throw new UserError(
        'Error occurred while retrieving users by role',
        'USERS_BY_ROLE_ERROR',
        500
      );
    }
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(userId: string): Promise<void> {
    try {
      await User.findByIdAndUpdate(userId, {
        $set: {
          lastLoginAt: new Date(),
          updatedAt: new Date()
        }
      });
    } catch (error) {
      // Log error but don't throw - login should still succeed
      console.error('Failed to update last login timestamp:', error);
    }
  }
}