import { User, IUser } from '../models/User';
import { PasswordUtils } from '../utils/crypto';
import { JWTUtils, TokenResponse } from '../utils/jwt';

/**
 * Custom error types for authentication operations
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * User data transfer objects
 */
export interface CreateUserData {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticationResult {
  user: UserResponse;
  token: TokenResponse;
  message: string;
}

/**
 * Authentication service handling user registration, login, and user management
 */
export class AuthService {
  /**
   * Register a new user with email and password
   * @param userData - User registration data
   * @returns Promise resolving to user response object
   * @throws AuthError if registration fails
   */
  static async registerUser(userData: CreateUserData): Promise<UserResponse> {
    const { email, password } = userData;

    try {
      // Validate input data
      if (!email || !password) {
        throw new AuthError(
          'Email and password are required',
          'MISSING_FIELDS',
          400
        );
      }

      // Validate email format
      const normalizedEmail = email.toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        throw new AuthError(
          'Please provide a valid email address',
          'INVALID_EMAIL',
          400
        );
      }

      // Validate password strength
      const passwordValidation = PasswordUtils.validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        throw new AuthError(
          `Password validation failed: ${passwordValidation.errors.join(', ')}`,
          'WEAK_PASSWORD',
          400
        );
      }

      // Check if user already exists
      const existingUser = await User.findByEmail(normalizedEmail);
      if (existingUser) {
        throw new AuthError(
          'A user with this email address already exists',
          'USER_EXISTS',
          409
        );
      }

      // Hash the password
      const passwordHash = await PasswordUtils.hashPassword(password);

      // Create new user
      const newUser = new User({
        email: normalizedEmail,
        passwordHash,
        isActive: true
      });

      // Save to database
      const savedUser = await newUser.save();

      // Return user response (without password hash)
      return {
        id: savedUser._id.toString(),
        email: savedUser.email,
        isActive: savedUser.isActive,
        createdAt: savedUser.createdAt,
        updatedAt: savedUser.updatedAt
      };

    } catch (error) {
      // If it's already an AuthError, re-throw it
      if (error instanceof AuthError) {
        throw error;
      }

      // Handle MongoDB duplicate key error (email uniqueness)
      if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
        throw new AuthError(
          'A user with this email address already exists',
          'USER_EXISTS',
          409
        );
      }

