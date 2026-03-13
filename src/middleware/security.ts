import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Extend Request interface for session support
interface ExtendedRequest extends Request {
  sessionID?: string;
}

/**
 * CSRF Token Management
 * Provides protection against Cross-Site Request Forgery attacks
 */
export class CSRFProtection {
  private static tokens = new Map<string, { token: string; createdAt: Date }>();
  private static readonly TOKEN_EXPIRY = 1000 * 60 * 60; // 1 hour

  /**
   * Generate a CSRF token for a session
   */
  static generateToken(sessionId?: string): string {
    const token = crypto.randomUUID();
    const key = sessionId || 'anonymous';

    this.tokens.set(key, {
      token,
      createdAt: new Date()
    });

    // Cleanup expired tokens
    this.cleanupExpiredTokens();

    return token;
  }

  /**
   * Verify a CSRF token
   */
  static verifyToken(token: string, sessionId?: string): boolean {
    if (!token) return false;

    const key = sessionId || 'anonymous';
    const storedData = this.tokens.get(key);

    if (!storedData) return false;

    // Check if token is expired
    const isExpired = Date.now() - storedData.createdAt.getTime() > this.TOKEN_EXPIRY;
    if (isExpired) {
      this.tokens.delete(key);
      return false;
    }

    return storedData.token === token;
  }

  /**
   * Clean up expired tokens
   */
  private static cleanupExpiredTokens() {
    const now = Date.now();
    for (const [key, data] of this.tokens.entries()) {
      if (now - data.createdAt.getTime() > this.TOKEN_EXPIRY) {
        this.tokens.delete(key);
      }
    }
  }

  /**
   * Middleware to add CSRF token to responses
   */
  static addTokenMiddleware() {
    return (req: ExtendedRequest, res: Response, next: NextFunction) => {
      const sessionId = req.sessionID || req.ip || 'anonymous';
      const csrfToken = CSRFProtection.generateToken(sessionId);

      res.locals.csrfToken = csrfToken;

      // Add token to response headers
      res.setHeader('X-CSRF-Token', csrfToken);

      next();
    };
  }

  /**
   * Middleware to verify CSRF tokens on POST/PUT/DELETE requests
   */
  static verifyTokenMiddleware() {
    return (req: ExtendedRequest, res: Response, next: NextFunction) => {
      // Skip CSRF protection in development and test environments
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        return next();
      }

      // Skip for GET, HEAD, OPTIONS requests
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }

      const token = req.get('X-CSRF-Token') || req.body._csrf;
      const sessionId = req.sessionID || req.ip || 'anonymous';

      if (!CSRFProtection.verifyToken(token, sessionId)) {
        return res.status(403).json({
          success: false,
          message: 'Invalid CSRF token',
          error: 'CSRF_TOKEN_INVALID',
          timestamp: new Date().toISOString()
        });
      }

      next();
    };
  }
}


/**
 * Security Headers Middleware
 * Adds additional security headers beyond helmet
 */
export function securityHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // Content Security Policy for auth pages
    if (req.path.includes('/auth')) {
      res.setHeader('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data:; " +
        "font-src 'self'; " +
        "connect-src 'self'; " +
        "base-uri 'self'; " +
        "form-action 'self'"
      );
    }

    next();
  };
}

/**
 * Request Logging for Security Monitoring
 */
export function securityLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        contentLength: res.get('Content-Length')
      };

      // Log suspicious activity
      if (res.statusCode >= 400 || req.path.includes('admin') || req.path.includes('..')) {
        console.warn('Security Alert:', logData);
      }
    });

    next();
  };
}

/**
 * IP Blacklist Middleware
 * Blocks requests from known malicious IPs
 */
export class IPBlacklist {
  private static blacklist = new Set<string>();

  static addIP(ip: string) {
    this.blacklist.add(ip);
    console.warn(`IP ${ip} added to blacklist`);
  }

  static removeIP(ip: string) {
    this.blacklist.delete(ip);
    console.info(`IP ${ip} removed from blacklist`);
  }

  static isBlacklisted(ip: string): boolean {
    return this.blacklist.has(ip);
  }

  static middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIP = req.ip || 'unknown';
      if (IPBlacklist.isBlacklisted(clientIP)) {
        console.warn(`Blocked request from blacklisted IP: ${clientIP}`);
        return res.status(403).json({
          success: false,
          message: 'Access denied',
          error: 'IP_BLACKLISTED',
          timestamp: new Date().toISOString()
        });
      }
      next();
    };
  }
}

/**
 * Request Size Limiting
 * Prevents large payload attacks
 */
export function requestSizeLimit() {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLengthHeader = req.get('Content-Length');
    const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
    const maxSize = 1024 * 1024; // 1MB

    if (contentLength > maxSize) {
      return res.status(413).json({
        success: false,
        message: 'Request payload too large',
        error: 'PAYLOAD_TOO_LARGE',
        maxSize: '1MB',
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
}