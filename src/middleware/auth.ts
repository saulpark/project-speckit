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
 * Web authentication middleware that redirects to login on failure
 * Use this for pages that should show HTML views
 */
export const authenticateWeb = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header OR cookies
    const authHeader = req.headers['authorization'];
    let token = JWTUtils.extractTokenFromHeader(authHeader);

    // If no auth header, try to get from cookies (for web sessions)
    if (!token && req.cookies && req.cookies.authToken) {
      token = req.cookies.authToken;
    }

    if (!token) {
      // Redirect to login for web requests
      const currentPath = encodeURIComponent(req.originalUrl);
      res.redirect(`/auth/login?redirect=${currentPath}`);
      return;
    }

    // Verify token
    const verification = JWTUtils.verifyToken(token);

    if (!verification.valid || !verification.payload) {
      // Redirect to login for invalid tokens
      const currentPath = encodeURIComponent(req.originalUrl);
      res.redirect(`/auth/login?redirect=${currentPath}`);
      return;
    }

    // Check if token is blacklisted
    const isBlacklisted = await TokenBlacklistService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      const currentPath = encodeURIComponent(req.originalUrl);
      res.redirect(`/auth/login?redirect=${currentPath}`);
      return;
    }

    // Get user data and attach to request
    const userResponse = await AuthService.findUserById(verification.payload.sub);
    if (!userResponse) {
      const currentPath = encodeURIComponent(req.originalUrl);
      res.redirect(`/auth/login?redirect=${currentPath}`);
      return;
    }
    req.user = userResponse;
    req.tokenPayload = verification.payload;

    next();
  } catch (error) {
    console.error('Web authentication error:', error);
    const currentPath = encodeURIComponent(req.originalUrl);
    res.redirect(`/auth/login?redirect=${currentPath}`);
  }
};

