import * as jwt from 'jsonwebtoken';

/**
 * JWT payload interface for type safety
 */
export interface JWTPayload {
  sub: string; // Subject (user ID)
  email: string; // User email for convenience
  iat?: number; // Issued at
  exp?: number; // Expires at
}

/**
 * JWT token response interface
 */
export interface TokenResponse {
  token: string;
  expiresIn: string;
  expiresAt: Date;
}

/**
 * JWT verification result interface
 */
export interface VerificationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}

/**
 * JWT utilities for token generation, verification, and management
 */
export class JWTUtils {
  private static get SECRET(): string {
    return process.env.JWT_SECRET || 'fallback-secret-change-in-production';
  }

  private static get DEFAULT_EXPIRES_IN(): string {
    return process.env.JWT_EXPIRES_IN || '24h';
  }

  /**
   * Generate a JWT token for a user
   * @param userId - User's unique identifier
   * @param email - User's email address
   * @param expiresIn - Token expiration (optional, defaults to 24h)
   * @returns TokenResponse with token, expiration info
   */
  static generateToken(
    userId: string,
    email: string,
    expiresIn: string = this.DEFAULT_EXPIRES_IN
  ): TokenResponse {
    if (!userId || !email) {
      throw new Error('User ID and email are required for token generation');
    }

    try {
      const payload: JWTPayload = {
        sub: userId,
        email: email.toLowerCase()
      };

      const token = jwt.sign(payload, this.SECRET, {
        expiresIn,
        issuer: 'project-speckit-auth',
        audience: 'project-speckit-users'
      } as jwt.SignOptions);

      // Calculate expiration date
      const decoded = jwt.decode(token) as JWTPayload;
      const expiresAt = new Date((decoded.exp || 0) * 1000);

      return {
        token,
        expiresIn,
        expiresAt
      };

    } catch (error) {
      console.error('JWT token generation error:', error);
      throw new Error('Failed to generate authentication token');
    }
  }

  /**
   * Verify and decode a JWT token
   * @param token - JWT token to verify
   * @returns VerificationResult with validity status and payload
   */
  static verifyToken(token: string): VerificationResult {
    if (!token || typeof token !== 'string') {
      return {
        valid: false,
        error: 'Token is required and must be a string'
      };
    }

    try {
      const payload = jwt.verify(token, this.SECRET, {
        issuer: 'project-speckit-auth',
        audience: 'project-speckit-users'
      }) as JWTPayload;

      // Validate required payload fields
      if (!payload.sub || !payload.email) {
        return {
          valid: false,
          error: 'Token payload is missing required fields'
        };
      }

      return {
        valid: true,
        payload
      };

    } catch (error) {
      let errorMessage = 'Invalid token';

      if (error instanceof jwt.JsonWebTokenError) {
        if (error.message.includes('expired')) {
          errorMessage = 'Token has expired';
        } else if (error.message.includes('signature')) {
          errorMessage = 'Invalid token signature';
        } else if (error.message.includes('malformed')) {
          errorMessage = 'Malformed token';
        }
      }

      return {
        valid: false,
        error: errorMessage
      };
    }
  }

  /**
   * Extract token from Authorization header
   * @param authHeader - Authorization header value
   * @returns Token string or null if not found
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    // Handle Bearer token format
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch) {
      return bearerMatch[1];
    }

    // FIXED: Don't return malformed "Bearer" as a token
    if (authHeader.trim() === 'Bearer') {
      console.log('🚨 MALFORMED BEARER HEADER DETECTED - ignoring and falling back to cookies');
      return null;
    }

    // Handle token without Bearer prefix (fallback)
    if (authHeader.split(' ').length === 1) {
      return authHeader;
    }

    return null;
  }

  /**
   * Check if a token is expired without verifying signature
   * Useful for handling expired tokens gracefully
   * @param token - JWT token to check
   * @returns Boolean indicating if token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      if (!decoded || !decoded.exp) {
        return true;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;

    } catch (error) {
      return true; // Consider invalid tokens as expired
    }
  }

  /**
   * Get token expiration time
   * @param token - JWT token
   * @returns Date object representing expiration time, or null if invalid
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      if (!decoded || !decoded.exp) {
        return null;
      }

      return new Date(decoded.exp * 1000);

    } catch (error) {
      return null;
    }
  }

  /**
   * Refresh a token (generate new token with same payload but extended expiry)
   * @param token - Existing valid token
   * @param newExpiresIn - New expiration time
   * @returns New TokenResponse or null if original token is invalid
   */
  static refreshToken(token: string, newExpiresIn?: string): TokenResponse | null {
    const verification = this.verifyToken(token);

    if (!verification.valid || !verification.payload) {
      return null;
    }

    return this.generateToken(
      verification.payload.sub,
      verification.payload.email,
      newExpiresIn || this.DEFAULT_EXPIRES_IN
    );
  }

  /**
   * Get current JWT configuration
   * @returns Configuration object (without secret for security)
   */
  static getConfig(): { defaultExpiresIn: string; hasSecret: boolean } {
    return {
      defaultExpiresIn: this.DEFAULT_EXPIRES_IN,
      hasSecret: Boolean(process.env.JWT_SECRET)
    };
  }

  /**
   * Generate a secure random JWT secret (for setup/development)
   * @param length - Length of the secret (default 64)
   * @returns Random hex string
   */
  static generateSecureSecret(length: number = 64): string {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
  }
}