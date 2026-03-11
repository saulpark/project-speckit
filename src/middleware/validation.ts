import { Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain } from 'express-validator';

/**
 * Middleware to handle validation errors
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined
    }));

    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

/**
 * Validation rules for user registration
 */
export const validateRegistration: ValidationChain[] = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail({
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      outlookdotcom_remove_subaddress: false,
      yahoo_remove_subaddress: false,
      icloud_remove_subaddress: false
    })
    .isLength({ max: 255 })
    .withMessage('Email must be less than 255 characters')
    .trim(),

  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
    .custom((password: string) => {
      // Check for common weak passwords
      const weakPasswords = [
        'password123', 'Password123', '12345678', 'qwerty123',
        'admin123', 'letmein123', 'welcome123', 'password1'
      ];

      if (weakPasswords.some(weak => password.toLowerCase().includes(weak.toLowerCase()))) {
        throw new Error('Password is too common. Please choose a more secure password');
      }

      return true;
    }),

  body('confirmPassword')
    .optional()
    .custom((value: string, { req }) => {
      if (value && value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),

  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s-']+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes')
    .trim(),

  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s-']+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes')
    .trim()
];

/**
 * Validation rules for user login
 */
export const validateLogin: ValidationChain[] = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail({
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      outlookdotcom_remove_subaddress: false,
      yahoo_remove_subaddress: false,
      icloud_remove_subaddress: false
    })
    .trim(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ max: 128 })
    .withMessage('Password is too long'),

  body('rememberMe')
    .optional()
    .isBoolean()
    .withMessage('Remember me must be a boolean value')
];

/**
 * Validation rules for password reset request
 */
export const validatePasswordResetRequest: ValidationChain[] = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail({
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      outlookdotcom_remove_subaddress: false,
      yahoo_remove_subaddress: false,
      icloud_remove_subaddress: false
    })
    .trim()
];

/**
 * Validation rules for password change
 */
export const validatePasswordChange: ValidationChain[] = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
    .custom((newPassword: string, { req }) => {
      if (newPassword === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),

  body('confirmNewPassword')
    .custom((value: string, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
];

/**
 * Validation rules for user profile update
 */
export const validateProfileUpdate: ValidationChain[] = [
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s-']+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes')
    .trim(),

  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s-']+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes')
    .trim(),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail({
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      outlookdotcom_remove_subaddress: false,
      yahoo_remove_subaddress: false,
      icloud_remove_subaddress: false
    })
    .isLength({ max: 255 })
    .withMessage('Email must be less than 255 characters')
    .trim()
];

/**
 * Rate limiting validation - checks for suspicious request patterns
 */
export const validateRateLimit = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const userAgent = req.get('User-Agent') || '';
  const ip = req.ip || req.connection.remoteAddress || '';

  // Block requests with suspicious user agents
  const suspiciousAgents = [
    'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget'
  ];

  if (suspiciousAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
    res.status(429).json({
      success: false,
      message: 'Too many requests',
      error: 'RATE_LIMIT_EXCEEDED',
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

/**
 * Sanitization middleware to prevent XSS and injection attacks
 */
export const sanitizeInput = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Remove any HTML tags from string inputs
  const sanitizeString = (value: any): any => {
    if (typeof value === 'string') {
      return value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                 .replace(/<[^>]*>/g, '')
                 .trim();
    }
    return value;
  };

  // Recursively sanitize object properties
  const sanitizeObject = (obj: any): any => {
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          obj[key] = Array.isArray(obj[key])
            ? obj[key].map(sanitizeString)
            : typeof obj[key] === 'object'
            ? sanitizeObject(obj[key])
            : sanitizeString(obj[key]);
        }
      }
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  next();
};