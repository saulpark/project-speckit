import { Request, Response, NextFunction } from 'express';
import { JWTUtils, JWTPayload } from '../utils/jwt';
import { AuthService } from '../services/authService';
import { TokenBlacklistService } from '../services/tokenBlacklistService';

/**
 * Extended Request interface to include authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  tokenPayload?: JWTPayload;
}

/**
 * Authentication middleware to protect routes
 * Verifies JWT token and adds user context to request
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = JWTUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
        error: 'MISSING_TOKEN',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Verify token
    const verification = JWTUtils.verifyToken(token);

    if (!verification.valid || !verification.payload) {
      res.status(403).json({
        success: false,
        message: verification.error || 'Invalid or expired token',
        error: 'INVALID_TOKEN',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if token is blacklisted
    const isBlacklisted = await TokenBlacklistService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      res.status(403).json({
        success: false,
        message: 'Token has been invalidated',
        error: 'TOKEN_BLACKLISTED',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Get user from database to ensure user still exists and is active
    const user = await AuthService.findUserById(verification.payload.sub);

    if (!user) {
      res.status(403).json({
        success: false,
        message: 'User not found or inactive',
        error: 'USER_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Add user and token payload to request object
    req.user = user;
    req.tokenPayload = verification.payload;

    next();

  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication service error',
      error: 'AUTH_SERVICE_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Optional authentication middleware
 * Adds user context if token is valid, but doesn't block request if no token
 */
export const optionalAuthentication = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = JWTUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      // No token provided, continue without authentication
      next();
      return;
    }

    const verification = JWTUtils.verifyToken(token);

    if (verification.valid && verification.payload) {
      // Check if token is blacklisted
      const isBlacklisted = await TokenBlacklistService.isTokenBlacklisted(token);

      if (!isBlacklisted) {
        // Token is valid and not blacklisted, try to get user
        const user = await AuthService.findUserById(verification.payload.sub);

        if (user) {
          req.user = user;
          req.tokenPayload = verification.payload;
        }
      }
    }

    // Continue regardless of token validity
    next();

  } catch (error) {
    console.error('Optional authentication error:', error);
    // Continue even if there's an error
    next();
  }
};

/**
 * Role-based authorization middleware (for future use)
 * Can be chained after authenticateToken for role-based access
 */
export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // For now, we don't have roles in our user model
    // This is a placeholder for future role implementation
    console.log('Role checking not implemented yet, allowing access');
    next();
  };
};

/**
 * Middleware to extract user info from token for API responses
 */
export const extractUserInfo = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = JWTUtils.extractTokenFromHeader(authHeader);

    if (token) {
      const verification = JWTUtils.verifyToken(token);
      if (verification.valid && verification.payload) {
        req.tokenPayload = verification.payload;
      }
    }

    next();

  } catch (error) {
    console.error('User info extraction error:', error);
    next(); // Continue without user info
  }
};

/**
 * Middleware to refresh token if it's close to expiration
 * Returns new token in response header if refreshed
 */
export const refreshTokenIfNeeded = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers['authorization'];
    const token = JWTUtils.extractTokenFromHeader(authHeader);

    if (token && req.user) {
      const expiration = JWTUtils.getTokenExpiration(token);

      if (expiration) {
        const now = new Date();
        const timeUntilExpiry = expiration.getTime() - now.getTime();
        const oneHourInMs = 60 * 60 * 1000;

        // Refresh token if it expires within an hour
        if (timeUntilExpiry < oneHourInMs && timeUntilExpiry > 0) {
          const refreshed = JWTUtils.refreshToken(token);

          if (refreshed) {
            res.setHeader('X-Refreshed-Token', refreshed.token);
            res.setHeader('X-Token-Expires', refreshed.expiresAt.toISOString());
          }
        }
      }
    }

    next();

  } catch (error) {
    console.error('Token refresh error:', error);
    next(); // Continue without refreshing
  }
};