      // Log unexpected errors
      console.error('User registration error:', error);
      throw new AuthError(
        'An error occurred during user registration',
        'REGISTRATION_FAILED',
        500
      );
    }
  }

  /**
   * Authenticate a user with email and password
   * @param email - User's email address
   * @param password - User's plain text password
   * @returns Promise resolving to authentication result
   * @throws AuthError if authentication fails
   */
  static async authenticateUser(email: string, password: string): Promise<AuthenticationResult> {
    try {
      // Validate input
      if (!email || !password) {
        throw new AuthError(
          'Email and password are required',
          'MISSING_CREDENTIALS',
          400
        );
      }

      // Find user by email (includes password hash)
      const user = await User.findByEmail(email.toLowerCase().trim());
      if (!user) {
        throw new AuthError(
          'Invalid email or password',
          'INVALID_CREDENTIALS',
          401
        );
      }

      // Check if user account is active
      if (!user.isActive) {
        throw new AuthError(
          'Your account has been deactivated. Please contact support.',
          'ACCOUNT_INACTIVE',
          403
        );
      }

      // Verify password
      const isPasswordValid = await user.verifyPassword(password);
      if (!isPasswordValid) {
        throw new AuthError(
          'Invalid email or password',
          'INVALID_CREDENTIALS',
          401
        );
      }

      // Generate JWT token
      const token = JWTUtils.generateToken(
        user._id.toString(),
        user.email
      );

      // Return successful authentication result with token
      return {
        user: {
          id: user._id.toString(),
          email: user.email,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        token,
        message: 'Authentication successful'
      };

    } catch (error) {
      // If it's already an AuthError, re-throw it
      if (error instanceof AuthError) {
        throw error;
      }

      // Log unexpected errors
      console.error('User authentication error:', error);
      throw new AuthError(
        'An error occurred during authentication',
        'AUTHENTICATION_FAILED',
        500
      );
    }
  }

  /**
   * Find a user by their ID
   * @param userId - User's unique identifier
   * @returns Promise resolving to user response or null
   */
  static async findUserById(userId: string): Promise<UserResponse | null> {
    try {
      const user = await User.findById(userId);
      if (!user || !user.isActive) {
        return null;
      }

      return {
        id: user._id.toString(),
        email: user.email,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    } catch (error) {
      console.error('Find user by ID error:', error);
      return null;
    }
  }

  /**
   * Find a user by email address
   * @param email - User's email address
   * @returns Promise resolving to user response or null
   */
  static async findUserByEmail(email: string): Promise<UserResponse | null> {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        return null;
      }

      return {
        id: user._id.toString(),
        email: user.email,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    } catch (error) {
      console.error('Find user by email error:', error);
      return null;
    }
  }

  /**
   * Deactivate a user account (soft delete)
   * @param userId - User's unique identifier
   * @returns Promise resolving to success status
   */
  static async deactivateUser(userId: string): Promise<boolean> {
    try {
      const result = await User.findByIdAndUpdate(
        userId,
        { isActive: false },
        { new: true }
      );

      return result !== null;
    } catch (error) {
      console.error('User deactivation error:', error);
      return false;
    }
  }

  /**
   * Get total count of active users (for admin/analytics)
   * @returns Promise resolving to user count
   */
  static async getActiveUserCount(): Promise<number> {
    try {
      return await User.countDocuments({ isActive: true });
    } catch (error) {
      console.error('User count error:', error);
      return 0;
    }
  }

  /**
   * Request password reset - generates and returns reset token
   * @param email - User's email address
   * @returns Promise resolving to reset token or null if user not found
   */
  static async requestPasswordReset(email: string): Promise<{ token: string; expiresAt: Date } | null> {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // Find user by email
      const user = await User.findByEmail(normalizedEmail);
      if (!user || !user.isActive) {
        // For security, don't reveal if user exists
        return null;
      }

      // Generate password reset token (15 minutes expiry)
      const resetToken = JWTUtils.generateToken(
        user._id.toString(),
        user.email,
        '15m'
      );

      return {
        token: resetToken.token,
        expiresAt: resetToken.expiresAt
      };

    } catch (error) {
      console.error('Password reset request error:', error);
      return null;
    }
  }

  /**
   * Reset user password with valid reset token
   * @param resetToken - Password reset token
   * @param newPassword - New password
   * @returns Promise resolving to success status
   */
  static async resetPassword(resetToken: string, newPassword: string): Promise<boolean> {
    try {
      // Verify reset token
      const tokenVerification = JWTUtils.verifyToken(resetToken);
      if (!tokenVerification.valid || !tokenVerification.payload) {
        throw new AuthError(
          'Invalid or expired reset token',
          'INVALID_RESET_TOKEN',
          400
        );
      }

      // Validate new password strength
      const passwordValidation = PasswordUtils.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new AuthError(
          `Password validation failed: ${passwordValidation.errors.join(', ')}`,
          'WEAK_PASSWORD',
          400
        );
      }

      // Find user by ID from token
      const user = await User.findById(tokenVerification.payload.sub);
      if (!user || !user.isActive) {
        throw new AuthError(
          'User account not found or inactive',
          'USER_NOT_FOUND',
          404
        );
      }

      // Hash new password
      const passwordHash = await PasswordUtils.hashPassword(newPassword);

      // Update user's password
      await User.findByIdAndUpdate(user._id, { passwordHash });

      console.log(`🔑 Password reset successful for: ${user.email} (ID: ${user._id})`);
      return true;

    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      console.error('Password reset error:', error);
      throw new AuthError(
        'Failed to reset password',
        'PASSWORD_RESET_FAILED',
        500
      );
    }
  }
}