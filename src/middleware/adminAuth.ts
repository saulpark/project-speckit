import { Request, Response, NextFunction } from 'express';

/**
 * Admin Authorization Middleware
 * Verifies that the authenticated user has admin role
 * Must be used after authenticateToken middleware
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      console.warn('🔒 Admin access denied: No authentication provided', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });

      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'AUTHENTICATION_REQUIRED',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if user has admin role
    if (req.user.role !== 'admin') {
      console.warn('🔒 Admin access denied: Insufficient privileges', {
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });

      res.status(403).json({
        success: false,
        message: 'Admin access required',
        error: 'ADMIN_ACCESS_REQUIRED',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Log successful admin access
    console.log('👑 Admin access granted', {
      adminId: req.user.id,
      email: req.user.email,
      path: req.path,
      method: req.method,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    // User is authenticated and has admin role
    next();

  } catch (error) {
    console.error('❌ Admin authorization check failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      path: req.path,
      method: req.method,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      message: 'Authorization check failed',
      error: 'AUTHORIZATION_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Optional Admin Authorization Middleware
 * Sets req.isAdmin flag but doesn't block access
 * Useful for pages that show different content to admins
 */
export const optionalAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Add isAdmin flag to request
    req.isAdmin = Boolean(req.user && req.user.role === 'admin');

    if (req.isAdmin) {
      console.log('👑 Admin context detected', {
        adminId: req.user!.id,
        email: req.user!.email,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    }

    next();

  } catch (error) {
    console.error('❌ Optional admin check failed:', error);

    // Don't block access on error, just set to false
    req.isAdmin = false;
    next();
  }
};

/**
 * Admin Web Authorization Middleware
 * Like requireAdmin but redirects to login page instead of returning JSON
 * For HTML page routes
 */
export const requireAdminWeb = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      console.warn('🔒 Admin web access denied: No authentication', {
        path: req.path,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      res.redirect('/auth/login?message=Admin access required&returnTo=' + encodeURIComponent(req.originalUrl));
      return;
    }

    // Check if user has admin role
    if (req.user.role !== 'admin') {
      console.warn('🔒 Admin web access denied: Insufficient privileges', {
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role,
        path: req.path,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      res.status(403).render('error', {
        title: 'Access Denied - SpecKit',
        message: 'Admin access required',
        error: 'You do not have permission to access this page.',
        user: req.user
      });
      return;
    }

    // Log successful admin web access
    console.log('👑 Admin web access granted', {
      adminId: req.user.id,
      email: req.user.email,
      path: req.path,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    next();

  } catch (error) {
    console.error('❌ Admin web authorization failed:', error);

    res.status(500).render('error', {
      title: 'Error - SpecKit',
      message: 'Authorization check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};