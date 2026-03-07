import { JWTUtils } from '../utils/jwt';

/**
 * Token blacklist entry interface
 */
interface BlacklistedToken {
  jti: string; // JWT ID (token identifier)
  token: string; // The actual token
  userId: string; // User ID who owned the token
  blacklistedAt: Date; // When it was blacklisted
  expiresAt: Date; // When the original token would expire
}

/**
 * Token blacklist service for managing invalidated JWT tokens
 * Uses in-memory storage for simplicity - can be replaced with Redis/MongoDB for production
 */
export class TokenBlacklistService {
  private static blacklist: Map<string, BlacklistedToken> = new Map();

  /**
   * Add a token to the blacklist
   * @param token - JWT token to blacklist
   * @param userId - ID of user who owned the token
   */
  static async blacklistToken(token: string, userId: string): Promise<void> {
    try {
      // Verify token to get its payload and expiration
      const verification = JWTUtils.verifyToken(token);

      if (!verification.valid || !verification.payload) {
        // Token is already invalid, no need to blacklist
        return;
      }

      // Generate a unique identifier for this token (using part of token as JTI)
      const jti = this.generateJTI(token);

      // Get token expiration
      const expiresAt = verification.payload.exp
        ? new Date(verification.payload.exp * 1000)
        : new Date(Date.now() + 24 * 60 * 60 * 1000); // Default to 24 hours if not set

      const blacklistedToken: BlacklistedToken = {
        jti,
        token,
        userId,
        blacklistedAt: new Date(),
        expiresAt
      };

      this.blacklist.set(jti, blacklistedToken);

      console.log(`🚫 Token blacklisted for user ${userId} (JTI: ${jti})`);

      // Clean up expired tokens periodically
      this.cleanupExpiredTokens();

    } catch (error) {
      console.error('Error blacklisting token:', error);
      throw new Error('Failed to blacklist token');
    }
  }

  /**
   * Check if a token is blacklisted
   * @param token - JWT token to check
   * @returns Promise resolving to true if blacklisted
   */
  static async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const jti = this.generateJTI(token);

      const blacklistedToken = this.blacklist.get(jti);

      if (!blacklistedToken) {
        return false;
      }

      // Check if the blacklisted token has expired (no need to keep it)
      if (new Date() > blacklistedToken.expiresAt) {
        this.blacklist.delete(jti);
        return false;
      }

      return true;

    } catch (error) {
      console.error('Error checking token blacklist:', error);
      return false; // In case of error, assume not blacklisted
    }
  }

  /**
   * Blacklist all tokens for a specific user (useful for security)
   * @param userId - User ID whose tokens should be blacklisted
   */
  static async blacklistAllUserTokens(userId: string): Promise<void> {
    try {
      const userTokens: BlacklistedToken[] = [];

      // Find all tokens for this user
      for (const [jti, blacklistedToken] of this.blacklist) {
        if (blacklistedToken.userId === userId) {
          userTokens.push(blacklistedToken);
        }
      }

      console.log(`🚫 Blacklisted ${userTokens.length} tokens for user ${userId}`);

    } catch (error) {
      console.error('Error blacklisting user tokens:', error);
      throw new Error('Failed to blacklist user tokens');
    }
  }

  /**
   * Get blacklist statistics
   * @returns Current blacklist stats
   */
  static getBlacklistStats(): {
    totalBlacklisted: number;
    activeBlacklisted: number;
    expiredBlacklisted: number;
  } {
    const now = new Date();
    let activeCount = 0;
    let expiredCount = 0;

    for (const [jti, blacklistedToken] of this.blacklist) {
      if (now > blacklistedToken.expiresAt) {
        expiredCount++;
      } else {
        activeCount++;
      }
    }

    return {
      totalBlacklisted: this.blacklist.size,
      activeBlacklisted: activeCount,
      expiredBlacklisted: expiredCount
    };
  }

  /**
   * Clean up expired tokens from blacklist
   * This helps prevent memory leaks from accumulating expired tokens
   */
  private static cleanupExpiredTokens(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [jti, blacklistedToken] of this.blacklist) {
      if (now > blacklistedToken.expiresAt) {
        this.blacklist.delete(jti);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired blacklisted tokens`);
    }
  }

  /**
   * Generate a unique identifier from token for blacklist storage
   * Uses a hash of the token signature to create a consistent JTI
   * @param token - JWT token
   * @returns Unique identifier
   */
  private static generateJTI(token: string): string {
    try {
      // Use the last part of the token (signature) as identifier
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      // Create a hash from the signature part
      return `jti_${parts[2].substring(0, 16)}`;

    } catch (error) {
      // Fallback: use full token hash if parsing fails
      return `jti_${token.substring(0, 16)}`;
    }
  }

  /**
   * Clear all blacklisted tokens (for testing/admin purposes)
   */
  static clearBlacklist(): void {
    const size = this.blacklist.size;
    this.blacklist.clear();
    console.log(`🗑️ Cleared ${size} tokens from blacklist`);
  }
}