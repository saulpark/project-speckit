import { User, IUser } from '../models/User';

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
}