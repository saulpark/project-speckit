import bcrypt from 'bcrypt';

/**
 * Password security utilities using bcrypt for secure hashing and verification
 */
export class PasswordUtils {
  // Use 12 salt rounds for strong security as specified in technical requirements
  private static readonly SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

  /**
   * Hash a plain text password securely using bcrypt
   * @param password - Plain text password to hash
   * @returns Promise resolving to the hashed password
   * @throws Error if hashing fails
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      if (!password || password.trim().length === 0) {
        throw new Error('Password cannot be empty');
      }

      return await bcrypt.hash(password.trim(), this.SALT_ROUNDS);
    } catch (error) {
      console.error('Password hashing error:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify a plain text password against a hashed password
   * @param password - Plain text password to verify
   * @param hash - Hashed password to compare against
   * @returns Promise resolving to true if password matches, false otherwise
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      if (!password || !hash) {
        return false;
      }

      return await bcrypt.compare(password.trim(), hash);
    } catch (error) {
      console.error('Password verification error:', error);
      return false; // Fail securely
    }
  }

  /**
   * Validate password strength according to business requirements
   * @param password - Password to validate
   * @returns Object with validation result and error messages
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!password) {
      errors.push('Password is required');
      return { isValid: false, errors };
    }

    const trimmedPassword = password.trim();

    // Minimum length requirement
    if (trimmedPassword.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    // Maximum length for security (prevents DoS attacks)
    if (trimmedPassword.length > 128) {
      errors.push('Password must be less than 128 characters');
    }

    // Must contain lowercase letter
    if (!/[a-z]/.test(trimmedPassword)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Must contain uppercase letter
    if (!/[A-Z]/.test(trimmedPassword)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Must contain number
    if (!/\d/.test(trimmedPassword)) {
      errors.push('Password must contain at least one number');
    }

    // Optional: Must contain special character (uncomment if needed)
    // if (!/[!@#$%^&*(),.?":{}|<>]/.test(trimmedPassword)) {
    //   errors.push('Password must contain at least one special character');
    // }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate a random salt (mainly for testing purposes)
   * @param rounds - Number of salt rounds (optional, uses default)
   * @returns Promise resolving to salt string
   */
  static async generateSalt(rounds?: number): Promise<string> {
    try {
      return await bcrypt.genSalt(rounds || this.SALT_ROUNDS);
    } catch (error) {
      console.error('Salt generation error:', error);
      throw new Error('Failed to generate salt');
    }
  }

  /**
   * Get current salt rounds configuration
   * @returns Number of salt rounds being used
   */
  static getSaltRounds(): number {
    return this.SALT_ROUNDS;
  }
}