/**
 * API authentication middleware that returns JSON on failure
 * Use this for API endpoints that should return JSON responses
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('🔥 ENTERING authenticateToken try block');
    console.log('🌍 NODE_ENV CHECK:', process.env.NODE_ENV);
    console.log('🔍 All ENV vars:', Object.keys(process.env).filter(k => k.includes('NODE')));
    console.log('🚨🚨🚨 MIDDLEWARE CALLED - CHANGES ARE WORKING! 🚨🚨🚨', req.path);
    console.log('🎯 STEP 1: Middleware function started');
    console.log('🍪 All cookies:', req.cookies);
    console.log('🎯 STEP 2: Cookies logged');
    console.log('🔍 Cookie count:', Object.keys(req.cookies || {}).length);
    console.log('🎯 STEP 3: Cookie count logged');
    console.log('🔍 Auth header:', req.headers['authorization']);
    console.log('🎯 STEP 4: Auth header logged');
    console.log('🔍 Method:', req.method);
    console.log('🎯 STEP 5: Method logged');
    console.log('🏃‍♂️ About to start authentication logic...');
    console.log('🎯 STEP 6: About to start logic message logged');
    console.log('🔥 STEP 6.5: About to enter token extraction logic...');
    // Extract token from Authorization header
    console.log('🎯 STEP 7: About to extract auth header');
    const authHeader = req.headers['authorization'];
    console.log('🎯 STEP 8: Auth header extracted:', !!authHeader, 'value:', authHeader);
    console.log('🎯 STEP 8.5: About to call JWTUtils.extractTokenFromHeader...');
    let token = JWTUtils.extractTokenFromHeader(authHeader);
    console.log('🎯 STEP 9: Token extracted from header:', !!token, 'token:', token);

    // ADDED: Also try to get token from cookies (for web sessions)
    console.log('🎯 STEP 10: Checking for cookie token, hasToken:', !!token);
    if (!token && req.cookies && req.cookies.authToken) {
      token = req.cookies.authToken;
      console.log('🍪 authenticateToken using cookie authentication');
      console.log('🎯 STEP 11: Cookie token found and extracted');
      console.log('🔍 Raw cookie token:', token);
      console.log('🔍 Token length:', token?.length);
      console.log('🔍 First 50 chars:', token?.substring(0, 50));
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required (modified for cookies)',
        error: 'MISSING_TOKEN',
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log('🎯 STEP 12: About to verify token, hasToken:', !!token);
    // Verify token
    const verification = JWTUtils.verifyToken(token);
    console.log('🎯 STEP 13: Token verification completed, valid:', verification.valid);

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
    console.error('🚨🚨🚨 AUTHENTICATION ERROR CAUGHT! 🚨🚨🚨');
    console.error('🚨 Error type:', typeof error);
    console.error('🚨 Error message:', (error as any)?.message);
    console.error('🚨 Error stack:', (error as any)?.stack);
    console.error('🚨 Full error object:', error);
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
    let token = JWTUtils.extractTokenFromHeader(authHeader);

    // Debug logging
    const hasCookie = req.cookies && req.cookies.authToken;
    console.log('🔍 Optional auth middleware:', {
      path: req.path,
      hasAuthHeader: !!authHeader,
      hasCookie: !!hasCookie,
      extractedToken: !!token
    });

    // If no auth header, try to get from cookies (for web sessions)
    if (!token && req.cookies && req.cookies.authToken) {
      token = req.cookies.authToken;
      console.log('🍪 Using cookie token for authentication');
    }

    if (!token) {
      // No token provided, continue without authentication
      console.log('❌ No token found, continuing without auth');
      next();
      return;
    }

    const verification = JWTUtils.verifyToken(token);
    console.log('🔐 Token verification result:', {
      valid: verification.valid,
      error: verification.error,
      hasPayload: !!verification.payload
    });

    if (verification.valid && verification.payload) {
      // Check if token is blacklisted
      const isBlacklisted = await TokenBlacklistService.isTokenBlacklisted(token);
      console.log('📋 Blacklist check:', { isBlacklisted });

      if (!isBlacklisted) {
        // Token is valid and not blacklisted, try to get user
        const user = await AuthService.findUserById(verification.payload.sub);
        console.log('👤 User lookup result:', {
          userFound: !!user,
          userId: verification.payload.sub
        });

        if (user) {
          req.user = user;
          req.tokenPayload = verification.payload;
          console.log('✅ User authenticated successfully:', user.email);
        }
      }
    }

    // Continue regardless of token validity
    next();

  } catch (error) {
    console.error('❌ Optional authentication error:', error);
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
 * API authentication middleware that works with both cookies and tokens
 * Returns JSON errors instead of redirecting (for AJAX calls)
 */
export const authenticateAPI = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  console.log('🔍 authenticateAPI middleware called for:', req.method, req.path);

  try {
    const authHeader = req.headers['authorization'];
    let token = JWTUtils.extractTokenFromHeader(authHeader);

    console.log('🔍 Auth check:', {
      hasAuthHeader: !!authHeader,
      hasCookies: !!req.cookies,
      hasAuthToken: !!(req.cookies && req.cookies.authToken),
      extractedToken: !!token
    });

    // If no auth header, try to get from cookies (for web sessions)
    if (!token && req.cookies && req.cookies.authToken) {
      token = req.cookies.authToken;
      console.log('🍪 API call using cookie token');
    }

    if (!token) {
      console.log('❌ No token found in headers or cookies');
      res.status(401).json({
        success: false,
        message: 'API authentication required - no token found',
        error: 'MISSING_TOKEN_API',
        debug: {
          hasAuthHeader: !!authHeader,
          hasCookies: !!req.cookies,
          cookieKeys: req.cookies ? Object.keys(req.cookies) : []
        },
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

    // Get user from database
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
    console.error('API authentication middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication service error',
      error: 'AUTH_SERVICE_ERROR',
      timestamp: new Date().toISOString()
    });
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